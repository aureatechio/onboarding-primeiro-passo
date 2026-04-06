---
name: task-enricher
description: Enriquece tarefas operacionais em tasks/. Transforma relatos informais (bugs, pedidos) em tarefas técnicas com contexto do módulo, diagnóstico e plano de execução. Use quando o usuário mencionar "enriquecer tarefa", "task-enricher", ou pedir para preparar uma tarefa para execução.
---

# Task Enricher — Enriquecimento de Tarefas Operacionais

## Quando usar

- Usuário pede para enriquecer uma tarefa em `tasks/`
- Usuário criou uma tarefa com status `triagem` e quer prepará-la para execução
- Usuário cola um relato informal e pede para transformar em tarefa técnica

## Objetivo

Transformar um relato informal (ex: "o webhook da Cielo não tá processando") em uma tarefa técnica completa com contexto do módulo, diagnóstico, plano de execução e critérios de aceite — pronta para um agente executar.

---

## Workflow de Enriquecimento

### Step 1: Ler o relato original

Abrir a tarefa em `tasks/` e ler a seção **Relato Original**. Extrair:
- O que está errado / o que é pedido
- Quem reportou e por qual canal
- Evidências disponíveis (prints, logs, URLs)
- Contexto adicional coletado na triagem

### Step 2: Identificar o módulo afetado

Consultar `CONTEXT-MAP.md` na raiz do projeto para determinar qual módulo é afetado. Mapeamento de palavras-chave para módulo:

| Palavras-chave no relato | Módulo | Context docs |
|--------------------------|--------|-------------|
| OMIE, ordem de serviço, OS, ERP, nota fiscal, NFS-e | `omie` | `.context/modules/omie/README.md` |
| onboarding, primeiro passo, cadastro inicial, etapa, fluxo | `onboarding` | `src/` |
| campanha AI, perplexity, garden, nanobanana, post-gen, briefing, imagem AI | `ai-campaign` | `ai-step2/PRD.md` |
| deploy, edge function, supabase function | `shared` | `CLAUDE.md` → seção Edge Functions Registry |

### Step 3: Carregar contexto do módulo

**Obrigatório — ler nesta ordem:**

1. O `README.md` do módulo identificado (`.context/modules/{modulo}/README.md`)
2. O sub-módulo específico se aplicável
3. O skill correspondente (`.cursor/skills/{modulo}-specialist/SKILL.md` ou equivalente)
4. O `functionSpec.md` da Edge Function afetada, se existir

> **IMPORTANTE:** Não pule este step. O contexto do módulo é o que diferencia um diagnóstico genérico de um diagnóstico que realmente entende o sistema.

### Step 4: Investigar arquivos do codebase

Com base no contexto carregado:

1. Identificar os arquivos-fonte relacionados ao problema
2. Ler os trechos relevantes do código
3. Verificar testes existentes
4. Checar se há `functionSpec.md` para a função afetada

### Step 5: Gerar diagnóstico

Escrever na seção **Diagnóstico** da tarefa:

- **Causa raiz provável:** o que está causando o problema
- **Por quê:** explicação técnica (referenciando código e docs lidos)
- **Impacto:** o que o bug afeta (usuários, fluxos, dados)
- **Riscos da correção:** efeitos colaterais possíveis, módulos que podem ser afetados

### Step 6: Propor plano de execução

Escrever na seção **Plano de Execução**:

1. **Classificar scale:**
   - `QUICK` — mudança em 1-2 arquivos, sem risco, sem teste novo
   - `SMALL` — mudança em 2-4 arquivos, teste simples, 1 módulo
   - `MEDIUM` — mudança em 4-8 arquivos, múltiplos testes, pode cruzar módulos
   - `LARGE` — promover para `plan/`, requer arquitetura

2. **Steps concretos:** cada step deve ter:
   - Descrição clara da mudança
   - Arquivo(s) alvo com path completo
   - O que muda (não precisa ser o código, mas a intenção)

3. **Testes necessários:** quais rodar e quais criar

4. **Deploy:** se envolve Edge Function, confirmar se é pública ou protegida antes de montar o comando de deploy

### Step 7: Definir critérios de aceite

Baseado no relato original e no diagnóstico:
- Condições verificáveis de que a tarefa foi resolvida
- Incluir tanto critérios técnicos (testes passam) quanto funcionais (usuário vê X)

### Step 8: Atualizar metadados

No frontmatter YAML da tarefa:
- `status: enriquecida`
- `data-enriquecimento: {data-atual}`
- `modulo: {modulo-identificado}`
- `scale: {QUICK|SMALL|MEDIUM|LARGE}`
- `priority: {baseado em impacto}`
- `arquivos-alvo: [lista de paths]`

---

## Regras Críticas

### Nunca fazer durante enriquecimento:
- **NÃO** alterar código fonte — enriquecimento é apenas documentação
- **NÃO** rodar testes — isso é para a fase de execução
- **NÃO** fazer deploy — isso é para a fase de confirmação
- **NÃO** inventar problemas — se o relato é ambíguo, anotar na tarefa e pedir mais info

### Sempre fazer:
- **LER** o contexto do módulo antes de diagnosticar
- **REFERENCIAR** os docs e arquivos que consultou
- **MANTER** o relato original intacto (nunca editar a seção "Relato Original")
- **CLASSIFICAR** a scale corretamente para definir o ciclo de vida

### Para Edge Functions:
- Sempre verificar se existe `functionSpec.md`
- Se não existir e o fix for no handler, considerar criar como parte do plano
- Confirmar classificação pública/protegida antes de qualquer instrução de deploy
- Incluir `--project-ref awqtzoefutnfmnbomujt` em qualquer instrução de deploy

### Para OMIE:
- Consultar `.context/modules/omie/NFSE-OPERACAO-OMIE.md` para issues de NFS-e
- Verificar impacto fiscal antes de propor mudanças

---

## Exemplo de Enriquecimento

### Antes (triagem):

```
Relato: "Financeiro reportou que webhook do Cielo não tá batendo,
pagamento PIX fica como pendente mesmo depois do cliente pagar"
Origem: whatsapp
```

### Depois (enriquecido):

```
Módulo: checkout
Context docs: checkout/README.md, checkout/pix/README.md
Arquivos: supabase/functions/cielo-webhook/index.ts,
          supabase/functions/_shared/checkout-status.ts

Diagnóstico: O webhook da Cielo para pagamentos PIX pode estar falhando
por verificação JWT incorreta. A função cielo-webhook DEVE usar
--no-verify-jwt porque a Cielo envia webhooks sem token JWT.
Verificar se o último deploy acidentalmente habilitou verify_jwt.

Plano (SMALL):
1. Verificar config de deploy do cielo-webhook
2. Verificar handler de webhook PIX em index.ts
3. Testar com payload de webhook simulado
4. Re-deploy com --no-verify-jwt se necessário

Critérios:
- Webhook processa payment_status=2 (PIX pago)
- Checkout session atualiza para status "paid"
- Teste E2E de PIX passa
```

---

## Referências

- Template: `tasks/TASK-TEMPLATE.md`
- Convenções: `tasks/README.md`
- Context Map: `CONTEXT-MAP.md`
- Module docs: `.context/modules/{modulo}/README.md`
