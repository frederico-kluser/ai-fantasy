# Produto — AI Fantasy

> **Definição canônica.** Este documento diz o que o AI Fantasy é, para que serve e o que fica de
> fora. Ele vence qualquer outro documento em caso de conflito de produto. As decisões que o
> formam estão em [decisões](<planning/decisions.md>) (D-09 em diante), tomadas pelo maintainer em
> 2026-11-09.

## 1. Em uma frase

O AI Fantasy é um **simulador web de conversas com NPCs que simulam pessoas**: a cada fala dita
ou ouvida, o motor recalcula o corpo, as emoções, as vontades, os laços e a percepção de cada
personagem, considerando lugar, horário, clima e quem está por perto, e decide por porcentagens o
que acontece. Um modelo de linguagem só transforma o resultado em fala viva.

O motor se chama **Hermeneutic Core** (motor de diálogo interpretativo). **O motor é o produto.**

## 2. Para que serve

1. **Agora:** validar que é possível conversar sem fim com NPCs que parecem pessoas, com a
   profundidade de um Dwarf Fortress aplicada à conversa.
2. **Depois:** servir de base para **sistemas de NPCs melhores em jogos e mods de jogos**
   (D-24). Por isso o motor é independente de cenário, determinístico e separado da interface.

## 3. Como funciona, do ponto de vista de quem usa

1. **Criar um playground.** Você digita a premissa (o cenário e o enredo, em texto livre) e,
   se quiser, uma linha por personagem. O SOM traduz isso para os nossos **presets** (lugar,
   clima, horário, arquétipos, laços, história). Você revisa a ficha montada e ajusta o que
   quiser antes de começar.
2. **Rodar uma fatia de conversa.** Os personagens conversam numa cena: um lugar desenhado numa
   grade, num horário e num clima. Você pode jogar com um personagem, deixar o motor jogar por
   ele (como no The Sims) ou só assistir os NPCs conversando entre si.
3. **Ler a conversa.** Cada ato decidido pelo motor vira uma fala com gesto, escrita pelo modelo
   de texto com o sabor da premissa: sotaque, expressões, jeito de gente real.
4. **Entender o porquê.** O inspetor mostra o estado de cada personagem, os sorteios, a leitura
   do SOM e o que foi enviado ao modelo de texto.
5. **Avaliar.** Você dá notas às falas e às cenas; o produto calcula as métricas de validação.
6. **Continuar.** A história de cada personagem passa para a próxima fatia: laços, memórias e
   personalidade mudam com o que aconteceu.

## 4. As regras que definem o produto

| Tema | Regra | Decisão |
| --- | --- | --- |
| Unidade | Simula-se **uma fatia de conversa**, não o mundo. Dentro dela o tempo anda em ticks; fora dela nada é simulado. | D-10 |
| Tempo | **O mundo espera o jogador.** Ticks avançam pelos atos; na vez do jogador tudo pausa; entre NPCs a conversa anda passo a passo ou sozinha. | D-11 |
| Personagens | Status em camadas: **corpo, emoções, vontades (pirâmide de Maslow), laços, percepção do momento e traços**. Tudo recalculado a cada fala dita ou ouvida. | D-12 |
| Fala | Cada fala é **ato × tom × tópico, com valores** (intensidade, volume, marca de mentira). Paquera e provocação são combinações. | D-13 |
| Jogador | O jogador é **um personagem simulado como os outros**: decide os próprios atos, mas sente tudo e deixa transparecer; pode largar o controle. | D-14 |
| Personalidade | Decisões e interações passadas formam tendências (as recentes pesam mais); um padrão mantido vira **traço fixo**. Vale para todos. | D-14 |
| Turnos | Quem age a seguir sai da **vontade de agir** de cada um: interrupções, silêncios e saídas surgem sozinhos. A conversa termina quando sobra uma pessoa ou quando morre (5 minutos de silêncio). | D-15 |
| Espaço | A cena é uma **grade com paredes**; distância e audição saem da geometria. A grade cobre só o lugar da cena. | D-16 |
| Elenco | Personagens e laços nascem de **arquétipos com história gerada**; a criação à mão usa as mesmas peças. | D-17 |
| Cenário | **Qualquer cenário e qualquer tipo de personagem**: a premissa vira presets; o motor só conhece presets; o modelo de texto usa o enredo. | D-21 |
| Coração | **A pirâmide de Maslow** organiza as vontades; é o que faz o motor servir a qualquer realidade. | D-21 |
| IA | **O motor decide tudo com porcentagens.** O SOM só traduz texto livre em labels, presets e valores; o modelo de texto só dá voz. Nenhum dos dois decide. | D-19, D-20 |
| Conteúdo | **Sem limites de conteúdo próprios.** Valem só as políticas do OpenRouter e de cada modelo, e a lei. | D-22 |

