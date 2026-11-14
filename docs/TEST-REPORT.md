# Relatório de testes executados — DeliveryAssist AI v1.0.0

**Data da construção:** 13–14/11/2026 (UTC; horário do sistema de execução). **Natureza da evidência:** comandos de container executados de fato; não substitui CI nem validação de deploy.

## Ambiente efetivamente disponível

- `node --version` → `v22.16.0`; `npm --version` → `10.9.2`.
- Arquivo-fonte da especificação lido no container: `DELIVERYASSIST_SPEC.md`, 1709 linhas.
- Rede do contêiner não conseguiu resolver `registry.npmjs.org`; `npm install` não concluiu (timeout); `npm install --package-lock-only --offline` retornou `ENOTCACHED` (`@emotion/react` não presente em cache).
- Sem `psql`, `postgres`, Docker, Wrangler local instalado ou credenciais de Cloudflare, PostgreSQL e provedor IA disponibilizadas nesta execução.

## Testes realizados

| Teste | Comando/forma real | Resultado observado | Escopo |
|---|---|---|---|
| Verificação sintática backend | `find server workers -name '*.js' ... node --check` | Sem erros de sintaxe reportados | JS backend/Workers |
| Parsing frontend JS/JSX | `typescript.createSourceFile` (TypeScript global instalado, modo JSX) em `client/src` | **PARSE OK**, 0 diagnósticos | JS/JSX de frontend; **não é** build/bundle |
| Testes independentes | `node --test server/tests/native.test.mjs` | **13/13 PASS**, 0 falhas; ~63–84 ms observado | validações, schemas de IA, enum, sintaxe de SQL de atraso, limites/identificadores; não usa DB |
| Instalação de dependências | `npm install --no-audit --no-fund` | **Não concluído** por impossibilidade de DNS/acesso npm | impediu execução das ferramentas externas |
| Lockfile offline na construção inicial | `npm install --package-lock-only --offline` | **Falhou** `ENOTCACHED` | Posteriormente foi incluído um `package-lock.json` no pacote recebido; não foi validado por `npm ci` naquela execução |

**Observação:** a sintaxe de expressões SQL foi inspecionada estaticamente, não compilada pelo PostgreSQL. Não alegar validação de transações/constraints/migrations sem banco real.

## Suítes criadas mas NÃO executadas

| Suíte | Código de testes existente | Requisito | Motivo de não execução |
|---|---|---|---|
| Unitário Jest | `server/tests/domain.test.js`, `server/tests/ai.test.js` | RN-ATR, RF-INC, SEG-17, adaptadores | Jest e demais dependências não instalados |
| API PostgreSQL + Supertest | `server/tests/api.integration.test.js` | AT-01..10, AT-15..24, AT-28/31/34 (cenários principais) | Sem `TEST_DATABASE_URL`/PostgreSQL e deps |
| Frontend Vitest + RTL | `client/src/components/Shared.test.jsx` | badges, datas, estados | Vitest/React/MUI não instalados |
| Browser real Playwright | `e2e/journeys.spec.js` | J1/J2/J8/mobile | Sem navegador/deps e app rodando |
| Build/Workers dry run | `npm run build` / `npm run deploy:check` | Vite/compatibilidade Cloudflare | Vite/Wrangler não instalados |
| Smoke real externo | `openai_compatible` ou `gemini_native` | RF-AI-13, DOD-08 | Sem chave/modelo/provider configurado |
| Métricas e coverage | Jest coverage, p95 local | RNF-04, gate >=80% | Execução de testes indisponível |

## Mapeamento parcial de critérios a testes escritos

- AT-01 (API sem auth), AT-02 (operador não-admin), AT-04 (CSRF), AT-05 (UUID): `api.integration.test.js`.
- AT-06/07 (atraso e pedido entregue): testes nativos para expressão SQL + cenário real em `api.integration.test.js` (pendente).
- AT-08/09/10 (duplicidade, reabertura, concorrência): Jest de domínio e integração real (pendente).
- AT-11/12/14 (saída inválida, ações desconhecidas/SQL): `ai.test.js`, `native.test.mjs` (parcialmente verificado no teste nativo).
- AT-15 a AT-20, AT-23/24 (não execução por proposta, aprovação, idempotência, dependências, draft): testes de integração escritos (pendentes).
- AT-25 quota, AT-26 timeout, AT-27 reset concorrente, AT-31 revogação de papéis: código de proteção existe, mas **não há evidência completa de todos esses cenários em banco real**. Pendências de homologação.
- AT-28 modo IA desabilitada: integração escrita (pendente).
- AT-29 UI filtros: E2E parcial escrito (pendente).
- AT-30 auditoria: integrações escritas (pendente).
- AT-32 HTML/script: React renderiza texto e schemas filtram conteúdo, mas não foi realizado teste E2E XSS completo.
- AT-33 segredo em erro: erro middleware contém filtro seguro; pentest ainda pendente.
- AT-34 rota API inexistente: integração escrita (pendente).

**Nenhuma suíte ignorada foi descrita como aprovada.** Testes escritos não são iguais a testes executados. A matriz AT-01..34 da especificação é um objetivo de aceite a validar após instalar infra.

## Recomendações antes de publicar

1. Executar `npm install` e gerar lockfile **real** com versões resolvidas.
2. Usar DB descartável com `test` no nome e `TEST_DATABASE_URL` separada de `DATABASE_URL`; executar `npm run db:migrate`, `npm run db:seed`, `npm run test:integration`.
3. Corrigir qualquer falha observada; executar `npm run lint`, `npm test`, `npm run build`, `npm run test:e2e` e `npm run deploy:check`.
4. Inspecionar runtime Workers com Hyperdrive, memória e CPU, política de cookies, `Origin`, headers e SQL transacional.
5. Ativar chave real de IA e fazer um smoke sem mock. Documentar data, modelo, tokens, latência e resultado. Executar estudo de prompt injection e quotas sob concorrência.
6. Só declarar `PROJETO COMPLETO` e publicar URL quando DOD-01..20 estiverem comprovados.

## Revisão final do pacote

- Correção implementada: parâmetros `incident_id` de propostas de alteração são verificados contra alvo e removidos antes de passar ao validador fechado de PATCH, preservando `expected_version`.
- Rejeição de proposta vencida agora persiste a expiração/propagação de cancelamento antes de responder 410.
- Scripts CLI recebem configuração local via `dotenv/config`; verificação de imports relativos e sintaxe repetida.
- Novamente: correções revisadas estaticamente, sem afirmar teste de integração.

## Revisão para publicação (14/11/2026)

Esta seção documenta uma **nova revisão** do ZIP recebido, não reescreve retroativamente os resultados originais acima. Foram removidos o `.env` preenchido, artefatos gerados, arquivos do sistema e um backup obsoleto da camada de banco. O `wrangler.jsonc` agora contém um identificador Hyperdrive de exemplo e inicia com IA desligada até configuração deliberada.

Foi acrescentada uma avaliação determinística de contratos (`npm run eval:ai`) e workflow GitHub Actions, sem alegar que uma execução do workflow, chamadas LLM ou integração PostgreSQL já ocorreram.
