# Architecture Decision Records (ADRs)

Uma decisão arquitetural relevante fica registrada aqui. O ADR explica **por quê**, não apenas
**o quê**; o código explica o como.

## Vigentes

| ADR | Título | Status |
| --- | --- | --- |
| [0013](<0013-product-is-a-conversation-simulator.md>) | O produto é um simulador de fatias de conversa | Aceito |
| [0014](<0014-typescript-core-and-local-web.md>) | Núcleo em TypeScript puro, site web local e WebAssembly só sob medição | Aceito |
| [0015](<0015-ai-via-openrouter-without-local-models.md>) | IA via OpenRouter, sem modelos locais por agora | Aceito |
| [0016](<0016-engine-decides-models-translate.md>) | O motor decide; os modelos só traduzem | Aceito |
| [0017](<0017-determinism-replay-and-forced-paths.md>) | Determinismo, replay exato e forçar caminho | Aceito |
| [0018](<0018-tdd-and-gates-in-typescript.md>) | TDD e gates completos em TypeScript | Aceito |
| [0019](<0019-licenses-in-the-typescript-project.md>) | Licenças do código, das dependências e dos modelos no projeto TypeScript | Aceito |

## Substituídos (histórico)

| ADR | Título | Substituído por |
| --- | --- | --- |
| [0001](<0001-offline-first-runtime.md>) | Runtime offline-first e hermético | 0015 |
| [0002](<0002-rust-flecs-deterministic-core.md>) | Rust 2024 + Flecs ECS | 0014 |
| [0003](<0003-jev-is-not-a-runtime.md>) | JEV não é runtime; System One é o d1-2B | 0015 |
| [0004](<0004-model-proposes-core-disposes.md>) | O modelo propõe, o núcleo dispõe | 0016 |
| [0005](<0005-deterministic-simulation-contract.md>) | Contrato de determinismo | 0017 |
| [0006](<0006-tdd-coverage-mutation.md>) | TDD, cobertura e mutação | 0018 |
| [0007](<0007-license-and-model-distribution.md>) | Licença do código e dos modelos | 0019 |

As propostas 0008 a 0012 (tempo por ações, silhuetas, layout de eventos, durabilidade de save e
gramática de propostas de regra) pertenciam ao plano antigo, nunca foram aceitas e foram
removidas em 2026-11-09. Continuam no histórico do git.

## Como escrever um ADR

1. Copie `template.md` para `NNNN-titulo-em-kebab-case.md` (próximo número livre: 0020).
2. Preencha contexto, decisão, consequências (positivas e negativas), alternativas e critérios
   de verificação.
3. Abra um PR `docs(adr): ...`; a discussão acontece no PR.
4. Um ADR aceito **não é editado**: para mudar a decisão, crie um novo ADR e marque o antigo como
   `Superseded by ADR NNNN`.
5. Decisões que afetam segurança, licença, rede ou contrato público exigem revisão do code owner.

## Quando é obrigatório

- mudar uma regra do [modelo de simulação](<../simulation-model.md>) (números são calibração, não
  regra);
- nova dependência estrutural (framework, runtime, banco, modelo de IA);
- mudar o formato de sessão, de presets ou a API pública do motor;
- mudar a estratégia de testes ou de qualidade;
- mudar licença ou distribuição de modelos;
- trazer de volta algo da lista "fora do produto" de [`product.md`](<../../product.md>).
