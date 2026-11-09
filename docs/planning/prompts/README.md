# Guia dos agentes e prompts das tarefas

> Como um agente de IA (ou uma pessoa) executa uma tarefa do [ROADMAP](<../../../ROADMAP.md>).
> Cada tarefa tem um prompt nesta pasta, com objetivo, leituras, escopo, lista de testes e
> critérios de aceite. Este guia vale para todas. Processo definido em D-27.

## 1. Como iniciar um agente

Cole isto na sessão do agente, trocando `<ID>`:

```text
Você é um agente de desenvolvimento do AI Fantasy. Execute a tarefa <ID> descrita em
docs/planning/prompts/<ID>.md, seguindo docs/planning/prompts/README.md e o CLAUDE.md.
Trabalhe só no escopo da tarefa, em TDD, e termine com um PR revisável.
```

## 2. Antes de começar

1. Leia o [`CLAUDE.md`](<../../../CLAUDE.md>) e o [produto](<../../product.md>).
2. Confira no ROADMAP que todas as dependências da tarefa estão **concluídas** (já na `main`).
3. Atualize a `main` por merge (`git pull` em `main`; nunca rebase) e crie a branch indicada no
   prompt. Em paralelo com outros agentes, use uma worktree própria:

   ```bash
   git fetch origin
   git worktree add ../ai-fantasy-<id> -b <branch-do-prompt> origin/main
   ```

4. Recupere o contexto do projeto:

   ```bash
   python3 .agents/ai-fantasy-coala-agent-skill/scripts/coala.py recall "<ID> <título>" --budget 1500
   ```

5. Leia os documentos de "Leia antes" do prompt, nas seções indicadas.
6. Escreva a **lista de testes** (a do prompt é o mínimo) antes do primeiro teste.

## 3. Durante a tarefa

- **TDD:** vermelho → verde → refatorar; um comportamento por teste.
- **A especificação é contrato.** Números são calibração: se mudar um, atualize a tabela de
  constantes e os testes. Regras não mudam sem ADR.
- **Ambiguidade:** procure primeiro a regra no [modelo de simulação](<../../architecture/simulation-model.md>),
  em [atos de conversa](<../../architecture/dialogue-acts.md>), em [presets](<../../architecture/presets.md>)
  e no [glossário](<../../glossary.md>): as tabelas de lá são a resposta, não ponto de partida.
  Se ainda faltar um número ou detalhe, escolha a opção mais simples que respeita as regras,
  escreva-a **primeiro na especificação** (com o teste) no mesmo PR e destaque na descrição do
  PR. Antes de abrir o PR, faça merge da `main` para ver se outra tarefa mexeu na mesma seção.
  Se a lacuna exigir mudar uma regra ou uma decisão de produto, **pare e peça decisão ao
  maintainer**.
- **Fora do escopo:** anote no PR (ou abra uma issue); não implemente.
- Rode `npm run check` com frequência (depois que a FND-01 existir).
- Commits convencionais, conferidos com `oss-gate.sh commit-msg "<mensagem>"`.

## 4. Ao terminar

1. `npm run check` verde; documentação e especificações atualizadas.
2. Mude o estado da tarefa no ROADMAP para ✅ concluída, com o número do PR, **no mesmo PR**.
3. `oss-gate.sh push --scan-only`, push da branch e PR com o título do prompt e o modelo de PR
   (o que, por que, como, lista de testes, evidência).
4. `gh pr checks --watch`; depois, revisão (seção 5) pelo maintainer ou por um agente revisor.
5. Com checks verdes e revisão aprovada: `gh pr merge --squash --delete-branch`. Se o maintainer
   pediu para revisar antes, espere.
6. Registre na memória CoALA só o que for durável e não estiver no código nem nos documentos
   (`coala.py add --type … --key …`). Nunca segredos.
7. Se usou worktree, remova-a depois do merge (`git worktree remove ../ai-fantasy-<id>`).

## 5. Prompt do revisor

```text
Você revisa o PR <número> da tarefa <ID> do AI Fantasy. Leia docs/planning/prompts/<ID>.md, as
especificações citadas nele e o diff completo. Não altere código; responda com aprovação ou com
uma lista de problemas, cada um com arquivo, linha e motivo.
```

O revisor confere:

