# Contrato CTR-02 — Tempo por ações, fronteira determinística e durabilidade

> **Status:** **PROPOSTA PARA FREEZE — pendente de revisão independente**; nenhum código de aplicação foi criado e nenhum valor de hash é afirmado.

| Campo | Valor |
| --- | --- |
| Tarefa | `CTR-02` — Tempo por ações, fronteira determinística e durabilidade |
| Dono | `S-CONTRACT` |
| Perfil | `planner-specialist` |
| Fronteira | `03` |
| Data | `2026-11-08` |
| Base SHA | `b0cc40efa439d26d1b785c99e76daf5006a956ee` |
| Manifesto | `docs/planning/wave-spec.md`, SHA-256 `328a8c7e121c9e4411bf0c105c3845c636e37bf208770fbc675f2cff4a360769` |
| Worktree | `C:\Users\kluse\Projects\ai-fantasy-worktrees\ctr-02`, branch `docs/ctr-02` |
| Contratos consumidos | CTR-01 rev 5 (`11ee9be`) e DOC-02 rev 6 (`31416a1`), ambos congelados tecnicamente na base |
| Interfaces consumidas | `INT-01` (identidade, unidades e canonicalização) |
| Interfaces produzidas | `INT-02`, `INT-04`, `INT-05`, `INT-06`, `INT-10`, `INT-17` |
| Versão do contrato | v1 |
| ADR | [ADR 0011](<../../architecture/adr/0011-time-replay-durability.md>), status **Proposto** |
| Revisão | `REVIEW-CTR-02` é obrigatória; este documento não se autoaprova |
| Implementação | Nenhuma; sem crate, `Cargo.toml`, teste de aplicação, benchmark ou golden inventado |

Este contrato fecha a fronteira determinística entre o mundo lógico e tudo o que o observa:
custos de ação, agenda regional, RNG transacional, log de entradas, replay, canonicalização das
secções que o CTR-01 delegou a `CTR-02` e a autoridade durável de save. Ele **referencia** a
tabela de custos e as constantes do [DOC-02](<../gameplay-spec.md>) como fonte única; não as
redefine, não ratifica `PD-01`…`PD-09` e não antecipa semântica de produto que pertence a outros
donos. Os caminhos de código citados são destinos propostos, não arquivos existentes.

## 1. Escopo, não-escopo e decisões preservadas

### 1.1 Escopo

- Tempo por ações: custo lógico por comando, intervalo processado, ordem de resolução e custo de
  rejeição, cancelamento, obsolescência, resposta tardia e dry-run.
- Agenda regional: cadência, ordem determinística, limites por pulso, viagem de NPC multi-pulso e
  política explícita de atividade das áreas.
- RNG transacional (`INT-02`): streams, `DrawSpec`/`DrawOutcome`, cursor, derivação de seed, ordem
  fixa, consumo explícito, snapshot e proibição de sorteio invisível.
- Input log e replay (`INT-06`): formato versionado, entradas normalizadas, ordem/tick/revisão,
  replay completo e parcial e rejeições tipadas.
- Canonicalização das secções `ACTORS` (tag 5), `AGENDA` (tag 9) e `RNG` (tag 10) que o CTR-01
  delegou a `CTR-02`; o que entra e o que fica fora do hash, com hash BLAKE3 e política de golden.
- Durabilidade e autoridade (`INT-10`): autoridade entre snapshot AIFS e catálogo SQLite/WAL,
  protocolo de commit, ACK ao jogador, recuperação por etapa de crash, backup e rotação, erros
  tipados de `SaveStore`/`EventSink` e idempotência de retry.
- Passo autoritativo (`INT-05`) e composição/recibo (`INT-17`), incluindo stale, cancelamento,
  timeout, idempotência e o que o recibo pode afirmar depois de um restart.
- Critérios de aceite rastreáveis, test list futura, decisões para freeze e pendências herdadas.

### 1.2 Não-escopo

- Valores de produto dos custos e das constantes: pertencem ao DOC-02 e à ratificação do
  maintainer (`PD-01`…`PD-09`). Este contrato não os altera nem cria valores paralelos.
- Semântica de rumor: origem, fidelidade, portadores, meia-vida e extinção pertencem a
  `SOC-02`/`SOC-03`; aqui só se fixa o stream e a ordem dos sorteios.
- Layout de evento de domínio de `INT-05`: `ActorMovedFact`, `TravelFact`, `PassagemFact`,
  `AfastamentoFact`, `CaminhoReveladoFact`, `CrencaFalsaFact` e `TestemunhoFact` continuam
  pendentes de contrato próprio; este documento trata eventos como bytes opacos com digest.
- Componentes de ator além do mínimo canónico desta sessão: atributos, memória, ordem de inventário
  e estado de FSM não são fixados aqui (§9).
- Geometria, rotas, portões, ocupação e reserva: pertencem a `CTR-03`; este contrato exige apenas
  que o custo e o estado de agenda sejam derivados e validados de forma determinística.
- Regras, DC, allowlist de efeitos e materializador: pertencem a `CTR-04`.
- NLG, TUI, render, câmera, overlay e percepção: ficam fora do estado, do tick e do hash.
- Migração de save além do esqueleto forward-only desta fronteira; código, testes, `cargo`,
  benchmarks e valores de hash golden.
- Edição de `ROADMAP.md`, `decisions.md`, `wave-spec.md`, prompts, ledger, índices de ADR, ADRs
  existentes ou contratos de outros donos.

### 1.3 Relação com as decisões D-01…D-08

Nenhuma decisão é reaberta. A tabela apenas declara como este contrato a preserva.

| Decisão | Como este contrato a preserva |
| --- | --- |
| D-01 | O contrato é de motor, não de produto 2D; não antecipa render nem TUI. |
| D-02 | `Tick(u64)` é a única noção de tempo; só ação autoritativa avança o mundo; UI, câmera, relógio e NLG custam 0 ticks. |
| D-03 | Relações e rumores são estado autoritativo; o stream `social` e o stream `rumor` são separados e a agenda é determinística. |
| D-04 | Overlay e silhuetas não entram no estado, no hash, na agenda ou no RNG; não concedem permissão. |
| D-05 | A canonicalização e o hash são independentes de host: big-endian, sem `usize`, sem layout de compilador. |
| D-06 | Nenhuma stack de render é escolhida ou pressuposta. |
| D-07 | Todas as localidades, atores em trânsito, agendas e rumores entram no estado e no hash; foco não seleciona atividade. |
| D-08 | Entrega documental em worktree isolada, sujeita a revisor individual e juiz; sem autoaprovação. |

### 1.4 Contratos consumidos e itens `PD` herdados

Do [CTR-01 rev 5](<identity-events.md>) este contrato consome e não reabre: `EntityId(u64)`,
`Tick(u64)`, `RelationBp(i16)`/`BasisPoints(i16)`, envelope `AFCS` v2 com 11 secções e ordem fixa,
primitivas big-endian, `CONVERSATION_FACT` v2 com `intent_payload`, secções `ITEMS`,
`RELATIONSHIPS`, `RUMORS` e `LABELS`, efeito `TRANSFER_CURRENCY` (kind 7) e as validações de
`CanonicalOrderViolation`/`DuplicateCanonicalKey`. As secções `ACTORS`, `AGENDA` e `RNG` têm
envelope e ordem fixados lá e payload fixado aqui (§3.2, §4.8, §6.2).

Do [DOC-02 rev 6](<../gameplay-spec.md>) este contrato consome: a tabela de custos (§4.2), os
custos de sistema e guardrails (§4.2/§11.3), o que não custa tempo (§4.3), o catálogo de ações e a
matriz de sorteios (§5.10), os resultados e o consumo de RNG por resultado (§6), a agenda regional
(§7), a linha temporal de rumor (§9.4) e o roteiro curado (§10).

O payload canónico de `REGION` — `Seed(u64)`, `generator_version`, `RegionId` e `spec_digest` — é
propriedade do `CTR-03` (`docs/planning/contracts/region-perception-overlay.md`, worktree `ctr-03`).
Este contrato referencia a seed `u64` e a derivação, não redefine `RegionId`/`spec_digest` e regista
a dependência em `P-09` (§9.2). O `RegionId` é um `u64` não nulo, não é `EntityId` e é derivado pelo
`CTR-03` §2.2 como `first_u64_be(BLAKE3("AFRI" || generator_version u16 || seed u64 || spec_digest))`;
`spec_digest` é `BLAKE3-256("AFRS" || RegionSpec canónica)`. O CTR-02 consome o valor e o hash, sem
recalcular nem substituir a fórmula.

`PD-01` (escala de tempo), `PD-03` (viagem, sobrecarga de embarque e limite de 240 ticks), `PD-07`
(parâmetros de rumor) e `PD-08` (cadência e limites de agenda) parametrizam diretamente este
contrato. Ele é **condicional** à ratificação desses itens: se forem alterados, este documento
exige nova versão e goldens re-pinados; nenhum valor pode ser ajustado por implementação.

### 1.5 Convenções normativas

- `MUST`, `MUST NOT`, `SHOULD` e `MAY` têm o sentido de requisito de contrato.
- Todos os inteiros multi-byte no wire são **big-endian**; inteiros negativos usam complemento de
  dois; não há padding entre campos nem alinhamento implícito.
- `Tick(u64)` é monotônico não decrescente; somas usam aritmética verificada e overflow devolve
  erro tipado, sem wrap e sem alterar estado.
- Tipos em code spans são propostas de domínio; nomes de erros são variantes tipadas propostas.
- `§` refere-se a secções deste contrato; `DOC-02 §x` refere-se à spec de gameplay.
- Os resultados de ação usam os nomes do DOC-02 §6.1. Este contrato atribui os códigos `1`…`7` da
  tabela §2.4 **para uso no log**, sem afirmar que o DOC-02 os numera: `1 SUCESSO`,
  `2 FALHA_RESOLVIDA`, `3 REJEITADA`, `4 CANCELADA_PELO_JOGADOR`, `5 OBSOLETA`,
  `6 RESPOSTA_TARDIA`, `7 DRY_RUN`. A oitava linha do DOC-02, `FALHA_DE_DURABILIDADE`, não é
  resultado de mundo: é `AppError::Durability` com `durability = NotDurable`, 0 tick e 0 RNG
  adicionais, e não entra no log como entrada publicante (§7.4).
- Nenhum valor de hash de estado ou de log é afirmado neste documento; os goldens pertencem a
  `CORE-01`/`CORE-02`/`STORE-01` após o freeze.

## 2. Tempo por ações

### 2.1 Unidade, custo e intervalo

- O tempo do núcleo é `Tick(u64)`. `0` é o estado inicial e apenas ancora a cadência da agenda; não
  existe pulso no tick `0`.
- Cada ação autoritativa tem um custo inteiro positivo em ticks, `ActionCost(u32)`, com
  `1..=2^32-1`; `0` é reservado a operações que não são ação de mundo. O custo pertence ao comando
  tipado e é **recomputado** a partir da tabela do DOC-02 §4.2, da geometria da região e das
  constantes do DOC-02 §11.3.
- Um `ResolvedCommand` cujo custo não coincide com o valor recomputado é rejeitado com
  `CostMismatch`: 0 tick, 0 RNG, nenhum efeito. O custo nunca é aceito por declaração do chamador,
  por prosa, por latência, por tokens ou por tempo de leitura.
- O intervalo de uma ação é `(t0, t0 + custo]`: a intenção resolve em `t0` e os ticks
  `t0 + 1` … `t0 + custo` são processados em ordem crescente e exatamente uma vez.
- A ordem interna de cada tick é a do DOC-02 §7.1 e não é configurável:
  1. chegadas de atores em trânsito cujo `arrival_tick` é aquele tick;
  2. agenda, se `tick % AGENDA_INTERVAL_TICKS == 0`;
  3. rumores, se `tick % RUMOR_INTERVAL_TICKS == 0`, sempre depois da agenda do mesmo tick.
- A intenção resolve **antes** de qualquer tick do intervalo; os sorteios do jogador usam os
  cursores imediatamente anteriores à agenda; os fatos sociais ficam ancorados em `t0`. Efeitos da
  intenção são visíveis para a agenda a partir de `t0 + 1`, nunca dentro de `t0`.
- `TickOverflow` (soma acima de `2^64-1`) rejeita a ação inteira, sem publicar estado, agenda, RNG
  ou fatos.

### 2.2 Tabela de custos referenciada

Os valores abaixo são **cópias de referência** da tabela do [DOC-02 §4.2](<../gameplay-spec.md>);
a fonte normativa é o DOC-02 e qualquer divergência entre este contrato e a spec é bug deste
contrato, não liberdade de implementação. Testes pinam os valores da spec.

| Operação | Custo (ticks) | Unidade de cobrança |
| --- | --- | --- |
| `mover` em pavimento, estrada ou terra batida | 1 | por célula de destino |
| `mover` em vegetação rasteira ou entulho | 2 | por célula de destino |
| `mover` em vegetação densa ou rocha | 3 | por célula de destino |
| `mover` em água rasa | 4 | por célula de destino |
| `mover` com mudança de `z` por escada ou rampa | +1 | por nível alterado, além do custo da célula |
| `viajar` | 2 + soma das células da rota | por aresta percorrida e por célula |
| `falar` | 2 | por ato simbólico |
| `perguntar_rumor` | 3 | por pergunta |
| `contar_rumor` (inclui semear) | 3 | por relato |
| `mentir` | 4 | por afirmação |
| `ameaçar` | 4 | por exigência |
| `negociar` | 6 | por rodada de oferta e resposta |

Custos de sistema e guardrails usados por este contrato, também do DOC-02 §4.2/§11.3:
`AGENDA_INTERVAL_TICKS = 10`, `AGENDA_LOCAL_ACTION_MAX_TICKS = 10`,
`RUMOR_INTERVAL_TICKS = 60`, `HALF_LIFE_TICKS = 1200`, `TRANSFER_LOSS_BP = 1000`,
`MIN_COGNITION_BP = 4000`, `GREETING_COOLDOWN_TICKS = 120`,
`MAX_AGENDA_ENTRIES_PER_PULSE = 64`, `MAX_RUMOR_ATTEMPTS_PER_PULSE = 16`,
`MAX_ACTORS_PER_LOCALITY = 64`, `MAX_LOCALITIES = 16`, `MAX_MOVE_CELLS = 64`,
`MAX_TRAVEL_EDGES = 4`, `MAX_TRAVEL_TICKS = 240`, `MAX_MEETING_HORIZON_TICKS = 2400`,
`PASS_VALIDITY_TICKS = 600`, `RUMOR_REACH_CELLS = 8`, `MAX_RUMOR_CARRIERS = 128`,
`MAX_RUMORS_PER_ACTOR = 32`.

**Cálculo de `viajar` (fechado).** O DOC-02 §4.2 fixa `2 + soma das células` e a unidade “por aresta
percorrida e por célula”; §3.2 explica que a sobrecarga fixa de 2 é paga **uma vez por aresta**, não
uma vez por comando, e não há sobrecarga adicional. Este contrato fixa exatamente:
`custo = Σ_arestas (2 + Σ_células_do_corredor custo_de_entrada)`.
Nenhuma sobrecarga extra é admitida; se `CTR-03` publicar `cost_ticks` por aresta como agregado,
esse valor MUST ser igual a `2 + Σ células` do corredor, sem duplicação. Divergência é
`CostMismatch`. A leitura “2 uma vez por viagem” está **rejeitada**: com duas arestas já diverge dos
exemplos do DOC-02 (E13+E23 = 31 e L3→L4 = 33 na leitura correta; 29 e 31 na leitura rejeitada).
Ratificar a redação é do DOC-02/maintainer, não deste contrato; `Q-01` fica fechada.

O caminho de `mover` é único por contrato (menor custo; empate pela sequência lexicográfica de
células `(z, y, x)` e pela ordem de vizinhos `N, L, S, O`, conforme DOC-02 §3.3) e o custo é a soma
do custo de entrada de cada célula do caminho. O caminho resolvido é registado no recibo e no log
(§5.2); não é recalculado no replay a partir de outra heurística.

### 2.3 Ordem de resolução de uma ação

Toda ação — nativa ou social — segue esta ordem, derivada do DOC-02 §4.1/§5.1. As etapas 1–4 são
validação; 5–6 produzem efeitos em staging; 7 avança o mundo; 8 promove o commit.

1. Validar schema, `kind`, campos obrigatórios e recorte; falha é `INTENCAO_INVALIDA` ou
   `ACAO_FORA_DO_RECORTE`.
2. Verificar ator (existe, vivo, presente, não em trânsito) e revisão-base; divergência é
   `REVISAO_OBSOLETA` depois de uma única revalidação (§8.3).
3. Verificar alvo, destino, tópico, alcance, linha estrutural, ocupação e recursos.
4. Verificar limites quantitativos e recomputar o custo (§2.2); divergência é `CostMismatch`.
5. Sortear os valores da ação, em cópia do `RngState`, na ordem declarada pela matriz do DOC-02
   §5.10 e sem promover cursores.
