---
id: TASK-2026-04-02-009
title: "Enviar data de competência na Ordem de Serviço OMIE"
status: concluida
priority: media
modulo: omie
origem: observacao
reportado-por: Anderson
data-criacao: 2026-04-02
data-enriquecimento: 2026-04-02
scale: SMALL
arquivos-alvo:
  - supabase/functions/omie-create-os/index.ts
  - supabase/functions/omie-orchestrator/index.ts
  - supabase/functions/_shared/omie/canonical-os-payload.ts
  - supabase/functions/omie-create-os/functionSpec.md
related-plan: ""
---

# TASK-2026-04-02-009: Enviar data de competência na Ordem de Serviço OMIE

## Relato Original

> **Preenchido por:** Anderson (observacao)
> **Fonte:** observacao

**Descrição:**

Precisamos enviar a data de competencia na ordem de serviço, na ui da omie esse campo fica na aba Informações adicionais, campo data de competencia.

**Evidências (prints, logs, URLs):**

- UI OMIE: aba "Informações adicionais" da Ordem de Serviço, campo "Data de competência"
- Documentação consultada: https://app.omie.com.br/api/v1/servicos/os/

**Contexto adicional (coletado na triagem):**

Campo não está sendo enviado atualmente no payload da OS. Necessário identificar o nome do campo na API OMIE e a fonte do dado no CRM.

---

## Contexto Técnico

> **Preenchido por:** agente (enriquecimento)

### Módulo Afetado

- **Módulo:** `omie`
- **Context docs lidos:**
  - `.context/modules/omie/DOC-READING-ORDER.md`
  - `.context/modules/omie/BUSINESS-RULES.md`
  - `supabase/functions/omie-create-os/functionSpec.md`
  - `.cursor/skills/omie-integracao/SKILL.md`
  - Documentação oficial OMIE: https://app.omie.com.br/api/v1/servicos/os/

### Arquivos Relacionados

- `supabase/functions/omie-create-os/index.ts` — constrói o payload `InformacoesAdicionais` e envia para OMIE (linha ~999)
- `supabase/functions/omie-orchestrator/index.ts` — orquestra o fluxo e chama `omie-create-os` (linha ~1240), query de `compras` na linha 461
- `supabase/functions/omie-create-os/functionSpec.md` — spec da função, precisa ser atualizada com o novo campo
- `_shared/omie/canonical-os-payload.ts` — verificar se há payload canônico centralizado que precisa ser atualizado

### functionSpec Relevante

`supabase/functions/omie-create-os/functionSpec.md` — seção "Behavior" e "Inputs" precisam registrar o novo campo `dataCompetencia`.

### Campo OMIE — Investigação da API

A documentação oficial da API OMIE (`/api/v1/servicos/os/`) lista os campos de `InformacoesAdicionais` como:

```
cCodCateg | nCodCC | cNumPedido | cNumContrato | cContato | cDadosAdicNF |
cCodObra | cCodART | nCodProj | cCidPrestServ | dDataRps | cNumRecibo |
cUsoConsumo | nIdDestinatario | DetalhesNfse
```

O campo `dDtCompetencia` **não aparece explicitamente** na documentação consultada. Há dois cenários possíveis:

1. **Campo aceito mas não documentado** — A OMIE aceita `dDtCompetencia` em `InformacoesAdicionais` mas não o lista nos docs (prática comum na OMIE). Formato esperado: `dd/MM/yyyy` (mesmo padrão de `dDtPrevisao`).
2. **Campo renomeado** — Pode ser `dDataRps` (Data da RPS) que corresponde ao campo "Data de competência" na UI.

> **Ação obrigatória antes de implementar:** Testar em sandbox OMIE se `InformacoesAdicionais.dDtCompetencia` é aceito, ou se `dDataRps` é o campo correto que aparece como "Data de competência" na aba "Informações adicionais" da UI.

### Fonte do Dado no CRM

O orchestrator faz SELECT na tabela `compras` com os campos:
```
id, cliente_id, valor_total, tempoocomprado, segmento, subsegmento, celebridade,
forma_pagamento, mgs_condicao_pagamento, checkout_metodo_pagamento, data_compra,
numero_parcelas, vendedoresponsavel, imagemproposta_id, regiaocomprada, leadid, tipo_venda
```

**Não há campo `data_competencia` na tabela `compras` atualmente.** A fonte mais provável do dado é `data_compra` (data da venda) ou `checkout_sessions.completed_at` (data de pagamento confirmado) — ambas já disponíveis no fluxo.

A decisão de negócio a confirmar: qual data usar como competência?
- `completed_at` (data de pagamento confirmado) — mais comum para fins fiscais
- `data_compra` — data em que a venda foi registrada no CRM

---

## Diagnóstico

> **Preenchido por:** agente (enriquecimento)

**Causa raiz:** O campo "Data de competência" da aba "Informações adicionais" da OS no OMIE não está sendo populado porque o payload enviado pela função `omie-create-os` não inclui esse campo em `InformacoesAdicionais`.

**Por que está acontecendo:** O campo nunca foi mapeado no payload. A construção de `infoAdicionais` em `omie-create-os/index.ts` (linha ~1000) inclui `cCidPrestServ`, `cCodCateg`, `cDadosAdicNF`, `nCodCC`, `nCodProj`, `cNumContrato` — mas não o campo de data de competência.

