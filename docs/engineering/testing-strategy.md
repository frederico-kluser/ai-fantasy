# Estratégia de Testes

> **Normativo.** Este documento operacionaliza o ADR 0006. Se não conseguires testar uma
> mudança com os mecanismos daqui, o problema é de arquitetura — abre uma issue antes de
> adicionar um *hack* de teste.

## 1. O que significa “100% testável”

Não significa 100% de cobertura de linhas. Significa que **todo o comportamento** tem:

| Propriedade | Definição operacional |
| --- | --- |
| **Observabilidade** | Produz um efeito observável (retorno, evento, estado, erro) através de uma porta pública. |
| **Controlabilidade** | Todas as entradas não determinísticas (tempo, RNG, modelo, store, rede, ambiente) são injetáveis. |
| **Isolamento** | Unitário sem I/O; integração com *tempdir*; E2E com modelos falsos. |
| **Determinismo** | Mesmo seed/entradas ⇒ mesma saída canónica. |
| **Contrato** | Cada porta tem os mesmos casos contra fake e adaptador real. |
| **Regressão** | Todo bug tem um teste que falha antes da correção. |
| **Força** | Mutação acima do limiar; cobertura não é o único critério. |

Cobertura e mutação são **gates**, não objetivos. Um teste que só executa código sem
afirmar comportamento não conta.

## 2. TDD: Red → Green → Refactor

### Antes de escrever código

1. Escreve uma **test list** (ver template no fim) com os comportamentos e os casos de
   erro/limite.
2. Escolhe o próximo comportamento mais simples e observável.
3. Escreve o teste que o descreve.

### As três leis

1. Não escrever código de produção até existir um teste que falhe.
2. Não escrever mais teste do que o suficiente para falhar (erro de compilação conta).
3. Não escrever mais código do que o suficiente para o teste passar.

### Ciclo

```text
Red    → teste falha pelo motivo certo (asserção, não erro de setup)
Green  → implementação mínima; sem “já que estou aqui”
Refactor → remove duplicação, melhora nomes, reduz complexidade; testes verdes
```

- Commit apenas em Green (ou num ponto deliberado de WIP, nunca em `main`).
- Não refatorar enquanto está Red.
- Se o teste for difícil de escrever, o desenho está errado: introduz uma porta/seam.

### Nomes

```rust
#[test]
fn given_empty_event_sequence_when_render_then_returns_empty_narrative() { ... }

#[test]
fn given_dc_above_25_when_validate_rule_then_rejects_with_out_of_range() { ... }
```

- Um comportamento por teste; um conceito de asserção por teste.
- `Arrange / Act / Assert` separados por linhas em branco.
- Sem `if`, `for`, `while` ou `match` no corpo do teste (exceto property tests).
- Sem `sleep`, sem ordem implícita, sem dependência de outro teste.
- Testes de erro verificam a **variante** e os **campos** relevantes, não a mensagem
  inteira (mensagens mudam).

## 3. Pirâmide e mapa de suites

| Nível | Percentagem alvo | O que cobre | Onde |
| --- | --- | --- | --- |
| Unitário | 60–70% | Funções puras, matemática, validação, parser, regras. | `src/**/tests` ou `tests/unit` |
| Property | 5–10% | Invariantes, canonicalização, parsers, sequências. | `tests/property` |
| Integração | 15% | Fronteiras de crate, SQLite, HTTP loopback falso. | `tests/integration` |
| Contrato | 5% | Portas vs fake vs real. | `tests/contract` |
| E2E | 5–10% | Binário + cenário + golden. | `tests/e2e` |
| Performance/soak | à parte | Orçamentos, memória, 12 h. | `benches/`, nightly |

Quando implementado, o CI executará unit/property/integration/contract/E2E de PR com
fake/cassette. Contratos real/live e medições de modelos ficam em nightly/manual
preprovisionados; nenhum PR passa a depender de pesos ou hardware por tocar essas áreas.

## 4. Testes unitários

