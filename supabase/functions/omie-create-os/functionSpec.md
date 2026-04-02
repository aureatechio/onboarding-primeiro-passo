# Function Spec — omie-create-os

## Goal
Criar/atualizar Ordem de Servico no OMIE via `IncluirOS`/`AlterarOS`, normalizando campos de servicos e calculando data de previsao.

## Inputs
- **HTTP method**: POST (OPTIONS para CORS)
- **Path**: `/functions/v1/omie-create-os`
- **Headers**:
  - `Authorization: Bearer <jwt>` (required)
  - `Content-Type: application/json`
- **Body shape**:
  - aceita `os` ou `record`
  - campos obrigatorios: `compra_id` (ou `id`), `cliente_omie_id` (ou `nCodCli`), `email` (ou `cliente_email`), `cidade_prestacao_servico`, `cCodParc` (ou `forma_pagamento`), `servicos_prestados` (array)
  - **Nota:** `cidade_prestacao_servico` (`cCidPrestServ`) recebe o território comercial da venda (`compra.regiaocomprada`), não a cidade fiscal do CNPJ. A resolução IBGE não é mais utilizada para este campo.
- campos opcionais:
  - `nf_numero` (ou `nota_fiscal_numero`) para incluir referencia da NF na OS
  - `os_operation`: `incluir` (default) ou `alterar`
  - `omie_os_id`/`nCodOS` obrigatório para `os_operation=alterar`
  - `parcelas_explicitas`: array de parcelas pre-calculadas pelo caller (builder canonico). Quando presente, substitui a logica interna de montagem de parcelas e forca `cCodParc='999'` com `nQtdeParc=parcelas_explicitas.length`. Cada item: `{ nParcela, nValor, nPercentual, dDtVenc, meio_pagamento?, tipo_documento?, nsu? }`
  - `caracteristica_tipo_venda` (ou aliases `tipo_venda_label`/`tipo_venda`): classificacao comercial da compra (`Venda`, `Renovacao`, `Upsell`)
  - `data_competencia` (ou `dDataRps`): data de competência da OS no formato `dd/MM/yyyy`. Quando informada, é enviada como `InformacoesAdicionais.dDataRps` no payload OMIE. Corresponde ao campo "Data de competência" da aba "Informações adicionais" na UI do OMIE.

## Validations
- JSON valido.
- Campos obrigatorios presentes.
- `email` valido quando informado.
- Fiscal-only: `cEnvBoleto`, `cEnvPix` e `cEnvLink` sao forcados em `'N'` (hard-stop).
- `servicos_prestados` deve ser array nao vazio.
- Cada servico deve ter `nCodServico` valido (ou `nCodServ`/`cCodServ`).

## Behavior
- Extrai payload de `os`/`record`.
- Normaliza data:
  - baseDate = `dDtPrevisao` ou `data_venda` (data de pagamento confirmado) ou `now`.
  - `dDtPrevisao` = baseDate + 3 dias uteis (sem `max(today)` — reprocesso nao desloca).
- Normaliza `ServicosPrestados`:
  - `nCodServico` <- `nCodServico`/`nCodServ`/`cCodServ`
  - `cDescServ` <- `cDescServ`/`cDescricao`
  - `nValUnit` <- `nValUnit`/`nValorUnit`
  - `cRetemISS` aceito em `record.cRetemISS` ou `record.impostos.cRetemISS` (retrocompat), e normalizado para `ServicosPrestados[].cRetemISS`
  - `impostos` enviado apenas com campos aceitos na inclusao (ex.: `nAliqISS`)
- Monta payload OMIE com:
  - `call: IncluirOS` quando `os_operation=incluir`;
  - `call: AlterarOS` quando `os_operation=alterar`.
- Para alteração, injeta `Cabecalho.nCodOS` e normaliza `ServicosPrestados[].nSeqItem/cAcaoItem`.
- Quando `vendedor_omie_codigo` é informado, envia `Cabecalho.nCodVend`.
- Quando `data_competencia` (ou `dDataRps`) estiver presente, inclui `InformacoesAdicionais.dDataRps` com o valor informado (formato `dd/MM/yyyy`). Campo opcional; quando ausente, o OMIE define a data de competência automaticamente.
- Se `caracteristica_tipo_venda` estiver presente, normaliza para label operacional e acrescenta em `InformacoesAdicionais.cDadosAdicNF`:
  - `Venda` -> `Tipo de venda: Venda nova`
  - `Renovacao` -> `Tipo de venda: Renovação`
  - `Upsell` -> `Tipo de venda: Upsell`
