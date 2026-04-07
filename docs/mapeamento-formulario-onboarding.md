# Mapeamento do Formulário Multistep — Onboarding "Primeiro Passo"

> **Gerado em:** 2026-04-07
> **URL base:** `http://localhost:5173/?compra_id={UUID}`
> **Fonte de dados:** Código-fonte das páginas (`src/pages/`) + `src/copy.js` + inspeção via browser

---

## Visão Geral

O onboarding "Primeiro Passo" é um formulário multistep em React SPA (Vite) com **8 telas sequenciais** (Etapa 1 → 7 + Etapa Final), onde cada etapa pode conter sub-slides internos (carrossel). O fluxo navega para frente via `goNext()` do `OnboardingContext` e não permite voltar para etapas anteriores (apenas dentro dos slides da mesma etapa).

### Fluxo de Navegação

```
Etapa 1 (Hero) → Etapa 2 (4 slides + quiz) → Etapa 3 (4 slides + quiz + tela de ativação)
→ Etapa 4 (4 slides + quiz) → Etapa 5 (tela única) → Etapa 6 (6.1 — tela única)
→ Etapa 6.2 (modo simplificado OU 5 slides avançado)
→ Etapa 7 (escolha de caminho + briefing condicional) → Etapa Final (resumo → parabéns)
```

### Estado global

- **Provider:** `OnboardingContext` (`src/context/OnboardingContext.jsx`)
- **Total de Steps no contexto:** 7 (`TOTAL_STEPS = 7`)
- **Persistência:** `localStorage` por `compra_id` (chave: `primeiro-passo-state:{compra_id}`)
- **Hidratação:** Busca dados da compra via `get-onboarding-data` Edge Function

### Dados do Contexto (`userData`)

| Campo | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `clientName` | string | `'Cliente'` | Nome do cliente (vem da compra) |
| `celebName` | string | `'Celebridade contratada'` | Nome da celebridade |
| `praca` | string | `'Praca contratada'` | Praça geográfica do contrato |
| `segmento` | string | `'Segmento contratado'` | Segmento de atuação |
| `pacote` | string | `'Pacote contratado'` | Tipo de pacote |
| `vigencia` | string | `'Periodo contratado'` | Período de vigência |
| `atendente` | string | `'Equipe Acelerai'` | Nome do atendente |
| `atendenteGenero` | `'m' \| 'f'` | `'f'` | Gênero do atendente |
| `trafficChoice` | `'yes' \| 'no' \| null` | `null` | Escolha de material de tráfego (Etapa 5) |
| `productionPath` | `'standard' \| 'hybrid' \| null` | `null` | Caminho de produção (Etapa 7) |
| `identityBonusChoice` | `'add_now' \| 'later' \| null` | `null` | Escolha de identidade visual (Etapa 6.2) |
| `identityBonusLogoName` | string | `''` | Nome do arquivo de logo enviado |
| `identityBonusExtractedColors` | string[] | `[]` | Cores extraídas do logo |
| `identityBonusCustomColors` | string[] | `[]` | Cores adicionadas manualmente |
| `identityBonusColors` | string[] | `[]` | Combinação das duas listas de cores |
| `identityBonusFont` | string | `''` | ID da fonte selecionada |
| `identityBonusImagesCount` | number | `0` | Qtd de imagens enviadas |
| `identityBonusPending` | boolean | `false` | Se deixou para depois |
| `campaignNotes` | string | `''` | Observações livres da campanha |
| `campaignBriefMode` | `'text' \| 'audio' \| 'both' \| null` | `null` | Modo do briefing (Etapa 7 hybrid) |
| `campaignBriefText` | string | `''` | Texto do briefing |
| `campaignCompanySite` | string | `''` | Site da empresa (briefing) |
| `campaignBriefAudioDurationSec` | number | `0` | Duração do áudio |
| `campaignBriefGenerationStatus` | `'done' \| 'error' \| null` | `null` | Status da geração IA |
| `campaignBriefErrorCode` | string \| null | `null` | Código de erro IA |
| `campaignGeneratedBriefing` | object \| null | `null` | Briefing gerado pela IA |
| `campaignGeneratedInsights` | array | `[]` | Insights gerados |
| `campaignBriefCitations` | array | `[]` | Citações geradas |

---

## Etapa 1 — Boas-vindas (Hero)

**Arquivo:** `src/pages/Etapa1Hero.jsx`
**Copy:** `ETAPA1` em `src/copy.js`
**Tipo:** Tela estática informativa (sem campos de formulário)

### Elementos

| Elemento | Tipo | Conteúdo |
|----------|------|----------|
| Logo | Componente `TopBarLogo` | Logo Aceleraí |
| Saudação | Texto dinâmico | `"Olá, {clientName}. Bem-vindo."` |
| Título | `<h1>` | `"Primeiro Passo"` |
| Subtítulo | Texto | `"Falta um passo entre você e a sua campanha com"` |
| Nome da celebridade | Texto destaque | `{celebName}` (ex: "Helen Ganzarolli") |
| Proposta de valor | Card com 4 itens | Lista de benefícios do onboarding |
| Tempo estimado | Ícone relógio + texto | `"Tempo estimado: 15 minutos"` |
| **Botão CTA** | `<button>` | `"COMEÇAR AGORA →"` (aciona `goNext()`) |
| Micro-copy | Texto | `"Ao completar, sua equipe de produção é ativada automaticamente."` |
| Dots de progresso | 7 dots | Etapa 1 de 7 ativa |
| Step label | Texto | `"ETAPA 1 DE 7"` |

### Campos de formulário: **Nenhum**

### Ação: botão "COMEÇAR AGORA" → avança para Etapa 2

