---
name: supabase-architect
description: "Especialista orquestrador do Supabase compartilhado deste projeto. Use sempre que o usuario mencionar Supabase de forma ampla, banco compartilhado com CRM, mapeamento de tabelas, ownership, separacao entre app e CRM, arquitetura de Auth/DB/Storage/Edge Functions, ou pedir para entender impacto antes de alterar qualquer objeto Supabase."
---

# Supabase Architect - Contexto e Ownership

## Objetivo

Atuar como primeira skill de triagem para qualquer tarefa Supabase ampla no
projeto `primeiro-passo-app`.

Esta skill nao substitui especialistas mais focados. Ela classifica a tarefa,
define ownership e decide qual contexto carregar em seguida.

## Leitura obrigatoria

Antes de diagnosticar, propor ou editar algo relacionado ao Supabase, leia:

1. `docs/context/supabase/DOC-READING-ORDER.md`
2. `docs/context/supabase/README.md`
3. `docs/context/supabase/BUSINESS-RULES.md`
4. `docs/context/supabase/DATABASE-INVENTORY.md`

Quando a tarefa envolver Auth/RBAC, leia tambem:

1. `docs/context/supabase/AUTH-RBAC.md`
2. `docs/context/authentication/README.md`
3. `docs/context/user-management/README.md`

Quando envolver Edge Functions, leia:

1. `docs/context/supabase/EDGE-FUNCTIONS.md`
2. `supabase/functions/<function>/functionSpec.md`, se existir

Quando envolver Storage/triggers/extensions/RLS, leia:

1. `docs/context/supabase/STORAGE-EXTENSIONS-TRIGGERS.md`

## Classificacao inicial obrigatoria

Antes de agir, classifique o pedido em uma ou mais categorias:

| Categoria | Sinal | Proxima skill/contexto |
| --- | --- | --- |
| Schema/RLS/migration | tabela, coluna, policy, trigger, enum, view, extensao | `supabase-database-governance` |
| Edge Function | `supabase/functions`, deploy, JWT, service role, CORS | `supabase-edge-functions` |
| Auth/RBAC/usuarios | login, usuario, role, perfil, permissao, 401/403 | `authentication` e `user-management` |
| Storage/assets | bucket, upload, signed URL, policy Storage | `supabase-database-governance` + Storage docs |
| CRM compartilhado | `compras`, `clientes`, `vendedores`, `producao_*`, `checkout_*`, `omie_*`, `ads_*`, `wpp_*` | ownership explicito antes de editar |
| Onboarding publico | `compra_id`, `onboarding_*`, fluxo publico | `onboarding` + docs Supabase |

## Regra de ownership

Sempre separar:

- Objetos proprios deste app: `onboarding_*`, `ai_campaign_*`, configs,
  `profiles`, `user_roles`.
- Dependencias do CRM: `compras`, `clientes`, `celebridadesReferencia`,
  `segmentos`, `subsegmento`, `atendentes`, `vendedores`, `producao_members`.
- Objetos de outros modulos: `checkout_*`, `omie_*`, `producao_*`, `ads_*`,
  `wpp_*`, logs, RAG e backups.

Se o objeto nao estiver claramente na lista do app, trate como dependencia do
CRM e nao altere sem confirmacao explicita de ownership.

## Workflow

1. Leia os docs obrigatorios.
2. Identifique objetos tocados e classifique ownership.
3. Determine se a mudanca e:
   - Somente leitura/diagnostico.
   - Alteracao frontend.
   - Alteracao Edge Function.
   - Alteracao schema/migration.
   - Operacao remota no Supabase.
4. Acione mentalmente a skill especialista aplicavel.
5. Para mudanca real, preserve a menor superficie possivel.
6. Atualize `docs/context/supabase/` quando mudar contrato, ownership,
   classificacao de funcao, schema, Storage ou regra operacional.

## Regras criticas

- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Nunca edite migration existente.
- Nunca trate tabela do CRM como local sem confirmar ownership.
- Nunca use frontend guard como unica autorizacao.
- Nunca use `user_metadata` para RBAC/RLS.
- Sempre diferencie funcao publica de funcao protegida por JWT/RBAC.
- Sempre verifique o estado remoto quando a pergunta depender do estado atual do
  banco, Auth, buckets ou deploy.

## Saida esperada

Ao responder analise ou plano, inclua:

1. Quais docs foram considerados.
2. Quais objetos Supabase estao envolvidos.
3. Ownership de cada objeto.
4. Risco principal.
5. Skill/contexto especialista recomendado.
6. Proximo passo seguro.

