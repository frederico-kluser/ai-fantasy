# Prompts dos subagents — plano aprovado, execução futura

> **SOMENTE MARKDOWN.** 46 prompts de trabalhadores e 46 etapas individuais de revisão.
> Não executar os prompts, construir a aplicação ou criar/remover worktrees neste pedido.

O [ROADMAP](<../../../ROADMAP.md>) define as atividades; o [manifesto e interfaces](<../wave-spec.md>)
continuam fonte dos contratos. A orientação aprovada no Plannotator foi incorporada: skill CoALA,
update/sync, teste de recuperação antes de entregar, revisor por trabalhador e cleanup seguro pelo revisor.

- [Orquestrador](<orchestrator.md>) prepara base/worktrees/snapshots e controla a barreira.
- [Juiz](<judge.md>) integra todas as entregas, resolve problemas, valida e prepara a próxima fronteira.
- [Protocolo](<../subagent-protocol.md>) explica R1/R2, memória isolada/canônica e quando remover.
- Cada prompt incorpora seu cartão, interfaces aplicáveis e protocolo completo; não depende da conversa.
- Caminhos de worktree são relativos à raiz ORIGINAL e serão resolvidos/verificados antes da ativação futura.
- O worker entrega ao revisor; revisor fecha após integração/CoALA/cleanup. Aprovação do plano não autoriza implementação.

## 46 trabalhadores e 46 revisores

