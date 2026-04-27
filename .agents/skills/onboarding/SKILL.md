---
name: onboarding
description: Carrega o contexto canonico do modulo Onboarding "Primeiro Passo" antes de modificar formulario, identidade visual, briefing, pipeline de enrichment ou Edge Functions de onboarding. Use quando o pedido envolver Etapas (Etapa1Hero..EtapaFinal/TudoPronto), tabelas onboarding_identity/onboarding_briefings/onboarding_enrichment_jobs/onboarding_access, copy.js, OnboardingContext, ou Edge Functions get-onboarding-data, save-onboarding-identity, save-campaign-briefing, generate-campaign-briefing, onboarding-enrichment, get/update-enrichment-config, get-enrichment-status, set-onboarding-access, admin-update-onboarding-identity, admin-upload-logo, admin-set-active-logo, admin-delete-logo-from-history, create-ai-campaign-job.
---

# Onboarding "Primeiro Passo" — Skill de Contexto

Carrega o contexto canonico do modulo de onboarding antes de qualquer alteracao em formulario, identidade visual, briefing, pipeline de enrichment ou Edge Functions associadas.

## Quando acionar

Use esta skill quando o pedido envolver:
- Componentes do formulario: `src/pages/Etapa*.jsx`, `TudoPronto.jsx`
- Estado global: `src/context/OnboardingContext.jsx`
- Copy: `src/copy.js` (UNICA fonte de verdade para textos)
- Tabelas: `onboarding_identity`, `onboarding_briefings`, `onboarding_enrichment_jobs`, `onboarding_access`, `onboarding_access_events`, `onboarding_logo_history`
- Edge Functions publicas: `get-onboarding-data`, `save-onboarding-identity`, `save-campaign-briefing`, `generate-campaign-briefing`, `onboarding-enrichment`, `get-enrichment-status`, `get-enrichment-config`
- Edge Functions admin protegidas: `set-onboarding-access`, `update-enrichment-config`, `admin-update-onboarding-identity`, `admin-upload-logo`, `admin-set-active-logo`, `admin-delete-logo-from-history`
- Pipeline pos-onboarding (paleta, fonte, briefing, AI campaign): `create-ai-campaign-job`
- Bucket privado `onboarding-identity` e paths `{compra_id}/...`

## Gate obrigatorio antes de agir

1. Ler `docs/context/onboarding/DOC-READING-ORDER.md` para identificar a ordem de leitura conforme o tipo de tarefa.
2. Ler `docs/context/onboarding/README.md` (visao geral, fluxo, tabelas, funcoes).
3. Ler `docs/context/onboarding/BUSINESS-RULES.md` (regras criticas).
4. Ler `docs/mapeamento-formulario-onboarding.md` — referencia canonica de campos, validacoes e mapeamento campo → coluna.
5. Para tarefa em Edge Function que tenha `functionSpec.md`, ler a spec antes do `index.ts`.
6. Citar evidencias e respeitar todas as Business Rules.

## Mapa rapido do modulo

### Fluxo do formulario

```
Etapa 1 (Hero) -> Etapa 2 -> Etapa 3 -> Etapa 4 -> Etapa 5
-> Etapa 6.1 -> Etapa 6.2 (identidade visual) -> Etapa Final -> TudoPronto
```

`App.jsx` mapeia o indice 7 para `Etapa62.jsx`. Nao existe mais `Etapa7.jsx`.

### Tabelas

| Tabela | Cardinalidade | Quem escreve |
|--------|---------------|--------------|
| `onboarding_identity` | 1:1 por `compra_id` (UNIQUE) | `save-onboarding-identity`, `admin-update-onboarding-identity` |
| `onboarding_briefings` | 1:1 por `compra_id` (UNIQUE) | `generate-campaign-briefing` (via enrichment) ou `save-campaign-briefing` (legado) |
| `onboarding_enrichment_jobs` | 1:1 por `compra_id` (UNIQUE) | `onboarding-enrichment` |
| `onboarding_logo_history` | N:1 por `compra_id`, exatamente 1 ativo | `admin-upload-logo`, `admin-set-active-logo`, `admin-delete-logo-from-history` |
| `onboarding_access` / `onboarding_access_events` | Override e auditoria de elegibilidade | `set-onboarding-access` |
| `enrichment_config` | Singleton | `update-enrichment-config` |
| `compras`, `clientes`, `celebridadesReferencia`, `segmentos`, `atendentes` | Leitura para hidratacao | - |
| `ai_campaign_jobs` | N:1 por `compra_id` | `create-ai-campaign-job` |

