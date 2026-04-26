# Backlog Estruturado
## Autenticacao de Dashboard (AI-Step2 + Copy Editor)

Data: 2026-04-17
Status: backlog pronto para execucao
Origem: transformado a partir da analise tecnica de autenticacao do dashboard
Escopo: rotas internas `/ai-step2/*` e `/copy-editor`, preservando onboarding publico sem regressao

---

## 1) Objetivo e Resultado Esperado

Implementar autenticacao real (usuario + sessao) para o dashboard interno, com autorizacao por papel, eliminando dependencia de `x-admin-password` no frontend e reduzindo exposicao de endpoints sensiveis.

Resultado esperado ao final:
- Rotas internas protegidas por sessao valida.
- Endpoints internos protegidos por usuario autenticado + papel.
- Onboarding publico continua funcional (`--no-verify-jwt` onde for requisito de produto).
- Auditoria minima de acesso e acoes administrativas.

---

## 2) Principios de Execucao (Context Engineering + SDD)

### 2.1 Context Engineering (obrigatorio em cada fase)

Antes de implementar qualquer tarefa, ler na ordem:
1. `.context/modules/onboarding/DOC-READING-ORDER.md`
2. `.context/modules/onboarding/README.md`
3. `.context/modules/onboarding/BUSINESS-RULES.md`
4. `.context/modules/aurea-studio/DOC-READING-ORDER.md`
5. `.context/modules/aurea-studio/README.md`
6. `.context/modules/aurea-studio/BUSINESS-RULES.md`
7. `ai-step2/CONTRACT.md`
8. `docs/mapeamento-formulario-onboarding.md`

### 2.2 Spec Driven Development (obrigatorio em Edge Functions)

Para cada endpoint alterado:
1. Criar ou atualizar `supabase/functions/<funcao>/functionSpec.md` antes de alterar `index.ts`.
2. Definir contrato: metodo, auth, input, output, erros, observabilidade, deploy.
3. Implementar no `index.ts` aderente ao spec.
4. Validar regressao e atualizar spec se houver divergencia final.

---

## 3) Inventario de Endpoint e Cobertura SDD Atual

| Endpoint | Uso | Auth atual | functionSpec.md |
|---|---|---|---|
| get-ai-campaign-monitor | Monitor operacional | Publico | Nao |
| retry-ai-campaign-assets | Retry/regeneracao | Publico | Nao |
| set-onboarding-access | Liberacao manual onboarding | x-admin-password | Sim |
| save-onboarding-identity | Edicao identidade | Publico | Nao |
| save-campaign-briefing | Edicao briefing legado | Publico | Nao |
| get-perplexity-config | Leitura config | Publico | Sim |
| update-perplexity-config | Escrita config | x-admin-password | Sim |
| discover-company-sources | Descoberta de fontes | Publico | Sim |
| suggest-briefing-seed | Sugestao seed | Publico | Sim |
| test-perplexity-briefing | Testes briefing | Publico | Sim |
| get-nanobanana-config | Leitura config | Publico | Sim |
| update-nanobanana-config | Escrita config | x-admin-password | Sim |
| read-nanobanana-reference | Leitura referencia | x-admin-password | Sim |
| get-onboarding-copy | Leitura copy | Publico | Nao |
| update-onboarding-copy | Publicacao copy | x-admin-password | Nao |
| get-onboarding-data | Hidratar onboarding | Publico | Nao |

---

## 4) Backlog por Fases

## Fase 0 - Matriz de Acesso e Contrato de Segregacao

### Objetivo
Definir quem acessa dashboard, quais papeis existem e quais operacoes cada papel pode executar.

Status da execucao (2026-04-17):
- Concluida.
- Artefatos:
  - `plan/2026-04-17-fase0-definicao-acesso-dashboard.md`
  - `docs/adr/2026-04-17-adr-auth-dashboard-supabase-session.md`

### Tarefas

