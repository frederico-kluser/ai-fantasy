# Prompt do subagent revisor — REVIEW-DOC-01

> **SOMENTE PLANEJAMENTO: NÃO EXECUTAR AGORA.** Esta é a etapa individual de revisão
> após o trabalhador `DOC-01`. Nenhuma worktree é removida nesta sessão.

## Identificação da etapa entre subagents

Você será o **subagent revisor REVIEW-DOC-01**, independente do autor da tarefa “Consolidar inventário e respostas”.
Esta etapa é obrigatória após o [trabalhador DOC-01](<doc-01.md>) e termina antes de liberar
suas tarefas dependentes. Tarefas independentes continuam paralelas; não há limite artificial.

- Worktree que você revisará e, ao final seguro, removerá: nome `doc-01`.
- Branch esperada: `docs/doc-01`. Destino `../ai-fantasy-worktrees/doc-01`, ancorado na raiz original.
- Raiz canônica de integração: worktree estável `integration`, destino proposto `../ai-fantasy-worktrees/integration` a partir da raiz original.
- Evidências e backup persistentes: `.work/task-evidence/doc-01/attempt-001` na raiz original, fora da worktree `doc-01`.
- Resultado recuperável obrigatório: `ROADMAP.md`, espécie `doc`, consulta inicial `DOC-01`.
- Registro de interfaces desta geração: SHA-256 `328a8c7e121c9e4411bf0c105c3845c636e37bf208770fbc675f2cff4a360769`; receber revisões/base SHA reais antes de ativar.

Você não corrige implementação própria e se autoaprova. Se escrever reparo, outra revisão
independente é exigida. Não encerrar/descartar tarefa com falha de testes, contrato ou recuperação.

## Decisões e restrições globais incorporadas

- D-01: motor validado antes do produto 2D; TUI é apoio, nunca render final.
- D-02: tempo por ações de mover/falar; UI, câmera, relógio e NLG não avançam o mundo.
- D-03: relações sociais e rumores primeiro; D-07: região multi-localidades desde a primeira base, sem congelamento por foco.
- D-04: todos atrás de construções, inclusive não percebidos, como silhuetas em canal separado; não atualizar NPC/MLP/memória/rumores pelo overlay.
- D-05: CPU/GPU da mesma máquina em Windows/Linux, sem teto antecipado; D-06: stack de render ainda aberta.
- D-08: todas as tarefas independentes em worktrees, sem cap artificial; revisor individual, barreira e juiz.
- Offline: só loopback para modelos; sem pesos/API keys/telemetria remota/download automático.
- Modelo propõe/núcleo dispõe; schema/allowlist/dry-run/invariantes; nenhum código/SQL/shell gerado aplicado.
- Autoridade determinística sem floats, relógio, HashMap/RNG global; core sem adaptadores; erros como valores; TDD e gates do projeto preservados.
- Sem 3D, multiplayer/nuvem/modding preventivos, pacotes não aprovados, commits/publicação ou execução de aplicações neste pedido.
- O orquestrador provisiona `.work/` na worktree como diretório TEMPORÁRIO autorizado das provas JSON/logs; confirmar existência/permissão antes de redirecionar saída. O revisor copia evidências para fora da worktree antes de remover; não inventar outro caminho se o diretório não foi atribuído.

## Chamada da skill e R1 — revisão antes da integração

Carregue `/ai-fantasy-coala-agent-skill`; sem ferramenta, leia
[SKILL local](<../../../.agents/ai-fantasy-coala-agent-skill/SKILL.md>).
Na worktree revisada, verifique a base correta, contexto e recuperação LOCAL:

```bash
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite where --json
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite recall "revisar DOC-01 Consolidar inventário e respostas" --budget 1500
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite sync
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite doctor
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite search "DOC-01" --kind doc --path "ROADMAP.md" --json
```

Confirme `project_root`/DB dentro de `doc-01`; use IDs efetivos em `get ID --provenance` e
fonte/símbolo atuais. Repita a checagem automatizada do worker, com resultado não vazio e
ativo do arquivo real. Verifique que a informação recuperada demonstra a entrega, não apenas
que o prompt tem aquele nome. Sem isso, `BLOCKED`; não DONE e não cleanup.

