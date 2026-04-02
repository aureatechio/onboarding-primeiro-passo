# AGENTS.md - app OMIE

Guia especifico do app `apps/omie` (backend CRM -> OMIE).
Para regras globais do monorepo, usar `CLAUDE.md`.

## Escopo deste app

- Recebe webhook do CRM com dados de cliente e venda
- Valida e transforma payload para o contrato OMIE
- Orquestra chamadas de cliente/servico/OS quando aplicavel

## Ordem de leitura para IA

Antes de modificar qualquer codigo neste app, consulte:
`.context/modules/omie/DOC-READING-ORDER.md`

## Regras de negocio criticas

Regras que so existem no codigo e causam falhas quando ignoradas:
`.context/modules/omie/BUSINESS-RULES.md`

## Arquivos fonte de verdade

- `apps/omie/README.md`
- `apps/omie/prd.md` — requisitos de produto do backend OMIE
- `apps/omie/fluxo.md` — fluxo de integracao CRM → OMIE
- `.context/modules/omie/README.md`
- `.context/modules/omie/NFSE-OPERACAO-OMIE.md`

## Regras operacionais locais

- Nunca versionar segredos em `.env`
- Preservar contratos de payload entre CRM e OMIE
- Em mudancas fiscais/NFS-e, validar impactos em `omie-*` Edge Functions

## Checklist rapido antes de concluir tarefa no app

- Rodar testes do app: `pnpm --filter @aurea/omie test`
- Validar tipagem/lint no monorepo quando houver mudanca cross-app
- Atualizar docs do modulo OMIE quando alterar contrato ou fluxo
