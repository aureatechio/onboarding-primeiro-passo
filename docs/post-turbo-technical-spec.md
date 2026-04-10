# Post Turbo — Especificacao Tecnica para Replicacao

> Documentacao independente de projeto. Descreve a funcionalidade "Post Turbo" (image-to-image com direcao criativa via IA) de forma que um agente de IA consiga replica-la em qualquer stack.

---

## 1. Visao Geral

Post Turbo e uma funcionalidade de **image-to-image** que recebe uma imagem base do usuario e a transforma em um **criativo publicitario profissional** usando IA generativa (Gemini). O usuario escolhe uma direcao criativa, formato de saida, e opcionalmente fornece logo, imagem de produto, nome de celebridade e paleta de cores.

**Padrao arquitetural:** async-first (fire-and-forget com polling).

```
Cliente                    Servidor                      IA (Gemini)
  |                           |                              |
  |-- POST multipart -------->|                              |
  |<-- 202 { job_id } -------|                              |
  |                           |-- upload assets (storage) -->|
  |                           |-- monta prompt ------------->|
  |                           |-- chama Gemini API --------->|
  |                           |                              |-- gera imagem
  |                           |<-- imagem base64 ------------|
  |                           |-- salva output (storage) --->|
  |                           |-- atualiza job: completed -->|
  |                           |                              |
  |-- GET /job/:id ---------->|                              |
  |<-- { status, url } ------|                              |
```

---

## 2. Contrato da API

### 2.1 Endpoint de Geracao

```
POST /post-turbo-generate
Content-Type: multipart/form-data
```

#### Campos do FormData

| Campo            | Tipo     | Obrigatorio | Descricao                                                    |
|------------------|----------|-------------|--------------------------------------------------------------|
| `image`          | File     | Sim         | Imagem base (referencia principal). Max 15 MB. PNG/JPEG/WebP |
| `direction`      | string   | Sim         | Direcao criativa: `moderna`, `clean` ou `retail`             |
| `format`         | string   | Sim         | Aspecto do output: `1:1`, `4:5`, `16:9` ou `9:16`           |
| `prompt`         | string   | Nao         | Instrucoes adicionais do usuario. Max 5000 caracteres        |
| `celebrity_name` | string   | Nao         | Nome de celebridade para incluir no criativo                 |
| `logo`           | File     | Nao         | Logo da marca. Max 15 MB. PNG/JPEG/WebP                      |
| `product_image`  | File     | Nao         | Imagem do produto. Max 15 MB. PNG/JPEG/WebP                  |
| `palette`        | string   | Nao         | JSON array de hex colors. Max 5 cores. Ex: `["#384ffe","#ff0058"]` |

#### Resposta Sincrona (202 Accepted)

```json
{
  "success": true,
  "data": {
    "job_id": "uuid",
    "status": "processing",
    "request_id": "uuid"
  }
}
```

#### Erros Sincronos

| Codigo HTTP | Error Code      | Quando                                           |
|-------------|-----------------|--------------------------------------------------|
| 400         | INVALID_INPUT   | Content-Type nao e multipart, campo invalido     |
| 500         | UPLOAD_ERROR    | Falha ao salvar imagem no storage                |
| 500         | INTERNAL_ERROR  | Falha ao criar job no banco                      |

Formato do erro:

```json
{
  "success": false,
  "code": "INVALID_INPUT",
  "message": "descricao do erro"
}
```

### 2.2 Endpoint de Polling

```
GET /get-job/:id
```

#### Resposta — Processing

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "processing",
    "tool": "post-turbo",
    "created_at": "iso8601"
  }
}
```

#### Resposta — Completed

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "completed",
    "tool": "post-turbo",
    "output_image_url": "https://signed-url...",
    "duration_ms": 12340,
    "created_at": "iso8601"
  }
}
```

