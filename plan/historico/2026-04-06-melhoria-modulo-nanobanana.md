# Plano: Melhoria do Modulo NanoBanana — SDD, Shared Code, Seguranca e Testes

**Data:** 2026-04-06
**Status:** Pendente
**Motivacao:** O modulo NanoBanana e funcional e bem integrado ao pipeline de geracao de criativos, mas diverge significativamente do padrao de qualidade estabelecido pelo modulo OMIE. Nao possui functionSpecs (SDD), tem codigo duplicado em 3 edge functions, endpoints criticos sem autenticacao e zero testes automatizados. Essas lacunas aumentam risco de regressao, dificultam manutencao por agentes de IA e criam vulnerabilidade de seguranca.

**Prerequisito:** Leitura do `relatorio-nanobanana.md` (diagnostico completo gerado em 2026-04-06).

---

## Diagnostico (resumo)

| Causa raiz | Impacto | Evidencia |
|------------|---------|-----------|
| 0 de 3 edge functions NanoBanana com `functionSpec.md` | Agente IA inventa comportamento, sem contrato formal | `ls supabase/functions/get-nanobanana-config/` — sem spec |
| `NanoBananaDbConfig` + `loadNanoBananaConfig()` duplicados em 3 arquivos | Risco de drift: alterar interface em um arquivo e esquecer nos outros | `create-ai-campaign-job`, `post-gen-generate`, `post-turbo-generate` |
| `update-nanobanana-config` e `read-nanobanana-reference` sao publicos | Qualquer pessoa pode alterar config de geracao ou consumir API Gemini | Deploy com `--no-verify-jwt` sem necessidade |
| Zero testes automatizados | Regressao silenciosa em validacoes (ex: mode invalido, imagem grande) | `find supabase/functions/*nanobanana* -name '*test*'` = vazio |
| Documentacao dispersa entre CONTRACT.md e PRD.md | Agente precisa cruzar 2 docs para entender o contrato | CONTRACT.md secao 9.1 + PRD RF-14/RF-15 |
| CLAUDE.md nao documenta tabela `nanobanana_config` nem bucket | Agente nao sabe que existe singleton config + storage bucket | CLAUDE.md secao "Edge Functions Registry" |

---

## Fase 1 — Shared Module (eliminar duplicacao) · ~1h

### Passo 1.1: Criar `_shared/nanobanana/config.ts`

**Arquivo:** `supabase/functions/_shared/nanobanana/config.ts` (novo)

**Conteudo:**

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2";

export interface NanoBananaDbConfig {
  gemini_model_name: string;
  gemini_api_base_url: string;
  max_retries: number;
  worker_batch_size: number;
  url_expiry_seconds: number;
  max_image_download_bytes: number;
  global_rules: string;
  global_rules_version: string;
  prompt_version: string;
  direction_moderna: string;
  direction_clean: string;
  direction_retail: string;
  direction_moderna_mode: string;
  direction_clean_mode: string;
  direction_retail_mode: string;
  direction_moderna_image_path: string | null;
  direction_clean_image_path: string | null;
  direction_retail_image_path: string | null;
  format_1_1: string;
  format_4_5: string;
  format_16_9: string;
  format_9_16: string;
}

export type DirectionMode = "text" | "image" | "both";
export type CategoryKey = "moderna" | "clean" | "retail";
export type GroupName = CategoryKey;

export const REFERENCE_BUCKET = "nanobanana-references";
export const VALID_CATEGORIES: readonly CategoryKey[] = ["moderna", "clean", "retail"];
export const VALID_DIRECTION_MODES: readonly DirectionMode[] = ["text", "image", "both"];

let _cachedConfig: NanoBananaDbConfig | null = null;

export async function loadNanoBananaConfig(
  supabase: ReturnType<typeof createClient>,
): Promise<NanoBananaDbConfig | null> {
  if (_cachedConfig) return _cachedConfig;
  try {
    const { data, error } = await supabase
      .from("nanobanana_config")
      .select("*")
      .limit(1)
      .single();
    if (error || !data) return null;
    _cachedConfig = data as NanoBananaDbConfig;
    return _cachedConfig;
  } catch {
    return null;
  }
}

