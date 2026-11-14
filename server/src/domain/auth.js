import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { sql, transaction } from '../db/index.js';
import { get, isProduction, int } from '../config.js';
import { AppError, fail, ensure, string, hash, audit } from './common.js';

export const cookieName=()=>isProduction()?'__Host-da_session':'da_session';
const cookieOpts=()=>({httpOnly:true,sameSite:'lax',secure:isProduction(),path:'/',maxAge:int('SESSION_MAX_HOURS',8,1,8)*3600000});
export function publicUser(u){return {id:u.id,name:u.name,email:u.email,role:u.role,is_demo_account:u.is_demo_account};}
export function csrf(sessionId){return crypto.createHmac('sha256',get('CSRF_SECRET','')).update(`deliveryassist-csrf:${sessionId}`).digest('hex');}
export function safeEqual(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y);}
function parseCookies(req){const result={};for(const item of (req.headers.cookie||'').split(';')){const i=item.indexOf('=');if(i>0){const k=item.slice(0,i).trim();try{result[k]=decodeURIComponent(item.slice(i+1).trim());}catch{ /* malformed cookie */ }}}return result;}
export async function requireAuth(req,_res,next){
  try{
    const raw=parseCookies(req)[cookieName()];if(!raw)fail('UNAUTHENTICATED',401);
    let payload;try{payload=jwt.verify(raw,get('JWT_SECRET'),{algorithms:['HS256']});}catch{fail('UNAUTHENTICATED',401);}
    if(typeof payload.jti!=='string'||typeof payload.sub!=='string')fail('UNAUTHENTICATED',401);
    const r=await sql(`SELECT s.id AS session_id,s.expires_at,u.id,u.name,u.email,u.role,u.is_demo_account,u.is_active FROM auth_sessions s JOIN users u ON u.id=s.user_id
      WHERE s.jti_hash=$1 AND s.user_id=$2 AND s.revoked_at IS NULL AND s.expires_at>now() AND u.is_active=true`,[hash(payload.jti),payload.sub]);
    if(!r.rowCount)fail('UNAUTHENTICATED',401);
    req.auth={...r.rows[0],user_id:r.rows[0].id};req.auth.csrf_token=csrf(req.auth.session_id);
    next();
  }catch(e){next(e);}
}
export function requireAdmin(req,_res,next){if(req.auth?.role!=='ADMIN')return next(new AppError('FORBIDDEN',403));next();}
export function requireCsrf(req,_res,next){if(!req.auth||!safeEqual(req.headers['x-csrf-token'],req.auth.csrf_token))return next(new AppError('FORBIDDEN',403,'Proteção de sessão: atualize a página e tente novamente.'));next();}
export function verifyOrigin(req,_res,next){
  try{
    const allowed=get('APP_BASE_URL');
    const origin=req.headers.origin;
    const referer=req.headers.referer;
    const isLocal=!isProduction()&&['http://localhost:5173','http://127.0.0.1:5173','http://localhost:3001','http://127.0.0.1:3001'].includes(origin);
    let refererOrigin;try{if(referer)refererOrigin=new URL(referer).origin;}catch{fail('FORBIDDEN',403);}
    if(!allowed || !(origin===allowed || isLocal || (!origin&&refererOrigin===allowed)))fail('FORBIDDEN',403);
    if(!req.is('application/json')) throw new AppError('VALIDATION_ERROR',400,'Content-Type deve ser application/json.');
    next();
  }catch(e){next(e);}
}
async function loginRate(key,success=false){
  await sql(`INSERT INTO login_attempts(key_hash,failures,window_start,locked_until) VALUES($1,$2,now(),NULL)
      ON CONFLICT(key_hash) DO UPDATE SET
      failures=CASE WHEN login_attempts.window_start<now()-interval '15 minutes' OR $2=0 THEN $2 ELSE login_attempts.failures+$2 END,
      window_start=CASE WHEN login_attempts.window_start<now()-interval '15 minutes' OR $2=0 THEN now() ELSE login_attempts.window_start END,
      locked_until=CASE WHEN $2=0 THEN NULL WHEN login_attempts.failures+1>=8 THEN now()+interval '10 minutes' ELSE login_attempts.locked_until END`,[key,success?0:1]);
}
export async function login(req,res){
  const body=req.body||{};ensure(typeof body.email==='string'&&typeof body.password==='string','Credenciais inválidas.');
  const email=body.email.trim().toLowerCase();ensure(email.length<=254&&body.password.length<=200,'Credenciais inválidas.');
  const keys=[hash(`login:${email}:${req.ip}`),hash(`login-ip:${req.ip}`)];
  const current=await sql('SELECT locked_until FROM login_attempts WHERE key_hash=ANY($1::varchar[])',[keys]);
  if(current.rows.some(row=>row.locked_until&&new Date(row.locked_until)>new Date()))fail('RATE_LIMITED',429);
  const r=await sql('SELECT * FROM users WHERE email=$1 AND is_active=true',[email]);
  const dummy='$2b$12$SA4qVgAEgBq8dQeK35aCIu12S73RJ0hG2rwocwaZQzQ44ylfOa/0e';
  const valid=await bcrypt.compare(body.password,r.rows[0]?.password_hash||dummy);
  if(!r.rowCount||!valid){for(const key of keys)await loginRate(key);throw new AppError('UNAUTHENTICATED',401,'Credenciais inválidas.');}
  for(const key of keys)await loginRate(key,true);
  const u=r.rows[0],jti=crypto.randomUUID(),expiresIn=int('SESSION_MAX_HOURS',8,1,8)*3600;
  const token=jwt.sign({sub:u.id,jti,role:u.role},get('JWT_SECRET'),{algorithm:'HS256',expiresIn});
  const result=await sql(`INSERT INTO auth_sessions(user_id,jti_hash,expires_at,user_agent_digest) VALUES($1,$2,now()+($3||' seconds')::interval,$4) RETURNING *`,[u.id,hash(jti),String(expiresIn),req.headers['user-agent']?hash(req.headers['user-agent']):null]);
  await transaction(c=>audit(c,{actorId:u.id,event:'AUTH_LOGIN_SUCCESS',entity:'SESSION',entityId:result.rows[0].id,requestId:req.id,meta:{role:u.role}}));
  res.cookie(cookieName(),token,cookieOpts());return {user:publicUser(u),csrf_token:csrf(result.rows[0].id),session_expires_at:result.rows[0].expires_at};
}
export async function logout(req,res){await transaction(async c=>{
  await c.query('UPDATE auth_sessions SET revoked_at=now() WHERE id=$1',[req.auth.session_id]);
  await audit(c,{actorId:req.auth.id,event:'AUTH_LOGOUT',entity:'SESSION',entityId:req.auth.session_id,requestId:req.id});
});res.clearCookie(cookieName(),{...cookieOpts(),maxAge:undefined});return {logged_out:true};}
export async function listUsers(q){const page=Number(q.page??1),size=Number(q.page_size??20);ensure(Number.isInteger(page)&&page>=1&&Number.isInteger(size)&&size>=1&&size<=50,'Paginação inválida.');
  const [r,c]=await Promise.all([sql('SELECT id,name,email,role,is_active,is_demo_account,created_at,updated_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',[size,(page-1)*size]),sql('SELECT count(*)::int AS n FROM users')]);
  return {items:r.rows,pagination:{page,page_size:size,total_items:c.rows[0].n,total_pages:Math.ceil(c.rows[0].n/size)}};
}
export async function createUser(c,b,actorId,requestId){
  const {closed,oneOf}=await import('./common.js');closed(b,['name','email','role','password'],['name','email','role','password']);
  const name=string(b.name,2,120),email=string(b.email,5,254).toLowerCase(),role=oneOf(b.role,['ADMIN','OPERATOR']);
  ensure(/^\S+@\S+\.\S+$/.test(email),'E-mail inválido.');ensure(typeof b.password==='string'&&b.password.length>=12&&b.password.length<=200,'Senha deve ter pelo menos 12 caracteres.');
  const pwd=await bcrypt.hash(b.password,12);
  const r=await c.query('INSERT INTO users(name,email,role,password_hash) VALUES($1,$2,$3,$4) RETURNING id,name,email,role,is_active,is_demo_account,created_at',[name,email,role,pwd]);
  await audit(c,{actorId,event:'USER_CREATED',entity:'USER',entityId:r.rows[0].id,requestId,after:{role}});return r.rows[0];
}
export async function patchUser(c,id,b,actorId,requestId){
  const {closed,oneOf,assertUUID}=await import('./common.js');assertUUID(id);closed(b,['name','role','is_active']);ensure(Object.keys(b).length>0,'Informe campo para alterar.');
  const old=await c.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[id]);if(!old.rowCount)fail('NOT_FOUND',404);
  const x=old.rows[0],name=b.name===undefined?x.name:string(b.name,2,120),role=b.role===undefined?x.role:oneOf(b.role,['ADMIN','OPERATOR']);
  const active=b.is_active===undefined?x.is_active:b.is_active;ensure(typeof active==='boolean','is_active deve ser booleano.');
  if(x.id===actorId)ensure(role==='ADMIN'&&active===true,'Não é possível remover o próprio acesso administrativo.');
  if(x.role==='ADMIN'&&(role!=='ADMIN'||!active)){
    const r=await c.query("SELECT count(*)::int AS n FROM users WHERE role='ADMIN' AND is_active AND id<>$1",[id]);ensure(r.rows[0].n>0,'É obrigatório manter pelo menos um administrador ativo.');
  }
  const changed=role!==x.role || active!==x.is_active;
  const r=await c.query('UPDATE users SET name=$1,role=$2,is_active=$3,updated_at=now() WHERE id=$4 RETURNING id,name,email,role,is_active,is_demo_account',[name,role,active,id]);
  if(changed) await c.query('UPDATE auth_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',[id]);
  await audit(c,{actorId,event:'USER_UPDATED',entity:'USER',entityId:id,requestId,before:{role:x.role,is_active:x.is_active},after:{role,is_active:active}});
  return r.rows[0];
}
export async function resetPassword(c,id,b,actorId,requestId){
  const {closed,assertUUID}=await import('./common.js');assertUUID(id);closed(b,['password'],['password']);
  ensure(typeof b.password==='string'&&b.password.length>=12&&b.password.length<=200,'Senha deve ter pelo menos 12 caracteres.');
  const r=await c.query('UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2 RETURNING id',[await bcrypt.hash(b.password,12),id]);if(!r.rowCount)fail('NOT_FOUND',404);
  await c.query('UPDATE auth_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',[id]);
  await audit(c,{actorId,event:'PASSWORD_RESET',entity:'USER',entityId:id,requestId});return {password_reset:true,sessions_revoked:true};
}
export async function verifyAdminPassword(userId,pwd){const r=await sql("SELECT password_hash FROM users WHERE id=$1 AND role='ADMIN' AND is_active=true",[userId]);return r.rowCount&&await bcrypt.compare(String(pwd),r.rows[0].password_hash);}

export async function adminResetRate(userId,success=false){
  const key=hash(`admin-reset:${userId}`);
  const r=await sql('SELECT locked_until FROM login_attempts WHERE key_hash=$1',[key]);
  if(r.rows[0]?.locked_until&&new Date(r.rows[0].locked_until)>new Date())fail('RATE_LIMITED',429);
  await loginRate(key,success);
}
