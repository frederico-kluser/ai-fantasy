# ADR 0002 — Rust 2024 + Flecs ECS para o núcleo determinístico

- **Status:** Superseded by ADR 0014 (2026-11-09; era Aceite)
- **Data:** 2026-11-08
- **Decisores:** @frederico-kluser
- **Relacionado:** ADR 0005, ADR 0006

## Contexto

O núcleo precisa de:

- simular dezenas de milhares de entidades com relacionamentos sociais densos;
- ser determinístico e reproduzível;
- ter testes rápidos, sem *runtime* pesado;
- integrar-se com llama.cpp/ONNX por *sidecar*;
- ser portátil (Windows, Linux, macOS; mais tarde mobile).

O roadmap original propunha Rust **ou** C++17/C99 sobre Flecs. Precisamos de escolher um
caminho e justificá-lo.

## Decisão

- **Linguagem:** Rust, edição **2024**, *stable*, com MSRV definido no primeiro PR e
  fixado em `rust-toolchain.toml`. Sem `nightly` no runtime.
- **ECS:** crate `flecs_ecs` (wrapper Rust sobre Flecs 4.1.x), pelos relacionamentos
  nativos, *pairs*, queries com *joins* e armazenamento em arquétipos.
- **Concorrência:** o tick é single-threaded por padrão. Paralelismo só em sistemas
  read-only com redução determinística, atrás de *feature flag*, e sempre com teste de
  hash antes/depois.
- **Sem `unsafe`** nos crates de domínio/simulação. O wrapper Flecs é a única fronteira
  C; qualquer `unsafe` nosso exige `// SAFETY:`, teste e Miri quando aplicável.

## Consequências

### Positivas

- Segurança de memória e concorrência sem GC, com performance previsível.
- Ecossistema de testes (nextest, proptest, insta, mutants) maduro.
- Flecs dá relacionamentos e queries que um ECS “puro” obrigaria a construir à mão.
- Um único binário + *sidecars* simplifica o empacotamento.

### Negativas / custos

- `flecs_ecs` é um wrapper; versões e *soundness* precisam de acompanhamento.
- Flecs é C; *build* cruzado e *vendoring* exigem cuidado.
- A API do wrapper pode mudar; isolamos o uso atrás de `af-core` para limitar o impacto.
- A escolha de Rust afasta contribuidores de C++ (mitigado por docs e boa API).

## Alternativas consideradas

- **C++17 + Flecs**: performance e maturidade, mas segurança de memória e tooling de
  testes inferiores; rejeitado para um projeto aberto e de longo prazo.
- **Bevy ECS**: excelente ergonomia, mas o modelo de relacionamentos e o controlo de
  determinismo não eram tão diretos; rejeitado nesta fase.
- **hecs/legion**: leves, mas sem relacionamentos nativos; exigiriam um grafo social
  externo, contrariando o objetivo de cache locality.
- **Engine completa (Godot/Unity)**: excesso de superfície e menos controlo sobre o tick
  determinístico; rejeitado.

## Critérios de verificação

- Workspace compila em Linux/Windows/macOS com `--locked`.
- Teste de 10.000 ticks com 10.000 entidades produz o mesmo hash em execuções repetidas.
- Benchmark headless de tick dentro do orçamento definido no roadmap.
- `cargo miri test` passa nos crates sem FFI; `cargo geiger`/revisão confirmam `unsafe`
  apenas no adaptador Flecs.

## Referências

- [Flecs — repositório](https://github.com/SanderMertens/flecs)
- [`flecs_ecs` — crates.io](https://crates.io/crates/flecs_ecs)
- [Rust 2024 edition](https://doc.rust-lang.org/edition-guide/rust-2024/index.html)
