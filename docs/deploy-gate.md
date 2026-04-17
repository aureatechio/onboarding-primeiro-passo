# Deploy Gate (npm-only)

Este documento define o gate de seguranca para evitar falhas de deploy por divergencia de lockfile/package manager.

## Politica oficial

- Package manager oficial: `npm`
- Lockfile oficial: `package-lock.json`
- Lockfiles proibidos: `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`, `bun.lock`, `npm-shrinkwrap.json`

## Gate obrigatorio

Rodar antes de push/deploy:

```bash
npm run gate:prepush
```

Esse comando executa:

1. `npm run gate:lockfiles`
2. `npm run gate:deps`
3. `npm run lint`
4. `npm run build`

## Troubleshooting rapido

### Erro: lockfile proibido encontrado

- Remova o lockfile proibido
- Garanta que apenas `package-lock.json` exista no repo

### Erro: `npm ci` falhou por lockfile desatualizado

- Atualize dependencias com `npm install`
- Commit `package.json` e `package-lock.json` juntos

### Erro no lint/build

- Corrija os problemas reportados
- Rode novamente `npm run gate:prepush`

## CI

O workflow `pre-push-gate` em `.github/workflows/pre-push-gate.yml` replica o mesmo gate para `push` e `pull_request`.
