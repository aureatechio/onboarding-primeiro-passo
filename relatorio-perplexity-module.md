# Relatório: Módulo de Integração Perplexity

**Data:** 2026-04-06
**Escopo:** Análise da engenharia de contexto e aderência ao SDD no módulo Perplexity do primeiro-passo-app

---

## 1. Visão Geral do Módulo

O módulo Perplexity é responsável por três capacidades dentro do AI Campaign Pipeline:

1. **Geração de briefing de campanha** — gera um briefing estratégico completo (sobre empresa, público-alvo, celebridade, tom de voz, CTAs) + insights criativos para peças de marketing.
2. **Sugestão de texto de briefing** — gera um rascunho textual de briefing (modo "seed") para o cliente revisar antes de enviar.
3. **Descoberta de fontes digitais** — identifica perfis oficiais da empresa (site, Instagram, LinkedIn, Facebook) via pesquisa web.

Todas as capacidades utilizam a API `POST /chat/completions` do Perplexity (modelo Sonar) como provider de IA com search grounding.

---

## 2. Inventário de Arquivos

### 2.1 Shared Utilities (`_shared/perplexity/`)

| Arquivo | LOC | Responsabilidade |
|---------|-----|------------------|
| `prompt.ts` | ~127 | Construção de payload para briefing (system prompt + user prompt template com placeholders) |
| `normalize.ts` | ~188 | Normalização da resposta do provider → contrato interno (`NormalizedBriefing` + `NormalizedInsight`) |
| `suggest.ts` | ~159 | Construção de payload + normalização para sugestão de briefing seed |
| `discover.ts` | ~163 | Construção de payload + normalização para descoberta de fontes digitais |
| `suggest.test.ts` | ~108 | Suite de testes unitários Deno para `suggest.ts` |

### 2.2 Edge Functions

| Função | Método | Acesso | Papel |
|--------|--------|--------|-------|
| `generate-campaign-briefing` | POST | Protegida | Gera briefing completo, persiste no banco (`onboarding_briefings`) |
| `test-perplexity-briefing` | GET/POST | Pública | Sandbox de testes — gera briefing e persiste em `perplexity_test_runs` |
| `suggest-briefing-seed` | POST | Pública | Sugere texto de briefing (modo seed) |
| `discover-company-sources` | POST | Pública | Descobre perfis digitais da empresa |
| `get-perplexity-config` | GET | Pública | Retorna config do Perplexity (mascara API key) |
| `update-perplexity-config` | PATCH | Pública | Atualiza campos editáveis da config |

### 2.3 Documentação de Testes (`testes-dev/`)

| Arquivo | Conteúdo |
|---------|----------|
| `perplexity-aba-testes-contrato-tecnico.md` | Contrato técnico da aba de testes |
| `perplexity-integracao-buglog-2026-03-31.md` | Bug log (409 conflict no save-campaign-briefing) |
| `perplexity-integracao-funcionamento-e-testes-aceite.md` | Guia end-to-end de testes de aceite |

---

## 3. Análise da Engenharia de Contexto

### 3.1 Arquitetura de Prompts

O módulo implementa uma engenharia de contexto em três camadas:

**Camada 1 — System Prompt (persona)**
Cada capacidade define uma persona distinta no system prompt:

- **Briefing:** "estrategista de campanhas da AUREA" — foco em campanha com celebridade para marca brasileira, output JSON estruturado.
- **Suggest:** "redator de marketing para marcas brasileiras" — foco em texto corrido, sem JSON, mínimo 120 caracteres.
- **Discover:** "especialista em pesquisa web" — foco em encontrar perfis oficiais de empresas brasileiras, output JSON com URLs validadas.

**Camada 2 — User Prompt Template (parametrização)**
Todos os templates usam interpolação por placeholder (`${company_name}`, `${celebrity_name}`, `${segment}`, `${region}`, `${goal}`, etc.). Os placeholders são resolvidos em runtime via funções `buildUserPrompt()` / `buildSuggestUserPrompt()` / `buildDiscoverUserPrompt()`.

Placeholders condicionais (como `${segment_line}`, `${region_line}`, `${goal_line}`, `${sources_line}`) são resolvidos como string vazia quando o valor não é fornecido, evitando ruído no prompt.

**Camada 3 — Configuração dinâmica via banco de dados**
A tabela `perplexity_config` permite override em runtime de:

- Model, temperature, top_p
- System prompt e user prompt template (briefing e suggest)
- Search mode e search recency filter
- API key, base URL, timeout
- Versões de contrato, prompt e estratégia

Isso permite iteração em produção sem redeploy — um padrão de "prompt as config" bastante maduro.

### 3.2 Versionamento de Prompts

O módulo implementa triple-versioning em cada resposta normalizada:

