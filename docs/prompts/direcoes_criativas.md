
## Modelo que vamos usar
gemini-3-pro-image-preview

## Contexto que vamos utilizar para gerar as imagens
O prompt para o Nano Banana é composto de:

1) PNG da celebridade
2) Logotipo do cliente em png
3) Paleta de cores
4) Imagem de produto, ambiente ou elemento (opcional)
5) Prompt dinamico com os dados do cliente
6) Global Rules!

## Tabela de grupos
| Categoria     | 🖤 Moderna                                 | 🤍 Clean                                      | 🟡 Retail                                  |
|--------------|--------------------------------------------|-----------------------------------------------|--------------------------------------------|
| Fundo        | Preto / escuro                             | Branco puro                                  | Cor sólida da marca                        |
| Celebridade  | Herói 70–80% do frame, cinematográfico     | Foto limpa flutuando no branco, canto direito | Cut-out em pé, lado direito, quebra a moldura |
| Layout       | Assimétrico, foto domina, texto na base    | Split editorial 30/70 com coluna de texto     | Geométrico duro, blocos e badges           |
| Tipografia   | Ultra-bold condensed, impactante           | Light/regular serif ou sans, com muito espaço | All-caps condensed, máximo contraste       |
| Referência   | Nike / pôster de filme                     | Vogue / anúncio Apple                         | Casas Bahia / Magazine Luiza               |

## Prompts por categoria

Cada prompt assume que o modelo já recebeu PNG da celebridade, logotipo, paleta e (opcional) imagem de produto/ambiente, mais o prompt dinâmico do cliente.

### 🖤 Moderna — `direction_moderna`

```
Estilo: pôster cinematográfico moderno, energia editorial estilo Nike / key-art de filme.

FUNDO
- Cor sólida preta ou tom muito escuro derivado da paleta da marca (preferir #0A0A0A a #1A1A1A).
- Sutil gradiente radial atrás da celebridade para dar profundidade; sem texturas ruidosas.
- Iluminação dramática direcional (rim light), preservando contraste alto.

CELEBRIDADE
- A figura é o herói absoluto: ocupa 70–80% da altura do frame.
- Enquadramento cinematográfico, recorte do PNG limpo, sem deformar proporções.
- Posicionada levemente off-center (regra dos terços), olhar firme em direção ao espectador ou em três-quartos.
- Sombra suave projetada na base para integrar à cena.

LAYOUT
- Composição assimétrica: a foto domina o eixo vertical; o bloco de texto vive na base ou na lateral inferior.
- Logotipo do cliente discreto, no topo ou rodapé, em versão monocromática que respeite o fundo escuro.
- Imagem de produto/ambiente (se fornecida) entra como elemento secundário pequeno, integrado ao bloco inferior.

TIPOGRAFIA
- Sans-serif ultra-bold condensed (estilo Druk, Anton, Bebas Neue Bold), em caixa alta.
- Headline curta e impactante; subtítulo opcional em peso regular muito menor.
- Branco puro ou cor de destaque única extraída da paleta da marca.
- Hierarquia agressiva: headline gigante, suporte minúsculo.

PALETA
- Base: preto/escuro.
- Acentos: 1 cor da paleta da marca como destaque pontual em tipografia ou detalhe gráfico.
- Evitar mais de duas cores de destaque.

ATMOSFERA / REFERÊNCIA
- Inspiração: campanhas Nike, pôsteres de filme A24, key visual de lançamento esportivo.
- Acabamento: cinematográfico, contrastado, com leve grão de filme opcional.

PROIBIÇÕES
- Sem stock photos genéricos, sem clip-art, sem moldura branca ao redor da celebridade.
- Sem múltiplos focos visuais — apenas a celebridade comanda.
```

### 🤍 Clean — `direction_clean`

