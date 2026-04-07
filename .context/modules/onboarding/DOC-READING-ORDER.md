# Onboarding "Primeiro Passo" — Ordem de Leitura por Tipo de Tarefa

Leia SEMPRE o README.md primeiro. Depois, conforme o tipo de tarefa:

## Modificar formulario do frontend (campos, validacao, UX, novo step)
1. `.context/modules/onboarding/README.md` (visao geral, fluxo, contexto)
2. `docs/mapeamento-formulario-onboarding.md` — **referencia canonica** de campos, etapas, mapeamento DB
3. `src/copy.js` (textos de cada etapa)
4. `src/pages/Etapa*.jsx` (componente da etapa alvo)
5. `src/context/OnboardingContext.jsx` (estado global, navegacao, persistencia)

## Alterar Edge Function de onboarding (save-onboarding-identity, save-campaign-briefing, get-onboarding-data)
1. `.context/modules/onboarding/README.md`
2. `docs/mapeamento-formulario-onboarding.md` — secao "Mapeamento Formulario ↔ Banco de Dados"
3. `supabase/functions/<funcao>/index.ts` (codigo da funcao)
4. `supabase/functions/<funcao>/functionSpec.md` (se existir)
5. `.context/modules/onboarding/BUSINESS-RULES.md` (regras criticas)

## Debugar onboarding de uma compra especifica
1. `.context/modules/onboarding/README.md` (entender o fluxo)
2. `docs/mapeamento-formulario-onboarding.md` — secao "Mapeamento consolidado: Campo do formulario → Coluna no banco"
3. `.cursor/commands/compra-id.md` (comando de diagnostico)
4. Consultar via MCP Supabase: `compras` + `onboarding_identity` + `onboarding_briefings` + `ai_campaign_jobs`

## Alterar schema do banco (onboarding_identity, onboarding_briefings)
1. `.context/modules/onboarding/README.md`
2. `docs/mapeamento-formulario-onboarding.md` — secoes das tabelas (colunas, tipos, constraints)
3. `.context/modules/onboarding/BUSINESS-RULES.md` (regras de integridade)
4. `supabase/migrations/` — verificar ultima migration existente (nunca editar existentes)

## Integrar novo campo no fluxo completo (frontend → backend → banco)
1. `.context/modules/onboarding/README.md`
2. `docs/mapeamento-formulario-onboarding.md` — referencia completa de campos e mapeamento
3. `src/context/OnboardingContext.jsx` — adicionar campo em `INITIAL_USER_DATA`
4. `src/copy.js` — adicionar textos
5. `src/pages/Etapa*.jsx` — componente da etapa
6. `supabase/functions/save-onboarding-identity/index.ts` ou `save-campaign-briefing/index.ts`
7. Nova migration se necessario

## Modificar pipeline pos-onboarding (AI Campaign)
1. `.context/modules/onboarding/README.md` (secao Pipeline pos-onboarding)
2. `ai-step2/CONTRACT.md` (contrato do pipeline)
3. `docs/mapeamento-formulario-onboarding.md` — secao `ai_campaign_jobs` e `ai_campaign_assets`
4. `supabase/functions/create-ai-campaign-job/index.ts`