6. Resolver o resultado e montar os efeitos em staging de forma atômica.
7. Avançar os ticks `t0 + 1` … `t0 + custo` com a ordem de §2.1, incluindo chegadas, agenda e
   rumores.
8. Verificar invariantes, canonicalizar o estado candidato, calcular o hash e confirmar o commit
   (estado, agenda, cursores, fatos, eventos, recibo e entrada de replay juntos).

Falhas em 1–4 são rejeições: nenhum tick, nenhum RNG definitivo, nenhum efeito parcial. Falhas em
5–7 depois de validadas não publicam estado parcial: devolvem erro tipado e o estado, a agenda e os
cursores originais permanecem. A etapa 8 é a única que publica.

### 2.4 Custo, RNG e publicação por resultado

| Código | Resultado | Ticks | RNG definitivo | Estado/agenda | Log | Revisão |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `SUCESSO` | custo integral | sorteios da ação | aplicado atomicamente | entrada publicante | `+1` |
| 2 | `FALHA_RESOLVIDA` | custo integral | sorteios da ação | efeitos de falha, atomicamente | entrada publicante | `+1` |
| 3 | `REJEITADA` | 0 | 0 | inalterado | entrada não publicante | inalterada |
| 4 | `CANCELADA_PELO_JOGADOR` | 0 | 0 | inalterado | entrada não publicante | inalterada |
| 5 | `OBSOLETA` | 0 | 0 | inalterado | entrada não publicante | inalterada |
| 6 | `RESPOSTA_TARDIA` | 0 | 0 | inalterado | entrada externa normalizada | inalterada |
| 7 | `DRY_RUN` | 0 aplicados | 0 definitivo | inalterado | entrada não publicante, com prévia | inalterada |

Regras:

- `FALHA_RESOLVIDA` é ação que aconteceu: paga o custo integral, consome os sorteios declarados e
  aplica apenas os efeitos de falha. Nunca é tratada como rejeição.
- Só os resultados 1 e 2 promovem `revision`; os resultados 3–7 são duráveis no log (para que o
  replay reconte ticks e cursores), mas não alteram o estado canónico nem o hash.
- O DOC-02 §6.1 lista **oito** resultados; os sete primeiros têm os códigos `1`…`7` desta tabela. A
  oitava linha, `FALHA_DE_DURABILIDADE`, não é um `outcome` de mundo: é condição de aplicação
  (`AppError::Durability`/`durability = NotDurable`), com 0 tick e 0 RNG adicionais, e nunca produz
  recibo que afirme efeito durável (§7.4).
- Um resultado não pode ser “promovido” por retry: repetir a mesma `intent_id` devolve o recibo
  já gravado, sem reexecutar a ação (§8.4).

### 2.5 Rejeição, cancelamento, obsolescência, timeout e dry-run

- **Rejeição:** uma pré-condição falha em 1–4. Custo 0, RNG 0, nenhum efeito, nenhuma agenda
  processada, hash inalterado. O recibo de recusa contém o motivo tipado e a intenção normalizada;
  o replay consome a entrada sem reexecutar a ação. O jogador pode corrigir e tentar de novo; a
  nova tentativa é uma nova intenção.
- **Cancelamento:** só é possível antes do commit. Depois do commit a ação é fato e não pode ser
  desfeita por cancelamento. Custo 0, RNG 0, estado inalterado; o log regista a entrada de
  cancelamento (§5.3).
- **Obsolescência:** se `client_revision` divergir, o app revalida uma vez com fatos atualizados e
  pode reexecutar a intenção **uma única vez**. Se a revisão mudar de novo, a ação é recusada com
  `REVISAO_OBSOLETA`: 0 tick, 0 RNG, estado inalterado. A revalidação não é um novo tick e não
  consome RNG; a segunda falha é registada como entrada não publicante.
- **Resposta tardia de modelo:** timeout ou abstenção não têm tick, RNG ou efeito; são registados
  como entrada externa normalizada (§5.3). A ação nativa correspondente continua disponível sem
  modelo e não depende da resposta.
- **Dry-run:** recebe `mode = DryRun`, usa cópia do estado, da agenda e do RNG, devolve prévia com
  custo, sorteios, efeitos previstos e hash previsto, mas **não aplica nada**, não avança ticks,
  não grava fatos e não promove cursor. O log regista a prévia com `touched streams` de
  `position_before == position_after` para provar que nada foi consumido. O dry-run usa um
  `preview_id` próprio e **não** ocupa o `intent_id` da ação futura: uma prévia nunca reserva nem
  impede o commit posterior. O dry-run nunca reserva uma ação: o commit revalida tudo.
- **Falha de durabilidade:** o efeito pode ter sido computado e não publicado; o app não envia ACK
  e reporta erro tipado. O retry com a mesma `intent_id` é idempotente e não cobra ticks nem RNG
  adicionais (§7.8).

### 2.6 Composição de ações e tetos

- Uma ação é um comando resolvido e um passo; não existe comando composto, recursivo ou
  “encadeado” dentro do mesmo `step`.
- Efeitos de uma ação são aplicados atomicamente; não há efeito parcial observável nem publicação
  de subconjunto.
- Ações de agenda são passos separados, resolvidos nos ticks da agenda e não somados ao custo da
  ação do jogador.
- Tetos: `MAX_MOVE_CELLS = 64` células por `mover`; `MAX_TRAVEL_EDGES = 4` arestas e
  `MAX_TRAVEL_TICKS = 240` ticks por `viajar`; ação local de NPC acima de
  `AGENDA_LOCAL_ACTION_MAX_TICKS = 10` é inelegível naquele pulso, sem ação parcial e sem
  empréstimo de ticks.
- Viagem de NPC é a exceção declarada: não é ação local de um pulso; o plano multi-pulso paga a
  rota no intervalo de trânsito e não “empresta” ticks de um pulso (§3.4).
- O custo de uma ação nunca depende de quantas entidades estão em foco, de quantas localidades
  existem ou de quantos atores estão em trânsito; depende apenas do comando, da geometria e das
  constantes versionadas.

### 2.7 O que nunca custa tick

As operações abaixo custam 0 ticks, não entram no log como ação de mundo e não alteram hash, RNG,
relações, conhecimento, agenda ou rumores. Elas podem produzir recibos de apresentação, cache e
telemetria local, que ficam fora do estado autoritativo.

- Abrir, fechar, rolar histórico, diário, mapa, memória de ambiente ou overlay de silhuetas.
- Gerar, regenerar, reexibir, traduzir, resumir ou narrar prosa; reproduzir áudio, mudar volume ou
  legendas; trocar tema, painel, layout ou redimensionar o terminal.
- Trocar foco, mover câmera, mudar zoom ou subir/descer o `z` exibido.
- Digitar, apagar, corrigir ou cancelar texto antes de submeter; a intenção só existe quando
  submetida.
- Salvar, listar, verificar, reabrir ou reproduzir replay; pausar, avançar ou retroceder gravação.
- Aguardar modelo, receber timeout ou abstenção, exibir erro, confirmação ou recibo.
- Qualquer operação de NLG ou de UI, inclusive as que leem fatos que o personagem não testemunhou
  por canal privilegiado: elas não criam conhecimento nem permissão.

A lista é normativa pela negativa: um consumidor que cobre tick por qualquer item acima viola
`AC-CTR-02-01`, mesmo que o valor seja 0 por acidente.

## 3. Agenda regional

### 3.1 Cadência, ordem e janela de processamento

- A agenda é processada **por tick** dentro do intervalo `(t0, t0 + custo]`, na ordem de §2.1.
- Pulsos de agenda ocorrem nos ticks com `tick % AGENDA_INTERVAL_TICKS == 0`; o tick `0` apenas
  ancora a cadência e não processa pulso.
- Ordem dentro do pulso: localidades por `LocationId` crescente; dentro de cada localidade, atores
  por `ActorId` crescente; cada ator recebe no máximo uma entrada por pulso; no máximo
  `MAX_AGENDA_ENTRIES_PER_PULSE = 64` entradas por localidade por pulso.
- Quando a agenda precisar de desempatar arestas (rota, corredor ou portão), a ordem é `EdgeId`
  crescente e depois `GateId` crescente; arestas e portões não geram entradas de agenda próprias,
  são apenas chaves de ordem determinística. A ordem de iteração nunca é a de `HashMap`.
- Pulsos de rumor ocorrem nos ticks com `tick % RUMOR_INTERVAL_TICKS == 0`, **depois** da agenda do
  mesmo tick; o primeiro pulso possível é o tick 60.
- A agenda não lê prosa, overlay, câmera, viewport, cache de NLG, foco, relógio real ou estado de
  modelo. Nenhuma inferência de modelo ocorre no tick.
- A mudança de estado de uma entrada vale a partir do ponto em que aquele ator é processado:
  atores processados antes não a veem; atores processados depois veem. A ordem crescente de
  `ActorId` torna essa visibilidade determinística.
- A agenda de cada localidade processa os ticks devidos de qualquer ação, independentemente de
  onde a TUI ou o cliente 2D estão focados; trocar de foco custa 0 ticks (§2.7).

### 3.2 Secção canónica `AGENDA` (tag 9)

O CTR-01 fixa a tag 9, a ordem por `(due_tick, seq)` e as primitivas. Este contrato fixa o payload:

```text
count u32
repeat count:
  due_tick u64            (Tick absoluto)
  seq u64                 (ordem estável e única por save)
  kind u16                (1 = TRAVEL_ARRIVAL, 2 = SCHEDULED_MEETING)
  locality u64            (LocationId; 0 proibido)
  subject_actor u64       (ActorId; 0 proibido)
  payload_len u32
  payload[payload_len]
```

Payload de `TRAVEL_ARRIVAL`:

```text
departure_tick u64
arrival_tick u64          (igual a due_tick)
destination_locality u64
arrival_gate u64          (GateId; kind 6 da CTR-01)
route_len u16             (1..=MAX_TRAVEL_EDGES)
route_edges u64[route_len]
```

Payload de `SCHEDULED_MEETING`:

```text
creation_tick u64
counterparty_actor u64
counterparty_locality u64
```

Validação de `AGENDA`:

- `due_tick` MUST ser `>= 1`; nunca há entrada vencida ou agendada para o tick `0`.
- A lista é ordenada por `(due_tick, seq)` ascendente e o par é único; duplicata é
  `DuplicateCanonicalKey`; ordem errada é `CanonicalOrderViolation` (CTR-01).
- `seq` é alocado de forma monotônica e nunca reutilizado no mesmo save; o valor é durável e
  entra no hash. Duas entradas no mesmo `due_tick` são desempatadas por `seq` crescente.
- `seq` é o nome deste payload; o CTR-01 §5.2 escreve `seq` e o §5.4 escreve `sequence` para a
  mesma chave de agenda. São o mesmo campo e o wire usa `seq`; não há segundo campo.
- `locality` MUST existir na lista de localidades; `subject_actor` MUST existir em `ACTORS`.
- `kind` desconhecido é `InvalidAgendaEntry`; `payload_len` incompatível com o `kind` é
  `InvalidAgendaEntry`.
- `TRAVEL_ARRIVAL` MUST coincidir campo a campo com o plano de viagem do ator em `ACTORS`
  (§6.2): `departure_tick`, `arrival_tick`, `destination_locality`, `arrival_gate`, `route_len` e
  o prefixo de `route_edges`. Além disso, o `locality` do prefixo da entrada MUST ser igual a
  `destination_locality`, e `subject_actor` MUST ser o `ActorId` cujo plano em `ACTORS` está a ser
  comparado (o plano pertence ao sujeito, não a outro ator). `arrival_gate` MUST pertencer à
  localidade de destino e `route_edges` MUST existir. Divergência é `AgendaActorMismatch` e
  impede o load e o commit.
- `SCHEDULED_MEETING` MUST ter `due_tick` em `(creation_tick, creation_tick + MAX_MEETING_HORIZON_TICKS]`,
  `counterparty_actor` existente e distinto de `subject_actor`, e `counterparty_locality` existente
  e não nula; o `locality` do prefixo MUST ser igual a `counterparty_locality`. `subject_actor` é o
  proponente e `counterparty_actor` o outro lado. Violação é `InvalidAgendaEntry`. A semântica de
  desfecho do encontro é pendência herdada (§9.2, `P-06`).
- Pulsos de agenda e de rumor são **derivados da cadência**: nunca são gravados como entradas. Uma
  entrada de pulso é `InvalidAgendaEntry`; duplicar a contagem de ticks é erro de contrato.
- O payload não contém texto, prosa, caminho de arquivo, nome de apresentação ou dado de UI.

A agenda é estado: entra no hash regional inteiro (§6.1) e é restaurada com os mesmos
`(due_tick, seq, kind, subject, payload)`; reordenar por `due_tick` na gravação e reabrir não
muda o hash.

### 3.3 Processamento das entradas

- `TRAVEL_ARRIVAL` é processado no início do tick `arrival_tick`, antes da agenda do mesmo tick.
  A reserva do portão vira ocupação, o ator passa a estar presente na localidade de destino, o
  plano é removido de `ACTORS` e a entrada é removida da `AGENDA`. Se o tick da chegada for um
  pulso, o ator é elegível na agenda do mesmo tick.
- `SCHEDULED_MEETING` é disparado exatamente uma vez no `due_tick`, com `(subject_actor,
  counterparty_actor, counterparty_locality)` como entrada. Até a ratificação da semântica de
  encontro (`P-06`), o disparo é um **no-op determinístico** registado como
  `PENDENTE_DE_SEMANTICA` na saída do passo: não consome RNG, não altera relações, não cria fato e
  não custa tick adicional. Uma entrada vencida nunca é processada em atraso.
- Entrada cujo sujeito morreu, está em trânsito ou não está presente quando chega o `due_tick`:
  a política de desfecho também é `P-06`; até lá, o disparo segue a regra do ponto anterior e a
  condição é registada na saída. O contrato garante apenas disparo único, ordem e ausência de
  efeito implícito.
- Processar uma entrada remove-a do estado; a remoção é parte do mesmo commit atômico. Um crash
  antes do commit preserva a entrada; depois do commit ela não existe mais.
- Uma entrada nunca é processada duas vezes no mesmo tick nem em ticks posteriores; o replay
  reproduz a remoção e a ausência de segunda execução.

### 3.4 Viagem de NPC multi-pulso (`arrival_tick`)

- `VIAJAR` de NPC não é cobrado do orçamento de 10 ticks do pulso. A entrada de agenda apenas
  **inicia** o plano: o NPC entra em trânsito no tick do pulso com `departure_tick = t` e
  `arrival_tick = t + custo_da_viagem`, e o custo total é pago dentro do intervalo de trânsito
  `[t + 1, arrival_tick]`.
- Enquanto está em trânsito, o NPC não está presente em localidade alguma, não ocupa célula, não
  interage, não testemunha, não propaga rumor e não recebe novas entradas de agenda.
- A chegada é processada no início do tick `arrival_tick`, conforme §3.3; se esse tick for um
  pulso, o NPC é elegível na agenda do mesmo tick; caso contrário, volta a ser elegível no pulso
  seguinte.
- Cada NPC tem no máximo um plano ativo. Iniciar viagem com plano ativo, destino inválido, rota
  acima de `MAX_TRAVEL_EDGES`/`MAX_TRAVEL_TICKS` ou origem errada é `PLANO_INVALIDO`: 0 tick,
  0 RNG, nenhum efeito parcial.
- O plano, o `arrival_tick` e a entrada `TRAVEL_ARRIVAL` fazem parte do estado e do hash. Um NPC em
  trânsito nunca “desaparece” do estado nem do hash (§6.1).
- A viagem do jogador é atômica no intervalo da própria ação (DOC-02 §5.3); a diferença é apenas o
  agendamento em múltiplos pulsos, não o preço nem os limites.

### 3.5 Limites por pulso e ordem de omissão

- `MAX_AGENDA_ENTRIES_PER_PULSE = 64` entradas por localidade por pulso. Ao atingir o limite, as
  entradas restantes são omitidas com `LIMITE_ATINGIDO`, na ordem determinística de processamento
  (atores de maior `ActorId` primeiro), e o facto é registado na saída do passo.
- `MAX_RUMOR_ATTEMPTS_PER_PULSE = 16` **sorteios** por rumor por pulso; o limite conta sorteios,
  não transferências. Pares restantes são omitidos com `LIMITE_ATINGIDO`, na ordem de §7.4 do
  DOC-02.
- `MAX_ACTORS_PER_LOCALITY = 64` atores por localidade. Uma criação acima do limite não ocorre;
  o diagnóstico é registado e nenhuma entidade é criada em silêncio.
- `MAX_RUMOR_CARRIERS = 128` cópias ativas por rumor e `MAX_RUMORS_PER_ACTOR = 32` rumores por ator;
  ao atingir, a transferência ou o novo rumor é omitido com `LIMITE_ATINGIDO`.
- Omissão nunca corrompe o estado, nunca reordena entradas e nunca “expande” o limite
  dinamicamente. A agenda continua no tick seguinte; não há fila ilimitada nem descarte sem
  registo.
