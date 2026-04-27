# Autenticacao e RBAC — Regras de Negocio

Regras criticas extraidas do codigo, migrations e functionSpecs. Violar qualquer uma pode abrir acesso indevido, bloquear admins ou quebrar o dashboard interno.

## 1. Supabase Auth e a origem da conta e da sessao

Credenciais, convites, recuperacao de senha, access token e refresh token pertencem ao Supabase Auth. Nao criar mecanismo paralelo de senha ou token no frontend.

## 2. `profiles` e `user_roles` sao obrigatorios para todo usuario com acesso interno

Todo usuario com acesso ao dashboard deve ter uma linha em `public.profiles` e uma linha em `public.user_roles`. O trigger `handle_new_user` cria ambas as linhas para novos usuarios.

## 3. Role default e `viewer`

Novos usuarios recebem `viewer` por padrao. Convites podem definir `admin`, `operator` ou `viewer`, mas devem validar role antes de gravar.

## 4. Roles validas atuais

As unicas roles validas no contrato implementado sao:

- `admin`
- `operator`
- `viewer`

Nao reintroduzir `supervisor`, `operacao`, `leitura`, `agent` ou outras roles sem nova migration, ajuste de frontend, ajuste de backend e atualizacao desta documentacao.

## 5. Status validos atuais

Os unicos status validos sao:

- `active`
- `disabled`

`profiles.status != active` deve impedir uso de funcoes protegidas via `_shared/rbac.ts`.

## 6. Usuario desativado deve ficar alinhado com Supabase Auth ban

Ao desativar usuario, atualizar `profiles.status = disabled` e aplicar ban no Supabase Auth. Ao reativar, atualizar `profiles.status = active` e remover ban.

## 7. Usuario desativado nao pode logar no dashboard

Mesmo que Supabase Auth retorne sessao, `AuthContext.signInWithPassword()` deve consultar `profiles.status`; se estiver `disabled`, deve chamar `signOut()` e bloquear o acesso.

## 8. Service role nunca vai para o frontend

`SUPABASE_SERVICE_ROLE_KEY` so pode existir em Edge Functions, scripts locais seguros ou ambientes backend. Frontend usa apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## 9. Autorizacao nao pode depender de `user_metadata`

`raw_user_meta_data` / `user_metadata` e controlavel pelo usuario. Nunca usar esses dados para RBAC, RLS ou autorizacao. Roles vivem em `public.user_roles`.

## 10. JWT e identidade; RBAC e banco

O JWT prova a identidade do usuario via Supabase Auth. A permissao da aplicacao deve ser carregada de `public.user_roles`, e o status operacional de `public.profiles`.

## 11. Frontend guard nao substitui backend guard

`RequireRole` e `App.jsx` melhoram UX, mas nao protegem dados sozinhos. Toda Edge Function sensivel deve validar JWT e role no backend.

## 12. Funcoes protegidas usam `requireRole` ou `requireAdmin`

Edge Functions administrativas devem usar `_shared/rbac.ts`, preferencialmente:

```ts
const authResult = await requireRole(req, ['admin'])
if (isRbacError(authResult)) return authResult.error
```

Para admin puro, `requireAdmin(req)` e aceitavel.

## 13. `requireAuth` rejeita tokens ausentes, invalidos e service_role

`_shared/auth.ts` espera `Authorization: Bearer <access_token>`, valida com `auth.getUser()` e rejeita token com role `service_role` em rotas de usuario humano.

## 14. Funcoes protegidas devem ser deployadas sem `--no-verify-jwt`

Quando uma funcao e JWT + RBAC, o deploy correto e:

```bash
supabase functions deploy <name> --project-ref awqtzoefutnfmnbomujt
```

Nao adicionar `--no-verify-jwt` em funcao protegida.

## 15. Funcoes publicas devem ser explicitamente classificadas

Funcoes publicas precisam ter motivo claro e functionSpec/docs atualizados. O onboarding publico nao tem login JWT; nao proteger endpoints publicos do onboarding sem adaptar o fluxo do cliente final.

## 16. `adminFetch` e o caminho padrao para chamadas admin do frontend

Chamadas do dashboard para Edge Functions protegidas devem usar `src/lib/admin-edge.js`, que injeta `Authorization`, `apikey` e tenta refresh unico em 401.

## 17. Recuperacao de senha e convite passam por `/reset-password`

Links de recovery usam `/reset-password`. Convites usam `/reset-password?type=invite`. A pagina le tokens no hash, chama `setSession()`, atualiza senha e faz `signOut()` ao concluir.

