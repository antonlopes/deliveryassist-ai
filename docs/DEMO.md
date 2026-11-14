# Roteiro de demonstração do DeliveryAssist AI (3–5 minutos)

**Pré-condições:** app implantado HTTPS, `db:migrate` e `db:seed` executados com credenciais sintéticas, conta OPERATOR conhecida, IA configurada e smoke real de provider bem-sucedido. Não presumir provedor ativo apenas porque há chave em env.

1. **Contexto (20s).** Mostrar rodapé: projeto de portfólio, não afiliado ao iFood e com dados fictícios. O LLM é externo; não há modelo treinado pelo produto.
2. **Operações (40s).** Login como `OPERATOR`. Dashboard mostra 8 restaurantes e 160 pedidos (em estado inicial). Acessar `PED-1052` (logo após seed, atraso com tolerância) e histórico. Explicar que ETA e `delay_minutes` vêm de PostgreSQL e relógio do servidor.
3. **Consulta assistida (60s).** Abrir `/assistant`, criar conversa e enviar `Mostre o pedido PED-1052`. Comparar resposta com detalhe real do pedido. Caso o LLM interprete incorretamente, reconhecer e registrar falha em vez de forjar resultado.
4. **Propostas (60s).** Enviar `Abra uma ocorrência de atraso para PED-1052, adicione uma nota de acompanhamento e prepare um rascunho de resposta ao cliente.` Conferir IDs/justificativas/expiração e que **a ocorrência ainda não foi criada**. Aprovar o cartão `CREATE_INCIDENT` com confirmação e observar liberação de `ADD_INCIDENT_NOTE` e `CREATE_REPLY_DRAFT`. Rejeitar somente a nota. Aprovar somente o rascunho. Verificar draft editável e histórico. Nenhuma mensagem foi enviada.
5. **Segurança e auditoria (40s).** Demonstrar que operador não acessa `/admin/users` (403 na API). Com admin privado, examinar `/admin/audit`, proposta e execução, sem mostrar chave nem conteúdo integral da conversa. Explicar versionamento, idempotência e filtro de ações da IA.
6. **Falha segura (20s).** Em ambiente de teste, `AI_ENABLED=false`: status IA indisponível; operações manuais continuam disponíveis. Não exibir simulação estática como IA verdadeira.

## Condições que mudam a demo

- Após 24h (configurável), a base pode ser reinicializada de forma lazy no primeiro acesso. O pedido `PED-1052` recupera o padrão de seed. Não armazenar UUID interno em roteiro.
- Se outra pessoa já criou ocorrência ativa de atraso em `PED-1052`, o modelo deve evitar sugerir duplicação. Admin pode reinicializar a demo mediante confirmação reforçada, sem expor sua senha ao público.
- Caso o LLM não retorne JSON válido, o sistema devolve erro e não propõe ações perigosas. Modelo, versão, tempo e tokens efetivos devem ser anotados **após** smoke real.
- Limite da conta compartilhada: 30 turnos globais/dia, 10 por sessão e 3/min no padrão. Quando esgotado, usar fluxo manual, não elevar cota na UI.

## Evidências sugeridas pós-deploy

Capturar screenshots **reais** de login/dashboard/pedido/ocorrência/assistente/status de propostas/auditoria e IDs redigidos. Registrar data, host, provider, modelo, mensagem, resultado, número de execuções e erros observados. Não foram produzidas capturas neste ambiente porque a aplicação não pôde ser instalada/posta no ar com credenciais reais.
