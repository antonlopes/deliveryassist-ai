# Contrato REST `/api/v1` — DeliveryAssist AI v1

O servidor fornece `X-Request-ID` em todas as respostas e JSON. Sucesso padrão:

```json
{ "data": { "id": "<uuid>" }, "meta": { "request_id": "<uuid>", "server_time": "2026-11-13T00:00:00.000Z" } }
```

Para listas, `data` é array e `meta.pagination={page,page_size,total_items,total_pages}`. `page` começa em 1, default 20, máximo 50. Datas UTC ISO8601; front exibe `America/Sao_Paulo`.

Erro padrão:

```json
{ "error": { "code": "STALE_VERSION", "message": "Este registro foi atualizado. Recarregue e tente novamente.", "details": {}, "request_id": "<uuid>" } }
```

Códigos: `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 STALE_VERSION`, `409 DUPLICATE_ACTIVE_INCIDENT`, `409 IDEMPOTENCY_KEY_REUSED`, `409 ACTION_NOT_APPROVABLE`, `410 PROPOSAL_EXPIRED`, `422 INVALID_AI_OUTPUT`, `429 RATE_LIMITED`, `429 AI_QUOTA_EXCEEDED`, `502 AI_PROVIDER_ERROR`, `503 AI_UNAVAILABLE`, `504 AI_TIMEOUT`, `500 INTERNAL_ERROR`. Erros 23505/23503 do PostgreSQL são filtrados para mensagens seguras sem SQL.

**Transporte:** cookie HttpOnly (não JWT em JSON); login entrega `csrf_token` à memória da SPA. Todos os `POST/PATCH` autenticados exigem `X-CSRF-Token` e `Content-Type: application/json`; todas as mutações exigem `Origin` igual a `APP_BASE_URL` (desenvolvimento local aceita porta Vite). Não existe signup público. Sessões expiram em até 8h.

## Auth, saúde e metadados

| ID | Método/rota | Papel | Body / filtros | Saída, efeitos e negativa |
|---|---|---|---|---|
| API-001 | `POST /auth/login` | público | `{email:string,password:string}` | `{user,csrf_token,session_expires_at}` + cookie. Credenciais inválidas: 401 neutro; excesso: 429. |
| API-002 | `GET /auth/me` | autenticado | — | `{user,csrf_token,session_expires_at}`; sem sessão: 401. |
| API-003 | `POST /auth/logout` | autenticado | `{}` | `logged_out=true`; revoga JTI + limpa cookie; CSRF ausente: 403. |
| API-004 | `GET /healthz` | público | — | `status=alive`; sem segredos. **Fora de `/api/v1`.** |
| API-005 | `GET /readyz` | público | — | consulta `SELECT 1` sem detalhes do DB; indisponibilidade: 503. **Fora de `/api/v1`.** |
| ADD-03 | `GET /public/demo-access` | público | — | Somente quando `DEMO_MODE=true` e `DEMO_PUBLIC_LOGIN=true`: credencial fictícia de OPERATOR; senão 404. Nunca ADMIN. |

## Dashboard, restaurantes e pedidos

| ID | Método/rota | Papel | Body / query | Saída, efeitos e negativa |
|---|---|---|---|---|
| API-010 | `GET /dashboard/summary` | operador+ | `restaurant_id?:uuid`, `from?`, `to?` | KPIs reais, lista 10 atrasos, prioridade alta, distribuição. UUID/data inválido: 400. |
| API-011 | `GET /restaurants` | operador+ | `q?:string(120)`, `page`, `page_size` | registros paginados; sem sessão: 401. |
| API-012 | `GET /restaurants/:id` | operador+ | UUID | detalhe; inexistente: 404. |
| API-013 | `POST /restaurants` | admin | `{name:string(2..160),slug:string(a-z0-9-)}` | registro + audit; operador: 403; slug repetido: 409. |
| API-014 | `PATCH /restaurants/:id` | admin | `{name?,slug?,is_active?,expected_version:int}` | incrementa versão + audit; versão antiga: 409. |
| API-015 | `GET /orders` | operador+ | `order_code?` prefixo `PED-`, `restaurant_id?`, `status?`, `is_late?:true|false`, `page`, `page_size` | ETA e atraso SQL, sem alteração de pedidos; filtro inválido: 400. |
| API-016 | `GET /orders/:id` | operador+ | UUID | pedido, restaurante, cliente fictício, eventos e ocorrências; 404 se não existe. |
| API-017 | `GET /orders/:id/events` | operador+ | `page`, `page_size` | histórico de pedido; 404 se pedido não existe. |
| ADD-02 | `GET /assignees` | operador+ | `page`, `page_size` | lista ativa de nome/ID/papel sem senha/e-mail. |

