---
name: supabase-database-governance
description: "Especialista em governanca de banco Supabase/Postgres deste projeto. Use sempre que o usuario mencionar tabelas, colunas, migrations, schema, RLS, policies, triggers, functions SQL, enums, views, extensoes, PostgREST, pg_catalog, ou impacto de alteracoes no banco compartilhado com o CRM."
---

# Supabase Database Governance - Schema, RLS e Migrations

## Objetivo

Preservar a integridade do banco Supabase compartilhado com o CRM ao diagnosticar
ou alterar schema, RLS, triggers, functions SQL, enums, views e extensoes.

## Leitura obrigatoria

Antes de propor ou alterar schema:

1. `docs/context/supabase/README.md`
2. `docs/context/supabase/BUSINESS-RULES.md`
3. `docs/context/supabase/DATABASE-INVENTORY.md`
4. `docs/context/supabase/STORAGE-EXTENSIONS-TRIGGERS.md`
5. `supabase/migrations/`

Para Auth/RBAC:

1. `docs/context/supabase/AUTH-RBAC.md`
2. `docs/context/authentication/BUSINESS-RULES.md`
3. `docs/context/user-management/BUSINESS-RULES.md`

## Checklist de ownership

Antes de editar, responda:

1. A tabela/objeto pertence a este app?
2. Ela e dependencia do CRM?
3. Alguma Edge Function deste app le ou escreve nela?
4. Existe RLS/policy que pode bloquear ou expor dados?
5. Existe FK com `auth.users`, `compras`, `clientes` ou outro modulo?

Se ownership nao estiver claro, pare e confirme antes de modificar.

## Objetos do app que podem evoluir via migration

- `onboarding_*`
- `ai_campaign_*`
- `profiles`
- `user_roles`
- `enrichment_config`
- `nanobanana_config`
- `perplexity_config`
- Enums `app_role`, `user_status`, com cuidado especial.

## Objetos tratados como dependencia

- `compras`
- `clientes`
- `celebridadesReferencia`
- `segmentos`
- `subsegmento`
- `atendentes`
- `vendedores`
- `producao_members`
- Qualquer objeto `checkout_*`, `omie_*`, `producao_*`, `ads_*`, `wpp_*`

## Workflow para mudanca de schema

1. Use `rg` para localizar referencias no codigo e docs.
2. Leia migrations recentes relacionadas.
3. Nao edite migrations existentes.
4. Crie nova migration com nome descritivo.
5. Para tabela exposta em `public`, avalie RLS e grants.
6. Para policy RLS, use helpers `SECURITY DEFINER`; nao consulte tabelas
   protegidas diretamente dentro da policy.
7. Atualize docs contextuais.
8. Rode verificacoes adequadas.

## Regras RLS

- Tabelas novas em schema exposto precisam de decisao explicita de RLS.
- UPDATE exige SELECT policy compativel.
- Views podem bypassar RLS; avaliar `security_invoker` ou acesso restrito.
- Helpers `SECURITY DEFINER` devem ter `search_path` definido.
- Nao usar `raw_user_meta_data` ou `user_metadata` para autorizacao.

## Triggers e functions SQL

Ao alterar trigger/function SQL:

1. Confirme quem chama a function.
2. Confirme efeitos colaterais.
3. Verifique `SECURITY DEFINER`, `search_path` e grants.
4. Preserve idempotencia quando a migration pode rodar em ambiente com objeto
   parcialmente existente.
5. Documente no `STORAGE-EXTENSIONS-TRIGGERS.md` quando mudar contrato.

## Auth FKs e delecao

Antes de deletar Auth users ou mexer em FK:

- Verifique `profiles.id` e `profiles.user_id`.
- Verifique `user_roles.user_id`.
- Verifique `vendedores.user_id`.
- Verifique `producao_members.auth_user_id`.

Nao apague registros comerciais para resolver FK sem confirmacao explicita.

## Verificacao

Para schema local:

```bash
supabase db reset
```

Para app:

```bash
npm run lint
npm run build
```

Para funcoes afetadas:

```bash
deno test supabase/functions/<function>/ --allow-env --allow-net --allow-read
```

## Saida esperada

Ao responder, inclua:

1. Objeto(s) afetado(s).
2. Ownership.
3. Migration necessaria ou nao.
4. RLS/policies/triggers impactados.
5. Riscos para o CRM compartilhado.
6. Plano de verificacao.

