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

- Causas com sua intensidade (emoções, atração, mentira, frio, cansaço, dor, alteração) e emissão por tick, reduzida por `selfControl`.
- Notar por canal (visão ou audição), perspicácia, cansaço, alteração e distância.
- Interpretação pelos pesos da seção 7 (base, causa verdadeira, contexto, causas ameaçadoras, laço).
- Efeitos na percepção do momento, `apparentEmotion` e `apparentState`.
- Vale também para o personagem do jogador.

**Não inclui:**

- Efeitos das interpretações nas emoções (SOC-03).

## Entregáveis

- `packages/engine/src/signals/`

## Lista de testes (escreva primeiro)

```text
- given fear at 9000 and selfControl 10000 when emitting then the tremor chance is half of the base
- given an observer tired above the urgent band when noticing then the chance drops by 2000
- given cold weather and an observer with perceptiveness 0 when interpreting a tremor then cold weighs 20000 and fear 10000
- given a blush caused by shame and an observer with trustInOthers -10000 and perceptiveness 0 when interpreting then shame and attraction weigh 10000 and anger 15000
- given an interpreted anger signal when updating perception then perceived hostility rises by 1500 and the apparent emotion is anger at 6000
- given a character telling a lie when emitting then the lying cause has intensity 7000 only during that act
```

## Critérios de aceite

- [ ] Valores sempre na faixa (propriedade).
- [ ] Gates do motor verdes.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Sinais visuais exigem linha de visão; vocais exigem audição.
