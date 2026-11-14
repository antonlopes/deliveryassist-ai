# DELIVERYASSIST_SPEC.md

> **DeliveryAssist AI — Especificação técnica integral (PRD + SRS + TDD + contrato de implementação)**  
> **Versão:** 1.0.0 — Escopo consolidado  
> **Data-base:** 2026-11-13  
> **Status:** APROVADO PARA IMPLEMENTAÇÃO, sujeito apenas à configuração das credenciais de infraestrutura e IA  
> **Idioma da aplicação:** português do Brasil (pt-BR)  
> **Público:** desenvolvedor ou LLM executor responsável por implementar o produto, ponta a ponta  
> **Entrega desta especificação:** documento técnico; **não contém código-fonte da aplicação**

---

## 0. Contrato de leitura e execução pelo LLM implementador

### 0.1. Interpretação normativa

- **DEVE / MUST**: requisito obrigatório, cuja ausência impede declarar a aplicação concluída.
- **NÃO DEVE / MUST NOT**: comportamento proibido.
- **DEVERIA / SHOULD**: prática recomendada, dispensável somente com justificativa escrita.
- **PODE / MAY**: extensão opcional, nunca impeditiva da entrega.
- Os identificadores `RF-*`, `RN-*`, `RNF-*`, `API-*`, `IA-*`, `SEG-*`, `AT-*` e `CA-*` são estáveis e devem ser usados em commits, testes e checklist de aceite.
- **Não inventar funcionalidades** fora deste documento nem substituir funcionalidades reais por placeholders. Dúvidas menores serão resolvidas conforme as decisões padrão aqui definidas.
- **Nunca afirmar que algo foi implementado sem código, teste e evidência de execução.** Não simular chamadas ao provedor em produção e não atribuir resultados fictícios à IA real.
- A execução será incremental: planejar, implementar, testar, corrigir e comprovar cada fase antes de avançar. A publicação online exige credenciais e recursos de hospedagem providos pelo responsável.
- Qualquer incompatibilidade externa (API, política do provedor ou serviço de hospedagem) deve ser registrada; consultar a documentação oficial atual, preservar os contratos internos e adaptar o conector sem alterar a intenção do produto.

### 0.2. Entregáveis obrigatórios da implementação

1. Repositório versionado com frontend React e backend Node.js/Express em JavaScript, compartilhando uma única configuração de monorepositório simples.
2. Aplicação web responsiva e integralmente funcional, acessível via URL HTTPS.
3. API REST versionada `/api/v1` com contratos e erros previstos neste documento.
4. PostgreSQL com migrations, índices, constraints, seeds reproduzíveis e histórico operacional.
5. Integração **real** com provedor externo de LLM escolhido por variáveis de ambiente; adaptadores sem acoplamento das regras de negócio.
6. Fluxos de IA com interpretação, consulta controlada, propostas independentes, aprovação humana, execução transacional e auditoria.
7. Autenticação, autorização, proteção da demo pública, limites de uso, tratamento de falhas e gerenciamento de segredos.
8. Testes unitários, de integração, de UI e E2E, incluindo casos negativos e concorrência.
9. README, `.env.example` sem segredos, documentação da API, decisões de arquitetura, roteiro de demo e procedimento de deploy/reset.
10. Relatório final de implementação com testes executados, limitações reais, URLs e evidência das jornadas críticas.

### 0.3. Proibições expressas

- **Não implementar** treinamento de modelos, fine-tuning, datasets de treinamento, RAG, embeddings, banco vetorial, LangChain, frameworks de agentes ou microserviços.
- **Não usar** ORM, TypeScript, GraphQL, Redis, WebSockets ou filas externas como dependência obrigatória do v1.
- **Não integrar** APIs privadas do iFood, pagamentos, entregadores, GPS ou mensagens reais a clientes.
- **Não** permitir SQL arbitrário, chamadas HTTP arbitrárias, execução de código ou escrita direta no banco por conteúdo gerado pela IA.
- **Não** criar contas públicas por cadastro aberto nem expor a credencial administrativa na página pública.
- **Não** aceitar aprovação implícita ou automática de operações sugeridas pelo modelo.

---

## 1. Visão, problema e proposta de valor

### 1.1. Problema

Uma central fictícia de operações de delivery atende vários restaurantes e precisa localizar pedidos, identificar atrasos, registrar e priorizar ocorrências, consultar histórico e preparar respostas a clientes. Essas atividades consomem tempo e distribuem informações por múltiplas telas.

### 1.2. Solução

O **DeliveryAssist AI** é um produto demonstrável de gerenciamento de pedidos e incidentes, com assistente de linguagem natural apoiado por LLM externo. O modelo **interpreta intenções e sugere ações**; a aplicação **consulta dados verificáveis, valida permissões, solicita aprovação humana e executa operações de domínio**.

### 1.3. Resultado esperado

Um avaliador deve conseguir: abrir a URL; entrar como operador de demonstração; visualizar dados de vários restaurantes; consultar pedido e atraso; solicitar à IA a criação de uma ocorrência; visualizar **duas ou mais propostas** quando pertinente; aprovar cada uma separadamente; conferir a atualização do banco e da interface; e verificar os registros de histórico. Ações administrativas devem estar bloqueadas ao operador.

### 1.4. Objetivos mensuráveis do produto

| ID | Objetivo | Evidência mínima |
|---|---|---|
| OBJ-01 | Jornada de ponta a ponta real | Uma conversa leva a proposta aprovada, alteração persistida e auditoria |
| OBJ-02 | IA como elemento central | Interpretação de pelo menos 8 intenções documentadas e proposição de ações estruturadas |
| OBJ-03 | Confiabilidade | API, validações, permissões e testes negativos cobrindo todas as mutações |
| OBJ-04 | Demonstração online | HTTPS, login de operador, dados fictícios e provedor IA ativo se credenciais/cota estiverem válidas |
| OBJ-05 | Baixo custo | Um processo Node.js servindo UI/API; PostgreSQL gerenciado; sem dependências de infraestrutura pagas obrigatórias |
| OBJ-06 | Transparência | Identificar quando resposta foi gerada por IA, quando são fatos do banco e quando operação foi confirmada |

### 1.5. Fora do escopo

- Marketplace de consumidores; cadastro real de restaurantes; logística de entregadores; mapas; notificações reais; checkout; integrações de cobrança; atendimento por canais externos; automação de reembolsos/cancelamentos; predição por ML; operação multiempresa com isolamento de tenants; escalabilidade distribuída; console para alteração de prompts por visitantes.
- O produto é um **ambiente simulado com ações reais dentro do seu próprio banco**, não uma operação comercial verdadeira.

---

## 2. Premissas aprovadas e decisões subordinadas encerradas

| Decisão | Valor vinculante |
|---|---|
| Usuários | Uma central de operações, gerenciando múltiplos restaurantes |
| Origem de pedidos | PostgreSQL com dados sintéticos e seeds predefinidos |
| IA | API externa selecionável por variável de ambiente; LLM não é treinado pelo projeto |
| Ações da IA | Criar/atualizar ocorrência, ajustar prioridade, acrescentar nota, gerar rascunho ao cliente |
| Autorização | Administrador e operador com matrizes de permissão distintas |
| Profundidade | Produto completo, implementação incremental com testes em cada fase |
| Apresentação | Aplicação publicada com URL HTTPS acessível a avaliadores |
| Acesso público | Conta(s) de demonstração preexistentes; sem signup público; admin não divulgado |
| Sequências | Múltiplas ações propostas e aprovadas **individualmente**; dependências explícitas |
| Comunicação a cliente | Somente rascunho editável; nenhum envio real |
| Atraso | Detectado deterministicamente a partir de ETA/status/relógio; não pelo LLM |
| Custos | Hospedagem gratuita ou de baixo custo, limites rigorosos na API de IA |
| Hospedagem lógica | **Um origin**: Express serve `/api/v1` e o build React na mesma URL; PostgreSQL externo |
| Linguagem | JavaScript ES6+; sem TypeScript obrigatório |
| Datas | Persistência em UTC, exibição pt-BR com fuso `America/Sao_Paulo` |
| Estrutura de domínio | Uma organização; restaurantes são registros, não tenants autenticáveis |
| Conclusão de pedidos | Pedidos não são alterados pelo assistente; estado do pedido é informativo |
| Dados pessoais | Exclusivamente sintéticos; nenhum PII real nos seeds ou mensagens de demo |

### 2.1. Dependências de implantação que não são decisões de escopo

A pessoa responsável pela implantação fornecerá: host/database PostgreSQL, URL pública e credenciais de API do provedor de IA. A implementação **deve** funcionar localmente sem essas credenciais quando IA estiver explicitamente desativada, exibindo estado `IA indisponível`, e funcionar com o provedor real quando configurada. A aplicação publicada só pode anunciar IA funcional depois de um teste real bem-sucedido. Não garantir disponibilidade de planos gratuitos ou modelos sem verificar o provedor no momento do deploy.

---

## 3. Atores, autorização e experiência de demonstração

### 3.1. Atores

- **Administrador (`ADMIN`)**: login; gerencia operadores, restaurantes e reset da demonstração; consulta tudo; usa IA; gerencia incidentes; vê auditoria e métricas de consumo. Conta privada, não apresentada na página de demonstração.
- **Operador (`OPERATOR`)**: login; consulta restaurantes/pedidos; administra ocorrências; registra notas; usa IA, aprova suas propostas; vê o histórico operacional permitido; não administra usuários/restaurantes nem consulta logs administrativos completos.
- **Visitante (`ANONYMOUS`)**: vê somente página de login, documentação pública não sensível e informações básicas do projeto. Não acessa dados de domínio ou endpoints de IA.
- **Provedor de IA (`LLM_PROVIDER`)**: sistema externo confiável apenas como gerador **não autoritativo** de interpretações/texto; sem identidade de usuário e sem acesso a banco ou credenciais de aplicação.

### 3.2. Matriz de permissão (servidor sempre autoritativo)

| Recurso/operação | Anônimo | Operador | Administrador |
|---|---:|---:|---:|
| Autenticar e encerrar própria sessão | Login | Sim | Sim |
| Dashboard, pedidos e restaurantes (leitura) | Não | Sim | Sim |
| Ocorrências: ler, criar, priorizar, mudar estado, nota | Não | Sim | Sim |
| Rascunhos: criar, editar, consultar | Não | Sim | Sim |
| Conversas próprias | Não | Sim | Sim |
| Aprovar/rejeitar próprias propostas da IA | Não | Sim | Sim |
| Ler conversas de outros operadores | Não | Não | Não (privacidade por padrão) |
| Administrar restaurantes | Não | Não | Sim |
| Administrar contas e papéis | Não | Não | Sim |
| Auditoria global e estatísticas da IA | Não | Não | Sim |
| Reset de dados de demo | Não | Não | Sim (proteção adicional) |
| Alterar provider/key pela UI | Não | Não | Não |

### 3.3. Demonstração pública

- O ambiente publicado exibirá instruções para acessar **somente a conta `OPERATOR` de demonstração**, com senha definida em secret de deploy ou informada em instrução pública do site. **Nunca** expor senha do administrador.
- Como a conta pública é compartilhada, aceitar que a demo pode receber alterações de vários visitantes. **Não prometer privacidade de mensagens no ambiente de demo público.** Mostrar aviso curto: `Ambiente demonstrativo com dados fictícios e histórico potencialmente compartilhado; não insira informações pessoais.`
- Na demo compartilhada, o histórico de conversas é associado ao `auth_session_id` individual; visitantes que compartilham o mesmo login **não podem acessar conversas iniciadas em outras sessões**. O backend valida o par `conversation_id` + `auth_session_id` em toda consulta, envio e proposta. Admin não tem leitura do conteúdo dessas conversas por padrão; auditoria registra só metadados.
- Qualquer usuário de demo pode modificar registros operacionais fictícios na sua sessão; exibir `Dados de demonstração sujeitos a reset`. O usuário administrador poderá executar reset protegido. Implementar reset automático **lazy**, uma vez por período configurável (padrão 24 horas), ao primeiro acesso subsequente, com lock transacional para não haver reset concorrente. O reset afeta apenas dados operacionais fictícios e conversas de demonstração, não credenciais administrativas/configurações; revoga propostas pendentes.
- Reset administrativo exige senha atual ou confirmação reforçada e proteção de taxa. Nunca colocar esse endpoint em menus públicos.
- Testes de demo não podem depender de histórico persistido entre resets; relatórios de execução devem registrar quando a base foi reinicializada.
- Restringir uso da IA por **sessão, conta e cota global diária**, persistida no banco. Sob cota esgotada, toda gestão manual continua funcional.

---

## 4. Requisitos funcionais (RF)

### 4.1. Identidade e sessão

| ID | Requisito obrigatório |
|---|---|
| RF-AUTH-01 | Login por e-mail e senha; resposta neutra para credenciais erradas |
| RF-AUTH-02 | Logout com revogação do identificador de sessão no servidor |
| RF-AUTH-03 | Sessão autenticada verificada no backend em toda rota protegida |
| RF-AUTH-04 | Controle `ADMIN`/`OPERATOR` aplicado na API e refletido na UI |
| RF-AUTH-05 | Gerenciamento de operadores (criar, desativar, alterar papel, redefinir senha) restrito ao ADMIN |
| RF-AUTH-06 | Sem endpoint público de cadastro, sem credenciais administrativas em seeds públicos |

### 4.2. Restaurantes e pedidos

| ID | Requisito obrigatório |
|---|---|
| RF-REST-01 | Listar e pesquisar restaurantes, com paginação |
| RF-REST-02 | ADMIN pode criar, alterar e desativar restaurante sem apagar pedidos vinculados |
| RF-ORD-01 | Listar pedidos com busca por código, filtros por restaurante/status/atraso e paginação |
| RF-ORD-02 | Detalhar pedido e exibir histórico de eventos, restaurante, cliente fictício e ocorrências |
| RF-ORD-03 | Calcular atraso automaticamente com regra RN-ATR-01; nunca depender da IA |
| RF-ORD-04 | Pedido é **somente leitura** na interface e não existe endpoint público de alteração de status do pedido |

### 4.3. Incidentes e respostas

| ID | Requisito obrigatório |
|---|---|
| RF-INC-01 | Listar ocorrências com filtros por categoria, prioridade, status, restaurante e pedido |
| RF-INC-02 | Criar manualmente ocorrência vinculada a pedido existente |
| RF-INC-03 | Atualizar status, prioridade e responsável com permissões e controle de concorrência |
| RF-INC-04 | Inserir notas internas e registrar autoria |
| RF-INC-05 | Exibir linha do tempo de alterações e notas por ocorrência |
| RF-INC-06 | Detectar e impedir ocorrência ativa duplicada de mesma categoria no mesmo pedido, salvo tratamento explícito de 409 |
| RF-DRAFT-01 | Gerar/armazenar/editar rascunho de resposta ao cliente vinculado a uma ocorrência |
| RF-DRAFT-02 | Não enviar e-mail, SMS, WhatsApp ou mensagem real; botão `Enviar` é proibido no v1 |
| RF-DASH-01 | Dashboard agregado de pedidos ativos, atrasados, ocorrências por status/prioridade e distribuição por restaurante |
| RF-DASH-02 | Indicadores calculados por SQL e exibidos com data de atualização clara |

### 4.4. Assistente de IA e propostas

