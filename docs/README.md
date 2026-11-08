# Documentação

Este diretório é a fonte de verdade técnica do AI Fantasy. O README raiz é para
recém-chegados; aqui vive o que um contribuidor precisa de saber para não partir nada.

## Comece por aqui

| Se você é… | Leia |
| --- | --- |
| Novo no projeto | [README](../README.md) → [Roadmap](architecture/roadmap.md) → [Glossário](glossary.md) |
| Vai escrever código | [Regras de desenvolvimento](engineering/development-rules.md) → [TDD/E2E](engineering/testing-strategy.md) → [Qualidade](engineering/code-quality.md) |
| Vai mexer em IA/modelos | [IA offline](engineering/offline-ai.md) → [Arquitetura](architecture/overview.md) |
| Vai rever um PR | [Checklist de review](engineering/development-rules.md#13-checklist-rápido-de-review) |
| Vai decidir arquitetura | [ADRs](architecture/adr/) → [Governança](../GOVERNANCE.md) |
| Vai publicar/release | [CONTRIBUTING](../CONTRIBUTING.md) → [Governança](../GOVERNANCE.md) |

## Mapa

```text
docs/
├── README.md                         ← este ficheiro
├── glossary.md                       ← vocabulário canónico
├── architecture/
│   ├── overview.md                   ← C4, crates, portas, determinismo
│   ├── roadmap.md   ← visão + errata JEV + TDD/E2E/complexidade
│   ├── adr/                          ← decisões (0001–0007 + template)
│   └── assets/                       ← diagramas estáticos, se indispensáveis
└── engineering/
    ├── development-rules.md          ← contrato do dia a dia
    ├── testing-strategy.md           ← TDD, pirâmide, E2E, cobertura, mutação
    ├── code-quality.md               ← complexidade, docs, refatoração
    └── offline-ai.md                 ← d1-2B, LFM3, sidecars, licenças
```

## Regras da documentação

1. **Português (pt-BR)** para produto/engenharia; **inglês** para identificadores,
   rustdoc e commits.
2. **Links relativos**, válidos e verificados no CI.
3. **Diagramas em Mermaid**; nada de imagens binárias para diagramas editáveis.
4. **Um facto, um lugar**: não duplicar a mesma explicação; ligue para a fonte.
5. **Decisão → ADR**; regra → `engineering/`; visão → roadmap.
6. **Nada de segredos, dados pessoais ou conteúdo de terceiros sem licença.**
7. **Atualize no mesmo PR** que muda o comportamento. Documentação atrasada é bug.

## Estado

A documentação está na versão **2.1** (2026-11-08) e acompanha a fase **F0 — Fundação**.
O roadmap canónico chama-se apenas [`roadmap`](architecture/roadmap.md) — decisão
registada na secção 0.8 do próprio documento.
Quando o código começar, o roadmap e os ADRs continuam a ser a referência; o código não
“substitui” a decisão sem um novo ADR.

## Precisa de ajuda?

- Dúvida de arquitetura: abra uma Discussion ou issue `question`.
- Erro na documentação: PR `docs: ...` (é uma contribuição valiosa).
- Segurança: [`SECURITY.md`](../SECURITY.md).
