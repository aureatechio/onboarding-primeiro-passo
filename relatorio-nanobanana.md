# Relatório: Módulo NanoBanana — Análise de Integração, Engenharia de Contexto e SDD

**Data:** 2026-04-06
**Autor:** Claude (análise automatizada)
**Escopo:** Módulo NanoBanana do repositório `primeiro-passo-app`

---

## 1. Visão Geral

O NanoBanana é o módulo de **configuração e geração de criativos visuais** do AI Campaign Pipeline. Ele atua como camada de controle que permite parametrizar como a Gemini API gera imagens de marketing para campanhas de clientes. O nome "NanoBanana" é o codinome interno do gerador de criativos.

O módulo gerencia três eixos de criação visual (categorias de direção criativa): **moderna** (dark & bold), **clean** (light & editorial), e **retail** (hard sell & impact). Cada categoria pode ser configurada via texto, imagem de referência, ou ambos.

---

## 2. Inventário de Arquivos

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Edge Function | `get-nanobanana-config/index.ts` | Leitura pública da config + signed URLs |
| Edge Function | `update-nanobanana-config/index.ts` | Atualização (PATCH) com upload de imagens |
| Edge Function | `read-nanobanana-reference/index.ts` | Leitura de imagem via Gemini Vision → texto |
| Pipeline | `create-ai-campaign-job/index.ts` | Consome config NanoBanana para enriquecer prompts |
| Pipeline | `post-gen-generate/index.ts` | Geração individual de post — usa config NanoBanana |
| Pipeline | `post-turbo-generate/index.ts` | Geração turbo de post — usa config NanoBanana |
| Frontend | `NanoBananaConfigPage.jsx` | UI completa de configuração (4 abas) |
| Frontend | `MonitorLayout.jsx` | Navegação lateral com item NanoBanana IA |
| Frontend | `App.jsx` | Registro da rota `/ai-step2/nanobanana-config` |
| Documentação | `ai-step2/CONTRACT.md` (seção 9.1) | Contrato de dados e validação |
| Documentação | `ai-step2/PRD.md` (RF-14, RF-15) | Requisitos funcionais |

**Total: 11 arquivos** (3 edge functions dedicadas, 3 funções consumidoras no pipeline, 3 frontend, 2 docs)

---

## 3. Arquitetura do Módulo

```
┌─────────────────────────────┐
│   NanoBananaConfigPage.jsx  │  ← UI (4 abas: Provider, Rules, Direção, Formatos)
│   (React SPA)               │
└──────┬──────────┬───────────┘
       │          │
       │ GET      │ PATCH (JSON ou multipart/form-data)
       │          │
       ▼          ▼
┌─────────────┐  ┌───────────────────┐  ┌──────────────────────┐
│ get-nanoban │  │ update-nanobanana │  │ read-nanobanana-ref  │
│ ana-config  │  │ -config           │  │ erence               │
│ (público)   │  │ (público)         │  │ (público)            │
└──────┬──────┘  └────────┬──────────┘  └──────────┬───────────┘
       │                  │                        │
       │  SELECT *        │  UPDATE + Storage      │  Gemini Vision API
       ▼                  ▼  upload                 ▼
┌──────────────────────────────────────────────────────────┐
│            Supabase                                       │
│  ┌─────────────────────┐  ┌─────────────────────────┐    │
│  │  nanobanana_config  │  │  nanobanana-references   │    │
│  │  (tabela única)     │  │  (Storage bucket)        │    │
│  └─────────────────────┘  └─────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
       │
       │  Consumidores (pipeline)
       ▼
┌─────────────────────────────────────────────┐
│  create-ai-campaign-job                      │
│  post-gen-generate                           │
│  post-turbo-generate                         │
│                                              │
│  Leem nanobanana_config para:                │
│  - global_rules → instruções do sistema      │
│  - direction_<cat> → direção por categoria   │
│  - format_<ratio> → instruções de formato    │
│  - gemini_model_name → modelo a usar         │
│  - max_retries, worker_batch_size → tuning   │
└─────────────────────────────────────────────┘
```

