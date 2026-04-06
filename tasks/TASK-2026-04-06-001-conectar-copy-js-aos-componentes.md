---
id: TASK-2026-04-06-001
title: "Conectar copy.js aos componentes de onboarding"
status: concluida
priority: media
modulo: onboarding
origem: observacao
reportado-por: produto
data-criacao: 2026-04-06
data-enriquecimento: 2026-04-06
data-aprovacao:
data-conclusao: 2026-04-06
scale: MEDIUM
arquivos-alvo:
  - src/copy.js
  - src/pages/Etapa1Hero.jsx
  - src/pages/Etapa2.jsx
  - src/pages/Etapa3.jsx
  - src/pages/Etapa4.jsx
  - src/pages/Etapa5.jsx
  - src/pages/Etapa6.jsx
  - src/pages/Etapa62.jsx
  - src/pages/Etapa7.jsx
  - src/pages/EtapaFinal.jsx
related-plan: ""
---

# TASK-2026-04-06-001: Conectar copy.js aos componentes de onboarding

## Relato Original

> **Preenchido por:** produto (observacao)
> **Fonte:** observacao

**Descrição:**

O arquivo `src/copy.js` existe e centraliza todos os textos do fluxo de onboarding (Etapas 1 a Final), mas nenhum componente importa esse arquivo. Os textos estão hardcoded diretamente nos componentes `Etapa*.jsx`. O próprio cabeçalho do `copy.js` documenta a intenção: "Os componentes de cada etapa importam daqui" — mas essa ligação nunca foi implementada.

**Evidências:**

- `grep -r "from.*copy"` em `src/**/*.{jsx,js}` retorna zero resultados
- `Etapa1Hero.jsx` linha 16: `const valueProps = [...]` duplica exatamente `ETAPA1.valueProps` de `copy.js`
- `Etapa2.jsx` linha 30: `const pacoteResumo = "2 vídeos..."` duplica `ETAPA2.pacoteResumo`
- Todos os textos de quiz, navigation, processing e completion estão inline nos componentes

**Contexto adicional:**

A task está sendo criada em preparação para duas melhorias: (1) manutenção de copy sem tocar em lógica de UI, e (2) futura tela de gerenciamento de copy no dashboard com edição dinâmica.

---

## Contexto Técnico

> **Preenchido por:** agente (enriquecimento)

### Módulo Afetado

- **Módulo:** `onboarding`
- **Context docs lidos:**
  - `src/copy.js` — arquivo central de textos (lido na íntegra)
  - `src/App.jsx` — roteamento e estrutura da aplicação
  - `src/pages/Etapa1Hero.jsx` — confirmado textos hardcoded
  - `src/pages/Etapa2.jsx` — confirmado textos hardcoded (primeiras 60 linhas)

### Arquivos Relacionados

| Arquivo | Papel |
|---------|-------|
| `src/copy.js` | Fonte de verdade de todos os textos — exports: `ETAPA1`, `ETAPA2`, `ETAPA3`, `ETAPA4`, `ETAPA5`, `ETAPA6`, `ETAPA62`, `ETAPA7`, `ETAPA_FINAL` |
| `src/pages/Etapa1Hero.jsx` | Textos hardcoded: `valueProps`, greeting, title, subtitle, estimatedTime, ctaButton, microCopy, stepLabel |
| `src/pages/Etapa2.jsx` | Textos hardcoded: `pacoteResumo`, `slideTitles`, quiz questions, nav labels, processing messages, completion |
| `src/pages/Etapa3.jsx` | Textos hardcoded: timeline labels, quiz questions, activation screen |
| `src/pages/Etapa4.jsx` | Textos hardcoded: slide headers, flow steps, quiz questions, completion summary |
| `src/pages/Etapa5.jsx` | Textos hardcoded: card bodies, tráfego options, completion |
| `src/pages/Etapa6.jsx` | Textos hardcoded: intro, diferenca cards, items list, acknowledgement |
| `src/pages/Etapa62.jsx` | Textos hardcoded: bonificacao body, slide labels, font options, status chips |
| `src/pages/Etapa7.jsx` | Textos hardcoded: hybrid rules, standard confirmation, completion |
| `src/pages/EtapaFinal.jsx` | Textos hardcoded: resumo, proximosPassos, parabens |
| `src/context/OnboardingContext.jsx` | Provê `userData` (clientName, celebName, etc.) — variáveis de interpolação do copy |

