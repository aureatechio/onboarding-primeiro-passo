# Onboarding "Primeiro Passo" — Regras de Negocio

Regras criticas extraidas do codigo e do banco. Violar qualquer uma pode quebrar o fluxo ou corromper dados.

## 1. Uma identidade por compra (UNIQUE constraint)

`onboarding_identity.compra_id` tem constraint UNIQUE. O backend faz UPSERT por `compra_id`. Nunca inserir diretamente sem usar `onConflict: 'compra_id'`.

## 2. Um briefing por compra (UNIQUE constraint)

`onboarding_briefings.compra_id` tem constraint UNIQUE. Mesma regra de upsert.

## 3. Choice deve ser 'add_now' ou 'later'

O campo `onboarding_identity.choice` aceita apenas `add_now` e `later`. Validacao enforced no backend.

## 4. Production path aceita apenas 'standard' ou 'hybrid'

O campo `onboarding_identity.production_path` aceita apenas `standard` e `hybrid`. Qualquer outro valor e ignorado silenciosamente.

## 5. Efeito colateral: production_path 'standard' dispara AI job

Quando `save-onboarding-identity` salva `production_path = 'standard'`, ele chama automaticamente `create-ai-campaign-job`. Isso significa que trocar o production_path para standard pode disparar geracao de imagens IA.

## 6. Elegibilidade bloqueia onboarding

O formulario nao carrega se a compra nao for elegivel. A regra e:
`(checkout_status === 'pago' || vendaaprovada === true) && clicksign_status === 'Assinado'`

## 7. Storage: bucket privado, paths por compra_id

O bucket `onboarding-identity` e privado. Todos os uploads usam o padrao `{compra_id}/logo.{ext}` ou `{compra_id}/img_{N}.{ext}`. O campo `logo_path` no banco armazena o path relativo, nao a URL completa.

## 8. Modo simplificado concatena site e instagram em campaign_notes

No modo simplificado da Etapa 6.2, site e instagram sao concatenados em `campaign_notes` no formato `"Site: ... | Instagram: ..."`. Nao ha colunas separadas para eles.

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

## 15. Briefing audio salvo como blob webm

O audio do briefing e gravado no browser como WebM e enviado via FormData com filename `briefing.webm`. O backend salva no storage e registra `audio_path` + `audio_duration_sec`.
