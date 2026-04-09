# Post Turbo — Skill (Especialista)

> Playbook para agentes IA trabalhando no modulo Post Turbo.

## Identidade

Voce e um especialista no modulo Post Turbo do sistema Aurea Garden. Sua funcao e turbinar imagens existentes com direcao criativa via Gemini (image-to-image) usando NanoBanana config.

## Antes de Qualquer Alteracao

1. Leia o `DOC-READING-ORDER.md` deste submodulo para identificar os docs relevantes
2. Leia o `SDD.md` para entender o contrato da funcao
3. Leia o `BUSINESS-RULES.md` para regras que nao estao no codigo

## Contexto de Decisao

### Post Turbo vs Post Gen

| Aspecto | Post Turbo | Post Gen |
|---------|------------|----------|
| Input principal | Imagem existente (source) | Brief textual |
| Direction | Selecionavel (moderna/clean/retail) | Fixa (moderna) |
| Celebridade | Imagem real da tabela `celebridades` | Apenas texto no brief |
| Content-Type | Apenas `multipart/form-data` | multipart ou JSON |
| Slots de imagem | 5 (source, logo, product, celebrity, reference) | 2 (logo ou placeholder) |
| Prompt auto-fill | Sim (da direction config) | Nao |

### Quando Alterar Qual Arquivo

| Objetivo | Arquivo Principal |
|----------|-------------------|
| Mudar estrutura do prompt | `post-turbo-generate/index.ts` → `buildPostTurboPrompt()` |
| Mudar texto default da direction | `nanobanana_config` (tabela) via `update-nanobanana-config` |
| Mudar texto default do format | `nanobanana_config` (tabela) via `update-nanobanana-config` |
| Alterar slot mapping de imagens | `post-turbo-generate/index.ts` (linhas ~295-299) |
| Alterar chamada Gemini | `_shared/ai-campaign/image-generator.ts` (compartilhado!) |
| Alterar resolucao de celebridade | `post-turbo-generate/index.ts` (linhas ~254-265) |
| Alterar campos do form | `src/pages/AiStep2Monitor/PostTurboPage.jsx` |
| Alterar auto-fill de direction | `PostTurboPage.jsx` → `handleDirectionChange()` |
| Implementar direction modes | `post-turbo-generate/index.ts` + `_shared/nanobanana/config.ts` |

## Prompt Engineering Guidelines

### Estrutura do Prompt

O prompt tem 6 secoes. A ordem e intencional:

1. **CREATIVE DIRECTION** — instrucoes de estilo da direction selecionada (maior bloco)
2. **BRAND PALETTE** — cores para guiar o visual
3. **CELEBRITY** — nome da celebridade (se selecionada)
4. **FORMAT** — dimensoes e composicao
5. **USER INSTRUCTIONS** — prompt do usuario (pode ser o auto-fill ou customizado)
6. **MANDATORY** — guardrails finais (enhance base image, PT-BR, imagem unica)

### Principios para Melhorar Prompts (Post Turbo)

- **Respeite a imagem base:** O prompt deve instruir "enhance and improve" nao "ignore and recreate"
- **Sacred Face Rule e critica:** A imagem real da celebridade e enviada — o prompt DEVE ter instrucoes explicitas de preservacao
- **Direction text deve ser completa:** O usuario geralmente submete o auto-fill sem editar — a direction text e o prompt efetivo
- **Safe zones por direction:** Cada direction define zonas diferentes para celebridade — documente no texto
- **Teste com e sem celebridade:** O fallback para source image muda drasticamente o resultado
- **Teste com e sem logo:** A presenca de logo e paleta guia o branding do output
- **Product image e contexto extra:** Quando presente, o prompt deve instruir como incorporar o produto

### Variaveis Dinamicas no Prompt

```
{direction}       — 'moderna' | 'clean' | 'retail'
{direction_text}  — config.direction_{direction}
{palette}         — cores hex
{celebrity_name}  — nome da celebridade (pode ser vazio)
{format}          — '1:1' | '4:5' | '16:9' | '9:16'
{format_text}     — config.format_{format_key}
{prompt}          — texto do usuario (pode ser auto-fill)
```

### Imagens Enviadas ao Gemini

```
Slot 1: Celebrity image OU source image (fallback)
Slot 2: Logo OU source image (fallback)
Slot 3: Product image (se fornecida)
Slot 4: SEMPRE source image (referencia visual)
+ Texto: prompt montado (6 secoes)
```

## Checklist de Validacao

Antes de submeter qualquer mudanca no Post Turbo:

- [ ] Prompt monta corretamente para cada uma das 3 directions
- [ ] Prompt monta corretamente para todos os 4 formatos
- [ ] Auto-fill funciona no frontend ao mudar direction
- [ ] Slots de imagem mapeiam corretamente (com e sem celebridade/logo/product)
- [ ] Celebrity resolve fotoPrincipal da tabela celebridades
- [ ] Fallback funciona quando celebridade nao encontrada
- [ ] Upload dos 3 tipos de arquivo funciona (source, logo, product)
- [ ] Signed URLs tem validade correta (10min input, 7 dias output)
- [ ] Logs de observabilidade cobrem request, complete, e todos os erros
- [ ] Rejeita content-types que nao sao multipart
- [ ] Deploy com `--no-verify-jwt`

## Erros Comuns

| Sintoma | Causa Provavel | Fix |
|---------|---------------|-----|
| Celebridade deformada no output | Sacred Face Rule fraca no prompt | Reforcar instrucoes de preservacao |
| Output ignora imagem base | Prompt muito diretivo, sobrepoe reference | Balancear "enhance" vs "create from scratch" |
| Direction vazia no prompt | Config nao carregou | Checar `nanobanana_config` no DB |
| 400 sem motivo claro | Content-type nao e multipart | Verificar header do request |
| Slot de celebrity usando source | Celebridade nao encontrada no DB | Checar nome + ativo = true |
| Cores da marca ignoradas | Paleta nao chegou no prompt | Verificar JSON.parse e formatacao hex |
| PROVIDER_ERROR frequente | Muitas imagens (3-4) sobrecarregam o modelo | Verificar tamanho total dos inputs |
