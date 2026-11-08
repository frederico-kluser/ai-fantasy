# Especificação de handoff — plano multi-agente do AI Fantasy

> **PLANEJAMENTO EM MARKDOWN · execução desabilitada · 2026-11-08.**
> Este suplemento detalha o [ROADMAP](<../../ROADMAP.md>); não instala uma skill, cria um
> orquestrador, abre worktrees de implementação nem constrói a aplicação.
> Assinaturas, caminhos e verificações de aplicação abaixo são **propostas para trabalho futuro**.

## 1. Método adotado e adaptações ao guia

O guia anexado pelo maintainer foi usado como referência de método: Advisor/Planner separado
 do Executor; especificação orientada a requisitos; contratos Consumes/Produces; escopo positivo
 e negativo; DAG; fronteiras de arquivos; barreira; juiz; relatório e revisão independente.
Não foram revalidadas suas alegações sobre ferramentas, estrelas, modelos, custos ou tamanhos de contexto.

**Adaptações obrigatórias às [decisões humanas](<decisions.md>):**

- Não adotar limite de 3–5 tarefas/subagents por onda. Todas as tarefas prontas e independentes compõem a fronteira.
- Cada trabalhador futuro recebe worktree própria; não adotar a alternativa de workspace compartilhado do exemplo.
- Serializar somente criação/registro das worktrees e operações conflitantes de metadados Git; isso não serializa a implementação independente.
- Não instalar skills/dependências, desabilitar permissões, commitar ou executar implementações automaticamente porque o guia exemplifica essas operações.
- Violação de escopo preserva evidências e bloqueia integração; não executar reset, apagamento ou revert destrutivo sem autorização e verificação do caminho/impacto.
- Verificação rápida tem alvo inferior a 60 segundos; não afirmar tempo medido para testes que ainda não existem. Soak, mutação, modelos reais e experimento completo permanecem verificações próprias.
- Falha repetida exige hipótese e correção novas; não repetir uma chamada idêntica ou liberar consumidores sobre erro não resolvido.

### Fonte única por assunto

| Assunto | Fonte |
| --- | --- |
| Objetivos, marcos, critérios narrativos e estado global | [ROADMAP](<../../ROADMAP.md>) |
| Decisões de produto | [Respostas do maintainer](<decisions.md>) |
| Definições e limites arquiteturais | [Arquitetura](<../architecture/roadmap.md>) e [overview](<../architecture/overview.md>) |
| Dependências exatas, fronteiras de arquivos e contratos do handoff | Este suplemento, referenciado pelo plano principal |
| Estado de execução/SHAs/evidências | Um ledger por execução futura, controlado pelo juiz; nenhum ledger de implementação iniciado nesta sessão |

Não manter dois ledgers de execução concorrentes. W0–W9 no plano principal são grupos de
entrega; a onda real é calculada sobre os cartões prontos deste manifesto.

## 2. Decisões bloqueadas, anti-escopo e discricionariedade

**Decisões bloqueadas:** D-01…D-08 e a nota de D-07 estão respondidas. Motor antes de 2D;
tempo por movimento/fala; foco social; silhuetas de todos atrás de construções; CPU/GPU Windows/Linux
sem teto antecipado; stack de render aberta; região multi-localidades desde a base; desenvolvimento
paralelo sem cap artificial e com juiz após barreira.

**ANTI-01:** não construir agora. Todos os caminhos de crates, testes e ferramentas neste documento
são destinos futuros, não arquivos criados ou comandos já executados.

**ANTI-02:** nunca rebase/force-push/no-verify; nunca publicar ou fazer merge de PR por inferência
de autorização. Commits/PR/releases futuros exigem pedido e gates correspondentes.

**ANTI-03:** não escolher engine/stack de render, custos numéricos de ações, formato binário final,
política de alcance do overlay ou genética por conveniência para fechar uma lacuna.

**ANTI-04:** não introduzir rede no runtime, pesos no repositório, API keys, telemetria remota,
NLG no tick, texto como autoridade, floats/relógio/RNG global no estado autoritativo ou dados
privilegiados de silhuetas como conhecimento dos NPCs/MLPs.

**ANTI-05:** não substituir a região inicial por vila isolada, congelar áreas por viewport,
limitar artificialmente agentes ou usar o benchmark histórico de 2,8 GB como teto nesta etapa.

**ANTI-06:** não acrescentar multiplayer, nuvem, 3D real, modding arbitrário, editor visual,
voz/multimodalidade/ONNX preventivos ou campanha extensa sem decisão específica.

**Discricionariedade do agente:** decomposição interna, dados de teste mínimos, nomes privados,
organização/refatoração dentro do contrato e implementação mínima após autorização. Alteração
 de API/formato/escopo/golden retorna ao dono e ao checkpoint adequado; não é liberdade para
redefinir uma decisão bloqueada.

## 3. Registro bidirecional de interfaces — propostas, não implementação

### Como congelar sem fingir que o código existe

As assinaturas lógicas abaixo são **propostas de partida para revisão**. Não são APIs existentes
nem aprovam representação binária, larguras de IDs, custos de ações ou linguagem do cliente 2D.
CTR-01…CTR-05 publicam a revisão aceita com tipos, caminhos, invariantes e erros completos antes
de liberar consumidores de implementação. Se uma proposta mudar, todos os Consumes referenciando
o ID são atualizados na mesma revisão; o juiz verifica igualdade literal antes do disparo.

Os tipos capitalizados denotam contratos de dados: `ActorId` é identidade geracional;
`Tick`/`TickInterval` são tempo lógico; `WorldState` inclui região, atores, agendas, memória e RNG;
`RawModelReply` é entrada não confiável; `EffectSet` contém efeitos tipados; `Checkpoint` identifica
estado durável e sequência; `ObservationEnvelope` é percepção/memória; `SilhouetteEnvelope` é
apresentação privilegiada. Sua definição física pertence aos cartões CTR indicados, não a um
arquivo de Rust criado por este planejamento.

Em todas as linhas, **CONTAINS/DOES NOT CONTAIN aplicam-se a cada função/porta listada**.
Caminho significa destino proposto; integração pública/exportações fazem parte do aceite do produtor.

**Separação de produção:** `spec_produces` publica especificações por DOC/CTR; `declaration_produces`
publica tipos/traits de partida; `impl_produces` publica implementação futura. `consumes` referencia
a revisão congelada do contrato, incluindo tipos retornados por uma fachada; não significa chamar
a própria implementação antes de ela existir. O manifesto é a fonte das listas de consumo;
as listas resumidas abaixo destacam ligações principais, não substituem essa matriz.

| Declaração de partida | Caminho proposto | Dono da declaração | Donos das implementações |
| --- | --- | --- | --- |
| Tipos de domínio, identidades, unidades e respostas compartilhadas | `crates/af-domain/src/lib.rs` | CORE-01, depois do freeze de CTR-01…CTR-05 | Core, regras, conversa, store e adaptadores em seus próprios arquivos |
| Clock, RngSource, SaveStore, EventSink, Transport, ModelSupervisor, SystemOnePort, LlmPort e TelemetrySink | `crates/af-ports/src/lib.rs` | CORE-01 publica traits/tipos congelados; não faz I/O real | STORE-01/02 e AI-01/02 implementam as portas sem editar af-ports |
| BaseReadView e tipos mínimos de comando/recibo para M2 | `crates/af-domain/src/lib.rs` e fachada atribuída | CORE-01 declara; APP-01 produz a projeção de leitura limitada | TUI-01 usa a fachada; FOV-01/VIEW-01 produzem percepção completa somente depois |
| DTO/algoritmos completos de percepção e overlay, genomas e dados de comportamento | Arquivos da tarefa produtora conforme manifesto | Contrato correspondente congela; produtor publica os tipos e implementação aprovados | FOV-01/VIEW-01/BEH-01…03, sem antecipar renderer/genética na base |
| GateReport e dados de medição do tooling | `xtask/src/quality.rs` | SCI-03 após CTR-05 | SCI-03/04 e juiz; não colocar estado de tooling no domínio do jogo |

