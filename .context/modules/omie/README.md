# Module: OMIE

## Overview

O modulo OMIE integra o CRM da AUREA com o ERP OMIE para emissao de NFS-e apos pagamento efetivo. O fluxo principal e acionado por eventos de pagamento (`process-checkout`, `check-payment-status`, `cielo-webhook`), cria/reutiliza cliente, servico e OS na OMIE, faz polling de status e persiste documentos fiscais em `notas_fiscais`, com rastreabilidade em `omie_sync`.

Documentos operacionais do modulo:
- Regras de negocio criticas: `.context/modules/omie/BUSINESS-RULES.md`
- Ordem de leitura por tipo de tarefa: `.context/modules/omie/DOC-READING-ORDER.md`
- Runbook: `.context/modules/omie/NFSE-OPERACAO-OMIE.md`
- Checklist consolidado: `.context/modules/omie/checklist-geral.md`
- Deep dive de criacao e upsert de OS: `.context/modules/omie/CRIACAO-E-UPSERT-OS.md`
- Modulo dedicado de upsert de OS: `.context/modules/omie-upsert-os/README.md`
- Checklist de aderencia codigo-docs (upsert): `.context/modules/omie-upsert-os/CHECKLIST-ADERENCIA-CODIGO-DOCS.md`
- Guia de tuning inicial de polling: `.context/modules/omie/AJUSTE-INICIAL-POLLING-OMIE.md`
- **Operacoes em lote**: `.context/modules/omie/operacao-batch/README.md` — correcao de parcelas, contas receber, backfill de enderecos, sync vendedores, upsert batch
- Contrato de Projeto OMIE (celebridade): `.context/modules/omie/contratos/projetos-omie.md`

Fonte canonica de defaults de polling:
- `OMIE_STATUS_POLL_DELAYS_MS=3000,7000,12000,20000`
- `OMIE_STATUS_POLL_ATTEMPT_TIMEOUT_MS=6000`

## Scope

### Directories

| Path | Description |
|------|-------------|
| `supabase/functions/omie-orchestrator/` | Orquestracao fiscal ponta a ponta (cliente -> servico -> OS -> polling -> documentos). |
| `supabase/functions/omie-create-client/` | Upsert de cliente OMIE com tratamento de duplicidade. |
| `supabase/functions/omie-create-service/` | Cadastro de servico OMIE com sequencia e validacoes. |
| `supabase/functions/omie-upsert-service/` | Upsert manual de servico OMIE (atualiza `impostos` e cabecalho via `omie_sync`). |
| `supabase/functions/omie-create-os/` | Criacao/alteracao de OS OMIE com payload fiscal e guardas de data. |
| `supabase/functions/omie-preview-upsert-os/` | Preview read-only de upsert (documentacao e ownership principal no modulo `omie-upsert-os`). |
| `supabase/functions/omie-upsert-os/` | Upsert corretivo de OS (documentacao e ownership principal no modulo `omie-upsert-os`). |
| `supabase/functions/omie-upsert-os-batch/` | Upsert em massa de OS por run com processamento em blocos e retry de falhas. |
| `supabase/functions/omie-nfse-retry-worker/` | Reprocessamento em lote de `awaiting_nfse` com `force=true`. |
| `supabase/functions/omie-push-vendedores/` | Push diario de vendedores (`DB -> OMIE`) com idempotencia por `omie_cod_int`. |
| `supabase/functions/omie-sync-vendedores/` | Sync diario de vendedores OMIE (`OMIE -> DB`) com inativacao segura. |
| `supabase/functions/get-omie-nfse-config/` | Leitura da configuracao fiscal ativa. |
| `supabase/functions/update-omie-nfse-config/` | Atualizacao parcial da configuracao fiscal ativa. |
| `supabase/functions/_shared/pipeline/` | Trigger compartilhado `triggerNfeEmission`. |
| `supabase/functions/_shared/omie/parcelas-builder.ts` | Builder canônico de parcelas OMIE espelhando checkout_sessions pagas (método, valor, vencimento). |
| `supabase/functions/omie-backfill-client-address/` | Backfill unitário de endereço de cliente OMIE (`dry_run`/`execute`). |
| `supabase/functions/omie-backfill-client-address-batch/` | Orquestração de backfill em massa com seleção de JWT interno validada. |

> **Nota:** O backend Express OMIE (`apps/omie/`), as páginas de administração do Dashboard (`OmieNfseConfig`, `OmieUpsertOs`, `Overview`, `Clientes`) e os componentes de ação manual (`StepDetail`) existem no **monorepo principal AUREA** e não neste repositório standalone.

### External Services

