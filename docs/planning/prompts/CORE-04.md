# CORE-04 — Status em camadas, ameaça e presença

> **Fase:** F2 — Núcleo determinístico · **Depende de:** [CORE-02](<CORE-02.md>), [CORE-03](<CORE-03.md>) · **Branch:** `feat/core-04-layered-status`
> **Título do PR:** `feat(engine): add layered status, threat and presence rules`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Modelar o personagem e atualizar, a cada tick, corpo, emoções e vontades com a precedência de Maslow, calculando a ameaça com lugar, clima, horário, associações e presença dos outros.

## Leia antes

- [modelo de simulação](<../../architecture/simulation-model.md>) — §4 a §6, §17 e §18 (invariantes 2, 4 e 6)

## Escopo

**Inclui:**

- Personagem com identidade de apresentação fora do estado do hash.
- Corpo: taxas por tick, modificadores e faixas (incômodo, urgente, crítico); térmico aproximando-se do alvo.
- Emoções: linha de base pelos traços, decaimento por tick, regra do tédio.
- Vontades: déficits, pesos, dominantes, dirigidas, alívio físico calculado e precedência de Maslow.
- Laços com oito eixos e rótulos; associações.
- Ameaça e presença pela fórmula da seção 6, incluindo o exemplo do pai.
- Função de atualização de um tick para todos os personagens, em ordem de id.

**Não inclui:**

- Sinais e percepção (SOC-02); escolha de atos (SOC-04).

## Entregáveis

- `packages/engine/src/character/`
- `packages/engine/src/context/`

## Lista de testes (escreva primeiro)

```text
- given a resting character when 720 ticks pass then fatigue rises by 1440 in the morning
- given the late night phase when ticks pass then fatigue grows 1.5 times faster
- given anger at 8000 and baseline 500 when 69 ticks pass then anger is about halfway to the baseline
- given physical relief deficit 7500 when computing weights then higher levels are halved
- given a son with trust 8000 and affection 9000 toward his father when the father is adjacent then threat drops by 2125, and by 425 when he is 12 cells away
- given a fear-of-forest association in a forest when ticking then threat rises and fear grows 20 per tick
```

## Critérios de aceite

- [ ] Invariantes 2, 4 e 6 como testes de propriedade.
- [ ] Gates do motor verdes.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Toda constante vem da tabela da seção 17; nada de número mágico solto.
