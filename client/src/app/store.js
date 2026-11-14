import { create } from 'zustand';
export const useUI=create(set=>({drawerOpen:false,assistantTips:true,setDrawerOpen:drawerOpen=>set({drawerOpen}),toggleTips:()=>set(s=>({assistantTips:!s.assistantTips}))}));
