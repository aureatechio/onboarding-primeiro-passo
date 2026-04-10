# Post Gen — Especificacao Tecnica para Replicacao

> Documentacao independente de projeto. Descreve a funcionalidade "Post Gen" (text-to-image com briefing estruturado via IA) de forma que um agente de IA consiga replica-la em qualquer stack.

---

## 1. Visao Geral

Post Gen e uma funcionalidade de **text-to-image** (prompt-to-image) que gera criativos publicitarios a partir de um briefing estruturado. Diferente do Post Turbo (que transforma uma imagem existente), o Post Gen **cria a imagem do zero** com base em informacoes do negocio: celebridade, segmento, estilo, paleta de cores e prompt do usuario.

**Padrao arquitetural:** async-first (fire-and-forget com polling).

```
Cliente                    Servidor                      IA (Gemini)
  |                           |                              |
  |-- POST (multipart/json) ->|                              |
  |<-- 202 { job_id } -------|                              |
  |                           |-- upload logo (se houver) -->|
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

### Diferenca fundamental: Post Gen vs Post Turbo

| Aspecto              | Post Gen                              | Post Turbo                           |
|----------------------|---------------------------------------|--------------------------------------|
| Modo                 | **Text-to-image** (cria do zero)      | **Image-to-image** (transforma)      |
| Input principal      | Briefing estruturado (texto)          | Imagem base (arquivo)                |
| Imagem obrigatoria   | Nenhuma                               | Sim (imagem base)                    |
| Content-Type         | `multipart/form-data` ou `application/json` | Somente `multipart/form-data` |
| Direcao criativa     | Sempre `moderna` (fixa)               | Escolhida pelo usuario               |
| Campos de briefing   | celebrity, business, segment, style   | Nao tem (usa imagem como contexto)   |

---

## 2. Contrato da API

### 2.1 Endpoint de Geracao

```
POST /post-gen-generate
Content-Type: multipart/form-data  (quando envia logo)
Content-Type: application/json     (quando nao envia logo)
```

O endpoint aceita **ambos** Content-Types. Usar `multipart/form-data` quando houver upload de arquivo (logo); usar `application/json` quando for somente texto.

#### Campos Obrigatorios

| Campo            | Tipo   | Validacao                                     |
|------------------|--------|-----------------------------------------------|
| `celebrity_name` | string | Nao pode ser vazio                            |
| `format`         | string | Enum: `1:1`, `4:5`, `16:9`, `9:16`           |
| `segment`        | string | Nao pode ser vazio                            |
| `subsegment`     | string | Nao pode ser vazio                            |
| `business`       | string | Nao pode ser vazio                            |
| `style`          | string | Nao pode ser vazio                            |
| `prompt`         | string | Nao pode ser vazio. Max 5000 caracteres       |

#### Campos Opcionais

| Campo     | Tipo   | Descricao                                                       |
|-----------|--------|-----------------------------------------------------------------|
| `logo`    | File   | Logo da marca. Max 15 MB. PNG/JPEG/WebP. Somente via multipart |
| `palette` | string | JSON array de hex colors. Max 5 cores. Ex: `["#384ffe"]`       |
| `city`    | string | Cidade do negocio (contexto geografico)                         |
| `state`   | string | Estado do negocio                                               |
| `briefing`| string | Contexto adicional livre sobre o negocio                        |

#### Exemplo — Request JSON (sem logo)

```json
{
  "celebrity_name": "Anitta",
  "format": "4:5",
  "segment": "Alimentacao",
  "subsegment": "Pizzaria",
  "business": "Pizza do Zé",
  "style": "Moderno e vibrante",
  "prompt": "Criar um criativo de promocao de pizza com a celebridade segurando uma fatia",
  "palette": ["#ff0000", "#ffcc00", "#ffffff"],
  "city": "Sao Paulo",
  "state": "SP"
}
```

#### Exemplo — Request Multipart (com logo)

```
POST /post-gen-generate
Content-Type: multipart/form-data; boundary=----FormBoundary