| Service | Purpose |
|---------|---------|
| OMIE API (`app.omie.com.br/api/v1`) | Cliente, servico, OS, status e documentos NFS-e. |
| Supabase | Persistencia (`omie_sync`, `notas_fiscais`, `omie_nfse_config`) e execucao Edge. |
| Cielo/Braspag | Origem dos eventos de pagamento que disparam o fluxo fiscal. |

## Key Components

| Component | Path | Responsibility |
|-----------|------|----------------|
| Orchestrator | `supabase/functions/omie-orchestrator/index.ts` | Fluxo principal OMIE + polling + persistencia final. |
| Create Client | `supabase/functions/omie-create-client/index.ts` | Upsert de cliente OMIE com fallback de duplicidade. |
| Create Service | `supabase/functions/omie-create-service/index.ts` | Cadastro de servico com sequencia (`next_service_sequence`). |
| Upsert Service | `supabase/functions/omie-upsert-service/index.ts` | Upsert corretivo de servico existente, com refresh de `impostos` pela config ativa. |
| Create/Update OS | `supabase/functions/omie-create-os/index.ts` | `IncluirOS`/`AlterarOS`, fiscal payload, `cRetemISS` e mapeamento pagamento. |
| Preview Upsert OS | `supabase/functions/omie-preview-upsert-os/index.ts` | Gera payload canonico read-only sem side effects na OMIE. |
| Upsert OS | `supabase/functions/omie-upsert-os/index.ts` | Correcao de OS existente/inexistente com payload canonico do banco. |
| Upsert OS Batch | `supabase/functions/omie-upsert-os-batch/index.ts` | Orquestra runs de upsert em massa com status por item e retry. |
| Retry Worker | `supabase/functions/omie-nfse-retry-worker/index.ts` | Retry automatico em lote para `awaiting_nfse`. |
| Seller Push | `supabase/functions/omie-push-vendedores/index.ts` | Garante presenca de vendedores locais na OMIE com nome/e-mail. |
| Seller Sync | `supabase/functions/omie-sync-vendedores/index.ts` | Concilia vendedores OMIE com `public.vendedores`. |
| Backfill Address | `supabase/functions/omie-backfill-client-address/index.ts` | Backfill unitário de endereço com classificação `ready`/`manual_required`. |
| Backfill Address Batch | `supabase/functions/omie-backfill-client-address-batch/index.ts` | Orquestra runs de backfill em massa com seleção de JWT interno validada. |
| Trigger Helper | `supabase/functions/_shared/pipeline/trigger-nfe.ts` | Disparo fire-and-forget do `omie-orchestrator`. |
| Parcelas Builder | `supabase/functions/_shared/omie/parcelas-builder.ts` | Constroi array `Parcelas` OMIE a partir de `checkout_sessions` pagas (split, boleto parcelado, etc.). |

## Data Flow

```text
Pagamento confirmado (process-checkout / check-payment-status / cielo-webhook)
  -> shouldTriggerOmieEmission()
    -> single payment: trigger
    -> split com sessoes_pagas >= 1: trigger
    -> fallback defensivo em split (lookup/contador): trigger
  -> triggerNfeEmission(compra_id) [fire-and-forget]
    -> omie-orchestrator
      -> omie-create-client
      -> omie-create-service
      -> omie-create-os
      -> upsert notas_fiscais (Processing + emissor=omie + omie_os_id)
      -> polling StatusOS
         -> 004: ObterNFSe -> Issued + documentos
         -> 003: Error + erro_mensagem
         -> outros: awaiting_nfse + omie_sync pending
```

Fluxo de recuperacao:
- Manual: dashboard chama `omie-orchestrator` com `force=true`.
- Automatico: `omie-nfse-retry-worker` seleciona `awaiting_nfse` e chama `force=true` por lote.
- Backfill on-demand: `omie-orchestrator` aceita `backfill_payload_only=true` para reconstruir e persistir `omie_cliente_payload`, `omie_servico_payload` e `omie_os_payload` sem chamar `omie-create-*` nem executar polling `StatusOS`.

## Integration Points

