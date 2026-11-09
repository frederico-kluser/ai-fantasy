# CORE-01 — Domínio, aritmética em bp, sorteio e registro

> **Fase:** F2 — Núcleo determinístico · **Depende de:** [FND-01](<FND-01.md>) · **Branch:** `feat/core-01-domain-and-rng`
> **Título do PR:** `feat(engine): add domain types, bp math and seeded draws`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Criar a base do motor: tipos e ids, aritmética inteira em bp com divisão truncada, serialização canônica com hash de estado e o gerador de números com streams, sorteio sem viés, registro de sorteios, forçar caminho e modo "mais provável".

## Leia antes

- [modelo de simulação](<../../architecture/simulation-model.md>) — §1, §2, §15, §17 e §18 (invariantes 1 e 8)
- [ADR 0017](<../../architecture/adr/0017-determinism-replay-and-forced-paths.md>) — inteiro
- [regras de desenvolvimento](<../../engineering/development-rules.md>) — §4 e §5

## Escopo

**Inclui:**

- `domain/`: tipos `Bp`, `BipolarBp`, ids marcados, `div` (truncada em direção a zero), `clampInt`, `mulBp`, `approach`, `relax` e o tipo `Result`.
- `rng/`: `sfc32` só com operações inteiras, semeado por `splitmix32` a partir de `hash32(seed, nome)` (FNV-1a de 32 bits sobre `"<seed>:<nome>"`), descartando as 12 primeiras saídas; `draw(stream, bound)` com rejeição e `bound ≤ 2^31`; `drawChance(p)` e `drawWeighted(pesos)` devolvendo resultado e metadados.
- Registro de sorteios: sequência, tick, stream, finalidade, limite, valor, probabilidade e resultado.
- Forçar caminho por seletor (sequência ou finalidade + alvo) e modo `MOST_LIKELY` (empate: menor índice).
- `session/`: serialização canônica (chaves ordenadas, só inteiros e strings) e hash FNV-1a de 64 bits com `BigInt`, em 16 dígitos hexadecimais.

**Não inclui:**

- Regras de personagem, tempo ou espaço.

## Entregáveis

- `packages/engine/src/domain/`
- `packages/engine/src/rng/`
- `packages/engine/src/session/hash.ts`

## Lista de testes (escreva primeiro)

```text
- given bp values at the limits when applying mulBp and clamp then results stay within range
- given a negative numerator when dividing then div truncates toward zero
- given the reference strings when hashing with FNV-1a 32 and 64 then the results match the published vectors
- given seed 1 and seed 42 when drawing the first 10 numbers then they match the recorded vectors
- given the same seed when drawing from two streams then the sequences differ
- given a bound that does not divide 2^32 when drawing many times then no value reaches the bound and rejection is used
- given a forced draw selector when drawing then only that draw takes the forced outcome
- given MOST_LIKELY mode when drawing weighted options then the heaviest option wins and ties go to the lowest index
- given two objects with keys in different orders when hashing then the hashes are equal
```

## Critérios de aceite

- [ ] Cobertura do motor ≥ 95/90 e mutação ≥ 90 nos arquivos novos.
- [ ] Vetores conhecidos do PRNG gravados no teste.
- [ ] Nenhuma API proibida no motor.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- `Math.imul` e `>>> 0` são seus amigos; nunca deixe um número quebrado entrar no estado.
