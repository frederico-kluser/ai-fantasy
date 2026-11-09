# Contribuindo com o AI Fantasy

Obrigado pelo interesse. Este documento explica **como** contribuir e **qual é o padrão**
— não é uma sugestão, é o contrato que o CI e os rulesets aplicam.

> **Estado atual:** fundação documental. Ainda não há código; contribuições de código começam
> com a tarefa [FND-01](<docs/planning/prompts/FND-01.md>) do [ROADMAP](<ROADMAP.md>). Até lá são
> bem-vindas correções de documentação, revisão das especificações e propostas de testes.

Ao participar, você concorda com o [Código de Conduta](CODE_OF_CONDUCT.md). Leia também o
[produto](docs/product.md), as [regras de desenvolvimento](docs/engineering/development-rules.md),
a [estratégia de testes](docs/engineering/testing-strategy.md) e a
[arquitetura](docs/architecture/overview.md).

## Antes de abrir qualquer coisa

1. **Procure uma issue existente.** Duplicar trabalho é a forma mais rápida de um PR ser
   fechado.
2. **Mudanças grandes primeiro em issue.** Regra do motor, API pública, formato de sessão ou de
   presets, dependência estrutural ou modelo de IA exigem ADR.
3. **Mudanças pequenas são melhores.** Um PR = um comportamento (de preferência, uma tarefa do
   ROADMAP).
4. **Nunca envie** chaves de API, `.env`, sessões gravadas, dados pessoais ou binários. O
   `.gitignore` cobre os casos comuns; na dúvida, pergunte.

## Preparar o ambiente

O projeto usa **Node 24** e **TypeScript** num monorepo com workspaces do npm (depois da FND-01):

```bash
# 1. Fork + clone
git clone https://github.com/<seu-usuario>/ai-fantasy.git
cd ai-fantasy
git remote add upstream https://github.com/frederico-kluser/ai-fantasy.git

# 2. Dependências e verificação completa
npm ci
npm run check

# 3. IA (opcional): copie o exemplo e preencha a sua chave do OpenRouter
cp .env.example .env
```

Enquanto não há código, o baseline é a validação documental:

```bash
npx markdownlint-cli2 "**/*.md"
```

## Branches: o nome é validado no servidor

O ruleset **"Convenção de Nomes de Ramificação"** rejeita qualquer nome fora de
`<tipo>/<slug>`. O hook local `pre-push` bloqueia antes mesmo de o push sair da sua
máquina. Para tarefas do ROADMAP, use a branch indicada no prompt da tarefa.

| Tipo | Uso | Exemplo |
| --- | --- | --- |
| `feat/` | funcionalidade nova | `feat/core-02-time-and-space` |
| `fix/` | correção de bug | `fix/whisper-range` |
| `docs/` | documentação | `docs/presets-v1` |
| `refactor/` | reestruturação sem mudar comportamento | `refactor/appraisal-tables` |
| `test/` | testes | `test/eval-02-golden-scenes` |
| `perf/` | desempenho | `perf/perf-01-engine-webassembly` |
| `build/` | build e ferramentas | `build/fnd-01-typescript-monorepo` |
| `ci/` | CI | `ci/codeql-typescript` |
| `style/` | formatação | `style/prettier-pass` |
| `revert/` | reversão | `revert/tone-ambiguity` |
| `hotfix/` | emergência | `hotfix/key-leak` |
| `release/` | manutenção pós-release | `release/0.2` |

Exceções automáticas: `dependabot/*`, `renovate/*`, `release-please--*`,
`gh-readonly-queue/*`. Nunca use datas, nomes de pessoas ou espaços.

## Commits: Conventional Commits, sem exceção

```text
feat(engine): add urge-based turn taking
fix(ai): reject lines that cite unknown names
docs(adr): record the TypeScript core decision
refactor(engine): move appraisal effects into tables
test(web): cover the premise playground flow
feat(engine)!: change the session log format to v2

BREAKING CHANGE: v1 session logs must be converted with the migration script.
```

- Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
  `ci`, `chore`, `revert`.
- Cabeçalho em inglês, imperativo, ≤ 72 caracteres.
- Escopos usuais: `engine`, `ai`, `server`, `web`, `eval`, `adr`, `ci`, `deps`.
- `!` ou `BREAKING CHANGE:` disparam MAJOR — use com intenção e explique a migração.
- O hook `commit-msg` rejeita mensagens inválidas. Corrija a mensagem; **nunca**
  `--no-verify`.

## TDD é obrigatório

Nenhum código de produção entra sem um teste que primeiro falhou:

