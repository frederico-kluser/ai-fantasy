# Diário da construção e como retomar

> Registro da primeira rodada de construção do código (2026-11-23), feita por agentes de IA a
> pedido explícito do maintainer ("construir o ROADMAP do início ao fim, com subagentes em
> paralelo, sem perguntar e tomando todas as decisões"). A rodada foi pausada pelo maintainer
> com 13 das 23 tarefas integradas. Este documento diz o que foi feito, o que ficou aberto, que
> decisões foram tomadas em nome do maintainer e como continuar.

## 1. O que está na `main`

| Tarefa | PR | O que entregou |
| --- | --- | --- |
| FND-01 | #16 | Monorepo TypeScript (npm workspaces), gates (lint, tipos, cobertura, linhas novas, mutação, licenças, E2E, governança), CI em Node, ADR 0020 |
| CORE-01 | #17 | Domínio em bp, `div`, ids, `Result`, constantes da §17, PRNG `sfc32` com streams, drawer com registro, forçar caminho e `MOST_LIKELY`, serialização canônica e hash |
| SRV-01 | #18 | Servidor local em 127.0.0.1: configuração tipada (Zod), `Secret`, saúde, rotas de sessão, proteção de Host/Origin, limites, ADR 0021 (Zod) |
| CORE-02 | #19 | Relógio, fases, luz, grade com gabarito, linha de visão, audição, caminho, movimento por tick e destinos |
| CORE-03 | #20 | Todos os catálogos de presets como dados validados, com teste que compara dados e documentos |
| CORE-04 | #21 | Status em camadas, tick de corpo/emoções/vontades, ameaça e presença, percepção, modelo de fatos e cópias, tipos do ato (`ActLabel`) |
| SOC-01 | #22 | Validação e resolução de atos, perspectivas, leitura do tom, obrigações, fatos e cópias (`TOLD`) |
| AI-01 | #23 | Portas `SystemOnePort`/`TextModelPort`, perguntas do SOM, validação fechada, leitura da fala do jogador, falas prontas pt-BR, falsos |
| CORE-05 | #24 | Geração de elenco, laços, história e gancho de tensão; abertura da cena; travados e tentativas |
| SOC-02 | #25 | Sinais, notar, interpretar e percepção do momento |
| WEB-01 | #26 | Site: roteador por hash, temas, worker do motor, playground manual até a ficha de revisão |
| SOC-03 | #27 | Avaliação emocional (tabelas 7.x como dados), pedidos com faixas, mentiras, efeitos adiados da história |

## 2. O que ficou aberto

| Tarefa | Estado | Onde |
| --- | --- | --- |
| SOC-04 | PR #28 aberto, CI verde; a revisão independente foi interrompida na pausa | branch `feat/soc-04-decision-and-turns` |
| SOC-05 | começo do código salvo como trabalho em andamento, sem PR, sem revisão | branch `feat/soc-05-scene-runner-and-replay` (empilhada na SOC-04) |
| As demais | não começadas | SOC-06, WEB-02, WEB-03, AI-02, AI-03, AI-04, EVAL-01..03, PERF-01 |

## 3. Como retomar

1. **SOC-04 (#28):** rodar a revisão (§5 do guia dos agentes, com o foco descrito na §4 abaixo),
   corrigir o que ela apontar, atualizar a branch com a `main` (`gh pr update-branch 28`) e
   fazer o squash merge.
2. **SOC-05:** continuar na branch `feat/soc-05-scene-runner-and-replay`. Depois do merge da
   SOC-04, integrar pela receita de empilhamento (§4.2) e terminar o prompt (passo completo,
   JSONL, replay, `RenderRequested`, benchmark, primeira transcrição de ouro).
3. **Depois, pela ordem do ROADMAP §5:** SOC-06 ∥ WEB-02 → WEB-03 ∥ AI-02 ∥ AI-03 → AI-04 ∥
   EVAL-01 → EVAL-02 → EVAL-03; PERF-01 só se o benchmark passar de 16 ms.
4. O SOM para os testes é `typesafe/jev-1.14` pela rota de decisões do OpenRouter; no futuro,
   um decisor local atrás da mesma `SystemOnePort`. O fio real está resumido na §6.

## 4. Como a rodada trabalhou (vale repetir)

### 4.1 Um agente por tarefa, um revisor separado

- Cada tarefa roda numa worktree própria (`../ai-fantasy-<id>`), numa branch com o nome do
  prompt; o agente segue TDD, roda `npm run check`, abre o PR e **não** faz merge.
- Um **agente revisor separado** lê o prompt, as especificações e o diff, roda os gates numa
  worktree descartável e **aplica mutantes à mão** nas regras. Só depois do "APROVADO" (e das
  correções menores) vem o squash merge.
- A lição mais repetida das revisões: o Stryker a 100% não prova que uma regra está testada
  (mutantes que lançam erro "morrem" à toa). Para cada regra da especificação, pergunte "que
  teste falha se eu trocar isto?": stream e finalidade de cada sorteio, ordem por id com entrada
  fora de ordem, traço **efetivo** contra o bruto (`tendencies ≠ 0`), qual célula ou personagem
  dá um contexto, limites exatos. Nunca chame um mutante de "equivalente" sem provar.
- Lacunas da especificação são escritas no documento **no mesmo PR**, listadas no PR; regra só
  muda com ADR.

### 4.2 Empilhar tarefas sem rebase

Para não esperar a revisão da tarefa anterior, a seguinte nasce da branch dela. Depois do squash
merge da tarefa-mãe:

1. `git fetch origin && git fetch origin pull/<PR_MAE>/head`
2. `HEADMAE` = `headRefOid` do PR da mãe; `SQUASH` = `mergeCommit.oid`.
3. `git merge "$HEADMAE"` (a filha passa a ter a versão final da mãe).
4. `git diff --quiet "$HEADMAE" "$SQUASH"` tem de dar árvores iguais (o ruleset exige PR
   atualizado com a `main`).
5. `git merge -s ours "$SQUASH" -m "chore: record the <ID> squash merge"`.
6. `git merge origin/main`; `git diff --stat origin/main...HEAD` deve mostrar só a filha.

Sem isso, arquivos criados pela mãe e alterados pela filha dão conflito em todo trecho mudado.
A receita também está na memória CoALA (`stacked-branch-integration`).

### 4.3 Armadilhas do ambiente

- Node 24 (`fnm use 24`); arquivo `.ts` novo precisa estar no `include` do `tsconfig.json`.
- O Stryker roda numa cópia em `.stryker-tmp`: caminhos calculados da raiz quebram; calcule a
  partir do `import.meta.url`.
- Com vários agentes em paralelo, Vitest e Stryker morreram por falta de memória: use no máximo
  4 workers e, se preciso, deixe a mutação completa para o CI.
- No Windows, `rename` sobre arquivo aberto falha (`EPERM`): o servidor repete e enfileira.
- Python no Windows grava CRLF em modo texto; o repositório é LF.
- As sessões caíram três vezes: commit e push frequentes salvaram o trabalho.

## 5. Decisões tomadas em nome do maintainer (para revisitar)

O maintainer delegou todas as decisões. Estas merecem um olhar dele:

1. `eslint-plugin-sonarjs` (LGPL-3.0) aceito como exceção **só de desenvolvimento** (ADR 0020).
2. Zod 4 como biblioteca única de validação, inclusive no motor (ADR 0021).
3. Site sem biblioteca de rotas (hash) e com CSS puro (overview §6.1).
4. Ids de personagem inteiros; seeds de elenco e de cena separadas; forçar sorteio só vale se o
   resultado for possível, e o forçado mais recente vem primeiro (simulation-model §15).
5. "Sem caminho" mede só paredes; atrás de alguém o personagem faz fila (simulation-model §8.1).
6. O gancho de tensão sorteia só acontecimentos que de fato criam tensão (presets §10).
7. `SEDUCTIVE` indesejado: a valência −1 **soma** à da linha (dialogue-acts §7.5).
8. Um fato de ato nunca é segredo (dialogue-acts §7.5).
9. Distribuições do SOM: aceitas parciais (soma ≤ 1,02) se a escolha for a mais provável; a
   AI-02 deve confirmar com gravações reais (ai-integration §4.2).
10. Ids reservados do Windows (`con`, `nul`…) recusados nas sessões (overview §8).

## 6. Pendências e avisos

- **GitGuardian** (check não obrigatório) marcou um falso positivo (`/etc/passwd` num teste) em
  commits antigos do PR #18; a string não chegou à `main`. Pode ser marcado como falso positivo
  no painel.
- O ruleset de mensagens de commit não existe no plano atual do GitHub; o hook local e o CI
  cobrem a convenção.
- Pequenas melhorias anotadas nas revisões e não feitas: até 514 opções de posição num gabarito
  grande, formulário do playground perdido ao trocar de rota, duas entradas `derived` para o
  mesmo par aceitas em silêncio (WEB-02/WEB-03 e CORE-05).
- Para a AI-02, o fio da rota de decisões: `POST /api/alpha/decisions` com `{ model, state,
  questions, session_id? }`; `score` volta como índice do nível (0..8 na régua de 2 a 10), então
  `nota = 2 + score`; nunca enviar `temperature`/`max_tokens`; 429/5xx com até 2 novas
  tentativas; resposta com `usage.cost` em dólares.
