# CORE-02 — Tempo, contexto e grade

> **Fase:** F2 — Núcleo determinístico · **Depende de:** [CORE-01](<CORE-01.md>) · **Branch:** `feat/core-02-time-and-space`
> **Título do PR:** `feat(engine): add clock, weather, grid, sight and hearing`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Implementar o relógio por ticks e as fases do dia, o clima e a luz, a grade com tipos de célula, distância, linha de visão, audição por volume e caminhos dentro da cena.

## Leia antes

- [modelo de simulação](<../../architecture/simulation-model.md>) — §2, §3 e §8.2
- [presets](<../../architecture/presets.md>) — §2 a §4 (só o formato dos dados)

## Escopo

**Inclui:**

- Relógio: `minuteOfDay` a partir de `startMinute` e ticks de 5 s; fases `DAWN`, `MORNING`, `AFTERNOON`, `EVENING`, `LATE_NIGHT`.
- Luz por fase, clima e lugar; alcance visual (20, 8, 3 células).
- Grade até 48 × 48 com `FLOOR`, `WALL`, `DOOR_OPEN`, `DOOR_CLOSED`, `WINDOW`, `LOW_OBSTACLE`, `ROUGH` e saídas `EXIT`.
- Distância de Chebyshev; linha de visão por supercobertura (paredes e porta fechada bloqueiam; janela e obstáculo baixo não bloqueiam a visão).
- Audição: alcance por volume, efeito do ruído na fala normal (mínimo 3), paredes e janela; chance de fragmento até o dobro do alcance.
- Caminho mínimo na grade (custo 2 em `ROUGH`; janela e obstáculo baixo não são atravessáveis).

**Não inclui:**

- Efeitos do clima e do horário no corpo e nas vontades (CORE-04).

## Entregáveis

- `packages/engine/src/time/`
- `packages/engine/src/space/`

## Lista de testes (escreva primeiro)

```text
- given startMinute 1430 when 144 ticks pass then the clock wraps to minute 2
- given the phase boundaries when converting minutes then each boundary maps to the right phase
- given a wall between two cells when checking sight then it is blocked; with a low obstacle it is not
- given a whisper when computing hearers then only cells at distance 1 hear it directly
- given noise 8000 when computing normal speech range then the range is 4
- given a shout behind a wall when computing range then it is halved
- given rough terrain on the shortest path when finding a path then the cheaper route is chosen
```

## Critérios de aceite

- [ ] Invariante 5 do modelo de simulação como teste de propriedade.
- [ ] Gates do motor verdes.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Desempates sempre pelo menor índice de célula.
