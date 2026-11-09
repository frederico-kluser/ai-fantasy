# SOC-02 — Sinais e percepção do momento

> **Fase:** F3 — Comportamento social · **Depende de:** [SOC-01](<SOC-01.md>) · **Branch:** `feat/soc-02-signals-and-perception`
> **Título do PR:** `feat(engine): emit signals and update momentary perception`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Fazer o estado de cada personagem transparecer em sinais, que os outros notam e interpretam (às vezes errado), atualizando a percepção do momento.

## Leia antes

- [modelo de simulação](<../../architecture/simulation-model.md>) — §5.5 e §7

## Escopo

**Inclui:**

- Emissão por causa e intensidade, reduzida por `selfControl`.
- Notar por canal (visão ou audição), perspicácia, cansaço, alteração e distância.
- Interpretação por causas ponderadas pelo contexto, pelo laço e por `trustInOthers`.
- Percepção do momento atualizada e relaxando 2% por tick para a prévia do laço.
- Vale também para o personagem do jogador.

**Não inclui:**

- Efeitos das interpretações nas emoções (SOC-03).

## Entregáveis

- `packages/engine/src/signals/`

## Lista de testes (escreva primeiro)

```text
- given fear at 9000 and selfControl 10000 when emitting then the tremor chance is half of the base
- given an observer tired above the urgent band when noticing then the chance drops by 2000
- given cold weather when interpreting a tremor then cold is weighed above fear
- given a distrustful observer when interpreting an ambiguous signal then threatening causes weigh more
- given no new signals when ticking then perceived threat relaxes toward the fear axis
```

## Critérios de aceite

- [ ] Valores sempre na faixa (propriedade).
- [ ] Gates do motor verdes.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Sinais visuais exigem linha de visão; vocais exigem audição.
