## 🎯 Objetivo
Padronizar o comportamento da IA para o módulo $ARGUMENT, garantindo respostas consistentes, baseadas em evidências e alinhadas ao contexto real do sistema.

---

## 📌 Etapa 1: Levantamento de contexto
- Analise o funcionamento do módulo $ARGUMENT
- Identifique:
  - Objetivo do módulo
  - Principais fluxos e funcionalidades
  - Entidades envolvidas
  - Regras de negócio
  - Pontos críticos / sensíveis
- Se necessário, leia arquivos relevantes do projeto

---

## 📌 Etapa 2: Criar especialista
Crie um novo especialista seguindo o padrão existente em `.cursor/specialists/`:

- Nome: `specialist-[nome-do-modulo]`
- Descrição clara e objetiva
- Instruções com:
  - Quando deve ser utilizado
  - Como raciocinar sobre o módulo
  - Boas práticas específicas
  - O que evitar

---

## 📌 Etapa 3: Criar skill do módulo
Crie uma skill em `.cursor/skills/`:

- Nome: `[nome-do-modulo]`
- Descrição com gatilhos de uso (ex: "quando o usuário pedir...", "analisar...", etc)
- Instruções:
  - Como analisar o módulo
  - Como mapear impacto de mudanças
  - Como responder baseado em evidências
  - Referenciar `.context/modules/[nome-do-modulo]` como fonte de verdade

---

## 📌 Etapa 4: Atualizar índice de especialistas
- Atualize o índice (ex: `.cursor/specialists/index.md` ou equivalente)
- Inclua o novo especialista
- Garanta que ele seja facilmente descoberto

---

## 📌 Etapa 5: Criar regra de governança (OBRIGATÓRIA)
Implemente uma regra clara:

- Sempre que o pedido envolver $ARGUMENT:
  1. Consultar `.context/modules/[nome-do-modulo]`
  2. Carregar a skill correspondente
  3. Utilizar o especialista do módulo
  4. Responder baseado em evidências (não suposições)

- O uso NÃO deve ser opcional — deve ser obrigatório

---

## 📌 Etapa 6: Padronização de resposta
Garanta que respostas:
- Sejam consistentes entre sessões
- Sigam o mesmo padrão de raciocínio
- Evitem respostas genéricas
- Sejam auditáveis (explicando de onde veio a informação)

---

## 📌 Etapa 7: Validação final
- Verifique se segue o mesmo padrão do Dashboard
- Garanta que não conflita com outros especialistas
- Garanta clareza e reutilização

---

## 📦 Output esperado
- Arquivo do especialista criado
- Arquivo da skill criado
- Índice atualizado
- Regras bem definidas

---

## ⚠️ Importante
Siga exatamente o padrão já existente no projeto (Dashboard, OMIE, etc).
Não invente estrutura nova — apenas replique e adapte.