# Changelog

Todas as mudanças notáveis do **AI Fantasy** são documentadas neste ficheiro.

O formato segue [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) e o projeto adere
a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

- Versões são tagueadas como `v<MAJOR>.<MINOR>.<PATCH>` a partir de `main`.
- As entradas são **geradas** a partir de [Conventional Commits](https://www.conventionalcommits.org/)
  no momento da release (`cliff.toml` + automação em `.github/workflows/`). Não editar à mão
  entradas de versões publicadas.
- Comparações: <https://github.com/frederico-kluser/ai-fantasy/compare/>

## 1.0.0 (2026-11-08)


### Bug Fixes

* mirror the managed CoALA block in CLAUDE.md ([#2](https://github.com/frederico-kluser/ai-fantasy/issues/2)) ([934afb4](https://github.com/frederico-kluser/ai-fantasy/commit/934afb4e99c980635a45261a925104568961e342))


### Documentation

* add JEV errata, architecture, TDD/E2E and dev rules ([a6c9ba6](https://github.com/frederico-kluser/ai-fantasy/commit/a6c9ba67e528b947fde4f45e1b1293b591777396))
* record per-character MLP, block world and 2D isometric view ([#5](https://github.com/frederico-kluser/ai-fantasy/issues/5)) ([6350d09](https://github.com/frederico-kluser/ai-fantasy/commit/6350d09a8b5f02651b9ebfb4c38aa6593c832dad))
* specify FOV, environment memory and occlusion silhouettes ([#6](https://github.com/frederico-kluser/ai-fantasy/issues/6)) ([c53e6cf](https://github.com/frederico-kluser/ai-fantasy/commit/c53e6cf955de86194e9780bdcd2832fae4a1026f))

## [Unreleased]

### Added

- Fundação open-source: licença MIT, README, CONTRIBUTING, SECURITY, CODEOWNERS,
  Código de Conduta, templates de issue/PR e política de governança.
- Arquitetura de software documentada (C4, crates, portas/adaptadores, determinismo,
  runtime offline e modelo de dados).
- Roadmap técnico corrigido: JEV deixa de ser descrito como motor; o papel de System One
  é materializado pelo d1-2B local, e toda a inferência é offline.
- Estratégia de TDD, testes E2E, cobertura, mutação e critérios de “100% testável”.
- Regras de complexidade ciclomática/cognitiva, documentação, refatoração e revisão.
- ADRs iniciais (offline-first, Rust + Flecs, JEV/System One, modelo propõe/núcleo
  dispõe, determinismo, licenciamento).
- Memória e catálogo CoALA locais em `.agents/ai-fantasy-coala-agent-skill/`.
- Governança como código: rulesets, workflows de CI/CodeQL/Scorecard e hooks locais.

### Changed

- N/A.

### Fixed

- N/A.

### Security

- N/A.

<!--
  [Unreleased]: https://github.com/frederico-kluser/ai-fantasy/compare/v0.1.0...HEAD
-->
