# ADR 0020 — Ferramentas de base do monorepo TypeScript

- **Status:** Aceito
- **Data:** 2026-11-23
- **Decisores:** @frederico-kluser (por delegação explícita ao agente da FND-01 nesta sessão)
- **Relacionado:** ADR 0014, ADR 0017, ADR 0018, ADR 0019; tarefa [FND-01](<../../planning/prompts/FND-01.md>)

## Contexto

O [ADR 0014](<0014-typescript-core-and-local-web.md>) escolheu um monorepo TypeScript com
workspaces do npm, Node 24 no servidor e React + Vite no site; o
[ADR 0018](<0018-tdd-and-gates-in-typescript.md>) fixou TDD, os gates e as famílias de
ferramentas; o [ADR 0019](<0019-licenses-in-the-typescript-project.md>) fixou a política de
licenças. Faltava decidir como o TypeScript roda sem passo de build, as versões, o framework do
servidor e como cada gate é imposto e verificado. As 22 tarefas seguintes usam essa base.

Este ADR trata só de ferramentas. Bibliotecas de domínio (validação de esquema, por exemplo) e a
arquitetura do site (roteamento, estilos) ficam para as tarefas que precisarem delas, cada uma
com a sua decisão.

As versões foram conferidas no registro do npm em 2026-11-23 e são as estáveis mais novas
compatíveis entre si.

## Decisão

1. **npm workspaces sem build.** Pacotes `@ai-fantasy/engine`, `@ai-fantasy/ai`,
   `@ai-fantasy/server` e `@ai-fantasy/web`, todos `private` e ESM. As bibliotecas exportam o
   código-fonte (`exports` → `./src/index.ts`); `@ai-fantasy/ai` tem duas entradas: `.` (parte
   pura) e `./openrouter` (adaptadores, só para o servidor). O TypeScript só verifica tipos
   (`noEmit`); o Vite empacota o site; o Node executa o servidor. Raiz em `0.0.0`, igual ao
   `.release-please-manifest.json`; Node fixado em `.node-version` (`24`) e `engines` `>=24`.
