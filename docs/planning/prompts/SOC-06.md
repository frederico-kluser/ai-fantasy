# SOC-06 — Personalidade que muda e continuidade entre fatias

> **Fase:** F3 — Comportamento social · **Depende de:** [SOC-05](<SOC-05.md>) · **Branch:** `feat/soc-06-personality-and-continuity`
> **Título do PR:** `feat(engine): evolve personality and carry history across slices`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Fazer os atos moverem tendências, cristalizarem traços e levar a história dos personagens de uma fatia para a outra, com as regras de intervalo e a criação da fatia seguinte.

## Leia antes

- [modelo de simulação](<../../architecture/simulation-model.md>) — §12 a §14
- [atos de conversa](<../../architecture/dialogue-acts.md>) — §10
- [arquitetura](<../../architecture/overview.md>) — §3.2

## Escopo

**Inclui:**

- Sinais de traço por ato e tom como dados; tendência só nos traços sinalizados; traço efetivo limitado a ±10000.
- Contador de cristalização e cristalização no fim da fatia, recalculando as linhas de base.
- `endSlice` com `TimeGap` (horas inteiras e grupos `together`): corpo, emoções, saudade, vingança, memória e tendências por dia; descarte do que não persiste.
- `createSlice` a partir da campanha, com os mesmos personagens.
- Memórias marcantes (até 50) e reforço ao contar de novo.

**Não inclui:**

- Telas de campanha (WEB-03).

## Entregáveis

- `packages/engine/src/personality/`
- `packages/engine/src/continuity/`

## Lista de testes (escreva primeiro)

```text
- given 10 aggressive threats when updating then temper tendency approaches 10000 by 10% steps
- given a tendency of 7000 sustained over 30 acts across 2 slices when the second slice ends then the trait moves 500
- given a 72-hour gap with the pair apart when ending a slice then intimacy toward the absent loved one rises by 1500
- given the same gap spent together when ending a slice then it does not rise
- given 51 important memories when storing then the least important is dropped
- given a fact retold when rehearsing then its fidelity returns to the speaker's maximum
- given a campaign when creating the next slice then the characters keep their bonds and memorable memories
```

## Critérios de aceite

- [ ] Campanha serializa e reabre igual.
- [ ] Gates do motor verdes.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Tendências também colorem o comportamento dentro da fatia, não só entre fatias.
