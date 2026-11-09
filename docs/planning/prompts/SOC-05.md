# SOC-05 — Passo do motor, sessão e replay

> **Fase:** F3 — Comportamento social · **Depende de:** [SOC-04](<SOC-04.md>) · **Branch:** `feat/soc-05-scene-runner-and-replay`
> **Título do PR:** `feat(engine): expose scene API, session log and exact replay`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Expor a API pública da cena (`createScene`, `step`, entradas e eventos), gravar o registro da sessão, reproduzir sessões com conferência de hash, ramificar e medir o passo do motor.

## Leia antes

- [arquitetura](<../../architecture/overview.md>) — §3, §8 e §9
- [modelo de simulação](<../../architecture/simulation-model.md>) — §15 e §16
- [estratégia de testes](<../../engineering/testing-strategy.md>) — §6, §7 e §11

## Escopo

**Inclui:**

- Ordem do passo exatamente como a seção 16.
- Entradas `PLAYER_ACT`, `TAKE_TURN`, `SET_CONTROL`, `FORCE_DRAW` e `SET_DRAW_MODE`.
- Eventos, incluindo `RenderRequested` com os dados simbólicos para o pacote de encenação.
- Registro JSONL com cabeçalho (versões, seeds, cena) e entradas, sorteios, eventos e chamadas de IA.
- Replay que confere o hash a cada passo; ramificação a partir de qualquer passo.
- Benchmark com 8 personagens e infraestrutura de transcrições de ouro.

**Não inclui:**

- Personalidade e continuidade (SOC-06).

## Entregáveis

- `packages/engine/src/scene/`
- `packages/engine/src/session/`
- `packages/engine/bench/`
- `packages/engine/test/replay/fixtures/`

## Lista de testes (escreva primeiro)

```text
- given a recorded session when replaying then every step hash matches
- given a forced draw input when replaying then the same divergent session is reproduced
- given a fork at step 10 when stepping with a different input then the fork diverges and the original stays intact
- given a malformed log line when loading then it is rejected with the line number
- given 8 characters when benchmarking then the step time is reported
```

## Critérios de aceite

- [ ] Invariantes 1, 8 e 10 como testes.
- [ ] Benchmark publicado no resumo do PR.
- [ ] Gates do motor verdes.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Texto livre nunca entra no estado nem no hash.