- Sem rede, sem ficheiros, sem processos, sem `Instant::now`, sem `thread_rng`.
- Usa `FixedClock`, `SeededTestRng`, `InMemoryStore`, `ScriptedSystemOne`, `FixtureLlm`.
- Um teste pode ter vários `assert`, desde que todos descrevam o mesmo comportamento.
- Construtores de teste (`ActorBuilder`, `WorldBuilder`, `RuleProposalBuilder`) evitam
  ruído; não escondem a asserção.
- Para erros, usa `matches!` ou compara a variante; não compares `Debug` inteiro.

## 5. Property-based tests

`proptest` para invariantes que devem valer para **todo** o input:

| Invariante | Exemplo |
| --- | --- |
| HP nunca negativo | `apply_damage(hp, dmg) >= 0` |
| Relações limitadas | `-10_000 <= value <= 10_000` |
| Rumor não aumenta fidelidade | `fidelity(t+1) <= fidelity(t)` |
| Serialização round-trip | `decode(encode(state)) == state` |
| Canonicalização idempotente | `canonical(canonical(x)) == canonical(x)` |
| Regra válida nunca produz efeito fora da allowlist | `materialize(valid) ∈ allowed` |
| Ordem de ticks não afeta hash | `hash(replay) == hash(live)` |

- *Shrinking* ativo; falha imprime o caso mínimo.
- Seeds de regressão versionados em `proptest-regressions/`.
- Property tests não substituem exemplos: mantém pelo menos um caso concreto por regra.

## 6. Contract tests

Cada porta tem uma suite única, parametrizada pela implementação:

```rust
fn system_one_contract<S: SystemOnePort>(factory: impl Fn() -> S) {
    // casos: noul, choice, score, estado vazio, estado enorme,
    // timeout, resposta malformada, confiança baixa.
}
```

- Fake e real passam a mesma suite.
- O real é `#[ignore = "requires local model"]`; a nightly corre com `--ignored`.
- O contrato define o comportamento em erro, não só em sucesso.
- Testes de contrato de store cobrem: save/load, migração, corrupção, concorrência,
  limites de tamanho.

## 7. Golden e snapshot tests

- `insta` para saída canónica (JSON, texto de interface, relatórios).
- Golden é **aprovado por humano**; `cargo insta review` mostra o diff.
- Nunca fazer *bless* automático no CI; o CI falha e o artifact mostra o diff.
- Saída canónica: chaves ordenadas, sem timestamps/IDs aleatórios, floats formatados de
  forma fixa.
- Um golden test deve falhar por mudança de comportamento, não por ambiente. Se falhar
  por SO/versão, o teste está mal desenhado.

## 8. Testes E2E

### 8.1 Objetivo

Provar que o **binário real** compõe as peças corretamente: CLI → app → core → regras →
store → output, com modelos falsos e sem rede. E2E não substitui unit tests; cobre a
integração e os contratos de composição.

### 8.2 Runner

Binário `af-scenario` (planeado; pode ser `cargo run -p af-scenario --`):

```bash
af-scenario run tests/e2e/scenarios/forged-debt.json \
  --seed 42 \
  --out .work/e2e/forged-debt \
  --format json
```

Contrato do CLI:

| Exit | Significado |
| --- | --- |
| `0` | Cenário passou; todos os `expect` verdadeiros. |
| `1` | Asserção falhou; output canónico + diff nos artifacts. |
| `2` | Uso inválido / cenário malformado. |
| `3` | Erro de ambiente (modelo ausente em modo live, permissões). |
| `4` | *Timeout* do cenário. |

### 8.3 Formato do cenário

