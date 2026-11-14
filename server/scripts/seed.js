import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { migrate } from './migrate.js';
import { seedInitial } from '../src/db/seed.js';
import { closeDb } from '../src/db/index.js';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  (async()=>{await migrate();console.log('Seed:',await seedInitial());})().catch(e=>{console.error('Erro seed:',e.message);process.exitCode=1;}).finally(closeDb);
}