------FormBoundary
Content-Disposition: form-data; name="celebrity_name"
Anitta
------FormBoundary
Content-Disposition: form-data; name="format"
4:5
------FormBoundary
Content-Disposition: form-data; name="prompt"
Criar um criativo de promocao...
------FormBoundary
Content-Disposition: form-data; name="logo"; filename="logo.png"
Content-Type: image/png
(bytes)
------FormBoundary
Content-Disposition: form-data; name="palette"
["#ff0000","#ffcc00"]
------FormBoundary--
```

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

| Codigo HTTP | Error Code     | Quando                                        |
|-------------|----------------|-----------------------------------------------|
| 400         | INVALID_INPUT  | Campo obrigatorio ausente ou invalido         |
| 500         | UPLOAD_ERROR   | Falha ao salvar logo no storage               |
| 500         | INTERNAL_ERROR | Falha ao criar job no banco                   |

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
    "tool": "post-gen",
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
    "tool": "post-gen",
    "output_image_url": "https://signed-url...",
    "duration_ms": 15000,
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
    "tool": "post-gen",
    "error_code": "PROVIDER_ERROR",
    "error_message": "descricao",
    "duration_ms": 8000
  }
}
```

**Polling recomendado:** a cada 3 segundos ate `status !== 'processing'`.

---

## 3. Modelo de Dados

### 3.1 Tabela `garden_jobs`

Mesma tabela usada por Post Turbo. O campo `tool` diferencia os registros.

| Coluna              | Tipo        | Descricao                                              |
|---------------------|-------------|--------------------------------------------------------|
| `id`                | uuid (PK)   | ID do job                                              |
| `tool`              | text        | Sempre `'post-gen'` para essa feature                  |
| `status`            | text        | `processing` → `completed` ou `failed`                 |
| `input_prompt`      | text        | Prompt do usuario                                      |
| `input_format`      | text        | Formato solicitado (`1:1`, `4:5`, etc.)                |
| `input_model`       | text        | Sempre `'nanobanana'`                                  |
| `input_metadata`    | jsonb       | Briefing estruturado (ver abaixo)                      |
| `source_image_path` | text        | Path do logo no storage (ou null se nao enviado)       |
| `output_image_path` | text        | Path da imagem gerada (apos sucesso)                   |
| `output_image_url`  | text        | Signed URL do output (expira em 7 dias)                |
| `error_code`        | text        | Codigo do erro (se falhou)                             |
| `error_message`     | text        | Mensagem de erro (max 500 chars)                       |
| `duration_ms`       | integer     | Tempo total de processamento                           |
| `request_id`        | uuid        | ID de rastreamento da requisicao                       |
| `created_at`        | timestamptz | Auto-gerado                                            |

#### Estrutura de `input_metadata`

```json
{
  "celebrity_name": "Anitta",
  "segment": "Alimentacao",
  "subsegment": "Pizzaria",
  "business": "Pizza do Zé",
  "style": "Moderno e vibrante",
  "city": "Sao Paulo",
  "state": "SP",
  "briefing": "Contexto adicional ou null",
  "palette": ["#ff0000", "#ffcc00"]
}
```

### 3.2 Tabela de Configuracao (Singleton)

Mesma tabela de configuracao usada pelo Post Turbo. Os campos relevantes para Post Gen:

| Campo                    | Tipo    | Descricao                                                    |
|--------------------------|---------|--------------------------------------------------------------|
| `gemini_model_name`      | text    | Modelo Gemini (ex: `gemini-3-pro-image-preview`)             |
| `gemini_api_base_url`    | text    | Base URL da API Gemini                                       |
| `max_retries`            | integer | Tentativas apos falha (padrao: 2)                            |
| `temperature`            | float   | Temperatura do modelo                                        |
| `top_p`                  | float   | Top-P sampling                                               |
| `top_k`                  | integer | Top-K sampling                                               |
| `safety_preset`          | text    | `default`, `relaxed`, `permissive`, `strict`                 |
| `use_system_instruction` | boolean | Se `true`, envia `global_rules` como system instruction      |
| `global_rules`           | text    | System instruction do modelo                                 |
| `direction_moderna`      | text    | Texto da direcao criativa (Post Gen usa sempre esta)         |
| `format_1_1`             | text    | Instrucao de formato 1:1                                     |
| `format_4_5`             | text    | Instrucao de formato 4:5                                     |
| `format_16_9`            | text    | Instrucao de formato 16:9                                    |
| `format_9_16`            | text    | Instrucao de formato 9:16                                    |

### 3.3 Storage (Object Storage)

**Estrutura de paths:**

```
gen/{jobId}/logo.{ext}      # Logo da marca (se enviado)
gen/{jobId}/output.png       # Imagem gerada (output final)
```

**Signed URLs:**
- Logo (durante processamento): 600 segundos (10 min)
- Output (entregue ao cliente): 7 dias

---

## 4. Workflow Completo (Passo a Passo)

### Fase 1 — Recebimento e Parsing (sincrono)

