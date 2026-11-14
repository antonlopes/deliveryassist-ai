import 'dotenv/config';
import { transaction,closeDb } from '../src/db/index.js';
import { resetDemo } from '../src/db/seed.js';
import { isDemo } from '../src/config.js';
if(!isDemo() || process.argv[2] !== '--confirm-reset-demo') {
 console.error('Proteção: requer DEMO_MODE=true e --confirm-reset-demo.');process.exit(1);
}
transaction(c=>resetDemo(c)).then(r=>console.log('Demo reiniciada',r)).catch(e=>{console.error(e.message);process.exitCode=1;}).finally(closeDb);
