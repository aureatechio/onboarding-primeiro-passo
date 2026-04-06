# Context Map — primeiro-passo-app

Indice rapido para agentes de IA. Para cada dominio, leia os arquivos na ordem listada.

## Onboarding (SPA React)
1. `src/` — codigo fonte do app (pages, components, context, lib, theme)
2. `src/context/OnboardingContext.jsx` — estado global do fluxo
3. `src/pages/` — paginas Etapa1Hero → EtapaFinal → TudoPronto
4. `src/copy.js` — conteudo textual das etapas

## AI Campaign Pipeline
1. `ai-step2/PRD.md` — requisitos do pipeline
2. `ai-step2/BACKLOG.md` — backlog de features
3. `ai-step2/CONTRACT.md` — contrato do pipeline
4. `supabase/functions/<funcao>/functionSpec.md` — spec da funcao especifica
5. `supabase/functions/_shared/ai-campaign/` — utilitarios compartilhados

## OMIE (ERP / Emissao Fiscal)
1. `.context/modules/omie/DOC-READING-ORDER.md` — **LER PRIMEIRO**: roteamento condicional por tipo de tarefa
2. `.context/modules/omie/README.md` — visao geral, scope, env vars
3. `.context/modules/omie/BUSINESS-RULES.md` — regras de negocio criticas (nao documentadas em specs)
4. `supabase/functions/<funcao>/functionSpec.md` — spec da funcao especifica
5. `.cursor/skills/omie-integracao/SKILL.md` — payload/API/transformacao

## Tarefas Operacionais
1. `tasks/README.md` — convencoes, lifecycle, indice
2. `tasks/TASK-TEMPLATE.md` — template para novas tarefas
3. `.cursor/skills/task-enricher/SKILL.md` — skill de enriquecimento por agente
4. `CONTEXT-MAP.md` — routing de modulo (usado pelo enricher)
