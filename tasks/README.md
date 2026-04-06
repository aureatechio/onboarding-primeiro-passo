# Tasks — Índice e Convenções

## Lifecycle de uma tarefa

```
triagem → enriquecida → aprovada → em-execucao → validacao → concluida
                                                            ↘ promovido-a-plan
```

| Status | Descrição |
|--------|-----------|
| `triagem` | Relato recebido, sem análise técnica ainda |
| `enriquecida` | Agente analisou, diagnosticou e montou plano |
| `aprovada` | Humano aprovou o plano de execução |
| `em-execucao` | Execução iniciada |
| `validacao` | Execução concluída, aguardando validação |
| `concluida` | Validada e encerrada |
| `promovido-a-plan` | Escopo grande demais — movida para `plan/` |

## Convenção de nomenclatura

```
TASK-{YYYY-MM-DD}-{NNN}-{slug}.md
```

- `NNN` — sequencial por dia (001, 002, ...)
- `slug` — 3-5 palavras do título em kebab-case

## Escala

| Scale | Critério |
|-------|----------|
| `QUICK` | 1-2 arquivos, sem risco, sem teste novo |
| `SMALL` | 2-4 arquivos, teste simples, 1 módulo |
| `MEDIUM` | 4-8 arquivos, múltiplos testes, pode cruzar módulos |
| `LARGE` | Promover para `plan/`. Criar referência cruzada. |

---

## Índice de Tarefas Ativas

| ID | Título | Módulo | Scale | Status | Prioridade |
|----|--------|--------|-------|--------|------------|
| [TASK-2026-04-06-001](./TASK-2026-04-06-001-conectar-copy-js-aos-componentes.md) | Conectar copy.js aos componentes de onboarding | onboarding | MEDIUM | enriquecida | media |
| [TASK-2026-04-06-002](./TASK-2026-04-06-002-tela-gerenciamento-copy-dashboard.md) | Criar tela de gerenciamento de copy no dashboard | dashboard | LARGE | enriquecida | media |
| [TASK-2026-04-02-006](./TASK-2026-04-02-006-calibracao-polling-omie.md) | Calibração de polling OMIE | omie | — | triagem | — |
| [TASK-2026-04-02-007](./TASK-2026-04-02-007-validacao-sync-vendedores.md) | Validação de sync de vendedores | omie | — | triagem | — |
| [TASK-2026-04-02-008](./TASK-2026-04-02-008-validacao-retry-worker-producao.md) | Validação de retry worker em produção | shared | — | triagem | — |
| [TASK-2026-04-02-009](./TASK-2026-04-02-009-data-competencia-os-omie.md) | Data de competência na OS OMIE | omie | — | triagem | — |

---

## Tarefas Arquivadas

Tasks movidas para `tasks/arquivo/` por referenciarem apps que não existem neste repo standalone.

| ID | Título | Motivo do arquivamento |
|----|--------|------------------------|
| TASK-2026-04-02-002 | Tipo de venda nas características da OS | Referencia apps/omie e apps/dashboard (monorepo principal) |
| TASK-2026-04-02-003 | Forma de pagamento boleto parcelado no dashboard | 100% sobre apps/dashboard (monorepo principal) |
| TASK-2026-04-02-004 | Badge de versão no checkout overview | 100% sobre apps/dashboard (monorepo principal) |

---

## Dependências entre tasks

```
TASK-2026-04-06-001 (conectar copy.js)
        ↓ pré-requisito para
TASK-2026-04-06-002 (tela gerenciamento copy)
```