| System | Direction | Protocol | Notes |
|--------|-----------|----------|-------|
| `process-checkout` | inbound | internal | Trigger pos-pagamento. |
| `check-payment-status` | inbound | internal | Trigger por polling de pagamento. |
| `cielo-webhook` | inbound | internal | Trigger por webhook Cielo. |
| OMIE (`UpsertCliente`) | outbound | REST | Sincronizacao de cliente. |
| OMIE (`IncluirCadastroServico`) | outbound | REST | Cadastro de servico. |
| OMIE (`UpsertCadastroServico`) | outbound | REST | Atualizacao manual de servico existente via Stepper OMIE. |
| OMIE (`IncluirOS`/`AlterarOS`) | outbound | REST | Criacao/ajuste da OS fiscal. |
| OMIE (`StatusOS`) | outbound | REST | Polling de emissao. |
| OMIE (`ObterNFSe`) | outbound | REST | Documentos e dados da NFS-e. |
| OMIE (`IncluirVendedor`/`AlterarVendedor`) | outbound | REST | Push diario de vendedores locais para OMIE. |
| OMIE (`ListarVendedores`) | outbound | REST | Reconciliacao diaria de vendedores OMIE para banco. |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | URL Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes* | Chave principal de autorizacao interna. |
| `CRM_SUPABASE_SERVICE_ROLE_KEY` | No | Chave alternativa interna. |
| `CRM_SUPABASE_SECRET_KEY` | No | Chave alternativa interna. |
| `OMIE_APP_KEY` | Yes | Credencial OMIE. |
| `OMIE_APP_SECRET` | Yes | Credencial OMIE. |
| `OMIE_BASE_URL` | No | Base OMIE (`https://app.omie.com.br/api/v1`). |
| `OMIE_STATUS_POLL_DELAYS_MS` | No | Default: `3000,7000,12000,20000`. |
| `OMIE_STATUS_POLL_ATTEMPT_TIMEOUT_MS` | No | Default: `6000`. |
| `OMIE_AUTO_RETRY_ENABLED` | No | Habilita worker automatico (default `false`). |
| `OMIE_RETRY_BATCH_SIZE` | No | Lote maximo (default `20`). |
| `OMIE_RETRY_MAX_AGE_HOURS` | No | Janela de idade (default `24`). |
| `OMIE_RETRY_MIN_INTERVAL_MINUTES` | No | Cooldown (default `15`). |
| `OMIE_RETRY_MAX_ATTEMPTS` | No | Limite de tentativas (default `25`). |
| `OMIE_VENDEDORES_API_URL` | No | Endpoint de vendedores OMIE (`/geral/vendedores/`). |
| `OMIE_USUARIOS_API_URL` | No | Endpoint de usuarios OMIE (`/crm/usuarios/`). |
| `OMIE_SYNC_VENDEDORES_PAGE_SIZE` | No | Tamanho de pagina (default `100`). |
| `OMIE_SYNC_VENDEDORES_TIMEOUT_MS` | No | Timeout por chamada (default `10000`). |
| `OMIE_IBGE_FALLBACK_ENABLED` | No | Habilita fallback externo para resolver IBGE quando lookup local falhar (default `true`). |
| `OMIE_IBGE_API_BASE_URL` | No | Base da API externa de municipios IBGE (default `https://brasilapi.com.br/api/ibge/municipios/v1`). |
| `OMIE_IBGE_API_TIMEOUT_MS` | No | Timeout em ms para consulta externa de municipios (default `4000`). |

## Error Handling

- Erros de validacao retornam codigos estruturados.
- `omie-create-*` trata duplicidades OMIE com fallback idempotente quando possivel.
- `omie-orchestrator` persiste status intermediarios/finais em `omie_sync`.
- `force=true` reprocessa compras ja sincronizadas/pendentes, mas pode reutilizar OS existente sem recriar payload historico inconsistente.
- `backfill_payload_only=true` evita side effects externos e retorna `status=payload_backfilled` para uso operacional no dashboard.

## Testing

| Type | Location | Command |
|------|----------|---------|
| Unit | `supabase/functions/_shared/omie/` | `deno test supabase/functions/_shared/omie/ --allow-env` |
| Operacional | Runbook/checklist | Execucao controlada por compra real |

> **Nota:** Os testes unitários e de integração do backend Express OMIE (`apps/omie/tests/`) existem no **monorepo principal AUREA**.

## Conventions

