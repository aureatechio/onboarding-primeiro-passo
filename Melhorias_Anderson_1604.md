# Melhorias — Anderson · 16/04/2026

Documento de backlog técnico com descrição detalhada das melhorias solicitadas, contexto de repositório e referências de implementação.

---

## 1. Corrigir numeração do formulário multi-step de onboarding

### Problema

O formulário possui **7 steps internos** (definidos em `OnboardingContext.jsx`), mas as etapas 6 e 7 exibem o total como **"DE 8"** — número fixo no `copy.js`, desconectado da constante `TOTAL_STEPS`.

Ao mesmo tempo, as etapas 2–5 usam a contagem dinâmica do contexto (`TOTAL_STEPS = 7`), criando uma inconsistência visível entre as etapas:

| Etapa interna | Componente | Rótulo exibido atualmente |
|---|---|---|
| 1 | `Etapa1Hero.jsx` | `ETAPA 1 DE 7` (hardcoded em `copy.js:26`) |
| 2–5 | `Etapa2–5.jsx` | `ETAPA X DE 7` (dinâmico via `StepHeader`) |
| 6 | `Etapa6.jsx` | `ETAPA 6.1 DE 8` (hardcoded em `copy.js:455`) |
| 7 | `Etapa62.jsx` | `ETAPA 6.2 DE 8` (hardcoded em `copy.js:508`) |
| final | `EtapaFinal.jsx` | `PRIMEIRO PASSO CONCLUÍDO` |

### Causa raiz

- `src/context/OnboardingContext.jsx` define `TOTAL_STEPS = 7` na linha 13.
- Os `stepLabel` em `src/copy.js` (linhas 26, 455, 508) são strings fixas que **não referenciam** essa constante.
- As etapas 6 e 7 usam nomenclatura de sub-etapas (`6.1` / `6.2`) sem que o total (`8`) corresponda a nenhum valor real do sistema.

### Arquivos envolvidos

- `src/context/OnboardingContext.jsx` — define `TOTAL_STEPS` e `STEP_TITLES`
- `src/copy.js` — contém os `stepLabel` fixos de cada etapa
- `src/components/StepHeader.jsx` — renderiza o badge `ETAPA X DE Y` (linha 38), aceita `stepLabel` como override via prop

### Resultado esperado

- Todos os rótulos de etapa devem ser consistentes com o total real de passos.
- Definir o total correto em **um único lugar** (`OnboardingContext.jsx`) e referenciar dinamicamente nos `stepLabel` ou no componente `StepHeader`.
- Decidir se a nomenclatura será `ETAPA 6 DE 7` / `ETAPA 7 DE 7` ou se o modelo de sub-etapas (`6.1`, `6.2`) é intencional — nesse caso, o total exibido precisa ser revisado e documentado.

---

## 2. Bug no editor de cores da marca na Etapa 6.2

### Problema

Na **Etapa 6.2 de 8** (componente `Etapa62.jsx`), a seção de **cores da marca** apresenta instabilidades no editor de cores. O comportamento bugado pode se manifestar como: picker não abrindo corretamente, cor não sendo salva no estado, sobreposição incorreta do popover, ou conflito entre o input HEX e o seletor nativo de cor.

### Contexto técnico

O editor é implementado no componente `src/components/ColorSwatch.jsx` (257 linhas) e é instanciado em `src/pages/Etapa62.jsx` (linhas 533–543) dentro de um loop que renderiza um swatch por cor do array `brandColors`.

**Arquitetura do `ColorSwatch`:**

- **Swatch button** (48×48px): abre/fecha o popover ao clicar (linhas 76–146)
- **Picker nativo** (`<input type="color">`): 120px de altura, renderizado dentro do popover (linhas 170–185)
- **Input HEX**: campo de texto com validação via regex `HEX_REGEX: /^#[0-9a-fA-F]{6}$/` (linhas 205–222)
- **Preview** (28×28px): exibe cor corrente ao lado do input HEX (linhas 223–232)
- **Botão remover**: deleta o swatch do array (linhas 96–123, controlado pela prop `removable`)
- **Botão adicionar**: em `Etapa62.jsx` linhas 545–564, limitado a 8 cores máximo

**Gerenciamento de estado em `Etapa62.jsx`:**

