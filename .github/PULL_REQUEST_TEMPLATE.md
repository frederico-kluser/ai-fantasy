<!-- O título do PR vira a mensagem do squash merge e DEVE seguir
     Conventional Commits (ex.: `feat(engine): add urge-based turn taking`). -->

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

## Checklist de arquitetura

- [ ] O motor continua decidindo tudo; nenhuma saída de modelo altera estado sem virar ato ou preset validado.
- [ ] Motor determinístico (sem `Math.random`, `Date`, números quebrados no estado); replay e ouro verdes.
- [ ] A chave do OpenRouter não aparece no navegador, em logs, em respostas ou no git.
- [ ] Nomes de papel no código (`systemOne`, `textModel`), nunca de fornecedor.
- [ ] Dentro do produto (`docs/product.md`); dependências novas justificadas e com licença compatível.
- [ ] Sem segredos, dados pessoais, sessões gravadas reais ou binários grandes.

## Tarefa do ROADMAP

<!-- Id e prompt da tarefa (ex.: CORE-02, docs/planning/prompts/CORE-02.md) e o estado atualizado no ROADMAP. -->

## Test plan (TDD)

<!-- Cole a lista de testes: given/when/then, casos de erro e limites. -->

- [ ] Teste escrito antes da implementação (ou justificativa explícita).
- [ ] Unidade:
- [ ] Propriedade:
- [ ] Ouro / replay:
- [ ] Contrato (IA falsa e gravações):
- [ ] E2E (Playwright):
- [ ] Ao vivo (manual, se aplicável):
- [ ] Não testado (e por quê):

```text
# comandos executados e resultado resumido
```

## Qualidade

- [ ] `npm run lint` e `npm run typecheck`
- [ ] `npm run coverage` (linhas ≥ 90%, ramos ≥ 85%; motor 95/90)
- [ ] `npm run mutation` (≥ 80%; motor ≥ 90%), quando aplicável
- [ ] `npm run e2e`
- [ ] Complexidade dentro dos limites (ciclomática/cognitiva ≤ 10, função ≤ 40 linhas)
- [ ] TSDoc e especificações em `docs/` atualizados; ADR se a decisão for estrutural

## Breaking changes

<!-- Nenhuma — ou descreva o impacto, a migração e o novo MAJOR. -->

-

## Evidência

<!-- Logs, capturas de tela, transcrição simbólica, benchmark antes/depois. -->
