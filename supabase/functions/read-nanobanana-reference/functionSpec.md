# functionSpec: read-nanobanana-reference

## Goal

Recebe uma imagem de referência e uma categoria, envia para a Gemini Vision API, e retorna uma direção criativa estruturada em texto. Usado pelo frontend para converter imagem em texto de direção criativa automaticamente.

## Inputs

### Auth
- **Protegida** via `x-admin-password` header. Deploy com `--no-verify-jwt` (auth é aplicada no código).
- Guard: `requireAdminPassword` de `_shared/admin-auth.ts`

### Env Vars
| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `GEMINI_API_KEY` | Sim | Chave da API Gemini |
| `GEMINI_MODEL_NAME` | Não | Modelo a usar (default: `gemini-1.5-flash`) |
| `GEMINI_API_BASE_URL` | Não | Base URL da API (default: `https://generativelanguage.googleapis.com/v1beta`) |
| `ADMIN_PASSWORD` | Não | Senha admin (default: `megazord`) |
| `NANOBANANA_MAX_REFERENCE_UPLOAD_BYTES` | Não | Limite de upload (default: 10 MB) |

### Request
- Método: `POST`
- Content-Type: `multipart/form-data`

### Campos
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `category` | string | Sim | `moderna` \| `clean` \| `retail` |
| `image` | File | Sim | Imagem PNG/JPEG/WEBP, tamanho > 0 |

## Validations

1. Método ≠ POST → 405 `METHOD_NOT_ALLOWED`
2. `x-admin-password` ausente ou incorreto → 401 `UNAUTHORIZED`
3. Content-Type ≠ multipart/form-data → 400 `INVALID_CONTENT_TYPE`
3. `category` ausente ou inválida → 400 `INVALID_CATEGORY`
4. `image` ausente ou tamanho 0 → 400 `MISSING_IMAGE`
5. Mime da imagem não é PNG/JPEG/WEBP → 415 `INVALID_IMAGE_TYPE`
6. Imagem acima do limite de bytes → 400 `IMAGE_TOO_LARGE`
7. `GEMINI_API_KEY` não configurada → 500 `CONFIG_ERROR`

## Behavior

1. Valida request (método, content-type, campos)
2. Extrai imagem do form-data
3. Converte imagem para base64
4. Monta prompt de Diretor de Arte Sênior com formato estruturado por categoria
5. Envia para Gemini Vision API (`generateContent`) com inline image data
6. Extrai texto da resposta do modelo
7. Retorna direção criativa em texto

### Prompt por Categoria

Cada categoria gera um prompt diferente com título específico:

| Categoria | Título no prompt |
|-----------|-----------------|
| `moderna` | CREATIVE DIRECTION — MODERNA (Dark & Bold) |
| `clean` | CREATIVE DIRECTION — CLEAN (Light & Editorial) |
| `retail` | CREATIVE DIRECTION — RETAIL (Hard Sell & Impact) |

### Formato de saída esperado do Gemini

```
CREATIVE DIRECTION — <CATEGORIA> (<Estilo>)
- Background: ...
- Celebrity: ...
- Layout: ...
- Typography: ...
- Reference mood: ...
```

### Regras do prompt
- Instrução inicial em português ("Você é Diretor de Arte Sênior.")
- Resposta esperada em inglês
- Texto objetivo e acionável para geração de criativo
- Sem texto fora do bloco de direção
- Inclui `${category.toUpperCase()}` no texto do prompt para contextualizar a categoria

## Response (200)

```json
{
  "success": true,
  "category": "moderna",
  "direction_text": "CREATIVE DIRECTION — MODERNA (Dark & Bold)\n- Background: ..."
}
```

## External Dependencies

- **Google Gemini API**: endpoint `generateContent` com inline image
- Não acessa Supabase DB nem Storage diretamente

## Shared Module

- Importa `CategoryKey`, `VALID_CATEGORIES` de `_shared/nanobanana/config.ts`

## Error Handling

| HTTP | Code | Descrição |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | `x-admin-password` inválido ou ausente |
| 400 | `INVALID_CONTENT_TYPE` | Content-Type ≠ multipart/form-data |
| 400 | `INVALID_CATEGORY` | Categoria fora de `moderna\|clean\|retail` |
| 400 | `MISSING_IMAGE` | Arquivo de imagem ausente ou vazio |
| 400 | `IMAGE_TOO_LARGE` | Imagem excede limite de bytes |
| 405 | `METHOD_NOT_ALLOWED` | Método ≠ POST |
| 415 | `INVALID_IMAGE_TYPE` | Mime não é PNG/JPEG/WEBP |
| 500 | `CONFIG_ERROR` | `GEMINI_API_KEY` não configurada |
| 502 | `MODEL_ERROR` | Gemini API retornou status HTTP de erro |
| 502 | `EMPTY_MODEL_RESPONSE` | Gemini retornou resposta sem texto |
| 500 | `INTERNAL_ERROR` | Erro não tratado |

## Observability

- Erros retornam `details` com substring (max 300 chars) do erro da API Gemini

## Notes

- Esta function não persiste nada — apenas processa imagem e retorna texto
- O frontend usa o texto retornado para sobrescrever o campo `direction_<categoria>` na UI
- A persistência acontece quando o usuário clica "Salvar" (via `update-nanobanana-config`)
- O loop completo é: upload imagem → Gemini extrai direção → texto preenche campo → usuário salva
