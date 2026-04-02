# Plano: Melhoria da Engenharia de Contexto — Modulo OMIE

**Data:** 2026-04-02
**Status:** Concluido
**Motivacao:** Correcoes e novas implementacoes no modulo OMIE falham na primeira tentativa porque o agente de IA (Cursor/Claude Code) nao carrega o contexto certo antes de agir. A documentacao existe mas esta fragmentada, com gaps entre specs e codigo, rules vagas, e registro incompleto no CLAUDE.md.

---

## Diagnostico (resumo)

| Causa raiz | Impacto | Evidencia |
|------------|---------|-----------|
| Rule `omie-docs-and-skills.mdc` referencia 2 de 7+ docs | Agente ignora docs criticos (COMO-USAR-UPSERT-OS, CRIACAO-E-UPSERT-OS, SPEC-ENVIO-BOLETO) | Rule linha 15-18 vs ls `.context/modules/omie/` |
| 6 de 19 Edge Functions OMIE sem functionSpec | Agente inventa comportamento sem spec como referencia | `omie-push-vendedores`, `omie-sync-vendedores`, `omie-upsert-os-batch`, `omie-upsert-service`, `get-omie-nfse-config`, `update-omie-nfse-config` |
| Logica de negocio critica so existe no codigo | Regras como "cartao 2+ parcelas = codigo 999" nao estao documentadas | `omie-create-os/index.ts` vs functionSpec |
| CLAUDE.md lista 9 funcoes OMIE, existem 19 | Funcoes operacionais invisiveis ao agente | CLAUDE.md linha 269 vs `ls supabase/functions/omie-*` |
| CONTEXT-MAP.md nao lista docs condicionais | Agente nao sabe qual doc ler para cada tipo de tarefa | CONTEXT-MAP.md linhas 11-15 |
| Specs desatualizadas (backfill mode, lease lock TTL, env fallback) | Agente gera codigo baseado em spec que diverge do codigo real | Auditoria spec vs codigo |
| `apps/omie/AGENTS.md` referencia `prd.md` e `fluxo.md` sem clareza de quando usar | Fontes de verdade ambiguas | AGENTS.md linhas 14-18 |

---

## Fase 1 — Ordem de Leitura e Roteamento Condicional (estimativa: 1-2h)

### Passo 1.1: Criar `.context/modules/omie/DOC-READING-ORDER.md`

**Arquivo:** `.context/modules/omie/DOC-READING-ORDER.md` (novo)
**Conteudo:**