| ID | Requisito obrigatório |
|---|---|
| RF-AI-01 | Abrir conversa e enviar mensagens em pt-BR por usuário/sessão |
| RF-AI-02 | Identificar intenções permitidas e alvos; pedir esclarecimento se houver ambiguidade |
| RF-AI-03 | Consultar dados somente via ferramentas/funções do backend predefinidas e autorizadas |
| RF-AI-04 | Responder com fatos rastreáveis, identificadores e distinção entre dados e recomendações |
| RF-AI-05 | Produzir uma ou mais propostas estruturadas, cada uma com ID e aprovação própria |
| RF-AI-06 | Executar ações somente após confirmação explícita, vinculada a proposta válida e sessão autorizada |
| RF-AI-07 | Permitir rejeição individual de proposta; rejeição nunca executa efeito de domínio |
| RF-AI-08 | Suportar dependência entre propostas (ex.: criar ocorrência antes de adicionar nota) |
| RF-AI-09 | Tratar proposta expirada, alterada por concorrência, repetida, inválida ou não autorizada |
| RF-AI-10 | Registrar provedor/modelo, duração, consumo fornecido pelo provedor e resultado sem gravar segredos |
| RF-AI-11 | O sistema manual continua acessível quando IA é indisponível ou cota excedida |
| RF-AI-12 | Manter contexto apenas da própria conversa/sessão e limitar volume de histórico enviado ao modelo |
| RF-AI-13 | Permitir integração real por API externa e configuração de provedor/modelo por ambiente |

### 4.5. Administração, auditoria e operação

| ID | Requisito obrigatório |
|---|---|
| RF-ADM-01 | ADMIN lista métricas agregadas de consumo/falhas da API IA sem ver chave ou tokens secretos |
| RF-ADM-02 | ADMIN consulta auditoria filtrável por ator, entidade, operação e período |
| RF-ADM-03 | ADMIN pode resetar com segurança os dados operacionais da demo |
| RF-ADM-04 | Migrations e seed executáveis idempotentemente com comando documentado |
| RF-ADM-05 | Página `/health`/endpoint de prontidão sem exposição de credenciais |

---

## 5. Regras de negócio, invariantes e estados (RN)

### 5.1. Estado dos pedidos

- `CREATED`, `PREPARING`, `READY_FOR_PICKUP`, `IN_DELIVERY`, `DELIVERED`, `CANCELED`.
- Pedidos são inseridos pelas seeds. Nenhum usuário final ou LLM poderá alterar seu estado no v1.
- `estimated_delivery_at` é obrigatório para pedidos com estado diferente de `CANCELED`; valor original não muda na operação manual.
- `delivered_at` é preenchido apenas para `DELIVERED`; pode representar entrega antecipada ou atrasada (histórico).
- `CANCELED` não conta como atraso ativo. `DELIVERED` não conta como atraso ativo mesmo que historicamente tenha sido entregue tarde.

### 5.2. Detecção determinística de atraso

**RN-ATR-01**: um pedido está **atrasado agora** se `status NOT IN (DELIVERED, CANCELED)` **e** `current_timestamp > estimated_delivery_at + interval de tolerância`. Tolerância padrão: **5 minutos**, configurável por `LATE_GRACE_MINUTES` no servidor (inteiro 0–60). Regra executada em consultas SQL, páginas e dashboard; o relógio do navegador não é autoridade.

**RN-ATR-02**: `delay_minutes = max(0, floor((now_utc - estimated_delivery_at)/60s))` para pedidos ativos; essa duração reflete o atraso bruto após ETA, não desconta os 5 minutos de tolerância. O rótulo `atrasado` só aparece após a tolerância. Nunca exibir atraso negativo.

**RN-ATR-03**: a detecção não abre ocorrência automaticamente. Uma ocorrência só nasce de uma ação manual ou aprovação explícita de proposta IA. Isso mantém a demonstração controlável e evita registros duplicados.

### 5.3. Incidentes

- Categorias: `DELIVERY_DELAY`, `MISSING_ITEM`, `WRONG_ITEM`, `COMMUNICATION`, `CANCELLATION_REQUEST`, `OTHER`.
- Prioridades: `LOW`, `MEDIUM`, `HIGH`. Uma IA pode sugerir; decisão final é humana e backend valida enum.
- Estados: `OPEN`, `IN_PROGRESS`, `RESOLVED`.
- Transições: `OPEN -> IN_PROGRESS`, `OPEN -> RESOLVED`, `IN_PROGRESS -> OPEN`, `IN_PROGRESS -> RESOLVED`, `RESOLVED -> IN_PROGRESS` (reabertura com justificativa obrigatória). `RESOLVED -> OPEN` direto é proibido.
- Uma ocorrência ativa (`OPEN` ou `IN_PROGRESS`) por par (`order_id`, `category`), via índice único parcial PostgreSQL. Após resolução, pode existir nova ocorrência da mesma categoria, mantendo histórico.
- Descrição obrigatória entre 15 e 2000 caracteres; nota entre 1 e 1000; rascunho de resposta entre 1 e 2000; rótulos não podem ser livres fora dos enums.
- Uma ocorrência sempre pertence a um pedido. O restaurante é derivado do pedido, nunca aceito do payload como campo autoritativo.
- `version` inteiro >= 1 incrementa em toda mutação do registro de ocorrência; `expected_version` do cliente obrigatório em alterações de status/prioridade/atribuição. Diferença produz `409 STALE_VERSION`.
- O backend é responsável por registrar autor, instante e estados anterior/novo em uma mesma transação com a operação.

### 5.4. Responsáveis e histórico

- `assigned_to_user_id` opcional; se atribuído, usuário deve existir e estar ativo.
- Somente ADMIN/OPERATOR pode criar notas; autoria vem da sessão.
- Notas são imutáveis no v1 (sem edição/remoção), para manter rastreabilidade; conteúdo é renderizado como texto simples, nunca HTML executável.
- A interface exibe últimas alterações ordenadas por `created_at` e `id`, paginação em histórico longo.

### 5.5. Rascunhos ao cliente

- Rascunhos são objetos locais; estados `DRAFT` e `ARCHIVED`. Nenhum estado `SENT` existe.
- Texto deve ser revisável e editável pelo operador, com `updated_by_user_id`, `updated_at` e `version`.
- Só armazenar o rascunho produzido pela IA após aprovação explícita da proposta `CREATE_REPLY_DRAFT`; um rascunho pode também ser criado manualmente.
- O sistema não presume que o rascunho foi enviado e não registra comunicação externa.

### 5.6. Propostas e múltiplas ações

**RN-ACT-01**: cada proposta possui ID único, tipo permitido, alvo, parâmetros validados, justificativa, evidências (IDs válidos), versão observada do alvo (quando aplicável), autoria da conversa e expiração.

**RN-ACT-02**: estados `BLOCKED`, `PENDING`, `APPROVED`, `EXECUTING`, `EXECUTED`, `REJECTED`, `FAILED`, `EXPIRED`, `CANCELED`.

**RN-ACT-03**: `PENDING -> REJECTED` não altera domínio. Na aprovação, `APPROVED`/`EXECUTING` são estados conceituais do fluxo; o armazenamento pode realizar a transição atômica `PENDING -> EXECUTED` junto da mutação e auditoria na mesma transação, evitando estados intermediários persistidos. Em falha antes do commit, **nenhuma mutação parcial** sobrevive; o erro pode ser registrado separadamente como `FAILED` com código seguro e controle de concorrência. `BLOCKED -> PENDING` somente após dependência executada com sucesso. Estados finais são irreversíveis.

**RN-ACT-04**: aprovação é individual. A UI **não** terá `Aprovar todas` no v1. Uma conversa pode sugerir até **3 ações por turno**, com justificativas independentes.

**RN-ACT-05**: `expires_at` padrão 15 minutos após criação. A expiração é verificada ao ler e ao aprovar; job assíncrono não é requisito. Proposta vencida não pode ser executada, mesmo com botão antigo aberto.

**RN-ACT-06**: dependências: uma proposta pode referenciar `depends_on_proposal_id` dentro da mesma conversa e mesmo grupo de geração, com cadeia acíclica de máximo 3 nós. Ex.: `CREATE_INCIDENT` (PENDING) seguido de `ADD_INCIDENT_NOTE` (BLOCKED); após a primeira execução, backend resolve o ID da ocorrência produzida e libera segunda para aprovação. Se dependência é rejeitada, falha ou expira, dependentes ficam `CANCELED`, sem efeitos.

**RN-ACT-07**: todo pedido de aprovação exige cabeçalho `Idempotency-Key` (UUID) e revalidação do estado de proposta, dono, papel, recurso e versão. Mesma chave e mesmo conteúdo retorna resultado já registrado; mesma chave com conteúdo diferente produz `409 IDEMPOTENCY_KEY_REUSED`.

**RN-ACT-08**: ações executadas em transação única de PostgreSQL envolvendo atualização de domínio, ação, deduplicação e auditoria. Travas de linha (`SELECT ... FOR UPDATE` ou equivalente) impedem duas aprovações concorrentes de efeitos duplos. Se uma chamada falhar, não deixar operação de domínio parcialmente aplicada.

**RN-ACT-09**: nenhuma saída do modelo altera permissões de usuários, dados de pedidos, chaves, limites, orçamento ou tabela de auditoria.

**RN-ACT-10**: o backend nunca aceitará proposta arbitrária enviada pelo browser. A aprovação recebe somente identificador de proposta + chave idempotente; parâmetros são lidos do registro persistido e revalidados.

### 5.7. Operações assistidas permitidas

| Tipo exato | Alvo | Parâmetros permitidos | Efeito após aprovação |
|---|---|---|---|
| `CREATE_INCIDENT` | pedido | `order_id`, `category`, `priority`, `description` | Criar ocorrência; retornar ID novo |
| `SET_INCIDENT_PRIORITY` | ocorrência | `incident_id`, `priority`, `expected_version` | Alterar prioridade |
| `SET_INCIDENT_STATUS` | ocorrência | `incident_id`, `status`, `expected_version`, `reason` se reabrir | Alterar estado válido |
| `ADD_INCIDENT_NOTE` | ocorrência | `incident_id` ou referência resolvível à proposta criadora, `content` | Criar nota imutável |
| `CREATE_REPLY_DRAFT` | ocorrência | `incident_id` ou referência resolvível, `body` | Criar rascunho local, **sem enviar** |

**Não haverá** ações genéricas `run_sql`, `call_url`, `execute_code`, `send_message`, `refund_order`, `cancel_order`, `modify_order`, `change_user_role` ou similares.

---

## 6. Requisitos não funcionais (RNF)

| ID | Categoria | Critério de aceite |
|---|---|---|
| RNF-01 | Linguagem | UI, mensagens de erro e rascunhos em pt-BR; identificadores e contratos técnicos em inglês |
| RNF-02 | Responsividade | Layout utilizável de 360px de largura a desktop; sem perda de ações de aprovação/rejeição |
| RNF-03 | Acessibilidade | Navegação por teclado, foco visível, labels, contraste adequado, `aria-live` para respostas e erros |
| RNF-04 | Performance API | Para consultas sem IA, alvo de p95 < 800 ms no processo local com seeds; não prometer esse valor em hosts com cold start |
| RNF-05 | Performance IA | Tempo limite configurável: até 2 etapas funcionais LLM (interpretação e resposta), com no máximo 1 chamada extra de reparo se necessária; tempo total alvo até 45s; UI deve indicar processamento |
| RNF-06 | Paginação | Padrão 20, máximo 50 itens por página; todos os endpoints de listagem paginados |
| RNF-07 | Disponibilidade parcial | Falha de IA nunca impede login, consulta e CRUD manual de ocorrências |
| RNF-08 | Integridade | FK/unique/check constraints e transações para todas as operações de domínio |
| RNF-09 | Privacidade | Dados exclusivamente fictícios, redaction de segredos e limite de retenção de conversas |
| RNF-10 | Observabilidade | Logs JSON estruturados sem conteúdo sensível; `request_id` para rastreio de falhas |
| RNF-11 | Compatibilidade | Navegadores modernos atuais: Chrome, Edge, Firefox e Safari; sem exigência de suporte a versões antigas |
| RNF-12 | Deploy | Um domínio HTTPS e um serviço Node capaz de servir SPA/API; DB persistente separado |
| RNF-13 | Reprodutibilidade | Migrações, seeds, testes e build por comandos documentados e lockfile de dependências |
| RNF-14 | Custos | Cotas e limites de mensagens, tokens e requisições por usuário/sessão/global; IA desligável por ambiente |
| RNF-15 | Sem dependência funcional de provider | Um provedor fora do ar não corrompe incidentes ou propostas já persistidos |
| RNF-16 | Consistência de interface | Estados de loading, vazio, sucesso, erro, timeout e permissão negada em todas as telas |
| RNF-17 | Robustez de data | UTC no banco; timezone de apresentação constante; seeds relativos ao relógio de inicialização/reset |

### 6.1. Metas técnicas configuráveis

- Limite de payload JSON por rota normal: **64 KiB**; mensagem de usuário ao assistente: **até 1200 caracteres**; texto de proposta/rascunho limitado conforme regras de negócio.
- Máximo de histórico enviado ao modelo: **6 mensagens anteriores relevantes** + contexto de domínio resumido, com truncamento seguro por limite de caracteres/tokens do provedor.
- Timeout por requisição ao provedor: padrão **20 segundos**; timeout do turno completo: **45 segundos**. Suportar cancelamento da chamada HTTP no backend.
- Máximo **3 propostas de ação** geradas por turno; máximo **10 itens** mostrados no resumo de uma lista, com total de correspondências explícito.
- Cota pública inicial de referência: **30 turnos de IA/dia global**, **10 turnos/dia por sessão** e **3 turnos/minuto por sessão**. Valores são configuráveis e não podem ser aumentados pela UI pública.
- Retenção de conversas de demo: até reset (24h) ou **7 dias**, o que ocorrer primeiro; auditoria administrativa pode adotar retenção mais longa, sem texto integral do chat.

---

## 7. Arquitetura de software e fluxos

### 7.1. Estilo arquitetural

**Monólito modular de backend + SPA React**, sem microsserviços. O Express entrega:

- Endpoints versionados `/api/v1/*`;
- `GET /healthz` para liveness e `GET /readyz` para diagnóstico de prontidão sem informações secretas;
- Assets estáticos do build React em produção, com fallback somente para rotas SPA (não para `/api`/`/healthz`/`/readyz`).

Frontend e backend usam **mesma origem pública**, facilitando autenticação via cookies seguros, evitando CORS aberto e reduzindo custos de hospedagem. O PostgreSQL é serviço persistente separado.

### 7.2. Camadas internas do backend

1. **HTTP routes/controllers:** validação superficial e DTOs; jamais SQL ou chamada ao LLM diretamente.
2. **Auth middleware:** sessão, CSRF, papel, taxa; contexto de usuário no request.
3. **Domain services:** regras de pedidos/incidentes e mudanças de estado; transações e auditoria.
4. **Repositories:** SQL parametrizado e mapeamento explícito de DTO; nunca concatenar input do usuário.
5. **AI orchestration:** interpretar intenção, autorizar ferramentas, consultar domínio, redigir resposta/propostas, validar saída.
6. **AI provider adapters:** tradução HTTP para cada provedor e normalização de texto, metadata de tokens e erros.
7. **Action executor:** confirmar individualmente proposta persistida, revalidar, controlar concorrência e persistir operação/auditoria.
8. **Infrastructure services:** logs, idempotência, métricas, quotas, sessão e reset de demo.

### 7.3. Estrutura recomendada do repositório

Esta árvore descreve **responsabilidades**, não é código-fonte implementado:

```text
/
  package.json                    # scripts orquestradores
  package-lock.json               # dependências travadas
  .env.example                    # nomes de variáveis, nunca valores secretos
  README.md
  docs/
    ARCHITECTURE.md
    API.md
    SECURITY.md
    DEMO.md
    TEST-REPORT.md
  client/
    src/
      app/                        # rotas, providers, layouts
      components/                 # UI reutilizável
      features/                   # auth, dashboard, orders, incidents, assistant, admin
      services/                   # cliente HTTP e DTOs
      stores/                     # Zustand (somente estado local)
      styles/
      tests/
  server/
    src/
      app/                        # express, rotas, middlewares
      modules/
        auth/
        users/
        restaurants/
        orders/
        incidents/
        drafts/
        assistant/
        action-proposals/
        audit/
        metrics/
        demo/
      ai/
        orchestration/
        providers/
        contracts/
      database/
        migrations/
        seeds/
        repositories/
      shared/
        errors/
        validation/
        logging/
        security/
      tests/
    scripts/                      # migrations, seed, reset controlado
  e2e/                            # Playwright
```

