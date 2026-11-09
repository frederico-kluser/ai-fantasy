# Documentação

Este diretório contém a definição do produto, as especificações do motor, as regras de engenharia
e o planejamento do AI Fantasy. O [README raiz](<../README.md>) apresenta o projeto; o
[ROADMAP](<../ROADMAP.md>) concentra tarefas, dependências e estado.

## Comece por aqui

| Se você… | Leia |
| --- | --- |
| quer a visão completa, para apresentar ao time | [apresentação do projeto](<team-briefing.md>) |
| é novo no projeto | [produto](<product.md>) → [glossário](<glossary.md>) |
| vai mexer no motor | [modelo de simulação](<architecture/simulation-model.md>) → [atos de conversa](<architecture/dialogue-acts.md>) → [presets](<architecture/presets.md>) |
| vai mexer com IA | [integração de IA](<architecture/ai-integration.md>) |
| vai escrever código | [arquitetura](<architecture/overview.md>) → [regras](<engineering/development-rules.md>) → [testes](<engineering/testing-strategy.md>) → [qualidade](<engineering/code-quality.md>) |
| vai executar uma tarefa | [ROADMAP](<../ROADMAP.md>) → [guia dos agentes](<planning/prompts/README.md>) |
| vai validar o produto | [avaliação](<engineering/evaluation.md>) |
| quer saber por quê | [decisões](<planning/decisions.md>) → [ADRs](<architecture/adr/README.md>) |
| vai revisar um PR | [checklist de revisão](<engineering/development-rules.md#14-checklist-rápido-de-revisão>) |

## Mapa

```text
docs/
├── README.md                     ← este índice
├── team-briefing.md              ← apresentação completa do projeto para o time
├── product.md                    ← definição canônica do produto
├── glossary.md                   ← vocabulário
├── architecture/
│   ├── overview.md               ← pacotes, API do motor, servidor, site, fluxo
│   ├── simulation-model.md       ← regras do motor (camadas, Maslow, turnos, sorteios)
│   ├── dialogue-acts.md          ← atos, tons, tópicos, consequências, pedidos
│   ├── presets.md                ← catálogos e premissa → presets
│   ├── ai-integration.md         ← SOM e modelo de texto via OpenRouter
│   └── adr/                      ← decisões estruturais (vigentes: 0013–0019)
├── engineering/
│   ├── development-rules.md      ← contrato do dia a dia
│   ├── testing-strategy.md       ← TDD, suítes, gates
│   ├── code-quality.md           ← complexidade, padrões, documentação
│   └── evaluation.md             ← métricas e rodada de validação
├── planning/
│   ├── decisions.md              ← decisões do maintainer (D-09 em diante)
│   └── prompts/                  ← guia dos agentes e um prompt por tarefa
└── studies/                      ← pesquisas que alimentaram a mudança (histórico)
```

## Regras da documentação

1. Português do Brasil para produto e engenharia; inglês para identificadores, TSDoc e commits.
2. Links relativos e válidos (`npx markdownlint-cli2 "**/*.md"` e o verificador de links do CI).
3. Diagramas em Mermaid.
4. Um fato, um lugar: referencie a fonte em vez de copiar.
5. Regra do motor → especificação + ADR; número → tabela de constantes; decisão de produto →
   `planning/decisions.md`; tarefa → ROADMAP e prompt.
6. Sem segredos, dados pessoais ou conteúdo de terceiros sem licença.
7. ADR aceito não é reescrito; é substituído por outro.

## Estado

**Fundação documental refeita em 2026-11-09.** O produto foi redefinido (D-09) e o plano antigo
foi removido; ele continua no histórico do git. Ainda não há código: a próxima tarefa é a
[FND-01](<planning/prompts/FND-01.md>).
