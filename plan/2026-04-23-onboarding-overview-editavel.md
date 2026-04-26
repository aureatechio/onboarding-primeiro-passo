# 2026-04-23 — Edicao da Visao Geral do Onboarding + Historico de Logos (ONB-23)

## Contexto

A aba `onboarding-data` do painel Monitor (`src/pages/AiStep2Monitor/DetailModePanel.jsx`) era read-only e bloqueava o time operacional. Este plano torna os campos editaveis, adiciona historico de logos com 1 ativo por compra, e introduz precedencia de `brand_display_name` sobre `clientes.nome` nos jobs IA.

Linear: [ONB-23](https://linear.app/aureatech/issue/ONB-23).

## Decisoes travadas

1. `brand_display_name` em `onboarding_identity` tem precedencia nos jobs IA sobre `clientes.nome`.
2. Celebridade, Pagamento, Contrato permanecem read-only (com tooltip `ReadOnlyBadge`).
3. Paleta editavel via `<input type="color">` nativo + drag-and-drop HTML5 (sem deps extras).
4. Site / Instagram / Notas em tres campos dedicados (coluna `instagram_handle` adicionada).
5. Logo: upload + historico ilimitado, 1 ativo, delete manual bloqueado no ativo (409 `ACTIVE_LOGO_PROTECTED`).
6. Regeneracao de jobs IA via botao manual (`retry-ai-campaign-assets` com `mode=all`).
7. Edges admin sao protegidas (JWT + `requireAuth`). `get-ai-campaign-monitor` e `save-onboarding-identity` seguem publicas.

## Entregaveis

### Backend (Supabase)

- Migration: `supabase/migrations/20260424100000_onboarding_edit_and_logo_history.sql` — adiciona `brand_display_name`, `instagram_handle`, cria `onboarding_logo_history` com unique partial index em `(compra_id) WHERE is_active`.
- Shared:
  - `_shared/auth.ts` — `requireAuth`, `isAuthError`.
  - `_shared/onboarding-validation.ts` — validadores (`validateBrandDisplayName`, `validateInstagramHandle`, `validateSiteUrl`, `validateCampaignNotes`, `validateBrandPalette`, `validateLogoFile`).
- `get-ai-campaign-monitor` (publica) — passa a retornar `brand_display_name`, `instagram_handle`, `site_url` e `logo_history` (com signed URLs).
- 4 edges admin **protegidas** (JWT):
  - `admin-update-onboarding-identity`
  - `admin-upload-logo`
  - `admin-set-active-logo`
  - `admin-delete-logo-from-history`
- Precedencia de `brand_display_name` aplicada em:
  - `create-ai-campaign-job` (`clientName`)
  - `onboarding-enrichment` (`companyName`)

### Frontend (React SPA)

- `src/lib/admin-edge.js` — helper `adminFetch` com refresh automatico em 401.
- `src/pages/AiStep2Monitor/useOnboardingEdit.js` — hook consolidando mutations (save field, upload, set active, delete, regenerate).
- `src/pages/AiStep2Monitor/components/onboarding-edit/`:
  - `OnboardingDataCard` (card wrapper com hover glow Acelerai Blue)
  - `EditableField` (Enter/Esc/Cmd+Enter)
  - `ReadOnlyBadge` (tooltip)
  - `PaletteEditor` (color picker + drag reorder nativos)
  - `SiteInstagramEditor` (dois campos + checkbox re-enrich)
  - `LogoManager` (+ `LogoHistoryGallery`)
  - `ChangeBanner` (sessionStorage por compra_id)
  - `OnboardingDataTab` (composicao final)
- Refactor em `DetailModePanel.jsx` — substitui blocos read-only + `DataRow` por `OnboardingDataTab`. Props novas: `compraId`, `jobId`, `reload`.

### Tests

- `_shared/onboarding-validation.test.ts` (21 testes).
- `_shared/auth.test.ts` (3 testes). Todos passando via `deno test --allow-env --allow-net --allow-read`.

### Docs

- `.context/modules/onboarding/BUSINESS-RULES.md` — regras 18 (precedencia), 19 (historico de logos), 20 (JWT admin).

## Deploy

```bash
supabase functions deploy get-ai-campaign-monitor --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
supabase functions deploy admin-update-onboarding-identity --project-ref awqtzoefutnfmnbomujt
supabase functions deploy admin-upload-logo --project-ref awqtzoefutnfmnbomujt
supabase functions deploy admin-set-active-logo --project-ref awqtzoefutnfmnbomujt
supabase functions deploy admin-delete-logo-from-history --project-ref awqtzoefutnfmnbomujt
supabase functions deploy create-ai-campaign-job --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
supabase functions deploy onboarding-enrichment --project-ref awqtzoefutnfmnbomujt --no-verify-jwt
```

## Checklist QA manual

- [ ] Editar `brand_display_name` e confirmar que Briefing/NanoBanana usam o novo nome.
- [ ] Upload de logo (happy path, >5MB bloqueado, mime invalido bloqueado).
- [ ] Trocar ativo; tentar deletar o ativo → 409.
- [ ] Deletar logo inativo → sucesso.
- [ ] Paleta: add, remove, reorder, hex invalido mostra erro inline.
- [ ] Banner "Alteracoes salvas" aparece apos save, botao "Regerar jobs" chama `retry-ai-campaign-assets mode=all` e zera o banner.
- [ ] Re-enrich (opt-in) dispara `onboarding-enrichment` quando site/instagram mudam.
- [ ] 401 em edge admin forca refresh automatico da sessao (uma vez) antes de propagar erro.

## Commits sugeridos

1. `fix(migration): add instagram_handle column to onboarding_identity`
2. `feat(monitor): return brand_display_name, instagram_handle and logo_history in get-ai-campaign-monitor`
3. `feat(onboarding): add admin edges for identity edit and logo management`
4. `feat(monitor): editable onboarding overview with logo history UI`
5. `feat(ai-campaign): brand_display_name precedence over clientes.nome`
6. `docs(onboarding): business rules for brand_display_name, logo history and admin JWT`
