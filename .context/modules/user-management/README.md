# User Management

Modulo de gestao de usuarios do dashboard interno.

## Arquitetura
- Supabase Auth continua sendo a origem da conta e sessao.
- `profiles` armazena dados editaveis do usuario e status operacional.
- `user_roles` armazena RBAC (`admin`, `operator`, `viewer`).
- Trigger `handle_new_user` cria profile e role `viewer` para novas contas.
- Edge Functions de user management usam JWT + `_shared/rbac.ts`.

## Matriz de permissao
- `admin`: usuarios, configuracoes, copy, logos, edicao de onboarding e operacoes.
- `operator`: painel operacional e acoes operacionais permitidas.
- `viewer`: leitura.

## Rotas
- `/users`: admin.
- `/profile`: admin, operator, viewer.
- Configuracoes: admin.
- `Post Gen`: admin/operator.
