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
| `update-perplexity-config` | Protegida | `requireRole(req, ["admin"])` | `supabase functions deploy update-perplexity-config --project-ref awqtzoefutnfmnbomujt` |

## NanoBanana (config)

| Função | JWT | Guard | Comando de deploy |
|--------|-----|-------|-------------------|
| `get-nanobanana-config` | Pública | Nenhum | `supabase functions deploy get-nanobanana-config --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `update-nanobanana-config` | Protegida | `requireRole(req, ["admin"])` | `supabase functions deploy update-nanobanana-config --project-ref awqtzoefutnfmnbomujt` |
| `read-nanobanana-reference` | Protegida | `requireRole(req, ["admin"])` | `supabase functions deploy read-nanobanana-reference --project-ref awqtzoefutnfmnbomujt` |

## AI Campaign Pipeline

| Função | JWT | Guard | Comando de deploy |
|--------|-----|-------|-------------------|
| `create-ai-campaign-job` | Pública | `requireServiceRole` (bearer service role) | `supabase functions deploy create-ai-campaign-job --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `get-ai-campaign-status` | Pública | Nenhum | `supabase functions deploy get-ai-campaign-status --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `get-ai-campaign-monitor` | Pública | Nenhum | `supabase functions deploy get-ai-campaign-monitor --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `save-campaign-briefing` | Pública | Nenhum | `supabase functions deploy save-campaign-briefing --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `generate-ai-campaign-image` | Pública | `requireServiceRole` (bearer service role) | `supabase functions deploy generate-ai-campaign-image --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `retry-ai-campaign-assets` | Protegida | `requireRole(req, ["admin", "operator"])` | `supabase functions deploy retry-ai-campaign-assets --project-ref awqtzoefutnfmnbomujt` |

## Onboarding

| Função | JWT | Guard | Comando de deploy |
|--------|-----|-------|-------------------|
| `get-onboarding-data` | Pública | Nenhum | `supabase functions deploy get-onboarding-data --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `save-onboarding-identity` | Pública | Nenhum | `supabase functions deploy save-onboarding-identity --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |

## Enrichment (onboarding automático)

| Função | JWT | Guard | Comando de deploy |
|--------|-----|-------|-------------------|
| `onboarding-enrichment` | Pública | `requireServiceRole` (bearer service role) | `supabase functions deploy onboarding-enrichment --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `get-enrichment-status` | Pública | Nenhum | `supabase functions deploy get-enrichment-status --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `get-enrichment-config` | Pública | Nenhum | `supabase functions deploy get-enrichment-config --project-ref awqtzoefutnfmnbomujt --no-verify-jwt` |
| `update-enrichment-config` | Protegida | `requireRole(req, ["admin"])` | `supabase functions deploy update-enrichment-config --project-ref awqtzoefutnfmnbomujt` |

## Notas

- **Pública + service role**: a função é deployada com `--no-verify-jwt` (Supabase não valida JWT no gateway), mas o código exige bearer `SUPABASE_SERVICE_ROLE_KEY` via `requireServiceRole`.
- **Protegida JWT + RBAC**: Supabase valida JWT antes do código executar, e o código valida permissões com `requireRole`. Deploy sem `--no-verify-jwt`.
- **`requireAdminPassword`**: helper legado de senha administrativa. Não usar como guard novo quando o fluxo for de usuário humano autenticado; preferir JWT + RBAC.
