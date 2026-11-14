import 'dotenv/config';
import { assertConfig,get,int } from './config.js';
import { createApp } from './app.js';
import { closeDb } from './db/index.js';
assertConfig();
const app=createApp({staticFiles:true});
const server=app.listen(int('PORT',3001,1,65535),()=>console.log(JSON.stringify({level:'info',event:'server_started',port:get('PORT','3001')})));
function shutdown(){server.close(()=>closeDb().finally(()=>process.exit(0)));setTimeout(()=>process.exit(1),10000).unref();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
