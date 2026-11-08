# ADR 0011 — Autoridade durável de save e atividade regional explícita

- **Status:** Proposto — decisão estrutural registada; contrato técnico em revisão
- **Data:** 2026-11-08
- **Decisores:** @frederico-kluser
- **Relacionado:** [ADR 0005](<0005-deterministic-simulation-contract.md>),
  [ADR 0008](<0008-action-driven-simulation-time.md>),
  [contrato CTR-02](<../../planning/contracts/time-replay-save.md>),
  [DOC-02](<../../planning/gameplay-spec.md>)
- **Implementação:** não iniciada; este ADR não autoriza scaffold ou código

## Contexto

O [CTR-02](<../../planning/contracts/time-replay-save.md>) fecha a fronteira determinística de
tempo por ações, agenda, RNG, log de replay e save. Duas escolhas não cabem num detalhe de
contrato: **onde vive a autoridade durável** e **como as áreas da região permanecem ativas**.

O save precisa sobreviver a crash entre o cálculo do efeito e o ACK ao jogador. Sem uma autoridade
explícita, três falhas são prováveis: ACK antes do durável (efeito fantasma depois do restart),
snapshot e índice discordando sem deteção, e backup que renomeia `-wal`/`-shm` de um banco aberto.
O [ADR 0005](<0005-deterministic-simulation-contract.md>) exige determinismo, mas não define
durabilidade; o [ADR 0008](<0008-action-driven-simulation-time.md>) exige que a região não congele
por foco, mas não define o mecanismo.

O DOC-02 §7.2 e a decisão D-07 já determinam que todas as localidades processam agenda em todos os
pulsos, inclusive fora do foco, sem LOD, hibernação ou congelamento por câmera. Falta transformar
essa intenção em regra verificável que impeça uma implementação de escolher atividade por viewport.
O [CTR-02](<../../planning/contracts/time-replay-save.md>) usa `SaveStore`, `EventSink` e a secção
`AGENDA`; `STORE-01`, `STORE-02` e `APP-01` dependem desta decisão para começar.

A fronteira da região é do `CTR-03` (`docs/planning/contracts/region-perception-overlay.md`, worktree
`ctr-03`), não deste ADR nem do CTR-02: o payload `REGION` contém `generator_version`, `flags`,
`seed u64`, bounds e arestas; `RegionId` e `tick` vêm do envelope `AFCS` do CTR-01; `spec_digest` é
insumo da derivação de `RegionId`, não campo de estado. O CTR-02 referencia a seed `u64`, o
`RegionId` do envelope e a derivação de chave; a dependência fica registada como `P-09`.

## Decisão

Vamos adotar uma autoridade durável **dupla e verificada**, um protocolo de commit com ACK posterior
ao durável e uma política de atividade regional única e explícita.

1. **Autoridade dupla.** O snapshot AIFS é a autoridade dos bytes canónicos do estado de uma
   revisão; o catálogo SQLite em WAL é a autoridade da ordem (revisão corrente, cadeia de entradas
   `AFRL`, recibos e metadados). Uma revisão só é durável quando o arquivo AIFS existe com o
   `state_hash` esperado **e** o catálogo tem a linha correspondente com o mesmo hash, revisão e
   `entry_seq`. Nenhum dos dois, isoladamente, autoriza ACK. O load valida também o cabeçalho AIFS
   (`revision`, `entry_seq`) e o nome `r<revision>-<hash>.aifs` contra a linha do catálogo; qualquer
   divergência é `DurabilityInconsistency`/`HashMismatch`, nunca load parcial.
2. **Protocolo de commit.** Escrever temporário no mesmo diretório, verificar hash, publicar com
   semântica no-clobber, `fsync` do arquivo e do diretório, abrir transação `BEGIN IMMEDIATE`,
   inserir revisão, entrada de log, recibo no índice durável e atualizar `head` por
   compare-and-swap com `synchronous = FULL`, considerando o retorno do `COMMIT` como o ponto de
   durabilidade. Os quatro registros entram na mesma transação; publicação parcial é erro e não é
   promovida a `head`.
