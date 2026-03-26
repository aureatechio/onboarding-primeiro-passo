# Backlog derivado do PRD

## 1) Contexto sintetico
- Problema: falta um fluxo implementado fim a fim para transformar dados do onboarding em 12 pecas estaticas padronizadas por grupo e formato.
- Objetivo de negocio: reduzir tempo operacional de criacao de campanhas e aumentar velocidade de entrega de pecas para clientes que concluiram compra e assinatura.
- Publico-alvo: cliente final no onboarding e equipe operacional/comercial que depende das pecas geradas.
- Metricas de sucesso:
  - 95%+ dos jobs com status `completed` sem intervencao manual
  - 100% dos jobs validos retornando 12 imagens (3 grupos x 4 formatos)
  - tempo medio de processamento por job dentro da meta operacional (a definir)
- Restricoes/premissas:
  - usar `gemini-3-pro-image-preview`
  - aplicar `global-rules.md` em todos os prompts
  - fluxo inicia somente com compra paga + contrato assinado
  - `campaign_image_url` e `campaign_notes` sao opcionais

## 2) Epicos
### Epico E1 - Coleta e validacao de insumos no onboarding
- Objetivo: garantir captura consistente dos ativos necessarios para geracao.
- Valor gerado: reduz erro de entrada e evita retrabalho operacional.
- Prioridade: P0

### Epico E2 - Orquestracao de prompt e pipeline de geracao
- Objetivo: montar prompts por grupo/formato e executar geracao de imagens.
- Valor gerado: entrega automatizada das 12 pecas com padrao de qualidade.
- Prioridade: P0

### Epico E3 - Persistencia, status e entrega de resultados
- Objetivo: rastrear jobs, armazenar metadados e retornar links das pecas.
- Valor gerado: previsibilidade operacional e visibilidade para cliente/time.
- Prioridade: P0

### Epico E4 - Observabilidade, resiliencia e seguranca operacional
- Objetivo: garantir idempotencia, logs auditaveis e controle de falhas.
- Valor gerado: estabilidade do fluxo e menor risco em producao.
- Prioridade: P1

### Epico E5 - Qualidade, homologacao e rollout
- Objetivo: validar fluxo ponta a ponta e preparar entrada em producao.
- Valor gerado: reduz regressao e acelera liberacao segura.
- Prioridade: P1

## 3) Historias por epico
### E1
#### H1.1 - Capturar ativos obrigatorios no multistep
- Como cliente, quero enviar logotipo, paleta e fontes para que as pecas reflitam minha marca.
- Criterios de aceite:
  - [ ] formulario exige logotipo, paleta e fontes antes de concluir etapa
  - [ ] mensagens de erro sao claras e orientam correcao
  - [ ] dados ficam vinculados ao `compra_id`
- Prioridade: P0
- Dependencias: `OnboardingContext`, etapa de coleta no fluxo atual
- Risco: divergencia de formato de arquivo e validacao insuficiente no frontend

#### H1.2 - Suportar insumos opcionais sem bloquear fluxo
- Como cliente, quero adicionar imagem e texto opcional para enriquecer o briefing sem ser obrigado.
- Criterios de aceite:
  - [ ] ausencia de `campaign_image_url` nao impede avancar
  - [ ] ausencia de `campaign_notes` nao impede avancar
  - [ ] insumos opcionais, quando enviados, sao persistidos corretamente
- Prioridade: P1
- Dependencias: H1.1
- Risco: comportamento inconsistente entre estados com/sem opcional

#### H1.3 - Garantir pre-condicao de entrada do fluxo
- Como sistema, quero validar compra paga e contrato assinado para liberar `ai-step2`.
- Criterios de aceite:
  - [ ] fluxo de geracao so e habilitado com condicoes de negocio atendidas
  - [ ] tentativas sem pre-condicao retornam estado bloqueado com motivo
- Prioridade: P0
- Dependencias: integracao com dados de proposta/compra
- Risco: fonte de verdade da elegibilidade nao consolidada

### E2
#### H2.1 - Construir prompt base multimodal
- Como sistema, quero compor prompt com PNG celebridade, logo, paleta, texto e global rules para gerar pecas aderentes.
- Criterios de aceite:
  - [ ] prompt inclui `global-rules.md` em 100% das execucoes
  - [ ] prompt inclui ativos obrigatorios sempre que disponiveis
  - [ ] versao de prompt e registrada (`prompt_version`)
- Prioridade: P0
- Dependencias: H1.1, H1.2
- Risco: baixa consistencia do prompt entre execucoes