- [ ] O diff cumpre o objetivo e fica dentro do escopo.
- [ ] Os testes da lista existem e falhariam sem a mudança; gates de cobertura e mutação verdes.
- [ ] O motor continua puro e determinístico (replay e ouro verdes, quando aplicável).
- [ ] Nenhuma saída de modelo chega ao estado sem virar ato ou preset validado.
- [ ] A chave do OpenRouter não aparece no navegador, em logs, em respostas ou no git.
- [ ] Complexidade e tamanho dentro dos limites.
- [ ] Especificações, ADRs e ROADMAP refletem a mudança.
- [ ] Nada da lista "fora do produto" entrou.

## 6. Paralelismo

- Toda tarefa cujas dependências estão concluídas pode correr em paralelo, cada uma na sua
  worktree e na sua branch. A ordem sugerida está no ROADMAP, seção 5.
- Conflitos (por exemplo, na tabela de estado do ROADMAP) se resolvem por merge da `main` na
  branch, mantendo as duas mudanças. Nunca rebase nem force-push.
- Se duas tarefas mexerem no mesmo módulo sem esperar, o PR que entrar depois se adapta.

## 7. Índice das tarefas

| Id | Tarefa | Fase | Depende de |
| --- | --- | --- | --- |
| [FND-01](<FND-01.md>) | Monorepo TypeScript, gates e CI | F1 | — |
| [CORE-01](<CORE-01.md>) | Domínio, aritmética em bp, sorteio e registro | F2 | FND-01 |
| [CORE-02](<CORE-02.md>) | Tempo, contexto e grade | F2 | CORE-01 |
| [CORE-03](<CORE-03.md>) | Catálogos de presets v0 | F2 | CORE-01 |
| [CORE-04](<CORE-04.md>) | Status em camadas, ameaça, presença e modelo de memória | F2 | CORE-02, CORE-03 |
| [CORE-05](<CORE-05.md>) | Geração de elenco e laços | F2 | CORE-04 |
| [SOC-01](<SOC-01.md>) | Atos: validação, custo, quem ouve e interpretação | F3 | CORE-04 |
| [SOC-02](<SOC-02.md>) | Sinais e percepção do momento | F3 | SOC-01 |
| [SOC-03](<SOC-03.md>) | Consequências: avaliação emocional, pedidos e mentiras | F3 | SOC-02 |
| [SOC-04](<SOC-04.md>) | Decisão e turnos | F3 | SOC-03 |
| [SOC-05](<SOC-05.md>) | Passo do motor, sessão e replay | F3 | SOC-04 |
| [SOC-06](<SOC-06.md>) | Personalidade que muda e continuidade entre fatias | F3 | SOC-05 |
| [SRV-01](<SRV-01.md>) | Servidor local | F4 | FND-01 |
| [WEB-01](<WEB-01.md>) | Site base e playground manual | F4 | FND-01, CORE-05 |
| [WEB-02](<WEB-02.md>) | Cena e controles (sem IA) | F4 | WEB-01, SOC-05, AI-01 |
| [WEB-03](<WEB-03.md>) | Inspetor e sessões | F4 | WEB-02, SRV-01, SOC-06 |
| [AI-01](<AI-01.md>) | Portas de IA, perguntas do SOM e falas prontas | F4 | CORE-04 |
| [AI-02](<AI-02.md>) | SOM via OpenRouter e fala livre do jogador | F5 | AI-01, SRV-01, WEB-02 |
| [AI-03](<AI-03.md>) | Modelo de texto via OpenRouter e encenação | F5 | AI-01, SRV-01, WEB-02 |
| [AI-04](<AI-04.md>) | Playground por premissa | F5 | AI-02, WEB-01 |
| [EVAL-01](<EVAL-01.md>) | Avaliação no site e painel de métricas | F6 | WEB-03, AI-03 |
| [EVAL-02](<EVAL-02.md>) | Cenas douradas | F6 | EVAL-01, AI-04, SOC-06 |
| [EVAL-03](<EVAL-03.md>) | Rodada de validação com o maintainer | F6 | EVAL-02 |
| [PERF-01](<PERF-01.md>) | Núcleo em WebAssembly (só se a medição pedir) | F7 | EVAL-01 |

## 8. Modelo para uma tarefa nova

Uma tarefa nova entra primeiro no ROADMAP e ganha um prompt com estas seções: cabeçalho (fase,
dependências, branch, título do PR), Objetivo, Leia antes, Escopo (inclui e não inclui),
Entregáveis, Lista de testes, Critérios de aceite e Cuidados.
