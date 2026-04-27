# Copy Editor - Regras de Negocio

## 1. `src/copy.js` continua sendo fallback e referencia estrutural

O banco armazena overrides. Nunca assuma que `onboarding_copy.content` contem a
copy completa. O frontend deve sempre aplicar os overrides sobre `src/copy.js`.

## 2. Todos os textos do onboarding devem continuar centralizados

Componentes `Etapa*.jsx` nao devem hardcodar textos de produto. A regra geral do
onboarding permanece: texto de formulario vive em `src/copy.js` e pode receber
overrides publicados pelo Copy Editor.

## 3. Funcoes de `copy.js` nao sao editaveis pelo banco

JSON do Supabase nao serializa funcoes. `deepMergeCopy()` preserva funcoes do
fallback estatico. Export/import usam placeholder para funcoes e o publish ignora
campos cujo valor atual e funcao.

Se um texto precisa ser editavel no Copy Editor, prefira representa-lo como
string/template em `src/copy.js`, nao como funcao.

## 4. Publicacao grava diff, nao dump completo

`useCopyEditor.computeDiff()` publica apenas campos alterados contra o baseline
carregado. A Edge Function deve mesclar o diff com `onboarding_copy.content`
existente antes do `UPDATE`.

Nao reintroduzir comportamento que sobrescreva o singleton com apenas a etapa da
sessao atual.

## 5. `onboarding_copy` e singleton

A tabela `onboarding_copy` deve ter exatamente uma linha operacional.

- Sempre `UPDATE`.
- Nunca `INSERT` em fluxos normais.
- `version = 0` significa usar apenas `src/copy.js`.
- `version > 0` significa aplicar overrides publicados.

## 6. Historico e append-only

Cada publicacao deve tentar inserir uma linha em `onboarding_copy_versions` com:

- `version`
- `content` enviado na publicacao
- `changed_etapas`
- `published_by`
- `notes`

A escrita do historico e importante para auditoria e rollback futuro. No codigo
atual, falha no historico nao desfaz o update principal.

## 7. Leitura da copy publicada e publica

`get-onboarding-copy` e publica porque o conteudo publicado tambem aparece no
onboarding publico. Ela deve ser somente leitura.

Deploy esperado:

```bash
supabase functions deploy get-onboarding-copy --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```

## 8. Publicacao e protegida por JWT + RBAC admin

`update-onboarding-copy` altera copy de producao e deve exigir usuario humano
autenticado com role `admin`.

Deploy esperado:

```bash
supabase functions deploy update-onboarding-copy --project-ref awqtzoefutnfmnbomujt
```

Nao usar `--no-verify-jwt` nessa funcao.

## 9. A rota `/copy-editor` deve continuar restrita

No frontend, `/copy-editor` deve permanecer dentro de `DashboardRoute
roles={['admin']}`. Nao expor a rota como onboarding publico.

## 10. Publicacao usa `adminFetch`

Chamadas administrativas do Copy Editor devem usar `src/lib/admin-edge.js`.
Esse helper injeta `Authorization: Bearer <access_token>`, `apikey` e tenta
`refreshSession()` uma vez quando recebe 401.

## 11. Chaves de etapa sao allowlist

A Edge Function deve rejeitar chaves fora de:

- `ETAPA1`
- `ETAPA2`
- `ETAPA3`
- `ETAPA4`
- `ETAPA5`
- `ETAPA6`
- `ETAPA62`
- `ETAPA_FINAL`

Isso evita gravar lixo estrutural em `onboarding_copy.content`.

## 12. Arrays publicados substituem arrays inteiros

`deepMergeCopy()` substitui arrays por inteiro. Nao espere merge item-a-item.
Ao editar listas, o override salvo para aquele campo deve representar a lista
final desejada.

## 13. Mudancas em campos do formulario exigem atualizar o mapeamento

Se a alteracao mexer em campos funcionais do onboarding, validacoes ou payloads,
atualize tambem `docs/mapeamento-formulario-onboarding.md`.

Mudancas apenas textuais na copy geralmente nao exigem atualizar o mapeamento.

## 14. Migrations existentes sao imutaveis

Se o schema do Copy CMS precisar mudar, crie uma nova migration. Nunca edite
`supabase/migrations/20260414100000_create_onboarding_copy.sql`.

## 15. Nao expor service role no browser

O frontend deve usar somente envs `VITE_*`. `SUPABASE_SERVICE_ROLE_KEY` fica
restrita a Edge Functions e scripts seguros.