export function resetConfigCache(): void {
  _cachedConfig = null;
}
```

### Passo 1.2: Refatorar consumidores

**Arquivos a alterar (3):**

1. `supabase/functions/create-ai-campaign-job/index.ts`
2. `supabase/functions/post-gen-generate/index.ts`
3. `supabase/functions/post-turbo-generate/index.ts`

**Acao em cada arquivo:**
- Remover a interface `NanoBananaDbConfig` local
- Remover a funcao `loadNanoBananaConfig()` local
- Remover variavel `_cachedNbConfig` local (se existir)
- Adicionar import: `import { NanoBananaDbConfig, loadNanoBananaConfig, ... } from "../_shared/nanobanana/config.ts";`
- Verificar que todos os type casts `as keyof NanoBananaDbConfig` continuam funcionando

### Passo 1.3: Refatorar endpoints dedicados

**Arquivos a alterar (3):**

1. `supabase/functions/get-nanobanana-config/index.ts` — importar `REFERENCE_BUCKET` do shared
2. `supabase/functions/update-nanobanana-config/index.ts` — importar `REFERENCE_BUCKET`, `VALID_DIRECTION_MODES`, `CategoryKey` do shared
3. `supabase/functions/read-nanobanana-reference/index.ts` — importar `VALID_CATEGORIES`, `CategoryKey` do shared

**Criterio de conclusao:** `deno check` passa em todas as 6 functions, zero duplicacao de `NanoBananaDbConfig`.

---

## Fase 2 — SDD: functionSpecs (contrato formal) · ~2h

### Passo 2.1: Criar `get-nanobanana-config/functionSpec.md`

**Arquivo:** `supabase/functions/get-nanobanana-config/functionSpec.md` (novo)

**Estrutura minima:**

```markdown
# get-nanobanana-config

## Objetivo
Retorna a configuracao singleton do NanoBanana com signed URLs para imagens de referencia.

## Classificacao JWT
**Publica** (`--no-verify-jwt`). Nao requer autenticacao.

## Metodo
`GET`

## Request
Sem body. Sem query params.

## Response (200)
{
  success: true,
  config: {
    gemini_model_name: string,          // default "gemini-2.0-flash-exp"
    gemini_api_base_url: string,
    max_retries: number,                // 0-10
    worker_batch_size: number,          // 1-12
    url_expiry_seconds: number,
    max_image_download_bytes: number,
    global_rules: string,
    global_rules_version: string,
    prompt_version: string,
    direction_moderna: string,
    direction_clean: string,
    direction_retail: string,
    direction_moderna_mode: "text"|"image"|"both",
    direction_clean_mode: "text"|"image"|"both",
    direction_retail_mode: "text"|"image"|"both",
    direction_moderna_image_path: string|null,
    direction_clean_image_path: string|null,
    direction_retail_image_path: string|null,
    direction_moderna_image_url: string|null,  // signed URL (30min TTL)
    direction_clean_image_url: string|null,
    direction_retail_image_url: string|null,
    format_1_1: string,
    format_4_5: string,
    format_16_9: string,
    format_9_16: string,
    updated_at: string|null
  }
}

## Erros
| Status | code | Quando |
|--------|------|--------|
| 405 | METHOD_NOT_ALLOWED | Metodo != GET |
| 500 | — | Erro ao buscar config no banco |

## Dependencias
- Tabela: `nanobanana_config` (singleton, 1 row)
- Bucket: `nanobanana-references` (signed URLs com TTL 30min)

