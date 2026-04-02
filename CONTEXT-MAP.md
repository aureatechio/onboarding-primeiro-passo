# Context Map — AUREA

Indice rapido para agentes de IA. Para cada dominio, leia os arquivos na ordem listada.

## Checkout (pagamentos)
1. `.context/modules/checkout/README.md` — visao geral
2. `supabase/functions/<funcao>/functionSpec.md` — spec da funcao especifica
3. `docs/edge-functions-publicas-e-protegidas.md` — classificacao JWT
4. `.cursor/skills/checkout-braspag-specialist/SKILL.md` — regras de negocio

## OMIE (ERP / Emissao Fiscal)
1. `.context/modules/omie/DOC-READING-ORDER.md` — **LER PRIMEIRO**: roteamento condicional por tipo de tarefa
2. `.context/modules/omie/README.md` — visao geral, scope, env vars
3. `.context/modules/omie/BUSINESS-RULES.md` — regras de negocio criticas (nao documentadas em specs)
4. `supabase/functions/<funcao>/functionSpec.md` — spec da funcao especifica
5. `.cursor/skills/omie-integracao/SKILL.md` — payload/API/transformacao
6. `.cursor/skills/omie-nfse-operacao/SKILL.md` — operacao/diagnostico NFS-e
7. `apps/omie/AGENTS.md` — contexto do backend Express

## Dashboard
1. `.context/modules/dashboard/README.md` — visao geral
2. `.cursor/skills/dashboard-specialist/SKILL.md` — convencoes UI
3. `apps/dashboard/src/` — codigo fonte

## Onboarding
1. `.context/modules/onboarding/README.md` — visao geral do fluxo
2. `.cursor/skills/onboarding-*/SKILL.md` — skill do submodulo especifico

## ClickSign (contratos)
1. `.context/modules/clicksign/README.md` — integracao completa
2. `.cursor/skills/clicksign-specialist/SKILL.md` — regras operacionais

## Email (Resend)
1. `.context/modules/email/README.md` — governanca
2. `docs/resend-email-provider.md` — configuracao do provider
3. `.cursor/skills/resend-email/SKILL.md` — implementacao

## Edge Functions (deploy)
1. `docs/edge-functions-publicas-e-protegidas.md` — classificacao
2. `.cursor/skills/edge-function-deploy/SKILL.md` — protocolo
3. `CLAUDE.md` -> secao "Supabase Critical Rules"

## NFS-e
1. `.context/modules/nfe/README.md` — visao geral
2. `.context/modules/omie/NFSE-OPERACAO-OMIE.md` — operacao
3. `.cursor/skills/omie-nfse-operacao/SKILL.md` — skill operacional

## Tarefas Operacionais
1. `tasks/README.md` — convencoes, lifecycle, indice
2. `tasks/TASK-TEMPLATE.md` — template para novas tarefas
3. `.cursor/skills/task-enricher/SKILL.md` — skill de enriquecimento por agente
4. `CONTEXT-MAP.md` — routing de modulo (usado pelo enricher)
