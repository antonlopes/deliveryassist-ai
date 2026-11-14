import { sql, transaction } from '../db/index.js';
import { get } from '../config.js';
import { AppError, fail, ensure, oneOf, string, closed, assertUUID, number, paging, pagination, CATEGORIES, PRIORITIES, INC_STATUSES, lateSQL, delaySQL, audit, sanitizeIncident } from './common.js';

const orderFields=`o.*,r.name AS restaurant_name,c.display_name AS customer_name, ${lateSQL()} AS is_late,${delaySQL()} AS delay_minutes`;
export async function listRestaurants(q) {
  const {page,page_size,offset}=paging(q); const search=typeof q.q==='string'?q.q.trim().slice(0,120):'';
  const cond="($1='' OR r.name ILIKE '%'||$1||'%' OR r.slug ILIKE '%'||$1||'%')";
  const [rows,count]=await Promise.all([sql(`SELECT r.* FROM restaurants r WHERE ${cond} ORDER BY r.name,r.id LIMIT $2 OFFSET $3`,[search,page_size,offset]),sql(`SELECT count(*)::int AS n FROM restaurants r WHERE ${cond}`,[search])]);
  return pagination(rows.rows,count.rows[0].n,page,page_size);
}
export async function getRestaurant(id,c=null) { assertUUID(id); const r=await (c||{query:sql}).query('SELECT * FROM restaurants WHERE id=$1',[id]);if(!r.rowCount)fail('NOT_FOUND',404);return r.rows[0]; }
export async function createRestaurant(c,body,actorId,requestId) {
  closed(body,['name','slug'],['name','slug']);const name=string(body.name,2,160),slug=string(body.slug,2,160).toLowerCase();
  ensure(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),'Slug inválido.');
  const r=await c.query('INSERT INTO restaurants(name,slug) VALUES($1,$2) RETURNING *',[name,slug]);
  await audit(c,{actorId,event:'RESTAURANT_CREATED',entity:'RESTAURANT',entityId:r.rows[0].id,requestId,after:{name,slug}});return r.rows[0];
}
export async function patchRestaurant(c,id,body,actorId,requestId) {
  assertUUID(id);closed(body,['name','slug','is_active','expected_version'],['expected_version']);number(body.expected_version,1,100000000);
  const old=await c.query('SELECT * FROM restaurants WHERE id=$1 FOR UPDATE',[id]);if(!old.rowCount)fail('NOT_FOUND',404);
  const x=old.rows[0];if(x.version!==body.expected_version)fail('STALE_VERSION',409);
  const name=body.name===undefined?x.name:string(body.name,2,160),slug=body.slug===undefined?x.slug:string(body.slug,2,160).toLowerCase();
  ensure(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),'Slug inválido.');
  const active=body.is_active===undefined?x.is_active:body.is_active;ensure(typeof active==='boolean','is_active deve ser booleano.');
  ensure(Object.keys(body).some(k=>k!=='expected_version'),'Informe algo para alterar.');
  const r=await c.query('UPDATE restaurants SET name=$1,slug=$2,is_active=$3,version=version+1,updated_at=now() WHERE id=$4 RETURNING *',[name,slug,active,id]);
  await audit(c,{actorId,event:'RESTAURANT_UPDATED',entity:'RESTAURANT',entityId:id,requestId,before:{name:x.name,slug:x.slug,is_active:x.is_active},after:{name,slug,is_active:active}});return r.rows[0];
}
export async function listOrders(q) {
  const {page,page_size,offset}=paging(q);
  const predicates=[];const args=[];
  const add=(expr,val)=>{args.push(val);predicates.push(expr.replace(/\?/g,`$${args.length}`));};
  if(q.order_code){ensure(/^PED-\d{1,8}$/i.test(q.order_code),'Código de pedido inválido.');add('o.order_code ILIKE ?||\'%\'',q.order_code.toUpperCase());}
  if(q.restaurant_id){assertUUID(q.restaurant_id);add('o.restaurant_id=?',q.restaurant_id);}
  if(q.status){oneOf(q.status,['CREATED','PREPARING','READY_FOR_PICKUP','IN_DELIVERY','DELIVERED','CANCELED']);add('o.status=?',q.status);}
  if(q.is_late!==undefined){ensure(['true','false'].includes(String(q.is_late)),'is_late inválido.');predicates.push(`${lateSQL()} = ${String(q.is_late)}`);}
  const where=predicates.length?'WHERE '+predicates.join(' AND '):'';
  const [rows,count]=await Promise.all([sql(`SELECT ${orderFields} FROM orders o JOIN restaurants r ON r.id=o.restaurant_id JOIN customers c ON c.id=o.customer_id ${where} ORDER BY o.placed_at DESC,o.id DESC LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,page_size,offset]),sql(`SELECT count(*)::int AS n FROM orders o ${where}`,args)]);
  return pagination(rows.rows,count.rows[0].n,page,page_size);
}
export async function getOrder(id,c=null) {
  assertUUID(id); const q=c?c.query.bind(c):sql;
  const result=await q(`SELECT ${orderFields} FROM orders o JOIN restaurants r ON r.id=o.restaurant_id JOIN customers c ON c.id=o.customer_id WHERE o.id=$1`,[id]);
  if(!result.rowCount)fail('NOT_FOUND',404);return result.rows[0];
}
export async function listLateOrdersForAI() {
  const [items,count]=await Promise.all([
    sql(`SELECT ${orderFields} FROM orders o JOIN restaurants r ON r.id=o.restaurant_id JOIN customers c ON c.id=o.customer_id WHERE ${lateSQL()} ORDER BY ${delaySQL()} DESC,o.id LIMIT 10`),
    sql(`SELECT count(*)::int AS n FROM orders o WHERE ${lateSQL()}`)
  ]);
  return {items:items.rows,pagination:{page:1,page_size:10,total_items:count.rows[0].n,total_pages:Math.ceil(count.rows[0].n/10)}};
}
export async function getOrderByCode(code,c=null) {
  ensure(typeof code==='string'&&/^PED-\d{1,8}$/i.test(code),'Código de pedido inválido.');
  const q=c?c.query.bind(c):sql;
  const r=await q('SELECT id FROM orders WHERE order_code=$1',[code.toUpperCase()]);
  return r.rowCount?getOrder(r.rows[0].id,c):null;
}
export async function orderEvents(id,q) {
  await getOrder(id); const {page,page_size,offset}=paging(q);
  const [list,count]=await Promise.all([sql('SELECT * FROM order_events WHERE order_id=$1 ORDER BY occurred_at DESC,id DESC LIMIT $2 OFFSET $3',[id,page_size,offset]),sql('SELECT count(*)::int AS n FROM order_events WHERE order_id=$1',[id])]);
  return pagination(list.rows,count.rows[0].n,page,page_size);
}
export async function orderDetail(id) {
  const order=await getOrder(id);
  const [events,incidents]=await Promise.all([sql('SELECT * FROM order_events WHERE order_id=$1 ORDER BY occurred_at DESC,id DESC LIMIT 30',[id]),sql('SELECT id,category,status,priority,version,description FROM incidents WHERE order_id=$1 ORDER BY created_at DESC,id DESC LIMIT 30',[id])]);
  return {...order,events:events.rows,incidents:incidents.rows};
}
export async function dashboard(q={}) {
  const args=[],pred=[];
  if(q.restaurant_id){assertUUID(q.restaurant_id);args.push(q.restaurant_id);pred.push(`o.restaurant_id=$${args.length}`);}
  for(const key of ['from','to']) if(q[key]){ensure(!Number.isNaN(Date.parse(q[key])),'Data inválida.');args.push(new Date(q[key]).toISOString());pred.push(`o.placed_at ${key==='from'?'>=':'<='} $${args.length}`);}
  const where=pred.length?'WHERE '+pred.join(' AND '):'';
  const orders=await sql(`SELECT count(*)::int AS total_orders, count(*) FILTER(WHERE o.status NOT IN ('DELIVERED','CANCELED'))::int AS active_orders,
   count(*) FILTER(WHERE ${lateSQL()})::int AS late_orders, coalesce(sum(total_cents),0)::bigint AS total_cents FROM orders o ${where}`,args);
  const late=await sql(`SELECT o.id,o.order_code,o.status,o.estimated_delivery_at,r.name AS restaurant_name,${delaySQL()} AS delay_minutes FROM orders o JOIN restaurants r ON r.id=o.restaurant_id ${where?where+' AND':'WHERE'} ${lateSQL()} ORDER BY delay_minutes DESC,o.id LIMIT 10`,args);
  const incidentWhere=q.restaurant_id?'WHERE o.restaurant_id=$1':'';
  const incidentArgs=q.restaurant_id?[q.restaurant_id]:[];
  const [counts,byRest,priority]=await Promise.all([
    sql(`SELECT i.status,count(*)::int AS count FROM incidents i JOIN orders o ON o.id=i.order_id ${incidentWhere} GROUP BY i.status`,incidentArgs),
    sql(`SELECT r.id,r.name,count(o.id)::int AS total_orders,count(o.id) FILTER(WHERE ${lateSQL()})::int AS late_orders FROM restaurants r LEFT JOIN orders o ON o.restaurant_id=r.id ${q.restaurant_id?'WHERE r.id=$1':''} GROUP BY r.id ORDER BY r.name`,incidentArgs),
    sql(`SELECT i.id,i.order_id,i.category,i.priority,i.status,o.order_code FROM incidents i JOIN orders o ON o.id=i.order_id ${incidentWhere?incidentWhere+' AND':'WHERE'} i.priority='HIGH' AND i.status<>'RESOLVED' ORDER BY i.created_at DESC LIMIT 8`,incidentArgs)
  ]);
  return {updated_at:new Date().toISOString(),time_zone:'America/Sao_Paulo',...orders.rows[0],late_orders_list:late.rows,incidents_by_status:counts.rows,by_restaurant:byRest.rows,high_priority_incidents:priority.rows};
}
export async function getIncident(id,c=null,forUpdate=false) {
  assertUUID(id);const q=c?c.query.bind(c):sql;
  const r=await q(`SELECT i.*,o.order_code,r.name AS restaurant_name FROM incidents i JOIN orders o ON o.id=i.order_id JOIN restaurants r ON r.id=o.restaurant_id WHERE i.id=$1 ${forUpdate?'FOR UPDATE OF i':''}`,[id]);
  if(!r.rowCount)fail('NOT_FOUND',404);return r.rows[0];
}
export async function listIncidents(q) {
  const {page,page_size,offset}=paging(q);let args=[],pred=[];
  for(const [key,field,values] of [['restaurant_id','o.restaurant_id',null],['order_id','i.order_id',null],['status','i.status',INC_STATUSES],['priority','i.priority',PRIORITIES],['category','i.category',CATEGORIES]]) {
    if(q[key]!==undefined && q[key]!=='') { if(values)oneOf(q[key],values);else assertUUID(q[key]);args.push(q[key]);pred.push(`${field}=$${args.length}`); }
  }
  const where=pred.length?'WHERE '+pred.join(' AND '):'';
  const from='FROM incidents i JOIN orders o ON o.id=i.order_id JOIN restaurants r ON r.id=o.restaurant_id';
  const [rows,count]=await Promise.all([sql(`SELECT i.*,o.order_code,r.name AS restaurant_name ${from} ${where} ORDER BY i.created_at DESC,i.id DESC LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,page_size,offset]),sql(`SELECT count(*)::int AS n ${from} ${where}`,args)]);
  return pagination(rows.rows,count.rows[0].n,page,page_size);
}
export function validateIncidentCreate(body){closed(body,['order_id','category','priority','description'],['order_id','category','priority','description']);return {order_id:assertUUID(body.order_id),category:oneOf(body.category,CATEGORIES),priority:oneOf(body.priority,PRIORITIES),description:string(body.description,15,2000)};}
export async function createIncidentTx(c,body,actorId,requestId,source='MANUAL') {
  const b=validateIncidentCreate(body);await getOrder(b.order_id,c);
  const exist=await c.query("SELECT id FROM incidents WHERE order_id=$1 AND category=$2 AND status IN ('OPEN','IN_PROGRESS')",[b.order_id,b.category]);
  if(exist.rowCount)fail('DUPLICATE_ACTIVE_INCIDENT',409);
  const r=await c.query(`INSERT INTO incidents(order_id,category,priority,description,source,created_by_user_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[b.order_id,b.category,b.priority,b.description,source,actorId]);
  await audit(c,{actorId,event:'INCIDENT_CREATED',entity:'INCIDENT',entityId:r.rows[0].id,requestId,source,after:sanitizeIncident(r.rows[0])});return r.rows[0];
}
const transitions={OPEN:['IN_PROGRESS','RESOLVED'],IN_PROGRESS:['OPEN','RESOLVED'],RESOLVED:['IN_PROGRESS']};
export function validateTransition(previous,next,reason){if(previous!==next){ensure(transitions[previous]?.includes(next),'Transição de estado não permitida.');if(previous==='RESOLVED')string(reason,10,600);}}
export async function patchIncidentTx(c,id,body,actorId,requestId,source='MANUAL') {
  closed(body,['status','priority','assigned_to_user_id','reason','expected_version'],['expected_version']);number(body.expected_version,1,100000000);
  ensure(['status','priority','assigned_to_user_id'].some(k=>Object.hasOwn(body,k)),'Nenhum campo para atualizar.');
  const old=await getIncident(id,c,true);if(old.version!==body.expected_version)fail('STALE_VERSION',409);
  const status=body.status===undefined?old.status:oneOf(body.status,INC_STATUSES);
  const priority=body.priority===undefined?old.priority:oneOf(body.priority,PRIORITIES);
  let assigned=old.assigned_to_user_id;
  if(Object.hasOwn(body,'assigned_to_user_id')){
    assigned=body.assigned_to_user_id;
    if(assigned!==null){assertUUID(assigned);const u=await c.query('SELECT id FROM users WHERE id=$1 AND is_active=true',[assigned]);if(!u.rowCount)fail('VALIDATION_ERROR',400);}
  }
  validateTransition(old.status,status,body.reason);
  const resolved=status==='RESOLVED'?(old.resolved_at||new Date()):null;
  const r=await c.query(`UPDATE incidents SET status=$1,priority=$2,assigned_to_user_id=$3,resolved_at=$4,version=version+1,updated_at=now() WHERE id=$5 RETURNING *`,[status,priority,assigned,resolved,id]);
  const before=sanitizeIncident(old),after=sanitizeIncident(r.rows[0]);
  await audit(c,{actorId,event:'INCIDENT_UPDATED',entity:'INCIDENT',entityId:id,requestId,source,before,after,meta:body.reason?{reason:string(body.reason,1,600)}:{}});
  return r.rows[0];
}
export async function addNoteTx(c,incidentId,body,actorId,requestId,source='MANUAL') {
  const content=string(body,1,1000);await getIncident(incidentId,c);
  const r=await c.query('INSERT INTO incident_notes(incident_id,author_user_id,source,body) VALUES($1,$2,$3,$4) RETURNING *',[incidentId,actorId,source,content]);
  await audit(c,{actorId,event:'NOTE_ADDED',entity:'INCIDENT',entityId:incidentId,requestId,source,meta:{note_id:r.rows[0].id}});return r.rows[0];
}
export async function createDraftTx(c,incidentId,body,actorId,requestId,source='MANUAL') {
  const content=string(body,1,2000);await getIncident(incidentId,c);
  const r=await c.query('INSERT INTO reply_drafts(incident_id,body,created_by_user_id,updated_by_user_id,source) VALUES($1,$2,$3,$3,$4) RETURNING *',[incidentId,content,actorId,source]);
  await audit(c,{actorId,event:'DRAFT_CREATED',entity:'DRAFT',entityId:r.rows[0].id,requestId,source,after:{incident_id:incidentId,status:'DRAFT'}});return r.rows[0];
}
export async function patchDraftTx(c,id,body,actorId,requestId) {
  assertUUID(id);closed(body,['body','status','expected_version'],['expected_version']);number(body.expected_version,1,100000000);
  ensure(body.body!==undefined||body.status!==undefined,'Nenhum campo para atualizar.');
  const old=await c.query('SELECT * FROM reply_drafts WHERE id=$1 FOR UPDATE',[id]);if(!old.rowCount)fail('NOT_FOUND',404);
  const x=old.rows[0];if(x.version!==body.expected_version)fail('STALE_VERSION',409);
  const text=body.body===undefined?x.body:string(body.body,1,2000);const status=body.status===undefined?x.status:oneOf(body.status,['DRAFT','ARCHIVED']);
  const r=await c.query('UPDATE reply_drafts SET body=$1,status=$2,version=version+1,updated_at=now(),updated_by_user_id=$3 WHERE id=$4 RETURNING *',[text,status,actorId,id]);
  await audit(c,{actorId,event:'DRAFT_UPDATED',entity:'DRAFT',entityId:id,requestId,before:{status:x.status,version:x.version},after:{status,version:r.rows[0].version}});return r.rows[0];
}
export async function incidentTimeline(id,q){await getIncident(id);const {page,page_size,offset}=paging(q);
  // Timeline combines immutable notes with filtered metadata-only audit entries.
  const from=`FROM (SELECT n.id,n.created_at,'NOTE'::text AS kind,n.source,n.author_user_id AS actor_user_id,LEFT(n.body,1000) AS description,'{}'::jsonb AS before_data,'{}'::jsonb AS after_data FROM incident_notes n WHERE n.incident_id=$1
  UNION ALL SELECT a.id,a.created_at,a.event_type AS kind,a.source,a.actor_user_id,NULL::text AS description,a.before_data,a.after_data FROM audit_logs a WHERE a.entity_type='INCIDENT' AND a.entity_id=$1) t`;
  const [r,total]=await Promise.all([sql(`SELECT * ${from} ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,[id,page_size,offset]),sql(`SELECT count(*)::int AS n ${from}`,[id])]);
  return pagination(r.rows,total.rows[0].n,page,page_size);
}
export async function incidentDetail(id){const i=await getIncident(id);const [notes,drafts]=await Promise.all([sql('SELECT n.*,u.name AS author_name FROM incident_notes n JOIN users u ON u.id=n.author_user_id WHERE incident_id=$1 ORDER BY n.created_at DESC LIMIT 30',[id]),sql('SELECT * FROM reply_drafts WHERE incident_id=$1 ORDER BY updated_at DESC LIMIT 30',[id])]);return {...i,notes:notes.rows,drafts:drafts.rows};}
export async function listDrafts(id,q){await getIncident(id);const {page,page_size,offset}=paging(q);const [r,count]=await Promise.all([sql('SELECT * FROM reply_drafts WHERE incident_id=$1 ORDER BY updated_at DESC,id DESC LIMIT $2 OFFSET $3',[id,page_size,offset]),sql('SELECT count(*)::int AS n FROM reply_drafts WHERE incident_id=$1',[id])]);return pagination(r.rows,count.rows[0].n,page,page_size);}
export async function getActiveIncident(orderId,category='DELIVERY_DELAY',c=null){const q=c?c.query.bind(c):sql;const r=await q("SELECT * FROM incidents WHERE order_id=$1 AND category=$2 AND status IN ('OPEN','IN_PROGRESS') ORDER BY created_at DESC LIMIT 1",[orderId,category]);return r.rows[0]??null;}
export async function lockedDemo(c){if(get('DEMO_MODE')==='true')await c.query('SELECT id FROM demo_control WHERE id=1 FOR SHARE');}
export { transaction };