---

## Etapa 2 — Como funciona sua campanha

**Arquivo:** `src/pages/Etapa2.jsx`
**Copy:** `ETAPA2` em `src/copy.js`
**Tipo:** Carrossel informativo (4 slides) + Quiz de confirmação

### Slides Internos

| Slide | Tag | Título | Conteúdo |
|-------|-----|--------|----------|
| 2.1 | `2.1` | Entenda o que você contratou | Explicação Aceleraí vs. Cliente (munição vs. disparo). Card "PENSE ASSIM" |
| 2.2 | `2.2` | Como a celebridade aparece na sua campanha | Pipeline 4 etapas: Gravação → Briefing → Produção → Campanha |
| 2.3 | `2.3` | Seu pacote de campanha | Resumo: "2 vídeos (30s) e 4 peças estáticas" com badge da celebridade |
| 2.4 | `2.4` | Seu resultado depende de nós dois | Card "Da nossa parte" (4 itens) + "Da sua parte" (4 itens) |

### Quiz (após slide 2.4)

| # | Pergunta (checkbox) |
|---|---------------------|
| 1 | "Entendi que a Aceleraí produz os criativos com a celebridade e que a divulgação e o tráfego são de minha responsabilidade." |
| 2 | "Entendi que os criativos são produzidos a partir de gravações pré-realizadas pela celebridade, combinadas com o briefing da minha empresa." |
| 3 | "Entendi o que vou receber no meu pacote de campanha." |

### Campos de formulário

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| Quiz checkbox 1 | checkbox | Sim | Todos devem ser marcados para avançar |
| Quiz checkbox 2 | checkbox | Sim | Todos devem ser marcados para avançar |
| Quiz checkbox 3 | checkbox | Sim | Todos devem ser marcados para avançar |

### Navegação

- **"Próximo"** — avança slide
- **"Ir para confirmação"** — último slide → quiz
- **"Confirmar e avançar"** — quiz ok → ProcessingOverlay → CompletionScreen → `goNext()`

---

## Etapa 3 — Prazos e combinados

**Arquivo:** `src/pages/Etapa3.jsx`
**Copy:** `ETAPA3` em `src/copy.js`
**Tipo:** Carrossel (4 slides) + Quiz + Tela de Ativação

### Header alert
`"Ao concluir esta etapa, os 15 dias de preparação começam a contar"`

### Slides Internos

| Slide | Tag | Título | Conteúdo |
|-------|-----|--------|----------|
| 3.1 | `SLIDE 3.1` | A linha do tempo da sua campanha | Timeline vertical (9 items: done → current → next → future) |
| 3.2 | `SLIDE 3.2` | Preparação: 15 dias pra tudo acontecer | Card "A sua parte" (4 items) + "A parte da Aceleraí" (3 items) |
| 3.3 | `SLIDE 3.3` | O tempo é seu aliado (se você for rápido) | Warning box + cenário "CLIENTE ÁGIL" vs. "CLIENTE QUE DEMOROU" |
| 3.4 | `SLIDE 3.4` | Onde a gente se fala | Cards: WhatsApp (canal principal) + Plataforma Aceleraí (entregas) |

### Quiz (após slide 3.4)

| # | Pergunta (checkbox) |
|---|---------------------|
| 1 | "Entendi que o prazo do contrato conta a partir da assinatura e que minha agilidade impacta diretamente o resultado." |
| 2 | "Sei que terei 15 dias de preparação e que preciso responder rapidamente a todas as solicitações." |
| 3 | "Compreendo que atrasos da minha parte podem reduzir o tempo de uso da campanha." |

### Campos de formulário

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| Quiz checkbox 1 | checkbox | Sim | Todos marcados |
| Quiz checkbox 2 | checkbox | Sim | Todos marcados |
| Quiz checkbox 3 | checkbox | Sim | Todos marcados |

### Tela de Ativação (pós-quiz)

Após o ProcessingOverlay, exibe tela "Preparação ativada!" com:
- Badge `"15 DIAS DE PREPARAÇÃO"` (pulsante)
- Card "O QUE ACONTECE AGORA" (3 items: contato, responda rápido, produção começa)
- Botão `"Continuar para Etapa 4"` → `goNext()`
- Dots de progresso (3 completos de 7)

---

## Etapa 4 — Regras de uso da celebridade

**Arquivo:** `src/pages/Etapa4.jsx`
**Copy:** `ETAPA4` em `src/copy.js`
**Tipo:** Carrossel (4 slides) + Quiz contextual

### Slides Internos

| Slide | Tag | Título | Conteúdo |
|-------|-----|--------|----------|
| 4.1 | `SLIDE 4.1` | Onde e como você pode usar sua celebridade | Card contrato (celebridade, praça, segmento dinâmicos) + exclusividade + exemplo prático |
| 4.3 | `SLIDE 4.3` | Como funciona a aprovação das peças | Timeline 4 etapas (produção → revisão → celebridade → entrega) + regra de ajustes + regra de ouro |
| 4.4 | `SLIDE 4.4` | Franquias, filiais e outras mídias | Franquias (pode/não pode) + Canais digitais (pode/não pode) + Regras de publicação + TV/Rádio/Outdoor |
| 4.5 | `SLIDE 4.5` | Prazo de uso e o que acontece no fim do contrato | Renovação (2 passos) + Celebridade não disponível (Opção A/B) + Encerramento (3 obrigações) + Multa 10x |

### Quiz (slide 4.6)

