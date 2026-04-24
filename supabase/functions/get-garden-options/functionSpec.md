# functionSpec: get-garden-options

## Goal

Retornar dados de referencia (celebridades, segmentos, subsegmentos, negocios) para popular o formulario do Post Gen.

## HTTP

- **Method:** GET
- **Auth:** Publica (deploy com `--no-verify-jwt`)

## Inputs

Nenhum parametro.

## Behavior

1. Consulta 4 tabelas em paralelo (Promise.all):
   - `celebridades` — filtro `ativo = true`, colunas `id, nome, fotoPrincipal`, ordenado por `nome`
   - `segmentos` — filtro `active = true`, colunas `id, nome`, ordenado por `nome`
   - `subsegmento` — filtro `active = true`, colunas `id, nome, segmento` (renomeado para `segmento_id`), ordenado por `nome`
   - `negocio` — filtro `active = true`, colunas `id, nome, segmento_id, subsegmento_id`, ordenado por `nome`
2. Retorna todas as listas.

## Response Shape

```json
{
  "success": true,
  "data": {
    "celebrities": [
      { "id": "uuid", "nome": "Nome", "fotoPrincipal": "https://..." }
    ],
    "segments": [
      { "id": "uuid", "nome": "Segmento" }
    ],
    "subsegments": [
      { "id": "uuid", "nome": "Subsegmento", "segmento_id": "uuid" }
    ],
    "businesses": [
      { "id": "uuid", "nome": "Negocio", "segmento_id": "uuid", "subsegmento_id": "uuid" }
    ]
  }
}
```

**Nota:** Campo `segmento` da tabela `subsegmento` e mapeado para `segmento_id` no response.

## Error Handling

| HTTP | Code | Condition |
|------|------|-----------|
| 500 | `INTERNAL_ERROR` | Erro de query em qualquer tabela |

## Deploy

```bash
supabase functions deploy get-garden-options --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```
