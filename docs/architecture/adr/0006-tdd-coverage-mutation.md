# ADR 0006 — TDD, cobertura, mutação e “100% testável”

- **Status:** Superseded by ADR 0018 (2026-11-09; era Aceite)
- **Data:** 2026-11-08
- **Decisores:** @frederico-kluser
- **Relacionado:** ADR 0005, `docs/engineering/testing-strategy.md`

## Contexto

“Queremos tudo 100% testável” pode significar 100% de cobertura (caro e enganador) ou uma
propriedade arquitetural (todo o comportamento é observável e controlável). O projeto
precisa de uma definição que seja simultaneamente ambiciosa e sustentável, e de gates que
impeçam regressões sem transformar o CI num circo.

## Decisão

### Definição adotada

**100% testável** significa:

1. **Observabilidade** — todo o comportamento tem uma saída observável (retorno, evento,
   estado, erro) através de uma porta pública.
2. **Controlabilidade** — todas as entradas não determinísticas (tempo, RNG, modelo,
   store, rede, ambiente) são injetáveis.
3. **Isolamento** — testes unitários não precisam de rede, processos, relógio real ou
   ficheiros; integração usa diretórios temporários; E2E usa modelos falsos.
4. **Determinismo** — mesmo seed/entradas ⇒ mesma saída canónica.
5. **Contrato** — cada porta tem testes de contrato contra fake e adaptador real.
6. **Regressão** — todo bug tem um teste que falha antes da correção.
7. **Qualidade dos testes** — mutação acima do limiar; cobertura não é o único critério.

### Gates

| Gate | Limiar |
| --- | --- |
| Cobertura de linha global | ≥ 90% |
| Cobertura de ramo global | ≥ 85% |
| `af-rules` (linha e ramo) | 100% |
| `af-core` (linha / ramo) | ≥ 95% / ≥ 90% |
| Cobertura de diff do PR | ≥ 95% |
| Mutação global | ≥ 80% |
| Mutação `af-core`/`af-rules` | ≥ 90% |
| Testes E2E | 100% dos cenários do catálogo |
| Documentação pública | 100% dos itens públicos com `///` |

Exclusões de cobertura (geradas, `main.rs`, testes) exigem justificação no `Cargo.toml` ou
no `llvm-cov` config; nunca “excluir para passar”.

### Ferramentas

- `cargo-nextest` para execução e perfis.
- `cargo-llvm-cov` para cobertura (linhas, ramos, diff).
- `cargo-mutants` para mutação.
- `proptest` para invariantes.
- `insta` para golden/snapshots.
- `assert_cmd`/`predicates` para E2E de CLI.
- `trybuild` para contratos de compilação (se necessário).
- `criterion` para benchmarks (não gate de PR; nightly).

## Consequências

### Positivas

- Testes rápidos e herméticos; CI confiável.
- Refatoração segura; mutação apanha testes fracos.
- Arquitetura desacoplada por necessidade de testar.
- Expectativa clara para contribuidores.

### Negativas / custos

- 90%+ de cobertura e 80%+ de mutação exigem disciplina e tempo.
- Mutação é lenta; corre em nightly ou em PRs que tocam core/rules.
- Fakes e cassettes precisam de manutenção.
- Há risco de “testar para a métrica”; review combate isso.

## Alternativas consideradas

- **100% de cobertura de linha**: rejeitado; incentiva testes triviais e não garante
  comportamento.
- **Sem gate de cobertura, só review**: rejeitado; regressões passam despercebidas.
- **Mutation testing em todos os PRs**: rejeitado por tempo; nightly + paths críticos.
- **Apenas testes E2E**: rejeitado; lentos, difíceis de localizar e não cobrem ramos.

## Critérios de verificação

- CI falha abaixo dos limiares.
- `cargo mutants` produz relatório e falha abaixo do score.
- PR template exige test plan e lista de testes.
- Code review rejeita testes sem asserção comportamental.

## Referências

- [Martin Fowler — Test-Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [cargo-nextest](https://nexte.st/)
- [cargo-llvm-cov](https://github.com/taiki-e/cargo-llvm-cov)
- [cargo-mutants](https://mutants.rs/)
- [proptest](https://proptest-rs.github.io/proptest/)
- [insta](https://insta.rs/)
