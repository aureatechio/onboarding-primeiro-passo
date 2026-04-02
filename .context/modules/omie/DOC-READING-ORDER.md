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
4. `.context/modules/omie/omie-upsert-os/CHECKLIST-ADERENCIA-CODIGO-DOCS.md`
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
