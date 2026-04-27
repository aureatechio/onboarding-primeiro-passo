# Autenticacao e RBAC — Contexto do Modulo

## Escopo

Modulo de autenticacao do dashboard interno do SPA React + Vite. Ele cobre login, logout, recuperacao de senha, aceite de convite, persistencia de sessao, guards de rota, RBAC no frontend e autorizacao de Edge Functions administrativas via JWT Supabase.

O onboarding publico do cliente final nao usa login JWT. Ele permanece separado deste modulo e depende de UUID de compra nao-adivinhavel e Edge Functions publicas.

## Fonte de verdade atual

O codigo e esta documentacao sao a fonte de verdade atual. Os planos historicos de auth registram decisoes e fases anteriores, mas contem divergencias de nomenclatura de roles.

Contrato atual implementado:

| Conceito | Valor atual |
| --- | --- |
| Provedor de identidade | Supabase Auth |
| Sessao | Access token JWT + refresh token gerenciado pelo `@supabase/supabase-js` |
| Roles validas | `admin`, `operator`, `viewer` |
| Status validos | `active`, `disabled` |
| Tabela de perfil | `public.profiles` |
| Tabela de RBAC | `public.user_roles` |
| Tabela de atividade no dashboard | `public.dashboard_user_activity` |
| Cliente frontend | `src/lib/auth-client.js` |
| Estado global | `src/context/AuthContext.jsx` |
| Fetch admin | `src/lib/admin-edge.js` |
| Guard backend | `supabase/functions/_shared/auth.ts` + `_shared/rbac.ts` |

## Arquitetura

```
Usuario interno
  -> /login
  -> Supabase Auth signInWithPassword
  -> AuthContext carrega session
  -> AuthContext busca profiles + user_roles
  -> App.jsx libera rota protegida
  -> RequireRole valida permissao visual da rota
  -> adminFetch envia Authorization: Bearer <access_token>
  -> Edge Function valida JWT em requireAuth()
  -> requireRole() consulta user_roles + profiles.status
  -> Edge executa operacao com serviceClient interno
```

Separacao de responsabilidades:

| Camada | Responsabilidade |
| --- | --- |
| Supabase Auth | Conta, credenciais, access token, refresh token, convite e recuperacao de senha |
| `profiles` | Dados editaveis do usuario e status operacional |
| `user_roles` | Role de autorizacao da aplicacao |
| `AuthContext` | Estado de sessao, perfil, role, login/logout e refresh |
| `App.jsx` | Guard central de rotas protegidas |
| `RequireRole` | Bloqueio visual por role no frontend |
| `adminFetch` | Injecao de bearer token e retry unico em 401 |
| `_shared/auth.ts` | Validacao defensiva do JWT de usuario humano |
| `_shared/rbac.ts` | Validacao de role e status ativo no backend |

## Arquivos-chave

| Arquivo | Papel |
| --- | --- |
| `src/lib/auth-client.js` | Cria singleton Supabase client com `persistSession`, `autoRefreshToken` e `storageKey: 'aurea.auth'` |
| `src/context/AuthContext.jsx` | Carrega sessao, perfil e role; expoe `useAuth()` |
| `src/lib/admin-edge.js` | Wrapper para chamadas administrativas a `/functions/v1/*` com JWT |
| `src/App.jsx` | Define rotas protegidas e redirecionamento para login |
| `src/components/RequireRole.jsx` | Renderiza acesso restrito quando role nao atende |
| `src/pages/Login.jsx` | Login email/senha e redirect por `next` |
| `src/pages/ForgotPassword.jsx` | Envio de link de recuperacao |
| `src/pages/ResetPassword.jsx` | Aceite de invite/recovery e definicao de senha |
| `src/pages/Users/` | UI de gestao de usuarios |
| `src/pages/Profile.jsx` | Edicao do proprio perfil |
| `supabase/functions/_shared/auth.ts` | `requireAuth(req)` e `isAuthError()` |
| `supabase/functions/_shared/rbac.ts` | `requireRole(req, roles)`, `requireAdmin(req)` e roles validas |
| `supabase/functions/_shared/user-management.ts` | Validadores e helpers para funcoes de usuarios |
| `supabase/migrations/20260424150000_create_user_management.sql` | Schema base de `profiles`, `user_roles`, RLS e triggers |

## Variaveis de ambiente

Frontend:

| Variavel | Uso |
| --- | --- |
| `VITE_SUPABASE_URL` | URL do projeto Supabase; tambem usada para montar chamadas de Edge Functions |
| `VITE_SUPABASE_ANON_KEY` | Chave anon/publishable usada pelo browser para Supabase Auth e Data API sob RLS |
| `VITE_DASHBOARD_URL` | Base canonica do dashboard para callbacks de Auth, especialmente recuperacao de senha em `/reset-password` |

Edge Functions:

