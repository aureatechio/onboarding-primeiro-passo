---
name: sdd-spec-creator
description: "Cria ou documenta functionSpec.md (Spec Driven Development) para qualquer componente do projeto: Edge Functions, modulos _shared/, componentes React, libs. Use quando o usuario pedir para criar spec, documentar funcao, escrever functionSpec, SDD, spec driven, ou preparar contrato tecnico de um componente."
---

# SDD Spec Creator — Criacao de Specs (Spec Driven Development)

## Quando usar

- Usuario pede para criar spec/functionSpec de um componente novo (antes de implementar)
- Usuario pede para documentar componente existente como spec (depois de implementar)
- Usuario menciona "criar spec", "functionSpec", "SDD", "spec driven", "contrato tecnico"
- Agente identifica que uma Edge Function nao possui `functionSpec.md` e sugere criacao

## Objetivo

Gerar um `functionSpec.md` padronizado que serve como contrato tecnico do componente. A spec e a fonte de verdade para:
- O que o componente faz (e o que NAO faz)
- Quais sao as entradas, validacoes e saidas
- Como se comporta em cenarios de erro
- Quais dependencias externas consome

---

## Workflow

### Step 1: Identificar o alvo

Determinar QUAL componente sera especificado:

| Tipo | Local da spec | Exemplo |
|------|---------------|---------|
| Edge Function | `supabase/functions/<nome>/functionSpec.md` | `omie-orchestrator/functionSpec.md` |
| Modulo _shared/ | `supabase/functions/_shared/<modulo>/spec.md` | `_shared/perplexity/spec.md` |
| Componente React | `src/components/<nome>/spec.md` | `src/components/CampaignBriefing/spec.md` |
| Pagina React | `src/pages/<nome>/spec.md` | `src/pages/NanoBananaConfigPage/spec.md` |
| Lib utilitaria | `src/lib/<nome>/spec.md` | `src/lib/color-extractor/spec.md` |

### Step 2: Coletar contexto

**Se o componente JA EXISTE (documentar existente):**

1. Ler o codigo-fonte do componente inteiro
2. Ler imports para mapear dependencias
3. Ler testes existentes (se houver)
4. Identificar modulo (`omie`, `onboarding`, `ai-campaign`, `shared`) via `CONTEXT-MAP.md`
5. Se Edge Function: verificar se existe spec de funcoes relacionadas para manter consistencia

**Se o componente AINDA NAO EXISTE (spec-first):**

1. Coletar do usuario: objetivo, entradas esperadas, comportamento desejado
2. Ler specs de funcoes similares no mesmo modulo para manter consistencia
3. Consultar docs do modulo (`.context/modules/{modulo}/README.md`)
4. Identificar shared modules que serao usados

### Step 3: Classificar complexidade

| Classificacao | Criterios | Secoes da spec |
|---------------|-----------|----------------|
| **Simples** | CRUD, GET sem logica, proxy | Objetivo, Entradas, Comportamento (3-5 steps), Resposta, Erros |
| **Media** | Validacao complexa, transformacao, upload | Todas as secoes basicas + Validacoes, Dependencias, Observabilidade |
| **Complexa** | Orquestracao, background jobs, pipeline, integracao externa | Todas as secoes + Notas, Regras de Negocio, Versionamento |

### Step 4: Gerar a spec

Usar o template da secao "Template" abaixo. Adaptar secoes conforme a classificacao:
- **Simples:** omitir secoes vazias (Observabilidade, Notas, etc.)
- **Media/Complexa:** incluir todas as secoes relevantes

### Step 5: Salvar e reportar

1. Salvar o arquivo no path correto (ver Step 1)
2. Apresentar resumo ao usuario: tipo, classificacao, secoes geradas
3. Se spec-first: perguntar "Quer ajustar algo antes de implementar?"
4. Se documentando existente: perguntar "Quer que eu valide a spec contra o codigo?"

---

## Template

O template abaixo usa secoes em **portugues**. Adaptar conforme a classificacao (omitir secoes marcadas como opcionais quando nao aplicaveis).