- [x] **AUTH-00-001** Criar matriz de permissao por rota e acao.
  - Tipo: produto/arquitetura
  - Referencias:
    - `src/App.jsx`
    - `src/pages/AiStep2Monitor/*`
    - `src/pages/CopyEditor/*`
    - `ai-step2/CONTRACT.md`
  - Entregavel: tabela papel x rota x acao x endpoint.

- [x] **AUTH-00-002** Definir modelo de identidade e sessao (Supabase Auth).
  - Tipo: arquitetura
  - Referencias:
    - `package.json`
    - `.env.example`
    - `src/context/*`
  - Entregavel: decisao formal sobre provider, sessao, refresh, timeout.

- [x] **AUTH-00-003** Definir fronteira publico x interno (segregacao).
  - Tipo: arquitetura
  - Referencias:
    - `.context/modules/onboarding/BUSINESS-RULES.md`
    - `.context/modules/aurea-studio/BUSINESS-RULES.md`
    - `docs/mapeamento-formulario-onboarding.md`
  - Entregavel: lista de endpoints que permanecem publicos e endpoints internos protegidos.

### Criterios de aceite
- [x] Matriz de permissao aprovada.
- [x] Modelo de sessao aprovado.
- [x] Lista de endpoints internos/publicos aprovada.

---

## Fase 1 - Fundacao de Auth no Frontend

### Objetivo
Criar infraestrutura de autenticacao no SPA e guard para rotas internas.

### Tarefas

- [ ] **AUTH-01-001** Adicionar cliente de auth (`@supabase/supabase-js`) e variaveis de ambiente.
  - Tipo: frontend
  - Referencias:
    - `package.json`
    - `.env.example`
    - `src/lib/`
  - Entregavel: cliente auth centralizado + docs de env.

- [ ] **AUTH-01-002** Criar `AuthContext` com sessao, refresh e logout.
  - Tipo: frontend
  - Referencias:
    - `src/context/OnboardingContext.jsx`
    - `src/context/CopyContext.jsx`
  - Entregavel: provider de sessao reutilizavel.

- [ ] **AUTH-01-003** Implementar guard central para `/ai-step2/*` e `/copy-editor`.
  - Tipo: frontend
  - Referencias:
    - `src/App.jsx`
  - Entregavel: redirecionamento para login quando sem sessao.

- [ ] **AUTH-01-004** Criar tela de login/logout para operacao interna.
  - Tipo: frontend
  - Referencias:
    - `src/pages/`
    - `src/theme/*`
  - Entregavel: fluxo minimo de autenticacao para usuarios internos.

### Criterios de aceite
- [ ] Rotas internas nao carregam sem sessao.
- [ ] Sessao persiste em refresh.
- [ ] Logout encerra acesso a rotas internas.

---

## Fase 2 - Retrofit de Chamadas Frontend (Remocao de Senha Global)

### Objetivo
Padronizar chamadas autenticadas e remover `x-admin-password` do frontend.

### Tarefas

- [ ] **AUTH-02-001** Criar camada unica de request autenticada (wrapper fetch).
  - Tipo: frontend
  - Referencias:
    - `src/pages/AiStep2Monitor/useAiCampaignMonitor.js`
    - `src/pages/AiStep2Monitor/PerplexityConfigPage.jsx`
    - `src/pages/AiStep2Monitor/NanoBananaConfigPage.jsx`
    - `src/pages/CopyEditor/useCopyEditor.js`
  - Entregavel: helper com injecao de token e tratamento de 401/403.

- [ ] **AUTH-02-002** Migrar chamadas do monitor para camada autenticada.
  - Tipo: frontend
  - Referencias:
    - `src/pages/AiStep2Monitor/useAiCampaignMonitor.js`

- [ ] **AUTH-02-003** Migrar chamadas de configuracao Perplexity/NanoBanana.
  - Tipo: frontend
  - Referencias:
    - `src/pages/AiStep2Monitor/PerplexityConfigPage.jsx`
    - `src/pages/AiStep2Monitor/NanoBananaConfigPage.jsx`

