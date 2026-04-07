# Onboarding "Primeiro Passo" — Contexto do Modulo

## Escopo

Formulario multistep React SPA que guia o cliente apos a compra: desde boas-vindas ate envio de identidade visual, briefing de campanha e ativacao de producao. Tudo vinculado a um `compra_id` (UUID).

## Referencia canonica

O documento **`docs/mapeamento-formulario-onboarding.md`** e a referencia completa com:
- Todos os campos de cada etapa (tipo, validacao, obrigatoriedade)
- Mapeamento campo do formulario → coluna no banco de dados
- Schema das tabelas (`onboarding_identity`, `onboarding_briefings`, `compras`, `ai_campaign_jobs`)
- Storage bucket, constraints, efeitos colaterais
- Endpoints e payloads

**Sempre consultar este documento antes de modificar qualquer campo do formulario ou funcao de onboarding.**

## Fluxo do Formulario

```
Etapa 1 (Hero) → Etapa 2 (4 slides + quiz) → Etapa 3 (4 slides + quiz + ativacao)
→ Etapa 4 (4 slides + quiz) → Etapa 5 (tela unica) → Etapa 6.1 (tela unica)
→ Etapa 6.2 (identidade visual) → Etapa 7 (briefing campanha) → Etapa Final (resumo + parabens)
```

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
| `onboarding_identity` | 1:1 por `compra_id` (UNIQUE) | `save-onboarding-identity` |
| `onboarding_briefings` | 1:1 por `compra_id` (UNIQUE) | `save-campaign-briefing` |
| `compras` | Tabela mestre | Somente leitura pelo onboarding |
| `ai_campaign_jobs` | N:1 por `compra_id` | `create-ai-campaign-job` (automatico) |

## Edge Functions

| Funcao | Tipo | JWT |
|--------|------|-----|
| `get-onboarding-data` | Leitura (hidratacao) | `--no-verify-jwt` (publico) |
| `save-onboarding-identity` | Escrita (identidade + production_path) | `--no-verify-jwt` (publico) |
| `save-campaign-briefing` | Escrita (briefing texto/audio) | `--no-verify-jwt` (publico) |
| `generate-campaign-briefing` | Escrita (briefing IA via Perplexity) | `--no-verify-jwt` (publico) |

Todas as funcoes de onboarding sao **publicas** (`--no-verify-jwt`): o SPA nao tem autenticacao JWT.

## Storage

Bucket `onboarding-identity` (privado). Paths:
- `{compra_id}/logo.{ext}` — logo da marca
- `{compra_id}/img_{N}.{ext}` — imagens de campanha

## Pipeline pos-onboarding

Quando `production_path = 'standard'` e salvo em `onboarding_identity`, a funcao `save-onboarding-identity` dispara automaticamente `create-ai-campaign-job`, que inicia a geracao de assets IA. O pipeline e documentado em `ai-step2/CONTRACT.md`.

## Elegibilidade

O formulario so carrega se a compra for elegivel:
```
(checkout_status === 'pago' || vendaaprovada === true) && clicksign_status === 'Assinado'
```