- Os limites são lógicos e de determinismo, não metas de desempenho nem limites de hardware; não
  podem ser usados para reduzir a região a uma vila.

### 3.6 Política de níveis de atividade por área

**Decisão estrutural (ADR 0011):** nesta versão existe **um único nível de atividade**,
`REGIONAL_ATIVA`, aplicado a todas as localidades. Não há LOD, hibernação, suspensão por distância,
congelamento por foco, “área ativa/inativa”, orçamento de ticks por área ou prioridade de
simulação.

Regras normativas:

- Nenhum campo de nível de atividade existe no estado v1. A ausência é deliberada: um nível
  implícito por área seria um seletor não reproduzível.
- Foco, câmera, viewport, `z` exibido, painel aberto, histórico, cache de NLG e presença de
  jogador **MUST NOT** ser entradas da agenda, do RNG, do hash ou de qualquer decisão de mundo.
- Todas as localidades processam todos os pulsos; atores fora do foco continuam no estado, no
  hash, na agenda e nos rumores.
- Trocar de foco, mover a câmera, abrir outro painel ou redimensionar a TUI custa 0 ticks e produz
  hash igual antes e depois.
- Se um contrato futuro introduzir níveis de atividade por área, ele MUST declarar: (a) o nível
  como estado explícito, incluído no hash; (b) a política de transição como dado e não como
  consequência de apresentação; (c) a cadência e os sistemas suspensos por nível; (d) a reprodução
  no replay. Até lá, este contrato não autoriza nenhum nível além de `REGIONAL_ATIVA`, e uma
  implementação que leia câmera ou viewport para decidir atividade viola `AC-CTR-02-02`.

## 4. RNG transacional (`INT-02`)

### 4.1 Estado, streams e derivação de seed

- Existem quatro streams de domínio, com códigos fixos: `1 social`, `2 combat`, `3 rumor`,
  `4 spawn`. O código `0` é reservado e código desconhecido é `UnknownRngStream`. Nesta sessão,
  `social` e `rumor` são usados; `combat` e `spawn` ficam reservados a domínios futuros e não são
  consumidos durante um tick desta sessão. A geração de região usa a PRF própria do `CTR-03` e
  **não** consome estas streams; `spawn` não é um RNG de geração paralelo.
- `Seed(u64)` é o tipo canónico da seed, alinhado ao roadmap (“`Tick(u64)`, `Seed(u64)`”) e ao
  `CTR-03` (dono do payload `REGION`). `RegionId`, `spec_digest` e `generator_version` são
  propriedade do `CTR-03`; este contrato referencia a derivação e não a redefine (§9.2, `P-09`).
- O `RngState` é o valor de runtime `{ seed: Seed, positions: [u64; 4] }`: a seed **e** as posições
  por stream. A seed não é duplicada na secção `RNG` (tag 10): ela vive na secção `REGION` (tag 1,
  dona `CTR-03`) e é reconstruída no load; a secção `RNG` grava apenas as posições (§4.8). Sem seed
  no `RngState`, `draw` não é realizável e uma seed global seria proibida.
- A chave de 32 bytes de cada stream é derivada explicitamente da seed `u64`:
  `stream_key = BLAKE3-256("AI-FANTASY-RNG-KEY-V1" || u64_be(seed) || u16_be(code))`.
  Não há `seed[32]` canónica nem expansão opcional de fixture: a seed é `u64`, e a chave de 32
  bytes é sempre derivada por essa fórmula.
- O gerador de cada stream é **ChaCha20 original, RFC 7539 §2.3**, com 20 rondas (10 duplas), e os
  parâmetros fixados:
  - chave: `stream_key` de 32 bytes;
  - nonce: 12 bytes, todos zero;
  - contador de bloco de 32 bits: começa em `0` e incrementa uma vez por bloco de 64 bytes;
  - serialização de saída: as 16 palavras de 32 bits de cada bloco em **little-endian**, na ordem
    do RFC;
  - palavra de 64 bits `n`: `bloco = n / 8`, par `j = n % 8`, e
    `word = u32_le[2j] | (u32_le[2j + 1] << 32)` (palavra 32-bit par no low, ímpar no high).
  Uma implementação que use `rand_chacha` MUST fixar a versão no lockfile e provar, com o golden
  `given_seed_and_position_when_draw_then_word_is_pinned`, que o fluxo coincide com esta
  construção; `ChaCha20Rng` com inicialização ou posição de palavra diferente do RFC não é aceite
  por semelhança de nome.
- Não existe RNG global, `thread_rng`, entropia de relógio, `Instant`, contador de sistema,
  endereço de memória ou seed por chamada. A mesma seed, as mesmas posições e as mesmas requisições
  produzem as mesmas palavras em Windows e Linux.
- O tick não é entropia. Consumir RNG em função de `tick`, de foco, de câmera ou de tempo de CPU é
  sorteio invisível por definição (§4.6).
- Vetor de teste da construção: seed `1`, stream `1`, posição `0`; o primeiro word de 64 bits é
  comparado com um golden capturado por `CORE-01` depois do freeze. Nenhum valor de palavra ou de
  hash é afirmado nesta proposta.

### 4.2 `DrawSpec`, `DrawOutcome` e assinatura

```rust
draw(state: &RngState, request: DrawSpec) -> Result<DrawOutcome, DomainError>
```

`DrawSpec` proposto:

| Campo | Tipo lógico | Regra |
| --- | --- | --- |
| `stream` | `RngStream` | `1..=4`; `0` e desconhecido são `UnknownRngStream`. |
| `domain` | `u16` | `1..=65_535`; `0` reservado; identifica o propósito e é registado no log. |
| `bound` | `u64` | `1..=2^63`; `0` ou acima de `2^63` é `InvalidDistribution`. |

`DrawOutcome` proposto:

| Campo | Tipo lógico | Regra |
| --- | --- | --- |
| `stream` | `RngStream` | eco do pedido. |
| `domain` | `u16` | eco do pedido. |
| `bound` | `u64` | eco do pedido. |
| `index` | `u64` | índice da primeira palavra tentada. |
| `value` | `u64` | `0..bound-1`; resultado uniforme exato. |
| `words_consumed` | `u32` | `1..=8`; palavras efetivamente lidas, incluindo rejeições. |
| `position_after` | `u64` | `index + words_consumed`; posição a promover. |

`draw` é **puro**: lê `state` e devolve o resultado, sem mutar o estado recebido. Ele deriva
`stream_key` de `state.seed` e de `request.stream` (§4.1) a cada chamada; não recebe seed por
parâmetro e não lê seed de ambiente ou de global. Um `RngState` sem seed é `MissingSeed`. A
promoção do cursor é explícita e pertence ao chamador (§4.4): o chamador promove exatamente
`position_after` em caso de commit, e nada em caso de rejeição, cancelamento, obsolescência,
resposta tardia, dry-run ou falha de invariante.

Erros propostos, todos tipados e sem promoção de cursor: `UnknownRngStream`, `InvalidDomain`,
`InvalidDistribution`, `DrawRejectionLimit` e `RngCursorOverflow`.

### 4.3 Amostragem uniforme e distribuição inválida

A amostragem é uniforme exata por rejeição, com um limite declarado de tentativas:

```text
zone = 2^64 - (2^64 mod bound)          // calculado em aritmética de 128 bits
words = 0
loop:
  if words == MAX_DRAW_WORDS (8): return Err(DrawRejectionLimit)
  w = word(position + words)            // 64 bits
  words = words + 1
  if w < zone: return Ok(value = w mod bound, words_consumed = words)
  // w >= zone: repete com a palavra seguinte
```

Regras:

- O resultado é exato, não enviesado e não usa `% bound` direto sobre toda a palavra.
- `MAX_DRAW_WORDS = 8` garante terminação e resultado definido; a probabilidade de rejeição é
  `bound / 2^64`, inferior a `2^-50` para os limites desta sessão (`≤ 10_001`), pelo que o limite é
  uma salvaguarda de contrato e não um caminho esperado.
- Se `position + words` exceder `2^64-1`, o resultado é `RngCursorOverflow`; nunca há wrap.
- `DrawRejectionLimit` e `RngCursorOverflow` falham a ação inteira: nenhum efeito, nenhuma
  promoção e nenhuma publicação. O mesmo estado e o mesmo pedido reproduzem o mesmo erro.
- Uma distribuição inválida é erro, nunca “correção” por clamp silencioso, por módulo simples ou
  por reamostragem fora do contrato.
- Para sorteios em basis points, `bound = 10_001`; para comparações com chance, o chamador compara
  `value < chance` com `chance` clampada pela fórmula do DOC-02 antes do sorteio.

### 4.4 Ordem fixa e consumo explícito

Ordem de sorteio por ação, da matriz do DOC-02 §5.10:

| Ação | Sorteios | Stream | Ordem interna |
| --- | --- | --- | --- |
| `mover`, `viajar` | 0 | — | nenhum sorteio. |
| `falar` | 0 | — | nenhum sorteio. |
| `negociar` | 1 | `social` | aceitação da proposta. |
| `mentir` | 2 | `social` | crença e depois detecção. |
| `perguntar_rumor` | 1 | `social` | resposta do informante. |
| `contar_rumor` | 1 | `social` | aceitação do relato. |
| `ameaçar` | 1 | `social` | resistência ou concessão. |

- A agenda social sorteia na ordem de processamento: `LocalityId` crescente, `ActorId` crescente,
  uma entrada por ator por pulso, e somente quando a macroação escolhida sorteia. A escolha da
  macroação é FSM/utilidade determinística e não consome RNG por si só.
- A propagação de rumor sorteia um par elegível por vez, na ordem `ActorId` do portador e depois
  `ActorId` do ouvinte, no stream `rumor`, até `MAX_RUMOR_ATTEMPTS_PER_PULSE` sorteios por rumor por
  pulso.
- Isolamento de streams: um sorteio em `social` nunca altera a posição de `combat`, `rumor` ou
  `spawn`; o snapshot e o replay preservam as quatro posições. Esta é a prova de `AC-CTR-02-03`.
- Consumo explícito: todo sorteio que influencia o resultado é registado no log com stream,
  `domain`, `index`, `bound`, `value` e `words_consumed`, e com as posições antes/depois do stream.
  Um sorteio não registado é defeito de contrato; a implementação MUST NOT chamar aleatoriedade por
  fora de `draw` nem esconder um sorteio atrás de uma decisão “determinística”.
- Rejeição, cancelamento, obsolescência, resposta tardia e dry-run: nenhuma promoção de cursor. Um
  passo que falha invariantes também não promove: a promoção pertence ao commit atômico.
- O dry-run pode executar sorteios numa cópia, mas regista-os na prévia com
  `position_before == position_after`; o cursor real permanece intocado.

### 4.5 Snapshot, restauração e replay

- As posições das quatro streams são o estado de RNG canónico (§4.8) e entram no hash regional.
- Restaurar um checkpoint repõe as posições exatamente como gravadas; não há re-derivação por
  contagem de sorteios nem “aquecimento” do gerador. Uma seed ausente é `MissingSeed` e impede o
  load.
- O replay compara, por entrada, as posições declaradas antes/depois com as posições calculadas; a
  primeira divergência é `Divergence` e interrompe o replay (§5.6).
- Copiar o estado para dry-run copia as posições; a cópia é descartada sem promoção. Nenhum
  caminho de leitura pode promover cursor por efeito colateral.
- O cursor é monotônico não decrescente entre revisões: restaurar um save antigo repõe posições
  antigas, mas o hash e a cadeia de log passam a valer a partir daquele checkpoint; não existe
  “voltar atrás” parcial dentro de um save vivo (§7.6).

### 4.6 Sorteios invisíveis proibidos

- É proibido obter aleatoriedade de relógio, de `tick`, de PID, de endereço, de `HashMap`, de
  tamanho de coleção, de latência, de UI, de model sampling ou de cache de NLG.
- A inferência do modelo não consome streams do núcleo: a amostragem do modelo é externa, o
  resultado entra normalizado (§5.3) e o núcleo nunca “re-sorteia” para compensar.
- Um empate não é um sorteio: empates são resolvidos por ordem de chave explícita (§4.7). Re-sortear
  para desempatar é proibido, porque mudaria o consumo e o hash.
- Regra de auditoria: para cada passo, a soma de `words_consumed` registada no log MUST igualar a
  soma de `position_after - position_before` das streams tocadas. Um consumidor que não consiga
  provar essa igualdade falha o passo.
- Um subsistema novo que precise de aleatoriedade MUST declarar o stream e o `domain`, aparecer na
  matriz de sorteios e ser registado; “aleatoriedade interna” não é permitida.

### 4.7 Empates, overflow e distribuição inválida

| Situação | Resultado definido |
| --- | --- |
| Empate de rota | Sequência lexicográfica de `LocalityId` visitados e, se necessário, `EdgeId` crescente (DOC-02 §3.2); nunca ordem de `HashMap`. |
| Empate de célula no caminho | Sequência lexicográfica `(z, y, x)` e ordem de vizinhos `N, L, S, O` (DOC-02 §3.3). |
| Empate de utilidade de NPC | Ordem fixa `MOVER`, `FALAR`, `NEGOCIAR`, `VIAJAR`, `OCIOSO`; depois `ActorId` crescente. |
| Empate de par de rumor | `ActorId` do portador e depois `ActorId` do ouvinte (DOC-02 §7.4). |
| Empate de agenda | `(due_tick, seq)` crescente; `seq` único. |
| Dois valores sorteados iguais | Não há re-sorteio; a decisão seguinte usa a ordem de chave declarada. |
| `bound` inválido | `InvalidDistribution`; passo falha sem promoção. |
| Overflow de cursor ou de soma de ticks | `RngCursorOverflow`/`TickOverflow`; passo falha sem wrap e sem promoção. |
| Fórmula de chance fora da faixa | Clamp único declarado pela fórmula do DOC-02 antes do sorteio; nunca clamp depois do resultado. |

### 4.8 Secção canónica `RNG` (tag 10)

O CTR-01 fixa a tag 10, a ordem por código de stream e as primitivas. Este contrato fixa o payload:

```text
count u32                 (4 em v1)
repeat count:
  code u16                (1..=4, ascendente, sem repetição)
  position u64            (palavras consumidas na stream)
```

Validação de `RNG`:

- `count = 4` e os códigos `1, 2, 3, 4` aparecem exatamente uma vez, em ordem ascendente;
  ausência, duplicata ou código desconhecido é `InvalidRngSection`.
- `position` MUST caber em `u64`; não há posição negativa nem sentinela.
- O payload tem tamanho fixo `4 + 4 × (2 + 8) = 44` bytes; não há padding.
- A seed (`u64`) não é repetida nesta secção: ela vive em `REGION` e é a única fonte da derivação;
  uma secção `RNG` cujo estado reconstruído não encontre seed é `MissingSeed`. O `RngState` de
  runtime combina `REGION.seed` com as quatro posições e é o que `draw` recebe.
- O payload entra no hash regional e no save; é restaurado literalmente em `load`, e a chave de
  32 bytes é sempre re-derivada por BLAKE3, nunca gravada.
- `combat` e `spawn` existem e são preservados mesmo sem consumo nesta sessão; remover uma stream
  “não usada” seria uma mudança de formato, não uma otimização.

## 5. Input log e replay (`INT-06`)

### 5.1 Formato versionado `AFRL`

O log de replay é uma sequência de bytes canónica, designada `AFRL` v1. A mesma sequência é
gravada no catálogo durável (uma linha por entrada, blob canónico) e pode ser exportada como
arquivo para auditoria; as duas formas usam os mesmos bytes de entrada.

Cabeçalho de 32 bytes:

| Offset | Campo | Tipo | v1 | Semântica |
| --- | --- | --- | --- | --- |
| 0 | `magic` | 4 bytes | `AFRL` | `41 46 52 4C`. |
| 4 | `version` | `u8` | `1` | Versão do formato. |
| 5 | `flags` | `u8` | `0` | Reservado; MUST zero. |
| 6 | `reserved` | `u16` | `0` | MUST zero. |
| 8 | `entry_count` | `u32` | variável | Número de entradas **do segmento** deste log. |
| 12 | `contract_version` | `u32` | `1` | Versão do `SimulationContract` usado. |
| 16 | `checkpoint_revision` | `u64` | variável | Revisão do checkpoint coberto por este log. |
| 24 | `base_entry_seq` | `u64` | variável | `entry_seq` do checkpoint; o log começa em `base_entry_seq + 1`. |

O log é **relativo ao checkpoint**: cobre o segmento `(base_entry_seq, base_entry_seq + entry_count]`.
`base_entry_seq = 0` denota log desde o estado inicial. `entry_count = 0` é `EmptyLog` (um arquivo
sem entradas não é um log); o replay de um checkpoint sem entradas é representado por `inputs`
vazio, não por um arquivo vazio.

Entrada, com parte fixa de **148 bytes** seguida de blocos variáveis:

