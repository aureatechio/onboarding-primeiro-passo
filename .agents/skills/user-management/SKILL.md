---
name: user-management
description: Carrega o contexto canonico do modulo User Management (RBAC do dashboard interno) antes de modificar tabelas profiles/user_roles, trigger handle_new_user, helpers SECURITY DEFINER, rotas /users e /profile, AuthContext, ou Edge Functions de gestao de usuarios. Use quando o pedido envolver convite/cadastro/desativacao de usuarios, alteracao de roles (admin/operator/viewer), policies RLS de tabelas internas, ou login/perfil do dashboard.
---

# User Management — Skill de Contexto

Carrega o contexto canonico do modulo de gestao de usuarios do dashboard interno antes de qualquer alteracao em RBAC, profiles, user_roles, trigger de signup, rotas autenticadas ou Edge Functions de user management.

## Quando acionar

Use esta skill quando o pedido envolver:
- Tabelas `profiles`, `user_roles`
- Trigger `handle_new_user` (cria `profiles` + `user_roles` na criacao da conta)
- Helpers `SECURITY DEFINER`: `is_admin()`, `is_admin_or_operator()`, `is_active_user()`, `get_user_role(uuid)`, `get_user_status(uuid)`
- Rotas autenticadas: `/users`, `/profile`, `/login`, `/forgot-password`, `/reset-password`
- Auth no SPA: `src/context/AuthContext.jsx`, `src/lib/admin-edge.js`
- Modulo RBAC: `supabase/functions/_shared/rbac.ts`
- Edge Functions de gestao de usuarios (protegidas, JWT obrigatorio)
- Convites via `inviteUserByEmail` com redirect para `/reset-password?type=invite`
- Status de conta: `profiles.status` alinhado com ban no Supabase Auth

## Gate obrigatorio antes de agir

1. Ler `docs/context/user-management/README.md` (arquitetura e matriz de permissao).
2. Ler `docs/context/user-management/BUSINESS-RULES.md` (15 regras criticas).
3. Ler `supabase/functions/_shared/rbac.ts` (helpers de autorizacao no servidor).
4. Para Edge Function alvo, ler o `functionSpec.md` (quando existir) antes do `index.ts`.
5. Para alteracao de schema/policy, listar migrations recentes em `supabase/migrations/` (nunca editar uma existente).
6. Citar evidencias e respeitar todas as Business Rules.

## Mapa rapido do modulo

### Arquitetura

- Supabase Auth e a fonte da conta e da sessao.
- `profiles` armazena dados editaveis e `status` operacional (`active`, `disabled`).
- `user_roles` armazena RBAC. Roles oficiais: `admin`, `operator`, `viewer`.
- Trigger `handle_new_user` cria, na criacao da conta, **uma linha em `profiles` + uma linha em `user_roles`** (default `viewer`). Sem essas duas linhas, o RBAC quebra.
- Edge Functions de user management usam JWT + `_shared/rbac.ts`. Devem ser deployadas SEM `--no-verify-jwt`.

### Matriz de permissao

| Role | Permissoes |
|------|------------|
| `admin` | Gestao de usuarios, configuracoes, copy, logos, edicao de onboarding, operacoes |
| `operator` | Painel operacional + acoes operacionais permitidas |
| `viewer` | Somente leitura, sem mutacoes |

### Rotas no SPA

| Rota | Acesso |
|------|--------|
| `/users` | admin |
| `/profile` | admin, operator, viewer |
| Configuracoes (copy editor, NanoBanana, Perplexity, enrichment) | admin |
| `/login`, `/forgot-password`, `/reset-password` | publico |

## Business Rules nao-negociaveis

Resumo (sempre confirmar leitura completa em `docs/context/user-management/BUSINESS-RULES.md`):

1. Todo usuario autenticado deve ter linha em `profiles` E em `user_roles`.
2. Role default na criacao da conta e `viewer`.
3. `anderson.domingos@aureatech.io` deve ser promovido a `admin` na migration inicial (seed).
4. Apenas admins gerenciam usuarios.
5. Apenas admins alteram configuracoes/copy/logos/dados editaveis do onboarding.
6. Operators executam fluxos operacionais, mas nao gerenciam usuarios/configuracoes.
7. Viewers nao executam mutacoes.
8. Desativar usuario = ban no Supabase Auth + `profiles.status = 'disabled'` (mantem-se alinhados).
9. Nunca rebaixar, desativar ou excluir o unico admin restante.
10. Admin nao pode excluir a propria conta.
11. Usuario comum so atualiza `full_name` e `avatar_url` no proprio perfil.
12. Policies RLS NUNCA consultam diretamente tabelas protegidas — usar helpers `SECURITY DEFINER` (`is_admin()`, `is_admin_or_operator()`, `is_active_user()`, `get_user_role(uuid)`, `get_user_status(uuid)`).
13. Edge Functions de user management sao protegidas — deploy SEM `--no-verify-jwt`.
14. Service role NUNCA vai para o frontend.
15. Convite usa `inviteUserByEmail` com redirect para `/reset-password?type=invite`.

## Checklist por tipo de tarefa

### Nova Edge Function de user management
1. Criar `supabase/functions/<nome>/functionSpec.md` (skill `sdd-spec-creator`).
2. Implementar com `_shared/rbac.ts` para autorizacao server-side.
3. Deploy SEM `--no-verify-jwt`.
4. Confirmar comportamento em todas as roles (admin/operator/viewer).

### Nova policy RLS
1. Identificar tabela e operacao (SELECT/INSERT/UPDATE/DELETE).
2. Criar nova migration (nunca editar existente).
3. Usar helper `SECURITY DEFINER` adequado — nao consultar tabelas protegidas dentro da policy.
4. Validar com role `viewer`, `operator` e `admin`.

### Alteracao de roles ou status
1. Validar que nao quebra regras 8/9/10 (unico admin, ban alinhado, autoexclusao).
2. Auditar: registrar motivo e responsavel quando aplicavel.
3. Garantir que UI no SPA (admin) reflete o estado correto.

### Convite/criacao de conta
1. Usar `inviteUserByEmail` com `redirectTo` apontando para `/reset-password?type=invite`.
2. Confirmar que trigger `handle_new_user` criou `profiles` + `user_roles`.
3. Definir role inicial conforme intencao (default `viewer`).

## Padrao de resposta

Toda resposta da skill deve:
1. Citar docs lidos (`docs/context/user-management/README.md`, `BUSINESS-RULES.md`, `_shared/rbac.ts`, functionSpec quando aplicavel).
2. Identificar tabelas/funcoes/rotas afetadas.
3. Listar Business Rules que se aplicam ao pedido (referenciar pelo numero).
4. Confirmar que Edge Functions tocadas serao deployadas com JWT (sem `--no-verify-jwt`).
5. Confirmar que nenhuma policy RLS proposta consulta diretamente tabelas protegidas.
