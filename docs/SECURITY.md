# Segurança e privacidade — DeliveryAssist AI

**Ambiente demonstração / somente dados sintéticos.** Política baseada na especificação e referências OWASP (Session Management, API Security, CSRF Prevention, LLM Top 10). Não usar com clientes reais, processos de entrega ou dados financeiros reais sem nova revisão de segurança e operação.

## Identidade e autorização

- JWT HS256 com `sub`, `jti`, `iat`,`exp` e role informativo. Cookie `__Host-da_session` em produção, `HttpOnly; Secure; SameSite=Lax; Path=/`. Duração <=8h configurável.
- O backend consulta `auth_sessions.jti_hash` e papel atual do usuário a cada request; logout e reset de senha revogam JWT existente.
- Senhas bcrypt com work factor 12 e sal. Nunca retorna hash; contas ADMIN via variáveis de bootstrap e/ou gestão restrita. Credencial de operador só é pública se `DEMO_PUBLIC_LOGIN=true` em modo demo.
- Cada mutação requer CSRF HMAC vinculado à sessão e `Origin/Referer` canônico + JSON. `APP_BASE_URL` HTTPS obrigatório em produção.
- ADMIN pode gerenciar users/restaurant/reset; OPERATOR não acessa; conversas e propostas exigem **mesmo `auth_session_id`**, ainda que a conta de operador seja compartilhada.

## Validação, SQL e auditoria

- Body JSON máximo 64 KiB. Sem SQL arbitrário, sem ORM, params via `pg` placeholders. Colunas e sort SQL são literais internas.
- DTO fechado para cada mutation. `description` 15..2000, notes 1..1000, drafts 1..2000, assistant 1..1200; enums validados no serviço e CHECK DB.
- `expected_version` e `SELECT FOR UPDATE` em concorrência; índice único parcial para categoria ativa do pedido. Mudança e auditoria no mesmo commit.
- Auditoria registra metadados/IDs/valores de estado, não passwords, token, prompt, body de rascunho ou conteúdo integral do chat. Logs JSON incluem só rota (sem query string), método, status, duração e request ID.
- Helmet define CSP, HSTS em HTTPS, nosniff, política de referrer, frame ancestors none. A UI usa React e texto sem `dangerouslySetInnerHTML`.

## Fronteira de IA

- Prompt estático não fornece ferramentas SQL/código, URL ou permissões. Provider só recebe texto sintético limitado + dados **já consultados pelo backend**.
- Intent schema e reply schema requerem JSON exato, enums e IDs válidos; ação desconhecida ou parâmetro extra é rejeitado. O servidor injeta versão e alvo do DB.
- Não há execução automática; as cinco ações permitidas são tipadas. Rejeição não altera domínio. Aprovação exige CSRF, UUID idempotência e owner/session/status/expiração/versão.
- Timeout e quota persistente. `AI_API_KEY` só em secrets do servidor; `AI_BASE_URL` HTTPS com allowlist de host, sem redirects. Google/OpenAI adaptadores são HTTP diretos, sem frameworks de agentes.
- Rascunhos não são comunicados; nenhum botão `Enviar` existe.

## Proteção demo e retenção

- Seed gera 8 restaurantes, 160 pedidos, 36 ocorrências e dados sem PII real. Aviso público proíbe dados pessoais.
- Reset lazy, após `DEMO_RESET_HOURS` (default 24), sob `demo_control FOR UPDATE`, limpa somente dados operacionais e conversas demo, preserva usuários e audit administrativo; falha se `DEMO_MODE=false`.
- Sessão/JTI da conta compartilhada não concede leitura de mensagens de outras sessões; operadores podem modificar **dados operacionais compartilhados**.
- Quotas por sessão/usuário/global, contadores na DB; rate de login por IP e par login/IP. Reset administrativo requer frase exata, senha atual e limitador de tentativas.

## Restrições conhecidas antes de deploy

- Nenhum pentest nem revisão de dependências `npm audit` foi realizado nesta sessão (registro npm inacessível).
- Sem verificação de Cloudflare Workers/pg Hyperdrive, não presumir ausência de incompatibilidade de runtime, latência, orçamento de CPU ou capacidade de concorrência.
- Reserva de quota abandonada após terminação abrupta é reconciliada de forma lazy após 3 minutos (sob lock global); essa recuperação ainda requer teste real de interrupção em produção. Não aumentar limites até testar.
- O bloqueio de login por IP/conta é persistido na DB, mas CAPTCHA e isolamento por navegador compartilhado não fazem parte do v1.
- A natureza `DEMO_MODE` deve ser mantida em deployment isolado. Não misturar banco demo e dados reais.
- Recursos Cloudflare de firewall, TLS, logs e backup devem ser configurados no provedor e testados na URL final.