## Ocorrências e rascunhos

Categoria enum: `DELIVERY_DELAY`, `MISSING_ITEM`, `WRONG_ITEM`, `COMMUNICATION`, `CANCELLATION_REQUEST`, `OTHER`. Prioridade enum: `LOW`, `MEDIUM`, `HIGH`. Status enum: `OPEN`, `IN_PROGRESS`, `RESOLVED`. Um par `(order_id,category)` só pode possuir **uma ocorrência ativa** (índice parcial). `RESOLVED -> IN_PROGRESS` precisa razão 10..600 caracteres. `RESOLVED -> OPEN` é proibido.

| ID | Método/rota | Papel | Body / filtros | Saída, efeitos e negativa |
|---|---|---|---|---|
| API-020 | `GET /incidents` | operador+ | `restaurant_id`, `order_id`, `status`, `priority`, `category`, paginação | lista filtrada; enum errado: 400. |
| API-021 | `POST /incidents` | operador+ | `{order_id:uuid,category:enum,priority:enum,description:string(15..2000)}` | cria e audita; duplicidade ativa: 409; FK inexistente: 404. |
| API-022 | `GET /incidents/:id` | operador+ | UUID | detalhe incluindo notas e rascunhos; inexistente: 404. |
| API-023 | `PATCH /incidents/:id` | operador+ | `{status?,priority?,assigned_to_user_id?:uuid|null,reason?,expected_version:int}` | incrementa `version`, audita. `expected_version` velho: 409; transição proibida: 400. |
| API-024 | `GET /incidents/:id/timeline` | operador+ | paginação | timeline imutável de auditoria/notas; inexistente: 404. |
| API-025 | `POST /incidents/:id/notes` | operador+ | `{body:string(1..1000)}` | nota imutável + audit; texto vazio: 400. |
| API-026 | `GET /incidents/:id/drafts` | operador+ | paginação | drafts internos; inexistente: 404. |
| API-027 | `POST /incidents/:id/drafts` | operador+ | `{body:string(1..2000)}` | grava `DRAFT` local, nunca envia; texto vazio: 400. |
| API-028 | `PATCH /drafts/:id` | operador+ | `{body?,status?:DRAFT|ARCHIVED,expected_version:int}` | altera versão + audita; concorrência: 409. |

Não existe `POST/PATCH /orders`, estado `SENT`, `send` ou integração de mensagem real.

## Assistente, conversas e propostas

Intenções fechadas: `GET_ORDER`, `LIST_LATE_ORDERS`, `LIST_INCIDENTS`, `ANALYZE_ORDER`, `CREATE_INCIDENT`, `SET_INCIDENT_PRIORITY`, `SET_INCIDENT_STATUS`, `ADD_INCIDENT_NOTE`, `CREATE_REPLY_DRAFT`, `UNKNOWN`.

Ações fechadas: `CREATE_INCIDENT`, `SET_INCIDENT_PRIORITY`, `SET_INCIDENT_STATUS`, `ADD_INCIDENT_NOTE`, `CREATE_REPLY_DRAFT`. Cada proposta tem ID, justificativa, prazo, versão observada, parâmetros tipados e aprovação própria; dependentes são `BLOCKED` até o pai ser `EXECUTED`. A IA **não** altera o domínio pelo endpoint de mensagens.