`WorldState` nestas assinaturas é o modelo/snapshot de dados puros definido no domínio. Handles
Flecs e detalhes de armazenamento ECS ficam em CORE-02; canonicalização do domínio não importa core.
`BaseReadView` é projeção técnica somente leitura de região, tick, recibos e histórico conforme
contrato limitado de M2. Não afirma que FOV/last-seen/overlay completos já existem. TUI não
importa core diretamente: recebe dados/intenções pela fachada de APP-01. Custos/intenções de
INT-04 chegam por essa fachada, não por chamada direta ao resolvedor de core.

Verificar declarações e contratos de af-ports faz parte de CORE-01; adaptadores não precisam
roubar sua allowlist. Se um tipo ainda não foi congelado/publicado, o consumidor fica bloqueado:
nunca improvisar uma trait incompatível para conseguir compilar.

### INT-01 — Identidade, unidades e canonicalização

- **Especificação:** CTR-01/CTR-02; **produtor:** CORE-01; **consumidores:** CORE-02, GRID-01, SOC-02, STORE-01, RULE-01, BEH-01.
- **Destino:** `crates/af-domain/src/lib.rs`.
- **Propostas:** `canonical_state(state: &WorldState) -> Result<CanonicalBytes, DomainError>`; `state_hash(bytes: &CanonicalBytes) -> StateHash`.
- **CONTAINS:** ordem canônica, unidades inteiras/ponto fixo, identidades geracionais, dados que afetam decisões, validação e erro de valores inválidos.
- **DOES NOT CONTAIN:** I/O, ambiente, relógio real, HashMap autoritativo, floats, layout do compilador, métricas/UI/cache como estado de simulação ou descarte de 1 bp/múltiplos efeitos.
- **Aceite:** ida e volta, idempotência, ID obsoleto/overflow, hash regional reproduzível, dados voláteis excluídos por contrato explícito.

### INT-02 — Streams e sorteios determinísticos

- **Especificação:** CTR-02; **produtor:** CORE-01; **consumidores:** CORE-02, GAME-01, SOC-03, RULE-02, BEH-02.
- **Destino:** `crates/af-ports/src/lib.rs`, `crates/af-domain/src/lib.rs`.
- **Proposta:** `draw(state: &RngState, request: DrawSpec) -> Result<DrawOutcome, DomainError>`.
- **CONTAINS:** streams derivadas de seed/domínio, ordem fixa, resultado e próxima posição/estado, validação de distribuição e consumo explícito.
- **DOES NOT CONTAIN:** RNG global, thread_rng, entropia de relógio, consumo definitivo durante dry-run/rejeição não contratados ou sorteios invisíveis ao replay.
- **Aceite:** social não altera combat; snapshot/replay preserva cursores; empates, overflow e distribuição inválida têm resultados definidos.

### INT-03 — Região procedural desde a base

- **Especificação:** CTR-03; **produtor:** GRID-01; **consumidores:** GAME-01, SOC-03, GRID-02, FOV-01.
- **Destino:** `crates/af-core/src/region.rs`.
- **Propostas:** `generate_region(spec: &RegionSpec, seed: Seed) -> Result<RegionState, RegionError>`; `find_route(region: &RegionState, request: RouteRequest) -> Result<Route, RegionError>`.
- **CONTAINS:** várias localidades, grelha inteira, identidades/conexões, ocupação, passagem, origem/destino e desempate determinístico.
- **DOES NOT CONTAIN:** câmera como seletor da simulação, vila como único escopo de produto, render/engine 3D, congelamento implícito de outras áreas ou item comum convertido em material estrutural.
- **Aceite:** mesmas entradas geram mesma região/rota; área fora de foco permanece no estado; coordenadas inválidas/rota impossível/colisão de identidade são testadas.

### INT-04 — Ação nativa e tempo lógico

- **Especificação:** DOC-02/CTR-02; **produtor:** GAME-01; **consumidores:** REPLAY-01, APP-01, TUI-01.
- **Destino:** `crates/af-core/src/actions.rs`.
- **Proposta:** `resolve_native(intent: NativeIntent, facts: &ActionFacts) -> Result<ResolvedCommand, CommandError>`.
- **CONTAINS:** comando tipado, pré-condições, custo lógico contratado, alvos, resultado de rejeição e informações necessárias à aplicação determinística.
- **DOES NOT CONTAIN:** custo por tokens/prosa/latência, chamada obrigatória a d1/LFM3 para handler tipado existente, permissão de ação derivada automaticamente de silhueta ou mutação de mundo.
- **Aceite:** mover/falar resolve uma ação com custo contratado; UI/NLG não cobra tempo; inválida/morta/fora de alcance/sem recursos não vira efeito parcial.

### INT-05 — Passo autoritativo

- **Especificação:** CTR-02; **produtor:** CORE-02; **consumidores:** GAME-01, REPLAY-01, APP-01, E2E-01.
- **Destino:** `crates/af-core/src/lib.rs`.
- **Proposta:** `step(world: WorldState, command: ResolvedCommand, context: SimContext) -> Result<StepOutcome, CoreError>`.
- **CONTAINS:** aplicação/agenda regional, ticks por ação, ordem de sistemas, invariantes, eventos, próximo estado/RNG e hash conforme contrato.
- **DOES NOT CONTAIN:** HTTP/SQLite/UI/ambiente, relógio de parede, inferência live, publicação durável ou correção silenciosa de invariante violada.
- **Aceite:** 100 execuções/replay e região fora do foco reproduzem; erro não publica estado/RNG parcialmente alterados.

### INT-06 — Replay sem reinferência

- **Especificação:** CTR-02; **produtor:** REPLAY-01; **consumidores:** STORE-01, E2E-01, MOTOR-01.
- **Destino:** `crates/af-core/src/replay.rs`.
- **Proposta:** `replay(checkpoint: Checkpoint, inputs: &[RecordedInput], contract: &SimulationContract) -> Result<ReplayOutcome, ReplayError>`.
- **CONTAINS:** sequência/tick/revisão, respostas normalizadas, abstenção/timeout/cancelamento, custos e reprodução das agendas/streams.
- **DOES NOT CONTAIN:** chamar modelo ou relógio, ler configuração implícita, reusar schema incompatível, suprimir falha ou reconstruir decisão por texto livre novo.
- **Aceite:** replay inteiro/parcial entre localidades preserva hash; entrada truncada/fora de ordem/versão desconhecida falha claramente.

### INT-07 — Conversa factual e propagação

- **Especificação:** CTR-01/CTR-03; **produtores:** SOC-01, SOC-02, SOC-03; **consumidores:** STORE-02, NLG-01, E2E-01.
- **Destino:** `crates/af-conversation/src/lib.rs`, `events.rs`, `rumors.rs` no mesmo diretório.
- **Propostas:** `resolve_social(facts: &SocialFacts, intent: SocialIntent, draws: &ResolvedDraws) -> Result<SocialOutcome, ConversationError>`; `encode_events(facts: &[ConversationFact], codec: &EventCodec) -> Result<CanonicalBytes, CodecError>`; `advance_rumors(state: RumorState, region: &RegionFacts, interval: TickInterval, draws: &ResolvedDraws) -> Result<RumorOutcome, ConversationError>`.
- **CONTAINS:** deltas exatos em bp, todos os efeitos/identidades históricos, origem/fidelidade/portadores/agenda e resultados tipados.
- **DOES NOT CONTAIN:** prosa no tick, compressão que perde fatos, reconstrução do passado por estado atual, rumor alimentado por overlay ou I/O direto.
- **Aceite:** 1 bp/múltiplas transferências preservados; origem/fidelidade e extinção testadas; portador atravessa localidades sem reinitializar história.

