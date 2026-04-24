# Gestão de Usuários e RBAC no Dashboard

## Status
Em implementação.

## Escopo
- Schema `profiles`, `user_roles`, roles e status.
- Edge Functions protegidas: `list-users`, `invite-user`, `update-user-role`, `set-user-status`, `delete-user`.
- RBAC em endpoints administrativos existentes.
- UI `/users` e `/profile`.
- Guards por role no dashboard.

## Gate
- `supabase db reset`
- `deno test supabase/functions/_shared/ --allow-env --allow-net --allow-read`
- `deno test supabase/functions/{list-users,invite-user,update-user-role,set-user-status,delete-user}/ --allow-env --allow-net --allow-read`
- `npm run lint`
- `npm run build`

## Deploy
Todas as 5 funcoes novas sao protegidas e devem ser deployadas sem `--no-verify-jwt`:

```bash
supabase functions deploy list-users --project-ref awqtzoefutnfmnbomujt
supabase functions deploy invite-user --project-ref awqtzoefutnfmnbomujt
supabase functions deploy update-user-role --project-ref awqtzoefutnfmnbomujt
supabase functions deploy set-user-status --project-ref awqtzoefutnfmnbomujt
supabase functions deploy delete-user --project-ref awqtzoefutnfmnbomujt
```