```js
// Linha 121
const [brandColors, setBrandColors] = useState([...])

// Linha 177–179
const handleColorChange = (index, newColor) => { ... }

// Linha 181–183
const handleRemoveColor = (index) => { ... }

// Linha 185–188
const handleAddColor = () => { ... }
```

As cores também são populadas automaticamente via extração da logo: `extractColorsFromFile()` em `src/lib/color-extractor.js` (referenciado na linha 168).

### Pontos de revisão prioritários

1. **Sincronização entre input HEX e picker nativo**: os dois inputs devem refletir o mesmo valor em tempo real — checar se há conflito de `onChange` / `onBlur`.
2. **Posicionamento do popover**: verificar se há overflow ou z-index incorreto que faz o popover ficar oculto atrás de outros elementos.
3. **Persistência no contexto**: confirmar que `handleColorChange` atualiza corretamente `OnboardingContext` e que o valor persiste ao navegar entre etapas.
4. **Reset após extração automática**: quando as cores são extraídas da logo, verificar se o estado é corretamente inicializado sem duplicatas ou valores `undefined`.

### Arquivos envolvidos

- `src/components/ColorSwatch.jsx` — implementação do editor de cor (picker + input HEX)
- `src/pages/Etapa62.jsx` — renderiza o painel de cores, gerencia `brandColors`
- `src/lib/color-extractor.js` — extração automática de cores da logo

---

## 3. Remover parâmetros UTM da URL do site

### Problema

No input de URL do site (localizado em `Etapa62.jsx`, linhas 570–633), quando o usuário cola uma URL com parâmetros de rastreamento (ex.: `https://meusite.com?utm_source=instagram&utm_medium=bio`), esses parâmetros são **armazenados integralmente** no banco de dados e repassados ao pipeline de enriquecimento (`onboarding-enrichment`), que usa a URL para fazer scraping de CSS/fonte e geração de briefing via Perplexity.

Parâmetros UTM poluem a URL, podem interferir no scraping de estilos (se o servidor redirecionar ou bloquear URLs com query strings incomuns) e expõem dados de campanhas internas do cliente.

### Contexto técnico

**Input atual (`Etapa62.jsx`):**

```js
// Linha 603 — exibe sem protocolo
value={siteUrl.replace(/^https?:\/\//i, '')}

// Linha 607 — reconstrução com protocolo
onChange={(e) => setSiteUrl(`https://${e.target.value}`)}
```

**Validação atual (`Etapa62.jsx`, linhas 51–55):**

```js
function validateUrl(value) {
  if (!value) return true
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try { new URL(withProtocol); return true } catch { return false }
}
```

**Persistência (`saveIdentityToBackend`, linha 29):**

```js
if (siteUrl) formData.append('site_url', siteUrl)
```

A URL é enviada sem nenhum pré-processamento para a Edge Function `save-onboarding-identity`, que por sua vez aciona o pipeline `onboarding-enrichment`.

**Parâmetros a remover** (baseado no padrão UTM e similares):

- `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
- `fbclid`, `gclid`, `msclkid` (parâmetros de rastreamento de plataformas de mídia)
- Quaisquer outros query params de rastreamento que não fazem parte da URL canônica

### Implementação sugerida

Criar uma função utilitária `stripTrackingParams(url)` em `src/lib/` (ex.: `src/lib/url-utils.js`) e aplicá-la no `onChange` do input ou no momento de salvar:

```js
const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'fbclid', 'gclid', 'msclkid', 'ref', 'source',
]

export function stripTrackingParams(rawUrl) {
  try {
    const url = new URL(rawUrl)
    TRACKING_PARAMS.forEach((param) => url.searchParams.delete(param))
    return url.toString()
  } catch {
    return rawUrl
  }
}
```

### Arquivos envolvidos

- `src/pages/Etapa62.jsx` — input de URL (linhas 570–633) e `saveIdentityToBackend`
- `src/lib/` — criar `url-utils.js` com a função de limpeza
- `supabase/functions/save-onboarding-identity/` — Edge Function que recebe e persiste a URL
- `supabase/functions/onboarding-enrichment/` — pipeline que consome a URL para scraping

---

## 4. Tornar editáveis os dados do onboarding na tela de galeria

### Problema

Na tela de monitoramento de campanha (`AiStep2Monitor`), a aba **"Dados do Onboarding"** exibe os dados coletados no formulário em modo somente leitura. Não é possível corrigir um dado incorreto (ex.: URL do site, nome do cliente, cores da marca) e reprocessar o job sem acessar diretamente o banco de dados.

