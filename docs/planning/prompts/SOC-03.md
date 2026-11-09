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
- [modelo de simulação](<../../architecture/simulation-model.md>) — §9 e §11 (interrupção)

## Escopo

**Inclui:**

- Tabela de avaliação (7.1), multiplicadores do tom e regra de `SEDUCTIVE` (7.2), fatores de traço, surpresa, efeitos em quem agiu (7.3) e em testemunhas (7.4), como dados.
- Deltas de laço em meias unidades, com teto de 1500 por eixo por ato; atualização da percepção pelo ato.
- Pedidos: probabilidade de aceite com sinceridade percebida e ajustes de vontade, faixas, resposta fixada para alvo em `AUTO`, faixa registrada para alvo em `MANUAL`, efeitos da resposta (8.3).
- Mentiras: detecção, crença, cópias falsas e mentira descoberta.
- Efeitos da interrupção.
- Ofensor de cada fato (pela valência do tom real) e importância das cópias a partir dos deltas.
- Linhas de resposta (`ACCEPT` por faixa, `REFUSE` a pedido, pergunta e acusação), ciúme e a regra padrão (sem linha, sem efeito).
- Versão falsa das mentiras (outro ofensor ou negação) e descoberta de mentira sem fato pelo sinal `lying`.

**Não inclui:**

- Escolha do próximo ato (SOC-04).

## Entregáveis

- `packages/engine/src/acts/appraisal.ts`
- `packages/engine/src/acts/requests.ts`

## Lista de testes (escreva primeiro)

```text
- given a PLAYFUL accusation between friends with affection 6000 when appraising then negative effects are halved
- given a SEDUCTIVE praise to someone with low attraction and negative romanticBoldness when appraising then shame rises instead of desire
- given a bond delta above 1500 when applying then it is capped
- given known inputs for every term when computing the acceptance chance then p follows the formula term by term and is clamped to 500..9500
- given u below mulBp(p, 2000) when drawing a band then the result is ENTHUSIASTIC and the fixed reply is ACCEPT in WARM
- given a request to the player in MANUAL when resolving then no band is drawn
- given an honest liar when lying then guilt rises by one unit times the guilt factor
- given a discovered lie when applying then trust drops by 1500 and not more
- given a REFUSE to a question when appraising then the asker gets anger +1, trust -1 and curiosity +1
- given a believed lie that blames Z when recording then the listener's copy names Z as the offender and is marked false
- given a SEDUCTIVE praise from Z to Y seen by Y's spouse when appraising then the spouse's jealousy rises by 2 units
```

## Critérios de aceite

- [ ] Tabelas como dados, não como ramos.
- [ ] Mutação ≥ 90 no motor.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Toda tabela é dado, não ramo de código.
- A resposta de um alvo em `AUTO` a um pedido fica fixada pela faixa; ele só escolhe entre ela e ignorar.
