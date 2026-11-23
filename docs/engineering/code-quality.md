# Qualidade de código

> Complexidade, padrões de desenho, documentação e refatoração em TypeScript. Os limites são
> contrato (ADR 0018); este documento diz como medir e como escrever dentro deles.

## 1. Limites e como são impostos

| Medida | Limite | Regra do ESLint |
| --- | --- | --- |
| Complexidade ciclomática | ≤ 10 | `complexity` |
| Complexidade cognitiva | ≤ 10 | `sonarjs/cognitive-complexity` |
| Linhas por função | ≤ 40 | `max-lines-per-function` (sem linhas em branco e comentários) |
| Parâmetros | ≤ 5 | `max-params` |
| Aninhamento | ≤ 3 | `max-depth` |
| Linhas por arquivo | ≤ 400 | `max-lines` (sem linhas em branco e comentários) |
| Imports entre pacotes | conforme a [arquitetura](<../architecture/overview.md>) | `no-restricted-imports` |
| APIs proibidas no motor | `Math.random`, `Date`, `performance.now`… | `no-restricted-globals`, `no-restricted-properties` |
| Sintaxe proibida no motor | `/` (fora de `domain/math.ts`), `**`, literais decimais | `no-restricted-syntax` |
| Lógica nos testes | `if`, ternário, `switch`, laços, `try` | `no-restricted-syntax` |
| Tipos | sem `any`, sem promessas soltas | `@typescript-eslint/no-explicit-any`, `no-floating-promises` |

As regras vivem em `eslint.config.js` ([ADR 0020](<../architecture/adr/0020-base-tools-and-libraries.md>))
e são testadas no limite exato (o primeiro valor acima do limite falha, o limite passa) por
`scripts/eslint-config.test.ts`. Detalhes:

- **Testes** (`*.test.ts(x)` e specs do E2E, `e2e/**/*.spec.ts`) estão isentos dos limites de
  linhas por função e por arquivo, porque a preparação pode ser longa; nunca podem ter lógica:
  `if`, ternário, `switch`, `for`, `for…in`, `for…of`, `while`, `do…while` e `try` são
  proibidos. `??` e `||` são permitidos. Helpers do E2E (os outros arquivos de `e2e/`) são
  código comum: podem ter lógica e seguem os limites.
- **Motor, código e testes** (`packages/engine/src` e `packages/engine/test`): proibidos relógio
  (`Date`, `performance`), aleatoriedade (`Math.random`, `crypto`), agendamento (`setTimeout`,
  `setInterval`, `setImmediate`, `queueMicrotask`), locale (`Intl`, `localeCompare`,
  `toLocaleString`, `toLocaleUpperCase`, `toLocaleLowerCase`, `toLocaleDateString`,
  `toLocaleTimeString`), rede (`fetch`, `XMLHttpRequest`, `WebSocket`) e as funções e constantes
  de `Math` que não são inteiras (`pow`, `exp`, `log*`, `sqrt`, `cbrt`, `hypot`, trigonometria,
  `fround`, `PI`, `E`, `SQRT2`…), além de `Date.now`, `Number.parseFloat` e `Number.EPSILON`. O
  benchmark (`packages/engine/bench`) pode medir tempo com `performance`.
- **Motor, só código de produção:** sem I/O nem ambiente (`window`, `document`, `process`,
  `globalThis`, `require`, `Buffer`, `parseFloat`…), sem imports de pacotes internos, de
  built-ins do Node, de React ou do servidor, e sem a sintaxe que gera números quebrados: o
  operador `/` só em `packages/engine/src/domain/math.ts` (onde fica o `div` truncado), nada de
  `**` e nenhum literal decimal (`0.5`, `1e-3`). Os testes do motor podem usar decimais e `/`
  para provar que o motor os rejeita.
- **Servidor:** nenhuma string ou template com `0.0.0.0` ou só `::` (ele escuta só em
  `127.0.0.1`).
- **Fronteiras:** o lint barra imports pelo nome do pacote (`@ai-fantasy/…`, `openrouter`,
  built-ins, `react`, `fastify`). Imports relativos que atravessam pacotes
  (`../../ai/src/…`) e os manifestos são verificados pelo teste de fronteiras
  (`scripts/boundaries.test.ts`).

## 2. Padrões de desenho

### Cláusulas de guarda

```ts
function resolveRequest(ctx: RequestContext): Result<Disposition, RequestError> {
  if (!ctx.targetHears) return err("TARGET_CANNOT_HEAR");
  if (ctx.target.leaving) return err("TARGET_LEAVING");
  return ok(drawDisposition(ctx));
}
```

### Predicados com nome

```ts
const isUrgent = (need: Bp): boolean => need >= URGENT;
```

### Uniões discriminadas em vez de booleanos

```ts
type Control = { mode: "MANUAL" } | { mode: "AUTO" };
```

### Tipos marcados para invariantes

```ts
type Bp = number & { readonly __brand: "Bp" };               // 0..10000
type BipolarBp = number & { readonly __brand: "BipolarBp" }; // -10000..10000
const bp = (n: number): Bp => clampInt(n, 0, 10000) as Bp;
const bipolarBp = (n: number): BipolarBp => clampInt(n, -10000, 10000) as BipolarBp;
```

### Tabelas em vez de `switch` gigante

Efeitos por ato e tom, satisfação das vontades e sinais de traço são **dados** (tabelas tipadas),
não ramos de código. Isso mantém a complexidade baixa e facilita a calibração.

### Estado explícito e imutável

O passo do motor recebe o estado e devolve um estado novo; nada é mutado no lugar.

## 3. Documentação

- TSDoc em toda exportação pública: o que faz, parâmetros, o que devolve, erros possíveis,
  exemplo quando ajuda.
- Comentários dizem **por quê**; não repetem o código.
- Cada regra implementada cita a seção da especificação (`// simulation-model §11`).

## 4. Refatoração

- Só com testes verdes, em passos pequenos, sem mudar comportamento.
- Mudança de comportamento e refatoração vão em commits separados.
- Ao mexer em API pública de um pacote, atualize consumidores e documentação no mesmo PR.

## 5. Revisão

- Os nomes contam a história sem precisar de comentário?
- Alguma função passou dos limites "por pouco"? Divida.
- Há números mágicos fora da tabela de constantes?
- Os dados de calibração estão em tabelas, não espalhados?
- O teste descreve comportamento, não implementação?
