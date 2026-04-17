# ADR 2026-04-17: Auth do Dashboard com Supabase Auth (JWT + Refresh)

Status: aprovado para execucao
Data: 2026-04-17
Escopo: rotas internas `/ai-step2/*` e `/copy-editor`

## Contexto

O dashboard interno opera hoje sem sessao de usuario real no frontend e com endpoints sensiveis expostos como publicos, incluindo guard por `x-admin-password` em partes do backend. A Fase 0 exige fechar um modelo de identidade e sessao sem quebrar o onboarding publico.

## Decisao

Adotar **Supabase Auth** para o dashboard interno com:
- Sessao baseada em **JWT de usuario**.
- **Refresh token** gerenciado pelo client (`@supabase/supabase-js`).
- Controle de acesso por **papel** (RBAC): `admin`, `supervisor`, `operacao`, `leitura`.

Contrato inicial:

```ts
export type Role = 'admin' | 'supervisor' | 'operacao' | 'leitura'
```

## Regras operacionais de sessao

1. Persistencia de sessao:
- Sessao persiste entre refresh de pagina.
- Guard de rota bloqueia acesso a `/ai-step2/*` e `/copy-editor` sem sessao valida.

2. Fluxo 401:
- Tentar refresh de sessao 1 vez.
- Se ainda 401, encerrar sessao e redirecionar para login com retorno de rota (`next`).

3. Fluxo 403:
- Nao derruba sessao.
- Exibir "sem permissao" e bloquear acao.

4. Logout:
- Logout global (encerrar sessao ativa e limpar estado local).

5. Reautenticacao para acoes criticas:
- Acoes criticas exigem sessao "recente" (janela de 30 minutos).
- Se sessao fora da janela, forcar novo login antes da acao.
- Acoes criticas nesta fase: `update-perplexity-config`, `update-nanobanana-config`, `set-onboarding-access`, `update-onboarding-copy`.

## Alternativas descartadas

1. Manter `x-admin-password` no frontend:
- Descartado por risco alto (senha compartilhada, hardcode/fallback, sem rastreabilidade por usuario).

2. Auth custom no frontend sem Supabase Auth:
- Descartado por custo de implementacao e maior risco operacional.

3. Proteger tudo com service role no frontend:
- Descartado por risco critico de seguranca.

## Impacto nas fases seguintes

- Fase 1 (frontend auth + guard):
  - Adicionar `@supabase/supabase-js`, `AuthContext`, login/logout e guard central.

- Fase 2 (retrofit de chamadas):
  - Migrar chamadas de telas internas para cliente autenticado.
  - Remover uso de `x-admin-password` no frontend.

- Fase 3 (backend hardening):
  - Trocar `requireAdminPassword` por auth/autorizacao de usuario + papel nos endpoints internos.

## Compatibilidade

- Onboarding publico permanece sem login de usuario final.
- Endpoints hibridos terao separacao de contrato (publico x interno) conforme catalogo da Fase 0.
