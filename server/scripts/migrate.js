import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, closeDb } from '../src/db/index.js';
const dir = fileURLToPath(new URL('../src/db/migrations/', import.meta.url));
export async function migrate() {
  const pool = db(); const client = await pool.connect();
  try {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text primary key, applied_at timestamptz not null default now())');
    for (const file of (await readdir(dir)).filter(x => x.endsWith('.sql')).sort()) {
      await client.query('BEGIN');
      try {
        const existing = await client.query('SELECT 1 FROM schema_migrations WHERE name=$1',[file]);
        if (!existing.rowCount) {
          await client.query(await readFile(path.join(dir,file),'utf8'));
          await client.query('INSERT INTO schema_migrations(name) VALUES($1)',[file]);
          console.log(`Migration aplicada: ${file}`);
        } else console.log(`Migration já aplicada: ${file}`);
        await client.query('COMMIT');
      } catch (e) { await client.query('ROLLBACK'); throw e; }
    }
  } finally { client.release(); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  migrate().catch(e => {console.error('Falha migration:',e.message);process.exitCode=1;}).finally(closeDb);
}
