# Prompt do subagent trabalhador — CLI-01

> **ARQUIVO DE PLANEJAMENTO: NÃO EXECUTAR AGORA.** Este é o prompt a entregar a um
> subagent futuro após autorização específica, base preparada e gates satisfeitos.
> O pedido atual cria somente Markdown; não constrói a aplicação nem cria worktrees.

## Identificação e isolamento

Você será o **subagent trabalhador CLI-01**, responsável por “Implementar diagnóstico e provisionamento manual verificável”.

- Task ID: `CLI-01`. Perfil: `standard-implementer`. Fronteira de referência: `18`.
- Nome da worktree: `cli-01`. Branch proposta: `feat/cli-01`.
- Destino da worktree: `../ai-fantasy-worktrees/cli-01` **relativo à raiz original**; o orquestrador entrega seu caminho absoluto verificado antes de ativar este prompt.
- Raiz canônica proposta: `../ai-fantasy-worktrees/integration`, worktree estável do juiz, não uma branch antiga da raiz original.
- Evidências persistentes: `.work/task-evidence/cli-01/attempt-001` na raiz original, fora da worktree descartável; tentativa nova precisa de outro diretório registrado.
- Revisor obrigatório: `REVIEW-CLI-01`, usando [prompt do revisor](<review-cli-01.md>). Sua etapa vem após este trabalhador e fecha antes de liberar dependentes.
- Dependências de tarefa: `AI-01, STORE-02, APP-01`.
- Gate externo: `autorização específica, contratos/base e aceite dos predecessores`.
- Revisão do registro de handoff desta geração: SHA-256 `328a8c7e121c9e4411bf0c105c3845c636e37bf208770fbc675f2cff4a360769`. Se o manifesto mudar, receber brief regenerado; não usar versão divergente.

Antes de qualquer execução futura, o orquestrador fornece base SHA, revisão aceita dos contratos,
raiz original/canônica, worktree absoluta, snapshot CoALA e autorizações de implementação/commit/cleanup.
Se faltar um desses dados, **pare**, não adivinhe. Se a etapa já estiver aceita/integrada com evidência,
não a execute novamente nem crie uma worktree artificial para justificar cleanup.

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

## Chamada obrigatória da skill CoALA

Carregue `/ai-fantasy-coala-agent-skill` pela ferramenta de skill disponível; sem ferramenta, leia
[SKILL local](<../../../.agents/ai-fantasy-coala-agent-skill/SKILL.md>) do checkout designado.
Executar os comandos abaixo **somente quando esta tarefa futura for autorizada**, na raiz de sua worktree.

```bash
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite where --json
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite init
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite recall "CLI-01 Implementar diagnóstico e provisionamento manual verificável" --budget 1500
```

Confirme `project_root`/`db` dentro da worktree `cli-01`. Importe somente snapshot do mesmo projeto
fornecido pelo orquestrador, pelo CLI oficial; não use DB canônico compartilhado nem abra SQLite/dump.
Depois do recall, confirme a informação em fonte atual com Read/Grep/Glob.

## Arquivos permitidos e proibidos

A allowlist abaixo é proposta de criação/edição futura, não prova de arquivos existentes:

- `crates/af-app/src/main.rs`
- `crates/af-app/tests/diagnostics_cli.rs`

**FORBIDDEN FILES:** todos os demais arquivos de código/configuração; contratos de outros donos;
ledger central; metadados Git editados manualmente; arquivos de outros trabalhadores; árvore do juiz.
Artefatos de teste/memória só nos diretórios de evidência e DB local expressamente atribuídos no envelope.
Não editar a allowlist ou inventar paths de engine para ultrapassar gate. Caso necessite export/entrypoint
compartilhado, pedir integração de base/atribuição e recalcular colisões antes, sem teste vazio.

## Cartão e critérios específicos completos

### CLI-01 — Implementar diagnóstico e provisionamento manual verificável

- **Objetivo/entrega:** verify/list/doctor/stats com nomes/contratos finais, sem downloads implícitos.
- **Dependências/dono:** AI-01, STORE-02 e APP-01; pacote CLI; revisão S-QA; juiz integra.
- **Como fazer:** contrato/help/exit/error acionável; verificar instalado/licença/paths/portas/saves regionais. Relatar configurações e medições observadas sem classificá-las por hardware mínimo imposto.
- **Aceite:** ausente/permissão/hash/save corrompido explicados sem segredos; sem download ou telemetria remota; ajuda corresponde a comandos. Diagnóstico não executa ação de mundo nem altera ticks; stats regionais não se limitam ao viewport.

**CP5:** juiz prova catálogo hermético e cruzamentos entre áreas; revisão independente inclui
correções de integração. Movimento/fala conduzem a simulação; narrativa e apresentação não.
Fixar uma localidade para observar um bug não suspende automaticamente o resto da região.

