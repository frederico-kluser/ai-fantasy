# ADR 0010 — Identidade geracional e layout de evento versionado

- **Status:** Proposto
- **Data:** 2026-11-08
- **Decisores:** @frederico-kluser
- **Relacionado:** ADR 0002, ADR 0005, ADR 0008, CTR-01, achado L-01

## Contexto

O achado L-01 da [revisão de projeto](<../../planning/project-review.md#L266-L272>) mostrou que o
desenho de dados não podia entrar em código: os IDs oscilavam entre `u32` e geracionais `u64`; a
tabela do evento de conversa somava 46 bytes embora declarasse 42 + 6; os deltas em `i8` percentuais
não representavam 1 bp; e o registo compacto tinha um único item e um único delta de HP para até
oito efeitos. Corrigir a soma de 46 para 48 não resolveria nenhuma dessas perdas.

O núcleo precisa de identidade estável para atores, itens, localidades, estruturas e rumores, de
unidades exatas para replay e de um formato de evento que preserve todos os fatos aceitos sem
depender do layout do compilador. A decisão antecede `CORE-01` e o scaffold; sem ela, cada consumidor
improvisaria um packing incompatível.

## Decisão

Vamos fixar a identidade como `EntityId(u64)` com três campos explícitos: 16 bits de `kind`, 32 bits
de `index` e 16 bits de `generation`. `kind`, `index` zero e `generation` zero são reservados; o
allocator é único por região e por tipo, escolhe o menor índice livre e aposenta o slot quando a
geração de 16 bits se esgota, em vez de fazer wrap. Um ID antigo é detetado pela geração divergente
e nunca é reescrito para o novo ocupante. A largura é justificada pela escala regional de D-07 e
pela rejeição de colisões entre localidades; a localidade não entra nos bits do ID, para que uma
entidade conserve a identidade ao mover-se.

Vamos adotar basis points inteiros (`i16`/`i32`, faixa `-10.000..10.000`) para deltas de relação e
Q16.16 apenas para valores fracionários de atributos. `i8` percentual é rejeitado porque 20.001
valores não cabem em 256 e 1 bp não é representável. Saturação só existe quando a regra ou o schema
a declara explicitamente; o log guarda o delta efetivo com flag, e qualquer outro excesso rejeita o
fato inteiro, sem clamp silencioso.

Vamos usar um wire big-endian, byte-packed, com cabeçalho de 16 bytes (`AFEV`, versão, tipo,
flags, comprimento e reserva), registo completo de `94 + 32n` bytes para até oito efeitos e uma
projeção compacta de 104 bytes que é apenas um índice: guarda identidade, tick, localidade,
`log_offset`, `log_length`, contagens e BLAKE3-256 do registo completo. O log factual é a única
autoridade; a projeção pode ser apagada e reconstruída, nunca o contrário. A versão 1 rejeita
versão, tipo, flags ou reserva desconhecidos, em vez de ignorar bytes.

Vamos canonicalizar o estado com envelope `AFCS`, primitivas big-endian, secções em ordem fixa,
coleções ordenadas por chave, nenhum `String`, `f32`, `HashMap`, relógio ou layout de compilador, e
hash BLAKE3-256 dos bytes exatos. O hash é regional, inclui todas as localidades e exclui câmera,
UI, caches e métricas por contrato explícito. O golden será capturado por `CORE-01`; este ADR não
afirma valores de hash.

A especificação completa, os offsets, os erros, os vetores e a rastreabilidade estão no
[contrato CTR-01](<../../planning/contracts/identity-events.md>).

## Consequências

### Positivas

- Identidade histórica estável e deteção explícita de ID obsoleto, sem aliasing silencioso.
- 1 bp, múltiplos itens/transferências e até oito efeitos preservados no log.
- Bytes iguais em Windows e Linux, sem depender de alinhamento, `usize` ou `#[repr]`.
- Replay e hash reproduzíveis com regras de ordem e exclusão declaradas.
- Projeção compacta para leitura rápida sem duplicar a autoridade dos fatos.

### Negativas / custos

- O registo completo é maior do que o exemplo legado de 46 bytes; o custo é explícito e proporcional
  aos fatos preservados.
- A implementação precisa de codificação/descodificação manual e de testes de offsets/golden.
- A projeção exige offset, comprimento e hash válidos; uma compactação de armazenamento que mude o
  log obriga a reconstruí-la.
- O allocator regional e a tabela de gerações tornam-se estado autoritativo adicional.

### Riscos

- Um consumidor pode tratar a projeção como fato completo e perder deltas; o contrato proíbe e a
  revisão deve verificar.
- Um `kind`/seletor novo sem nova versão pode fragmentar o wire; a regra é rejeitar, não ignorar.
- A saturação autorizada pode ser confundida com clamp por omissão; o flag e a política explícita
  são a barreira.
- Os payloads canónicos de região/agenda/RNG ainda dependem de CTR-02/CTR-03; o golden só é estável
  depois desses contratos.

## Alternativas consideradas

- **`u32` apenas** — não cabe índice, geração e tipo; exigiria tabela lateral e não detetaria ID
  obsoleto pelos bytes. Rejeitada.
- **`u128` ou IDs de 128 bits** — espaço e wire maiores sem necessidade para a escala regional;
  aumentaria o custo de log e hash. Rejeitada nesta fase.
- **IDs por localidade** — impediriam a estabilidade ao mover e criariam colisões entre
  localidades; rejeitada.
- **Floats para relações** — não determinísticos, sujeitos a `NaN`/arredondamento e incompatíveis com
  ADR 0005; rejeitada.
- **`i8` percentual** — perde 1 bp por construção; rejeitada.
- **`HashMap` como estado** — ordem não determinística; rejeitada.
- **Registo compacto de 46/48 bytes como autoridade** — perde efeitos, identidade geracional e
  proveniência; rejeitada. A projeção de 104 bytes é um índice, não um substituto.
- **Compressão lossy do log** — proibida; só compressão byte-exata e verificada é admissível.
- **Layout `#[repr(packed)]`/cast de memória** — depende de alinhamento e de compilador; rejeitada.

## Critérios de verificação

- Golden de offsets/tamanho: `n = 0..8` produz exatamente `94 + 32n` bytes e `body_len` correto.
- `decode_events(encode_events(fatos))` preserva ordem, flags, proveniência e valores exatos.
- IDs obsoletos, `kind` errado, overflow de índice/geração, truncamento, versão/reserva/flag não
  nula e `kind`/seletor desconhecido são rejeitados sem efeito parcial.
- Delta de 1 bp, oito transferências, múltiplas localidades e labels no limite sobrevivem ao
  round-trip e ao golden.
- Projeção com hash/offset/comprimento errado é rejeitada; reconstruí-la a partir do log não altera
  fatos.
- `canonical_state` é idempotente e produz o mesmo hash em Windows e Linux para o mesmo estado;
  câmera/UI/cache/métricas não alteram o hash.
- `xtask check-determinism` não encontra `f32`, `HashMap`, `Instant::now` ou `thread_rng` nos crates
  de simulação, com allowlist justificada.
- O corpus regional inclui interações entre localidades e um portador que atravessa áreas sem
  reinicializar a história.

## Referências

- [Contrato CTR-01 — identidade, unidades e eventos](<../../planning/contracts/identity-events.md>).
- [Revisão de projeto — L-01](<../../planning/project-review.md#L266-L272>).
- [ADR 0002 — Rust 2024 + Flecs ECS](<0002-rust-flecs-deterministic-core.md>).
- [ADR 0005 — contrato de determinismo](<0005-deterministic-simulation-contract.md>).
- [ADR 0008 — tempo por ações](<0008-action-driven-simulation-time.md>).
- [BLAKE3](https://github.com/BLAKE3-team/BLAKE3), acesso em 2026-11-08.
- [Fixed-point arithmetic](https://en.wikipedia.org/wiki/Fixed-point_arithmetic), acesso em
  2026-11-08.