| Offset relativo | Campo | Tipo | Semântica |
| --- | --- | --- | --- |
| 0 | `entry_len` | `u32` | Comprimento total da entrada, incluindo este campo. |
| 4 | `seq` | `u64` | `base_entry_seq + 1 ..= base_entry_seq + entry_count`, contíguo. |
| 12 | `tick_before` | `u64` | Tick antes da entrada. |
| 20 | `tick_after` | `u64` | Tick depois da entrada. |
| 28 | `revision_before` | `u64` | Revisão antes da entrada. |
| 36 | `revision_after` | `u64` | Revisão depois da entrada. |
| 44 | `kind` | `u8` | `1 COMMAND`, `2 MODEL_PROPOSAL`, `3 MODEL_TIMEOUT`, `4 MODEL_ABSTENTION`, `5 CANCELLATION`. |
| 45 | `outcome` | `u8` | `1..=7` da tabela §2.4. |
| 46 | `result_class` | `u8` | `0..=4` (CTR-01: 1 sucesso, 2 falha resolvida, 3 limite, 4 sem efeito/cooldown). |
| 47 | `flags` | `u8` | bit0 dry-run, bit1 modelo presente, bit2 eventos presentes, bit3 publicante, bit4 rumor semeado. |
| 48 | `cost_ticks` | `u32` | Custo aplicado; `0` nos resultados não publicantes. |
| 52 | `reason` | `u16` | Motivo tipado de recusa/cancelamento/limite; `0` se não aplicável. |
| 54 | `reserved` | `u16` | MUST zero. |
| 56 | `actor` | `u64` | `ActorId` que age; `0` em entrada sem ator. |
| 64 | `command_kind` | `u16` | `1..=8` do catálogo DOC-02; `0` sem comando. |
| 66 | `draws_count` | `u16` | Número de sorteios registados. |
| 68 | `touched_count` | `u8` | Streams tocadas (`0..=4`). |
| 69 | `reserved2` | 3 bytes | MUST zero. |
| 72 | `payload_len` | `u32` | Comprimento do comando normalizado. |
| 76 | `events_len` | `u32` | Comprimento do bloco de eventos (bytes opacos). |
| 80 | `external_len` | `u32` | Comprimento do bloco externo. |
| 84 | `hash_before` | 32 bytes | Hash do estado antes da entrada. |
| 116 | `hash_after` | 32 bytes | Hash do estado depois da entrada. |
| 148 | `draws[]` | `draws_count × 32` | `stream u16`, `domain u16`, `bound u64`, `index u64`, `value u64`, `words u32`. |
| — | `touched[]` | `touched_count × 18` | `code u16`, `position_before u64`, `position_after u64`. |
| — | `payload[]` | `payload_len` | Comando normalizado (§5.2). |
| — | `events[]` | `events_len` | Eventos de domínio opacos; o layout pertence a `INT-05` (§9.2, `P-05`). |
| — | `external[]` | `external_len` | Entrada externa normalizada (§5.3). |

`entry_len` MUST ser exatamente
`148 + 32 × draws_count + 18 × touched_count + payload_len + events_len + external_len`;
qualquer divergência é `EntryLengthMismatch`. Rodapé de 40 bytes: `digest` BLAKE3-256 de
`header || entradas`, `entry_count` repetido (`u32`) e `reserved` (`u32`, MUST zero). Truncamento
antes do rodapé é `Truncated`; bytes depois do rodapé são `TrailingBytes`.

### 5.2 Entradas normalizadas de comando

`kind = 1 COMMAND` representa uma intenção resolvida do jogador ou de um ator de agenda. O
`payload` é **fixo, big-endian e sem padding**, com exatamente **162 bytes** (`payload_len = 162`);
qualquer outro comprimento é `InvalidPayload`. Campos opcionais usam presença `u8` (`0` ausente, `1`
presente); quando ausentes, os bytes do valor MUST ser zero.

| Offset | Campo | Tipo | Regra |
| --- | --- | --- | --- |
| 0 | `action_kind` | `u16` | `1..=8` do catálogo DOC-02. |
| 2 | `actor` | `u64` | `ActorId` não nulo. |
| 10 | `target_present` | `u8` | `0`/`1`. |
| 11 | `target` | `u64` | `ActorId` se presente; `0` se ausente. |
| 19 | `destination_kind` | `u8` | `0` nenhum, `1` célula, `2` localidade. |
| 20 | `destination_locality` | `u64` | `LocationId` se kind `2`; `0` caso contrário. |
| 28 | `x` | `i32` | célula se kind `1`; `0` caso contrário. |
| 32 | `y` | `i32` | idem. |
| 36 | `z` | `i16` | idem. |
| 38 | `topic_present` | `u8` | `0`/`1`. |
| 39 | `topic_kind` | `u8` | `0` ausente, `1` FACT, `2` RUMOR. |
| 40 | `topic_id` | `u64` | `FactId`/`RumorId` conforme kind; `0` se ausente. |
| 48 | `offer_present` | `u8` | `0`/`1`. |
| 49 | `offer_moeda` | `u32` | `CurrencyAmount` `1..=10_000` se presente; `0` se ausente. |
| 53 | `meeting_tick_present` | `u8` | `0`/`1`. |
| 54 | `meeting_tick` | `u64` | `Tick` absoluto se presente. |
| 62 | `meeting_locality_present` | `u8` | `0`/`1`. |
| 63 | `meeting_locality` | `u64` | `LocationId` se presente. |
| 71 | `gate_present` | `u8` | `0`/`1`. |
| 72 | `gate_id` | `u64` | `GateId` kind 6 se presente. |
| 80 | `validity_present` | `u8` | `0`/`1`. |
| 81 | `validity_ticks` | `u32` | `1..=PASS_VALIDITY_TICKS` se presente. |
| 85 | `away_present` | `u8` | `0`/`1`. |
| 86 | `away_x` | `i32` | célula se presente; `0` caso contrário. |
| 90 | `away_y` | `i32` | idem. |
| 94 | `away_z` | `i16` | idem. |
| 96 | `registro` | `u8` | `0` ausente ou `1..=4` (DOC-02 §5.1). |
| 97 | `pedido` | `u8` | `0` ausente ou `1..=4`. |
| 98 | `exigencia` | `u8` | `0` ausente ou `1..=3`. |
| 99 | `claim_present` | `u8` | `0`/`1`. |
| 100 | `claim_value` | `u16` | código `1..=N` se presente; `0` se ausente. |
| 102 | `seed_rumor` | `u8` | `0`/`1`. |
| 103 | `fidelity_offered_present` | `u8` | `0`/`1`. |
| 104 | `fidelity_offered_bp` | `u16` | `0..=10_000` se presente (`perguntar_rumor`). |
| 106 | `fidelity_received_present` | `u8` | `0`/`1`. |
| 107 | `fidelity_received_bp` | `u16` | `0..=10_000` se presente. |
| 109 | `scheduled_tick_present` | `u8` | `0`/`1`. |
| 110 | `scheduled_tick` | `u64` | `Tick` calculado e registado (`ameaçar`). |
| 118 | `resolved_digest` | 32 bytes | BLAKE3-256 do caminho/rota resolvidos e do custo. |
| 150 | `intent_id` | `u64` | Chave de idempotência da intenção; não nula em `COMMAND`/`CANCELLATION`. |
| 158 | `cost_ticks` | `u32` | Custo aplicado, repetido para conferência. |

Regras:

- `action_kind` e os campos de presença MUST ser coerentes com a ação: campo obrigatório ausente,
  campo proibido presente ou enum fora da faixa é `InvalidPayload`.
- `destination_kind = 1` exige `x`/`y`/`z` e `destination_locality = 0`; `kind = 2` exige
  `destination_locality` e `x = y = z = 0`; `kind = 0` exige tudo zero.
- Uma presença em `1` com valor zero é inválida quando o campo exige valor positivo; `fidelity_*_bp`
  pode ser `0` quando presente se a ação o permitir.
- `intent_id` MUST ser não nulo em `COMMAND` e `CANCELLATION`; é a chave do índice durável de
  recibos e permite reconstruir a idempotência a partir do log. Duas entradas com o mesmo
  `intent_id` e outcomes publicantes diferentes são `DuplicateIntent`. Em `DRY_RUN`, o campo
  transporta o `preview_id` e `flags.bit0 = 1`; o índice de recibos não o reserva como intenção
  real.
- `resolved_digest` é BLAKE3-256 da descrição canónica do caminho/rota resolvidos e do custo
  (células `(z,y,x)` ordenadas do caminho, ou arestas `EdgeId` e corredores da rota). O replay
  recomputa o caminho/rota pela regra do DOC-02 e compara o digest; divergência é `Divergence`.
- O payload não contém prosa, tokens, palavras, áudio, latência, caminho de arquivo, estado de UI,
  foco, câmera, zoom, cache de NLG, métricas ou dado de overlay.
- Um comando que exija modelo tem `flags.bit1` e bloco externo; a ação nativa correspondente não
  depende do modelo e nunca fica bloqueada pela ausência dele.

Ordem canónica dos blocos variáveis:

- `draws[]` aparece na **ordem de execução** dos sorteios (a mesma em que `draw` foi chamado).
  Dentro de cada stream, `index` é estritamente crescente e
  `index[k+1] = index[k] + words[k]`; `1 <= words <= 8` e `value < bound`. Ordem diferente é
  `InvalidDrawOrder`.
- `touched[]` é ordenado por `code` ascendente, sem repetição, com `position_before` igual à posição
  do stream antes do primeiro draw e `position_after` igual à posição depois do último; a diferença
  MUST igualar a soma de `words` dos draws daquele stream. Violação é `InvalidTouchedStreams`.
- `payload` de comando tem `payload_len = 162`; os blocos aparecem na ordem `draws`, `touched`,
  `payload`, `events`, `external`, com os comprimentos declarados.

### 5.3 Entradas externas normalizadas

Bloco externo fixo de **41 bytes** seguido de `candidate`:

| Offset | Campo | Tipo | Regra |
| --- | --- | --- | --- |
| 0 | `origin` | `u8` | `1` sidecar local, `2` humano. |
| 1 | `decision` | `u8` | `1` propor, `2` abster, `3` timeout. |
| 2 | `proposal_kind` | `u16` | `1..=8` quando propõe; `0` caso contrário. |
| 4 | `accepted` | `u8` | `0`/`1`; `1` só quando `decision = 1`. |
| 5 | `candidate_len` | `u32` | `162` quando há candidato; `0` caso contrário. |
| 9 | `raw_digest` | 32 bytes | BLAKE3-256 do texto bruto do modelo; não entra no estado. |
| 41 | `candidate` | `candidate_len` | Bytes de §5.2, quando presente. |

Regras:

- `kind = 2 MODEL_PROPOSAL`: `external_len = 41 + 162`, `candidate_len = 162`, `candidate` é
  byte-a-byte o payload de §5.2, `proposal_kind` é o `action_kind` do candidato, `command_kind`
  repete-o e `payload_len = 0`. `accepted = 1` significa que a aplicação aceitou o candidato; o
  replay não revalida a proposta, consome o candidato normalizado.
- `kind = 3 MODEL_TIMEOUT` e `kind = 4 MODEL_ABSTENTION`: `external_len = 41`, `candidate_len = 0`,
  `proposal_kind = 0`, `accepted = 0`, `decision` `3`/`2`, `payload_len = 0`; sem efeito e sem tick.
- `kind = 5 CANCELLATION`: `external_len = 0`, `payload_len = 162` com o comando cancelado,
  `outcome = 4`; nenhum efeito é desfeito.
- Uma entrada externa nunca promove cursor de RNG, nunca avança tick e nunca cria fato de mundo.
  Ela existe para que o replay reproduza a decisão sem chamar modelo, relógio ou configuração
  implícita.
- Se o log referencia uma resposta de modelo para uma ação que não a exigia, ou falta a resposta de
  uma ação que a exigia, o replay falha com `UnexpectedExternalInput`/`MissingExternalInput`.
- O texto bruto do modelo não entra no estado nem no hash; só o `raw_digest` e o candidato
  normalizado são registados. Prosa, tokens e latência não têm campo.

### 5.4 Ordem, tick e revisão

- `seq` é contíguo de `base_entry_seq + 1` a `base_entry_seq + entry_count`, sem buracos e sem
  repetição; qualquer outro caso é `OutOfOrder`. `seq` é absoluto no log do save, não relativo ao
  arquivo.
- `tick_before`/`tick_after` são não decrescentes; `tick_after` de uma entrada é igual a
  `tick_before` da seguinte. `tick_before` da primeira entrada é o tick do checkpoint.
- O cabeçalho MUST coincidir com o checkpoint usado: `checkpoint_revision` igual à revisão do
  checkpoint e `base_entry_seq` igual ao `entry_seq` do checkpoint; divergência é
  `CheckpointLogMismatch`.
- Entrada publicante (`flags.bit3 = 1`): `outcome` em `{1, 2}`, `cost_ticks >= 1`,
  `tick_after = tick_before + cost_ticks` e `revision_after = revision_before + 1`.
- Entrada não publicante: `outcome` em `{3, 4, 5, 6, 7}`, `cost_ticks = 0`,
  `tick_after = tick_before` e `revision_after = revision_before`.
- Os campos `hash_before`/`hash_after` formam uma cadeia: `hash_before` da entrada `n+1` é igual a
  `hash_after` da entrada `n`; o `hash_before` da primeira é o hash do checkpoint; o `hash_after`
  da última é o hash da cabeça durável. Quebra de cadeia é `HashChainMismatch`.
- `revision_after` do log MUST coincidir com a revisão da cabeça do catálogo; divergência é
  `DurabilityInconsistency` (§7.6).
- Não existe entrada “implícita”: agenda, rumores e chegadas não têm entradas próprias; são
  reproduzidos deterministicamente pelos ticks das entradas publicantes.

### 5.5 Replay completo e parcial

```rust
replay(checkpoint: Checkpoint, inputs: &[RecordedInput], contract: &SimulationContract)
    -> Result<ReplayOutcome, ReplayError>
replay_range(checkpoint: Checkpoint, inputs: &[RecordedInput], contract: &SimulationContract,
             stop_at_seq: u64) -> Result<ReplayOutcome, ReplayError>
```

- `Checkpoint` contém `revision`, `entry_seq`, `state_hash` e os bytes canónicos do estado; a seed
  vem da secção `REGION` do próprio estado. O `entry_seq` do checkpoint é a **cobertura de estado**
  da revisão (última entrada que alterou o estado); entradas não publicantes posteriores entram em
  `inputs` e são reproduzidas, mesmo que `head.entry_seq` seja maior.
- `RecordedInput` é a entrada `AFRL` descodificada; `inputs` é o segmento **relativo** ao
  checkpoint, com a primeira entrada em `checkpoint.entry_seq + 1`, e nunca inclui entradas já
  cobertas. Se o chamador passar um arquivo `AFRL`, o header MUST coincidir com o checkpoint
  (`base_entry_seq` e `checkpoint_revision`), senão `CheckpointLogMismatch`; o header não é
  reaplicado.
- `contract` é passado explicitamente e fixa versão, tabela de custos, constantes e limites.
  Nenhum dos dois é lido de ambiente.
- Replay completo consome todas as entradas de `inputs` e devolve o estado final, a revisão, a
  entrada final e o hash final; a cada entrada publicante compara o hash calculado com
  `hash_after`; a primeira divergência é `Divergence { seq, expected, actual }`. `inputs` vazio é
  um no-op válido que devolve o hash do checkpoint.
- Replay parcial começa obrigatoriamente em `checkpoint.entry_seq + 1` e termina em `stop_at_seq`;
  `stop_at_seq` MUST existir em `inputs`, MUST ser publicante e MUST ser `>=` à primeira entrada,
  senão `PartialBoundary`. O hash final do trecho é comparado com o `hash_after` dessa entrada.
- Trechos entre localidades são suportados porque o estado contém todas as localidades: um trecho
  que atravessa `L1 → L2` reproduz agenda, rumores e hash de `L1`, `L3` e `L4` mesmo sem foco.
- Replay do dry-run e de rejeições: as entradas não publicantes reproduzem o mesmo resultado e
  motivo, sem mudar hash; se o replay calcular um resultado diferente, é `Divergence`.
- `ReplayOutcome` proposto: `{ final_revision, final_entry_seq, final_hash, state: CanonicalBytes,
  entries_consumed, pendings: Vec<SemanticPending> }`; `SemanticPending` regista disparos de
  `SCHEDULED_MEETING` sem semântica ratificada (§3.3).

### 5.6 Rejeições do log e do replay

