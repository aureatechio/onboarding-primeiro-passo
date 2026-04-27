# Supabase - Edge Functions

## Padrao de seguranca

| Tipo | Deploy esperado | Guard esperado |
| --- | --- | --- |
| Publica onboarding | `--no-verify-jwt` | Validacao por `compra_id`/payload |
| Publica status/config | `--no-verify-jwt` | Somente leitura ou segredo proprio |
| Protegida dashboard | sem `--no-verify-jwt` | JWT + `_shared/rbac.ts` |
| Interna service role | depende do contrato | Bearer service role ou chamada backend |

Sempre ler `functionSpec.md`, quando existir, antes de alterar uma funcao.

## Inventario de funcoes

| Funcao | Guard no codigo | Tabelas/buckets principais | Observacao |
| --- | --- | --- | --- |
| `get-onboarding-data` | Publica | `compras`, `clientes`, `atendentes`, `celebridadesReferencia`, `segmentos`, `onboarding_access`, `onboarding_identity`, `onboarding_progress` | Hidratacao publica por `compra_id`. |
| `save-onboarding-identity` | Publica | `onboarding_identity`, bucket `onboarding-identity` | Salva identidade e pode disparar enrichment. |
| `save-onboarding-progress` | Publica | `onboarding_progress` | Persiste progresso por compra. |
| `onboarding-enrichment` | Publica/interna | `onboarding_enrichment_jobs`, `onboarding_identity`, `compras`, `clientes`, `celebridadesReferencia`, `segmentos`, bucket `onboarding-identity` | Pipeline de cores, fonte, briefing e campanha. |
| `get-enrichment-status` | Publica | `onboarding_enrichment_jobs` | Status publico por compra/job. |
| `get-enrichment-config` | Publica | `enrichment_config` | Le singleton de config. |
| `update-enrichment-config` | RBAC admin | `enrichment_config` | Escrita admin. |
| `generate-campaign-briefing` | Publica/interna | `onboarding_briefings` | Gera briefing via Perplexity. |
| `save-campaign-briefing` | Publica/legado | `onboarding_briefings`, bucket `onboarding-identity` | Fluxo legado/manual. |
| `create-ai-campaign-job` | Publica/interna | `ai_campaign_jobs`, `ai_campaign_assets`, `ai_campaign_errors`, `onboarding_identity`, `onboarding_briefings`, `clientes`, `celebridadesReferencia`, bucket `ai-campaign-assets` | Cria job e assets de campanha. |
| `get-ai-campaign-status` | Publica | `ai_campaign_jobs`, `ai_campaign_assets`, `ai_campaign_errors`, bucket `ai-campaign-assets` | Status por job/compra. |
| `get-ai-campaign-monitor` | Sem RBAC local observado | `ai_campaign_*`, `compras`, `clientes`, `celebridadesReferencia`, `onboarding_*` | Monitor interno; revisar deploy/guard antes de expor. |
| `generate-ai-campaign-image` | Publica/interna | `ai_campaign_assets`, `ai_campaign_jobs`, `ai_campaign_errors`, bucket `ai-campaign-assets` | Worker de imagem. |
| `retry-ai-campaign-assets` | RBAC admin/operator | `ai_campaign_jobs`, `ai_campaign_assets` | Retry operacional. |
| `get-perplexity-config` | Publica/leitora | `perplexity_config` | Le config. |
| `update-perplexity-config` | RBAC admin | `perplexity_config` | Escrita admin. |
| `test-perplexity-briefing` | Publica/teste | `perplexity_test_runs` | Execucao de teste. |
| `suggest-briefing-seed` | Publica/interna | APIs externas | Sugere seed para briefing. |
| `discover-company-sources` | Publica/interna | APIs externas | Descoberta de fontes. |
| `get-nanobanana-config` | Publica/leitora | `nanobanana_config`, bucket `nanobanana-references` | Le config e referencias. |
| `update-nanobanana-config` | RBAC admin | `nanobanana_config`, bucket `nanobanana-references` | Escrita admin. |
| `read-nanobanana-reference` | RBAC admin | bucket `nanobanana-references` | Le referencia privada. |
| `get-onboarding-copy` | Publica | `onboarding_copy` | Copy CMS publico. |
| `update-onboarding-copy` | RBAC admin | `onboarding_copy`, `onboarding_copy_versions` | Publicacao admin. |
| `admin-update-onboarding-identity` | RBAC admin | `onboarding_identity` | Edicao admin do onboarding. |
| `admin-upload-logo` | RBAC admin | `onboarding_identity`, `onboarding_logo_history`, bucket `onboarding-identity` | Upload admin de logo. |
| `admin-set-active-logo` | RBAC admin | `onboarding_identity`, `onboarding_logo_history` | Alterna logo ativa. |
| `admin-delete-logo-from-history` | RBAC admin | `onboarding_logo_history`, bucket `onboarding-identity` | Remove logo historica. |
| `set-onboarding-access` | RBAC admin | `compras`, `onboarding_access` | Override de acesso. |
| `list-users` | RBAC admin | Auth Admin, `profiles`, `user_roles` | Lista usuarios internos. |
| `record-dashboard-activity` | RBAC admin/operator/viewer | `dashboard_user_activity` | Registra login e ultima atividade especificos deste dashboard. |
| `invite-user` | RBAC admin | Auth Admin, `profiles`, `user_roles` | Convite por Supabase Auth. |
| `resend-user-invite` | RBAC admin | Auth Admin, `profiles` | Reenvia convite pendente sem alterar role/status. |
| `update-user-role` | RBAC admin | `user_roles` | Altera role. |
| `set-user-status` | RBAC admin | Auth Admin, `profiles` | Ativa/desativa usuario. |
| `delete-user` | RBAC admin | Auth Admin | Remove usuario Auth; cascata limpa perfil/role. |

## Shared helpers relevantes

| Arquivo | Papel |
| --- | --- |
| `_shared/cors.ts` | Headers CORS padronizados, incluindo auth e admin headers. |
| `_shared/auth.ts` | Valida JWT humano e rejeita token service role em rotas de usuario. |
| `_shared/rbac.ts` | Carrega `user_roles` e `profiles.status` para RBAC. |
| `_shared/user-management.ts` | Validadores e protecoes de gestao de usuarios. |
| `_shared/service-role-auth.ts` | Validacao de bearer service role quando aplicavel. |
| `_shared/activity-logger.ts` | Escrita em `activity_logs`. |
| `_shared/audit-logger.ts` | Escrita em `checkout_audit_log`. |
| `_shared/enrichment/*` | Scraping, cores, fontes e Gemini. |
| `_shared/perplexity/*` | Cliente, prompts, discover e normalize. |
| `_shared/nanobanana/config.ts` | Config e defaults de NanoBanana. |

## Riscos conhecidos

- Funcoes publicas que usam service role precisam validar entrada com rigor.
- Funcoes de monitor/config podem parecer leitura inofensiva, mas podem expor
  dados de CRM se deployadas publicamente.
- Buckets privados devem retornar signed URLs, nao caminhos publicos diretos.
- Mudanca em nomes de tabela/coluna do CRM impacta varias funcoes ao mesmo tempo.