Isso cria fricção operacional: qualquer ajuste exige intervenção manual via Supabase Dashboard ou reabrir todo o fluxo de onboarding.

### Contexto técnico

**Componente principal:** `src/pages/AiStep2Monitor/index.jsx` (250 linhas)

**Painel de dados:** `src/pages/AiStep2Monitor/DetailModePanel.jsx`

**Tabs disponíveis** (`constants.js`, linhas 18–22):

```js
export const DETAIL_TABS = [
  { id: 'gallery', label: 'Galeria' },
  { id: 'onboarding-data', label: 'Dados do Onboarding' },
  { id: 'errors', label: 'Erros e Diagnostico' },
]
```

**Campos exibidos atualmente na aba (DetailModePanel.jsx, linhas 406–450):**

Painel 1 — Dados do onboarding:
- Nome do cliente
- Nome da celebridade
- Status do checkout (`checkout_status`)
- Status do contrato (`clicksign_status`)
- Trilha de produção
- Escolha de identidade
- Fonte escolhida
- Paleta de cores da marca
- Notas de campanha
- Status do briefing (Perplexity)
- Modo de briefing
- Texto do briefing
- Status do transcript

Painel 2 — Uploads e anexos:
- Caminho do logo
- Quantidade de imagens de campanha
- Caminho do áudio
- Duração do áudio

**Componente de exibição:**

`src/pages/AiStep2Monitor/components/DataRow.jsx` — grid de 2 colunas (180px label + conteúdo flexível). Suporta prop `mono` para fonte monospace. Exibe `"-"` para valores nulos.

**Fonte dos dados (DetailModePanel.jsx, linhas 10–28):**

```js
onboarding = data?.onboarding || {}
identity = onboarding?.identity || null
briefing = onboarding?.briefing || null
```

Os dados vêm da Edge Function `get-ai-campaign-monitor`, que agrega dados de `ai_campaign_jobs`, `onboarding_identities` e `campaign_briefings`.

### Resultado esperado

1. **Modo de edição toggleável**: botão "Editar" na aba que alterna os campos de texto puro para inputs editáveis.
2. **Campos editáveis prioritários** (campos que impactam o reprocessamento do job):
   - URL do site (`site_url`)
   - Cores da marca (paleta)
   - Notas de campanha
   - Fonte escolhida
   - Texto do briefing
3. **Botão "Rodar job novamente"**: após salvar as edições, acionar a Edge Function responsável por reprocessar o job de campanha (provavelmente `retry-ai-campaign-assets` ou `create-ai-campaign-job` com o mesmo `job_id`).
4. **Persistência**: as edições devem ser salvas via Edge Function antes de reacionar o job — considerar `save-campaign-briefing` para campos de briefing e `save-onboarding-identity` para campos de identidade.

### Arquivos envolvidos

- `src/pages/AiStep2Monitor/DetailModePanel.jsx` — painel que renderiza os dados (modo read-only atual)
- `src/pages/AiStep2Monitor/components/DataRow.jsx` — componente de linha; precisará de variante editável
- `src/pages/AiStep2Monitor/index.jsx` — gerencia estado e comunicação com Edge Functions
- `src/pages/AiStep2Monitor/constants.js` — definição das tabs
- `supabase/functions/save-campaign-briefing/` — salvar alterações no briefing
- `supabase/functions/save-onboarding-identity/` — salvar alterações nos dados de identidade
- `supabase/functions/retry-ai-campaign-assets/` — reprocessar assets do job
- `supabase/functions/get-ai-campaign-monitor/` — fonte dos dados exibidos

---

## Referências gerais

| Recurso | Caminho |
|---|---|
| Contexto de onboarding | `src/context/OnboardingContext.jsx` |
| Cópias e labels do formulário | `src/copy.js` |
| Componente de cabeçalho de etapa | `src/components/StepHeader.jsx` |
| Roteamento de etapas | `src/App.jsx` (linhas 54–67) |
| Regras de negócio do onboarding | `.context/modules/onboarding/BUSINESS-RULES.md` |
| Mapeamento canônico do formulário | `docs/mapeamento-formulario-onboarding.md` |
| Monitor de campanha IA | `src/pages/AiStep2Monitor/` |
| Edge Functions de campanha | `supabase/functions/` (ver `CLAUDE.md` para lista completa) |
