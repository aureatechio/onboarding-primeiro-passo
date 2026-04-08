# Relatório E2E + Supabase — compra `f7879bab-0276-4185-986f-f8de746d8fd6`

**Data do teste:** 2026-04-08  
**Ambiente SPA:** `http://localhost:5173/?compra_id=f7879bab-0276-4185-986f-f8de746d8fd6` (Vite dev, porta 5173)  
**Projeto Supabase:** `awqtzoefutnfmnbomujt`  
**Escopo:** diagnóstico onboarding (sem correções aplicadas).

---

## 1. Resumo executivo


| Verificação                                                                                                  | Resultado                                  |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| Carregamento do onboarding com `compra_id` na query                                                          | OK — dados da compra exibidos após loading |
| API `get-onboarding-data`                                                                                    | HTTP 200 (rede + logs Edge)                |
| `site_url` / `instagram_handle` na identidade                                                                | **Ambos `null`**                           |
| Linha em `onboarding_briefings`                                                                              | **Inexistente**                            |
| Linha em `onboarding_enrichment_jobs`                                                                        | **Nenhuma** (0 linhas)                     |
| Job em `ai_campaign_jobs`                                                                                    | **Nenhum**                                 |
| Chamadas a `generate-campaign-briefing` / `onboarding-enrichment` (últimas 24h, log Edge, filtrado por UUID) | **0**                                      |


**Conclusão:** Não há evidência de que a Perplexity tenha sido acionada para esta compra. O pipeline `onboarding-enrichment` (que chama `generate-campaign-briefing`) **não criou job de enrichment** no banco; isso é coerente com `site_url` e `instagram_handle` nulos — o disparo do enrichment em `save-onboarding-identity` ocorre apenas quando há site ou Instagram salvos. A fase de briefing do enrichment também **pula** a chamada HTTP a `generate-campaign-briefing` quando não há URL de empresa derivada de site/Instagram.

---

## 2. Teste E2E (cursor-ide-browser)

### 2.1 Passos executados

1. Navegação para a URL com `compra_id`.
2. Estado inicial: tela de loading (“Carregando seu onboarding…”).
3. Após ~3s: hero “Primeiro Passo” com saudação **ESCOLA DE MUSICA MOMENTO MUSICAL DE CAMPINAS LTDA** e celebridade **Danielle Winits**; indicador **ETAPA 1 DE 7**.
4. Clique em **COMEÇAR AGORA** → transição para conteúdo da etapa 2 (“Como funciona sua campanha”, slides 1–4).

### 2.2 Resultado visual

- Fluxo navegável; sem erro de página em branco ou bloqueio aparente nas etapas 1–2.
- Screenshot capturado no snapshot da etapa 1 (logo Acelerai, CTA rosa, progresso 1/7).

### 2.3 Rede (requisições relevantes)

- Documento principal e assets Vite: 200.
- `**GET https://awqtzoefutnfmnbomujt.supabase.co/functions/v1/get-onboarding-data?compra_id=f7879bab-0276-4185-986f-f8de746d8fd6`** — **200** (duas ocorrências no painel de rede após carregar a página, típico de Strict Mode / duplo efeito em dev).

Não foram observadas, nesta sessão de navegação limitada às etapas 1–2, chamadas a `save-onboarding-identity`, `onboarding-enrichment`, `generate-campaign-briefing` ou `create-ai-campaign-job` a partir do browser.

### 2.4 Console do browser

- Mensagens esperadas de desenvolvimento: Vite HMR, aviso React DevTools, `[STEP] 1` / `[STEP] 2` (`App.jsx`).
- **Nota:** o buffer de console do MCP pode incluir eventos de **outras** abas/sessões (ex.: outro `compra_id`); para este relatório, a evidência de rede e os logs Edge filtrados por UUID são os mais confiáveis para esta compra.

---

## 3. Dados no banco (MCP `execute_sql`)

### 3.1 Compra + identidade + briefing + último job IA (lateral)


| Campo                   | Valor                                           |
| ----------------------- | ----------------------------------------------- |
| `compra_id`             | `f7879bab-0276-4185-986f-f8de746d8fd6`          |
| `cliente_id`            | `dac6f9a0-58ed-4d1d-9ee0-8679c9b06325`          |
| `checkout_status`       | `pago`                                          |
| `clicksign_status`      | `Assinado`                                      |
| `vendaaprovada`         | `true`                                          |
| `choice`                | `add_now`                                       |
| `logo_path`             | `f7879bab-0276-4185-986f-f8de746d8fd6/logo.png` |
| `**site_url`**          | `**null**`                                      |
| `**instagram_handle**`  | `**null**`                                      |
| `brand_palette`         | `[]`                                            |
| `font_choice`           | `null`                                          |
| `campaign_images_paths` | `[]`                                            |
| `identity_updated_at`   | `2026-04-08 18:15:11.552+00`                    |
| `briefing_row_id`       | `null` (sem linha em `onboarding_briefings`)    |
| `campaign_job_id`       | `null`                                          |


### 3.2 `onboarding_enrichment_jobs`

Query por `compra_id`: **resultado vazio** (`[]`) — não há registro de pipeline de enrichment para esta compra.

---

## 4. Logs Supabase (MCP `get_logs`)

Janela: **últimas 24 horas** (comportamento documentado do MCP).

### 4.1 `edge-function`

Filtragem pós-download (mensagens contendo o UUID da compra):


| Ocorrências | Método | Status | Função                                                               |
| ----------- | ------ | ------ | -------------------------------------------------------------------- |
| 4           | GET    | 200    | `get-onboarding-data?compra_id=f7879bab-0276-4185-986f-f8de746d8fd6` |


Timestamps brutos (microssegundos, como retornados pelo log): entre `1775680777263000` e `1775680854282000` (inclui recarregamentos da página durante o teste).

Filtragem para a mesma compra:

- `generate-campaign-briefing`: **0**
- `onboarding-enrichment`: **0**
- `save-onboarding-identity`: **0**
- `save-campaign-briefing`: **0**

O arquivo bruto de log Edge foi salvo pelo ambiente em `agent-tools/f794fcd3-eb4d-4f7d-9486-b03aa8d2ceed.txt` (volume alto; outras funções/compras aparecem no conjunto completo).

### 4.2 `api`

Busca textual por `f7879bab` no dump retornado: **sem correspondência** (o gateway API pode não repetir o `compra_id` nas linhas de log da mesma forma que a URL da Edge Function).

---

## 5. Rastreio da hipótese “Perplexity não rodou”

1. `**onboarding_briefings` vazio** — consistente com ausência de `save-campaign-briefing` (manual) e ausência de persistência via `generate-campaign-briefing`.
2. `**onboarding_enrichment_jobs` vazio** — o pipeline automático que orquestra cores, fonte, briefing (Perplexity) e campanha **não deixou rastro de job** para esta compra.
3. `**site_url` e `instagram_handle` nulos** — alinhado ao código: enrichment só é disparado em `save-onboarding-identity` quando há site ou Instagram; a fase briefing do enrichment não chama `generate-campaign-briefing` sem URL de empresa derivada.
4. **Logs Edge** para este UUID mostram apenas `**get-onboarding-data` 200**, não invocações de geração de briefing.

Nenhuma falha de implementação foi corrigida neste exercício; apenas coleta e documentação.

---

## 6. Limitações do relatório

- E2E **não percorreu** etapas 3–7 (identidade completa, site/Instagram, briefing manual, etc.).
- Logs MCP são **amostra recente** (24h) e podem não incluir eventos mais antigos da compra.
- Console do browser pode conter **ruído** de outras sessões no mesmo view.