- [ ] **AUTH-02-004** Migrar chamadas do Copy Editor.
  - Tipo: frontend
  - Referencias:
    - `src/context/CopyContext.jsx`
    - `src/pages/CopyEditor/useCopyEditor.js`

- [ ] **AUTH-02-005** Remover fallback/hardcode de senha admin do frontend.
  - Tipo: frontend
  - Referencias:
    - `src/pages/AiStep2Monitor/useAiCampaignMonitor.js`
    - `src/pages/AiStep2Monitor/PerplexityConfigPage.jsx`
    - `src/pages/AiStep2Monitor/NanoBananaConfigPage.jsx`
    - `src/pages/CopyEditor/useCopyEditor.js`

### Criterios de aceite
- [ ] Nenhuma tela interna envia `x-admin-password` do frontend.
- [ ] Todas as chamadas internas usam token de sessao.
- [ ] Erros de autenticacao tratados de forma padronizada.

---

## Fase 3 - Hardening Backend (Auth por Usuario/Papel)

### Objetivo
Trocar guard de senha compartilhada por autenticacao/autorizacao por usuario e papel nos endpoints internos.

### Tarefas SDD (spec-first)

- [ ] **AUTH-03-001** Criar/atualizar spec dos endpoints internos sem spec.
  - Tipo: backend/sdd
  - Referencias:
    - `supabase/functions/get-ai-campaign-monitor/`
    - `supabase/functions/retry-ai-campaign-assets/`
    - `supabase/functions/get-onboarding-copy/`
    - `supabase/functions/update-onboarding-copy/`
  - Entregavel: `functionSpec.md` com auth por usuario/papel.

- [ ] **AUTH-03-002** Atualizar specs existentes que hoje usam `x-admin-password`.
  - Tipo: backend/sdd
  - Referencias:
    - `supabase/functions/update-perplexity-config/functionSpec.md`
    - `supabase/functions/update-nanobanana-config/functionSpec.md`
    - `supabase/functions/read-nanobanana-reference/functionSpec.md`
    - `supabase/functions/set-onboarding-access/functionSpec.md`
  - Entregavel: contrato migrado para auth por sessao + papel.

### Tarefas de implementacao

- [ ] **AUTH-03-003** Implementar guard compartilhado por usuario autenticado e papel em `_shared`.
  - Tipo: backend
  - Referencias:
    - `supabase/functions/_shared/auth.ts`
    - `supabase/functions/_shared/admin-auth.ts`
    - `supabase/functions/_shared/service-role-auth.ts`
  - Entregavel: helper unico para autorizacao por role.

- [ ] **AUTH-03-004** Aplicar novo guard em endpoints internos de monitor/config/copy.
  - Tipo: backend
  - Referencias:
    - `supabase/functions/get-ai-campaign-monitor/index.ts`
    - `supabase/functions/retry-ai-campaign-assets/index.ts`
    - `supabase/functions/update-perplexity-config/index.ts`
    - `supabase/functions/update-nanobanana-config/index.ts`
    - `supabase/functions/read-nanobanana-reference/index.ts`
    - `supabase/functions/update-onboarding-copy/index.ts`
    - `supabase/functions/set-onboarding-access/index.ts`

- [ ] **AUTH-03-005** Reduzir payload sensivel no monitor e separar visoes list/detail por papel.
  - Tipo: backend
  - Referencias:
    - `supabase/functions/get-ai-campaign-monitor/index.ts`
    - `ai-step2/CONTRACT.md`

### Criterios de aceite
- [ ] Endpoints internos exigem usuario autenticado.
- [ ] Endpoints de escrita exigem papel autorizado.
- [ ] Nao ha fallback de senha global em runtime.

---

## Fase 4 - Separacao Publico x Interno sem Quebrar Onboarding

### Objetivo
Preservar onboarding publico e isolar fluxo interno operacional.

### Tarefas