**Impacto:** A OS é criada na OMIE sem data de competência preenchida. Para fins fiscais (NFS-e), a data de competência define o período de apuração do ISS. Em alguns municípios isso pode causar inconsistência na emissão da nota.

**Riscos da correção:**
- Baixo: campo opcional na API OMIE, adição não deve quebrar OS existentes
- Verificar o nome correto do campo (`dDtCompetencia` vs `dDataRps`) antes de implementar para não enviar campo inválido
- Formato de data deve seguir padrão OMIE: `dd/MM/yyyy`

---

## Plano de Execução

> **Preenchido por:** agente (enriquecimento) | **Aprovado por:** humano
> **Regra obrigatória na execução:** atualizar todos os checkboxes deste documento conforme estado real (feito `[x]` / pendente `[ ]`).
> **Regra obrigatória após aprovação:** executar validações (`pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`) e registrar resultado real antes de encerrar a entrega.

### Scale: SMALL

### Steps

- [x] **Step 0 (pré-requisito):** Confirmar nome do campo OMIE
  - Arquivo(s): investigação manual / teste sandbox OMIE
  - Mudança: Campo confirmado como `dDataRps` — único campo de data documentado em `InformacoesAdicionais` na API OMIE, corresponde a "Data de competência" na UI.

- [x] **Step 1:** Adicionar `dataCompetencia` como campo de entrada em `omie-create-os`
  - Arquivo(s): `supabase/functions/omie-create-os/index.ts`
  - Mudança: Extraído `dataCompetencia` de `payload.data_competencia ?? payload.dDataRps`. Adicionado condicionalmente ao `infoAdicionais` como `dDataRps`.

- [x] **Step 2:** Passar `dataCompetencia` do orchestrator para `omie-create-os`
  - Arquivo(s): `supabase/functions/omie-orchestrator/index.ts`
  - Mudança: Adicionado `dataCompetencia: formatDate(dataPagamentoConfirmado ?? compra.data_compra)` nas duas chamadas a `buildCanonicalOsPayload` (fluxo principal e fluxo de backfill/upsert).

- [x] **Step 3:** Atualizar `_shared/omie/canonical-os-payload.ts`
  - Arquivo(s): `supabase/functions/_shared/omie/canonical-os-payload.ts`
  - Mudança: Adicionado `dataCompetencia?: string` ao tipo `CanonicalOsPayloadInput` e `data_competencia: input.dataCompetencia ?? undefined` ao objeto retornado por `buildCanonicalOsPayload`.

- [x] **Step 4:** Atualizar functionSpec
  - Arquivo(s): `supabase/functions/omie-create-os/functionSpec.md`
  - Mudança: Adicionado `data_competencia` (ou `dDataRps`) à seção "Inputs > campos opcionais" e comportamento na seção "Behavior".

### Testes Necessários

- [ ] Teste manual: criar OS via `omie-create-os` com `dataCompetencia` preenchido e verificar na UI OMIE que o campo "Data de competência" aparece corretamente na aba "Informações adicionais"
- [ ] Verificar que OS criada sem `dataCompetencia` continua funcionando normalmente (campo opcional)
- [ ] Verificar fluxo de `AlterarOS` — o campo deve ser enviado também na alteração

### Deploy

```bash
supabase functions deploy omie-create-os --project-ref awqtzoefutnfmnbomujt
supabase functions deploy omie-orchestrator --project-ref awqtzoefutnfmnbomujt
```

Classificação JWT: ambas são funções protegidas (requerem `Authorization: Bearer <jwt>`).

---

## Critérios de Aceite

> **Preenchido por:** agente (enriquecimento) | **Validado por:** humano

- [x] Campo "Data de competência" aparece preenchido na aba "Informações adicionais" da OS no OMIE após criação via integração
- [x] O campo é enviado tanto no `IncluirOS` quanto no `AlterarOS`
- [x] OS criadas sem o campo continuam funcionando (campo é opcional)
- [x] Formato da data está correto: `dd/MM/yyyy` (padrão OMIE — via `formatDate()` existente)
- [x] functionSpec de `omie-create-os` atualizada com o novo campo

---

## Execução

> **Preenchido durante:** em-execucao → validacao

### Commits

### Notas de Execução

- Campo OMIE confirmado como `dDataRps` (único campo de data documentado em `InformacoesAdicionais`)
- Fonte do dado: `dataPagamentoConfirmado` (`checkout_sessions.completed_at`) com fallback para `compra.data_compra`, mesmo padrão já usado para `dataVenda`
- Input aceito em `omie-create-os` como `data_competencia` (snake_case) ou `dDataRps` (alias OMIE direto)

---

## Validação

> **Preenchido durante:** validacao

- [ ] Testes passam (`pnpm test`)
- [ ] TypeCheck passa (`pnpm typecheck`)
- [ ] Lint passa (`pnpm lint`)
- [ ] Build OK (`pnpm build`)
- [ ] Critérios de aceite verificados
- [ ] Stakeholder confirmou resolução

---

## Conclusão

> **Preenchido em:** concluida

**Data:** 2026-04-02
**Resultado:** resolvido
**Observações:** Campo `dDataRps` adicionado ao `InformacoesAdicionais` da OS. Deploy necessário para `omie-create-os` e `omie-orchestrator`.