2. **TypeScript 6.0 (`~6.0.3`) até o typescript-eslint aceitar o 7** (a 8.73 exige `<6.1`).
   Configuração base em `tsconfig.base.json`: `module`/`moduleResolution` `NodeNext`,
   `allowImportingTsExtensions`, `noEmit`, `verbatimModuleSyntax`, `erasableSyntaxOnly`,
   `isolatedModules`, `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
   `noImplicitOverride`, `target` ES2024. Imports relativos levam a extensão `.ts`/`.tsx`. O motor
   usa `lib` sem DOM e `types: []`; ele e a parte pura de `packages/ai` têm também um
   `tsconfig.pure.json` (só o código de produção, sem testes) que prova a pureza no nível dos tipos.
3. **Node 24 executa TypeScript pela remoção de tipos nativa:** `node apps/server/src/main.ts`
   (`node --watch` no desenvolvimento), sem `tsx`. Foi verificado que o servidor sobe importando
   `@ai-fantasy/engine` pelo workspace. Por isso só vale sintaxe apagável: nada de `enum`,
   `namespace` com código ou propriedades de parâmetro.
4. **Fastify 5 no servidor**, com `@fastify/static` para entregar `apps/web/dist`. `buildApp()`
   é testável por `inject`; `startServer()` escuta sempre em `127.0.0.1` (constante, não
   configurável). Portas: 4318 por padrão (`PORT`), 4319 no E2E, 5173 no Vite de
   desenvolvimento, que encaminha `/api` para o servidor. O `.env` da raiz é lido com
   `process.loadEnvFile` (sem dotenv); variáveis já definidas no ambiente vencem. A raiz do
   repositório é a pasta acima mais próxima cujo `package.json` declara `workspaces`, para que o
   `.env` e `apps/web/dist` sejam achados de onde quer que o código rode (inclusive na cópia que o
   Stryker faz do pacote).
5. **Qualidade estática:** ESLint 10 (configuração plana em `eslint.config.js`), typescript-eslint
   8 (`strictTypeChecked`, com tipos pelo `projectService`), eslint-plugin-sonarjs 4 (só a regra
   `cognitive-complexity`), eslint-plugin-react-hooks 7 no site e eslint-config-prettier; Prettier
   3 para formato. As regras estão descritas em [qualidade de código](<../../engineering/code-quality.md>)
   §1 e testadas no limite exato em `scripts/eslint-config.test.ts`.
6. **Testes:** Vitest 5 com `test.projects` (um `vitest.config.ts` por pacote, reutilizado pelo
   Stryker, mais o projeto `scripts`), cobertura v8 com os limiares do ADR 0018 por glob,
   fast-check 4 com seed fixa, Testing Library + jsdom, Playwright 1.65 só com Chromium e Stryker
   10 (`vitest-runner`, análise `perTest`, modo incremental; quebra em 90 no motor e 80 nos
   demais). O Stryker muta todo código de `src/` menos os testes (barris `index.ts` incluídos:
   reexportar não gera mutante, e excluí-los esconderia código posto ali).
7. **Gates próprios em TypeScript** (`scripts/`, sem dependência nova, testados no projeto
   `scripts`): licenças (`check-licenses.ts`, ver a nota abaixo), cobertura das linhas novas
   (`diff-coverage.ts`), mutação incremental (`mutation-changed.ts`), fronteiras entre pacotes
   (`boundaries.ts`) e governança mínima (`check-governance.ts`: arquivos obrigatórios e
   espelho `CLAUDE.md` ↔ `AGENTS.md`, que o CI também roda). A mutação incremental falha quando
   um arquivo de código mudado não está num pacote com `stryker.config.mjs` nem na lista
   documentada de exceções (`NOT_MUTATED`, ver [estratégia de testes](<../../engineering/testing-strategy.md>)
   §12), para que nenhum código escape da mutação por acidente.
8. **`npm run check` repete o CI na mesma ordem**, menos dois passos que só o CI faz: os links
   da documentação (lychee) e as mensagens dos commits (job `build`; na máquina, o hook
   `commit-msg` e o `oss-gate.sh` fazem esse papel). CodeQL, dependency review e Scorecard são
   workflows à parte.
9. **Pontos de entrada mínimos.** O bloco `if (import.meta.main) { … }` de cada script e do
   servidor tem no máximo cinco linhas e só chama funções exportadas e testadas, inclusive a
   fiação com o mundo real (`defaultIo(root)` nos scripts, `defaultMainOptions()` no servidor).
   Só esse bloco fica fora da cobertura unitária e da mutação, por comentário explícito
   (`/* v8 ignore start/stop */`, e `// Stryker disable/restore all` no servidor); ele é
   exercitado pelo E2E ou pelo próprio comando.

### Nota de implementação do ADR 0019 (licenças)

- **Produção** (pacotes sem `dev` no lockfile, isto é, o que o produto distribui): só a lista do
  ADR 0019 — MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, Zlib, Unicode-3.0 e
  BlueOak-1.0.0.
- **Desenvolvimento** (só `dev: true`; ferramentas que rodam na máquina de quem desenvolve e no CI e
  não são redistribuídas): a lista acima mais CC0-1.0, CC-BY-3.0, CC-BY-4.0 (dados, como o
  caniuse-lite), Python-2.0 e PSF-2.0 (argparse), Unlicense e MPL-2.0 (lightningcss, que o Vite usa
  no build). O critério: licenças cujas obrigações não alcançam o código do projeto quando a
  ferramenta não é distribuída nem ligada ao produto.
- **Expressões SPDX:** `OR` passa se uma das licenças passa; `AND` exige todas; `A WITH exceção`
  vale como `A` (a exceção só acrescenta permissões); a comparação ignora maiúsculas. Licença
  ausente, desconhecida ou expressão inválida falha.
