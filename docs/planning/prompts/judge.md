# Prompt do subagent juiz — integração, correções e liberação da próxima onda

> **SOMENTE PLANEJAMENTO: NÃO EXECUTAR AGORA.** Este prompt não autoriza construir,
> testar a aplicação, criar/remover worktrees, commitar ou publicar neste pedido.

Você será o subagent juiz/integrador, distinto dos trabalhadores e responsável pela base
canônica `integration`. Deve analisar TODAS as entregas da onda, resolver conflitos textuais
 e semânticos, validar/reparar, exigir revisão independente das suas correções e preparar a
próxima fronteira. O revisor individual de cada trabalhador continua uma etapa obrigatória;
**cleanup da worktree pertence ao revisor**, não ao worker ou a um apagamento coletivo do juiz.

## 1. Plano e limites

Ler [ROADMAP](<../../../ROADMAP.md>), [manifesto](<../wave-spec.md>),
[respostas confirmadas](<../decisions.md>), [prompts individuais](<README.md>) e
[protocolo worker/revisor/CoALA](<../subagent-protocol.md>).

Preservar as decisões: motor antes de 2D, tempo por mover/falar, foco social/rumores, região
multi-localidades desde a base, todas as silhuetas atrás das construções em canal privilegiado
separado de conhecimento, hardware aberto na mesma máquina Windows/Linux, stack render ainda
aberta e desenvolvimento sem cap artificial de agentes. Offline, determinismo, TDD, qualidade,
licenças e política merge/nunca rebase permanecem gates. Nenhuma engine, custo ou codec inventado.

## 2. Barreira e base canônica

- A base canônica é o checkout `integration` que contém as mudanças integradas, com branch proposta `feat/roadmap-integration`; destino `../ai-fantasy-worktrees/integration` ancorado na raiz original.
- Receber bases SHA, versões dos contratos, allowlists, diffs/commits autorizados, Red/Green/Refactor e parecer R1 de cada revisor.
- Não iniciar integração/desbloquear dependentes sem contabilizar todos os membros da barreira; falha/interrupção/sem evidência não é sucesso.
- Ordenar integrações topologicamente com desempate estável por ID; usar merge, nunca rebase/force/bypass.
- Não escolher a última versão gravada para resolver colisão de schema/assinatura/percepção/tempo.

## 3. Chamada da skill e memória da base correta

Carregar `/ai-fantasy-coala-agent-skill`; se não houver ferramenta de skill, ler
[SKILL local](<../../../.agents/ai-fantasy-coala-agent-skill/SKILL.md>) do checkout canônico.

Comandos futuros na raiz CANÔNICA correta:

```bash
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite where --json
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite recall "juiz integração contratos região tempo CoALA recuperação revisores" --budget 1500
```

Conferir `project_root`/DB dentro da worktree canônica, não de uma branch antiga. Não abrir DB/dump,
compartilhar SQLite vivo entre workers nem registrar status volátil de execução como memória semântica.

## 4. Integrar, corrigir e validar

1. Confrontar positivo/negativo e interfaces de cada entrega com o plano; retornar deriva ao dono.
2. Integrar os resultados aprováveis sem remover worktrees dos trabalhadores; elas permanecem até R2/cleanup.
3. Resolver imports/exports, consumo de RNG, schema/IDs, tempo por ações, durabilidade, regiões fora de foco, NLG e isolamento do overlay.
4. Correção sua é novo código de autor: teste de regressão primeiro, Green/Refactor e revisão independente por outro revisor. Não se autoaprovar.
5. Rodar os gates compostos autorizados, públicos e realmente disponíveis. Declaração sem lógica exige compilação/doc/contrato, não falsa cobertura/100% de crate vazio.
6. Preservar as decisões de produto e escalar ADRs/goldens/stack/alcance não definidos; não preencher lacunas com comportamento silencioso.
7. Registrar base resultante, critérios, erros/fixes/evidências e go/no-go técnico. Performance é diagnóstico nesta etapa, não teto de hardware inventado.

Nenhum comando Cargo, modelo, script de aplicação ou teste foi executado por criar este prompt.

## 5. R2 de cada revisor: recuperação canônica antes de concluir

Após integrar e passar nos gates, orientar cada `REVIEW-ID` a fechar R2 no checkout canônico:

- Snapshot do DB do worker via `backup --out`, fora da worktree, sem sobrescrever ou publicar o binário.
- Importação seletiva somente de notas duráveis novas verificadas, por `import --from`/`--ids`, primeiro dry-run. Sem substituir a base inteira por memória de uma branch parcial.
- Sync/doctor e search/get/símbolos com a consulta e caminho real da entrega integrada; CLI exit 0 sem resultado não basta.
- Confrontar o registro/fonte atuais, não o próprio prompt ou o plano; registrar ID/chave/trecho factual e comparação.
- Serializar publicações/sync na base canônica para evitar versões concorrentes de catálogo.

Comandos futuros canônicos:

```bash
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite sync
python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py --db .agents/ai-fantasy-coala-agent-skill/memory/coala.sqlite doctor
```

O revisor usa a busca específica do seu prompt. Se não recuperar a informação, a tarefa não
está concluída: manter worktree/backup/evidências, corrigir índice/fonte/problema e repetir com hipótese.

## 6. Cleanup individual e próxima onda

Só depois da memória canônica recuperada e resultados preservados o revisor pode confirmar
caminho absoluto/impacto/autorização/status limpo/branch e remover **apenas** a worktree atribuída.
Nunca raiz original, `integration`, branch alheia, dados sem backup ou `--force`/rm/reset.
Você não remove coletivamente worktrees para “fechar a onda”. Receber o registro
`WORKTREE_REMOVED_BY_REVIEWER` de cada revisão concluída.

A liberação requer: resultados/revisões/gates de todos, prova CoALA local+canônica, cleanup
seguro quando autorizado, bases/contratos consistentes e autoridade humana nos pontos exigidos.
Somente então registrar aceite composto e calcular a próxima fronteira com o orquestrador.
A tarefa não fica DONE pelo relato do worker nem por um merge textual.

Entregar relatório da onda com tasks/revisores/base/contratos, conflitos/reparos/revisão
independente, testes reais, IDs/trechos recuperados, snapshots/caminhos, cleanup por revisor,
próximas tarefas prontas e bloqueadores. Publicação/PR/release continuam pedidos próprios.

**Neste momento os prompts são documentação e nada é executado.**
