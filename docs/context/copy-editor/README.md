# Copy Editor - Contexto do Modulo

Snapshot: 2026-04-27.

## Escopo

O Copy Editor e o CMS interno da copy do onboarding publico. Ele permite que
usuarios internos com role `admin` editem textos do fluxo `Etapa1Hero ->
EtapaFinal`, revisem visualmente o resultado e publiquem overrides no Supabase
sem deploy de frontend.

O modulo nao substitui `src/copy.js`. A copy estatica continua sendo o fallback
e a referencia estrutural. O banco guarda apenas overrides publicados em
`onboarding_copy.content`, versionados em `onboarding_copy_versions`.

## Fonte de verdade atual

| Item | Fonte |
| --- | --- |
| Copy base/fallback | `src/copy.js` |
| Copy publicada | `public.onboarding_copy.content` |
| Historico de publicacoes | `public.onboarding_copy_versions` |
| Merge de fallback + overrides | `src/lib/deep-merge.js` |
| Consumo no onboarding publico | `src/context/CopyContext.jsx` |
| Editor interno | `src/pages/CopyEditor/` |
| Leitura publica da copy | `supabase/functions/get-onboarding-copy/index.ts` |
| Publicacao admin da copy | `supabase/functions/update-onboarding-copy/index.ts` |
| Auth/RBAC da rota | `src/App.jsx`, `src/components/RequireRole.jsx`, `src/lib/admin-edge.js` |

## Arquitetura resumida

```text
Admin autenticado
  -> /copy-editor
  -> DashboardRoute roles=['admin']
  -> CopyEditor/useCopyEditor
  -> get-onboarding-copy (publica)
  -> deepMergeCopy(copy.js, onboarding_copy.content)
  -> editor preview-first altera estado local
  -> computeDiff() gera apenas campos alterados e nao-funcao
  -> adminFetch('update-onboarding-copy')
  -> JWT + RBAC admin na Edge Function
  -> UPDATE singleton onboarding_copy
  -> INSERT historico onboarding_copy_versions

Cliente publico do onboarding
  -> CopyProvider
  -> get-onboarding-copy (publica)
  -> deepMergeCopy(copy.js, onboarding_copy.content)
  -> Etapa*.jsx via useCopy()
```

## Rota

| Rota | Autenticacao | Role | Arquivo |
| --- | --- | --- | --- |
| `/copy-editor` | Requer sessao Supabase Auth | `admin` | `src/pages/CopyEditor/index.jsx` |

A rota fica dentro do mesmo SPA React + Vite do onboarding e do dashboard.
O onboarding publico nao usa JWT, mas o Copy Editor sim.

## Fluxo de edicao

1. `useCopyEditor()` monta secoes a partir dos exports `ETAPA*` de `src/copy.js`.
2. Ao montar, chama `get-onboarding-copy`.
3. Se `version > 0`, aplica `deepMergeCopy(static, override)` por etapa.
4. A tela ativa e controlada pela query string `?etapa=<id>`.
5. Edicoes no preview chamam `onUpdate(path, value)`.
6. A etapa editada entra em `dirtyEtapas`.
7. `Comparar` mostra diferencas entre estado atual e baseline carregado.
8. `Publicar` abre modal com notas opcionais.
9. `publishToSupabase()` calcula diff contra `originalSections`.
10. A Edge Function incrementa versao, atualiza singleton e grava historico.

## Modelo de dados

Tabela singleton:

| Tabela | Papel | Escrita |
| --- | --- | --- |
| `onboarding_copy` | Conteudo publicado atual | Sempre `UPDATE`, nunca `INSERT` |
| `onboarding_copy_versions` | Historico append-only por publicacao | `INSERT` por publish |

Formato principal:

```json
{
  "ETAPA1": { "title": "..." },
  "ETAPA2": { "slide1": { "body": "..." } },
  "ETAPA_FINAL": { "parabens": { "body": "..." } }
}
```

Chaves validas:

- `ETAPA1`
- `ETAPA2`
- `ETAPA3`
- `ETAPA4`
- `ETAPA5`
- `ETAPA6`
- `ETAPA62`
- `ETAPA_FINAL`

## Arquivos principais

| Arquivo | Papel |
| --- | --- |
| `src/pages/CopyEditor/index.jsx` | Entry point da rota, integra layout, hook, publish modal e preview registry |
| `src/pages/CopyEditor/useCopyEditor.js` | Estado, import/export, diff, carregamento da copy publicada e publicacao |
| `src/pages/CopyEditor/PreviewEditorLayout.jsx` | Layout ativo preview-first, toolbar, sidebar, area de preview e diff |
| `src/pages/CopyEditor/EditorToolbar.jsx` | Acoes Buscar, Comparar, Resetar, Exportar, Importar e Publicar |
| `src/pages/CopyEditor/PublishDialog.jsx` | Modal de publicacao com notas opcionais |
| `src/pages/CopyEditor/SearchOverlay.jsx` | Busca global em strings editaveis |
| `src/pages/CopyEditor/DiffPanel.jsx` | Comparacao visual de campos alterados |
| `src/pages/CopyEditor/EditableText.jsx` | Edicao inline e suporte a variaveis `${var}` |
| `src/pages/CopyEditor/EditableList.jsx` | Edicao inline de arrays de strings |
| `src/pages/CopyEditor/EditableObjectList.jsx` | Edicao inline de arrays de objetos |
| `src/pages/CopyEditor/previews/*` | Previews visuais por etapa |
| `src/pages/CopyEditor/blocks/Pv*.jsx` | Blocos visuais reutilizados pelos previews |
| `src/pages/CopyEditor/constants.js` | Metadados das etapas, variaveis e textos do editor |
| `src/context/CopyContext.jsx` | Consumo da copy publicada no onboarding publico |
| `src/lib/deep-merge.js` | Merge defensivo preservando funcoes de `copy.js` |
| `src/lib/admin-edge.js` | Fetch com bearer JWT e refresh automatico em 401 |

## Componentes legados ou secundarios

Existem arquivos do MVP anterior ainda presentes:

- `CopyEditorLayout.jsx`
- `EtapaSection.jsx`
- `FieldEditor.jsx`
- `PreviewPanel.jsx`

O fluxo ativo em `index.jsx` usa `PreviewEditorLayout` e previews visuais. Antes
de alterar esses arquivos legados, confirme se eles ainda sao usados por alguma
rota ou se a mudanca deveria ocorrer nos previews `previews/*` e blocos `Pv*`.

## Relacao com outros modulos

| Modulo | Relacao |
| --- | --- |
| Onboarding | Consome a copy resolvida via `CopyProvider` e `useCopy()` |
| Authentication | Protege rota `/copy-editor` e fornece JWT para publicar |
| Supabase | Persiste singleton, historico e Edge Functions |
| User Management | Define roles oficiais `admin`, `operator`, `viewer` |

## Leitura recomendada

Comece por:

1. `docs/context/copy-editor/DOC-READING-ORDER.md`
2. `docs/context/copy-editor/BUSINESS-RULES.md`
3. `docs/context/copy-editor/FRONTEND-ARCHITECTURE.md`
4. `docs/context/copy-editor/DATA-CONTRACT.md`
5. `docs/context/copy-editor/OPERATIONS.md`