### INT-08 — Proposta não confiável e validação

- **Especificação:** CTR-04; **produtores:** RULE-01/RULE-02; **consumidores:** APP-01, RULE-03.
- **Destino:** `crates/af-rules/src/parser.rs`, `crates/af-rules/src/lib.rs`.
- **Propostas:** `parse_proposal(raw: RawModelReply, schema: &RuleSchema) -> Result<RuleProposal, RuleError>`; `validate_rule(proposal: RuleProposal, facts: &ActionFacts, schema: &RuleSchema) -> Result<ValidatedRule, RuleError>`.
- **CONTAINS:** framing/dialeto contratado, versão/campos/cardinalidade, mapeamentos, IDs/posse/seletores, limites e proveniência anexada pelo host.
- **DOES NOT CONTAIN:** presumir XML convencional, aceitar campos desconhecidos/duplicatas ambíguas, eval/SQL/shell, clamp para esconder entrada inválida ou escrita no mundo.
- **Aceite:** 200 válidas + 200 inválidas; zero inválida aplicada; >64 KiB, tool desconhecida, versão errada, XXE e semanticamente inválida são rejeitadas.

### INT-09 — Materialização pura

- **Especificação:** CTR-02/CTR-04; **produtor:** RULE-02; **consumidores:** APP-01/RULE-03 e juiz na integração pós-RULE-02. CORE-02 implementa o step sobre tipos congelados; não depende da implementação tardia do materializador.
- **Destino:** `crates/af-rules/src/materializer.rs`.
- **Proposta:** `materialize(rule: &ValidatedRule, facts: &ActionFacts, draws: &ResolvedDraws) -> Result<EffectSet, RuleError>`.
- **CONTAINS:** allowlist, DC/deltas/duração, até oito efeitos por resultado, orçamento e semântica exatos.
- **DOES NOT CONTAIN:** escrever SQLite/mundo, consumir RNG global, duplicar item, tratar modelo como autoridade ou conceder alvo legal porque o jogador viu uma silhueta.
- **Aceite:** efeitos reproduzíveis, inválido/overflow/posse/status/alvo morto rejeitados; dry-run/commit recebe o mesmo conjunto validado.

### INT-10 — Persistência e migração

- **Especificação:** CTR-01/CTR-02; **produtores:** STORE-01/STORE-02; **consumidores:** APP-01, CLI-01, NLG-01, E2E-01 e cartões de migração/recuperação que referenciam esse contrato.
- **Destino:** `crates/af-ports/src/lib.rs`, `crates/af-store/src/lib.rs`, `migration.rs`.
- **Propostas:** `SaveStore::save(revision: &SaveRevision) -> Result<CommitReceipt, StoreError>`; `SaveStore::load(id: SaveId) -> Result<Checkpoint, StoreError>`; `migrate_snapshot(snapshot: StoredSnapshot, target: SaveSchemaVersion) -> Result<StoredSnapshot, StoreError>`.
- **CONTAINS:** autoridade/durabilidade definida, sequência/hash, região inteira, limites/checksum, backup/recuperação e migração forward-only.
- **DOES NOT CONTAIN:** salvar apenas viewport, renomear WAL aberto ingenuamente, ACK antes da condição durável contratada, desserialização ilimitada ou sobrescrever original corrompido/futuro.
- **Aceite:** crash em cada etapa preserva último commit; migração mantém IDs/agenda/fatos; paths/permissões/concorrência/corrupção testados.

### INT-11 — Transporte e supervisor locais

- **Especificação:** CTR-05; **produtor:** AI-01; **consumidores:** AI-02, CLI-01.
- **Destino:** `crates/af-llm/src/transport.rs`, `crates/af-system-one/src/supervisor.rs`.
- **Propostas:** `Transport::post_loopback(request: LocalRequest) -> Result<RawModelReply, TransportError>`; `ModelSupervisor::start(bundle: &VerifiedBundle, launch: &LaunchSpec) -> Result<ModelHandle, ModelError>`; `ModelSupervisor::stop(handle: ModelHandle) -> Result<StopReceipt, ModelError>`.
- **CONTAINS:** identidade/hash/tamanho/runtime/template/projector, host final loopback, limites/timeouts, health e ciclo de vida dos processos sob seu controle.
- **DOES NOT CONTAIN:** download automático, host amplo/externo, redirects/proxy remotos, API keys, kill de processo alheio ou avanço de ticks por espera.
- **Aceite:** arquivo adulterado/instância errada/porta em conflito/timeout/oversize falham; fallback e shutdown preservam jogo/recursos.

### INT-12 — Portas de modelos e respostas normalizadas

- **Especificação:** CTR-04/CTR-05; **produtor:** AI-02; **consumidores:** APP-01/NLG-02.
- **Destino:** `crates/af-system-one/src/client.rs`, `crates/af-llm/src/client.rs`.
- **Propostas:** `SystemOnePort::decide(state: &DecisionState, questions: &[TypedQuestion]) -> Result<DecisionAnswers, ModelError>`; `LlmPort::propose_rule(context: &ProposalContext) -> Result<RawModelReply, ModelError>`; `LlmPort::render_narrative(context: &NarrativeContext) -> Result<RawModelReply, ModelError>`.
- **CONTAINS:** noul/choice/score, até 16 questões, respostas finitas/normalizadas, other/none/bandas, timeout/abstenção registráveis e fakes/cassettes com a mesma suite.
- **DOES NOT CONTAIN:** inferência no tick de NPCs, saída aplicada diretamente, tempo real como tempo do mundo ou modelo real julgando teste de lógica.
- **Aceite:** NaN/Inf/shape/confiança baixa/indisponibilidade tratados; PR não precisa pesos/processos/GPU; live só explicitamente solicitado.

### INT-13 — NLG, fatos e cache

- **Especificação:** CTR-01/CTR-04; **produtores:** NLG-01/NLG-02; **consumidores:** E2E-01/TUI-01.
- **Destino:** `crates/af-nlg/src/lib.rs`, `cache.rs`.
- **Propostas:** `build_context(events: &[ConversationFact], request: &NarrativeRequest) -> Result<NarrativeContext, NlgError>`; `verify_claims(claims: &NarrativeClaims, facts: &NarrativeContext) -> Result<VerifiedNarrative, NlgError>`; `cache_key(context: &NarrativeContext, identity: &NarrativeIdentity) -> NarrativeCacheKey`.
- **CONTAINS:** âncoras do tick original, identidade/prompt/modelo/locale, lazy/cache, verificação conservadora e template seguro.
- **DOES NOT CONTAIN:** gerar eventos, cobrar tempo por palavras, inventar fatos aceitos, usar overlay como percepção de NPC ou prometer verificação universal de prosa arbitrária.
- **Aceite:** 100 sequências sem alucinação mecânica aceita ou com fallback; cache/locale/versão/erro testados; leitura não muda hash/tick.

### INT-14 — Percepção e memória autoritativas

- **Especificação:** CTR-03; **produtores:** FOV-01/VIEW-01; **consumidores:** RENDER-01/BEH-01.
- **Destino:** `crates/af-core/src/visibility.rs`, `view.rs`.
- **Propostas:** `compute_perception(world: &WorldState, observer: ActorId) -> Result<PerceivedState, VisibilityError>`; `update_memory(previous: EnvironmentMemory, perceived: &PerceivedState) -> Result<EnvironmentMemory, VisibilityError>`; `observer_view(world: &WorldState, observer: ActorId, schema: ViewSchema) -> Result<ObservationEnvelope, VisibilityError>`.
- **CONTAINS:** visão direcional, regiões/níveis contratados, last-seen congelado, revisão/tick e leitura consistente por observador.
- **DOES NOT CONTAIN:** sensor de câmera, atualizar memória por informação privilegiada, conhecer criaturas live fora da percepção ou selecionar quais localidades existem.
- **Aceite:** mesma entrada/trajectória reproduz; mudança oculta não renova last-seen; câmera/render não alteram conhecimento/ticks.

