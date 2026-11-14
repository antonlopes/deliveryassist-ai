import {test,expect,describe,beforeEach} from '@jest/globals';
import {AppError} from '../src/domain/common.js';
import {normalizeJson,normalizeProviderResponse,providerCall} from '../src/ai/providers.js';
import {validateIntent,validateReply,normalizeAction} from '../src/ai/contracts.js';
const UUID='f6ca6b58-036c-4adf-ab70-e671c988515f',OTHER='b6b46b93-3a48-4aae-9d78-91a0b21895e5';
const intent={intent:'CREATE_INCIDENT',order_code:'PED-1052',incident_id:null,needs_clarification:false,clarifying_question:null,requested_actions:['CREATE_INCIDENT'],rationale_brief:null};
const reply={answer:'Pedido informado em análise.',evidence_refs:[{entity_type:'ORDER',entity_id:UUID}],proposed_actions:[],requires_clarification:false,clarifying_question:null};
describe('IA: validação fechada',()=>{
 test('intenção permitida e campos completos',()=>expect(validateIntent(intent).intent).toBe('CREATE_INCIDENT'));
 test('rejeita ação genérica',()=>expect(()=>validateIntent({...intent,requested_actions:['RUN_SQL']})).toThrow());
 test('rejeita campo extra de modelo',()=>expect(()=>validateIntent({...intent,sql:'DELETE FROM users'})).toThrow());
 test('resposta com referências reais sintaticamente válidas',()=>expect(validateReply(reply).answer).toBeDefined());
 test('JSON quebrado não recupera autorização',()=>expect(()=>normalizeJson('{"role":')).toThrow(AppError));
 test('resposta contendo ação desconhecida falha',()=>expect(()=>validateReply({...reply,proposed_actions:[{type:'DROP_ALL',target_ref:{entity_type:'ORDER',entity_id:UUID},parameters:{},reason:'reparo'}]})).toThrow());
 test('não confia no UUID de entidade diferente',()=>expect(()=>normalizeAction({type:'CREATE_INCIDENT',target_ref:{entity_type:'ORDER',entity_id:OTHER},parameters:{category:'DELIVERY_DELAY',priority:'HIGH',description:'Atraso registrado com atenção.'},reason:'Criticidade'}, {order:{id:UUID}})).toThrow());
 test('injetar versões apenas a partir de entidade consultada',()=>{
   const r=normalizeAction({type:'SET_INCIDENT_PRIORITY',target_ref:{entity_type:'INCIDENT',entity_id:UUID},parameters:{priority:'HIGH'},reason:'Alta prioridade'}, {incident:{id:UUID,version:7}});
   expect(r.parameters.expected_version).toBe(7);
 });
});
describe('Adaptadores LLM externos: normalização',()=>{
 test('OpenAI compatible JSON e tokens',()=>{
   const r=normalizeProviderResponse('openai_compatible',{choices:[{message:{content:JSON.stringify(intent)}}],usage:{prompt_tokens:12,completion_tokens:40}});
   expect(r.value.intent).toBe('CREATE_INCIDENT');expect(r.tokens.output_tokens).toBe(40);
 });
 test('Gemini native JSON e tokens',()=>{
   const r=normalizeProviderResponse('gemini_native',{candidates:[{content:{parts:[{text:JSON.stringify(reply)}]}}],usageMetadata:{promptTokenCount:8,candidatesTokenCount:21}});
   expect(r.value.evidence_refs).toHaveLength(1);expect(r.tokens.input_tokens).toBe(8);
 });
 test('API 401 retorna erro seguro sem vazar token',async()=>{
   process.env.AI_ENABLED='true';process.env.AI_PROVIDER='openai_compatible';process.env.AI_MODEL='testing';process.env.AI_BASE_URL='https://api.openai.com/v1';process.env.AI_API_KEY='secret-for-tests';
   await expect(providerCall([{role:'user',content:'test'}],{fetchImpl:async()=>new Response('',{status:401})})).rejects.toMatchObject({code:'AI_UNAVAILABLE'});
 });
 test('timeout normalizado',async()=>{
   process.env.AI_ENABLED='true';process.env.AI_PROVIDER='openai_compatible';process.env.AI_MODEL='testing';process.env.AI_BASE_URL='https://api.openai.com/v1';process.env.AI_API_KEY='secret-for-tests';
   await expect(providerCall([{role:'user',content:'test'}],{fetchImpl:async()=>{const e=new Error('abort');e.name='AbortError';throw e;}})).rejects.toMatchObject({code:'AI_TIMEOUT'});
 });
});