| # | Pergunta (checkbox) — dinâmica com dados da compra |
|---|-----------------------------------------------------|
| 1 | "Entendo que a exclusividade de {celebName} é válida para minha praça ({praca}) e meu segmento ({segmento})." |
| 2 | "Sei que toda peça precisa de aprovação da celebridade e que tenho até 2 rodadas de ajustes por peça." |
| 3 | "Não vou marcar a celebridade nas redes sociais nem usar sua imagem por WhatsApp ou e-mail marketing." |
| 4 | "Ao encerrar o contrato, vou excluir todas as peças com a imagem da celebridade de todos os canais." |
| 5 | "Estou ciente de que o uso indevido pode gerar multa de até 10x o valor contratual." |

### Campos de formulário

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| Quiz checkbox 1–5 | checkbox | Sim | Todos marcados para avançar |

### Completion

Tela com resumo:
- Celebridade, Praça, Segmento
- Ajustes: "2 rodadas por peça"
- Aprovação celebridade: "Até 3 dias úteis"

---

## Etapa 5 — Sua presença digital

**Arquivo:** `src/pages/Etapa5.jsx`
**Copy:** `ETAPA5` em `src/copy.js`
**Tipo:** Tela única com seleção de opção (radio)

### Cards informativos

1. **"Seus criativos precisam de um palco"** — texto sobre importância dos canais
2. **"PENSE ASSIM"** — Celebridade atrai → Canais convertem (visual comparativo)
3. **"Como acelerar seus resultados"** — tráfego pago + pergunta

### Campos de formulário

| Campo | Tipo | Obrigatório | Validação | Persiste em |
|-------|------|-------------|-----------|-------------|
| Tráfego pago | Radio button (2 opções) | Sim | Uma opção deve ser selecionada | `userData.trafficChoice` |

**Opções do radio:**

| Valor | Label | Badge |
|-------|-------|-------|
| `"yes"` | "Sim, quero receber as 10 superdicas de tráfego pago" | `"PDF GRATUITO"` |
| `"no"` | "Agora não, quero seguir para a próxima etapa" | — |

### Ação ao confirmar

- Se `"yes"`: dispara webhook `POST` para `VITE_TRAFFIC_MATERIAL_WEBHOOK_ENDPOINT` com URL do material
- Atualiza `userData.trafficChoice`
- Exibe CompletionScreen (mensagem diferente por escolha)
- Avança via `goNext()` no CompletionScreen

---

## Etapa 6 (6.1) — Sua identidade visual

**Arquivo:** `src/pages/Etapa6.jsx`
**Copy:** `ETAPA6` em `src/copy.js`
**Tipo:** Tela informativa com checkbox de confirmação

### Cards informativos

1. **"Suas peças ficam muito melhores com a sua cara"** — importância das referências
2. **"A DIFERENÇA NA PRÁTICA"** — COM vs. SEM referências

### Campos de formulário

| Campo | Tipo | Obrigatório | Validação | Persiste em |
|-------|------|-------------|-----------|-------------|
| Confirmação de entendimento | Checkbox | Sim | Deve estar marcado para avançar | estado local `acknowledged` |

**Texto do checkbox:**
`"Entendi que preciso separar os materiais de identidade visual da minha marca para enviar ao atendente."`

### Ação: "Confirmar e avançar" → CompletionScreen → `goNext()`

---

## Etapa 6.2 — Bonificação de prazo (Identidade Visual Avançada)

**Arquivo:** `src/pages/Etapa62.jsx`
**Copy:** `ETAPA62` em `src/copy.js`
**Tipo:** Tela com 3 modos: introdução → modo simplificado → modo avançado (5 slides)

### Fluxo de decisão

```
Tela Intro (bonificação + como funciona) → Botão "Confirmar e avançar"
    ↓
Modo Simplificado (logo opcional + site + instagram + cores auto)
    ↓ (Botão "Confirmar e enviar")
CompletionScreen
```

O **modo avançado** (`choice === "add_now"`) é acessível via código mas o fluxo padrão atual navega pelo modo simplificado.

### Modo Simplificado — Campos de formulário

| Campo | Tipo | Obrigatório | Validação | Persiste em |
|-------|------|-------------|-----------|-------------|
| Logo da marca | File upload (imagem) | Opcional | PNG, JPG, SVG, WebP, max 5 MB | `userData.identityBonusLogoName` + `logoFile` |
| Cores da marca | Color swatches (auto-extraídas + manuais) | Opcional (aparece após logo) | Max 5 cores total | `userData.identityBonusColors` |
| Site da empresa | URL input | Opcional | Validação de URL | `userData.siteUrl` |
| Perfil do Instagram | Text input com prefixo `https://www.instagram.com/` | Opcional | Regex de handle (letras, números, `.`, `_`) | `userData.instagramHandle` |

### Modo Avançado (5 slides) — Campos de formulário

| Slide | Campo | Tipo | Obrigatório | Validação | Persiste em |
|-------|-------|------|-------------|-----------|-------------|
| 1 — Logo | Upload de logo | File input (imagem) | **Sim** (para avançar slide) | PNG, JPG, SVG, WebP ≤ 5 MB (`validateLogoFile()`) | `identityBonusLogoName` |
| 2 — Cores | Cores extraídas | Color swatch (readonly badge "LOGO") | Auto | Extraídas via `extractColorsFromImage()` | `identityBonusExtractedColors` |
| 2 — Cores | Cores manuais | Color picker + botão adicionar | Opcional | Max 5 total (extraídas + custom) | `identityBonusCustomColors` |
| 3 — Fonte | Seleção de fonte | Radio group (3 opções) | **Sim** (para avançar slide) | Uma opção deve ser selecionada | `identityBonusFont` |
| 4 — Imagens | Imagens de campanha | File upload múltiplo | Opcional | Até 5 imagens | `identityBonusImagesCount` |
| 5 — Observações | Notas da campanha | Textarea (max 500 chars) | Opcional | Max 500 caracteres | `campaignNotes` |