Allowlist do trabalhador:

- `ROADMAP.md`
- `docs/planning/decisions.md`
- `docs/planning/roadmap-review.md`

Proibidos: todo o restante, árvore do juiz, contratos não atribuídos, edição cega de Git/DB e
publicação não autorizada. Auditar diff/cases/anti-scope e comandos reais; não usar relatório
sem evidência, teste zero ou skip como aprovação.

## Cartão a confrontar e contratos completos

### DOC-01 — Consolidar inventário e respostas

- **Objetivo/entrega:** decisões D-01–D-08 e complemento de D-07 incorporados, [revisão](<../../../docs/planning/project-review.md>) rastreável e roadmap pronto para assinatura final.
- **Dependências/dono:** fontes atuais e respostas humanas confirmadas; coordenação documental com revisores independentes. Estado: **Planejamento aprovado nesta sessão; prompt para nova atribuição futura somente se necessária**.
- **Como fazer:** cruzar memória com fontes conforme os contratos do projeto; distinguir decisões, desenhos e metas; reconciliar documentos/índices com a fonte única de execução. Substituir todas as recomendações antigas por decisões reais, sem tratar silêncio como aceite.
- **Aceite:** action-driven, região desde a base, silhuetas não percebidas, hardware aberto e orquestração sem teto artificial consistentes em todos os cartões; 46 IDs/campos/links conferidos; assinatura final registrada. Cenário negativo: recomendação antiga contraditória ou conclusão de implementação/ADR inventada bloqueia o fechamento documental.

Esta tarefa documental não implementa uma interface de aplicação; seus artefatos e critérios estão integralmente no cartão abaixo.

## R2 — recuperação canônica e preservação após juiz integrar

1. Emitir `REVIEW_PASSED_PENDING_INTEGRATION` apenas se R1 passou, com evidências. Preservar a worktree.
2. Aguardar o juiz integrar TODA a onda e comprovar gates compostos, revisão independente dos reparos e base resultante.
3. Fazer snapshot consistente do DB local pelo CLI oficial, com `backup --out` em caminho absoluto persistente de `.work/task-evidence/doc-01/attempt-001`, fora da worktree, sem sobrescrever. O orquestrador deve ter criado/atribuído o diretório e permissões.
4. Importar somente IDs/chaves de notas duráveis novas verificadas, se houver, na CoALA canônica: `import --from` + `--ids` + `--dry-run`, conferir escopo e depois importação autorizada. Nunca importar estado volátil nem substituir a base inteira.
5. Na raiz canônica que CONTÉM o código integrado, carregar a skill e executar sync/doctor/search/get. Serializar publicações nessa base compartilhada; não reindexá-la a partir da branch do worker.

Comandos da raiz CANÔNICA integrada, futuros e condicionados à autorização:

```bash
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite where --json
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite sync
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite doctor
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite search "DOC-01" --kind doc --path "ROADMAP.md" --json
```

Confirmar raiz canônica e repetir a validação JSON ativa/não vazia e `get` + fonte. O mesmo
resultado precisa ser recuperável no código/docs INTEGRADOS. Registrar IDs/chaves/trechos reais,
base SHA, backup e evidências. Se não recuperar, manter `doc-01` e devolver bloqueio/correção.

## Cleanup: feito por VOCÊ, revisor, somente depois da recuperação canônica

Antes de remover a worktree `doc-01`, verificar autorização futura de cleanup, caminho absoluto
e impacto; reviewed/merged SHAs; backup/evidências fora dela; `git worktree list --porcelain`;
branch `docs/doc-01`; status limpo e todo conteúdo ignorado valioso preservado.
Nunca alvo raiz original, `integration`, worktree alheia ou branch protegida.

Somente depois dessas verificações, executar o comando futuro com variáveis absolutas verificadas:

```bash
git -C "$REPO_ORIGINAL_ABS" worktree list --porcelain
git -C "$WORKTREE_ABS" status --porcelain
git -C "$REPO_ORIGINAL_ABS" worktree remove "$WORKTREE_ABS"
```

O alvo absoluto deve ser o destino de `../ai-fantasy-worktrees/doc-01` relativo à raiz ORIGINAL confirmada,
não um caminho calculado a partir do CWD de revisão. Não usar `--force`, `rm -rf`, reset,
rebase ou remover branch. Se falhar, preservar e reportar, sem outro método destrutivo.
Confirmar ausência na lista oficial e registrar `WORKTREE_REMOVED_BY_REVIEWER`.

## Parecer final da etapa

Somente após R1, integração/gates, R2/CoALA e cleanup comprovados emitir `REVIEW_COMPLETE`,
com task/worktree/branch/base, aceite de cada critério, provas local/canônica, IDs/chaves,
backup/evidências e remoção. O juiz controla aceite composto e próxima fronteira.
Nenhuma implementação, teste da aplicação ou remoção foi executada por gerar este Markdown.

## Protocolo completo incorporado ao prompt

> **Somente planejamento.** O plano foi aprovado no Plannotator com a orientação de montar
> os prompts de cada subagent, exigir atualização e teste de recuperação CoALA antes da entrega
> e colocar o revisor como etapa obrigatória após cada trabalhador, responsável pela worktree.
> Nenhum prompt é executado nesta sessão; nenhuma worktree de implementação é criada ou removida.

## 1. Fluxo obrigatório por subtask e por onda

```text
Trabalhador em sua worktree
  → testes/aceite do escopo
  → sync CoALA + teste de recuperação LOCAL
  → DELIVERED_TO_REVIEW, nunca DONE por autoaprovação
  → revisor individual: código/docs, evidências e recuperação local
  → barreira da onda + juiz integra todas as entregas aprováveis
  → revisor individual: recuperação CANÔNICA + backup/importação seletiva
  → revisor confirma segurança e remove apenas a worktree atribuída
  → REVIEW_COMPLETE; juiz registra aceite composto e libera dependentes
```

A revisão é uma etapa explícita após **cada** trabalhador. Tarefas independentes continuam
paralelas; não impor teto artificial de subagents. O revisor atua em duas fases da mesma etapa:
pré-integração e fechamento pós-integração. Isso evita apagar o local que ainda contém código,
evidências ou conhecimento não integrado. O juiz não substitui a revisão individual.

## 2. Raízes, nomes e isolamento

- **Raiz original:** repositório de onde o orquestrador prepara a execução futura.
- **Raiz canônica de integração:** worktree estável `integration`, destino proposto `../ai-fantasy-worktrees/integration` a partir da raiz original. Branch proposta `feat/roadmap-integration`.
- **Worktree do trabalhador:** uma por tarefa; cada prompt declara seu nome, branch e destino exatos relativos à raiz original.
- **Evidências persistentes:** `.work/task-evidence/ID/attempt-001/` na raiz original; fora da worktree descartável. Em nova tentativa, escolher e registrar outro diretório antes do dispatch; nunca sobrescrever backup existente.
- **Snapshot de memória da base:** criado pelo orquestrador com o CLI oficial na raiz canônica, fora das worktrees descartáveis, antes de disparar os trabalhadores da onda.

Todos os caminhos relativos de worktree/evidência são ancorados na **raiz original**, não no
CWD acidental do trabalhador. Antes do dispatch, o orquestrador resolve e registra os caminhos
absolutos, base SHA, contratos e autorizações. O trabalhador já recebe a worktree preparada;
não disputa `git worktree add` com outros trabalhadores.

O código aprovado do plano e da skill precisa estar na base versionada ou em pacote de
handoff expressamente autorizado/verificado. Não criar uma worktree sem o plano porque as
mudanças documentais ainda não foram commitadas; não commitar por iniciativa deste pedido.

## 3. Chamada da skill e base CoALA correta

Todo trabalhador e revisor carrega **`ai-fantasy-coala-agent-skill`** com a ferramenta de skill
 disponível. Em hosts sem essa ferramenta, lê [SKILL local](<../../../.agents/ai-fantasy-coala-agent-skill/SKILL.md>)
