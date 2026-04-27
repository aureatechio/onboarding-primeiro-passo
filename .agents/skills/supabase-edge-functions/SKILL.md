---
name: supabase-edge-functions
description: "Especialista em Supabase Edge Functions deste projeto. Use sempre que o usuario mencionar supabase/functions, Edge Function, deploy de function, --no-verify-jwt, JWT, service role, CORS, functionSpec, _shared, adminFetch, chamadas protegidas/publicas, logs ou erros de functions."
---

# Supabase Edge Functions - Publicas, Protegidas e Deploy

## Objetivo

Diagnosticar, revisar, implementar e preparar deploys de Edge Functions do
projeto sem confundir funcoes publicas do onboarding com funcoes protegidas do
dashboard interno.

## Leitura obrigatoria

Antes de alterar ou deployar uma funcao:

1. `docs/context/supabase/README.md`
2. `docs/context/supabase/BUSINESS-RULES.md`
3. `docs/context/supabase/EDGE-FUNCTIONS.md`
4. `supabase/functions/<function>/functionSpec.md`, quando existir
5. `supabase/functions/<function>/index.ts`
6. `_shared/` importado pela funcao

Para funcao de Auth/RBAC ou usuarios:

1. `docs/context/supabase/AUTH-RBAC.md`
2. `docs/context/authentication/README.md`
3. `docs/context/user-management/README.md`

## Classificacao obrigatoria

Antes de modificar ou deployar, classifique a funcao:

| Tipo | Deploy | Guard |
| --- | --- | --- |
| Publica onboarding | `--no-verify-jwt` | `compra_id`/payload validado |
| Publica status/config | `--no-verify-jwt` | Somente leitura ou segredo proprio |
| Protegida dashboard | sem `--no-verify-jwt` | JWT + `_shared/rbac.ts` |
| Interna service role | conforme spec | Bearer service role ou chamada backend |

Se a classificacao do codigo divergir da `functionSpec.md`, trate como risco e
corrija documentacao/codigo antes de deployar.

## Padroes de implementacao

### Funcao protegida por usuario humano

Use `_shared/rbac.ts`:

```ts
const authResult = await requireRole(req, ['admin'])
if (isRbacError(authResult)) return authResult.error
```

Use `authResult.serviceClient` para operacoes privilegiadas.

### Funcao admin-only

`requireAdmin(req)` e aceitavel quando a funcao e exclusivamente admin.

### Funcao publica

Validar entrada com rigor:

- UUIDs.
- Campos obrigatorios.
- Tamanho de payload/base64.
- Tipo MIME quando houver upload.
- Idempotencia quando houver retry.

Funcao publica com service role precisa minimizar dados retornados.

## CORS

Confirmar headers necessarios:

- `authorization`
- `apikey`
- `content-type`
- `x-admin-password`, se a spec ainda usar segredo proprio
- headers especificos do fluxo, quando existirem

Preferir `_shared/cors.ts` quando aplicavel.

## Service role

- Permitida apenas dentro da Edge Function ou script seguro.
- Nunca retornar key, token ou segredo em resposta/log.
- Nunca aceitar token service role como identidade de usuario humano em
  `requireAuth()`.

## Dependencias de banco

Ao mexer em queries:

1. Identifique tabelas lidas/escritas.
2. Classifique ownership via `docs/context/supabase/DATABASE-INVENTORY.md`.
3. Para CRM compartilhado, evite escrita salvo contrato explicito.
4. Para tabelas do app, atualize docs se o contrato mudar.

## Deploy checklist

Antes de deployar:

1. Confirmar tipo da funcao.
2. Confirmar flags corretas.
3. Confirmar env vars necessarias.
4. Rodar testes Deno quando existirem.
5. Confirmar output `Deployed Functions on project`.

Comandos:

```bash
supabase functions deploy <name> --project-ref awqtzoefutnfmnbomujt
```

```bash
supabase functions deploy <name> --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```

Use `--no-verify-jwt` somente para funcoes publicas ou excecoes documentadas.

## Verificacao

```bash
deno test supabase/functions/<function>/ --allow-env --allow-net --allow-read
```

```bash
deno test supabase/functions/_shared/ --allow-env --allow-net --allow-read
```

Para frontend que chama a funcao:

```bash
npm run lint
npm run build
```

## Saida esperada

Ao responder sobre Edge Functions, inclua:

1. Funcao alvo.
2. Classificacao: publica/protegida/interna.
3. Guard usado ou ausente.
4. Tabelas/buckets tocados e ownership.
5. Flag de deploy correta.
6. Testes/verificacoes executados ou pendentes.

