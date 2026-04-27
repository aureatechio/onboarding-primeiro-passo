# Supabase - Inventario de Banco

Snapshot remoto consultado em `2026-04-27 15:39 BRT`.

Metodo usado:

- PostgREST OpenAPI (`/rest/v1/`) para objetos expostos no schema `public`.
- Storage API (`/storage/v1/bucket`) para buckets.
- Codigo e migrations locais para triggers, helpers, policies e ownership.

Limite conhecido: PostgREST nao mostra todos os objetos internos de schemas como
`auth`, `storage`, `extensions` ou detalhes completos de RLS/triggers. Para uma
auditoria formal, complementar com SQL direto em `pg_catalog`.

## Resumo remoto

| Item | Quantidade |
| --- | ---: |
| Objetos expostos em `public` via PostgREST | 265 |
| Buckets Storage | 29 |
| Tabelas/objetos proprios deste app mapeados | 19 |
| Objetos `public` agrupados como CRM core | 12 |
| Views expostas | 31 |
| Objetos de backup/teste expostos | 5 |

## Objetos proprios deste app

| Objeto | Area | Contrato |
| --- | --- | --- |
| `profiles` | Auth/RBAC | Perfil 1:1 com Auth user. |
| `user_roles` | Auth/RBAC | Role unica por usuario. |
| `dashboard_user_activity` | Auth/RBAC | Login e ultima atividade especificos deste dashboard. |
| `onboarding_identity` | Onboarding | Identidade visual por compra. |
| `onboarding_progress` | Onboarding | Progresso por compra. |
| `onboarding_access` | Onboarding | Override de acesso por compra. |
| `onboarding_access_events` | Onboarding | Historico imutavel de acesso. |
| `onboarding_briefings` | Briefing | Briefing gerado ou salvo por compra. |
| `onboarding_enrichment_jobs` | Enrichment | Status e diagnostico do pipeline. |
| `onboarding_logo_history` | Logos | Historico de logos por compra. |
| `onboarding_copy` | Copy CMS | Conteudo singleton publicado. |
| `onboarding_copy_versions` | Copy CMS | Historico de versoes de copy. |
| `enrichment_config` | Config | Config singleton do enrichment. |
| `nanobanana_config` | Config | Config singleton de creative direction. |
| `perplexity_config` | Config | Config singleton de pesquisa/briefing. |
| `perplexity_test_runs` | QA | Execucoes de teste Perplexity. |
| `ai_campaign_jobs` | AI campaign | Job de geracao de assets por compra. |
| `ai_campaign_assets` | AI campaign | Assets gerados por job. |
| `ai_campaign_errors` | AI campaign | Erros por job/grupo/formato. |

## Colunas-chave dos objetos do app

