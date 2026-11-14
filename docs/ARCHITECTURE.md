# Arquitetura e decisões

**Fonte:** `DELIVERYASSIST_SPEC.md` v1.0.0. O design é monólito modular JavaScript: React SPA + Express REST + PostgreSQL, uma origem HTTPS, sem ORM/GraphQL/ML próprio.

## Camadas

- `client/src/app` — autenticação em memória, shell, tema e navegação.
- `client/src/features` — páginas de pedidos, incidentes, IA e administração.
- `client/src/services/http.js` — fetch central com cookie `credentials:include` e CSRF em memória; sem senha/JWT na SPA.
- `server/src/app.js` — validações de transporte, endpoints, autorização e erros; `X-Request-ID`, logs sem dados sensíveis.
- `server/src/domain` — regras de domínio, SQL parametrizado, RBAC, notas, drafts e auditoria.
- `server/src/db` — pool `pg`, transações, schema e seed. Usa `HYPERDRIVE.connectionString` quando disponível.
- `server/src/ai` — provedor (OpenAI-compatible/Gemini), contratos fechados, quota de turnos, orquestração e executor de propostas.
- `workers/entry.js` — Express em Cloudflare Workers (`cloudflare:node`); UI via Workers Assets, uma origem pública.
- `server/scripts` — migrations e seed fora do tráfego de produção.

## DB e invariantes

As 18 tabelas contratuais (mais `ai_turns` e `login_attempts`) estão definidas em `001_initial.sql`. Unicidade parcial impede ocorrência ativa duplicada do mesmo par pedido+categoria. Todo `PATCH` de incidente/draft/restaurant exige `expected_version`. Notas são imutáveis. Pedidos são somente leitura. Tolerância de atraso vem de `LATE_GRACE_MINUTES` (inteiro 0–60), usada no SQL e não no cliente/LLM.

## Propostas e transações

`action_proposals` contém parâmetros tipados, contexto de sessão, versões e prazo. O LLM nunca envia SQL ou endpoints. Para `approve`, `SELECT FOR UPDATE`, lock de demo, lock de idempotência, revalidação, serviço de domínio, `action_executions`, `audit_logs` e deduplicação ocorrem na **mesma transação**. Propostas dependentes só mudam de `BLOCKED` para `PENDING` após o pai executar, com ID de ocorrência resolvido pelo banco. O navegador aprova cada uma de forma explícita. Falha transacional reverte efeitos; erros recuperáveis podem marcar proposta `FAILED` em transação independente.

## Privacidade

`ai_conversations.auth_session_id` exige a mesma sessão ativa na leitura, escrita e aprovação. Admin só vê metadados administrativos, não conteúdo de chats. Reset apaga conversas demo e domínio; mantém contas/secrets e preserva logs de auditoria. O aviso de demo compartilhada não promete isolamento global de operações.

## ADRs / desvios explícitos

- **ADR-001 a 012** da especificação preservadas, conforme implementação em código.
- **ADD-01 — Workers Assets:** na Cloudflare a SPA é publicada pelo serviço Workers Assets em vez de `express.static`, mantendo mesmo domínio e Express como API. No Node local Express também serve SPA, sem dependência de build separado em produção.
- **ADD-02 — Rota `/api/v1/assignees`:** endpoint autenticado, paginado e limitado a nome/ID/papel de contas ativas, necessário para dropdown de atribuição sem conceder acesso `/admin/users` ao operador.
- **ADD-03 — Rota `/api/v1/public/demo-access`:** disponibiliza exclusivamente credencial fictícia de operador quando `DEMO_PUBLIC_LOGIN=true` e `DEMO_MODE=true`; por padrão retorna 404.
- **ADD-04 — Semente em batch:** `jsonb_to_recordset` em SQL para reduzir round-trips e permitir reset lazy em infraestrutura edge.
- **ADD-05 — Propostas geradas por classificação externa:** mesmo respostas determinísticas têm fase de intenção por IA quando ativa; `FACTUAL` significa que a **resposta factual** é gerada do banco, embora possa haver consumo de classificação. `provider_used` indica o provedor consultado.

## Segurança de concorrência

`demo_control FOR UPDATE` no reset e `FOR SHARE` em mutações protege contra reset durante execução. Chaves idempotentes são únicas por usuário/operação; `pg_advisory_xact_lock(hashtext(...))` serializa mesma chave e a unique constraint impede race. `action_executions.proposal_id` unique garante uma execução por proposta.

## Riscos/pendências

Cloudflare Workers e Hyperdrive com Express 5, `jsonwebtoken`, `bcryptjs` e pool `pg` devem passar por smoke test real. `APP_BASE_URL` em produção precisa refletir a origem exata. Sem npm, banco, secrets e host, não há evidência de runtime/latência/compatibilidade end-to-end nesta entrega. Consulte `IMPLEMENTATION-REPORT.md`.