| ID | Método/rota | Papel | Body / filtros | Saída, efeitos e negativa |
|---|---|---|---|---|
| API-030 | `POST /assistant/conversations` | operador+ | `{title?:string(1..120)}` | cria conversa associada a `user_id` e `auth_session_id`; sem CSRF: 403. |
| API-031 | `GET /assistant/conversations` | operador+ | paginação | apenas sessão atual. |
| API-032 | `GET /assistant/conversations/:id` | dono da sessão | UUID | metadados, histórico recente e propostas; outra sessão: 404. |
| API-033 | `GET /assistant/conversations/:id/messages` | dono da sessão | paginação | histórico individual; outra sessão: 404. |
| API-034 | `POST /assistant/conversations/:id/messages` | dono da sessão | `{content:string(1..1200)}` | `{assistant_message,references,proposals}`; valida saída externa; IA desligada: 503; quota: 429. |
| API-035 | `GET /assistant/proposals/:id` | dono da sessão | UUID | proposta com status/expiração; outra sessão: 404. |
| API-036 | `POST /assistant/proposals/:id/approve` | dono da sessão | `{}` + header `Idempotency-Key:uuid` | `proposal_id,proposal_status,execution_id,result,dependents_released`; `meta.replayed` no replay; versão velha: 409; vencida: 410. |
| API-037 | `POST /assistant/proposals/:id/reject` | dono da sessão | `{reason?:string(1..300)}` | `proposal_status=REJECTED`, dependentes cancelados; nenhuma entidade de domínio alterada. |
| API-038 | `GET /assistant/status` | operador+ | — | `enabled,available,provider_label,provider_verified:false,quotas` (configuração não equivale a smoke real). |

**Exemplo da aprovação (sem payload executável do browser):**

```http
POST /api/v1/assistant/proposals/4b7b3c65-b878-4b6b-9706-a84a6f7d82f0/approve
Content-Type: application/json
X-CSRF-Token: <token derivado>
Idempotency-Key: 1f42a872-b13f-434a-9aa0-2baa548d1247

{}
```

Ao aprovar: backend verifica dono, prazo, status, versão, transição e duplicidade; executa CRUD de domínio, dedup e auditoria em transação única. Mesmo ID de proposta com outra chave após execução: 409. Mesma chave para proposta diferente: 409 `IDEMPOTENCY_KEY_REUSED`. Proposta de outra sessão: 404 uniforme.

## Administração

| ID | Método/rota | Papel | Body / filtros | Saída, efeitos e negativa |
|---|---|---|---|---|
| API-040 | `GET /admin/users` | admin | paginação | apenas `id,name,email,role,is_active,is_demo_account,timestamps`; operador: 403. |
| API-041 | `POST /admin/users` | admin | `{name,email,role:ADMIN|OPERATOR,password:string(12..200)}` | bcrypt hash, audit, sem signup público. |
| API-042 | `PATCH /admin/users/:id` | admin | `{name?,role?,is_active?}` | audita, revoga sessões após mudança de papel/ativação; protege último admin e próprio acesso. |
| API-043 | `POST /admin/users/:id/reset-password` | admin | `{password:string(12..200)}` | nova hash, revogação de todas as sessões antigas, audit. |
| API-044 | `GET /admin/audit` | admin | `entity_type?`, `entity_id?`, `actor_id?`, `event_type?`, `from?`, `to?`, paginação | logs sanitizados sem texto integral de chat. |
| API-045 | `GET /admin/ai-usage` | admin | `from?`, `to?` | contagem por provider/propósito/resultado, duração, tokens e status de propostas. Custo desconhecido se não configurado. |
| API-046 | `POST /admin/demo/reset` | admin + reauth | `{confirm_phrase:"RESETAR DEMO",password:<senha atual>}` | reseta somente demo, audit; senha errada: 401; `DEMO_MODE=false`: 403. |

**Mutações:** DTOs de entrada rejeitam campos adicionais; nunca repassam `role`, `source`, `actor_id`, timestamps nem SQL do browser ao serviço de banco. IDs de auditoria e autores vêm exclusivamente do servidor.

## Teste negativo recomendado por família

- Auth: senha errada, origem diferente, cookie ausente/expirado/revogado, CSRF inválido.
- Users/restaurants: papel insuficiente, slug/email já cadastrado, alteração do próprio último admin, versão errada.
- Orders: UUID inválido, enum inválido, tentativa de alterar pedido (404).
- Incidents: descrição curta, duplicidade ativa, owner inexistente, reabrir sem razão, versão antiga.
- AI: código inexistente, JSON quebrado, ação não catalogada, instruções maliciosas, outra sessão, quota, timeout.
- Approval: expirada, repetição mesma chave, chave reaproveitada para outra operação, duas aprovações em paralelo, dependência bloqueada/rejeitada.
- Reset: password inválido, DEMO_MODE=false, reset com proposta em andamento.

Os testes efetivamente escritos e **não necessariamente executados** constam em `server/tests`, `client/src/components/*.test.jsx` e `e2e`. Consulte `TEST-REPORT.md` para resultados concretos.
