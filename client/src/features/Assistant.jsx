import React,{useRef,useState} from 'react';
import {Alert,Avatar,Box,Button,Card,CardContent,Chip,Divider,Grid,IconButton,Paper,Stack,TextField,Tooltip,Typography} from '@mui/material';
import {AddRounded,AutoAwesomeOutlined,CheckCircleOutlined,CloseRounded,HistoryOutlined,SendRounded,SmartToyOutlined,WarningAmberRounded,RefreshOutlined} from '@mui/icons-material';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {Link as RouterLink} from 'react-router-dom';
import {api} from '../services/http.js';
import {PageTitle,StatusBadge,Loading,ErrorState,Empty,FormatDate,actionLabels,MutationButton} from '../components/Shared.jsx';
import {Feedback,ConfirmDialog} from '../components/Ui.jsx';
import {useUI} from '../app/store.js';
const samples=['Mostre o pedido PED-1052','Quais pedidos estão atrasados?','Abra ocorrência de atraso para PED-1060, adicione uma nota e prepare resposta ao cliente.','Liste ocorrências em aberto'];
export function Assistant(){
 const queryClient=useQueryClient(),keys=useRef({});const [selected,setSelected]=useState(''),[text,setText]=useState(''),[error,setError]=useState(''),[success,setSuccess]=useState(''),[confirm,setConfirm]=useState(null);
 const {assistantTips,toggleTips}=useUI();
 const status=useQuery({queryKey:['ai-status'],queryFn:()=>api('/assistant/status')});
 const list=useQuery({queryKey:['conversations'],queryFn:()=>api('/assistant/conversations?page_size=30')});
 const detail=useQuery({queryKey:['conversation',selected],queryFn:()=>api(`/assistant/conversations/${selected}`),enabled:!!selected,refetchInterval:15000});
 const create=useMutation({mutationFn:()=>api('/assistant/conversations',{method:'POST',body:{title:'Atendimento '+new Date().toLocaleDateString('pt-BR')}}),onSuccess:r=>{setSelected(r.data.id);queryClient.invalidateQueries({queryKey:['conversations']});setError('');},onError:e=>setError(e.message)});
 const send=useMutation({mutationFn:()=>api(`/assistant/conversations/${selected}/messages`,{method:'POST',body:{content:text}}),onSuccess:()=>{setText('');setError('');queryClient.invalidateQueries({queryKey:['conversation',selected]});queryClient.invalidateQueries({queryKey:['conversations']});queryClient.invalidateQueries({queryKey:['ai-status']});},onError:e=>setError(e.message)});
 const approve=useMutation({mutationFn:async p=>{
  keys.current[p.id] ||= crypto.randomUUID();
  return api(`/assistant/proposals/${p.id}/approve`,{method:'POST',body:{},headers:{'Idempotency-Key':keys.current[p.id]}});
 },onSuccess:res=>{setConfirm(null);setError('');setSuccess(`Ação confirmada. Execução: ${res.data.execution_id}. Registro atualizado: ${res.data.result?.entity_id}`);queryClient.invalidateQueries();},onError:e=>{setConfirm(null);setError(e.message);queryClient.invalidateQueries({queryKey:['conversation',selected]});}});
 const reject=useMutation({mutationFn:p=>api(`/assistant/proposals/${p.id}/reject`,{method:'POST',body:{}}),onSuccess:()=>{setError('');setSuccess('Proposta rejeitada. Nenhuma operação foi executada.');queryClient.invalidateQueries({queryKey:['conversation',selected]});},onError:e=>setError(e.message)});
 const active=detail.data?.data;
 const available=Boolean(status.data?.data?.available);
 const remaining=status.data?.data?.quotas?.SESSION?.remaining;
 return <><PageTitle title="Assistente de IA" subtitle="Solicitações em português, consultas reais ao banco e sugestões executadas somente após aprovação individual." actions={<Button variant="contained" startIcon={<AddRounded/>} disabled={create.isPending} onClick={()=>create.mutate()}>Nova conversa</Button>}/>
 {!available&&<Alert severity="warning" sx={{mb:2}}>A IA não está habilitada ou não possui configuração válida. Nenhuma resposta fictícia será apresentada como geração de IA. Pedidos e ocorrências permanecem disponíveis para gestão manual.</Alert>}
 {available&&<Alert severity="info" sx={{mb:2}}>Provedor configurado: {status.data?.data.provider_label}. Restam {remaining??'—'} turnos de IA para esta sessão hoje. A classificação e as sugestões utilizam serviço externo; cada ação exige confirmação.</Alert>}
 <Alert severity="info" sx={{mb:2}}>Demonstração com dados fictícios e possíveis alterações compartilhadas; não inclua dados pessoais nas mensagens. O conteúdo de cada conversa fica restrito à sessão atual.</Alert>
 <Feedback error={error} success={success}/>
 <Grid container spacing={2} sx={{minHeight:600}}>
 <Grid size={{xs:12,md:3}}><Card sx={{height:'100%'}}><CardContent><Stack direction="row" gap={1} alignItems="center" sx={{mb:2}}><HistoryOutlined color="primary"/><Typography fontWeight={750}>Conversas desta sessão</Typography></Stack>{list.isLoading?<Loading/>:list.error?<ErrorState error={list.error} onRetry={()=>list.refetch()}/>:<Stack spacing={1}>{list.data?.data?.length?list.data.data.map(c=><Button key={c.id} fullWidth onClick={()=>{setSelected(c.id);setError('');setSuccess('');}} sx={{justifyContent:'flex-start',textAlign:'left',px:1.5,py:1.5,borderRadius:2,color:'text.primary',bgcolor:selected===c.id?'#eaf1ff':'#f7f9fd',fontSize:12}}>{c.title}<Typography color="text.secondary" fontSize={10} sx={{ml:'auto'}}><FormatDate value={c.updated_at}/></Typography></Button>):<Empty message="Crie sua primeira conversa para começar."/>}</Stack>}</CardContent></Card></Grid>
 <Grid size={{xs:12,md:9}}><Card sx={{display:'flex',flexDirection:'column',height:{xs:'auto',md:670}}}><CardContent sx={{display:'flex',flexDirection:'column',gap:1.5,flex:1,minHeight:400}}>
 <Stack direction="row" alignItems="center" justifyContent="space-between"><Stack direction="row" gap={1} alignItems="center"><AutoAwesomeOutlined color="primary"/><Typography variant="h6">Atendimento assistido</Typography></Stack>{selected&&<IconButton aria-label="Atualizar conversa" onClick={()=>detail.refetch()}><RefreshOutlined fontSize="small"/></IconButton>}</Stack><Divider/>
 <Box sx={{flex:1,minHeight:200,overflowY:'auto',p:{xs:0,md:1},display:'flex',flexDirection:'column',gap:2}} aria-live="polite">
 {!selected?<Box sx={{m:'auto',textAlign:'center',maxWidth:380}}><AutoAwesomeOutlined sx={{fontSize:46,color:'#a0b3d9'}}/><Typography variant="h6" sx={{mt:2}}>Comece uma conversa</Typography><Typography color="text.secondary" fontSize={13}>Crie uma conversa para consultar pedidos e propor ações que precisarão da sua aprovação.</Typography></Box>:detail.isLoading?<Loading/>:detail.error?<ErrorState error={detail.error} onRetry={()=>detail.refetch()}/>:<>
 {active?.messages?.map(m=><Message key={m.id} message={m}/>)}
 {active?.proposals?.length>0&&<Box sx={{mt:1}}><Typography fontWeight={760} fontSize={14} sx={{mb:1.5}}>Propostas nesta conversa ({active.proposals.length})</Typography><Stack spacing={1.5}>{active.proposals.map(p=><ProposalCard key={p.id} p={p} onApprove={()=>setConfirm(p)} onReject={()=>reject.mutate(p)} loading={approve.isPending||reject.isPending}/>)}</Stack></Box>}
 </>}
 </Box><Divider/>
 {assistantTips&&<Stack direction="row" gap={1} sx={{overflowX:'auto',py:1}}>{samples.map(s=><Chip key={s} label={s.length>38?s.slice(0,37)+'…':s} onClick={()=>setText(s)} title={s} clickable variant="outlined" sx={{maxWidth:'none',flexShrink:0}}/>)}</Stack>}
 <Stack direction="row" gap={1} alignItems="flex-end"><TextField multiline minRows={2} maxRows={4} fullWidth label="Digite seu pedido ao assistente" value={text} onChange={e=>setText(e.target.value.slice(0,1200))} disabled={!selected||!available||send.isPending} helperText={`${text.length}/1200 caracteres`} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&text.trim()&&selected&&available)send.mutate();}}/><MutationButton variant="contained" loading={send.isPending} onClick={()=>send.mutate()} disabled={!selected||!available||!text.trim()||remaining===0} aria-label="Enviar ao assistente" sx={{minWidth:110,mb:3}} endIcon={<SendRounded/>}>Enviar</MutationButton></Stack>
 <Typography fontSize={11} color="text.secondary">Ctrl/⌘ + Enter para enviar • Cada proposta só altera o banco após confirmação</Typography>
 </CardContent></Card></Grid></Grid>
 <ConfirmDialog open={Boolean(confirm)} onClose={()=>setConfirm(null)} onConfirm={()=>approve.mutate(confirm)} loading={approve.isPending} title="Aprovar ação da IA?" details={confirm?`${actionLabels[confirm.type]}\nAlvo: ${confirm.target?.id||'ocorrência dependente'}\nParâmetros: ${JSON.stringify(confirm.display_parameters,null,2)}\nJustificativa: ${confirm.reason}`:''}/>
 </>;
}
function Message({message}){
 const mine=message.role==='USER',isAI=message.message_kind==='LLM_GENERATED',failed=message.status==='FAILED';
 return <Stack direction="row" justifyContent={mine?'flex-end':'flex-start'} alignItems="flex-start" gap={1}>
 {!mine&&<Avatar sx={{width:30,height:30,bgcolor:'#edf3ff',color:'primary.main'}}><SmartToyOutlined fontSize="small"/></Avatar>}
 <Box sx={{maxWidth:{xs:'92%',md:'80%'},p:2,borderRadius:3,bgcolor:mine?'#2457bc':failed?'#fff5f5':'#f0f4fa',color:mine?'white':'text.primary'}}>
 {!mine&&<Typography fontWeight={750} fontSize={11} sx={{mb:1,color:failed?'error.main':'text.secondary'}}>{failed?'Falha do assistente':isAI?'Resposta gerada por IA • confira os dados':'Dados verificados • consulta ao banco'}</Typography>}
 <Typography fontSize={13} sx={{whiteSpace:'pre-wrap',wordBreak:'break-word'}}>{message.content}</Typography>
 {!mine&&message.context_refs?.length>0&&<Stack direction="row" gap={.5} flexWrap="wrap" mt={1.5}>{message.context_refs.map((ref,j)=><Button key={`${ref.id}-${j}`} component={RouterLink} size="small" variant="outlined" to={`/${ref.type==='ORDER'?'orders':'incidents'}/${ref.id}`}>{ref.type==='ORDER'?ref.order_code||'Ver pedido':'Ver ocorrência'}</Button>)}</Stack>}
 <Typography sx={{opacity:.75,fontSize:10,mt:1}}><FormatDate value={message.created_at}/></Typography>
 </Box></Stack>;
}
function ProposalCard({p,onApprove,onReject,loading}){
 const expired=['PENDING','BLOCKED'].includes(p.status)&&new Date(p.expires_at)<new Date();const blocked=p.status==='BLOCKED';
 const pending=p.status==='PENDING'&&!expired;
 return <Paper variant="outlined" sx={{p:2,borderColor:pending?'#c4d5f5':'#e4eaf1',bgcolor:pending?'#fcfdff':'#f8fafc'}}>
 <Stack direction={{xs:'column',sm:'row'}} gap={1} alignItems={{sm:'center'}} justifyContent="space-between"><Typography fontWeight={780} fontSize={14}>{actionLabels[p.type]||p.type}</Typography><StatusBadge value={expired?'EXPIRED':p.status}/></Stack>
 <Typography color="text.secondary" fontSize={12} sx={{mt:1,whiteSpace:'pre-wrap'}}>{p.reason}</Typography><Box component="pre" sx={{p:1.5,bgcolor:'#f0f4f9',borderRadius:1,fontSize:11,overflowX:'auto',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify(p.display_parameters,null,2)}</Box>
 {blocked&&<Typography color="text.secondary" fontSize={12}>Aguarda execução da proposta anterior. A aprovação não será automática.</Typography>}
 {expired&&<Typography color="error.main" fontSize={12}>Proposta expirada. Solicite uma nova análise.</Typography>}
 {p.status==='EXECUTED'&&<Typography color="success.main" fontSize={12}>Ação executada no banco. Registro: {p.execution_result_id}</Typography>}
 <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} mt={1.5} flexWrap="wrap"><Typography color="text.secondary" fontSize={11}>Expira: <FormatDate value={p.expires_at}/></Typography>{['PENDING','BLOCKED'].includes(p.status)&&<Stack direction="row" gap={1}><Button size="small" variant="outlined" color="error" disabled={loading||expired} onClick={onReject} startIcon={<CloseRounded/>}>Rejeitar</Button><Button size="small" variant="contained" disabled={loading||!pending} onClick={onApprove} startIcon={<CheckCircleOutlined/>}>Aprovar</Button></Stack>}</Stack>
 </Paper>;
}
