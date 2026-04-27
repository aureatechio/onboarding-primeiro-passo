# Supabase - Regras de Negocio e Operacao

## 1. O banco e compartilhado com o CRM

O Supabase deste projeto nao e exclusivo do onboarding. Objetos de CRM, checkout,
financeiro, producao, ads e WhatsApp vivem no mesmo schema `public`.

Alterar uma tabela compartilhada pode quebrar outros sistemas.

## 2. Separar objeto proprio de dependencia

Antes de mudar qualquer objeto, classificar:

- Proprio deste app.
- Dependencia lida por este app.
- Objeto de outro modulo do CRM.
- Objeto temporario/backup.

Se nao estiver claro, tratar como objeto do CRM e pedir confirmacao de ownership.

## 3. Nunca editar migration existente

Toda mudanca de schema deve entrar em nova migration em `supabase/migrations/`.
Migrations antigas documentam historico aplicado e nao devem ser reescritas.

## 4. Nao usar `db push` quando o historico remoto divergir

O historico remoto do projeto `awqtzoefutnfmnbomujt` pode conter migrations de
outros fluxos que nao existem neste repo local. Se `supabase db push --dry-run`
reportar "Remote migration versions not found in local migrations directory",
nao usar `supabase db push` e nao executar `migration repair --status reverted`
em massa.

Nessa situacao, aplicar somente a migration nova:

```bash
supabase db query --linked -f supabase/migrations/<new_migration>.sql
supabase migration repair --linked --status applied <version>
```

Depois confirmar os objetos criados com consultas read-only direcionadas.

## 5. Service role fica fora do frontend

`SUPABASE_SERVICE_ROLE_KEY` so pode existir em Edge Functions, scripts locais
controlados ou ambiente backend. Nunca usar em `src/`, Vite env publica ou
bundle do browser.

## 6. Frontend nao substitui autorizacao backend

Guards de UI melhoram experiencia, mas toda operacao sensivel em Edge Function
deve validar JWT e RBAC no backend.

## 7. Auth interno depende de `profiles` e `user_roles`

Todo usuario com acesso ao dashboard deve ter:

- Linha em `public.profiles`.
- Linha em `public.user_roles`.
- Role valida: `admin`, `operator` ou `viewer`.
- Status valido: `active` ou `disabled`.

Remover acesso deste app nao deve excluir `auth.users`; deve remover os registros proprios do dashboard e impedir a sessao de entrar no app.

## 8. `viewer` e o default seguro

Novos usuarios devem receber `viewer` por default. Promover para `operator` ou
`admin` exige acao administrativa explicita.

## 9. Nao autorizar por `user_metadata`

`raw_user_meta_data` e controlavel pelo usuario. Nao usar para RBAC, RLS ou
decisoes de permissao.

## 10. RLS em tabelas expostas

Toda tabela nova em schema exposto deve ter RLS avaliado. Para tabelas do app,
preferir RLS habilitado e policies especificas. Para operacoes publicas do
onboarding, usar Edge Functions com validacao por `compra_id`.

## 11. Policies nao devem consultar tabela protegida diretamente

Use helpers `SECURITY DEFINER`, como:

- `is_admin()`
- `is_admin_or_operator()`
- `is_active_user()`
- `get_user_role(uuid)`
- `get_user_status(uuid)`, se existir no estado remoto

Isso evita recursao e falhas de permissao.

## 12. Tabelas singleton devem ser atualizadas, nao duplicadas

Sao singleton operacionais:

- `enrichment_config`
- `nanobanana_config`
- `perplexity_config`
- `onboarding_copy`

Preferir `UPDATE`/upsert controlado. Nao criar multiplas configs ativas sem
mudar explicitamente o contrato.

## 13. Onboarding publico nao usa login JWT

O formulario publico usa `compra_id` UUID e Edge Functions publicas. Nao exigir
login JWT nesse fluxo sem redesenhar o acesso do cliente final.

## 14. Elegibilidade do onboarding depende do CRM

A compra so deve carregar quando estiver elegivel pelo contrato atual:

```text
(checkout_status === 'pago' || vendaaprovada === true)
&& clicksign_status === 'Assinado'
```

Excecoes passam por `onboarding_access`.

## 15. Escrita publica deve ficar limitada a tabelas do app

Funcoes publicas podem ler CRM com service role, mas devem gravar apenas em
objetos do onboarding/AI quando esse for o contrato da funcao.

## 16. Nao apagar ou remodelar objetos do CRM por limpeza local

Usuarios, vendedores, membros de producao, compras e clientes podem ter vinculos
com outros modulos. Antes de deletar Auth user, verificar FKs como:

- `vendedores.user_id`
- `producao_members.auth_user_id`
- `profiles.id` / `profiles.user_id`
- `user_roles.user_id`

## 17. Delete de Auth nao invalida tokens imediatamente

Ao remover/desativar usuario, considerar sessoes existentes. Para bloqueio
operacional do dashboard, alinhar `profiles.status` com ban no Supabase Auth.

## 18. Storage privado exige signed URL ou service role

Buckets privados relevantes:

- `onboarding-identity`
- `ai-campaign-assets`
- `nanobanana-references`

O frontend nao deve depender de URL publica nesses buckets.

## 19. Buckets publicos do CRM nao sao area livre

Mesmo buckets publicos podem ser usados por outros produtos. Nao alterar
policies, limites ou nomes de buckets compartilhados sem ownership explicito.

## 20. Edge Function deve ter classificacao de deploy

Antes de deployar, classificar:

- Publica: usar `--no-verify-jwt`.
- Protegida por JWT/RBAC: nao usar `--no-verify-jwt`.
- Excecao com segredo proprio: documentar no `functionSpec.md`.

## 21. Atualizar docs junto com mudanca estrutural

Mudancas em schema, Auth, triggers, Edge Functions, Storage ou ownership devem
atualizar esta pasta.