| Objeto | Colunas-chave |
| --- | --- |
| `profiles` | `id`, `user_id`, `email`, `name`, `full_name`, `avatar_url`, `status`, `created_at`, `updated_at` |
| `user_roles` | `id`, `user_id`, `role`, `assigned_by`, `assigned_at`, `created_at` |
| `dashboard_user_activity` | `user_id`, `last_login_at`, `last_seen_at`, `login_count`, `last_login_user_agent`, `last_seen_path`, `created_at`, `updated_at` |
| `onboarding_identity` | `id`, `compra_id`, `choice`, `logo_path`, `brand_palette`, `font_choice`, `campaign_images_paths`, `campaign_notes`, `production_path`, `site_url`, `instagram_handle`, `brand_display_name` |
| `onboarding_progress` | `compra_id`, `step*_completed_at`, `traffic_choice`, `current_step`, `completed_at` |
| `onboarding_access` | `compra_id`, `status`, `reason_code`, `notes`, `allowed_until`, `updated_by` |
| `onboarding_access_events` | `compra_id`, `from_status`, `to_status`, `reason_code`, `notes`, `actor_id`, `actor_role` |
| `onboarding_briefings` | `compra_id`, `mode`, `brief_text`, `briefing_json`, `citations_json`, `provider`, `provider_model`, `prompt_version`, `status`, `error_code` |
| `onboarding_enrichment_jobs` | `compra_id`, `status`, `phase_*_status`, `extracted_palette`, `detected_font`, `campaign_job_id`, `error_phase`, `phases_log` |
| `onboarding_logo_history` | `compra_id`, `logo_path`, `original_filename`, `mime_type`, `size_bytes`, `uploaded_by_user_id`, `is_active` |
| `onboarding_copy` | `content`, `version`, `published_by`, `updated_at` |
| `onboarding_copy_versions` | `version`, `content`, `changed_etapas`, `published_by`, `notes` |
| `enrichment_config` | Prompts, fallbacks, modelo Gemini, timeouts, retries e scraper config |
| `nanobanana_config` | Modelo Gemini, regras globais, directions, formatos, modos e referencias |
| `perplexity_config` | Modelo, prompts, search config, versoes de contrato e `api_key` |
| `perplexity_test_runs` | `compra_id`, `input_json`, `output_json`, `status`, versoes e duracao |
| `ai_campaign_jobs` | `compra_id`, `status`, `input_hash`, `prompt_version`, totais |
| `ai_campaign_assets` | `job_id`, `group_name`, `format`, `image_url`, dimensoes, `status` |
| `ai_campaign_errors` | `job_id`, `group_name`, `format`, `error_type`, `error_message`, `attempt` |

## Dependencias CRM usadas diretamente

| Objeto | Tipo de uso | Colunas importantes para este app |
| --- | --- | --- |
| `compras` | Leitura mestre | `id`, `cliente_id`, `celebridade`, `checkout_status`, `vendaaprovada`, `clicksign_status`, `valor_total`, `data_compra`, `statusproducao`, `segmento`, `subsegmento`, `telefone` |
| `clientes` | Leitura mestre | `id`, `lead_id`, `nome`, `email`, `telefone`, `cnpj`, `razaosocial`, `nome_fantasia`, `segmento`, `subsegmento`, opt-ins |
| `celebridadesReferencia` | Leitura | `id`, `nome`, `ativo`, `nivel`, `description`, `sgc_uuid`, imagens |
| `segmentos` | Leitura | `id`, `nome`, `active`, `sgc_uuid` |
| `subsegmento` | Leitura indireta | Segmentacao comercial da compra/cliente |
| `atendentes` | Leitura | `id`, `nome`, `genero`, faixas de valor, `ativo` |
| `vendedores` | Vinculo operacional | `id`, `nome`, `email`, `emailacelerai`, `ativo`, `user_id` |
| `producao_members` | Vinculo operacional | `id`, `clickup_id`, `username`, `email`, `is_active`, `auth_user_id` |

## Agrupamento dos objetos expostos

### App (`19`)

`ai_campaign_assets`, `ai_campaign_errors`, `ai_campaign_jobs`,
`dashboard_user_activity`, `enrichment_config`, `nanobanana_config`, `onboarding_access`,
`onboarding_access_events`, `onboarding_briefings`, `onboarding_copy`,
`onboarding_copy_versions`, `onboarding_enrichment_jobs`,
`onboarding_identity`, `onboarding_logo_history`, `onboarding_progress`,
`perplexity_config`, `perplexity_test_runs`, `profiles`, `user_roles`.

### CRM core (`12`)

`atendentes`, `celebridadesReferencia`, `cliente_classificacao`, `clientes`,
`compras`, `imagemProposta`, `leads`, `segmentos`, `sgc_celebridades`,
`sgc_segmentos`, `subsegmento`, `vendedores`.

### Checkout (`6`)

`checkout_audit_log`, `checkout_config`, `checkout_retry_attempts`,
`checkout_sessions`, `checkout_split_groups`, `checkout_webhooks_log`.

### Financeiro/Omie (`10`)

