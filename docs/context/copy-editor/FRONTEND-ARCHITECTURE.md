# Copy Editor - Arquitetura Frontend

## Entrada da rota

Arquivo: `src/pages/CopyEditor/index.jsx`

Responsabilidades:

- Ler `?etapa=` da URL via `useSearchParams()`.
- Validar `activeEtapaId` contra `ETAPAS_META`.
- Inicializar `useCopyEditor()`.
- Buscar componente de preview com `getPreviewComponent(activeEtapaId)`.
- Renderizar dentro de `MonitorLayout`.
- Abrir e fechar `PublishDialog`.

## Layout ativo

Arquivo: `src/pages/CopyEditor/PreviewEditorLayout.jsx`

Estrutura:

```text
MonitorLayout
  -> PreviewEditorLayout
    -> SearchOverlay
    -> EditorToolbar
    -> EtapaSidebar
    -> area de preview
      -> DiffPanel opcional
      -> PreviewComponent da etapa ativa
  -> PublishDialog
```

O layout atual e preview-first: o usuario edita textos diretamente dentro de uma
aproximacao visual da etapa, nao em um formulario generico.

## Estado e regras do hook

Arquivo: `src/pages/CopyEditor/useCopyEditor.js`

Estado principal:

| Estado | Papel |
| --- | --- |
| `sections` | Copy atual editavel por `etapaId` |
| `originalSections` | Baseline carregado da publicacao atual |
| `dirtyEtapas` | Set de etapas com alteracao local |
| `supabaseVersion` | Versao publicada carregada |
| `isLoadingFromSupabase` | Loading inicial da copy publicada |
| `publishStatus` | `idle`, `publishing`, `success`, `error` |
| `publishError` | Mensagem de falha de publicacao |

Acoes:

| Funcao | Papel |
| --- | --- |
| `updateField(etapaId, path, value)` | Atualiza campo por path e marca etapa dirty |
| `resetSection(etapaId)` | Restaura etapa para baseline carregado |
| `importFromJSON(jsonContent)` | Importa overrides e marca etapas como dirty |
| `exportAsJSON()` | Baixa JSON do estado atual |
| `publishToSupabase(_, notes)` | Calcula diff e chama `update-onboarding-copy` |
| `getOriginalValue(etapaId, path)` | Retorna valor do baseline por path |

## Metadados

Arquivo: `src/pages/CopyEditor/constants.js`

Principais exports:

- `ETAPAS_META`: mapeia `etapaId`, label e `exportKey`.
- `FIELD_TYPES`: tipos usados pelo editor MVP antigo.
- `TEMPLATE_VARIABLES`: variaveis disponiveis para template/chips.
- `PREVIEW_EXAMPLE_VALUES`: valores de exemplo usados no preview.
- `UI`: textos do proprio editor.
- `EDITOR_THEME`: tokens locais legados do editor.

## Registry de previews

Arquivo: `src/pages/CopyEditor/previews/previewRegistry.js`

Mapeia:

```js
{
  etapa1: Etapa1Preview,
  etapa2: Etapa2Preview,
  etapa3: Etapa3Preview,
  etapa4: Etapa4Preview,
  etapa5: Etapa5Preview,
  etapa6: Etapa6Preview,
  etapa62: Etapa62Preview,
  etapaFinal: EtapaFinalPreview,
}
```

Ao adicionar etapa ou trocar id, atualizar:

1. `src/copy.js`
2. `ETAPAS_META`
3. `previewRegistry.js`
4. `CopyContext.jsx`
5. Edge Function `update-onboarding-copy` allowlist
6. Documentacao desta pasta

## Componentes editaveis

### `EditableText`

Usado para strings e templates. Recursos principais:

- Renderiza valor atual.
- Entra em modo edicao ao clicar.
- Preserva `${varName}` como chips editaveis.
- Suporta multiline.
- Calcula estado dirty comparando com `originalValue`.
- Usa `data-path` para busca e highlight.
- Ignora campos cujo valor e funcao.

### `EditableList`

Usado para arrays de strings, como mensagens de processamento e listas curtas.

### `EditableObjectList`

Usado para arrays de objetos quando o preview precisa editar grupos repetidos.

## Blocos `Pv*`

Pasta: `src/pages/CopyEditor/blocks/`

Sao blocos visuais de preview, nao os componentes publicos reais do onboarding.
Eles existem para dar contexto visual ao editor sem acoplar o CMS ao estado real
do formulario publico.

Exemplos:

- `PvStepHeader`
- `PvQuizBlock`
- `PvInfoCard`
- `PvCtaButton`
- `PvTimeline`
- `PvCompletionBlock`

## Busca

Arquivo: `src/pages/CopyEditor/SearchOverlay.jsx`

Comportamento:

- Atalho `Cmd+K` ou `Ctrl+K`.
- Busca strings em todas as etapas.
- Ignora funcoes.
- Limita resultados a 30.
- Ao selecionar resultado, troca etapa e tenta rolar ate o elemento com
  `data-path`.

## Diff

Arquivo: `src/pages/CopyEditor/DiffPanel.jsx`

Comportamento:

- Compara estado atual contra baseline.
- Mostra apenas campos alterados da etapa ativa.
- Ignora funcoes.
- Compara arrays e objetos recursivamente.

## Publicacao

Arquivos:

- `src/pages/CopyEditor/EditorToolbar.jsx`
- `src/pages/CopyEditor/PublishDialog.jsx`
- `src/pages/CopyEditor/useCopyEditor.js`

Fluxo:

1. Botao `Publicar` fica desabilitado sem dirty.
2. Modal permite notas opcionais.
3. `publishToSupabase()` envia diff via `adminFetch`.
4. Em sucesso, baseline vira o estado atual e `dirtyEtapas` e limpo.
5. Modal fecha apos pequeno delay.

## Componentes legados

Estes arquivos ainda existem, mas nao compoem o fluxo principal atual:

- `CopyEditorLayout.jsx`
- `EtapaSection.jsx`
- `FieldEditor.jsx`
- `PreviewPanel.jsx`

Eles representam a versao MVP baseada em formulario por campo. Trate alteracoes
neles com cuidado, porque podem ser codigo morto ou fallback nao roteado.

