# ADR 0005 — Contrato de determinismo da simulação

- **Status:** Aceite
- **Data:** 2026-11-08
- **Decisores:** @frederico-kluser
- **Relacionado:** ADR 0002, ADR 0006

## Contexto

“Determinístico” é fácil de afirmar e difícil de manter. Sem um contrato explícito, o
primeiro `HashMap`, `f32`, `Instant::now()` ou sistema paralelo reintroduz
não-determinismo, e os testes de replay/golden passam a ser instáveis. Precisamos de uma
definição operacional que o código e o CI possam impor.

## Decisão

A simulação é uma máquina de estados:

```text
step: (WorldState, Command, SimContext) -> (WorldState, Vec<DomainEvent>, StepStats)
```

com as seguintes regras:

1. **Tempo** — `Tick(u64)` é a única noção de tempo do núcleo. Relógio de parede e
   `Instant` só existem em adaptadores de UI/log, nunca em decisões.
2. **Aleatoriedade** — `RngSource` injetado (ChaCha20Rng), com *streams* separadas por
   domínio (`combat`, `social`, `rumor`, `spawn`) derivadas de `seed` + hash do nome. O
   consumo é feito numa ordem fixa.
3. **Aritmética** — estado autoritativo usa inteiros e ponto fixo (`Q16.16`/basis points).
   `f32`/`f64` só em probabilidades de modelo, convertidas na fronteira com arredondamento
   definido. Nada de `NaN`/`Inf` no estado.
4. **Ordem** — sistemas têm ordem topológica declarada; IDs são geracionais e estáveis;
   iteração de queries é ordenada por `EntityId` quando a ordem afeta o resultado. Nunca
   depender da ordem de `HashMap`/`HashSet`.
5. **Paralelismo** — o tick é single-threaded por padrão. Sistemas paralelos só read-only e
   com redução determinística; qualquer mudança exige teste de hash e aprovação em review.
6. **I/O** — o núcleo não lê ficheiros, rede, ambiente ou relógio. Tudo entra por
   `SimContext`/portas.
7. **Canonicalização** — o estado é serializado com chaves ordenadas, coleções ordenadas,
   formatação fixa e sem campos voláteis. O hash é BLAKE3 dessa serialização.
8. **Replay** — `seed` + log de comandos reproduz o estado. O log é versionado e testado.
9. **Compatibilidade** — mudanças de formato exigem migração e *golden* novo; nunca
   “quebrar” silenciosamente um save antigo.
10. **Prova** — todo PR que toque no core corre o teste de determinismo: 100 execuções com
    o mesmo seed e o mesmo hash, em plataformas diferentes quando possível.

## Consequências

### Positivas

- Bugs reproduzíveis: um save + seed + log basta.
- Golden tests estáveis, sem *flakes*.
- Balanceamento e auditoria confiáveis.
- Base para *speedrun*, replay e depuração.

### Negativas / custos

- Menos liberdade para usar `f32` e estruturas não ordenadas no estado.
- Performance single-threaded inicialmente menor; paralelismo exige cuidado.
- Ponto fixo obriga a conversões e testes de arredondamento.
- O contrato precisa de ser ensinado a cada novo contribuidor.

## Alternativas consideradas

- **“Determinístico na prática”** (confiar em floats e ordem de hash): rejeitado; já
  falhou em projetos de simulação.
- **Lockstep multithread desde o início**: rejeitado; complexidade prematura.
- **ECS com ordem de iteração implícita**: rejeitado; o Flecs pode variar com arquétipos e
  criação de entidades; ordenamos onde importa.

## Critérios de verificação

- Teste `given_same_seed_when_run_100_times_then_same_hash`.
- Teste `given_command_log_when_replay_then_state_equals_live`.
- `xtask check-determinism` procura `HashMap`, `Instant::now`, `rand::thread_rng`, `f32`
  em crates de simulação (com *allowlist* justificada).
- Golden tests comparam JSON canónico, não `Debug`.
- CI corre o mesmo cenário em Linux e Windows e compara o hash.

## Referências

- [BLAKE3](https://github.com/BLAKE3-team/BLAKE3)
- [rand_chacha](https://docs.rs/rand_chacha/latest/rand_chacha/)
- [Fixed-point arithmetic](https://en.wikipedia.org/wiki/Fixed-point_arithmetic)
- [Flecs — determinism discussion](https://github.com/SanderMertens/flecs/discussions)
  (verificar a versão usada; a ordenação é responsabilidade nossa).
