# Supabase - Auth e RBAC

## Escopo

O dashboard interno usa Supabase Auth como origem de identidade e `profiles` /
`user_roles` como modelo de autorizacao da aplicacao.

O onboarding publico do cliente final nao usa login JWT.

## Objetos

| Objeto | Papel |
| --- | --- |
| `auth.users` | Conta, email, senha/convite/recovery e sessoes Supabase. |
| `public.profiles` | Perfil 1:1, email, nome, avatar e status operacional. |
| `public.user_roles` | Role unica por usuario. |
| `public.dashboard_user_activity` | Login e ultima atividade especificos deste dashboard. |
| `public.app_role` | Enum `admin`, `operator`, `viewer`. |
| `public.user_status` | Enum `active`, `disabled`. |
| `public.handle_new_user()` | Trigger de provisionamento automatico. |
| `public.handle_user_update()` | Sincroniza email/profile quando Auth muda. |
| `public.get_user_role(uuid)` | Helper RLS/RBAC. |
| `public.is_admin()` | Helper RLS. |
| `public.is_admin_or_operator()` | Helper RLS. |
| `public.is_active_user()` | Helper RLS. |

## Contrato atual

| Conceito | Valor |
| --- | --- |
| Roles validas | `admin`, `operator`, `viewer` |
| Role default | `viewer` |
| Status validos | `active`, `disabled` |
| Perfil obrigatorio | Sim |
| Role obrigatoria | Sim |
| Usuario desativado | Deve ter `profiles.status = disabled` e ban no Auth |

## Fluxo de novo usuario

```text
auth.users INSERT
  -> trigger trg_handle_new_user
  -> public.handle_new_user()
  -> upsert public.profiles
  -> insert public.user_roles role viewer
```

Convites feitos por `invite-user` tambem fazem upsert explicito em `profiles` e
`user_roles`, para nao depender apenas do trigger.

Convites pendentes podem ser reenviados por `resend-user-invite`, mas apenas
quando `auth.users.invited_at` existe e a conta ainda nao tem confirmacao ou
login. O reenvio nao altera `profiles` nem `user_roles`.

## Fluxo de login dashboard

```text
/login
  -> auth.signInWithPassword
  -> record-dashboard-activity event=login
  -> AuthContext carrega session
  -> busca profiles + user_roles
  -> bloqueia se status != active
  -> App.jsx libera rota protegida
  -> Edge Functions admin recebem Authorization: Bearer <access_token>
  -> requireRole/requireAdmin valida role no backend
```

## Vinculos com CRM compartilhado

Alguns objetos do CRM podem apontar para `auth.users` sem pertencerem ao modulo
de Auth deste app:

| Objeto | Coluna | Uso |
| --- | --- | --- |
| `vendedores` | `user_id` | Vinculo entre vendedor CRM e Auth user. |
| `producao_members` | `auth_user_id` | Vinculo entre membro ClickUp/producao e Auth user. |

Antes de excluir Auth user, verificar esses vinculos. Se a exclusao for
operacionalmente necessaria, desvincular de modo explicito e documentado em vez
de apagar registros comerciais.

## Regras criticas

- Nao usar `raw_user_meta_data` para autorizacao.
- Nao criar usuario interno sem `profiles` e `user_roles`.
- Nao usar `auth.users.last_sign_in_at` como "ultimo login no app"; ele e global do projeto Supabase Auth.
- Nao remover, rebaixar ou desativar o ultimo admin.
- Admin nao deve excluir a propria conta.
- Deletar usuario Auth nao invalida access tokens ja emitidos imediatamente.
- JWT prova identidade; permissao vem de `user_roles`.

## Arquivos relacionados

| Arquivo | Papel |
| --- | --- |
| `src/lib/auth-client.js` | Supabase client do browser. |
| `src/context/AuthContext.jsx` | Estado global de sessao, profile e role. |
| `src/lib/admin-edge.js` | Chamada de Edge Function com bearer token. |
| `src/pages/Login.jsx` | Login e tratamento de erro/rate limit. |
| `src/pages/Users/` | UI de gestao de usuarios. |
| `supabase/functions/_shared/auth.ts` | Validacao JWT. |
| `supabase/functions/_shared/rbac.ts` | RBAC backend. |
| `supabase/functions/*user*` | Gestao admin de usuarios. |
