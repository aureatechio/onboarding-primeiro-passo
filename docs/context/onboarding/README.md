# Onboarding "Primeiro Passo" — Contexto do Modulo

## Escopo

Formulario multistep React SPA que guia o cliente apos a compra: desde boas-vindas ate envio de identidade visual (logo, site, Instagram) e ativacao de producao. Tudo vinculado a um `compra_id` (UUID). O briefing de campanha e gerado automaticamente pelo pipeline de enrichment (Perplexity + extracao de cores/fonte), nao por formulario manual do cliente.

## Referencia canonica

O documento **`docs/mapeamento-formulario-onboarding.md`** e a referencia completa com:
- Todos os campos de cada etapa (tipo, validacao, obrigatoriedade)
- Mapeamento campo do formulario → coluna no banco de dados
- Schema das tabelas (`onboarding_identity`, `onboarding_briefings`, `onboarding_enrichment_jobs`, `compras`, `ai_campaign_jobs`)
- Storage bucket, constraints, efeitos colaterais
- Endpoints e payloads

**Sempre consultar este documento antes de modificar qualquer campo do formulario ou funcao de onboarding.**

## Fluxo do Formulario

```
Etapa 1 (Hero) → Etapa 2 (4 slides + quiz) → Etapa 3 (4 slides + quiz + ativacao)
→ Etapa 4 (4 slides + quiz) → Etapa 5 (tela unica) → Etapa 6.1 (tela unica)
→ Etapa 6.2 (identidade visual: logo + site + Instagram) → Etapa Final (resumo + parabens)
```

No `App.jsx`, o indice de passo 7 renderiza `Etapa62` (nao existe mais `Etapa7.jsx`).

## Arquivos-chave

| Arquivo | Papel |
|---------|-------|
| `src/context/OnboardingContext.jsx` | Estado global, navegacao, persistencia localStorage, hidratacao |
| `src/copy.js` | Todos os textos (copy centralizada, unica fonte de verdade) |
| `src/pages/Etapa*.jsx` | Componentes de cada etapa |
| `src/components/` | Componentes compartilhados (PageLayout, NavButtons, QuizConfirmation, etc.) |
| `docs/mapeamento-formulario-onboarding.md` | Referencia canonica de campos e mapeamento DB |

## Tabelas do Banco

| Tabela | Relacao | Escrita por |
|--------|---------|-------------|
| `onboarding_progress` | 1:1 por `compra_id` (UNIQUE) | `save-onboarding-progress` |
| `onboarding_acceptances` | N:1 por `compra_id` | `save-onboarding-progress` |
| `onboarding_identity` | 1:1 por `compra_id` (UNIQUE) | `save-onboarding-identity` |
| `onboarding_identity_submissions` | N:1 por `compra_id` | `save-onboarding-identity` |
| `onboarding_logo_history` | N:1 por `compra_id` | `save-onboarding-identity`, funcoes admin de logo |
| `onboarding_briefings` | 1:1 por `compra_id` (UNIQUE) | `generate-campaign-briefing` (pipeline enrichment) ou `save-campaign-briefing` (legado) |
| `onboarding_enrichment_jobs` | 1:1 por `compra_id` (UNIQUE) | `onboarding-enrichment` |
| `enrichment_config` | Singleton (1 row) | `update-enrichment-config` / migration |
| `compras` | Tabela mestre | Somente leitura pelo onboarding |
| `ai_campaign_jobs` | N:1 por `compra_id` | `create-ai-campaign-job` (tipicamente fase 4 do enrichment) |

## Edge Functions

| Funcao | Tipo | JWT |
|--------|------|-----|
| `get-onboarding-data` | Leitura (hidratacao) | `--no-verify-jwt` (publico) |
| `save-onboarding-progress` | Escrita de progresso + aceites auditaveis | `--no-verify-jwt` (publico) |
| `save-onboarding-identity` | Escrita identidade + disparo enrichment condicional | `--no-verify-jwt` (publico) |
| `onboarding-enrichment` | Pipeline 4 fases (service role) | `--no-verify-jwt` + auth interna service role |
| `get-enrichment-status` | Leitura status job | `--no-verify-jwt` (publico) |
| `get-enrichment-config` | Leitura config singleton | `--no-verify-jwt` (publico) |
| `update-enrichment-config` | Escrita config | `--no-verify-jwt` + `x-admin-password` |
| `generate-campaign-briefing` | Briefing IA (Perplexity), chamado pelo enrichment | `--no-verify-jwt` (publico) |
| `save-campaign-briefing` | Legado / fluxos operacionais | `--no-verify-jwt` (publico) |

Todas as funcoes consumidas pelo SPA de onboarding sao **publicas** no gateway (`--no-verify-jwt`); `onboarding-enrichment` so aceita bearer **service role**.

## Storage

Bucket `onboarding-identity` (privado). Paths:
- `{compra_id}/logos/{uuid}.{ext}` — logo da marca versionado no historico
- `{compra_id}/img_{N}.{ext}` — imagens de campanha

## Pipeline pos-onboarding (enrichment)

Quando o cliente salva identidade com **`site_url` ou `instagram_handle`** preenchidos (`choice: add_now`), `save-onboarding-identity` dispara `onboarding-enrichment`. O pipeline:

1. Extrai paleta (`brand_palette`) — logo, site CSS ou fallback
2. Detecta fonte (`font_choice`) — CSS do site, Gemini ou fallback
3. Gera briefing via `generate-campaign-briefing` → `onboarding_briefings`
4. Chama `create-ai-campaign-job` (logo opcional; paleta e fonte obrigatorias para qualidade)

Detalhes: `supabase/functions/onboarding-enrichment/functionSpec.md` e `ai-step2/CONTRACT.md`.

## Elegibilidade

O formulario so carrega se a compra for elegivel:
```
(checkout_status === 'pago' || vendaaprovada === true) && clicksign_status === 'Assinado'
```