- `contract_version` — versão do schema de saída
- `prompt_version` — versão do prompt enviado ao provider
- `strategy_version` — versão da estratégia criativa

Cada módulo shared (`prompt.ts`, `suggest.ts`, `discover.ts`) exporta constantes de versão default, que podem ser sobrescritas pela config do banco. Esse versionamento permite rastreabilidade completa: dado um briefing gerado, é possível saber exatamente qual prompt e contrato foram usados.

### 3.3 Guard Rails

Mecanismos de proteção implementados:

- **Suggest:** `SUGGEST_MIN_LENGTH = 120` — rejeita respostas curtas demais.
- **Suggest:** Detecção de placeholders não resolvidos (`{{ }}` e `${ }`) — previne que templates quebrados cheguem ao usuário.
- **Discover:** Validação de URLs HTTP/HTTPS e cálculo de confiança baseado no número de perfis encontrados.
- **Briefing:** Validação estrutural — exige `briefing` (objeto) + `insights_pecas` (array com mínimo 4 itens).
- **Normalização robusta:** `extractJsonObject()` faz best-effort extraction de JSON (tenta parse direto, depois busca primeiro `{` e último `}`), tolerando respostas com texto extra antes/depois do JSON.

### 3.4 Configuração de Search

O módulo utiliza features de search grounding do Perplexity:

- `search_mode: "web"` — pesquisa web ativa
- `search_recency_filter` — configurável (hour/day/week/month/year)
- As citações retornadas pelo provider são normalizadas no campo `citacoes` do output

---

## 4. Análise de Aderência ao SDD

### 4.1 Estado Atual

**Nenhuma das 6 Edge Functions do módulo Perplexity possui `functionSpec.md`.**

Isso contrasta com o padrão SDD documentado no CLAUDE.md, onde funções OMIE e NFe possuem specs. O módulo Perplexity opera sem specs formais, usando apenas:

- Contratos implícitos nas interfaces TypeScript (`TestBriefingInput`, `BriefingInput`, `DiscoverInput`, `SuggestInput`)
- Documentação parcial nos docs de teste (`testes-dev/perplexity-aba-testes-contrato-tecnico.md`)
- Constantes de versão hardcoded

### 4.2 Contratos Implícitos vs. Explícitos

O que o módulo faz bem (mesmo sem functionSpec.md):

- **Interfaces TypeScript tipadas** para input e output de cada função
- **Error codes enumerados** (`INVALID_INPUT`, `PERPLEXITY_PROVIDER_ERROR`, `PERPLEXITY_TIMEOUT`, `INVALID_PROVIDER_RESPONSE`, `SUGGEST_GUARDRAIL_VIOLATION`, `INTERNAL_ERROR`)
- **Validação rigorosa de input** com mensagens de erro claras em português
- **Normalização padronizada** de respostas do provider

O que está faltando para aderência completa ao SDD:

- `functionSpec.md` para cada Edge Function definindo: propósito, input/output schemas, error codes, exemplos de payload, regras de negócio
- Documentação formal da relação entre as funções (ex: `save-campaign-briefing` → `generate-campaign-briefing` → `create-ai-campaign-job`)
- Schema JSON formal dos payloads (hoje são interfaces TS sem JSON Schema)

### 4.3 Cobertura de Testes

- `suggest.test.ts` cobre o módulo suggest com 6 testes unitários (prompt building, payload, normalização, guard rails, estabilidade de template)
- `generate-campaign-briefing/index.test.ts` existe (mencionado no mapeamento)
- **Sem testes unitários** para `discover.ts`, `normalize.ts`, `prompt.ts` como módulos isolados
- Testes de integração documentados em markdown (`testes-dev/`) mas não automatizados

---

## 5. Padrões Arquiteturais Identificados

### 5.1 Padrão: Provider Adapter com Config Layering

Todas as funções seguem o mesmo padrão de resolução de configuração em camadas:

```
ENV var → DB config (perplexity_config) → Hardcoded default
```

Prioridade: env var vence DB, que vence hardcoded. Isso permite override rápido via env sem tocar no banco, mas com flexibilidade de config em runtime.

### 5.2 Padrão: Shared Utility + Edge Function Shell

Cada Edge Function é um "shell fino" que:

1. Valida input
2. Carrega config do banco (com cache em memória)
3. Delega construção de payload para o módulo shared
4. Chama o provider com timeout e AbortController
5. Normaliza a resposta via módulo shared
6. Persiste resultado (quando aplicável)
7. Mapeia erros para HTTP status codes

A lógica de negócio (prompts, normalização, guard rails) fica nos módulos shared.

### 5.3 Padrão: Dependency Injection (generate-campaign-briefing)

A função `generate-campaign-briefing` é a mais madura arquiteturalmente — exporta `handleRequest()` com injeção de dependências via interface `Dependencies`, permitindo testes com mocks de `callProvider`, `persistBriefing`, `resolvePersistMode` e `now`.