| Condição | Erro |
| --- | --- |
| `magic`, `version` ou `flags` inválidos | `UnknownVersion`/`InvalidHeader` |
| Ficheiro termina antes do rodapé | `Truncated` |
| Bytes depois do rodapé | `TrailingBytes` |
| `entry_len` ou tamanho calculado divergente | `EntryLengthMismatch` |
| `seq` fora de ordem, repetido ou com buraco | `OutOfOrder` |
| Header não coincide com o checkpoint (`base_entry_seq`/`checkpoint_revision`) | `CheckpointLogMismatch` |
| Arquivo de log sem entradas (`entry_count = 0`) | `EmptyLog` |
| `tick_after < tick_before` ou descontinuidade | `TickRegression` |
| `revision_after < revision_before` ou salto | `RevisionRegression` |
| `hash_before` diferente do `hash_after` anterior | `HashChainMismatch` |
| Primeiro `hash_before` diferente do checkpoint | `CheckpointHashMismatch` |
| `contract_version` diferente do contrato passado | `ContractVersionMismatch` |
| Entrada publicante sem custo ou revisão | `PublishedWithoutRevision` |
| Entrada não publicante com custo ou revisão | `NonPublishingCost` |
| `outcome`/`kind` desconhecido ou incoerente | `InvalidEntry`/`InvalidOutcome` |
| Falta entrada externa exigida | `MissingExternalInput` |
| Entrada externa não exigida | `UnexpectedExternalInput` |
| Hash calculado difere do gravado | `Divergence` |
| Paragem parcial em entrada não publicante | `PartialBoundary` |
| Seed ausente no checkpoint | `MissingSeed` |

Nenhum desses erros é tolerado, corrigido ou saltado. O replay devolve erro e não um resultado
parcial “quase igual”.

### 5.7 O que o replay não pode fazer

- Chamar modelo, sidecar, LLM ou qualquer inferência; a resposta já está normalizada no log.
- Ler relógio, ambiente, locale, fuso, arquivo de configuração, fixture padrão ou banco externo.
- Reconstruir uma decisão a partir de prosa nova, de cache de NLG ou de histórico de UI.
- Reinterpretar um schema desconhecido ou ignorar campos que não conhece.
- Corrigir um hash divergente, “reparar” uma cadeia quebrada ou completar uma entrada truncada.
- Consumir RNG fora da ordem registada ou promover cursor por leitura.

O replay é reprodução, não re-simulação criativa: mesmo checkpoint, mesmas entradas, mesmo contrato
⇒ mesmo hash, em Windows e Linux.

### 5.8 Prova de hash por entrada

- Cada entrada publicante é verificada contra o hash gravado; o replay não “confia” no log.
- Duas execuções do mesmo replay produzem o mesmo `ReplayOutcome` e o mesmo hash final.
- O log exportado é determinístico: os mesmos bytes de entrada produzem o mesmo `digest` de rodapé.
- Um log reexportado depois de `sync` do catálogo mantém `entry_count`, `digest` e a cadeia; a
  exportação não reescreve entradas.
- A prova de aceite compara o hash do replay com o hash da cabeça durável e com o golden capturado
  por `CORE-01`/`CORE-02` depois do freeze; nenhum valor é afirmado neste documento.

## 6. Snapshot, canonicalização e hash

### 6.1 O que entra no estado canónico

O estado canónico segue o envelope `AFCS` v2 do CTR-01: `magic`, `version`, `body_len`, `region_id`,
`tick` e as 11 secções na ordem das tags. Este contrato confirma que **entra no hash**:

| Tag | Secção | Conteúdo |
| --- | --- | --- |
| 1 | `REGION` | Limites, `Seed(u64)`, `generator_version`, `RegionId` e `spec_digest` (dona `CTR-03`; derivação referenciada, não redefinida — `P-09`). |
| 2 | `LOCALITIES` | Identidades e estado das localidades (dona `CTR-03`). |
| 3 | `STRUCTURES` | Estruturas e ocupação estrutural (dona `CTR-03`). |
| 4 | `BLOCKS` | Blocos por `(LocationId, z, y, x)` (dona `CTR-03`). |
| 5 | `ACTORS` | Presença, posição, vivo, moeda e plano de viagem (§6.2). |
| 6 | `ITEMS` | Itens e posse (dona `CTR-01`). |
| 7 | `RELATIONSHIPS` | Relações por `(source, target, axis)` (dona `CTR-01`). |
| 8 | `RUMORS` | Rumores e cópias (layout `CTR-01`; semântica `SOC-02`/`SOC-03`). |
| 9 | `AGENDA` | Entradas `(due_tick, seq)` (§3.2). |
| 10 | `RNG` | Posições das quatro streams (§4.8). |
| 11 | `LABELS` | Labels persistentes `(source, target, label, attached_tick)` (dona `CTR-01`). |

Regra geral: **se altera uma decisão do núcleo ou é lido por uma regra, ou está no estado e no
hash, ou é configuração imutável fixada por versão de contrato**. Não existe terceira categoria.
Identidade, unidades inteiras, região, atores, agenda, RNG, relações, labels, rumores e itens
entram; memória e genomas futuros ainda não têm secção (§6.6) e são pendência declarada, não
omissão silenciosa.

### 6.2 Secção canónica `ACTORS` (tag 5)

O CTR-01 fixa o prefixo `count u32` + `ActorId` ordenados. Este contrato acrescenta, após o
prefixo e na mesma ordem, um registo por ator (o `actor_id` não é repetido no registo; a posição
na lista é a identidade):

```text
count u32
actor_id u64[count]              (prefixo CTR-01; kind ACTOR; ascendente; único)
record[count]:
  flags u8                       (bit0 vivo, bit1 em trânsito, bit2 jogador; bits 3..7 MUST 0)
  locality u64                   (0 se e só se em trânsito)
  x i32
  y i32
  z i16
  wallet u32                     (CurrencyAmount; 0..=10_000)
  travel_len u32                 (0 = sem plano; 1 = plano ativo)
  travel[travel_len]:
    departure_tick u64
    arrival_tick u64
    destination_locality u64
    arrival_gate u64             (GateId kind 6)
    route_len u16                (1..=MAX_TRAVEL_EDGES)
    route_edges u64[route_len]
```

Validação de `ACTORS`:

- Cada `actor_id` MUST ser `EntityId` de kind `ACTOR` não nulo; a lista é estritamente ascendente
  e sem repetição; duplicata é `DuplicateCanonicalKey`, ordem errada é `CanonicalOrderViolation`.
- `flags` com bits 3..7 diferentes de zero é `InvalidActor`. No máximo um ator com `bit2`
  (jogador) por save; dois ou mais é `InvalidActor`. Zero é válido para fixtures sem jogador, mas
  um save de sessão de jogo normal tem exatamente um.
- `bit0` (vivo) desligado implica `bit1` desligado: um ator morto não pode estar em trânsito.
- `bit1` (em trânsito) ligado exige `locality = 0`, `x = y = z = 0` e `travel_len = 1`; o plano
  MUST ter `arrival_tick > departure_tick`, `destination_locality` existente, `arrival_gate`
  existente, `route_len` em `1..=MAX_TRAVEL_EDGES` e `route_edges` existentes ordenados.
- `bit1` desligado exige `locality` existente e não nula, posição dentro dos limites da região
  (validada por `CTR-03`) e `travel_len = 0`.
- `wallet` MUST estar em `0..=10_000` (`CurrencyAmount`). `TRANSFER_CURRENCY` bem-sucedido conserva
  a soma das carteiras, exige `amount` em `1..=10_000`, `source`/`target` distintos, existentes,
  vivos e com saldo suficiente na origem; se o destino exceder `10_000`, a ação é rejeitada em vez
  de saturar em silêncio. Violação é `CurrencyInvariantViolated` e rejeita a ação inteira.
  Transferência de `0` não emite efeito.
- O ator morto permanece no estado com `bit0` desligado (o save não o apaga) e não pode agir nem
  ser alvo social; a morte não é um sistema desta sessão (§9.1).
- HP, atributos, memória, ordem de inventário, estado de FSM e moedas em itens **não** entram neste
  payload v1; são pendências `P-04`/`P-07`/`P-08` (§9.2). A ausência de HP é deliberada: não há
  combate no recorte e o único predicado social necessário é “vivo”.
- A secção inteira é ordenada por `ActorId`; não há ordem de inserção, de `HashMap` ou de
  compilação. Um ator em trânsito continua na lista e no hash.

### 6.3 O que fica fora do estado e do hash

| Excluído | Motivo |
| --- | --- |
| `Instant`, `SystemTime`, relógio de parede, FPS, latência, tempo de inferência | Não decidem o mundo; D-02. |
| Câmera, foco, zoom, viewport, `z` exibido, painel, layout e seleção de UI | Apresentação; D-04/D-07. |
| Texto de NLG, prompt, cache de narrativa, locale, fuso, áudio | Leitura lazy; não é fato nem estado. |
| Métricas, tracing, logs de diagnóstico, contadores, tempo de CPU | Diagnóstico; não afetam decisões. |
| Ordem de `HashMap`/`HashSet`, endereços, `usize`, nomes e caminhos de arquivo | Não determinístico ou dependente do host. |
| Saúde, PID, porta e estado de rede do sidecar | Fora do núcleo; porta de adaptador. |
| Caminho, permissões, tamanho e data do save | Armazenamento, não simulação. |
| Texto bruto do modelo | Dado não confiável; só o digest e a decisão normalizada são registados. |
| Fila de mensagens, locks, threads, buffers e estado de I/O | Runtime, não estado. |

A exclusão é por contrato explícito, nunca por “o campo não parece importante”. Uma métrica
volátil que apareça no golden é bug de golden, não feature de observabilidade.

### 6.4 Hash BLAKE3, goldens e dados voláteis

- `state_hash` é BLAKE3-256 dos bytes exatos produzidos por `canonical_state`, incluindo `magic`,
  `version`, `body_len` e todo o corpo; não é hash de `Debug`, de JSON, de uma struct em memória ou
  de um subconjunto de campos.
- O hash é regional: cobre todas as localidades, todos os atores (inclusive em trânsito), todas as
  agendas e todos os rumores, independentemente de foco, câmera ou viewport.
- O hash MUST ser idêntico em Windows e Linux, em processos distintos, com a mesma seed, as mesmas
  entradas e a mesma versão de contrato.
- Nenhum valor de hash é afirmado neste documento. Os goldens de estado e de replay são capturados
  por `CORE-01`/`CORE-02`/`STORE-01` depois do freeze e guardados como vetores versionados; um
  golden inclui estado, hash, tick, revisão e entradas, nunca tempo, caminho ou ambiente.
- Dados voláteis (diretório temporário, timestamps de arquivo, ordem de `read_dir`, identidade de
  processo, mensagens de erro de SO) MUST NOT participar do golden nem do hash.
- O golden de replay inclui o `digest` do log e o hash final; um golden que dependa de locale ou de
  versão de compilador é inválido.

### 6.5 Idempotência, ida e volta e repetição

- `canonical_state` é determinístico: o mesmo estado semântico produz os mesmos bytes,
  independentemente da ordem de inserção nas coleções.
- `decode_canonical(canonical_state(state))` devolve um estado equivalente, e re-canonicalizar
  produz os mesmos bytes.
- `state_hash` só aceita bytes canónicos; não recanonicaliza nem valida semanticamente.
- Salvar a mesma revisão duas vezes é idempotente e devolve o mesmo recibo; o conteúdo do save não
  muda.
- Replay do mesmo checkpoint com o mesmo log produz o mesmo `ReplayOutcome`, o mesmo hash e a mesma
  contagem de entradas.
- Um `load` seguido de `save` da mesma revisão não cria revisão nova, não muda `seq` da agenda
  e não reordena o log.

### 6.6 Memória, atributos e genomas futuros

- O envelope v2 do CTR-01 não tem secção de memória, de atributos de ator nem de genoma. Este
  contrato não inventa tags nem campos: a ausência é declarada e registada em §9.2 (`P-04`,
  `P-07`, `P-08`).
- Enquanto não existir secção canónica, memória, atributos e genomas MUST NOT ser gravados como se
  fossem estado: um save que os inclua fora do envelope é inválido, e um replay que os leia de
  fonte externa viola §5.7.
- O bridge temporário admitido é a configuração imutável do `SimulationContract`: atributos usados
  por fórmulas sociais podem ser constantes de fixture pinadas por versão de contrato, registadas
  no cabeçalho `AFRL`; elas não evoluem em jogo e não substituem estado por ator.
- Quando um contrato futuro introduzir essas secções, ele MUST incrementar a versão do envelope,
  incluir os campos no hash, definir migração forward-only e provar replay. Até lá, `BEH-01` e
  qualquer cartão de MLP/genética não podem depender de persistência de memória ou de genoma.

## 7. Durabilidade e autoridade (`INT-10`)

### 7.1 Autoridade durável

A autoridade é **dupla e verificada**, não repartida por conveniência:

- O **snapshot AIFS** é a autoridade dos **bytes canónicos do estado** de uma revisão: um arquivo
  imutável, nomeado pelo conteúdo, verificado por hash.
- O **catálogo SQLite em WAL** é a autoridade da **ordem**: revisão corrente (`head`), cadeia de
  entradas do log `AFRL`, recibos idempotentes e metadados de save.
- Uma revisão só é **durável** quando o arquivo AIFS existe, tem o `state_hash` esperado e o
  catálogo tem a linha correspondente com o mesmo hash, a mesma revisão e o mesmo `entry_seq`.
  Nenhum dos dois isoladamente autoriza um ACK.
- O log `AFRL` vive no catálogo (uma linha por entrada, blob canónico) e é a autoridade do replay;
  o arquivo exportado é uma cópia verificável, não a autoridade viva.
- É proibido “reparar” a divergência entre AIFS e catálogo por inferência: divergência é
  `DurabilityInconsistency` e bloqueia o início da sessão até recuperação explícita (§7.6).
- O estado em memória nunca é autoridade; depois de um crash, a única verdade é o par
  AIFS + catálogo da última revisão íntegra.

### 7.2 Formato AIFS

Cabeçalho fixo de 64 bytes, seguido do estado canónico `AFCS`:

| Offset | Campo | Tipo | v1 | Semântica |
| --- | --- | --- | --- | --- |
| 0 | `magic` | 4 bytes | `AIFS` | `41 49 46 53`. |
| 4 | `version` | `u8` | `1` | Versão do snapshot. |
| 5 | `flags` | `u8` | `0` | Reservado; MUST zero. |
| 6 | `reserved` | `u16` | `0` | MUST zero. |
| 8 | `revision` | `u64` | `>= 1` | Revisão da qual este estado é o resultado. |
| 16 | `state_len` | `u64` | variável | Comprimento exato do estado canónico. |
| 24 | `state_hash` | 32 bytes | BLAKE3-256 | Hash do estado que segue. |
| 56 | `entry_seq` | `u64` | variável | Última entrada que alterou este estado (cobertura de estado da revisão). Entradas não publicantes posteriores não mudam este valor. |

- O arquivo é `header || state`; `state_len` é exato e não há padding, cauda ou campo extra.
- O nome do arquivo é `r<revision>-<state_hash hexadecimal>.aifs`, no diretório
  `<save_root>/<save_id>/revisions/`. O nome é derivado do conteúdo, não escolhido por humano.
- `state_hash` MUST coincidir com `state_hash(canonical_state(state))`; um arquivo cujo hash não
  coincide é `HashMismatch` e nunca é carregado.
- No load, o cabeçalho MUST ser validado contra a linha do catálogo e o nome do arquivo. Isto é,
  `header.revision` igual a `row.revision`, `header.entry_seq` igual ao `row.entry_seq` de
  **cobertura de estado** e o nome igual a `r<revision>-<state_hash hexadecimal>.aifs`; qualquer
  divergência é `DurabilityInconsistency`, e um hash divergente é `HashMismatch`. `row.entry_seq`
  não é `head.entry_seq`: uma entrada não publicante posterior avança `head.entry_seq` sem mudar o
  estado nem o `entry_seq` da revisão. Não há load “por nome” que ignore o cabeçalho.
- `version > 1` é `FutureSchema`: o arquivo é preservado e recusado; nunca é sobrescrito,
  renomeado ou “downgraded”.
- Arquivos AIFS são imutáveis. Uma revisão nova é um arquivo novo; não se edita um arquivo
  publicado.

### 7.3 Protocolo de commit

O adaptador abre o catálogo com `journal_mode = WAL` e `synchronous = FULL` e verifica o `PRAGMA`
efetivo; uma configuração diferente é `DurabilityConfigInvalid` e bloqueia o save, sem confiar no
default do sistema. O commit de uma revisão publicante segue então esta ordem; qualquer passo pode
falhar e nenhum passo posterior pode “compensar” os anteriores:

1. Canonicalizar o estado candidato e calcular `state_hash`; verificar invariantes antes de tocar
   no disco.
2. Ler `head` do catálogo; calcular `revision = head.revision + 1` e `entry_seq = head.entry_seq + 1`.
   Se `(save_id, revision)` já existir com o mesmo `state_hash`, devolver o recibo existente
   (idempotência); com hash diferente, `RevisionConflict`.
3. Escrever `header || state` num arquivo temporário no **mesmo diretório** de destino, com nome
   único `r<revision>-<hash>.tmp-<nonce>`, e chamar `sync_all` no arquivo.
4. Reabrir o temporário (ou ler o buffer) e verificar `state_len`, magic e `state_hash`; falha é
   `HashMismatch` e o temporário é descartado.
