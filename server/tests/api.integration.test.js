import crypto from 'node:crypto';
import {beforeAll,afterAll,describe,test,expect} from '@jest/globals';
import supertest from 'supertest';
// SECURITY: Integration suite REFUSES any database not explicitly named *test*.
const testUrl=process.env.TEST_DATABASE_URL;
if(!testUrl)throw new Error('TEST_DATABASE_URL é obrigatório para a suíte de integração. Nada foi executado.');
const dbname=new URL(testUrl).pathname.replace(/^\//,'');
if(!/test/i.test(dbname) || testUrl===process.env.DATABASE_URL)throw new Error('Proteção: banco de testes separado, com "test" no nome e diferente de DATABASE_URL.');
process.env.NODE_ENV='test';process.env.DATABASE_URL=testUrl;
process.env.APP_BASE_URL='http://localhost:3001';process.env.JWT_SECRET='test-jwt-secret-strong-abcdefghijklmnopqrstuvwxyz';process.env.CSRF_SECRET='test-csrf-secret-strong-abcdefghijklmnopqrstuvwxyz';
process.env.DEMO_MODE='true';process.env.DEMO_ADMIN_EMAIL='private-admin@demo.invalid';process.env.DEMO_ADMIN_PASSWORD='this-admin-test-password-12345';
process.env.DEMO_OPERATOR_EMAIL='operator@demo.invalid';process.env.DEMO_OPERATOR_PASSWORD='this-operator-test-password-12345';
process.env.AI_ENABLED='true';process.env.AI_PROVIDER='openai_compatible';process.env.AI_BASE_URL='https://api.openai.com/v1';process.env.AI_API_KEY='integration-test-non-real';process.env.AI_MODEL='test-model';
process.env.AI_DAILY_GLOBAL_LIMIT='1000';process.env.AI_DAILY_SESSION_LIMIT='100';process.env.AI_DAILY_USER_LIMIT='1000';process.env.AI_SESSION_PER_MINUTE_LIMIT='30';
const {migrate}=await import('../scripts/migrate.js');
const {seedInitial}=await import('../src/db/seed.js');
const {sql,closeDb}=await import('../src/db/index.js');
const {createApp}=await import('../src/app.js');
const app=createApp({staticFiles:false});
const origin='http://localhost:3001';
let operator,admin,sessionToken,adminToken;
const as=(agent,token)=>({get:(path)=>agent.get(`/api/v1${path}`),post:(path,body={})=>agent.post(`/api/v1${path}`).set('Origin',origin).set('X-CSRF-Token',token).send(body),patch:(path,body={})=>agent.patch(`/api/v1${path}`).set('Origin',origin).set('X-CSRF-Token',token).send(body)});
async function signIn(agent,email,password){const r=await agent.post('/api/v1/auth/login').set('Origin',origin).send({email,password});expect(r.status).toBe(200);expect(r.headers['set-cookie']).toBeDefined();return r.body.data.csrf_token;}
const fakeAI=async(_url,init)=>{
 const raw=JSON.parse(init.body),classification=raw.messages[0].content.includes('classificador de intenções');
 let answer;
 if(classification){
   const parsed=JSON.parse(raw.messages[1].content),code=parsed.message.match(/PED-\d+/i)?.[0]||'PED-1052';
   answer={intent:'CREATE_INCIDENT',order_code:code,incident_id:null,needs_clarification:false,clarifying_question:null,requested_actions:['CREATE_INCIDENT','ADD_INCIDENT_NOTE','CREATE_REPLY_DRAFT'],rationale_brief:'Ações solicitadas.'};
 }else{
   const parsed=JSON.parse(raw.messages[1].content),id=parsed.facts.order.id;
   answer={answer:'Proposta de abertura e acompanhamento, sem envio de comunicação.',evidence_refs:[{entity_type:'ORDER',entity_id:id}],proposed_actions:[
     {type:'CREATE_INCIDENT',target_ref:{entity_type:'ORDER',entity_id:id},parameters:{category:'DELIVERY_DELAY',priority:'HIGH',description:'Pedido com atraso informado e acompanhamento fictício da central.'},reason:'Verificar e acompanhar o pedido.'},
     {type:'ADD_INCIDENT_NOTE',target_ref:{entity_type:'PROPOSAL_RESULT',entity_id:null},parameters:{content:'Nota de teste em ocorrência fictícia.'},reason:'Registrar acompanhamento.'},
     {type:'CREATE_REPLY_DRAFT',target_ref:{entity_type:'PROPOSAL_RESULT',entity_id:null},parameters:{body:'Olá! Estamos acompanhando seu pedido. Esta é uma resposta fictícia não enviada.'},reason:'Preparar resposta para revisão.'}
   ],requires_clarification:false,clarifying_question:null};
 }
 return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(answer)}}],usage:{prompt_tokens:100,completion_tokens:120}}),{status:200,headers:{'Content-Type':'application/json'}});
};

