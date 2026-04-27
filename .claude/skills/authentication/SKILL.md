---
name: authentication
description: "Especialista no modulo de autenticacao e RBAC do dashboard interno. Use sempre que o usuario mencionar auth, autenticacao, login, logout, sessao, senha, reset password, convite, usuario, perfil, roles, RBAC, permissoes, 401, 403, JWT, Supabase Auth, rotas protegidas, adminFetch, RequireRole, user management, profiles/user_roles, ou Edge Functions protegidas deste projeto."
---

# Authentication Specialist — Dashboard Auth e RBAC

## Objetivo

Atuar como especialista do modulo de autenticacao do dashboard interno do projeto `primeiro-passo-app`, preservando a separacao entre:

- Dashboard interno autenticado via Supabase Auth + JWT + RBAC.
- Onboarding publico do cliente final sem login JWT.

Use esta skill para diagnosticar, documentar, implementar ou revisar qualquer mudanca que toque login, sessao, permissao, roles, rotas protegidas, user management, policies RLS ou Edge Functions administrativas.

## Leitura obrigatoria

Antes de propor ou alterar qualquer coisa neste modulo, leia nesta ordem:

1. `docs/context/authentication/README.md`
2. `docs/context/authentication/BUSINESS-RULES.md`
3. `docs/context/authentication/DOC-READING-ORDER.md`
4. `docs/context/supabase/AUTH-RBAC.md`

Depois, siga a ordem especifica do tipo de tarefa definida em `DOC-READING-ORDER.md`.

Quando a tarefa envolver gestao de usuarios, leia tambem:

1. `docs/context/user-management/README.md`
2. `docs/context/user-management/BUSINESS-RULES.md`

Quando a tarefa envolver banco compartilhado, FKs, `auth.users`, `profiles`,
`user_roles`, `vendedores.user_id` ou `producao_members.auth_user_id`, leia
tambem:

1. `docs/context/supabase/README.md`
2. `docs/context/supabase/BUSINESS-RULES.md`
3. `docs/context/supabase/DATABASE-INVENTORY.md`

## Contrato atual do modulo

Fonte de identidade:

- Supabase Auth e a origem da conta, credencial, convite, recovery, access token e refresh token.

Fonte de autorizacao:

- `public.user_roles` define a role da aplicacao.
- `public.profiles.status` define se o usuario esta operacionalmente ativo.

Roles validas:

- `admin`
- `operator`
- `viewer`

Status validos:

- `active`
- `disabled`

Nao use roles antigas dos planos historicos (`supervisor`, `operacao`, `leitura`, `agent`) como contrato vigente.

## Arquivos principais

Frontend:

| Arquivo | Uso |
| --- | --- |
| `src/lib/auth-client.js` | Supabase client singleton para Auth |
| `src/context/AuthContext.jsx` | Estado global de sessao, profile e role |
| `src/lib/admin-edge.js` | Fetch autenticado para Edge Functions admin |
| `src/App.jsx` | Guard central de rotas protegidas |
| `src/components/RequireRole.jsx` | Bloqueio visual por role |
| `src/pages/Login.jsx` | Login email/senha |
| `src/pages/ForgotPassword.jsx` | Link de recuperacao |
| `src/pages/ResetPassword.jsx` | Reset de senha e aceite de convite |
| `src/pages/Users/` | Gestao de usuarios |
| `src/pages/Profile.jsx` | Perfil do usuario logado |

Backend/Supabase:

| Arquivo | Uso |
| --- | --- |
| `supabase/functions/_shared/auth.ts` | `requireAuth()` valida JWT |
| `supabase/functions/_shared/rbac.ts` | `requireRole()` e `requireAdmin()` |
| `supabase/functions/_shared/user-management.ts` | Helpers de user management |
| `supabase/migrations/20260424150000_create_user_management.sql` | Schema base de auth/RBAC |
| `supabase/functions/*/functionSpec.md` | Contrato especifico de cada Edge Function |

## Workflow para tarefas de implementacao

1. Classifique a tarefa:
   - Login/sessao/frontend auth
   - Guard de rota/permissao visual
   - Edge Function protegida
   - User management
   - Schema/RLS/helper SQL
   - Investigacao de 401/403

2. Leia os documentos da ordem de leitura correspondente.

3. Localize os arquivos-alvo com `rg` ou `rg --files`.

4. Antes de editar, confirme o contrato atual no codigo:
   - Roles em `supabase/functions/_shared/rbac.ts`
   - Rotas protegidas em `src/App.jsx`
   - Sessao em `src/context/AuthContext.jsx`
   - Fetch admin em `src/lib/admin-edge.js`
   - Schema/RLS na migration base e novas migrations existentes

