# FND-01 — Monorepo TypeScript, gates e CI

> **Fase:** F1 — Base TypeScript · **Depende de:** nenhuma · **Branch:** `build/fnd-01-typescript-monorepo`
> **Título do PR:** `build: scaffold the TypeScript monorepo and quality gates`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Criar o monorepo TypeScript com os quatro pacotes compilando, todas as ferramentas de qualidade com os limiares do ADR 0018 e o CI trocado de Rust para Node, mantendo o job agregador `build` como verificação obrigatória.

## Leia antes

- [CLAUDE.md](<../../../CLAUDE.md>) — inteiro
- [ADR 0014](<../../architecture/adr/0014-typescript-core-and-local-web.md>) — inteiro
- [ADR 0018](<../../architecture/adr/0018-tdd-and-gates-in-typescript.md>) — inteiro
- [ADR 0019](<../../architecture/adr/0019-licenses-in-the-typescript-project.md>) — decisão, item 2
- [arquitetura](<../../architecture/overview.md>) — §2
- [regras de desenvolvimento](<../../engineering/development-rules.md>) — §3 a §5 e §7
- [qualidade de código](<../../engineering/code-quality.md>) — §1
- [estratégia de testes](<../../engineering/testing-strategy.md>) — §3, §12 e §13

## Escopo

**Inclui:**

- `package.json` raiz com workspaces (`packages/*`, `apps/*`), `engines.node >= 24` e scripts `lint`, `typecheck`, `test`, `coverage`, `mutation`, `e2e`, `bench` e `check` (roda tudo o que o CI roda).
- `tsconfig` base com `strict`, `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`; um `tsconfig` por pacote.
- ESLint com as regras de [qualidade de código](<../../engineering/code-quality.md>) §1, incluindo imports proibidos entre pacotes e APIs proibidas em `packages/engine`; Prettier.
- Vitest com cobertura e limiares (global 90/85; `packages/engine` 95/90); Stryker com limiares (global 80; motor 90) e modo incremental; Playwright com um teste de fumaça.
- Esqueletos mínimos: `packages/engine` e `packages/ai` com um `index.ts` e um teste cada; `apps/server` com `GET /api/health` em `127.0.0.1`; `apps/web` com Vite + React exibindo uma página inicial.
- `.env.example` com `OPENROUTER_API_KEY=` e as variáveis `AI_*` da [integração de IA](<../../architecture/ai-integration.md>) §3, sem valores secretos.
- CI: o job `rust` vira um job `node` (instalar, lint, tipos, testes com cobertura, E2E, mutação incremental); o `preflight` detecta `package.json`; `docs` e `build` continuam, com `build` agregando `docs` e `node`. Actions pinadas por SHA com `oss-pin-actions.sh`.
- CodeQL passa a analisar `javascript-typescript` e `actions`.
- Verificação de licenças das dependências no CI com a lista do ADR 0019.

**Não inclui:**

- Qualquer regra do motor, tela ou adaptador de IA (só esqueletos).

## Entregáveis

- Arquivos de configuração na raiz
- `packages/engine`, `packages/ai`, `apps/server`, `apps/web` mínimos
- `.github/workflows/ci.yml` e `codeql.yml` atualizados
- Seção "Como rodar" do `README.md` atualizada

## Lista de testes (escreva primeiro)

```text
- given a file in packages/engine calling Math.random when linting then lint fails
- given apps/web importing the OpenRouter adapters when linting then lint fails
- given coverage below the threshold when running coverage then the command fails
- given the server started when calling /api/health then it answers from 127.0.0.1 only
- given the web app when opening the start page then the smoke E2E passes
```

## Critérios de aceite

- [ ] `npm ci && npm run check` passa na máquina e no CI.
- [ ] Cada gate foi visto falhando de propósito (registre como no PR).
- [ ] `build` continua sendo o único check obrigatório e agrega `docs` e `node`.
- [ ] Nenhuma referência a Rust sobra no CI.
- [ ] O CI falha com uma dependência de licença fora da lista do ADR 0019.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Não escolha bibliotecas de domínio aqui; só ferramentas.
- Mudanças em `.github/` seguem o procedimento "muda CI" do `CLAUDE.md`.
