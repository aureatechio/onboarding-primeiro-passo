---
id: TASK-YYYY-MM-DD-NNN
title: ""
status: triagem
priority: ""          # critica | alta | media | baixa
modulo: ""            # checkout | omie | dashboard | clicksign | nfe | email | onboarding | shared | admin
origem: ""            # whatsapp | slack | observacao | backlog | monitoramento
reportado-por: ""
data-criacao: YYYY-MM-DD
data-enriquecimento:
data-aprovacao:
data-conclusao:
scale: ""             # QUICK | SMALL | MEDIUM | LARGE
arquivos-alvo: []
related-plan: ""      # Se promovida de/para plan/, referenciar aqui
---

# {id}: {title}

## Relato Original

> **Preenchido por:** humano (triagem)
> **Fonte:** {origem}

<!-- Cole aqui o relato tal como recebido. Pode ser informal.
     Inclua prints/screenshots como links ou referências.
     Adicione contexto mínimo que você coletou ao avaliar. -->

**Descrição:**


**Evidências (prints, logs, URLs):**


**Contexto adicional (coletado na triagem):**


---

## Contexto Técnico

> **Preenchido por:** agente (enriquecimento)

### Módulo Afetado

- **Módulo:** `{modulo}`
- **Context docs lidos:**
  <!-- O agente lista aqui os docs que consultou do CONTEXT-MAP.md -->

### Arquivos Relacionados

<!-- Lista de arquivos do codebase que o agente identificou como relevantes -->

### functionSpec Relevante

<!-- Se existir, linkar. Se não existir e for Edge Function, considerar criar. -->

---

## Diagnóstico

> **Preenchido por:** agente (enriquecimento)

<!-- Análise técnica do problema:
     - O que está acontecendo (causa raiz provável)
     - Por que está acontecendo
     - Impacto no sistema
     - Riscos da correção -->

---

## Plano de Execução

> **Preenchido por:** agente (enriquecimento) | **Aprovado por:** humano
> **Regra obrigatória na execução:** atualizar todos os checkboxes deste documento conforme estado real (feito `[x]` / pendente `[ ]`).
> **Regra obrigatória após aprovação:** executar validações (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`) e registrar resultado real antes de encerrar a entrega.

### Scale: {QUICK|SMALL|MEDIUM|LARGE}

### Steps

<!-- Cada step tem: descrição, arquivo(s) alvo, e o que muda -->

- [ ] **Step 1:** ...
  - Arquivo(s): `...`
  - Mudança: ...

- [ ] **Step 2:** ...
  - Arquivo(s): `...`
  - Mudança: ...

### Testes Necessários

<!-- Quais testes rodar / criar -->

- [ ] ...

### Deploy

<!-- Instruções de deploy se aplicável (Edge Functions, Vercel, etc.) -->

---

## Critérios de Aceite

> **Preenchido por:** agente (enriquecimento) | **Validado por:** humano

- [ ] ...
- [ ] ...

---

## Execução

> **Preenchido durante:** em-execucao → validacao
> **Obrigatório:** ao final de cada execução, atualizar checkboxes de Steps, Testes Necessários, Critérios de Aceite e Validação, além do `status` no frontmatter.

### Commits

<!-- Listar commits relacionados -->

### Notas de Execução

<!-- Divergências do plano, decisões tomadas, problemas encontrados -->

---

## Validação

> **Preenchido durante:** validacao

- [ ] Testes passam (`pnpm test`)
- [ ] TypeCheck passa (`pnpm typecheck`)
- [ ] Lint passa (`pnpm lint`)
- [ ] Build OK (`pnpm build`)
- [ ] Critérios de aceite verificados
- [ ] Stakeholder confirmou resolução

---

## Conclusão

> **Preenchido em:** concluida

**Data:** {data-conclusao}
**Resultado:** {resolvido | parcial | promovido-a-plan}
**Observações:**
