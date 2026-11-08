# Contribuindo com o AI Fantasy

Obrigado pelo interesse. Este documento explica **como** contribuir e **qual é o padrão**
— não é uma sugestão, é o contrato que o CI e os rulesets aplicam.

> **Estado atual:** fundação. Ainda não há workspace Rust. Contribuições de código só
> começam depois do PR `feat(core): scaffold the Rust workspace`. Até lá, são bem-vindas
> correções de documentação, ADRs, revisão de arquitetura e propostas de testes.

Ao participar, você concorda com o [Código de Conduta](CODE_OF_CONDUCT.md). Leia também
as [regras de desenvolvimento](docs/engineering/development-rules.md), a
[estratégia de testes](docs/engineering/testing-strategy.md) e a
[arquitetura](docs/architecture/overview.md).

## Antes de abrir qualquer coisa

1. **Procure uma issue existente.** Duplicar trabalho é a forma mais rápida de um PR ser
   fechado.
2. **Abra uma issue antes de mudanças grandes.** Alterações de arquitetura, API pública,
   formato de save, schema de regras ou dependências exigem um ADR e concordância prévia.
3. **Mudanças pequenas são melhores.** Um PR = um comportamento. Se precisar de “e” no
   título, provavelmente são dois PRs.
4. **Não envie pesos de modelos, saves, dados de telemetria ou binários.** O `.gitignore`
   cobre os casos comuns; se em dúvida, pergunte antes.

## Preparar o ambiente

O projeto usa **Rust stable, edição 2024** (pinned em `rust-toolchain.toml` quando o
workspace existir), **SQLite** local e **llama.cpp** para os *sidecars*. Nada de Node,
Python ou contêineres no runtime.

```bash
# 1. Fork + clone
git clone https://github.com/<seu-usuario>/ai-fantasy.git
cd ai-fantasy
git remote add upstream https://github.com/frederico-kluser/ai-fantasy.git

# 2. Ferramentas de desenvolvimento (quando o workspace existir)
rustup toolchain install stable --component rustfmt clippy llvm-tools-preview
cargo install cargo-nextest cargo-llvm-cov cargo-mutants cargo-insta

# 3. Baseline
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo nextest run --workspace --profile ci
```

Enquanto não há `Cargo.toml`, o baseline é a validação documental:

```bash
npx markdownlint-cli2 "**/*.md"
```

## Branches: o nome é validado no servidor

O ruleset **“Convenção de Nomes de Ramificação”** rejeita qualquer nome fora de
`<tipo>/<slug>`. O hook local `pre-push` bloqueia antes mesmo de o push sair da sua
máquina.

| Tipo | Uso | Exemplo |
| --- | --- | --- |
| `feat/` | funcionalidade nova | `feat/rumor-decay` |
| `fix/` | correção de bug | `fix/empty-conversation-log` |
| `docs/` | documentação | `docs/offline-ai-guide` |
| `refactor/` | reestruturação sem mudar comportamento | `refactor/rule-validator` |
| `test/` | testes | `test/e2e-scenario-runner` |
| `perf/` | performance | `perf/tick-allocation` |
| `build/` | build/packaging | `build/pin-toolchain` |
| `ci/` | CI | `ci/codeql-rust` |
| `style/` | formatação | `style/rustfmt-pass` |
| `revert/` | reversão | `revert/rule-cache` |
| `hotfix/` | emergência | `hotfix/save-corruption` |
| `release/` | manutenção pós-release | `release/0.2` |

Exceções automáticas: `dependabot/*`, `renovate/*`, `release-please--*`,
`gh-readonly-queue/*`. Nunca use datas, nomes de pessoas ou espaços.

## Commits: Conventional Commits, sem exceção

```text
feat(core): add deterministic tick scheduler
fix(rules): reject unknown effect kinds
docs(adr): record offline model runtime decision
refactor(conversation): extract record packing
test(e2e): cover forged-debt scenario
feat(rules)!: change rule schema to v2

BREAKING CHANGE: rules v1 must be migrated with `af-rules migrate`.
```

- Tipos permitidos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
  `ci`, `chore`, `revert`.
- Cabeçalho em inglês, imperativo, ≤ 72 caracteres.
- Escopo opcional, minúsculo, curto (`core`, `rules`, `nlg`, `system-one`, `store`, `ci`).
- `!` ou `BREAKING CHANGE:` disparam MAJOR — use com intenção e explique a migração.
- O hook `commit-msg` rejeita mensagens inválidas. Corrija a mensagem; **nunca**
  `--no-verify`.

## TDD é obrigatório

Nenhum código de produção entra sem um teste que primeiro falhou. O ciclo é:

1. **Red** — escreva o menor teste que descreve o comportamento e veja-o falhar pelo
   motivo certo.
