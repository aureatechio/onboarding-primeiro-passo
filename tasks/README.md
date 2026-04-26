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

## Tarefas na Raiz

Tarefas mantidas diretamente em `tasks/` porque ainda documentam entregas ou escopos relevantes do app atual.

| ID | Título | Módulo | Scale | Status | Prioridade |
|----|--------|--------|-------|--------|------------|
| [TASK-2026-04-06-001](./TASK-2026-04-06-001-conectar-copy-js-aos-componentes.md) | Conectar copy.js aos componentes de onboarding | onboarding | MEDIUM | concluida | media |
| [TASK-2026-04-06-002](./TASK-2026-04-06-002-tela-gerenciamento-copy-dashboard.md) | Criar tela de gerenciamento de copy no dashboard | dashboard | LARGE | concluida | media |

---

## Tarefas Arquivadas

Itens movidos para `tasks/arquivo/` quando ficaram fora do escopo do repo atual, foram superados por decisões mais recentes ou viraram registro histórico.

| ID | Título | Motivo do arquivamento |
|----|--------|------------------------|
| [TASK-2026-04-02-004](./arquivo/TASK-2026-04-02-004-badge-checkout-version-overview.md) | Badge de versão do checkout (v1/v2) na tabela Overview | Referia `apps/dashboard`, estrutura do monorepo que não existe neste repo standalone |
| [TASK-2026-04-09-001](./arquivo/TASK-2026-04-09-001-onboarding-manual-cliente-inadimplente.md) | Gerar onboarding manualmente para cliente com pagamento pendente | Envelheceu após a introdução de `onboarding_access` e da function `set-onboarding-access` |
| [TASK-2026-04-17-001](./arquivo/TASK-2026-04-17-001-copy-editor-diagnostico-persistencia.md) | Copy Editor: Diagnóstico de Persistência no Banco | Diagnóstico histórico; parte do conteúdo já foi resolvida e não representa task ativa |

Outras tasks antigas do monorepo principal podem ter sido removidas do repo durante a extração e limpeza.

---

## Dependências entre tasks

```
TASK-2026-04-06-001 (conectar copy.js)
        ↓ pré-requisito para
TASK-2026-04-06-002 (tela gerenciamento copy)
```
