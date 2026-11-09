# PERF-01 — Núcleo em WebAssembly (só se a medição pedir)

> **Fase:** F7 — Condicional · **Depende de:** [EVAL-01](<EVAL-01.md>) · **Branch:** `perf/perf-01-engine-webassembly`
> **Título do PR:** `perf(engine): move the hot path to WebAssembly`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Se o benchmark mostrar o passo do motor acima de 16 ms com 8 personagens de forma consistente, levar o caminho quente (ou o motor inteiro) para WebAssembly sem mudar a API nem o comportamento.

## Leia antes

- [ADR 0014](<../../architecture/adr/0014-typescript-core-and-local-web.md>) — inteiro
- [estratégia de testes](<../../engineering/testing-strategy.md>) — §11
- [modelo de simulação](<../../architecture/simulation-model.md>) — §15 e §18

## Escopo

**Inclui:**

- Medição antes e depois, na mesma máquina.
- Porte do caminho quente (provavelmente Rust compilado para WebAssembly) atrás da mesma API.
- ADR novo registrando a linguagem escolhida.

**Não inclui:**

- Mudança de regra ou de calibração.

## Entregáveis

- Código do porte
- ADR novo
- resultado do benchmark

## Lista de testes (escreva primeiro)

```text
- Todas as transcrições de ouro e todos os replays dão os mesmos hashes antes e depois.
```

## Critérios de aceite

- [ ] Passo do motor ≤ 16 ms com 8 personagens.
- [ ] Hashes idênticos.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Só comece se a medição justificar; senão, a tarefa fica como está.