1. Verificar `Content-Type`:
   - Se `multipart/form-data` → parsear FormData, extrair campos texto e arquivo `logo`
   - Se `application/json` → parsear body JSON
   - Ambos sao aceitos (diferente do Post Turbo que exige multipart)
2. Extrair `palette` (JSON string → array)

### Fase 2 — Validacao (sincrono)

3. Validar 7 campos obrigatorios:
   - `celebrity_name`: nao vazio
   - `format`: enum `1:1`, `4:5`, `16:9`, `9:16`
   - `segment`: nao vazio
   - `subsegment`: nao vazio
   - `business`: nao vazio
   - `style`: nao vazio
   - `prompt`: nao vazio, max 5000 caracteres
4. Validar `logo` se presente: max 15 MB, PNG/JPEG/WebP
5. Se houver erros, retornar todos concatenados em uma unica resposta 400

### Fase 3 — Upload e Job (sincrono)

6. Gerar `jobId` (UUID) e `requestId` (UUID)
7. Se logo presente: upload para `gen/{jobId}/logo.{ext}`
8. Inserir registro na tabela `garden_jobs` com status `processing`, `tool: 'post-gen'`
9. Retornar **202 Accepted** com `job_id`, `status`, `request_id`

### Fase 4 — Geracao da Imagem (background / async)

10. Carregar configuracao do singleton
11. Se logo presente: gerar signed URL temporaria (10 min)
12. Montar o prompt enriquecido (ver Secao 5)
13. Mapear os slots de imagem para a chamada ao modelo (ver Secao 6)
14. Chamar a API Gemini com retry (ver Secao 7)
15. Se sucesso:
    - Upload do output para `gen/{jobId}/output.png`
    - Gerar signed URL de 7 dias para o output
    - Atualizar job: `status = 'completed'`
16. Se falha:
    - Atualizar job: `status = 'failed'`, salvar `error_code` e `error_message`

---

## 5. Engenharia de Prompt

### 5.1 Estrutura do Prompt

O prompt final e composto por secoes separadas por `\n\n---\n\n`:

```
CREATIVE BRIEF:
- Celebrity: {celebrity_name}
- Business: {business}
- Segment: {segment} / {subsegment}
- Style: {style}
- Location: {city}, {state}
- Additional context: {briefing}

---

BRAND PALETTE: #cor1, #cor2, #cor3
(somente se palette nao vazia)

---

CREATIVE DIRECTION:
{texto da direcao 'moderna' carregado da config}

---

FORMAT ({format}):
{instrucao de formato carregada da config}
(se nao houver instrucao na config, apenas: FORMAT: {format})

---

USER PROMPT:
{prompt do usuario}

---

MANDATORY: Generate a professional advertising creative following ALL instructions above. Text must be in Brazilian Portuguese. Output a single image.
```

### 5.2 Diferenca de Prompt: Post Gen vs Post Turbo

| Aspecto               | Post Gen                                           | Post Turbo                                      |
|-----------------------|----------------------------------------------------|-------------------------------------------------|
| Primeira secao        | `CREATIVE BRIEF` (briefing estruturado)            | `CREATIVE DIRECTION` (texto da direcao)         |
| Direcao criativa      | Sempre `direction_moderna`                         | Escolhida pelo usuario (moderna/clean/retail)   |
| Campo de celebridade  | No briefing (texto)                                | Secao separada `CELEBRITY:`                     |
| Instrucao final       | "Generate a professional advertising creative..."  | "Enhance and improve this base image..."        |

**Ponto critico:** A instrucao final do Post Gen diz "Generate" (criar do zero), enquanto a do Post Turbo diz "Enhance and improve this base image" (transformar existente). Isso ancora o modelo na modalidade correta.

### 5.3 Secao CREATIVE BRIEF — Detalhamento

O briefing e a secao mais importante do Post Gen. Ele contextualiza o modelo sobre o negocio:

```
CREATIVE BRIEF:
- Celebrity: {nome da celebridade que deve aparecer no criativo}
- Business: {nome do negocio/marca}
- Segment: {segmento} / {subsegmento de atuacao}
- Style: {estilo visual desejado, ex: "Moderno e vibrante"}
- Location: {cidade}, {estado}         ← somente se informado
- Additional context: {briefing livre}  ← somente se informado
```

Campos `Location` e `Additional context` sao condicionais — omitidos se vazios.

### 5.4 Direcao Criativa Fixa

Post Gen **sempre** usa a direcao `moderna`. Nao ha selecao de direcao pelo usuario. O texto e carregado da config (campo `direction_moderna`).