### Edge Functions

| Funcao | Tipo | Deploy |
|--------|------|--------|
| `get-onboarding-data` | Publica (leitura/hidratacao) | `--no-verify-jwt` |
| `save-onboarding-identity` | Publica (escrita + dispara enrichment) | `--no-verify-jwt` |
| `save-campaign-briefing` | Publica (legado audio) | `--no-verify-jwt` |
| `generate-campaign-briefing` | Publica (Perplexity, chamada por enrichment) | `--no-verify-jwt` |
| `onboarding-enrichment` | Interna (pipeline 4 fases, exige bearer service role) | `--no-verify-jwt` |
| `get-enrichment-status` | Publica | `--no-verify-jwt` |
| `get-enrichment-config` | Publica | `--no-verify-jwt` |
| `update-enrichment-config` | Protegida (admin password) | `--no-verify-jwt` |
| `set-onboarding-access` | Protegida JWT + RBAC admin | sem `--no-verify-jwt` |
| `admin-update-onboarding-identity` / `admin-upload-logo` / `admin-set-active-logo` / `admin-delete-logo-from-history` | Protegidas JWT + RBAC | sem `--no-verify-jwt` |
| `create-ai-campaign-job` | Publica | `--no-verify-jwt` |

### Storage

Bucket privado `onboarding-identity`:
- `{compra_id}/logo.{ext}` — logo da marca (sempre reflete o ativo em `onboarding_logo_history`)
- `{compra_id}/img_{N}.{ext}` — imagens de campanha

## Business Rules nao-negociaveis

Resumo (sempre confirmar leitura completa em `docs/context/onboarding/BUSINESS-RULES.md`):

1. UNIQUE `compra_id` em `onboarding_identity`, `onboarding_briefings` e `onboarding_enrichment_jobs`. Sempre upsert com `onConflict: 'compra_id'`.
2. `choice ∈ {add_now, later}`. `production_path ∈ {standard, hybrid}`. Se `site_url` ou `instagram_handle` enviados, backend forca `production_path = 'standard'`.
3. Pipeline `onboarding-enrichment` so dispara quando `site_url` OU `instagram_handle` estao preenchidos.
4. Elegibilidade base: `(checkout_status === 'pago' || vendaaprovada === true) && clicksign_status === 'Assinado'`. `onboarding_access.status = 'allowed'` (nao expirado) atua como override; toda liberacao manual gera evento em `onboarding_access_events`.
5. `brand_display_name` (quando preenchido) tem precedencia sobre `clientes.nome` em jobs IA e briefing Perplexity.
6. `onboarding_logo_history` mantem exatamente 1 logo ativo por `compra_id`. Logo ativo nao pode ser deletado (HTTP 409 `ACTIVE_LOGO_PROTECTED`); trocar o ativo primeiro. `onboarding_identity.logo_path` reflete sempre o logo ativo.
7. SPA publico nao tem JWT — seguranca depende do UUID `compra_id` ser nao-adivinhavel. Edges admin usam JWT via `src/lib/admin-edge.js` (`refreshSession()` automatico em 401).
8. Quizzes (Etapas 2/3/4) sao validacao local; nao persistem no banco. Progresso fica em `localStorage`.
9. Hidratacao em `get-onboarding-data` usa 5 tabelas em paralelo com fallbacks; atendente e selecionado por faixa `valor_min/valor_max` + `ativo = true`.
10. Copy SEMPRE em `src/copy.js`. Nunca hardcode texto em JSX.
11. Nunca editar migrations existentes — sempre criar nova migration.
12. `create-ai-campaign-job` consome `onboarding_briefings` com `status = 'done'`; mudancas no briefing alteram `input_hash` e podem criar novo job.

## Padrao de resposta

Toda resposta da skill deve:
1. Citar quais docs foram lidos (`docs/context/onboarding/...` + `docs/mapeamento-formulario-onboarding.md` + functionSpec quando houver).
2. Identificar as tabelas/funcoes/etapas afetadas.
3. Listar as Business Rules que se aplicam ao pedido.
4. Apontar a estrategia de deploy correta para Edge Functions tocadas (publica vs protegida).
5. Sugerir alteracao em `docs/mapeamento-formulario-onboarding.md` quando o pedido alterar campos do formulario.