```json
{
  "schema_version": 1,
  "name": "forged-debt-extortion",
  "seed": 42,
  "world": { "fixture": "region-multi-localities-small" },
  "models": {
    "mode": "fake",
    "system_one": "tests/fixtures/system-one/extortion.json",
    "llm": "tests/fixtures/llm/extortion-rule.json"
  },
  "steps": [
    { "kind": "spawn", "actor": "player", "at": "tavern" },
    { "kind": "spawn", "actor": "merchant_15", "at": "tavern" },
    { "kind": "command", "text": "Mostro a carta de dívida falsificada..." },
    { "kind": "tick", "count": 10 },
    { "kind": "expect_event", "type": "RULE_APPLIED", "count": 1 },
    { "kind": "expect_state", "path": "actors.merchant_15.fear_bp", "equals": 3500 },
    { "kind": "expect_state", "path": "actors.merchant_15.hp", "equals": 100 },
    { "kind": "snapshot", "name": "after-extortion" }
  ]
}
```

Regras:

- `schema_version` obrigatório; campos desconhecidos rejeitados.
- `seed` explícito, nunca aleatório no CI.
- `models.mode`: `fake` (default), `cassette`, `live` (só nightly/manual).
- `world.fixture` referencia um fixture versionado e pequeno.
- Passos são declarativos; sem código executável no cenário.
- `expect` falha com mensagem que inclui caminho, esperado, obtido e `state_hash`.

### 8.4 Output canónico

```json
{
  "schema_version": 1,
  "scenario": "forged-debt-extortion",
  "seed": 42,
  "ticks": 10,
  "final_state_hash": "blake3:...",
  "events": [
    { "tick": 3, "type": "RULE_PROPOSED", "rule_id": "..." },
    { "tick": 3, "type": "RULE_VALIDATED", "rule_id": "..." },
    { "tick": 3, "type": "RULE_APPLIED", "rule_id": "..." }
  ],
  "assertions": [{ "name": "fear_bp", "ok": true }]
}
```

- Resultado semântico ordenado, sem dados voláteis, com `state_hash` e entradas normalizadas
  contratadas. Tempo de relógio real, latência, percentis, RAM/VRAM e hardware **não entram**
  na comparação estrita de golden ou no hash autoritativo.
- Métricas e contagens de chamadas ficam em artefato de diagnóstico separado, identificado
  por cenário/build/perfil; não são comparadas como estado canônico do mundo.
- O artifact de reprodução registra o comando disponível e a seed; exemplos de runner e
  fixtures aqui são planejamento, não executáveis ou testes já criados.
- Golden correspondente em `tests/e2e/golden/<scenario>/<seed>.json`.

### 8.5 Hermeticidade

- `AF_HOME`/`AF_SAVE_DIR` apontam para um diretório temporário por execução.
- `AF_MODELS_DIR` vazio em modo fake; nenhum *sidecar* é lançado.
- `AF_OFFLINE=1`; o transporte falso falha em qualquer *host* que não seja loopback.
- Nenhuma dependência de locale, timezone, rede, GPU ou modelo.
- O teste falha se o cenário escrever fora do diretório temporário (verificação de
  caminhos no harness).

### 8.6 Catálogo mínimo

| Cenário | O que prova |
| --- | --- |
| `native-action` | Ação com handler nativo não chama LFM3 e altera estado. |
| `novel-rule` | Proposta válida é validada, materializada e aplicada. |
| `invalid-rule` | Proposta inválida é rejeitada; estado não muda. |
| `prompt-injection` | Texto malicioso no estado não introduz efeitos fora do schema. |
| `determinism-replay` | Mesma seed + log ⇒ mesmo `state_hash`. |
| `save-load` | Save/load preserva estado e hash. |
| `model-unavailable` | Sem modelos, o jogo continua em fallback. |
| `migration` | Save antigo migra sem perda. |
| `soak-smoke` | 10 mil ticks lógicos headless sem panic/leak óbvio; não equivale a soak de 12 h. |
| `action-driven-time` | Movimento/fala simbólica cobra custo contratado; NLG/cache/espera/câmera não avança ticks. |
| `regional-cross-locality` | Base gera várias localidades; efeitos sociais/rumores/agendas entre áreas evoluem nos ticks de ações. |
| `regional-focus-independence` | Mudar câmera/foco não congela outras áreas nem remove suas entidades do hash. |
| `last-seen-isolation` | Mudança de criatura/terreno fora do FOV não atualiza snapshot autoritativo pela apresentação. |
| `privileged-silhouette` | Não percebido atrás de construção aparece no overlay de todos, sem atualizar conhecimento/MLP ou memória do ambiente. |
| `overlay-channel-separation` | Percepção e overlay têm interfaces somente leitura distintas; alcance, escuro e Z seguem contrato explícito. |