## 5. As duas IAs e o que cada uma pode fazer

| Papel | O que faz | O que nunca faz | Modelo agora | Modelo no futuro |
| --- | --- | --- | --- | --- |
| **SOM** (System One Model, decisor tipado) | Converte texto livre (fala do jogador, premissa, descrição de personagem) em labels, presets e valores, com probabilidades. | Decidir o resultado de um ato, escrever texto, alterar estado. | `typesafe/jev-1.14` via OpenRouter | d1 da LiquidAI (família do d1-2B) |
| **Modelo de texto** (LLM) | Encena um ato já decidido como fala e gesto, com voz, sotaque e o enredo da premissa. | Decidir o que acontece, inventar fatos, mudar laços ou status. | `xiaomi/mimo-v2.6-pro` via OpenRouter | LFM3-1.7B |

Por agora **não há IA local**: o site roda em `localhost` e um servidor local chama o OpenRouter,
guardando a chave fora do navegador (D-19). Detalhes em
[integração de IA](<architecture/ai-integration.md>).

## 6. O que fica de fora

Fora do produto atual, por decisão do maintainer (D-09):

- mundo contínuo, região com várias localidades, viagem e agenda de NPCs fora da conversa;
- visual 2D isométrico, silhuetas e campo de visão do plano antigo;
- rede neural por personagem, genética e evolução por gerações;
- IA local (LFM3, d1-2B), por enquanto;
- economia, itens, combate e regras emergentes inventadas por modelo;
- o processo antigo de 46 cartões com ondas, juiz e manifesto com hash.

Qualquer item desta lista só volta com uma decisão nova registrada.

## 7. Quando o produto está validado

Pelo pacote de métricas B (D-23), com o protocolo em [avaliação](<engineering/evaluation.md>):

| Métrica | Meta |
| --- | --- |
| Nota de naturalidade do maintainer ("soa natural", "parece gente"), 1 a 5 por fala | média ≥ 4 em 20 cenas de 5 cenários diferentes |
| Coerência da fala com status, laços e contexto | ≥ 90% das falas |
| Fatos inventados nas cenas avaliadas | 0 |
| Falas do jogador lidas certo pelo SOM, sem correção | ≥ 90% |
| Tempo para mostrar uma fala | ≤ 5 s em 95% dos casos |
| Custo por conversa | dentro do teto fixado após medir as 5 primeiras cenas |
| Passo do motor com 8 personagens | ≤ 16 ms (acima disso, entra o WebAssembly) |

Antes de declarar o produto validado, 3 a 5 pessoas jogam sem conhecer o sistema; a maioria
precisa dizer que os NPCs parecem pessoas.

## 8. Onde está cada coisa

| Para saber… | Leia |
| --- | --- |
| Como o motor calcula tudo | [modelo de simulação](<architecture/simulation-model.md>) |
| Que atos, tons e tópicos existem | [atos de conversa](<architecture/dialogue-acts.md>) |
| Que presets existem e como a premissa vira presets | [presets](<architecture/presets.md>) |
| Como o SOM e o modelo de texto são usados | [integração de IA](<architecture/ai-integration.md>) |
| Como o código se organiza | [arquitetura](<architecture/overview.md>) |
| Em que ordem se constrói | [ROADMAP](<../ROADMAP.md>) |
| Por que cada decisão foi tomada | [decisões](<planning/decisions.md>) e [ADRs](<architecture/adr/README.md>) |