- **Exceções** ficam em `scripts/license-policy.json`: pacote e licença exatos, escopo e
  justificativa. Uma exceção com `scope: "development"` deixa de valer se o pacote passar a ser de
  produção; exceção sem uso gera aviso. A exceção atual, decidida pelo orquestrador desta sessão
  sob delegação do maintainer, é o **eslint-plugin-sonarjs** e sua dependência
  `@sonarsource/analyzer-commons-configurations`, ambos **LGPL-3.0-only** e só de
  desenvolvimento: é a única regra mantida de complexidade cognitiva para ESLint, e a LGPL não
  alcança o projeto porque o plugin não é distribuído nem incorporado ao produto. Se surgir
  alternativa mantida com licença permissiva, ela substitui o plugin.

## Consequências

### Positivas

- Nenhum passo de build entre editar e rodar: testes, servidor e site usam o mesmo código-fonte.
- `npm run check` reproduz localmente o CI, com as duas exceções declaradas acima.
- Fronteiras e determinismo do motor são verificados duas vezes (lint e teste).

### Negativas / custos

- TypeScript 6 em vez do 7 até o typescript-eslint acompanhar.
- Só sintaxe apagável (sem `enum`; use uniões de literais e objetos `as const`).
- O lint com tipos leva cerca de 10 s; a mutação cria uma cópia do pacote por execução.
- Uma exceção de licença LGPL só de desenvolvimento, registrada e verificada.

### Riscos

- **Arquivo novo fora de um `include`:** o lint com tipos falha com "was not found by the project
  service". Mitigação: cada pacote inclui `src/**`, `test/**` e os arquivos de configuração da
  raiz do pacote; pastas novas com código entram no `include` do `tsconfig.json` mais próximo.
- **Caminhos na cópia do Stryker:** os testes rodam em `<pacote>/.stryker-tmp/sandbox-*`, mais
  fundo que no repositório. Mitigação: o código acha a raiz pelo `package.json` com
  `workspaces`, e os testes comparam com a raiz que o git informa.
- **Remoção de tipos não vale dentro de `node_modules`:** os pacotes do workspace resolvem para o
  caminho real (`packages/*`), então funcionam; uma dependência externa publicada em TypeScript não
  funcionaria sem build.
- **Mudança de versão das ferramentas:** o Dependabot propõe atualizações semanais; o CI as
  verifica.

## Alternativas consideradas

- **`tsx` ou `ts-node` no servidor** — dependência a mais; o Node 24 já executa TypeScript.
- **Build por pacote (`tsc`, `tsup`)** — passo extra sem ganho: nada é publicado no npm.
- **Express ou Hono** — o Fastify tem `inject` para testes sem rede, esquemas e licença MIT.
- **Verificadores de licença do npm (license-checker e derivados)** — dependências a mais e sem a
  separação produção/desenvolvimento e as exceções justificadas que a política pede.
- **Jest** — o Vitest usa a mesma transformação do Vite e tem runner do Stryker.
- **Biome ou oxlint no lugar do ESLint** — não cobrem, hoje, o lint com tipos do
  typescript-eslint nem a complexidade cognitiva usados aqui.
- **Stryker no próprio diretório (`inPlace`)** — evitaria a cópia, mas uma execução interrompida
  deixaria código mutado na árvore de trabalho.

## Critérios de verificação

- `npm ci && npm run check` verde localmente e o check `build` verde no CI.
- `scripts/eslint-config.test.ts` (regras de lint), `scripts/boundaries.test.ts` (fronteiras),
  `scripts/quality-config.test.ts` (limiares de cobertura e mutação),
  `scripts/check-licenses.test.ts` (licenças), `scripts/diff-coverage.test.ts` (linhas novas),
  `scripts/mutation-changed.test.ts` (mutação incremental) e `scripts/check-governance.test.ts`
  (governança).

## Referências

- Registro do npm: versões de typescript, typescript-eslint, eslint, vitest, vite, stryker,
  playwright, fastify e react (acesso em 2026-11-23).
- Guias de migração do [Vitest 5](https://vitest.dev/guide/migration) e do
  [ESLint 10](https://eslint.org/docs/latest/use/migrate-to-10.0.0) (acesso em 2026-11-23).
- [Anúncio do TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)
  (acesso em 2026-11-23).