**Revisão documental: 2026-11-08.** Esses cenários são requisitos de planejamento, não testes
implementados ou executados. Custos/ordem de tempo e atividade regional dependem do
[ADR 0008 proposto](<../architecture/adr/0008-action-driven-simulation-time.md>); alcance,
áreas nunca vistas/Z e permissões de silhuetas dependem do
[ADR 0009 proposto](<../architecture/adr/0009-privileged-silhouette-overlay.md>).
Fixtures unitárias pequenas são permitidas, mas a base do core exige integração regional
desde o início. Foco social em uma área não transforma a região em vila isolada.

### 8.7 E2E de UI (fase posterior)

- `ratatui` com `TestBackend` + `insta` para snapshots de ecrã em texto.
- Sem screenshots de píxeis; o output é texto canónico.
- Testes de teclado: `KeyEvent` injetado, sem terminal real.
- Um teste por fluxo: abrir conversa, ler histórico, fechar, guardar.

## 9. Testes com modelos

| Modo | Determinismo | Rede | Onde |
| --- | --- | --- | --- |
| `fake` | Total | Não | PR |
| `cassette` | Total (resposta gravada) | Não | PR |
| `live` | Não | Loopback | Nightly/manual |

- Cassettes são gravadas com `temperature=0` e modelo/versão registados.
- Sanitizar *prompts* e respostas antes de versionar (sem dados pessoais).
- Testes live medem latência e qualidade; falham se o modelo não estiver disponível.
- Nunca usar o modelo real para decidir se um teste de lógica passa.

## 10. Determinismo e replay

Testes obrigatórios no core:

```rust
#[test]
fn given_same_seed_when_run_100_times_then_same_state_hash() { ... }

#[test]
fn given_command_log_when_replay_then_equals_live_state() { ... }

#[test]
fn given_platform_a_and_b_when_same_scenario_then_same_hash() { ... } // CI matrix
```

- O hash cobre o estado inteiro, não só um resumo.
- O log de comandos é versionado; mudanças exigem migração/golden novo.
- Testes de determinismo correm em Linux e Windows no CI.

## 11. Performance e soak

- `criterion` para benchmarks; não bloqueiam PRs, mas regressões > 20% exigem explicação.
- Benchmarks: tick 10k entidades, save/load 10k, triagem 16 questões, NLG 3 eventos.
- Soak futuro: 12 h de agenda controlada de ações/modelos, com monitoramento de RSS/VRAM.
  Smoke de 10 mil ticks é teste lógico distinto; não avançar simulação só porque o teste
  de soak aguarda relógio real. A agenda de ações precisa ser explícita e reproduzível.
- D-05 não fixa teto de hardware nesta etapa: CPU/GPU da mesma máquina do maintainer em
  Windows/Linux, resultados honestos por sistema/build/contexto/população/localidades.
- Números anteriores de latência/memória são referências diagnósticas, não gates que reduzem
  o escopo regional ou escolhem um perfil mínimo ainda não aprovado. Gates de correção,
  qualidade, determinismo e offline permanecem.
- Relatórios de performance ficam separados de hashes/goldens; requisitos mínimos e política
  de regressão serão contratados com evidência. Nenhuma medição foi executada neste pacote.

## 12. Cobertura e mutação

