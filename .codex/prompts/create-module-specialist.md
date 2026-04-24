## Objetivo
Padronizar o comportamento da IA para o modulo informado pelo usuario, garantindo respostas consistentes, baseadas em evidencias e alinhadas ao contexto real do sistema.

---

## Etapa 1: Levantamento de contexto
- Analise o funcionamento do modulo informado
- Identifique:
  - Objetivo do módulo
  - Principais fluxos e funcionalidades
  - Entidades envolvidas
  - Regras de negócio
  - Pontos críticos / sensíveis
- Se necessário, leia arquivos relevantes do projeto

---

## Etapa 2: Criar/atualizar documentacao de contexto
Crie ou atualize a documentacao do modulo seguindo o padrao existente em `.context/modules/`:

- Pasta: `.context/modules/[nome-do-modulo]/`
- Arquivos esperados, quando fizer sentido:
  - `README.md`
  - `BUSINESS-RULES.md`
  - `DOC-READING-ORDER.md`

As instrucoes devem explicar:
- Quando consultar este contexto
- Principais fluxos e entidades
- Regras de negocio
- Pontos criticos / sensiveis
- O que evitar

---

## Etapa 3: Criar skill do modulo
Crie uma skill Codex em `.agents/skills/[nome-do-modulo]/SKILL.md`:

- Nome: `[nome-do-modulo]`
- Descricao com gatilhos de uso (ex: "quando o usuario pedir...", "analisar...", etc)
- Instrucoes com:
  - Quando deve ser utilizado
  - Como analisar o modulo
  - Como mapear impacto de mudancas
  - Como responder baseado em evidencias
  - Referenciar `.context/modules/[nome-do-modulo]` como fonte de verdade
  - Boas praticas especificas
  - O que evitar

---

## Etapa 4: Atualizar indice de skills/contexto
- Atualize `AGENTS.md` quando a regra precisar ser global para este repositorio.
- Atualize indices existentes em `.context/modules/` se houver.
- Garanta que a skill seja facilmente descoberta pela descricao do `SKILL.md`.

---

## Etapa 5: Criar regra de governanca (OBRIGATORIA)
Implemente uma regra clara em `AGENTS.md` quando o modulo for recorrente/critico:

- Sempre que o pedido envolver o modulo:
  1. Consultar `.context/modules/[nome-do-modulo]`
  2. Carregar a skill correspondente
  3. Responder baseado em evidencias (nao suposicoes)

- O uso NAO deve ser opcional quando a regra estiver em `AGENTS.md`.

---

## Etapa 6: Padronizacao de resposta
Garanta que respostas:
- Sejam consistentes entre sessões
- Sigam o mesmo padrao de raciocinio
- Evitem respostas genéricas
- Sejam auditáveis (explicando de onde veio a informação)

---

## Etapa 7: Validacao final
- Verifique se segue o mesmo padrao dos modulos existentes.
- Garanta que nao conflita com outras skills ou regras do `AGENTS.md`.
- Garanta clareza e reutilizacao.

---

## Output esperado
- Documentacao de contexto criada/atualizada em `.context/modules/[nome-do-modulo]/`
- Skill criada em `.agents/skills/[nome-do-modulo]/SKILL.md`
- `AGENTS.md` atualizado quando aplicavel
- Regras bem definidas

---

## Importante
Siga o padrao ja existente no projeto.
Nao invente estrutura nova sem necessidade; replique e adapte.
