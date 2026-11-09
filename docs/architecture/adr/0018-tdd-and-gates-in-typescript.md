# ADR 0018 — TDD e gates completos em TypeScript

- **Status:** Aceito
- **Data:** 2026-11-09
- **Decisores:** @frederico-kluser
- **Relacionado:** D-25; substitui o ADR 0006

## Contexto

O maintainer manteve os gates completos de qualidade mesmo na fase de validação. O ADR 0006
definia TDD, cobertura e mutação com ferramentas de Rust; a stack agora é TypeScript.

## Decisão

1. **TDD obrigatório:** nenhum código de produção sem um teste que falhou antes.
2. **Ferramentas:** Vitest (unidade, integração, cobertura), fast-check (propriedades), Stryker
   (mutação), Playwright (E2E), ESLint e TypeScript em modo estrito.
3. **Gates:**

   | Escopo | Linhas | Ramos | Mutação |
   | --- | --- | --- | --- |
   | Repositório | ≥ 90% | ≥ 85% | ≥ 80% |
   | `packages/engine` | ≥ 95% | ≥ 90% | ≥ 90% |
   | Linhas novas do PR | ≥ 95% | — | — |

4. **Complexidade** (ESLint): ciclomática ≤ 10, cognitiva ≤ 10, função ≤ 40 linhas, até 5
   parâmetros, aninhamento ≤ 3.
5. **Hermeticidade:** testes de PR não usam rede, chave, relógio real nem modelos de verdade; a
   IA entra por falsos e gravações. O teste ao vivo é manual.
6. **Naturalidade não é teste:** a qualidade das falas é medida pela
   [avaliação](<../../engineering/evaluation.md>), não por testes automáticos.

## Consequências

### Positivas

- Base confiável para um motor que vai servir a outros jogos.
- Defeitos do motor não se confundem com "falta de naturalidade".

### Negativas / custos

- Mais tempo por tarefa, inclusive na interface.

### Riscos

- Testes de interface frágeis. Mitigação: testar comportamento pelo papel e pelo texto acessível,
  nunca por classes CSS.

## Alternativas consideradas

- **Gates leves no laboratório** — recusado pelo maintainer (Q-06 do formulário).

## Critérios de verificação

- O CI falha abaixo dos limiares e acima dos limites de complexidade.
- A estratégia de testes está em [`testing-strategy.md`](<../../engineering/testing-strategy.md>).

## Referências

- [Regras de desenvolvimento](<../../engineering/development-rules.md>),
  [qualidade de código](<../../engineering/code-quality.md>).
