# Deploy Cloudflare Workers (React SPA + Express + PostgreSQL)

**Importante:** o ZIP desta entrega é o repositório de código-fonte. **Não** é um artefato de upload estático pronto. A opção `Cloudflare Pages > Upload assets` não executa `server/src/app.js` nem cria tabelas PostgreSQL. Use um Worker com `wrangler deploy` (ou um repositório Git conectado ao Workers Builds).

## Arquitetura escolhida

- Cloudflare **Workers** com `nodejs_compat` e `cloudflare:node/httpServerHandler`, servindo Express na rota `/api/v1/*`, `/healthz`, `/readyz`.
- **Workers Assets** publica o build React Vite na mesma origem HTTPS, com fallback de SPA. Não usar Pages Direct Upload.
- PostgreSQL externo persistente (por ex. serviço gerenciado de sua escolha) acessível via **Cloudflare Hyperdrive**.
- OpenAI-compatible ou Gemini-native, chave em **Worker secret** e `AI_ENABLED=true` somente após testada.
- Migrations e seed executados pelo responsável com Node local antes da publicação, contra a `DATABASE_URL` correta.

Referências oficiais verificadas em novembro/2026:

- https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/
- https://developers.cloudflare.com/hyperdrive/get-started/
- https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/
- https://developers.cloudflare.com/pages/platform/known-issues/

## Pré-requisitos

1. Node.js 22+ e npm com acesso à internet.
2. Conta Cloudflare com Workers e Hyperdrive habilitados no plano correspondente.
3. PostgreSQL com TLS, banco **separado e exclusivamente fictício** para a demo, credenciais com privilégios suficientes para migrations. Nunca compartilhar DB de produção real.
4. E-mail/senha do administrador privado e conta do operador fictício. Use senhas distintas de pelo menos 12 caracteres e chaves de JWT/CSRF de ao menos 32 caracteres aleatórios.
5. (Opcional no início) chave válida de fornecedor LLM e modelo que suporte JSON.

## 1. Preparar o banco e testar localmente

No diretório extraído:

```bash
npm install
cp .env.example .env
```

Preencha `.env` com `DATABASE_URL=postgresql://...` (preferencialmente com TLS), `JWT_SECRET`, `CSRF_SECRET`, `DEMO_*_EMAIL/PASSWORD`, `NODE_ENV=development`, `DEMO_MODE=true` e `APP_BASE_URL=http://localhost:3001`. Nunca versionar `.env`.

```bash
npm run db:migrate
npm run db:seed
npm run build
npm start
```

Verifique `/healthz`, `/readyz` e login local; teste uma ocorrência manual e o conflito de versão. Anote a versão `001_initial.sql` aplicada. Se necessário, execute o script de reset **apenas** na demo.

## 2. Criar a conexão Hyperdrive

```bash
npx wrangler login
npx wrangler hyperdrive create deliveryassist-db --connection-string '<POSTGRES_CONNECTION_STRING_COM_TLS>'
```

**Atenção:** este comando pode inserir uma senha no histórico do shell. Prefira o painel Cloudflare ou um fluxo de secret/variável temporária seguro. Nunca gravar connection string em `wrangler.jsonc` versionado.

O retorno deve incluir um ID. No `wrangler.jsonc`, **substitua o valor de exemplo** `REPLACE_WITH_YOUR_HYPERDRIVE_ID` (a propriedade `hyperdrive` já existe):

```json
"hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<SEU_HYPERDRIVE_ID>" }]
```

É seguro commitar o ID de binding; não commite credenciais de banco. A aplicação usa `env.HYPERDRIVE.connectionString` quando essa binding existe. Sem binding, requer `DATABASE_URL` de servidor; para Workers, **recomenda-se Hyperdrive**, não a string livre na UI.

## 3. Configurar host HTTPS e variáveis

Determine o domínio público pretendido (exemplo: `https://deliveryassist-ai.SEU-SUBDOMINIO.workers.dev` ou domínio próprio). Configure **`APP_BASE_URL` exatamente igual à origem**. Se usar subdomínio customizado, ele deve estar resolvendo corretamente no Cloudflare. **Ajuste antes de fazer login**, pois Origin/Referer são validados.

