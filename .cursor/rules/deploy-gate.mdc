---
description: Enforce npm-only deploy gate and lockfile safety before push/deploy
alwaysApply: false
globs:
  - "package.json"
  - "package-lock.json"
  - "pnpm-lock.yaml"
  - "README.md"
  - "docs/deploy-gate.md"
  - ".github/workflows/pre-push-gate.yml"
  - ".husky/pre-push"
---

# Deploy Gate (npm-only)

## Mandatory gate before push/deploy

1. This repository is npm-only.
2. Allowed lockfile: `package-lock.json`.
3. Forbidden lockfiles: `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`, `bun.lock`, `npm-shrinkwrap.json`.
4. Before push/deploy, run `npm run gate:prepush`.
5. If `package.json` changes dependencies, `package-lock.json` must be updated in the same change.

## Vercel consistency

- Build and install commands must remain compatible with npm.
- Do not introduce pnpm-based instructions in docs or scripts.
