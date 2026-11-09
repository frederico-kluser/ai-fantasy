# Decisões do maintainer

> Registro das decisões de produto e de direção do AI Fantasy. As decisões vigentes (D-09 em
> diante) foram tomadas por @frederico-kluser em 2026-11-09: primeiro num formulário de 46
> itens, depois numa conversa no terminal, uma pergunta por vez. Decisões estruturais também
> têm ADR. O produto que resulta delas está em [`docs/product.md`](<../product.md>).

## Como ler

- **Origem** diz de onde veio: pergunta da conversa (P1 a P15), item do formulário (Q-xx, S-xx)
  ou "derivada" (consequência registrada pelo agente a pedido do maintainer, que delegou a
  reconstrução do plano).
- Uma decisão só muda com outra decisão registrada aqui.

## Decisões vigentes

| Id | Decisão | Origem | Onde está |
| --- | --- | --- | --- |
| D-09 | **O motor é o produto.** O AI Fantasy é um simulador web de conversas com NPCs que simulam pessoas. O resto do planejamento antigo é descartado. | P1 | ADR 0013, `product.md` |
| D-10 | **Simula-se uma fatia de conversa, não o mundo.** Dentro dela o tempo anda em ticks, o corpo cansa, os status mudam e necessidades aparecem; quem está presente, e a que distância, afeta cada um conforme o laço. | P2, Q-01 | ADR 0013, simulação §3 e §6 |
| D-11 | **O mundo espera o jogador.** Ticks avançam pelos atos; na vez do jogador tudo pausa; entre NPCs, passo a passo ou automático. | P3 | simulação §11 |
| D-12 | **Status em camadas:** corpo, emoções, vontades (15, pela pirâmide de Maslow), laços, percepção do momento e traços. | P4, Q-13, Q-14 | simulação §5 |
| D-13 | **Cada fala é ato × tom × tópico, com valores.** Paquera e provocação são combinações. | P5 | `dialogue-acts.md` |
| D-14 | **O jogador é um personagem simulado:** decide os atos, mas sente tudo e transparece; pode largar o controle, como no The Sims. Decisões e interações passadas formam tendências (as recentes pesam mais) e um padrão mantido vira traço fixo, para todos. | P6 | simulação §7 e §13 |
| D-15 | **Turnos pela vontade de agir:** interrupções, silêncios e saídas surgem sozinhos; a fatia termina quando sobra uma pessoa. | P7 | simulação §11 |
| D-16 | **A cena é uma grade com paredes;** distância e audição saem da geometria; a grade cobre só o lugar da cena. | P8 | simulação §3.1 e §8.2 |
| D-17 | **Personagens e laços nascem de arquétipos com história gerada;** a criação à mão usa as mesmas peças. | P9 | `presets.md` |
| D-18 | **Núcleo em TypeScript puro e determinístico;** WebAssembly só se o passo do motor passar de 16 ms com 8 personagens. | P10, Q-10 | ADR 0014 |
| D-19 | **Site em `localhost` com IA só via OpenRouter:** SOM `typesafe/jev-1.14`, texto `xiaomi/mimo-v2.6-pro`; chave só no servidor local; sem IA local por agora (LFM3 e d1 no futuro). **O motor decide tudo; os modelos só traduzem.** | P11, P1, Q-08, Q-09, Q-11, Q-14, Q-38 | ADR 0015, ADR 0016 |
| D-20 | **Entrada livre do jogador:** segue direto quando o SOM tem certeza; com confiança abaixo de 7000 bp, aparece a etiqueta "entendido como" para confirmar ou corrigir. | P12 | `ai-integration.md` |
| D-21 | **Qualquer cenário e qualquer tipo de personagem:** a premissa digitada vira presets pelo SOM; o motor só conhece presets; o modelo de texto usa o enredo. **A pirâmide de Maslow é o coração do jogo.** | P13 | `presets.md` |
| D-22 | **Sem limites de conteúdo próprios.** Valem as políticas do OpenRouter e de cada modelo, e a lei. | P14 | ADR 0015 |
| D-23 | **Validação pelo pacote B:** nota de naturalidade ≥ 4, coerência ≥ 90%, zero fatos inventados, leitura do SOM ≥ 90%, ≤ 5 s por fala (p95), teto de custo, passo ≤ 16 ms; teste cego com 3 a 5 pessoas antes de declarar validado. | P15, Q-07 | `evaluation.md` |
| D-24 | **Visão:** o projeto vai servir para criar sistemas de NPCs melhores para jogos e mods. | pedido do maintainer | `product.md` |
| D-25 | **Gates completos de qualidade** (TDD, cobertura e mutação) desde já. | Q-06 | ADR 0018 |
| D-26 | **Replay exato** com seed, e um modo de forçar o caminho dos sorteios para testes. | Q-12 | ADR 0017 |
| D-27 | **Processo enxuto:** uma tarefa por branch e PR, com prompt próprio; tarefas sem dependência pendente podem correr em paralelo; sem ondas, juiz ou manifesto com hash. | derivada de D-09 | `ROADMAP.md`, `planning/prompts/README.md` |
| D-28 | **Código do produto neste repositório, em monorepo** (`packages/`, `apps/`). A pasta `lab/` da Q-05 foi absorvida: o laboratório é o próprio simulador com o inspetor. | Q-05, Q-02, derivada | `architecture/overview.md` |
| D-29 | **Governança atualizada:** "offline-first" deixa de ser princípio; "o motor decide, os modelos só traduzem" passa a ser princípio inegociável; registrada a exceção da fase inicial para mudanças grandes com um único maintainer. | derivada de D-19 | `GOVERNANCE.md` |