### 7.4. Responsabilidades de estado frontend

- **TanStack Query**: dados remotos (pedidos, incidentes, dashboard, propostas); invalidar consultas afetadas após mutation.
- **Zustand**: filtro visual, estado do painel do assistente, seleção de UI; nunca armazenar senha, cookie de sessão ou chave de provedor.
- **React Router**: páginas públicas, guardas de rota para experiência; segurança real no servidor.
- **Material UI**: componentes consistentes; evitar bibliotecas de gráficos adicionais como requisito. Gráficos simples podem ser construídos com elementos existentes.
- **Fetch ou Axios**: cliente HTTP centralizado, sempre `credentials: include` quando apropriado e CSRF header em mutações autenticadas.

### 7.5. Fluxo de um turno de IA (sem execução implícita)

1. Usuário autenticado envia texto a `POST /api/v1/assistant/conversations/:id/messages`.
2. Validar autenticação, acesso à conversa da sessão, limites de input e cota (reserva atômica de orçamento diário).
3. Persistir mensagem de usuário com estado de processamento associado e `request_id`.
4. **Fase INTENT**: chamar provedor para classificar intenção, IDs citados e necessidade de esclarecimento. Retorno estruturado e validado. Se retorno inválido, realizar no máximo **uma** tentativa adicional de reparo **por turno**, respeitando o tempo limite global, ou retornar erro recuperável.
5. Verificar se intenção corresponde à allowlist. Se faltar ID obrigatório, responder pedindo identificação sem consultar qualquer registro.
6. **Fase DATA**: backend escolhe somente função de consulta da allowlist, verifica autorização e obtém dados por repositórios com SQL parametrizado.
7. **Fase RESPONSE**: o LLM pode receber contexto mínimo e produzir explicação e conjunto de sugestões estruturadas. Pode ser dispensada em consultas determinísticas simples para economizar tokens; isso deve ser informado no tipo de resposta.
8. Normalizar e validar o texto e **cada proposta**; rejeitar ações desconhecidas/campos extras/IDs inexistentes; validar referências a entidades.
9. Persistir mensagem do assistente, referências de dados e propostas `PENDING` ou `BLOCKED` com expiração. **Nenhum efeito de domínio nessa etapa**.
10. Retornar ao frontend resposta estruturada + IDs das propostas + evidências/links internos; UI mostra cartões com botões de aprovação/rejeição separados.
11. Quando o operador clica aprovar, ocorre **nova requisição HTTP independente** para o executor transacional.

**Ordem de confiança:** regras de negócio e banco > permissões do backend > instruções estáticas do produto > dados de consulta > texto do usuário > saída do LLM. Dados consultados e conteúdo de usuário devem ser tratados como dados, jamais como instruções privilegiadas.

---

## 8. Banco de dados relacional (modelo obrigatório)

### 8.1. Convenções

- PostgreSQL com migrations versionadas, sem alterações manuais em produção.
- PKs internas do tipo **UUID** (geradas no backend ou pelo PostgreSQL de modo criptograficamente adequado). Código público de pedido (`order_code`) amigável, exclusivo, como `PED-1052`.
- `created_at`, `updated_at` são `timestamptz`, UTC; `updated_at` controlado na transação de alteração.
- Todas as FK são explícitas. Campos de estado usam `CHECK` ou enum controlado, consistentes com os valores deste documento.
- Não aplicar `ON DELETE CASCADE` a dados auditáveis de incidentes. Restaurantes e usuários são desativados, não excluídos se possuem registros associados.
- Para textos da demo, nenhum dado pessoal real. CPF, telefone ou endereço completos são desnecessários.
- Padrão de paginação: `page` 1-based + `page_size`, limite máximo 50. Ordenação explícita (`created_at DESC, id DESC`) e indexes associados.
- Atualização concorrente via `version`, mesmo quando a chave primária já bloqueia o registro.

### 8.2. Entidades e campos mínimos

#### 8.2.1. `users`

| Campo | Tipo lógico | Regra |
|---|---|---|
| `id` | UUID PK | Imutável |
| `name` | varchar(120) | Obrigatório |
| `email` | varchar(254) | Obrigatório, normalizado lowercase, unique case-insensitive |
| `password_hash` | text | Obrigatório, algoritmo seguro conforme seção 15 |
| `role` | enum | `ADMIN` ou `OPERATOR` |
| `is_active` | boolean | default true |
| `is_demo_account` | boolean | default false |
| `created_at`, `updated_at` | timestamptz | Obrigatórios |

Nenhum endpoint retorna `password_hash` ou dados secretos.

#### 8.2.2. `auth_sessions`

`id` UUID PK; `user_id` FK; `jti_hash` string unique; token CSRF derivado por HMAC de `CSRF_SECRET` e identificador de sessão, sem armazenar token CSRF em texto claro; `created_at`, `expires_at`, `revoked_at`, `last_seen_at`; `user_agent_digest` opcional. JWT contém `sub`, `jti`, `iat`, `exp` e identificador de papel informativo, mas a autorização considera `role` atual do banco.

#### 8.2.3. `restaurants`

`id` UUID PK; `name` varchar(160) not null; `slug` varchar(160) unique; `is_active` boolean; `version` integer not null default 1; `created_at`, `updated_at`. Não guardar dados financeiros, integrações reais ou tokens de restaurante.

#### 8.2.4. `customers`

`id` UUID PK; `display_name` varchar(120) not null; `fictional_reference` varchar(40) unique; `created_at`. Somente nomes fictícios; nenhuma informação de contato real.

#### 8.2.5. `orders`

`id` UUID PK; `order_code` varchar(24) unique not null; `restaurant_id` FK not null; `customer_id` FK not null; `status` enum not null; `total_cents` integer >= 0; `placed_at` timestamptz; `estimated_delivery_at` timestamptz; `delivered_at` nullable timestamptz; `created_at`, `updated_at`. Valor monetário em centavos, sem float. Não é permitido atualizar via API funcional.

#### 8.2.6. `order_events`

`id` UUID PK; `order_id` FK not null; `event_type` enum de domínio (`CREATED`, `PREPARING`, `READY_FOR_PICKUP`, `IN_DELIVERY`, `DELIVERED`, `CANCELED`, `NOTE`); `description` varchar(500); `occurred_at` timestamptz. Inserido em seeds e consultável; não alterável pelo LLM.

#### 8.2.7. `incidents`

`id` UUID PK; `order_id` FK; `category` enum; `description` text com limite validado; `priority` enum; `status` enum; `assigned_to_user_id` FK nullable; `source` enum `MANUAL`/`AI_APPROVED`; `created_by_user_id` FK; `resolved_at` nullable; `version` integer not null default 1; `created_at`, `updated_at`. **Índice único parcial** `(order_id, category)` `WHERE status IN ('OPEN','IN_PROGRESS')`.

#### 8.2.8. `incident_notes`

`id` UUID PK; `incident_id` FK; `author_user_id` FK; `source` enum `MANUAL`/`AI_APPROVED`; `body` text; `created_at`. Sem edição nem remoção via interface.

#### 8.2.9. `reply_drafts`

`id` UUID PK; `incident_id` FK; `body` text; `status` enum `DRAFT`/`ARCHIVED`; `source` enum; `created_by_user_id`, `updated_by_user_id` FKs; `version` integer; `created_at`, `updated_at`. Nunca conter envio/contato externo.

#### 8.2.10. `ai_conversations`

`id` UUID PK; `user_id` FK; `auth_session_id` FK; `title` varchar(120); `created_at`, `updated_at`; `deleted_at` nullable. Acesso somente à mesma sessão vinculada (mesmo `jti` ainda ativo); novo login inicia sessão nova e não herda automaticamente o histórico de uma conta compartilhada.

#### 8.2.11. `ai_messages`

`id` UUID PK; `conversation_id` FK; `role` enum `USER`, `ASSISTANT`, `SYSTEM_EVENT`; `content` text limitado; `message_kind` enum `FACTUAL`, `LLM_GENERATED`, `ERROR`, `USER_INPUT`, `ACTION_RESULT`; `status` enum `PROCESSING`, `COMPLETED`, `FAILED`; `context_refs` jsonb validado (somente IDs e tipos de registros); `created_at`.

#### 8.2.12. `action_proposals`

`id` UUID PK; `conversation_id` FK; `ai_message_id` FK; `group_id` UUID; `type` allowlist enum; `target_type` enum `ORDER`/`INCIDENT`/`PROPOSAL_RESULT`; `target_id` UUID nullable; `depends_on_proposal_id` self FK nullable; `parameters` jsonb com contrato de tipo fechado e validado; `evidence_refs` jsonb somente IDs; `reason` varchar(600); `status` enum definido em RN-ACT-02; `observed_entity_version` integer nullable; `created_by_user_id` FK; `approved_by_user_id` FK nullable; `expires_at`, `created_at`, `updated_at` timestamps; `execution_result_id` nullable UUID. Guardar somente dados mínimos necessários.

#### 8.2.13. `action_executions`

`id` UUID PK; `proposal_id` FK unique; `idempotency_key` UUID; `actor_user_id` FK; `result_entity_type` enum; `result_entity_id` UUID nullable; `outcome` enum `SUCCESS`/`FAILURE`; `safe_error_code` varchar(80) nullable; `executed_at` timestamptz. Em operações com erro anterior à transação de execução, pode haver auditoria de tentativa sem registro de execução bem-sucedida.

#### 8.2.14. `audit_logs`

`id` UUID PK; `actor_user_id` FK nullable (sistema); `actor_kind` enum `USER`/`SYSTEM`; `request_id` UUID/string; `event_type` varchar(90) allowlist; `entity_type` varchar(50); `entity_id` UUID nullable; `source` enum `MANUAL`, `AI_APPROVED`, `SYSTEM`; `before_data` jsonb filtrado; `after_data` jsonb filtrado; `metadata` jsonb filtrado; `created_at`. Imutável via API e sem texto completo de conversas.

#### 8.2.15. `ai_usage`

`id` UUID PK; `user_id` FK; `auth_session_id` FK; `conversation_id` FK; `request_id` string; `provider` varchar(50); `model` varchar(100); `purpose` enum `INTENT`/`RESPONSE`; `outcome` enum `SUCCESS`, `ERROR`, `TIMEOUT`, `INVALID_OUTPUT`, `RATE_LIMITED`; `duration_ms` int; `input_tokens` int nullable; `output_tokens` int nullable; `estimated_cost_cents` int nullable (somente se tabela de preços configurada); `created_at`. Nunca guardar key, Authorization header ou prompt integral.

#### 8.2.16. `ai_quota_daily`

Chave única (`quota_scope`, `quota_subject`, `usage_date_utc`); `quota_scope` enum `GLOBAL`/`SESSION`/`USER`; `quota_subject` string normalizada; `used_turns` int; `reserved_turns` int; `updated_at`. Reservas transacionais evitam estouro sob concorrência. `usage_date_utc` usa dia UTC documentado.

#### 8.2.17. `idempotency_records`

`id` UUID PK; `user_id` FK; `operation_scope` varchar(80); `idempotency_key` UUID; `request_hash` string; `http_status` integer; `response_body` jsonb sanitizado; `created_at`, `expires_at`; índice único `(user_id, operation_scope, idempotency_key)`. Retenção de pelo menos 24h para replay seguro de confirmações.

#### 8.2.18. `demo_control`

Singleton ou registro identificado por ambiente: `seed_version`, `last_reset_at`, `next_reset_at`, `reset_in_progress` gerenciado em transação/lock, `updated_at`. Somente o processo de demo controla reset. Não aplicar reset automático em produção real se `DEMO_MODE=false`.

### 8.3. Índices obrigatórios

- `orders(order_code)` unique; `orders(restaurant_id, status, estimated_delivery_at)`; `orders(estimated_delivery_at)` para atraso; `orders(placed_at DESC, id DESC)`.
- `incidents(order_id, category)` unique parcial para estados ativos; `incidents(status, priority, created_at DESC)`; `incidents(assigned_to_user_id, status)`.
- `incident_notes(incident_id, created_at DESC)`; `reply_drafts(incident_id, updated_at DESC)`.
- `ai_conversations(auth_session_id, updated_at DESC)`; `ai_messages(conversation_id, created_at, id)`.
- `action_proposals(conversation_id, status, created_at DESC)`; `action_proposals(expires_at, status)`; `action_executions(proposal_id)` unique.
- `audit_logs(created_at DESC, id DESC)`; `audit_logs(entity_type, entity_id, created_at DESC)`.
- `ai_usage(created_at DESC, provider, outcome)`; `idempotency_records(user_id, operation_scope, idempotency_key)` unique.

### 8.4. Integridade e concorrência

- Migrations devem criar constraints de unicidade, `CHECK` para enums/valores e FK explícitas. `NOT NULL` por padrão salvo campos declarados opcionais.
- Em todo `PATCH` de ocorrência/rascunho, verificar `expected_version` e incrementar atomicamente; não aceitar atualizações cegas.
- Auditoria e alteração de domínio pertencem à **mesma transação**. Ações propostas dependentes resolvem IDs somente a partir do resultado persistido da proposta anterior.
- A `action_proposals` deve persistir snapshot de parâmetros aprovados, de modo que a IA não possa alterá-los após exibição. Propostas exibidas e executadas devem corresponder ao mesmo payload.
- Informações monetárias são inteiros em centavos e exibidas com `Intl.NumberFormat` pt-BR.

### 8.5. Seed inicial e reset

- Gerar **8 restaurantes**, **160 pedidos**, **aproximadamente 36 ocorrências**, **mínimo 50 eventos de pedido**, **notas**, **rascunhos de exemplo** e **duas contas** (`ADMIN` privada e `OPERATOR` de demonstração), todos com dados sintéticos e nomes claramente fictícios.
- Distribuir pedidos pelos estados, garantindo ao menos **12 pedidos atualmente atrasados**, 12 próximos ao ETA, 12 entregues e 8 cancelados; garantir exemplos de todas as categorias e prioridades.
- Horários são gerados **relativos à data/hora da execução do seed/reset**; não fixar todos os pedidos em novembro de 2026 e deixar a demo envelhecer.
- Determinismo: aceitar `SEED_RANDOM_SEED` para repetir distribuição relativa de dados. IDs podem ser regenerados a cada reset, portanto exemplos do README devem descobrir o código público atual por consulta e não depender de UUID fixo.
- Operações de seed e reset **idempotentes**. `seed:init` inicializa DB vazio; `demo:reset` recria somente entidades da demo em uma transação controlada e bloqueia aprovações concorrentes. Não rodar reset destrutivo automaticamente fora de `DEMO_MODE`.
- Senhas derivam de variáveis de ambiente seguras na criação de contas; nenhuma senha fica no Git, em SQL versionado ou no bundle frontend.

---

## 9. Convenções da API HTTP

### 9.1. Base, autenticação e formato

- Base REST: `/api/v1`. JSON UTF-8 em requests/responses, exceto liveness/readiness.
- Sessão via cookie HttpOnly; CSRF header obrigatório em mutações autenticadas; `Origin`/`Referer` e JSON Content-Type validados.
- API não aceita cliente anônimo para acesso a dados de pedidos/incidentes/IA.
- Retornos de sucesso usam envelope com `data` e `meta` quando aplicável; erros padronizados.
- Todos os requests recebem `X-Request-ID` de servidor; erros mostram esse ID para suporte, nunca stack trace no browser.
- Campos retornados em `snake_case` no contrato JSON e nomes equivalentes no DB. A UI converte apenas para apresentação.

### 9.2. Contrato de sucesso (exemplo ilustrativo; não é código-fonte)

```json
{
  "data": {
    "id": "<uuid>",
    "order_code": "PED-1052",
    "status": "IN_DELIVERY",
    "is_late": true,
    "delay_minutes": 35
  },
  "meta": { "request_id": "<uuid>", "server_time": "<ISO-8601-UTC>" }
}
```

