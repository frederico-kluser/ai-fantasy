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
| Linhas por arquivo | ≤ 400 | `max-lines` |
| Imports entre pacotes | conforme a [arquitetura](<../architecture/overview.md>) | `no-restricted-imports` |
| APIs proibidas no motor | `Math.random`, `Date`, `performance.now`… | `no-restricted-globals`, `no-restricted-properties` |
| Tipos | sem `any`, sem promessas soltas | `@typescript-eslint/no-explicit-any`, `no-floating-promises` |

Testes podem passar de 40 linhas quando a preparação for longa; nunca podem ter lógica
condicional.

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