5. Publicar com semântica **no-clobber**: se o nome final já existir, verificar que os bytes são
   idênticos e descartar o temporário; se não existir, renomear de forma atómica ou usar
   `link` + `unlink`; nunca substituir um arquivo diferente. Publicação parcial é `PartialPublish`.
6. `fsync` do diretório de revisões.
7. Abrir transação `BEGIN IMMEDIATE` no catálogo; inserir a linha de revisão
   `(save_id, revision, state_hash, entry_seq, file_size)`; inserir a entrada `AFRL` em
   `log_entries`; inserir o recibo no índice durável
   `receipts(save_id, intent_id) -> (revision, entry_seq, state_hash, outcome, cost_ticks,
   receipt_digest)`, ou o recibo não publicante correspondente; atualizar `head` com
   compare-and-swap sobre `(revision, entry_seq)` anteriores. Zero linhas afetadas no CAS é
   `RevisionConflict` (escritor concorrente). Revisão, entrada, recibo e `head` são gravados na
   **mesma** transação: um crash em qualquer ponto faz rollback dos quatro juntos.
8. `COMMIT`. O retorno do `COMMIT` é a condição de durabilidade do registro, não um `flush`
   explícito posterior.
9. Devolver `CommitReceipt { save_id, revision, state_hash, entry_seq, file_size }`.
10. Só depois de 9 o app pode emitir ACK ao jogador (§7.4).

Entradas não publicantes (rejeição, cancelamento, obsolescência, resposta tardia, dry-run) seguem
o mesmo protocolo nos passos 7–9, sem arquivo AIFS novo: inserem a entrada `AFRL` e o recibo
correspondente no índice, e atualizam `head.entry_seq`, mantendo `revision` e `state_hash`. O ACK de
uma recusa também só existe depois de a entrada e o recibo estarem duráveis; se a gravação falhar,
o app reporta `RESULTADO_NAO_DURAVEL` e a intenção pode ser repetida de forma idempotente.

### 7.4 ACK ao jogador

- `ActionReceipt` só pode conter `durability = Acked { revision, state_hash, entry_seq }` quando o
  `CommitReceipt` correspondente foi devolvido e o `head` do catálogo o confirma.
- `FALHA_DE_DURABILIDADE` é devolvida quando a abertura (`DurabilityConfigInvalid`) ou o `COMMIT`
  (passo 8) falham: o mundo em memória é descartado, nenhum ACK é emitido e o retry com a mesma
  `intent_id` é idempotente.
- Um recibo de rejeição/cancelamento/obsolescência/timeout é durável apenas como entrada de log; ele
  nunca afirma mudança de estado, tick ou RNG.
- O ACK nunca é enviado “otimisticamente” antes do commit; uma UI que mostre o efeito antes do ACK
  MUST marcá-lo como provisório e reconciliar com o recibo durável.
- Depois de um restart, o app compara o `head` com os recibos guardados: se `head.revision` for
  menor que a revisão de um recibo entregue, o efeito **não é durável** e o recibo não pode ser
  reapresentado como fato. O app informa a perda e parte do `head` real (§8.4).

### 7.5 Recuperação por etapa de crash

| Crash em | O que pode estar incompleto | Estado visível após reinício | Recuperação | Invariante |
| --- | --- | --- | --- | --- |
| Escrita do temporário | arquivo `.tmp-*` parcial | `head` antigo | apagar temporários não referenciados; nenhum load | Nenhuma revisão publicada. |
| `sync_all` do temporário | bytes possivelmente não duráveis | `head` antigo | descartar temporário | Nenhum ACK foi emitido. |
| Rename/publicação | arquivo final pode ou não existir | `head` antigo | arquivo não referenciado é órfão; nunca é promovido a `head` | Publicação sem catálogo não é commit. |
| `fsync` do diretório | entrada de diretório pode perder-se | `head` antigo | idem; órfão é coletado | Commit exige catálogo. |
| Transação do catálogo | transação pendente | SQLite faz rollback/replay do WAL | abrir e verificar `head` | `head` só avança com transação completa. |
| `COMMIT` (antes do retorno) | estado durável ou não, incerto | `head` pode já ser novo | `load` verifica AIFS + log + hash; retry devolve recibo idempotente | Nenhum efeito duplicado. |
| Depois do `COMMIT`, antes do ACK | estado durável, ACK perdido | `head` novo | retry com a mesma `intent_id` devolve o recibo existente | ACK idempotente, ticks/RNG não repetidos. |
| ACK entregue, crash posterior | nada pendente | `head` novo | arranque normal | Último estado durável preservado. |
| Queda de energia com `synchronous=FULL` | WAL pode ter transação completa ou não | `head` antigo ou novo, nunca meio | SQLite recupera; `load` verifica | Sem estado parcial observável. |
| Corrupção do AIFS ou do catálogo | arquivo/linha inválidos | detectado no `load` | fallback para revisão anterior íntegra (§7.6) | Último estado íntegro preservado. |

Regras transversais: um arquivo AIFS sem linha de catálogo nunca é `head`; uma linha de catálogo
sem arquivo válido nunca é carregada; o último estado durável é sempre a maior revisão íntegra
cuja linha e arquivo concordam.

### 7.6 Procedimento de recuperação

1. Abrir o catálogo e executar `PRAGMA integrity_check`; falha é `CatalogCorrupt` e leva ao backup
   mais recente (§7.7), sem apagar o catálogo corrompido.
2. Ler `head`; verificar a linha correspondente, o arquivo AIFS, o tamanho, o magic, a versão, o
   `state_hash` e a coincidência de `header.revision`/`header.entry_seq` com a linha de **cobertura
   de estado** e com o nome do arquivo (§7.2); verificar que a última entrada `AFRL` tem
   `seq = head.entry_seq` e `hash_after = head.state_hash` (entradas não publicantes preservam o
   hash, portanto a cadeia continua válida). Qualquer divergência é `DurabilityInconsistency` ou
   `HashMismatch`, nunca um load parcial.
3. Se a cabeça falhar, percorrer revisões anteriores por ordem decrescente até encontrar uma
   revisão íntegra; devolver `RecoveredToPreviousRevision { skipped: Vec<u64> }` e iniciar a sessão
   nessa revisão. O app MUST informar o jogador que os efeitos das revisões ignoradas não são
   duráveis; nunca os reapresenta como fato.
4. Se nenhuma revisão for íntegra, devolver `NoDurableState`; iniciar um save novo exige ação
   explícita do jogador e nunca sobrescreve o save existente.
5. Se o catálogo estiver íntegro mas o log tiver buraco, revisão invertida ou hash de cadeia
   quebrado, devolver `DurabilityInconsistency` e não iniciar a sessão sobre esse par.
6. Se um arquivo AIFS tiver `version` futura, devolver `FutureSchema` e preservar o arquivo; não há
   downgrade nem reescrita.
7. Temporários e arquivos não referenciados por nenhuma linha são coletados após a recuperação,
   com registo da contagem; nunca se apaga a revisão de `head`, a revisão anterior de fallback ou
   qualquer arquivo referenciado pelo log.
8. A recuperação é somente leitura até o ponto 3/4; a primeira escrita após recuperação cria uma
   revisão nova, nunca reescreve a antiga.

### 7.7 Backup, rotação e WAL

- Nunca renomear, mover ou copiar `-wal`/`-shm` de um banco aberto como se fossem arquivos comuns.
  Um backup usa a API de backup online do SQLite (ou `VACUUM INTO`) para um arquivo novo, depois de
  `PRAGMA wal_checkpoint(TRUNCATE)` quando o checkpoint for permitido.
- O backup copia o catálogo consistente e todos os arquivos AIFS referenciados, verifica cada hash e
  grava um `manifest.json` com `save_id`, `head`, `entry_seq`, lista de arquivos, tamanhos e hashes.
  O manifesto é metadado de backup, não estado: timestamps e caminhos não entram no hash do jogo.
- Rotação: manter as **três** cópias verificadas mais recentes e nunca apagar a única cópia
  verificada da cabeça. Uma cópia só é apagada depois de a mais nova ter sido verificada por
  rehash completo do manifesto; se a verificação falhar, abortar a rotação e preservar tudo.
- Restauro: para um diretório novo, verificado antes de abrir; nunca por cima de um save
  corrompido ou futuro sem preservar o original. Depois do restauro, o `load` normal (§7.6) valida
  AIFS + log + hash.
- Um backup que não tenha sido verificado não é “backup”: é candidato a lixo. A verificação é
  obrigatória antes de qualquer remoção.

### 7.8 `SaveStore`, `EventSink` e erros tipados

```rust
SaveStore::save(revision: &SaveRevision) -> Result<CommitReceipt, StoreError>
SaveStore::load(id: SaveId) -> Result<Checkpoint, StoreError>
SaveStore::load_log(id: SaveId, from_seq: u64) -> Result<Vec<LogEntry>, StoreError>
EventSink::append(batch: &EventBatch) -> Result<EventBatchAck, StoreError>
migrate_snapshot(snapshot: StoredSnapshot, target: SaveSchemaVersion)
    -> Result<StoredSnapshot, StoreError>
```

`save`, `load` e `migrate_snapshot` são as assinaturas propostas pelo cartão `INT-10`. `load_log` e
`EventSink::append` são extensões propostas desta fronteira para consumo de `INT-06`/`INT-17`; não
substituem nem renomeiam as assinaturas aprovadas e ficam sujeitas ao freeze.

- `SaveRevision` contém `save_id`, `revision`, `state_hash`, `entry_seq`, `state: CanonicalBytes` e
  `contract_version`. O store calcula e verifica o hash; não confia no chamador.
- `Checkpoint` contém `save_id`, `revision`, `entry_seq`, `state_hash`, `state` e o caminho lógico
  do arquivo; não contém `Instant`, caminho absoluto dependente de host ou configuração implícita.
  `load` devolve o `entry_seq` da **cobertura de estado** (o mesmo do cabeçalho AIFS e da linha da
  revisão) e `state_hash` da revisão; as entradas não publicantes posteriores são lidas por
  `load_log(checkpoint.entry_seq + 1)` e entram no replay. `head.entry_seq` é a última entrada
  durável do log e pode ser maior; não é confundido com a cobertura de estado.
- `EventSink` regista eventos de domínio opacos no mesmo catálogo, com `batch_seq` e `digest`;
  `EventBatchAck { first_seq, last_seq, digest, revision }` é idempotente por
  `(save_id, revision, batch_seq)`.
- Erros propostos e semântica:

| Erro | Quando | Retry |
| --- | --- | --- |
| `IoTransient { stage }` | falha de I/O potencialmente passageira | sim, com backoff e mesma `intent_id`. |
| `LockTimeout { resource }` | contenção de catálogo/WAL | sim, com backoff. |
| `DiskFull`/`PermissionDenied` | recurso indisponível | não antes de intervenção. |
| `HashMismatch { expected, actual }` | AIFS ou estado inconsistente | não; requer recuperação. |
| `CorruptSnapshot { reason }` | magic/versão/tamanho inválidos | não; fallback (§7.6). |
| `FutureSchema { found }` | versão acima da suportada | não; preservar. |
| `UnsupportedMigration { from, to }` | migração proibida | não. |
| `RevisionConflict { expected, found }` | CAS de `head` perdeu | sim, após revalidar stale. |
| `DurabilityInconsistency { expected, found }` | AIFS/catálogo/log divergem | não; recuperação explícita. |
| `DurabilityConfigInvalid { pragma }` | `synchronous`/WAL não efetivos | não; corrigir abertura. |
| `PartialPublish { path }` | publicação não atómica | não; recuperação. |
| `LogTruncated`/`OutOfOrder` | log inválido | não. |
| `NoDurableState` | nenhuma revisão íntegra | não; requer decisão do jogador. |
| `MigrationRefused { reason }` | migração não preserva IDs/agenda/fatos | não. |

- Erros são valores (`thiserror`), nunca `panic`/`unwrap` em biblioteca; `anyhow` fica em
  `af-app`/binários. A classificação `is_retryable()` é explícita e o retry nunca mascara erro
  permanente.
- Idempotência: `save` da mesma `(save_id, revision, state_hash)` devolve o mesmo
  `CommitReceipt`; `append` do mesmo `(revision, batch_seq)` devolve o mesmo `EventBatchAck`;
  `execute` da mesma `intent_id` devolve o mesmo `ActionReceipt`. Repetir um save após ACK perdido
  não cria revisão nova nem grava entrada duplicada.

### 7.9 Schema e migração

- `SaveSchemaVersion` é versionado e gravado no catálogo e no cabeçalho de metadados de save.
- Migração é **forward-only**: `migrate_snapshot` recusa `target` menor ou igual à versão atual
  (`UnsupportedMigration`), preserva IDs, agenda, fatos, labels e rumores, e produz uma revisão
  nova; nunca reescreve o original nem o arquivo futuro.
- Se a migração falhar a meio, o original permanece intacto e nenhuma revisão parcial é publicada.
- O original corrompido é preservado como evidência, não apagado nem sobrescrito; o restauro usa
  cópia, não mutação in-place.
- Um save de versão futura nunca é aberto por engano; a mensagem é `FutureSchema` e o arquivo fica
  disponível para uma versão mais nova.
- O schema do log `AFRL` e o `SaveSchemaVersion` são independentes: um log v1 pode ser lido por um
  contrato v1 mesmo que o save migre de schema dentro da mesma família, desde que o envelope do
  estado e o hash continuem verificáveis.

## 8. Passo autoritativo (`INT-05`) e composição (`INT-17`)

### 8.1 `step` — passo puro

```rust
step(world: WorldState, command: ResolvedCommand, context: SimContext)
    -> Result<StepOutcome, CoreError>
```

- `step` é **puro**: não lê arquivo, rede, ambiente, relógio, locale, modelo, UI ou telemetria; não
  grava, não publica e não chama `SaveStore`/`EventSink`. Toda a dependência externa entra por
  `SimContext`/`command` ou já está no estado.
- `SimContext` contém a configuração imutável e versionada: `SimulationContract` (versão, tabela de
  custos, constantes e limites), regras e geometria já resolvidas. Não contém closures, sinks,
  `Instant`, caminho de arquivo ou credencial.
- `StepOutcome` proposto: `{ next: WorldState, events: Vec<DomainEvent>, draws: Vec<RecordedDraw>,
  ticks_advanced: u32, hash: StateHash }`. Os eventos seguem a ordem de sistemas e de ator; os
  sorteios registados são exatamente os promovidos.
- Pré-condições: `command.revision_base` igual à revisão do mundo (senão `StaleCommand`); custo
  recomputado igual ao declarado (senão `CostMismatch`); ator presente e vivo; nenhum plano de
  viagem incompatível; nenhuma entrada de agenda inconsistente.
- Atomicidade: qualquer erro devolve `CoreError` e **não** devolve `next`, eventos parciais ou
  cursores promovidos. O chamador mantém o mundo original.
- Invariantes verificados antes do retorno: cardinalidade e ordem das secções, unicidade de IDs,
  conservação de moeda, agenda sem entradas duplicadas ou vencidas, RNG monotônico, tick não
  regressivo e hash calculável. Violação é `InvariantViolated`, nunca correção silenciosa.
- O passo é determinístico: mesmo `world`, mesmo `command` e mesmo `context` produzem o mesmo
  `next`, os mesmos eventos, os mesmos sorteios e o mesmo hash, em 100 execuções e entre
  plataformas.
- `step` não publica efeito: publicar é responsabilidade de `execute`/`SaveStore` (§7.3). Um
  `step` bem-sucedido e não publicado não é fato durável.

### 8.2 `execute` — composição e recibo

```rust
execute(services: &mut AppServices, intent: PlayerIntent) -> Result<ActionReceipt, AppError>
```

Pipeline obrigatório, nesta ordem:

1. **Idempotência:** procurar `intent_id` no índice durável de recibos; se existir, devolver o
   `ActionReceipt` gravado sem reexecutar, sem cobrar tick e sem consumir RNG. O índice cobre
   entradas publicantes, recusas e cancelamentos; prévias de dry-run usam `preview_id` e não
   reservam `intent_id`.
2. **Snapshot:** ler o `head` durável e o `Checkpoint` correspondente; nenhum passo usa estado em
   memória não confirmado por `head`.
3. **Resolução:** `resolve_native(intent, facts)` de `INT-04`; erro de resolução vira recusa
   tipada, sem tick e sem RNG.
4. **Revalidação:** comparar `client_revision` com `head.revision`; divergência aciona uma única
   revalidação (§8.3).
5. **Passo:** `step` em memória sobre o checkpoint; erro não publica nada.
6. **Canonicalização e hash:** `canonical_state` + `state_hash` do candidato.
7. **Commit durável:** `SaveStore::save` com o protocolo de §7.3, incluindo a entrada `AFRL` na
   mesma transação quando publicante; rejeições/cancelamentos/timeouts gravam entrada não
   publicante em transação própria.
8. **ACK:** construir `ActionReceipt` com `durability = Acked { revision, state_hash, entry_seq }`
   só depois do `CommitReceipt`; devolver ao chamador.

