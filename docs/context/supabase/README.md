# Supabase - Contexto do Banco Compartilhado

## Escopo

Mapeamento canonico do Supabase usado pelo projeto `primeiro-passo-app`.
Este projeto compartilha o mesmo banco de dados do CRM, mas possui objetos
proprios para onboarding, AI campaign, copy CMS, configuracoes e RBAC do
dashboard interno.

Esta documentacao existe para separar:

- O que este app pode alterar com seguranca.
- O que pertence ao CRM compartilhado e deve ser tratado como dependencia.
- Como Auth, triggers, RLS, Storage e Edge Functions se conectam.

Snapshot remoto consultado via PostgREST OpenAPI e Storage API em
`2026-04-27 15:39 BRT`.

## Fonte de verdade atual

| Item | Fonte |
| --- | --- |
| Projeto Supabase | `awqtzoefutnfmnbomujt` |
| Frontend | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` |
| Backend/Edge | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |
| Schema versionado deste app | `supabase/migrations/` |
| Edge Functions | `supabase/functions/` |
| Regras de Auth/RBAC | `docs/context/authentication/` e `docs/context/user-management/` |
| Inventario remoto exposto | `docs/context/supabase/DATABASE-INVENTORY.md` |

O banco remoto expunha `265` objetos no schema `public` via PostgREST no
momento do mapeamento. Nem todos pertencem a este app.

## Separacao de ownership

| Categoria | Ownership | Regra |
| --- | --- | --- |
| Tabelas `onboarding_*` | Este app | Pode evoluir via nova migration. |
| Tabelas `ai_campaign_*` | Este app / pipeline AI | Pode evoluir via nova migration. |
| `profiles`, `user_roles`, `dashboard_user_activity`, enums de RBAC | Este app dashboard | Alterar apenas junto com Auth/RBAC. |
| `enrichment_config`, `nanobanana_config`, `perplexity_config` | Este app | Singleton tables; preferir `UPDATE`. |
| `compras`, `clientes`, `vendedores`, `leads`, etc. | CRM compartilhado | Tratar como read/dependency; nao remodelar aqui. |
| `checkout_*`, `omie_*`, `producao_*`, `ads_*`, `wpp_*` | Outros modulos do CRM | Nao alterar sem ownership explicito. |
| Storage buckets do onboarding/AI | Este app | Alterar com cuidado e atualizar funcoes. |
| Storage buckets historicos do CRM | CRM compartilhado | Nao alterar sem ownership explicito. |

## Arquitetura resumida

```text
React + Vite SPA
  -> Supabase Auth para dashboard interno
  -> PostgREST sob RLS para leituras permitidas do usuario
  -> Edge Functions para operacoes privilegiadas
  -> Service role somente em Edge Functions/scripts seguros

Onboarding publico
  -> compra_id UUID nao-adivinhavel
  -> Edge Functions publicas
  -> leitura de compras/clientes/celebridades/segmentos no CRM
  -> escrita em onboarding_identity/onboarding_progress
  -> Storage onboarding-identity
  -> enrichment e AI campaign

Dashboard interno
  -> Supabase Auth
  -> profiles + user_roles
  -> Edge Functions protegidas por JWT + RBAC
```

## Objetos principais deste app

| Area | Objetos |
| --- | --- |
| Auth/RBAC | `auth.users`, `profiles`, `user_roles`, `dashboard_user_activity`, `app_role`, `user_status` |
| Onboarding publico | `onboarding_identity`, `onboarding_progress`, `onboarding_access`, `onboarding_access_events` |
| Briefing/enrichment | `onboarding_briefings`, `onboarding_enrichment_jobs`, `enrichment_config` |
| Copy CMS | `onboarding_copy`, `onboarding_copy_versions` |
| Logos | `onboarding_logo_history`, bucket `onboarding-identity` |
| AI campaign | `ai_campaign_jobs`, `ai_campaign_assets`, `ai_campaign_errors`, bucket `ai-campaign-assets` |
| Perplexity | `perplexity_config`, `perplexity_test_runs` |
| NanoBanana | `nanobanana_config`, bucket `nanobanana-references` |

## Dependencias do CRM compartilhado usadas pelo app

| Objeto CRM | Uso neste app |
| --- | --- |
| `compras` | Compra mestre, elegibilidade, status de pagamento/assinatura, dados comerciais. |
| `clientes` | Dados do cliente para onboarding, briefing e monitor AI. |
| `celebridadesReferencia` | Celebridade contratada e contexto de campanha. |
| `segmentos`, `subsegmento` | Segmento comercial usado em briefing/enrichment. |
| `atendentes` | Dados auxiliares retornados em `get-onboarding-data`. |
| `vendedores` | Vinculo operacional com usuarios internos em alguns fluxos do CRM. |
| `producao_members` | Vinculo operacional com usuarios Auth em contexto de producao. |

Esses objetos nao devem ser modificados por este app sem decisao explicita de
ownership. Em geral, o app le essas tabelas via service role dentro de Edge
Functions e grava apenas nas tabelas `onboarding_*`, `ai_campaign_*` ou configs.

## Limites de seguranca

- `SUPABASE_SERVICE_ROLE_KEY` nunca pode chegar ao browser.
- Frontend usa somente anon/publishable key e depende de RLS.
- Edge Functions publicas precisam de justificativa clara, porque usam service
  role internamente em varios fluxos.
- Funcoes administrativas devem validar JWT e role no backend.
- Policies RLS nao devem consultar diretamente tabelas protegidas; usar helpers
  `SECURITY DEFINER`.
- Migrations existentes sao imutaveis.

## Como atualizar este mapeamento

1. Consultar o estado remoto do Supabase.
2. Comparar com `supabase/migrations/` e `supabase/functions/`.
3. Atualizar os documentos desta pasta.
4. Se houver mudanca de schema, criar nova migration.
5. Se houver mudanca de funcao, revisar deploy mode e `functionSpec.md`.
