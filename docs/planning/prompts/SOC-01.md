# SOC-01 — Atos: validação, custo, quem ouve e interpretação

> **Fase:** F3 — Comportamento social · **Depende de:** [CORE-04](<CORE-04.md>) · **Branch:** `feat/soc-01-acts-and-hearing`
> **Título do PR:** `feat(engine): resolve acts, hearing and tone interpretation`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Validar e resolver atos: pré-condições, custo em ticks, quem ouve e com que perspectiva, leitura do tom por cada ouvinte, atos de movimento e criação de fatos e cópias.

## Leia antes

- [atos de conversa](<../../architecture/dialogue-acts.md>) — §1 a §6
- [modelo de simulação](<../../architecture/simulation-model.md>) — §8 e §12

## Escopo

**Inclui:**

- Validação de `ActLabel` (alvo presente e audível, `TOUCH` só a 1 célula, campos coerentes com o ato).
- Custo em ticks por ato; movimento com caminho e custo.
- Ouvintes por volume e geometria, com perspectivas `DIRECT`, `FRAGMENT` e `SEEN`.
- Chance de leitura errada do tom e escolha da confusão conforme laço e traços.
- Fatos e cópias com perspectiva e fidelidade; mentira marcada.

**Não inclui:**

- Consequências emocionais (SOC-03).

## Entregáveis

- `packages/engine/src/acts/`
- `packages/engine/src/memory/`

## Lista de testes (escreva primeiro)

```text
- given a TOUCH to someone two cells away when validating then it is rejected
- given a whisper when resolving then a listener at distance 2 gets at most a FRAGMENT
- given an IRONIC tone heard by a distrustful listener when interpreting then the misread chance follows the formula
- given a MOVE across rough terrain when resolving then the tick cost counts 2 per rough cell
- given a resolved act when recording then every hearer holds a copy with the right perspective
```

## Critérios de aceite

- [ ] Invariante 5 mantida.
- [ ] Gates do motor verdes.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- A interpretação de cada ouvinte é dele; o fato guarda o ato real.
