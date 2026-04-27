# Copy Editor - Ordem de Leitura por Tipo de Tarefa

## Entender o modulo antes de alterar

1. `docs/context/copy-editor/README.md`
2. `docs/context/copy-editor/BUSINESS-RULES.md`
3. `docs/context/copy-editor/FRONTEND-ARCHITECTURE.md`
4. `docs/context/copy-editor/DATA-CONTRACT.md`
5. `docs/context/onboarding/README.md`
6. `docs/context/authentication/README.md`

## Alterar UI/UX do editor

1. `docs/context/copy-editor/README.md`
2. `docs/context/copy-editor/FRONTEND-ARCHITECTURE.md`
3. `src/pages/CopyEditor/index.jsx`
4. `src/pages/CopyEditor/PreviewEditorLayout.jsx`
5. `src/pages/CopyEditor/EditorToolbar.jsx`
6. `src/pages/CopyEditor/PublishDialog.jsx`
7. Preview especifico em `src/pages/CopyEditor/previews/<Etapa>Preview.jsx`
8. Blocos reutilizaveis em `src/pages/CopyEditor/blocks/`

## Adicionar ou remover campos editaveis

1. `docs/context/copy-editor/BUSINESS-RULES.md`
2. `docs/context/copy-editor/DATA-CONTRACT.md`
3. `src/copy.js`
4. Preview da etapa em `src/pages/CopyEditor/previews/*`
5. Componentes inline `EditableText`, `EditableList` ou `EditableObjectList`
6. `src/context/CopyContext.jsx`
7. `docs/mapeamento-formulario-onboarding.md` se o campo for funcional, nao apenas texto

Observacao: `EtapaSection.jsx` e `FieldEditor.jsx` pertencem ao editor MVP
anterior. O fluxo ativo e preview-first.

## Alterar persistencia ou publicacao

1. `docs/context/copy-editor/BUSINESS-RULES.md`
2. `docs/context/copy-editor/DATA-CONTRACT.md`
3. `src/pages/CopyEditor/useCopyEditor.js`
4. `src/lib/deep-merge.js`
5. `src/lib/admin-edge.js`
6. `supabase/functions/get-onboarding-copy/index.ts`
7. `supabase/functions/update-onboarding-copy/index.ts`
8. `docs/context/supabase/EDGE-FUNCTIONS.md`

## Alterar Auth/RBAC do Copy Editor

1. `docs/context/authentication/README.md`
2. `docs/context/authentication/BUSINESS-RULES.md`
3. `docs/context/copy-editor/BUSINESS-RULES.md`
4. `src/App.jsx`
5. `src/components/RequireRole.jsx`
6. `src/context/AuthContext.jsx`
7. `src/lib/admin-edge.js`
8. `supabase/functions/_shared/auth.ts`
9. `supabase/functions/_shared/rbac.ts`
10. `supabase/functions/update-onboarding-copy/index.ts`

## Alterar schema do Copy CMS

1. `docs/context/supabase/README.md`
2. `docs/context/supabase/DATABASE-INVENTORY.md`
3. `docs/context/copy-editor/DATA-CONTRACT.md`
4. `supabase/migrations/20260414100000_create_onboarding_copy.sql` apenas para consulta
5. Criar nova migration
6. Atualizar `supabase/functions/update-onboarding-copy/index.ts`
7. Atualizar esta pasta de contexto

## Debugar publicacao que nao persistiu

1. `docs/context/copy-editor/OPERATIONS.md`
2. `src/pages/CopyEditor/useCopyEditor.js`
3. `supabase/functions/update-onboarding-copy/index.ts`
4. Consultar `onboarding_copy.version` e `onboarding_copy.content`
5. Consultar ultima linha de `onboarding_copy_versions`
6. Verificar JWT/role do usuario em `user_roles` e `profiles.status`

## Debugar texto incorreto no onboarding publico

1. `docs/context/copy-editor/DATA-CONTRACT.md`
2. `src/context/CopyContext.jsx`
3. `src/lib/deep-merge.js`
4. `src/copy.js`
5. `supabase/functions/get-onboarding-copy/index.ts`
6. Etapa publica afetada em `src/pages/Etapa*.jsx`