| Tarefa | Fronteira de referência | Worktree / branch propostas | Prompt worker | Etapa de revisão |
| --- | --- | --- | --- | --- |
| DOC-01 | 01 | `doc-01` / `docs/doc-01` | [Trabalhador](<doc-01.md>) | [Revisor](<review-doc-01.md>) |
| DOC-02 | 02 | `doc-02` / `docs/doc-02` | [Trabalhador](<doc-02.md>) | [Revisor](<review-doc-02.md>) |
| CTR-01 | 02 | `ctr-01` / `docs/ctr-01` | [Trabalhador](<ctr-01.md>) | [Revisor](<review-ctr-01.md>) |
| CTR-02 | 03 | `ctr-02` / `docs/ctr-02` | [Trabalhador](<ctr-02.md>) | [Revisor](<review-ctr-02.md>) |
| CTR-03 | 03 | `ctr-03` / `docs/ctr-03` | [Trabalhador](<ctr-03.md>) | [Revisor](<review-ctr-03.md>) |
| CTR-04 | 04 | `ctr-04` / `docs/ctr-04` | [Trabalhador](<ctr-04.md>) | [Revisor](<review-ctr-04.md>) |
| CTR-05 | 05 | `ctr-05` / `docs/ctr-05` | [Trabalhador](<ctr-05.md>) | [Revisor](<review-ctr-05.md>) |
| SCI-01 | 06 | `sci-01` / `build/sci-01` | [Trabalhador](<sci-01.md>) | [Revisor](<review-sci-01.md>) |
| SCI-02 | 07 | `sci-02` / `ci/sci-02` | [Trabalhador](<sci-02.md>) | [Revisor](<review-sci-02.md>) |
| SCI-03 | 08 | `sci-03` / `ci/sci-03` | [Trabalhador](<sci-03.md>) | [Revisor](<review-sci-03.md>) |
| SCI-04 | 08 | `sci-04` / `ci/sci-04` | [Trabalhador](<sci-04.md>) | [Revisor](<review-sci-04.md>) |
| CORE-01 | 09 | `core-01` / `feat/core-01` | [Trabalhador](<core-01.md>) | [Revisor](<review-core-01.md>) |
| CORE-02 | 10 | `core-02` / `feat/core-02` | [Trabalhador](<core-02.md>) | [Revisor](<review-core-02.md>) |
| GRID-01 | 11 | `grid-01` / `feat/grid-01` | [Trabalhador](<grid-01.md>) | [Revisor](<review-grid-01.md>) |
| GAME-01 | 12 | `game-01` / `feat/game-01` | [Trabalhador](<game-01.md>) | [Revisor](<review-game-01.md>) |
| REPLAY-01 | 13 | `replay-01` / `feat/replay-01` | [Trabalhador](<replay-01.md>) | [Revisor](<review-replay-01.md>) |
| SOC-01 | 13 | `soc-01` / `feat/soc-01` | [Trabalhador](<soc-01.md>) | [Revisor](<review-soc-01.md>) |
| SOC-02 | 14 | `soc-02` / `feat/soc-02` | [Trabalhador](<soc-02.md>) | [Revisor](<review-soc-02.md>) |
| SOC-03 | 15 | `soc-03` / `feat/soc-03` | [Trabalhador](<soc-03.md>) | [Revisor](<review-soc-03.md>) |
| STORE-01 | 14 | `store-01` / `feat/store-01` | [Trabalhador](<store-01.md>) | [Revisor](<review-store-01.md>) |
| STORE-02 | 15 | `store-02` / `feat/store-02` | [Trabalhador](<store-02.md>) | [Revisor](<review-store-02.md>) |
| RULE-01 | 10 | `rule-01` / `feat/rule-01` | [Trabalhador](<rule-01.md>) | [Revisor](<review-rule-01.md>) |
| RULE-02 | 15 | `rule-02` / `feat/rule-02` | [Trabalhador](<rule-02.md>) | [Revisor](<review-rule-02.md>) |
| RULE-03 | 16 | `rule-03` / `test/rule-03` | [Trabalhador](<rule-03.md>) | [Revisor](<review-rule-03.md>) |
| AI-01 | 10 | `ai-01` / `feat/ai-01` | [Trabalhador](<ai-01.md>) | [Revisor](<review-ai-01.md>) |
| AI-02 | 14 | `ai-02` / `feat/ai-02` | [Trabalhador](<ai-02.md>) | [Revisor](<review-ai-02.md>) |
| APP-01 | 17 | `app-01` / `feat/app-01` | [Trabalhador](<app-01.md>) | [Revisor](<review-app-01.md>) |
| NLG-01 | 15 | `nlg-01` / `feat/nlg-01` | [Trabalhador](<nlg-01.md>) | [Revisor](<review-nlg-01.md>) |
| NLG-02 | 18 | `nlg-02` / `feat/nlg-02` | [Trabalhador](<nlg-02.md>) | [Revisor](<review-nlg-02.md>) |
| E2E-01 | 19 | `e2e-01` / `test/e2e-01` | [Trabalhador](<e2e-01.md>) | [Revisor](<review-e2e-01.md>) |
| CLI-01 | 18 | `cli-01` / `feat/cli-01` | [Trabalhador](<cli-01.md>) | [Revisor](<review-cli-01.md>) |
| TUI-01 | 20 | `tui-01` / `feat/tui-01` | [Trabalhador](<tui-01.md>) | [Revisor](<review-tui-01.md>) |
| MOTOR-01 | 21 | `motor-01` / `test/motor-01` | [Trabalhador](<motor-01.md>) | [Revisor](<review-motor-01.md>) |
| GRID-02 | 16 | `grid-02` / `feat/grid-02` | [Trabalhador](<grid-02.md>) | [Revisor](<review-grid-02.md>) |
| FOV-01 | 17 | `fov-01` / `feat/fov-01` | [Trabalhador](<fov-01.md>) | [Revisor](<review-fov-01.md>) |
| VIEW-01 | 18 | `view-01` / `feat/view-01` | [Trabalhador](<view-01.md>) | [Revisor](<review-view-01.md>) |
| RENDER-01 | 22 | `render-01` / `docs/render-01` | [Trabalhador](<render-01.md>) | [Revisor](<review-render-01.md>) |
| PLAY-01 | 23 | `play-01` / `docs/play-01` | [Trabalhador](<play-01.md>) | [Revisor](<review-play-01.md>) |
| BEH-01 | 19 | `beh-01` / `feat/beh-01` | [Trabalhador](<beh-01.md>) | [Revisor](<review-beh-01.md>) |
| BEH-02 | 20 | `beh-02` / `feat/beh-02` | [Trabalhador](<beh-02.md>) | [Revisor](<review-beh-02.md>) |
| BEH-03 | 21 | `beh-03` / `feat/beh-03` | [Trabalhador](<beh-03.md>) | [Revisor](<review-beh-03.md>) |
| BEH-04 | 22 | `beh-04` / `feat/beh-04` | [Trabalhador](<beh-04.md>) | [Revisor](<review-beh-04.md>) |
| PERF-01 | 22 | `perf-01` / `perf/perf-01` | [Trabalhador](<perf-01.md>) | [Revisor](<review-perf-01.md>) |
| SOAK-01 | 23 | `soak-01` / `test/soak-01` | [Trabalhador](<soak-01.md>) | [Revisor](<review-soak-01.md>) |
| REL-01 | 24 | `rel-01` / `build/rel-01` | [Trabalhador](<rel-01.md>) | [Revisor](<review-rel-01.md>) |
| REL-02 | 25 | `rel-02` / `docs/rel-02` | [Trabalhador](<rel-02.md>) | [Revisor](<review-rel-02.md>) |

Essas fronteiras vêm do DAG e não limitam a quantidade de agentes. Toda a fronteira pronta
pode trabalhar em paralelo, mas cada tarefa tem revisão individual e integração/gates da onda.
Os caminhos de código são futuros; renderer continua gate documental até escolher stack/allowlist.
Não inventar SHAs, resultados de teste ou worktrees removidas.