`omie_backfill_client_address_items`, `omie_backfill_client_address_runs`,
`omie_fix_cr_batch_items`, `omie_fix_cr_batch_runs`,
`omie_fix_os_parcelas_batch_items`, `omie_fix_os_parcelas_batch_runs`,
`omie_nfse_config`, `omie_sync`, `omie_upsert_os_batch_items`,
`omie_upsert_os_batch_runs`.

### Producao (`21`)

`producao_attachments`, `producao_checklist_items`, `producao_checklists`,
`producao_clients`, `producao_comments`, `producao_custom_field_definitions`,
`producao_custom_field_values`, `producao_lists`, `producao_members`,
`producao_spaces`, `producao_statuses`, `producao_tags`,
`producao_task_assignees`, `producao_task_tags`, `producao_task_time_logs`,
`producao_task_watchers`, `producao_tasks`,
`producao_vw_global_execution_stats`, `producao_vw_member_execution_avg`,
`producao_vw_task_execution_time`, `producao_workspaces`.

### Ads (`18`)

`ads_audiences`, `ads_briefings`, `ads_campaign_members`,
`ads_campaign_types`, `ads_campaigns`, `ads_campaigns_ad_names_dupes`,
`ads_checklist_items`, `ads_formats`, `ads_landing_pages`, `ads_lp_tipos`,
`ads_notifications`, `ads_objectives`, `ads_platforms`, `ads_products`,
`ads_task_checklist`, `ads_task_comments`, `ads_tasks`, `ads_team_members`.

### WhatsApp (`9`)

`wpp_audiences`, `wpp_blacklist`, `wpp_campaigns`, `wpp_dispatch_queue`,
`wpp_message_logs`, `wpp_optout_keywords`, `wpp_settings`, `wpp_templates`,
`wppLeads`.

### Views (`31`)

`v_activity_timeline`, `v_checkout_daily_metrics`, `v_checkout_error_rate`,
`v_checkout_errors_24h`, `v_checkout_incomplete_data`,
`v_checkout_pending_sessions_sla`, `v_checkout_session_history`,
`v_checkout_status_divergences`, `v_checkout_webhook_signal_24h`,
`v_conciliacao_financeira`, `v_contratos`, `v_omie_clientes_backfill`,
`v_renovacoes`, `v_transaction_pipeline`, `v_transaction_pipeline_active`,
`v_transaction_timeline`, `v_transactions_errors`, `v_transactions_stuck`,
`vw_bloqueios_por_compra`, `vw_compras_historico`,
`vw_follow_up_daily_count`, `vw_follow_up_limit_status`, `vw_jornada_lead`,
`vw_leads_elegiveis_notificacao`, `vw_leads_elegiveis_rotacao`,
`vw_leads_g4`, `vw_notification_cron_history`, `vw_notification_last_runs`,
`vw_rotation_cron_history`, `vw_ultimas_rotacoes`,
`vw_vendedores_elegiveis`.

### Backups/teste expostos (`5`)

`_backup_clientes_e2e_2026_04_27`, `_backup_compras_e2e_2026_04_27`,
`_backup_compras_logs_test_2026_04_26`, `_backup_compras_test_2026_04_26`,
`_backup_imagemproposta_test_2026_04_26`.

### Outros objetos compartilhados (`135`)

Inclui tabelas de CRM, automacoes, logs, suporte, Meta, dashboards, atendimento,
seguranca, tarefas, recorrencias, diagnosticos e RAG. Exemplos relevantes:
`activity_logs`, `audit_logs`, `crm_auth_log`, `security_logs`,
`dev_env_credentials`, `rate_limits`, `notas_fiscais`, `recorrencias`,
`transaction_tasks`, `transaction_notes`, `acelerai_rag`, `aurea_links_rag`,
`crm_atendimento_*`, `crm_atd_*`, `meta_*`, `dashboard_*`.

Regra: qualquer objeto fora da lista "App" deve ser tratado como dependencia
externa ate ownership ser confirmado.