```markdown
# OMIE — Ordem de Leitura por Tipo de Tarefa

Leia SEMPRE o README.md primeiro. Depois, conforme o tipo de tarefa:

## Criacao ou alteracao de OS (payload fiscal)
1. `.context/modules/omie/README.md` (visao geral)
2. `.context/modules/omie/CRIACAO-E-UPSERT-OS.md` (spec detalhada do payload)
3. `.context/modules/omie/COMO-USAR-UPSERT-OS.md` (workflow de uso)
4. `supabase/functions/omie-create-os/functionSpec.md` (spec da funcao)
5. `.context/modules/omie/BUSINESS-RULES.md` (regras criticas)

## Troubleshooting NFS-e (awaiting_nfse, falha, retry)
1. `.context/modules/omie/README.md`
2. `.context/modules/omie/NFSE-OPERACAO-OMIE.md` (runbook operacional)
3. `.context/modules/omie/checklist-geral.md` (status de validacoes)
4. `supabase/functions/omie-orchestrator/functionSpec.md`
5. `supabase/functions/omie-nfse-retry-worker/functionSpec.md`

## Upsert de OS (correcao de OS existente)
1. `.context/modules/omie/README.md`
2. `.context/modules/omie/omie-upsert-os/README.md` (modulo dedicado)
3. `.context/modules/omie/CRIACAO-E-UPSERT-OS.md`
4. `.context/modules/omie-upsert-os/CHECKLIST-ADERENCIA-CODIGO-DOCS.md`
5. `supabase/functions/omie-upsert-os/functionSpec.md`

## Operacoes em lote (batch fix, backfill, sync)
1. `.context/modules/omie/README.md`
2. `.context/modules/omie/operacao-batch/README.md`
3. functionSpec da funcao especifica (ex: `omie-fix-os-parcelas/functionSpec.md`)

## Boleto na OS (envio, split, flags fiscais)
1. `.context/modules/omie/README.md`
2. `.context/modules/omie/SPEC-ENVIO-BOLETO-OMIE.md`
3. `.context/modules/omie/BUSINESS-RULES.md`

## Sync de vendedores
1. `.context/modules/omie/README.md`
2. `.context/modules/omie/operacao-batch/README.md`
3. functionSpec (quando existir)

## Configuracao fiscal (aliquotas, retencoes)
1. `.context/modules/omie/README.md`
2. functionSpec de `get-omie-nfse-config` / `update-omie-nfse-config` (quando existir)

## Polling e status (calibracao, timeout)
1. `.context/modules/omie/README.md` (secao defaults)
2. `.context/modules/omie/AJUSTE-INICIAL-POLLING-OMIE.md`
3. `supabase/functions/omie-orchestrator/functionSpec.md`

## Cliente OMIE (upsert, backfill endereco)
1. `.context/modules/omie/README.md`
2. `supabase/functions/omie-create-client/functionSpec.md`
3. `.context/modules/omie/operacao-batch/README.md` (se backfill)
```

### Passo 1.2: Atualizar `CONTEXT-MAP.md` secao OMIE

**Arquivo:** `CONTEXT-MAP.md`
**Acao:** Substituir a secao `## OMIE (ERP)` atual (linhas 11-15) por:

```markdown
## OMIE (ERP / Emissao Fiscal)
1. `.context/modules/omie/DOC-READING-ORDER.md` — **LER PRIMEIRO**: roteamento condicional por tipo de tarefa
2. `.context/modules/omie/README.md` — visao geral, scope, env vars
3. `.context/modules/omie/BUSINESS-RULES.md` — regras de negocio criticas (nao documentadas em specs)
4. `supabase/functions/<funcao>/functionSpec.md` — spec da funcao especifica
5. `.cursor/skills/omie-integracao/SKILL.md` — payload/API/transformacao
6. `.cursor/skills/omie-nfse-operacao/SKILL.md` — operacao/diagnostico NFS-e
7. `apps/omie/AGENTS.md` — contexto do backend Express
```

---

## Fase 2 — Regras de Negocio Criticas (estimativa: 2-3h)

### Passo 2.1: Criar `.context/modules/omie/BUSINESS-RULES.md`

**Arquivo:** `.context/modules/omie/BUSINESS-RULES.md` (novo)
**Proposito:** Consolidar toda logica de negocio que hoje so existe no codigo e causa falhas quando o agente nao a conhece.

**Conteudo a documentar (extrair do codigo):**