**Opções de fonte (slide 3):**

| ID | Label | Família CSS |
|----|-------|-------------|
| `inter` | Inter | `'Inter', sans-serif` |
| `jetbrains` | JetBrains Mono | `'JetBrains Mono', monospace` |
| `georgia` | Georgia | `Georgia, serif` |

### Status Chips

Cada campo exibe um chip de status:
- **Obrigatório** (amarelo): campo ainda não preenchido
- **Concluído** (verde): campo preenchido
- **Opcional** (cinza): campo não obrigatório

### Backend

Ao confirmar, chama `saveIdentityToBackend()` → `POST /functions/v1/save-onboarding-identity` (FormData):
- `compra_id`, `choice`, `logo` (file), `brand_palette` (JSON), `font_choice`, `campaign_notes`, `campaign_images` (múltiplos files)

### Botão alternativo

No modo avançado, slide 0 (se logo não preenchido): **"Continuar depois (marcar etapa como pendente)"** → salva `choice: 'later'` no backend

---

## Etapa 7 — Modo Avançado (Briefing da Campanha)

**Arquivo:** `src/pages/Etapa7.jsx`
**Copy:** `ETAPA7` em `src/copy.js`
**Tipo:** Tela com escolha de caminho (radio) + formulário condicional de briefing

### Card introdutório

**"Você tem estrutura para ir além?"** — Explica opção para clientes com equipe própria.

### Campos de formulário

| Campo | Tipo | Obrigatório | Validação | Persiste em |
|-------|------|-------------|-----------|-------------|
| Caminho de produção | Radio group (2 opções) | Sim | Uma opção selecionada | `userData.productionPath` |

**Opções de caminho:**

| Valor | Título | Badge | Descrição |
|-------|--------|-------|-----------|
| `"standard"` | Produção pela Aceleraí | `PADRÃO` | Nossa equipe cuida de tudo |
| `"hybrid"` | Personalizado (Avançado) | `AVANÇADO` | Você personaliza com informações essenciais |

### Se `"standard"` selecionado

Exibe confirmação verde: "Produção completa pela Aceleraí" → botão "Concluir e avançar" habilitado.

### Se `"hybrid"` selecionado — Campos adicionais

Exibe 4 cards de regras + formulário de briefing:

| Campo | Tipo | Obrigatório | Validação | Persiste em |
|-------|------|-------------|-----------|-------------|
| Texto do briefing | Textarea (componente `CampaignBriefing`) | Condicional (texto ou áudio) | Min 50 chars, max 5000 chars | `campaignBriefText` |
| Áudio do briefing | Gravação de áudio (botão gravar) | Condicional (texto ou áudio) | Duração > 0 | blob + `campaignBriefAudioDurationSec` |
| Site da empresa | URL input | Sim (para gerar IA) | URL válida (http/https) | `campaignCompanySite` |

**Regras de validação para avançar (hybrid):**
- Pelo menos texto válido OU áudio válido
- `briefMode` calculado: `"both"` (ambos) / `"text"` / `"audio"` / `null`

### Cards de regras exibidos no modo hybrid

1. **Aprovação obrigatória** — todo material precisa aprovação antes de publicar
2. **3 dias úteis por lote** — prazo de revisão
3. **Celebridade pode rejeitar** — 4 razões listadas
4. **Recomendações** — 4 itens de boas práticas
5. **Briefing avançado** — info sobre especificações técnicas

### Backend

1. **Save briefing:** `POST /functions/v1/save-campaign-briefing` (FormData: `compra_id`, `mode`, `text`, `audio`, `audio_duration_sec`)
2. **Update production path:** `POST /functions/v1/save-onboarding-identity` (JSON: `compra_id`, `choice: 'add_now'`, `production_path`)
3. **Generate AI briefing:** `POST /functions/v1/generate-campaign-briefing` (JSON: `compra_id`, `company_name`, `company_site`, `celebrity_name`, `context`, `briefing_input`)

### Navegação condicional do botão

| Estado | Label do botão |
|--------|----------------|
| `standard` | "Concluir e avançar" |
| `hybrid` + `generationStatus === "idle"` | "Gerar briefing IA" |
| `hybrid` + `generationStatus === "success"` | "Concluir e avançar" |
| `hybrid` + `generationStatus === "error"` | "Concluir sem briefing IA" |

---

## Etapa Final — Resumo + Parabéns

**Arquivo:** `src/pages/EtapaFinal.jsx`
**Copy:** `ETAPA_FINAL` em `src/copy.js`
**Tipo:** Duas telas sequenciais (resumo → parabéns)

### Tela 1 — Resumo

**Título:** "Tudo pronto. Sua campanha vai começar."
**Subtítulo:** "Você completou todas as etapas. Aqui está o resumo."

#### Card "RESUMO DA SUA CAMPANHA"

| Linha | Ícone | Label | Valor |
|-------|-------|-------|-------|
| 1 | star | Celebridade | `{celebName}` |
| 2 | mapPin | Praça | `{praca}` |
| 3 | tag | Segmento | `{segmento}` |
| 4 | clapperboard | Pacote | "2 vídeos + 4 estáticas" |
| 5 | calendarDays | Vigência | `{vigencia}` |
| 6 | clock | Preparação | "15 dias (ativados)" |
| 7 | handshake | Produção | "Personalizado" ou "Aceleraí" |
| 8 | send | Briefing | "Texto + Áudio" / "Áudio" / "Texto" (se hybrid) |
| 9 | zap | Briefing IA | "Gerado com IA" / "Falha na geração IA" (se hybrid) |