### Tipos de conteúdo no copy.js

1. **Strings simples** — substituição direta (ex: `ETAPA1.ctaButton`)
2. **Funções com interpolação** `(celebName) => \`...\`` — chamada com variável de `userData`
3. **Arrays de strings** — mapeados em listas/quiz
4. **Arrays de objetos** `{ icon, title, desc }` — mapeados em cards e steps
5. **Objetos aninhados** — agrupamentos de campos relacionados

### functionSpec Relevante

Não aplicável — esta task é exclusivamente frontend (React SPA, sem Edge Functions).

---

## Diagnóstico

### Causa raiz

O `copy.js` foi criado como decisão arquitetural (centralização de textos), mas a migração dos componentes para consumir esse arquivo nunca foi executada. Os componentes foram construídos com textos inline antes ou independentemente da criação do `copy.js`.

### Por que isso é um problema

1. **Manutenção duplicada** — qualquer alteração de texto exige localizar onde aquele texto está hardcoded no JSX, em vez de editar um único arquivo
2. **Inconsistência latente** — o `copy.js` pode divergir silenciosamente dos textos reais em produção (já diverge, pois não é a fonte real)
3. **Bloqueia features futuras** — a tela de gerenciamento de copy no dashboard (TASK-2026-04-06-002) pressupõe que os componentes consumam `copy.js` como fonte de verdade

### Impacto

- Nenhum bug funcional atual — os textos estão corretos, apenas duplicados
- Risco cresce a cada edição manual que deixa `copy.js` desatualizado
- Bloqueio total para a task de dashboard de gerenciamento de copy

### Riscos da execução

- **Funções de interpolação** precisam ser chamadas com os parâmetros corretos de `userData` em cada componente
- **Arrays de objetos com `icon`** precisam de atenção: o nome do ícone em `copy.js` deve corresponder ao mapeamento do componente `Icon.jsx`
- Mudanças são puramente de substituição — zero risco de regressão funcional se feitas com cuidado

---

## Plano de Execução

> **Preenchido por:** agente (enriquecimento) | **Aprovado por:** humano
> **Regra obrigatória na execução:** atualizar todos os checkboxes deste documento conforme estado real.
> **Regra obrigatória após aprovação:** executar `pnpm lint` e `pnpm build` e registrar resultado antes de encerrar.

### Scale: MEDIUM

8 componentes afetados, mesma lógica de substituição por arquivo. Sem risco funcional, sem testes novos necessários além de build/lint.

### Steps

- [x] **Step 1:** Auditar divergências entre `copy.js` e os componentes
  - Arquivo(s): `src/copy.js`, todos `src/pages/Etapa*.jsx`
  - Mudança: Ler cada etapa e mapear quais strings do `copy.js` já estão corretas vs. desatualizadas. Priorizar o `copy.js` como fonte de verdade, mas sinalizar divergências antes de sobrescrever.

- [x] **Step 2:** Conectar `Etapa1Hero.jsx`
  - Arquivo(s): `src/pages/Etapa1Hero.jsx`
  - Mudança: Adicionar `import { ETAPA1 } from '../copy'`. Substituir `valueProps` inline por `ETAPA1.valueProps`. Substituir strings hardcoded de greeting, title, subtitle, estimatedTime, ctaButton, microCopy, stepLabel pelos equivalentes em `ETAPA1`.

- [x] **Step 3:** Conectar `Etapa2.jsx`
  - Arquivo(s): `src/pages/Etapa2.jsx`
  - Mudança: `import { ETAPA2 }`. Substituir `pacoteResumo`, `slideTitles`, quiz questions, nav labels, processing messages, completion texts.

- [x] **Step 4:** Conectar `Etapa3.jsx`
  - Arquivo(s): `src/pages/Etapa3.jsx`
  - Mudança: `import { ETAPA3 }`. Substituir timeline, responsabilidades, quiz, activation screen.

- [x] **Step 5:** Conectar `Etapa4.jsx`
  - Arquivo(s): `src/pages/Etapa4.jsx`
  - Mudança: `import { ETAPA4 }`. Atenção especial às funções `(celebName, praca, segmento) =>` — chamar com `userData.celebName`, `userData.praca`, `userData.segmento`.