## O que aconteceu com cada item do formulário

O formulário (versão de 2026-11-09, no histórico do git) teve 14 itens respondidos. Os demais
foram resolvidos pela conversa ou pela especificação, conforme abaixo.

| Itens | Destino |
| --- | --- |
| Q-01, Q-02, Q-03, Q-04, Q-05 | D-10, D-28, D-09 (replanejamento feito nesta revisão), registro e ADRs, D-28 |
| Q-06, Q-07, Q-08, Q-09, Q-10, Q-11, Q-12 | D-25, D-23, D-19 (o DeepSeek foi trocado pelo Mimo na conversa), D-19, D-18, D-19, D-26 |
| Q-13, Q-14 | D-12 (camadas; 15 vontades de Maslow) e D-19 (o modelo nunca decide) |
| Q-15, Q-16, Q-17 | D-13; ADR 0016; probabilidade em bp com faixas (`dialogue-acts.md` §8) |
| Q-18, Q-19, Q-20 | emoções discretas e estado do dia; janela recente e memórias marcantes; continuidade entre fatias (D-14) |
| Q-21, Q-22, Q-23, Q-24, Q-25 | oito eixos de laço; D-17; D-14; até 8 personagens por cena; D-21 com edição da ficha |
| Q-26, Q-27, Q-28, Q-29, Q-30, Q-31 | D-20; o jogador escreve a própria fala; cena com grade; D-11 e D-15; D-15 e modo observar; D-16 |
| Q-32, Q-33, Q-34, Q-35 | descrições em palavras e saída `{fala, gesto}`; pt-BR no registro de cada personagem; inspetor com avaliação cega; D-23 |
| Q-36 | baseline de "LLM livre" **não adotado**: a validação usa as metas do pacote B |
| Q-37, Q-38 | D-22; D-19 |
| S-01, S-02, S-03, S-04 | cenas douradas (`evaluation.md`); acontecimentos de história como ganchos (`presets.md`); ideias dos estudos incorporadas onde couberam; registro em JSONL |
| S-05, S-06, S-07, S-08 | avaliação no site e exportação em Markdown; núcleo antes da IA (ROADMAP); arrumação feita nesta revisão; elenco de referência substituído pelas cenas douradas |

## Decisões substituídas

As decisões D-01 a D-08 foram tomadas em 2026-11-08 para o plano antigo e foram todas
substituídas em 2026-11-09. O texto completo está no histórico do git.

| Id | Decisão antiga | Situação |
| --- | --- | --- |
| D-01 | Motor validado antes do primeiro jogável 2D | substituída por D-09 |
| D-02 | Tempo avança por mover e falar | absorvida por D-11 |
| D-03 | Relações sociais e rumores no centro | absorvida por D-09 e D-12 |
| D-04 | Silhuetas de todos atrás das construções | descartada (fora do produto) |
| D-05 | CPU e GPU da própria máquina, sem teto | descartada (IA via OpenRouter, D-19) |
| D-06 | Visual 2D isométrico, stack em aberto | descartada (fora do produto) |
| D-07 | Região com várias localidades desde o início | substituída por D-10 |
| D-08 | Subagents sem limite, ondas e juiz | substituída por D-27 |