```markdown
# OMIE — Regras de Negocio Criticas

Regras que existem no codigo e NAO estao (ou estao parcialmente) documentadas em functionSpecs.
Consulte este arquivo antes de qualquer implementacao ou correcao no modulo OMIE.

## 1. Cidade da Prestacao de Servico

**Regra:** A cidade na OS (`cCidPrestServ`) SEMPRE vem de `compra.regiaocomprada` (territorio comercial), NAO do endereco do cliente.

**Resolucao IBGE (cascade de 3 camadas):**
1. Lookup local em `sgc_cidades` (ilike)
2. Lookup normalizado (sem acentos)
3. Fallback externo: BrasilAPI (`OMIE_IBGE_FALLBACK_ENABLED`, timeout 4000ms)
4. Fallback final: usa `compra.regiaocomprada` diretamente (com log `[OMIE_CIDADE_RESOLVE_FAIL]`)

**Impacto:** Se `regiaocomprada` estiver nulo, toda a resolucao de municipio falha.

**Fonte:** `_shared/omie/municipio-ibge.ts`, `omie-create-os/index.ts`

## 2. Metodo de Pagamento → Codigo Parcela OMIE

**Mapeamento:**
- PIX, Cartao de Credito/Debito (1 parcela) → `'000'` (a vista)
- Boleto, Boleto Bancario → `'001'`
- **Cartao de Credito com 2+ parcelas → `'999'` (FORCADO)** — consulta posterior

**Resolucao (cascade):**
1. Normaliza `checkoutMetodoPagamento` (NFD, sem acentos, lowercase)
2. Busca exata no PAYMENT_METHOD_MAP
3. Se nao achar: substring matching contra todas as chaves
4. Se ainda nao achar: resolve de `formaPagamento`
5. Fallback final: `'000'`

**Precedencia:** `checkoutMetodoPagamento` > `formaPagamento`

**Fonte:** `omie-create-os/index.ts`

## 3. Flags Fiscais Hard-Stop (cEnvBoleto, cEnvPix, cEnvLink)

**Regra:** SEMPRE forcados para `'N'`, independente do input. 3 camadas de protecao:
1. Shared rule retorna `false`
2. Orchestrator/upsert seta explicitamente `false`
3. Payload final: `cEnvBoleto='N'`, `cEnvPix='N'`, `cEnvLink='N'`

**Motivo:** Evita erro "Conta corrente nao configurada para PIX" da OMIE.

**Nota:** Validacao de input para esses campos e dead code (forcados antes de usar).

**Fonte:** `omie-create-os/index.ts`, `omie-upsert-os/index.ts`, `omie-orchestrator/index.ts`

## 4. Parcelas (Installments)

**Regra de expansao:**
- PIX + Cartao (qualquer parcela) + Boleto 1x → 1 linha (a vista)
- Boleto parcelado N>1 → N linhas com espacamento de 30 dias
- Parcelas so enviadas quando `cCodParc = '999'`

**Precedencia:** Se `parcelas_explicitas` fornecido, usa essas. Senao, computa de `checkout_sessions`.

**Fonte:** `_shared/omie/parcelas-builder.ts`

## 5. Previsao de Faturamento

**Regra:** `completed_at` + 3 dias uteis (sem override de max-today).

**Fonte:** `_shared/omie/date-utils.ts`

## 6. Monetario

**Regra:** Todo o fluxo interno opera em centavos (inteiros). Conversao para reais APENAS na borda com OMIE.

**Fonte:** `_shared/omie/money.ts`

## 7. Environment Variable Fallback Chain

**Ordem de precedencia para auth de Edge Functions:**
1. `SUPABASE_SERVICE_ROLE_KEY`
2. `CRM_SUPABASE_SERVICE_ROLE_KEY`
3. `CRM_SUPABASE_SECRET_KEY`

**Fonte:** `omie-orchestrator/index.ts` linhas ~379-380

## 8. Lease Lock (Upsert OS)

**Regra:** `omie_acquire_upsert_lease` com TTL de 300 segundos (5 minutos).
- Lock adquirido via RPC
- Se lock ja existe: retorna 409 `LOCK_NOT_ACQUIRED` (NAO e erro, e lease ativa valida)
- `finally` block libera lock (previne deadlock)

**Fonte:** `omie-upsert-os/index.ts`

## 9. Polling de Status OS

**Exit conditions:** Loop sai em `cStatusLote = '003'` (erro) OU `'004'` (sucesso).
- Se `'004'`: chama `ObterNFSe` → persiste em `notas_fiscais`
- Se `'003'`: registra erro
- Se outro: status fica `awaiting_nfse` para retry posterior

**Delays:** `3000, 7000, 12000, 20000` ms (configuravel via `OMIE_STATUS_POLL_DELAYS_MS`)
**Timeout por tentativa:** 6000ms (configuravel via `OMIE_STATUS_POLL_ATTEMPT_TIMEOUT_MS`)

**Fonte:** `omie-orchestrator/index.ts`

## 10. Modo Backfill (payload_only)

**Regra:** `backfill_payload_only: true` em orchestrator e upsert-os retorna payload sem:
- Escrever em `omie_sync`
- Escrever em `notas_fiscais`
- Chamar APIs OMIE

**Uso:** DEBUG/migracao apenas. Nunca em producao automatizada.

**Fonte:** `omie-orchestrator/index.ts`, `omie-upsert-os/index.ts`

## 11. Template de Descricao do Servico

**Variaveis disponiveis:**
- `{{numero_proposta}}` → via `resolveNumeroProposta()`
- `{{celebridade}}`, `{{cliente_nome}}`, `{{uf}}`, `{{vigencia}}`
- `{{cidade}}` → de `compra.regiaocomprada` (NAO do endereco do cliente)
- `{{segmento}}`, `{{subsegmento}}`, `{{negocio}}`
- `{{pagamentos}}`

**Default template (pode ser override via `omie_nfse_config`):**
```
Proposta n. {{numero_proposta}}
Direito de uso: {{celebridade}} - {{cliente_nome}} - {{cidade}} - {{uf}} - {{vigencia}}
Segmento: {{segmento}} - Subsegmento: {{subsegmento}} - Negocio: {{negocio}}
Pagamento(s): {{pagamentos}}
```

**Fonte:** `omie-upsert-os/index.ts`, `_shared/omie/canonical-os-payload.ts`

## 12. Trigger Fiscal em Split

**Regras:**
- Pagamento unico: trigger no payment confirmed
- Split: trigger quando `sessoes_pagas >= 1` (primeira sessao paga)
- Fallback defensivo: se lookup de split falhar, dispara mesmo assim (evitar perda de receita)
- `vendaaprovada` NAO e gatilho fiscal

**Fonte:** `_shared/split.ts`
```

