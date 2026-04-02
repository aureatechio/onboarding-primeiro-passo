Busque a compra `$ARGUMENT` via MCP Supabase com **máxima performance** e **somente leitura**.

Objetivo:
1) Trazer diagnóstico operacional da compra em até 1 resposta.
2) Minimizar roundtrips MCP (ideal: 1 query principal + no máximo 2 queries de fallback).

Regras de execução:
- NÃO alterar nada no projeto nem no banco.
- NÃO fazer varredura ampla de schema por padrão.
- Priorizar consulta única em `v_transaction_pipeline` filtrando por `compra_id`.
- Se não houver resultado na view, consultar `compras` + `checkout_sessions` + `omie_sync` + `notas_fiscais` com filtros exatos e `limit`.
- Evitar `select *` quando possível; retornar só colunas essenciais.
- Sempre usar `limit` e ordenação por data desc nas tabelas de histórico.
- Só consultar `information_schema` se houver erro de coluna/tabela.
- Não repetir consultas já realizadas na mesma execução.

Formato da resposta:
- Resumo executivo (status pagamento, contrato, OMIE/NFS-e, pendências).
- Bloco “Evidências” com IDs e timestamps principais.
- Bloco “Alertas” com divergências detectadas.
- Se não encontrar a compra, informar claramente “compra não encontrada”.

Checklist de dados mínimos:
- compra: id, statuscompra, checkout_status, valor_total, cliente_id, data_compra
- checkout: session_id principal, status, payment_status, completed_at
- omie: omie_status, attempts, last_error
- nfse: status/numero (se existir)
- clicksign: status, envelope_id, data_assinatura_concluida!