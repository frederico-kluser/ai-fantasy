# EVAL-02 — Cenas douradas

> **Fase:** F6 — Validação · **Depende de:** [EVAL-01](<EVAL-01.md>), [AI-04](<AI-04.md>), [SOC-06](<SOC-06.md>) · **Branch:** `test/eval-02-golden-scenes`
> **Título do PR:** `test(eval): add the 20 golden scenes in 5 settings`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Escrever as 20 cenas douradas em 5 cenários, cobrindo as mecânicas centrais, com transcrições simbólicas de ouro e um executor para rodá-las com IA falsa e com IA real.

## Leia antes

- [avaliação](<../../engineering/evaluation.md>) — §4
- [estratégia de testes](<../../engineering/testing-strategy.md>) — §6

## Escopo

**Inclui:**

- Configurações em `eval/scenes/` com premissa, presets, elenco, laços, história e seeds.
- Cobertura das mecânicas listadas na avaliação (paquera, provocação, dívida, segredo, saudade, medo do lugar, presença protetora, NPCs entre si, saída por necessidade do corpo).
- Executor com IA falsa (gera as transcrições de ouro) e com IA real (manual, grava sessões).
- Uma linha de documentação por cena.

**Não inclui:**

- A rodada de validação (EVAL-03).

## Entregáveis

- `eval/scenes/`
- `eval/README.md`
- testes de ouro das cenas

## Lista de testes (escreva primeiro)

```text
- given every scene config when validating then it loads
- given each scene with fake AI when running then its symbolic transcript matches the golden snapshot
- given the mechanics list when checking coverage then each mechanic has at least one scene
```

## Critérios de aceite

- [ ] 20 cenas, 5 cenários, todas as mecânicas cobertas.
- [ ] Ouro das cenas no CI.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Pelo menos uma cena atravessa duas fatias para testar a continuidade.
