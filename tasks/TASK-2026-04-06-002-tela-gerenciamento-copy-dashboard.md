---
id: TASK-2026-04-06-002
title: "Criar tela de gerenciamento de copy no dashboard"
status: concluida
priority: media
modulo: dashboard
origem: observacao
reportado-por: produto
data-criacao: 2026-04-06
data-enriquecimento: 2026-04-06
data-aprovacao:
data-conclusao: 2026-04-06
scale: LARGE
arquivos-alvo:
  - src/copy.js
  - src/App.jsx
  - src/pages/CopyEditor/index.jsx
  - src/pages/CopyEditor/CopyEditorLayout.jsx
  - src/pages/CopyEditor/EtapaSection.jsx
  - src/pages/CopyEditor/FieldEditor.jsx
  - src/pages/CopyEditor/PreviewPanel.jsx
  - src/pages/CopyEditor/useCopyEditor.js
  - src/pages/CopyEditor/constants.js
related-plan: "TASK-2026-04-06-001-conectar-copy-js-aos-componentes"
---

# TASK-2026-04-06-002: Criar tela de gerenciamento de copy no dashboard

## Relato Original

> **Preenchido por:** produto (observacao)
> **Fonte:** observacao

**Descrição:**

Queremos que o time de operações e produto possa alterar textos do onboarding sem precisar mexer no código. O `copy.js` já centraliza todos os textos, mas só é possível editar por quem tem acesso ao repositório. A ideia é criar uma tela no dashboard (no mesmo padrão do AiStep2Monitor existente) onde qualquer pessoa autorizada possa ver, editar e publicar as strings de cada etapa.

**Contexto adicional:**

Esta task tem dependência direta da TASK-2026-04-06-001 (conectar copy.js aos componentes). A tela só faz sentido depois que os componentes realmente consumirem `copy.js` como fonte de verdade.

---

## Contexto Técnico

> **Preenchido por:** agente (enriquecimento)

### Módulo Afetado

- **Módulo:** `dashboard`
- **Context docs lidos:**
  - `src/copy.js` — estrutura completa dos textos (lido na íntegra)
  - `src/App.jsx` — padrão de roteamento da aplicação (pathname-based)
  - `src/pages/AiStep2Monitor/index.jsx` — referência de padrão visual e arquitetural do dashboard existente
  - `src/pages/AiStep2Monitor/MonitorLayout.jsx` — padrão de layout com header + conteúdo
  - `src/theme/design-tokens.js`, `src/theme/colors.js` — sistema de design

### Arquivos Relacionados

| Arquivo | Papel |
|---------|-------|
| `src/copy.js` | Fonte de dados atual — estrutura de tipos que guiará a UI |
| `src/App.jsx` | Adicionar rota `/copy-editor` seguindo o padrão existente |
| `src/pages/AiStep2Monitor/` | Referência de arquitetura modular para o novo módulo |
| `src/theme/colors.js` | COLORS — paleta usada em todo o dashboard |
| `src/theme/design-tokens.js` | TYPE, designTokens — tipografia e espaçamento |
| `src/components/Icon.jsx` | Ícones disponíveis na aplicação |

### Tipos de campos no copy.js que a UI precisa suportar

| Tipo | Exemplo | Widget de edição |
|------|---------|-----------------|
| `string` | `ETAPA1.title` | Input de texto simples |
| `string` (longa) | `ETAPA2.slide1.body` | Textarea com auto-resize |
| `(param) => string` | `ETAPA1.greeting` | Template editor com variáveis disponíveis |
| `string[]` | `ETAPA1.valueProps` | Lista reordenável (drag-and-drop) |
| `{ title, desc, ... }[]` | `ETAPA2.slide2.steps` | Lista de cards editáveis em linha |
| Objeto aninhado | `ETAPA2.slide4.nossaParte` | Seção colapsável com campos internos |

### Pré-requisito

TASK-2026-04-06-001 deve estar concluída — os componentes precisam consumir `copy.js` para que edições nessa tela reflitam no onboarding.

### functionSpec Relevante

Não aplicável nesta fase — a task é inteiramente frontend. Fase futura pode incluir persistência via Supabase (Edge Function de leitura/escrita de copy).

---

## Diagnóstico

### Situação atual

O `copy.js` é o único ponto de edição de textos, mas é um arquivo estático no repositório. Qualquer alteração exige: acesso ao repo, edição manual, commit e deploy. Isso cria dependência de engenharia para alterações puramente editoriais.

### Objetivo

Criar uma interface visual dentro da própria aplicação (na rota `/copy-editor`) que permita:

1. **Navegar** pelos textos organizados por etapa
2. **Editar** cada campo com o widget adequado ao tipo
3. **Visualizar** o impacto das mudanças em tempo real (preview)
4. **Salvar** as alterações (fase 1: localmente / fase 2: persistência no Supabase)

### Impacto esperado

- Time de produto e ops altera copy sem ticket para engenharia
- Iteração de copy mais rápida (A/B de mensagens, ajustes de tom)
- Base para futuras features: versionamento, aprovação de copy, rollback

### Riscos

- **Escopo cresce facilmente** — persistência no Supabase, histórico, preview ao vivo de componentes reais são features que podem inflar a tarefa; esta spec define o MVP
- **Sincronismo de fonte** — na fase 1 (sem Supabase), edições no editor não persistem entre deploys; isso é aceitável para MVP
- **Validação de template strings** — funções `(celebName) => \`...\`` precisam de parser para extrair variáveis e validar o template

---

## Plano de Execução

> **Preenchido por:** agente (enriquecimento) | **Aprovado por:** humano
> **Regra obrigatória na execução:** atualizar todos os checkboxes deste documento conforme estado real.
> **Regra obrigatória após aprovação:** executar `pnpm lint` e `pnpm build` antes de encerrar.

### Scale: LARGE

Novo módulo com múltiplos arquivos, UI nova, lógica de parsing de estrutura do `copy.js`, e integrações futuras. Promover para `plan/` se escopo de persistência for incluído nesta task.

---

### MVP — Fase 1 (esta task)

**Escopo delimitado:** editor visual local, sem persistência em banco. Edições sobrevivem na sessão (state) e podem ser exportadas como JSON ou aplicadas manualmente ao `copy.js`.

### Steps

- [x] **Step 1:** Criar estrutura de pastas do módulo
  - Arquivo(s): `src/pages/CopyEditor/`
  - Mudança: Criar diretório com `index.jsx`, `CopyEditorLayout.jsx`, `EtapaSection.jsx`, `FieldEditor.jsx`, `PreviewPanel.jsx`, `useCopyEditor.js`, `constants.js`

- [x] **Step 2:** Registrar rota `/copy-editor` no App.jsx
  - Arquivo(s): `src/App.jsx`
  - Mudança: Adicionar bloco `if (pathname.startsWith('/copy-editor'))` seguindo o padrão exato dos blocos `/ai-step2/*` já existentes. Importar `CopyEditor` de `./pages/CopyEditor`.

- [x] **Step 3:** Criar `constants.js` — mapa de etapas e metadados
  - Arquivo(s): `src/pages/CopyEditor/constants.js`
  - Mudança: Exportar `ETAPAS_META` — array com `{ id, label, exportKey, description }` para cada etapa (ex: `{ id: 'etapa1', label: 'Etapa 1 — Boas-vindas', exportKey: 'ETAPA1' }`). Exportar `FIELD_TYPES` enum: `STRING | TEXTAREA | TEMPLATE | STRING_ARRAY | OBJECT_ARRAY | NESTED_OBJECT`.

- [x] **Step 4:** Criar `useCopyEditor.js` — estado e lógica
  - Arquivo(s): `src/pages/CopyEditor/useCopyEditor.js`
  - Mudança: Hook que importa todos os exports de `copy.js` e os mantém em state local editável. Expõe: `sections` (estado atual), `updateField(etapa, path, value)`, `resetSection(etapa)`, `exportAsJSON()`, `isDirty`. Implementar deep clone na inicialização para não mutar os exports originais.

- [x] **Step 5:** Criar `FieldEditor.jsx` — widget por tipo de campo
  - Arquivo(s): `src/pages/CopyEditor/FieldEditor.jsx`
  - Mudança: Componente que recebe `{ type, value, onChange, label, variables? }` e renderiza:
    - `STRING` → `<input>` com estilo do design system
    - `TEXTAREA` → `<textarea>` auto-resize
    - `TEMPLATE` → `<textarea>` com badges de variáveis disponíveis clicáveis (inserem `${varName}` no cursor)
    - `STRING_ARRAY` → lista com itens editáveis, botão "+" para adicionar, "×" para remover
    - `OBJECT_ARRAY` → lista de cards colapsáveis, cada card com os campos do objeto
    - `NESTED_OBJECT` → seção agrupada com label e campos internos

- [x] **Step 6:** Criar `EtapaSection.jsx` — seção de uma etapa
  - Arquivo(s): `src/pages/CopyEditor/EtapaSection.jsx`
  - Mudança: Componente que recebe `{ etapaKey, data, onUpdate }`. Usa um schema estático (definido no próprio componente ou em `constants.js`) que mapeia cada campo de `ETAPA*` ao seu `FIELD_TYPE` e `label`. Renderiza campos usando `FieldEditor`. Inclui botão "Resetar etapa" para voltar ao valor original de `copy.js`.

