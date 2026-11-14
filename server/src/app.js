import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db,sql,transaction } from './db/index.js';
import { get, isProduction, isDemo } from './config.js';
import { maybeResetDemo, resetDemo } from './db/seed.js';
import { AppError, fail, ensure, closed, string, assertUUID, paging, pagination } from './domain/common.js';
import { requireAuth, requireAdmin, requireCsrf, verifyOrigin, login, logout, publicUser, listUsers, createUser, patchUser, resetPassword, verifyAdminPassword, adminResetRate } from './domain/auth.js';
import { dashboard, listRestaurants, getRestaurant, createRestaurant, patchRestaurant, listOrders, orderDetail, orderEvents,
  listIncidents, createIncidentTx, getIncident, incidentDetail, patchIncidentTx, incidentTimeline, addNoteTx, listDrafts, createDraftTx, patchDraftTx, lockedDemo } from './domain/operations.js';
import { newConversation, listConversations, getConversation, listMessages, readProposal, postMessage, rejectProposal, assistantStatus } from './ai/orchestrator.js';
import { approveProposal } from './ai/executor.js';

const run=fn=>(req,res,next)=>Promise.resolve().then(()=>fn(req,res)).then(v=>{
  if(res.headersSent)return;
  const paginationMeta=v?.pagination?{pagination:v.pagination}:{};
  res.json({data:v?.items!==undefined&&v?.pagination?v.items:v,meta:{request_id:req.id,server_time:new Date().toISOString(),...paginationMeta,...res.locals.extraMeta}});
}).catch(next);
const mutation=fn=>run((req,res)=>transaction(async c=>{await lockedDemo(c);return fn(c,req,res);}));
const pathUUID=(req)=>assertUUID(req.params.id);
function queryFilter(q,key,max){if(q[key]!==undefined)string(q[key],1,max);return q[key];}

