# AI Fantasy

**Simulador web de conversas com NPCs que simulam pessoas. O motor decide tudo; a IA só dá voz.**

<p align="center">
  <a href="https://github.com/frederico-kluser/ai-fantasy/actions/workflows/ci.yml"><img src="https://github.com/frederico-kluser/ai-fantasy/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://securityscorecards.dev/viewer/?uri=github.com/frederico-kluser/ai-fantasy"><img src="https://api.securityscorecards.dev/projects/github.com/frederico-kluser/ai-fantasy/badge" alt="OpenSSF Scorecard"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/status-foundation-orange.svg" alt="Status: foundation">
</p>

> **Estado: base TypeScript pronta (FND-01).** O monorepo, os gates de qualidade e o CI em Node
> existem; o motor, o servidor e o site ainda são esqueletos. As próximas tarefas são a
> [CORE-01](<docs/planning/prompts/CORE-01.md>) e a [SRV-01](<docs/planning/prompts/SRV-01.md>)
> do [ROADMAP](<ROADMAP.md>).

## O que é

O **AI Fantasy** é um simulador de conversas em que cada personagem se comporta como gente. A
cada fala dita ou ouvida, o motor (**Hermeneutic Core**) recalcula o corpo, as emoções, as
vontades, os laços e a percepção de cada um, considerando o lugar, o horário, o clima e quem está
por perto, e decide por porcentagens o que acontece. Um modelo de linguagem só transforma o
resultado em fala viva, com sotaque e expressões.

- **Qualquer cenário:** você digita a premissa (uma taverna, uma cozinha de família, uma nave) e
  ela vira presets genéricos. A pirâmide de Maslow é o coração do motor.
- **Uma fatia de conversa:** um lugar desenhado numa grade, num horário e num clima, com quem
  estiver lá. O tempo anda em ticks e o mundo espera você.
- **Você é um personagem:** decide o que faz, mas sente tudo e deixa transparecer. Pode largar
  o controle, como no The Sims, ou só assistir os NPCs conversando.
- **Personalidade que muda:** padrões repetidos viram traços; a história passa de uma conversa
  para a outra.
- **Futuro:** o motor deve servir de base para sistemas de NPCs melhores em jogos e mods.

Definição canônica: [`docs/product.md`](<docs/product.md>).

## As duas IAs

| Papel | O que faz | Modelo agora (via OpenRouter) |
| --- | --- | --- |
| SOM (decisor tipado) | converte texto livre em labels, presets e valores | `typesafe/jev-1.14` |
| Modelo de texto | encena um ato já decidido como fala e gesto | `xiaomi/mimo-v2.6-pro` |

Nenhuma das duas decide nada. O site roda em `localhost`; um servidor local guarda a chave e fala
com o OpenRouter. Modelos locais (LFM3) ficam para o futuro.

## Princípios

1. **O motor decide; os modelos só traduzem** ([ADR 0016](<docs/architecture/adr/0016-engine-decides-models-translate.md>)).
2. **Determinismo:** mesma seed e mesmas entradas, mesma conversa; replay exato
   ([ADR 0017](<docs/architecture/adr/0017-determinism-replay-and-forced-paths.md>)).
3. **TypeScript puro no núcleo**, WebAssembly só se a medição pedir
   ([ADR 0014](<docs/architecture/adr/0014-typescript-core-and-local-web.md>)).
4. **TDD com gates completos** ([ADR 0018](<docs/architecture/adr/0018-tdd-and-gates-in-typescript.md>)).
5. **Sem limites de conteúdo próprios;** a chave nunca sai do servidor local
   ([ADR 0015](<docs/architecture/adr/0015-ai-via-openrouter-without-local-models.md>)).

## Documentação

