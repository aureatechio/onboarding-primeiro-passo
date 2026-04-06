# Extração do Onboarding para Repositório Próprio

**Data:** 2026-04-02
**Status:** Planejado
**Autor:** Anderson + Claude

---

## Contexto

O `apps/onboarding` (`primeiro-passo-app`) é um SPA React que funciona de forma 100% independente dentro do monorepo. Ele não usa `@aurea/shared`, não estende tsconfig/eslint compartilhados e se comunica com o backend exclusivamente via HTTP (Supabase Edge Functions + webhooks). A extração para repositório próprio reduz o peso do monorepo (~228MB) e dá ao onboarding autonomia total de CI/CD.

## Análise de Acoplamento

| Aspecto | Resultado |
|---------|-----------|
| Imports de `@aurea/*` | Nenhum |
| Extends de tsconfig compartilhado | Nenhum (app é JS puro) |
| Extends de eslint compartilhado | Nenhum (eslint.config.js standalone) |
| Dependências do `packages/shared` | Nenhuma |
| Referências em turbo.json | Genéricas (sem tasks específicas) |
| Comunicação com outros apps | Apenas via Supabase (HTTP fetch) |
| Deploy | Vercel project independente (`onboarding-primeiro-passo`) |

**Dependências externas que permanecem no monorepo:**

As Edge Functions consumidas pelo onboarding continuam no monorepo (são parte do Supabase compartilhado). Isso é esperado e não bloqueia a extração.

- `get-onboarding-data`
- `list-onboarding-eligible-purchases`
- `save-onboarding-identity`
- `create-ai-campaign-job`
- `generate-campaign-briefing`
- `save-campaign-briefing`
- `get-ai-campaign-monitor`

## Guia Passo a Passo

### Pré-requisitos

- `git-filter-repo` instalado (`pip install git-filter-repo` ou `brew install git-filter-repo`)
- Acesso admin à org no GitHub para criar o novo repo
- Backup do monorepo (ou branch de segurança)

### Fase 1 — Criar o novo repositório com histórico

```bash
# 1. Clone limpo do monorepo (NÃO usar o working copy)
git clone --no-hardlinks git@github.com:aureatech/integracoes-crm.git onboarding-extract
cd onboarding-extract

# 2. Extrair apenas o diretório apps/onboarding com histórico
git filter-repo --path apps/onboarding/ --path-rename apps/onboarding/:

# 3. Verificar que o histórico está correto
git log --oneline -20
# Deve mostrar apenas commits que tocaram apps/onboarding

# 4. Criar o novo repo no GitHub
gh repo create aureatech/onboarding --private --source=. --push
```

> **Nota:** `--path-rename apps/onboarding/:` move os arquivos da subpasta para a raiz do novo repo.

### Fase 2 — Configurar o novo repositório

```bash
cd onboarding-extract  # agora é o novo repo

# 5. Criar .env.example com as variáveis necessárias
cat > .env.example << 'EOF'
VITE_SUPABASE_URL=https://awqtzoefutnfmnbomujt.supabase.co
VITE_ONBOARDING_BASE_URL=https://onboarding-primeiro-passo.vercel.app/
VITE_TRAFFIC_MATERIAL_URL=
VITE_TRAFFIC_MATERIAL_WEBHOOK_ENDPOINT=
EOF

# 6. Garantir que .gitignore está correto
# Já existe um .gitignore no onboarding — verificar que inclui:
#   node_modules/
#   dist/
#   .env
#   .env.local
#   .vercel/
#   .turbo/

# 7. Instalar dependências e validar build
pnpm install   # ou npm install (o app não depende de pnpm workspace)
pnpm build
pnpm dev       # testar localmente
```

### Fase 3 — Reconectar Vercel

O projeto Vercel `onboarding-primeiro-passo` (ID: `prj_jSdZvNeapKDQGD9qqlTzpq38sHon`) já existe. Há duas opções:

**Opção A — Reconectar o projeto existente (recomendado):**

1. Acessar https://vercel.com/dashboard → projeto `onboarding-primeiro-passo`
2. Settings → Git → Disconnect repository
3. Connect to new repository → selecionar `aureatech/onboarding`
4. Root Directory: `.` (raiz, não mais `apps/onboarding`)
5. Build Command: `pnpm build` (ou `vite build`)
6. Output Directory: `dist`
7. Configurar env vars (copiar do projeto atual)

**Opção B — Criar novo projeto Vercel:**

```bash
cd onboarding-extract
vercel link  # seguir wizard, criar novo projeto
vercel env pull .env.local
vercel deploy --prod
```

### Fase 4 — Limpar o monorepo

```bash
# Voltar ao monorepo original
cd /path/to/integracoes-crm

# 8. Criar branch de limpeza
git checkout -b chore/remove-onboarding

# 9. Remover o diretório
rm -rf apps/onboarding

# 10. Atualizar referências
# - pnpm-workspace.yaml: nenhuma mudança necessária (usa apps/*)
# - turbo.json: nenhuma mudança necessária (tasks genéricas)
# - Root vercel.json: sem referência ao onboarding

# 11. Verificar que o monorepo continua funcionando
pnpm install
pnpm build
pnpm typecheck
pnpm test

# 12. Commit e PR
git add -A
git commit -m "chore: remove apps/onboarding (migrado para repo aureatech/onboarding)"
gh pr create --title "chore: remove onboarding do monorepo" \
  --body "O onboarding foi extraído para repo próprio: aureatech/onboarding"
```

### Fase 5 — Validação pós-extração

Checklist de validação (executar após merge dos dois lados):

- [ ] `pnpm build` no monorepo passa sem erros
- [ ] `pnpm test` no monorepo passa sem erros
- [ ] Build do novo repo funciona (`pnpm build`)
- [ ] Deploy Vercel do onboarding funciona (preview + prod)
- [ ] Navegação completa do onboarding funcional (Etapa1 → EtapaFinal)
- [ ] Chamadas às Edge Functions retornam dados corretamente
- [ ] Webhook de material (Etapa5) funciona
- [ ] AI Steps (campaign briefing, monitor) funcionam
- [ ] Dashboard hook `useOnboardingEligiblePurchases` continua funcionando (chama Edge Function, não o app)

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|--------------|-----------|
| Vercel perde configuração ao reconectar | Baixa | Documentar env vars antes de desconectar |
| Edge Functions param de responder | Nenhuma | Functions estão no Supabase, independente do repo |
| Build quebra no monorepo | Muito baixa | Rodar checklist completo antes de mergear |
| Histórico git incompleto | Baixa | Validar com `git log` após filter-repo |

## Decisões Tomadas

- **Histórico:** preservar via `git-filter-repo`
- **Destino:** mesma org GitHub (`aureatech/onboarding`)
- **Edge Functions:** permanecem no monorepo (são parte do Supabase compartilhado)
- **Package manager:** manter pnpm por consistência, mas npm também funciona (sem workspace)
