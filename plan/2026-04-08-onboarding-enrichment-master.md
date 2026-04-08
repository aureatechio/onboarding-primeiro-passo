# Onboarding Enrichment — Plano Orquestrador

**Spec de referencia**: `supabase/functions/onboarding-enrichment/functionSpec.md`

## Contexto

O fluxo de onboarding mudou: o cliente nao preenche mais briefing manualmente. Agora envia apenas logo, site e Instagram. O pipeline de enriquecimento automatico (Perplexity + Gemini) faz o resto: extrai cores, detecta fonte, gera briefing e dispara a campanha de criativos IA.

Este plano orquestra a implementacao completa em 5 blocos sequenciais com dependencias explicitas.

## Blocos de implementacao


| Bloco | Nome                    | Plano                                            | Dependencia  | Estimativa | Status       |
| ----- | ----------------------- | ------------------------------------------------ | ------------ | ---------- | ------------ |
| 1     | Schema e infraestrutura | `2026-04-08-enrichment-bloco1-schema.md`         | Nenhuma      | Rapido     | **Concluido** |
| 2     | Modulos shared          | `2026-04-08-enrichment-bloco2-shared.md`         | Bloco 1      | Medio      | **Concluido** |
| 3     | Edge Functions          | `2026-04-08-enrichment-bloco3-edge-functions.md` | Blocos 1 + 2 | Grande     | **Concluido** |
| 4     | Frontend                | `2026-04-08-enrichment-bloco4-frontend.md`       | Blocos 1 + 3 | Medio      | **Concluido** |
| 5     | Integracao e teste      | `2026-04-08-enrichment-bloco5-integracao.md`     | Blocos 1-4   | Medio      | **Concluido (doc + script cleanup)** — E2E manual no ambiente conforme necessario |


## Grafo de dependencia

```
Bloco 1 (Schema)
  ├── Bloco 2 (Shared modules)
  │     └── Bloco 3 (Edge Functions)
  │           ├── Bloco 4 (Frontend)
  │           └── Bloco 5 (Integracao)
  └── Bloco 4 (Frontend — parcialmente paralelo ao Bloco 3)
```

Blocos 2 e 4 podem iniciar em paralelo apos o Bloco 1, mas o Bloco 4 depende do Bloco 3 para o indicador de enrichment no EtapaFinal. O Bloco 5 so inicia apos todos os anteriores.

## Criterios de conclusao por bloco

### Bloco 1 — Schema e infraestrutura

- Migration aplicada em producao (3 tabelas/alteracoes)
- `enrichment_config` com registro default inserido
- `_shared/enrichment/config.ts` com loader + cache TTL funcionando

### Bloco 2 — Modulos shared

- `color-extractor.ts` extrai paleta de imagem (algoritmo + Gemini)
- `css-scraper.ts` faz fetch e parse de CSS (cores + fontes)
- `font-detector.ts` detecta e valida fonte (CSS + Gemini)
- Testes unitarios dos 3 modulos passando

### Bloco 3 — Edge Functions

- `onboarding-enrichment` deployed e funcional (4 fases + retry)
- `get-enrichment-status` deployed e retornando status correto
- `get-enrichment-config` + `update-enrichment-config` deployed
- `save-onboarding-identity` aceita `site_url`/`instagram_handle` e dispara enrichment
- `create-ai-campaign-job` consome briefing e aceita job sem logo

### Bloco 4 — Frontend

- `Etapa62` envia campos separados
- `OnboardingContext` hidrata das novas colunas
- `EtapaFinal` sem referencia a production_path/briefingMode
- `Etapa7.jsx` removido

### Bloco 5 — Integracao e teste

- `prompt-builder.ts` consome campos do briefing
- Teste end-to-end com compra real (com logo + site + instagram)
- Teste end-to-end sem logo (apenas site)
- Teste de retry por fase via endpoint
- Documentacao atualizada (CLAUDE.md, CONTRACT.md, mapeamento)

## Riscos e mitigacoes


| Risco                                       | Impacto                         | Mitigacao                                                   |
| ------------------------------------------- | ------------------------------- | ----------------------------------------------------------- |
| Scraping de site falha em sites com SPA/CSR | Fase 2 (fonte) nao extrai dados | Fallback para Gemini suggestion; timeout curto configuravel |
| Gemini Vision retorna cores imprecisas      | Paleta de baixa qualidade       | Waterfall: algoritmo primeiro, Gemini como validacao        |
| Perplexity indisponivel                     | Fase 3 falha                    | Pipeline continua sem briefing; retry manual via monitor    |
| `create-ai-campaign-job` rejeita sem logo   | Fase 4 falha                    | Relaxar gate de logo no Bloco 3                             |
| Volume alto de scraping                     | Rate limiting por sites destino | User-agent identificavel + timeout curto + 1 retry          |


## Rollback

Cada bloco e independentemente revertivel:

- Bloco 1: migrations sao aditivas (novas colunas/tabelas), nao quebram nada existente
- Bloco 3: `save-onboarding-identity` pode manter trigger antigo (direto para campaign) via feature flag
- Bloco 4: frontend pode ser revertido sem afetar backend

## Deploy order

1. Migrations (Bloco 1) — via `supabase db push`
2. Edge Functions novas (Bloco 3) — nao tem side effect ate o trigger ser ativado
3. Edge Functions alteradas (`save-onboarding-identity`, `create-ai-campaign-job`) — ativa o pipeline
4. Frontend (Bloco 4) — deploy via Vercel