#### H2.2 - Gerar variacoes por grupo criativo
- Como operacao, quero que o sistema gere `moderna`, `clean` e `retail` para ampliar opcao de campanha.
- Criterios de aceite:
  - [ ] cada job produz os 3 grupos obrigatorios
  - [ ] direcao criativa de cada grupo segue matriz de `ruas.md`
- Prioridade: P0
- Dependencias: H2.1
- Risco: saidas muito similares entre grupos

#### H2.3 - Gerar formatos obrigatorios por grupo
- Como operacao, quero receber 1:1, 4:5, 16:9 e 9:16 por grupo para uso multicanal.
- Criterios de aceite:
  - [ ] cada grupo retorna os 4 formatos obrigatorios
  - [ ] total por job valido e igual a 12 imagens
- Prioridade: P0
- Dependencias: H2.2
- Risco: falha parcial por formato sem tratamento padrao

### E3
#### H3.1 - Persistir metadados e ativos gerados
- Como sistema, quero salvar imagens e metadados para rastreabilidade e consulta.
- Criterios de aceite:
  - [ ] cada imagem possui `group`, `format`, `image_url`, `prompt_version`, `created_at`
  - [ ] status do job e persistido (`completed`, `partial`, `failed`)
  - [ ] falhas sao armazenadas em `errors[]`
- Prioridade: P0
- Dependencias: H2.3
- Risco: perda de rastreabilidade em falhas parciais

#### H3.2 - Expor status e resultado para cliente/operacao
- Como usuario, quero acompanhar o processamento e acessar os links das imagens ao final.
- Criterios de aceite:
  - [ ] status do job e consultavel
  - [ ] resposta final inclui colecao de assets
  - [ ] em erro parcial, retorno indica itens faltantes e motivo
- Prioridade: P0
- Dependencias: H3.1
- Risco: UX ruim sem feedback de progresso

### E4
#### H4.1 - Implementar idempotencia por `compra_id` + versao de insumos
- Como sistema, quero evitar geracoes duplicadas para a mesma entrada.
- Criterios de aceite:
  - [ ] repeticao de requisicao equivalente nao cria job duplicado
  - [ ] chave idempotente e auditavel
- Prioridade: P1
- Dependencias: H3.1
- Risco: duplicidade de custo e inconsistencias de saida

#### H4.2 - Implementar observabilidade por etapa
- Como operacao, quero logs estruturados para diagnosticar falhas rapidamente.
- Criterios de aceite:
  - [ ] logs por etapa: ingestao, prompt, geracao, persistencia, entrega
  - [ ] cada log possui `compra_id` e `job_id`
  - [ ] erros sao categorizados por tipo
- Prioridade: P1
- Dependencias: H3.1
- Risco: baixa capacidade de troubleshooting

#### H4.3 - Garantir seguranca de acesso aos ativos
- Como sistema, quero proteger URLs e metadados sensiveis para acesso controlado.
- Criterios de aceite:
  - [ ] politica de acesso aos assets definida e aplicada
  - [ ] sem exposicao de credenciais em logs/respostas
- Prioridade: P1
- Dependencias: H3.1
- Risco: exposicao indevida de ativos de campanha

### E5
#### H5.1 - Cobrir fluxo com testes de regressao essenciais
- Como time, quero validacao automatizada minima para reduzir regressao no pipeline.
- Criterios de aceite:
  - [ ] teste de contrato de input/output do job
  - [ ] teste de regra "12 imagens obrigatorias"
  - [ ] teste de comportamento com campos opcionais ausentes
- Prioridade: P1
- Dependencias: E2, E3
- Risco: regressao silenciosa em alteracoes futuras

#### H5.2 - Executar homologacao ponta a ponta e plano de rollout
- Como produto/operacao, quero homologar o fluxo antes do go-live.
- Criterios de aceite:
  - [ ] checklist de homologacao executado com caso feliz e caso de falha parcial
  - [ ] plano de rollback definido
  - [ ] criterio de go-live aprovado por produto + operacao
- Prioridade: P2
- Dependencias: H5.1
- Risco: entrada em producao sem readiness operacional

