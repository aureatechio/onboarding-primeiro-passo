# Checklist de Deploy — Classificação JWT de Edge Functions

> Referência rápida para classificar cada Edge Function como **pública** (`--no-verify-jwt`) ou **protegida** (JWT padrão) antes do deploy.
>
> **Regra:** sempre incluir `--project-ref awqtzoefutnfmnbomujt`.

## Perplexity (geração)

| Função | JWT | Guard | Comando de deploy |
|--------|-----|-------|-------------------|
| `generate-campaign-briefing` | Pública | Nenhum (chamada pelo frontend) | `supabase functions deploy generate-campaign-briefing --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `test-perplexity-briefing` | Pública | Nenhum (ferramenta de teste) | `supabase functions deploy test-perplexity-briefing --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `suggest-briefing-seed` | Pública | Nenhum (chamada pelo frontend) | `supabase functions deploy suggest-briefing-seed --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `discover-company-sources` | Pública | Nenhum (chamada pelo frontend) | `supabase functions deploy discover-company-sources --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |

## Perplexity (config)

| Função | JWT | Guard | Comando de deploy |
|--------|-----|-------|-------------------|
| `get-perplexity-config` | Pública | Nenhum (leitura, dados não sensíveis exceto api_key mascarada) | `supabase functions deploy get-perplexity-config --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `update-perplexity-config` | Pública | `requireAdminPassword` (`x-admin-password`) | `supabase functions deploy update-perplexity-config --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |

## NanoBanana (config)

| Função | JWT | Guard | Comando de deploy |
|--------|-----|-------|-------------------|
| `get-nanobanana-config` | Pública | Nenhum | `supabase functions deploy get-nanobanana-config --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `update-nanobanana-config` | Pública | `requireAdminPassword` (`x-admin-password`) | `supabase functions deploy update-nanobanana-config --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `read-nanobanana-reference` | Pública | `requireAdminPassword` (`x-admin-password`) | `supabase functions deploy read-nanobanana-reference --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |

## Aurea Garden (Post Gen + Post Turbo)

| Função | JWT | Guard | Comando de deploy |
|--------|-----|-------|-------------------|
| `post-gen-generate` | Pública | Nenhum | `supabase functions deploy post-gen-generate --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `post-turbo-generate` | Pública | Nenhum | `supabase functions deploy post-turbo-generate --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `list-garden-jobs` | Pública | Nenhum | `supabase functions deploy list-garden-jobs --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `get-garden-options` | Pública | Nenhum | `supabase functions deploy get-garden-options --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `get-garden-job` | Pública | Nenhum | `supabase functions deploy get-garden-job --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |

## AI Campaign Pipeline

| Função | JWT | Guard | Comando de deploy |
|--------|-----|-------|-------------------|
| `create-ai-campaign-job` | Pública | Nenhum | `supabase functions deploy create-ai-campaign-job --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `get-ai-campaign-status` | Pública | Nenhum | `supabase functions deploy get-ai-campaign-status --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `get-ai-campaign-monitor` | Pública | Nenhum | `supabase functions deploy get-ai-campaign-monitor --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `save-campaign-briefing` | Pública | Nenhum | `supabase functions deploy save-campaign-briefing --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `generate-ai-campaign-image` | Pública | `requireServiceRole` (bearer service role) | `supabase functions deploy generate-ai-campaign-image --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `retry-ai-campaign-assets` | Pública | Nenhum | `supabase functions deploy retry-ai-campaign-assets --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |

## Onboarding

| Função | JWT | Guard | Comando de deploy |
|--------|-----|-------|-------------------|
| `get-onboarding-data` | Pública | Nenhum | `supabase functions deploy get-onboarding-data --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `save-onboarding-identity` | Pública | Nenhum | `supabase functions deploy save-onboarding-identity --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |

## OMIE

| Função | JWT | Guard | Comando de deploy |
|--------|-----|-------|-------------------|
| `omie-orchestrator` | Protegida | JWT padrão | `supabase functions deploy omie-orchestrator --project-ref awqtzoefutnfmnbomujt` |
| `omie-create-os` | Protegida | JWT padrão | `supabase functions deploy omie-create-os --project-ref awqtzoefutnfmnbomujt` |
| `omie-upsert-os` | Protegida | JWT padrão | `supabase functions deploy omie-upsert-os --project-ref awqtzoefutnfmnbomujt` |
| `omie-upsert-os-batch` | Protegida | JWT padrão | `supabase functions deploy omie-upsert-os-batch --project-ref awqtzoefutnfmnbomujt` |
| `omie-upsert-service` | Protegida | JWT padrão | `supabase functions deploy omie-upsert-service --project-ref awqtzoefutnfmnbomujt` |
| `omie-push-vendedores` | Protegida | JWT padrão | `supabase functions deploy omie-push-vendedores --project-ref awqtzoefutnfmnbomujt` |
| `omie-sync-vendedores` | Protegida | JWT padrão | `supabase functions deploy omie-sync-vendedores --project-ref awqtzoefutnfmnbomujt` |
| `get-omie-nfse-config` | Protegida | JWT padrão | `supabase functions deploy get-omie-nfse-config --project-ref awqtzoefutnfmnbomujt` |
| `update-omie-nfse-config` | Protegida | JWT padrão | `supabase functions deploy update-omie-nfse-config --project-ref awqtzoefutnfmnbomujt` |

## Notas

- **Pública + Guard**: a função é deployada com `--no-verify-jwt` (Supabase não valida JWT na edge), mas o código valida acesso internamente via `requireAdminPassword` ou `requireServiceRole`.
- **Protegida**: Supabase valida JWT antes do código executar. Sem `--no-verify-jwt` no deploy.
- **Env var `ADMIN_PASSWORD`**: usada por `requireAdminPassword`. Default: `megazord` — trocar em produção.
