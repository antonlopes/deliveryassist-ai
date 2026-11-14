import crypto from 'node:crypto';
import { transaction } from '../db/index.js';
import { AppError, fail, assertUUID, hash, audit, CATEGORIES, PRIORITIES, INC_STATUSES, string, number } from '../domain/common.js';
import { lockedDemo, createIncidentTx, patchIncidentTx, addNoteTx, createDraftTx, getActiveIncident, getIncident } from '../domain/operations.js';
import { getProposal,cancelDependents,expireProposal } from './orchestrator.js';

function payloadHash(pid){return hash(JSON.stringify({operation:'approve',proposal_id:pid,body:{}}));}
function linkOf(type,id){return type==='INCIDENT'?`/incidents/${id}`:`/incidents`;}
async function actionTx(c,p,actorId,requestId){
  const b=p.parameters;
  // Domain services revalidate every field and entity while row locks are held.
  if(p.type==='CREATE_INCIDENT'){
    if(!p.target_id||p.target_type!=='ORDER'||b.order_id!==p.target_id||!CATEGORIES.includes(b.category)||!PRIORITIES.includes(b.priority))fail('ACTION_NOT_APPROVABLE',409);
    const active=await getActiveIncident(p.target_id,b.category,c);if(active)fail('DUPLICATE_ACTIVE_INCIDENT',409);
    const result=await createIncidentTx(c,b,actorId,requestId,'AI_APPROVED');return {entity_type:'INCIDENT',entity_id:result.id};
  }
  if(['SET_INCIDENT_PRIORITY','SET_INCIDENT_STATUS'].includes(p.type)){
    if(!p.target_id||p.target_type!=='INCIDENT'||b.incident_id!==p.target_id||b.expected_version!==p.observed_entity_version)fail('ACTION_NOT_APPROVABLE',409);
    number(b.expected_version,1,100000000);
    if(p.type==='SET_INCIDENT_PRIORITY'&&!PRIORITIES.includes(b.priority))fail('ACTION_NOT_APPROVABLE',409);
    if(p.type==='SET_INCIDENT_STATUS'&&!INC_STATUSES.includes(b.status))fail('ACTION_NOT_APPROVABLE',409);
    const old=await getIncident(p.target_id,c,true);if(old.version!==p.observed_entity_version)fail('STALE_VERSION',409);
    // incident_id is an immutable AI proposal reference, not an incident PATCH DTO field.
    const { incident_id: _verifiedReference, ...patchBody } = b;
    const r=await patchIncidentTx(c,p.target_id,patchBody,actorId,requestId,'AI_APPROVED');return {entity_type:'INCIDENT',entity_id:r.id};
  }
  if(['ADD_INCIDENT_NOTE','CREATE_REPLY_DRAFT'].includes(p.type)){
    if(p.target_type!=='INCIDENT'||!p.target_id||b.incident_id!==p.target_id)fail('ACTION_NOT_APPROVABLE',409);
    if(p.type==='ADD_INCIDENT_NOTE'){
      if(Object.keys(b).some(k=>!['incident_id','content'].includes(k)))fail('ACTION_NOT_APPROVABLE',409);
      const r=await addNoteTx(c,p.target_id,string(b.content,1,1000),actorId,requestId,'AI_APPROVED');return {entity_type:'NOTE',entity_id:r.id};
    }
    if(Object.keys(b).some(k=>!['incident_id','body'].includes(k)))fail('ACTION_NOT_APPROVABLE',409);
    const r=await createDraftTx(c,p.target_id,string(b.body,1,2000),actorId,requestId,'AI_APPROVED');return {entity_type:'DRAFT',entity_id:r.id};
  }
  fail('ACTION_NOT_APPROVABLE',409);
}
async function expireAndCancelIfNeeded(pid,auth){
  await transaction(async c=>{await lockedDemo(c);const p=await getProposal(pid,auth,c,true);
    if(['PENDING','BLOCKED'].includes(p.status) && new Date(p.expires_at)<=new Date())await expireProposal(c,p);
  }).catch(()=>{});
}
export async function approveProposal(pid,auth,key,requestId){
  assertUUID(pid);assertUUID(key);
  const requestHash=payloadHash(pid);
  try{return await transaction(async c=>{
    await lockedDemo(c);
    await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`idem:${auth.id}:${key}`]);
    const previous=await c.query('SELECT * FROM idempotency_records WHERE user_id=$1 AND operation_scope=\'approve\' AND idempotency_key=$2 FOR UPDATE',[auth.id,key]);
    if(previous.rowCount){if(previous.rows[0].request_hash!==requestHash)fail('IDEMPOTENCY_KEY_REUSED',409);
      return {data:previous.rows[0].response_body,meta:{replayed:true}};}
    const p=await getProposal(pid,auth,c,true);
    if(new Date(p.expires_at)<=new Date()&&['PENDING','BLOCKED'].includes(p.status))fail('PROPOSAL_EXPIRED',410);
    if(p.status!=='PENDING')fail('ACTION_NOT_APPROVABLE',409);
    if(p.depends_on_proposal_id){const parent=await c.query('SELECT status,execution_result_id,group_id,conversation_id FROM action_proposals WHERE id=$1',[p.depends_on_proposal_id]);
      if(!parent.rowCount||parent.rows[0].status!=='EXECUTED'||parent.rows[0].group_id!==p.group_id||parent.rows[0].conversation_id!==p.conversation_id)fail('ACTION_NOT_APPROVABLE',409);}
    const result=await actionTx(c,p,auth.id,requestId);
    const exec=await c.query('INSERT INTO action_executions(proposal_id,idempotency_key,actor_user_id,result_entity_type,result_entity_id,outcome) VALUES($1,$2,$3,$4,$5,\'SUCCESS\') RETURNING id',[pid,key,auth.id,result.entity_type,result.entity_id]);
    await c.query("UPDATE action_proposals SET status='EXECUTED',approved_by_user_id=$1,execution_result_id=$2,updated_at=now() WHERE id=$3",[auth.id,result.entity_id,pid]);

    const dep = await c.query(
      `UPDATE action_proposals
      SET status = 'PENDING',
          target_type = 'INCIDENT',
          target_id = $1::uuid,
          parameters = jsonb_set(
            parameters,
            '{incident_id}',
            to_jsonb(($1::uuid)::text)
          ),
          updated_at = now()
      WHERE depends_on_proposal_id = $2::uuid
        AND status = 'BLOCKED'
        AND expires_at > now()
      RETURNING id`,
      [result.entity_id, pid]
    );

    // jsonb_set accepts UUID value as TEXT JSON; final domain parameter is textual UUID.
    await c.query("UPDATE action_proposals SET status='EXPIRED',updated_at=now() WHERE depends_on_proposal_id=$1 AND status='BLOCKED' AND expires_at<=now()",[pid]);
    await audit(c,{actorId:auth.id,event:'AI_PROPOSAL_APPROVED',entity:'PROPOSAL',entityId:pid,requestId,source:'AI_APPROVED',meta:{type:p.type}});
    await audit(c,{actorId:auth.id,event:'AI_ACTION_EXECUTED',entity:result.entity_type,entityId:result.entity_id,requestId,source:'AI_APPROVED',meta:{proposal_id:pid,execution_id:exec.rows[0].id}});
    const body={proposal_id:pid,proposal_status:'EXECUTED',execution_id:exec.rows[0].id,result:{entity_type:result.entity_type,entity_id:result.entity_id,link:linkOf(result.entity_type,result.entity_id)},dependents_released:dep.rows.map(x=>x.id)};
    await c.query("INSERT INTO idempotency_records(user_id,operation_scope,idempotency_key,request_hash,http_status,response_body,expires_at) VALUES($1,'approve',$2,$3,200,$4,now()+interval '48 hours')",[auth.id,key,requestHash,JSON.stringify(body)]);
    return {data:body,meta:{replayed:false}};
  });}
  catch(e){
    if(e.code==='PROPOSAL_EXPIRED')await expireAndCancelIfNeeded(pid,auth);
    if(['STALE_VERSION','DUPLICATE_ACTIVE_INCIDENT','ACTION_NOT_APPROVABLE'].includes(e.code) && e.code!=='ACTION_NOT_APPROVABLE'){
      await transaction(async c=>{
        const p=await getProposal(pid,auth,c,true);
        if(p.status==='PENDING'){
          await c.query("UPDATE action_proposals SET status='FAILED',updated_at=now() WHERE id=$1",[pid]);await cancelDependents(c,pid);
          await audit(c,{actorId:auth.id,event:'AI_ACTION_FAILED',entity:'PROPOSAL',entityId:pid,requestId,source:'AI_APPROVED',meta:{code:e.code}});
        }
      }).catch(()=>{});
    }
    throw e;
  }
}