#### Resposta — Failed

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "failed",
    "tool": "post-turbo",
    "error_code": "PROVIDER_ERROR",
    "error_message": "descricao",
    "duration_ms": 5000
  }
}
```

**Polling recomendado:** a cada 3 segundos ate `status !== 'processing'`.

---

## 3. Modelo de Dados

### 3.1 Tabela `garden_jobs`

| Coluna              | Tipo        | Descricao                                              |
|---------------------|-------------|--------------------------------------------------------|
| `id`                | uuid (PK)   | ID do job                                              |
| `tool`              | text        | Sempre `'post-turbo'` para essa feature                |
| `status`            | text        | `processing` → `completed` ou `failed`                 |
| `input_prompt`      | text        | Prompt do usuario ou nome da direcao (fallback)        |
| `input_format`      | text        | Formato solicitado (`1:1`, `4:5`, etc.)                |
| `input_model`       | text        | Sempre `'nanobanana'`                                  |
| `input_metadata`    | jsonb       | Metadados estruturados (ver abaixo)                    |
| `source_image_path` | text        | Path no storage da imagem base                         |
| `output_image_path` | text        | Path no storage da imagem gerada (apos sucesso)        |
| `output_image_url`  | text        | Signed URL do output (expira em 7 dias)                |
| `error_code`        | text        | Codigo do erro (se falhou)                             |
| `error_message`     | text        | Mensagem de erro (max 500 chars)                       |
| `duration_ms`       | integer     | Tempo total de processamento                           |
| `request_id`        | uuid        | ID de rastreamento da requisicao                       |
| `created_at`        | timestamptz | Auto-gerado                                            |

#### Estrutura de `input_metadata`

```json
{
  "direction": "moderna",
  "celebrity_name": "Nome ou null",
  "has_logo": true,
  "has_product_image": false,
  "palette": ["#384ffe", "#ff0058"]
}
```

### 3.2 Tabela de Configuracao (Singleton)

Uma tabela singleton (exatamente 1 registro) que controla todos os parametros de geracao. Equivalente a um painel de admin.

| Campo                        | Tipo    | Descricao                                                    |
|------------------------------|---------|--------------------------------------------------------------|
| `gemini_model_name`          | text    | Modelo Gemini a usar (ex: `gemini-3-pro-image-preview`)      |
| `gemini_api_base_url`        | text    | Base URL da API Gemini                                       |
| `max_retries`                | integer | Tentativas apos falha (padrao: 2)                            |
| `max_image_download_bytes`   | integer | Limite de download por imagem (padrao: 15 MB)                |
| `temperature`                | float   | Temperatura do modelo                                        |
| `top_p`                      | float   | Top-P sampling                                               |
| `top_k`                      | integer | Top-K sampling                                               |
| `safety_preset`              | text    | Preset de seguranca: `default`, `relaxed`, `permissive`, `strict` |
| `use_system_instruction`     | boolean | Se `true`, envia `global_rules` como system instruction      |
| `global_rules`               | text    | Regras globais (system instruction do modelo)                |
| `direction_moderna`          | text    | Texto da direcao criativa "moderna"                          |
| `direction_clean`            | text    | Texto da direcao criativa "clean"                            |
| `direction_retail`           | text    | Texto da direcao criativa "retail"                           |
| `format_1_1`                 | text    | Instrucao especifica para formato 1:1                        |
| `format_4_5`                 | text    | Instrucao especifica para formato 4:5                        |
| `format_16_9`                | text    | Instrucao especifica para formato 16:9                       |
| `format_9_16`                | text    | Instrucao especifica para formato 9:16                       |

### 3.3 Tabela `celebridades` (Opcional)

| Campo            | Tipo    | Descricao                                    |
|------------------|---------|----------------------------------------------|
| `nome`           | text    | Nome da celebridade (match exato)            |
| `fotoPrincipal`  | text    | URL publica da foto                          |
| `ativo`          | boolean | Se `false`, celebridade nao e encontrada     |

### 3.4 Storage (Object Storage)

Bucket: qualquer bucket com suporte a signed URLs.

**Estrutura de paths:**

```
turbo/{jobId}/source.{ext}    # Imagem base original
turbo/{jobId}/logo.{ext}      # Logo (se enviado)
turbo/{jobId}/product.{ext}   # Imagem de produto (se enviada)
turbo/{jobId}/output.png      # Imagem gerada (output final)
```

**Signed URLs:**
- Input (durante processamento): 600 segundos (10 min)
- Output (entregue ao cliente): 7 dias

---

## 4. Workflow Completo (Passo a Passo)

### Fase 1 — Recebimento e Validacao (sincrono)

1. Rejeitar se `Content-Type` nao for `multipart/form-data` → 400
2. Extrair campos do FormData
3. Validar todos os campos:
   - `image`: obrigatoria, max 15 MB, PNG/JPEG/WebP
   - `direction`: deve ser `moderna`, `clean` ou `retail`
   - `format`: deve ser `1:1`, `4:5`, `16:9` ou `9:16`
   - `logo`: se presente, max 15 MB, PNG/JPEG/WebP
   - `product_image`: se presente, max 15 MB, PNG/JPEG/WebP
   - `palette`: se presente, parse como JSON array
4. Se houver erros, retornar todos concatenados em uma unica resposta 400

### Fase 2 — Upload de Assets (sincrono)

5. Gerar `jobId` (UUID)
6. Upload da imagem base para `turbo/{jobId}/source.{ext}`
7. Upload do logo para `turbo/{jobId}/logo.{ext}` (se presente)
8. Upload da imagem de produto para `turbo/{jobId}/product.{ext}` (se presente)
9. Se qualquer upload falhar → 500

### Fase 3 — Criacao do Job (sincrono)

10. Inserir registro na tabela `garden_jobs` com status `processing`
11. Retornar **202 Accepted** com `job_id`, `status`, `request_id`

### Fase 4 — Geracao da Imagem (background / async)

12. Carregar configuracao do singleton (tabela de config)
13. Obter o texto da direcao criativa a partir da config (campo `direction_{nome}`)
14. Montar o prompt enriquecido (ver Secao 5)
15. Se `celebrity_name` informado: buscar a foto na tabela `celebridades`
16. Gerar signed URLs temporarias (10 min) para os assets uploadados
17. Mapear os slots de imagem para a chamada ao modelo (ver Secao 6)
18. Chamar a API Gemini com retry (ver Secao 7)
19. Se sucesso:
    - Upload do output para `turbo/{jobId}/output.png`
    - Gerar signed URL de 7 dias para o output
    - Atualizar job: `status = 'completed'`, salvar `output_image_path` e `output_image_url`
20. Se falha:
    - Atualizar job: `status = 'failed'`, salvar `error_code` e `error_message`

---

## 5. Engenharia de Prompt

### 5.1 Estrutura do Prompt

O prompt final e composto por secoes separadas por `\n\n---\n\n`:

```
CREATIVE DIRECTION ({direction}):
{texto da direcao carregado da config}

