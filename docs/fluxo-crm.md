# Documentação do Fluxo de CRM — Aceleraí

> **Versão:** 1.0  
> **Status:** Rascunho para revisão  
> **Produto principal:** Licenciamento de direito de imagem e uso de conteúdo (artes estáticas, vídeos e redes sociais) de celebridades

---

## 1. Visão Geral

A Aceleraí comercializa, como produto principal, o **licenciamento de direito de imagem de celebridades**, que permite que empresas utilizem a imagem, artes estáticas, vídeos e presença em redes sociais de uma celebridade em suas campanhas publicitárias.

O fluxo de CRM descreve toda a jornada desde o primeiro contato de um lead com um vendedor até a conclusão do pagamento e elegibilidade para onboarding. Este documento detalha cada etapa desse processo e, ao final, apresenta um desafio identificado nesse fluxo.

---

## 2. Definições

| Termo | Descrição |
|---|---|
| **Lead** | Potencial cliente que ainda não realizou nenhuma compra |
| **Proposta** | Documento comercial gerado pelo vendedor com detalhes do produto, investimento, região de uso e celebridade |
| **Venda** | Registro formal no CRM após aceite da proposta pelo lead |
| **Purchase ID** | Identificador único gerado para cada compra finalizada |
| **Gestor** | Responsável interno pela aprovação da venda no CRM |
| **Onboarding** | Processo de ativação e integração do cliente após a compra |

---

## 3. Fluxo Completo do CRM

### 3.1 Fase 1 — Atendimento Inicial

O processo começa quando um **vendedor** inicia ou recebe o contato de um **lead**. Nessa etapa:

- O vendedor apresenta a Aceleraí e seu produto principal
- O lead é introduzido ao conceito de licenciamento de direito de imagem de celebridades
- São apresentadas as possibilidades de uso: artes estáticas, vídeos, campanhas para redes sociais
- O vendedor entende o perfil, as necessidades e os objetivos do lead
- É avaliada a viabilidade comercial antes de avançar para a proposta

Nenhum compromisso formal é gerado nessa fase. O objetivo é qualificar o lead e construir entendimento mútuo sobre o produto.

---

### 3.2 Fase 2 — Criação e Envio da Proposta

Quando o vendedor identifica interesse real do lead, ele **cria uma proposta** dentro do CRM. Essa proposta contém:

- **Celebridade selecionada** — qual personalidade será licenciada
- **Tipos de uso autorizados** — artes estáticas, vídeos, redes sociais
- **Região de veiculação** — área geográfica onde a campanha poderá ser exibida
- **Período de vigência** — duração do licenciamento
- **Valor do investimento** — custo total da licença

A proposta é então **enviada formalmente ao lead** para análise.

---

### 3.3 Fase 3 — Análise e Negociação

O lead recebe a proposta e passa por um processo de avaliação interna. Nessa fase:

- O lead analisa o investimento, a celebridade escolhida, a região e o período
- Podem surgir dúvidas ou pedidos de ajustes (região, prazo, valor, escopo de uso)
- O vendedor e o lead entram em uma **rodada de negociação** até alinharem os termos
- O lead pode solicitar alterações na proposta, que será revisada e reenviada pelo vendedor

Essa fase termina com uma decisão do lead: **aceitar ou recusar** a proposta.

---

### 3.4 Fase 4 — Fechamento e Criação da Venda

Quando o lead **aceita a proposta**, o processo avança para o fechamento formal:

1. O vendedor **registra uma venda no CRM**, vinculada à proposta aceita
2. A venda fica com status **"Aguardando Aprovação"**
3. O vendedor **solicita aprovação a um gestor**

---

### 3.5 Fase 5 — Aprovação pelo Gestor

Um **gestor responsável** recebe a notificação de venda pendente e realiza a revisão:

- Confere os dados da proposta (celebridade, região, prazo, valor)
- Verifica se todas as informações estão corretas e consistentes
- Valida se não há conflitos comerciais ou restrições para aquele lead/região

