# Supabase - Ordem de Leitura

Use esta pasta quando a tarefa envolver banco compartilhado, Auth, Edge Functions,
Storage, triggers, RLS, migrations ou qualquer integracao Supabase deste projeto.

## Leitura rapida

1. `docs/context/supabase/README.md`
2. `docs/context/supabase/BUSINESS-RULES.md`
3. `docs/context/supabase/DATABASE-INVENTORY.md`
4. `docs/context/supabase/EDGE-FUNCTIONS.md`
5. `docs/context/supabase/AUTH-RBAC.md`
6. `docs/context/supabase/STORAGE-EXTENSIONS-TRIGGERS.md`

## Leitura por tipo de alteracao

### Mudanca em tabela, coluna, trigger, policy ou enum

1. `docs/context/supabase/BUSINESS-RULES.md`
2. `docs/context/supabase/DATABASE-INVENTORY.md`
3. `supabase/migrations/`
4. Criar nova migration. Nunca editar migration existente.

### Mudanca em login, usuarios, roles ou permissoes

1. `docs/context/supabase/AUTH-RBAC.md`
2. `docs/context/authentication/README.md`
3. `docs/context/user-management/README.md`
4. `supabase/functions/_shared/rbac.ts`
5. `supabase/functions/_shared/auth.ts`

### Mudanca em Edge Function

1. `docs/context/supabase/EDGE-FUNCTIONS.md`
2. `supabase/functions/<function>/functionSpec.md`, quando existir
3. `supabase/functions/<function>/index.ts`
4. `_shared/` importado pela funcao

### Mudanca em Storage

1. `docs/context/supabase/STORAGE-EXTENSIONS-TRIGGERS.md`
2. Funcao que escreve/le o bucket
3. Policies do Storage no Supabase Dashboard ou migration aplicavel

### Mudanca em onboarding publico

1. `docs/context/onboarding/DOC-READING-ORDER.md`
2. `docs/context/supabase/DATABASE-INVENTORY.md`
3. `docs/mapeamento-formulario-onboarding.md`
4. Edge Function envolvida

### Mudanca em CRM compartilhado

1. `docs/context/supabase/README.md`
2. `docs/context/supabase/BUSINESS-RULES.md`
3. Confirmar ownership antes de alterar qualquer objeto que nao seja deste app.
