import pg from 'pg';
import { get } from '../config.js';

export function databaseUrl() {
  return globalThis.__CF_ENV?.HYPERDRIVE?.connectionString || get('DATABASE_URL');
}

// Cada operação recebe seu próprio pool.
// O Hyperdrive administra as conexões persistentes com o banco.
export function db() {
  const url = databaseUrl();

  if (!url) {
    throw new Error('DATABASE_URL não configurada');
  }

  return new pg.Pool({
    connectionString: url,
    max: 1,
    connectionTimeoutMillis: 8000,
    idleTimeoutMillis: 1000,
    ...(globalThis.__CF_ENV?.HYPERDRIVE ? { ssl: false } : {}),
  });
}

// Consulta independente: abre e encerra seus recursos.
export async function sql(query, params = []) {
  const pool = db();

  try {
    return await pool.query(query, params);
  } finally {
    await pool.end();
  }
}

// Transação: mantém a mesma conexão até COMMIT ou ROLLBACK.
export async function transaction(fn) {
  const pool = db();
  let client;

  try {
    client = await pool.connect();

    await client.query('BEGIN');

    try {
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserva o erro original.
      }

      throw error;
    }
  } finally {
    if (client) {
      client.release();
    }

    await pool.end();
  }
}

// Não existe mais pool global para encerrar.
export async function closeDb() {}