As demais funções (discover, suggest, test) **não** seguem esse padrão e têm o Deno.serve inline, dificultando testes unitários isolados.

### 5.4 Duplicação de Código

Há duplicação significativa entre as Edge Functions:

- `callProvider()` é reimplementado em 4 funções (test-perplexity-briefing, generate-campaign-briefing, discover-company-sources, suggest-briefing-seed) com lógica quase idêntica
- `loadDbConfig()` é copiado em todas as funções
- `AppError`, `ProviderHttpError`, `mapError()`, helpers de validação são duplicados
- `generate-campaign-briefing` redefine localmente `extractJsonObject`, `normalizeInsight`, `normalizeBriefingObject` e `normalizeProviderResponse` em vez de importar de `normalize.ts`

---

## 6. Pontos Fortes

1. **Triple-versioning** (contract/prompt/strategy) — excelente rastreabilidade de prompts
2. **Config dinâmica via banco** — permite iteração de prompts sem redeploy
3. **Guard rails de qualidade** — validação de comprimento mínimo, detecção de placeholders não resolvidos, validação estrutural de JSON
4. **Normalização robusta** — best-effort JSON extraction tolerante a respostas "sujas" do LLM
5. **Sandbox de testes** — `test-perplexity-briefing` com histórico persistido em `perplexity_test_runs`
6. **Error codes tipados** — mapeamento claro para HTTP status codes
7. **Mascaramento de API key** — nunca expõe a chave completa na config

---

## 7. Pontos de Atenção e Recomendações

### 7.1 Alta Prioridade

| # | Ponto | Impacto | Recomendação |
|---|-------|---------|--------------|
| 1 | Ausência de `functionSpec.md` | Sem contrato formal, dificuldade de onboarding e manutenção | Criar specs para as 6 funções seguindo o padrão SDD do repo |
| 2 | Duplicação de `callProvider()` em 4 funções | Risco de drift, bug fix em um não propaga | Extrair para `_shared/perplexity/client.ts` |
| 3 | `generate-campaign-briefing` redefine normalize localmente | Duas implementações de `normalizeProviderResponse` coexistem | Migrar para importar de `normalize.ts` (breaking change controlada) |
| 4 | Funções de config (get/update) sem autenticação | Qualquer um pode alterar prompts e API key | Adicionar auth ou ao menos rate limiting |

### 7.2 Média Prioridade

| # | Ponto | Recomendação |
|---|-------|--------------|
| 5 | Cobertura de testes parcial | Adicionar testes para `discover.ts`, `normalize.ts`, `prompt.ts` |
| 6 | DI pattern só em `generate-campaign-briefing` | Padronizar DI nas demais funções para testabilidade |
| 7 | Cache de config em variável global sem TTL | Adicionar TTL (ex: 5min) para evitar stale config em edge functions de longa duração |

### 7.3 Evolução Sugerida

| # | Ponto | Recomendação |
|---|-------|--------------|
| 8 | Sem observabilidade estruturada | Implementar structured logging consistente (já existe parcialmente com `[briefing.request.received]`) |
| 9 | Sem retry automático | Considerar retry com backoff para erros transitórios do provider |
| 10 | PRD e CONTRACT não referenciam Perplexity diretamente | Atualizar docs do pipeline para documentar a integração |

---

## 8. Diagrama de Fluxo

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│  Frontend    │────▶│  Edge Function        │────▶│  Perplexity API │
│  (React SPA) │     │  (shell fino)         │     │  /chat/completions
└─────────────┘     │                      │     └─────────────────┘
                    │  1. validateInput()   │              │
                    │  2. loadDbConfig()    │              │
                    │  3. buildPayload()    │              ▼
                    │     (shared module)   │     ┌─────────────────┐
                    │  4. callProvider()    │     │  Provider        │
                    │  5. normalize()       │     │  Response        │
                    │     (shared module)   │     └─────────────────┘
                    │  6. persist()         │
                    │  7. return JSON       │
                    └──────────────────────┘
                              │
                              ▼
                    ┌──────────────────────┐
                    │  Supabase Tables      │
                    │  • perplexity_config  │
                    │  • onboarding_briefings│
                    │  • perplexity_test_runs│
                    └──────────────────────┘
```

---

## 9. Conclusão

O módulo Perplexity é bem construído do ponto de vista de engenharia de contexto — o sistema de prompts versionados com config dinâmica, guard rails e normalização robusta mostra maturidade. O principal gap é a ausência de SDD formal (functionSpec.md) e a duplicação de código entre as Edge Functions, que indica que o módulo cresceu organicamente sem uma fase de consolidação arquitetural. A recomendação principal é criar as specs formais e extrair o código duplicado para o módulo shared, o que traria o módulo para o mesmo nível de rigor das integrações OMIE.
