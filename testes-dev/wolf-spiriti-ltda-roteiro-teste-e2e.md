# E2E Onboarding - WOLF SPIRITI LTDA

## Objetivo

Validar ponta a ponta o fluxo do formulario de onboarding acessado por `compra_id`, incluindo gates de confirmacao, persistencia de escolhas e conclusao da jornada.

## Escopo

- URL base: `http://localhost:5173/?compra_id=42a4e250-1dfb-404e-b0c3-67fb1e7e0761`
- Cliente esperado na abertura: `WOLF SPIRITI LTDA`
- Celebridade esperada: `Monique Alfradique`
- Fluxo coberto: Etapa 1 ate tela final de parabens

## Pre-condicoes

1. App onboarding rodando localmente em `localhost:5173`.
2. `compra_id` valido na URL.
3. Browser limpo (sem estado antigo do onboarding) ou reset manual.
4. Se for testar upload de logo/imagens, ter arquivos de teste disponiveis (PNG/JPG/WebP e opcional SVG).

## Massa de teste sugerida

- `compra_id`: `42a4e250-1dfb-404e-b0c3-67fb1e7e0761`
- Escolha Etapa 5: optar por receber superdicas de trafego.
- Escolha Etapa 6.2:
  - Caminho A (completo): enviar logo + escolher fonte + concluir.
  - Caminho B (fallback): clicar em "Continuar depois (marcar etapa como pendente)".
- Escolha Etapa 8: `Producao pela Acelerai`.

## Passo a passo com criterios de aceite

### 1) Entrada e hidratacao inicial

Passos:
1. Abrir a URL com `compra_id`.
2. Aguardar tela de carregamento finalizar.
3. Validar CTA inicial "COMEÇAR AGORA".

Criterios de aceite:
- Deve exibir nome do cliente (`WOLF SPIRITI LTDA`).
- Deve exibir celebridade e texto de boas-vindas.
- Nao deve apresentar erro bloqueante de carregamento.

### 2) Etapa 2 - Como funciona sua campanha

Passos:
1. Clicar em "COMEÇAR AGORA".
2. Navegar pelos 4 slides.
3. Na confirmacao, tentar avancar sem marcar checkboxes.
4. Marcar todos os checkboxes e avancar.

Criterios de aceite:
- Botao deve permanecer bloqueado enquanto houver itens pendentes.
- Botao deve liberar apos todos os itens marcados.
- Deve exibir tela de conclusao da etapa.

### 3) Etapa 3 - Prazos e combinados

Passos:
1. Continuar para etapa 3.
2. Navegar pelos 4 slides.
3. Na confirmacao, validar bloqueio com checklist incompleto.
4. Marcar todos os itens e avancar.

Criterios de aceite:
- Gate por checklist deve funcionar igual a etapa 2.
- Deve exibir estado de processamento (ex.: "Ativando preparacao...").
- Deve concluir a etapa sem erro.

### 4) Etapa 4 - Regras de uso da celebridade

Passos:
1. Avancar slides da etapa.
2. No quiz final, marcar todos os itens.
3. Avancar para conclusao da etapa.

Criterios de aceite:
- Confirmacao deve exigir todos os itens do quiz.
- Deve salvar respostas e concluir etapa.

### 5) Etapa 5 - Presenca digital

Passos:
1. Selecionar opcao "Sim, quero receber as 10 superdicas de trafego pago".
2. Avancar.

Criterios de aceite:
- Botao de avancar deve habilitar somente apos selecionar uma opcao.
- Deve concluir etapa exibindo mensagem de envio das superdicas.
- (Tecnico) Disparo de webhook deve retornar sucesso (POST 200).

### 6) Etapa 6.1 - Identidade visual (entendimento)

Passos:
1. Marcar checkbox de entendimento.
2. Avancar.

Criterios de aceite:
- Gate deve bloquear sem checkbox marcado.
- Com checkbox marcado, etapa deve concluir normalmente.

### 7) Etapa 6.2 - Bonificacao / identidade visual

Passos (caminho A - completo):
1. Selecionar "Vou adicionar as minhas referencias da identidade visual".
2. Slide 1: enviar logo.
3. Slide 2: validar cores extraidas/custom.
4. Slide 3: selecionar fonte.
5. Slide 4: opcional enviar imagens de referencia.
6. Slide 5: preencher observacoes (opcional) e concluir.

Passos (caminho B - fallback):
1. Selecionar "Vou adicionar as minhas referencias da identidade visual".
2. Clicar "Continuar depois (marcar etapa como pendente)".

Criterios de aceite:
- Caminho A: deve salvar identidade e concluir etapa sem erro.
- Caminho B: deve marcar etapa como pendente e permitir seguir fluxo.
- Em ambos os caminhos, chamada de persistencia deve retornar sucesso.

### 8) Etapa 8 - Modo de producao

Passos:
1. Selecionar `Producao pela Acelerai`.
2. Avancar.

Criterios de aceite:
- Botao deve liberar apenas apos escolha do modo.
- Deve persistir opcao e concluir etapa.

### 9) Resumo final e encerramento

Passos:
1. Revisar card de resumo.
2. Clicar em "Concluir Primeiro Passo".
3. Validar tela final de parabens.

Criterios de aceite:
- Deve exibir resumo coerente do fluxo.
- Deve concluir sem erro e mostrar mensagem final de sucesso.

## Criticos para aprovacao E2E

- Fluxo completo navegavel ate a tela final.
- Gates de checklist e radios impedem avancar sem resposta.
- Persistencia de dados-chave sem erro HTTP.
- Sem crash de UI ou erro bloqueante no console.

## Pos-condicoes esperadas

- Jornada concluida para o `compra_id` testado.
- Etapas marcadas como concluidas (ou 6.2 pendente, conforme caminho escolhido).

## Observacoes

- Quando o botao/checkbox estiver fora de viewport em ambientes automatizados, usar scroll antes do clique.
- Para cobertura total de 6.2 (upload real), manter um conjunto de assets de logo/imagens de teste no repositorio.
