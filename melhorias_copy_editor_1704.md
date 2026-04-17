# Melhorias Copy Editor — 17/04/2026

## Contexto
Registro das atualizações e correções solicitadas para a página **Copy Editor**, com base no fluxo atual e nos prints enviados.

## Melhorias solicitadas

### 1) Lista de passos com suporte a adicionar/remover itens

**Problema atual**
A lista de passos (como no bloco com "Gravação", "Seu briefing", "Produção", "Sua campanha") está limitada à edição dos itens existentes.

**Necessidade**
Permitir que o usuário do Copy Editor:
- adicione novos passos nessa lista;
- remova passos existentes;
- mantenha a edição dos campos de cada passo (ex.: título e descrição).

**Resultado esperado**
A lista deve ser totalmente dinâmica no editor, sem ficar presa ao número original de itens.

---

### 2) Ajuste de tamanho dos inputs inline para leitura/edição

**Problema atual**
Em alguns campos, ao clicar para editar, o input/textarea abre com largura/comportamento reduzido, prejudicando leitura e edição.

**Exemplo reportado**
Texto: **"Ao completar, sua equipe de produção é ativada automaticamente."**

Pelos prints:
- o texto em modo visual aparece com largura confortável;
- ao entrar em edição, o campo fica pequeno e "cortado", mostrando apenas parte final do conteúdo.

**Necessidade**
Ao abrir o modo de edição inline:
- o input/textarea deve aproveitar melhor o espaço disponível do container;
- manter largura e legibilidade próximas ao bloco em modo visual;
- evitar recorte de conteúdo e sensação de campo "espremido".

**Resultado esperado**
Experiência de edição fluida, com campo amplo e legível para textos médios/longos.

---

## Referências visuais (prints)
- `Captura de Tela 2026-04-17 às 15.09.28.png` — lista de passos (caso de adicionar/remover)
- `Captura de Tela 2026-04-17 às 15.11.14.png` — texto em modo visual
- `Captura de Tela 2026-04-17 às 15.11.20.png` — campo reduzido ao entrar em edição

## Status
- [x] Solicitações registradas em documento
- [ ] Implementação das melhorias
- [ ] Validação visual no Copy Editor