`AppServices` contém as portas injetadas (`SaveStore`, `EventSink`, `SystemOnePort`/`LlmPort`
opcionais e `Clock` apenas para UI/log, nunca para decisão). `execute` não calcula regra de mundo:
ele compõe resolução, passo e durabilidade.

`ActionReceipt` proposto:

| Campo | Semântica |
| --- | --- |
| `intent_id` | chave de idempotência; única por save. |
| `kind` | ação resolvida; `0` para recusa sem ação. |
| `outcome` | `1..=7` de §2.4; nunca `FALHA_DE_DURABILIDADE`. |
| `reason` | motivo tipado de recusa/cancelamento/limite; `0` se não aplicável. |
| `cost_ticks` | custo aplicado; `0` nos resultados não publicantes. |
| `tick_before`/`tick_after` | intervalo lógico efetivo. |
| `revision_before`/`revision_after` | revisões duráveis antes/depois. |
| `state_hash` | hash durável depois; igual a `hash_after` da entrada. |
| `entry_seq` | última entrada `AFRL` coberta. |
| `durability` | `Acked { revision, state_hash, entry_seq }`, `RejectedDurable` para recusas gravadas ou `NotDurable(StoreError)`. |
| `draws` | resumo dos sorteios (stream, domain, index, value, words); vazio em dry-run com `position_before == position_after`. |
| `events_digest` | BLAKE3 dos bytes de eventos; layout dos eventos é `P-05`. |
| `preview` | custo/sorteios/efeitos previstos apenas em `DRY_RUN`; `None` nos demais. |

### 8.3 Stale, cancelamento e timeout

- **Stale:** se `client_revision` divergir do `head`, o app revalida uma vez com fatos atualizados e
  pode reexecutar a intenção uma única vez. Se a revisão mudar de novo, devolve `OBSOLETA`: 0 tick,
  0 RNG, estado inalterado, entrada não publicante. Não há segunda revalidação nem laço.
- **Cancelamento:** o app aceita cancelamento apenas antes do commit. Depois do `CommitReceipt`, o
  cancelamento é `CANCEL_TOO_LATE` e não desfaz o fato; a UI MUST NOT sugerir que desfez.
- **Timeout/abstenção:** a entrada externa normalizada é gravada e o `ActionReceipt` correspondente
  tem `outcome = 6`, `cost_ticks = 0` e `durability` da entrada; a ação nativa continua disponível
  e não depende do modelo.
- **Erro de I/O/durabilidade:** devolve `AppError::Durability(StoreError)`; nenhum ACK, nenhum
  estado em memória promovido. O retry é idempotente pela `intent_id` e não cobra tick/RNG
  adicionais.
- **Erro de invariante:** `AppError::Core(CoreError::InvariantViolated)`; nada é publicado e o
  defeito é reportado, não mascarado.

### 8.4 Recibo, restart e idempotência

- O índice de recibos é durável e gravado na mesma transação da entrada `AFRL`; um recibo entregue
  é recuperável depois do restart.
- Depois do restart, o app compara o `head` com o índice: se `head.revision` for menor que a
  revisão de um recibo, o efeito não é durável; o recibo é invalidado e o app informa a perda.
  Nunca se apresenta como fato um efeito que o `head` não contém.
- A `base_view` lê somente o `head` durável; não existe leitura de estado “otimista” depois de um
  restart.
- Repetir `execute` com a mesma `intent_id` devolve exatamente o mesmo recibo, sem duplicar efeito,
  tick, RNG, entrada de log ou evento.
- **Não publicar efeito perdido:** se o processo cair entre o commit e o ACK, o efeito está
  durável e o retry devolve o recibo; se cair antes do commit, não há efeito e o retry reexecuta
  do zero com o mesmo resultado determinístico. Os dois casos são distinguíveis pelo `head` e pelo
  índice, nunca por heurística de UI.

### 8.5 `base_view` — projeção de leitura

- `base_view(state: &AppState) -> BaseReadView` produz uma projeção limitada e somente leitura do
  estado durável para a TUI/cliente; não é autoridade, não é entrada do `step` e não entra no hash.
- A projeção pode escolher o que mostrar por foco, câmera, viewport ou painel; essa escolha é
  apresentação e MUST NOT selecionar entidades, atividade, agenda, RNG ou permissão.
- `BaseReadView` não contém overlay privilegiado, memória de ambiente ou conhecimento que o
  personagem não testemunhou; quem precisar desses dados usa os cartões de percepção/overlay, não
  esta projeção.
- Uma projeção calculada a partir de um estado não durável MUST ostentar o marcador de
  provisionalidade e ser reconciliada com o `head`; nunca é apresentada como recibo.
- `base_view` é pura em relação ao estado: não muta, não promove cursor, não grava cache no estado e
  não altera o hash.

## 9. Fronteiras e pendências herdadas

### 9.1 O que este contrato não define

- Os **valores de produto** dos custos, da cadência, dos limites de rumor e da escala de tempo:
  são do DOC-02 e da ratificação `PD-01`…`PD-09`. Este contrato só os referencia.
- A **semântica de rumor**: origem, fidelidade, portadores, meia-vida, extinção e substituição de
  cópia pertencem a `SOC-02`/`SOC-03`. Aqui fixa-se apenas o stream, a ordem e o limite de
  tentativas.
- O **layout de evento de domínio** de `INT-05` (`ActorMovedFact`, `TravelFact`, `PassagemFact`,
  `AfastamentoFact`, `CaminhoReveladoFact`, `CrencaFalsaFact`, `TestemunhoFact`): os eventos são
  bytes opacos com digest no log; o layout pertence a contrato próprio.
- A **geometria, rotas, portões, ocupação e reserva**: pertencem a `CTR-03`. Este contrato exige
  que o custo e a agenda sejam derivados e validados, não que a região seja definida aqui.
- **Regras, DC, allowlist de efeitos, materializador e percepção**: pertencem a `CTR-04`/`FOV-01`.
- **Atributos, memória, inventário e genoma** como estado canónico: não há secção no envelope v2
  (§6.6); são pendências `P-04`/`P-07`/`P-08`.
- **Desfecho de encontro agendado, validade de passagem e reserva de portão**: o disparo é
  determinístico, a semântica é pendência `P-06`.
- **Migração completa de saves entre versões de produto**, código, testes, benchmarks, `cargo` e
  valores de hash golden.
- Edição de `ROADMAP.md`, `decisions.md`, `wave-spec.md`, prompts, ledger, índice de ADRs ou ADRs
  existentes.

### 9.2 Pendências herdadas

| ID | Pendência | Origem/dono | Impacto e consumidor bloqueado | Estado |
| --- | --- | --- | --- | --- |
| `P-01` | Semântica de `origin_actor`/`origin_locality`/`origin_tick` de rumor (quem é a origem ao semear a partir de fato testemunhado, ao transferir e ao chegar a outra localidade). | Layout CTR-01 §5.2; semântica `SOC-02`; consumidor `SOC-03`. | Sem ela, `SOC-03` não pode definir origem em propagação nem comparar cópias; `SOC-02` não pode gravar o rumor com origem canónica. | Aberta. |
| `P-02` | Estado de moeda: `wallet` em `ACTORS` (§6.2) e conservação em `TRANSFER_CURRENCY`. | Proposta deste contrato; produto `PD-04`/`PD-09`; consumidores `GAME-01`, `APP-01`, `SOC-01`. | Se rejeitada, `negociar` com `offer_moeda` fica sem saldo verificável e `GAME-01`/`APP-01` não podem aplicar a transferência de forma determinística. | Proposta, pendente de ratificação. |
| `P-03` | Armazenamento de `GREETING_COOLDOWN_TICKS = 120` por par direcionado. | CTR-01 rev 5 não tem campo de cooldown em `RELATIONSHIPS`; requer revisão de contrato ou uma entrada de agenda `GREETING_COOLDOWN_EXPIRY`; dono `S-CONTRACT`/`SOC-01`. | Sem armazenamento canónico, o cooldown não é reproduzível; `SOC-01` e `GAME-01` não podem aplicá-lo no tick nem no replay. | Aberta (bloqueante para cooldown). |
| `P-04` | Secções canónicas de memória de ambiente e de genoma/MLP; secção de atributos de ator. | Envelope CTR-01 v2 não as tem; `BEH-01`, MLP/genética e `CORE-01` (nova versão). | `BEH-01` não pode persistir memória; qualquer cartão de MLP/genética não pode depender de save/hash; sem atributos canónicos, fórmulas sociais ficam presas a constantes de fixture (`P-07`). | Aberta. |
| `P-05` | Layout binário dos eventos de domínio de `INT-05`. | `GAME-01`/`CORE-02`; spec wave INT-05. | `REPLAY-01`, `E2E-01` e `STORE-02` não podem materializar eventos; este contrato só regista `events_digest` e bytes opacos. | Aberta. |
| `P-06` | Desfecho de `SCHEDULED_MEETING`, validade/expiração de passagem (`PASS_VALIDITY_TICKS`) e reserva de portão. | `SOC-02`/`GAME-01`/`INT-05`; `CTR-03` para reserva. | Enquanto aberta, o disparo de encontro é no-op registado e passagens não têm efeito materializado; `GAME-01` não pode prometer concessão. | Aberta. |
| `P-07` | Atributos de ator usados nas fórmulas sociais (`linguagem_bp`, `inteligencia_bp`, `percepcao_bp`). | DOC-02 §5.1 diz que chegam normalizados “por CTR-01”, mas o CTR-01 rev 5 não fixa a secção; dono `S-CORE`/`RULE-01`. | Sem secção, as fórmulas só podem usar constantes de fixture pinadas no `SimulationContract`; `SOC-01` não pode evoluir atributos por ator. | Aberta (bridge por contrato). |
| `P-08` | Componentes de ator restantes: HP, ordem de inventário, estado de FSM, moedas em itens. | `CTR-01`/`CTR-04`/`BEH-01`. | Fora do recorte atual; `GAME-01` não pode implementar combate/inventário/MLP antes de contrato próprio. | Aberta (não bloqueia a sessão social). |
| `P-09` | Payload canónico de `REGION` (seed `u64`, `generator_version`, `RegionId`, `spec_digest`) e a derivação de `RegionId`/`spec_digest`. | Dono `CTR-03` (`docs/planning/contracts/region-perception-overlay.md`, worktree `ctr-03`); `CTR-02` referencia e não redefine. | Até o `CTR-03` congelar o payload, `CORE-01`/`STORE-01` não podem pinar os bytes canónicos de `REGION` nem o hash regional completo; o `RngState` já usa `Seed(u64)`. | Aberta (dependência de contrato irmão). |

### 9.3 Consumidores que não podem avançar

- `GAME-01`: bloqueado em `P-02` (moeda), `P-03` (cooldown) e `P-06` (encontro/passagem) para além
  dos handlers que não usam esses elementos; o custo de `viajar` está fechado por §2.2.
- `SOC-01`: bloqueado em `P-03` e `P-07` para cooldown e atributos por ator.
- `SOC-03`: bloqueado em `P-01` para semântica de origem; pode usar o layout e o stream já fixados.
- `REPLAY-01`: pode avançar com `AFRL`, mas fica bloqueado em `P-05` para materializar eventos de
  domínio.
- `STORE-01`/`STORE-02`: podem avançar na durabilidade e no load; `STORE-01` fica bloqueado em
  `P-09` para pinar os bytes de `REGION`/hash completo, e `STORE-02` fica bloqueado em `P-05` para
  migrar eventos e em `P-04` para migrar memória/atributos.
- `CORE-01`: bloqueado em `P-09` para o golden do envelope completo; pode fixar `ACTORS`/`AGENDA`/
  `RNG` e o hash das secções versionadas.
- `APP-01`: pode avançar no recibo e na idempotência; bloqueado em `P-02` para negociação com
  moeda e em `P-05` se o recibo precisar do evento materializado.
- `BEH-01`: bloqueado em `P-04` e `P-08`; nenhuma memória ou genoma é persistido antes disso.
- `E2E-01`: pode correr o roteiro sem modelo; bloqueado em `P-05`/`P-06` para asserções sobre
  eventos e desfecho de encontro.
- `TUI-01`/`CLI-01`: podem avançar apenas por recibos e projeções; não têm permissão para derivar
  estado, tick, RNG ou conhecimento da apresentação.

## 10. Critérios de aceite rastreáveis

Os critérios abaixo são os do cartão `CTR-02`, decompostos para prova documental. Nenhum deles foi
executado; cada linha indica onde o contrato fecha a exigência e qual implementação futura a
verifica.

| Critério | Exigência do cartão | Onde este contrato fecha | Prova documental | Implementação futura |
| --- | --- | --- | --- | --- |
| `AC-CTR-02-01` | Custos lógicos por comando; render/NLG/relógio/viewport não avançam nem selecionam; rejeição/obsolescência com resultado e custo definidos; dry-run não gasta RNG. | §2.1–§2.7, §4.4, §6.3 | Tabela de custos referenciada; intervalo e ordem; tabela resultado × tick × RNG; lista de 0 ticks; dry-run sem promoção. | `CORE-02`/`GAME-01` com testes de custo, recusa e dry-run; `TUI-01` com hash antes/depois de foco. |
| `AC-CTR-02-02` | Agenda regional determinística, limites por pulso, viagem NPC multi-pulso, atividade de todas as áreas sem viewport, agenda no estado/hash. | §3.1–§3.6, §6.1, §6.4 | Ordem de pulso; payload `AGENDA` com `seq`; regra `arrival_tick`; nível único `REGIONAL_ATIVA`; secção no hash regional. | `CORE-02`/`BEH-02` com 10k ticks, limites `LIMITE_ATINGIDO` e comparação de hash de áreas fora do foco. |
| `AC-CTR-02-03` | Streams isoladas; snapshot/replay preservam cursores; empates, overflow e distribuição inválida com resultado definido; nenhum sorteio invisível. | §4.1–§4.8, §5.5 | `Seed(u64)` no `RngState`, chave BLAKE3 por stream e ChaCha20 RFC fixado; `DrawSpec`/`DrawOutcome`; limite de 8 palavras; payload `RNG` de 44 bytes; auditoria de consumo. | `CORE-01`/`SOC-03` com isolamento social × combat, restauração de cursor, word golden e casos de erro. |
| `AC-CTR-02-04` | Log versionado e replay completo/parcial entre localidades preservam hash; truncamento/fora de ordem/versão falham; durabilidade preserva último estado em crash; métricas voláteis fora do golden; recibo não afirma efeito perdido. | §5.1–§5.8, §6.3–§6.5, §7.1–§7.9, §8.2–§8.4 | `AFRL` v1 relativo (`base_entry_seq`), entrada 148, payload de comando 162, rodapé e cadeia; tabela de rejeições; autoridade dupla; recibo na transação; tabela de crash; `Acked` e invalidação pós-restart. | `REPLAY-01`/`STORE-01`/`APP-01` com replay de checkpoint não zero, crash em cada etapa, restauro e golden sem campos voláteis. |

Rastreabilidade ao cartão: “render/NLG/relógio/viewport não avançam nem selecionam a simulação”
está em `AC-CTR-02-01` e §3.6; “ações e trajetos entre áreas reproduzem agenda/hash” está em
`AC-CTR-02-02` e `AC-CTR-02-04`; “dry-run não gasta RNG definitivo” e “ação obsoleta/recusada tem
resultado e custo definidos” estão em `AC-CTR-02-01`/§2.5; “crash preserva último estado durável”
está em `AC-CTR-02-04`/§7.5; “métricas voláteis fora do golden/hash” está em `AC-CTR-02-04`/§6.3.

## 11. Test list futura

Os testes abaixo são **especificação**, não execução. Nomes no padrão do projeto; cada teste
verifica um comportamento. Nenhum depende de rede, GPU, pesos ou relógio real.

### 11.1 Determinismo e tempo

1. `given_same_seed_and_actions_when_run_100_times_then_same_hash`.
2. `given_same_seed_when_run_10k_ticks_then_agenda_and_hash_reproduce`.
3. `given_same_checkpoint_and_log_when_replay_twice_then_same_outcome`.
4. `given_action_with_cost_c_when_step_then_ticks_advance_exactly_c`.
5. `given_cost_mismatch_when_step_then_rejected_without_state_change`.
6. `given_tick_overflow_when_step_then_error_and_no_publication`.

### 11.2 Rejeição, obsolescência e dry-run

1. `given_invalid_intent_when_execute_then_zero_ticks_and_zero_rng`.
2. `given_stale_revision_twice_when_execute_then_obsolete_with_zero_cost`.
3. `given_dry_run_when_compare_cursors_then_positions_unchanged`.
4. `given_cancellation_before_commit_when_execute_then_no_effect_and_logged_entry`.
5. `given_model_timeout_when_execute_then_external_entry_and_no_tick`.

### 11.3 Agenda e região

