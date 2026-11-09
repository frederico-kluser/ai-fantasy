# CORE-04 — Status em camadas, ameaça, presença e modelo de memória

> **Fase:** F2 — Núcleo determinístico · **Depende de:** [CORE-02](<CORE-02.md>), [CORE-03](<CORE-03.md>) · **Branch:** `feat/core-04-layered-status`
> **Título do PR:** `feat(engine): add layered status, threat and presence rules`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Modelar o personagem e atualizar, a cada tick, corpo, emoções e vontades com a precedência de Maslow, calculando a ameaça com lugar, clima, horário, associações, presença e percepção dos outros; definir a percepção do momento e o modelo de fatos e cópias.

## Leia antes

- [modelo de simulação](<../../architecture/simulation-model.md>) — §4 a §6, §12 (modelo de dados), §16 (passo 7), §17 e §18 (invariantes 2, 4 e 6)
- [presets](<../../architecture/presets.md>) — §5 e §9 (valores iniciais)

## Escopo

**Inclui:**

- Personagem com identidade de apresentação fora do estado do hash.
- Corpo: taxas por tick, modificadores inteiros e faixas; alvo térmico pela célula coberta ou descoberta.
- Emoções: linhas de base pelas fórmulas da seção 5.2, decaimento antes dos ganhos do tick, tédio sem decaimento com ganhos e alívios.
- Vontades: déficits, pesos, dominantes, dirigidas, regras por tick da tabela 5.3 e precedência de Maslow.
- Laços com os oito eixos (`fearOf`, `closeness`…) e rótulos; associações e tags presentes (`storm`, `dark`).
- Ameaça e presença pela fórmula da seção 6, com `perceivedThreat`, incluindo o exemplo do pai.
- Percepção do momento: campos, prévias e `relax` (a atualização por sinais é da SOC-02).
- Modelo de memória: fatos (com ofensor e marca de mentira), cópias, perspectivas e fidelidade inicial (a criação a partir de atos é da SOC-01).
- Atualização de um tick para todos os personagens, na sub-ordem da seção 16 (corpo, emoções, ameaça e vontades).

**Não inclui:**

- Sinais e interpretação (SOC-02).
- Atos, consequências e criação de fatos (SOC-01, SOC-03).
- Escolha de atos (SOC-04).

## Entregáveis

- `packages/engine/src/character/`
- `packages/engine/src/context/`
- `packages/engine/src/memory/` (modelo de dados)

## Lista de testes (escreva primeiro)

```text
- given a resting character in the morning when 720 ticks pass then fatigue rises by 1440
- given the late night phase when a tick passes then fatigue rises by 3
- given anger 8000 and baseline 500 when 69 ticks pass then anger is 4223
- given a fear-of-forest association in a forest and fear at baseline 0 when 10 ticks pass then fear is 187 (decay before gain)
- given boredom 3000 and nothing interesting when 40 ticks pass then boredom is 4000
- given physical relief deficit 7500 and lower safety deficits when computing weights then level 3 to 5 weights are halved
- given a son with trust 8000, affection 9000 and no fear toward his father when the father is adjacent then threat drops by 2125, and by 425 when he is 12 cells away
- given a character on an uncovered cell in snow when ticking then the thermal target is the full weather temperature; on a covered cell it is a quarter of it
- given perceived threat 6000 with prior 0 and no updates when 35 ticks pass then it is 2947
```

## Critérios de aceite

- [ ] Invariantes 2, 4 e 6 como testes de propriedade.
- [ ] Gates do motor verdes.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Toda constante vem da tabela da seção 17; nada de número mágico solto.
- Os eixos de laço `fearOf` e `closeness` não se confundem com a emoção `fear` nem com a vontade `intimacy`.
