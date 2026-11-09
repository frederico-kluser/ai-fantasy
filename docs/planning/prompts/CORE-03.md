# CORE-03 — Catálogos de presets v0

> **Fase:** F2 — Núcleo determinístico · **Depende de:** [CORE-01](<CORE-01.md>) · **Branch:** `feat/core-03-presets-v0`
> **Título do PR:** `feat(engine): add v0 preset catalogs with schema validation`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Transformar todos os catálogos das especificações em dados tipados, validados na carga, com `PRESETS_VERSION` única.

## Leia antes

- [presets](<../../architecture/presets.md>) — inteiro
- [atos de conversa](<../../architecture/dialogue-acts.md>) — §2 a §4
- [modelo de simulação](<../../architecture/simulation-model.md>) — §5 e §7

## Escopo

**Inclui:**

- Lugares (10, com gabaritos de grade), climas (8), luz por fase, arquétipos de personagem (16), arquétipos de laço (17), acontecimentos de história (21), tags de associação (10) e estados do dia (7).
- Listas do modelo de simulação como dados: necessidades do corpo, emoções, vontades com nível de Maslow, eixos e rótulos de laço, traços, aptidões e sinais com causas.
- Atos (20), tons (6) com ambiguidade e confusões típicas, tipos de tópico (8) e objetos de pedido.
- Validação de esquema na carga, com erro claro apontando o preset inválido.

**Não inclui:**

- Regras que usam os presets (outras tarefas).

## Entregáveis

- `packages/engine/src/presets/` com dados e esquemas

## Lista de testes (escreva primeiro)

```text
- given a preset with an unknown trait id when loading then validation fails naming the preset
- given all catalogs when loading then every id is unique within its catalog
- given the bond archetypes when loading then every family and role label has its reciprocal
- given every grid template when validating then it has at least one EXIT and only known cell types
- given the catalogs when counting then they match the counts in the specification
```

## Critérios de aceite

- [ ] As tabelas dos documentos e os dados batem (se mudar um, mude o outro no mesmo PR).
- [ ] Gates do motor verdes.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Ids em inglês, como no modelo de simulação; nomes de exibição em português ficam nos dados.
