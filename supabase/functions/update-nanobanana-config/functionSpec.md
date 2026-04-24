# functionSpec: update-nanobanana-config

## Goal

Atualiza a configuração singleton do NanoBanana. Suporta atualização parcial (PATCH) via JSON ou multipart/form-data (quando há upload de imagens de referência).

## Inputs

### Auth
- **Protegida** via JWT + RBAC admin.
- Guard: `requireRole(req, ["admin"])` de `_shared/rbac.ts`

### Env Vars
| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role key |
| JWT do usuario admin | Sim | Header `Authorization: Bearer <access_token>` |
| `NANOBANANA_MAX_REFERENCE_UPLOAD_BYTES` | Não | Limite de upload (default: 10 MB) |

### Request
- Método: `PATCH`
- Content-Type: `application/json` ou `multipart/form-data`

### Campos editáveis (todos opcionais no PATCH)

#### Strings
| Campo | Validação |
|-------|-----------|
| `gemini_model_name` | Não vazio |
| `gemini_api_base_url` | Deve começar com `https://` |
| `global_rules` | Não vazio |
| `global_rules_version` | Não vazio |
| `prompt_version` | Não vazio |
| `direction_moderna` | Não vazio |
| `direction_clean` | Não vazio |
| `direction_retail` | Não vazio |
| `direction_moderna_mode` | `text` \| `image` \| `both` |
| `direction_clean_mode` | `text` \| `image` \| `both` |
| `direction_retail_mode` | `text` \| `image` \| `both` |
| `format_1_1` | Não vazio |
| `format_4_5` | Não vazio |
| `format_16_9` | Não vazio |
| `format_9_16` | Não vazio |

#### Numéricos
| Campo | Min | Max |
|-------|-----|-----|
| `max_retries` | 0 | 10 |
| `worker_batch_size` | 1 | 12 |
| `url_expiry_seconds` | 3600 | 2592000 |
| `max_image_download_bytes` | 1048576 (1 MB) | 52428800 (50 MB) |

#### Float
| Campo | Min | Max |
|-------|-----|-----|
| `temperature` | 0.0 | 2.0 |
| `top_p` | 0.0 | 1.0 |

#### Inteiro (geração)
| Campo | Min | Max |
|-------|-----|-----|
| `top_k` | 1 | 100 |

#### Enum
| Campo | Valores |
|-------|---------|
| `safety_preset` | `default` \| `relaxed` \| `permissive` \| `strict` |

#### Boolean
| Campo | Descrição |
|-------|-----------|
| `use_system_instruction` | Envia global_rules como systemInstruction separado na API Gemini |

#### Imagens (apenas via multipart/form-data)
| Campo | Descrição |
|-------|-----------|
| `direction_moderna_image` | Arquivo PNG/JPEG/WEBP, max 10 MB |
| `direction_clean_image` | Arquivo PNG/JPEG/WEBP, max 10 MB |
| `direction_retail_image` | Arquivo PNG/JPEG/WEBP, max 10 MB |
| `direction_moderna_remove_image` | `true` para remover imagem existente |
| `direction_clean_remove_image` | `true` para remover imagem existente |
| `direction_retail_remove_image` | `true` para remover imagem existente |

## Validations

1. Método ≠ PATCH → 405
2. JWT ausente/invalido → 401 `UNAUTHORIZED`; role sem admin → 403 `FORBIDDEN`
3. Content-Type inválido → 400 `INVALID_MULTIPART` ou `INVALID_JSON`
3. Campo string vazio (quando enviado) → 400 `VALIDATION_ERROR`
4. `gemini_api_base_url` sem `https://` → 400 `VALIDATION_ERROR`
5. `direction_*_mode` fora de `text|image|both` → 400 `VALIDATION_ERROR`
6. Numérico ou float fora do range → 400 `VALIDATION_ERROR`
6b. `safety_preset` fora de `default|relaxed|permissive|strict` → 400 `VALIDATION_ERROR`
7. Imagem com mime inválido (não PNG/JPEG/WEBP) → 400 `VALIDATION_ERROR`
8. Imagem acima do limite de bytes → 400 `VALIDATION_ERROR`
9. **Regra crítica:** após aplicar updates, o texto de direção de cada categoria (`direction_moderna`, `direction_clean`, `direction_retail`) deve ser não-vazio (considerando valor existente + alteração). Se ficar vazio → 400 `VALIDATION_ERROR`
10. Nenhum campo válido para atualizar → 400 `NO_VALID_FIELDS`
11. Config singleton não encontrada no banco → 404 `NOT_FOUND`