#### Card "PRÓXIMOS PASSOS"

| # | Título | Descrição |
|---|--------|-----------|
| 1 | "{atendente} vai entrar em contato" | "Em até 1 dia útil pra iniciar a produção" |
| 2 | "START KIT em personalização" | "Em breve você receberá exemplos de peças..." |
| 3 | "Responda rápido" | "Quanto mais ágil for a comunicação..." |

#### Card do Atendente

- Label: "SUA ATENDENTE" / "SEU ATENDENTE" (por gênero)
- Nome do atendente em destaque
- "Entrará em contato em até 1 dia útil"

### Campos de formulário: **Nenhum**

### Ação: botão "Concluir Primeiro Passo" → transição para Tela 2

---

### Tela 2 — Parabéns (estado `finished`)

- Animação Lottie (celebration)
- Título: "Parabéns!"
- Texto motivacional
- Dots 7/7 verdes
- Badge: "PRIMEIRO PASSO CONCLUIDO"
- Card atendente (nome + contato em 1 dia útil)
- Mensagem: "A gente está junto com você. Boa campanha!"

**Esta é a tela terminal — não há navegação posterior.**

---

## Tela "Tudo Pronto" (alternativa)

**Arquivo:** `src/pages/TudoPronto.jsx`
**Tipo:** Tela final estática (similar a Etapa Final "parabéns")

Exibe praticamente os mesmos dados que a tela de parabéns do `EtapaFinal`, mas com layout ligeiramente diferente (fundo radial gradient vermelho). Provavelmente usada como fallback ou tela alternativa de conclusão.

---

## Componentes Compartilhados

| Componente | Uso | Descrição |
|------------|-----|-----------|
| `PageLayout` | Todas as etapas (exceto 1 e Final) | Container padrão com TopBar + padding |
| `StepHeader` | Todas (exceto 1 e Final) | Tag, título, tempo de leitura, alert |
| `SlideDots` | Etapas 2, 3, 4, 6.2 | Indicador de slides (clicável) |
| `SlideTransition` | Etapas 2, 3, 4, 6.2 | Animação + swipe entre slides |
| `NavButtons` | Todas (exceto 1 e Final) | Botões Voltar/Avançar no footer |
| `StickyFooter` | Todas (exceto 1 e Final) | Footer fixo na base |
| `QuizConfirmation` | Etapas 2, 3, 4 | Lista de checkboxes obrigatórios |
| `CompletionScreen` | Etapas 2, 4, 5, 6, 6.2, 7 | Tela de transição "Etapa X concluída!" |
| `ProcessingOverlay` | Etapas 2, 3, 4, 6.2, 7 | Overlay com mensagens sequenciais durante salvamento |
| `CampaignBriefing` | Etapa 7 (hybrid) | Formulário de briefing (texto + áudio + site) |
| `ThumbnailPreview` | Etapa 6.2 | Preview de imagem com botão remover |
| `ColorSwatch` | Etapa 6.2 | Color picker com badge e botão remover |
| `InfoCard` | Etapa 5 | Card com ícone, título e conteúdo |
| `BulletList` | Etapas 2, 3, 7 | Lista com bullets coloridos |
| `Icon` | Todas | Wrapper de ícones Lucide |

---

## Resumo de todos os campos interativos (input do usuário)

| Etapa | Campo | Tipo | Obrigatório | Persiste no backend |
|-------|-------|------|-------------|---------------------|
| 2 | Quiz (3 checkboxes) | Confirmação | Sim | Não (apenas progresso) |
| 3 | Quiz (3 checkboxes) | Confirmação | Sim | Não (apenas progresso) |
| 4 | Quiz (5 checkboxes) | Confirmação | Sim | Não (apenas progresso) |
| 5 | Tráfego pago (radio) | Seleção | Sim | Webhook externo |
| 6.1 | Checkbox de entendimento | Confirmação | Sim | Não |
| 6.2 | Logo | File upload | Opcional (simplificado) / Obrig. (avançado) | `save-onboarding-identity` |
| 6.2 | Cores | Color picker | Opcional | `save-onboarding-identity` |
| 6.2 | Fonte | Radio (3 opções) | Obrig. (avançado) | `save-onboarding-identity` |
| 6.2 | Imagens campanha | File upload múltiplo | Opcional | `save-onboarding-identity` |
| 6.2 | Observações | Textarea (500 chars) | Opcional | `save-onboarding-identity` |
| 6.2 | Site | URL input | Opcional | `save-onboarding-identity` |
| 6.2 | Instagram | Text input | Opcional | `save-onboarding-identity` |
| 7 | Caminho de produção | Radio (2 opções) | Sim | `save-onboarding-identity` |
| 7 | Briefing texto | Textarea | Condicional (hybrid) | `save-campaign-briefing` |
| 7 | Briefing áudio | Gravação | Condicional (hybrid) | `save-campaign-briefing` |
| 7 | Site empresa | URL input | Condicional (hybrid + IA) | `generate-campaign-briefing` |
| Final | Botão "Concluir" | Click | Sim | Não |

---

## Endpoints chamados pelo formulário

| Endpoint | Método | Etapa | Payload |
|----------|--------|-------|---------|
| `get-onboarding-data` | GET | Inicialização | `?compra_id={uuid}` |
| `save-onboarding-identity` | POST | 6.2, 7 | FormData ou JSON |
| `save-campaign-briefing` | POST | 7 (hybrid) | FormData |
| `generate-campaign-briefing` | POST | 7 (hybrid) | JSON |
| Webhook tráfego | POST | 5 | `{ url: string }` |

---

