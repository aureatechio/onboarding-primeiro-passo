---
name: omie-integracao
description: Especializa a integracao com a API OMIE (clientes, servicos, OS, payload fiscal), cobrindo transformacao de payload, autenticacao, tratamento de erros e validacao. Use quando o usuario mencionar OMIE, integracao OMIE, payload OMIE, ou qualquer chamada a API OMIE.
---

# OMIE Integracao

## Fontes obrigatorias (ler antes de agir)
1. `.context/modules/omie/DOC-READING-ORDER.md` — identifica docs por tipo de tarefa
2. `.context/modules/omie/BUSINESS-RULES.md` — regras criticas nao documentadas em specs
3. `supabase/functions/<funcao>/functionSpec.md` — spec da funcao alvo

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

## Quando usar
- O usuario mencionar OMIE, integracao OMIE, clientes/contatos, OS, servicos, ou payload OMIE.
- Tarefas de transformacao de dados CRM -> OMIE e chamada do metodo de cadastro.

## Quick start
1. Confirmar endpoint/servico OMIE e metodo (ex.: CRM Contatos -> IncluirContato).
2. Validar credenciais e variaveis de ambiente.
3. Mapear payload do CRM para o formato OMIE.
4. Enviar requisicao e tratar respostas/erros.
5. Registrar evidencias de testes e erros.

## Workflow (checklist)
- [ ] **Doc oficial**: conferir estrutura do metodo no portal OMIE (endpoint do servico).
- [ ] **Autenticacao**: incluir `app_key` e `app_secret` no payload.
- [ ] **Payload**: montar `param` com campos obrigatorios e normalizados.
- [ ] **Transformacao**: sanitizar CNPJ/CPF, separar DDD/telefone, padronizar CEP.
- [ ] **Resposta**: capturar codigo retornado e mensagem de status.
- [ ] **Erros**: mapear erros OMIE para HTTP e mensagem clara.
- [ ] **Testes**: unitario para transformacao, integracao para chamada OMIE (mock/sandbox).

## Template de payload (exemplo)
Use este formato base (ajuste conforme o metodo exato do servico):

```json
{
  "call": "IncluirContato",
  "app_key": "<OMIE_APP_KEY>",
  "app_secret": "<OMIE_APP_SECRET>",
  "param": [
    {
      "identificacao": {
        "cNome": "<nome>",
        "cSobrenome": "<sobrenome>",
        "nCodVend": 0,
        "nCodConta": 0
      },
      "endereco": {
        "cEndereco": "<logradouro>",
        "cCompl": "<complemento>",
        "cCEP": "<cep>",
        "cBairro": "<bairro>",
        "cCidade": "<cidade>",
        "cUF": "<uf>",
        "cPais": "Brasil"
      },
      "telefone_email": {
        "cDDDCel1": "<ddd>",
        "cNumCel1": "<telefone>",
        "cEmail": "<email>"
      },
      "cObs": "<observacoes>"
    }
  ]
}
```

## Validacoes minimas
- CNPJ/CPF apenas digitos.
- CEP com 8 digitos.
- Telefone separado em DDD e numero.
- Email com formato valido.
- Campos obrigatorios do metodo informados.

## Tratamento de erros (padrao)
- Credenciais ausentes/invalidas -> 401 com mensagem clara.
- Erro de validacao de payload -> 400 com campos invalidos.
- Timeout/indisponibilidade OMIE -> 504/503.
- Duplicidade (quando aplicavel) -> 409.

## Testes recomendados
- Unitario: transformacao de dados (CNPJ, CEP, telefone, tags/obs).
- Integracao: envio do payload e tratamento de erros OMIE.
- Sandbox: fluxo completo com retorno de codigo OMIE.

## Template de payload OS (IncluirOS/AlterarOS)

```json
{
  "call": "IncluirOS",
  "app_key": "<OMIE_APP_KEY>",
  "app_secret": "<OMIE_APP_SECRET>",
  "param": [{
    "Cabecalho": {
      "cCodIntOS": "<compra_id>",
      "nCodCli": "<omie_cliente_id>",
      "cEtapa": "<os_etapa>",
      "dDtPrevisao": "<completed_at + 3 dias uteis>",
      "cCodParc": "<000|001|999>",
      "nCodVend": "<omie_usuario_codigo>"
    },
    "ServicosPrestados": [{
      "nCodServico": "<omie_servico_id>",
      "cDescServ": "<descricao>",
      "nQtde": 1,
      "nValUnit": "<valor_reais>",
      "cRetemISS": "S|N",
      "impostos": { "nAliqISS": "<aliquota>" }
    }],
    "InformacoesAdicionais": {
      "cDadosAdicNF": "<descricao_template_renderizado>",
      "cCidPrestServ": "<cidade_ibge>(UF)",
      "cEndObra": "<regiaocomprada>",
      "cCodCateg": "<codigo_categoria>",
      "Departamentos": [{ "cCodDepto": "<cod_depto>", "nPerc": 100 }]
    },
    "Parcelas": [
      { "nParcela": 1, "nValor": "<valor>", "nPercentual": 100, "dDtVenc": "<data>" }
    ]
  }]
}
```

**Regras criticas de payload:**
- `cEnvBoleto`, `cEnvPix`, `cEnvLink` → SEMPRE `'N'` (hard-stop, 3 camadas de protecao)
- `cCidPrestServ` → vem de `compra.regiaocomprada` (territorio comercial, NAO endereco do cliente)
- `nValUnit` → valor em REAIS (converter de centavos: `valor_centavos / 100`)
- `Parcelas` → somente quando `cCodParc = '999'`

## Observacoes
- Sempre use a documentacao oficial do servico OMIE correspondente.
- Evitar logar `app_key` e `app_secret`.
- Priorizar mensagens de erro claras e consistentes.
