# SOC-01 — Atos: validação, custo, quem ouve e interpretação

> **Fase:** F3 — Comportamento social · **Depende de:** [CORE-04](<CORE-04.md>) · **Branch:** `feat/soc-01-acts-and-hearing`
> **Título do PR:** `feat(engine): resolve acts, hearing and tone interpretation`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Validar e resolver atos: pré-condições, custo em ticks, destinos de movimento, quem ouve e com que perspectiva, leitura do tom por cada ouvinte, obrigações de resposta e criação de fatos e cópias (inclusive `TOLD`).

## Leia antes

- [atos de conversa](<../../architecture/dialogue-acts.md>) — §1 a §6
- [modelo de simulação](<../../architecture/simulation-model.md>) — §8, §10 (obrigações) e §12

## Escopo

**Inclui:**

- Validação de `ActLabel`: alvo presente e audível, `TOUCH` a 1 célula, tópicos aceitos por ato, `targets = []`, campos coerentes com o ato.
- Custo em ticks; atos de movimento só definem o destino, sem travar a conversa.
- Ouvintes por volume e geometria, com perspectivas `DIRECT`, `FRAGMENT` e `SEEN`.
- Leitura errada do tom (fórmula com o laço) e sorteio entre confusões pior e melhor.
- Fatos com ofensor e marca de mentira; cópias com fidelidade inicial; cópias `TOLD` num `TELL` sobre um fato; importância.
- Obrigações de resposta: criação, resposta, ignorar e vencimento em 12 ticks.

**Não inclui:**

- Consequências emocionais e pedidos (SOC-03).
- O deslocamento por tick (CORE-02), chamado no passo da SOC-05.

## Entregáveis

- `packages/engine/src/acts/`
- `packages/engine/src/memory/` (criação de fatos e cópias)

## Lista de testes (escreva primeiro)

```text
- given a TOUCH to someone two cells away when validating then it is rejected
- given a whisper when resolving then a listener at distance 2 gets at most a FRAGMENT
- given an IRONIC tone heard by a distrustful listener when interpreting then the misread chance follows the formula term by term
- given a LEAVE act when resolving then it costs 1 tick and sets the nearest reachable exit as destination
- given a TELL about a fact when a hearer has no copy then the hearer gets a TOLD copy with 80% of the teller's fidelity
- given an ASK to someone when 12 ticks pass without an answer then the obligation is ignored
- given a resolved act when recording then every hearer holds a copy with the right perspective
```

## Critérios de aceite

- [ ] Invariantes 5 e 12 mantidas.
- [ ] Gates do motor verdes.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- A interpretação de cada ouvinte é dele; o fato guarda o ato real.
