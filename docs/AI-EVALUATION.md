# Avaliação offline de contratos da IA

## O que este ensaio mede

`scripts/ai-eval.mjs` aplica **25 casos determinísticos** diretamente aos validadores já existentes em `server/src/ai/contracts.js`. Inclui entradas válidas e rejeições de campos extras, intenções fora do enum, referências inválidas, ações não autorizadas e parâmetros fora do esquema.

Execute com `npm run eval:ai` (ou `node scripts/ai-eval.mjs`). O comando imprime um JSON com total, aprovados e falhas, terminando com status diferente de zero quando alguma expectativa é violada.

**Importante:** este ensaio **não chama modelos de linguagem**, **não mede acurácia de classificação**, **não valida qualidade de resposta, custo, tokens ou latência** e não cobre persistência nem execução real. Não apresente 25/25 como acerto de um LLM.

## Avaliação adicional necessária com fornecedor real

1. Preparar um conjunto de 20–30 solicitações sintéticas rotuladas (intenção esperada, alvo, ações permitidas e proibições). Não usar PII.
2. Fixar provedor/modelo, data, temperatura e versão de prompt; executar com banco isolado.
3. Calcular acurácia da intenção e dos identificadores, taxa de respostas JSON válidas, taxa de propostas aceitáveis e incidentes de execução indevida.
4. Registrar p50/p95 de latência, tokens e custo, se o fornecedor disponibilizar os dados.
5. Separar testes de prompt injection, falhas de rede, quotas e aprovação humana. Publicar apenas métricas observadas.

**Status:** ensaio offline incluído; teste de LLM real e métricas externas ainda pendentes.
