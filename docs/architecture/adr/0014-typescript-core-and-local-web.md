# ADR 0014 — Núcleo em TypeScript puro, site web local e WebAssembly só sob medição

- **Status:** Aceite
- **Data:** 2026-11-09
- **Decisores:** @frederico-kluser
- **Relacionado:** D-18, D-19; substitui o ADR 0002

## Contexto

O ADR 0002 escolhia Rust 2024 com Flecs para simular milhares de entidades numa região. O
produto agora é uma fatia de conversa com poucas pessoas, rodando num site. O maintainer pediu
primeiro "calcular tudo em WebAssembly" e, ao pesar os custos, decidiu começar em TypeScript puro
e só ir para WebAssembly se a medição mostrar necessidade.

A governança classifica troca de linguagem como mudança grande (RFC de 14 dias). Com um único
maintainer e nenhum código existente, a decisão foi tomada diretamente por ele e fica registrada
aqui; a governança foi atualizada para tornar explícita essa exceção da fase inicial.

## Decisão

1. **Monorepo TypeScript** com workspaces do npm: `packages/engine`, `packages/ai`,
   `apps/server` (Node 24) e `apps/web` (React + Vite).
2. **O núcleo é puro e determinístico:** sem I/O, DOM, rede, relógio, `Math.random` ou números
   quebrados no estado. Roda num Web Worker no navegador.
3. **Site em `localhost`:** um servidor local serve o site e as rotas de IA e sessões, só em
   `127.0.0.1`.
4. **WebAssembly sob medição:** se um passo do motor com 8 personagens passar de 16 ms de forma
   consistente no benchmark, entra a tarefa PERF-01 (provavelmente Rust compilado para
   WebAssembly), mantendo a mesma API do núcleo.
5. Rust e Flecs saem do projeto; a configuração de Rust na raiz foi removida.

## Consequências

### Positivas

- Uma linguagem só no projeto inteiro; iteração rápida; ecossistema web maduro.
- O núcleo puro pode ser portado depois sem mudar a interface.

### Negativas / custos

- JavaScript só tem `number` em ponto flutuante: inteiros em bp e PRNG próprio são obrigatórios
  e testados.
- Desempenho para cenas muito grandes fica para depois.

### Riscos

- Alguém usar `Math.random`, `Date.now` ou divisão sem truncar no motor. Mitigação: lint com
  regras proibidas no pacote e testes de determinismo.

## Alternativas consideradas

- **Rust compilado para WebAssembly desde já** — mais lento para iterar e exige o scaffold antes
  de testar qualquer conversa.
- **AssemblyScript** — ecossistema e ferramentas de teste fracos para os gates do projeto.
- **Python** — interface pobre para avaliar naturalidade.

## Critérios de verificação

- Lint proíbe APIs não determinísticas em `packages/engine`.
- Teste de determinismo (mesma seed e entradas ⇒ mesmo hash) em cada PR do motor.
- Benchmark do passo do motor a cada PR que toca o motor.

## Referências

- [Arquitetura](<../overview.md>), [modelo de simulação](<../simulation-model.md>).