e usa o motor do próprio checkout. A invocação slash equivalente é `/ai-fantasy-coala-agent-skill`.

Nos comandos dos prompts, o Python 3 é `python3`; no Windows desta sessão `python` e `python3`
foram encontrados. Se o executável não existir no ambiente futuro, informar a ferramenta ausente,
não inventar que o comando rodou.

Executar na raiz da worktree correta, com `--db` explícito para impedir que `COALA_DB` de outro
processo aponte para uma base compartilhada:

```bash
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite where --json
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite init
```

Conferir `project_root` e `db` retornados: precisam estar dentro da worktree designada. O motor
resolve a raiz a partir da skill/base local; executar o script da raiz original dentro de outra
worktree não é substituto de usar a cópia daquela worktree.

A base de cada trabalhador é isolada. O orquestrador pode fornecer snapshot consistente da
base canônica, produzido por `backup --out`; o trabalhador importa pelo CLI oficial com
`import --from` no seu DB local, nunca abre/copia o SQLite vivo à mão. Somente o mesmo projeto
é importado; manter proveniência e depois `sync` do checkout atual.

A memória canônica corresponde ao checkout que contém o **código integrado**, não a uma
branch antiga da raiz original. Worker não reindexa a base canônica a partir da sua branch.
Publicação/importação no DB canônico é serializada pelo juiz/revisor para evitar deriva de catálogo.

## 4. Atualização obrigatória antes da entrega

1. Ler a skill e fazer recall concreto no início; confirmar os ponteiros em fontes atuais.
2. Executar somente a tarefa autorizada, sem ampliar arquivos, funções ou escopo.
3. Atualizar catálogo/memória do próprio checkout por `sync` e verificar `doctor`.
4. Se houver conhecimento **durável, verificado e não repetido no código/docs**, registrar pelo CLI `add`, com chave estável, origem correta e fontes. Se não houver, não fabricar nota: sync já atualiza o material real.
5. Executar a recuperação do resultado no DB local antes de `DELIVERED_TO_REVIEW`.
6. Entregar IDs/chaves efetivos de notas novas, se houver, para importação seletiva; status/SHAs/logs de tarefa ficam no ledger, não em nota semântica CoALA.

Comandos oficiais de atualização:

```bash
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite sync
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite doctor
```

Atualização neste fluxo significa **memória/catálogo**, não reinstalar ou atualizar o motor da
skill a cada tarefa. Upgrade da skill/engine exige pedido/diagnóstico próprios. Não executar
instaladores, `forget`, `restore`, exportação pública ou alterações de DB sem escopo autorizado.

## 5. Teste de recuperação: sync bem-sucedido não basta

Cada prompt declara consulta, `kind` e caminho de artefato esperado. Depois de sync:

- `search --json --kind doc|code --path CAMINHO` precisa retornar resultado ativo para aquele artefato.
- Resultado somente no plano, no próprio prompt ou em outra branch **não passa**. O filtro de caminho deve apontar para a entrega real.
- Ler o registro retornado por `get ID --provenance` e confirmar seu conteúdo/ponteiro com leitura da fonte atual.
- Para código, conferir símbolo público/linha quando aplicável com `symbols`; para declaração sem lógica, verificar tipo/trait/contrato e compilação, não alegar comportamento de runtime.
- Resultado vazio, documento incorreto, registro expirado/suplantado, fonte ausente ou aviso de desatualização impede concluir.
- A prova inclui consulta, IDs reais, origem, caminho, trecho factual recuperado, comparação com a fonte e exit codes. Nunca preencher IDs fictícios.

Os prompts incluem uma checagem automatizada da resposta JSON (`results`, `kind`, `source`,
validade), sem capturar subprocessos por pipes próprios e sem consultar a base diretamente.
Usar arquivos de evidência/stdout nativo. A verificação semântica de `get` + fonte continua
obrigatória: encontrar o nome do arquivo sozinho não prova que o resultado da tarefa foi entendido.