| Para | Leia |
| --- | --- |
| Entender o produto | [produto](<docs/product.md>) → [glossário](<docs/glossary.md>) |
| Entender o motor | [modelo de simulação](<docs/architecture/simulation-model.md>) → [atos de conversa](<docs/architecture/dialogue-acts.md>) → [presets](<docs/architecture/presets.md>) |
| Mexer com IA | [integração de IA](<docs/architecture/ai-integration.md>) |
| Escrever código | [`CLAUDE.md`](<CLAUDE.md>) → [arquitetura](<docs/architecture/overview.md>) → [regras](<docs/engineering/development-rules.md>) → [testes](<docs/engineering/testing-strategy.md>) |
| Executar uma tarefa | [ROADMAP](<ROADMAP.md>) → [guia dos agentes](<docs/planning/prompts/README.md>) |
| Saber por quê | [decisões](<docs/planning/decisions.md>) → [ADRs](<docs/architecture/adr/README.md>) |
| Validar o produto | [avaliação](<docs/engineering/evaluation.md>) |

## Como rodar

Requisitos: **Node.js 24** (versão em `.node-version`) e npm 11. Tudo roda em `127.0.0.1`.

```bash
npm ci                           # instala o monorepo
cp .env.example .env             # opcional: preencha OPENROUTER_API_KEY para usar a IA
npm run dev                      # servidor em 127.0.0.1:4318 + site com recarga em 127.0.0.1:5173
npm start                        # compila o site e o serve pelo servidor em http://127.0.0.1:4318
npx playwright install chromium  # uma vez, antes do primeiro E2E
npm run check                    # tudo o que o CI roda, na ordem do CI
```

| Comando | O que faz |
| --- | --- |
| `npm run lint` | ESLint sem avisos e Prettier (`npm run format` corrige o formato) |
| `npm run typecheck` | tipos de todos os pacotes e dos scripts |
| `npm test` | testes de unidade, integração e componentes (Vitest) |
| `npm run coverage` | testes com cobertura e limiares: 90/85 no repositório, 95/90 no motor |
| `npm run coverage:diff` | cobertura das linhas novas contra `origin/main` (mínimo 95%) |
| `npm run licenses` | licenças das dependências conforme o ADR 0019 |
| `npm run e2e` | Playwright (Chromium) contra o site compilado em `127.0.0.1:4319` |
| `npm run mutation` | mutação completa (Stryker) de todos os pacotes |
| `npm run mutation:changed` | mutação só dos arquivos de produção mudados |
| `npm run bench` | benchmark do motor (provisório até a SOC-05) em `reports/bench.md` |
| `npm run build` | compila o site em `apps/web/dist` |
| `npm run docs:lint` | markdownlint da documentação |

Estrutura: `packages/engine` (motor puro), `packages/ai` (parte pura e adaptadores do
OpenRouter), `apps/server` (Fastify em `127.0.0.1`), `apps/web` (React + Vite) e `scripts/`
(gates do CI). Ferramentas e versões: [ADR 0020](<docs/architecture/adr/0020-base-tools-and-libraries.md>).

## Contribuir

Leia o [`CONTRIBUTING.md`](<CONTRIBUTING.md>). Branch `<tipo>/<slug>`, Conventional Commits, PR
com checks verdes e squash merge; nunca rebase. Contribuições assistidas por IA são bem-vindas,
com transparência.

## Segurança

Vulnerabilidades pelo canal privado descrito em [`SECURITY.md`](<SECURITY.md>), nunca em issue
pública.

## Licença

Código sob [MIT](<LICENSE>). Pesos de modelos não são distribuídos com o projeto
([ADR 0019](<docs/architecture/adr/0019-licenses-in-the-typescript-project.md>)).

## English overview

**AI Fantasy** is a web simulator of conversations with NPCs that behave like people. Its engine
(**Hermeneutic Core**) recalculates each character's body, emotions, Maslow-based drives, bonds
and momentary perception on every line spoken or heard — weighing place, time of day, weather
and who is nearby — and decides outcomes with seeded probabilities. Two models reached through
OpenRouter only translate: a System One decision model turns free text into labels, and a text
model turns resolved acts into living dialogue. The engine is the product and is meant to power
better NPC systems for games and mods. Status: the TypeScript monorepo, its quality gates and CI
are in place (task FND-01); the engine comes next.