- [ ] **AUTH-04-001** Classificar endpoints compartilhados em publico-only, interno-only, hibrido.
  - Tipo: arquitetura/backend
  - Referencias:
    - `supabase/functions/save-onboarding-identity/index.ts`
    - `supabase/functions/save-campaign-briefing/index.ts`
    - `supabase/functions/get-onboarding-data/index.ts`
    - `supabase/functions/get-ai-campaign-monitor/index.ts`

- [ ] **AUTH-04-002** Para endpoints hibridos, criar variantes internas quando necessario.
  - Tipo: backend
  - Referencias:
    - `supabase/functions/*/index.ts`
    - `supabase/functions/*/functionSpec.md`
  - Entregavel: contratos separados para uso publico e uso interno.

- [ ] **AUTH-04-003** Ajustar frontend interno para usar apenas endpoints internos.
  - Tipo: frontend
  - Referencias:
    - `src/pages/AiStep2Monitor/*`
    - `src/pages/CopyEditor/*`

- [ ] **AUTH-04-004** Validar que onboarding (`Etapa*`) segue publico e sem JWT de usuario final.
  - Tipo: regressao
  - Referencias:
    - `src/context/OnboardingContext.jsx`
    - `src/pages/Etapa62.jsx`
    - `.context/modules/onboarding/BUSINESS-RULES.md`

### Criterios de aceite
- [ ] Onboarding cliente continua funcional sem login.
- [ ] Dashboard interno nao usa mais endpoints publicos sensiveis.
- [ ] Contratos publico/interno documentados.

---

## Fase 5 - Deploy, QA e Rollout Controlado

### Objetivo
Subir mudancas com seguranca operacional e plano de rollback.

### Tarefas

- [ ] **AUTH-05-001** Montar checklist de deploy por lote (frontend + funcoes).
  - Tipo: operacao
  - Referencias:
    - `docs/CHECKLIST-DEPLOY-EDGE-FUNCTIONS.md`
    - `AGENTS.md`

- [ ] **AUTH-05-002** Validar regressao onboarding publico (fluxo completo).
  - Tipo: qa
  - Referencias:
    - `src/pages/Etapa1Hero.jsx`
    - `src/pages/Etapa62.jsx`
    - `src/pages/EtapaFinal.jsx`

- [ ] **AUTH-05-003** Validar regressao dashboard autenticado.
  - Tipo: qa
  - Referencias:
    - `src/pages/AiStep2Monitor/*`
    - `src/pages/CopyEditor/*`

- [ ] **AUTH-05-004** Definir observabilidade minima de seguranca.
  - Tipo: backend/ops
  - Referencias:
    - `supabase/functions/_shared/activity-logger.ts`
    - `supabase/functions/_shared/audit-logger.ts`
  - Entregavel: logs de login, negacao por papel, acao administrativa.

### Criterios de aceite
- [ ] Regressao onboarding aprovada.
- [ ] Regressao dashboard aprovada.
- [ ] Deploy com rollback documentado.
- [ ] Auditoria minima ativa.

---

## 5) Sequenciamento Recomendado e Dependencias

1. Fase 0 (definicoes de acesso e segregacao) - bloqueia todas as demais.
2. Fase 1 e Fase 2 (frontend auth + retrofit) podem iniciar em paralelo com SDD da Fase 3.
3. Fase 3 (backend hardening) conclui antes da Fase 4.
4. Fase 4 valida fronteira publico/interno sem regressao.
5. Fase 5 consolida QA, deploy e rollout.

Dependencias criticas:
- AUTH-00-001 bloqueia AUTH-03-002 e AUTH-03-004.
- AUTH-01-002 bloqueia AUTH-01-003 e AUTH-02-001.
- AUTH-03-001 bloqueia AUTH-03-004.
- AUTH-04-002 bloqueia AUTH-04-003.

---

## 6) Estimativa por Fase (Referencia)

- Fase 0: 2-3 dias
- Fase 1: 3-5 dias
- Fase 2: 3-4 dias
- Fase 3: 6-10 dias
- Fase 4: 4-6 dias
- Fase 5: 3-5 dias

