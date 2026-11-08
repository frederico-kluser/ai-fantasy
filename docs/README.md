# Documentação

Este diretório contém as definições e contratos técnicos do AI Fantasy. O
[README raiz](<../README.md>) apresenta o produto; o [ROADMAP de execução](<../ROADMAP.md>)
concentra atividades, dependências, ondas e integração. Não existem duas tabelas operacionais
concorrentes: decisões e arquitetura explicam o que deve ser preservado, execução explica o
trabalho planejado e seus critérios de aceite.

## Comece por aqui

| Se você é… | Leia |
| --- | --- |
| Novo no projeto | [README](<../README.md>) → [Definições canônicas](<architecture/roadmap.md>) → [Glossário](<glossary.md>) |
| Vai planejar atividades | [Decisões do maintainer](<planning/decisions.md>) → [ROADMAP](<../ROADMAP.md>) |
| Vai escrever código futuramente | [Regras](<engineering/development-rules.md>) → [TDD/E2E](<engineering/testing-strategy.md>) → [Qualidade](<engineering/code-quality.md>) |
| Vai mexer em IA/modelos | [IA offline](<engineering/offline-ai.md>) → [Arquitetura](<architecture/overview.md>) |
| Vai revisar um PR | [Checklist de review](<engineering/development-rules.md#13-checklist-rápido-de-review>) |
| Vai decidir arquitetura | [ADRs](<architecture/adr/README.md>) → [Governança](<../GOVERNANCE.md>) |
| Vai publicar futuramente | [Contribuição](<../CONTRIBUTING.md>) → [Governança](<../GOVERNANCE.md>) |

## Mapa

```text
docs/
├── README.md                    ← índice
├── glossary.md                  ← vocabulário canônico
├── architecture/
│   ├── overview.md              ← C4, imports, portas e contratos
│   ├── roadmap.md               ← definições, errata e decisões de produto
│   ├── adr/                     ← 0001–0007 aceitos; 0008–0009 propostos
│   └── assets/                  ← fontes históricas/diagramas estáticos
├── engineering/
│   ├── development-rules.md     ← contrato de engenharia
│   ├── testing-strategy.md      ← testes e critérios futuros
│   ├── code-quality.md          ← complexidade, docs e refatoração
│   └── offline-ai.md            ← modelos locais, licenças e fallback
└── planning/
    ├── decisions.md             ← devolutiva humana e consequências
    └── project-review.md        ← primeira revisão e seu histórico
```

## Regras da documentação

1. Português pt-BR para produto/engenharia; inglês para identificadores, rustdoc e commits.
2. Links relativos e válidos; declarar honestamente se a validação foi executada.
3. Diagramas editáveis em Mermaid; distinguir fluxo de execução de imports.
4. Um fato, um lugar: referenciar fontes, não duplicar planos de execução.
5. Decisão estrutural → ADR; regra → engenharia; definições → roadmap canônico;
   atividades/dependências/ondas → roadmap de execução.
6. Não incluir segredos, dados pessoais ou conteúdo de terceiros sem licença.
7. Documentação acompanha a mudança aprovada; ADR aceito não é reescrito por conveniência.

## Estado

**Revisão documental 2.2 — 2026-11-08; F0 — Fundação, sem aplicação executável.**
As [definições canônicas](<architecture/roadmap.md#08-decisões-registadas-nesta-revisão-2026-11-08>)
foram reconciliadas com a [devolutiva do maintainer](<planning/decisions.md>).
O [ROADMAP](<../ROADMAP.md>) é a fonte única do planejamento de execução, não autorização
para iniciar código, scaffold, worktrees, CI ou publicação.

[ADR 0008](<architecture/adr/0008-action-driven-simulation-time.md>) e
[ADR 0009](<architecture/adr/0009-privileged-silhouette-overlay.md>) estão **Propostos**:
registram decisões de produto sobre tempo por ação e silhuetas privilegiadas, com contratos
numéricos/API ainda em revisão. Os ADRs 0001–0007 aceitos permanecem intactos.

## Precisa de ajuda?

- Arquitetura: Discussion ou issue de pergunta conforme a governança.
- Documentação: contribuição documental com revisão e critérios explícitos.
- Segurança: [política de segurança](<../SECURITY.md>).
