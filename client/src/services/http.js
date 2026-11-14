let csrf='';
export function setCsrf(token){csrf=token||'';}
export class HttpError extends Error {
  constructor(msg,code,status,details={}){super(msg);this.code=code;this.status=status;this.details=details;}
}
export async function api(path,{method='GET',body,headers={},signal}={}){
  const verb=method.toUpperCase();
  const options={method:verb,credentials:'include',headers:{...headers},signal};
  if(!['GET','HEAD'].includes(verb)){
    options.headers['Content-Type']='application/json';
    if(csrf && path!=='/auth/login')options.headers['X-CSRF-Token']=csrf;
    options.body=JSON.stringify(body??{});
  }
  let res;
  try{res=await fetch(`/api/v1${path}`,options);}catch(e){throw new HttpError('Falha de conexão. Verifique sua internet e tente novamente.','NETWORK_ERROR',0,{original:e.name});}
  let response;
  try{response=await res.json();}catch{throw new HttpError('Resposta inválida do servidor.','BAD_RESPONSE',res.status);}
  if(!res.ok){throw new HttpError(response.error?.message||'Não foi possível concluir.',response.error?.code||'HTTP_ERROR',res.status,response.error?.details||{});}
  return response;
}
