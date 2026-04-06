# Relatório: Arquitetura de Context Engineering e SDD — AUREA

**Data:** 2026-04-06
**Autor:** Claude (análise automatizada)
**Escopo:** Monorepo `aurea/` — documentação para agentes de IA (Cursor, Claude Code, Cowork)

---

## 1. Visão Geral da Arquitetura

O projeto AUREA implementa uma estratégia de **context engineering em camadas** desenhada para que agentes de IA (Cursor Agent, Claude Code) carreguem exatamente o contexto necessário antes de agir. A arquitetura se organiza em 6 camadas hierárquicas que vão do geral ao específico:

| Camada | Artefato | Propósito |
|--------|----------|-----------|
| 1. Raiz | `CLAUDE.md` (315 linhas) | Contexto universal: estrutura do monorepo, comandos, regras críticas, code style, registro de todas as Edge Functions |
| 2. Roteamento | `CONTEXT-MAP.md` | Índice rápido por domínio — direciona o agente para os docs corretos na ordem certa |
| 3. Módulo | `.context/modules/{módulo}/README.md` | Visão geral do módulo: scope, componentes, data flow, env vars, convenções |
| 4. Especialização | `.context/modules/{módulo}/BUSINESS-RULES.md`, runbooks, checklists | Regras de negócio que **não estão em specs**, operação diária, estado de validações |
| 5. Contrato | `supabase/functions/{função}/functionSpec.md` | Spec Driven Development — contrato formal da função (inputs, behavior, errors) |
| 6. Habilidade | `.cursor/skills/{skill}/SKILL.md` | Workflow operacional para o agente executar tarefas específicas |

Complementam essa estrutura as **Cursor Rules** (`.cursor/rules/*.mdc`) que forçam gates obrigatórios antes de o agente agir em determinados globs de arquivos.

---

## 2. Context Engineering — Análise por Componente

### 2.1 CLAUDE.md (Camada 1 — Contexto Universal)

O `CLAUDE.md` na raiz é o ponto de entrada para qualquer agente. Com 315 linhas, cobre:

- Estrutura completa do monorepo (apps, packages, supabase, .context, .cursor, docs, plan)
- Comandos de build, test, lint, typecheck por app e global
- Regras críticas de Supabase (RLS sem recursão infinita, migrations imutáveis, auth pattern)
- Protocolo de deploy obrigatório para Edge Functions (classificação JWT, `--project-ref`)
- Registro exaustivo de **todas as Edge Functions** por domínio (checkout, recurrence, OMIE, ClickSign, AI, admin)
- Code style (ESLint, Prettier, Conventional Commits, Zod 4, Pino, Express 5, Vitest)
- Integrações externas (OMIE, Cielo/Braspag, ClickSign v3, Resend)

**Pontos fortes:** registro completo de funções, regras de segurança explícitas (PCI-DSS, JWT), pre-PR checklist.
**Oportunidade:** o arquivo é denso; um agente carregando tudo pode ter ruído em tarefas de escopo reduzido. O `CONTEXT-MAP.md` mitiga isso parcialmente.

### 2.2 CONTEXT-MAP.md (Camada 2 — Roteamento)

Funciona como um **router de contexto** para agentes de IA. Lista 8 domínios (Checkout, OMIE, Dashboard, Onboarding, ClickSign, Email, Edge Functions, NFS-e) + Tarefas Operacionais, cada um com ordem de leitura numerada.

**Ponto forte:** elimina ambiguidade sobre "qual doc ler primeiro". O módulo OMIE vai além e tem um `DOC-READING-ORDER.md` dedicado com roteamento **condicional por tipo de tarefa** (criação de OS vs. troubleshooting vs. batch vs. boleto vs. polling).

**Oportunidade:** apenas OMIE tem roteamento condicional. Os demais domínios (Checkout, ClickSign) poderiam se beneficiar da mesma granularidade conforme crescem.

### 2.3 .context/modules/ (Camada 3-4 — Módulos e Especialização)

