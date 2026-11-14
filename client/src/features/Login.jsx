import React,{useState} from 'react';
import {Alert,Box,Button,Card,CardContent,Container,InputAdornment,Link as MuiLink,Stack,TextField,Typography} from '@mui/material';
import {AutoAwesomeOutlined,LocalShippingOutlined,LockOutlined,EmailOutlined,ArrowForwardRounded} from '@mui/icons-material';
import {Navigate,useNavigate} from 'react-router-dom';
import {useAuth} from '../app/auth.jsx';
import {api} from '../services/http.js';
import {Feedback} from '../components/Ui.jsx';
import {MutationButton} from '../components/Shared.jsx';
export function Login(){
  const {user,loading,login}=useAuth();const navigate=useNavigate();
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[pending,setPending]=useState(false),[error,setError]=useState(''),[demo,setDemo]=useState(null);
  if(user)return <Navigate to="/dashboard" replace/>;
  const submit=async e=>{e.preventDefault();setPending(true);setError('');try{await login(email,password);navigate('/dashboard',{replace:true});}catch(e){setError(e.message);}finally{setPending(false);}};
  const demoAccess=async()=>{try{const r=await api('/public/demo-access');setDemo(r.data);setEmail(r.data.email);setPassword(r.data.password);}catch{setDemo(false);}};
  return <Box sx={{minHeight:'100vh',display:'flex',flexDirection:'column',background:'radial-gradient(circle at 10% 10%,#e5edff,transparent 40%),linear-gradient(135deg,#f5f8fc,#eaf1fb)'}}>
    <Container maxWidth="sm" sx={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',py:5}}><Box sx={{width:'100%'}}>
      <Stack direction="row" gap={1} alignItems="center" justifyContent="center" sx={{mb:3}}><Box sx={{borderRadius:2,bgcolor:'#2457bc',color:'#fff',p:1,display:'flex'}}><LocalShippingOutlined/></Box><Typography variant="h5">DeliveryAssist <Box component="span" color="primary.main">AI</Box></Typography></Stack>
      <Card sx={{p:{xs:1,sm:2},boxShadow:'0 16px 55px #1c3f761b',border:'1px solid #dfe8f4'}}><CardContent>
        <Box sx={{width:42,height:42,display:'grid',placeItems:'center',bgcolor:'#eef3ff',color:'primary.main',borderRadius:3,mb:2}}><LockOutlined/></Box>
        <Typography variant="h5" sx={{mb:1}}>Acesse a central</Typography><Typography color="text.secondary" fontSize={14} sx={{mb:3}}>Entre para acompanhar pedidos, registrar ocorrências e revisar sugestões de IA.</Typography>
        <Alert severity="info" sx={{mb:3,fontSize:13}}>Ambiente demonstrativo com dados fictícios e histórico potencialmente compartilhado. Não insira informações pessoais.</Alert>
        <Box component="form" onSubmit={submit}><Stack spacing={2}>
          <TextField type="email" label="E-mail" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username" fullWidth disabled={pending} InputProps={{startAdornment:<InputAdornment position="start"><EmailOutlined fontSize="small"/></InputAdornment>}}/>
          <TextField type="password" label="Senha" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password" fullWidth disabled={pending} InputProps={{startAdornment:<InputAdornment position="start"><LockOutlined fontSize="small"/></InputAdornment>}}/>
          <Feedback error={error}/><MutationButton type="submit" variant="contained" size="large" loading={pending||loading} endIcon={<ArrowForwardRounded/>} sx={{py:1.5}}>Entrar no painel</MutationButton>
        </Stack></Box>
        <Button fullWidth sx={{mt:2}} onClick={demoAccess} size="small">Verificar acesso público de demonstração</Button>
        {demo===false&&<Typography variant="caption" color="text.secondary" display="block" align="center">O responsável pela implantação ainda não habilitou a divulgação das credenciais da demo.</Typography>}
        {demo&&<Alert severity="success" sx={{mt:1}}>Credenciais fictícias de operador preenchidas. Clique em Entrar.</Alert>}
      </CardContent></Card>
      <Stack direction="row" gap={1} justifyContent="center" alignItems="center" sx={{my:3,color:'#71829b'}}><AutoAwesomeOutlined fontSize="small"/><Typography fontSize={12}>Assistência por IA com aprovação humana e auditoria</Typography></Stack>
    </Box></Container>
    <Typography align="center" color="text.secondary" fontSize={11} sx={{px:2,pb:3}}>Projeto independente de portfólio • dados fictícios • não afiliado ao iFood</Typography>
  </Box>;
}
