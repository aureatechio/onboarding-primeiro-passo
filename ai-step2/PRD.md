# PRD - Submodulo `ai-step2` (Onboarding)

## 1. Contexto e objetivo

O submodulo `ai-step2` define o workflow de geracao de pecas estaticas de campanha apos compra concluida, assinatura e preenchimento do onboarding.

Objetivo: transformar dados do cliente e ativos visuais em **12 imagens finais** (3 grupos criativos x 4 formatos), prontas para uso comercial.

## 2. Escopo do produto

### Em escopo

- Coleta no onboarding de:
  - logotipo do cliente
  - paleta de cores
  - fontes
  - imagem de campanha (opcional)
  - texto livre (opcional)
- Montagem de prompt multimodal com:
  - PNG da celebridade
  - logotipo do cliente
  - paleta de cores
  - imagem de campanha opcional
  - prompt textual dinamico
  - regras globais de `global-rules.md`
- Geracao de **3 grupos criativos**: `moderna`, `clean`, `retail`
- Geracao de **4 formatos por grupo**: `1:1`, `4:5`, `16:9`, `9:16`
- Entrega final das imagens geradas.

### Fora de escopo (v1)

- Edicao manual pos-geracao dentro do onboarding
- Aprovacao em multiplas rodadas dentro do mesmo fluxo
- Distribuicao automatica em canais de midia paga
- Geracao de video.

## 3. Regras de negocio (AUREA)

1. O fluxo inicia somente apos compra paga e contrato assinado.
2. O cliente acessa onboarding com `compra_id` e confirma ciencia das informacoes.
3. Upload de ativos e briefing e etapa obrigatoria (com campos opcionais previstos).
4. A celebridade e definida pela proposta, e o PNG correspondente e injetado pela AUREA.
5. Devem existir 3 linhas criativas fixas (`moderna`, `clean`, `retail`) para garantir variedade.
6. Entrega final obrigatoria: 12 imagens estaticas.

## 4. Contrato tecnico do modulo

### 4.1 Entradas (input contract)

- `compra_id` (obrigatorio)
- `celebrity_png_url` (obrigatorio)
- `client_logo_url` (obrigatorio)
- `brand_palette` (obrigatorio)
- `font_choices` (obrigatorio)
- `campaign_image_url` (opcional)
- `campaign_notes` (opcional)
- `global_rules_text` (obrigatorio, origem: `global-rules.md`)
- `group_definition` (obrigatorio: `moderna`, `clean`, `retail`)
- `format` (obrigatorio: `1:1`, `4:5`, `16:9`, `9:16`)

### 4.2 Processamento

1. Validar campos obrigatorios.
2. Normalizar insumos (cores, texto, tipos e links).
3. Construir prompt base (direcao de arte + copy + constraints).
4. Enriquecer prompt por grupo criativo.
5. Enriquecer prompt por formato.
6. Chamar o modelo `gemini-3-pro-image-preview`.
7. Validar saida (quantidade, formato e consistencia minima).
8. Persistir imagens e metadados.
9. Retornar colecao final.

### 4.3 Saidas (output contract)

- `job_id`
- `status` (`completed`, `partial`, `failed`)
- `assets[]` com 12 itens esperados:
  - `group`
  - `format`
  - `image_url`
  - `width` e `height` (quando disponivel)
  - `prompt_version`
  - `created_at`
- `errors[]` (quando houver falhas parciais ou totais)

## 5. Especificacao criativa

Cada grupo deve seguir a matriz descrita em `ruas.md`:

- `moderna`: contraste alto, hero dominante, linguagem impactante
- `clean`: composicao editorial, respiro visual, legibilidade maxima
- `retail`: blocos geometricos, apelo comercial, CTA explicito

Formatos obrigatorios por grupo:

- 1x `1:1`
- 1x `4:5`
- 1x `16:9`
- 1x `9:16`

Total por execucao: **3 x 4 = 12 imagens**.

## 6. Requisitos funcionais

- **RF-01:** Permitir upload de logotipo do cliente.
- **RF-02:** Permitir configuracao de paleta de cores.
- **RF-03:** Permitir selecao de fontes.
- **RF-04:** Permitir upload opcional de imagem de campanha.
- **RF-05:** Permitir texto complementar opcional.
- **RF-06:** Montar prompt com inputs + regras globais.
- **RF-07:** Gerar os 3 grupos criativos obrigatorios.
- **RF-08:** Gerar os 4 formatos por grupo.
- **RF-09:** Expor status de processamento ao usuario.
- **RF-10:** Disponibilizar as URLs finais das imagens.

## 7. Requisitos nao funcionais

- **RNF-01:** Idempotencia por `compra_id` + versao dos inputs.
- **RNF-02:** Observabilidade por etapa (ingestao, prompt, geracao, persistencia).
- **RNF-03:** Seguranca no acesso aos ativos gerados.
- **RNF-04:** Resiliencia com retry controlado para falhas transitorias.
- **RNF-05:** Rastreabilidade de prompt (`prompt_version` + hash dos insumos).

## 8. Fluxo ponta a ponta

1. Cliente conclui compra e assinatura.
2. Cliente recebe link de onboarding com `compra_id`.
3. Cliente percorre formulario multistep e envia ativos.
4. `ai-step2` consolida insumos e monta prompts.
5. Pipeline gera 12 imagens com `gemini-3-pro-image-preview`.
6. Sistema retorna imagens para cliente/operacao.

## 9. Criterios de aceite (Definition of Done)

- [ ] Para um `compra_id` valido, o sistema gera exatamente 12 imagens.
- [ ] Cada grupo (`moderna`, `clean`, `retail`) contem os 4 formatos obrigatorios.
- [ ] Inputs obrigatorios sao validados e erros sao claros.
- [ ] Campo de imagem opcional nao bloqueia o fluxo quando ausente.
- [ ] Regras de `global-rules.md` sao aplicadas ao prompt final.
- [ ] Saida retorna metadados minimos e URLs das imagens.
- [ ] Logs permitem auditoria de ponta a ponta.

## 10. Estado atual vs estado alvo

### Estado atual observado

O modulo ja possui materiais de base (`ruas.md`, `global-rules.md`, `user-prompt-sonar.md`) com direcao criativa, regras globais e insumos de prompt.

### Estado alvo

Consolidar um contrato unico de produto e tecnologia neste PRD para orientar implementacao, QA e operacao com criterios objetivos.

## 11. Referencias internas

- `apps/onboarding/ai-step2/ruas.md`
- `apps/onboarding/ai-step2/global-rules.md`
- `apps/onboarding/ai-step2/user-prompt-sonar.md`
- `.context/modules/onboarding/README.md`
- `apps/onboarding/README.md`