---

BRAND PALETTE: #cor1, #cor2, #cor3
(somente se palette nao vazia)

---

CELEBRITY: {nome}
(somente se celebrity_name informado)

---

FORMAT ({format}):
{instrucao de formato carregada da config}
(se nao houver instrucao na config, apenas: FORMAT: {format})

---

USER INSTRUCTIONS:
{prompt do usuario}
(somente se prompt nao vazio)

---

MANDATORY: Enhance and improve this base image into a professional advertising creative following ALL directions above. Use the brand logo and palette if provided. Text must be in Brazilian Portuguese. Output a single image.
```

### 5.2 Origem dos Textos Dinamicos

| Secao              | Origem                                                    |
|--------------------|-----------------------------------------------------------|
| Direction text     | Config singleton: campo `direction_{moderna\|clean\|retail}` |
| Format instruction | Config singleton: campo `format_{1_1\|4_5\|16_9\|9_16}`   |
| Global rules       | Config singleton: campo `global_rules` (como system instruction, se habilitado) |

### 5.3 System Instruction (Opcional)

Se a config tiver `use_system_instruction = true`, o campo `global_rules` e enviado como **system instruction** do modelo (separado do prompt do usuario). Isso permite definir regras globais de comportamento que o modelo segue em toda geracao.

### 5.4 Instrucao Final Obrigatoria

A ultima secao do prompt e **sempre fixa** e nao deve ser removida:

> "MANDATORY: Enhance and improve this base image into a professional advertising creative following ALL directions above. Use the brand logo and palette if provided. Text must be in Brazilian Portuguese. Output a single image."

Essa instrucao ancora o modelo na tarefa de image-to-image publicitario.

---

## 6. Mapeamento de Slots de Imagem

O modelo recebe ate 4 imagens como input. Cada imagem ocupa um "slot" semantico:

| Slot (ordem de envio) | Nome                   | Conteudo                                                 |
|-----------------------|------------------------|----------------------------------------------------------|
| 1                     | Celebrity Slot         | Foto da celebridade (da tabela) **OU** imagem base       |
| 2                     | Logo Slot              | Logo uploadado **OU** imagem base                        |
| 3                     | Campaign Slot          | Imagem de produto (se presente). Omitido se ausente      |
| 4                     | Reference Slot         | **Sempre** a imagem base (referencia principal)           |

**Regras de fallback:**
- Se nao houver celebridade → slot 1 recebe a imagem base
- Se nao houver logo → slot 2 recebe a imagem base
- Se nao houver produto → slot 3 e omitido (nao enviado)
- Slot 4 sempre recebe a imagem base

**Consequencia:** No cenario minimo (sem celebridade, sem logo, sem produto), o modelo recebe a mesma imagem 3 vezes (slots 1, 2, 4). Isso reforça a imagem base como referencia dominante.

---

## 7. Chamada ao Modelo (Gemini API)

### 7.1 Endpoint

```
POST {base_url}/models/{model_name}:generateContent
```

**Defaults:**
- `base_url`: `https://generativelanguage.googleapis.com/v1beta`
- `model_name`: `gemini-3-pro-image-preview`

