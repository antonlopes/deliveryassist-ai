import { get, int, aiEnabled } from '../config.js';
import { AppError, ensure } from '../domain/common.js';

export function providerConfig() {
  if(!aiEnabled())return null;
  const type=get('AI_PROVIDER'),model=get('AI_MODEL'),key=get('AI_API_KEY'),base=get('AI_BASE_URL');
  if(!['openai_compatible','gemini_native'].includes(type)||!model||!key||!base)throw new AppError('AI_UNAVAILABLE',503);
  let url;try{url=new URL(base);}catch{throw new AppError('AI_UNAVAILABLE',503);}
  const hosts=get('AI_ALLOWED_HOSTS','api.openai.com,generativelanguage.googleapis.com').split(',').map(x=>x.trim().toLowerCase());
  ensure(url.protocol==='https:'&&hosts.includes(url.hostname.toLowerCase())&&!url.username&&!url.password&&!url.port,
    'Host do provedor de IA não autorizado.','AI_UNAVAILABLE',503);
  return {type,model,key,base:url.toString().replace(/\/$/,'')};
}
export function normalizeJson(text) {
  if(typeof text!=='string'||text.length>24000)throw new AppError('INVALID_AI_OUTPUT',422);
  let value;try{value=JSON.parse(text.trim());}catch{throw new AppError('INVALID_AI_OUTPUT',422);}
  if(!value||typeof value!=='object'||Array.isArray(value))throw new AppError('INVALID_AI_OUTPUT',422);
  return value;
}
export function normalizeProviderResponse(type,raw) {
  let text,tokens;
  if(type==='openai_compatible') {
    text=raw?.choices?.[0]?.message?.content;
    tokens={input_tokens:raw?.usage?.prompt_tokens??null,output_tokens:raw?.usage?.completion_tokens??null};
  } else {
    text=raw?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('');
    tokens={input_tokens:raw?.usageMetadata?.promptTokenCount??null,output_tokens:raw?.usageMetadata?.candidatesTokenCount??null};
  }
  if(typeof text!=='string')throw new AppError('INVALID_AI_OUTPUT',422);
  return {value:normalizeJson(text),tokens};
}
export async function providerCall(messages,{signal,fetchImpl}={}){
  fetchImpl ||= get('NODE_ENV')==='test' && globalThis.__DELIVERYAI_TEST_FETCH ? globalThis.__DELIVERYAI_TEST_FETCH : fetch;
  const conf=providerConfig();if(!conf)throw new AppError('AI_UNAVAILABLE',503);
  const timeout=int('AI_TIMEOUT_MS',20000,1000,45000);
  const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),timeout);
  const propagate=()=>ctl.abort();signal?.addEventListener('abort',propagate,{once:true});
  const payload=conf.type==='openai_compatible'
    ? {model:conf.model,messages:messages.map(x=>({role:x.role,content:x.content})),temperature:0.1,max_tokens:int('AI_MAX_OUTPUT_TOKENS',700,100,6000),response_format:{type:'json_object'}}
    : {systemInstruction:{parts:[{text:messages.filter(x=>x.role==='system').map(x=>x.content).join('\n')}]},
      contents:messages.filter(x=>x.role!=='system').map(x=>({role:x.role==='assistant'?'model':'user',parts:[{text:x.content}]})),
      generationConfig:{temperature:0.1,maxOutputTokens:int('AI_MAX_OUTPUT_TOKENS',700,100,6000),responseMimeType:'application/json'}};
  const url=conf.type==='openai_compatible'?`${conf.base}/chat/completions`:`${conf.base}/models/${encodeURIComponent(conf.model)}:generateContent`;
  const headers={'Content-Type':'application/json',...(conf.type==='openai_compatible'?{Authorization:`Bearer ${conf.key}`}:{'x-goog-api-key':conf.key})};
  const t=Date.now();
  try{
    const r=await fetchImpl(url,{method:'POST',headers,body:JSON.stringify(payload),signal:ctl.signal,redirect:'manual'});

    if (!r.ok) {
      console.error('Gemini API HTTP status:', r.status);

      if (r.status === 429) {
        throw new AppError('RATE_LIMITED', 429, 'Limite temporário do provedor de IA.');
      }

      if ([401, 403].includes(r.status)) {
        throw new AppError('AI_UNAVAILABLE', 503);
      }

      throw new AppError('AI_PROVIDER_ERROR', 502);
    }

    let json;try{json=await r.json();}catch{throw new AppError('INVALID_AI_OUTPUT',422);}
    const result=normalizeProviderResponse(conf.type,json);
    return {...result,duration_ms:Date.now()-t,provider:conf.type,model:conf.model};

  } catch (e) {
    if (e?.name === 'AbortError' || ctl.signal.aborted) {
      throw new AppError('AI_TIMEOUT', 504);
    }

    if (e instanceof AppError) {
      throw e;
    }

    console.error('AI provider unexpected error:', {
      name: e?.name || 'Unknown',
      message: String(e?.message || 'Unknown error').slice(0, 300),
      causeCode: e?.cause?.code || null
    });

    throw new AppError('AI_PROVIDER_ERROR', 502);

  }finally{clearTimeout(timer);signal?.removeEventListener('abort',propagate);}
}