1. **Vermelho** — o menor teste que descreve o comportamento, falhando pelo motivo certo.
2. **Verde** — o mínimo para passar.
3. **Refatorar** — limpe com a rede verde.

Um bug fix começa por um **teste de regressão**. Um PR sem teste (ou sem justificativa explícita)
não é revisado. Detalhes em [`docs/engineering/testing-strategy.md`](docs/engineering/testing-strategy.md).

## Gates (todos verdes antes do PR)

```bash
npm run lint
npm run typecheck
npm run coverage   # linhas ≥ 90%, ramos ≥ 85%; motor 95/90
npm run e2e
npm run mutation   # ≥ 80%; motor ≥ 90%
```

Além disso: TSDoc nas exportações públicas, `npm audit` sem vulnerabilidades altas e
complexidade dentro dos limites de [qualidade de código](docs/engineering/code-quality.md).

## Pull requests

1. **Título = mensagem do squash.** Para tarefas do ROADMAP, use o título do prompt.
2. **Descrição com o porquê.** O template pede contexto, alternativas e riscos.
3. **Vincule a issue** com `Closes #123`, quando houver.
4. **Preencha o plano de testes** e atualize o estado da tarefa no ROADMAP.
5. **Mantenha a branch atualizada por merge:**

   ```bash
   git fetch origin
   git merge origin/main
   ```

   **Nunca** `git rebase`, `git pull --rebase` ou `gh pr update-branch --rebase`.
6. **Revisões:** com 3+ maintainers, 2 aprovações (incluindo o code owner das áreas
   alteradas); com 2 maintainers, 1 aprovação; no **bootstrap** (1 maintainer), o ruleset
   exige 0 aprovações, mas o PR continua obrigatório, com checks verdes e o checklist
   preenchido.
7. **Merge:** `gh pr merge --squash --delete-branch`. Squash é merge; rebase-merge não
   existe neste repositório.
8. **Sem force-push, sem histórico reescrito, sem `--no-verify`.**

## O que não aceitamos

- Saída de modelo de IA alterando estado sem virar ato ou preset validado.
- `Math.random`, `Date` ou números quebrados no estado do motor.
- A chave do OpenRouter no navegador, em logs, em respostas ou no repositório.
- Nomes de fornecedor de modelo (`jev`, `mimo`…) em identificadores; use `systemOne` e
  `textModel`.
- Funcionalidades da lista "fora do produto" sem decisão nova.
- Funções acima dos limites de complexidade sem justificativa aprovada em revisão.
- Dependências novas sem justificativa e licença compatível com MIT.
- Código gerado por IA sem revisão humana, testes e divulgação no PR.

## Contribuições assistidas por IA

São permitidas, com transparência:

- declare no PR que houve assistência de IA e qual foi o escopo;
- **você** é responsável pelo código, pela licença e pelos testes;
- não cole conteúdo de terceiros sem verificar licença e atribuição;
- não use um modelo para "aprovar" o próprio código;
- siga as mesmas regras de complexidade, documentação e TDD.

Agentes que executam tarefas do ROADMAP seguem o
[guia dos agentes](docs/planning/prompts/README.md).

## Documentação

Mudanças de comportamento exigem mudança de documentação no mesmo PR:

- regras do motor: [modelo de simulação](docs/architecture/simulation-model.md) (regra nova pede
  ADR; número novo é calibração);
- decisões estruturais: novo ADR em `docs/architecture/adr/` (nunca reescrever um aceito);
- regras e guias: `docs/engineering/`;
- `README.md` só para o que um recém-chegado precisa saber.

Português do Brasil é o idioma da documentação de produto e engenharia; identificadores,
comentários de código, commits e TSDoc são em inglês.

## Releases

O versionamento é [SemVer](https://semver.org/) calculado a partir dos commits. O
`CHANGELOG.md` é gerado, nunca escrito à mão. Releases saem de `main` com tag anotada
`vX.Y.Z`. Não publique uma versão que retroceda outra.

## Precisa de ajuda?

- Dúvidas de uso ou arquitetura: abra uma **Discussion** ou uma issue `question`.
- Segurança: **não** abra issue pública; use [`SECURITY.md`](SECURITY.md).
- Conduta: siga o [Código de Conduta](CODE_OF_CONDUCT.md).

## Licença da contribuição

Ao enviar um PR, você concorda que a sua contribuição é licenciada sob a **MIT**, a mesma
licença do projeto (inbound = outbound), e que tem o direito de a submeter. Não é exigido
CLA nem DCO neste momento.