### INT-15 — Silhuetas privilegiadas

- **Especificação:** CTR-03; **produtor:** VIEW-01; **consumidor:** RENDER-01.
- **Destino:** `crates/af-core/src/view.rs`.
- **Proposta:** `player_silhouettes(world: &WorldState, query: &SilhouetteQuery, contract: &SilhouetteContract) -> Result<SilhouetteEnvelope, VisibilityError>`.
- **CONTAINS:** todos atrás de construções, inclusive não percebidos, conforme alcance/Z/oclusão explicitamente aprovados; canal privilegiado somente leitura.
- **DOES NOT CONTAIN:** filtro automático de somente percebidos, alcance/global/Z inventados, dados extras não autorizados ou atualização de last-seen/NPC/MLP/rumores.
- **Aceite:** não percebido elegível aparece; conhecimento/hash/tick não muda; contrato de nunca-visto/parede/telhado/níveis é cumprido.

### INT-16 — MLP e genomas

- **Especificação:** CTR-02/CTR-03 e contrato de comportamento aprovado antes da trilha; **produtores:** BEH-01/BEH-02/BEH-03; **consumidor:** BEH-04.
- **Destino:** `crates/af-core/src/behavior.rs`, `genome.rs`, `learning.rs`.
- **Propostas:** `infer_behavior(inputs: &BehaviorInputs, genome: &Genome, contract: &BehaviorContract) -> Result<BehaviorScores, BehaviorError>`; `breed(parents: &ParentGenomes, draws: &ResolvedDraws, contract: &GenomeContract) -> Result<Genome, BehaviorError>`; `reinforce(genome: &Genome, experience: &Experience, contract: &LearningContract) -> Result<Genome, BehaviorError>`.
- **CONTAINS:** matemática fixa/versionada, percepção do personagem, scores, herança/variação/recompensa aprovadas, baseline e resultados puros.
- **DOES NOT CONTAIN:** f32/RNG global/I/O/live, conhecimento vindo do overlay, alteração direta do mundo ou eliminação de genomas referidos pelo replay histórico.
- **Aceite:** inputs/pesos/versão reproduzem; diversidade em fixture discriminante; 100 gerações/herança/extinção/save e mutação de código ≥ 90%.

### INT-17 — Composição e recibo da ação

- **Especificação:** CTR-02; **produtor:** APP-01; **consumidores:** CLI-01/E2E-01/TUI-01.
- **Destino:** `crates/af-app/src/lib.rs`.
- **Propostas:** `execute(services: &mut AppServices, intent: PlayerIntent) -> Result<ActionReceipt, AppError>`; `base_view(state: &AppState) -> BaseReadView`.
- **Tipo de leitura:** CORE-01 declara BaseReadView; APP-01 produz a projeção limitada de M2. Não requer o algoritmo de FOV/overlay completo de VIEW-01.
- **CONTAINS:** portas injetadas, entrada resolvida, snapshot/revalidação, aplicação, registro e ACK durável segundo a autoridade definida.
- **DOES NOT CONTAIN:** pular validação/dry-run, depender de UI/overlay para permissão, duplicar efeito por retry ou esconder erro de persistência.
- **Aceite:** stale/timeout/cancelamento/IO/idempotência/crosslocal observáveis; recibo não afirma efeito perdido após restart.

### INT-18 — Runner e controles de apresentação

- **Especificação:** CTR-03/CTR-05 e contratos de cenário/UI; **produtores:** E2E-01/TUI-01; **consumidores:** MOTOR-01/PLAY-01.
- **Destino:** `crates/af-scenario/src/main.rs`, `crates/af-tui/src/lib.rs`.
- **Propostas:** `run_scenario(spec: ScenarioSpec, ports: ScenarioPorts) -> ScenarioReport`; `ui_transition(state: UiState, input: UiInput, view: &BaseReadView) -> UiTransition`.
- **CONTAINS:** steps declarativos, fakes, outputs semânticos, controles/intent, erros/exit codes 0–4 e apresentação desacoplada.
- **DOES NOT CONTAIN:** eval, writes fora do sandbox de teste, métricas wallclock em golden/hash, alteração direta do core ou render final 3D.
- **Aceite:** catálogo regional/hermético; no-tests/ausência de artifact não passam; input/NLG/câmera sem efeito temporal implícito.

### INT-19 — Cliente 2D, interface lógica ainda sem stack

- **Especificação/produtor da decisão:** CTR-03/RENDER-01; **consumidor:** PLAY-01.
- **Destino inicial:** `docs/planning/contracts/render-client.md`; caminhos de código dependem da stack escolhida pelo maintainer.
- **Proposta independente de linguagem:** `present(observation: ObservationEnvelope, silhouettes: SilhouetteEnvelope, camera: CameraState) -> FrameReceipt`.
- **CONTAINS:** projeção 2D isométrica, camadas de ambiente e silhuetas, z-order/picking/controles e contrato aprovado.
- **DOES NOT CONTAIN:** escolher engine/linguagem automaticamente, escrever estado autoritativo, atualizar percepção/memória por câmera ou usar malhas/render 3D real.
- **Aceite:** decidir stack/ponte/build/assets/testes e revisar allowlist de código antes de delegar implementação do cliente. Sem essa revisão, o cartão só libera decisão documental, nunca código de UI.

### INT-20 — Gates e release

- **Especificação:** CTR-05; **produtores:** SCI-02/SCI-03/SCI-04/REL-01; **consumidores:** juiz/MOTOR-01/REL-02.
- **Destinos:** `xtask/src/quality.rs`, `xtask/src/offline.rs`, `xtask/src/packaging.rs` e CI atribuído.
- **Propostas:** `verify_quality(reports: QualityReports, policy: &QualityPolicy) -> GateReport`; `assemble_release(inputs: ReleaseInputs, contract: &PackagingContract) -> Result<ReleaseArtifacts, ReleaseError>`.
- **CONTAINS:** qualidade por escopo, prova negativa, medidores, relatórios/SHAs/SBOM/licenças, ausência de pesos/segredos e estado go/no-go explícito.
- **DOES NOT CONTAIN:** relatório ausente tratado como sucesso, N/A/100% automático em crate vazio, publicação sem autorização, rebase/force ou desempenho convertido em teto não escolhido.
- **Aceite:** medidores testados com fixtures; pisos reais cobrados no código aplicável; bootstrap tem política explícita e não prova produção inexistente; release requer gates e decisão humana.

## 4. Manifesto de 46 cartões e fronteiras de arquivos

### Regras de interpretação

- `depends_on` abaixo é o grafo exato de referência; decisões humanas/autorização são gates externos, não IDs de tarefa falsos.
- Os consumidores de um contrato são implementadores somente depois de seu freeze; assinatura proposta não libera o consumidor.
- `files_allowed` usa caminhos explícitos e bundles finitos expandidos antes de delegar; tudo fora da allowlist é proibido.
- `files_forbidden` do brief inclui: todas as demais allowlists da onda, arquivos compartilhados do juiz e qualquer caminho fora da allowlist própria. A lista expandida é enviada, não apenas a fórmula.
- Nenhum trabalhador altera manualmente metadados `.git`, o ledger central, contratos de outro dono ou histórico. O juiz integra entrypoints/exportações compartilhados após barreira.
- Se uma tarefa precisar de novo export para testar, o contrato/base é preparado antes da onda ou o caminho é atribuído e as colisões recalculadas. Não aceitar teste vazio ou módulo desconectado como prova.
- O cliente 2D permanece gate de decisão documental; sua allowlist de código só existe depois da escolha de stack. Não mascarar isso com um caminho fictício de engine.
- A referência usa VIEW-01 como entrada concreta de BEH-01. A alternativa de percepção abstrata exige revisão explícita de dependências/arquivos antes da execução; não é um segundo requisito nem dependência de render.

