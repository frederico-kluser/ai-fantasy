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

A integração documental com `DOC-02` (`docs/planning/gameplay-spec.md`) expôs quatro lacunas
adicionais: relações com valores negativos (`[-10.000, 10.000]`), label persistente `MENTIROSO`,
parâmetros sociais (`registro`, `topic`, `pedido`, `offer_moeda`, `meeting_*`, `gate_id`,
`validity_ticks`, `away_destination`) e IDs de tópico/fato/portão/aresta. Esta revisão v2 as trata
sem reabrir D-01…D-08.

## Decisão

Vamos fixar a identidade como `EntityId(u64)` com três campos explícitos: 16 bits de `kind`, 32 bits
de `index` e 16 bits de `generation`. `kind`, `index` zero e `generation` zero são reservados; o
allocator é único por região e por tipo, escolhe o menor índice livre e aposenta o slot quando a
geração de 16 bits se esgota, em vez de fazer wrap. Cada slot admite 65.535 gerações válidas
(65.534 reciclagens após a primeira colocação). Um ID antigo é detetado pela geração divergente e
nunca é reescrito para o novo ocupante. A largura é justificada pela escala regional de D-07 e pela
rejeição de colisões entre localidades; a localidade não entra nos bits do ID, para que uma entidade
conserve a identidade ao mover-se. Os kinds 6/7 são `GATE`/`EDGE`, com layout geracional aqui e
semântica em CTR-03/GRID-01; `LocalityId` é alias de `LocationId`; `Cell` é alias de `GridPoint`.
`FactId` é o `fact_seq` monotônico (não um `EntityId`); `TopicId` é uma referência tipada
`FACT`/`RUMOR`.

Vamos adotar basis points inteiros **com sinal** (`RelationBp(i16)`, `-10.000..10.000`) para o valor
absoluto das relações e `BasisPoints(i16)` para os deltas; Q16.16 apenas para valores fracionários de
atributos. `i8` percentual é rejeitado porque 20.001 valores não cabem em 256 e 1 bp não é
representável. DOC-02 exige valores negativos em `FRIA`/`DESCONFIANCA` e nas fórmulas, pelo que
`UnitBp(u16)` fica restrito a fidelidade/limiares e não representa relação. Um delta identifica
explicitamente a tripla `(source, target, axis)`: `source` é o ator cujo valor muda, `target` é o
alvo, ambos são `ActorId` distintos, `source` é o speaker ou o listener do fato e `target` existe/vive
no momento da aplicação. Saturação só existe quando a regra ou o schema a declara explicitamente; o
log guarda o delta efetivo com flag, e qualquer outro excesso rejeita o fato inteiro, sem clamp
silencioso.

Vamos usar um wire big-endian, byte-packed, com cabeçalho de 16 bytes (`AFEV`, versão 2, tipo, flags,
comprimento e reserva), registo completo v2 de `193 + 32n` bytes (`177 + 32n` de corpo) para até oito
efeitos, incluindo um bloco `intent_payload` fixo de 99 bytes (3 de cabeçalho + 96 de payload), e uma
projeção compacta de 104 bytes que é apenas um índice. O payload cobre `registro`, `topic`, `pedido`,
`offer_moeda`, `meeting_*`, `gate_id`, `validity_ticks` e `away_destination`; os labels vão até 6
(`LIAR`/`MENTIROSO`) e a moeda tem o efeito `TRANSFER_CURRENCY`. O label persistente vive na secção
canónica `LABELS` (tag 11), com par `(source,target,label,attached_tick)`; o facto correspondente fica
no log externo. O log factual é a única autoridade; a projeção pode ser apagada e reconstruída,
nunca o contrário. A versão 2 rejeita versão, tipo, flags, reserva, payload ou campos desconhecidos;
v1 é legado somente leitura.

Vamos canonicalizar o estado com envelope `AFCS` v2, primitivas big-endian, secções em ordem fixa,
coleções ordenadas por chave, nenhum `String`, `f32`, `HashMap`, relógio ou layout de compilador, e
hash BLAKE3-256 dos bytes exatos. O hash é regional, inclui todas as localidades e exclui câmera,
UI, caches e métricas por contrato explícito. O log factual é autoridade externa ao `WorldState` e
não entra no `state_hash`: `canonical_state`/`state_hash` e `encode_events` são contratos e
autoridades distintas. `RELATIONSHIPS` usa `value_bp i16` assinado; `LABELS` é o estado persistente
do par `(source,target,label)` e entra no `state_hash`; a secção `RUMORS` tem layout canónico de
CTR-01 e semântica de SOC-02/SOC-03; `ITEMS`/`RELATIONSHIPS`/`RUMORS`/`LABELS` validam kind, faixas,
consistência, unicidade e ordenação. O golden será capturado por `CORE-01`; este ADR não afirma
valores de hash.

