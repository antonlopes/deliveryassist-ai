# DeliveryAssist AI

**Central demonstrativa de operações de delivery, com aprovação humana para ações sugeridas por IA.** Aplicação JavaScript com frontend React (Material UI) e backend Node/Express, persistência PostgreSQL e dois adaptadores de LLM por API externa. O código acompanha especificação original em `docs/DELIVERYASSIST_SPEC.md`.

> **Status da entrega:** código-fonte implementado e verificações estáticas efetuadas. **Não é uma demo publicada nem um produto homologado.** Sem credenciais externas, não foi possível executar nesta entrega as suítes com PostgreSQL, build Vite/Cloudflare ou chamada real de IA. Consulte `docs/TEST-REPORT.md` e `docs/IMPLEMENTATION-REPORT.md` antes de publicar.
>
> **Projeto independente de portfólio com dados inteiramente fictícios. Não afiliado ao iFood.** Não insira informações pessoais na demo pública.

## 1. Problema e público

Central operacional fictícia precisa localizar pedidos, identificar atrasos e acompanhar incidentes. DeliveryAssist AI oferece consulta a dados verdadeiros **da própria demonstração**, geração de propostas de ação por modelo externo e aprovação individual por operadores com auditoria.

## 2. Captura de tela e URL

Não foram geradas capturas de uma aplicação em execução (o ambiente de autoria não teve acesso ao registro npm, PostgreSQL ou provedor de IA). **URL publicada: não disponível.** Após implantar, registrar URL e capturas reais no relatório, sem simular imagens.

## 3. O que foi implementado em código

- Login com JWT em cookie HttpOnly, sessões revogáveis, HMAC CSRF e papéis `ADMIN`/`OPERATOR`, sem cadastro público.
- Dashboard SQL, oito restaurantes fictícios, 160 pedidos, ~36 ocorrências e centenas de eventos sintéticos, criados por seed reprodutível relativo ao relógio.
- Pedidos somente leitura com busca, filtros e atraso calculado pelo PostgreSQL; detalhes e eventos.
- Ocorrências manuais, prioridade/estado/responsável, concorrência via versão, notas imutáveis, rascunhos locais e timeline.
- Assistente com conversas vinculadas à **sessão**, classificação de intenções, consultas backend fixas, resposta com dados verificados e propostas tipadas (até três).
- Propostas `PENDING`/`BLOCKED`, expiração, aprovação ou rejeição individual, execução transacional, resolução de dependências, idempotência e auditoria.
- Adaptadores REST reais para `openai_compatible` e `gemini_native`; IA desligada quando sem credenciais, sem respostas simuladas em produção.
- Quotas de IA no PostgreSQL por sessão/conta/global, controle de taxa, modo demo e reset administrativo com confirmação de senha.
- Tela de administração de usuários, restaurantes, auditoria, métricas IA e reset; páginas responsivas.
- Scripts de migração, seed, testes unitários, de integração e UI/E2E preparados para execução após instalação.

Os itens acima descrevem **código presente**, não testes completos ou desempenho comprovado.

## 4. Arquitetura e tecnologias

```
                        HTTPS / origem única
             ┌──────────────────────────────┐
             │ React + Material UI (SPA)    │
             │ API /api/v1 • sessão CSRF    │
             └───────────────┬──────────────┘
                             │
                    Node/Express (JS)
                    ├── identidade / RBAC
                    ├── pedidos / incidentes
                    ├── IA / propostas
                    ├── executor transacional
                    └── auditoria / quotas
                         │             │
                    PostgreSQL      HTTPS (LLM)
                   DB persistente   OpenAI compatível
                         │          ou Gemini nativo
                 Cloudflare Hyperdrive
                   (no modo Workers)
```

**Node local:** Express serve API e build SPA. **Cloudflare Workers:** `workers/entry.js` adapta a mesma aplicação Express à runtime Workers com `httpServerHandler`; Workers Assets serve SPA na mesma origem, PostgreSQL externo via Hyperdrive. Esta integração requer validação real no deploy; não foi testada nesta entrega. Nenhum ORM, Redis, RAG, LangChain, TypeScript ou credencial de IA no navegador.

## 5. Ciclo seguro do assistente