```
Estilo: editorial minimalista premium, energia Vogue / anúncio Apple.

FUNDO
- Branco puro (#FFFFFF) ou off-white muito sutil (#FAFAFA) em toda a composição.
- Sem texturas, sem gradientes, sem sombras de fundo.
- Espaço negativo é o protagonista: respiração generosa em todas as bordas.

CELEBRIDADE
- Recorte limpo do PNG flutuando sobre o branco, sem fundo ou base aparente.
- Posicionada à direita do frame, ocupando aproximadamente 50–60% da altura.
- Sombra muito suave e difusa (drop shadow editorial), nunca dura.
- Enquadramento meio corpo ou corpo inteiro, postura natural e elegante.

LAYOUT
- Split editorial 30/70: coluna esquerda dedicada ao texto (30%), área direita para a celebridade (70%).
- Logotipo do cliente pequeno, no topo esquerdo ou inferior, em peso fino.
- Imagem de produto/ambiente (se fornecida) entra discreta, alinhada à base da coluna de texto.
- Alinhamento rigorosamente em grid; margens amplas e consistentes.

TIPOGRAFIA
- Serif elegante (estilo Tiempos, Canela, Söhne) ou sans light (Inter Light, Helvetica Neue Light).
- Pesos: light ou regular; nunca bold.
- Headline em tamanho médio, com tracking levemente aberto.
- Texto de apoio curto, em corpo pequeno, com ótima legibilidade.
- Cor: preto puro ou cinza grafite (#111 a #333).

PALETA
- Base: branco.
- Texto: preto/grafite.
- Cor da marca aparece com extrema parcimônia: um detalhe (linha fina, ponto, badge) ou somente no logo.

ATMOSFERA / REFERÊNCIA
- Inspiração: capa de Vogue, anúncio Apple, campanha COS, editorial Kinfolk.
- Acabamento: silencioso, refinado, premium, sem ruído visual.

PROIBIÇÕES
- Sem cores de fundo, sem formas geométricas decorativas, sem badges chamativas.
- Sem tipografia bold ou condensed.
- Sem elementos que disputem atenção com a celebridade.
```

### 🟡 Retail — `direction_retail`

```
Estilo: campanha de varejo de alto impacto, energia Casas Bahia / Magazine Luiza / Mercado Livre Black Friday.

FUNDO
- Cor sólida 100% saturada extraída da paleta da marca (a cor primária mais vibrante disponível).
- Sem gradientes complexos; pode haver bloco de cor secundária da paleta para dividir áreas.
- Iluminação plana e uniforme, sem drama cinematográfico.

CELEBRIDADE
- Cut-out de corpo inteiro, em pé, posicionada do lado direito do frame.
- A figura "quebra a moldura": parte da silhueta ultrapassa as bordas do layout, criando dinamismo.
- Sombra dura e definida na base para fixar a celebridade ao plano.
- Postura confiante, gesto direto (apontando, segurando o produto, polegar para cima ou similar).

LAYOUT
- Estrutura geométrica dura: blocos retangulares de cor, faixas diagonais, badges circulares ou em estrela.
- Lado esquerdo dedicado a oferta/mensagem; lado direito para a celebridade.
- Logotipo do cliente em destaque no topo, em tamanho confortável.
- Imagem de produto (se fornecida) aparece em destaque ao centro/esquerda, com sombra dura.
- Selos e badges (estilo "OFERTA", "EXCLUSIVO", percentuais) compõem a cena com hierarquia clara.

TIPOGRAFIA
- Sans-serif condensed em caixa alta (Impact, Anton, Oswald Bold, Bebas Neue).
- Headline gigante, peso máximo, contraste absoluto com o fundo.
- Uso de duas cores tipográficas: principal (branco ou amarelo) + acento (cor complementar da paleta).
- Números (preços, percentuais) ainda maiores que a headline, formatados como manchete.
- Itálico ocasional para reforçar urgência.

PALETA
- Cor primária da marca como fundo dominante.
- Branco e preto como suporte.
- Uma cor complementar (geralmente amarelo, vermelho ou ciano) para destaques e badges.

ATMOSFERA / REFERÊNCIA
- Inspiração: encarte Casas Bahia, banner Magazine Luiza, campanha Black Friday Mercado Livre.
- Acabamento: alto contraste, leitura instantânea a 3 metros, energia de promoção.

PROIBIÇÕES
- Sem fundo branco ou preto puro (esses pertencem às outras categorias).
- Sem tipografia fina ou serif.
- Sem composição minimalista: o frame deve estar densamente preenchido, mas com hierarquia clara.
```
