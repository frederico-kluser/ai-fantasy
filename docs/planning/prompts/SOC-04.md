# SOC-04 — Decisão e turnos

> **Fase:** F3 — Comportamento social · **Depende de:** [SOC-03](<SOC-03.md>) · **Branch:** `feat/soc-04-decision-and-turns`
> **Título do PR:** `feat(engine): choose acts and take turns by urge to act`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Fazer os personagens em `AUTO` escolherem atos pela utilidade com Maslow e decidirem quem age pela vontade de agir, com silêncio, interrupção, saída e fim da fatia; pausar no jogador em `MANUAL`.

## Leia antes

- [modelo de simulação](<../../architecture/simulation-model.md>) — §10 e §11
- [atos de conversa](<../../architecture/dialogue-acts.md>) — §5 e §9

## Escopo

**Inclui:**

- Candidatos: atos permitidos, pré-condições (9.1), alvos, 3 tons por viés, até 4 tópicos salientes por alvo e valores (intensidade, volume, mentira, objeto).
- Utilidade com satisfação (9.2), vieses (9.3), bônus de objetivo e penalidade de repetição; escolha entre os 5 melhores com pesos limitados.
- Respostas devidas: só as respostas possíveis e `STAY_SILENT`, com bônus de 4000.
- Vontade de agir com pressão social, sorteio de quem age, ticks de silêncio e seus efeitos, interrupção.
- Saída: vontade de sair contra vontade de ficar, saída forçada por necessidade crítica (só NPC), `FAREWELL` ou `LEAVE` imediatos.
- Fim por uma pessoa restante ou 60 ticks de silêncio.
- Jogador em `MANUAL`: a escolha de quem age devolve o pedido de entrada; `TAKE_TURN`.

**Não inclui:**

- O laço do passo, os eventos e o registro (SOC-05).

## Entregáveis

- `packages/engine/src/decision/`
- `packages/engine/src/turns/`

## Lista de testes (escreva primeiro)

```text
- given known drives, satisfaction and biases when scoring a candidate then U follows the formula term by term
- given physical relief at 10000 when scoring then no level 3 to 5 drive contributes
- given a character owing an answer to a REQUEST with band REFUSE when generating candidates then only REFUSE and STAY_SILENT are offered
- given selfControl 5000 and five candidates when weighting then each weight is the capped difference squared
- given nobody above the urge threshold when picking the actor then the result is a silence tick
- given a pending obligation when a third character is picked then the act is marked as an interruption
- given an NPC with bladder 9500 when deciding departures then the NPC leaves without a draw
- given the player in MANUAL picked when picking the actor then the result asks for player input and no act is chosen
- given 60 silent ticks when checking the end then the slice ends
```

## Critérios de aceite

- [ ] Invariante 9 testada nas funções de turno.
- [ ] Gates do motor verdes.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Desempates por id crescente; tudo em inteiros.