| Variavel | Uso |
| --- | --- |
| `SUPABASE_URL` | URL do projeto Supabase no runtime Deno |
| `SUPABASE_ANON_KEY` | Usada por `_shared/auth.ts` para validar token com `auth.getUser()` |
| `SUPABASE_SERVICE_ROLE_KEY` | Usada somente no backend para operacoes privilegiadas |
| `DASHBOARD_URL` ou `SITE_URL` | Base preferencial do redirect de convite para `/reset-password?type=invite`; se ausentes, as funcoes usam o dominio canonico de producao |

`SUPABASE_SERVICE_ROLE_KEY` nunca pode ir para o frontend.

Configuracao externa no Supabase Auth:

- Production Site URL nao deve ser `localhost`.
- Redirect URLs permitidas devem incluir `https://acelerai-primeiro-passo.vercel.app/reset-password`.
- URLs `http://localhost:*` so devem existir para desenvolvimento local intencional.

## Fluxos de autenticacao

### Login

1. Usuario acessa rota protegida.
2. `App.jsx` renderiza a rota explicita com `DashboardRoute`.
3. Se `isAuthLoading`, renderiza splash.
4. Se nao autenticado, redireciona para `/login?next=<rota atual>`.
5. `Login.jsx` chama `signInWithPassword({ email, password })`.
6. `AuthContext` usa `authClient.auth.signInWithPassword`.
7. `AuthContext` busca `profiles` e `user_roles`.
8. Se nao existir `profiles` + `user_roles`, faz `signOut()` e bloqueia o acesso ao app.
9. Se `profiles.status = disabled`, faz `signOut()` e bloqueia o login.
10. `Login.jsx` chama `record-dashboard-activity` com `event = login`.
11. Em sucesso, volta para `next` ou `/ai-step2/monitor`.

### Reidratacao de sessao

1. `AuthProvider` inicia com `isAuthLoading = true` quando env existe.
2. `authClient.auth.getSession()` recupera sessao persistida.
3. `loadUserAccess()` consulta `profiles` e `user_roles`.
4. `onAuthStateChange()` mantem o estado sincronizado com Supabase Auth.

### Logout

1. UI interna chama `signOut()`.
2. `AuthContext` chama `authClient.auth.signOut()`.
3. Estado local limpa `session`, `profile` e `role`.
4. Rotas protegidas voltam a redirecionar para `/login`.

### Recuperacao de senha

1. `/forgot-password` chama `authClient.auth.resetPasswordForEmail(email, { redirectTo })`.
2. `redirectTo` aponta para `${VITE_DASHBOARD_URL}/reset-password`; se a env nao existir, usa `VITE_SITE_URL`, `VITE_ONBOARDING_BASE_URL`, origin nao-local ou fallback de producao.
3. `/reset-password` le tokens no hash da URL.
4. `authClient.auth.setSession({ access_token, refresh_token })` valida o link.
5. Usuario define nova senha via `authClient.auth.updateUser({ password })`.
6. Apos salvar, o frontend faz `signOut()` e envia usuario para `/login`.

### Convite de usuario

1. Admin usa `/users` para convidar.
2. `invite-user` chama `serviceClient.auth.admin.inviteUserByEmail`.
3. Redirect usa `DASHBOARD_URL`, `SITE_URL` ou o dominio canonico de producao + `/reset-password?type=invite`.
4. A funcao faz upsert em `profiles` com `status = active`.
5. A funcao faz upsert em `user_roles` com role inicial.
6. Usuario convidado define senha em `/reset-password?type=invite`.
7. Enquanto o convite estiver pendente, `/users` pode chamar `resend-user-invite` para reenviar o e-mail sem alterar role/status.

## Rotas do dashboard

| Rota | Autenticacao | Role no frontend |
| --- | --- | --- |
| `/login` | Publica | N/A |
| `/forgot-password` | Publica | N/A |
| `/reset-password` | Publica | N/A |
| `/ai-step2/monitor` | Requer sessao | Sem `RequireRole` dedicado no `App.jsx` |
| `/ai-step2/perplexity-config` | Requer sessao | `admin` |
| `/ai-step2/nanobanana-config` | Requer sessao | `admin` |
| `/copy-editor` | Requer sessao | `admin` |
| `/users` | Requer sessao | `admin` |
| `/profile` | Requer sessao | `admin`, `operator`, `viewer` |

Rotas protegidas sao declaradas explicitamente em `App.jsx` com `DashboardRoute` e, quando aplicavel, `RequireRole`:

```js
['/ai-step2/monitor', '/ai-step2/monitor/jobs/:jobId', '/ai-step2/perplexity-config', '/ai-step2/nanobanana-config', '/copy-editor', '/users', '/profile']
```

O app nao aplica guard por prefixo generico. Uma nova rota `/ai-step2/*` so fica protegida se for adicionada explicitamente em `App.jsx` com `DashboardRoute`.

## Roles e permissoes

Roles implementadas em codigo e banco:

| Role | Uso esperado |
| --- | --- |
| `admin` | Gerencia usuarios, configuracoes, copy, logos, dados editaveis de onboarding e operacoes administrativas |
| `operator` | Executa operacoes permitidas, como retry de assets de campanha |
| `viewer` | Leitura e acesso basico ao proprio perfil |

