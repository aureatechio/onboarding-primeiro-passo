# Post Gen — Skill (Especialista)

> Playbook para agentes IA trabalhando no modulo Post Gen.

## Identidade

Voce e um especialista no modulo Post Gen do sistema Aurea Garden. Sua funcao e gerar criativos publicitarios prompt-to-image usando Gemini via NanoBanana config.

## Antes de Qualquer Alteracao

1. Leia o `DOC-READING-ORDER.md` deste submodulo para identificar os docs relevantes
2. Leia o `SDD.md` para entender o contrato da funcao
3. Leia o `BUSINESS-RULES.md` para regras que nao estao no codigo

## Contexto de Decisao

### Post Gen vs Post Turbo

| Aspecto | Post Gen | Post Turbo |
|---------|----------|------------|
| Input principal | Brief textual | Imagem existente |
| Direction | Sempre `moderna` (fixa) | Selecionavel (3 opcoes) |
| Celebridade | Texto no brief | Imagem real da tabela |
| Content-Type | multipart ou JSON | Apenas multipart |
| Slots de imagem | 2 (logo ou placeholder) | 5 (source, logo, product, celebrity, reference) |

### Quando Alterar Qual Arquivo

| Objetivo | Arquivo Principal |
|----------|-------------------|
| Mudar estrutura do prompt | `post-gen-generate/index.ts` → `buildPostGenPrompt()` |
| Mudar texto default da direction | `nanobanana_config` (tabela) via `update-nanobanana-config` |
| Mudar texto default do format | `nanobanana_config` (tabela) via `update-nanobanana-config` |
| Alterar chamada Gemini | `_shared/ai-campaign/image-generator.ts` |
| Alterar campos do form | `src/pages/AiStep2Monitor/PostGenPage.jsx` |
| Alterar validacao | `_shared/garden/validate.ts` + `post-gen-generate/index.ts` |
| Alterar extracao de cores | `src/lib/color-extractor.js` |

## Prompt Engineering Guidelines

### Estrutura do Prompt

O prompt tem 6 secoes. A ordem e intencional:

1. **CREATIVE BRIEF** — contexto do negocio (primeira coisa que o modelo ve)
2. **BRAND PALETTE** — cores para guiar o visual
3. **CREATIVE DIRECTION** — instrucoes detalhadas de estilo (maior bloco)
4. **FORMAT** — dimensoes e composicao
5. **USER PROMPT** — intencao especifica do usuario
6. **MANDATORY** — guardrails finais (PT-BR, imagem unica)

### Principios para Melhorar Prompts

- **Especificidade vence generalidade:** "fundo preto solido com gradiente cinematico" > "fundo escuro"
- **Sacred Face Rule:** Defina claramente a "safe zone" para compositing posterior
- **Instrucoes negativas funcionam:** "NAO desenhe a celebridade" e mais efetivo que omitir
- **Format instructions devem ser dimensionais:** inclua pixels, composicao, zonas de CTA
- **Teste os 4 formatos:** Um prompt bom para 1:1 pode quebrar em 9:16

### Variaveis Dinamicas no Prompt

```
{celebrity_name}  — nome da celebridade (texto)
{business}        — tipo de negocio
{segment}         — segmento
{subsegment}      — subsegmento
{style}           — estilo visual
{city}, {state}   — localizacao
{briefing}        — contexto adicional
{palette}         — cores hex
{direction_text}  — direction_moderna do config
{format_text}     — format_X_X do config
{prompt}          — texto livre do usuario
```

## Checklist de Validacao

Antes de submeter qualquer mudanca no Post Gen:

- [ ] Prompt monta corretamente com todos os campos preenchidos
- [ ] Prompt monta corretamente com campos opcionais vazios
- [ ] Fallback funciona quando `nanobanana_config` esta vazio
- [ ] Os 4 formatos (1:1, 4:5, 16:9, 9:16) geram prompts distintos
- [ ] Logo upload funciona (multipart) e sem logo funciona (JSON)
- [ ] Signed URLs tem validade correta (10min input, 7 dias output)
- [ ] Logs de observabilidade cobrem request, complete, e failure
- [ ] Deploy com `--no-verify-jwt`

## Erros Comuns

| Sintoma | Causa Provavel | Fix |
|---------|---------------|-----|
| Imagem gerada sem cor da marca | Paleta nao chegou no prompt | Verificar JSON.parse da palette |
| Direction vazia no prompt | Config nao carregou | Checar `nanobanana_config` no DB |
| 400 INVALID_INPUT sem motivo claro | Campo obrigatorio faltando | Checar validacao de todos os 7 campos |
| PROVIDER_ERROR no job | Gemini recusou o prompt | Verificar prompt length, conteudo proibido |
| Output sem composicao esperada | Format instruction generica | Melhorar `format_X_X` no config |
