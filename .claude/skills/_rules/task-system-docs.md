---
alwaysApply: false
globs:
  - "tasks/**"
---

# Sistema de Tarefas Operacionais

Ao trabalhar com arquivos em `tasks/`, siga estas regras:

## Contexto
- Convenções: `tasks/README.md`
- Template: `tasks/TASK-TEMPLATE.md`
- Skill de enriquecimento: `.cursor/skills/task-enricher/SKILL.md`
- Context Map: `CONTEXT-MAP.md`

## Regras
1. **Nunca editar a seção "Relato Original"** — é o registro histórico
2. **Sempre ler o contexto do módulo** antes de diagnosticar (via `CONTEXT-MAP.md`)
3. **Manter frontmatter YAML atualizado** com status, datas e módulo
4. **Classificar scale corretamente** (QUICK/SMALL/MEDIUM/LARGE)
5. **Referenciar arquivos-alvo** com paths completos do repositório

## Ciclo de vida
`triagem` → `enriquecida` → `aprovada` → `em-execucao` → `validacao` → `concluida`

## Para enriquecer uma tarefa
Invocar skill: `@task-enricher`
