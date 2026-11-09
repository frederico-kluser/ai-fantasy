# CORE-05 — Geração de elenco e laços

> **Fase:** F2 — Núcleo determinístico · **Depende de:** [CORE-04](<CORE-04.md>) · **Branch:** `feat/core-05-cast-generation`
> **Título do PR:** `feat(engine): generate casts, bonds and history from presets`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Gerar personagens, laços e história a partir dos arquétipos, com a seed do elenco, garantindo coerência, reciprocidade e pelo menos um gancho de tensão, e oferecer a criação à mão com as mesmas peças.

## Leia antes

- [presets](<../../architecture/presets.md>) — §5 a §10
- [modelo de simulação](<../../architecture/simulation-model.md>) — §5, §12 e §15

## Escopo

**Inclui:**

- Personagem a partir do arquétipo: traços nas faixas, pesos e déficits iniciais, dominantes (escolhas do SOM primeiro, até 3), aptidões, linhas de base, associações e estado do dia.
- Laços pelo arquétipo (com direção), variação, reciprocidade de rótulos e coerência do grafo (um cônjuge e um parceiro, sem ciclo de parentesco, família transitiva).
- Acontecimentos de história como fatos anteriores, com efeitos, deslocamentos de base, ofensor, segredo e memórias marcantes.
- Gancho de tensão com a definição de tensão (presets §10, passo 6).
- Posições iniciais distintas (as sugeridas do gabarito; depois a célula livre de menor índice).
- API de criação manual que valida as mesmas peças.

**Não inclui:**

- Mapeamento da premissa pelo SOM (AI-04).

## Entregáveis

- `packages/engine/src/generation/`

## Lista de testes (escreva primeiro)

```text
- given the same cast seed when generating twice then the casts are identical
- given a parent_child bond with the second as parent when generating then the first holds the CHILD label
- given two spouse bonds for one character when validating then generation rejects the graph
- given two children of the same parent when generating then they become siblings
- given SOM picks for two dominant drives when generating then the dominants are those picks followed by the archetype's, up to 3
- given acquaintances without tension when generating then a tension event is added to the pair with the lowest ids
- given a secret event when generating then only its author holds a copy of the fact
- given a manual character with an unknown archetype when validating then it is rejected
```

## Critérios de aceite

- [ ] Geração determinística pela seed do elenco, separada da seed da cena.
- [ ] Gates do motor verdes.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Sorteios só no stream `generation`.
