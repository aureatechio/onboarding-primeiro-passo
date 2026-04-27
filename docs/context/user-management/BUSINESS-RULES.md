# User Management — Business Rules

1. Todo usuario com acesso ao dashboard deve ter `profiles` e `user_roles`.
2. Role default para novos usuarios e `viewer`.
3. `anderson.domingos@aureatech.io` deve ser promovido a `admin` na migration inicial.
4. Apenas admins gerenciam usuarios.
5. Apenas admins alteram configuracoes/copy/logos/dados editaveis do onboarding.
6. Operators podem executar fluxos operacionais, mas nao gerenciam usuarios/configuracoes.
7. Viewers nao executam mutacoes.
8. Usuario desativado recebe ban no Supabase Auth e `profiles.status = disabled`.
9. Remover acesso ao app nao exclui `auth.users`; remove apenas `profiles`, `user_roles` e atividade do dashboard.
10. Nao e permitido rebaixar, desativar ou remover acesso do unico admin.
11. Admin nao pode remover o proprio acesso.
12. Usuario comum pode atualizar apenas proprio `full_name` e `avatar_url`.
13. Policies RLS nunca devem consultar diretamente tabelas protegidas; usar helpers `SECURITY DEFINER`.
14. Funcoes de user management sao protegidas e devem ser deployadas sem `--no-verify-jwt`.
15. Service role nunca deve ir para o frontend.
16. Convite usa `inviteUserByEmail` e redirect para `/reset-password?type=invite`.