### Bundles finitos

`B-SCAFFOLD` contém estes caminhos futuros; sua extensão é exceção justificada de um pacote
 de infraestrutura indivisível, não razão para limitar o número de agentes:

```json
{
  "B-SCAFFOLD": [
    "Cargo.toml", "Cargo.lock", "rust-toolchain.toml", ".cargo/config.toml", ".config/nextest.toml",
    "crates/af-domain/Cargo.toml", "crates/af-domain/src/lib.rs",
    "crates/af-ports/Cargo.toml", "crates/af-ports/src/lib.rs",
    "crates/af-rules/Cargo.toml", "crates/af-rules/src/lib.rs",
    "crates/af-conversation/Cargo.toml", "crates/af-conversation/src/lib.rs",
    "crates/af-core/Cargo.toml", "crates/af-core/src/lib.rs",
    "crates/af-nlg/Cargo.toml", "crates/af-nlg/src/lib.rs",
    "crates/af-system-one/Cargo.toml", "crates/af-system-one/src/lib.rs",
    "crates/af-llm/Cargo.toml", "crates/af-llm/src/lib.rs",
    "crates/af-store/Cargo.toml", "crates/af-store/src/lib.rs",
    "crates/af-app/Cargo.toml", "crates/af-app/src/lib.rs", "crates/af-app/src/main.rs",
    "crates/af-tui/Cargo.toml", "crates/af-tui/src/lib.rs",
    "crates/af-scenario/Cargo.toml", "crates/af-scenario/src/main.rs",
    "xtask/Cargo.toml", "xtask/src/main.rs"
  ]
}
```

**Perfis:** `planner-specialist` para decisões/contratos; `fast-mechanical` para documentos/configurações
isolados; `standard-implementer` para lógica/TDD; `deep-specialist` para núcleo, parser, durabilidade,
matemática, integração e segurança. São perfis de capacidade, não nomes de modelos instalados,
limites de contexto garantidos ou escolha obrigatória de fornecedor.

O JSON abaixo é **dados de planejamento dentro de Markdown**, não configuração instalada:

