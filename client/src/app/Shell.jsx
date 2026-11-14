import React,{useState} from 'react';
import {AppBar,Avatar,Box,Button,Chip,CircularProgress,Container,Divider,Drawer,IconButton,List,ListItemButton,ListItemIcon,ListItemText,Stack,Toolbar,Tooltip,Typography} from '@mui/material';
import {DashboardOutlined,ReceiptLongOutlined,ReportProblemOutlined,AutoAwesomeOutlined,PeopleOutline,StorefrontOutlined,FactCheckOutlined,AnalyticsOutlined,RestartAltOutlined,MenuRounded,LogoutOutlined,LocalShippingOutlined,CloseRounded} from '@mui/icons-material';
import {Link,NavLink,Outlet,useLocation,useNavigate} from 'react-router-dom';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useAuth} from './auth.jsx';
import {useUI} from './store.js';
import {api} from '../services/http.js';
import {Feedback} from '../components/Ui.jsx';
const primary=[['/dashboard','Visão geral',DashboardOutlined],['/orders','Pedidos',ReceiptLongOutlined],['/incidents','Ocorrências',ReportProblemOutlined],['/assistant','Assistente de IA',AutoAwesomeOutlined]];
const admin=[['/admin/users','Usuários',PeopleOutline],['/admin/restaurants','Restaurantes',StorefrontOutlined],['/admin/audit','Auditoria',FactCheckOutlined],['/admin/ai-usage','Métricas de IA',AnalyticsOutlined],['/admin/demo','Reset da demo',RestartAltOutlined]];
export function Shell(){
  const {user,logout}=useAuth();const navigate=useNavigate(),location=useLocation(),queryClient=useQueryClient();
  const {drawerOpen,setDrawerOpen}=useUI();const [error,setError]=useState('');
  const status=useQuery({queryKey:['ai-status'],queryFn:()=>api('/assistant/status'),staleTime:20000,retry:1});
  const onLogout=async()=>{try{await logout();queryClient.clear();navigate('/login',{replace:true});}catch(e){setError(e.message);}};
  const links=(items)=>items.map(([url,label,Icon])=><ListItemButton key={url} component={NavLink} to={url} onClick={()=>setDrawerOpen(false)}
    selected={location.pathname===url||location.pathname.startsWith(url+'/')} sx={{mx:1,my:.3,borderRadius:2,color:'#b9c5d6','&.Mui-selected':{bgcolor:'#234270',color:'#fff'},'&:hover':{bgcolor:'#263c5a'}}}>
    <ListItemIcon sx={{minWidth:39,color:'inherit'}}><Icon fontSize="small"/></ListItemIcon><ListItemText primary={label} primaryTypographyProps={{fontWeight:600,fontSize:14}}/></ListItemButton>);
  const sidebar=<Box sx={{height:'100%',display:'flex',flexDirection:'column',bgcolor:'#14263e',color:'white'}}>
    <Stack direction="row" alignItems="center" gap={1.3} sx={{px:2.4,py:2.7}}><Box sx={{width:37,height:37,display:'grid',placeItems:'center',bgcolor:'#2e69cd',borderRadius:2}}><LocalShippingOutlined/></Box><Box><Typography fontWeight={850} fontSize={18} letterSpacing="-.03em">DeliveryAssist</Typography><Typography sx={{color:'#9eb0c6',fontSize:10,letterSpacing:1.5,fontWeight:750}}>OPERATIONS AI</Typography></Box><IconButton sx={{ml:'auto',color:'#fff',display:{md:'none'}}} onClick={()=>setDrawerOpen(false)}><CloseRounded/></IconButton></Stack>
    <Typography sx={{fontSize:10,fontWeight:800,letterSpacing:2,color:'#708ba7',px:3,pt:2,pb:1}}>OPERACIONAL</Typography><List disablePadding>{links(primary)}</List>
    {user?.role==='ADMIN'&&<><Divider sx={{borderColor:'#2e415c',my:2,mx:2}}/><Typography sx={{fontSize:10,fontWeight:800,letterSpacing:2,color:'#708ba7',px:3,pb:1}}>ADMINISTRAÇÃO</Typography><List disablePadding>{links(admin)}</List></>}
    <Box sx={{flex:1}}/><Box sx={{m:2,p:1.7,bgcolor:'#1b3554',border:'1px solid #2e4b6a',borderRadius:2}}><Typography fontSize={12} color="#dce7f5" fontWeight={750}>Ambiente demonstrativo</Typography><Typography fontSize={11} sx={{color:'#a9bdd3',mt:1}}>Dados inteiramente fictícios. Operações sujeitas a reset.</Typography></Box>
  </Box>;
  return <Box sx={{display:'flex',minHeight:'100vh'}}>
    <Drawer variant="permanent" sx={{display:{xs:'none',md:'block'},width:250,flexShrink:0,'& .MuiDrawer-paper':{width:250,border:0}}}>{sidebar}</Drawer>
    <Drawer variant="temporary" open={drawerOpen} onClose={()=>setDrawerOpen(false)} sx={{display:{xs:'block',md:'none'},'& .MuiDrawer-paper':{width:260,border:0}}}>{sidebar}</Drawer>
    <Box sx={{minWidth:0,flex:1,display:'flex',flexDirection:'column'}}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{borderBottom:'1px solid #e5ebf3',bgcolor:'#fff'}}>
        <Toolbar sx={{minHeight:'70px !important',gap:2}}><IconButton onClick={()=>setDrawerOpen(true)} sx={{display:{md:'none'}}} aria-label="Abrir menu"><MenuRounded/></IconButton>
          <Stack spacing={0}><Typography fontWeight={760} fontSize={14} sx={{display:{xs:'none',sm:'block'}}}>Central de operações</Typography><Typography color="text.secondary" fontSize={11} sx={{display:{xs:'none',sm:'block'}}}>Visão unificada de pedidos e atendimentos</Typography></Stack>
          <Box flex={1}/><Chip size="small" variant="outlined" color={status.data?.data.available?'success':'default'} icon={<AutoAwesomeOutlined/>} label={status.isLoading?'Verificando IA':status.data?.data.available?'IA configurada':'IA indisponível'} sx={{fontSize:12}}/>
          <Tooltip title={user?.email||''}><Stack direction="row" alignItems="center" gap={1}><Avatar sx={{bgcolor:'#e9effc',color:'#2457bc',width:34,height:34,fontSize:13,fontWeight:800}}>{user?.name?.slice(0,2).toUpperCase()}</Avatar><Box sx={{display:{xs:'none',sm:'block'}}}><Typography fontSize={12} fontWeight={750}>{user?.name}</Typography><Typography fontSize={11} color="text.secondary">{user?.role==='ADMIN'?'Administrador':'Operador'}</Typography></Box></Stack></Tooltip>
          <Tooltip title="Sair"><IconButton onClick={onLogout} aria-label="Encerrar sessão"><LogoutOutlined fontSize="small"/></IconButton></Tooltip>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" component="main" sx={{flex:1,py:{xs:3,md:4},px:{xs:2,md:4}}}><Feedback error={error}/><Outlet/></Container>
      <Box component="footer" sx={{px:3,py:2,borderTop:'1px solid #e1e8f1',bgcolor:'#fff'}}><Typography align="center" color="text.secondary" fontSize={11}>Projeto independente de portfólio, com dados inteiramente fictícios. Não afiliado ao iFood. • Histórico pode ser compartilhado em uma conta de demonstração; não insira informações pessoais.</Typography></Box>
    </Box>
  </Box>;
}
