#!/bin/bash
# =============================================================
# Limpeza Pós-Extração do Monorepo — Fases 0 e 1
# Plano: plan/2026-04-06-limpeza-pos-extracao-monorepo.md
# =============================================================
# Execute na raiz do repo: bash scripts/cleanup-monorepo-artifacts.sh
# =============================================================

set -euo pipefail

echo "=== Fase 0: Remover artefatos do monorepo do disco ==="

# Diretórios vazios
rmdir apps/ 2>/dev/null && echo "  ✓ apps/ removido" || echo "  - apps/ já não existe"
rmdir packages/ 2>/dev/null && echo "  ✓ packages/ removido" || echo "  - packages/ já não existe"

# Configs do monorepo
rm -f pnpm-workspace.yaml && echo "  ✓ pnpm-workspace.yaml removido" || true
rm -f turbo.json && echo "  ✓ turbo.json removido" || true

echo ""
echo "=== Fase 1: Remover 20 _shared files dead code do checkout ==="

DEAD_FILES=(
  supabase/functions/_shared/checkout-contracts.ts
  supabase/functions/_shared/checkout-status.ts
  supabase/functions/_shared/checkout-url.ts
  supabase/functions/_shared/checkout-url.test.ts
  supabase/functions/_shared/checkout-session-errors.ts
  supabase/functions/_shared/checkout-session-errors.test.ts
  supabase/functions/_shared/boleto-parcelado.ts
  supabase/functions/_shared/boleto-parcelado.test.ts
  supabase/functions/_shared/card-brand.ts
  supabase/functions/_shared/decline-mapping.ts
  supabase/functions/_shared/idempotency.ts
  supabase/functions/_shared/lead-stage.ts
  supabase/functions/_shared/payment-visibility.ts
  supabase/functions/_shared/pix-discount.ts
  supabase/functions/_shared/rate-limit.ts
  supabase/functions/_shared/security-logger.ts
  supabase/functions/_shared/split.ts
  supabase/functions/_shared/split.test.ts
  supabase/functions/_shared/turnstile.ts
  supabase/functions/_shared/validation.ts
)

count=0
for f in "${DEAD_FILES[@]}"; do
  if [ -f "$f" ]; then
    rm "$f"
    echo "  ✓ $f"
    ((count++))
  fi
done
echo "  $count arquivos removidos"

echo ""
echo "=== Commit ==="

git add -A supabase/functions/_shared/ apps/ packages/ pnpm-workspace.yaml turbo.json .gitignore 2>/dev/null || true

git commit -m "$(cat <<'EOF'
chore: limpeza pós-extração do monorepo (fases 0 e 1)

Fase 0: Remove diretórios vazios (apps/, packages/) e configs
órfãos (pnpm-workspace.yaml, turbo.json) do monorepo AUREA.
Corrige .gitignore truncado para prevenir re-adição.

Fase 1: Remove 20 arquivos de _shared/ dead code do checkout
(checkout-contracts, boleto-parcelado, split, card-brand, etc.)
que nenhuma das 31 Edge Functions locais importa.

Ref: plan/2026-04-06-limpeza-pos-extracao-monorepo.md

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

echo ""
echo "=== Verificação ==="
echo "git status:"
git status --short
echo ""
echo "Dead imports check:"
test ! -f supabase/functions/_shared/checkout-contracts.ts && echo "  ✓ checkout-contracts.ts removido" || echo "  ✗ AINDA EXISTE"
echo ""
echo "Monorepo artifacts check:"
test ! -d apps/ && echo "  ✓ apps/ removido" || echo "  ✗ AINDA EXISTE"
test ! -d packages/ && echo "  ✓ packages/ removido" || echo "  ✗ AINDA EXISTE"
test ! -f pnpm-workspace.yaml && echo "  ✓ pnpm-workspace.yaml removido" || echo "  ✗ AINDA EXISTE"
test ! -f turbo.json && echo "  ✓ turbo.json removido" || echo "  ✗ AINDA EXISTE"
echo ""
echo "✅ Limpeza concluída!"
