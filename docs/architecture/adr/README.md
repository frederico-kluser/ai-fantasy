# Architecture Decision Records (ADRs)

Uma decisão arquitetural relevante fica registada aqui. O ADR explica **porquê**, não
apenas **o quê**; o código explica o como.

## Índice

| ADR | Título | Status |
| --- | --- | --- |
| [0001](0001-offline-first-runtime.md) | Runtime offline-first e hermético | Aceite |
| [0002](0002-rust-flecs-deterministic-core.md) | Rust 2024 + Flecs ECS | Aceite |
| [0003](0003-jev-is-not-a-runtime.md) | JEV não é runtime; System One é o d1-2B | Aceite |
| [0004](0004-model-proposes-core-disposes.md) | O modelo propõe, o núcleo dispõe | Aceite |
| [0005](0005-deterministic-simulation-contract.md) | Contrato de determinismo | Aceite |
| [0006](0006-tdd-coverage-mutation.md) | TDD, cobertura e mutação | Aceite |
| [0007](0007-license-and-model-distribution.md) | Licença do código e dos modelos | Aceite |
| [0008](<0008-action-driven-simulation-time.md>) | Tempo por ações do personagem | Proposto — decisão de produto registrada; contrato técnico em revisão |
| [0009](<0009-privileged-silhouette-overlay.md>) | Overlay de silhuetas separado da percepção | Proposto — decisão de produto registrada; contrato técnico em revisão |
| [0010](<0010-identity-event-layout.md>) | Identidade geracional e layout de evento versionado | Proposto — [contrato CTR-01](<../../planning/contracts/identity-events.md>) em revisão |

**Revisão documental: 2026-11-08.** Os novos registros preservam a devolutiva do
[maintainer](<../../planning/decisions.md>), mas não aprovam fórmulas, APIs ou implementação.
Os ADRs 0001–0007 aceitos não foram alterados; atividades e aceite dos contratos ficam no
[ROADMAP de execução](<../../../ROADMAP.md>).

## Como escrever um ADR

1. Copie `template.md` para `NNNN-titulo-em-kebab-case.md` (próximo número livre).
2. Preencha contexto, decisão, consequências (positivas e negativas), alternativas e
   critérios de verificação.
3. Abra um PR `docs(adr): ...`; a discussão acontece no PR.
4. Um ADR aceite **não é editado**: para mudar a decisão, crie um novo ADR e marque o
   antigo como `Superseded by ADR NNNN`.
5. Decisões que afetam segurança, licença, offline ou contrato público exigem revisão do
   code owner e, se possível, de um segundo maintainer.

## Quando é obrigatório

- nova dependência estrutural (ECS, runtime, base de dados, modelo);
- mudança de formato de save, schema de regras ou API pública;
- mudança de estratégia de testes/qualidade;
- mudança de licença ou de distribuição de modelos;
- qualquer coisa que o roadmap não preveja.
