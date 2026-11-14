import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { get, int, isDemo } from '../config.js';
import { transaction } from './index.js';
import { audit } from '../domain/common.js';

const names = ['Cozinha Aurora (fictícia)','Sabor da Vila (fictício)','Forno do Bairro (fictício)','Massa & Prosa (fictício)','Horta na Mesa (fictício)','Tacho Urbano (fictício)','Bento do Dia (fictício)','Praça dos Sabores (fictício)'];
const slugs = ['cozinha-aurora','sabor-da-vila','forno-do-bairro','massa-e-prosa','horta-na-mesa','tacho-urbano','bento-do-dia','praca-dos-sabores'];
const categories = ['DELIVERY_DELAY','MISSING_ITEM','WRONG_ITEM','COMMUNICATION','CANCELLATION_REQUEST','OTHER'];
function rng(seed) { let x=Number(seed) || 2026; return () => { x = (Math.imul(x,1664525)+1013904223)>>>0; return x/4294967296; }; }
function uuid() { return crypto.randomUUID(); }
function date(when) { return new Date(when).toISOString(); }
export async function bootstrapUsers(c) {
  for (const [role,flag] of [['ADMIN','ADMIN'],['OPERATOR','OPERATOR']]) {
    const email = get(`DEMO_${flag}_EMAIL`); const pass = get(`DEMO_${flag}_PASSWORD`);
    if (!email || !pass || pass.length<12) throw new Error(`Defina DEMO_${flag}_EMAIL e DEMO_${flag}_PASSWORD (>=12 chars) fora do repositório`);
    const hash = await bcrypt.hash(pass,12);
    await c.query(`INSERT INTO users(name,email,password_hash,role,is_demo_account) VALUES($1,$2,$3,$4,$5) ON CONFLICT(email) DO NOTHING`,
      [role==='ADMIN'?'Gestão privada':'Operador demonstração',email.trim().toLowerCase(),hash,role,role==='OPERATOR']);
  }
}
export async function clearOperationalData(c) {
  await c.query('UPDATE ai_usage SET conversation_id=NULL WHERE conversation_id IS NOT NULL');
  for (const name of ['action_executions','idempotency_records','action_proposals','ai_messages','ai_conversations','reply_drafts','incident_notes','incidents','order_events','orders','customers','restaurants']) {
    await c.query(`DELETE FROM ${name}`); // Hardcoded allowlist of tables; never user input.
  }
}
export async function seedOperationalData(c, now = new Date()) {
  // Set-based bulk seed: avoids hundreds of remote round-trips on Cloudflare Hyperdrive.
  const random=rng(get('SEED_RANDOM_SEED',2026));
  const demo=await c.query("SELECT id FROM users WHERE role='OPERATOR' AND is_demo_account=true AND is_active=true ORDER BY created_at LIMIT 1");
  if(!demo.rowCount) throw new Error('Conta OPERATOR demo ausente; execute db:seed');
  const operator=demo.rows[0].id;
  const restaurants=names.map((name,i)=>({id:uuid(),name,slug:slugs[i]}));
  const customers=[],orders=[],events=[],incidents=[],notes=[],drafts=[];
  for(let i=0;i<160;i++) {
    const customerId=uuid(),orderId=uuid();
    customers.push({id:customerId,display_name:`Cliente fictício ${String(i+1).padStart(3,'0')}`,fictional_reference:`SINT-${String(i+1).padStart(4,'0')}`});
    let status,eta,delivered=null;
    if (i<28 || i===51){status=['IN_DELIVERY','PREPARING','READY_FOR_PICKUP'][i%3];eta=now.getTime()-(10+i*3)*60000;}
    else if(i<52){status=['PREPARING','READY_FOR_PICKUP','IN_DELIVERY'][i%3];eta=now.getTime()+(i-28)*2*60000;}
    else if(i<84){status='DELIVERED';eta=now.getTime()-(45+i)*60000;delivered=eta+((i%3)-1)*10*60000;}
    else if(i<96){status='CANCELED';eta=null;}
    else{status=['CREATED','PREPARING','READY_FOR_PICKUP','IN_DELIVERY'][i%4];eta=now.getTime()+(30+(i%28)*3)*60000;}
    const placed=Math.min(now.getTime()-60000,(eta??now.getTime())-(35+Math.floor(random()*24))*60000);
    const orderCode=`PED-${1001+i}`;
    orders.push({id:orderId,order_code:orderCode,restaurant_id:restaurants[i%8].id,customer_id:customerId,status,total_cents:1290+Math.floor(random()*9000),placed_at:date(placed),estimated_delivery_at:eta===null?null:date(eta),delivered_at:delivered===null?null:date(delivered)});
    events.push({id:uuid(),order_id:orderId,event_type:'CREATED',description:'Pedido de demonstração criado (dados fictícios)',occurred_at:date(placed)});
    if(status!=='CREATED')events.push({id:uuid(),order_id:orderId,event_type:status,description:`Status informativo: ${status}`,occurred_at:date(Math.max(placed,now.getTime()-10*60000))});
    if(i<36){
      const incidentId=uuid(),category=categories[i%categories.length],priority=['LOW','MEDIUM','HIGH'][i%3];
      const incStatus=i%6===0?'RESOLVED':i%4===0?'IN_PROGRESS':'OPEN';
      incidents.push({id:incidentId,order_id:orderId,category,description:`Ocorrência sintética para o pedido ${orderCode}: acompanhamento da central de demonstração.`,priority,status:incStatus,created_by_user_id:operator,source:'MANUAL',resolved_at:incStatus==='RESOLVED'?date(now.getTime()-60000):null});
      if(i%2===0)notes.push({id:uuid(),incident_id:incidentId,author_user_id:operator,source:'MANUAL',body:'Nota fictícia de acompanhamento interno.'});
      if(i%4===0)drafts.push({id:uuid(),incident_id:incidentId,body:`Olá! Estamos acompanhando o pedido ${orderCode}. Esta é uma mensagem fictícia, não enviada.`,source:'MANUAL',created_by_user_id:operator,updated_by_user_id:operator});
    }
  }
  async function bulk(table,fields,items,types){
    if(!items.length)return;
    const placeholders=fields.join(',');
    const projections=fields.map((f,i)=>`${f} ${types[i]}`).join(',');
    await c.query(`INSERT INTO ${table}(${placeholders}) SELECT ${placeholders} FROM jsonb_to_recordset($1::jsonb) AS x(${projections})`,[JSON.stringify(items)]);
  }
  // Tables/fields/types are constants in source, NEVER from request input or model.
  await bulk('restaurants',['id','name','slug'],restaurants,['uuid','varchar(160)','varchar(160)']);
  await bulk('customers',['id','display_name','fictional_reference'],customers,['uuid','varchar(120)','varchar(40)']);
  await bulk('orders',['id','order_code','restaurant_id','customer_id','status','total_cents','placed_at','estimated_delivery_at','delivered_at'],orders,['uuid','varchar(24)','uuid','uuid','varchar(22)','integer','timestamptz','timestamptz','timestamptz']);
  await bulk('order_events',['id','order_id','event_type','description','occurred_at'],events,['uuid','uuid','varchar(20)','varchar(500)','timestamptz']);
  await bulk('incidents',['id','order_id','category','description','priority','status','created_by_user_id','source','resolved_at'],incidents,['uuid','uuid','varchar(32)','text','varchar(10)','varchar(16)','uuid','varchar(14)','timestamptz']);
  await bulk('incident_notes',['id','incident_id','author_user_id','source','body'],notes,['uuid','uuid','uuid','varchar(14)','text']);
  await bulk('reply_drafts',['id','incident_id','body','source','created_by_user_id','updated_by_user_id'],drafts,['uuid','uuid','text','varchar(14)','uuid','uuid']);
  const last=date(now.getTime()),next=date(now.getTime()+int('DEMO_RESET_HOURS',24,1,720)*3600000);
  await c.query(`INSERT INTO demo_control(id,seed_version,last_reset_at,next_reset_at) VALUES(1,'1.0.0',$1,$2)
     ON CONFLICT(id) DO UPDATE SET seed_version='1.0.0',last_reset_at=$1,next_reset_at=$2,updated_at=now()`,[last,next]);
  return {restaurants:restaurants.length,orders:orders.length,incidents:incidents.length,events:events.length,notes:notes.length,drafts:drafts.length,reset_at:last,next_reset_at:next};
}
export async function seedInitial() {
  return transaction(async c=>{
    await c.query('SELECT pg_advisory_xact_lock(20261113)');
    await bootstrapUsers(c);
    const r=await c.query('SELECT count(*)::int AS total FROM orders');
    if(r.rows[0].total>0) return {already_seeded:true,orders:r.rows[0].total};
    return seedOperationalData(c);
  });
}
export async function resetDemo(c, actorId=null, requestId=uuid()) {
  if(!isDemo()) throw new Error('Reset proibido quando DEMO_MODE=false');
  await c.query('SELECT id FROM demo_control WHERE id=1 FOR UPDATE');
  await clearOperationalData(c);
  const result=await seedOperationalData(c);
  await audit(c,{actorId,event:'DEMO_RESET',entity:'DEMO',source:actorId?'MANUAL':'SYSTEM',requestId,after:{seed_version:'1.0.0'},meta:{new_orders:result.orders}});
  return result;
}
export async function maybeResetDemo() {
  if(!isDemo())return false;
  // Fast path without row lock for the overwhelming majority of requests.
  const due=await (await import('./index.js')).sql('SELECT next_reset_at FROM demo_control WHERE id=1');
  if(!due.rowCount||new Date(due.rows[0].next_reset_at).getTime()>Date.now())return false;
  return transaction(async c=>{
    const r=await c.query('SELECT next_reset_at FROM demo_control WHERE id=1 FOR UPDATE');
    if(!r.rowCount||new Date(r.rows[0].next_reset_at).getTime()>Date.now())return false;
    await resetDemo(c);
    return true;
  });
}
