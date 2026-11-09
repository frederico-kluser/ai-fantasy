# SOC-03 — Consequências: avaliação emocional, pedidos e mentiras

> **Fase:** F3 — Comportamento social · **Depende de:** [SOC-02](<SOC-02.md>) · **Branch:** `feat/soc-03-appraisal-and-requests`
> **Título do PR:** `feat(engine): apply appraisal, request outcomes and lie detection`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Transformar cada ato interpretado em mudanças de emoção, laço, vontade e percepção, resolver pedidos com faixas de resultado e tratar a detecção de mentiras.

## Leia antes

- [atos de conversa](<../../architecture/dialogue-acts.md>) — §5, §7 e §8
- [modelo de simulação](<../../architecture/simulation-model.md>) — §9

## Escopo

**Inclui:**

- Tabela de avaliação por ato e tom como dados; unidade de efeito; multiplicadores de tom; fatores de traço.
- Deltas de laço com teto de 1500 por ato.
- Efeitos em quem age (culpa ao mentir, alívio de justiça ao se vingar).
- Probabilidade de aceite, sorteio no stream `resolution`, faixas e obrigação de resposta.
- Detecção de mentira e suas consequências.

**Não inclui:**

- Escolha do próximo ato (SOC-04).

## Entregáveis

- `packages/engine/src/acts/appraisal.ts`
- `packages/engine/src/acts/requests.ts`

## Lista de testes (escreva primeiro)

```text
- given a PLAYFUL tease between friends with affection 6000 when appraising then negative effects are halved
- given a SEDUCTIVE praise to someone with low attraction and negative romanticBoldness when appraising then shame rises instead of desire
- given a bond delta above 1500 when applying then it is capped
- given known inputs for every term when computing the acceptance chance then p follows the formula term by term and is clamped to 500..9500
- given u below 20% of p when drawing a band then the result is ENTHUSIASTIC
- given an honest liar when lying then guilt rises by one unit
```

## Critérios de aceite

- [ ] Tabelas como dados, não como ramos.
- [ ] Mutação ≥ 90 no motor.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Toda resposta a pedido vira obrigação para o alvo; quem ignora paga em respeito.