- Chama OMIE via `OMIE_OS_API_URL` (ou `${OMIE_BASE_URL}/servicos/os/`).
- Timeout de 10s para chamada externa.
- Em retorno de duplicidade (`cCodIntOS` ja cadastrado), aplica idempotencia:
  - tenta extrair `nCodOS` da mensagem de erro;
  - tenta extrair `nCodOS` de campos no body de erro;
  - fallback com consulta OMIE por `cCodIntOS` (`ConsultarOS`/`PesquisarOS`/`ListarOS`);
  - se resolver `nCodOS`, retorna `status: ok` com `duplicate: true`.

## External Dependencies
- **OMIE endpoint**: `${OMIE_OS_API_URL}` (default `https://app.omie.com.br/api/v1/servicos/os/`)
- **Environment variables**:
  - `OMIE_APP_KEY`
  - `OMIE_APP_SECRET`
  - `OMIE_BASE_URL` (opcional)
  - `OMIE_OS_API_URL` (opcional)

## Error Handling
- **400** `INVALID_JSON` — JSON invalido.
- **400** `VALIDATION_ERROR` — campos obrigatorios ausentes.
- **400** `INVALID_EMAIL` — email invalido.
- **400** `INVALID_EMAIL_SETTINGS` — `cEnvBoleto` e `cEnvPix` juntos (dead path: ambas forcadas em `'N'`).
- **400** `SERVICOS_PRESTADOS_REQUIRED` — array vazio.
- **400** `INVALID_SERVICO` — sem `nCodServico` valido.
- **401** `OMIE_CREDENTIALS_MISSING` — credenciais ausentes.
- **409** `OMIE_DUPLICATE` — duplicidade sem OS recuperavel.
- **502** `OMIE_ERROR` — erro retornado pela OMIE.
- **503** `OMIE_REQUEST_FAILED` — falha na requisicao.
- **504** `OMIE_TIMEOUT` — timeout na chamada OMIE.

## Regras de Negocio Criticas

### Resolucao de Metodo de Pagamento (cCodParc)
Cascade de resolucao para o codigo de parcela OMIE:
1. Normaliza `checkoutMetodoPagamento` (NFD, remove acentos, lowercase)
2. Busca exata em `PAYMENT_METHOD_MAP`:
   - `pix` → `'000'` (a vista)
   - `cartao de credito` (1 parcela) → `'000'`
   - `cartao de debito` → `'000'`
   - `boleto`, `boleto bancario` → `'001'`
   - **Cartao de credito com 2+ parcelas → `'999'` (FORCADO)**
3. Se nao achar: substring matching contra todas as chaves do mapa
4. Se ainda nao achar: resolve de `formaPagamento`
5. Fallback final: `'000'`

**Precedencia:** `checkoutMetodoPagamento` > `formaPagamento`

### Flags Fiscais (Hard-Stop)
`cEnvBoleto`, `cEnvPix`, `cEnvLink` sao SEMPRE forcados para `'N'` em 3 camadas:
1. Shared rule retorna `false`
2. Orchestrator/upsert seta explicitamente `false`
3. Payload final: `cEnvBoleto='N'`, `cEnvPix='N'`, `cEnvLink='N'`

**Nota:** Validacao de input para esses campos e dead code — valores sao ignorados e substituidos antes do uso.

**Motivo:** Evita erro "Conta corrente nao configurada para PIX" da OMIE.

## Observability
- Sem logs adicionais (apenas respostas HTTP).

## Examples
### Request
```json
{
  "os": {
    "compra_id": "compra-456",
    "cliente_omie_id": 5193473697,
    "email": "financeiro@empresaexemplo.com.br",
    "cidade_prestacao_servico": "Sao Paulo(SP)",
    "cCodParc": "003",
    "quantidade_parcelas": 1,
    "data_venda": "02/02/2026",
    "servicos_prestados": [
      {
        "nCodServico": 6394,
        "cDescServ": "Servico prestado",
        "nQtde": 1,
        "nValUnit": 1000
      }
    ]
  }
}
```

### Response
```json
{
  "status": "ok",
  "data": {
    "cCodStatus": "0",
    "cDesStatus": "OS cadastrada com sucesso"
  }
}
```
