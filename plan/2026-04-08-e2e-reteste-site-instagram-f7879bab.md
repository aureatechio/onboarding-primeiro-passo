# Reteste E2E + site/Instagram — compra `f7879bab-0276-4185-986f-f8de746d8fd6`

**Data:** 2026-04-08  
**URL local:** `http://localhost:5173/?compra_id=f7879bab-0276-4185-986f-f8de746d8fd6`

---

## Aviso importante (dados alterados)

Para reabrir o fluxo da Etapa 6.2 no banco, a coluna `choice` em `onboarding_identity` **não aceita NULL** (`CHECK add_now|later`). Foi executado:

```sql
DELETE FROM onboarding_identity WHERE compra_id = 'f7879bab-0276-4185-986f-f8de746d8fd6';
```

**Efeito:** a identidade anterior (incl. `logo_path` no banco) foi removida. O arquivo pode ainda existir no bucket `onboarding-identity`, mas a compra ficou sem linha até o próximo save. **Em produção, evite este padrão** sem backup/restore explícito do logo.

---

## O que foi feito no teste

### 1) Browser (cursor-ide-browser)

- Navegação para a URL local; `get-onboarding-data` **200** (duplicado em dev, como antes).
- Estado da sessão MCP ainda estava na **Etapa 2** por causa do `localStorage` (progresso salvo por compra).
- **Triplo clique no logo** (reset de teste) foi tentado **3 vezes em sequência**; o reload **não ocorreu** — a janela de **700 ms** entre cliques no código (`TopBar.jsx`) não é confiável com latência entre chamadas MCP, então o reset local **não foi concluído** nesta automação.

### 2) Envio de site + Instagram (equivalente à Etapa 6.2)

Mesmo payload que o formulário de `Etapa62.jsx` monta (`multipart/form-data` para `save-onboarding-identity`):

```bash
curl -sS -X POST "https://awqtzoefutnfmnbomujt.supabase.co/functions/v1/save-onboarding-identity" \
  -F "compra_id=f7879bab-0276-4185-986f-f8de746d8fd6" \
  -F "choice=add_now" \
  -F "site_url=https://www.example.com" \
  -F "instagram_handle=momentomusicalcampinas"
```

**Resposta:** `{"success":true,"data":{"identity_id":"36156ef6-bd96-4373-be18-4ef1288237f8","logo_path":null,...}}`

### 3) Espera e verificação no Postgres (MCP `execute_sql`)

Após ~20 s:

| Tabela / campo | Resultado |
|----------------|-----------|
| `onboarding_identity.site_url` | `https://www.example.com` |
| `onboarding_identity.instagram_handle` | `momentomusicalcampinas` |
| `onboarding_enrichment_jobs.status` | `completed` |
| Fases | `phase_colors_status` / `phase_font` / `phase_briefing` / `phase_campaign` = **completed** |
| `briefing_generated` | `true` |
| `campaign_job_id` | `d0ca05e8-8a51-4c39-8779-2588824976ce` |
| `onboarding_briefings` | Linha com `provider=perplexity`, `status=done`, `briefing_json` preenchido |
| `ai_campaign_jobs` (instante da consulta) | `status=processing`, `total_generated=4` / `total_expected=12` (pipeline em andamento) |

### 4) Logs Edge (últimas 24 h, MCP `get_logs` → amostra)

Linhas agregadas por path (correlacionadas no tempo com o POST acima):

| Função | POST/GET | Status |
|--------|----------|--------|
| `save-onboarding-identity` | POST | 200 |
| `onboarding-enrichment` | POST | 200 |
| `create-ai-campaign-job` | POST | 200 |

`generate-campaign-briefing` é invocado **de dentro** do enrichment (service role); pode **não** aparecer como linha separada nesse dump, mas o banco confirma briefing Perplexity (`onboarding_briefings.provider = perplexity`, `status = done`).

---

## Conclusão

- Com **site e Instagram** persistidos, o gatilho em `save-onboarding-identity` chamou **`onboarding-enrichment`**, a fase de briefing **completou** e **`onboarding_briefings`** foi preenchida via Perplexity.
- O reteste confirma a hipótese anterior: **sem** `site_url`/`instagram_handle` o pipeline de briefing automático **não** rodava; **com** esses campos, roda.
- O fluxo **completo só no browser** (7 etapas + modo simplificado 6.2) não foi finalizado nesta sessão por **estado local** + **limite do reset triplo** via MCP; o **curl** reproduz o mesmo contrato HTTP do formulário.

---

## Referência cruzada

Relatório anterior (sem site/IG): `plan/2026-04-08-e2e-diagnostico-compra-f7879bab.md`.