## Mapeamento Formulário ↔ Banco de Dados (Supabase)

> Dados extraídos via `information_schema.columns` e `table_constraints` do banco de produção.

### Diagrama de Relacionamento

```
compras (1) ──── (0..1) onboarding_identity   [UNIQUE compra_id]
   │
   ├──── (0..1) onboarding_briefings          [UNIQUE compra_id]
   │
   └──── (0..N) ai_campaign_jobs              [FK compra_id]
                    │
                    └──── (0..N) ai_campaign_assets  [FK job_id]
```

### Storage Bucket

| Bucket | Público | Uso |
|--------|---------|-----|
| `onboarding-identity` | Privado | Logo, imagens de campanha (path: `{compra_id}/logo.{ext}`, `{compra_id}/img_{N}.{ext}`) |

---

### Tabela: `onboarding_identity`

**Relação:** 1 linha por compra (UNIQUE em `compra_id`)
**Escrita:** Edge Function `save-onboarding-identity` (upsert por `compra_id`)
**Etapas do formulário que alimentam:** Etapa 6.2, Etapa 7

| Coluna DB | Tipo | Nullable | Default | Campo do Formulário | Etapa | Descrição |
|-----------|------|----------|---------|---------------------|-------|-----------|
| `id` | uuid | NO | `gen_random_uuid()` | — | — | PK gerada automaticamente |
| `compra_id` | uuid | NO | — | `compra_id` (query param) | Init | FK → `compras.id` (UNIQUE) |
| `choice` | text | NO | — | Escolha de identidade (`'add_now'` / `'later'`) | 6.2 | Se o cliente enviou material agora ou depois |
| `logo_path` | text | YES | null | Upload de logo (file) | 6.2 | Path no storage: `{compra_id}/logo.{ext}` |
| `brand_palette` | text[] | NO | `'{}'` | Cores extraídas + cores manuais | 6.2 | Array de hex colors (max 8) |
| `font_choice` | text | YES | null | Seleção de fonte (radio: `inter` / `jetbrains` / `georgia`) | 6.2 | ID da fonte selecionada |
| `campaign_images_paths` | text[] | YES | `'{}'` | Upload de imagens de campanha (múltiplo, max 5) | 6.2 | Paths no storage: `{compra_id}/img_{N}.{ext}` |
| `campaign_notes` | text | YES | null | Textarea de observações (max 500 no front / 2000 no back) | 6.2 | Texto livre com notas da campanha. No modo simplificado, recebe `"Site: ... \| Instagram: ..."` |
| `production_path` | text | YES | null | Radio: `'standard'` / `'hybrid'` | 7 | Caminho de produção escolhido |
| `created_at` | timestamptz | NO | `now()` | — | — | Data de criação do registro |
| `updated_at` | timestamptz | NO | `now()` | — | — | Atualizada a cada upsert |

**Validações no backend (`save-onboarding-identity`):**

| Regra | Valor |
|-------|-------|
| Logo: tamanho máx. | 5 MB |
| Logo: formatos aceitos | PNG, JPG, SVG, WebP |
| Cores: máximo | 8 |
| Font choice: máximo chars | 100 |
| Notas: máximo chars | 2000 |
| Imagens campanha: máximo | 5 arquivos |
| Imagem individual: máximo | 5 MB |
| Choice: valores aceitos | `add_now`, `later` |
| Production path: valores | `standard`, `hybrid` |

**Efeito colateral:** Quando `production_path === 'standard'`, o backend dispara `create-ai-campaign-job` automaticamente.

---

### Tabela: `onboarding_briefings`

**Relação:** 1 linha por compra (UNIQUE em `compra_id`)
**Escrita:** Edge Function `save-campaign-briefing` (upsert por `compra_id`)
**Etapa do formulário que alimenta:** Etapa 7 (caminho `hybrid`)

| Coluna DB | Tipo | Nullable | Default | Campo do Formulário | Etapa | Descrição |
|-----------|------|----------|---------|---------------------|-------|-----------|
| `id` | uuid | NO | `gen_random_uuid()` | — | — | PK |
| `compra_id` | uuid | NO | — | `compra_id` (query param) | Init | FK → `compras.id` (UNIQUE) |
| `mode` | text | NO | — | Calculado: `'text'` / `'audio'` / `'both'` | 7 | Baseado nos inputs preenchidos |
| `brief_text` | text | YES | null | Textarea do briefing (min 50, max 5000 chars) | 7 | Texto do briefing escrito pelo cliente |
| `audio_path` | text | YES | null | Gravação de áudio (blob) | 7 | Path do arquivo de áudio no storage |
| `audio_duration_sec` | integer | YES | null | Duração do áudio gravado | 7 | Em segundos, calculado automaticamente |
| `transcript` | text | YES | null | — (gerado pelo backend) | — | Transcrição automática do áudio |
| `transcript_status` | text | YES | null | — (gerado pelo backend) | — | Status da transcrição (`pending`, `done`, `error`) |
| `briefing_json` | jsonb | YES | null | — (gerado por IA) | — | Briefing estruturado gerado pela IA (Perplexity) |
| `citations_json` | jsonb | YES | null | — (gerado por IA) | — | Citações/fontes usadas pela IA |
| `provider` | text | YES | null | — (preenchido pelo backend) | — | Nome do provider de IA (ex: `perplexity`) |
| `provider_model` | text | YES | null | — (preenchido pelo backend) | — | Modelo usado (ex: `sonar-pro`) |
| `prompt_version` | text | YES | null | — (preenchido pelo backend) | — | Versão do prompt usado |
| `strategy_version` | text | YES | null | — (preenchido pelo backend) | — | Versão da estratégia |
| `contract_version` | text | YES | null | — (preenchido pelo backend) | — | Versão do contrato de geração |
| `status` | text | YES | null | — (preenchido pelo backend) | — | Status geral do briefing |
| `error_code` | text | YES | null | — (preenchido pelo backend) | — | Código de erro se falhou |
| `created_at` | timestamptz | NO | `now()` | — | — | Data de criação |
| `updated_at` | timestamptz | NO | `now()` | — | — | Data de atualização |