## 18. Nao remover `detectSessionInUrl: false` sem revisar `/reset-password`

O app trata manualmente os tokens de recovery/invite em `ResetPassword.jsx`. Alterar `detectSessionInUrl` pode mudar esse fluxo e causar efeitos colaterais de sessao.

## 19. Nao permitir open redirect em `next`

`Login.jsx` so aceita `next` iniciado por `/`. Qualquer mudanca no redirect pos-login deve manter essa protecao contra URL externa.

## 19.1. Remocao de acesso ao app nao apaga Auth

Excluir usuario na tela `/users` significa remover acesso deste app: apagar registros em `public.profiles`, `public.user_roles` e `public.dashboard_user_activity`, sem apagar a conta em `auth.users`. Usuarios sem `profiles` + `user_roles` nao devem aparecer na lista de usuarios nem acessar o dashboard.

## 20. Nao bloquear o ultimo admin

Nao e permitido rebaixar, desativar ou remover acesso do unico admin. As Edge Functions de user management devem manter a checagem `LAST_ADMIN`.

## 21. Admin nao pode excluir a propria conta

`delete-user` deve manter bloqueio de auto-delete (`SELF_DELETE`) para evitar perda acidental do proprio acesso durante operacao administrativa.

## 22. Usuario comum so edita campos permitidos do proprio perfil

Usuario autenticado pode atualizar apenas `full_name` e `avatar_url` em `profiles`. Mudancas de role, status ou email operacional passam por funcoes admin/Supabase Auth.

## 23. RLS nao deve consultar tabelas protegidas diretamente

Policies devem usar helpers `SECURITY DEFINER`, como `is_admin()`, `is_admin_or_operator()`, `is_active_user()` e `get_user_role(uuid)`, para evitar recursao e falhas de permissao.

## 24. Nunca editar migration existente

`supabase/migrations/20260424150000_create_user_management.sql` documenta o contrato base. Mudancas de schema, enum, RLS ou trigger exigem nova migration.

## 25. Enum de role exige cuidado especial

Adicionar role nova em Postgres enum e mudanca de schema. Antes de fazer isso, revisar todas as comparacoes em frontend, `_shared/rbac.ts`, migrations, policies, functionSpecs e UI.

## 26. `profiles.id` e `profiles.user_id` devem apontar para `auth.users.id`

O contrato atual mantem `profiles.id = auth.users.id` e `profiles.user_id` unico. Nao criar perfis sem vinculo com `auth.users`.

## 27. `user_roles.user_id` e unico

Cada usuario tem exatamente uma role ativa. Nao modelar multiplas roles por usuario sem mudar explicitamente o contrato.

## 28. Convite deve criar profile e role

`invite-user` deve enviar convite pelo Supabase Auth e fazer upsert em `profiles` e `user_roles`. Usuario convidado sem role cai em comportamento inconsistente.

## 28.1. Reenvio de convite nao altera permissao

`resend-user-invite` deve aceitar apenas usuarios convidados com convite pendente. Nao deve alterar `profiles.status`, `user_roles.role` ou recriar usuarios ja confirmados.

## 29. CORS deve aceitar headers de auth

Funcoes protegidas precisam permitir `authorization`, `apikey` e `content-type` nos headers CORS, alem dos headers compartilhados do projeto quando aplicavel.

## 30. Erros 401 e 403 tem significados diferentes

401 significa token ausente, invalido ou expirado. 403 significa usuario autenticado sem permissao, role invalida ou status inativo. Nao mascarar 403 como 401 sem motivo.

## 31. Leitura publica de configuracoes e excecao operacional

No codigo atual, algumas leituras de configuracao e monitor ainda sao publicas. Antes de proteger ou expor novas leituras, confirmar impacto em dashboard, onboarding publico, functionSpec e checklist de deploy.

## 32. O monitor `/ai-step2/monitor` exige sessao no frontend

`/ai-step2/monitor` esta sob prefixo protegido em `App.jsx`, mas nao tem `RequireRole` dedicado no roteamento atual. Qualquer endurecimento por role deve ser refletido no frontend e nas Edge Functions consumidas.

## 33. Testes minimos apos mudancas de auth

Apos alterar auth, RBAC, RLS ou funcoes de usuario, rodar pelo menos:

```bash
deno test supabase/functions/_shared/ --allow-env --allow-net --allow-read
npm run lint
npm run build
```

Para gestao de usuarios, tambem rodar:

```bash
deno test supabase/functions/{list-users,invite-user,update-user-role,set-user-status,delete-user}/ --allow-env --allow-net --allow-read
```