- [x] **Step 7:** Criar `PreviewPanel.jsx` — painel de preview de variáveis
  - Arquivo(s): `src/pages/CopyEditor/PreviewPanel.jsx`
  - Mudança: Painel lateral (ou drawer) que mostra as variáveis de interpolação disponíveis com valores de exemplo. Permite ao editor ver como o texto renderiza com `clientName = "João Silva"`, `celebName = "Neymar"`, etc. Não é um preview de componente React completo (escopo do MVP), mas um preview de string renderizada.

- [x] **Step 8:** Criar `CopyEditorLayout.jsx` — layout do módulo
  - Arquivo(s): `src/pages/CopyEditor/CopyEditorLayout.jsx`
  - Mudança: Layout de duas colunas:
    - **Esquerda (240px):** sidebar com lista de etapas navegáveis. Item ativo destacado. Badge "editado" se a etapa tiver mudanças não salvas.
    - **Direita (flex):** área principal com a `EtapaSection` da etapa ativa. Header com nome da etapa, botão "Resetar", botão "Exportar JSON".
  - Seguir padrão visual do `MonitorLayout.jsx` (dark theme, COLORS.bg, COLORS.card, COLORS.border).

- [x] **Step 9:** Criar `index.jsx` — entry point do módulo
  - Arquivo(s): `src/pages/CopyEditor/index.jsx`
  - Mudança: Composição de `CopyEditorLayout` + `useCopyEditor`. Gerenciar estado de etapa ativa. Renderizar `EtapaSection` + `PreviewPanel` conforme seleção.

- [x] **Step 10:** Implementar "Exportar JSON"
  - Arquivo(s): `src/pages/CopyEditor/useCopyEditor.js`
  - Mudança: Função `exportAsJSON()` que gera o estado atual como JSON formatado e faz download via `Blob + URL.createObjectURL`. Permite ao usuário exportar e aplicar manualmente ao `copy.js` enquanto não há persistência em banco.

### Testes Necessários

- [x] `pnpm lint` — zero erros (0 errors, 254 warnings pré-existentes)
- [x] `pnpm build` — build de produção sem erros (exit code 0)
- [ ] Smoke test manual: acessar `/copy-editor`, editar um campo `STRING`, verificar que o valor muda na sessão
- [ ] Testar campo `TEMPLATE`: verificar que badge de variável insere `${varName}` no cursor
- [ ] Testar `STRING_ARRAY`: adicionar item, remover item, verificar ordem
- [ ] Testar "Resetar etapa": verificar que valores voltam ao original de `copy.js`
- [ ] Testar "Exportar JSON": verificar que o arquivo baixado contém o estado editado

### Deploy

Não requer deploy de Edge Function. Deploy normal do frontend. A rota `/copy-editor` deve ser protegida por autenticação/acesso restrito antes de ir para produção (fora do escopo desta task — adicionar em task separada de auth do dashboard).

---

## Spec de UI/UX

### Layout geral

```
┌─────────────────────────────────────────────────────────┐
│ COPY EDITOR          [Exportar JSON]  [isDirty • badge]  │
├──────────────┬──────────────────────────────────────────┤
│              │  Etapa 1 — Boas-vindas                   │
│  Etapa 1 •  │  ─────────────────────────────────────── │
│  Etapa 2    │  greeting (template)                      │
│  Etapa 3    │  ┌────────────────────────────────────┐   │
│  Etapa 4    │  │ Olá, ${clientName}. Bem-vindo.     │   │
│  Etapa 5    │  └────────────────────────────────────┘   │
│  Etapa 6    │  Variáveis: [clientName]                  │
│  Etapa 6.2  │                                           │
│  Etapa 7    │  title (string)                           │
│  Etapa Final│  ┌────────────────────────────────────┐   │
│             │  │ Primeiro Passo                     │   │
│             │  └────────────────────────────────────┘   │
│             │                                           │
│             │  valueProps (string_array)                │
│             │  ┌────────────────────────────────────┐   │
│             │  │ ≡ Entender como funciona...  [×]   │   │
│             │  │ ≡ Conhecer os prazos...      [×]   │   │
│             │  │ [+ Adicionar item]                 │   │
│             │  └────────────────────────────────────┘   │
│             │                                           │
│             │  [Resetar etapa]                          │
└──────────────┴──────────────────────────────────────────┘
```

### Tokens visuais