### Passo 2.2: Referenciar BUSINESS-RULES.md nos docs existentes

**Arquivos a editar:**

1. **`.context/modules/omie/README.md`** — Adicionar na secao de documentos operacionais:
   ```
   - Regras de negocio criticas: `.context/modules/omie/BUSINESS-RULES.md`
   ```

2. **`CONTEXT-MAP.md`** — Ja coberto no Passo 1.2.

3. **`.cursor/rules/omie-docs-and-skills.mdc`** — Adicionar referencia (coberto na Fase 3).

---

## Fase 3 — Fortalecer Rule OMIE (estimativa: 1-2h)

### Passo 3.1: Reescrever `.cursor/rules/omie-docs-and-skills.mdc`

**Arquivo:** `.cursor/rules/omie-docs-and-skills.mdc`
**Acao:** Substituir conteudo inteiro (preservar frontmatter YAML).

**Novo conteudo:**

```markdown
---
description: Obrigar consulta de documentacao e uso de skills em temas OMIE
alwaysApply: false
globs:
  - "apps/omie/**"
  - "supabase/functions/omie-*/**"
  - "supabase/functions/_shared/omie/**"
  - "supabase/functions/_shared/split.ts"
  - "supabase/functions/_shared/pipeline/trigger-nfe.ts"
  - ".context/modules/omie/**"
  - ".context/modules/omie/omie-upsert-os/**"
---

# Integracao OMIE: documentacao + skills

## Gate obrigatorio ANTES de agir

1. **Identificar tipo de tarefa** e consultar ordem de leitura:
   - Ler `.context/modules/omie/DOC-READING-ORDER.md` — identifica quais docs sao obrigatorios para o tipo de tarefa
   - Ler `.context/modules/omie/BUSINESS-RULES.md` — regras de negocio criticas que NAO estao em specs

2. **Ler docs na ordem indicada pelo DOC-READING-ORDER:**
   - SEMPRE: `.context/modules/omie/README.md`
   - Condicional: docs especificos do tipo de tarefa (ver DOC-READING-ORDER)
   - functionSpec da funcao alvo: `supabase/functions/<funcao>/functionSpec.md`

3. **Selecionar skill correta:**
   - Payload, API, transformacao, cliente/contato: `.cursor/skills/omie-integracao/SKILL.md`
   - NFS-e, operacao, diagnostico, retry, awaiting_nfse: `.cursor/skills/omie-nfse-operacao/SKILL.md`
   - Upsert de OS: ler AMBAS skills + `.context/modules/omie/omie-upsert-os/README.md`
   - Supabase (query/migration): carregar tambem `.cursor/skills/supabase-cli-vs-mcp/SKILL.md`

4. **Responder com base em evidencia:**
   - Citar documentacao consultada
   - Diferenciar: regra de negocio AUREA vs contrato API OMIE vs estado real (banco/logs)
   - Para API OMIE externa: usar Context7 MCP ou `https://developer.omie.com.br/service-list/`

