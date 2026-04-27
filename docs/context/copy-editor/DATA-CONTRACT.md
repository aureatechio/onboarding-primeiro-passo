# Copy Editor - Contrato de Dados

## Exports de copy

O Copy Editor trabalha com os exports de `src/copy.js` mapeados em
`ETAPAS_META`.

| etapaId interno | exportKey | Fluxo publico |
| --- | --- | --- |
| `etapa1` | `ETAPA1` | `Etapa1Hero` |
| `etapa2` | `ETAPA2` | `Etapa2` |
| `etapa3` | `ETAPA3` | `Etapa3` |
| `etapa4` | `ETAPA4` | `Etapa4` |
| `etapa5` | `ETAPA5` | `Etapa5` |
| `etapa6` | `ETAPA6` | `Etapa6` |
| `etapa62` | `ETAPA62` | `Etapa62` |
| `etapaFinal` | `ETAPA_FINAL` | `EtapaFinal` |

## Tabela `onboarding_copy`

Migration de origem:

`supabase/migrations/20260414100000_create_onboarding_copy.sql`

| Coluna | Tipo | Contrato |
| --- | --- | --- |
| `id` | `uuid` | PK da linha singleton |
| `content` | `jsonb` | Overrides publicados por `exportKey` |
| `version` | `integer` | Versao publicada atual, inicia em `0` |
| `published_by` | `text` | Email ou user id do admin que publicou |
| `updated_at` | `timestamptz` | Timestamp do ultimo update |

Regras:

- Existe uma linha operacional.
- Fluxo normal usa `UPDATE`.
- `content = {}` e `version = 0` significam fallback total para `src/copy.js`.

## Tabela `onboarding_copy_versions`

| Coluna | Tipo | Contrato |
| --- | --- | --- |
| `id` | `uuid` | PK do registro historico |
| `version` | `integer` | Versao gerada pela publicacao |
| `content` | `jsonb` | Diff enviado naquela publicacao |
| `changed_etapas` | `text[]` | Lista de `exportKey` alteradas |
| `published_by` | `text` | Email ou user id do admin |
| `notes` | `text` | Observacao opcional do modal |
| `created_at` | `timestamptz` | Timestamp do registro |

O historico guarda o diff da publicacao, nao necessariamente o snapshot completo
final.

## Edge Function `get-onboarding-copy`

Tipo: publica, somente leitura.

Deploy esperado:

```bash
supabase functions deploy get-onboarding-copy --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```

Request:

```http
GET /functions/v1/get-onboarding-copy
```

Response esperada:

```json
{
  "success": true,
  "content": {},
  "version": 0,
  "published_by": "system",
  "updated_at": null
}
```

Uso:

- `src/context/CopyContext.jsx` no onboarding publico.
- `src/pages/CopyEditor/useCopyEditor.js` no editor interno.

## Edge Function `update-onboarding-copy`

Tipo: protegida por JWT + RBAC `admin`.

Deploy esperado:

```bash
supabase functions deploy update-onboarding-copy --project-ref awqtzoefutnfmnbomujt
```

Request:

```http
POST /functions/v1/update-onboarding-copy
Authorization: Bearer <access_token>
apikey: <anon_key>
Content-Type: application/json
```

Body:

```json
{
  "content": {
    "ETAPA1": {
      "title": "Novo titulo"
    }
  },
  "changed_etapas": ["ETAPA1"],
  "notes": "Ajuste de tom"
}
```

Response de sucesso:

```json
{
  "success": true,
  "version": 12,
  "updated_at": "2026-04-27T18:00:00.000Z"
}
```

Validacoes atuais:

- Metodo deve ser `POST`.
- `content` deve ser objeto.
- Chaves de `content` devem pertencer a allowlist `ETAPA*`.
- Usuario deve passar em `requireRole(req, ['admin'])`.
- `published_by` vem do JWT, preferindo `authResult.user.email`.

## Merge da copy publicada

`deepMergeCopy(staticObj, override)` segue estas regras:

| Caso | Resultado |
| --- | --- |
| `override` `undefined` ou `null` | Mantem estatico |
| `staticObj` e funcao | Mantem funcao |
| `override` primitivo | Substitui estatico |
| `override` array | Substitui array inteiro |
| `override` objeto | Merge recursivo |

Isso permite publicar somente:

```json
{
  "ETAPA2": {
    "slide1": {
      "body": "Novo texto"
    }
  }
}
```

sem duplicar a etapa inteira no banco.

## Diff de publicacao no frontend

`useCopyEditor.computeDiff(current, original)`:

- Ignora funcoes.
- Para arrays, compara por `JSON.stringify()` e publica o array final inteiro.
- Para objetos, percorre recursivamente.
- Retorna `null` quando nao ha alteracao.
- Envia apenas etapas com diff.

## Import/export JSON

Export:

- Gera arquivo `copy-editor-export.json`.
- Serializa todas as etapas no formato `ETAPA*`.
- Substitui funcoes por placeholder:
  `[function - edite diretamente no copy.js]` no contrato conceitual.

Import:

- Aceita JSON com chaves `ETAPA*`.
- Faz merge sobre o estado atual do editor.
- Ignora placeholder de funcao.
- Marca etapas importadas como dirty.
- Nao publica automaticamente.

Observacao: o texto exato do placeholder no codigo pode conter caracteres
tipograficos. Ao alterar import/export, mantenha compatibilidade com exports
anteriores quando possivel.

## Variaveis de template

Variaveis reconhecidas pelo editor para preview e chips:

| Variavel | Exemplo |
| --- | --- |
| `clientName` | `Joao Silva` |
| `celebName` | `Neymar` |
| `atendente` | `Ana` |
| `praca` | `Sao Paulo` |
| `segmento` | `Alimentacao` |
| `totalSteps` | `8` |
| `count` | `3` |
| `remaining` | `2` |

Sintaxe persistida:

```text
${clientName}
```

## Fonte da copy em auditoria de onboarding

`src/lib/onboarding-audit.js` gera `copy_source`:

- `copy.js` quando `version = 0`
- `onboarding_copy:<version>` quando existe copy publicada

Essa informacao aparece nos aceites persistidos pelo onboarding.