1. Usuário autenticado envia texto; o servidor verifica sessão, quotas e propriedade da conversa.
2. Adaptador externo classifica a intenção em enum fechado. O backend consulta somente funções autorizadas (SQL parametrizado).
3. O LLM pode sugerir uma ou mais ações estruturadas. O backend valida tipos, alvos, versões e parâmetros e persiste propostas **sem alterar as ocorrências**.
4. Cada cartão exige clique de aprovação próprio; uma confirmação carrega apenas `proposal_id` e UUID `Idempotency-Key`.
5. O executor bloqueia linha, verifica propriedade/papel/expiração/versão, efetua alteração e auditoria numa transação, grava deduplicação e libera dependentes **sem executá-los**.
6. Rascunhos editáveis permanecem internos. **Não há envio real ao cliente, cancelamento nem reembolso.**

## 6. Instalação local

Pré-requisitos: **Node.js 22+, npm e PostgreSQL 15+** (servidor local ou banco acessível com TLS). Não usar DB de produção para testar reset ou seeds. Instale dependências em um computador com acesso ao registro npm.

```bash
unzip deliveryassist-ai.zip
cd deliveryassist-ai
npm ci
cp .env.example .env
```

Configure `.env` **fora do controle de versão** com `DATABASE_URL`, `JWT_SECRET` e `CSRF_SECRET` aleatórios (mínimo 32 caracteres), `APP_BASE_URL=http://localhost:3001`, `DEMO_MODE=true`, e os quatro campos `DEMO_{ADMIN,OPERATOR}_{EMAIL,PASSWORD}` (senhas independentes de 12+ caracteres). Opcionalmente configure provedor real de IA (seção 8). Exemplo de geração local de segredo:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Execute:

```bash
npm run db:migrate
npm run db:seed
npm run build
npm start
```

Abra **http://localhost:3001**. Em desenvolvimento com HMR, use `npm run dev`: UI no http://localhost:5173, API proxy em localhost:3001. `db:seed` é idempotente (não sobrescreve dados existentes); `demo:reset` requer `DEMO_MODE=true` e confirmação:

```bash
npm run demo:reset -- --confirm-reset-demo
```

Contas de acesso inicial usam os e-mails e as senhas definidos em seu `.env`. **Nunca publique o login administrador.** Para publicar acesso de operador fictício na interface, configure `DEMO_PUBLIC_LOGIN=true` (o endpoint público mostrará apenas a credencial da conta demo de operador; não use isso fora da demonstração).

## 7. Configuração no Cloudflare

**Não envie este ZIP diretamente para o uploader de sites estáticos do Cloudflare Pages.** Isso hospedaria somente arquivos estáticos; a API Node/Express, PostgreSQL e IA não seriam executados. O caminho escolhido é **Cloudflare Workers + Workers Assets + Hyperdrive + PostgreSQL**, com `wrangler deploy` ou integração Git do Workers Builds.

Leia o guia reproduzível: **[`docs/DEPLOY-CLOUDFLARE.md`](docs/DEPLOY-CLOUDFLARE.md)**. É necessário criar um banco, configurar Hyperdrive, criar os secrets, executar migração e seed localmente e fazer deploy com Wrangler. O Cloudflare não cria automaticamente o PostgreSQL nem a chave do LLM.

## 8. IA externa e limites

IA desligada: `AI_ENABLED=false` mantém login, pedidos e operações manuais; nenhuma resposta é simulada.

Escolha **uma** destas alternativas em variáveis/secret de servidor:

```
AI_ENABLED=true
AI_PROVIDER=openai_compatible
AI_MODEL=<modelo com JSON mode suportado>
AI_API_KEY=<chave secreta>
AI_BASE_URL=https://api.openai.com/v1
```

ou