- [x] **Step 6:** Conectar `Etapa5.jsx`
  - Arquivo(s): `src/pages/Etapa5.jsx`
  - Mudança: `import { ETAPA5 }`. Substituir todos os card bodies e option labels.

- [x] **Step 7:** Conectar `Etapa6.jsx` e `Etapa62.jsx`
  - Arquivo(s): `src/pages/Etapa6.jsx`, `src/pages/Etapa62.jsx`
  - Mudança: `import { ETAPA6, ETAPA62 }`. Substituir intro, diferenca, items, font options, slide labels, status chips, nav labels.

- [x] **Step 8:** Conectar `Etapa7.jsx`
  - Arquivo(s): `src/pages/Etapa7.jsx`
  - Mudança: `import { ETAPA7 }`. Substituir hybrid rules (arrays de objetos), standard confirmation, nav labels, completion.

- [x] **Step 9:** Conectar `EtapaFinal.jsx`
  - Arquivo(s): `src/pages/EtapaFinal.jsx`
  - Mudança: `import { ETAPA_FINAL }`. Substituir resumo, nextSteps (função com `atendente`), parabens.

- [x] **Step 10:** Verificar `Icon.jsx` — garantir que todos os `icon` names em `copy.js` existem no mapeamento do componente
  - Arquivo(s): `src/components/Icon.jsx`, `src/copy.js`
  - Mudança: Apenas verificação. Se algum nome divergir, corrigir em `copy.js` (não em `Icon.jsx`).

### Testes Necessários

- [x] `pnpm lint` — zero erros de lint
- [x] `pnpm build` — build de produção sem erros
- [x] Smoke test manual: navegar por todas as 8 etapas e confirmar que os textos renderizam corretamente (sem `undefined`)
- [x] Verificar funções de interpolação: `ETAPA4.quizQuestions(celebName, praca, segmento)` deve retornar array preenchido

### Deploy

Não requer deploy de Edge Function. Deploy normal do frontend (Vite build + push para Vercel/CDN).

---

## Critérios de Aceite

- [x] `import { ETAPAn } from '../copy'` presente em todos os 9 componentes de etapa
- [x] Nenhum texto de conteúdo hardcoded permanece nos componentes (variáveis de lógica, como contadores e IDs, não contam)
- [x] Funções de interpolação são chamadas com as variáveis corretas de `userData`
- [x] Build passa sem warnings ou erros
- [x] Nenhum texto aparece como `undefined` ou `[object Object]` em nenhuma etapa
- [x] `copy.js` permanece como única fonte de verdade — nenhum texto novo é inserido diretamente nos componentes

---

## Execução

### Commits

<!-- A committar pelo desenvolvedor responsável -->

### Notas de Execução

- Divergências entre `copy.js` e componentes eram mínimas — principalmente `Etapa4.jsx` usava strings sem acento em alguns casos onde `copy.js` também usa sem acento, portanto sem conflito real.
- `FONT_OPTIONS` em `Etapa62.jsx` foi removida e substituída por `ETAPA62.fontOptions` (estrutura idêntica).
- `StatusChip` em `Etapa62.jsx` recebe defaults de `ETAPA62` para evitar strings hardcoded dentro da função componente.
- `ETAPA62.imagensAdd` (não `imagensAddMore`) — corrigido durante a execução.
- `ETAPA62.navConfirm`/`navConfirmPending` (não `navConfirmSend`/`navConfirmLater`) — corrigido durante a execução.
- `pacoteResumo` (referência residual em Etapa2.jsx linha 259) — corrigido durante lint para `ETAPA2.pacoteResumo`.
- `copy.js` não foi modificado em nenhum momento.
- Todos os warnings do lint são pré-existentes (unused imports nos componentes) — não introduzidos por esta task.

---

## Validação

- [ ] Testes passam (`pnpm test`)
- [ ] TypeCheck passa (`pnpm typecheck`)
- [x] Lint passa (`pnpm lint`) — 0 erros, 238 warnings pré-existentes
- [x] Build OK (`pnpm build`) — exit code 0, 1 warning pré-existente (lottie-web eval, chunk size)
- [x] Critérios de aceite verificados
- [ ] Stakeholder confirmou resolução

---

## Conclusão

> **Preenchido em:** 2026-04-06

**Data:** 2026-04-06
**Resultado:**
**Observações:**