beforeAll(async()=>{
 await migrate();
 // Dedicated *test* DB only; cleanup repeatably before fixtures.
 await sql('TRUNCATE TABLE users,auth_sessions,restaurants,customers,orders,order_events,incidents,incident_notes,reply_drafts,ai_conversations,ai_messages,action_proposals,action_executions,audit_logs,ai_usage,ai_quota_daily,ai_turns,idempotency_records,demo_control,login_attempts RESTART IDENTITY CASCADE');
 const seeded=await seedInitial();expect(seeded.orders).toBe(160);expect(seeded.incidents).toBe(36);
 operator=supertest.agent(app);admin=supertest.agent(app);sessionToken=await signIn(operator,process.env.DEMO_OPERATOR_EMAIL,process.env.DEMO_OPERATOR_PASSWORD);adminToken=await signIn(admin,process.env.DEMO_ADMIN_EMAIL,process.env.DEMO_ADMIN_PASSWORD);
 globalThis.__DELIVERYAI_TEST_FETCH=fakeAI;
});
afterAll(async()=>{delete globalThis.__DELIVERYAI_TEST_FETCH;await closeDb();});

describe('AT-01..AT-10: sessão, permissões, CSRF, domínio',()=>{
 test('AT-01 API protegida exige login',async()=>{
  const r=await supertest(app).get('/api/v1/orders');expect(r.status).toBe(401);expect(r.body.error.code).toBe('UNAUTHENTICATED');
 });
 test('AT-02 operador recebe 403 de gestão administrativa',async()=>{
  const r=await operator.get('/api/v1/admin/users');expect(r.status).toBe(403);
 });
 test('AT-04 POST sem CSRF falha sem efeito',async()=>{
  const r=await operator.post('/api/v1/incidents').set('Origin',origin).send({});expect(r.status).toBe(403);
 });
 test('AT-05 UUID inválido recebe 400',async()=>{
  const r=await operator.get('/api/v1/orders/not-a-uuid');expect(r.status).toBe(400);
 });
 test('AT-06/07 atraso é SQL, entrega histórica não gera atraso ativo',async()=>{
  const late=await as(operator,sessionToken).get('/orders?is_late=true&page_size=50');expect(late.status).toBe(200);expect(late.body.meta.pagination.total_items).toBeGreaterThanOrEqual(12);
  expect(late.body.data.every(o=>o.is_late&&o.delay_minutes>=5&&!['DELIVERED','CANCELED'].includes(o.status))).toBe(true);
  const delivered=await as(operator,sessionToken).get('/orders?status=DELIVERED&page_size=20');expect(delivered.body.data.every(o=>o.is_late===false)).toBe(true);
 });
 test('AT-08/10 criar ocorrência + bloqueio duplicidade + versionamento concorrente',async()=>{
  const order=(await as(operator,sessionToken).get('/orders?order_code=PED-1069')).body.data[0];
  const body={order_id:order.id,category:'OTHER',priority:'MEDIUM',description:'Ocorrência fictícia de teste de integridade e duplicidade.'};
  const r=await as(operator,sessionToken).post('/incidents',body);expect(r.status).toBe(200);
  const again=await as(operator,sessionToken).post('/incidents',body);expect(again.status).toBe(409);expect(again.body.error.code).toBe('DUPLICATE_ACTIVE_INCIDENT');
  const x=await as(operator,sessionToken).patch(`/incidents/${r.body.data.id}`,{priority:'HIGH',expected_version:1});expect(x.status).toBe(200);expect(x.body.data.version).toBe(2);
  const stale=await as(operator,sessionToken).patch(`/incidents/${r.body.data.id}`,{priority:'LOW',expected_version:1});expect(stale.status).toBe(409);expect(stale.body.error.code).toBe('STALE_VERSION');
 });
 test('AT-09 reabertura precisa de motivo',async()=>{
  const inc=(await as(operator,sessionToken).get('/incidents?status=RESOLVED&page_size=20')).body.data[0];
  const r=await as(operator,sessionToken).patch(`/incidents/${inc.id}`,{status:'IN_PROGRESS',expected_version:inc.version});expect(r.status).toBe(400);
 });
 test('AT-34 rota /api desconhecida retorna JSON e não HTML',async()=>{
  const r=await operator.get('/api/v1/not-there');expect(r.status).toBe(404);expect(r.headers['content-type']).toMatch(/json/);
 });
});

