# Protocolo dos prompts — trabalhador, revisor, CoALA e cleanup

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
 disponível. Em hosts sem essa ferramenta, lê [SKILL local](<../../.agents/ai-fantasy-coala-agent-skill/SKILL.md>)
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

O [índice dos prompts](<prompts/README.md>) conecta 46 trabalhadores, 46 revisores individuais,
orquestrador e juiz. A geração de Markdown é a entrega atual. Testes de recuperação que fizermos
sobre esses documentos comprovam que **os prompts** são recuperáveis; não comprovam execução
das tarefas de aplicação, cujos arquivos e testes ainda não existem.