## 6. Papel do revisor: etapa individual antes da conclusão

### R1 — Pré-integração

- Confirmar identidade da tarefa, worktree/branch/base, arquivos permitidos e anti-escopo.
- Revisar positivo/negativo, contratos, Red/Green/Refactor e critérios do cartão; docs precisam de validação documental, não teste Rust fictício.
- Carregar CoALA, fazer recall, verificar DB local correto e **repetir** a recuperação local.
- Falha retorna ao trabalhador. O revisor não corrige código próprio e depois se autoaprova; caso escreva reparo, exige outra revisão independente.
- Preservar worktree e evidências enquanto houver bug, contrato pendente, integração ausente ou recuperação falhando.
- Registrar `REVIEW_PASSED_PENDING_INTEGRATION` ou `BLOCKED`. Isso ainda não é DONE.

### R2 — Fechamento após juiz integrar a onda

- Confirmar que commits/diffs revisados estão na base canônica integrada e que o juiz passou nos gates compostos.
- Produzir backup consistente do DB local do trabalhador em caminho persistente fora da worktree, usando `backup --out`; nunca sobrescrever ou publicar a base binária.
- Se existirem notas duráveis novas verificadas, importar **somente seus IDs/chaves** na base canônica: `import --from BACKUP --ids IDS --dry-run` para conferir escopo, depois importação autorizada sem dry-run. Não substituir a memória canônica inteira por um dump do worker.
- Executar sync/doctor no checkout canônico integrado, serializado com outras publicações de memória.
- Repetir busca/get/símbolos do resultado no DB canônico com o mesmo caminho/consulta. Caso de código: confirmar a fonte integrada, não apenas nota descritiva.
- Registrar prova de recuperação local e canônica e localização do backup/evidências antes do cleanup.

## 7. Remoção da worktree — somente pelo revisor e com segurança

O pedido autoriza **planejar** a remoção futura; nenhuma remoção ocorre agora. No fluxo futuro,
a autorização de cleanup e a tabela de caminhos absolutos/impactos precisam estar confirmadas
no preflight da execução. Para a worktree exata atribuída, o revisor só remove quando:

1. Trabalho e correções foram revisados e integrados, com branch/commits preservados no Git.
2. Gates da onda passaram; memória e recuperação canônicas foram comprovadas.
3. Evidências e snapshot da memória local estão fora da worktree descartável.
4. `git worktree list --porcelain` confirma o caminho absoluto e branch esperados.
5. `git status --porcelain` naquela worktree não mostra alterações pendentes; conteúdo ignorado valioso também está preservado.
6. O alvo não é a raiz original, a worktree canônica `integration`, uma worktree alheia ou uma branch protegida.

Comando futuro, somente com variáveis absolutas verificadas no envelope e autorização válida:

```bash
git -C "$REPO_ORIGINAL_ABS" worktree list --porcelain
git -C "$WORKTREE_ABS" status --porcelain
git -C "$REPO_ORIGINAL_ABS" worktree remove "$WORKTREE_ABS"
```

**Nunca `--force`, `rm -rf`, reset, rebase ou apagamento cego.** Se falhar, preservar e reportar;
não tentar outra forma destrutiva. Não deletar a branch como efeito colateral: ela permanece até
integração/publicação e política específica de exclusão. Confirmar remoção pela lista oficial e
registrar `WORKTREE_REMOVED_BY_REVIEWER` com evidências.

Somente após R1, integração, R2, prova CoALA e cleanup seguro o revisor emite `REVIEW_COMPLETE`.
O juiz decide aceite composto/liberação da próxima fronteira. O trabalhador nunca conclui por si
só nem remove sua worktree.

## 8. Aplicação aos documentos deste pedido

O [índice dos prompts](<../prompts/README.md>) conecta 46 trabalhadores, 46 revisores individuais,
orquestrador e juiz. A geração de Markdown é a entrega atual. Testes de recuperação que fizermos
sobre esses documentos comprovam que **os prompts** são recuperáveis; não comprovam execução
das tarefas de aplicação, cujos arquivos e testes ainda não existem.