## Funcoes Edge OMIE (registro completo)

**Fluxo automatico:** `omie-orchestrator`, `omie-create-client`, `omie-create-service`, `omie-create-os`
**Correcao:** `omie-upsert-os`, `omie-preview-upsert-os`, `omie-upsert-service`
**Batch:** `omie-upsert-os-batch`, `omie-fix-os-parcelas`, `omie-fix-os-parcelas-batch`, `omie-fix-contas-receber`, `omie-fix-contas-receber-batch`, `omie-backfill-client-address`, `omie-backfill-client-address-batch`
**Retry:** `omie-nfse-retry-worker`
**Vendedores:** `omie-push-vendedores`, `omie-sync-vendedores`
**Config:** `get-omie-nfse-config`, `update-omie-nfse-config`
```

### Passo 3.2: Adicionar glob para `_shared/omie/`

**Motivo:** A rule atual nao ativa quando o agente edita `_shared/omie/parcelas-builder.ts` ou `_shared/split.ts`.
**Acao:** Ja incluido no frontmatter do Passo 3.1 (globs adicionais: `_shared/omie/**`, `_shared/split.ts`, `_shared/pipeline/trigger-nfe.ts`).

---

## Fase 4 — Atualizar CLAUDE.md (estimativa: 30min)

### Passo 4.1: Corrigir registro de Edge Functions OMIE

**Arquivo:** `CLAUDE.md`
**Secao:** `## Edge Functions Registry` (linha ~269)
**Acao:** Substituir a linha:
```
**OMIE:** `omie-create-client`, `omie-create-os`, `omie-create-service`, `omie-orchestrator`, `omie-upsert-os`, `omie-nfse-retry-worker`, `omie-sync-vendedores`, `get-omie-nfse-config`, `update-omie-nfse-config`
```

Por:
```
**OMIE (fluxo automatico):** `omie-orchestrator`, `omie-create-client`, `omie-create-service`, `omie-create-os`

**OMIE (correcao):** `omie-upsert-os`, `omie-preview-upsert-os`, `omie-upsert-service`

**OMIE (batch):** `omie-upsert-os-batch`, `omie-fix-os-parcelas`, `omie-fix-os-parcelas-batch`, `omie-fix-contas-receber`, `omie-fix-contas-receber-batch`, `omie-backfill-client-address`, `omie-backfill-client-address-batch`

**OMIE (retry):** `omie-nfse-retry-worker`

**OMIE (vendedores):** `omie-push-vendedores`, `omie-sync-vendedores`

**OMIE (config):** `get-omie-nfse-config`, `update-omie-nfse-config`
```

### Passo 4.2: Atualizar secao "OMIE Integration Context"

**Arquivo:** `CLAUDE.md`
**Secao:** `## OMIE Integration Context` (linha ~237)
**Acao:** Substituir:
```
When working on OMIE-related code, consult these docs in order:
1. `.context/modules/omie/README.md` — internal architecture and patterns
2. `.context/modules/omie/NFSE-OPERACAO-OMIE.md` — NFS-e emission specifics
3. Related plans in `plan/`
```

Por:
```
When working on OMIE-related code, consult these docs in order:
1. `.context/modules/omie/DOC-READING-ORDER.md` — identifies which docs to read for each task type
2. `.context/modules/omie/README.md` — internal architecture and patterns
3. `.context/modules/omie/BUSINESS-RULES.md` — critical business logic not in specs
4. `supabase/functions/<function>/functionSpec.md` — spec of the target function
5. Related plans in `plan/`
```

### Passo 4.3: Remover NFe.io depreciado do registro

**Arquivo:** `CLAUDE.md`
**Acao:** Se houver referencia a `nfe-api`, `nfe-webhook`, `nfe-invoice-pdf`, `trigger-nfe-emission` no registro, remover.

**Validacao:**
```bash
grep -n "nfe-api\|nfe-webhook\|nfe-invoice-pdf\|trigger-nfe-emission" CLAUDE.md
```

---

## Fase 5 — Criar functionSpecs Faltantes (estimativa: 3-4h)

### Passo 5.1: Criar specs para funcoes sem documentacao

**6 funcoes sem functionSpec.md:**

| Funcao | Prioridade | Complexidade | Motivo da prioridade |
|--------|-----------|-------------|---------------------|
| `omie-upsert-os-batch` | P0 | Media | Usada frequentemente pelo dashboard; sem spec, agente erra formato batch |
| `omie-push-vendedores` | P0 | Media | Push diario; sem spec, sync pode quebrar silenciosamente |
| `omie-sync-vendedores` | P0 | Media | Pull diario; complemento do push |
| `omie-upsert-service` | P1 | Baixa | Correcao manual; menos frequente |
| `get-omie-nfse-config` | P1 | Baixa | CRUD simples de leitura |
| `update-omie-nfse-config` | P1 | Media | CRUD com validacao de config ativa |

**Formato:** Seguir template SDD (`sdd-function-spec` skill). Cada spec deve conter:
1. Goal
2. Inputs (request body + env vars)
3. Validations
4. Behavior (step-by-step com branches)
5. External Dependencies
6. Error Handling (codigos + mensagens)
7. Observability (logs emitidos)
8. Examples (request/response)

**Metodo de criacao para cada funcao:**
```bash
# 1. Ler o codigo fonte
cat supabase/functions/<funcao>/index.ts

# 2. Extrair: inputs, validacoes, comportamento, erros, logs
# 3. Escrever functionSpec.md no mesmo diretorio

# 4. Validar: spec cobre todos os branches do codigo?
```

### Passo 5.2: Atualizar specs existentes com gaps identificados

**Funcoes com spec que precisam de atualizacao:**

| Funcao | Gap a corrigir |
|--------|---------------|
| `omie-orchestrator` | Documentar: modo `backfill_payload_only`, env var fallback chain, polling exit conditions (003 e 004) |
| `omie-create-os` | Documentar: payment method cascade (substring matching), credit card 2+ parcelas → 999, fiscal flags dead code |
| `omie-upsert-os` | Documentar: lease lock TTL (300s), modo `backfill_payload_only`, 409 LOCK_NOT_ACQUIRED nao e erro |

**Metodo:** Para cada funcao, adicionar secoes faltantes na spec existente sem reescrever o que ja esta correto.

---

## Fase 6 — Limpar e Fortalecer AGENTS.md do app (estimativa: 30min)

### Passo 6.1: Atualizar `apps/omie/AGENTS.md`

**Arquivo:** `apps/omie/AGENTS.md`
**Acoes:**

1. Verificar que `apps/omie/prd.md` e `apps/omie/fluxo.md` estao atualizados. Se estiverem obsoletos:
   - Se conteudo ja migrou para `.context/modules/omie/`, remover referencia
   - Se conteudo e unico, manter referencia mas adicionar nota de escopo

2. Adicionar referencia ao DOC-READING-ORDER:
   ```markdown
   ## Ordem de leitura para IA

   Antes de modificar qualquer codigo neste app, consulte:
   `.context/modules/omie/DOC-READING-ORDER.md`
   ```

3. Adicionar referencia ao BUSINESS-RULES:
   ```markdown
   ## Regras de negocio criticas

   Regras que so existem no codigo e causam falhas quando ignoradas:
   `.context/modules/omie/BUSINESS-RULES.md`
   ```

---

## Fase 7 — Atualizar Skill omie-integracao (estimativa: 1h)

### Passo 7.1: Expandir escopo da skill

**Arquivo:** `.cursor/skills/omie-integracao/SKILL.md`
**Problema:** Skill cobre apenas clientes/contatos (`IncluirContato`). Nao menciona OS, servicos, ou o fluxo fiscal.

**Acoes:**

1. Atualizar `description` no frontmatter:
   ```yaml
   description: Especializa a integracao com a API OMIE (clientes, servicos, OS, payload fiscal), cobrindo transformacao de payload, autenticacao, tratamento de erros e validacao. Use quando o usuario mencionar OMIE, integracao OMIE, payload OMIE, ou qualquer chamada a API OMIE.
   ```

2. Adicionar secao "Fontes obrigatorias":
   ```markdown
   ## Fontes obrigatorias (ler antes de agir)
   1. `.context/modules/omie/DOC-READING-ORDER.md` — identifica docs por tipo de tarefa
   2. `.context/modules/omie/BUSINESS-RULES.md` — regras criticas nao documentadas em specs
   3. `supabase/functions/<funcao>/functionSpec.md` — spec da funcao alvo
   ```

3. Adicionar secao "Tipos de operacao OMIE":
   ```markdown
   ## Tipos de operacao OMIE

   | Operacao | Metodo OMIE | Edge Function | Skill complementar |
   |----------|-------------|---------------|-------------------|
   | Criar/atualizar cliente | IncluirContato/AlterarContato | omie-create-client | — |
   | Cadastrar servico | IncluirCadastroServico | omie-create-service | — |
   | Criar OS | IncluirOS | omie-create-os | — |
   | Alterar OS | AlterarOS | omie-upsert-os | omie-nfse-operacao |
   | Consultar status OS | StatusOS | omie-orchestrator | omie-nfse-operacao |
   | Obter NFS-e | ObterNFSe | omie-orchestrator | omie-nfse-operacao |
   | Sync vendedores | IncluirVendedor/AlterarVendedor/ListarVendedores | omie-push/sync-vendedores | — |
   ```

4. Adicionar templates de payload para OS (alem do existente de contato).

---

## Fase 8 — Vincular Checklist a Tasks (estimativa: 30min)

### Passo 8.1: Criar tasks para itens pendentes do checklist-geral

**Arquivo fonte:** `.context/modules/omie/checklist-geral.md`
**Itens pendentes (`[ ]`) que precisam de task:**

1. Calibracao final dos parametros de polling (checklist linha ~66)
2. Validar 1 ciclo completo de sync vendedores em homologacao e producao (linha ~112)
3. Validacao operacional do retry worker em producao (linha ~40)

**Para cada item, criar:**
```
tasks/TASK-2026-04-02-NNN-slug.md
```

**E adicionar backlink no checklist:**
```markdown
- [ ] Item pendente → [TASK-2026-04-02-NNN](../tasks/TASK-2026-04-02-NNN-slug.md)
```

---

## Fase 9 — Validacao Final (estimativa: 1h)

### Passo 9.1: Verificar integridade de referencias cruzadas

```bash
# Verificar que todos os arquivos referenciados existem
grep -roh '\.\(context\|cursor\)/[^ ]*\.md' .context/modules/omie/ | sort -u | while read f; do
  [ -f "$f" ] || echo "BROKEN: $f"
done

# Verificar que CLAUDE.md nao referencia NFe.io depreciado
grep -n "nfe-api\|nfe-webhook\|nfe-invoice-pdf\|trigger-nfe-emission" CLAUDE.md

# Verificar que todas as funcoes OMIE estao no registro
ls supabase/functions/omie-* -d | while read d; do
  name=$(basename "$d")
  grep -q "$name" CLAUDE.md || echo "MISSING FROM REGISTRY: $name"
done
```

### Passo 9.2: Teste de contexto — simular tarefa OMIE

Abrir arquivo em `supabase/functions/omie-create-os/` no Cursor e verificar:
- [ ] Rule `omie-docs-and-skills.mdc` carregou
- [ ] DOC-READING-ORDER.md esta referenciado na rule
- [ ] BUSINESS-RULES.md esta referenciado na rule
- [ ] Skill correta e indicada (omie-integracao para payload)
- [ ] functionSpec existe e esta atualizado

### Passo 9.3: Contagem de cobertura

```bash
echo "=== Funcoes com functionSpec ==="
total=0; covered=0
for d in supabase/functions/omie-* supabase/functions/get-omie-* supabase/functions/update-omie-*; do
  [ -d "$d" ] || continue
  total=$((total+1))
  [ -f "$d/functionSpec.md" ] && covered=$((covered+1))
done
echo "$covered/$total funcoes com spec"
```

**Meta:** 19/19 funcoes com functionSpec apos Fase 5.

---

## Resumo de Entregaveis

| Fase | Arquivo | Tipo | Impacto |
|------|---------|------|---------|
| 1 | `.context/modules/omie/DOC-READING-ORDER.md` | Novo | Elimina leitura errada de docs |
| 1 | `CONTEXT-MAP.md` (secao OMIE) | Edicao | Roteamento correto para agentes |
| 2 | `.context/modules/omie/BUSINESS-RULES.md` | Novo | Regras criticas acessiveis ao agente |
| 3 | `.cursor/rules/omie-docs-and-skills.mdc` | Reescrita | Gate obrigatorio com roteamento + registro completo |
| 4 | `CLAUDE.md` (registro + secao OMIE) | Edicao | 19 funcoes visiveis + leitura correta |
| 5 | 6x `functionSpec.md` (novas) | Novos | Cobertura 100% de specs |
| 5 | 3x `functionSpec.md` (atualizadas) | Edicao | Specs alinhadas com codigo real |
| 6 | `apps/omie/AGENTS.md` | Edicao | Fontes de verdade claras |
| 7 | `.cursor/skills/omie-integracao/SKILL.md` | Edicao | Skill cobre OS/servico alem de contatos |
| 8 | 3x `tasks/TASK-*.md` | Novos | Itens pendentes rastreaveis |

## Estimativa Total

| Fase | Estimativa | Prioridade |
|------|-----------|------------|
| Fase 1 (Ordem de leitura) | 1-2h | P0 |
| Fase 2 (Business rules) | 2-3h | P0 |
| Fase 3 (Rule OMIE) | 1-2h | P0 |
| Fase 4 (CLAUDE.md) | 30min | P0 |
| Fase 5 (functionSpecs) | 3-4h | P1 |
| Fase 6 (AGENTS.md) | 30min | P1 |
| Fase 7 (Skill) | 1h | P1 |
| Fase 8 (Tasks) | 30min | P2 |
| Fase 9 (Validacao) | 1h | P0 |
| **Total** | **~11-14h** | |

**Recomendacao de execucao:** Fases 1-4 + 9 primeiro (P0, ~5-7h). Depois Fases 5-8 (P1/P2, ~5-6h).