export function createApp({staticFiles=true}={}) {
  const app=express();
  if(get('TRUST_PROXY','false')==='true')app.set('trust proxy',1);
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'data:'],connectSrc:["'self'"],fontSrc:["'self'",'data:'],objectSrc:["'none'"],frameAncestors:["'none'"]}},crossOriginEmbedderPolicy:false }));
  app.use((req,res,next)=>{
    req.id=crypto.randomUUID();res.setHeader('X-Request-ID',req.id);
    const start=Date.now();res.on('finish',()=>{
      const item={timestamp:new Date().toISOString(),level:'info',request_id:req.id,method:req.method,route:req.route?.path||req.path,status:res.statusCode,duration_ms:Date.now()-start};
      // No request body, cookies, auth, URLs with query strings, or LLM content.
      if(get('LOG_LEVEL','info')!=='silent')console.log(JSON.stringify(item));
    });next();
  });
  app.use(express.json({limit:'64kb',strict:true}));
  app.get('/healthz',(_req,res)=>res.json({status:'alive'}));
  app.get('/readyz',run(async()=>{try{await sql('SELECT 1');return {status:'ready'};}catch{throw new AppError('AI_UNAVAILABLE',503,'Serviço temporariamente indisponível.');}}));
  const api=express.Router();
  api.use((req,res,next)=>{if(['POST','PATCH','PUT','DELETE'].includes(req.method))return verifyOrigin(req,res,next);next();});
  api.post('/auth/login',run(login));
  api.get('/public/demo-access',run(async()=>{
    if(!isDemo()||get('DEMO_PUBLIC_LOGIN','false')!=='true')fail('NOT_FOUND',404);
    return {email:get('DEMO_OPERATOR_EMAIL'),password:get('DEMO_OPERATOR_PASSWORD')};
  }));
  api.use(requireAuth);
  api.use((req,_res,next)=>{
    if(isDemo() && !['/auth/me','/auth/logout'].includes(req.path))maybeResetDemo().then(()=>next(),next);
    else next();
  });
  api.get('/auth/me',run(async req=>({user:publicUser(req.auth),csrf_token:req.auth.csrf_token,session_expires_at:req.auth.expires_at})));
  api.use((req,res,next)=>{
    if(['POST','PATCH','PUT','DELETE'].includes(req.method))return requireCsrf(req,res,next);
    next();
  });
  api.post('/auth/logout',run(logout));
  api.get('/dashboard/summary',run(req=>dashboard(req.query)));
  api.get('/assignees',run(async req=>{
    const {page,page_size,offset}=paging(req.query);
    const [items,n]=await Promise.all([sql('SELECT id,name,role FROM users WHERE is_active=true ORDER BY name,id LIMIT $1 OFFSET $2',[page_size,offset]),sql('SELECT count(*)::int AS n FROM users WHERE is_active=true')]);
    return pagination(items.rows,n.rows[0].n,page,page_size);
  }));
  api.get('/restaurants',run(req=>listRestaurants(req.query)));
  api.get('/restaurants/:id',run(req=>getRestaurant(pathUUID(req))));
  api.post('/restaurants',requireAdmin,mutation((c,req)=>createRestaurant(c,req.body,req.auth.id,req.id)));
  api.patch('/restaurants/:id',requireAdmin,mutation((c,req)=>patchRestaurant(c,pathUUID(req),req.body,req.auth.id,req.id)));
  api.get('/orders',run(req=>listOrders(req.query)));
  api.get('/orders/:id/events',run(req=>orderEvents(pathUUID(req),req.query)));
  api.get('/orders/:id',run(req=>orderDetail(pathUUID(req))));
  api.get('/incidents',run(req=>listIncidents(req.query)));
  api.post('/incidents',mutation((c,req)=>createIncidentTx(c,req.body,req.auth.id,req.id)));
  api.get('/incidents/:id',run(req=>incidentDetail(pathUUID(req))));
  api.patch('/incidents/:id',mutation((c,req)=>patchIncidentTx(c,pathUUID(req),req.body,req.auth.id,req.id)));
  api.get('/incidents/:id/timeline',run(req=>incidentTimeline(pathUUID(req),req.query)));
  api.post('/incidents/:id/notes',mutation((c,req)=>{closed(req.body,['body'],['body']);return addNoteTx(c,pathUUID(req),req.body.body,req.auth.id,req.id);}));
  api.get('/incidents/:id/drafts',run(req=>listDrafts(pathUUID(req),req.query)));
  api.post('/incidents/:id/drafts',mutation((c,req)=>{closed(req.body,['body'],['body']);return createDraftTx(c,pathUUID(req),req.body.body,req.auth.id,req.id);}));
  api.patch('/drafts/:id',mutation((c,req)=>patchDraftTx(c,pathUUID(req),req.body,req.auth.id,req.id)));
  api.get('/assistant/status',run(req=>assistantStatus(req.auth)));
  api.get('/assistant/conversations',run(req=>listConversations(req.auth,req.query)));
  api.post('/assistant/conversations',run(req=>newConversation(req.auth,req.body)));
  api.get('/assistant/conversations/:id/messages',run(req=>listMessages(pathUUID(req),req.auth,req.query)));
  api.post('/assistant/conversations/:id/messages',run(req=>postMessage(pathUUID(req),req.auth,req.body,req.id)));
  api.get('/assistant/conversations/:id',run(req=>getConversation(pathUUID(req),req.auth)));
  api.get('/assistant/proposals/:id',run(req=>readProposal(pathUUID(req),req.auth)));
  api.post('/assistant/proposals/:id/approve',run(async req=>{
    closed(req.body,[]);const key=req.headers['idempotency-key'];
    ensure(typeof key==='string','Cabeçalho Idempotency-Key obrigatório.');
    const v=await approveProposal(pathUUID(req),req.auth,key,req.id);
    req.res.locals.extraMeta={replayed:v.meta.replayed};
    return v.data;
  }));
  api.post('/assistant/proposals/:id/reject',run(req=>rejectProposal(pathUUID(req),req.auth,req.body,req.id)));
  const admin=express.Router();admin.use(requireAdmin);
  admin.get('/users',run(req=>listUsers(req.query)));
  admin.post('/users',mutation((c,req)=>createUser(c,req.body,req.auth.id,req.id)));
  admin.patch('/users/:id',mutation((c,req)=>patchUser(c,pathUUID(req),req.body,req.auth.id,req.id)));
  admin.post('/users/:id/reset-password',mutation((c,req)=>resetPassword(c,pathUUID(req),req.body,req.auth.id,req.id)));
  admin.get('/audit',run(async req=>{
    const {page,page_size,offset}=paging(req.query),filters=[],args=[];
    for(const key of ['entity_type','entity_id','actor_id','event_type']){
      if(req.query[key]){
        if(key.endsWith('_id'))assertUUID(req.query[key]);else queryFilter(req.query,key,90);
        args.push(req.query[key]);filters.push(`${key==='actor_id'?'actor_user_id':key}=$${args.length}`);
      }
    }
    for(const [key,op] of [['from','>='],['to','<=']])if(req.query[key]){
      ensure(!Number.isNaN(Date.parse(req.query[key])),'Data inválida.');
      args.push(new Date(req.query[key]).toISOString());filters.push(`created_at ${op} $${args.length}`);
    }
    const where=filters.length?' WHERE '+filters.join(' AND '):'';
    const [items,n]=await Promise.all([sql(`SELECT id,actor_user_id,actor_kind,request_id,event_type,entity_type,entity_id,source,before_data,after_data,metadata,created_at FROM audit_logs ${where} ORDER BY created_at DESC,id DESC LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,page_size,offset]),sql(`SELECT count(*)::int AS n FROM audit_logs ${where}`,args)]);
    return pagination(items.rows,n.rows[0].n,page,page_size);
  }));
  admin.get('/ai-usage',run(async req=>{
    const from=req.query.from?new Date(req.query.from):new Date(Date.now()-7*86400000);
    const to=req.query.to?new Date(req.query.to):new Date();
    ensure(!Number.isNaN(from.getTime())&&!Number.isNaN(to.getTime())&&to>=from,'Período inválido.');
    const [usage,proposal,quota]=await Promise.all([
      sql(`SELECT provider,model,purpose,outcome,count(*)::int AS calls,round(avg(duration_ms))::int AS avg_duration_ms,
        sum(input_tokens)::bigint AS input_tokens,sum(output_tokens)::bigint AS output_tokens
        FROM ai_usage WHERE created_at BETWEEN $1 AND $2 GROUP BY provider,model,purpose,outcome ORDER BY calls DESC LIMIT 50`,[from.toISOString(),to.toISOString()]),
      sql('SELECT status,count(*)::int AS total FROM action_proposals GROUP BY status ORDER BY status'),
      sql("SELECT quota_scope,used_turns,reserved_turns FROM ai_quota_daily WHERE usage_date_utc=(now() AT TIME ZONE 'UTC')::date AND quota_scope='GLOBAL'")]);
    return {from:from.toISOString(),to:to.toISOString(),cost:'unknown',usage:usage.rows,proposals:proposal.rows,global_quotas:quota.rows};
  }));
  admin.post('/demo/reset',run(async req=>{
    if(!isDemo())fail('FORBIDDEN',403);
    closed(req.body,['confirm_phrase','password'],['confirm_phrase','password']);
    ensure(req.body.confirm_phrase==='RESETAR DEMO','Escreva RESETAR DEMO para confirmar.');
    const valid=await verifyAdminPassword(req.auth.id,req.body.password);
    await adminResetRate(req.auth.id,Boolean(valid));
    if(!valid)fail('UNAUTHENTICATED',401);
    return transaction(c=>resetDemo(c,req.auth.id,req.id));
  }));
  api.use('/admin',admin);
  api.use((_req,_res,next)=>next(new AppError('NOT_FOUND',404)));
  app.use('/api/v1',api);
  app.use('/api',(_req,_res,next)=>next(new AppError('NOT_FOUND',404)));
  if(staticFiles){
    const dirname=path.dirname(fileURLToPath(import.meta.url));
    const dist=path.resolve(dirname,'../../client/dist');
    app.use(express.static(dist,{index:false,maxAge:isProduction()?'1h':0}));
    app.get(/^(?!\/(?:api|healthz|readyz)(?:\/|$)).*/,(_req,res)=>res.sendFile(path.join(dist,'index.html')));
  }
  app.use((_req,_res,next)=>next(new AppError('NOT_FOUND',404)));
  app.use((error,req,res,_next)=>{
    if(res.headersSent)return;
    let code=error.code,status=error.status||500,details=error.details||{};
    if(code==='23505'){code=error.constraint==='incidents_active_once'?'DUPLICATE_ACTIVE_INCIDENT':'VALIDATION_ERROR';status=409;details={};}
    else if(['23503','23514','22P02','23502'].includes(code)){code='VALIDATION_ERROR';status=400;details={};}
    else if(error.type==='entity.too.large'){code='VALIDATION_ERROR';status=413;}
    else if(error instanceof SyntaxError && 'body' in error){code='VALIDATION_ERROR';status=400;}
    else if(!(error instanceof AppError)){code='INTERNAL_ERROR';status=500;}

    if (status >= 500) {
      console.error(
        JSON.stringify({
          level: 'error',
          request_id: req.id,
          error_code: code,
          status,
          original_error_name: error.name || null,
          original_error_code: error.code || null,
          database_constraint: error.constraint || null,
          database_table: error.table || null,
          database_routine: error.routine || null,
        })
      );
    }

    res.status(status).json({error:{code:code||'INTERNAL_ERROR',message:error instanceof AppError?error.message:(status===500?'Erro interno. Informe o identificador da requisição.':status===409?'Registro já existente ou em conflito.':'Dados inválidos.'),details,request_id:req.id}});
  });
  return app;
}
