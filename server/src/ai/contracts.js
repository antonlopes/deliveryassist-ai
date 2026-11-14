import { AppError, INTENTS, ACTION_TYPES, CATEGORIES, PRIORITIES, INC_STATUSES, uuidRE, safeText } from '../domain/common.js';
function assertAI(test){if(!test)throw new AppError('INVALID_AI_OUTPUT',422);}
function exact(obj,keys){assertAI(obj && typeof obj==='object'&&!Array.isArray(obj));assertAI(Object.keys(obj).every(k=>keys.includes(k)));}
export function validateIntent(o){
  const keys=['intent','order_code','incident_id','needs_clarification','clarifying_question','requested_actions','rationale_brief'];
  exact(o,keys);assertAI(keys.every(k=>Object.hasOwn(o,k)));
  assertAI(INTENTS.includes(o.intent));assertAI(o.order_code===null||(typeof o.order_code==='string'&&/^PED-\d{1,8}$/i.test(o.order_code)));
  assertAI(o.incident_id===null||(typeof o.incident_id==='string'&&uuidRE.test(o.incident_id)));
  assertAI(typeof o.needs_clarification==='boolean');assertAI(o.clarifying_question===null||(typeof o.clarifying_question==='string'&&o.clarifying_question.length<=250));
  assertAI(!o.needs_clarification||(typeof o.clarifying_question==='string'&&o.clarifying_question.length>=1));
  assertAI(Array.isArray(o.requested_actions)&&o.requested_actions.length<=3&&o.requested_actions.every(x=>ACTION_TYPES.includes(x)));
  assertAI(o.rationale_brief===null||(typeof o.rationale_brief==='string'&&o.rationale_brief.length<=300));return o;
}
export function validateReply(o){
  const keys=['answer','evidence_refs','proposed_actions','requires_clarification','clarifying_question'];exact(o,keys);assertAI(keys.every(k=>Object.hasOwn(o,k)));
  assertAI(typeof o.answer==='string'&&o.answer.length<=1800);
  assertAI(typeof o.requires_clarification==='boolean');assertAI(o.clarifying_question===null||(typeof o.clarifying_question==='string'&&o.clarifying_question.length<=250));
  assertAI(Array.isArray(o.evidence_refs)&&o.evidence_refs.length<=10);
  for(const ref of o.evidence_refs){exact(ref,['entity_type','entity_id']);assertAI(['ORDER','INCIDENT'].includes(ref.entity_type)&&uuidRE.test(ref.entity_id));}
  assertAI(Array.isArray(o.proposed_actions)&&o.proposed_actions.length<=3);
  for(const a of o.proposed_actions){exact(a,['type','target_ref','parameters','reason']);assertAI(ACTION_TYPES.includes(a.type));
    exact(a.target_ref,['entity_type','entity_id']);assertAI(['ORDER','INCIDENT','PROPOSAL_RESULT'].includes(a.target_ref.entity_type));
    assertAI(a.target_ref.entity_id===null||uuidRE.test(a.target_ref.entity_id));
    assertAI(typeof a.reason==='string'&&a.reason.trim().length>=3&&a.reason.length<=600);
    assertAI(a.parameters&&typeof a.parameters==='object'&&!Array.isArray(a.parameters));
  }
  return {...o,answer:safeText(o.answer,1800)};
}
export function normalizeAction(a,ctx){
  // Only data and identifiers resolved by the backend, never model-provided IDs or versions.
  const p=a.parameters, allowed=(list)=>assertAI(Object.keys(p).every(k=>list.includes(k)));
  if(!ctx.order&&!ctx.incident)throw new AppError('INVALID_AI_OUTPUT',422);
  const target=ctx.incident;
  const existing=ctx.activeIncident;
  if(a.type==='CREATE_INCIDENT'){
    assertAI(ctx.order && a.target_ref.entity_type==='ORDER' && a.target_ref.entity_id===ctx.order.id);
    allowed(['category','priority','description']);
    assertAI(CATEGORIES.includes(p.category)&&PRIORITIES.includes(p.priority)&&typeof p.description==='string'&&p.description.trim().length>=15&&p.description.length<=2000);
    if(existing && existing.category===p.category)return null; // no duplicate suggestions
    return {type:a.type,target_type:'ORDER',target_id:ctx.order.id,parameters:{order_id:ctx.order.id,category:p.category,priority:p.priority,description:safeText(p.description,2000)},observed_entity_version:null,reason:safeText(a.reason,600)};
  }
  if(['SET_INCIDENT_PRIORITY','SET_INCIDENT_STATUS'].includes(a.type)){
    assertAI(target&&a.target_ref.entity_type==='INCIDENT'&&a.target_ref.entity_id===target.id);
    allowed(a.type==='SET_INCIDENT_PRIORITY'?['priority']:['status','reason']);
    if(a.type==='SET_INCIDENT_PRIORITY')assertAI(PRIORITIES.includes(p.priority));else{
      assertAI(INC_STATUSES.includes(p.status));if(target.status==='RESOLVED'&&p.status==='IN_PROGRESS')assertAI(typeof p.reason==='string'&&p.reason.trim().length>=10);
      if(p.reason!==undefined)assertAI(typeof p.reason==='string'&&p.reason.length<=600);
    }
    return {type:a.type,target_type:'INCIDENT',target_id:target.id,parameters:{incident_id:target.id,expected_version:target.version,...(a.type==='SET_INCIDENT_PRIORITY'?{priority:p.priority}:{status:p.status,...(p.reason?{reason:safeText(p.reason,600)}:{})})},observed_entity_version:target.version,reason:safeText(a.reason,600)};
  }
  if(['ADD_INCIDENT_NOTE','CREATE_REPLY_DRAFT'].includes(a.type)){
    allowed(a.type==='ADD_INCIDENT_NOTE'?['content']:['body']);
    const text=a.type==='ADD_INCIDENT_NOTE'?p.content:p.body;
    assertAI(typeof text==='string'&&text.trim().length>=1&&text.length<=(a.type==='ADD_INCIDENT_NOTE'?1000:2000));
    const wantsDependency=a.target_ref.entity_type==='PROPOSAL_RESULT';
    const parent=ctx.createProposal;
    const link=ctx.incident||ctx.activeIncident;
    if(wantsDependency)assertAI(parent && a.target_ref.entity_id===null);
    else assertAI(link && a.target_ref.entity_type==='INCIDENT' && a.target_ref.entity_id===link.id);
    return {type:a.type,target_type:wantsDependency?'PROPOSAL_RESULT':'INCIDENT',target_id:wantsDependency?null:link.id,
      depends_on_proposal_id:wantsDependency?parent:null,
      parameters:{...(!wantsDependency?{incident_id:link.id}:{}),[a.type==='ADD_INCIDENT_NOTE'?'content':'body']:safeText(text,a.type==='ADD_INCIDENT_NOTE'?1000:2000)},
      observed_entity_version:null,reason:safeText(a.reason,600)};
  }
  throw new AppError('INVALID_AI_OUTPUT',422);
}