A especificação completa, os offsets, os erros, os vetores e a rastreabilidade estão no
[contrato CTR-01](<../../planning/contracts/identity-events.md>).

## Consequências

### Positivas

- Identidade histórica estável e deteção explícita de ID obsoleto, sem aliasing silencioso.
- 1 bp, múltiplos itens/transferências, até oito efeitos e o payload social DOC-02 preservados no log.
- Relações assinadas, label `LIAR`/`MENTIROSO` e transferência de moeda representáveis.
- Bytes iguais em Windows e Linux, sem depender de alinhamento, `usize` ou `#[repr]`.
- Replay e hash reproduzíveis com regras de ordem e exclusão declaradas.
- Projeção compacta para leitura rápida sem duplicar a autoridade dos fatos.

### Negativas / custos

- O registo completo v2 é maior do que o exemplo legado de 46 bytes (até 449 bytes); o custo é
  explícito e proporcional aos fatos e parâmetros sociais preservados.
- A implementação precisa de codificação/descodificação manual e de testes de offsets/golden.
- A projeção exige offset, comprimento e hash válidos; uma compactação de armazenamento que mude o
  log obriga a reconstruí-la.
- O allocator regional, a tabela de gerações e o payload fixo tornam-se estado/estrutura adicionais.

### Riscos

- Um consumidor pode tratar a projeção como fato completo e perder deltas/payload; o contrato
  proíbe e a revisão deve verificar.
- Um `kind`/seletor/intent/label novo sem nova versão pode fragmentar o wire; a regra é rejeitar,
  não ignorar.
- A saturação autorizada pode ser confundida com clamp por omissão; o flag e a política explícita
  são a barreira.
- O mapeamento DOC-02 → CONVERSATION_FACT v2 vs. eventos INT-05 precisa de validação de GAME-01/
  SOC-01; o golden só é estável depois desses contratos.
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
- **`UnitBp(u16)` para relações** — não representa valores negativos exigidos por DOC-02;
  rejeitada; fica apenas para fidelidade/limiares.
- **Payload social apenas em evento INT-05** — perderia a associação ao ato social e ao log
  `ConversationFact`; rejeitada em favor de `intent_payload` v2.
- **`RUMORS` como payload opaco de CTR-03** — impediria o hash canónico determinístico de
  CTR-01; rejeitada; layout em CTR-01, semântica em SOC-02/SOC-03.
- **`FactId` como `EntityId` geracional** — misturaria identidade de entidade com sequência de
  fato; rejeitada; `FactId = fact_seq`.
- **`HashMap` como estado** — ordem não determinística; rejeitada.
- **Registo compacto de 46/48 bytes como autoridade** — perde efeitos, identidade geracional e
  proveniência; rejeitada. A projeção de 104 bytes é um índice, não um substituto.
- **Compressão lossy do log** — proibida; só compressão byte-exata e verificada é admissível.
- **Layout `#[repr(packed)]`/cast de memória** — depende de alinhamento e de compilador; rejeitada.

## Critérios de verificação

- Golden de offsets/tamanho: `n = 0..8` produz exatamente `193 + 32n` bytes v2 (`177 + 32n` de
  corpo) e `body_len` correto; v1 legado continua `94 + 32n`.
- `decode_events(encode_events(fatos))` e `decode_canonical(canonical_state(state))` preservam
  ordem, flags, proveniência, payload, valores exatos e idempotência.
- IDs obsoletos, `kind` errado, overflow de índice/geração, truncamento, versão/reserva/flag/payload
  não nulos e `kind`/seletor/intent/label desconhecidos são rejeitados sem efeito parcial.
- Delta de 1 bp, oito transferências, relações assinadas, `LIAR`, `TRANSFER_CURRENCY`, múltiplas
  localidades e labels no limite sobrevivem ao round-trip e ao golden; `TopicId`/`FactId`/`GateId`/
  `EdgeId`, `RUMORS` (tag 8) e `LABELS` (tag 11, incluindo `LIAR`) são validados; `Cell` é aceite
  como alias de `GridPoint` sem segundo tipo no wire.
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
