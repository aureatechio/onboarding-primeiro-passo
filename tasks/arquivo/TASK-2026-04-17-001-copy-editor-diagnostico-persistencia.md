# TASK-2026-04-17-001 — Copy Editor: Diagnóstico de Persistência no Banco

**Data:** 2026-04-17
**Status:** Diagnóstico concluído — aguardando execução
**Área:** Copy Editor (`src/pages/CopyEditor/` + `supabase/functions/update-onboarding-copy/`)

---

## Contexto

O Copy Editor não está persistindo alterações corretamente no Supabase. Após publicar e recarregar a página, mudanças anteriores somem. Diagnóstico realizado por mapeamento completo de cada etapa, Edge Function e hook de estado.

---

## Bug #1 — CRÍTICO: UPDATE sobrescreve content sem merge

**Arquivo:** `supabase/functions/update-onboarding-copy/index.ts:78`

**Problema:** A Edge Function busca apenas `id` e `version` do singleton, nunca o `content` existente. Em seguida faz `.update({ content })` com APENAS o diff da sessão atual, apagando tudo que estava salvo anteriormente.

```ts
// Atual — busca só id e version, não o content:
const { data: existing } = await supabase
  .from(CONFIG_TABLE)
  .select('id, version')   // ← falta 'content'
  .limit(1).single()

// Depois sobrescreve:
.update({ content })   // ← apaga publicações anteriores
```

**Cenário de falha:**
1. Sessão 1: edita `ETAPA1.title` → publica → DB: `{ ETAPA1: { title: "Novo" } }`
2. Reload → `originalSections = merged(static + ETAPA1 override)`
3. Edita `ETAPA2.subtitle` → diff = `{ ETAPA2: { subtitle: "Novo" } }`
4. Publica → DB: **`{ ETAPA2: { subtitle: "Novo" } }`** — ETAPA1 apagada!

**Correção:** Buscar `content` existente e fazer merge antes do UPDATE:

```ts
const { data: existing } = await supabase
  .from(CONFIG_TABLE)
  .select('id, version, content')   // adicionar 'content'
  .limit(1).single()

// Merge: existente + novo (novo sobrepõe por chave de etapa)
const mergedContent = { ...(existing.content ?? {}), ...content }

.update({ content: mergedContent, ... })
```

---

## Bug #2 — MÉDIO: ETAPA4 com campos ausentes no schema do editor

**Arquivo:** `src/pages/CopyEditor/EtapaSection.jsx` — schema `etapa4`

**Problema:** Os slides 3 e 4 da ETAPA4 têm subobjetos ricos que não estão mapeados no schema do editor. O usuário não consegue editar esses textos pelo Copy Editor.

**Campos ausentes:**

`slide3.*`:
- `franquias` (title, allowed, forbidden)
- `canaisDigitais` (title, allowed, forbidden)
- `regrasPublicacao` (title, noTag, canaisOficiais)
- `tvRadioOutdoor` (title, warning, tags[])

`slide4.*`:
- `renovacao` (title, steps[])
- `naoDisponivel` (title, opcaoA, opcaoB)
- `encerramento` (title, items[])
- `multa` (title, desc)

Também ausentes: `slideHeaders` (OBJECT_ARRAY), `quizIntro` (função — OK não editar), `quizQuestions` (função), `completionDescription` (função), `completionSummary` (função).

---

## Bug #3 — MÉDIO: ETAPA_FINAL.atendenteLabel mapeado incorretamente

**Arquivo:** `src/pages/CopyEditor/EtapaSection.jsx` — schema `etapaFinal`

**Problema:** No `copy.js`, `atendenteLabel` é uma função:
```js
atendenteLabel: (genero = 'f') => genero === 'm' ? 'SEU ATENDENTE' : 'SUA ATENDENTE',
```

O schema do editor mapeia como `FT.STRING`. O editor vai exibir `undefined` (a função não é string) e qualquer edição salva uma string onde havia uma função — quebra o comportamento dinâmico.

**Correção:** Remover `atendenteLabel` do schema do editor (não é editável via UI) ou convertê-lo em string estática no `copy.js`.

---

## Bug #4 — BAIXO: Campos menores ausentes no schema

| Etapa | Campo ausente | Tipo no copy.js |
|-------|--------------|-----------------|
| ETAPA3 | `timeline` | OBJECT_ARRAY |
| ETPA3 | `prazosProducao` | OBJECT_ARRAY |
| ETAPA3 | `slideTags` | STRING_ARRAY |
| ETAPA5 | `navNextSubmitting` | STRING |
| ETAPA5 | `trafego.optionYesBadge` | STRING |
| ETAPA62 | `modoSimplificado.*` (site, instagram labels/errors) | STRING |
| ETAPA62 | `colorPaletteLabel/Hint/AddButton/Extracting/Max` | STRING |
| ETAPA_FINAL | `atendenteContactTime` | STRING |
| ETAPA_FINAL | `parabens.stepLabel` | STRING |
| ETAPA_FINAL | `parabens.atendenteContact` | STRING |

---

## Bug #5 — BAIXO: Melhorias UX pendentes (de melhorias_copy_editor_1704.md)

1. **Lista dinâmica (add/remove):** `OBJECT_ARRAY` fields (ex: `slide2.steps`, `activation.items`) não permitem adicionar/remover itens — apenas editar os existentes.
2. **Input inline com tamanho inadequado:** ao clicar para editar, textarea aparece pequeno/cortado (ex: `microCopy` da ETAPA1).

