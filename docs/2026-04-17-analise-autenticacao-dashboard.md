# Analise de Complexidade e Esforco
## Implementacao de Autenticacao no Dashboard (AI-Step2 + Copy Editor)

Data: 2026-04-17  
Status: Analise tecnica concluida  
Escopo principal: rotas internas `/ai-step2/*` e `/copy-editor`, com avaliacao dos impactos no onboarding publico.

---

## 1) Resumo Executivo

A implementacao de autenticacao real no dashboard deste projeto e de **alta complexidade** (**8.5/10**).

Nao se trata apenas de adicionar tela de login. Hoje a arquitetura tem:
- SPA sem guard de rota no app principal.
- Forte dependencia de Edge Functions publicas.
- Endpoints "protegidos" por `x-admin-password` com uso de fallback/hardcode de senha.
- Acoplamento entre onboarding publico e operacao interna via funcoes compartilhadas.

**Estimativa recomendada (auth real + controle de acesso minimo por papel):**
- **18 a 29 dias uteis (1 dev)**
- **10 a 16 dias uteis (2 devs em paralelo frontend/backend)**

---

## 2) Metodologia da Analise

Foi feita varredura de:
- Arquitetura SPA, roteamento e contexto global.
- Telas do dashboard (monitor, configs, garden, copy editor).
- Chamadas frontend para Edge Functions.
- Estrategia de auth atual em cada funcao backend usada pelo dashboard.
- Regras documentadas em `.context/modules/*`, `ai-step2/CONTRACT.md`, `tasks/`, `plan/`.

Arquivos-chave inspecionados incluem (entre outros):
- `src/App.jsx`
- `src/pages/AiStep2Monitor/*`
- `src/pages/CopyEditor/*`
- `supabase/functions/*/index.ts`
- `.context/modules/onboarding/BUSINESS-RULES.md`
- `.context/modules/aurea-garden/BUSINESS-RULES.md`
- `ai-step2/CONTRACT.md`

---

## 3) Estado Atual da Arquitetura

### 3.1 Frontend

1. O app usa roteamento manual por `window.location.pathname`, sem React Router e sem guard de autenticacao em `src/App.jsx`.
2. As rotas internas estao expostas diretamente:
   - `/ai-step2/monitor`
   - `/ai-step2/perplexity-config`
   - `/ai-step2/nanobanana-config`
   - `/ai-step2/post-gen`
   - `/ai-step2/post-turbo`
   - `/ai-step2/gallery`
   - `/copy-editor`
3. `vercel.json` faz rewrite global para `index.html`, ou seja, toda rota cai na mesma SPA.
4. Nao existe fundacao de auth no frontend:
   - Sem `@supabase/supabase-js` no `package.json`.
   - `.env.example` nao expoe `VITE_SUPABASE_ANON_KEY`.

### 3.2 Backend

O dashboard consome **21 endpoints**. Classificacao atual:
- **16 publicos** (sem JWT exigido pelo gateway e sem auth de usuario no codigo).
- **5 com `x-admin-password`** (nao e auth por usuario/sessao; e senha compartilhada).

Protecao "admin" atual:
- `requireAdminPassword` usa `ADMIN_PASSWORD` com fallback default para `"megazord"`.
- Em telas do frontend ha uso de senha hardcoded/fallback (`'megazord'`).

### 3.3 Contexto de regras do projeto

As regras atuais registradas no repo reforcam que:
- Onboarding e publico, sem JWT.
- Garden e publico, sem JWT.
- Seguranca atual depende de URL/UUID e senha de cabecalho para funcoes administrativas.

Isso indica que implementar auth de dashboard exige mudanca arquitetural, nao apenas UI.

---

## 4) Inventario de Telas do Dashboard e Chamadas

### 4.1 Rotas internas mapeadas

- `/ai-step2/monitor`
- `/ai-step2/perplexity-config`
- `/ai-step2/nanobanana-config`
- `/ai-step2/post-gen`
- `/ai-step2/post-turbo`
- `/ai-step2/gallery`
- `/copy-editor`

### 4.2 Endpoints usados pelo dashboard/copy editor

