# Regras de Desenvolvimento

> **Normativo.** Este documento define o que é aceite num PR. Em caso de conflito:
> instrução direta do maintainer > `CLAUDE.md`/`AGENTS.md` > ADR > este documento >
> preferência pessoal. Se uma regra não fizer sentido, abre um ADR — não a ignores.

## 1. Regras de ouro

1. **Offline é invariante.** Nenhuma chamada de rede no runtime; só *loopback* para
   *sidecars* locais. Uma dependência que abre socket fora de `127.0.0.1` é rejeitada.
2. **JEV não é runtime.** O termo é histórico; o código usa `system_one`. Nada de
   processos, tabelas, rotas ou módulos “jev”.
3. **O modelo propõe, o núcleo dispõe.** Saída de modelo é dado não confiável; só o
   materializador determinístico altera estado.
4. **Teste primeiro.** Nenhum código de produção sem um teste que falhou primeiro.
5. **Determinismo.** Sem relógio de parede, `thread_rng`, `HashMap` ou `f32` no estado
   autoritativo.
6. **Complexidade baixa.** Limites da secção 6; `clippy` bloqueia.
7. **Documentação no mesmo PR.** Comportamento novo sem doc é incompleto.
8. **Sem segredos, sem pesos, sem dados pessoais.**
9. **Merge, nunca rebase.** Sincronizar e integrar é merge; squash no PR.
10. **Nenhum gate se contorna.** `--no-verify`, force-push e histórico reescrito são
    proibidos.

## 2. Idioma e estilo

| Artefacto | Idioma | Convenção |
| --- | --- | --- |
| Identificadores, tipos, módulos | Inglês | `snake_case`/`CamelCase`, palavras completas. |
| Comentários de código e rustdoc | Inglês | Explicam **porquê**, não o óbvio. |
| Documentação de produto/engenharia | Português (pt-BR) | Termos do [glossário](../glossary.md). |
| Commits, branches, PRs | Inglês | Conventional Commits. |
| Mensagens de erro para o jogador | Português | Claras, acionáveis, sem *stack trace*. |

- Formatação: `rustfmt` (largura 100), LF, UTF-8, newline final.
- Sem abreviações fora do domínio (`hp`, `dc`, `npc`, `bp`, `ticks` são aceites).
- Nomes de unidades no identificador: `fear_delta_bp`, `timeout_ms`, `half_life_ticks`.
- Evitar `data`, `info`, `manager`, `util`, `helper`, `misc`: dizem nada.
- Funções começam por verbo; tipos por substantivo; booleanos por pergunta (`is_`, `has_`).

## 3. Arquitetura

- Respeitar a direção de dependências de [`../architecture/overview.md`](../architecture/overview.md).
  `af-core` não importa adaptadores.
- Toda a dependência externa (tempo, RNG, modelo, store, rede, ambiente) entra por
  **porta** (`af-ports`). O núcleo não tem globais mutáveis.
- Não introduzir nova crate sem justificar: responsabilidade única, dependências mínimas,
  licença compatível e ADR se for estrutural.
- `af-domain` é puro: sem I/O, sem `std::env`, sem `tokio`.
- `unsafe` é `forbid` em todos os crates, exceto a fronteira FFI explicitamente aprovada;
  nesse caso, `// SAFETY:`, teste e Miri.
- `async` não entra no núcleo. Se for necessário em adaptadores, fica confinado e é
  convertido para síncrono na fronteira.
- Erros são valores: `thiserror` nas bibliotecas, `anyhow` apenas em `af-app`/binários.
- Nada de `unwrap`/`expect`/`panic!`/`todo!`/`unimplemented!` em bibliotecas; usa `?` e
  erros tipados. Em testes, `unwrap` é aceitável com mensagem.
- Não usar `print!`/`println!` em bibliotecas; usa `tracing`.
- Não usar `dbg!` em código commitado.

### Dependências

- Preferir `std` e crates pequenas, maduras e auditáveis.
- Toda a dependência nova precisa de: justificativa no PR, licença na allowlist, versão
  pinada no `Cargo.lock`, `cargo deny` verde e revisão de *features* (evitar `default-features`
  que puxem rede/TLS).
- `openssl` é evitado; preferir `rustls` se TLS for indispensável (não é no runtime).
- `build.rs` só com justificação; nunca executar código de rede no *build*.
- Dependabot semanal; atualizações de segurança têm prioridade.

## 4. Código