1. `given_pulse_tick_when_process_then_localities_and_actors_ascending`.
2. `given_more_than_limit_entries_when_pulse_then_limit_hit_and_state_intact`.
3. `given_npc_travel_when_cross_pulses_then_arrival_tick_matches_plan`.
4. `given_actor_out_of_focus_when_change_camera_then_hash_unchanged`.
5. `given_all_localities_when_action_in_l1_then_l2_l3_l4_agenda_processed`.
6. `given_two_edges_when_travel_cost_then_matches_doc02_examples`.
7. `given_agenda_travel_locality_mismatch_when_load_then_invalid`.
8. `given_scheduled_meeting_bad_counterparty_locality_when_load_then_invalid`.
9. `given_region_seed_when_derive_region_id_then_ctr03_formula`.

### 11.4 RNG

1. `given_social_draw_when_compare_streams_then_combat_cursor_unchanged`.
2. `given_bound_one_when_draw_then_zero_and_one_word`.
3. `given_invalid_bound_when_draw_then_invalid_distribution_without_promotion`.
4. `given_cursor_near_max_when_draw_then_overflow_error`.
5. `given_rejected_action_when_compare_cursor_then_unchanged`.
6. `given_drawn_values_tie_when_resolve_then_key_order_not_redraw`.
7. `given_seed_and_position_when_draw_then_word_is_pinned`.
8. `given_same_seed_different_stream_when_derive_key_then_domain_separated`.
9. `given_seed_one_position_zero_when_draw_on_windows_and_linux_then_same_word`.

### 11.5 Log e replay

1. `given_truncated_log_when_replay_then_truncated_error`.
2. `given_out_of_order_seq_when_replay_then_out_of_order_error`.
3. `given_unknown_version_when_replay_then_unsupported_version`.
4. `given_partial_range_when_replay_then_hash_matches_boundary`.
5. `given_cross_locality_travel_when_replay_then_hash_matches_live`.
6. `given_missing_external_input_when_replay_then_error`.
7. `given_base_entry_seq_nonzero_when_replay_then_first_seq_is_base_plus_one`.
8. `given_log_truncated_before_checkpoint_when_replay_then_checkpoint_log_mismatch`.
9. `given_command_payload_when_roundtrip_then_162_bytes`.
10. `given_draws_out_of_execution_order_when_validate_then_invalid_draw_order`.
11. `given_payload_and_entry_when_encode_then_golden_digest_matches`.
12. `given_log_truncated_after_checkpoint_when_replay_then_truncated_error`.
13. `given_entry_when_encode_then_entry_len_matches`.

### 11.6 Durabilidade

1. `given_crash_after_temp_write_when_restart_then_head_unchanged`.
2. `given_crash_after_publish_before_commit_when_restart_then_orphan_not_head`.
3. `given_crash_after_commit_before_ack_when_retry_then_same_receipt`.
4. `given_same_intent_twice_when_execute_then_no_duplicate_effect`.
5. `given_hash_mismatch_when_load_then_recovered_to_previous_revision`.
6. `given_corrupt_head_when_load_then_no_durable_state_or_fallback`.
7. `given_backup_rotation_when_verify_then_newest_verified_kept`.
8. `given_crash_between_revision_and_receipt_when_restart_then_both_absent`.
9. `given_aifs_header_revision_mismatch_when_load_then_durability_inconsistency`.

### 11.7 Canonicalização

1. `given_canonical_state_when_roundtrip_then_bytes_equal`.
2. `given_volatile_metrics_when_hash_then_unchanged`.
3. `given_actors_with_transit_when_hash_then_transit_included`.
4. `given_wallet_transfer_when_apply_then_total_conserved`.
5. `given_same_state_when_canonicalize_twice_then_same_hash`.
6. `given_region_id_and_seed_when_canonicalize_then_both_in_hash`.

### 11.8 Apresentação e NLG

1. `given_same_facts_with_different_prose_when_compare_then_same_hash`.
2. `given_viewport_or_focus_change_when_read_base_view_then_no_state_change`.
3. `given_overlay_read_when_step_then_no_memory_or_permission_granted`.

Nenhum teste foi executado; a lista orienta `CORE-01`, `CORE-02`, `GAME-01`, `REPLAY-01`,
`STORE-01`, `APP-01`, `SOC-03` e `E2E-01` depois do freeze.

## 12. Decisões para freeze

Cada linha é uma escolha estrutural deste contrato. A recomendação é aceitar; o freeze exige
revisão independente e ratificação do maintainer. Este documento não se autoaprova.

| # | Decisão | Recomendação | Justificativa | Impacto se rejeitada |
| --- | --- | --- | --- | --- |
| 1 | Fonte única de custos no DOC-02, com recomputação e `CostMismatch`. | Aceitar. | Evita custos paralelos e divergência entre spec e motor. | Duas tabelas de custo tornariam testes e replay ambíguos. |
| 2 | Intervalo `(t0, t0+custo]`, intenção em `t0`, depois chegadas, agenda e rumores. | Aceitar. | Alinha D-02/DOC-02; fato social ancora em `t0` e agenda vê efeitos em `t0+1`. | Outra ordem muda fatos, hashes e o roteiro. |
| 3 | Rejeição, cancelamento, obsolescência, timeout e dry-run com 0 tick e 0 RNG. | Aceitar. | Impede que erro custe tempo ou consuma sorteio. | Cobrar recusa quebra a experiência e a auditoria do replay. |
| 4 | Agenda canónica com `seq` e apenas `TRAVEL_ARRIVAL`/`SCHEDULED_MEETING`; pulsos derivados. | Aceitar. | Evita dupla contagem de ticks e mantém a ordem estável no save. | Gravar pulsos como entradas duplicaria ticks e mudaria o hash. |
| 5 | Viagem de NPC multi-pulso com `arrival_tick` em `ACTORS` e entrada em `AGENDA`, validadas entre si. | Aceitar. | Preserva o teto local de 10 ticks sem inventar ação composta. | Sem `arrival_tick`, a agenda não reproduz chegadas. |
| 6 | Nível único `REGIONAL_ATIVA`; nenhum LOD, hibernação ou seletor por viewport. | Aceitar. | D-07 e DOC-02 §3.4 exigem região inteira ativa. | Qualquer LOD por câmera viola D-04/D-07 e o hash regional. |
| 7 | RNG por posições por stream; `Seed(u64)` em `REGION`; chave de 32 bytes derivada por BLAKE3; ChaCha20 RFC 7539 com nonce/contador/ordem fixados. | Aceitar. | Snapshot e replay verificáveis; alinha `Seed(u64)` ao roadmap/CTR-03; sem estado de gerador opaco. | Outra largura de seed/construção quebra o golden cross-platform. |
| 8 | Amostragem por rejeição com `MAX_DRAW_WORDS = 8` e erros tipados. | Aceitar. | Resultado uniforme exato e terminação definida. | Módulo simples enviesa; laço sem limite não termina. |
| 9 | Quatro streams fixas, incluindo `combat`/`spawn` preservadas sem consumo. | Aceitar. | Isolamento de domínio e compatibilidade futura. | Remover stream “não usada” é mudança de formato e de hash. |
| 10 | `AFRL` v1 com log relativo ao checkpoint (`base_entry_seq`), entrada fixa de 148 bytes, cadeia de hash e rodapé digest. | Aceitar. | `seq` absoluto e replay sem reaplicar entradas cobertas; versionamento e deteção de truncamento. | Log sem cadeia ou `seq` relativo ambíguo não prova ordem nem buraco. |
| 11 | Replay parcial só em fronteira publicante. | Aceitar. | Hash final corresponde a revisão durável. | Parar a meio de uma ação inventaria um estado inexistente. |
| 12 | Recusas e dry-runs duráveis no log antes do ACK. | Aceitar. | Replay reconta ticks/cursores e prova que não consumiram RNG. | Perder recusas impede provar 0 tick/0 RNG. |
| 13 | Autoridade dupla: AIFS para bytes de estado, SQLite/WAL para ordem/log. | Aceitar. | Cada parte tem uma responsabilidade verificável por hash. | Uma autoridade só obrigaria a confiar em blob ou em índice sem prova. |
| 14 | Commit com no-clobber, fsync de arquivo e diretório, CAS de `head` e `synchronous=FULL`. | Aceitar. | Evita publicação parcial e ACK antes do durável. | Rename cego ou ACK otimista perde efeito em crash. |
| 15 | ACK só após `COMMIT`; recibo `Acked` com revisão/hash/`entry_seq`. | Aceitar. | O jogador só vê o que é durável. | ACK antecipado cria efeito fantasma após restart. |
| 16 | Recuperação com fallback para revisão anterior íntegra e recusa de inconsistência. | Aceitar. | Preserva o último estado durável e informa a perda. | “Reparar” por inferência pode promover estado errado. |
| 17 | Backup com três cópias verificadas, rehash antes de apagar e proibição de renomear WAL. | Aceitar. | Rotação segura e restaurável. | Copiar/renomear WAL aberto corrompe o catálogo. |
| 18 | `wallet` em `ACTORS` e conservação em `TRANSFER_CURRENCY`. | Aceitar, sujeito a `P-02`. | Dá consequência mecânica à negociação sem economia de itens. | Sem saldo, a oferta de moeda não é aplicável nem verificável. |
| 19 | `ACTORS` mínimo (presença, posição, vivo, moeda, viagem); HP/atributos/memória fora de v1. | Aceitar. | Evita inventar componentes não contratados. | Incluir campos sem contrato cria hash instável e migração prematura. |
| 20 | Memória, atributos e genoma fora do hash até nova secção/versão. | Aceitar. | O envelope v2 não os tem; não se fabrica tag. | Gravar fora do envelope quebra round-trip e replay. |
| 21 | Eventos de domínio opacos com `events_digest` até `P-05`. | Aceitar. | Permite log/recibo sem fixar layout alheio. | Inventar layout aqui colide com `INT-05`. |
| 22 | `step` puro com `SimContext` versionado; `execute` compõe commit/ACK. | Aceitar. | Mantém o núcleo sem I/O e a durabilidade numa fronteira só. | `step` com I/O impede replay e teste determinístico. |
| 23 | `custo_viajar = Σ_arestas (2 + Σ células do corredor)`, sem sobrecarga adicional; `Q-01` fechada. | Aceitar. | É a fórmula do DOC-02 §4.2/§3.2 e reproduz os exemplos 24/31/33. | Outra leitura divergiria dos goldens já fixados pela spec. |
| 24 | `Seed(u64)` canónica em `REGION`; `RegionId`/`spec_digest`/`generator_version` referenciados do `CTR-03` (`P-09`). | Aceitar. | Alinha roadmap/CTR-03; evita duas larguras de seed e derivação duplicada. | Seed `[u8;32]` ou `RegionId` redefinido quebraria o hash regional e a integração. |
| 25 | Payload de comando fixo de 162 bytes com presença explícita; `draws[]` na ordem de execução e `touched[]` por stream. | Aceitar. | Torna `entry_len` e o digest reproduzíveis byte a byte. | Payload sem larguras/ordem impede round-trip e replay. |
| 26 | Recibo no índice durável dentro da transação de revisão/log/head. | Aceitar. | Crash entre commit e ACK não perde o recibo idempotente. | Recibo fora da transação permite efeito durável sem retry idempotente. |

## 13. Como este contrato será consumido

| Consumidor | Interface | O que consome | O que não pode improvisar |
| --- | --- | --- | --- |
| `CORE-01` | `INT-02` (produtor) | `RngState` (`seed: Seed` + posições), `draw`, streams, payload `RNG`; consome `REGION` do CTR-03 (`P-09`) | RNG global, módulo enviesado, stream extra, seed de 32 bytes ou cursor fora do hash. |
| `CORE-02` | `INT-05` (produtor) | `step`, ordem de tick, agenda, invariantes | I/O no passo, agenda ad hoc, correção silenciosa de invariante. |
| `GAME-01` | `INT-04` (produtor) | custos, catálogo, `CostMismatch`, `ResolvedCommand` | Custo por prosa/latência, custo divergente do DOC-02, ação composta. |
| `REPLAY-01` | `INT-06` (produtor) | `AFRL`, `replay`, `replay_range`, rejeições | Modelo no replay, configuração implícita, tolerância a log inválido. |
| `STORE-01` | `INT-10` (produtor) | autoridade, commit, `SaveStore`, crash | ACK antes do durável, WAL renomeado, sobrescrever versão futura. |
| `STORE-02` | `INT-10` (consumidor) | migração forward-only, load | Migrar sem preservar IDs/agenda/fatos, reescrever original. |
| `APP-01` | `INT-17` (produtor) | `execute`, recibo, idempotência, `base_view` | Publicar efeito perdido, duplicar retry, esconder erro de store. |
| `SOC-03` | `INT-02` (consumidor) | stream `rumor`, ordem de pares, limite de tentativas | Origem/fidelidade próprias (`P-01`), sorteio fora da ordem. |
| `E2E-01` | `INT-05`/`INT-06` | cenário, hash, replay, recusas | Asserção sobre evento não materializado (`P-05`), tolerância a flake. |
| `TUI-01`/`CLI-01` | `INT-17` (consumidores) | recibo, `BaseReadView` | Derivar estado/conhecimento da apresentação, cobrar tick por UI. |
| `BEH-01` | `INT-05`/`INT-10` | passado reproduzível, agenda | Persistir memória/genoma antes de `P-04`. |

## 14. Limitações e estado da entrega

- Documento normativo, sem código de aplicação; nenhum crate, `Cargo.toml`, teste Rust, benchmark
  ou binário foi criado.
- Nenhum valor de hash de estado, de log ou de snapshot é afirmado; os goldens pertencem a
  `CORE-01`/`CORE-02`/`STORE-01` depois do freeze.
- O [ADR 0011](<../../architecture/adr/0011-time-replay-durability.md>) está **Proposto**; o índice
  [docs/architecture/adr/README.md](<../../architecture/adr/README.md>) não foi editado porque a
  atualização do índice é pendência de integração (juiz), fora da allowlist.
- O contrato é **condicional** à ratificação de `PD-01`, `PD-03`, `PD-07` e `PD-08`; se esses
  valores mudarem, este documento exige nova versão e goldens re-pinados.
- As secções `REGION`, `LOCALITIES`, `STRUCTURES` e `BLOCKS` continuam de `CTR-03`; este contrato
  fixa `ACTORS`, `AGENDA` e `RNG` e não substitui a geometria da região.
- A semântica de rumor continua de `SOC-02`/`SOC-03`; o layout de evento continua de `INT-05`.
- As pendências `P-01`…`P-09` bloqueiam os consumidores indicados em §9.3; nenhuma delas é
  resolvida por suposição de implementação. `Q-01` está fechada em §2.2.
- `REVIEW-CTR-02` e o aceite do maintainer são obrigatórios; `DELIVERED_TO_REVIEW` não é `DONE`,
  `INTEGRATED` nem freeze.
- A entrega não executou `cargo`, modelo, rede, push, PR, integração ou cleanup; o estado do
  repositório é o commit local desta worktree.

## 15. Referências

- [Contrato CTR-01 — identidade, unidades e eventos](<identity-events.md>), rev 5.
- `CTR-03` — região, percepção e overlay: `docs/planning/contracts/region-perception-overlay.md`
  (worktree `ctr-03`), seed `u64`, `RegionId`/`spec_digest` e derivação de `REGION`; referenciado em
  §4.1/§6.1 e `P-09`.
- [Especificação de gameplay DOC-02](<../gameplay-spec.md>), rev 6.
- [Especificação da onda — manifesto](<../wave-spec.md>), SHA-256 `328a8c7e…a360769`.
- [Revisão de projeto — L-01](<../project-review.md>).
- [Decisões do maintainer](<../decisions.md>).
- [ROADMAP de execução](<../../../ROADMAP.md>), cartões `CTR-02`, `GAME-01`, `REPLAY-01`,
  `STORE-01`, `STORE-02`, `APP-01`.
- [Roadmap de arquitetura — tick e determinismo](<../../architecture/roadmap.md>).
- [Visão de arquitetura — portas e fluxo de ação](<../../architecture/overview.md>).
- [ADR 0005 — contrato de simulação determinística](<../../architecture/adr/0005-deterministic-simulation-contract.md>).
- [ADR 0008 — tempo por ações](<../../architecture/adr/0008-action-driven-simulation-time.md>).
- [ADR 0011 — autoridade durável e tempo por ações](<../../architecture/adr/0011-time-replay-durability.md>).
- [Índice de ADRs](<../../architecture/adr/README.md>).
- [Regras de desenvolvimento](<../../engineering/development-rules.md>).
- [Estratégia de testes](<../../engineering/testing-strategy.md>).
- [BLAKE3](https://github.com/BLAKE3-team/BLAKE3), acesso em 2026-11-08.
- [SQLite — Write-Ahead Logging](https://www.sqlite.org/wal.html), acesso em 2026-11-08.
- [SQLite — Online Backup API](https://www.sqlite.org/backup.html), acesso em 2026-11-08.
- [rand_chacha — ChaCha20Rng](https://docs.rs/rand_chacha/latest/rand_chacha/), acesso em
  2026-11-08.
- [RFC 7539 — ChaCha20 and Poly1305](https://datatracker.ietf.org/doc/html/rfc7539), acesso em
  2026-11-08.
