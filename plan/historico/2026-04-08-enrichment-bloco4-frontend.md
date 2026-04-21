# Bloco 4 — Frontend

**Orquestrador**: `2026-04-08-onboarding-enrichment-master.md`
**Spec**: `supabase/functions/onboarding-enrichment/functionSpec.md`
**Dependencia**: Bloco 1 (colunas no banco) + Bloco 3 (endpoints existem)

## Objetivo

Ajustar o SPA de onboarding para enviar os dados nos novos campos e refletir o novo fluxo (sem briefing manual, sem production_path visivel).

## Tarefas

### T4.1 — Alterar `Etapa62.jsx`

**Arquivo**: `src/pages/Etapa62.jsx`

**Alteracoes na funcao `saveIdentityToBackend`:**

1. Enviar `site_url` e `instagram_handle` como campos separados no FormData:
   ```
   formData.append("site_url", siteUrl)
   formData.append("instagram_handle", instagramHandle)
   ```

2. Manter envio de `campaign_notes` por compatibilidade (o backend aceita ambos):
   ```
   formData.append("campaign_notes", parts.join(' | '))
   ```

3. Remover qualquer referencia a `production_path` no frontend (o backend define automaticamente).

**Nota**: A UI de coleta (logo, site, instagram) nao muda — apenas o payload enviado.

### T4.2 — Alterar `OnboardingContext.jsx`

**Arquivo**: `src/context/OnboardingContext.jsx`

**Alteracoes na hidratacao (funcao `mapRemotePayloadToUserData` ou equivalente):**

1. Ler `site_url` e `instagram_handle` diretamente da identity retornada por `get-onboarding-data`:
   ```javascript
   siteUrl: identity?.site_url ?? null,
   instagramHandle: identity?.instagram_handle ?? null,
   ```

2. Remover parse de `campaign_notes` para extrair site/instagram (logica fragil com regex).

3. Manter `campaign_notes` no state para compatibilidade, mas nao usá-lo como fonte de site/instagram.

**Dependencia**: `get-onboarding-data` precisa retornar as novas colunas. Verificar se o SELECT de `onboarding_identity` no `get-onboarding-data/index.ts` inclui `site_url` e `instagram_handle`. Se nao, adicionar.

### T4.3 — Alterar `get-onboarding-data/index.ts`

**Arquivo**: `supabase/functions/get-onboarding-data/index.ts`

Adicionar `site_url` e `instagram_handle` ao SELECT de `onboarding_identity` (linha 173-175 atual):
```typescript
.select('choice, logo_path, brand_palette, font_choice, campaign_images_paths, campaign_notes, production_path, site_url, instagram_handle, updated_at')
```

Adicionar ao type `OnboardingIdentityRow` e `IdentityPayload`.

### T4.4 — Alterar `EtapaFinal.jsx`

**Arquivo**: `src/pages/EtapaFinal.jsx`

**Alteracoes:**

1. **Remover linha de "Producao"** no resumo (linha 151):
   - Antes: mostra "Standard" ou "Hibrido" baseado em `userData.productionPath`
   - Agora: remover completamente (nao e mais conceito visivel ao cliente)

2. **Remover linhas de "Briefing" e "Briefing IA"** no resumo (linhas 152-153):
   - Antes: mostra modo do briefing e status de geracao
   - Agora: remover (briefing e automatico, cliente nao precisa saber)

3. **Adicionar indicador de enriquecimento** (opcional, pode ser feito no Bloco 5):
   - Se quiser mostrar progresso, fazer polling de `get-enrichment-status` e exibir barra sutil
   - Se nao quiser, apenas remover as linhas acima e manter o resumo limpo

### T4.5 — Remover `Etapa7.jsx`

**Arquivo**: `src/pages/Etapa7.jsx`

Deletar o arquivo. E codigo orfao — nao e importado por nenhum componente e nao aparece no roteador (`App.jsx`).

Verificar tambem:
- `src/pages/CopyEditor/constants.js` — remover entrada `etapa7`
- `src/pages/CopyEditor/EtapaSection.jsx` — remover secao `etapa7`
- `src/copy.js` — remover export `ETAPA7` se existir

### T4.6 — Limpar `copy.js`

**Arquivo**: `src/copy.js`

Remover textos relacionados ao fluxo antigo:
- `ETAPA7` (se existir como export)
- Textos de `production_path` ("standard", "hybrid") se referenciados no copy

Manter `ETAPA62` intacto (a UI de coleta de logo/site/instagram nao muda).

## Checklist de conclusao

- [ ] `Etapa62` envia `site_url` e `instagram_handle` como campos FormData separados
- [ ] `OnboardingContext` hidrata `siteUrl` e `instagramHandle` das novas colunas
- [ ] `get-onboarding-data` retorna `site_url` e `instagram_handle`
- [ ] `EtapaFinal` sem referencia a productionPath, briefingMode, campaignBriefGenerationStatus
- [ ] `Etapa7.jsx` deletado
- [ ] Referencias a Etapa7 removidas do CopyEditor e copy.js
- [ ] Build do Vite passa sem erros (`npm run build`)
- [ ] Lint passa (`npm run lint`)
