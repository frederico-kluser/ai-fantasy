# SOC-06 — Personalidade que muda e continuidade entre fatias

> **Fase:** F3 — Comportamento social · **Depende de:** [SOC-05](<SOC-05.md>) · **Branch:** `feat/soc-06-personality-and-continuity`
> **Título do PR:** `feat(engine): evolve personality and carry history across slices`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Fazer os atos moverem tendências, cristalizarem traços e levar a história dos personagens de uma fatia para a outra com as regras de intervalo.

## Leia antes

- [modelo de simulação](<../../architecture/simulation-model.md>) — §12 a §14
- [atos de conversa](<../../architecture/dialogue-acts.md>) — §10

## Escopo

**Inclui:**

- Sinais de traço por ato e tom como dados.
- Tendência com taxa de 10% por ato e traço efetivo com 30% da tendência.
- Cristalização: 30 atos no mesmo sentido em pelo menos 2 fatias movem o traço 500 bp.
- Estado de campanha e `endSlice` com intervalo: corpo, emoções, saudade, vingança, memória e tendências.
- Memórias marcantes persistentes (até 50) e reforço ao falar de novo.

**Não inclui:**

- Telas de campanha (WEB-03).

## Entregáveis

- `packages/engine/src/personality/`
- `packages/engine/src/continuity/`

## Lista de testes (escreva primeiro)

```text
- given 10 aggressive threats when updating then temper tendency approaches 10000 by 10% steps
- given a tendency of 7000 sustained over 30 acts in 2 slices when ending a slice then the trait moves 500
- given a 3-day gap when ending a slice then intimacy toward an absent loved one rises by 1500
- given 51 important memories when storing then the least important is dropped
- given a fact retold when rehearsing then its fidelity returns to the speaker's maximum
```

## Critérios de aceite

- [ ] Campanha serializa e reabre igual.
- [ ] Gates do motor verdes.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Tendências também colorem o comportamento dentro da fatia, não só entre fatias.
