---
name: aurea-garden
description: "Especialista em Aurea Garden (Post Gen) — geracao de criativos publicitarios com IA. Cobre prompt engineering, processamento de imagem, UX de formulario, galeria, config NanoBanana e integracao Gemini. Use quando o usuario mencionar Post Gen, geracao de imagem IA, criativos, Garden, galeria de imagens, ou config NanoBanana."
---

# Aurea Garden: Post Gen — Skill Especialista

## Fontes Obrigatorias

1. `.context/modules/aurea-studio/DOC-READING-ORDER.md` — **LER PRIMEIRO**: roteamento por tipo de tarefa
2. `.context/modules/aurea-studio/README.md` — arquitetura, data flow, database schema
3. `.context/modules/aurea-studio/BUSINESS-RULES.md` — 15 regras criticas extraidas do codigo
4. `supabase/functions/<funcao-alvo>/functionSpec.md` — contrato da funcao
5. `.context/modules/aurea-studio/OPERACAO-AUREA-GARDEN.md` — runbook (troubleshooting, SQL, deploy)

## Tabela de Operacoes

| Operacao | Edge Function | Frontend | Docs |
|----------|--------------|----------|------|
| Gerar imagem do zero | `post-gen-generate` | `PostGenPage.jsx` | functionSpec, BUSINESS-RULES regras 3,5,6 |
| Listar/filtrar jobs | `list-garden-jobs` | `GardenGalleryPage.jsx` | functionSpec, BUSINESS-RULES regra 13 |
| Opcoes de formulario | `get-garden-options` | `useGardenOptions.js` | functionSpec |
| Polling de job | `get-garden-job` | PostGenPage | — |
| Config do modelo | `get/update-nanobanana-config` | NanoBananaConfig page | BUSINESS-RULES regra 5 |

## Quando Usar

- Usuario menciona Post Gen, geracao de imagem, criativo IA
- Trabalho em `src/pages/AiStep2Monitor/`
- Trabalho em `supabase/functions/post-gen-*` ou `list-garden-*` ou `get-garden-*`
- Trabalho em `supabase/functions/_shared/garden/`
- Mencao a NanoBanana, Gemini image generation, direction criativa
- Mencao a galeria de imagens, lightbox, filtros de galeria

## Quick Start (5 passos)

1. **Ler DOC-READING-ORDER** para identificar docs relevantes ao tipo de tarefa
2. **Ler BUSINESS-RULES** — especialmente regras de slot mapping (6), config-driven (5), e error codes (8)
3. **Consultar functionSpec** da funcao alvo para entender contrato de entrada/saida
4. **Verificar validate.ts** — limites e tipos aceitos sao definidos aqui, nao nas funcoes
5. **Testar via frontend** — o fluxo completo (submit → polling → resultado) e a validacao final

## Workflow Checklist

- [ ] Ler documentacao conforme DOC-READING-ORDER
- [ ] Verificar se mudanca afeta validacao compartilhada (`_shared/garden/validate.ts`)
- [ ] Verificar se mudanca afeta prompt building (`buildPostGenPrompt`)
- [ ] Verificar se mudanca afeta schema de `garden_jobs` (nova migration se necessario)
- [ ] Verificar se mudanca afeta `nanobanana_config` (config-driven)
- [ ] Testar cenarios: submit valido, submit invalido, job completado, job falhado
- [ ] Verificar logs com prefixos corretos (`[post-gen.*]`)
- [ ] Atualizar functionSpec se contrato mudou
- [ ] Atualizar BUSINESS-RULES se nova regra critica descoberta
- [ ] Atualizar checklist-geral.md se item novo implementado

## Templates

### Payload Post Gen (FormData)

```
celebrity_name: "Ana Maria"
format: "1:1"
segment: "Beleza"
subsegment: "Skincare"
business: "Clinica Estetica"
style: "moderno, clean"
prompt: "Criar post promocional para lancamento de produto..."
city: "Sao Paulo"          (opcional)
state: "SP"                (opcional)
briefing: "Foco em..."     (opcional)
logo: [File]               (opcional)
palette: '["#384ffe","#ff0058"]'  (opcional, JSON string)
```

### Response Padrao (202)

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

### Erro Padrao

```json
{
  "success": false,
  "code": "INVALID_INPUT",
  "message": "format invalido. Valores aceitos: 1:1, 4:5, 16:9, 9:16"
}
```

## Validacoes Compartilhadas (validate.ts)

| Constante | Valor |
|-----------|-------|
| `VALID_FORMATS` | `['1:1', '4:5', '16:9', '9:16']` |
| `MAX_IMAGE_SIZE` | 15 MB (15 * 1024 * 1024) |
| `MAX_PROMPT_LENGTH` | 5000 chars |
| `ALLOWED_IMAGE_TYPES` | `['image/png', 'image/jpeg', 'image/jpg', 'image/webp']` |
| `BUCKET_NAME` | `'aurea-garden-assets'` |

## Error Codes

| Code | Significado |
|------|-------------|
| `INVALID_INPUT` | Validacao de campos falhou |
| `UPLOAD_ERROR` | Falha ao salvar no bucket |
| `PROVIDER_ERROR` | Gemini retornou erro |
| `PROVIDER_TIMEOUT` | Timeout Gemini (reservado) |
| `NOT_FOUND` | Job nao encontrado |
| `INTERNAL_ERROR` | Excecao generica |

## Deploy (todas publicas)

```bash
supabase functions deploy post-gen-generate --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
supabase functions deploy list-garden-jobs --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
supabase functions deploy get-garden-options --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
supabase functions deploy get-garden-job --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```

## Observabilidade

- NUNCA logar API keys ou tokens
- Prefixos de log: `[post-gen.*]`
- Campos essenciais: `request_id`, `job_id`, `duration_ms`, `error`
- Metricas de saude: consultar SQL no runbook (OPERACAO-AUREA-GARDEN.md)