Após a conferência, o gestor **aprova a venda** no CRM, avançando o processo.

---

### 3.6 Fase 6 — Contrato e Pagamento

Com a venda aprovada, o sistema:

1. **Gera o contrato** correspondente à proposta aprovada
2. **Envia um link ao cliente** contendo:
   - Acesso ao contrato para leitura e assinatura digital
   - Acesso ao checkout integrado para realização do pagamento

O cliente, a partir desse link:

- **Lê e assina o contrato** digitalmente
- **Realiza o pagamento** via checkout integrado

Ao concluir ambas as ações, é gerado um **Purchase ID único** para essa compra, registrando oficialmente a transação.

---

### 3.7 Fase 7 — Elegibilidade para Onboarding

Com o contrato assinado e o pagamento confirmado, a venda muda de status para **"Concluída"**, e o cliente se torna **elegível para o processo de Onboarding**.

O onboarding é a etapa onde o cliente será integrado à operação, receberá orientações sobre o uso dos materiais licenciados e terá acesso aos entregáveis contratados.

---

## 4. Resumo Visual do Fluxo

```
Lead → Atendimento → Proposta → Negociação → Aceite
                                                 ↓
                                         Criação da Venda
                                                 ↓
                                         Aprovação do Gestor
                                                 ↓
                                     Envio do Link (Contrato + Checkout)
                                                 ↓
                                     Assinatura + Pagamento
                                                 ↓
                                         Purchase ID Gerado
                                                 ↓
                                      Elegível para Onboarding
```

---

## 5. O Desafio — Múltiplas Celebridades na Mesma Jornada

### 5.1 Contexto

Todo o fluxo descrito acima foi concebido considerando que **um lead fecha negócio com uma única celebridade**, gerando:

- 1 Proposta
- 1 Venda
- 1 Aprovação
- 1 Contrato
- 1 Pagamento
- 1 Purchase ID
- 1 Processo de Onboarding

### 5.2 O Problema

Na prática, existe um cenário recorrente em que um **lead decide fechar com 2 ou mais celebridades** ao mesmo tempo.

Seguindo o fluxo atual, esse cenário gera:

- **2 Propostas** separadas (uma por celebridade)
- **2 Vendas** separadas no CRM
- **2 Aprovações** pelo gestor
- **2 Contratos** distintos
- **2 Links** enviados ao cliente
- **2 Processos de assinatura** independentes
- **2 Checkouts** separados
- **2 Purchase IDs** distintos
- **2 Processos de Onboarding** independentes

### 5.3 O Impacto

Esse comportamento gera uma experiência problemática em múltiplos pontos:

**Para o cliente:**
- Recebe 2 links diferentes para assinar e pagar
- Precisa preencher as mesmas informações cadastrais e de pagamento duas vezes
- A experiência é fragmentada e confusa, podendo gerar abandono em um dos fluxos
- A percepção de profissionalismo da Aceleraí é prejudicada

**Para a operação:**
- O gestor precisa aprovar 2 vendas separadas para o mesmo cliente
- O time de onboarding recebe 2 registros distintos para o mesmo cliente
- O risco de inconsistência de dados entre os 2 registros é alto
- O controle financeiro e de contratos fica dividido em entradas separadas

**Para o sistema:**
- São gerados 2 Purchase IDs independentes sem nenhuma relação entre si no modelo de dados
- Não há nenhum vínculo formal no sistema indicando que essas 2 compras pertencem ao mesmo cliente e foram fechadas na mesma jornada comercial
- O onboarding, que deveria ser uma experiência única para o cliente, teria que ser disparado 2 vezes de forma isolada

### 5.4 A Questão Central

> Como o fluxo de CRM da Aceleraí deve ser redesenhado — ou complementado — para suportar o cenário em que um mesmo lead fecha com múltiplas celebridades, garantindo uma experiência unificada para o cliente, sem duplicidade desnecessária de etapas, e mantendo a rastreabilidade individual de cada compra no sistema?