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

O bucket `onboarding-identity` e privado. Uploads publicos de logo usam o padrao `{compra_id}/logos/{uuid}.{ext}` para preservar historico. Imagens legadas de campanha usam `{compra_id}/img_{N}.{ext}`. O campo `logo_path` no banco armazena o path relativo, nao a URL completa.

## 8. Site e Instagram: colunas dedicadas + campaign_notes legado

`onboarding_identity.site_url` e `onboarding_identity.instagram_handle` sao a fonte de verdade para o backend e enrichment. O frontend pode ainda enviar `campaign_notes` com texto concatenado por compatibilidade; a hidratacao usa as colunas `site_url` / `instagram_handle` quando presentes.

## 9. Aceites dos checkboxes persistem no banco

Os quizzes das Etapas 2, 3 e 4 e o checkbox da Etapa 6.1 continuam sendo validacao local para liberar o avanco, mas tambem sao persistidos em `onboarding_acceptances` quando a etapa e concluida. A tabela salva `item_key`, texto final exibido ao cliente, hash e timestamp. O progresso tambem e salvo em `onboarding_progress`; `localStorage` e apenas cache local/resume imediato.

## 10. Hidratacao usa 5 tabelas em paralelo

`get-onboarding-data` busca dados de `compras`, `clientes`, `celebridadesReferencia`, `segmentos` e `atendentes` em paralelo. Se qualquer lookup falhar, usa fallback (ex: "Cliente", "Celebridade contratada").

## 11. Atendente e determinado por faixa de valor

O atendente e selecionado automaticamente pela faixa de `valor_total` da compra na tabela `atendentes` (filtro por `valor_min`/`valor_max` + `ativo = true`). Nao e um campo editavel no formulario.

## 12. Fluxo publico sem JWT

O fluxo publico do cliente final nao usa autenticacao JWT. As Edge Functions usadas diretamente pelo formulario publico (`get-onboarding-data`, `save-onboarding-progress`, `save-onboarding-identity` e leituras/status publicos relacionados) sao publicas (`--no-verify-jwt`). A seguranca desse fluxo depende do UUID da compra ser nao-adivinhavel.

Funcoes administrativas ou operacionais no mesmo dominio de onboarding/dashboard podem exigir JWT + RBAC ou bearer service role, conforme a `functionSpec.md` de cada funcao.

## 13. Copy centralizada em copy.js

Todos os textos base do formulario vem de `src/copy.js`, com overrides publicados pelo CMS `onboarding_copy` quando existirem. Nunca hardcode textos diretamente nos componentes JSX.

## 14. Nunca editar migrations existentes

Ao alterar schema de `onboarding_identity` ou `onboarding_briefings`, sempre criar nova migration. Regra do projeto inteiro.

## 15. Briefing audio salvo como blob webm (legado)

O fluxo manual com audio em `save-campaign-briefing` grava WebM no browser. O caminho principal de briefing hoje e IA via enrichment (`generate-campaign-briefing`).

## 16. Um job de enrichment por compra

`onboarding_enrichment_jobs.compra_id` e UNIQUE. Reexecucoes fazem upsert no mesmo registro. Retry por fase via body `retry_from_phase` (ver functionSpec).

## 17. Briefing no prompt de imagem

`create-ai-campaign-job` le `onboarding_briefings` com `status = 'done'` e passa `briefing` / `insightsPecas` estruturados para `buildPrompt`. Mudanca no briefing altera `input_hash` e pode criar novo job de campanha.

## 18. brand_display_name tem precedencia sobre clientes.nome

`onboarding_identity.brand_display_name`, quando preenchido, e usado como nome da marca nos jobs IA em vez de `clientes.nome`. Afeta:

- `create-ai-campaign-job` → `clientName` passado para `buildPrompt` (NanoBanana)
- `onboarding-enrichment` → `companyName` passado para `generate-campaign-briefing` (Perplexity)

O campo e editavel no painel Monitor (aba `onboarding-data`) via edge `admin-update-onboarding-identity`. Se vazio, o fallback permanece: `clientes.nome || clientes.nome_fantasia`.

## 19. Historico de logos: 1 ativo por compra

`onboarding_logo_history` mantem todos os logos enviados por compra, incluindo upload publico da Etapa 6.2 (`source = public_onboarding`) e uploads admin (`source = admin`). Unique partial index garante exatamente 1 linha com `is_active = true` por `compra_id`. Ao deletar, o logo ativo e protegido (edge retorna 409 `ACTIVE_LOGO_PROTECTED`) — trocar ativo primeiro. `onboarding_identity.logo_path` sempre reflete o logo ativo atual.

## 20. Submissoes de identidade sao historicas

`onboarding_identity` representa o estado atual 1:1 por compra. Toda submissao da Etapa 6.2 tambem gera uma linha imutavel em `onboarding_identity_submissions`, inclusive `choice = later`, para auditoria do que foi enviado em cada tentativa.

## 21. Edits admin usam JWT

As 4 edges `admin-update-onboarding-identity`, `admin-upload-logo`, `admin-set-active-logo`, `admin-delete-logo-from-history` sao **protegidas** (verify_jwt habilitado). Frontend passa `Authorization: Bearer <access_token>` via helper `src/lib/admin-edge.js`, que tenta `refreshSession()` automaticamente em 401.

Outras funcoes administrativas de configuracao tambem usam JWT + RBAC, como `update-enrichment-config`. `get-ai-campaign-monitor` e `save-onboarding-identity` permanecem publicas no estado atual.
