# Supabase - Storage, Extensoes, Triggers e RLS

## Storage

Snapshot remoto: `29` buckets.

### Buckets deste app

| Bucket | Publico | Limite | Uso |
| --- | --- | --- | --- |
| `onboarding-identity` | Nao | Sem limite configurado | Logos e imagens do onboarding. |
| `ai-campaign-assets` | Nao | `10 MB` | Assets gerados por AI campaign (`png`, `jpeg`, `webp`). |
| `nanobanana-references` | Nao | Sem limite configurado | Imagens de referencia de creative direction. |

### Buckets compartilhados observados

| Bucket | Publico | Observacao |
| --- | --- | --- |
| `AutomacaoWhatsApp` | Sim | CRM/WhatsApp. |
| `celebs` | Sim | Assets de celebridades. |
| `celebs-final` | Sim | Assets de celebridades. |
| `celebs-total` | Sim | Assets de celebridades. |
| `celebs-corpo` | Sim | Assets de celebridades. |
| `materiais` | Sim | Materiais compartilhados. |
| `dashboards` | Sim | Dashboards/BI. |
| `diagnosticoEmpresaAcelerai` | Sim | Diagnosticos. |
| `previewLogoCelebridade` | Sim | Previews. |
| `previewLogoClientes` | Nao | Previews privados. |
| `LogoClientes` | Nao | Logos privados de clientes. |
| `previewLogoCelebridadeCreatomate` | Sim | Previews Creatomate. |
| `previewLogoCelebridadeThumb` | Sim | Thumbnails. |
| `audiosAllan` | Sim | Audios. |
| `cdn-assets` | Sim | CDN compartilhado. |
| `img_vendedores` | Sim | Imagens de vendedores. |
| `producao-attachments` | Sim | Anexos de producao; limite `50 MB`. |
| `task-attachments` | Sim | Anexos de tarefas. |
| `chat-media` | Sim | Midia de chat; limite `100 MB`. |
| `contratos-assinados` | Sim | PDFs; limite `20 MB`. |
| `transaction-attachments` | Nao | Anexos transacionais; limite `50 MB`. |
| `suporte-imagens` | Sim | Suporte. |
| `propostas-pdf` | Sim | PDFs de proposta. |
| `boletos` | Sim | PDFs; limite `10 MB`. |
| `transcricao_reuniao_vendedores` | Sim | Transcricoes. |
| `aurea-garden-assets` | Nao | Assets privados; limite `15 MB`. |

Regra: alterar policy/visibilidade/limite de bucket compartilhado exige
confirmacao de ownership.

## Triggers locais versionados

| Trigger | Tabela | Funcao | Papel |
| --- | --- | --- | --- |
| `trg_onboarding_access_audit` | `onboarding_access` | `fn_onboarding_access_audit()` | Grava evento em insert/update. |
| `trg_profiles_touch_updated_at` | `profiles` | `touch_updated_at()` | Atualiza `updated_at`. |
| `trg_dashboard_user_activity_touch_updated_at` | `dashboard_user_activity` | `touch_updated_at()` | Atualiza `updated_at`. |
| `trg_handle_new_user` | `auth.users` | `handle_new_user()` | Cria profile e role. |
| `trg_handle_user_update` | `auth.users` | `handle_user_update()` | Sincroniza email/profile. |

## Funcoes SQL locais versionadas

| Funcao | Tipo | Papel |
| --- | --- | --- |
| `fn_onboarding_access_audit()` | Trigger | Auditoria de acesso onboarding. |
| `touch_updated_at()` | Trigger | Atualiza timestamp. |
| `get_user_role(uuid)` | `SECURITY DEFINER` | Le role de usuario. |
| `is_admin()` | `SECURITY DEFINER` | Helper RLS/admin. |
| `is_admin_or_operator()` | `SECURITY DEFINER` | Helper RLS/admin/operator. |
| `is_active_user()` | `SECURITY DEFINER` | Helper RLS/status. |
| `handle_new_user()` | Trigger/Auth | Provisiona profile e role. |
| `handle_user_update()` | Trigger/Auth | Sincroniza dados do Auth. |

## Policies locais versionadas

| Tabela | Policies |
| --- | --- |
| `profiles` | `profiles_select_self_or_admin`, `profiles_update_self_or_admin`, `profiles_insert_admin`, `profiles_delete_admin` |
| `user_roles` | `user_roles_select_self_or_admin`, `user_roles_insert_admin`, `user_roles_update_admin`, `user_roles_delete_admin` |
| `onboarding_logo_history` | `onboarding_logo_history_select`, `onboarding_logo_history_insert`, `onboarding_logo_history_update`, `onboarding_logo_history_delete` |

## Enums locais versionados

| Enum | Valores |
| --- | --- |
| `app_role` | `admin`, `operator`, `viewer` |
| `user_status` | `active`, `disabled` |

## Extensoes

O mapeamento por PostgREST nao lista `pg_extension`. Pelo schema exposto, ha
evidencias de uso de:

| Extensao/capacidade | Evidencia | Observacao |
| --- | --- | --- |
| `pgvector`/`vector` | Coluna `embedding: public.vector(1536)` em `acelerai_rag` | Usado por RAG compartilhado. |
| `pg_cron` | Views `vw_notification_cron_history`, `vw_notification_last_runs`, `vw_rotation_cron_history` | Usado por automacoes/rotacao. |
| `storage` | Buckets Supabase Storage | Gerenciado pelo Supabase. |
| `auth` | `auth.users` e triggers | Gerenciado pelo Supabase Auth. |

Para inventario completo de extensoes, consultar SQL direto:

```sql
select extname, extversion
from pg_extension
order by extname;
```

## Queries uteis de auditoria

```sql
-- Tabelas/views expostas no public
select table_schema, table_name, table_type
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

```sql
-- Triggers relevantes
select event_object_schema, event_object_table, trigger_name, action_timing, event_manipulation
from information_schema.triggers
where event_object_schema in ('public', 'auth')
order by event_object_schema, event_object_table, trigger_name;
```

```sql
-- Policies RLS
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

```sql
-- Extensoes
select extname, extversion
from pg_extension
order by extname;
```