O arquivo `wrangler.jsonc` já define `NODE_ENV=production`, `DEMO_MODE=true`, `AI_ENABLED=false` e quotas conservadoras, sem segredos. Configure segredos via CLI (cada comando solicita entrada privada):

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put CSRF_SECRET
npx wrangler secret put APP_BASE_URL
npx wrangler secret put DEMO_ADMIN_EMAIL
npx wrangler secret put DEMO_ADMIN_PASSWORD
npx wrangler secret put DEMO_OPERATOR_EMAIL
npx wrangler secret put DEMO_OPERATOR_PASSWORD
```

Opcional: `DEMO_PUBLIC_LOGIN=true` como variável (`vars`) permite divulgar no login **somente** o operador compartilhado fictício e sujeito a quotas. Deixe `false` se não quiser tornar a credencial demo publicamente acessível. A interface nunca deve exibir o administrador.

**Configuração de proxy:** não ative `TRUST_PROXY` automaticamente sem confirmar o comportamento da plataforma. HTTPS real deve ser fornecido pelo Cloudflare; cookie `__Host-` será `Secure; SameSite=Lax; HttpOnly` em produção.

## 4. Publicar no Workers

```bash
npm run build
npx wrangler deploy
```

A saída do Wrangler exibe a URL `https://...workers.dev`. Se precisar alterar `APP_BASE_URL`, atualize o secret e repita deploy. **Essa sequência não foi executada nesta entrega** (sem npm e sem conta Cloudflare); dependências e runtime devem ser testados no ambiente real.

> Não publique o build Vite separadamente em Pages se deseja a API de mesma origem. O `wrangler.jsonc` usa `assets.run_worker_first` para encaminhar `/api/*`, `/healthz`, `/readyz` ao Worker Express e entrega a SPA com Workers Assets.

## 5. Habilitar IA real (após validação manual)

No `wrangler.jsonc`, altere `AI_ENABLED` de `false` para `true` e acrescente ao objeto `vars` os campos `AI_PROVIDER`, `AI_MODEL` e `AI_BASE_URL` com valores verificados na documentação do provedor. Os modelos são definidos no deploy (não há nome fixo no código). Configure `AI_API_KEY` como segredo:

```bash
npx wrangler secret put AI_API_KEY
npm run build
npx wrangler deploy
```

OpenAI-compatible: `AI_PROVIDER=openai_compatible`, `AI_BASE_URL=https://api.openai.com/v1` ou outra base HTTPS permitida em `AI_ALLOWED_HOSTS`; o modelo deve aceitar `response_format: json_object`. Gemini: `AI_PROVIDER=gemini_native`, `AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta`; modelo compatível com `responseMimeType=application/json`. As requisições REST usam fetch seguro sem redirecionamento.

Execute pelo menos uma consulta e solicitação de proposta **com chave real, em quotas baixas**. A API registra `ai_usage` (tokens e duração quando fornecidos). Se falhar, desabilite IA e mantenha operação manual. Não simule uma resposta real no ambiente publicado.

## 6. Smoke test do deploy

Execute (substituindo URL):

```bash
curl -i 'https://SEU-HOST/healthz'
curl -i 'https://SEU-HOST/readyz'
curl -i 'https://SEU-HOST/api/v1/orders'    # esperado: 401 sem login
```

No navegador HTTPS, acesse login operador e confirme: dashboard com totais SQL; `PED-1052` atrasado (logo após reset), incidentes, criação manual, nota e rascunho. Ative IA e valide interpretação → proposta criada → **nenhuma mutação antes da aprovação** → aprovação → persistência → auditoria. Verifique operador contra `/api/v1/admin/users` (403). Reaproveite mesma chave idempotente para testar replay.

Se usar Workers Free, avalie cuidadosamente CPU/limites de execução, conexões e quotas; não assuma disponibilidade. O reset lazy faz batch SQL para diminuir roundtrips, mas precisa de benchmark real no host.

## 7. Atualizações e rollback

- Atualização de schema: `npm run db:migrate` a partir de máquina segura antes de publicar nova versão (migrations versionadas).
- Deploy: `npx wrangler deploy` com build atualizado.
- Erro de deploy: consultar logs sem credenciais; reverter Worker pelo dashboard/CLI, preservando DB; **não** executar reset em banco não demo.
- O `demo:reset` é destrutivo apenas para dados sintéticos e exige `DEMO_MODE=true` e flag explícita; a UI exige senha de admin e frase `RESETAR DEMO`.
- Postgres gerenciado deve ter política de backup/recuperação proporcional ao ambiente. O seed não substitui backup para dados reais.

## 8. Limitação: ZIP direto na Cloudflare

Este projeto **não pode funcionar apenas arrastando um ZIP para Cloudflare Pages Direct Upload**; essa operação não provisiona Express/Workers Hyperdrive, as secrets ou as tabelas PostgreSQL. Extraia o ZIP e utilize Wrangler ou um repositório Git com Workers Builds. Um ZIP estático separado, sem API, criaria aparência de interface sem operações reais e violaria a especificação. Não foi fornecido esse falso artefato.
