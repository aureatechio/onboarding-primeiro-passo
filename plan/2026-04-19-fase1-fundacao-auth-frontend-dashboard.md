# Fase 1 - Fundacao de Auth no Frontend (Dashboard)

Data: 2026-04-19
Status: pronto para execucao
Dependencia: `plan/2026-04-17-fase0-definicao-acesso-dashboard.md` (GO concluido)
ADR base: `docs/adr/2026-04-17-adr-auth-dashboard-supabase-session.md`

## Objetivo

Criar a base de autenticacao no frontend para rotas internas (`/ai-step2/*` e `/copy-editor`) com sessao real via Supabase Auth, guard central, fluxo de login/logout e comportamento padrao de erro de sessao.

## Fora de escopo desta fase

- Migrar chamadas HTTP para bearer token (Fase 2).
- Alterar auth dos endpoints Edge Functions (Fase 3).
- Remover definitivamente `x-admin-password` do frontend (Fase 2).

## Decisoes fechadas para implementacao

1. Provider de identidade: Supabase Auth (`@supabase/supabase-js`).
2. Sessao: JWT + refresh token gerenciado pelo client.
3. Rotas protegidas nesta fase:
- `/ai-step2/monitor`
- `/ai-step2/perplexity-config`
- `/ai-step2/nanobanana-config`
- `/ai-step2/post-gen`
- `/ai-step2/post-turbo`
- `/ai-step2/gallery`
- `/copy-editor`
4. Roles definidos no contrato (`admin`, `supervisor`, `operacao`, `leitura`) mas ainda sem enforcement fino de permissao no frontend nesta fase.

## Entregaveis obrigatorios

### E1) Dependencias e ambiente

- [ ] Adicionar dependencia `@supabase/supabase-js` no frontend.
- [ ] Atualizar `.env.example` com `VITE_SUPABASE_ANON_KEY`.
- [ ] Validar que o app falha de forma explicita quando `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` nao estiverem configuradas para rotas internas.

Arquivos alvo:
- `package.json`
- `.env.example`

### E2) Cliente de autenticacao

- [ ] Criar `src/lib/auth-client.js` com cliente Supabase singleton.
- [ ] Expor helper `hasAuthEnv()` para validar env.

Contrato proposto:

```js
export const authClient
export function hasAuthEnv()
```

Arquivos alvo:
- `src/lib/auth-client.js` (novo)

### E3) AuthContext global

- [ ] Criar `src/context/AuthContext.jsx`.
- [ ] Expor estado: `session`, `user`, `isAuthLoading`, `isAuthenticated`.
- [ ] Expor acoes: `signInWithPassword`, `signOut`, `refreshSession`.
- [ ] Escutar `onAuthStateChange` para manter estado sincronizado.
- [ ] Implementar comportamento 401 baseline: tentativa unica de `refreshSession`; em falha, limpar sessao.

Contrato proposto:

```js
export function AuthProvider({ children })
export function useAuth()
```

Arquivos alvo:
- `src/context/AuthContext.jsx` (novo)

### E4) Tela de login interno

- [ ] Criar `src/pages/Login.jsx` com form email/senha.
- [ ] Ler `next` via querystring para redirecionamento pos-login.
- [ ] Exibir estados: carregando, erro de credencial, erro de configuracao de env.
- [ ] Se ja autenticado, redirecionar automaticamente para `next` (ou `/ai-step2/monitor?mode=list`).

Arquivos alvo:
- `src/pages/Login.jsx` (novo)

### E5) Guard central de rotas no App

- [ ] Refatorar `src/App.jsx` para detectar rota interna protegida.
- [ ] Antes de renderizar pagina interna:
  - aguardar `isAuthLoading`;
  - se sem sessao, redirecionar para `/login?next=<rota atual>`.
- [ ] Permitir acesso livre ao fluxo de onboarding publico (`/` + steps).
- [ ] Incluir rota `/login` no roteador manual atual.

Arquivos alvo:
- `src/App.jsx`

### E6) Logout e UX minima de sessao

- [ ] Adicionar acao de logout visivel para paginas internas (preferencialmente em `MonitorLayout`).
- [ ] Em logout, redirecionar para `/login`.
- [ ] Exibir estado de sessao expirando/falha de sessao em paginas internas (banner simples).

Arquivos alvo:
- `src/pages/AiStep2Monitor/MonitorLayout.jsx`
- `src/pages/CopyEditor/index.jsx` (se necessario para acao de logout consistente)

## Sequencia de implementacao recomendada

1. E1 (dependencias/env)
2. E2 (auth client)
3. E3 (AuthContext)
4. E4 (Login)
5. E5 (Guard no App)
6. E6 (Logout/UX)

## Validacao e testes (fase 1)

### Smoke manual obrigatorio

- [ ] Acessar `/ai-step2/monitor` sem sessao -> redireciona para `/login`.
- [ ] Login valido -> volta para rota `next` solicitada.
- [ ] Login invalido -> erro amigavel sem crash.
- [ ] Refresh da pagina com sessao ativa em rota interna -> continua autenticado.
- [ ] Logout em rota interna -> volta para `/login` e bloqueia acesso direto.
- [ ] Fluxo onboarding publico (`/`) segue abrindo sem login.

### Regressao tecnica

- [ ] `npm run lint`
- [ ] `npm run build`

## Criterios de aceite da fase

- [ ] Rotas internas nao renderizam conteudo sem sessao valida.
- [ ] Sessao persiste no refresh e reidrata corretamente.
- [ ] Login/logout funcionam ponta a ponta no frontend.
- [ ] Onboarding publico permanece inalterado no comportamento.
- [ ] Nenhuma decisao de acesso pendente para iniciar Fase 2.

## Riscos e mitigacoes

1. Risco: quebra de navegacao por roteamento manual.
- Mitigacao: encapsular guard em utilitario unico no `App.jsx` e preservar `aurea:location-change`.

2. Risco: loop de redirect login/rota interna.
- Mitigacao: regra explicita para rota `/login` nunca acionar guard de protegido.

3. Risco: ambiente sem `ANON_KEY` em dev.
- Mitigacao: mensagem explicita de configuracao pendente e fallback controlado.

## Hand-off para Fase 2

Ao concluir esta fase, a Fase 2 inicia com:
- Wrapper de fetch autenticado.
- Migracao de todas as chamadas internas para bearer token.
- Remocao de uso de `VITE_ADMIN_PASSWORD` / `x-admin-password` no frontend.
