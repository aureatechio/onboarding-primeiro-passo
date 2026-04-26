---
name: nova-tarefa
description: Cria e enriquece uma tarefa operacional a partir de um relato informal (bug, pedido, correcao). Use quando o usuario digitar /nova-tarefa seguido de um relato, ou pedir para criar tarefa, registrar bug, ou reportar problema.
---

# /nova-tarefa — Criar e Enriquecer Tarefa Operacional

## Quando usar

- Usuario cola um relato informal e pede para criar tarefa
- Usuario digita `/nova-tarefa` seguido de descricao
- Usuario menciona "criar tarefa", "registrar bug", "reportar problema"

## Comportamento esperado

O agente executa TODO o pipeline em um unico fluxo:
1. Cria o arquivo da tarefa em `tasks/`
2. Preenche a triagem com o relato
3. Enriquece automaticamente (contexto + diagnostico + plano)
4. Entrega a tarefa pronta para aprovacao

O usuario NAO precisa invocar `task-enricher` separadamente.

---

## Pipeline completo

### Fase 1 — Parsing do relato

Extrair do input do usuario:

| Campo | Como identificar |
|-------|-----------------|
| **Descricao** | O corpo principal da mensagem |
| **Origem** | Se menciona "whatsapp", "slack", etc. Default: `observacao` |
| **Reportado por** | Se menciona nome de pessoa. Default: nome do usuario no git config |
| **Evidencias** | URLs, prints mencionados, logs colados |
| **Prioridade** | Se menciona "urgente"/"critico" → `critica`. Se menciona "quando puder" → `baixa`. Default: `media` |

### Fase 2 — Gerar ID e nome do arquivo

```
TASK-{YYYY-MM-DD}-{NNN}-{slug}.md
```

Para determinar o NNN:
1. Listar arquivos em `tasks/` com prefixo `TASK-{data-hoje}`
2. Pegar o maior NNN e incrementar. Se nenhum, usar 001.
3. Slug: 3-5 palavras do titulo em kebab-case

### Fase 3 — Identificar modulo

Consultar `CONTEXT-MAP.md` e usar este mapeamento:

| Palavras-chave | Modulo |
|----------------|--------|
| OMIE, ordem de servico, OS, ERP, cliente OMIE, vendedor | `omie` |
| onboarding, primeiro passo, cadastro inicial, etapa, fluxo | `onboarding` |
| campanha AI, perplexity, nanobanana, briefing, imagem AI | `ai-campaign` |
| deploy, edge function, supabase function, infra | `shared` |
| config admin, logs, auditoria | `admin` |

### Fase 4 — Carregar contexto do modulo

**OBRIGATORIO — ler nesta ordem antes de diagnosticar:**

1. `.context/modules/{modulo}/README.md`
2. Sub-modulo especifico se aplicavel
3. `.cursor/skills/{modulo}-*specialist*/SKILL.md` ou skill correspondente
4. `functionSpec.md` da funcao afetada (se Edge Function)

> Se o relato for ambiguo e voce nao conseguir identificar o modulo, pergunte ao usuario ANTES de continuar.

### Fase 5 — Investigar codebase

Com base no contexto carregado:

1. Localizar arquivos-fonte relacionados ao problema
2. Ler trechos relevantes do codigo
3. Verificar testes existentes
4. Checar se existe `functionSpec.md`

### Fase 6 — Montar a tarefa completa

Criar o arquivo usando o template de `tasks/TASK-TEMPLATE.md` e preencher TODAS as secoes:

**Frontmatter YAML:**
```yaml
---
id: TASK-YYYY-MM-DD-NNN
title: "{titulo descritivo}"
status: enriquecida
priority: "{prioridade}"
modulo: "{modulo}"
origem: "{origem}"
reportado-por: "{pessoa}"
data-criacao: YYYY-MM-DD
data-enriquecimento: YYYY-MM-DD
scale: "{QUICK|SMALL|MEDIUM|LARGE}"
arquivos-alvo: [lista de paths]
related-plan: ""
---
```

**Secoes a preencher:**

1. **Relato Original** — Transcrever o relato do usuario TAL COMO FOI RECEBIDO (nao editar, nao tecnificar)
2. **Contexto Tecnico** — Modulo, docs consultados, arquivos relacionados, functionSpec
3. **Diagnostico** — Causa raiz, porque, impacto, riscos
4. **Plano de Execucao** — Steps concretos com arquivo-alvo e descricao da mudanca
5. **Criterios de Aceite** — Condicoes verificaveis
6. **Testes Necessarios** — Quais rodar/criar
7. **Deploy** — Se aplicavel, com classificacao JWT

### Fase 7 — Atualizar indice

Adicionar a tarefa na tabela "Indice de Tarefas Ativas" em `tasks/README.md`.

### Fase 8 — Apresentar resultado

Responder ao usuario com:

1. Path do arquivo criado
2. Resumo de 3 linhas: modulo, diagnostico, scale
3. Perguntar: "Quer aprovar o plano ou ajustar algo?"

---

## Regras criticas

### SEMPRE:
- Ler contexto do modulo ANTES de diagnosticar
- Manter relato original intacto
- Referenciar docs e arquivos consultados
- Incluir paths completos nos arquivos-alvo
- Para deploy: incluir `--project-ref awqtzoefutnfmnbomujt`

### NUNCA:
- Alterar codigo fonte — esta skill so cria documentacao
- Executar testes ou deploy
- Inventar problemas — se ambiguo, perguntar
- Pular a leitura de contexto do modulo

### Escala (scale):
- `QUICK` — 1-2 arquivos, sem risco, sem teste novo
- `SMALL` — 2-4 arquivos, teste simples, 1 modulo
- `MEDIUM` — 4-8 arquivos, multiplos testes, pode cruzar modulos
- `LARGE` — Promover para `plan/`. Criar referencia cruzada.

---

## Exemplos de invocacao

```
/nova-tarefa Juliana do financeiro mandou print: webhook cielo nao ta
processando PIX, pagamento fica pendente. Aconteceu com 3 clientes hoje.
Ultimo deploy foi ontem 18h.
```

```
/nova-tarefa (whatsapp, urgente) Cliente reclamou que boleto parcelado
ta gerando valor errado na segunda parcela. Reportado pelo Carlos do comercial.
```

```
/nova-tarefa dashboard travando quando filtra por periodo maior que 30 dias
na tela de checkout monitor
```

---

## Referencias

- Template: `tasks/TASK-TEMPLATE.md`
- Convencoes: `tasks/README.md`
- Skill de enriquecimento (detalhado): `.cursor/skills/task-enricher/SKILL.md`
- Context Map: `CONTEXT-MAP.md`
