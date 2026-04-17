#!/usr/bin/env bash
set -euo pipefail

for forbidden in pnpm-lock.yaml yarn.lock bun.lockb bun.lock npm-shrinkwrap.json; do
  if [[ -f "$forbidden" ]]; then
    echo "[gate:lockfiles] Arquivo de lockfile nao permitido encontrado: $forbidden"
    echo "[gate:lockfiles] Este repositorio usa npm com package-lock.json unico."
    exit 1
  fi
done

if [[ ! -f package-lock.json ]]; then
  echo "[gate:lockfiles] package-lock.json nao encontrado."
  echo "[gate:lockfiles] Gere com npm install e tente novamente."
  exit 1
fi

echo "[gate:lockfiles] OK - lockfiles validados."