**Racional:** Como Post Gen cria do zero (sem imagem de referencia), a direcao moderna foi escolhida como default por ser a mais versátil para criativos publicitarios.

### 5.5 System Instruction (Opcional)

Identico ao Post Turbo: se `use_system_instruction = true`, o campo `global_rules` e enviado como system instruction separada do prompt.

### 5.6 Instrucao Final Obrigatoria

```
MANDATORY: Generate a professional advertising creative following ALL instructions above. Text must be in Brazilian Portuguese. Output a single image.
```

Essa instrucao ancora o modelo na tarefa de criacao de criativo publicitario do zero.

---

## 6. Mapeamento de Slots de Imagem

Post Gen e fundamentalmente **text-to-image**, mas a API do Gemini espera slots de imagem. O mapeamento usa placeholders quando nao ha imagens reais:

| Slot (ordem de envio) | Nome            | Conteudo                                                    |
|-----------------------|-----------------|-------------------------------------------------------------|
| 1                     | Celebrity Slot  | Logo do cliente **OU** placeholder 1x1 px                   |
| 2                     | Logo Slot       | Logo do cliente **OU** placeholder 1x1 px                   |
| 3                     | Campaign Slot   | Nao enviado (undefined)                                      |
| 4                     | Reference Slot  | Nao enviado (undefined)                                      |

**Regras de fallback:**
- Se o usuario enviou logo → slots 1 e 2 recebem o logo
- Se nao enviou logo → slots 1 e 2 recebem um placeholder minimo (imagem 1x1 pixel)
- Slots 3 e 4 nunca sao usados no Post Gen

**Consequencia:** No cenario com logo, o modelo recebe a mesma imagem 2 vezes (slots 1 e 2), reforçando o logo como referencia visual. No cenario sem logo, o modelo recebe placeholders descartaveis e gera baseado puramente no texto.

### Diferenca de Slots: Post Gen vs Post Turbo

