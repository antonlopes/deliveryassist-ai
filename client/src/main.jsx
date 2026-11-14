import React from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter,Navigate,Route,Routes,useLocation} from 'react-router-dom';
import {CssBaseline,ThemeProvider,Box,Typography,Button} from '@mui/material';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {theme} from './styles/theme.js';
import {AuthProvider,useAuth} from './app/auth.jsx';
import {Shell} from './app/Shell.jsx';
import {Login} from './features/Login.jsx';
import {Dashboard} from './features/Dashboard.jsx';
import {Orders,OrderDetail} from './features/Orders.jsx';
import {Incidents,IncidentDetail} from './features/Incidents.jsx';
import {Assistant} from './features/Assistant.jsx';
import {AdminUsers,AdminRestaurants,AdminAudit,AdminAIUsage,AdminDemo} from './features/Admin.jsx';
import {Loading} from './components/Shared.jsx';
import {Link as RouterLink} from 'react-router-dom';
const client=new QueryClient({defaultOptions:{queries:{retry:1,refetchOnWindowFocus:false,staleTime:8000}}});
function Guard({admin=false,children}){const {user,loading}=useAuth(),location=useLocation();if(loading)return <Loading/>;if(!user)return <Navigate to="/login" replace state={{from:location.pathname}}/>;if(admin&&user.role!=='ADMIN')return <NoAccess/>;return children;}
function NoAccess(){return <Box sx={{p:4,textAlign:'center'}}><Typography variant="h5">Acesso negado</Typography><Typography color="text.secondary" sx={{my:2}}>Você não possui permissão para esta página.</Typography><Button component={RouterLink} to="/dashboard">Voltar para a visão geral</Button></Box>}
function NotFound(){const {user}=useAuth();return <Box sx={{m:'auto',p:5,textAlign:'center'}}><Typography variant="h4">Página não encontrada</Typography><Button sx={{mt:2}} component={RouterLink} to={user?'/dashboard':'/login'}>Ir para o início</Button></Box>}
export function App(){return <ThemeProvider theme={theme}><CssBaseline/><QueryClientProvider client={client}><BrowserRouter><AuthProvider><Routes>
 <Route path="/login" element={<Login/>}/>
 <Route element={<Guard><Shell/></Guard>}>
 <Route index element={<Navigate to="/dashboard" replace/>}/>
 <Route path="/dashboard" element={<Dashboard/>}/><Route path="/orders" element={<Orders/>}/><Route path="/orders/:id" element={<OrderDetail/>}/>
 <Route path="/incidents" element={<Incidents/>}/><Route path="/incidents/:id" element={<IncidentDetail/>}/><Route path="/assistant" element={<Assistant/>}/>
 <Route path="/admin/users" element={<Guard admin><AdminUsers/></Guard>}/>
 <Route path="/admin/restaurants" element={<Guard admin><AdminRestaurants/></Guard>}/>
 <Route path="/admin/audit" element={<Guard admin><AdminAudit/></Guard>}/>
 <Route path="/admin/ai-usage" element={<Guard admin><AdminAIUsage/></Guard>}/>
 <Route path="/admin/demo" element={<Guard admin><AdminDemo/></Guard>}/>
 </Route><Route path="*" element={<NotFound/>}/>
 </Routes></AuthProvider></BrowserRouter></QueryClientProvider></ThemeProvider>}
createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
