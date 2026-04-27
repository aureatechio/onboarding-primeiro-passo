# Autenticacao e RBAC — Ordem de Leitura por Tipo de Tarefa

Leia SEMPRE o `README.md` deste diretorio primeiro. Depois, conforme o tipo de tarefa:

## Alterar login, logout ou sessao do dashboard

1. `docs/context/authentication/README.md`
2. `docs/context/authentication/BUSINESS-RULES.md`
3. `src/lib/auth-client.js`
4. `src/context/AuthContext.jsx`
5. `src/App.jsx`
6. `src/pages/Login.jsx`
7. `src/pages/ForgotPassword.jsx` e `src/pages/ResetPassword.jsx`, se envolver recuperacao ou convite

## Alterar guard de rota ou permissao no frontend

1. `docs/context/authentication/README.md`
2. `docs/context/authentication/BUSINESS-RULES.md`
3. `src/App.jsx`
4. `src/components/RequireRole.jsx`
5. `src/context/AuthContext.jsx`
6. Pagina alvo em `src/pages/`

## Alterar RBAC em Edge Functions administrativas

1. `docs/context/authentication/README.md`
2. `docs/context/authentication/BUSINESS-RULES.md`
3. `supabase/functions/_shared/auth.ts`
4. `supabase/functions/_shared/rbac.ts`
5. `supabase/functions/<funcao>/functionSpec.md`, se existir
6. `supabase/functions/<funcao>/index.ts`

## Alterar gestao de usuarios

1. `docs/context/authentication/README.md`
2. `docs/context/user-management/README.md`
3. `docs/context/user-management/BUSINESS-RULES.md`
4. `docs/context/authentication/BUSINESS-RULES.md`
5. `supabase/functions/_shared/user-management.ts`
6. `supabase/functions/{list-users,invite-user,update-user-role,set-user-status,delete-user}/functionSpec.md`
7. `src/pages/Users/`
8. `src/pages/Profile.jsx`

## Alterar schema, policies RLS ou helpers de auth

1. `docs/context/authentication/README.md`
2. `docs/context/authentication/BUSINESS-RULES.md`
3. `supabase/migrations/20260424150000_create_user_management.sql` para entender o contrato atual
4. `supabase/migrations/` para localizar a ultima migration
5. Criar nova migration; nunca editar migration existente

## Classificar ou deployar Edge Function protegida

1. `docs/context/authentication/README.md`
2. `docs/context/authentication/BUSINESS-RULES.md`
3. `plan/CHECKLIST-DEPLOY-EDGE-FUNCTIONS.md`
4. `supabase/functions/<funcao>/functionSpec.md`
5. `supabase/functions/<funcao>/index.ts`

## Investigar 401, 403 ou sessao expirada

1. `docs/context/authentication/README.md`
2. `docs/context/authentication/BUSINESS-RULES.md`
3. `src/lib/admin-edge.js`
4. `src/context/AuthContext.jsx`
5. `supabase/functions/_shared/auth.ts`
6. `supabase/functions/_shared/rbac.ts`
7. Edge Function chamada pela tela que falhou

## Referencias historicas

Use estes planos apenas para contexto de decisao, nao como fonte final do estado atual:

1. `plan/2026-04-17-fase0-definicao-acesso-dashboard.md`
2. `plan/2026-04-19-fase1-fundacao-auth-frontend-dashboard.md`
3. `plan/2026-04-24-user-management.md`

Observacao importante: os planos antigos citam roles `supervisor`, `operacao` e `leitura`, mas o contrato implementado hoje e `admin`, `operator`, `viewer`.