### 7.2 Headers

```
Content-Type: application/json
x-goog-api-key: {GEMINI_API_KEY}
```

### 7.3 Request Body

```json
{
  "contents": [{
    "parts": [
      { "inlineData": { "mimeType": "image/png", "data": "{base64}" } },
      { "inlineData": { "mimeType": "image/png", "data": "{base64}" } },
      { "inlineData": { "mimeType": "image/png", "data": "{base64}" } },
      { "inlineData": { "mimeType": "image/png", "data": "{base64}" } },
      { "text": "{prompt completo}" }
    ]
  }],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
    "imageConfig": { "aspectRatio": "1:1" },
    "temperature": 0.8,
    "topP": 0.95,
    "topK": 40
  },
  "safetySettings": [
    { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH" },
    { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH" },
    { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH" },
    { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH" }
  ],
  "systemInstruction": {
    "parts": [{ "text": "{global_rules}" }]
  }
}
```

**Notas:**
- `imageConfig.aspectRatio` so e enviado se configurado
- `safetySettings` depende do preset: `default` = nao envia, `relaxed` = `BLOCK_ONLY_HIGH`, `permissive` = `BLOCK_NONE`, `strict` = `BLOCK_MEDIUM_AND_ABOVE`
- `systemInstruction` so e enviado se `use_system_instruction = true` na config
- As imagens sao enviadas como `inlineData` em base64 (nao como URLs)
- A ordem das `parts` e: imagens primeiro, texto por ultimo

### 7.4 Extracao da Resposta

```json
{
  "candidates": [{
    "content": {
      "parts": [
        { "text": "descricao opcional" },
        {
          "inlineData": {
            "mimeType": "image/png",
            "data": "{base64 da imagem gerada}"
          }
        }
      ]
    }
  }]
}
```

**Logica de extracao:**
1. Acessar `candidates[0].content.parts`
2. Iterar pelas parts procurando uma com `inlineData.data`
3. Decodificar base64 para bytes
4. Se nenhuma part tiver `inlineData`, considerar falha

### 7.5 Retry

| Parametro    | Valor Padrao |
|--------------|--------------|
| Max retries  | 2            |
| Delay 1      | 1000ms       |
| Delay 2      | 3000ms       |

- Retry em qualquer falha (API error, ausencia de imagem na resposta, excecao)
- Apos esgotar retries, marcar job como `failed`
- Max retries pode ser configurado via config singleton (campo `max_retries`)

---

## 8. Validacoes

### 8.1 Imagens

| Regra                   | Valor                          |
|-------------------------|--------------------------------|
| Tipos aceitos           | `image/png`, `image/jpeg`, `image/webp` |
| Tamanho maximo          | 15 MB (15 * 1024 * 1024 bytes) |
| Imagem base             | Obrigatoria                    |
| Logo                    | Opcional                       |
| Imagem de produto       | Opcional                       |

### 8.2 Campos Texto

| Campo      | Regra                                            |
|------------|--------------------------------------------------|
| direction  | Enum: `moderna`, `clean`, `retail`               |
| format     | Enum: `1:1`, `4:5`, `16:9`, `9:16`              |
| prompt     | Opcional, max 5000 caracteres                    |
| palette    | JSON array de strings hex, max 5 cores           |

