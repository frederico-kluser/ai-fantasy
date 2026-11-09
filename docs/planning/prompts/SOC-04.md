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
- [atos de conversa](<../../architecture/dialogue-acts.md>) — §9

## Escopo

**Inclui:**

- Geração de até 64 candidatos; utilidade com satisfação, vieses, objetivos e penalidade de repetição.
- Escolha entre os 5 melhores com pesos ajustados por `selfControl`.
- Obrigação de resposta com bônus.
- Vontade de agir, limiar, sorteio de quem age, ticks de silêncio e seus efeitos.
- Interrupção marcada e seus efeitos.
- Vontade de sair contra vontade de ficar; saída forçada por necessidade crítica (só NPC); `FAREWELL` e `LEAVE`.
- Fim por uma pessoa restante ou 60 ticks de silêncio.
- Jogador em `MANUAL`: pausa com `awaiting`; `TAKE_TURN` a qualquer ponto de decisão.

**Não inclui:**

- API pública de cena e registro (SOC-05).

## Entregáveis

- `packages/engine/src/decision/`
- `packages/engine/src/turns/`

## Lista de testes (escreva primeiro)

```text
- given known drives, satisfaction and biases when scoring a candidate then U follows the formula term by term
- given physical relief at 10000 when choosing then no level 4 or 5 drive contributes
- given nobody above the urge threshold when deciding then a silence tick happens
- given a pending response when another character acts then the act is marked as an interruption
- given an NPC with bladder at 9500 and a path to an exit when stepping then the NPC leaves within a finite number of decision points
- given the player in MANUAL drawn to act when stepping then the engine returns awaiting and chooses nothing
- given 60 silent ticks when deciding then the slice ends
```

## Critérios de aceite

- [ ] Invariantes 7 e 9 como testes.
- [ ] Transcrição simbólica de ouro de uma cena com 3 personagens e seed fixa.
- [ ] Gates do motor verdes.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Desempates por id crescente; tudo em inteiros.