| Endpoint | Uso principal | Auth atual |
|---|---|---|
| `get-ai-campaign-monitor` | Lista/detalhe operacional do pipeline | Publico |
| `retry-ai-campaign-assets` | Retry/regeneracao de assets | Publico |
| `set-onboarding-access` | Liberacao manual onboarding | `x-admin-password` |
| `save-onboarding-identity` | Edicao de identidade via monitor | Publico |
| `save-campaign-briefing` | Edicao de briefing via monitor | Publico |
| `get-perplexity-config` | Leitura de configuracao Perplexity | Publico |
| `update-perplexity-config` | Escrita de configuracao Perplexity | `x-admin-password` |
| `discover-company-sources` | Descoberta de fontes digitais | Publico |
| `suggest-briefing-seed` | Sugestao de seed para briefing | Publico |
| `test-perplexity-briefing` | Testes de briefing | Publico |
| `get-nanobanana-config` | Leitura de configuracao NanoBanana | Publico |
| `update-nanobanana-config` | Escrita de configuracao NanoBanana | `x-admin-password` |
| `read-nanobanana-reference` | Leitura de imagem via IA para direcao | `x-admin-password` |
| `get-garden-options` | Carga de opcoes de formulario Garden | Publico |
| `post-gen-generate` | Geracao Post Gen | Publico |
| `post-turbo-generate` | Geracao Post Turbo | Publico |
| `get-garden-job` | Polling de job Garden | Publico |
| `list-garden-jobs` | Galeria de jobs Garden | Publico |
| `get-onboarding-copy` | Leitura de copy publicada | Publico |
| `update-onboarding-copy` | Publicacao de copy | `x-admin-password` |
| `get-onboarding-data` | Hidrata dados de compra/onboarding | Publico |

---

## 5) Principais Riscos Encontrados

## 5.1 Risco critico: "protecao admin" fraca

- Senha admin com fallback default no backend.
- Hardcode/fallback da mesma senha em frontend de operacao.
- Modelo nao e identidade de usuario, nao tem sessao, nao tem trilha por usuario real.

Impacto:
- Exposicao de operacoes administrativas e de configuracao sensivel.
- Dificuldade de compliance e auditoria.

## 5.2 Risco critico: dados operacionais sensiveis expostos por endpoint publico

`get-ai-campaign-monitor` retorna payloads amplas com:
- dados de compra
- dados de onboarding
- diagnosticos internos
- links assinados de assets

Impacto:
- Exposicao de dados internos do funil operacional.

## 5.3 Risco alto: acoplamento entre onboarding publico e dashboard interno

Exemplo: `save-onboarding-identity` e usado tanto no onboarding quanto no monitor.

Impacto:
- Se proteger "direto" sem separacao de responsabilidades, pode quebrar fluxo publico de cliente.

## 5.4 Risco alto: superficie grande de migracao

Sao 21 endpoints consumidos no dashboard/copy editor e 11 arquivos frontend com chamadas diretas.

Impacto:
- Mudanca parcial tende a deixar brechas.

## 5.5 Gap entre plano e implementacao

Existem planos antigos sugerindo migracao para auth por JWT/usuario, mas o estado atual ainda opera majoritariamente em modo publico + senha de cabecalho.

Impacto:
- Sensacao de seguranca "ja resolvida" sem cobertura real em runtime.

---

## 6) Complexidade por Bloco

### Bloco A - Fundacao de Auth no Frontend (Alta)

Escopo:
- Cliente Supabase auth.
- Sessao persistente e refresh.
- Context/provider de autenticacao.
- Login/logout e telas de acesso.

Complexidade: alta (base inexistente hoje).

### Bloco B - Guard de Rotas Internas (Media/Alta)

Escopo:
- Guard central para `/ai-step2/*` e `/copy-editor`.
- Redirecionamento para login.
- Tratamento de estados (carregando sessao, expirado, sem permissao).

Complexidade: media/alta (roteamento manual atual).

### Bloco C - Retrofit de chamadas HTTP (Alta)