## Notas
- Signed URLs expiram em 30 minutos; frontend deve refrescar periodicamente.
- Se nao existir config no banco, retorna defaults hardcoded.
```

### Passo 2.2: Criar `update-nanobanana-config/functionSpec.md`

**Arquivo:** `supabase/functions/update-nanobanana-config/functionSpec.md` (novo)

**Conteudo essencial a documentar:**
- Metodo PATCH, aceita JSON ou multipart/form-data
- Campos editaveis com ranges de validacao (ex: `max_retries` 0-10, `worker_batch_size` 1-12)
- Fluxo de upload de imagem: validacao mime + size → storage upload → path no DB
- Fluxo de remocao de imagem: flag `direction_<cat>_remove_image=true`
- Validacao: texto de direcao por categoria e obrigatorio (nao pode ficar vazio)
- Direction modes validos: `text`, `image`, `both`
- Response: retorna config atualizada com signed URLs

**Cenarios de erro a enumerar:**
- `VALIDATION_ERROR` (400) — campo invalido, range fora, mode invalido, texto vazio
- `INVALID_MULTIPART` (400) — multipart mal-formado
- `INVALID_JSON` (400) — JSON mal-formado
- `NOT_FOUND` (404) — config singleton nao existe
- `NO_VALID_FIELDS` (400) — nenhum campo valido enviado
- Upload error (500) — falha no storage

### Passo 2.3: Criar `read-nanobanana-reference/functionSpec.md`

**Arquivo:** `supabase/functions/read-nanobanana-reference/functionSpec.md` (novo)

**Conteudo essencial:**
- Metodo POST, Content-Type multipart/form-data
- Campos: `category` (moderna|clean|retail), `image` (PNG/JPG/WEBP, max 10MB)
- Fluxo: imagem → base64 → Gemini Vision API → direcao criativa estruturada
- Formato de saida do Gemini: Background, Celebrity, Layout, Typography, Reference mood
- Prompt enviado ao Gemini (Diretor de Arte Senior)
- Env vars necessarias: `GEMINI_API_KEY`, `GEMINI_MODEL_NAME` (default gemini-1.5-flash), `GEMINI_API_BASE_URL`

**Cenarios de erro:**
- `INVALID_CONTENT_TYPE` (400) — nao multipart
- `INVALID_CATEGORY` (400) — categoria invalida
- `MISSING_IMAGE` (400) — sem imagem
- `INVALID_IMAGE_TYPE` (415) — mime invalido
- `IMAGE_TOO_LARGE` (400) — > 10MB
- `CONFIG_ERROR` (500) — GEMINI_API_KEY ausente
- `MODEL_ERROR` (502) — Gemini retornou erro
- `EMPTY_MODEL_RESPONSE` (502) — Gemini nao retornou texto

**Criterio de conclusao:** 3 functionSpec.md criados, aderentes ao codigo atual (auditoria manual).

---

## Fase 3 — Seguranca: proteger endpoints de escrita · ~30min

### Passo 3.1: Proteger `update-nanobanana-config`

**Arquivo:** `supabase/functions/update-nanobanana-config/index.ts`

**Acao:**
1. Adicionar import de `handleCors`, `jsonResponse` de `../_shared/cors.ts`
2. Adicionar import de `requireAuth`, `isAuthError` de `../_shared/auth.ts`
3. Adicionar bloco de autenticacao apos CORS check:
```typescript
const authResult = await requireAuth(req);
if (isAuthError(authResult)) return authResult.error;
const { user, serviceClient } = authResult;
```
4. Usar `serviceClient` em vez de criar client com service role key manual
5. **Deploy** com `--project-ref awqtzoefutnfmnbomujt` (SEM `--no-verify-jwt` — agora e protegida)

### Passo 3.2: Proteger `read-nanobanana-reference`

**Arquivo:** `supabase/functions/read-nanobanana-reference/index.ts`

**Mesma acao do passo 3.1.** Essa function consome API Gemini (custo) e nao deve ser publica.

### Passo 3.3: Manter `get-nanobanana-config` publica

**Sem alteracao.** Leitura da config nao expoe dados sensiveis e pode ser consumida sem auth. Confirmar que o deploy atual usa `--no-verify-jwt`.

### Passo 3.4: Atualizar frontend

**Arquivo:** `src/pages/AiStep2Monitor/NanoBananaConfigPage.jsx`

**Acao:** Adicionar header `Authorization: Bearer <token>` nas chamadas para:
- `update-nanobanana-config` (handleSave)
- `read-nanobanana-reference` (handleReadImage)

Usar `supabase.auth.getSession()` para obter o token, seguindo o padrao ja usado em outras paginas do AiStep2Monitor.

**Criterio de conclusao:** `update-nanobanana-config` e `read-nanobanana-reference` retornam 401 sem token valido. Frontend continua funcional para usuarios autenticados.

---

## Fase 4 — Testes automatizados · ~2h

### Passo 4.1: Testes para `get-nanobanana-config`

**Arquivo:** `supabase/functions/get-nanobanana-config/index.test.ts` (novo)

**Cenarios:**
1. `GET` retorna 200 com config completa (mock supabase)
2. Metodo `POST` retorna 405
3. Erro no banco retorna 500
4. Campos ausentes no banco usam defaults
5. Signed URLs geradas para imagens existentes
6. Signed URL null para imagens inexistentes

### Passo 4.2: Testes para `update-nanobanana-config`

**Arquivo:** `supabase/functions/update-nanobanana-config/index.test.ts` (novo)

**Cenarios:**
1. PATCH com JSON valido atualiza e retorna 200
2. PATCH com multipart + imagem faz upload e retorna 200
3. Campo `max_retries` fora do range (0-10) retorna 400
4. Campo `worker_batch_size` fora do range (1-12) retorna 400
5. `direction_moderna_mode` com valor invalido retorna 400
6. Texto de direcao vazio retorna 400
7. Imagem com mime invalido retorna 400
8. Imagem acima do limite retorna 400
9. Flag `remove_image=true` limpa o path
10. Sem campos validos retorna 400 (`NO_VALID_FIELDS`)
11. Metodo GET retorna 405
12. Config inexistente retorna 404

### Passo 4.3: Testes para `read-nanobanana-reference`

**Arquivo:** `supabase/functions/read-nanobanana-reference/index.test.ts` (novo)

**Cenarios:**
1. POST com imagem e categoria valida retorna direction_text
2. Categoria invalida retorna 400
3. Sem imagem retorna 400
4. Imagem com mime invalido retorna 415
5. Imagem acima do limite retorna 400
6. Content-Type nao multipart retorna 400
7. Gemini retorna erro → 502
8. Gemini retorna resposta vazia → 502
9. GEMINI_API_KEY ausente → 500

**Comando de execucao:**
```bash
deno test supabase/functions/get-nanobanana-config/ --allow-env --allow-net --allow-read
deno test supabase/functions/update-nanobanana-config/ --allow-env --allow-net --allow-read
deno test supabase/functions/read-nanobanana-reference/ --allow-env --allow-net --allow-read
```

**Criterio de conclusao:** Todos os testes passam. Coverage minimo dos cenarios listados.

---

## Fase 5 — Documentacao e CLAUDE.md · ~30min

### Passo 5.1: Atualizar CLAUDE.md

**Arquivo:** `CLAUDE.md`

**Adicoes:**

1. Na secao "Supabase Critical Rules", adicionar subsecao:

```markdown
### NanoBanana Config (Singleton)

