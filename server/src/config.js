export function get(name, fallback = undefined) {
  const v = globalThis.__CF_ENV?.[name] ?? process.env[name];
  return v === undefined || v === '' ? fallback : v;
}
export function int(name, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const v = Number(get(name, fallback));
  if (!Number.isInteger(v) || v < min || v > max) throw new Error(`Configuração inválida: ${name}`);
  return v;
}
export const isProduction = () => get('NODE_ENV', 'development') === 'production';
export const isDemo = () => get('DEMO_MODE', 'false') === 'true';
export const aiEnabled = () => get('AI_ENABLED', 'false') === 'true';
export function assertConfig() {
  for (const k of ['DATABASE_URL', 'JWT_SECRET', 'CSRF_SECRET']) {
    if (!get(k) && !(k === 'DATABASE_URL' && globalThis.__CF_ENV?.HYPERDRIVE?.connectionString)) throw new Error(`Variável obrigatória ausente: ${k}`);
  }
  for (const k of ['JWT_SECRET', 'CSRF_SECRET']) if (String(get(k)).length < 32) throw new Error(`Variável ${k}: mínimo 32 caracteres`);
  if (isProduction() && !get('APP_BASE_URL', '').startsWith('https://')) throw new Error('APP_BASE_URL precisa de HTTPS em produção');
  if (aiEnabled()) {
    for (const k of ['AI_PROVIDER', 'AI_API_KEY', 'AI_MODEL', 'AI_BASE_URL']) if (!get(k)) throw new Error(`IA habilitada mas falta ${k}`);
    if (!['openai_compatible', 'gemini_native'].includes(get('AI_PROVIDER'))) throw new Error('AI_PROVIDER inválido');
  }
}