3. **ACK depois do durável.** `ActionReceipt` só afirma `Acked { revision, state_hash, entry_seq }`
   depois do `CommitReceipt`, e o recibo é gravado na mesma transação da revisão/entrada.
   Rejeições, cancelamentos, obsolescências, timeouts e dry-runs também são gravados antes do
   recibo, como entradas não publicantes com recibo próprio. Retry é idempotente pela `intent_id`;
   nunca cobra tick ou RNG adicionais nem duplica efeito.
4. **Recuperação explícita.** No arranque, verificar catálogo, `head`, arquivo AIFS, cadeia de log e
   hash. Se a cabeça falhar, cair para a revisão anterior íntegra com
   `RecoveredToPreviousRevision` e informar o jogador de que os efeitos ignorados não são duráveis;
   se nenhuma revisão for íntegra, `NoDurableState`. Divergência entre AIFS e catálogo é
   `DurabilityInconsistency` e bloqueia a sessão; nunca se “repara” por inferência. Save de versão
   futura é preservado e recusado, nunca reescrito.
5. **Backup e rotação seguros.** Backup pela API de backup online do SQLite (ou `VACUUM INTO`) para
   arquivo novo, com `wal_checkpoint(TRUNCATE)` quando permitido; nunca renomear ou copiar
   `-wal`/`-shm` de banco aberto. Manter as três cópias verificadas mais recentes, verificar por
   rehash o manifesto antes de apagar e nunca apagar a única cópia verificada da cabeça.
6. **Atividade regional única.** Nesta versão existe um único nível, `REGIONAL_ATIVA`, aplicado a
   todas as localidades. Foco, câmera, viewport, `z` exibido, painel ou cache de NLG não são
   entradas da agenda, do RNG, do hash ou de qualquer decisão. Todas as localidades processam todos
   os pulsos; atores em trânsito e áreas fora do foco permanecem no estado e no hash.
7. **Evolução de níveis.** Um nível de atividade futuro só existe como estado explícito incluído no
   hash, com transição definida por dado e reproduzível no replay; exige nova versão do contrato e
   novo ADR. É proibido derivar nível de atividade de apresentação, distância da câmera ou presença
   do jogador.
8. **RNG reproduzível.** A seed canónica é `Seed(u64)` no payload `REGION` (propriedade do CTR-03);
   a chave de 32 bytes por stream é derivada por BLAKE3-256 com domínio próprio, e o gerador é
   ChaCha20 RFC 7539 com nonce zero de 12 bytes, contador de bloco de 32 bits desde 0, palavras
   little-endian e palavra de 64 bits formada por duas palavras de 32 bits (par no low, ímpar no
   high). O contador limita o cursor a `0..=2^35` palavras (a posição `2^35` é stream esgotada);
   exceder é `RngCursorOverflow`. O `RngState` inclui a seed e `positions[code-1]`; `draw` deriva a
   stream explicitamente, sem seed global. Qualquer crate usada deve provar igualdade com esse fluxo
   por golden.

## Consequências

### Positivas

- O jogador só vê efeito que sobrevive a crash; o recibo é uma promessa verificável.
- Revisão, hash e log têm uma prova por par (AIFS + catálogo), não por confiança num blob.
- Recuperação é auditável: a perda é declarada, não escondida.
- Backup não corrompe o catálogo ao manipular WAL aberto.
- A região permanece regional de facto: nenhum LOD ou câmera reduz o mundo simulado.
- `STORE-01`, `STORE-02` e `APP-01` ganham uma fronteira estável para o TDD futuro.

### Negativas / custos

- Commit envolve dois artefatos e um `fsync` extra; o caminho de escrita é mais lento que um ACK
  otimista, e isso é deliberado.
- Recuperação e fallback acrescentam estados de erro que a UI precisa de mostrar com honestidade.
- A rotação de backup e a verificação por rehash exigem tempo de I/O e política de retenção.
- Sem níveis de atividade, uma região grande paga o custo de simular todas as áreas; o teto de
  hardware continua aberto (D-05) e não pode ser “resolvido” por congelamento silencioso.

### Riscos

- Um adaptador que abra o SQLite com `synchronous` diferente de `FULL` anula a garantia; o contrato
  exige verificação do `PRAGMA` efetivo.