Atualmente materializado apenas para o módulo **OMIE** (4 arquivos encontrados):

| Arquivo | Função |
|---------|--------|
| `README.md` | Visão geral completa (185 linhas): scope, 20+ componentes, data flow, env vars, integrations, convenções |
| `DOC-READING-ORDER.md` | Roteamento condicional por 8 tipos de tarefa |
| `BUSINESS-RULES.md` | 12 regras críticas que existem no código mas **não estão em functionSpecs** |
| `checklist-geral.md` | Checklist operacional com 30+ itens, evidências de código e links para tarefas pendentes |

**Análise qualitativa:** O módulo OMIE é o mais documentado do projeto e serve como modelo de referência. O `BUSINESS-RULES.md` é particularmente valioso — documenta regras como "cartão 2+ parcelas = código 999 forçado", "flags cEnvBoleto/cEnvPix/cEnvLink sempre 'N' em 3 camadas de proteção", que um agente jamais descobriria só pela spec. Cada regra inclui fonte (arquivo) e motivação.

**Gap identificado:** Apenas OMIE possui `.context/modules/` materializado no repositório atual. Os demais domínios referenciados no `CONTEXT-MAP.md` (checkout, dashboard, clicksign, email, onboarding, nfe) são mencionados mas seus `README.md` correspondentes não foram encontrados neste workspace. Isso pode indicar que estão em outro branch/repo ou ainda não foram criados.

### 2.4 .cursor/rules/ (Gates Obrigatórios)

Duas rules MDC encontradas:

1. **`omie-docs-and-skills.mdc`** — Ativada por globs (`apps/omie/**`, `supabase/functions/omie-*/**`, etc.). Força um gate de 4 etapas antes de qualquer ação: identificar tipo de tarefa → ler DOC-READING-ORDER → ler docs na ordem → selecionar skill correta → responder com evidência. Inclui registro completo de todas as Edge Functions OMIE.

2. **`task-system-docs.mdc`** — Ativada por `tasks/**`. Define regras para o sistema de tarefas operacionais: nunca editar relato original, ler contexto do módulo, manter frontmatter YAML.

**Ponto forte:** o padrão de "gate obrigatório antes de agir" é extremamente eficaz. A rule OMIE essencialmente impede que o agente "invente" comportamento sem ter lido a documentação relevante.

### 2.5 .cursor/skills/ (Camada 6 — Habilidades)

Três skills encontradas:

1. **`omie-integracao/SKILL.md`** — Workflow completo para tarefas de integração OMIE: fontes obrigatórias, tabela de operações OMIE com método/edge function/skill, checklist de 7 passos, templates de payload (contato + OS), validações, tratamento de erros, testes recomendados.

2. **`nova-tarefa/SKILL.md`** — Pipeline completo de 8 fases para criar tarefas operacionais: parsing do relato → gerar ID → identificar módulo → carregar contexto → investigar codebase → montar tarefa → atualizar índice → apresentar resultado. Inclui tabela de mapeamento palavras-chave→módulo e regra explícita de que a skill **nunca altera código**.

3. **`task-enricher/SKILL.md`** — Workflow de enriquecimento em 8 steps para transformar relatos informais em tarefas técnicas. Complementa `nova-tarefa` com foco no diagnóstico e plano de execução.

**Análise:** O sistema de tarefas (nova-tarefa + task-enricher + task-system-docs rule) forma um **pipeline estruturado** que leva um relato informal ("webhook não tá batendo") até uma tarefa técnica pronta para execução, com contexto do módulo, diagnóstico e plano. 7 tarefas ativas foram encontradas no diretório `tasks/`.

### 2.6 Cursor Commands (.cursor/commands/)

12 comandos encontrados, incluindo: `bug-chat`, `commit-group`, `commit-n-push`, `compra-id`, `convert-to-plan`, `create-module-specialist`, `playwright-mcp`, `recruit`, `resume`, `supabase-mcp`. Indicam automações operacionais que complementam as skills.

---

## 3. Spec Driven Development (SDD) — Análise

