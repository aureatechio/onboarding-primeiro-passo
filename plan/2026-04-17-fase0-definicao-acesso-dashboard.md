# Fase 0 - Definicao de Acesso do Dashboard (Execucao)

Data: 2026-04-17
Status: concluido
Resultado: GO para Fase 1
Origem: plano de execucao da Fase 0 (autenticacao dashboard)

## 1) Preparacao e baseline (Dia 1)

### Contexto consolidado (fontes lidas)

1. `.context/modules/onboarding/DOC-READING-ORDER.md`
2. `.context/modules/onboarding/README.md`
3. `.context/modules/onboarding/BUSINESS-RULES.md`
4. `.context/modules/aurea-studio/DOC-READING-ORDER.md`
5. `.context/modules/aurea-studio/README.md`
6. `.context/modules/aurea-studio/BUSINESS-RULES.md`
7. `ai-step2/CONTRACT.md`
8. `docs/mapeamento-formulario-onboarding.md`

### Rotas internas inventariadas

| Rota | Arquivo principal | Acoes de UI mapeadas |
|---|---|---|
| `/ai-step2/monitor` | `src/pages/AiStep2Monitor/index.jsx` | listar jobs, abrir detalhe, retry assets, editar identidade/briefing, liberar onboarding |
| `/ai-step2/perplexity-config` | `src/pages/AiStep2Monitor/PerplexityConfigPage.jsx` | ler config, testar prompt, descobrir fontes, sugerir seed, salvar config |
| `/ai-step2/nanobanana-config` | `src/pages/AiStep2Monitor/NanoBananaConfigPage.jsx` | ler config, ler imagem referencia, salvar config |
| `/ai-step2/post-gen` | `src/pages/AiStep2Monitor/PostGenPage.jsx` | gerar criativo, polling de job, download |
| `/ai-step2/post-turbo` | `src/pages/AiStep2Monitor/PostTurboPage.jsx` | gerar criativo, polling de job, download |
| `/ai-step2/gallery` | `src/pages/AiStep2Monitor/GardenGalleryPage.jsx` | listar jobs, filtrar, abrir lightbox, download |
| `/copy-editor` | `src/pages/CopyEditor/index.jsx` | ler copy publicada, editar copy, publicar nova versao |

### Endpoints consumidos pelo dashboard e sensibilidade

| Endpoint | Sensibilidade |
|---|---|
| `get-ai-campaign-monitor` | alta |
| `retry-ai-campaign-assets` | alta |
| `set-onboarding-access` | alta |
| `save-onboarding-identity` | alta |
| `save-campaign-briefing` | alta |
| `get-perplexity-config` | media |
| `update-perplexity-config` | alta |
| `discover-company-sources` | media |
| `suggest-briefing-seed` | media |
| `test-perplexity-briefing` | media |
| `get-nanobanana-config` | media |
| `update-nanobanana-config` | alta |
| `read-nanobanana-reference` | alta |
| `get-garden-options` | baixa |
| `post-gen-generate` | media |
| `post-turbo-generate` | media |
| `get-garden-job` | media |
| `list-garden-jobs` | media |
| `get-onboarding-copy` | baixa |
| `update-onboarding-copy` | alta |
| `get-onboarding-data` | alta |

## 2) Matriz de permissao (Dia 2)

Contrato RBAC inicial:

```ts
export type Role = 'admin' | 'supervisor' | 'operacao' | 'leitura'
```

Perfil funcional:
- `leitura`: consulta painis e dados sem escrita.
- `operacao`: executa operacao diaria (geracao/retry/edicao operacional).
- `supervisor`: valida e executa acoes de governanca operacional.
- `admin`: controla configuracoes sensiveis e parametros de sistema.

Contrato de decisao por acao:

```ts
export type ActionPolicy = {
  acao: string
  endpoint: string
  papel_minimo: Role
  justificativa: string
  risco: 'baixa' | 'media' | 'alta'
}
```

### Matriz unica (rota -> acao -> endpoint -> papel minimo -> risco)

