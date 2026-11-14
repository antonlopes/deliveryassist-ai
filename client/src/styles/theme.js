import {createTheme} from '@mui/material/styles';
export const theme=createTheme({
  palette:{mode:'light',primary:{main:'#2457bc',dark:'#1b3e8b'},secondary:{main:'#0e9488'},background:{default:'#f5f7fb',paper:'#ffffff'},text:{primary:'#14263e',secondary:'#63758c'},error:{main:'#bb3838'},success:{main:'#127c5d'}},
  typography:{fontFamily:'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',h4:{fontWeight:800,letterSpacing:'-.03em'},h5:{fontWeight:800,letterSpacing:'-.02em'},h6:{fontWeight:750},button:{fontWeight:700,textTransform:'none'}},
  shape:{borderRadius:12},
  components:{MuiPaper:{styleOverrides:{root:{backgroundImage:'none'}}},MuiCard:{defaultProps:{variant:'outlined'},styleOverrides:{root:{borderColor:'#e5eaf2'}}},MuiButton:{defaultProps:{disableElevation:true}},MuiTableCell:{styleOverrides:{head:{fontWeight:750,background:'#f8fafd',color:'#53667f',whiteSpace:'nowrap'},root:{borderColor:'#edf0f5'}}},MuiOutlinedInput:{styleOverrides:{root:{background:'#fff'}}}}
});