## 4) Tarefas tecnicas iniciais
| ID | Historia | Tarefa | Tipo | Prioridade | Dependencias |
|----|----------|--------|------|------------|--------------|
| T1 | H1.1 | ~~Definir schema de validacao dos campos obrigatorios no onboarding~~ | frontend | P0 | - | ✅ |
| T2 | H1.1 | ~~Implementar upload/preview de logo com validacao de tipo/tamanho~~ | frontend | P0 | T1 | ✅ |
| T3 | H1.1 | ~~Implementar coleta de paleta e fontes com persistencia em `userData`~~ | frontend | P0 | T1 | ✅ |
| T4 | H1.2 | ~~Implementar campos opcionais (`campaign_image_url`, `campaign_notes`) sem bloqueio~~ | frontend | P1 | T1 | ✅ |
| T5 | H1.3 | ~~Integrar validacao de elegibilidade por compra/contrato antes de disparar geracao~~ | backend | P0 | - | ✅ |
| T6 | H2.1 | ~~Implementar builder de prompt base com merge de `global-rules.md`~~ | backend | P0 | T3,T4 | ✅ |
| T7 | H2.2 | ~~Implementar strategy de prompt por grupo (`moderna`, `clean`, `retail`)~~ | backend | P0 | T6 | ✅ |
| T8 | H2.3 | ~~Implementar matriz de formatos por grupo e orquestracao 3x4~~ | backend | P0 | T7 | ✅ |
| T9 | H2.3 | ~~Integrar chamada ao modelo `gemini-3-pro-image-preview` com retries controlados~~ | backend | P0 | T8 | ✅ |
| T10 | H3.1 | ~~Persistir `job`, `assets[]`, `errors[]` e metadados de execucao~~ | data | P0 | T9 | ✅ |
| T11 | H3.2 | ~~Expor endpoint/status para polling e resposta final de assets~~ | backend | P0 | T10 | ✅ |
| T12 | H4.1 | ~~Implementar chave idempotente por `compra_id` + hash de inputs~~ | backend | P1 | T10 | ✅ |
| T13 | H4.2 | ~~Padronizar logs estruturados por etapa com `job_id`~~ | backend | P1 | T9 | ✅ |
| T14 | H4.3 | ~~Definir politica de acesso aos arquivos gerados (URL assinada ou equivalente)~~ | devops | P1 | T10 | ✅ |
| T15 | H5.1 | ~~Criar testes de contrato e regra de completude de 12 imagens~~ | qa | P1 | T10,T11 | ✅ |
| T16 | H5.2 | ~~Executar smoke e checklist de homologacao com casos feliz/parcial~~ | qa | P2 | T15 | ✅ |

## 5) Plano de execucao sugerido
- Sprint 1:
  - E1 completo (H1.1, H1.3) + inicio E2 (H2.1)
  - Entregavel: insumos validados + prompt base funcional
- Sprint 2:
  - E2 completo (H2.2, H2.3) + E3 (H3.1, H3.2)
  - Entregavel: pipeline gerando 12 imagens e retornando resultados
- Sprint 3:
  - E4 (idempotencia, observabilidade, seguranca) + E5 (testes e homologacao)
  - Entregavel: fluxo robusto e pronto para go-live controlado

## 6) Duvidas resolvidas
- **Limites de upload:** Logo max 5 MB (upload), paleta max 8 cores, font max 100 chars, notas max 2000 chars, imagens max 5 arquivos. Validacao client-side e server-side.
- **Visualizacao:** Apenas operacao interna visualiza as 12 pecas. Cliente nao ve no onboarding. Tela no dashboard e item P1 separado.
- **Armazenamento:** Buckets `ai-campaign-assets` (pecas geradas) e `onboarding-identity` (inputs do cliente). Ambos privados com signed URLs.
- **SLA:** Cada worker gera 1 imagem em ~25-30s. Orquestrador despacha em background via `EdgeRuntime.waitUntil`. Progresso visivel via `get-ai-campaign-status`.
- **Auto-reprocessamento:** Nao implementado automaticamente. Re-disparo manual via `create-ai-campaign-job` com mesmos inputs (idempotencia deleta job `failed`/`partial` e recria). Botao no dashboard e item P1.
- **Limites de custo:** Monitorar no Google AI Studio durante testes. Rate-limit por `compra_id` e item P1.
- **Versionamento global-rules:** `GLOBAL_RULES_VERSION` (v1.0.0) exportada em `prompt-builder.ts`, incluida no `input_hash` para invalidacao de cache de idempotencia.
- **Wall-clock limit:** Resolvido com pattern orquestrador + worker individual. Orquestrador retorna imediatamente e despacha workers em background. Cada worker processa 1 imagem dentro do limite de ~90s.
- **Persistencia de identidade visual:** Resolvido com tabela `onboarding_identity`, bucket `onboarding-identity`, e Edge Function `save-onboarding-identity` (publica). Frontend Etapa62 salva logo, cores, fonte, imagens e notas ao confirmar.
