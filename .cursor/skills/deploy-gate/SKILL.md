---
name: deploy-gate
description: Diagnostica e previne falhas de deploy causadas por lockfile/package manager inconsistente (npm-only) com gate local e CI.
---

# Deploy Gate Skill

Use esta skill quando o pedido envolver:
- erro de deploy em Vercel por lockfile/package manager
- divergencia entre `package.json` e lockfile
- criacao/manutencao de gate pre-push e workflow CI

## Objetivo

Garantir que o repositorio permaneça em `npm` unico, com lockfile consistente e build validado antes de push/deploy.

## Checklist de diagnostico

1. Confirmar package manager em `package.json` (`packageManager: npm@...`).
2. Verificar existencia de lockfiles proibidos (`pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`, `bun.lock`, `npm-shrinkwrap.json`).
3. Validar lockfile com `npm ci`.
4. Executar `npm run lint` e `npm run build`.
5. Confirmar que hook `.husky/pre-push` chama `npm run gate:prepush`.
6. Confirmar workflow `.github/workflows/pre-push-gate.yml` rodando os mesmos checks.

## Padrao de resposta

- Resumo da causa raiz
- Evidencias objetivas (arquivos e sinais)
- Correcao aplicada
- Resultado da validacao local/CI
- Proximos passos (se houver)