---

### Tabela: `compras` (leitura — hidratação do formulário)

**Relação:** Tabela mestre. O formulário **lê** desta tabela na inicialização via `get-onboarding-data`.
**Escrita pelo formulário:** Nenhuma (somente leitura)
**Colunas usadas na hidratação:**

| Coluna DB | Tipo | Mapeamento p/ `userData` | Join/Lookup |
|-----------|------|--------------------------|-------------|
| `id` | uuid | `compra_id` | — |
| `cliente_id` | uuid | → `clientName` | JOIN `clientes` → `nome` ou `nome_fantasia` ou `razaosocial` |
| `celebridade` | uuid (FK → `celebridadesReferencia.id`) | → `celebName` | JOIN `celebridadesReferencia` → `nome` |
| `segmento` | uuid (FK → `segmentos.id`) | → `segmento` | JOIN `segmentos` → `nome` |
| `regiaocomprada` | text | → `praca` | Direto (string) |
| `descricao` | text | → `pacote` | Direto (string) |
| `tempoocomprado` | text | → `vigencia` | Prioridade sobre `vigencia_meses` |
| `vigencia_meses` | integer | → `vigencia` (fallback) | `"{N} meses"` se `tempoocomprado` vazio |
| `checkout_status` | enum | Elegibilidade | `'pago'` = elegível |
| `clicksign_status` | text | Elegibilidade | `'Assinado'` = elegível |
| `vendaaprovada` | boolean | Elegibilidade | `true` = elegível (ou `checkout_status === 'pago'`) |
| `valor_total` | numeric | → atendente lookup | Usado para buscar atendente por faixa de valor |

**Regra de elegibilidade:** `(checkout_status === 'pago' || vendaaprovada === true) && clicksign_status === 'Assinado'`

**Lookup do atendente:**

| Tabela | Query | Resultado |
|--------|-------|-----------|
| `atendentes` | `ativo = true AND valor_min <= valor_total AND (valor_max IS NULL OR valor_max >= valor_total)` ORDER BY `valor_min` DESC LIMIT 1 | → `userData.atendente` (nome) + `userData.atendenteGenero` (genero) |

---

### Tabelas de referência (somente leitura)

| Tabela | Chave | Coluna usada | Destino no formulário |
|--------|-------|--------------|----------------------|
| `clientes` | `id` = `compras.cliente_id` | `nome`, `nome_fantasia`, `razaosocial` | `userData.clientName` |
| `celebridadesReferencia` | `id` = `compras.celebridade` | `nome` | `userData.celebName` |
| `segmentos` | `id` = `compras.segmento` | `nome` | `userData.segmento` |
| `atendentes` | Filtro por `valor_total` | `nome`, `genero` | `userData.atendente`, `userData.atendenteGenero` |

**Estrutura das tabelas de referência:**

| `clientes` | `celebridadesReferencia` | `segmentos` | `vendedores` |
|------------|--------------------------|-------------|--------------|
| id (uuid) | id (bigint) | id (uuid) | id (uuid) |
| nome (text) | nome (text) | nome (text) | nome (text) |
| nome_fantasia (text) | ativo (boolean) | active (boolean) | ativo (boolean) |
| razaosocial (text) | fotoPrincipal (text) | | email (text) |
| cnpj (text) | fotoMobile (text) | | telefone (text) |
| telefone (text) | fotoSecundaria (text) | | |

---

### Tabela: `ai_campaign_jobs` (downstream — pós-formulário)

**Relação:** N linhas por compra (histórico de jobs)
**Criada por:** `create-ai-campaign-job` (disparado automaticamente quando `production_path = 'standard'`)

| Coluna DB | Tipo | Nullable | Default | Descrição |
|-----------|------|----------|---------|-----------|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `compra_id` | uuid | NO | — | FK → `compras.id` |
| `status` | text | NO | `'pending'` | `pending` / `processing` / `done` / `error` |
| `input_hash` | text | NO | — | Hash dos inputs para dedup |
| `prompt_version` | text | NO | — | Versão do prompt de geração |
| `total_expected` | integer | NO | `12` | Total de assets esperados |
| `total_generated` | integer | NO | `0` | Total de assets gerados até agora |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

### Tabela: `ai_campaign_assets` (downstream)

| Coluna DB | Tipo | Nullable | Default | Descrição |
|-----------|------|----------|---------|-----------|
| `id` | uuid | NO | `gen_random_uuid()` | PK |
| `job_id` | uuid | NO | — | FK → `ai_campaign_jobs.id` |
| `group_name` | text | NO | — | Grupo/categoria do asset |
| `format` | text | NO | — | Formato (ex: `1080x1080`, `1080x1920`) |
| `image_url` | text | NO | — | URL da imagem gerada |
| `width` | integer | YES | — | Largura em px |
| `height` | integer | YES | — | Altura em px |
| `prompt_version` | text | NO | — | Versão do prompt usado |
| `status` | text | NO | `'pending'` | Status do asset |
| `created_at` | timestamptz | NO | `now()` | |

### Tabela: `activity_logs` (observabilidade)