### 8.3 Validacao de URLs (Seguranca)

Antes de baixar qualquer imagem por URL (celebridade, signed URLs), validar:
- Protocolo deve ser `http:` ou `https:`
- Rejeitar: `localhost`, `127.0.0.1`, `0.0.0.0`, ranges privados (`10.*`, `172.*`, `192.168.*`), metadata endpoints (`169.254.169.254`), dominios `.internal`

---

## 9. Presets de Seguranca (Safety Settings)

| Preset       | Gemini Threshold             | Descricao                             |
|--------------|------------------------------|---------------------------------------|
| `default`    | (nao envia)                  | Usa defaults do Gemini                |
| `relaxed`    | `BLOCK_ONLY_HIGH`            | Bloqueia apenas conteudo alto risco   |
| `permissive` | `BLOCK_NONE`                 | Nao bloqueia nada                     |
| `strict`     | `BLOCK_MEDIUM_AND_ABOVE`     | Bloqueia medio e acima                |

Aplicado a 4 categorias: `HARM_CATEGORY_HARASSMENT`, `HARM_CATEGORY_HATE_SPEECH`, `HARM_CATEGORY_SEXUALLY_EXPLICIT`, `HARM_CATEGORY_DANGEROUS_CONTENT`.

---

## 10. Direcoes Criativas

As 3 direcoes sao **config-driven** (texto editavel via painel admin, nao hardcoded):

| Direcao    | Proposito Tipico                                                    |
|------------|---------------------------------------------------------------------|
| `moderna`  | Estetica contemporanea, ousada, com elementos graficos marcantes    |
| `clean`    | Minimalista, espacamento generoso, tipografia elegante              |
| `retail`   | Promocional, CTAs fortes, precos destacados, urgencia visual        |

Cada direcao tambem pode ter uma **imagem de referencia** associada (path no storage) e um **modo** (`text`, `image` ou `both`) que indica se a direcao usa texto, imagem de referencia, ou ambos.

---

## 11. Checklist de Implementacao

Para replicar essa funcionalidade em outro projeto, implemente:

- [ ] **Endpoint POST multipart** que valida, faz upload de assets e cria job
- [ ] **Resposta 202** imediata com job_id
- [ ] **Processamento background** (queue, worker, waitUntil, ou equivalente)
- [ ] **Tabela de jobs** com status machine: `processing` → `completed` | `failed`
- [ ] **Tabela de config singleton** com textos de direcao, formato, e parametros do modelo
- [ ] **Object storage** com signed URLs (input temporarias, output de longa duracao)
- [ ] **Montagem de prompt** seguindo a estrutura de secoes (Secao 5)
- [ ] **Mapeamento de slots** com fallback para imagem base (Secao 6)
- [ ] **Chamada Gemini API** com `responseModalities: ['TEXT', 'IMAGE']` e inline base64
- [ ] **Retry com backoff** (1s, 3s)
- [ ] **Endpoint de polling** que retorna status + URL do output
- [ ] **Validacao de URLs** contra SSRF (Secao 8.3)
- [ ] **Tabela de celebridades** (opcional, pode ser substituida por qualquer fonte de imagens de pessoas)

---

## 12. Variaveis de Ambiente

| Variavel                             | Obrigatoria | Descricao                              |
|--------------------------------------|-------------|----------------------------------------|
| `GEMINI_API_KEY`                     | Sim         | Chave de API do Google Gemini          |
| `GEMINI_MODEL_NAME`                  | Nao         | Override do modelo (fallback: config)  |
| `GEMINI_API_BASE_URL`               | Nao         | Override da base URL (fallback: config)|
| `AI_CAMPAIGN_MAX_IMAGE_DOWNLOAD_BYTES` | Nao       | Limite de download (fallback: 15 MB)   |

---

## 13. Observabilidade

Logs estruturados em cada etapa critica:

| Evento                         | Dados                                                          |
|--------------------------------|----------------------------------------------------------------|
| `post-turbo.request`           | request_id, format, direction, has_celebrity, has_logo, etc.   |
| `post-turbo.upload-error`      | request_id, error message                                      |
| `post-turbo.generation-failed` | request_id, error, duration_ms                                 |
| `post-turbo.complete`          | request_id, job_id, duration_ms                                |
| `post-turbo.error`             | request_id, error message                                      |
