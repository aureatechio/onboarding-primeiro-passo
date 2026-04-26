# User Management — Business Rules

1. Todo usuario autenticado deve ter `profiles` e `user_roles`.
2. Role default para novos usuarios e `viewer`.
3. `anderson.domingos@aureatech.io` deve ser promovido a `admin` na migration inicial.
4. Apenas admins gerenciam usuarios.
5. Apenas admins alteram configuracoes/copy/logos/dados editaveis do onboarding.
6. Operators podem executar fluxos operacionais, mas nao gerenciam usuarios/configuracoes.
7. Viewers nao executam mutacoes.
8. Usuario desativado recebe ban no Supabase Auth e `profiles.status = disabled`.
9. Nao e permitido rebaixar, desativar ou excluir o unico admin.
10. Admin nao pode excluir a propria conta.
11. Usuario comum pode atualizar apenas proprio `full_name` e `avatar_url`.
12. Policies RLS nunca devem consultar diretamente tabelas protegidas; usar helpers `SECURITY DEFINER`.
13. Funcoes de user management sao protegidas e devem ser deployadas sem `--no-verify-jwt`.
14. Service role nunca deve ir para o frontend.
15. Convite usa `inviteUserByEmail` e redirect para `/reset-password?type=invite`.