2. **Green** — implemente o mínimo para passar.
3. **Refactor** — limpe duplicação e complexidade com a rede verde.

Um bug fix começa por um **teste de regressão** que reproduz o bug. Um PR sem teste (ou
sem justificativa explícita de por que não há teste) não é revisto.

Consulte [`docs/engineering/testing-strategy.md`](docs/engineering/testing-strategy.md)
para a definição operacional de “100% testável”, os gates de cobertura/mutação e o formato
dos testes E2E.

## Gates locais (todos verdes antes do PR)

```bash
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo nextest run --workspace --profile ci
cargo llvm-cov nextest --workspace --fail-under-lines 90
cargo mutants --workspace --in-place --timeout 300
```

Além disso:

- `cargo doc --workspace --no-deps` sem warnings;
- `cargo deny check` (licenças, advisories, duplicatas);
- `cargo audit` sem vulnerabilidades conhecidas;
- toda a API pública com `///` e exemplo compilável quando fizer sentido.

## Pull requests

1. **Título = mensagem do squash.** `feat(rules): add DC clamp` — não “Update stuff”.
2. **Descrição com o porquê.** O template pede contexto, alternativas e riscos.
3. **Vincule a issue** com `Closes #123`.
4. **Preencha o test plan.** Diga o que foi testado, como e o que ficou fora.
5. **Mantenha a branch atualizada por merge:**

   ```bash
   git fetch origin
   git merge origin/main
   ```

   **Nunca** `git rebase`, `git pull --rebase` ou `gh pr update-branch --rebase`.
6. **Reviews:** com 3+ maintainers, 2 aprovações (incluindo o code owner das áreas
   alteradas); com 2 maintainers, 1 aprovação; no **bootstrap** (1 maintainer), o ruleset
   exige 0 aprovações, mas o PR continua obrigatório, com checks verdes e o checklist
   preenchido. A exigência sobe assim que houver mais maintainers (ver `GOVERNANCE.md`).
7. **Merge:** `gh pr merge --squash --delete-branch`. Squash é merge; rebase-merge não
   existe neste repositório.
8. **Sem force-push, sem histórico reescrito, sem `--no-verify`.**

## O que não aceitamos

- Chamadas de rede no runtime (exceto loopback para os *sidecars* locais).
- Um modelo a alterar estado diretamente, sem schema, validação e materializador
  determinístico.
- “JEV” como processo, servidor, base de dados ou motor. O termo é histórico; o código usa
  `system_one`.
- `unwrap()`/`expect()`/`panic!` em código de biblioteca fora de testes (o lint bloqueia).
- Funções acima dos limites de complexidade sem justificativa aprovada em review.
- Dependências novas sem justificativa, licença compatível e `cargo deny`.
- Segredos, tokens, chaves, `.env`, pesos de modelos ou dados pessoais.
- Código gerado por IA sem revisão humana, testes e divulgação no PR.

## Contribuições assistidas por IA

São permitidas, com transparência:

- declare no PR que houve assistência de IA e qual foi o âmbito;
- **você** é responsável pelo código, pela licença e pelos testes;
- não cole conteúdo de terceiros sem verificar licença e atribuição;
- não use um modelo para “aprovar” o próprio código;
- siga as mesmas regras de complexidade, documentação e TDD.

## Documentação

Mudanças de comportamento exigem mudança de documentação no mesmo PR. Use:

- `docs/architecture/adr/` para decisões arquiteturais (novo ADR, não reescrever antigo);
- `docs/engineering/` para regras e guias;
- `docs/architecture/roadmap.md` para a visão técnica;
- `README.md` apenas para o que um recém-chegado precisa de saber.

Português (pt-BR) é o idioma da documentação de produto/engenharia; identificadores,
comentários de código, commits e rustdoc são em inglês.

## Releases

O versionamento é [SemVer](https://semver.org/) calculado a partir dos commits. O
`CHANGELOG.md` é gerado, nunca escrito à mão. Releases são criadas a partir de `main` com
tag anotada `vX.Y.Z`. Não publique uma versão que retroceda outra.

## Precisa de ajuda?

- Dúvidas de uso/arquitetura: abra uma **Discussion** ou uma issue `question`.
- Segurança: **não** abra issue pública; use [`SECURITY.md`](SECURITY.md).
- Conduta: siga o [Código de Conduta](CODE_OF_CONDUCT.md); reporte violações ao
  maintainer indicado no documento.

## Licença da contribuição

Ao enviar um PR, você concorda que a sua contribuição é licenciada sob a **MIT**, a mesma
licença do projeto (inbound = outbound), e que tem o direito de a submeter. Não é exigido
CLA nem DCO neste momento.