## Consumes/Produces, CONTAINS e DOES NOT CONTAIN

- Consumes: `INT-10, INT-11, INT-17`.
- Especificações produzidas: `nenhuma`.
- Declarações produzidas: `nenhuma`.
- Implementações produzidas: `nenhuma neste estágio`.

Assinaturas abaixo são propostas; usar a revisão tecnicamente congelada recebida no envelope.
Não alterar nomes/tipos/escopo para fazer seu código passar. Não iniciar implementação por ler um prompt.

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

### INT-17 — Composição e recibo da ação

- **Especificação:** CTR-02; **produtor:** APP-01; **consumidores:** CLI-01/E2E-01/TUI-01.
- **Destino:** `crates/af-app/src/lib.rs`.
- **Propostas:** `execute(services: &mut AppServices, intent: PlayerIntent) -> Result<ActionReceipt, AppError>`; `base_view(state: &AppState) -> BaseReadView`.
- **Tipo de leitura:** CORE-01 declara BaseReadView; APP-01 produz a projeção limitada de M2. Não requer o algoritmo de FOV/overlay completo de VIEW-01.
- **CONTAINS:** portas injetadas, entrada resolvida, snapshot/revalidação, aplicação, registro e ACK durável segundo a autoridade definida.
- **DOES NOT CONTAIN:** pular validação/dry-run, depender de UI/overlay para permissão, duplicar efeito por retry ou esconder erro de persistência.
- **Aceite:** stale/timeout/cancelamento/IO/idempotência/crosslocal observáveis; recibo não afirma efeito perdido após restart.

## Verificação futura e evidência

Comando-base proposto: `cargo nextest run -p af-app --profile ci`.
Filtro da tarefa quando aplicável: `given_cli_01_`. Confirmar help/perfil e teste
selecionado no ambiente autorizado; **zero testes não é Green**. Rodar Red/Green/Refactor e casos
felizes/erros/limites do cartão; declarações sem lógica usam compilação/doc/contrato, não cobertura fictícia.
Não executar comandos Cargo, modelos ou testes de aplicação no pedido atual.

## Atualização CoALA e teste de recuperação antes de entregar

Depois de produzir a entrega autorizada, atualizar o DB LOCAL desta worktree:

```bash
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite sync
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite doctor
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite search "main" --kind code --path "crates/af-app/src/main.rs" --json
```

Artefato esperado: `crates/af-app/src/main.rs`; espécie `code`. Confirme resultado ativo **desse arquivo real**,
não somente deste prompt/plano. Leia IDs efetivos por `get ID --provenance`, compare fonte atual e
confira símbolo/linha para código quando aplicável. Se não recuperar, reformule a consulta e corrija
sync/fontes, mas não troque o alvo por documentação genérica para fabricar aprovação.

Para documentos novos, identifique `CLI-01` no cabeçalho/metadata da entrega. Para código, a consulta
de arquivo é a triagem; o registro/símbolo/fonte precisa provar a informação específica do cartão.

Checagem automatizada da resposta de busca — **comando futuro**, com diretório de evidência autorizado:

```bash
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite search "main" --kind code --path "crates/af-app/src/main.rs" --json > .work/coala-retrieval-cli-01.json
python3 -c "import json,pathlib,sys; d=json.loads(pathlib.Path('.work/coala-retrieval-cli-01.json').read_text(encoding='utf-8-sig')); r=[x for x in d.get('results',[]) if x.get('kind')=='code' and str(x.get('source','')).replace(chr(92),'/').split('#',1)[0]=='crates/af-app/src/main.rs' and not x.get('superseded_by')]; print('IDs reais:',','.join(str(x['id']) for x in r)) if r else print('Erro: entrega não recuperada na CoALA — Solução: verificar sync, fonte e consulta'); sys.exit(0 if r else 1)"
```

Sync/doctor ou um nome de arquivo sozinho não bastam. Entregar trecho/ID/caminho e comparação
factual com a fonte. Notas novas são opcionais e somente duráveis/verificadas/não repetidas em código/docs;
registrar por `add` com chave estável/proveniência, nunca status volátil ou segredo. Reportar IDs/chaves
reais dessas notas ao revisor para importação seletiva após integração.

## Sua entrega e quem conclui

Retornar `DELIVERED_TO_REVIEW` somente após testes, documentação, sync e recuperação LOCAL.
Incluir task/base/contratos, branch/worktree, diff, arquivos, Red/Green/Refactor, IDs/chaves CoALA,
conteúdo recuperado, fontes, limitações e evidências. Você **não** declara DONE/INTEGRATED nem remove
a worktree. O revisor `CLI-01` é etapa obrigatória; cleanup será dele, após juiz integrar,
memória canônica comprovada e resultados preservados.

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
