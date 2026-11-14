import crypto from 'node:crypto';
import { int } from '../config.js';
export class AppError extends Error {
  constructor(code, status=400, message, details={}) { super(message || messages[code] || 'Não foi possível concluir a operação.');this.code=code;this.status=status;this.details=details; }
}
const messages={ VALIDATION_ERROR:'Confira os dados informados.',UNAUTHENTICATED:'Faça login para continuar.',FORBIDDEN:'Acesso não permitido.',NOT_FOUND:'Registro não encontrado.',STALE_VERSION:'Este registro foi atualizado. Recarregue e tente novamente.',DUPLICATE_ACTIVE_INCIDENT:'Já existe uma ocorrência ativa desta categoria para o pedido.',ACTION_NOT_APPROVABLE:'Esta proposta não pode mais ser aprovada.',PROPOSAL_EXPIRED:'Esta proposta expirou. Solicite uma nova análise.',IDEMPOTENCY_KEY_REUSED:'Esta chave de confirmação já foi usada para outra operação.',INVALID_AI_OUTPUT:'A resposta da IA não passou na validação. Reformule seu pedido.',AI_QUOTA_EXCEEDED:'Limite de uso da IA atingido. O gerenciamento manual continua disponível.',AI_UNAVAILABLE:'IA indisponível no momento. Use as operações manuais.',AI_PROVIDER_ERROR:'Não foi possível consultar o provedor de IA.',AI_TIMEOUT:'A IA demorou além do limite. Tente novamente.',RATE_LIMITED:'Muitas tentativas. Tente novamente em instantes.',DEMO_RESET_OCCURRED:'Os dados de demonstração foram reiniciados; recarregue a página.',INTERNAL_ERROR:'Erro interno. Informe o código da requisição.'};
export const errors=messages;
export const ORDER_STATUSES=['CREATED','PREPARING','READY_FOR_PICKUP','IN_DELIVERY','DELIVERED','CANCELED'];
export const CATEGORIES=['DELIVERY_DELAY','MISSING_ITEM','WRONG_ITEM','COMMUNICATION','CANCELLATION_REQUEST','OTHER'];
export const PRIORITIES=['LOW','MEDIUM','HIGH'];
export const INC_STATUSES=['OPEN','IN_PROGRESS','RESOLVED'];
export const ACTION_TYPES=['CREATE_INCIDENT','SET_INCIDENT_PRIORITY','SET_INCIDENT_STATUS','ADD_INCIDENT_NOTE','CREATE_REPLY_DRAFT'];
export const INTENTS=['GET_ORDER','LIST_LATE_ORDERS','LIST_INCIDENTS','ANALYZE_ORDER',...ACTION_TYPES,'UNKNOWN'];
export const uuidRE=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function fail(code='VALIDATION_ERROR',status=400,details) { throw new AppError(code,status,undefined,details); }
export function ensure(test,msg='Confira os campos.',code='VALIDATION_ERROR',status=400) {if(!test)throw new AppError(code,status,msg);}
export function assertUUID(x) {ensure(typeof x==='string' && uuidRE.test(x),'Identificador inválido.');return x;}
export function string(x,min=1,max=120) {ensure(typeof x==='string' && x.trim().length>=min && x.trim().length<=max,`Texto deve ter entre ${min} e ${max} caracteres.`);return x.trim();}
export function oneOf(x,values) {ensure(values.includes(x),`Valor inválido; opções: ${values.join(', ')}.`);return x;}
export function closed(x,allowed,required=[]) {ensure(x && typeof x==='object' && !Array.isArray(x),'Objeto JSON inválido.');for(const key of Object.keys(x))ensure(allowed.includes(key),`Campo não permitido: ${key}`);for(const key of required)ensure(Object.hasOwn(x,key),`Campo obrigatório: ${key}`);return x;}
export function number(x,min,max) {ensure(Number.isInteger(x)&&x>=min&&x<=max,`Número inteiro esperado entre ${min} e ${max}.`);return x;}
export function paging(q={}) {const page=Number(q.page??1),size=Number(q.page_size??20);number(page,1,100000);number(size,1,50);return {page,page_size:size,offset:(page-1)*size};}
export function pagination(rows, count, page, size) {const total=Number(count);return {items:rows,pagination:{page,page_size:size,total_items:total,total_pages:Math.ceil(total/size)}};}
export async function audit(c,{actorId=null,event,entity,entityId=null,requestId='system',source='MANUAL',before={},after={},meta={}}) {
 // No raw chat text / credentials in audit. Callers must supply sanitized metadata only.
 await c.query(`INSERT INTO audit_logs(actor_user_id,actor_kind,request_id,event_type,entity_type,entity_id,source,before_data,after_data,metadata)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[actorId,actorId?'USER':'SYSTEM',requestId,event,entity,entityId,source,JSON.stringify(before),JSON.stringify(after),JSON.stringify(meta)]);
}
export function sanitizeIncident(i) {return {id:i.id,order_id:i.order_id,category:i.category,status:i.status,priority:i.priority,version:i.version,assigned_to_user_id:i.assigned_to_user_id};}
export function lateSQL(alias='o') {const grace=int('LATE_GRACE_MINUTES',5,0,60);return `(${alias}.status NOT IN ('DELIVERED','CANCELED') AND now() > ${alias}.estimated_delivery_at + interval '${grace} minutes')`;}
export function delaySQL(alias='o') {return `CASE WHEN ${alias}.status NOT IN ('DELIVERED','CANCELED') THEN greatest(0,floor(extract(epoch from (now() - ${alias}.estimated_delivery_at))/60))::int ELSE 0 END`;}
export const hash=(x)=>crypto.createHash('sha256').update(String(x)).digest('hex');
export function safeText(x,max) {return typeof x === 'string' ? x.replace(/<[^>]*>/g,'').slice(0,max).trim() : '';}