| Gate | Limiar | Ferramenta |
| --- | --- | --- |
| Linha global | ≥ 90% | `cargo llvm-cov` |
| Ramo global | ≥ 85% | `cargo llvm-cov` |
| `af-rules` linha/ramo | 100% | `cargo llvm-cov` |
| `af-core` linha/ramo | ≥ 95% / ≥ 90% | `cargo llvm-cov` |
| Diff do PR | ≥ 95% | `cargo llvm-cov` + comparação |
| Mutação global | ≥ 80% | `cargo mutants` |
| Mutação core/rules | ≥ 90% | `cargo mutants` |

- Exclusões: código gerado, `main.rs`, testes, `#[cfg(test)]`; sempre justificadas.
- Cobertura de ramo é mais importante que linha; um `if` sem teste de ambos os lados
  conta como falha.
- Mutantes equivalentes são documentados e excluídos com justificação.

## 13. CI

```yaml
# pseudocódigo do pipeline
fmt → clippy → nextest (unit/property/integration/contract) → e2e
    → llvm-cov (gates) → cargo deny → cargo audit → docs → link check
mutants (nightly / paths críticos) → live models (nightly) → soak (nightly)
```

- `build` é o job agregador e o *required status check*.
- Cache de `target/` e de ferramentas; nunca cache de modelos.
- Falha de E2E sobe artifacts: cenário, seed, output, logs, `repro.sh`, cassette.
- Nenhum teste de PR depende de rede ou de pesos.

## 14. Fixtures e dados

- Pequenas, legíveis, versionadas, determinísticas.
- Nada de dados pessoais, segredos ou conteúdo de terceiros sem licença.
- Formato canónico (JSON com chaves ordenadas) e schema versionado.
- Um fixture por comportamento; não um “mundo gigante” para todos os testes.
- Fixtures de save antigo ficam em `tests/fixtures/saves/` e são usadas nos testes de
  migração.

## 15. Testes instáveis (*flaky*)

- *Flaky* é bug, não ruído. Abre issue com label `flaky` e prioridade alta.
- Não silenciar com `retry` ou `#[ignore]` sem issue e prazo.
- Causas comuns: tempo, rede, ordem, estado global, concorrência, locale.
- O teste deve ser determinístico ou removido; “passa às vezes” não é aceitável.

## 16. Regressões

- Bug fix: primeiro um teste que reproduz o bug e falha; depois a correção.
- O teste referencia a issue (`// Regression test for #123`).
- Se o bug é de dados, adicionar o fixture mínimo que o reproduz.
- Se o bug é de modelo, adicionar cassette + verificação factual.

## 17. O que não testar

- Detalhes de implementação privada que mudam a cada refactor.
- `Debug`/`Display` de tipos internos, exceto se for contrato público.
- Comportamento de bibliotecas de terceiros (testa o nosso adaptador, não o `serde`).
- Números exatos de performance em PRs (usa benchmarks e tolerância).
- Aleatoriedade do modelo real (testa o contrato e a validação, não a “criatividade”).

## 18. Templates

### 18.1 Test list (colar no PR/issue)

```markdown
## Test list

- [ ] given ... when ... then ...
- [ ] given ... (erro) then ...
- [ ] given ... (limite) then ...
- [ ] property: ...
- [ ] contract: ...
- [ ] e2e: ...
```

### 18.2 Cenário E2E

Ver secção 8.3. Copie `tests/e2e/scenarios/_template.json` quando existir.

### 18.3 Test plan do PR

```markdown
## Test plan

- Unit: ...
- Property: ...
- Contract: ...
- E2E: `af-scenario run ... --seed ...`
- Live (se aplicável): modelo, hardware, latência
- Não testado (e por quê): ...
```

## 19. Referências

- [ADR 0006 — TDD, cobertura e mutação](../architecture/adr/0006-tdd-coverage-mutation.md)
- [cargo-nextest](https://nexte.st/)
- [cargo-llvm-cov](https://github.com/taiki-e/cargo-llvm-cov)
- [cargo-mutants](https://mutants.rs/)
- [proptest](https://proptest-rs.github.io/proptest/)
- [insta](https://insta.rs/)
- [assert_cmd](https://docs.rs/assert_cmd/)
- [Martin Fowler — TDD](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