```
AI_PROVIDER=gemini_native
AI_MODEL=<modelo Gemini apto a JSON>
AI_API_KEY=<chave secreta>
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

A URL de IA deve usar HTTPS e hostname presente em `AI_ALLOWED_HOSTS`; nenhum usuário pode alterá-la. Os nomes dos modelos e capacidade de resposta JSON precisam ser confirmados com o fornecedor no deploy. As chamadas têm timeout, limites de tokens e orçamento de uso (`AI_DAILY_GLOBAL_LIMIT=30`, `AI_DAILY_SESSION_LIMIT=10`, `AI_DAILY_USER_LIMIT=25`, `AI_SESSION_PER_MINUTE_LIMIT=3`). Chave não vai para browser nem para auditoria. **Smoke test com provedor real: pendente** até configuração.

## 9. Testes

```bash
npm run lint
npm run test:native
npm run eval:ai            # contratos offline; não mede acurácia de LLM
npm test                      # Jest (unit) + Vitest (frontend)
npm run test:integration      # requer TEST_DATABASE_URL isolada contendo "test" no nome
npm run test:e2e             # requer app e DB preparados + navegador Playwright
npm run check                # lint + unit/UI + build
npm run deploy:check         # build e Cloudflare Wrangler dry-run
```

**Evidência original:** 13 testes nativos (`node --test server/tests/native.test.mjs`) passaram; todos os arquivos JavaScript passaram na verificação de sintaxe e os JSX no parser. npm, Jest, Vitest, Playwright, PostgreSQL e smoke de IA não foram executados por falta de dependências/infraestrutura. É proibido tratar tais suites como aprovadas. Veja relatório.

## 10. Segurança, limites e escopo

- Sessões, logout, papéis e CSRF checados no servidor; cookie `__Host-` Secure/HttpOnly em produção.
- Validação de payload fechado, enums, UUIDs e tamanho, queries com parâmetros; versões exigidas em todas as alterações relevantes.
- A IA só interpreta e propõe; não executa SQL, HTTP livre, mensagens, cobrança, status de pedido, papéis ou segredos.
- Demonstração compartilhada pode ter operações de outros visitantes, com conversas isoladas por sessão, aviso de privacidade e reset lazy a cada 24h por padrão.
- **Sem garantia de alta disponibilidade em plano gratuito**; Workers e banco externos têm limites/preços variáveis.
- Testes de frontend, integração real com provedores, deploy e benchmarks dependem de configuração; consulte as pendências reais antes de usar em produção.

## 11. Demonstração reproduzível

1. Login como operador com conta fictícia do env.
2. No dashboard, localizar atraso. Pedidos de exemplo: `PED-1001` e `PED-1052` (atrasados logo após seed); IDs internos descobertos na API.
3. Em `/assistant`, criar conversa e solicitar `Mostre o pedido PED-1052`.
4. Solicitar `Abra uma ocorrência de atraso para PED-1052, adicione nota e prepare resposta`. Mostrar cartões, **antes de aprovar** conferir ausência de nova ocorrência.
5. Aprovar **somente** criação, rejeitar nota e aprovar rascunho, individualmente. Conferir incidente, rascunho e auditoria.
6. Verificar que `/admin/users` recusa operador. Desativar IA e demonstrar operações manuais.

Se a IA sugerir formato não aceito, o backend rejeita sem persistir propostas. Resultados de LLM não são garantidos. Roteiro detalhado em `docs/DEMO.md`.

## Portfólio e publicação no GitHub

- O repositório público deve conter somente código e exemplos de configuração: o `.env` real e builds locais foram excluídos do pacote de publicação. O ID de Hyperdrive é um placeholder a substituir localmente antes do deploy.
- GitHub Actions em `.github/workflows/ci.yml` verifica instalação pelo lockfile, lint, testes nativos, unitários/frontend, contratos de IA e build. A execução na plataforma é necessária para comprovar o resultado.
- `docs/AI-EVALUATION.md` explica o teste offline de contratos e distingue resultados de validação de métricas de um LLM real.
- `docs/screenshots/` é reservado para capturas reais feitas após iniciar a aplicação; não há imagens fabricadas.
- O banco PostgreSQL, a integração com LLM real e o deploy continuam exigindo configuração/validação pelo responsável.

## Documentação

- [`docs/DEPLOY-CLOUDFLARE.md`](docs/DEPLOY-CLOUDFLARE.md) — publicação.
- [`docs/API.md`](docs/API.md) — endpoints, payloads, erros e permissão.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — camadas e decisões.
- [`docs/SECURITY.md`](docs/SECURITY.md) — controles e riscos.
- [`docs/AI-EVALUATION.md`](docs/AI-EVALUATION.md) — avaliação offline e limitações.
- [`docs/TEST-REPORT.md`](docs/TEST-REPORT.md) — evidência de testes executados.
- [`docs/IMPLEMENTATION-REPORT.md`](docs/IMPLEMENTATION-REPORT.md) — lacunas de verificação e checklist DOD.
- [`docs/DELIVERYASSIST_SPEC.md`](docs/DELIVERYASSIST_SPEC.md) — especificação fornecida.
