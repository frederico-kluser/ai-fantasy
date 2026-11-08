<!-- O título do PR vira a mensagem do squash merge e DEVE seguir
     Conventional Commits (ex.: `feat(rules): add DC clamp`). -->

## O que

<!-- O que muda, em uma ou duas frases concretas. -->

## Por que

<!-- Motivação, problema, issue. Use `Closes #123` para fechar automaticamente. -->

Closes #

## Como

<!-- Abordagem, alternativas consideradas, trade-offs. Se for refactor, diga
     explicitamente que não há mudança de comportamento. -->

## Tipo de mudança

- [ ] `feat` — funcionalidade
- [ ] `fix` — correção
- [ ] `refactor` — sem mudança de comportamento
- [ ] `docs` — documentação
- [ ] `test` — testes
- [ ] `perf` — performance
- [ ] `build` / `ci` — tooling
- [ ] `chore` — manutenção
- [ ] **Breaking change** (descreva a migração abaixo)

## Checklist de arquitetura e offline

- [ ] Não adiciona rede no runtime (exceto loopback para sidecars locais).
- [ ] Não introduz “JEV” como motor/processo/rota/tabela; usa `system_one`.
- [ ] Saída de modelo é validada antes de alterar estado (schema + materializador).
- [ ] Mantém determinismo (sem `Instant::now`, `thread_rng`, `HashMap`, `f32` no estado).
- [ ] Dependências novas justificadas, licenciadas e `cargo deny` verdes.
- [ ] Sem segredos, pesos de modelos, dados pessoais ou binários grandes.

## Test plan (TDD)

<!-- Cole a test list: given/when/then, casos de erro e limites. -->

- [ ] Teste escrito antes da implementação (ou justificativa explícita).
- [ ] Unit:
- [ ] Property:
- [ ] Contract:
- [ ] E2E: `af-scenario run ... --seed ...`
- [ ] Live (modelos/hardware, se aplicável):
- [ ] Não testado (e por quê):

```text
# comandos executados e resultado resumido
```

## Qualidade

- [ ] `cargo fmt --check`
- [ ] `cargo clippy -- -D warnings`
- [ ] `cargo nextest run --workspace --profile ci`
- [ ] Cobertura/mutação dentro dos gates (quando aplicável)
- [ ] Complexidade dentro dos limites (ciclomática/cognitiva ≤ 10, função ≤ 40 linhas)
- [ ] Sem `unwrap`/`expect`/`panic!` em bibliotecas
- [ ] Rustdoc/`docs/` atualizados; ADR se a decisão for estrutural

## Breaking changes

<!-- Nenhuma — ou descreva o impacto, a migração e o novo MAJOR. -->

-

## Evidência

<!-- Logs, screenshots de TUI, output canónico, benchmark antes/depois. -->
