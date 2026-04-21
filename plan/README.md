# Planos

Convenção: arquivos nomeados `YYYY-MM-DD-slug.md`. Planos concluídos ou substituídos vão para `historico/`.

## Índice ativo

- `2026-04-19-fase1-fundacao-auth-frontend-dashboard.md`
  Implementação da Fase 1 da autenticação do dashboard interno: dependência `@supabase/supabase-js`, `AuthContext`, tela `/login`, guard central para `/ai-step2/*` e `/copy-editor`, logout no painel e checklist de validação preservando o onboarding público.

- `2026-04-17-fase0-definicao-acesso-dashboard.md`
  Fase 0 da autenticação do dashboard: matriz RBAC (`admin`, `supervisor`, `operacao`, `leitura`), ADR de sessão com Supabase Auth (JWT + refresh), catálogo de segregação `public-only | internal-only | hybrid` por endpoint e plano de migração por lotes. Status: **GO para Fase 1**.

- `2026-04-07-alavancas-ab-sacred-face-aspect-ratio.md`
  Alavancas A+B para corrigir distorção de proporção (aspectRatio nativo) e pose alterada da celebridade (Sacred Face com safe zones). Bump para v1.1.0. **Validar status de execução antes de novo uso.**

- `2026-04-07-alavanca-d-composicao-hibrida-celebridade.md`
  Spec de composição híbrida programática: Gemini gera fundo+layout e a celebridade é composta via Sharp WASM com regras determinísticas. Pré-requisito: resultado das Alavancas A+B.

## Recorrentes

- `CHECKLIST-DEPLOY-EDGE-FUNCTIONS.md`
  Checklist operacional para deploy de Edge Functions com classificação correta de JWT (public × protected).

## Histórico

Planos já concluídos ou descontinuados ficam em `historico/`. Inclui, entre outros:

- Pipeline de onboarding-enrichment (master + 5 blocos) — hoje em produção.
- Consolidações SDD dos módulos Perplexity e NanoBanana.
- Limpeza pós-extração do monorepo.
- Diagnósticos e2e pontuais (ex.: compra `f7879bab`).
- Atualização do comando `compra-id` quando ainda vivia em `.cursor/commands`.
- Guia de `git rebase/reflog` movido para `docs/`.