Total:
- 1 dev: 18-29 dias uteis
- 2 devs (frontend/backend paralelo): 10-16 dias uteis

---

## 7) Backlog de Artefatos SDD (Checklist)

### 7.1 Specs para criar (alta prioridade)
- [ ] `supabase/functions/get-ai-campaign-monitor/functionSpec.md`
- [ ] `supabase/functions/retry-ai-campaign-assets/functionSpec.md`
- [ ] `supabase/functions/get-onboarding-copy/functionSpec.md`
- [ ] `supabase/functions/update-onboarding-copy/functionSpec.md`

### 7.2 Specs para revisar (migracao de auth)
- [ ] `supabase/functions/update-perplexity-config/functionSpec.md`
- [ ] `supabase/functions/update-nanobanana-config/functionSpec.md`
- [ ] `supabase/functions/read-nanobanana-reference/functionSpec.md`
- [ ] `supabase/functions/set-onboarding-access/functionSpec.md`

### 7.3 Itens obrigatorios em cada spec
- [ ] Modelo de auth (sessao usuario + papeis)
- [ ] Matriz de autorizacao por acao
- [ ] Payload minimizado por perfil
- [ ] Error codes padrao (`401`, `403`, `422`, `500`)
- [ ] Observabilidade (quem fez, quando, recurso afetado)
- [ ] Comando de deploy com `--project-ref awqtzoefutnfmnbomujt`

---

## 8) Backlog de Implementacao Frontend (Arquivos-alvo)

- [ ] `src/App.jsx` - guard de rotas internas
- [ ] `src/context/AuthContext.jsx` - novo provider de autenticacao
- [ ] `src/lib/auth-client.js` - cliente Supabase auth
- [ ] `src/lib/auth-fetch.js` - wrapper de requests autenticadas
- [ ] `src/pages/Login.jsx` - tela de login interno
- [ ] `src/pages/AiStep2Monitor/useAiCampaignMonitor.js` - migracao para auth-fetch
- [ ] `src/pages/AiStep2Monitor/PerplexityConfigPage.jsx` - migracao para auth-fetch
- [ ] `src/pages/AiStep2Monitor/NanoBananaConfigPage.jsx` - migracao para auth-fetch
- [ ] `src/pages/CopyEditor/useCopyEditor.js` - migracao para auth-fetch
- [ ] `src/context/CopyContext.jsx` - migracao para auth-fetch
- [ ] `.env.example` - incluir `VITE_SUPABASE_ANON_KEY`

---

## 9) Backlog de Implementacao Backend (Arquivos-alvo)

- [ ] `supabase/functions/_shared/auth.ts` - estender guard para RBAC
- [ ] `supabase/functions/_shared/admin-auth.ts` - deprecacao gradual
- [ ] `supabase/functions/get-ai-campaign-monitor/index.ts` - auth + payload hardening
- [ ] `supabase/functions/retry-ai-campaign-assets/index.ts` - auth + role checks
- [ ] `supabase/functions/update-perplexity-config/index.ts` - migrar auth
- [ ] `supabase/functions/update-nanobanana-config/index.ts` - migrar auth
- [ ] `supabase/functions/read-nanobanana-reference/index.ts` - migrar auth
- [ ] `supabase/functions/update-onboarding-copy/index.ts` - migrar auth
- [ ] `supabase/functions/set-onboarding-access/index.ts` - migrar auth

---

## 10) Definicao de Pronto (Definition of Done)

Um item deste backlog so pode ser marcado como concluido quando:
- [ ] Contexto foi lido na ordem correta (Context Engineering).
- [ ] `functionSpec.md` foi criado/atualizado antes da implementacao (SDD).
- [ ] Codigo implementado aderente ao spec.
- [ ] Regressao manual validada no onboarding publico.
- [ ] Regressao manual validada no dashboard autenticado.
- [ ] Deploy executado com projeto correto (`awqtzoefutnfmnbomujt`) e evidencia registrada.