---

## Mapeamento completo por Etapa

### ETAPA1 — Boas-vindas

| Campo | Tipo UI | Editável | Obs |
|-------|---------|:-:|-----|
| greeting | TEMPLATE | ✓ | variável: clientName |
| title | STRING | ✓ | |
| subtitle | STRING | ✓ | |
| estimatedTime | STRING | ✓ | |
| ctaButton | STRING | ✓ | |
| microCopy | TEXTAREA | ✓ | bug de input pequeno |
| stepLabel | STRING | ✓ | |
| valueProps | STRING_ARRAY | ✓ | |

Sem funções. Todos os campos cobertos. ✅

---

### ETAPA2 — Como funciona

| Campo | Tipo UI | Editável | Obs |
|-------|---------|:-:|-----|
| header.title/readTime | STRING | ✓ | |
| pacoteResumo | STRING | ✓ | |
| slideTitles | STRING_ARRAY | ✓ | |
| slide1.* (5 campos) | STRING/TEXTAREA | ✓ | |
| slide2.body/footer | TEXTAREA | ✓ | |
| slide2.steps | OBJECT_ARRAY | ✓ | precisa de add/remove |
| slide3.body/footer | TEXTAREA | ✓ | |
| slide4.body/closingTip | TEXTAREA | ✓ | |
| slide4.nossaParte | NESTED_OBJECT | ✓ | |
| slide4.suaParte | NESTED_OBJECT | ✓ | |
| quiz* (4 campos) | STRING/ARRAY | ✓ | |
| completion* | STRING/TEXTAREA | ✓ | |
| nav* (3 campos) | STRING | ✓ | |
| processingMessages | STRING_ARRAY | ✓ | |

Sem funções. 28 campos cobertos. ✅

---

### ETAPA3 — Prazos e combinados

| Campo | Tipo UI | Editável | Obs |
|-------|---------|:-:|-----|
| header.* | STRING/TEXTAREA | ✓ | |
| slideTitles | STRING_ARRAY | ✓ | |
| warningText | TEXTAREA | ✓ | |
| suaParte/nossaParte | NESTED_OBJECT | ✓ | |
| clienteAgil/clienteDemorou | NESTED_OBJECT | ✓ | |
| agilidadeTip/canaisTip | TEXTAREA | ✓ | |
| whatsapp/plataforma | NESTED_OBJECT | ✓ | |
| quiz* | STRING/ARRAY | ✓ | |
| nav* | STRING | ✓ | |
| processingMessages | STRING_ARRAY | ✓ | |
| activation.* | STRING/TEMPLATE/ARRAY | ✓ | |
| timeline | OBJECT_ARRAY | ✗ | não mapeado |
| prazosProducao | OBJECT_ARRAY | ✗ | não mapeado |
| slideTags | STRING_ARRAY | ✗ | não mapeado |
| activation.stepLabel | FUNÇÃO | ✗ | `(totalSteps) => ...` |

⚠️ 4 campos não editáveis.

---

### ETAPA4 — Regras da celebridade

| Campo | Tipo UI | Editável | Obs |
|-------|---------|:-:|-----|
| header.readTime | STRING | ✓ | |
| slide1.* (6 campos) | STRING/TEMPLATE | ✓ | |
| slide2.body/flowLabel/ajustes*/regraOuro* | STRING/TEXTAREA | ✓ | |
| slide2.steps | OBJECT_ARRAY | ✓ | precisa add/remove |
| slide3.body | TEXTAREA | ✓ | |
| slide4.body | TEXTAREA | ✓ | |
| quizTitle/Subtitle/Confirm | STRING | ✓ | |
| completionTitle | STRING | ✓ | |
| nav* (4 campos) | STRING | ✓ | |
| processingMessages | STRING_ARRAY | ✓ | |
| quizIntro | FUNÇÃO | ✗ | `(celebName) => ...` |
| quizQuestions | FUNÇÃO | ✗ | `(celebName, praca, segmento) => [...]` |
| completionDescription | FUNÇÃO | ✗ | `(celebName) => ...` |
| completionSummary | FUNÇÃO | ✗ | `(celebName, praca, segmento) => [...]` |
| slideHeaders | OBJECT_ARRAY | ✗ | não mapeado |
| slide3.franquias/canaisDigitais/regrasPublicacao/tvRadioOutdoor | NESTED | ✗ | **ausentes do schema** |
| slide4.renovacao/naoDisponivel/encerramento/multa | NESTED | ✗ | **ausentes do schema** |

⚠️ Etapa com mais gaps — 4 funções + 9 subobjetos ausentes.

---

### ETAPA5 — Presença digital

| Campo | Tipo UI | Editável | Obs |
|-------|---------|:-:|-----|
| header.* | STRING | ✓ | |
| palco.* | STRING/TEXTAREA | ✓ | |
| penseAssim | NESTED_OBJECT | ✓ | |
| trafego.title/body/question/optionYes/optionNo | STRING/TEXTAREA | ✓ | |
| trafego.optionYesBadge | STRING | ✗ | não mapeado |
| navNext | STRING | ✓ | |
| navNextSubmitting | STRING | ✗ | não mapeado |
| completion* | STRING/TEXTAREA | ✓ | |