| Coluna DB | Tipo | Relevância |
|-----------|------|------------|
| `compra_id` | uuid | FK → `compras.id` |
| `module` | enum | `checkout \| contract \| nfse \| omie` (sem módulo `onboarding`) |
| `event` | text | Nome do evento |
| `is_error` | boolean | Se é erro |
| `severity` | enum | `info \| warning \| error \| critical` |
| `metadata` | jsonb | Dados extras |

**Nota:** O enum `module` **não inclui** `onboarding`. Ações do formulário de onboarding não são registradas em `activity_logs`.

---

### Mapeamento consolidado: Campo do formulário → Coluna no banco

| Etapa | Campo no formulário | `userData` (contexto JS) | Tabela DB | Coluna DB | Direção |
|-------|---------------------|--------------------------|-----------|-----------|---------|
| Init | URL param `compra_id` | `hydrationCompraId` | `compras` | `id` | Leitura |
| Init | — | `clientName` | `clientes` | `nome` / `nome_fantasia` / `razaosocial` | Leitura |
| Init | — | `celebName` | `celebridadesReferencia` | `nome` | Leitura |
| Init | — | `praca` | `compras` | `regiaocomprada` | Leitura |
| Init | — | `segmento` | `segmentos` | `nome` | Leitura |
| Init | — | `pacote` | `compras` | `descricao` | Leitura |
| Init | — | `vigencia` | `compras` | `tempoocomprado` / `vigencia_meses` | Leitura |
| Init | — | `atendente` | `atendentes` | `nome` | Leitura |
| Init | — | `atendenteGenero` | `atendentes` | `genero` | Leitura |
| 2,3,4 | Quiz checkboxes | — | — | — | Nenhum (só progresso local) |
| 5 | Tráfego radio (yes/no) | `trafficChoice` | — | — | Webhook externo |
| 6.1 | Checkbox entendimento | — | — | — | Nenhum (só progresso local) |
| 6.2 | Upload de logo | `identityBonusLogoName` | `onboarding_identity` | `logo_path` | Escrita (Storage) |
| 6.2 | Cores (auto + manual) | `identityBonusColors` | `onboarding_identity` | `brand_palette` | Escrita |
| 6.2 | Seleção de fonte | `identityBonusFont` | `onboarding_identity` | `font_choice` | Escrita |
| 6.2 | Upload imagens campanha | `identityBonusImagesCount` | `onboarding_identity` | `campaign_images_paths` | Escrita (Storage) |
| 6.2 | Observações (textarea) | `campaignNotes` | `onboarding_identity` | `campaign_notes` | Escrita |
| 6.2 | Site da empresa (URL) | `siteUrl` | `onboarding_identity` | `campaign_notes` (concatenado) | Escrita |
| 6.2 | Perfil Instagram | `instagramHandle` | `onboarding_identity` | `campaign_notes` (concatenado) | Escrita |
| 6.2 | Escolha add_now/later | `identityBonusChoice` | `onboarding_identity` | `choice` | Escrita |
| 7 | Radio standard/hybrid | `productionPath` | `onboarding_identity` | `production_path` | Escrita |
| 7 | Briefing texto | `campaignBriefText` | `onboarding_briefings` | `brief_text` | Escrita |
| 7 | Briefing áudio | (blob) | `onboarding_briefings` | `audio_path` | Escrita (Storage) |
| 7 | Duração do áudio | `campaignBriefAudioDurationSec` | `onboarding_briefings` | `audio_duration_sec` | Escrita |
| 7 | Modo do briefing | `campaignBriefMode` | `onboarding_briefings` | `mode` | Escrita |
| 7 | Site empresa (briefing IA) | `campaignCompanySite` | `onboarding_briefings` | via `generate-campaign-briefing` → `briefing_json` | Escrita (input p/ IA) |
| 7 | Briefing gerado IA | `campaignGeneratedBriefing` | `onboarding_briefings` | `briefing_json` | Escrita (backend) |
| 7 | Citações IA | `campaignBriefCitations` | `onboarding_briefings` | `citations_json` | Escrita (backend) |
| 7 | Status geração IA | `campaignBriefGenerationStatus` | `onboarding_briefings` | `status` | Escrita (backend) |
| 7 | Código erro IA | `campaignBriefErrorCode` | `onboarding_briefings` | `error_code` | Escrita (backend) |

---

### Campos que NÃO persistem no banco

| Etapa | Campo | Motivo |
|-------|-------|--------|
| 2 | Quiz (3 checkboxes) | Apenas progresso local (`localStorage`) |
| 3 | Quiz (3 checkboxes) | Apenas progresso local |
| 4 | Quiz (5 checkboxes) | Apenas progresso local |
| 5 | Escolha tráfego (`yes`/`no`) | Persiste via webhook externo, não no banco |
| 6.1 | Checkbox entendimento | Apenas progresso local |
| Final | Botão "Concluir" | Apenas transição de tela |

---

### Campos do banco preenchidos SOMENTE pelo backend (sem input do usuário)

| Tabela | Coluna | Preenchido por |
|--------|--------|----------------|
| `onboarding_briefings` | `transcript` | Backend (transcrição de áudio) |
| `onboarding_briefings` | `transcript_status` | Backend |
| `onboarding_briefings` | `briefing_json` | `generate-campaign-briefing` (Perplexity IA) |
| `onboarding_briefings` | `citations_json` | `generate-campaign-briefing` |
| `onboarding_briefings` | `provider`, `provider_model` | Backend |
| `onboarding_briefings` | `prompt_version`, `strategy_version`, `contract_version` | Backend |
| `ai_campaign_jobs` | todos | `create-ai-campaign-job` (disparado automaticamente) |
| `ai_campaign_assets` | todos | Pipeline de geração de imagens IA |