Observacao: planos historicos mencionam `supervisor`, `operacao` e `leitura`. Essas roles foram normalizadas para o contrato atual `admin`, `operator`, `viewer` na migration de user management.

## Banco de dados e RLS

Schema base:

| Objeto | Contrato |
| --- | --- |
| `public.app_role` | Enum `admin`, `operator`, `viewer` |
| `public.user_status` | Enum `active`, `disabled` |
| `public.profiles` | 1:1 com `auth.users`, perfil editavel e status |
| `public.user_roles` | 1:1 com `auth.users`, role unica por usuario |
| `public.handle_new_user()` | Trigger que cria `profiles` e `user_roles` para novo usuario |
| `public.handle_user_update()` | Sincroniza email em `profiles` quando Auth muda |
| `public.is_admin()` | Helper `SECURITY DEFINER` para RLS |
| `public.is_admin_or_operator()` | Helper `SECURITY DEFINER` para RLS |
| `public.is_active_user()` | Helper `SECURITY DEFINER` para RLS |
| `public.get_user_role(uuid)` | Helper `SECURITY DEFINER` para leitura de role |

RLS:

| Tabela | Leitura | Escrita |
| --- | --- | --- |
| `profiles` | Proprio usuario ou admin | Proprio usuario ou admin, mas grants limitam usuario comum a `full_name` e `avatar_url` |
| `user_roles` | Proprio usuario ou admin | Admin |

As policies nao devem consultar diretamente tabelas protegidas; use helpers `SECURITY DEFINER`.

Remover acesso ao app pela funcao `delete-user` apaga `profiles`, `user_roles` e `dashboard_user_activity`, mas preserva `auth.users`.

## Edge Functions protegidas

Padrao de backend:

```ts
const authResult = await requireRole(req, ['admin'])
if (isRbacError(authResult)) return authResult.error
```

Funcoes de gestao de usuarios:

| Funcao | Role |
| --- | --- |
| `list-users` | `admin` |
| `invite-user` | `admin` |
| `resend-user-invite` | `admin` |
| `update-user-role` | `admin` |
| `set-user-status` | `admin` |
| `delete-user` | `admin` |

Funcoes administrativas atuais com RBAC:

| Funcao | Role |
| --- | --- |
| `admin-update-onboarding-identity` | `admin` |
| `admin-upload-logo` | `admin` |
| `admin-set-active-logo` | `admin` |
| `admin-delete-logo-from-history` | `admin` |
| `set-onboarding-access` | `admin` |
| `update-onboarding-copy` | `admin` |
| `update-enrichment-config` | `admin` |
| `update-perplexity-config` | `admin` |
| `update-nanobanana-config` | `admin` |
| `read-nanobanana-reference` | `admin` |
| `retry-ai-campaign-assets` | `admin`, `operator` |

Essas funcoes devem ser deployadas com JWT verificado pelo gateway, ou seja, sem `--no-verify-jwt`, salvo quando a `functionSpec.md` da funcao explicitamente documentar outra estrategia e o codigo confirmar isso.

## Funcoes publicas relacionadas ao dashboard

Algumas leituras ainda estao publicas no estado atual do codigo e usam `SUPABASE_SERVICE_ROLE_KEY` internamente:

| Funcao | Estado atual observado |
| --- | --- |
| `get-ai-campaign-monitor` | Publica no codigo atual, com rate limit por IP |
| `get-perplexity-config` | Publica no codigo atual; mascara API key |
| `get-nanobanana-config` | Publica no codigo atual; retorna signed URLs temporarias |
| `get-enrichment-config` | Publica no codigo atual |

Antes de mudar qualquer uma para protegida, atualizar frontend, functionSpec, deploy checklist e verificar impacto no onboarding publico.

## Erros esperados

| Status | Origem comum | Significado |
| --- | --- | --- |
| 401 | `_shared/auth.ts` ou gateway Supabase | JWT ausente, invalido ou expirado |
| 403 | `_shared/rbac.ts` | Role insuficiente, usuario sem role valida ou `profiles.status != active` |
| 409 | User management | Operacao bloqueada por regra de ultimo admin ou auto-delete |
| 500 | Config/backend | Env ausente, falha Supabase ou erro de banco |

`adminFetch` tenta uma unica renovacao de sessao quando recebe 401. Se o retry falhar, a UI deve tratar como sessao expirada e enviar usuario para login.

## Validacao recomendada

Frontend:

```bash
npm run lint
npm run build
```

Edge Functions compartilhadas:

```bash
deno test supabase/functions/_shared/ --allow-env --allow-net --allow-read
```

User management:

```bash
deno test supabase/functions/{list-users,invite-user,update-user-role,set-user-status,delete-user}/ --allow-env --allow-net --allow-read
```

Schema/RLS:

```bash
supabase db reset
```

Deploy de funcoes protegidas:

```bash
supabase functions deploy <name> --project-ref awqtzoefutnfmnbomujt
```

Nao usar `--no-verify-jwt` para funcoes protegidas por JWT + RBAC.
