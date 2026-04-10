# API: celebridadesReferencia

Documentacao de consumo da tabela `celebridadesReferencia` via REST API do Supabase (PostgREST).

## Conexao

| Parametro | Valor |
|-----------|-------|
| **Supabase URL** | `https://awqtzoefutnfmnbomujt.supabase.co` |
| **REST endpoint** | `https://awqtzoefutnfmnbomujt.supabase.co/rest/v1/celebridadesReferencia` |
| **Autenticacao** | `anon key` via headers `apikey` e `Authorization: Bearer` |
| **RLS** | Desabilitado — acesso total com `anon key` |

## Headers obrigatorios

```
apikey: SUPABASE_ANON_KEY
Authorization: Bearer SUPABASE_ANON_KEY
Content-Type: application/json
```

## Schema da tabela

| Coluna | Tipo | Nullable | Default | Descricao |
|--------|------|----------|---------|-----------|
| `id` | uuid | NO | `gen_random_uuid()` | PK, identificador unico |
| `nome` | text | YES | - | Nome artistico da celebridade |
| `nomeJuridico` | text | YES | - | Razao social / nome juridico |
| `nivel` | text | YES | - | Nivel/tier da celebridade |
| `gruponovo` | text | YES | - | Grupo ao qual pertence |
| `description` | text | YES | - | Descricao / bio |
| `fotoPrincipal` | text | YES | - | URL da foto principal |
| `fotoMobile` | text | YES | - | URL da foto mobile |
| `fotoSecundaria` | text | YES | - | URL da foto secundaria |
| `instagram_followers` | bigint | YES | - | Numero de seguidores no Instagram |
| `ativo` | boolean | YES | - | Se a celebridade esta ativa |
| `celeb_favorita` | boolean | YES | `false` | Se e celebridade favorita/destaque |
| `is_pair` | boolean | YES | `false` | Se e uma dupla |
| `celebridade_duplas` | uuid[] | YES | - | IDs das celebridades que formam a dupla |
| `sgc_uuid` | uuid | YES | - | UUID de referencia no sistema SGC |
| `csv_imported` | text | YES | - | Indicador de importacao via CSV |
| `created_at` | timestamptz | NO | `now()` | Data de criacao |
| `updated_at` | timestamptz | YES | `now()` | Data da ultima atualizacao |

## Exemplos de consumo

### Supabase JS Client (recomendado)

```bash
npm install @supabase/supabase-js
```

```js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://awqtzoefutnfmnbomujt.supabase.co',
  process.env.SUPABASE_ANON_KEY
)
```

#### Listar celebridades ativas

```js
const { data, error } = await supabase
  .from('celebridadesReferencia')
  .select('id, nome, nivel, instagram_followers, fotoPrincipal, celeb_favorita')
  .eq('ativo', true)
  .order('nome')
```

#### Buscar por ID

```js
const { data, error } = await supabase
  .from('celebridadesReferencia')
  .select('*')
  .eq('id', 'uuid-aqui')
  .single()
```

#### Buscar celebridades favoritas

```js
const { data, error } = await supabase
  .from('celebridadesReferencia')
  .select('id, nome, fotoPrincipal, instagram_followers')
  .eq('ativo', true)
  .eq('celeb_favorita', true)
```

#### Buscar duplas

```js
const { data, error } = await supabase
  .from('celebridadesReferencia')
  .select('id, nome, celebridade_duplas')
  .eq('is_pair', true)
  .eq('ativo', true)
```

#### Filtrar por nivel

```js
const { data, error } = await supabase
  .from('celebridadesReferencia')
  .select('id, nome, nivel, instagram_followers')
  .eq('ativo', true)
  .eq('nivel', 'A')
  .order('instagram_followers', { ascending: false })
```

#### Paginacao

```js
const { data, error } = await supabase
  .from('celebridadesReferencia')
  .select('id, nome, nivel', { count: 'exact' })
  .eq('ativo', true)
  .range(0, 19) // primeiros 20 registros
```

### REST direto (curl)

#### Listar ativas

```bash
curl "https://awqtzoefutnfmnbomujt.supabase.co/rest/v1/celebridadesReferencia?ativo=eq.true&select=id,nome,nivel,instagram_followers,fotoPrincipal,celeb_favorita&order=nome" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

#### Buscar por ID

```bash
curl "https://awqtzoefutnfmnbomujt.supabase.co/rest/v1/celebridadesReferencia?id=eq.UUID_AQUI&select=*" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Accept: application/vnd.pgrst.object+json"
```

#### Com paginacao

```bash
curl "https://awqtzoefutnfmnbomujt.supabase.co/rest/v1/celebridadesReferencia?ativo=eq.true&select=id,nome&order=nome&limit=20&offset=0" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Prefer: count=exact"
```

O header de resposta `content-range` retorna o total (ex: `0-19/150`).

## Sintaxe de filtros PostgREST

| Operador | Significado | Exemplo |
|----------|-------------|---------|
| `eq` | igual | `?nivel=eq.A` |
| `neq` | diferente | `?nivel=neq.A` |
| `gt` / `gte` | maior / maior ou igual | `?instagram_followers=gte.100000` |
| `lt` / `lte` | menor / menor ou igual | `?instagram_followers=lt.50000` |
| `like` | LIKE (case sensitive) | `?nome=like.*Silva*` |
| `ilike` | ILIKE (case insensitive) | `?nome=ilike.*silva*` |
| `is` | IS (null/true/false) | `?ativo=is.true` |
| `in` | IN (lista) | `?nivel=in.(A,B)` |
| `order` | ordenacao | `?order=nome.asc` |

## Observacoes

- A tabela **nao tem RLS habilitado** — qualquer chamada autenticada com a `anon key` tem acesso total.
- Essa API e **somente leitura** no contexto de consumo. Nao faca INSERT/UPDATE/DELETE a menos que explicitamente autorizado.
- As URLs de fotos (`fotoPrincipal`, `fotoMobile`, `fotoSecundaria`) sao URLs externas completas.
- O campo `celebridade_duplas` e um array de UUIDs que referencia outros registros na mesma tabela.