- Gatilho fiscal e por pagamento efetivo, nao por `vendaaprovada`.
- Em split, primeira sessao paga habilita trigger; em cenarios de fallback defensivo, trigger tambem pode ocorrer para nao perder faturamento.
- Idempotencia por compra e obrigatoria (`omie_sync.compra_id` unico).
- O `omie-upsert-os` usa lease lock com TTL persistido em `omie_sync` para evitar falso bloqueio por conexao poolada; `LOCK_NOT_ACQUIRED` representa lease ativo valido.
- A configuracao fiscal ativa em `omie_nfse_config` permite ajuste operacional de aliquotas e retencoes (ISS, IR, INSS, PIS, COFINS, CSLL) via dashboard.
- O Stepper OMIE no dashboard separa a acao manual em dois botoes: `Upsert Servico` (edge `omie-upsert-service`) e `Upsert OS` (edge `omie-upsert-os`).
- Envio de vendedor na OS e condicional a mapeamento valido em `public.vendedores.omie_usuario_codigo`; ausencias geram telemetria `OMIE_VENDEDOR` para diagnostico.
- `cCidPrestServ` na OS é resolvido via `resolveMunicipioIbge` (`_shared/omie/municipio-ibge.ts`) usando `compra.regiaocomprada` + `cliente.estado` como entrada. Se a resolução falhar (cidade não encontrada no lookup local nem na BrasilAPI), o valor de fallback é `compra.regiaocomprada` diretamente (territorio comercial), com log `[OMIE_CIDADE_RESOLVE_FAIL]`. Formato retornado quando bem-sucedido: `"Cidade (UF)"`, ex: `"Macapá (AP)"`. As env vars `OMIE_IBGE_*` controlam o fallback externo.
- No cadastro de servico (`IncluirCadastroServico`), o payload inclui bloco `impostos` com aliquotas e retencoes (ISS, IR, INSS, PIS, COFINS, CSLL) vindas da config ativa.
- Funções batch que chamam funções protegidas (`verify_jwt=true`) internamente devem selecionar um token JWT válido (formato `header.payload.signature`). A prioridade é: bearer da request original → `CRM_SUPABASE_SECRET_KEY` → `SUPABASE_SERVICE_ROLE_KEY` → `CRM_SUPABASE_SERVICE_ROLE_KEY`. Keys raw (não-JWT) são rejeitadas pelo gateway.
- Regra canônica monetaria no fluxo OMIE: trafego interno em centavos (inteiro) e conversao para reais apenas na borda de integracao (`omie-create-service` ao preencher `cabecalho.nPrecoUnit`).
- O placeholder `{{pagamentos}}` no template de descricao do servico e montado por `buildPagamentosLabel` com base em `checkout_sessions` pagas. Regra de exibicao por metodo: **PIX e cartao (independente de parcelas) sempre aparecem sem indicador de parcelas**; apenas **boleto parcelado exibe `(Nx)`**. Exemplos: metodo unico `PIX`, split PIX + Cartao `Split - 1: PIX | 2: Cartao de Credito`, split PIX + Boleto 3x `Split - 1: PIX | 2: Boleto (3x)`. Fallback para `forma_pagamento` legado quando sessoes indisponiveis.
- `dDtPrevisao` e calculado como **data de pagamento confirmado + 3 dias uteis** (`calcPrevisaoFaturamento` em `_shared/omie/date-utils.ts`). Origem: `completed_at` > `updated_at` > `data_compra`. Sem `max(today)` para nao deslocar previsao em reprocessos.
- **Parcelas espelhadas do checkout**: `buildParcelasFromSessions` (`_shared/omie/parcelas-builder.ts`) constroi as parcelas da OS a partir das `checkout_sessions` pagas. Regra canonica de expansao: **PIX, cartao (a vista ou parcelado) e boleto 1x geram sempre 1 linha de parcela** (recebimento a vista); apenas **boleto parcelado (`parcelas > 1`) expande em N linhas** com espaçamento de 30 dias. Usa `cCodParc='999'` com array `Parcelas` explícito. Fallback para lógica legada quando não há sessões pagas.
- **InformacoesAdicionais.cNumContrato**: preenchido com o numero da proposta (`imagemProposta.id`) via `resolveNumeroProposta`, propagado pelo payload canonico (`cNumContrato`) e materializado em `omie-create-os`. Representa o "Numero do Contrato de Venda" na tela da OMIE.
- **InformacoesAdicionais.nCodProj**: preenchido via fluxo ensure de projeto por celebridade (`compras.celebridade`) usando mapeamento local em `public.celebridade_omie_projeto` + fallback OMIE (`ConsultarProjeto` -> `ListarProjetos` -> `IncluirProjeto`). Em `omie-preview-upsert-os`, politica e read-only: sem escrita externa quando mapeamento ainda nao existe.
- **Fiscal-only pos-pagamento**: o fluxo OMIE nunca solicita geracao/envio de documentos financeiros (PIX, boleto, link). O pagamento e tratado externamente pela Cielo; a OMIE apenas registra o evento fiscal. Todas as flags de envio (`cEnvPix`, `cEnvBoleto`, `cEnvLink`) sao fixadas em `'N'` em tres camadas de protecao: (1) regra compartilhada `resolveEnvFlagsByMetodoPagamento` retorna sempre `false`; (2) orquestrador/upsert/preview definem explicitamente `false`; (3) `omie-create-os` aplica hard-stop `'N'` no bloco `Email` do payload final, independente de qualquer input upstream. Motivacao: erro `Conta corrente nao configurada para gerar PIX` causado por inferencia incorreta de `cEnvPix='S'` quando o metodo de pagamento era PIX.
- README e fonte canonica de contexto; operacao diaria fica no runbook/checklist.

## Known Limitations

- Worker automatico depende de env habilitada e scheduler operacional.
- Calibracao final de polling depende de metricas reais.
- Em casos de OS pre-existente inconsistente, `force=true` pode exigir acao operacional adicional.
