# CORE-02 — Tempo, contexto e grade

> **Fase:** F2 — Núcleo determinístico · **Depende de:** [CORE-01](<CORE-01.md>) · **Branch:** `feat/core-02-time-and-space`
> **Título do PR:** `feat(engine): add clock, weather, grid, sight and hearing`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Implementar o relógio por ticks, as fases do dia e a luz, a grade com tipos de célula e marcas (`exit`, `roofed`), distância, linha de visão, audição por volume, caminhos e o passo de movimento célula a célula.

## Leia antes

- [modelo de simulação](<../../architecture/simulation-model.md>) — §2, §3, §8.1 e §8.2
- [presets](<../../architecture/presets.md>) — §2 a §4 (só o formato dos dados)

## Escopo

**Inclui:**

- Relógio: `minuteOfDay` a partir de `startMinute` e ticks de 5 s; fases com os limites exatos da seção 3.2.
- Luz: `lightLevel` (fase, lugar iluminado, tag `dark`, tempestade num lugar exposto) e alcance visual (20, 8, 3; neblina pela metade em lugar exposto).
- Grade até 48 × 48 com os sete tipos de célula, custos de travessia (porta fechada custa 2 e continua fechada) e marcas `exit` e `roofed`.
- Distância de Chebyshev; linha de visão por supercobertura (parede e porta fechada bloqueiam).
- Audição geométrica: alcance por volume, ruído na fala normal (mínimo 3), parede, janela e porta fechada; quem está no alcance e quem está até o dobro dele (as perspectivas e o sorteio de fragmento são da SOC-01).
- Caminho de menor custo com 8 direções (células ocupadas bloqueiam) e passo de movimento por tick: 1 célula, 2 ticks em `ROUGH` e porta fechada, espera se o próximo passo está ocupado.
- Destinos de `APPROACH` (1 célula do alvo), `WITHDRAW` (4 células ou mais) e saída (a `exit` alcançável mais perto).

**Não inclui:**

- Efeitos do clima e do horário no corpo e nas vontades (CORE-04).
- Atos de movimento e seus destinos de alto nível (SOC-01).

## Entregáveis

- `packages/engine/src/time/`
- `packages/engine/src/space/`

## Lista de testes (escreva primeiro)

```text
- given startMinute 1430 when 144 ticks pass then the clock wraps to minute 2
- given the phase boundaries when converting minutes then each boundary maps to the right phase
- given the evening in a lit place when computing light then it is DIM; at late night it stays DIM; with the dark tag it is DARK
- given fog in an exposed place when computing vision then the range is halved
- given a wall between two cells when checking sight then it is blocked; with a low obstacle it is not
- given a whisper when computing hearers then only cells at distance 1 hear it directly
- given noise 8000 when computing normal speech range then the range is 4
- given a shout behind a wall when computing range then it is halved
- given a closed door on the path when moving through it then it costs 2 ticks and the door stays closed
- given an occupied next cell when moving then the character waits that tick
```

## Critérios de aceite

- [ ] Invariantes 5 e 11 do modelo de simulação como testes de propriedade.
- [ ] Gates do motor verdes.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Desempates sempre pelo menor índice de célula (`y × W + x`).
- A função de luz recebe os dados como parâmetros; os catálogos são da CORE-03.