---

## 4. Modelo de Dados

A tabela `nanobanana_config` é singleton (uma única row). Campos principais:

**Provider:**
- `gemini_model_name` (default: `gemini-2.0-flash-exp`)
- `gemini_api_base_url` (default: `https://generativelanguage.googleapis.com`)
- `max_retries` (0–10), `worker_batch_size` (1–12)
- `url_expiry_seconds` (3600–2592000), `max_image_download_bytes` (1MB–50MB)

**Regras globais:**
- `global_rules` — prompt de sistema injetado em toda geração
- `global_rules_version`, `prompt_version` — versionamento semântico

**Direções criativas (×3 categorias: moderna, clean, retail):**
- `direction_<cat>` — texto da direção criativa (obrigatório)
- `direction_<cat>_mode` — `text` | `image` | `both`
- `direction_<cat>_image_path` — path no bucket `nanobanana-references`
- `direction_<cat>_image_url` — signed URL temporária (gerada on-the-fly, não persistida)

**Formatos de saída:**
- `format_1_1`, `format_4_5`, `format_16_9`, `format_9_16` — instruções de formato por aspect ratio

**Storage:** Bucket `nanobanana-references` com paths organizados por `<categoria>/<timestamp>_<uuid>_<filename>`.

---

## 5. Análise da Engenharia de Contexto

### 5.1. Como a config NanoBanana alimenta o pipeline

O fluxo de contexto segue este caminho:

1. **`create-ai-campaign-job`** carrega a config com `loadNanoBananaConfig()` (com cache em memória via `_cachedNbConfig`).
2. Chama `resolveGroupDirections()` que, para cada grupo (moderna/clean/retail), verifica o `direction_mode`:
   - `text` → usa apenas o texto da `direction_<cat>`
   - `image` ou `both` → gera signed URL da imagem de referência e inclui como contexto visual
3. Constrói um `buildReferenceSignature()` — hash JSON que agrupa direction + mode + image_path por categoria, usado para idempotência.
4. Chama `resolveDirectionPromptText()` — extrai o texto limpo da direção criativa, usado para compor o prompt final.
5. Os prompts são passados para workers `generate-ai-campaign-image` que chamam a Gemini API com o contexto completo.

### 5.2. PostGen e PostTurbo

Ambos `post-gen-generate` e `post-turbo-generate` têm sua própria cópia da interface `NanoBananaDbConfig` e da função `loadNanoBananaConfig()`. O prompt é construído assim:

```
[Direção criativa do grupo] +
[Global Rules] +
[Instruções de formato (format_1_1, etc.)] +
[Paleta de cores do cliente] +
[Nome da celebridade] +
[Prompt do usuário (se houver)]
```

### 5.3. Leitura assistida por IA (read-nanobanana-reference)

A function `read-nanobanana-reference` é um mini-pipeline isolado:
- Recebe imagem + categoria via multipart
- Envia para Gemini Vision com prompt de Diretor de Arte Sênior
- Retorna direção criativa estruturada (Background, Celebrity, Layout, Typography, Reference mood)
- O frontend substitui o texto da categoria com o resultado

Isso cria um loop de feedback: **imagem de referência → IA extrai direção textual → texto é salvo → texto alimenta geração de criativos**.

---

## 6. Análise do SDD (Spec Driven Development)

### 6.1. Cobertura SDD

| Função | Tem `functionSpec.md`? |
|--------|----------------------|
| `get-nanobanana-config` | **NÃO** |
| `update-nanobanana-config` | **NÃO** |
| `read-nanobanana-reference` | **NÃO** |

**Nenhuma das 3 edge functions NanoBanana possui `functionSpec.md`.** A convenção SDD do repositório (documentada no CLAUDE.md) é usada extensivamente no módulo OMIE (9 functions com specs), mas foi completamente ignorada no módulo NanoBanana.

### 6.2. Documentação existente como substituto

A especificação do NanoBanana está dispersa em dois documentos:

- **`ai-step2/CONTRACT.md` (seção 9.1):** Define a estrutura do banco, regras de validação do endpoint de update, e o workflow de leitura assistida. Funciona como um "proto-spec" parcial, mas não segue o formato de `functionSpec.md`.
- **`ai-step2/PRD.md` (RF-14, RF-15):** Define requisitos funcionais de upload de imagem e leitura por IA, mas a nível de produto, não de implementação.

### 6.3. Gap Analysis — SDD

O que está faltando comparado ao padrão SDD do módulo OMIE:

1. **Contrato de entrada/saída formal** — Os endpoints NanoBanana não têm seus payloads de request/response documentados em spec. A validação existe no código mas não está formalizada.
2. **Cenários de erro enumerados** — Os códigos de erro (VALIDATION_ERROR, INVALID_MULTIPART, etc.) foram implementados ad-hoc sem spec prévia.
3. **Regras de negócio explícitas** — Por exemplo: "texto de direção por categoria é obrigatório para salvar" está no CONTRACT.md mas não numa spec dedicada.
4. **Testes automatizados** — Não encontrei testes Deno para nenhuma das 3 functions NanoBanana.

---

## 7. Análise do Frontend

A `NanoBananaConfigPage.jsx` é uma página completa com 4 abas:

| Aba | Campos |
|-----|--------|
| **Provider** | `gemini_model_name`, `gemini_api_base_url`, `max_retries`, `worker_batch_size`, `url_expiry_seconds`, `max_image_download_bytes` |
| **Global Rules** | `global_rules`, `global_rules_version` |
| **Direção Criativa** | 3× (moderna/clean/retail): texto, mode (text/both/image), upload de imagem, botão "Ler imagem" |
| **Formatos & Versão** | `format_1_1`, `format_4_5`, `format_16_9`, `format_9_16`, `prompt_version` |

O frontend implementa dirty-checking com `JSON.stringify(form) !== JSON.stringify(original)` e envia PATCH com apenas os campos alterados. Quando há upload de imagem, alterna de JSON para multipart/form-data automaticamente.

---

## 8. Pontos de Atenção e Recomendações

### Segurança
- **Todas as 3 edge functions NanoBanana são públicas** (sem autenticação). Isso é intencional conforme o código, mas significa que qualquer pessoa pode alterar a configuração de geração de criativos. Recomendação: adicionar `requireAuth` pelo menos no `update-nanobanana-config` e `read-nanobanana-reference`.

### Duplicação de código
- A interface `NanoBananaDbConfig` e a função `loadNanoBananaConfig()` estão **duplicadas em 3 arquivos** (`create-ai-campaign-job`, `post-gen-generate`, `post-turbo-generate`). Não existe um shared module em `_shared/` para NanoBanana. Recomendação: extrair para `_shared/nanobanana/config.ts`.

### SDD
- Criar `functionSpec.md` para as 3 edge functions NanoBanana, seguindo o padrão dos módulos OMIE, formalizando payloads, validações e cenários de erro.

### Testes
- Não foram encontrados testes para nenhuma das edge functions NanoBanana. Recomendação: criar testes Deno cobrindo pelo menos os cenários de validação do `update-nanobanana-config`.

### Cache
- O `create-ai-campaign-job` usa cache em memória (`_cachedNbConfig`) sem TTL. Em ambiente de Edge Function (cold start frequente), isso é aceitável, mas pode causar stale data se a function ficar quente por muito tempo.

---

## 9. Resumo Executivo

O módulo NanoBanana é funcional e bem integrado ao pipeline de geração de criativos, com uma UI operacional completa. Sua principal contribuição é permitir que operadores ajustem direções criativas, regras globais e parâmetros do modelo Gemini sem deploy de código.

Os gaps mais significativos são: ausência total de SDD (`functionSpec.md`), duplicação de interface/loader em 3 funções do pipeline, endpoints públicos sem autenticação no update, e ausência de testes automatizados. A engenharia de contexto (como a config alimenta os prompts) é sólida e bem pensada, com suporte a múltiplos modos de direção (text/image/both) e um loop de feedback via leitura de imagem por IA.