```json
{
  "execution_enabled": false,
  "state": "PLANNED_REQUIRES_SIGNATURE_AND_AUTHORIZATION",
  "tasks": [
    {"id":"DOC-01","depends_on":[],"profile":"planner-specialist","files_allowed":["ROADMAP.md","docs/planning/decisions.md","docs/planning/roadmap-review.md"],"consumes":[],"spec_produces":[],"verify":"DOC"},
    {"id":"DOC-02","depends_on":["DOC-01"],"profile":"planner-specialist","files_allowed":["docs/planning/gameplay-spec.md"],"consumes":[],"spec_produces":["INT-04"],"verify":"DOC"},
    {"id":"CTR-01","depends_on":["DOC-01"],"profile":"planner-specialist","files_allowed":["docs/planning/contracts/identity-events.md"],"consumes":[],"spec_produces":["INT-01","INT-07"],"verify":"DOC"},
    {"id":"CTR-02","depends_on":["CTR-01","DOC-02"],"profile":"planner-specialist","files_allowed":["docs/planning/contracts/time-replay-save.md"],"consumes":["INT-01"],"spec_produces":["INT-02","INT-04","INT-05","INT-06","INT-10","INT-17"],"verify":"DOC"},
    {"id":"CTR-03","depends_on":["CTR-01"],"profile":"planner-specialist","files_allowed":["docs/planning/contracts/region-perception-overlay.md"],"consumes":["INT-01"],"spec_produces":["INT-03","INT-14","INT-15","INT-19"],"verify":"DOC"},
    {"id":"CTR-04","depends_on":["CTR-01","CTR-02"],"profile":"planner-specialist","files_allowed":["docs/planning/contracts/model-schema.md"],"consumes":["INT-01","INT-04"],"spec_produces":["INT-08","INT-09","INT-12","INT-13"],"verify":"DOC"},
    {"id":"CTR-05","depends_on":["CTR-01","CTR-02","CTR-03","CTR-04"],"profile":"planner-specialist","files_allowed":["docs/planning/contracts/toolchain-quality.md"],"consumes":["INT-01","INT-05"],"spec_produces":["INT-11","INT-18","INT-20"],"verify":"DOC"},
    {"id":"SCI-01","depends_on":["CTR-01","CTR-02","CTR-03","CTR-04","CTR-05"],"profile":"deep-specialist","files_allowed":["@B-SCAFFOLD"],"consumes":["INT-01","INT-05","INT-20"],"impl_produces":[],"verify":"SCAFFOLD","external_gate":"NEW_IMPLEMENTATION_AUTHORIZATION"},
    {"id":"SCI-02","depends_on":["SCI-01"],"profile":"standard-implementer","files_allowed":[".github/workflows/ci.yml","xtask/tests/ci_aggregation.rs"],"consumes":["INT-20"],"impl_produces":["INT-20"],"verify":"TOOLING"},
    {"id":"SCI-03","depends_on":["SCI-01","SCI-02"],"profile":"deep-specialist","files_allowed":["xtask/src/quality.rs","xtask/tests/quality_gate.rs"],"consumes":["INT-20"],"impl_produces":["INT-20"],"verify":"TOOLING"},
    {"id":"SCI-04","depends_on":["SCI-01","SCI-02"],"profile":"deep-specialist","files_allowed":["xtask/src/offline.rs","xtask/src/determinism.rs","xtask/tests/offline_gate.rs"],"consumes":["INT-20"],"impl_produces":["INT-20"],"verify":"TOOLING"},
    {"id":"CORE-01","depends_on":["SCI-01","SCI-02","SCI-03","SCI-04"],"profile":"deep-specialist","files_allowed":["crates/af-domain/src/lib.rs","crates/af-ports/src/lib.rs","crates/af-domain/tests/domain_contract.rs","crates/af-ports/tests/port_declarations.rs"],"consumes":["INT-01","INT-02","INT-10","INT-11","INT-12","INT-17","INT-18"],"declaration_produces":["INT-01","INT-02","INT-10","INT-11","INT-12","INT-17","INT-18"],"impl_produces":["INT-01","INT-02"],"verify":"DOMAIN"},
    {"id":"CORE-02","depends_on":["CORE-01"],"profile":"deep-specialist","files_allowed":["crates/af-core/src/lib.rs","crates/af-core/tests/core_step.rs"],"consumes":["INT-01","INT-02","INT-05"],"impl_produces":["INT-05"],"verify":"CORE"},
    {"id":"GRID-01","depends_on":["CORE-01","CORE-02"],"profile":"deep-specialist","files_allowed":["crates/af-core/src/region.rs","crates/af-core/tests/region_generation.rs"],"consumes":["INT-01","INT-03","INT-05"],"impl_produces":["INT-03"],"verify":"CORE"},
    {"id":"GAME-01","depends_on":["CORE-02","GRID-01","DOC-02"],"profile":"standard-implementer","files_allowed":["crates/af-core/src/actions.rs","crates/af-core/tests/native_actions.rs"],"consumes":["INT-02","INT-03","INT-04","INT-05"],"impl_produces":["INT-04"],"verify":"CORE"},
    {"id":"REPLAY-01","depends_on":["CORE-02","GAME-01"],"profile":"deep-specialist","files_allowed":["crates/af-core/src/replay.rs","crates/af-core/tests/replay_contract.rs"],"consumes":["INT-01","INT-04","INT-05","INT-06"],"impl_produces":["INT-06"],"verify":"CORE"},
    {"id":"SOC-01","depends_on":["GAME-01","DOC-02"],"profile":"standard-implementer","files_allowed":["crates/af-conversation/src/lib.rs","crates/af-conversation/tests/social_relations.rs"],"consumes":["INT-01","INT-02","INT-04","INT-07"],"impl_produces":["INT-07"],"verify":"CONVERSATION"},
    {"id":"SOC-02","depends_on":["SOC-01","REPLAY-01"],"profile":"standard-implementer","files_allowed":["crates/af-conversation/src/events.rs","crates/af-conversation/tests/event_codec.rs"],"consumes":["INT-01","INT-06","INT-07"],"impl_produces":["INT-07"],"verify":"CONVERSATION"},
    {"id":"SOC-03","depends_on":["SOC-01","SOC-02","GRID-01"],"profile":"deep-specialist","files_allowed":["crates/af-conversation/src/rumors.rs","crates/af-conversation/tests/regional_rumors.rs"],"consumes":["INT-02","INT-03","INT-07"],"impl_produces":["INT-07"],"verify":"CONVERSATION"},
    {"id":"STORE-01","depends_on":["CORE-02","REPLAY-01"],"profile":"deep-specialist","files_allowed":["crates/af-store/src/lib.rs","crates/af-store/tests/store_contract.rs"],"consumes":["INT-01","INT-06","INT-10"],"impl_produces":["INT-10"],"verify":"STORE"},
    {"id":"STORE-02","depends_on":["STORE-01","SOC-02"],"profile":"deep-specialist","files_allowed":["crates/af-store/src/migration.rs","crates/af-store/tests/migration_contract.rs"],"consumes":["INT-01","INT-07","INT-10"],"impl_produces":["INT-10"],"verify":"STORE"},
    {"id":"RULE-01","depends_on":["CTR-04","CORE-01"],"profile":"deep-specialist","files_allowed":["crates/af-rules/src/parser.rs","crates/af-rules/tests/proposal_parser.rs"],"consumes":["INT-01","INT-08"],"impl_produces":["INT-08"],"verify":"RULES"},
    {"id":"RULE-02","depends_on":["RULE-01","CORE-02","REPLAY-01","STORE-01"],"profile":"deep-specialist","files_allowed":["crates/af-rules/src/lib.rs","crates/af-rules/src/materializer.rs","crates/af-rules/tests/materializer.rs"],"consumes":["INT-02","INT-05","INT-08","INT-09","INT-10"],"impl_produces":["INT-08","INT-09"],"verify":"RULES"},
    {"id":"RULE-03","depends_on":["RULE-02","SCI-03"],"profile":"deep-specialist","files_allowed":["crates/af-rules/tests/adversarial_corpus.rs","crates/af-rules/tests/fixtures/proposals.json"],"consumes":["INT-08","INT-09","INT-20"],"impl_produces":[],"verify":"RULES"},
    {"id":"AI-01","depends_on":["SCI-04","CTR-05","CORE-01"],"profile":"deep-specialist","files_allowed":["crates/af-llm/src/transport.rs","crates/af-system-one/src/supervisor.rs","crates/af-system-one/tests/supervisor_contract.rs","docs/engineering/model-manifest.example.json"],"consumes":["INT-11","INT-20"],"impl_produces":["INT-11"],"verify":"MODELS"},
    {"id":"AI-02","depends_on":["AI-01","CTR-04","REPLAY-01"],"profile":"standard-implementer","files_allowed":["crates/af-system-one/src/client.rs","crates/af-llm/src/client.rs","crates/af-system-one/tests/client_contract.rs","crates/af-llm/tests/client_contract.rs"],"consumes":["INT-06","INT-11","INT-12"],"impl_produces":["INT-12"],"verify":"MODELS"},
    {"id":"APP-01","depends_on":["SOC-03","STORE-02","RULE-03","AI-02","NLG-01"],"profile":"deep-specialist","files_allowed":["crates/af-app/src/lib.rs","crates/af-app/tests/action_transaction.rs"],"consumes":["INT-04","INT-05","INT-07","INT-08","INT-09","INT-10","INT-12","INT-13","INT-17"],"impl_produces":["INT-17"],"verify":"APP"},
    {"id":"NLG-01","depends_on":["SOC-02","STORE-01","CTR-04"],"profile":"standard-implementer","files_allowed":["crates/af-nlg/src/lib.rs","crates/af-nlg/tests/historical_facts.rs"],"consumes":["INT-07","INT-10","INT-13"],"impl_produces":["INT-13"],"verify":"NLG"},
    {"id":"NLG-02","depends_on":["NLG-01","AI-02","APP-01"],"profile":"standard-implementer","files_allowed":["crates/af-nlg/src/cache.rs","crates/af-nlg/tests/narrative_contract.rs"],"consumes":["INT-12","INT-13","INT-17"],"impl_produces":["INT-13"],"verify":"NLG"},
    {"id":"E2E-01","depends_on":["APP-01","NLG-02"],"profile":"standard-implementer","files_allowed":["crates/af-scenario/src/main.rs","crates/af-scenario/tests/scenario_runner.rs"],"consumes":["INT-05","INT-06","INT-13","INT-17","INT-18"],"impl_produces":["INT-18"],"verify":"SCENARIO"},
    {"id":"CLI-01","depends_on":["AI-01","STORE-02","APP-01"],"profile":"standard-implementer","files_allowed":["crates/af-app/src/main.rs","crates/af-app/tests/diagnostics_cli.rs"],"consumes":["INT-10","INT-11","INT-17"],"impl_produces":[],"verify":"APP"},
    {"id":"TUI-01","depends_on":["E2E-01","CLI-01","NLG-02"],"profile":"standard-implementer","files_allowed":["crates/af-tui/src/lib.rs","crates/af-tui/tests/keyboard_flows.rs"],"consumes":["INT-04","INT-13","INT-17","INT-18"],"impl_produces":["INT-18"],"verify":"TUI"},
    {"id":"MOTOR-01","depends_on":["TUI-01","E2E-01","RULE-03"],"profile":"deep-specialist","files_allowed":["docs/planning/evidence/motor-acceptance.md","crates/af-scenario/tests/motor_acceptance.rs"],"consumes":["INT-06","INT-07","INT-18","INT-20"],"impl_produces":[],"verify":"SCENARIO","external_gate":"MOTOR_PRODUCT_ACCEPTANCE"},
    {"id":"GRID-02","depends_on":["GRID-01","STORE-02","DOC-02"],"profile":"standard-implementer","files_allowed":["crates/af-core/src/construction.rs","crates/af-core/tests/regional_construction.rs"],"consumes":["INT-03","INT-04","INT-10"],"impl_produces":["INT-03"],"verify":"CORE"},
    {"id":"FOV-01","depends_on":["GRID-02","CORE-01","CORE-02","STORE-02"],"profile":"deep-specialist","files_allowed":["crates/af-core/src/visibility.rs","crates/af-core/tests/perception_memory.rs"],"consumes":["INT-03","INT-10","INT-14"],"impl_produces":["INT-14"],"verify":"CORE"},
    {"id":"VIEW-01","depends_on":["FOV-01","CTR-03"],"profile":"deep-specialist","files_allowed":["crates/af-core/src/view.rs","crates/af-core/tests/view_silhouettes.rs"],"consumes":["INT-14","INT-15"],"impl_produces":["INT-14","INT-15"],"verify":"CORE"},
    {"id":"RENDER-01","depends_on":["VIEW-01","MOTOR-01"],"profile":"planner-specialist","files_allowed":["docs/planning/contracts/render-client.md"],"consumes":["INT-14","INT-15","INT-19"],"spec_produces":["INT-19"],"verify":"DOC","external_gate":"RENDER_STACK_AND_CODE_ALLOWLIST"},
    {"id":"PLAY-01","depends_on":["RENDER-01","GRID-02","FOV-01","MOTOR-01"],"profile":"deep-specialist","files_allowed":["docs/planning/evidence/isometric-product-acceptance.md"],"consumes":["INT-15","INT-18","INT-19"],"spec_produces":[],"verify":"DOC","external_gate":"RENDER_IMPLEMENTATION_AND_VISUAL_GOLDENS"},
    {"id":"BEH-01","depends_on":["CORE-01","GAME-01","CTR-03","VIEW-01"],"profile":"deep-specialist","files_allowed":["crates/af-core/src/behavior.rs","crates/af-core/tests/behavior_inference.rs"],"consumes":["INT-02","INT-14","INT-16"],"impl_produces":["INT-16"],"verify":"CORE","external_gate":"BEHAVIOR_CONTRACT"},
    {"id":"BEH-02","depends_on":["BEH-01","STORE-02"],"profile":"deep-specialist","files_allowed":["crates/af-core/src/genome.rs","crates/af-core/tests/genetic_contract.rs"],"consumes":["INT-02","INT-10","INT-16"],"impl_produces":["INT-16"],"verify":"CORE"},
    {"id":"BEH-03","depends_on":["BEH-02","DOC-02"],"profile":"deep-specialist","files_allowed":["crates/af-core/src/learning.rs","crates/af-core/tests/evolution_contract.rs"],"consumes":["INT-07","INT-16"],"impl_produces":["INT-16"],"verify":"CORE","external_gate":"REWARD_PROTOCOL"},
    {"id":"BEH-04","depends_on":["BEH-03","CLI-01"],"profile":"deep-specialist","files_allowed":["xtask/src/train_behavior.rs","xtask/tests/training_contract.rs","docs/planning/evidence/archetype-review.md"],"consumes":["INT-16"],"impl_produces":[],"verify":"TOOLING","external_gate":"TRAINING_TOOL_AND_ARCHETYPE_AUTHORIZATION"},
    {"id":"PERF-01","depends_on":["MOTOR-01"],"profile":"deep-specialist","files_allowed":["docs/performance/benchmark-protocol.md","docs/performance/windows-linux-baseline.md"],"consumes":["INT-05","INT-12","INT-18"],"spec_produces":[],"verify":"DOC","external_gate":"SELECTED_MILESTONE_AND_MEASUREMENT_AUTHORIZATION"},
    {"id":"SOAK-01","depends_on":["PERF-01","STORE-02","AI-02","E2E-01"],"profile":"deep-specialist","files_allowed":["docs/performance/soak-recovery.md","crates/af-scenario/tests/soak_smoke.rs"],"consumes":["INT-06","INT-10","INT-12","INT-18"],"impl_produces":[],"verify":"SCENARIO","external_gate":"SOAK_RUN_AUTHORIZATION"},
    {"id":"REL-01","depends_on":["SOAK-01","PERF-01"],"profile":"deep-specialist","files_allowed":["xtask/src/packaging.rs","xtask/tests/package_contract.rs","docs/legal/assets.md"],"consumes":["INT-11","INT-20"],"impl_produces":["INT-20"],"verify":"TOOLING","external_gate":"MILESTONE_SCOPE_AND_LICENSES"},
    {"id":"REL-02","depends_on":["REL-01"],"profile":"planner-specialist","files_allowed":["docs/planning/evidence/release-go-no-go.md"],"consumes":["INT-20"],"spec_produces":[],"verify":"DOC","external_gate":"EXPLICIT_COMMIT_PUSH_PR_MERGE_RELEASE_AUTHORIZATION"}
  ]
}
```

