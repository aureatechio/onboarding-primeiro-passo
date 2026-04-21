# Bloco 5 — Integracao e Teste

**Orquestrador**: `2026-04-08-onboarding-enrichment-master.md`
**Spec**: `supabase/functions/onboarding-enrichment/functionSpec.md`
**Dependencia**: Blocos 1-4 (tudo precisa estar deployed)

## Objetivo

Conectar o briefing gerado pela Perplexity ao pipeline de geracao de imagens, testar o fluxo end-to-end, e atualizar a documentacao do projeto.

## Tarefas

### T5.1 — Alterar `prompt-builder.ts`

**Arquivo**: `supabase/functions/_shared/ai-campaign/prompt-builder.ts`

**Alteracoes no type `PromptInput`:**

Adicionar campos opcionais do briefing:

```typescript
interface PromptInput {
  // campos existentes...
  globalRules: string
  clientName: string
  celebName: string
  brandPalette: string[]
  fontChoice: string
  campaignNotes?: string
  // novos campos do briefing Perplexity
  briefing?: {
    objetivo_campanha?: string
    publico_alvo?: string
    tom_voz?: string
    mensagem_central?: string
    cta_principal?: string
  }
  insightsPecas?: Array<{
    variacao: number
    diferencial?: string
    formato?: string
    plataforma?: string
    gancho?: string
    chamada_principal?: string
    texto_apoio?: string
    cta?: string
    direcao_criativa?: string
  }>
}
```

**Alteracoes na funcao `buildPrompt`:**

1. Se `briefing` existir, adicionar bloco de contexto de campanha ao prompt:
   ```
   ## CAMPAIGN CONTEXT (from AI Briefing)
   - Objective: {objetivo_campanha}
   - Target Audience: {publico_alvo}
   - Tone of Voice: {tom_voz}
   - Core Message: {mensagem_central}
   - Primary CTA: {cta_principal}
   ```

2. Se `insightsPecas` existir e tiver entrada para a variacao atual do grupo, incluir direcao criativa especifica:
   ```
   ## CREATIVE DIRECTION (from AI Insights)
   - Hook: {gancho}
   - Main Call: {chamada_principal}
   - Support Text: {texto_apoio}
   - CTA: {cta}
   ```

3. Se briefing nao existir, prompt funciona exatamente como hoje (retrocompativel).

**Impacto no `computeInputHashAsync`:**

Incluir campos do briefing no hash de input para idempotencia. Se o briefing mudar, um novo job de campanha sera criado.

### T5.2 — Teste end-to-end: Compra com logo + site + instagram

**Cenario**: Simular fluxo completo de um cliente que preencheu os 3 campos.

1. Criar (ou reutilizar) compra de teste com `checkout_status: 'pago'` e `clicksign_status: 'Assinado'`
2. Chamar `save-onboarding-identity` com:
   - `choice: 'add_now'`
   - `logo`: arquivo PNG de teste
   - `site_url`: URL de site real (ex: `https://acelerai.com`)
   - `instagram_handle`: handle real (ex: `acelerai`)
3. Verificar:
   - `onboarding_identity` atualizada com `site_url`, `instagram_handle`, `logo_path`
   - `onboarding_enrichment_jobs` criado com `status: 'processing'`
4. Pollar `get-enrichment-status` ate `status: 'completed'` (ou timeout de 90s)
5. Verificar:
   - `brand_palette` preenchida na identity
   - `font_choice` preenchido na identity
   - `onboarding_briefings` com `status: 'done'` e `briefing_json` preenchido
   - `ai_campaign_jobs` criado e em `processing` ou `completed`
6. Verificar `phases_log` contem 4 entries com `attempts[]` preenchidos

### T5.3 — Teste end-to-end: Compra sem logo (apenas site)

**Cenario**: Cliente nao enviou logo, so preencheu site.

1. Chamar `save-onboarding-identity` com `choice: 'add_now'`, `site_url`, sem logo
2. Verificar:
   - Fase 1 (cores): extrai do CSS do site (ou fallback)
   - Fase 2 (fonte): extrai do CSS do site
   - Fase 3 (briefing): gera via Perplexity com site como company_site
   - Fase 4 (campaign): cria job sem logo_path
3. Verificar que `create-ai-campaign-job` aceita sem logo

### T5.4 — Teste de retry por fase

1. Executar pipeline completo (cenario T5.2)
2. Apos conclusao, chamar `onboarding-enrichment` com `retry_from_phase: 'briefing'`
3. Verificar:
   - `phase_colors_status` e `phase_font_status` permanecem `completed` (preservados)
   - `phase_briefing_status` resetado para `pending` → `processing` → `completed`
   - `phase_campaign_status` resetado e reexecutado
   - Novo campaign job pode ser criado (se hash mudou) ou retorna existente

### T5.5 — Teste: choice "later" nao dispara enrichment

1. Chamar `save-onboarding-identity` com `choice: 'later'`
2. Verificar: nenhum registro em `onboarding_enrichment_jobs`
3. Verificar: nenhum job em `ai_campaign_jobs`

### T5.6 — Teste: sem site e sem instagram nao dispara enrichment

1. Chamar `save-onboarding-identity` com `choice: 'add_now'`, logo, mas sem site_url e sem instagram_handle
2. Verificar: identity salva com logo, mas enrichment NAO disparado (condicao de disparo nao atendida)

### T5.7 — Atualizar documentacao

**Arquivos a atualizar:**

1. **`CLAUDE.md`**:
   - Adicionar `onboarding-enrichment`, `get-enrichment-status`, `get-enrichment-config`, `update-enrichment-config` ao Edge Functions Registry
   - Atualizar secao de Onboarding com novo fluxo
   - Mencionar `enrichment_config` como tabela singleton

2. **`ai-step2/CONTRACT.md`**:
   - Atualizar secao de trigger paths (remover hybrid, documentar enrichment)
   - Adicionar schema de `onboarding_enrichment_jobs`
   - Documentar integracao briefing → prompt

3. **`docs/mapeamento-formulario-onboarding.md`**:
   - Adicionar colunas `site_url` e `instagram_handle` na secao de `onboarding_identity`
   - Atualizar mapeamento da Etapa 6.2 (campos enviados)
   - Remover referencia a Etapa 7

4. **`.context/modules/onboarding/README.md`**:
   - Atualizar fluxo de etapas (sem Etapa 7)
   - Documentar pipeline de enrichment

5. **`.context/modules/onboarding/BUSINESS-RULES.md`**:
   - Adicionar regras do enrichment (condicao de disparo, fallbacks, retry)
   - Remover regras de production_path hybrid

6. **`plan/CHECKLIST-DEPLOY-EDGE-FUNCTIONS.md`**:
   - Adicionar 4 novas funcoes com classificacao JWT

## Checklist de conclusao

- [ ] `prompt-builder.ts` consome campos do briefing no prompt de imagem
- [ ] `computeInputHashAsync` inclui briefing no hash
- [ ] Teste com logo + site + instagram → pipeline completo ok
- [ ] Teste sem logo (so site) → pipeline ok com fallbacks
- [ ] Teste de retry por fase → preserva resultados anteriores
- [ ] Teste choice "later" → nao dispara enrichment
- [ ] Teste sem site/instagram → nao dispara enrichment
- [ ] CLAUDE.md atualizado
- [ ] CONTRACT.md atualizado
- [ ] mapeamento-formulario-onboarding.md atualizado
- [ ] README e BUSINESS-RULES do modulo onboarding atualizados
- [ ] CHECKLIST-DEPLOY atualizado