```markdown
# functionSpec: {nome-da-funcao}

## Objetivo

{1-2 frases descrevendo o proposito do componente. O que ele faz e para quem.}

## Entradas

### Autenticacao
- {Publica / Protegida via JWT / Protegida via x-admin-password / Interna (service role)}
- Deploy: {--no-verify-jwt se publica, omitir se protegida padrao}

### Variaveis de Ambiente
| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `SUPABASE_URL` | Sim | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | Service role key |

### Requisicao
- Metodo: {GET | POST | PATCH | DELETE}
- Content-Type: {application/json | multipart/form-data}

### Campos (Body / Query Params / Form Fields)
| Campo | Tipo | Obrigatorio | Validacao |
|-------|------|-------------|-----------|
| `campo_exemplo` | string | Sim | Nao vazio, max 200 chars |

{Exemplo de requisicao — incluir quando ajudar a clarificar}

## Validacoes

{Lista numerada de validacoes na ordem em que sao aplicadas.}
{OPCIONAL para funcoes simples — pode ser inline no Comportamento.}

1. Metodo != esperado → 405 `METHOD_NOT_ALLOWED`
2. Auth invalida → 401 `UNAUTHORIZED`
3. Campo X ausente → 400 `VALIDATION_ERROR`

## Comportamento

{Fluxo numerado step-by-step. Cada step = uma acao atomica.}

1. Valida metodo, auth e payload.
2. Busca dados de {tabela}.
3. Processa {logica principal}.
4. Retorna resultado.

{Para funcoes com background processing, separar em secao sincrona (resposta) e assincrona (background).}

## Resposta ({HTTP status})

```json
{
  "success": true,
  "data": { ... }
}
```

{Incluir exemplo de resposta de erro quando o padrao nao for obvio.}

## Tratamento de Erros

| HTTP | Codigo | Descricao |
|------|--------|-----------|
| 400 | `VALIDATION_ERROR` | {descricao} |
| 401 | `UNAUTHORIZED` | {descricao} |
| 404 | `NOT_FOUND` | {descricao} |
| 500 | `INTERNAL_ERROR` | {descricao} |

## Dependencias Externas

{OPCIONAL — incluir quando houver dependencias de banco, storage, APIs externas.}

- **Supabase DB**: tabela `{nome}` ({descricao})
- **Supabase Storage**: bucket `{nome}` ({descricao})
- **API externa**: {nome} ({endpoint})

## Modulos Compartilhados

{OPCIONAL — incluir quando importar de _shared/.}

- `_shared/{modulo}/{arquivo}.ts` — {o que importa}

## Observabilidade

{OPCIONAL — incluir para funcoes media/complexa.}

- Log `[{prefixo}]`: {campos logados}
- Metricas: {se aplicavel}

## Deploy

{OPCIONAL — incluir apenas para Edge Functions.}

```bash
supabase functions deploy {nome} --project-ref awqtzoefutnfmnbomujt {--no-verify-jwt se publica}
```

## Notas

{OPCIONAL — decisoes de design, edge cases, gotchas, trade-offs.}

- {Nota 1}
- {Nota 2}
```

---

## Regras Criticas

### Padrao de escrita

- **Idioma:** Portugues para secoes e conteudo. Termos tecnicos em ingles (JWT, CORS, UUID, service role).
- **Secoes:** Usar nomes em portugues padronizado (Objetivo, Entradas, Validacoes, Comportamento, Resposta, Tratamento de Erros, Dependencias Externas, Modulos Compartilhados, Observabilidade, Deploy, Notas).
- **Tabelas:** Usar markdown tables para campos, erros, env vars. Nunca listas soltas para dados estruturados.
- **Comportamento:** SEMPRE numerado (1, 2, 3...). Cada step e uma acao atomica, nao paragrafo.
- **Erros:** SEMPRE tabela com HTTP code + error code + descricao.
- **Exemplos JSON:** Incluir quando o shape da resposta nao for trivial.

### Classificacao de auth (Edge Functions)

A classificacao JWT DEVE estar explicita na spec. Referencia:

| Tipo | Deploy flag | Quando |
|------|-------------|--------|
| Publica | `--no-verify-jwt` | Consumida pelo frontend sem login |
| Protegida JWT | (sem flag) | Requer JWT valido |
| Protegida admin | `--no-verify-jwt` | Deploy publico, auth via `x-admin-password` no codigo |
| Interna | `--no-verify-jwt` | Deploy publico, auth via bearer service role no codigo |

### Consistencia com specs existentes

Ao criar spec para funcao de um modulo que ja tem specs:
1. Ler pelo menos 2 specs existentes do mesmo modulo
2. Manter terminologia consistente (mesmos nomes de error codes, campos, etc.)
3. Referenciar shared modules do mesmo jeito

### O que a spec NAO deve conter

- **Codigo fonte** — a spec descreve O QUE, nao COMO implementar
- **Detalhes de implementacao interna** — nao mencionar nomes de variaveis, funcoes helper internas
- **Comentarios de revisao** — nao incluir "TODO", "FIXME", "talvez mudar"
- **Historico de mudancas** — a spec reflete o estado ATUAL, nao changelog

### Validacao pos-criacao (quando documentando existente)

Apos gerar a spec de um componente existente, validar:
1. Todos os endpoints/metodos do codigo estao cobertos
2. Todos os error codes do codigo estao na tabela de erros
3. Campos do body/query conferem com o codigo
4. Dependencias externas conferem com imports

---

## Exemplos de invocacao

**Spec-first (antes de implementar):**
```
"Cria a spec de uma nova funcao get-user-profile que retorna perfil do usuario logado"
```

**Documentar existente:**
```
"Documenta a funcao get-nanobanana-config como spec"
"Cria functionSpec pra omie-create-os"
```

**Componente React:**
```
"Cria spec do componente CampaignBriefing"
```

**Modulo shared:**
```
"Documenta o modulo _shared/perplexity como spec"
```

---

## Referencias

- Specs existentes: `supabase/functions/*/functionSpec.md` (22 specs)
- Convencao SDD: `CLAUDE.md` secao "SDD Convention"
- Context docs por modulo: `.context/modules/{modulo}/README.md`
- Regras de negocio: `.context/modules/{modulo}/BUSINESS-RULES.md`