As linhas de decisão/render/performance/release não autorizam código ou publicação faltantes.
Depois do gate escolhido, o manifesto é revisado com caminhos reais e subpacotes completos antes
do dispatch; não fingir que um relatório de aceitação equivale à construção do cliente/pacote.
Ao escolher release de M3/M4, acrescentar PLAY-01/BEH-04 às dependências de PERF-01/REL-01 conforme
escopo. A referência acima é o caminho técnico de M2, preservando a ordem M2 → M3.

## 5. Cálculo e verificação das ondas

### Matriz topológica calculada — referência de planejamento, não execução

A validação estática do manifesto gerou **25 fronteiras de referência**. A largura abaixo é
resultado das dependências, não limite de agentes. Todas as tarefas prontas de cada fronteira
podem rodar em suas worktrees futuras; gates externos continuam necessários. W0–W9 no plano
principal são grupos temáticos e não substituem esta ordem detalhada.

| Fronteira | Tarefas independentes de referência |
| --- | --- |
| 01 | DOC-01 |
| 02 | CTR-01, DOC-02 |
| 03 | CTR-02, CTR-03 |
| 04 | CTR-04 |
| 05 | CTR-05 |
| 06 | SCI-01 — somente com nova autorização de implementação |
| 07 | SCI-02 |
| 08 | SCI-03, SCI-04 |
| 09 | CORE-01 |
| 10 | AI-01, CORE-02, RULE-01 |
| 11 | GRID-01 |
| 12 | GAME-01 |
| 13 | REPLAY-01, SOC-01 |
| 14 | AI-02, SOC-02, STORE-01 |
| 15 | NLG-01, RULE-02, SOC-03, STORE-02 |
| 16 | GRID-02, RULE-03 |
| 17 | APP-01, FOV-01 |
| 18 | CLI-01, NLG-02, VIEW-01 |
| 19 | BEH-01, E2E-01 |
| 20 | BEH-02, TUI-01 |
| 21 | BEH-03, MOTOR-01 |
| 22 | BEH-04, PERF-01, RENDER-01 — gates específicos de contrato, medição e decisão de render |
| 23 | PLAY-01, SOAK-01 — somente após os gates de implementação visual/medição |
| 24 | REL-01 |
| 25 | REL-02 — operações de publicação somente quando explicitamente autorizadas |

A linha RENDER-01 ainda é decisão documental enquanto a stack estiver aberta; não declara
cliente implementado. PLAY-01 e release não ficam concluídos por gerar um relatório. Ao revisar
contratos, escolher stack, percepção abstrata ou escopo de release, recalcular esta matriz e
suas allowlists antes de delegar; não manter a tabela como um segundo grafo divergente.

### Regra de cálculo e auditoria

`wave(t) = 1` para raiz; caso contrário `wave(t) = 1 + max(wave(d))` para cada dependência `d`.
Decisões externas fechadas são precondições, não tarefas imaginárias. A onda só está pronta
quando todos os predecessores foram integrados/aceitos e os gates externos correspondentes permitem.

1. Validar unicidade dos 46 IDs e existência de cada dependência.
2. Ordenar topologicamente; ciclo é bloqueador, não justificativa para executar “na melhor ordem”.
3. Expandir bundles e verificar interseção de `files_allowed` de tarefas da mesma onda.
4. Em colisão, atribuir o arquivo compartilhado ao juiz, unir fatia vertical ou adicionar dependência de serialização e recalcular. Nunca impor cap de agentes para esconder colisão.
5. Congelar membros/base/contratos e preparar todas as worktrees antes do disparo concorrente.
6. Emitir brief autocontido por tarefa, sem toda a conversa/histórico. Incluir os contratos completos referenciados, não apenas IDs que o trabalhador não consegue consultar.
7. Após todas as entregas, juiz integra/corrige/revisa/valida; só então publica o go/no-go técnico e calcula a próxima fronteira.

### Arquivos de integração exclusivos do juiz

Facades/exports/registro central de sistemas e ferramentas, ligações de cenários, alterações
 compartilhadas de CI/manifests e ledger central não recebem edições concorrentes fora de allowlist
 explícita. O juiz registra esses caminhos em sua própria tarefa de integração por onda.
Cada chave pública criada precisa ser exportada/ligada e testada pelo consumidor; arquivo criado
isoladamente não prova uma funcionalidade. Correções do juiz também têm regressão e revisão independente.