5. Implemente a menor mudanca coerente com os padroes locais.

6. Atualize documentacao quando mudar contrato, role, rota protegida, classificacao JWT, schema ou regra de negocio.

7. Verifique com os comandos adequados da secao "Verificacao".

## Workflow para diagnostico de 401/403

1. Identifique a rota/tela e a Edge Function chamada.
2. Confirme se a chamada usa `adminFetch()` ou outro mecanismo.
3. Para 401:
   - Verifique se existe sessao no `AuthContext`.
   - Verifique se `Authorization: Bearer <access_token>` esta sendo enviado.
   - Verifique se `adminFetch()` tentou refresh uma unica vez.
   - Verifique `requireAuth()` e se a funcao foi deployada com JWT correto.
4. Para 403:
   - Verifique role em `public.user_roles`.
   - Verifique `profiles.status`.
   - Verifique roles aceitas em `requireRole(req, [...])`.
   - Verifique `RequireRole` da rota, se houver.
5. Diferencie falha de gateway Supabase, falha de `requireAuth()` e falha de `requireRole()`.

## Workflow para Edge Functions protegidas

Ao criar ou alterar funcao administrativa:

1. Leia `functionSpec.md` da funcao, se existir.
2. Defina se a funcao e publica ou protegida.
3. Para funcao protegida por usuario humano, use:

```ts
const authResult = await requireRole(req, ['admin'])
if (isRbacError(authResult)) return authResult.error
```

4. Use `authResult.serviceClient` para operacoes privilegiadas no backend.
5. Nao aceite `service_role` como token de usuario humano.
6. Garanta CORS com `authorization`, `apikey` e `content-type`.
7. Atualize a spec e o checklist de deploy quando a classificacao JWT mudar.
8. Deploy de funcao JWT + RBAC deve ser sem `--no-verify-jwt`.

## Workflow para user management

Ao trabalhar em `/users`, `/profile` ou funcoes de usuario:

1. Leia tambem `docs/context/user-management/*`.
2. Preserve as regras:
   - Todo usuario tem `profiles` e `user_roles`.
   - Default role e `viewer`.
   - Apenas admin gerencia usuarios.
   - Nao rebaixar, desativar ou excluir o ultimo admin.
   - Admin nao pode excluir a propria conta.
   - `disabled` deve alinhar `profiles.status` e ban no Supabase Auth.
3. Verifique as specs:
   - `list-users/functionSpec.md`
   - `invite-user/functionSpec.md`
   - `update-user-role/functionSpec.md`
   - `set-user-status/functionSpec.md`
   - `delete-user/functionSpec.md`

## Regras criticas

### Sempre

- Responda em pt-BR, conforme `AGENTS.md`.
- Leia o contexto do modulo antes de diagnosticar ou editar.
- Use `adminFetch()` para chamadas frontend a Edge Functions protegidas.
- Use `_shared/rbac.ts` para autorizacao backend.
- Trate frontend guard como UX, nao como seguranca real.
- Diferencie 401 de 403.
- Crie nova migration para qualquer mudanca de schema/RLS; nunca edite migration existente.
- Atualize `docs/context/authentication/` se mudar contrato do modulo.
- Atualize `docs/context/supabase/` se mudar Auth/RBAC, FKs, ownership ou
  integracao com CRM compartilhado.

### Nunca

- Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Nunca use `user_metadata` para autorizacao.
- Nunca use roles antigas como contrato atual.
- Nunca proteja endpoint publico do onboarding sem avaliar impacto no fluxo do cliente final.
- Nunca deploye funcao protegida JWT + RBAC com `--no-verify-jwt`.
- Nunca confie apenas em `RequireRole` para proteger dados.

## Verificacao

Para mudancas frontend:

```bash
npm run lint
npm run build
```

Para helpers compartilhados de auth/RBAC:

```bash
deno test supabase/functions/_shared/ --allow-env --allow-net --allow-read
```

Para user management:

```bash
deno test supabase/functions/{list-users,invite-user,update-user-role,set-user-status,delete-user}/ --allow-env --allow-net --allow-read
```

Para schema/RLS:

```bash
supabase db reset
```

Para pre-push/deploy:

```bash
npm run gate:prepush
```

## Saida esperada

Ao concluir uma tarefa deste modulo, reporte:

1. O que mudou.
2. Quais arquivos foram alterados.
3. Qual contrato de auth/RBAC foi preservado ou alterado.
4. Quais verificacoes foram executadas.
5. Se aplicavel, a classificacao JWT/deploy da Edge Function.