| Rota | Acao | Endpoint | Papel minimo | Risco | Justificativa |
|---|---|---|---|---|---|
| `/ai-step2/monitor` | Ver lista/detalhe de jobs | `get-ai-campaign-monitor` | `leitura` | alta | leitura operacional exige acesso amplo de diagnostico |
| `/ai-step2/monitor` | Retry de asset/job | `retry-ai-campaign-assets` | `operacao` | alta | acao operacional com custo e impacto em pipeline |
| `/ai-step2/monitor` | Editar identidade no monitor | `save-onboarding-identity` (interno) | `operacao` | alta | escrita em identidade com impacto direto no pipeline |
| `/ai-step2/monitor` | Editar briefing no monitor | `save-campaign-briefing` | `operacao` | alta | escrita de briefing e trigger de geracao |
| `/ai-step2/monitor` | Liberar/revogar onboarding | `set-onboarding-access` | `supervisor` | alta | override de elegibilidade comercial/contrato |
| `/ai-step2/perplexity-config` | Ler config | `get-perplexity-config` | `leitura` | media | leitura para troubleshooting |
| `/ai-step2/perplexity-config` | Descobrir fontes | `discover-company-sources` | `operacao` | media | acao operacional de apoio a briefing |
| `/ai-step2/perplexity-config` | Sugerir seed | `suggest-briefing-seed` | `operacao` | media | acao operacional de apoio a briefing |
| `/ai-step2/perplexity-config` | Executar teste de briefing | `test-perplexity-briefing` | `operacao` | media | diagnostico tecnico com consumo de provider |
| `/ai-step2/perplexity-config` | Salvar config/perfil do provider | `update-perplexity-config` | `admin` | alta | altera parametros globais e chave de provider |
| `/ai-step2/nanobanana-config` | Ler config | `get-nanobanana-config` | `leitura` | media | leitura para operacao |
| `/ai-step2/nanobanana-config` | Ler imagem de referencia via IA | `read-nanobanana-reference` | `supervisor` | alta | acao sensivel de direcao criativa |
| `/ai-step2/nanobanana-config` | Salvar config do gerador | `update-nanobanana-config` | `admin` | alta | altera regras globais de geracao |
| `/ai-step2/post-gen` | Carregar opcoes | `get-garden-options` | `operacao` | baixa | lookup operacional |
| `/ai-step2/post-gen` | Disparar geracao | `post-gen-generate` | `operacao` | media | cria job e usa provider |
| `/ai-step2/post-gen` | Polling de job | `get-garden-job` | `operacao` | media | monitoramento de job em execucao |
| `/ai-step2/post-turbo` | Carregar opcoes | `get-garden-options` | `operacao` | baixa | lookup operacional |
| `/ai-step2/post-turbo` | Carregar direcoes atuais | `get-nanobanana-config` | `operacao` | media | depende de config global |
| `/ai-step2/post-turbo` | Disparar geracao | `post-turbo-generate` | `operacao` | media | cria job e usa provider |
| `/ai-step2/post-turbo` | Polling de job | `get-garden-job` | `operacao` | media | monitoramento de job em execucao |
| `/ai-step2/gallery` | Listar jobs | `list-garden-jobs` | `leitura` | media | consulta de historico operacional |
| `/ai-step2/gallery` | Download de resultado | `list-garden-jobs` (signed URL) | `leitura` | media | acesso a output de campanha |
| `/copy-editor` | Ler copy publicada | `get-onboarding-copy` | `leitura` | baixa | conteudo publico do onboarding |
| `/copy-editor` | Publicar nova versao de copy | `update-onboarding-copy` | `supervisor` | alta | altera copy de producao |
| `/ai-step2/perplexity-config` | Prefill de compra para testes | `get-onboarding-data` (interno) | `operacao` | alta | leitura de dados de compra/onboarding |

## 3) Modelo de identidade e sessao (Dia 3)

Entregavel ADR: `docs/adr/2026-04-17-adr-auth-dashboard-supabase-session.md`