A tabela `nanobanana_config` e singleton (1 row). Bucket de storage: `nanobanana-references`.
Shared module: `_shared/nanobanana/config.ts` — interface, loader com cache, constantes.
Categorias de direcao criativa: `moderna`, `clean`, `retail`.
Direction modes: `text`, `image`, `both`.
```

2. Na secao "Edge Functions Registry", adicionar grupo:

```markdown
**NanoBanana (config de criativos):**
`get-nanobanana-config` (publica), `update-nanobanana-config` (protegida), `read-nanobanana-reference` (protegida)
```

### Passo 5.2: Atualizar CONTRACT.md secao 9.1

**Arquivo:** `ai-step2/CONTRACT.md`

**Acao:** Adicionar nota sobre classificacao JWT (get = publica, update/read = protegida) e referencia ao shared module `_shared/nanobanana/config.ts`.

### Passo 5.3: Atualizar plan/README.md

**Arquivo:** `plan/README.md`

**Acao:** Adicionar entrada para este plano no indice ativo.

**Criterio de conclusao:** CLAUDE.md, CONTRACT.md e README.md atualizados. Agente de IA consegue localizar NanoBanana config, shared module e classificacao JWT sem busca manual.

---

## Fase 6 — Verificacao final · ~30min

### Passo 6.1: Auditoria de aderencia spec ↔ codigo

Para cada uma das 3 functionSpecs criadas:
1. Ler a spec
2. Ler o codigo correspondente
3. Confirmar que todos os campos de request/response, codigos de erro e validacoes estao documentados
4. Corrigir qualquer divergencia

### Passo 6.2: Smoke test funcional

1. Chamar `GET get-nanobanana-config` — deve retornar 200
2. Chamar `PATCH update-nanobanana-config` sem token — deve retornar 401
3. Chamar `PATCH update-nanobanana-config` com token + campo valido — deve retornar 200
4. Chamar `POST read-nanobanana-reference` sem token — deve retornar 401

### Passo 6.3: Build do frontend

```bash
npm run build
```

Confirmar que o build passa sem erros apos adicionar auth headers.

---

## Resumo de entregaveis

| # | Entregavel | Fase | Arquivos |
|---|-----------|------|----------|
| 1 | Shared module NanoBanana | F1 | `_shared/nanobanana/config.ts` (novo) |
| 2 | Refatoracao de imports | F1 | 6 edge functions alteradas |
| 3 | functionSpec get-nanobanana-config | F2 | `functionSpec.md` (novo) |
| 4 | functionSpec update-nanobanana-config | F2 | `functionSpec.md` (novo) |
| 5 | functionSpec read-nanobanana-reference | F2 | `functionSpec.md` (novo) |
| 6 | Auth em update-nanobanana-config | F3 | index.ts alterado + redeploy |
| 7 | Auth em read-nanobanana-reference | F3 | index.ts alterado + redeploy |
| 8 | Auth headers no frontend | F3 | NanoBananaConfigPage.jsx alterado |
| 9 | Testes get-nanobanana-config | F4 | `index.test.ts` (novo) |
| 10 | Testes update-nanobanana-config | F4 | `index.test.ts` (novo) |
| 11 | Testes read-nanobanana-reference | F4 | `index.test.ts` (novo) |
| 12 | CLAUDE.md atualizado | F5 | CLAUDE.md alterado |
| 13 | CONTRACT.md atualizado | F5 | CONTRACT.md alterado |
| 14 | plan/README.md atualizado | F5 | README.md alterado |

**Estimativa total:** ~6-7 horas de execucao

**Ordem de execucao recomendada:** F1 → F2 → F3 → F4 → F5 → F6

A Fase 1 (shared module) deve ser feita primeiro porque as demais fases dependem da estrutura consolidada. A Fase 3 (seguranca) deve vir antes da Fase 4 (testes) para que os testes ja validem o comportamento autenticado.