### 3.1 Cobertura

**9 functionSpecs** encontradas, todas no módulo OMIE:

| Função | functionSpec.md |
|--------|:-:|
| `omie-orchestrator` | ✅ |
| `omie-create-os` | ✅ |
| `omie-upsert-os` | ✅ |
| `omie-upsert-os-batch` | ✅ |
| `omie-upsert-service` | ✅ |
| `omie-push-vendedores` | ✅ |
| `omie-sync-vendedores` | ✅ |
| `get-omie-nfse-config` | ✅ |
| `update-omie-nfse-config` | ✅ |

**Funções OMIE sem spec:** `omie-create-client`, `omie-create-service`, `omie-preview-upsert-os`, `omie-nfse-retry-worker`, `omie-fix-os-parcelas`, `omie-fix-os-parcelas-batch`, `omie-fix-contas-receber`, `omie-fix-contas-receber-batch`, `omie-backfill-client-address`, `omie-backfill-client-address-batch`.

**Funções não-OMIE:** Nenhuma das ~40+ Edge Functions de checkout, recurrence, ClickSign ou admin possui functionSpec. O SDD está concentrado exclusivamente no domínio OMIE.

### 3.2 Qualidade das Specs

Analisando as specs de `omie-orchestrator` e `omie-upsert-os` como amostra:

**Estrutura padrão consistente:**
- Goal → Inputs (method, path, headers, body) → Environment Variables → Behavior (numerado) → Error Handling (com códigos HTTP e nomes) → Observability → Example Response

**Pontos fortes:**
- Specs documentam **modos especiais** (backfill_payload_only) com regras explícitas de o que NÃO fazer
- Lease lock documentado com TTL, comportamento do 409, e garantia de recuperação automática
- Cadeia de fallback de auth documentada
- Resolução de campos derivados (cCidPrestServ, cidade via IBGE) documentada na spec

**Gap entre spec e código:** O `BUSINESS-RULES.md` existe justamente para cobrir as 12 regras que estão no código mas não nas specs. Isso é reconhecido como design intencional — as specs documentam o contrato, as business rules documentam a implementação.

### 3.3 Padrão SDD — Como Funciona

O fluxo SDD no projeto é:

1. **Antes de implementar:** cria ou consulta `functionSpec.md` como contrato
2. **Durante implementação:** o agente IA usa a spec como referência + business rules para gaps
3. **Após mudança no código:** se a spec diverge, atualiza-se a spec (evidenciado no plano de melhoria de contexto que auditou e corrigiu specs desatualizadas)
4. **O `CLAUDE.md` registra:** "Some Edge Functions use SDD: a functionSpec.md file alongside index.ts defines the function's contract. Check for existing specs before modifying OMIE or NFe functions."

---

## 4. Sistema de Planos (plan/)

5 planos ativos encontrados, com destaque para o `README.md` que indexa **25+ planos** (ativos, concluídos e históricos) com descrição de uma linha cada.

**Convenção:** `YYYY-MM-DD-slug.md` para nomeação, com atualização obrigatória do `plan/README.md`.

**Planos notáveis de context engineering:**
- `2026-04-02-melhoria-contexto-omie.md` (✅ Concluído) — Plano executável que diagnosticou 7 causas-raiz de falhas de primeira tentativa por contexto insuficiente e criou DOC-READING-ORDER, BUSINESS-RULES, reescrita da rule OMIE, e 6 functionSpecs faltantes
- `2026-04-02-otimizacao-engenharia-contexto.md` — Limpeza de regras/agents redundantes, globs contextuais, consolidação de CLAUDE.md + AGENTS.md, criação de CONTEXT-MAP.md

Isso evidencia que a arquitetura de contexto é **resultado de iteração deliberada** — houve planos específicos para diagnosticar e corrigir gaps.

---

## 5. Sistema de Tarefas Operacionais

O diretório `tasks/` implementa um sistema completo de rastreamento:

- **7 tarefas ativas** com padrão `TASK-YYYY-MM-DD-NNN-slug.md`
- **Template padronizado** (`TASK-TEMPLATE.md`)
- **Ciclo de vida:** triagem → enriquecida → aprovada → em-execução → validação → concluída
- **Frontmatter YAML** com: id, title, status, priority, módulo, origem, reportado-por, scale, arquivos-alvo
- **Duas skills dedicadas:** `nova-tarefa` (pipeline end-to-end) e `task-enricher` (enriquecimento com contexto do módulo)
- **Cursor rule:** `task-system-docs.mdc` para enforcement

---

## 6. Avaliação Geral

### Pontos Fortes

1. **Roteamento de contexto em camadas** — O sistema CONTEXT-MAP → DOC-READING-ORDER → README → BUSINESS-RULES → functionSpec → SKILL garante que o agente carrega contexto na granularidade certa, reduzindo ruído e aumentando precisão.

2. **Gates obrigatórios via Cursor Rules** — A rule OMIE que força leitura de docs antes de agir é uma prática avançada de context engineering. O agente não pode "pular" o contexto.

3. **BUSINESS-RULES.md como safety net** — Documentar regras que existem no código mas não nas specs é um reconhecimento maduro de que specs formais nem sempre capturam tudo. Cada regra com fonte e motivação.

4. **Pipeline de tarefas com contexto** — O sistema nova-tarefa + task-enricher força loading de contexto do módulo antes de diagnosticar, evitando diagnósticos genéricos.

5. **Iteração deliberada** — A existência de planos dedicados a melhorar a engenharia de contexto (com diagnóstico de causas-raiz e métricas de cobertura) mostra que o sistema é mantido ativamente.

6. **Separação de concerns clara** — Contexto canônico (README) vs. operação diária (runbook/checklist) vs. contrato (functionSpec) vs. habilidade (SKILL).

### Oportunidades de Melhoria

1. **Cobertura desigual entre módulos** — OMIE é exemplar; os demais domínios (Checkout com ~25 funções, Recurrence com ~15, ClickSign com ~5) não possuem `.context/modules/` materializado nem functionSpecs. Replicar o padrão OMIE para Checkout seria o maior ganho incremental.

2. **SDD limitado a OMIE** — Das ~60+ Edge Functions, apenas 9 do OMIE têm functionSpec. Expandir para as funções de checkout críticas (process-checkout, cielo-webhook, create-checkout) melhoraria significativamente a precisão do agente.

3. **10 funções OMIE sem spec** — Mesmo dentro do OMIE (o módulo mais coberto), funções como `omie-create-client`, `omie-create-service` e `omie-preview-upsert-os` não têm spec formal.

4. **DOC-READING-ORDER condicional só existe para OMIE** — Checkout e ClickSign poderiam se beneficiar do mesmo padrão de roteamento por tipo de tarefa.

5. **Ausência de AGENTS.md** — Nenhum `AGENTS.md` foi encontrado no workspace atual (o `CLAUDE.md` menciona que apps podem ter, mas não estão presentes neste checkout).

---

## 7. Métricas Resumo

| Métrica | Valor |
|---------|-------|
| CLAUDE.md (linhas) | 315 |
| Módulos em .context/ | 1 (OMIE) com 4 arquivos |
| functionSpecs (SDD) | 9 (todas OMIE) |
| Cursor Rules | 2 |
| Cursor Skills | 3 |
| Cursor Commands | 12 |
| Planos em plan/ | 25+ indexados |
| Tarefas ativas | 7 |
| Edge Functions totais | ~60+ |
| Cobertura SDD | ~15% |

---

## 8. Recomendação

A arquitetura de context engineering do AUREA é **sofisticada e deliberadamente iterada**, especialmente no módulo OMIE que serve como referência. A principal alavanca de melhoria é **replicar o padrão OMIE (CONTEXT-MAP → DOC-READING-ORDER → README → BUSINESS-RULES → functionSpec) para o domínio Checkout**, que é o mais crítico em volume de funções e complexidade de negócio.