Decisao:
- Auth do dashboard via Supabase Auth (JWT + refresh token).
- Regras fechadas para 401/403/logout/reauth de acoes criticas.
- Sem impacto no onboarding publico (continua sem login do cliente final).

## 4) Contrato de segregacao publico x interno (Dia 4)

Contrato de classe por endpoint:

```ts
export type EndpointClass = 'public-only' | 'internal-only' | 'hybrid'
```

### Catalogo por endpoint

| Endpoint | Classe | Decisao alvo |
|---|---|---|
| `get-ai-campaign-monitor` | `internal-only` | exigir sessao + RBAC |
| `retry-ai-campaign-assets` | `internal-only` | exigir sessao + RBAC |
| `set-onboarding-access` | `internal-only` | migrar de `x-admin-password` para RBAC |
| `save-onboarding-identity` | `hybrid` | manter publico para onboarding e criar variante interna para monitor |
| `save-campaign-briefing` | `internal-only` | exigir sessao + RBAC (legado operacional) |
| `get-perplexity-config` | `internal-only` | exigir sessao + RBAC leitura |
| `update-perplexity-config` | `internal-only` | exigir sessao + RBAC admin |
| `discover-company-sources` | `internal-only` | exigir sessao + RBAC operacao |
| `suggest-briefing-seed` | `internal-only` | exigir sessao + RBAC operacao |
| `test-perplexity-briefing` | `internal-only` | exigir sessao + RBAC operacao |
| `get-nanobanana-config` | `internal-only` | exigir sessao + RBAC leitura |
| `update-nanobanana-config` | `internal-only` | exigir sessao + RBAC admin |
| `read-nanobanana-reference` | `internal-only` | exigir sessao + RBAC supervisor |
| `get-garden-options` | `internal-only` | exigir sessao + RBAC operacao |
| `post-gen-generate` | `internal-only` | exigir sessao + RBAC operacao |
| `post-turbo-generate` | `internal-only` | exigir sessao + RBAC operacao |
| `get-garden-job` | `internal-only` | exigir sessao + RBAC operacao |
| `list-garden-jobs` | `internal-only` | exigir sessao + RBAC leitura |
| `get-onboarding-copy` | `public-only` | manter publico (copy publicada e fallback) |
| `update-onboarding-copy` | `internal-only` | migrar de `x-admin-password` para RBAC |
| `get-onboarding-data` | `hybrid` | manter publico para onboarding e criar variante interna detalhada |

## 5) Plano de migracao por lote (Dia 4)

| Lote | Objetivo | Endpoints |
|---|---|---|
| Lote 1 | Fechar superficie critica do monitor | `get-ai-campaign-monitor`, `retry-ai-campaign-assets`, `set-onboarding-access`, `update-onboarding-copy` |
| Lote 2 | Hardening de configuracoes IA | `get/update-perplexity-config`, `get/update-nanobanana-config`, `read-nanobanana-reference` |
| Lote 3 | Isolar operacao Garden | `get-garden-options`, `post-gen-generate`, `post-turbo-generate`, `get-garden-job`, `list-garden-jobs` |
| Lote 4 | Separar endpoints hibridos | `save-onboarding-identity`, `get-onboarding-data` (publico x interno) |
| Lote 5 | Ajustes finais de legados | `save-campaign-briefing` + remocao total de `x-admin-password` do frontend |

## 6) Gate de aprovacao da Fase 0 (Dia 5)

Checklist de completude:
- [x] 100% das rotas internas mapeadas com papel minimo.
- [x] 100% dos endpoints usados no dashboard classificados (`public-only`, `internal-only`, `hybrid`).
- [x] Acoes criticas cobertas com regra explicita (`retry`, `update config`, `update copy`, `set access`, `monitor detail`).
- [x] Onboarding publico preservado explicitamente no contrato.
- [x] Fase 1/2/3 sem decisoes pendentes de acesso.

Pendencias bloqueantes:
- Nenhuma.

Decisao final:
- **GO para Fase 1**.