## Behavior

1. Parseia payload (JSON ou multipart)
2. Valida cada campo individualmente
3. Busca config existente no banco (`nanobanana_config`)
4. **Upload de imagens** (se houver): para cada categoria com arquivo:
   - Valida mime e tamanho
   - Gera path: `<categoria>/<timestamp>_<uuid>_<filename>`
   - Upload para bucket `nanobanana-references`
   - Salva path no campo `direction_<cat>_image_path`
5. **Remoção de imagens** (se flag `remove_image=true`): seta `direction_<cat>_image_path` para `null`
6. Verifica que textos de direção das 3 categorias não ficam vazios (merge do existente + update)
7. Atualiza `updated_at` com timestamp ISO
8. Executa UPDATE na row existente
9. Gera signed URLs para imagens e retorna config atualizada

## Response (200)

```json
{
  "success": true,
  "config": {
    "gemini_model_name": "...",
    "gemini_api_base_url": "...",
    "max_retries": 3,
    "worker_batch_size": 4,
    "url_expiry_seconds": 86400,
    "max_image_download_bytes": 10485760,
    "global_rules": "...",
    "global_rules_version": "1.0.0",
    "prompt_version": "1.0.0",
    "direction_moderna": "...",
    "direction_clean": "...",
    "direction_retail": "...",
    "direction_moderna_mode": "text",
    "direction_clean_mode": "text",
    "direction_retail_mode": "text",
    "direction_moderna_image_path": "moderna/1712345_uuid_file.png",
    "direction_clean_image_path": null,
    "direction_retail_image_path": null,
    "direction_moderna_image_url": "https://...signed-url...",
    "direction_clean_image_url": null,
    "direction_retail_image_url": null,
    "format_1_1": "...",
    "format_4_5": "...",
    "format_16_9": "...",
    "format_9_16": "...",
    "temperature": 1.0,
    "top_p": 0.95,
    "top_k": 40,
    "safety_preset": "default",
    "use_system_instruction": false,
    "updated_at": "2026-04-06T12:00:00.000Z"
  }
}
```

## External Dependencies

- **Supabase DB**: tabela `nanobanana_config` (singleton)
- **Supabase Storage**: bucket `nanobanana-references` (upload + signed URLs)

## Shared Module

- Importa `CategoryKey`, `DirectionMode`, `REFERENCE_BUCKET`, `VALID_CATEGORIES`, `VALID_DIRECTION_MODES`, `VALID_SAFETY_PRESETS`, `CONFIG_TABLE` de `_shared/nanobanana/config.ts`

## Error Handling

| HTTP | Code | Descrição |
|------|------|-----------|
| 401 | `UNAUTHORIZED` | JWT inválido ou ausente |
| 403 | `FORBIDDEN` | Role diferente de `admin` |
| 400 | `VALIDATION_ERROR` | Campo inválido (string vazio, range fora, mode inválido, mime inválido, imagem grande, direção obrigatória vazia) |
| 400 | `INVALID_MULTIPART` | multipart/form-data mal-formado |
| 400 | `INVALID_JSON` | JSON mal-formado |
| 400 | `NO_VALID_FIELDS` | Nenhum campo válido enviado |
| 404 | `NOT_FOUND` | Config singleton não existe |
| 405 | `METHOD_NOT_ALLOWED` | Método ≠ PATCH |
| 500 | — | Erro no banco ou no upload para storage |
| 500 | — | Erro interno não tratado |

## Observability

- `console.error` com prefix `[update-nanobanana-config]` em cenários de erro

## Storage Path Convention

Imagens de referência são armazenadas em:
```
nanobanana-references/<categoria>/<timestamp>_<uuid>_<filename_sanitizado>
```

Sanitização do filename: lowercase, caracteres fora de `a-z0-9._-` substituídos por `_`.

## CORS

- Suporta `OPTIONS` (preflight) com headers: `authorization, x-client-info, apikey, content-type`
- Métodos permitidos: `PATCH, OPTIONS`

## Notes

- A resposta inclui signed URLs (30 min TTL) para imagens recém-enviadas
- Upload de imagem em uma categoria não afeta as outras categorias
- Flag `remove_image` tem precedência menor que upload (se ambos forem enviados, o upload vence)
- O frontend alterna automaticamente entre JSON e multipart quando há arquivos
- **Defaults na resposta:** campos `direction_*_mode` retornam `"text"` como fallback quando null no banco
- **Multipart numéricos:** valores numéricos enviados via multipart são convertidos de string para number automaticamente
