import React,{createContext,useCallback,useContext,useEffect,useState} from 'react';
import { api,setCsrf } from '../services/http.js';
const AuthContext=createContext(null);
export function AuthProvider({children}){
  const [user,setUser]=useState(null),[loading,setLoading]=useState(true);
  const refresh=useCallback(async()=>{try{const res=await api('/auth/me');setUser(res.data.user);setCsrf(res.data.csrf_token);}catch{setUser(null);setCsrf('');}finally{setLoading(false);}},[]);
  useEffect(()=>{refresh();},[refresh]);
  const login=async(email,password)=>{const res=await api('/auth/login',{method:'POST',body:{email,password}});setCsrf(res.data.csrf_token);setUser(res.data.user);return res.data.user;};
  const logout=async()=>{try{await api('/auth/logout',{method:'POST',body:{}});}finally{setUser(null);setCsrf('');}};
  return <AuthContext.Provider value={{user,loading,refresh,login,logout}}>{children}</AuthContext.Provider>;
}
export function useAuth(){const ctx=useContext(AuthContext);if(!ctx)throw new Error('AuthProvider ausente');return ctx;}