## 6. Verificação rápida por tarefa — futura, condicionada ao ambiente

O campo `verify` seleciona a família abaixo. Para implementação, acrescentar o filtro do cartão
`given_<id em minúsculo com hífen convertido em underscore>_`; exemplos literais:
`given_core_01_`, `given_rule_02_`, `given_store_01_`. O contrato de testes deve registrar os nomes
antes do Red; **zero testes selecionados é falha**, nunca Green.

| ID | Comando-base proposto | Disponibilidade e evidência |
| --- | --- | --- |
| DOC | `npx --offline --no-install markdownlint-cli2 "**/*.md"` | Cache/tooling de Markdown validado; critérios semânticos/DAG/escopo conferidos adicionalmente. Não instala silenciosamente. |
| SCAFFOLD | `cargo check --workspace --locked` | Somente depois de autorização e manifests; testes negativos de compilação/arquitetura/contratos permanecem necessários. |
| TOOLING | `cargo nextest run -p xtask --profile ci` | Depois de SCI-01 e perfil/ferramenta reais; suites de medidores/negativas, não prova de cobertura de produção inexistente. |
| DOMAIN | `cargo nextest run -p af-domain -p af-ports --profile ci` | Depois de freeze/implementação; inclui contratos/compilação de ambos os crates. Declaração sem lógica exige prova de compilação/doc/contrato, não cobertura fictícia de crate vazio. |
| CORE | `cargo nextest run -p af-core --profile ci` | Fakes e caso unitário rápido do cartão; testes regionais/100 runs/10k ticks são gates adicionais próprios. |
| CONVERSATION | `cargo nextest run -p af-conversation --profile ci` | Sem modelos/I/O; bytes/bp/rumores e integração regional verificáveis. |
| STORE | `cargo nextest run -p af-store --profile ci` | Tempdir/fault injection, sem rede/modelos; recuperação/migração não substituída por lint. |
| RULES | `cargo nextest run -p af-rules --profile ci` | Sintaxe/semântica/allowlist; corpus 400 e mutação/cobertura completos fora do único teste rápido. |
| MODELS | `cargo nextest run -p af-system-one -p af-llm --profile ci` | Fake/cassette no PR; real é suite explícita separada, nunca requisito de peso/GPU do PR. |
| APP | `cargo nextest run -p af-app --profile ci` | Fakes para composição/CLI e erro durável observável. |
| NLG | `cargo nextest run -p af-nlg --profile ci` | Claims/template/cache e corpus; sem inferência real julgando lógica. |
| SCENARIO | `cargo nextest run -p af-scenario --profile ci` | Cenário mínimo e contrato do runner; soak 12 h não escondido no comando rápido. |
| TUI | `cargo nextest run -p af-tui --profile ci` | TestBackend/KeyEvent, sem terminal real/GPU/rede. |

**Exemplo futuro completo do cartão:** `cargo nextest run -p af-core --profile ci given_core_02_`.
É especificação do alvo de teste, não afirmação de um comando executável hoje. CTR-05/SCI-01
validam versão, help, perfil, seleção de testes e formato de evidência antes da primeira utilização.
Se sintaxe/ferramenta não existir, registrar e corrigir o contrato; não improvisar flags ou resultado.

Cada cartão exige: Red pelo motivo previsto, Green com exit 0 e teste selecionado, Refactor
verde, caso feliz/erro/limite e evidências indicadas no cartão do [ROADMAP](<../../ROADMAP.md>).
AC-<ID>-01 corresponde ao comportamento de objetivo/entrega; AC-<ID>-02 aos erros/limites do
aceite; AC-<ID>-03 à ausência de escrita fora da allowlist; AC-<ID>-04 ao contrato de consumo/produção
 e integração. Os textos completos são os do cartão, não critérios genéricos que substituem suas condições.

A meta de ciclo rápido é inferior a 60 segundos, **não medido agora para código inexistente**.
Se exceder, decompor o teste mínimo ou registrar a condição sem omitir as verificações pesadas:
mutação/cobertura, 100 execuções, corpus completo, 100 gerações, live/manual e soak 12 h.
Nenhum comando de aplicação desta seção foi executado nesta sessão.

## 7. Contrato de retorno e ledger futuro

Cada trabalhador devolve apenas sua evidência, sem atualizar a fonte central concorrente:

| Campo | Conteúdo obrigatório |
| --- | --- |
| STATUS | DELIVERED, BLOCKED, FAILED ou INTERRUPTED; não declarar INTEGRATED por conta própria. |
| TASK_ID | ID e revisão do cartão. |
| BASE | SHA da base e revisão dos contratos recebidos. |
| WORKTREE | Caminho absoluto verificado e branch própria. |
| FILES_TOUCHED | Lista efetiva, confrontada com allowlist/forbidden. |
| CONTAINS/ANTI_SCOPE | Critérios funcionais cumpridos e fronteiras não atravessadas, com referência de teste/diff. |
| RED/GREEN/REFACTOR | Comandos reais, testes selecionados, exit codes e resultados; falha de setup não vira Red válido. |
| ARTIFACTS | Seed/hash/fixtures/diffs/logs/relatórios/licenças relevantes. |
| COMMIT_SHA | SHA real somente quando commit local foi autorizado; do contrário registrar ausência e diff completo. |
| BLOCKER | Condição concreta, impacto/consumidores e próxima ação; não usar “parece funcionar”. |

O juiz mantém um ledger único: membros da onda; resultado por membro; revisão independente;
resoluções de conflito; gates compostos; aceite/bloqueio; base resultante e próxima fronteira.
Nenhuma onda está executada neste documento; campos de evidência não são preenchidos com SHAs
fictícios, aprovação presumida ou contagens de testes inexistentes.

## 8. Auditoria pré-entrega do PLANO

| Dimensão | Prova exigida | Bloqueador |
| --- | --- | --- |
| Cobertura | D-01…D-08/nota D-07 e invariantes mapeados a cartões. | Requisito órfão ou escolha humana substituída por recomendação. |
| Completude | Cada cartão tem objetivo/dono/deps/como/aceite; manifesto tem perfil/paths/interfaces/verificação. | Campo faltante, “faça validação adequada” ou tarefa indefinida. |
| Dependências | IDs válidos, DAG, waves calculadas e gates externos explícitos. | Ciclo, ID inexistente ou etapa liberada sem predecessor/contrato. |
| Key links | Interface produzida é exportada, consumida e verificada. | Módulo isolado, teste vazio ou consumidor de API não congelada. |
| Escopo | Pacote atômico e brief autocontido; exceções justificadas. | Contexto histórico inteiro, responsabilidades misturadas ou mudança não solicitada. |
| Goal-backward | Objetivo → efeito observável → evidência/cenário → cartão. | Checklist que mede atividade mas não prova resultado. |
| Contexto/anti-escopo | Decisões bloqueadas honradas; ideias adiadas ausentes. | Construção agora, rede/3D/vila/cap de agentes ou overlay contaminando conhecimento. |
| Verificação rápida | Alvo explícito e teste mínimo; pesados separados; disponibilidade honesta. | Comando inventado como existente, no-tests Green ou soak/mutação omitidos. |
| Contratos | Consumes/Produces e assinatura/revisão iguais; fronteiras disjuntas na mesma onda. | Deriva de nome/tipo/schema, colisão não tratada ou certeza falsa sobre codec/stack. |

**Aceite final deste suplemento:** manifesto parseável com 46 IDs, todas as dependências existentes,
DAG acíclico, bundles finitos, nenhum conflito de arquivo na mesma onda de referência, contratos
propostos marcados honestamente e conexão ao plano principal. A aprovação continua sendo do
**planejamento**, não da aplicação, do freeze técnico ou de uma autorização de execução.