describe('AT-15..AT-24: propostas com aprovação humana e auditoria',()=>{
 let conversation,proposals,orderId,incidentId;
 test('proposta nasce sem mutar ocorrência; 3 ações separadas',async()=>{
  const orders=await as(operator,sessionToken).get('/orders?order_code=PED-1052');orderId=orders.body.data[0].id;
  const before=await as(operator,sessionToken).get(`/incidents?order_id=${orderId}`);expect(before.body.data).toHaveLength(0);
  const conv=await as(operator,sessionToken).post('/assistant/conversations',{title:'Conversa E2E'});expect(conv.status).toBe(200);conversation=conv.body.data.id;
  const r=await as(operator,sessionToken).post(`/assistant/conversations/${conversation}/messages`,{content:'Para PED-1052, abra ocorrência, adicione nota e prepare resposta.'});
  expect(r.status).toBe(200);expect(r.body.data.proposals).toHaveLength(3);
  proposals=r.body.data.proposals;expect(proposals.filter(p=>p.status==='BLOCKED')).toHaveLength(2);
  const after=await as(operator,sessionToken).get(`/incidents?order_id=${orderId}`);expect(after.body.data).toHaveLength(0);
 });
 test('aprovar criação: uma execução; replay idempotente; dependências liberadas',async()=>{
  const create=proposals.find(p=>p.type==='CREATE_INCIDENT'),key=crypto.randomUUID();
  const request=()=>operator.post(`/api/v1/assistant/proposals/${create.id}/approve`).set('Origin',origin).set('X-CSRF-Token',sessionToken).set('Idempotency-Key',key).send({});
  const first=await request();expect(first.status).toBe(200);expect(first.body.data.proposal_status).toBe('EXECUTED');incidentId=first.body.data.result.entity_id;expect(first.body.data.dependents_released).toHaveLength(2);
  const replay=await request();expect(replay.status).toBe(200);expect(replay.body.meta.replayed).toBe(true);expect(replay.body.data.execution_id).toBe(first.body.data.execution_id);
  const inc=await as(operator,sessionToken).get(`/incidents?order_id=${orderId}`);expect(inc.body.data).toHaveLength(1);
 });
 test('rejeitar nota não executa; aprovar rascunho persistente sem envio',async()=>{
  const note=proposals.find(p=>p.type==='ADD_INCIDENT_NOTE'),draft=proposals.find(p=>p.type==='CREATE_REPLY_DRAFT');
  const reject=await as(operator,sessionToken).post(`/assistant/proposals/${note.id}/reject`,{});expect(reject.status).toBe(200);expect(reject.body.data.proposal_status).toBe('REJECTED');
  const r=await operator.post(`/api/v1/assistant/proposals/${draft.id}/approve`).set('Origin',origin).set('X-CSRF-Token',sessionToken).set('Idempotency-Key',crypto.randomUUID()).send({});
  expect(r.status).toBe(200);expect(r.body.data.result.entity_type).toBe('DRAFT');
  const inc=await as(operator,sessionToken).get(`/incidents/${incidentId}`);
  expect(inc.body.data.notes).toHaveLength(0);expect(inc.body.data.drafts).toHaveLength(1);
  expect(inc.body.data.drafts[0].status).toBe('DRAFT');
  const audit=await admin.get(`/api/v1/admin/audit?entity_type=INCIDENT`);expect(audit.status).toBe(200);
  expect(audit.body.data.some(x=>x.source==='AI_APPROVED')).toBe(true);
 });
 test('sessão diferente nunca lê conversa compartilhando conta',async()=>{
  const other=supertest.agent(app);const token=await signIn(other,process.env.DEMO_OPERATOR_EMAIL,process.env.DEMO_OPERATOR_PASSWORD);
  const r=await other.get(`/api/v1/assistant/conversations/${conversation}`);expect(r.status).toBe(404);
  const proposal=await other.post(`/api/v1/assistant/proposals/${proposals[0].id}/approve`).set('Origin',origin).set('X-CSRF-Token',token).set('Idempotency-Key',crypto.randomUUID()).send({});expect(proposal.status).toBe(404);
 });
 test('outra idempotency key após execução não pode reaplicar',async()=>{
  const p=proposals[0];const r=await operator.post(`/api/v1/assistant/proposals/${p.id}/approve`).set('Origin',origin).set('X-CSRF-Token',sessionToken).set('Idempotency-Key',crypto.randomUUID()).send({});expect(r.status).toBe(409);
 });
});

describe('AT-25/28/31: limites, falha segura e administração',()=>{
 test('operação manual continua quando IA está desligada',async()=>{
  process.env.AI_ENABLED='false';const r=await as(operator,sessionToken).get('/orders');expect(r.status).toBe(200);
  const s=await as(operator,sessionToken).get('/assistant/status');expect(s.body.data.available).toBe(false);
  const c=await as(operator,sessionToken).post('/assistant/conversations',{title:'Sem IA'});const m=await as(operator,sessionToken).post(`/assistant/conversations/${c.body.data.id}/messages`,{content:'Mostre pedidos'});expect(m.status).toBe(503);
  process.env.AI_ENABLED='true';
 });
 test('ADMIN reinicia base operacional de demo com senha reforçada',async()=>{
  const bad=await as(admin,adminToken).post('/admin/demo/reset',{confirm_phrase:'RESETAR DEMO',password:'senha errada'});expect(bad.status).toBe(401);
  const ok=await as(admin,adminToken).post('/admin/demo/reset',{confirm_phrase:'RESETAR DEMO',password:process.env.DEMO_ADMIN_PASSWORD});expect(ok.status).toBe(200);expect(ok.body.data.orders).toBe(160);
  const list=await as(operator,sessionToken).get('/orders');expect(list.status).toBe(200);expect(list.body.meta.pagination.total_items).toBe(160);
 });
 test('logout revoga jti e impede acesso a API',async()=>{
  const logout=await as(operator,sessionToken).post('/auth/logout',{});expect(logout.status).toBe(200);
  const after=await operator.get('/api/v1/orders');expect(after.status).toBe(401);
 });
});