Escopo:
- Padronizar chamada autenticada para todas as telas internas.
- Remover hardcode/fallback de senha.
- Tratar 401/403 e expiracao de sessao.

Complexidade: alta (chamadas dispersas em varios modulos).

### Bloco D - Hardening Backend para dashboard (Alta)

Escopo:
- Definir endpoints internos que devem exigir usuario autenticado.
- Trocar guard por modelo baseado em usuario/papel (nao senha global).
- Rever exposicao de payloads sensiveis.

Complexidade: alta.

### Bloco E - Separacao onboarding publico x operacao interna (Alta)

Escopo:
- Evitar quebrar onboarding sem JWT.
- Separar endpoints ou criar camada interna dedicada.
- Ajustar contratos de payload onde necessario.

Complexidade: alta e critica para rollout seguro.

### Bloco F - QA, rollout e observabilidade (Media/Alta)

Escopo:
- Plano de deploy faseado.
- Testes de regressao de onboarding e dashboard.
- Logs e auditoria de acesso.

Complexidade: media/alta.

---

## 7) Estimativas

## 7.1 Estimativa recomendada (auth real)

- Descoberta + desenho de acesso: **2-3 dias**
- Fundacao frontend auth + guards: **3-5 dias**
- Backend hardening dashboard: **6-10 dias**
- Separacao de endpoints compartilhados: **4-6 dias**
- QA + rollout: **3-5 dias**

**Total (1 dev): 18-29 dias uteis**  
**Total (2 devs em paralelo): 10-16 dias uteis**

## 7.2 Cenarios

1. **Rapido / paliativo (2-4 dias)**
   - Gate visual + pequenos ajustes
   - Mantem modelo fragil de senha compartilhada
   - Nao recomendado como estado final

2. **Recomendado (3-6 semanas)**
   - Auth real por usuario/sessao
   - Protecao consistente de rotas e endpoints internos
   - Preserva onboarding publico sem regressao

3. **Robusto enterprise (6-10 semanas)**
   - RBAC fino por acao
   - Auditoria completa
   - Hardening ampliado de seguranca/observabilidade

---

## 8) Plano de Execucao Sugerido (Fases)

### Fase 0 - Definicao de Acesso (obrigatoria)

Decidir:
- Quem acessa dashboard?
- Quais papeis?
- Quais acoes cada papel pode executar?

Entregavel:
- Matriz de permissao por tela/acao.

### Fase 1 - Auth Base + Guard de Rotas

Entregaveis:
- Login/logout/sessao.
- Guard para `/ai-step2/*` e `/copy-editor`.

### Fase 2 - Retrofit Frontend

Entregaveis:
- Camada unica de request autenticada.
- Remocao total de `x-admin-password` no frontend.
- Tratamento padrao de erro de auth.

### Fase 3 - Endpoints Internos Seguros

Entregaveis:
- Endpoints internos protegidos por usuario autenticado.
- Politicas de autorizacao por papel.

### Fase 4 - Separacao de responsabilidades

Entregaveis:
- Preservar onboarding publico.
- Criar variantes internas quando necessario.
- Ajustar chamadas do monitor para endpoints internos.

### Fase 5 - QA + Rollout

Entregaveis:
- Testes de regressao de onboarding e dashboard.
- Checklist de deploy com rollback.
- Auditoria de acessos e acoes criticas.

---

## 9) Dependencias e Decisoes Pendentes

1. Modelo de identidade de usuario (Supabase Auth, provider, SSO etc).
2. Matriz de papeis (ex: admin, supervisor, operacao, leitura).
3. Politica de segregacao entre funcoes publicas e internas.
4. Estrategia de migracao sem downtime para telas operacionais.
5. Nivel de auditoria esperado por compliance.

---

## 10) Recomendacao Final

Implementar autenticacao de dashboard em fases, com prioridade para:
1. Guard de rota + sessao real.
2. Eliminacao de `x-admin-password` no frontend.
3. Protecao de endpoints internos de monitor/config.
4. Separacao explicita entre onboarding publico e operacao interna.

Essa ordem reduz risco de regressao no onboarding e fecha as principais exposicoes de seguranca do dashboard.