- Um sistema de arquivos sem rename atómico ou sem `fsync` de diretório exige tratamento próprio;
  a implementação deve falhar de forma explícita, não fingir atomicidade.
- Migração forward-only pode impedir rollback de produto; a mitigação é preservar o original e
  exigir decisão humana, não reescrever o passado.
- A pressão por desempenho pode reintroduzir LOD por câmera; o critério de hash antes/depois de
  mudar foco é o guarda-corpo.

## Alternativas consideradas

- **SQLite como autoridade única (estado em BLOB):** rejeitada; o estado canónico é grande e o
  arquivo AIFS imutável dá verificação por conteúdo, enquanto o BLOB dificulta backup e auditoria.
- **AIFS como autoridade única (catálogo derivado):** rejeitada; a ordem, a cadeia de log e a
  idempotência de recibo precisam de um índice transacional; reconstruir por varredura seria lento e
  sujeito a corrida.
- **ACK otimista e reconciliação depois:** rejeitada; produz efeito fantasma e viola “não publicar
  efeito perdido”.
- **Renomear WAL para backup:** rejeitada; corrompe o banco aberto e perde transações.
- **LOD/hibernação por distância ou câmera:** rejeitada; viola D-04/D-07, o hash regional e o DOC-02
  §7.2.
- **Níveis de atividade implícitos por “área visível”:** rejeitada; um seletor de apresentação não
  é reproduzível nem auditável.

## Critérios de verificação

- `given_crash_after_temp_write_when_restart_then_head_unchanged`.
- `given_crash_after_publish_before_commit_when_restart_then_orphan_not_head`.
- `given_crash_after_commit_before_ack_when_retry_then_same_receipt`.
- `given_same_intent_twice_when_execute_then_no_duplicate_effect`.
- `given_hash_mismatch_when_load_then_recovered_to_previous_revision`.
- `given_actor_out_of_focus_when_change_camera_then_hash_unchanged`.
- `given_backup_rotation_when_verify_then_newest_verified_kept`.
- `given_future_schema_when_load_then_preserved_and_refused`.
- `given_seed_and_position_when_draw_then_word_is_pinned`.
- `given_position_2_35_when_draw_then_overflow_error`.
- `given_region_payload_when_canonicalize_then_region_id_and_tick_are_envelope_only`.
- `given_base_entry_seq_nonzero_when_replay_then_first_seq_is_base_plus_one`.
- `given_command_payload_when_roundtrip_then_162_bytes`.
- `given_aifs_header_revision_mismatch_when_load_then_durability_inconsistency`.
- Teste de hash antes/depois de trocar foco, câmera, viewport e painel: igualdade obrigatória.
- Replay completo e parcial reproduzem o hash da cabeça durável, inclusive entre localidades.

Nenhum teste foi executado; os critérios orientam `STORE-01`, `STORE-02`, `APP-01` e `E2E-01`
depois do freeze.

## Referências

- [Contrato CTR-02 — tempo, replay e save](<../../planning/contracts/time-replay-save.md>).
- [DOC-02 — especificação de gameplay](<../../planning/gameplay-spec.md>).
- [Decisões D-01 a D-08](<../../planning/decisions.md>), em especial D-02, D-04 e D-07.
- [ADR 0005 — contrato de simulação determinística](<0005-deterministic-simulation-contract.md>).
- [ADR 0008 — tempo por ações](<0008-action-driven-simulation-time.md>).
- [Especificação da onda](<../../planning/wave-spec.md>) — `INT-10` e `INT-17`.
- [Roadmap de arquitetura — tempo e determinismo](<../roadmap.md>).
- [ROADMAP de execução](<../../../ROADMAP.md>) — `STORE-01`, `STORE-02`, `APP-01`.
- [Estratégia de testes](<../../engineering/testing-strategy.md>).
- [SQLite — Write-Ahead Logging](https://www.sqlite.org/wal.html), acesso em 2026-11-08.
- [SQLite — Online Backup API](https://www.sqlite.org/backup.html), acesso em 2026-11-08.
- [BLAKE3](https://github.com/BLAKE3-team/BLAKE3), acesso em 2026-11-08.
