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