- Funções fazem **uma coisa** e dizem-no no nome.
- Preferir **guard clauses** e `match` exaustivo a `if` aninhado.
- Sem parâmetros booleanos: usa enums com nomes (`Mode::DryRun`, `Mode::Commit`).
- Sem `Option<Option<T>>`; modela o estado com enum.
- Newtypes para IDs, unidades e valores com invariantes (`BasisPoints`, `Tick`, `Dc`).
- Validar na fronteira; no interior, confiar no tipo (parse, don't validate).
- Não duplicar antes da terceira ocorrência; aí extrai.
- Comentários: explicam decisões, invariantes, *trade-offs* e *workarounds*; não repetem
  o código. `TODO` só com issue: `// TODO(#123): ...`.
- Testes são código de primeira classe: nomes claros, sem lógica, sem *sleep*, sem
  dependência de ordem.
- Não deixar código morto; `#[allow(dead_code)]` exige justificação.

## 5. Testes

O contrato completo está em [`testing-strategy.md`](testing-strategy.md). Resumo:

- Red → Green → Refactor; um comportamento por teste.
- Nome: `given_<contexto>_when_<ação>_then_<resultado>`.
- Unitários sem I/O; integração com *tempdir*; E2E com modelos falsos.
- Bug fix = teste de regressão que falha antes.
- Portas têm testes de contrato contra fake e real.
- Cobertura/mutação nos limiares do ADR 0006.
- Nenhum teste depende de rede, ordem, relógio real ou estado global.

## 6. Complexidade e tamanho

| Métrica | Limite | Falha |
| --- | --- | --- |
| Complexidade ciclomática (McCabe) | **10** | > 10 bloqueia; exceção > 12 exige ADR/review. |
| Complexidade cognitiva (`clippy`) | **10** | > 10 bloqueia. |
| Linhas lógicas por função | **40** | > 40 bloqueia. |
| Parâmetros por função | **5** | > 5 bloqueia (usa struct). |
| Aninhamento | **3** | > 3 bloqueia (extrai/early return). |
| Ramos de `match` | **12** | > 12 extrai função/entidade. |
| Ficheiro | **400** linhas (soft) | > 400 justifica no PR. |
| Módulo | **800** linhas (soft) | > 800 justifica no PR. |
| Operadores booleanos numa condição | **3** | > 3 extrai predicado nomeado. |

Detalhes, configuração de `clippy.toml` e padrões de refatoração em
[`code-quality.md`](code-quality.md).

## 7. Documentação

- `#![deny(missing_docs)]` em todos os crates públicos.
- Cada crate tem `//!` com: propósito, invariantes, exemplo, erros e complexidade.
- Cada item público tem `///` com `# Examples`; `# Errors` e `# Panics` quando aplicável.
- Exemplos de rustdoc são compilados (`cargo test --doc`).
- Decisões arquiteturais: ADR. Regras: este documento. Visão: roadmap.
- Diagramas em Mermaid; nada de imagens binárias para diagramas editáveis.
- README de crate quando o crate for publicado; não duplicar o README raiz.
- Links relativos e válidos; `lychee` no CI.

## 8. Git, commits e branches

- Branch: `<tipo>/<slug>` (tipos fechados); validado por hook e ruleset.
- Commit: Conventional Commits, imperativo, ≤ 72 chars, um motivo por commit.
- Não commitar WIP em `main`; commits atómicos e verdes.
- Nunca `git rebase`, `git pull --rebase`, `push --force`, `--no-verify`.
- Sincronizar: `git fetch origin && git merge origin/main`.
- PR: título = mensagem do squash; descrição com o porquê; test plan; issue linkada.
- Tamanho alvo: ≤ 400 linhas alteradas (sem testes/docs/lockfile). Maior ⇒ justificar ou
  dividir.
- Review: com 3+ maintainers, 2 aprovações + code owner; com 2, 1 aprovação; no
  bootstrap (1 maintainer), 0 aprovações exigidas pelo ruleset, mas PR e checks
  continuam obrigatórios. Threads resolvidas; checks verdes; squash merge.

## 9. Definition of Done

Um PR só está pronto quando:

- [ ] O comportamento foi descrito e testado (TDD), incluindo casos de erro.
- [ ] Testes unitários/integração/E2E relevantes passam localmente.
- [ ] `fmt`, `clippy -D warnings`, `nextest`, cobertura e mutação dentro dos gates.
- [ ] Documentação atualizada (rustdoc, docs, ADR, README se aplicável).
- [ ] Complexidade dentro dos limites; sem `unwrap`/`panic` em bibliotecas.
- [ ] Offline preservado; nenhuma dependência de rede nova.
- [ ] Segurança revista: entradas não confiáveis, limites, *path traversal*, *prompt
      injection*.
- [ ] Licenças compatíveis; sem pesos/segredos/dados pessoais.
- [ ] CHANGELOG não editado à mão (gerado na release); Conventional Commits corretos.
- [ ] O autor respondeu a todos os comentários e resolveu threads.

## 10. Segurança e privacidade

- Toda a entrada externa é não confiável: saves, fixtures, respostas de modelo, caminhos,
  variáveis de ambiente.
- Limites explícitos: tamanho de JSON, número de efeitos, entidades, rumores, tempo de
  modelo, bytes de resposta.
- Sem `eval`, shell, SQL dinâmico ou desserialização de tipos arbitrários.
- SQL sempre parametrizado; migrações revistas.
- Sem logs de dados pessoais ou de *prompts* completos por padrão.
- Vulnerabilidades seguem [`SECURITY.md`](../../SECURITY.md), nunca issues públicas.

## 11. Código assistido por IA

- Divulgar no PR (ferramenta, âmbito, o que foi revisto).
- O autor humano é responsável por licença, segurança, testes e complexidade.
- Não colar código de terceiros sem licença/atribuição.
- Não usar modelo para aprovar o próprio código.
- Nenhuma saída de modelo entra em runtime sem validação (ver regra 3).

## 12. Exceções

Uma exceção a uma regra exige:

1. justificação escrita no PR;
2. aprovação de um maintainer (e do code owner da área);
3. um `#[allow(...)]` com comentário e issue de follow-up, quando aplicável;
4. prazo para remover a exceção, se temporária.

Exceções permanentes exigem ADR. “É mais rápido” não é justificação.

## 13. Checklist rápido de review

- [ ] O PR faz uma coisa e o título diz qual.
- [ ] O teste falharia sem a mudança?
- [ ] Há caso de erro e caso limite?
- [ ] A função cabe na cabeça? Complexidade ≤ 10?
- [ ] As dependências apontam para dentro? Sem rede?
- [ ] A saída do modelo é validada antes de tocar no estado?
- [ ] A documentação explica o porquê?
- [ ] O save antigo continua a carregar?
- [ ] O comportamento offline se mantém?
- [ ] O commit/branch/PR cumprem a convenção?