### 9.3. Contrato de erro

```json
{
  "error": {
    "code": "STALE_VERSION",
    "message": "Este registro foi atualizado. Recarregue os dados e tente novamente.",
    "details": {},
    "request_id": "<uuid>"
  }
}
```

**Status e códigos obrigatórios:** `400 VALIDATION_ERROR`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 STALE_VERSION`, `409 DUPLICATE_ACTIVE_INCIDENT`, `409 IDEMPOTENCY_KEY_REUSED`, `409 ACTION_NOT_APPROVABLE`, `410 PROPOSAL_EXPIRED`, `422 INVALID_AI_OUTPUT`, `429 RATE_LIMITED`, `429 AI_QUOTA_EXCEEDED`, `502 AI_PROVIDER_ERROR`, `503 AI_UNAVAILABLE`, `504 AI_TIMEOUT`, `500 INTERNAL_ERROR`. Para recurso inacessível por ID, preferir `404` uniforme para não revelar existência.

### 9.4. Listagens

- Query padrão: `page=1&page_size=20`, `sort` apenas de allowlist documentada, `q` sanitizado, filtros documentados.
- `meta.pagination = {page, page_size, total_items, total_pages}` e `meta.request_id`.
- Não aceitar ordenação por nome de coluna arbitrário fornecido pelo usuário.
- Datas em ISO 8601 UTC no JSON; frontend exibe horário local.

---

## 10. Inventário contratual de endpoints REST

O implementador DEVE criar documentação OpenAPI ou tabela equivalente que detalhe esquemas de request/response de todos os endpoints abaixo e **manter o código em conformidade**.

### 10.1. Auth e saúde

| ID | Método e rota | Auth | Entrada essencial | Saída/efeito |
|---|---|---|---|---|
| API-001 | `POST /api/v1/auth/login` | Público c/ Origin e rate limit | `email`, `password` | Cookie sessão; `{user, csrf_token}` |
| API-002 | `GET /api/v1/auth/me` | Sessão | — | `{user, csrf_token, session_expires_at}` |
| API-003 | `POST /api/v1/auth/logout` | Sessão + CSRF | — | Revoga JTI no servidor e limpa cookie |
| API-004 | `GET /healthz` | Público | — | Liveness sem segredos |
| API-005 | `GET /readyz` | Público ou restrito pelo host | — | `ready/not_ready`; não divulga detalhes DB |

### 10.2. Dashboard, restaurantes, pedidos

| ID | Método e rota | Auth | Entrada | Saída/efeito |
|---|---|---|---|---|
| API-010 | `GET /api/v1/dashboard/summary` | OPERATOR+ | `restaurant_id?`, `from?`, `to?` | Totais por estado/atraso e prioridades |
| API-011 | `GET /api/v1/restaurants` | OPERATOR+ | `q?`, paginação | Lista de restaurantes |
| API-012 | `GET /api/v1/restaurants/:id` | OPERATOR+ | UUID | Detalhe |
| API-013 | `POST /api/v1/restaurants` | ADMIN | `name`, `slug` | Criar restaurante |
| API-014 | `PATCH /api/v1/restaurants/:id` | ADMIN | campos editáveis, `expected_version` obrigatório | Atualizar/desativar |
| API-015 | `GET /api/v1/orders` | OPERATOR+ | `order_code?`, `restaurant_id?`, `status?`, `is_late?`, paginação | Lista, ETA, atraso derivado |
| API-016 | `GET /api/v1/orders/:id` | OPERATOR+ | UUID | Pedido, eventos e resumo de incidentes |
| API-017 | `GET /api/v1/orders/:id/events` | OPERATOR+ | paginação | Histórico de pedido |

**Regra:** `restaurants.version` é obrigatório; toda alteração via API-014 exige `expected_version` e devolve `409 STALE_VERSION` quando houver concorrência.

### 10.3. Ocorrências e rascunhos

| ID | Método e rota | Auth | Entrada | Saída/efeito |
|---|---|---|---|---|
| API-020 | `GET /api/v1/incidents` | OPERATOR+ | `restaurant_id?`, `order_id?`, `status?`, `priority?`, `category?`, paginação | Lista filtrada |
| API-021 | `POST /api/v1/incidents` | OPERATOR+ | `order_id`, `category`, `priority`, `description` | Cria manualmente, audita |
| API-022 | `GET /api/v1/incidents/:id` | OPERATOR+ | UUID | Dados completos autorizados |
| API-023 | `PATCH /api/v1/incidents/:id` | OPERATOR+ | `status?`, `priority?`, `assigned_to_user_id?`, `reason?`, `expected_version` | Atualização validada e auditada |
| API-024 | `GET /api/v1/incidents/:id/timeline` | OPERATOR+ | paginação | Eventos, notas, ações executadas |
| API-025 | `POST /api/v1/incidents/:id/notes` | OPERATOR+ | `body` | Nota imutável e auditoria |
| API-026 | `GET /api/v1/incidents/:id/drafts` | OPERATOR+ | paginação | Lista de rascunhos |
| API-027 | `POST /api/v1/incidents/:id/drafts` | OPERATOR+ | `body` | Rascunho manual |
| API-028 | `PATCH /api/v1/drafts/:id` | OPERATOR+ | `body?`, `status?`, `expected_version` | Atualização de rascunho; nunca envia |

### 10.4. Conversas, propostas e IA

| ID | Método e rota | Auth | Entrada | Saída/efeito |
|---|---|---|---|---|
| API-030 | `POST /api/v1/assistant/conversations` | OPERATOR+ | `title?` | Cria conversa vinculada à sessão |
| API-031 | `GET /api/v1/assistant/conversations` | OPERATOR+ | paginação | Apenas conversas da sessão |
| API-032 | `GET /api/v1/assistant/conversations/:id` | OPERATOR+ | UUID | Conversa da sessão |
| API-033 | `GET /api/v1/assistant/conversations/:id/messages` | OPERATOR+ | paginação | Histórico da sessão |
| API-034 | `POST /api/v1/assistant/conversations/:id/messages` | OPERATOR+ | `content` (1–1200 chars) | Resposta do assistente + propostas; aplica quota |
| API-035 | `GET /api/v1/assistant/proposals/:id` | OPERATOR+ | UUID | Proposta da própria sessão |
| API-036 | `POST /api/v1/assistant/proposals/:id/approve` | OPERATOR+ | `Idempotency-Key` | Revalida, executa, audita, retorna resultado |
| API-037 | `POST /api/v1/assistant/proposals/:id/reject` | OPERATOR+ | `reason?`, CSRF | Rejeita sem executar |
| API-038 | `GET /api/v1/assistant/status` | OPERATOR+ | — | `enabled`, `available`, `provider_label`, quota restante (sem segredos) |

A API-034 retorna **sempre** `assistant_message`, `references` e `proposals` (lista possivelmente vazia) com `message_kind` e `provider_used` para diferenciar resposta determinística/LLM. O backend não devolve prompts internos ou detalhes secretos do provedor.

### 10.5. Administração

| ID | Método e rota | Auth | Entrada | Saída/efeito |
|---|---|---|---|---|
| API-040 | `GET /api/v1/admin/users` | ADMIN | paginação/filtro | Lista sanitizada de usuários |
| API-041 | `POST /api/v1/admin/users` | ADMIN | nome, email, papel, senha inicial | Cria operador/admin autorizado |
| API-042 | `PATCH /api/v1/admin/users/:id` | ADMIN | papel/ativo/nome | Alteração auditada, sessões revogadas se necessário |
| API-043 | `POST /api/v1/admin/users/:id/reset-password` | ADMIN | nova senha segura | Atualiza hash, revoga sessões antigas |
| API-044 | `GET /api/v1/admin/audit` | ADMIN | `entity_type?`, `entity_id?`, `actor_id?`, datas e paginação | Logs sem prompts brutos |
| API-045 | `GET /api/v1/admin/ai-usage` | ADMIN | janela temporal | Métricas por provedor/resultado, sem credenciais |
| API-046 | `POST /api/v1/admin/demo/reset` | ADMIN+reautenticação | `confirm_phrase`, `password` | Reseta somente dados da demo |

### 10.6. Regra para contratos de request/response

Para todos os endpoints, a documentação de implementação DEVE registrar: tipos de campos, obrigatoriedade, limites, enums, validações, erros possíveis, permissões, efeitos transacionais, exemplos de sucesso e erro e pelo menos um teste negativo. **Não** deixar contratos a cargo de comportamentos implícitos do frontend.

---
## 11. Contratos específicos de inteligência artificial (IA)

### 11.1. Princípios inegociáveis

1. **A IA nunca é fonte de verdade sobre pedidos, incidentes, permissões ou horários.** Dados verificáveis vêm do banco e relógio de servidor.
2. **A IA não executa operações:** somente propõe ações descritas no catálogo RN-ACT-07.
3. **O backend não executa texto gerado.** Só opera com DTOs validados, tipos fechados, IDs resolvidos e dados de domínio.
4. **Saída não confiável:** uma resposta do modelo é equivalente a input externo; jamais presumir validade de JSON ou obediência a instruções.
5. **Transparência:** marcar resposta `LLM_GENERATED` quando houver geração externa, `FACTUAL` quando apenas consulta determinística.
6. **Dados mínimos:** enviar apenas informações relevantes e fictícias; nunca enviar `password_hash`, tokens, segredos, dados de auditoria administrativa ou conversas de outras sessões.
7. **Sem conhecimento implícito:** o LLM não tem acesso a pedido/incidente até que o backend selecione e envie os campos permitidos.
8. **Sem acesso à internet pelo modelo via aplicação:** nenhuma ferramenta para URL externa, pesquisa, download ou endpoint arbitrário.

### 11.2. Abstração de provedores

O backend definirá uma interface lógica única `AIProvider` com operações de: gerar texto estruturado a partir de mensagens/instruções; reportar nome do provedor/modelo; retornar metadados de uso quando disponíveis; normalizar erros de timeout, quota, credenciais e resposta inválida; e checar se há configuração válida. Implementação em JavaScript usando `fetch` nativo.

O v1 deve oferecer **dois adaptadores de HTTP** selecionáveis **sem alterar serviços de domínio**:

| `AI_PROVIDER` | Adaptador obrigatório | Parâmetros | Observações |
|---|---|---|---|
| `openai_compatible` | API de chat compatível com formato OpenAI | URL HTTPS fixa por env, API key e nome de modelo | Chamada `POST /chat/completions` relativa à base configurada; verificar suporte efetivo a campos de structured output do modelo escolhido |
| `gemini_native` | API REST Gemini | URL oficial HTTPS, API key e nome de modelo | `generateContent` conforme documentação oficial; response format/JSON condicionado à capacidade do modelo, sempre com validação posterior |

**Obrigação:** ambos os adaptadores têm testes automatizados de normalização de saída/erro; pelo menos **um** deles deverá passar por chamada real de smoke test em deploy. O segundo deve ser implementado funcionalmente, não como stub, embora não exija credenciais simultâneas. Não criar integração externa extra fora dessas duas sem necessidade.

**Padrão:** provedor configurado somente via ambiente. Sem env válido, `AI_ENABLED=false` e IA aparece indisponível, sem simular respostas. A escolha efetiva de provedor/modelo para o deploy é de infraestrutura, não questão funcional pendente.

**Referências técnicas para adaptadores:**

- OpenAI Chat Completions: https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
- Gemini API REST: https://ai.google.dev/api

As versões e os nomes específicos de modelos devem ser validados com a documentação do provedor durante a implementação/deploy; **não** codificar um nome de modelo transitório no aplicativo.

### 11.3. Contrato normalizado de classificação de intenção

A fase de interpretação recebe apenas: mensagem atual, resumo limitado dos últimos turnos da mesma conversa, tipo de identidade/permissão (sem segredos) e catálogo de intenções permitidas.

O resultado esperado, **objeto lógico validado estritamente**, tem estes campos:

| Campo | Tipo | Regra |
|---|---|---|
| `intent` | enum | Um dos valores fechados abaixo |
| `order_code` | string/null | Somente código em formato reconhecido, sem consulta implícita |
| `incident_id` | UUID/null | Validar sintaxe e existência depois da classificação |
| `needs_clarification` | boolean | `true` quando faltam identificadores/contexto essencial |
| `clarifying_question` | string/null | 1–250 chars; obrigatória se ambíguo |
| `requested_actions` | array de enum | Máximo 3 ações permitidas, sem parâmetros executáveis livres |
| `rationale_brief` | string/null | Máximo 300 chars, somente para diagnóstico e sem revelar instruções internas |

Intenções autorizadas: `GET_ORDER`, `LIST_LATE_ORDERS`, `LIST_INCIDENTS`, `ANALYZE_ORDER`, `CREATE_INCIDENT`, `SET_INCIDENT_PRIORITY`, `SET_INCIDENT_STATUS`, `ADD_INCIDENT_NOTE`, `CREATE_REPLY_DRAFT`, `UNKNOWN`.

- Mensagem sem identificador obrigatório retorna `needs_clarification=true` em vez de inferir pedido por nome de cliente.
- O backend pode reaproveitar **somente último pedido/incidente explicitamente selecionado naquela sessão e conversa**, se não houver ambiguidade e o contexto ainda existir. Antes de propor, exibir ID/identificador para revisão.
- Intenção desconhecida produz resposta explicando funcionalidades suportadas, sem propor ações.
- Mesmo quando JSON do provedor é inválido, **não** tentar recuperar autorização a partir de texto livre. Retornar erro amigável e orientar reformulação.

### 11.4. Ferramentas internas de consulta permitidas

| Ferramenta lógica | Parâmetros aceitos | Dados retornados ao orquestrador |
|---|---|---|
| `get_order_by_code` | `order_code` | Pedido, status, ETA, atraso calculado, resumo de ocorrências |
| `list_late_orders` | `restaurant_id?`, `limit<=10` | Lista e total de pedidos atrasados, ordenação por maior atraso |
| `list_incidents` | `status?`, `priority?`, `restaurant_id?`, `limit<=10` | Dados essenciais e total encontrados |
| `get_incident` | `incident_id` | Estado/prioridade/versão/notas resumidas/ID pedido |
| `get_order_incidents` | `order_id` | Incidentes vinculados, versão e situação |

- Essas ferramentas **não são ferramentas executadas pelo modelo**: o backend as seleciona por enum previamente validado. O LLM não recebe credenciais, drivers SQL ou acesso a URLs.
- Aplicar permissões e formato fixo antes de executar; lista sempre filtra por organização única da demo.
- Contexto inclui `observed_at` (UTC), IDs e fontes; conteúdo de notas fornecido ao LLM é estritamente tratado como **dados não confiáveis** e truncado.
- Se mais de 10 resultados, indicar `total_count`, `returned_count` e filtros; não fingir ter analisado todos os registros se só recebeu amostra.

### 11.5. Contrato da resposta final gerada pelo LLM

```json
{
  "answer": "O pedido PED-1052 está em atraso e possui uma ocorrência aberta.",
  "evidence_refs": [
    { "entity_type": "ORDER", "entity_id": "<uuid>" },
    { "entity_type": "INCIDENT", "entity_id": "<uuid>" }
  ],
  "proposed_actions": [
    {
      "type": "SET_INCIDENT_PRIORITY",
      "target_ref": { "entity_type": "INCIDENT", "entity_id": "<uuid>" },
      "parameters": { "priority": "HIGH" },
      "reason": "O atraso registrado justifica atenção prioritária."
    }
  ],
  "requires_clarification": false,
  "clarifying_question": null
}
```

Este exemplo é **contrato de dados**, não implementação. Na resposta efetiva, o backend:

1. Limita `answer` a 1800 caracteres e elimina conteúdo de script/HTML executável.
2. Revalida cada `entity_id` por acesso ao banco; referências não encontradas são removidas e produzem aviso de verificação.
3. **Injeta** `expected_version` e IDs resolvidos a partir do banco, nunca confia em versões declaradas pelo modelo.
4. Rejeita `type` fora da allowlist, campos extras, parâmetros desconhecidos, texto além do limite ou dependências inválidas.
5. Cria objetos `action_proposals` próprios do servidor, com IDs/expiração/status; o modelo **não escolhe** esses campos.
6. Marca como hipótese todo diagnóstico que não seja consequência determinística dos dados; nunca inventa contato, status ou causa.
7. Para resposta a cliente, impede promessa de reembolso/cancelamento já realizado e qualquer afirmação de ação não executada.

### 11.6. Procedimento de múltiplas propostas

Exemplo: `"O pedido PED-1052 atrasou, abra ocorrência, acrescente nota de contato e prepare resposta ao cliente."`

1. LLM identifica pedido e intenção composta; backend busca pedido e checa incidentes ativos.
2. Se **não** houver incidente ativo de atraso, propõe `CREATE_INCIDENT` com prioridade e descrição.
3. Propõe `ADD_INCIDENT_NOTE` com dependência da criação, status `BLOCKED`.
4. Propõe `CREATE_REPLY_DRAFT` com a mesma dependência, status `BLOCKED`.
5. Operador aprova a criação. Backend cria incidente e retorna seu UUID; propostas 2 e 3 são liberadas como `PENDING` **sem executar**.
6. Operador pode aprovar só a nota, aprovar só o rascunho ou rejeitar qualquer uma. Nenhuma aprovação implícita.
7. Timeline e auditoria exibem cada execução, usuário aprovador e estado final.

Se já houver incidente ativo da categoria, o backend não deverá propor nova criação duplicada; em vez disso, poderá propor `ADD_INCIDENT_NOTE` e/ou `CREATE_REPLY_DRAFT` para o incidente existente. O operador pode optar por abrir manualmente outra categoria quando apropriado.

### 11.7. Falhas, limites e fallback

| Condição | Comportamento obrigatório |
|---|---|
| API key inexistente | Assistente desativado, UI informa configuração indisponível; gestão manual funcional |
| Provider 401/403 | `AI_UNAVAILABLE` ou `AI_PROVIDER_ERROR` seguro; nunca vazar credenciais |
| Provider 429 | UI informa limite temporário; **não** simular resposta |
| Provider timeout | Abortar chamada; marcar turno com erro recuperável; sem propostas parciais executáveis |
| JSON inválido | Reparar no máximo 1 vez, validar outra vez; caso falhe, informar erro e não persistir propostas |
| Referência inexistente | Solicitar correção/identificador válido, nunca inventar dados |
| Ação fora da allowlist | Rejeitar, registrar motivo técnico sanitizado e nunca exibir como aprovável |
| Prompt injection | Ignorar instruções contidas em dados/contexto que tentem alterar poderes ou catálogo |
| Quota diária esgotada | `429 AI_QUOTA_EXCEEDED` com `retry_after` e mensagem amigável |
| Dependência rejeitada | Cancelar dependentes, sem ações executadas |
| Modelo sugere dado não encontrado | Resposta deve sinalizar falta de evidência e evitar afirmar existência |

**Tentativas:** sem retry em erro 400, 401 ou 403 de provedor. Em erro 429/5xx, permitir até uma tentativa automática apenas se houver orçamento, `Retry-After` adequado e tempo restante no timeout total; nunca repetir operações de domínio, porque chamadas LLM não executam ações. Debitar quota do turno de forma transacional e registrar tentativas.

### 11.8. Controle de consumo e orçamento

- Reservar cota de turno antes de chamar o LLM; liberar reserva em falha **antes de envio**, marcar consumo de tentativa real quando houve chamada. Evitar contabilizar o mesmo turno duas vezes em retry.
- Limites de saída por modelo configuráveis; limitar input por caracteres/histórico/contexto.
- Persistir tokens quando API fornecer; estimativa monetária somente se tabela de preços estiver **explicitamente configurada**, senão exibir `custo desconhecido` e não inventar valores.
- Admin poderá observar quantidade de chamadas, tempo médio, taxa de erro, tokens conhecidos e cotas restantes, sem visualizar prompts secretos ou API key.
- API de IA e indicador de dashboard de negócio não devem compartilhar o mesmo orçamento de chamada: métricas de negócio nunca geram consumo de LLM.

### 11.9. Casos de avaliação comportamental da integração (não treinamento)

Criar fixtures **de teste**, não dataset para treinar modelos, com pelo menos estes 12 cenários:

1. Consulta direta de pedido existente.
2. Pedido inexistente.
3. Consulta de atraso com ETA e status válidos.
4. Pedido entregue com ETA no passado (não atrasado agora).
5. Criar ocorrência de atraso com confirmação.
6. Tentativa de duplicar ocorrência ativa.
7. Alterar prioridade válida com versão correta.
8. Alterar prioridade após mudança concorrente (conflito).
9. Sequência criar incidente + nota + rascunho; aprovações separadas.
10. Rejeição de proposta pai cancela dependências.
11. Solicitação ambígua sem ID suficiente pede esclarecimento.
12. Pedido malicioso para ignorar permissões, executar SQL ou enviar mensagem real é recusado.

Critérios quantitativos **para execução dos testes de software**, não alegações sobre desempenho do modelo: 100% dos casos de segurança/allowlist e não execução automática devem passar com provider mock; 100% das mutations devem possuir teste de autorização e validação. Um relatório separado poderá registrar sucessos/falhas observados com provedor real, sem alegar acurácia geral a partir de amostra pequena.

---

## 12. Jornadas de usuário e critérios de aceitação (CA)

### Jornada J1 — Entrar e visualizar operações

1. Visitante abre a URL HTTPS.
2. Acessa login de demonstração como `OPERATOR`.
3. Vê dashboard com números provenientes de PostgreSQL.
4. Filtra por restaurante; indicador e lista se atualizam.
5. Acessa pedido existente e seu histórico.

**CA-J1**: sem login, toda API de dados é 401; com login, filtros retornam valores corretos e exibição de atraso coincide com RN-ATR-01; cartão clicado abre o pedido certo.

### Jornada J2 — Criar manualmente uma ocorrência

1. Operador abre pedido.
2. Clica `Nova ocorrência`, escolhe categoria/prioridade e escreve descrição.
3. Backend valida, persiste e audita.
4. A ocorrência aparece na listagem, detalhe e dashboard.
5. Tentativa de duplicar categoria ativa retorna 409 com mensagem compreensível.

**CA-J2**: conta de incidente e timeline atualizam; tentativa inválida não grava parte do registro; campo de prioridade é enum.

### Jornada J3 — Consulta de pedido com IA

1. Operador abre chat e escreve `Mostre o pedido PED-1052`.
2. Backend interpreta, resolve código e consulta dados.
3. Resposta informa dados reais, situação de atraso e referência interna clicável.
4. Se pedido não existe, resposta comunica ausência sem fabricar dados.

**CA-J3**: comparações determinísticas dos dados retornados batem com API de pedidos; o modelo não pode criar pedidos inexistentes.

### Jornada J4 — Ação de IA, aprovação e auditoria

1. Operador: `Abra uma ocorrência de atraso para PED-1052`.
2. IA interpreta e propõe, sem modificar DB.
3. UI mostra categoria, prioridade, justificativa e botão de confirmação.
4. Operador aprova; backend valida e executa.
5. Ocorrência e auditoria aparecem. Reenvio da mesma confirmação não duplica efeito.

**CA-J4**: antes de aprovar, nenhum incidente novo; após aprovar, exatamente um; auditoria liga usuário, proposta e entidade.

### Jornada J5 — Múltiplas propostas independentes

1. Operador pede criar ocorrência, adicionar nota e elaborar resposta.
2. Três cartões aparecem; dependentes aguardam criação.
3. Operador aprova somente a criação; dois cartões passam a pendentes.
4. Operador rejeita a nota e aprova o rascunho.
5. Rascunho fica editável na ocorrência; nenhuma mensagem é enviada.

**CA-J5**: estados individuais corretos, nenhum efeito da nota rejeitada e nenhuma execução em cascata automática.

### Jornada J6 — Concorrência, expiração e permissão

1. Duas abas exibem mesma ocorrência `version=3`.
2. Aba A muda prioridade para alta, versão passa para 4.
3. Aba B tenta alteração com `expected_version=3`.
4. API responde 409, preserva atualização A e solicita recarga.
5. Proposta expirada ou de outra sessão não pode ser aprovada.

**CA-J6**: não há lost update, execução indevida, vazamento de conversa ou duplicação.

### Jornada J7 — IA indisponível

1. Desabilitar IA ou simular timeout do provedor em ambiente de teste.
2. UI exibe indisponibilidade real e instrução para tentar mais tarde.
3. Dashboard, pedidos e CRUD manual continuam utilizáveis.

**CA-J7**: nenhuma resposta fake aparece como IA real; nenhum turno falho deixa propostas aprováveis.

### Jornada J8 — Administração restrita

1. Operador tenta acessar `/admin` e chamar API administrativa diretamente.
2. UI redireciona e API responde 403/404 autorizado conforme política.
3. Admin privado consegue gerenciar usuários, consultar auditoria e resetar demo com confirmação reforçada.

**CA-J8**: acesso administrativo é negado no servidor para operador, inclusive se conhecer a URL.

---

## 13. Especificação de interface e navegação

### 13.1. Rotas React

| Rota | Nome da tela | Papel |
|---|---|---|
| `/login` | Acesso | Público |
| `/dashboard` | Visão geral | OPERATOR+ |
| `/orders` | Pedidos | OPERATOR+ |
| `/orders/:id` | Detalhes do pedido | OPERATOR+ |
| `/incidents` | Ocorrências | OPERATOR+ |
| `/incidents/:id` | Detalhe da ocorrência | OPERATOR+ |
| `/assistant` | Chat e propostas de ação | OPERATOR+ |
| `/admin/users` | Usuários | ADMIN |
| `/admin/restaurants` | Gestão de restaurantes | ADMIN |
| `/admin/audit` | Auditoria | ADMIN |
| `/admin/ai-usage` | Métricas de IA | ADMIN |
| `/admin/demo` | Reset controlado | ADMIN |
| `*` | Não encontrada | Todos |

### 13.2. Layout global

- Sidebar com `Dashboard`, `Pedidos`, `Ocorrências`, `Assistente`; seção `Administração` somente para ADMIN.
- Header com nome da central, usuário conectado, sinalizador de ambiente demo, status da IA e botão de logout.
- Mobile: sidebar vira drawer; telas com tabelas devem ter layout adaptado, scroll local ou cartões sem ocultar ações essenciais.
- Feedbacks: snackbars não são substitutos para estado persistente na tela. Operações aprovadas mostram ID da execução, link ao recurso e atualização visível.
- Componentes compartilhados: `StatusBadge`, `PriorityBadge`, `OrderSummary`, `IncidentTimeline`, `AIAssistantMessage`, `ActionProposalCard`, `ConfirmActionDialog`, `ErrorState`, `EmptyState`, `PaginationControls`.

### 13.3. Telas e elementos mínimos

**Login:** nome do produto, aviso de demo sintética, campos de e-mail/senha, possibilidade de acesso de operador demo se credenciais disponibilizadas, erro não enumerativo.

**Dashboard:** quatro indicadores, filtros, lista curta de atrasos, lista de ocorrências de alta prioridade, atualização e clique para detalhes.

**Pedidos:** pesquisa por código, filtros, tabela paginada, ETA/atraso calculado, indicador por status. Detalhe inclui restaurante/cliente fictício, valor, eventos e incidentes.

**Ocorrências:** filtros, abertura manual, controle de estado/prioridade/atribuição, histórico em timeline, notas, lista de rascunhos. A reabertura exige justificativa.

**Assistente:** histórico da sessão, caixa de texto, exemplos de comandos, estado processando/erro/cota; mensagens com referências clicáveis; cada proposta com tipo, alvo, antes/depois, justificativa, prazo/status, `Aprovar` e `Rejeitar` individuais; propostas dependentes bloqueadas com explicação.

**Administração:** CRUD restrito, métricas de uso, auditoria filtrada e reset de demo com aviso de perda dos dados operacionais.

### 13.4. Estados e UX obrigatórios

| Estado | Comportamento |
|---|---|
| Carregando | Skeleton ou indicador; botões perigosos desabilitados |
| Sem resultados | Mensagem clara e opção de remover filtros |
| Erro HTTP recuperável | Retry explícito; não limpar formulário sem confirmação |
| 401 | Login preservando rota pretendida se apropriado |
| 403 | Mensagem de acesso negado, sem mostrar dados |
| 409 | Exibir conflito e recarregar entidade |
| 410 proposta | Cartão expirado, botão desabilitado e possibilidade de solicitar nova análise |
| IA indisponível | Aviso, sem bloquear UI operacional |
| Aprovação em andamento | Evitar duplo clique e mostrar status final do servidor |
| Ação executada | Atualizar queries afetadas e exibir auditoria/identificador |

### 13.5. Guia visual

- Estilo profissional, limpo, com acentuação discreta de cor; não reproduzir logotipos, ativos ou identidade visual proprietária do iFood.
- Não criar identidade que sugira ser produto oficial do iFood; informar explicitamente `Projeto independente de portfólio, com dados fictícios` no rodapé ou seção Sobre.
- Usar Material UI, sistema de espaçamento consistente, contraste, foco e design responsivo.
- Sem depender de imagens externas para compreender funcionalidades; interface operacional orientada a dados.

---

## 14. Estratégia de validação de entrada e regras de segurança por camada

1. **Browser:** validação imediata de formulário para UX, sem confiança de segurança.
2. **HTTP controllers:** tipos, tamanho, enum, ID UUID, estrutura JSON fechada e rejeição de campos não permitidos.
3. **Services:** autorização, integridade de domínio, duplicidade, transições e `expected_version`.
4. **DB:** PK/FK/unique/check, transações e locks; defender contra corrida não evitada pela aplicação.
5. **LLM boundary:** prompt/contexto mínimo, output schema estrito, allowlist de ações e consulta separada.
6. **Executor:** aprovação explícita, revalidação no momento da operação, idempotência e auditoria.

O projeto pode implementar schemas manuais em JavaScript com funções puras para permanecer no seu stack, desde que consistentes e testados. Bibliotecas adicionais de validação **não são obrigatórias**.

---

## 15. Segurança e privacidade (SEG)

### 15.1. Autenticação, sessões e CSRF

- **SEG-01:** Hash de senha usando `argon2id` ou `bcrypt` com custo atual adequado, sal e verificação segura; biblioteca mínima de hash é permitida como dependência de segurança.
- **SEG-02:** JWT curto (máximo 8h) assinado por chave forte via `JWT_SECRET`, jamais fornecida ao browser; claims `sub`, `jti`, `iat`, `exp`. Cada `jti` deve corresponder a registro de sessão ativo no banco. Logout, desativação e reset de senha revogam a sessão no servidor.
- **SEG-03:** Em produção, cookie com prefixo `__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax` ou `Strict` onde compatível, `Path=/`, sem `Domain`. Em `localhost` de desenvolvimento, usar configuração específica, sem relaxar produção.
- **SEG-04:** CSRF protection por token derivado do segredo do servidor e da sessão e entregue por `/auth/me`/`login` à SPA autenticada; `X-CSRF-Token` obrigatório em todas as alterações (`POST`, `PATCH`, `PUT`, `DELETE`), além de validação estrita de `Origin` e `Content-Type`. `SameSite` não substitui CSRF.
- **SEG-05:** Rate limit de login por IP e conta; mensagens de login não podem revelar se e-mail existe. Bloqueio progressivo temporário após repetidas falhas, sem permitir denial-of-service permanente por username.
- **SEG-06:** Nenhuma credencial persistida em `localStorage`, `sessionStorage` ou bundle React. CSRF token pode permanecer apenas em memória do cliente.
- **SEG-07:** Sessão deve expirar no servidor; papel/ativo atuais são consultados no banco; alterar privilégios revoga sessões anteriores. Administrador deve fazer nova confirmação de senha para reset de dados.
- **SEG-08:** Primeira instalação nunca publica senha admin padrão. Seeds exigem env de credencial ou geração segura comunicada somente no terminal do administrador (nunca retornada à UI pública).

### 15.2. Autorização e integridade

- **SEG-09:** Cada endpoint exige papel e, para conversas/propostas, verificação de ownership por sessão autenticada. Conhecer um UUID não concede acesso.
- **SEG-10:** Whitelist de campos em cada mutation; nada de mass assignment do corpo HTTP diretamente para SQL.
- **SEG-11:** Queries SQL parametrizadas; ordenação, filtros e nomes de coluna a partir de enums internos, nunca texto livre.
- **SEG-12:** Respostas não expõem hash, credenciais, cabeçalhos Authorization, dados de usuários não necessários ou conteúdo bruto do modelo.
- **SEG-13:** ID de proposta e payload de execução são obtidos do banco. O browser **não** envia uma ação arbitrária para executar.
- **SEG-14:** Tratamento transacional de ações e idempotência; logs de auditoria imutáveis por API.
- **SEG-15:** Erros do servidor não revelam SQL, stack traces, env, URLs secretas, prompts internos, estrutura de filesystem ou chaves.

### 15.3. Segurança específica de IA

- **SEG-16:** Prompt injection: tratar mensagens, notas, nomes de restaurante e dados de domínio como conteúdo não confiável; sistema não eleva a autoridade desses textos; somente catálogos fixos de ferramentas/ações no backend.
- **SEG-17:** Saída insegura: validar JSON/schema, tamanho, enums, referências e versionamento; renderizar todo texto como texto seguro, sem HTML/Markdown inseguro.
- **SEG-18:** Excessive agency: proibir autonomia de mutação, SQL, HTTP externo e ações não catalogadas; todos os efeitos passam por aprovação humana e executor.
- **SEG-19:** Disclosure: não enviar segredos ou dados pessoais reais ao provedor; logs de provider com metadata, nunca request completo com headers.
- **SEG-20:** Custo/abuso: rate limits e quotas persistentes; limites de input/output; cancelamento por timeout; deny de prompts abusivos ou massivos sem afetar operação manual.
- **SEG-21:** SSRF: `AI_BASE_URL` é configuração de servidor controlada por deploy, **nunca** fornecida pelo usuário, admin UI ou LLM. Exigir HTTPS e host do provedor em allowlist de configuração; não aceitar redirecionamentos para redes internas.
- **SEG-22:** Chave do provedor apenas no backend; nunca incluir em código versionado, resposta HTTP, URL de frontend ou logs.
- **SEG-23:** As operações de IA não incluem envio de comunicações, execução de comandos, cancelamentos, reembolsos ou alteração de contas.

### 15.4. Segurança da demo pública

- Todo conteúdo persistido é fictício; bloquear mensagens excessivas e limitar tamanho de histórico.
- Mostrar aviso para não inserir informações pessoais; não prometer isolamento completo da conta compartilhada.
- Cotas globais e por sessão; site pode impor interrupção do assistente quando o orçamento terminar.
- Resets controlados e automatizados somente com `DEMO_MODE=true`; nunca rodar `TRUNCATE` destrutivo inadvertidamente em banco não demo.
- Recomendado limitar cota diária de IA, restrição de acesso por sessão e CAPTCHA apenas se abuso real exigir (não obrigatório no MVP).
- Proteger o ambiente administrativo e secrets por HTTPS, identidade privada e revogação de sessão.

### 15.5. Headers e infraestrutura

- Forçar HTTPS em produção. Utilizar proteção para proxy reverso apenas quando `TRUST_PROXY` corresponder à plataforma real.
- Cabeçalhos apropriados de segurança (CSP compatível com frontend, HSTS sob HTTPS, `X-Content-Type-Options: nosniff`, proteção de framing, `Referrer-Policy`).
- Cookies e endpoints não dependem de CORS aberto; implantar UI e API na mesma origem.
- Configurar limites de request body, timeouts HTTP, status de prontidão e manejo de erros não capturados.
- Backup/recuperação de PostgreSQL devem seguir capacidade do serviço escolhido; no ambiente demo, seeds reproduzíveis são fallback, não substituem backup de dados reais (que não existem no escopo).

### 15.6. Referências de segurança

Usar como referência de critérios (não copiar códigos inteiros sem revisão):

- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP API Security Top 10: https://owasp.org/API-Security/
- OWASP Top 10 for LLM Applications: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- OWASP CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html

---

## 16. Observabilidade, métricas e auditoria

### 16.1. Logs estruturados

Registrar por request: `request_id`, timestamp UTC, rota lógica, método, status, duração, tipo de erro seguro, papel do ator (não nome/email obrigatoriamente) e ID de sessão truncado/hasheado quando necessário. Não registrar payload bruto do chat, senha, JWT, cookie, headers auth ou chave do provedor.

### 16.2. Métricas operacionais

- Contagem de pedidos por estado e por restaurante.
- Pedidos atrasados no instante da consulta, minutos de atraso.
- Ocorrências abertas/em andamento/resolvidas, por prioridade/categoria.
- Tempo entre abertura e resolução de ocorrências, quando houver eventos suficientes.
- Quantidade de propostas geradas, aprovadas, rejeitadas, expiradas e executadas.
- Taxa de falha da API de IA, duração por etapa, tokens consumidos quando informados.
- Número de execuções idempotentes/replays bloqueados e conflitos de versão (para diagnóstico interno).

**Definição de exatidão:** métricas numéricas derivam do PostgreSQL, nunca estimativa do LLM. Informar período e timezone. Não apresentar como impacto real em clientes ou produção.

### 16.3. Auditoria mínima por operação

| Evento | Momento obrigatório |
|---|---|
| `AUTH_LOGIN_SUCCESS`, `AUTH_LOGOUT` | Sessões (metadata não sensível) |
| `USER_CREATED`, `USER_UPDATED`, `PASSWORD_RESET` | ADMIN modifica usuários |
| `RESTAURANT_CREATED`, `RESTAURANT_UPDATED` | ADMIN modifica restaurante |
| `INCIDENT_CREATED`, `INCIDENT_UPDATED`, `NOTE_ADDED` | Alterações de domínio |
| `DRAFT_CREATED`, `DRAFT_UPDATED` | Rascunho criado/alterado |
| `AI_PROPOSAL_CREATED`, `AI_PROPOSAL_REJECTED`, `AI_PROPOSAL_APPROVED` | Ciclo de IA sem conteúdo secreto |
| `AI_ACTION_EXECUTED`, `AI_ACTION_FAILED` | Efeitos aprovados/erros |
| `DEMO_RESET` | Reset com ator, momento e versão do seed |

A timeline de incidente pode combinar audit logs filtrados, notas e propostas executadas, mas não mostrar credenciais ou logs técnicos brutos.

### 16.4. Privacidade da observabilidade

Texto integral da conversa pode ser persistido em `ai_messages` somente para experiência do usuário atual e eliminado conforme retenção/reset. Auditoria registra identificadores e fatos de execução, não cópia integral de prompts/respostas. Admin vê metadados operacionais por padrão, não conversa de visitantes.

---

## 17. Variáveis de ambiente e configuração

A implementação deverá publicar `.env.example` com **nomes e comentários**, sem segredos. Valores abaixo são valores lógicos/ilustrativos, não tokens reais.

| Variável | Obrigatória | Uso e regra |
|---|---|---|
| `NODE_ENV` | Sim | `development`, `test`, `production` |
| `PORT` | Sim | Porta HTTP do Express, fornecida pelo host se necessário |
| `APP_BASE_URL` | Prod | URL pública HTTPS canônica para validação de origem |
| `DATABASE_URL` | Sim | Connection string PostgreSQL de secret; exigir SSL quando plataforma externa requer |
| `JWT_SECRET` | Sim | Chave de assinatura forte; nunca publicar |
| `CSRF_SECRET` | Sim | Chave para HMAC de token CSRF; nunca publicar |
| `DEMO_MODE` | Sim | `true` somente no ambiente de demonstração |
| `DEMO_ADMIN_EMAIL` | Bootstrap | E-mail privado de admin |
| `DEMO_ADMIN_PASSWORD` | Bootstrap | Senha robusta para seed de admin, não pública |
| `DEMO_OPERATOR_EMAIL` | Bootstrap | Conta pública de operador fictício |
| `DEMO_OPERATOR_PASSWORD` | Bootstrap | Senha inicial da demo, sem reutilização em outros sistemas |
| `DEMO_RESET_HOURS` | Não | Padrão `24`; reset lazy e protegido |
| `SEED_RANDOM_SEED` | Não | Padrão fixo para seeds reproduzíveis |
| `LATE_GRACE_MINUTES` | Não | Padrão `5` |
| `AI_ENABLED` | Sim | `true` só com credenciais reais |
| `AI_PROVIDER` | Se IA ativa | `openai_compatible` ou `gemini_native` |
| `AI_MODEL` | Se IA ativa | Nome de modelo disponível escolhido em deploy |
| `AI_API_KEY` | Se IA ativa | Secret apenas no backend |
| `AI_BASE_URL` | Se IA ativa | Endpoint HTTPS de provedor autorizado |
| `AI_TIMEOUT_MS` | Não | Padrão `20000`, validado em intervalo seguro |
| `AI_TURN_TIMEOUT_MS` | Não | Padrão `45000` |
| `AI_MAX_OUTPUT_TOKENS` | Não | Limite compatível com provedor/modelo escolhido |
| `AI_DAILY_GLOBAL_LIMIT` | Não | Padrão `30` turnos/dia |
| `AI_DAILY_SESSION_LIMIT` | Não | Padrão `10` turnos/dia |
| `AI_DAILY_USER_LIMIT` | Não | Padrão `25` turnos/dia; no usuário demo compartilhado, complemento da cota global |
| `AI_SESSION_PER_MINUTE_LIMIT` | Não | Padrão `3` turnos/minuto |
| `SESSION_MAX_HOURS` | Não | Padrão `8` |
| `LOG_LEVEL` | Não | `info` prod, `debug` dev sem dados sensíveis |
| `TRUST_PROXY` | Prod conforme host | Configuração estrita do proxy real |

**Validação de startup:** se `NODE_ENV=production` e faltar `DATABASE_URL`, `JWT_SECRET` ou `CSRF_SECRET`, falhar startup com mensagem segura. Se `AI_ENABLED=true` e faltarem provider/model/key/url, falhar startup com erro de configuração (não anunciar IA em funcionamento). Se `DEMO_MODE=true` sem seed seguro, não expor demo ao público.

**Nota sobre segurança:** a senha pública da conta fictícia de operador pode ser divulgada no site **somente** porque esta é uma demo com dados sintéticos e cotas de abuso; nunca reutilizá-la para funções administrativas ou acesso a serviços reais.

---

## 18. Hospedagem, publicação e operação online

### 18.1. Topologia de baixo custo

- **Um serviço Node.js** executa API Express e serve assets produzidos pelo build Vite/React, na mesma origem HTTPS.
- **Um PostgreSQL gerenciado** com armazenamento persistente e conexão TLS.
- **Um provedor LLM externo** configurado por variável segura, com custo/cota monitorado.
- Nenhuma necessidade obrigatória de Redis, Docker, Kubernetes, balanceador dedicado, serviço de cron, fila ou armazenamento de arquivos.
- O produto deve ser publicável em plataformas com Node e PostgreSQL; **a escolha de fornecedor e preço exato será feita na implantação**, porque ofertas e planos mudam.

### 18.2. Passos de deploy requeridos

1. Criar instância PostgreSQL persistente, com credenciais de menor privilégio compatíveis com migrações e operação.
2. Configurar secrets/variáveis e HTTPS do serviço.
3. Executar migrations (com relatório de sucesso e versão atual).
4. Criar seed de demo (somente se DB vazio ou reset explicitamente solicitado).
5. Executar build de frontend e start do backend que serve SPA/API.
6. Validar `/healthz`, `/readyz`, login operador, dashboard, pedido atrasado, CRUD manual e logout.
7. Configurar API de IA com provedor/credencial reais e executar **smoke test com custo controlado**; comprovar consulta e proposta sem autoexecução.
8. Testar aprovação/recusa de ação, limite de quota, expiração, CSRF, papel e logs.
9. Documentar URL pública, roteiro de demonstração, versão do build e limitações operacionais do host.

### 18.3. Restrições do host

- Alguns planos gratuitos suspendem instâncias por ociosidade ou limitam conexões/horas. A interface deverá tolerar primeira requisição lenta e mostrar estado de carregamento; não prometer disponibilidade ininterrupta.
- Configurar pool de conexões PostgreSQL pequeno para serviço único; desligar graciosamente em `SIGTERM` e liberar pool.
- Não rodar migrations perigosas automaticamente a cada requisição. Deploy executa migrations em fase controlada antes de liberar tráfego.
- Reset lazy da demo pode acontecer ao primeiro request após o prazo, em transação com lock; evitar resets no meio de aprovação com validação de geração de seed e `409 DEMO_RESET_OCCURRED` quando necessário.
- Sem provider real configurado, a URL pode exibir aplicação manual, **mas isso não satisfaz o aceite da integração real de IA**.

### 18.4. Comunicação sobre natureza do portfólio

Na página inicial/rodapé e README, declarar: `Projeto independente de portfólio com dados inteiramente fictícios. Não afiliado ao iFood.` Nunca usar marca ou logotipo oficial como se fosse parceiro do produto.

---

## 19. Estratégia de testes automatizados

### 19.1. Stack de testes

| Camada | Ferramenta | Alvo |
|---|---|---|
| Serviços e validações backend | Jest | Regras de atraso, estados, schemas, aprovação, quotas |
| REST/API | Jest + Supertest | Autenticação, DTOs, RBAC, erros, CSRF, idempotência |
| Banco | Banco PostgreSQL de teste isolado | Constraints, transações, migrações, conflitos, seeds |
| Componentes frontend | Vitest + React Testing Library | Formulários, estados, propostas, acessibilidade básica |
| End-to-end | Playwright | Login, navegação, CRUD, IA mock/real controlada |
| Provider adapters | Jest + respostas HTTP mockadas | Normalize, timeout, formato inválido, falhas provider |

### 19.2. Banco de teste

- **Nunca** rodar teste destrutivo contra `DATABASE_URL` de produção. Usar `TEST_DATABASE_URL` distinta e validar prefixo/configuração de `NODE_ENV=test`.
- Cada suíte deve começar em estado controlado (transação de rollback ou seed isolado), com relógio determinístico injetável para testes de atraso e expiração.
- Testar migrations em banco vazio e repetir seed para demonstrar idempotência.

### 19.3. Matriz de testes por criticidade

| ID | Categoria | Cenário | Resultado obrigatório |
|---|---|---|---|
| AT-01 | Auth | Requisição sem cookie a pedidos | 401 |
| AT-02 | Auth | Operador acessa `/admin/users` | 403/404 sem dados |
| AT-03 | Auth | Logout, depois usar token antigo | 401 (JTI revogado) |
| AT-04 | CSRF | POST sem `X-CSRF-Token` | 403, sem mutação |
| AT-05 | Input | Order code/UUID inválidos | 400, sem SQL dinâmico |
| AT-06 | Domínio | ETA passado, pedido ativo após tolerância | `is_late=true` |
| AT-07 | Domínio | Pedido entregue com ETA passado | `is_late=false` |
| AT-08 | Domínio | Ocorrência ativa duplicada | 409, nenhum duplicado |
| AT-09 | Domínio | Reabrir resolved sem justificativa | 400/422, não altera |
| AT-10 | Concorrência | Atualizar mesma versão em duas requisições | Uma 2xx, outra 409 |
| AT-11 | IA | Provider retorna ação desconhecida | Rejeitada sem proposta persistida |
| AT-12 | IA | Provider devolve JSON quebrado | Erro seguro; zero ação |
| AT-13 | IA | Modelo referencia pedido inexistente | Clarificação/not found, zero ação |
| AT-14 | IA | Prompt injection solicitando SQL/cancelamento | Nenhuma ferramenta/ação não autorizada |
| AT-15 | Proposta | Apenas gerar proposta | Banco de incidentes inalterado |
| AT-16 | Proposta | Rejeitar proposta | Nenhuma mudança de domínio |
| AT-17 | Proposta | Aprovar válida | Exatamente uma alteração, auditoria |
| AT-18 | Proposta | Repetir aprovação mesma idempotency key | Mesmo resultado; não duplica |
| AT-19 | Proposta | Duas aprovações concorrentes | Exatamente uma execução persistente |
| AT-20 | Proposta | Aprovar de sessão diversa | 404/403; sem alteração |
| AT-21 | Proposta | Aprovar expirada | 410; sem alteração |
| AT-22 | Dependência | Rejeitar pai | Dependentes `CANCELED` |
| AT-23 | Dependência | Aprovar pai | Dependentes liberadas, mas não executadas |
| AT-24 | Rascunho | Criar draft por IA e não enviar | Draft local; nenhum HTTP de envio |
| AT-25 | Quota | Limite diário esgotado | 429; CRUD manual funciona |
| AT-26 | Provider | Timeout | 504/503 apropriado; nada executado |
| AT-27 | Demo | Reset com sessão concorrente | Sem meia base; propostas antigas invalidadas |
| AT-28 | UI | Desabilitar IA | Indicador indisponível e fluxo manual preservado |
| AT-29 | UI | Paginação/filtro | Valores e links consistentes |
| AT-30 | Auditoria | Alteração manual e por IA | Autor, origem, valores anteriores/novos corretos |
| AT-31 | RBAC | Admin troca papel de operador | Sessões antigas revogadas e permissão reavaliada |
| AT-32 | Segurança | Payload com HTML/script | Texto exibido sem execução |
| AT-33 | Respostas | Falha sem segredo | Erro não contém stack/API key/query SQL |
| AT-34 | Deployment | `/api` inexistente | 404 JSON, sem fallback para index.html |

### 19.4. Testes E2E mínimos em browser real

1. Login da demo, dashboard, lista e detalhe de pedido.
2. Criação manual e atualização de ocorrência, incluindo timeline.
3. Chat com provider **mock em ambiente de teste** para gerar proposta e aprovar.
4. Sequência composta com rejeição de uma ação dependente e aprovação de outra.
5. Logout e negação de rota protegida.
6. Operador tentando acessar funcionalidade ADMIN.
7. Troca de janela/aba ou fluxo concorrente ocasionando conflito (pode ser integração backend em vez de UI completa).

Além desses testes determinísticos, executar ao menos uma **validação manual real** de IA em ambiente publicado, anotando provedor, data, prompt, resultado observado e suas limitações, sem divulgar token secreto.

### 19.5. Métricas de qualidade / gates

- `lint`: zero erros reportados.
- `build`: frontend e backend iniciam sem warnings críticos de segurança.
- `unit/integration`: 100% dos testes obrigatórios verdes; nenhuma suite ignorada silenciosamente.
- Coverage alvo inicial: **>=80% em linhas** de serviços críticos (`action executor`, RBAC, validação, incidents, AI output normalization); relatório deve indicar o número real e não falsificar coverage.
- `E2E`: jornadas obrigatórias passando no ambiente de teste isolado.
- `security`: nenhum segredo commitado; rotas críticas negadas quando indevidas; vulnerabilidades conhecidas relevantes analisadas antes de publicar.
- **Semântica de pronto:** funcionalidade implementada sem teste de aceitação não pode ser marcada concluída.

---

## 20. Plano de implementação por etapas (gates de qualidade)

### Fase F0 — Preparação e alinhamento do repositório

**Entrega:** monorepo JS, scripts npm, lint, README inicial, `.env.example`, ADRs e estrutura básica da especificação.

**Aceite:** `npm install`, lint e scripts básicos funcionam; nenhum segredo no repositório.

### Fase F1 — Banco, migrations, seeds e sessão

**Entrega:** PostgreSQL, migrations, dados sintéticos, login/logout, cookie seguro, CSRF, sessão revogável e papéis.

**Aceite:** admin/operator existem, login e RBAC testados, reset/seed idempotentes, dados acessíveis via API autenticada.

### Fase F2 — Domínio e API REST manual

**Entrega:** restaurantes, pedidos, regras de atraso, incidentes, notas, rascunhos, dashboard, timeline e auditoria.

**Aceite:** operações manuais ponta a ponta, índices/constraints, concorrência e erros testados.

### Fase F3 — Frontend funcional sem IA

**Entrega:** login, dashboard, lista/detalhe de pedidos, ocorrências, filtros, formulários, mensagens e páginas admin.

**Aceite:** jornadas manuais reais E2E, interface responsiva, sem mocks de backend em produção.

### Fase F4 — Adaptação de provedores e conversa

**Entrega:** adaptadores `openai_compatible` e `gemini_native`; orquestração sem actions; chat, sessão de conversa, validação de intenções, consultas por allowlist.

**Aceite:** provider mocks testados, chamada real documentada para um provedor configurado, nenhuma mutação no banco por enviar mensagem.

### Fase F5 — Propostas, aprovação e execução

**Entrega:** ações estruturadas, dependências, expiração, confirmação/rejeição individual, executor transacional, auditoria, idempotência e UI de cartões.

**Aceite:** jornadas J4/J5/J6 e testes AT-11 a AT-24 passam, inclusive concorrência e proposição sem execução.

### Fase F6 — Segurança, quotas e observabilidade

**Entrega:** quotas persistentes, rate limit, logs, erros, sanitização, gestão de falhas, status da IA e política de reset.

**Aceite:** AT-25 a AT-34, testes de abuso, modo IA indisponível, nenhum dado sensível em logs.

### Fase F7 — Publicação, aceitação e portfólio

**Entrega:** URL HTTPS; build servindo SPA/API; DB externo; migrations/seed em deploy; testes online; README e vídeo/roteiro de demonstração; relatório final.

**Aceite:** avaliação humana pela URL em login operador, caso real de IA, proposta aprovada, histórico visível, não envio real; documentação reproduzível.

### Fase F8 — Opcional, não bloqueante

Somente depois de todas as fases obrigatórias: melhorias visuais, gráficos adicionais, exportação CSV, testes de acessibilidade ampliados, conteúdo de onboarding. Não introduzir features novas enquanto gates das fases anteriores falharem.

---

## 21. Definição formal de pronto (Definition of Done)

A aplicação é considerada **CONCLUÍDA** somente quando todos os critérios `DOD-*` forem verdadeiros e comprovados.

| ID | Critério verificável | Evidência |
|---|---|---|
| DOD-01 | URL HTTPS abre sem erro de rota/build | URL e screenshot/relato de teste manual |
| DOD-02 | Conta OPERATOR pública entra; ADMIN privado existe e não é divulgado | Teste E2E + verificação de configuração |
| DOD-03 | Login, sessão, logout, RBAC e CSRF funcionando | AT-01 a AT-04, AT-31 |
| DOD-04 | Todos os módulos e páginas listados em RF/UI existem e usam API real | Navegação E2E sem endpoints fake |
| DOD-05 | Seed inclui vários restaurantes, pedidos, atrasos, incidentes e histórias | Query/teste de seed com contagens |
| DOD-06 | Regra de atraso é correta e determinística | AT-06, AT-07 com relógio controlado |
| DOD-07 | Ação manual de ocorrência persiste e audita | Jornada J2, request/response e DB |
| DOD-08 | Provedor real de IA efetivamente responde no deploy | Smoke test documentado (sem segredo) |
| DOD-09 | Interpretação do pedido consulta dados autorizados, sem inventar | J3 e casos de teste |
| DOD-10 | Geração de proposta não altera domínio | AT-15 |
| DOD-11 | Cada aprovação/rejeição é individual, registrada e revogável enquanto pendente | J4/J5 e AT-16 a AT-23 |
| DOD-12 | Ações executadas são idempotentes e transacionais | AT-18, AT-19 |
| DOD-13 | Rascunho editável existe sem envio real | AT-24 |
| DOD-14 | Falha de IA preserva produto manual | J7 e AT-26/AT-28 |
| DOD-15 | Quotas evitam uso ilimitado da IA na demo | AT-25 e métricas admin |
| DOD-16 | Dados sensíveis protegidos, permissões testadas, sem segredos em Git/logs | Revisão e testes de segurança |
| DOD-17 | Documentação inclui instalação, migrations, seed, provedor, deploy, testes, limitações e demo | Revisão do README e docs |
| DOD-18 | Testes automatizados exigidos passam no ambiente adequado | Relatório de comandos com exit code |
| DOD-19 | Não existem botões inertes, endpoints mock em produção ou fluxos incompletos descritos como finalizados | Checklist manual página a página |
| DOD-20 | Projeto declara independência do iFood e natureza sintética dos dados | Rodapé + README |

**Critérios de reprovação imediata:** endpoint aprova ação sem confirmação; IA executa SQL; acesso operador a gestão admin; token/provedor exposto; dados reais de clientes; resposta simulada apresentada como IA real; testes de autorização ignorados; demo online inacessível descrita como publicada.

---

## 22. Guia de implementação para um LLM executor

### 22.1. Papel e prioridades

O LLM executor deve atuar como engenheiro de software full stack responsável por implementação **integral, testável e publicável** do DeliveryAssist AI. Deve respeitar os requisitos desta especificação, sem redefinir escopo por conveniência.

**Ordem de prioridades obrigatória:** (1) segurança/autorização; (2) regras de domínio; (3) integridade de banco/transações; (4) contratos de API; (5) integração de IA validada; (6) frontend fiel aos contratos; (7) testes; (8) publicação/documentação. Não sacrificar requisitos críticos para produzir interface bonita.

### 22.2. Sequência de trabalho obrigatória

1. **Ler o documento inteiro** e produzir mapa de requisitos e fases. Se houver conflito entre seções, preferir as decisões normativas e regras de segurança; registrar a resolução em `docs/ARCHITECTURE.md`.
2. Criar estrutura de diretórios e scripts, mantendo todos os módulos em JavaScript ES6+.
3. Construir banco/migrations/seeds e provar integridade antes do CRUD.
4. Implementar backend e testes com contratos estáveis antes de integrar interface.
5. Implementar frontend ligado à API real, sem deixar dados fixos após fase de protótipo.
6. Implementar adaptadores, orquestração de IA e validação, primeiro com mocks de teste, depois com provedor real configurado.
7. Implementar ciclo de propostas e executor transacional, incluindo idempotência, dependências e trilha de auditoria.
8. Executar testes de regressão após cada fase e corrigir erros antes de avançar.
9. Preparar deploy de produção, verificar autenticação, HTTPS, conexões de DB e quota; realizar smoke test da IA real.
10. Produzir relatório final com URL, comandos executados, evidências, limitações e requisitos não concluídos (se houver).

### 22.3. Comportamentos proibidos do LLM executor

- Não afirmar que `npm test` passou sem executá-lo.
- Não trocar PostgreSQL por arrays em memória ou `localStorage` como fonte de verdade.
- Não usar respostas estáticas no assistente publicado para esconder ausência de provider.
- Não implementar `approve` como simples atualização de estado sem execução de domínio e auditoria.
- Não substituir checagem de permissão no backend por esconder botão no React.
- Não confiar no JSON gerado pelo modelo para decidir operações não previstas.
- Não escrever testes que apenas verificam se mocks foram chamados sem validar comportamentos essenciais.
- Não omitir tratamento de erros por considerar que a demo usa dados fictícios.
- Não adicionar complexidade não solicitada (microserviços, agentes externos, fila, RAG, embeddings, Docker obrigatório).
- Não desabilitar CSRF/headers seguros em produção para simplificar o frontend.
- Não declarar deploy como concluído sem URL verificada e teste de jornada.

### 22.4. Formato recomendado de entrega por fase

A cada fase, informar:

1. **Escopo concluído:** IDs RF/RN/SEG/AT/DOD implementados.
2. **Arquivos criados ou alterados:** árvore resumida.
3. **Migrações:** versão aplicada e dados afetados.
4. **Testes executados:** comandos, contagem, resultados, falhas corrigidas.
5. **Demonstração:** endpoint/rota, usuário, entrada e resultado esperado.
6. **Pendências:** risco, impacto e próximo passo, se houver.

Apenas na última fase, declarar `PROJETO COMPLETO` se todos os DODs e gates foram cumpridos.

### 22.5. Contrato para decisão técnica inesperada

Se uma dependência mínima de segurança for necessária (`pg`, `bcrypt`/`argon2`, JWT signer, middleware de headers), ela pode ser adotada com justificativa e teste. Não impor aprendizado de novos frameworks de ML ao usuário. Se um provedor não oferecer o formato esperado, ajustar o adaptador mantendo o contrato interno. Mudanças de regra funcional exigem registro explícito de desvio em documentação; não inventar substituição silenciosa.

### 22.6. Versionamento e rastreabilidade

- Commits por fase/módulo com referências aos IDs de requisitos.
- Scripts npm propostos: `dev`, `build`, `start`, `lint`, `test`, `test:integration`, `test:e2e`, `db:migrate`, `db:seed`, `demo:reset`, `check`.
- O script `check` deve executar pelo menos lint, testes unitários e build; E2E separado quando infraestrutura específica estiver indisponível.
- Build final não depende de segredos no frontend; secrets vivem apenas na configuração de backend.
- `docs/TEST-REPORT.md` deve rastrear requisitos críticos a testes com comandos executados, não resultados presumidos.

---

## 23. Matriz de rastreabilidade resumida

| Módulo | Requisitos | API | Casos de aceite/teste | Fase |
|---|---|---|---|---|
| Auth/usuários | RF-AUTH-01..06; SEG-01..08 | API-001..003, 040..043 | J1/J8; AT-01..04, AT-31 | F1/F3 |
| Restaurantes/pedidos | RF-REST-01..02, RF-ORD-01..04; RN-ATR | API-011..017 | J1/J3; AT-05..07 | F1/F2/F3 |
| Dashboard | RF-DASH-01..02 | API-010 | J1 | F2/F3 |
| Ocorrências | RF-INC-01..06 | API-020..025 | J2/J6; AT-08..10 | F2/F3 |
| Rascunhos | RF-DRAFT-01..02 | API-026..028 | J5; AT-24 | F2/F3/F5 |
| IA consultiva | RF-AI-01..04, 10..13 | API-030..034, 038 | J3/J7; AT-11..14, 26, 28 | F4/F6 |
| Ações de IA | RF-AI-05..09; RN-ACT | API-035..037 | J4/J5/J6; AT-15..23 | F5 |
| Auditoria | RF-ADM-02; SEG-14 | API-044 | J2/J4/J8; AT-30 | F2/F5/F6 |
| Demo/quota | RF-ADM-03..05; RNF-14 | API-038, 045, 046 | J7/J8; AT-25/27 | F6/F7 |
| Infra | RNF-12..17; SEG-21..23 | Health/readiness | J1/J7; AT-29, 33, 34 | F7 |

O implementador deve expandir esta matriz para o total de requisitos e atualizar quando criar testes; nenhuma mutação crítica deve permanecer sem referência de teste.

---

## 24. Principais riscos e decisões mitigadoras

| Risco | Impacto | Mitigação exigida |
|---|---|---|
| API externa de IA cobra por uso ou muda plano | Custo/indisponibilidade | Quotas, provider selecionável, medição de uso, falha segura |
| Modelos retornam JSON incorreto | Erros e propostas inválidas | Contratos fechados, validação, até 1 reparo, sem execução implícita |
| Modelo alucina pedido ou causa de atraso | Erro operacional | Consulta real ao banco, referências, separação fato/hipótese |
| Prompt injection em conteúdo de atendimento | Ação indevida | Dados não são instruções; allowlist e aprovação humana |
| Visitantes abusam de demo compartilhada | Custos e dados alterados | Contas demo sintéticas, reset, limites por sessão/global, aviso público |
| Aprovação duplicada por clique/retry | Incidente duplicado | Chave idempotente + unique + transação + lock |
| Proposta fica obsoleta após atualização | Inconsistência | Expiração e controle de versão revalidado ao aprovar |
| Host gratuito entra em suspensão | Demo momentaneamente lenta | Mensagem de carregamento, healthcheck e documentação honesta |
| Frontend/Backend divergem no contrato | Erro sistêmico | API documentada, testes Supertest + E2E + convenções rígidas |
| DB de produção é apagado por seed/reset | Perda de dados | `DEMO_MODE`, checks de ambiente, reset protegido, backup quando aplicável |
| Escopo cresce sem controle | Projeto não termina | Fases obrigatórias, catálogo fechado de ações, backlog opcional somente após DOD |
| Modelo tenta prometer compensação não executada | Risco de falsa comunicação | Política de resposta e proibição de operações financeiras |

---

## 25. Manual da demonstração para o portfólio

### 25.1. Cenário de 3–5 minutos

1. **Contexto (20s):** explicar que a central fictícia acompanha oito restaurantes e utiliza LLM externo por API, sem treinar modelo próprio.
2. **Operação real (40s):** mostrar dashboard e pedido com atraso calculado por regra determinística.
3. **Assistente (60s):** perguntar sobre o pedido e mostrar referência aos dados; em seguida solicitar abertura de ocorrência e rascunho.
4. **Aprovação humana (60s):** mostrar que o banco ainda não mudou; aprovar a proposta individualmente; demonstrar a ocorrência criada, o rascunho e o histórico.
5. **Qualidade (40s):** explicar que JSON de LLM é validado, que permissões/concorrência são checadas e que testes cobrem casos negativos.
6. **Falha segura (20s):** mostrar que, quando a IA está indisponível ou a cota é consumida, o operador ainda consegue gerenciar ocorrências manualmente.

### 25.2. README do GitHub

O README final deve conter, nesta ordem:

1. Problema que o produto resolve e público-alvo.
2. Screenshot ou GIF real do produto e URL da demo.
3. Aviso de projeto independente e dados fictícios.
4. Funcionalidades principais e arquitetura em alto nível.
5. Tecnologias efetivamente utilizadas.
6. Detalhes do ciclo IA -> proposta -> aprovação -> transação -> auditoria.
7. Instruções de instalação, configuração de env, migrations, seed e desenvolvimento.
8. Como configurar provedor/modelo e limites de IA.
9. Como executar testes e interpretar resultados.
10. Limitações conhecidas, decisões de segurança e itens fora do escopo.
11. Roteiro reproduzível da demonstração.

### 25.3. Como descrever no currículo (após implementação real)

> **DeliveryAssist AI — plataforma full stack de operações de delivery com IA generativa.** Desenvolvimento de aplicação em React, Node.js/Express e PostgreSQL para consulta de pedidos e gerenciamento de ocorrências, com integração configurável a LLM externo por API. Implementação de interpretação de solicitações, propostas de ações estruturadas, aprovação humana, execução transacional, auditoria, tratamento de erros e testes automatizados.

**Não incluir** na descrição tecnologias ou resultados ainda não efetivamente implementados. Métricas como tempo de resposta, cobertura e custo só devem ser citadas se medidas e documentadas.

---

## 26. Checklist final de aceite para quem recebe a implementação

### Funcionalidades

- [ ] Login/logout/sessão/revogação e perfis ADMIN/OPERATOR.
- [ ] Dashboard com métricas reais do banco, múltiplos restaurantes.
- [ ] Busca, filtros, paginação e detalhe de pedidos com atraso correto.
- [ ] Incidentes manuais com categorias, prioridade, status, responsável e notas.
- [ ] Timeline, auditoria e rascunhos editáveis sem envio real.
- [ ] Chat por sessão com interpretação de linguagem natural e dados reais.
- [ ] Adaptadores reais `openai_compatible` e `gemini_native` com testes e configuração por env.
- [ ] Integração real validada com ao menos um provedor no deploy.
- [ ] Propostas com validação, aprovação e rejeição individual.
- [ ] Dependências de propostas, expiração, idempotência e concorrência.

### Segurança e qualidade

- [ ] Sem API key, JWT, senha ou hash exposto no frontend/README/log.
- [ ] Sem execução de SQL ou operação arbitrária por modelo.
- [ ] Roles, CSRF, limits, inputs e ownership checados no servidor.
- [ ] Falhas de IA mantêm fluxo manual funcional.
- [ ] Cotas de uso e reset de demo são efetivos.
- [ ] Testes AT-01 a AT-34 executados e resultados documentados.
- [ ] Migrations e seeds executáveis e idempotentes.

### Entrega

- [ ] URL HTTPS funcionando e demo verificável.
- [ ] README/documentação técnica e rota da demo.
- [ ] Relatório de evidências de DOD-01 a DOD-20.
- [ ] Zero simulações de IA apresentadas como chamadas reais.
- [ ] Nenhum botão crítico inerte nem placeholder no fluxo aprovado.

---

## 27. Registro de decisões (ADR resumido)

- **ADR-001 — Monólito modular:** escolhido para baixo custo e menor complexidade de deploy; não impede modularidade interna.
- **ADR-002 — Uma origem pública:** React build e Express/API sob mesmo domínio para segurança de sessão e simplicidade.
- **ADR-003 — Banco PostgreSQL:** integridade transacional, joins, indexes e experiência com SQL alinhada à competência do desenvolvedor.
- **ADR-004 — Sem ORM/TypeScript obrigatórios:** respeita stack conhecida; SQL parametrizado e DTOs explícitos compensam parte da segurança de tipos.
- **ADR-005 — Provedor selecionável por env:** evita dependência de um único fornecedor; suporta dois adaptadores REST.
- **ADR-006 — LLM sem autoridade sobre operações:** saída é dado externo; backend resolve consultas, valida e requer aprovação.
- **ADR-007 — Aprovação individual:** preserva rastreabilidade e autonomia humana mesmo com várias propostas.
- **ADR-008 — Atraso determinístico:** não pagar por LLM para cálculo verificável; evitar alucinação.
- **ADR-009 — Demo sintética com reset:** viabiliza apresentação pública sem PII real e sem custos de integração comercial.
- **ADR-010 — Rascunho sem envio:** demonstra geração assistida sem criar obrigação de canal externo nem risco de mensagens reais.
- **ADR-011 — Teste com provider mock + smoke real:** previsibilidade para CI e evidência honesta de integração real.
- **ADR-012 — Sem produto de logística completo:** foco no ciclo de incidentes, engenharia de IA e operações de software.

---

## 28. Fontes oficiais e padrões consultáveis

- Página do programa GenAI do iFood: https://carreiras.ifood.com.br/gen-ai/
- Descrição da trilha AI Engineer: https://job-boards.greenhouse.io/ifoodcarreiras/jobs/8901054002
- Segurança de sessões OWASP: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- Prevenção de CSRF OWASP: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP API Security Top 10: https://api-security.owasp.org/editions/2023/en/0x11-t10/
- OWASP LLM Top 10: https://genai.owasp.org/llm-top-10/
- OpenAI API (HTTP): https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
- Gemini API (HTTP): https://ai.google.dev/api
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- React: https://react.dev/
- Express: https://expressjs.com/
- Vitest: https://vitest.dev/
- Jest: https://jestjs.io/
- Playwright: https://playwright.dev/

**Nota:** fontes externas embasam padrões e contratos públicos; não definem os requisitos internos do projeto. A existência de uma vaga ou oferta de hospedagem não garante permanência de seus termos.

---

## 29. Ambiguidades eliminadas e limites finais

Todas as decisões **funcionais** necessárias para iniciar a implementação estão encerradas por este documento. Não exigir novas perguntas sobre: público, dados de pedidos, provedor em abstrato, ações autorizadas, RBAC, modo de entrega, canal de apresentação, contas demo, ações múltiplas, rascunhos, atrasos ou custo.

As únicas informações externas a fornecer na fase de implantação são: **credenciais e endpoints reais do PostgreSQL, provedor/modelo/key de IA válidos, host/domínio HTTPS e valores secretos de autenticação/seed**. Essas configurações **não** autorizam mudanças de escopo ou implementação de funcionalidades adicionais.

**Declaração final de escopo:** DeliveryAssist AI é uma central demonstrativa multi-restaurantes, com dados fictícios e gerenciamento real de ocorrências, cuja inteligência artificial interpreta solicitações e propõe operações tipadas que somente o backend executa mediante aprovação explícita, autorização, validação, concorrência, idempotência e auditoria. A aplicação é construída integralmente na stack full stack JS e publicada online, sem treinamento de modelos ou infraestrutura avançada de ML.

---


## 30. Anexo contratual — DTOs, exemplos e transições de API

Este anexo complementa a seção 10 com exemplos **de dados**, não com código executável. Os campos e estados aqui descritos são vinculantes para implementar e testar os endpoints centrais.

### 30.1. Resposta de conversa após consulta e sugestão (API-034)

**Request:** corpo JSON com `content: string`; `conversation_id` vem da URL e a sessão do cookie. O backend não aceita `user_id`, `role`, `proposal_status`, `sql` nem `action_to_execute` do cliente.

**Resposta lógica ilustrativa:**

```json
{
  "data": {
    "assistant_message": {
      "id": "<uuid>",
      "conversation_id": "<uuid>",
      "message_kind": "LLM_GENERATED",
      "content": "O pedido PED-1052 está atrasado. Posso abrir uma ocorrência para acompanhamento.",
      "provider_used": "openai_compatible",
      "created_at": "<ISO-8601-UTC>"
    },
    "references": [
      {
        "type": "ORDER",
        "id": "<uuid>",
        "label": "Pedido PED-1052",
        "href": "/orders/<uuid>"
      }
    ],
    "proposals": [
      {
        "id": "<uuid>",
        "type": "CREATE_INCIDENT",
        "status": "PENDING",
        "target": { "type": "ORDER", "id": "<uuid>", "label": "PED-1052" },
        "display_parameters": {
          "category": "DELIVERY_DELAY",
          "priority": "HIGH",
          "description": "Pedido em atraso e aguardando análise operacional."
        },
        "reason": "O prazo de entrega previsto já passou.",
        "expires_at": "<ISO-8601-UTC>",
        "requires_human_approval": true
      }
    ]
  },
  "meta": { "request_id": "<uuid>", "server_time": "<ISO-8601-UTC>" }
}
```

- `display_parameters` é **somente apresentação**; o servidor persiste contrato próprio completo de ação. Alterações visuais do browser não modificam a proposta aprovada.
- `references` deve apontar somente para IDs resolvidos por consultas de domínio autorizadas, nunca URLs arbitrárias fornecidas pelo LLM.
- Se a resposta for consulta puramente determinística, `message_kind=FACTUAL`, `provider_used=null` e `proposals=[]`.

### 30.2. Aprovação (API-036)

**Requisição:** `POST /api/v1/assistant/proposals/<uuid>/approve`, body `{}`; headers `Idempotency-Key: <uuid>` e `X-CSRF-Token: <token-seguro>`. O usuário não envia os parâmetros da operação. Resposta `200` (se efeito idempotente repetido ou execução concluída) com:

```json
{
  "data": {
    "proposal_id": "<uuid>",
    "proposal_status": "EXECUTED",
    "execution_id": "<uuid>",
    "result": {
      "entity_type": "INCIDENT",
      "entity_id": "<uuid>",
      "link": "/incidents/<uuid>"
    },
    "dependents_released": ["<uuid>"]
  },
  "meta": { "request_id": "<uuid>", "replayed": false }
}
```

- Em retry de mesma chave + mesmo request, responder mesmo payload/efeito com `meta.replayed=true` sem repetir o INSERT/UPDATE.
- Proposta que pertence a outra sessão: `404 NOT_FOUND` sem revelar conteúdo.
- Proposta já rejeitada: `409 ACTION_NOT_APPROVABLE`.
- Proposta expirada: `410 PROPOSAL_EXPIRED`.
- Registro mudou desde a sugestão: `409 STALE_VERSION`; orientar nova análise, não reexecutar com uma versão nova presumida.
- Falha transacional: nenhuma mudança parcial de incidente/nota/draft; registrar erro seguro e invalidar proposta conforme política de estados.

### 30.3. Rejeição (API-037)

**Requisição:** `POST /api/v1/assistant/proposals/<uuid>/reject`, body opcional `{ "reason": "Não é necessário abrir ocorrência agora." }`; cabeçalho CSRF. Resposta com `proposal_status=REJECTED` e `canceled_dependent_proposal_ids`; nenhuma entidade de domínio sofre alteração.

### 30.4. Alteração manual de ocorrência (API-023)

Requisição de exemplo ilustrativo: `{ "status": "IN_PROGRESS", "priority": "HIGH", "expected_version": 2 }`. O backend:

1. Verifica autenticação, perfil e ocorrência.
2. Confirma versão esperada e transição permitida.
3. Atualiza `version` para 3 numa transação.
4. Registra auditoria com valores anteriores/novos filtrados.
5. Retorna DTO atualizado e IDs de evento de auditoria apropriados.

Campos ausentes significam `sem alteração`, mas nunca aceitam atualização para `null` em estados/prioridades. Não permitir alterar `order_id`, `created_by_user_id`, `source` ou timestamps via PATCH.

### 30.5. Máquina de estados de proposta — resumo

| Origem | Evento | Destino permitido | Efeito de domínio |
|---|---|---|---|
| `BLOCKED` | dependência executada | `PENDING` | Nenhum |
| `BLOCKED` | dependência falha/rejeitada/expira | `CANCELED` | Nenhum |
| `PENDING` | operador rejeita | `REJECTED` | Nenhum |
| `PENDING` | prazo vence | `EXPIRED` | Nenhum |
| `PENDING` | operador aprova e backend valida | `APPROVED`/`EXECUTING` | Transação inicia |
| `EXECUTING` | transação commit | `EXECUTED` | Exatamente uma operação |
| `EXECUTING` | transação aborta | `FAILED` | Nenhum efeito parcial |
| Final (`EXECUTED`, `FAILED`, `REJECTED`, `EXPIRED`, `CANCELED`) | novas aprovações | Sem mudança | Nenhum; erro ou replay idempotente |

**Regra de consistência:** os estados intermediários `APPROVED` e `EXECUTING` podem existir apenas como eventos internos/registro transacional; após crash, um reconciliador no próximo startup deve resolver estado pendente sob lock e **nunca** executar efeito duas vezes. Simplificação permitida e preferida: manter mudança de `PENDING` para `EXECUTED` e operação de domínio na mesma transação SQL atômica, registrando estados intermediários somente na auditoria, preservando o contrato de estado final.

### 30.6. Consulta de atrasos — sem uso de LLM na regra

- Endpoints de listagem e dashboard usam exatamente RN-ATR-01, independente de comunicação externa.
- Se pedido foi entregue, o status ativo é finalizado e não aparece em `is_late=true`.
- Campo `delay_minutes` é calculado no servidor. O frontend não recalcula como autoridade, apenas apresenta o valor.
- Para intervalos de data no dashboard, filtros incidem sobre `placed_at` ou `created_at` conforme métrica documentada; `atrasados agora` é sempre calculado no **instante atual**, mesmo quando um filtro histórico esteja selecionado (mostrar legenda diferenciando métricas históricas de estado atual).

### 30.7. Finalização do contrato

Uma implementação do DeliveryAssist AI só corresponde a esta especificação se preservar os campos relevantes, os estados, a autoridade do backend, a confirmação humana, a idempotência e os critérios de aceitação. Alterações cosméticas de UI e nomes internos de arquivos são permitidas, desde que não quebrem contratos públicos documentados.

---

**Fim do documento técnico — DeliveryAssist AI v1.0.0.**
