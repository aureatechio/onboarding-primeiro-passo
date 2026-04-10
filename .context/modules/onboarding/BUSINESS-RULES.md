# Onboarding "Primeiro Passo" — Regras de Negocio

Regras criticas extraidas do codigo e do banco. Violar qualquer uma pode quebrar o fluxo ou corromper dados.

## 1. Uma identidade por compra (UNIQUE constraint)

`onboarding_identity.compra_id` tem constraint UNIQUE. O backend faz UPSERT por `compra_id`. Nunca inserir diretamente sem usar `onConflict: 'compra_id'`.

## 2. Um briefing por compra (UNIQUE constraint)

`onboarding_briefings.compra_id` tem constraint UNIQUE. Mesma regra de upsert.

## 3. Choice deve ser 'add_now' ou 'later'

O campo `onboarding_identity.choice` aceita apenas `add_now` e `later`. Validacao enforced no backend.

## 4. Production path aceita apenas 'standard' ou 'hybrid'

O campo `onboarding_identity.production_path` aceita apenas `standard` e `hybrid`. Qualquer outro valor e ignorado silenciosamente. Se `site_url` ou `instagram_handle` forem enviados no upsert, o backend forca `production_path = 'standard'`.

## 5. Disparo do enrichment: site OU Instagram

Quando `save-onboarding-identity` conclui com sucesso e **`site_url` ou `instagram_handle`** esta preenchido, o backend chama `onboarding-enrichment` (fire-and-forget). Sem ambos vazios (e sem trigger alternativo), o pipeline de enrichment **nao** inicia.

`choice: 'later'` sem preencher site/Instagram tipicamente nao dispara enrichment (e nao atende a condicao acima).

## 6. Elegibilidade bloqueia onboarding

O formulario nao carrega se a compra nao for elegivel. A regra base e:
`(checkout_status === 'pago' || vendaaprovada === true) && clicksign_status === 'Assinado'`

Adicionalmente, existe a tabela `onboarding_access` que permite override manual. Se `onboarding_access.status = 'allowed'` (e nao expirado via `allowed_until`), a compra e considerada elegivel mesmo sem `checkout_status = 'pago'`.

O pipeline `onboarding-enrichment` e `create-ai-campaign-job` usam `checkAiCampaignEligibility` que aceita: `clicksign_status = 'Assinado'` + (`checkout_status = 'pago'` OR `onboarding_access.status = 'allowed'`).

Toda liberacao manual e rastreada em `onboarding_access_events` (append-only audit trail) com motivo, responsavel e timestamp.

## 7. Storage: bucket privado, paths por compra_id

O bucket `onboarding-identity` e privado. Todos os uploads usam o padrao `{compra_id}/logo.{ext}` ou `{compra_id}/img_{N}.{ext}`. O campo `logo_path` no banco armazena o path relativo, nao a URL completa.

## 8. Site e Instagram: colunas dedicadas + campaign_notes legado

`onboarding_identity.site_url` e `onboarding_identity.instagram_handle` sao a fonte de verdade para o backend e enrichment. O frontend pode ainda enviar `campaign_notes` com texto concatenado por compatibilidade; a hidratacao usa as colunas `site_url` / `instagram_handle` quando presentes.

## 9. Quiz checkboxes nao persistem no banco

Os quizzes das Etapas 2, 3 e 4 sao apenas validacao local. Nao ha registro no banco de que o usuario respondeu. O progresso e armazenado em `localStorage`.

## 10. Hidratacao usa 5 tabelas em paralelo

`get-onboarding-data` busca dados de `compras`, `clientes`, `celebridadesReferencia`, `segmentos` e `atendentes` em paralelo. Se qualquer lookup falhar, usa fallback (ex: "Cliente", "Celebridade contratada").

## 11. Atendente e determinado por faixa de valor

O atendente e selecionado automaticamente pela faixa de `valor_total` da compra na tabela `atendentes` (filtro por `valor_min`/`valor_max` + `ativo = true`). Nao e um campo editavel no formulario.

## 12. Frontend sem JWT

O SPA nao usa autenticacao JWT. Todas as Edge Functions de onboarding sao publicas (`--no-verify-jwt`). A seguranca depende do UUID da compra ser nao-adivinhavel.

## 13. Copy centralizada em copy.js

Todos os textos do formulario vem de `src/copy.js`. Nunca hardcode textos diretamente nos componentes JSX.

## 14. Nunca editar migrations existentes

Ao alterar schema de `onboarding_identity` ou `onboarding_briefings`, sempre criar nova migration. Regra do projeto inteiro.

## 15. Briefing audio salvo como blob webm (legado)

O fluxo manual com audio em `save-campaign-briefing` grava WebM no browser. O caminho principal de briefing hoje e IA via enrichment (`generate-campaign-briefing`).

## 16. Um job de enrichment por compra

`onboarding_enrichment_jobs.compra_id` e UNIQUE. Reexecucoes fazem upsert no mesmo registro. Retry por fase via body `retry_from_phase` (ver functionSpec).

## 17. Briefing no prompt de imagem

`create-ai-campaign-job` le `onboarding_briefings` com `status = 'done'` e passa `briefing` / `insightsPecas` estruturados para `buildPrompt`. Mudanca no briefing altera `input_hash` e pode criar novo job de campanha.