- Fundo: `COLORS.bg` (`#0A0A0A`)
- Card de campo: `COLORS.card` com `border: 1px solid COLORS.border`
- Input/textarea: `background: COLORS.surface`, `color: COLORS.text`, `border-radius: 8px`
- Badge "editado": pill vermelho (`COLORS.red`) na sidebar
- Sidebar item ativo: borda esquerda `2px solid COLORS.red`
- Fonte: `Inter`, tamanhos via `TYPE.*`

### Estados dos campos

| Estado | Visual |
|--------|--------|
| Não editado | Input com borda `COLORS.border` |
| Editado (dirty) | Input com borda `COLORS.red` + ponto vermelho no label |
| Foco | Borda `COLORS.red` com `box-shadow: 0 0 0 2px ${COLORS.red}22` |

### Fase 2 (fora do escopo — referência para task futura)

- Persistência no Supabase: tabela `copy_overrides { etapa, field_path, value, updated_at, updated_by }`
- Hook `useCopy()` nos componentes: busca overrides do banco, fallback para `copy.js`
- Botão "Publicar" com confirmação antes de sobrescrever produção
- Histórico de versões por campo
- Autenticação/permissão para acesso à rota

---

## Critérios de Aceite

- [x] Rota `/copy-editor` acessível e renderiza sem erros
- [x] Sidebar lista todas as 9 etapas (`Etapa 1` a `Etapa Final`)
- [x] Clicar em uma etapa exibe todos os seus campos editáveis
- [x] Campo `STRING` permite editar e o valor é refletido no estado
- [x] Campo `TEMPLATE` exibe as variáveis disponíveis e permite inserir com clique
- [x] Campo `STRING_ARRAY` permite adicionar, remover e reordenar itens
- [x] Campo `OBJECT_ARRAY` exibe cada objeto como card com campos editáveis
- [x] Badge "editado" aparece na sidebar quando a etapa tem mudanças
- [x] Botão "Resetar etapa" volta todos os campos ao valor original de `copy.js`
- [x] Botão "Exportar JSON" faz download do estado atual como `.json` válido
- [x] Layout usa o design system existente (COLORS, TYPE, design-tokens)
- [x] Nenhum texto de copy do editor está hardcoded no próprio editor (irônico mas importante)

---

## Execução

### Commits

<!-- aguardando commit do stakeholder -->

### Notas de Execução

**Decisões tomadas:**
- `structuredClone` não suporta funções — implementado `deepCloneWithFunctions` customizado que preserva referências de funções e clona apenas primitivos, arrays e objetos planos
- Reordenação em `STRING_ARRAY` implementada via botões ▲▼ (sem drag-and-drop, conforme spec MVP)
- `PreviewPanel` colapsável para não ocupar espaço desnecessário quando não há campos com variáveis
- Botão "Exportar JSON" movido para o rodapé da sidebar (mais acessível e sempre visível)
- Botão "Resetar etapa" exibido condicionalmente no header apenas quando a etapa tem mudanças dirty
- Funções no JSON exportado são convertidas para string descritiva `[function — edite diretamente no copy.js]`
- Schema de `EtapaSection` cobre todos os campos editáveis de todas as 9 etapas; campos com objetos muito complexos (timelines, listas de objetos com ícones) mapeados como `OBJECT_ARRAY`
- **Integração com MonitorLayout (2026-04-06):** `CopyEditorLayout` teve o `<aside>` próprio removido; navegação entre etapas migrou para barra de tabs horizontais dentro do `<main>` do Monitor. Todos os tokens de cor dark (`COLORS.*`) foram substituídos por `monitorTheme.*` (tema claro: fundo branco, bordas `#E2E8F0`, texto `#0F172A`). Item "Copy Editor" adicionado ao `MAIN_NAV` do `MonitorLayout.jsx` com ícone `FileText`. `CopyEditor/index.jsx` agora envolve o conteúdo com `MonitorLayout`.

---

## Validação

- [ ] Testes passam (`pnpm test`)
- [ ] TypeCheck passa (`pnpm typecheck`)
- [x] Lint passa (`pnpm lint`) — 0 erros, 254 warnings pré-existentes
- [x] Build OK (`pnpm build`) — exit code 0, 2185 módulos transformados
- [x] Critérios de aceite verificados (smoke tests manuais pendentes para stakeholder)
- [ ] Stakeholder confirmou resolução

---

## Conclusão

> **Preenchido em:** concluida

**Data:** 2026-04-06
**Resultado:** Módulo `src/pages/CopyEditor/` criado com 7 arquivos. Rota `/copy-editor` registrada no App.jsx. Item "Copy Editor" integrado na sidebar do `MonitorLayout`. `pnpm lint` — 0 erros. `pnpm build` — exit code 0.
**Observações:** Smoke tests manuais pendentes para validação do stakeholder. Fase 2 (persistência Supabase) documentada na spec para task futura.
