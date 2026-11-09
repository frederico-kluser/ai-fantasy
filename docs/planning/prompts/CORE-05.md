# CORE-05 — Geração de elenco e laços

> **Fase:** F2 — Núcleo determinístico · **Depende de:** [CORE-03](<CORE-03.md>) · **Branch:** `feat/core-05-cast-generation`
> **Título do PR:** `feat(engine): generate casts, bonds and history from presets`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Gerar personagens, laços e história a partir dos arquétipos, com a seed do elenco, garantindo coerência, reciprocidade e pelo menos um gancho de tensão, e oferecer a criação à mão com as mesmas peças.

## Leia antes

- [presets](<../../architecture/presets.md>) — §5 a §10
- [modelo de simulação](<../../architecture/simulation-model.md>) — §5.3 a §5.7, §12 e §15

## Escopo

**Inclui:**

- Personagem a partir do arquétipo: traços nas faixas, pesos de vontades e dominantes, aptidões, associações e estado do dia.
- Laços a partir do arquétipo de laço, com variação, reciprocidade de rótulos e coerência do grafo (um só cônjuge, família transitiva).
- Acontecimentos de história aplicados como fatos anteriores, com efeitos e memórias marcantes.
- Regra do gancho de tensão (presets §10, passo 5).
- Posições iniciais na grade.
- API de criação manual que valida as mesmas peças.

**Não inclui:**

- Mapeamento da premissa pelo SOM (AI-04).

## Entregáveis

- `packages/engine/src/generation/`

## Lista de testes (escreva primeiro)

```text
- given the same cast seed when generating twice then the casts are identical
- given a parent_child bond when generating then the child has the CHILD label toward the parent
- given two spouse bonds for one character when validating then generation rejects the graph
- given acquaintances without tension when generating then a tension event is added
- given a manual character with an unknown archetype when validating then it is rejected
- given a history event when generating then both characters hold a copy of the fact with the right perspective
```

## Critérios de aceite

- [ ] Geração determinística pela seed do elenco, separada da seed da cena.
- [ ] Gates do motor verdes.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Sorteios só no stream `generation`.