| Slot | Post Gen                   | Post Turbo                              |
|------|----------------------------|-----------------------------------------|
| 1    | Logo ou placeholder        | Celebridade ou imagem base              |
| 2    | Logo ou placeholder        | Logo ou imagem base                     |
| 3    | Nao usado                  | Produto (se presente)                   |
| 4    | Nao usado                  | Sempre imagem base                      |

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
      { "inlineData": { "mimeType": "image/png", "data": "{base64 logo ou placeholder}" } },
      { "inlineData": { "mimeType": "image/png", "data": "{base64 logo ou placeholder}" } },
      { "text": "{prompt completo}" }
    ]
  }],
  "generationConfig": {
    "responseModalities": ["TEXT", "IMAGE"],
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
- Menos imagens que Post Turbo (2 vs ate 4)
- Sem `imageConfig.aspectRatio` por padrao (pode ser adicionado via config)
- Ordem das parts: imagens primeiro, texto por ultimo
- Imagens como `inlineData` em base64

### 7.4 Extracao da Resposta

Identica ao Post Turbo:

1. Acessar `candidates[0].content.parts`
2. Iterar pelas parts procurando `inlineData.data`
3. Decodificar base64 para bytes
4. Se nenhuma part tiver `inlineData`, considerar falha

### 7.5 Retry

| Parametro    | Valor Padrao |
|--------------|--------------|
| Max retries  | 2            |
| Delay 1      | 1000ms       |
| Delay 2      | 3000ms       |

Identico ao Post Turbo. Configuravel via `max_retries` na config.

---

## 8. Validacoes

### 8.1 Campos Obrigatorios

| Campo            | Tipo   | Regra                               |
|------------------|--------|-------------------------------------|
| `celebrity_name` | string | Nao vazio                           |
| `format`         | string | Enum: `1:1`, `4:5`, `16:9`, `9:16` |
| `segment`        | string | Nao vazio                           |
| `subsegment`     | string | Nao vazio                           |
| `business`       | string | Nao vazio                           |
| `style`          | string | Nao vazio                           |
| `prompt`         | string | Nao vazio, max 5000 caracteres      |

### 8.2 Logo (Opcional)

| Regra             | Valor                                    |
|-------------------|------------------------------------------|
| Tipos aceitos     | `image/png`, `image/jpeg`, `image/webp`  |
| Tamanho maximo    | 15 MB (15 * 1024 * 1024 bytes)           |

### 8.3 Validacao de URLs (Seguranca)

Aplicada ao baixar imagens (logo signed URL, placeholder):
- Protocolo deve ser `http:` ou `https:`
- Rejeitar: `localhost`, `127.0.0.1`, `0.0.0.0`, ranges privados, metadata endpoints, dominios `.internal`

---

## 9. Presets de Seguranca (Safety Settings)

Identicos ao Post Turbo:

| Preset       | Gemini Threshold         | Descricao                           |
|--------------|--------------------------|-------------------------------------|
| `default`    | (nao envia)              | Usa defaults do Gemini              |
| `relaxed`    | `BLOCK_ONLY_HIGH`        | Bloqueia apenas alto risco          |
| `permissive` | `BLOCK_NONE`             | Nao bloqueia nada                   |
| `strict`     | `BLOCK_MEDIUM_AND_ABOVE` | Bloqueia medio e acima              |

---

## 10. Campos de Briefing — Guia Semantico

Para que o agente entenda o proposito de cada campo ao replicar:

| Campo            | Semantica                                                              | Exemplo                        |
|------------------|------------------------------------------------------------------------|--------------------------------|
| `celebrity_name` | Pessoa publica/celebridade que deve aparecer no criativo               | "Anitta", "Neymar"            |
| `business`       | Nome do negocio, marca ou empresa                                      | "Pizza do Zé", "Loja Aurora"  |
| `segment`        | Segmento de mercado principal                                          | "Alimentacao", "Moda"         |
| `subsegment`     | Sub-segmento ou nicho especifico                                       | "Pizzaria", "Moda Feminina"   |
| `style`          | Estilo visual desejado para o criativo                                 | "Moderno e vibrante", "Clean" |
| `city`           | Cidade do negocio (contexto geografico para o criativo)                | "Sao Paulo", "Recife"         |
| `state`          | Estado (UF)                                                            | "SP", "PE"                    |
| `briefing`       | Contexto adicional livre — informacoes extras sobre o negocio/campanha | "Inauguracao da filial norte"  |
| `prompt`         | Instrucoes diretas do usuario para a geracao do criativo               | "Fazer promo de pizza..."      |
| `palette`        | Cores da marca em hex                                                   | `["#ff0000", "#ffcc00"]`      |

---

## 11. Checklist de Implementacao

Para replicar essa funcionalidade em outro projeto:

- [ ] **Endpoint POST** que aceita multipart (com logo) E JSON (sem logo)
- [ ] **7 campos obrigatorios** de briefing + validacao
- [ ] **Upload de logo** opcional para object storage
- [ ] **Resposta 202** imediata com job_id
- [ ] **Processamento background** (queue, worker, waitUntil, ou equivalente)
- [ ] **Tabela de jobs** com status machine: `processing` → `completed` | `failed`
- [ ] **Tabela de config singleton** com texto de direcao, instrucoes de formato, e parametros do modelo
- [ ] **Montagem de prompt** com CREATIVE BRIEF estruturado (Secao 5)
- [ ] **Mapeamento de slots** com logo ou placeholder 1x1 (Secao 6)
- [ ] **Chamada Gemini API** com `responseModalities: ['TEXT', 'IMAGE']` e inline base64
- [ ] **Retry com backoff** (1s, 3s)
- [ ] **Endpoint de polling** que retorna status + URL do output
- [ ] **Validacao de URLs** contra SSRF

---

## 12. Variaveis de Ambiente

| Variavel                                | Obrigatoria | Descricao                              |
|-----------------------------------------|-------------|----------------------------------------|
| `GEMINI_API_KEY`                        | Sim         | Chave de API do Google Gemini          |
| `GEMINI_MODEL_NAME`                     | Nao         | Override do modelo (fallback: config)  |
| `GEMINI_API_BASE_URL`                   | Nao         | Override da base URL (fallback: config)|
| `AI_CAMPAIGN_MAX_IMAGE_DOWNLOAD_BYTES`  | Nao         | Limite de download (fallback: 15 MB)   |

---

## 13. Observabilidade

Logs estruturados em cada etapa critica:

| Evento                        | Dados                                                       |
|-------------------------------|-------------------------------------------------------------|
| `post-gen.request`            | request_id, format, celebrity, has_logo, palette_count, prompt_length |
| `post-gen.logo-upload-error`  | request_id, error message                                   |
| `post-gen.insert-error`       | request_id, error message                                   |
| `post-gen.generation-failed`  | request_id, error, duration_ms                              |
| `post-gen.output-upload-error`| request_id, error message                                   |
| `post-gen.complete`           | request_id, job_id, duration_ms                             |
| `post-gen.error`              | request_id, error message (excecao generica)                |
