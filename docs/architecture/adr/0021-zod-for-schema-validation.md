# ADR 0021 — Zod 4 é a biblioteca única de validação de esquema

- **Status:** Aceito
- **Data:** 2026-11-23
- **Decisores:** @frederico-kluser (decidido pelo orquestrador da sessão sob delegação explícita do
  maintainer)
- **Relacionado:** ADR 0016, ADR 0017, ADR 0019, ADR 0020; tarefas
  [SRV-01](<../../planning/prompts/SRV-01.md>), [CORE-03](<../../planning/prompts/CORE-03.md>) e
  [AI-01](<../../planning/prompts/AI-01.md>)

## Contexto

As [regras de desenvolvimento](<../../engineering/development-rules.md>) (seção 4) mandam validar
por esquema todo dado de fora antes do uso: a configuração do servidor, os pedidos HTTP, os
arquivos de sessão, os presets e as respostas do SOM e do modelo de texto. O
[ADR 0020](<0020-base-tools-and-libraries.md>) tratou só de ferramentas e deixou as bibliotecas de
domínio para as tarefas que precisassem delas. A SRV-01 é a primeira tarefa que valida dados de
fora (o ambiente, os ids e os corpos das rotas de sessão); a CORE-03 (presets) e a AI-01
(respostas das IAs) vêm logo depois. Sem uma decisão, cada tarefa escolheria uma biblioteca, ou
escreveria validadores à mão, com tipos e mensagens diferentes.

O que se pede da biblioteca:

- tipos TypeScript inferidos do próprio esquema, para tipo e validação nunca divergirem;
- uso no motor: pura, determinística e sem I/O, no navegador e no Node (ADR 0016 e ADR 0017);
- mensagens de erro próprias por campo, para os formatos do projeto
  (`Erro: … — Solução: …` e `{ "error": { "code", "message" } }`);
- licença compatível com o ADR 0019, manutenção ativa e ESM que roda com a remoção de tipos do
  Node 24, sem passo de build.

## Decisão

1. **Zod 4 é a biblioteca única de validação de esquema em todos os pacotes:**
   `packages/engine`, `packages/ai`, `apps/server` e `apps/web`. A versão de partida é a
   `zod@^4.6.7` (MIT); cada pacote que validar declara a dependência no próprio `package.json`.
2. **No motor, o Zod fica na fronteira.** Ele valida presets, entradas e sessões gravadas e entrega
   dados já tipados ao núcleo; o passo do motor não valida esquemas. O Zod não faz I/O nem usa
   relógio ou aleatoriedade, então não fere o determinismo.
3. **Erros esperados continuam sendo valores** (`Result`): usa-se `safeParse` e os problemas
   viram mensagens do projeto. `parse`, que lança exceção, só onde a falha é erro de programação.
4. **O esquema é a fonte do tipo** (`z.infer`/`z.output`), salvo quando o tipo público tem nomes
   próprios: a configuração, por exemplo, lê `AI_SOM_MODEL` e expõe `systemOneModel` (nomes de
   papel).
5. **Validadores escritos à mão** ficam só onde o Zod não cabe: os scripts de gate, que não têm
   dependências de produção, continuam com funções de guarda próprias.
6. **Import:** `import { z } from "zod"` (API clássica). No site, se o tamanho do pacote pesar, a
   tarefa pode usar `zod/mini`, registrando a escolha no PR.

## Consequências

### Positivas

- Uma forma só de escrever e de ler validações em todo o projeto.
- Tipo e validação saem do mesmo esquema e não divergem.
- Mensagens por campo, em português, sem escrever parser.
- Os mesmos esquemas podem servir ao servidor e ao site (por exemplo, o formato da sessão).

### Negativas / custos

- Uma dependência de produção a mais. Ela já estava na árvore como dependência de
  desenvolvimento (de plugins do ESLint); agora é também de produção.
- Peso no pacote do site quando ele validar com a API clássica (atenuável com `zod/mini`).
- A API muda entre versões maiores (a 4 trocou o parâmetro `message` por `error`, por exemplo); o
  Dependabot propõe as atualizações e o CI as verifica.

### Riscos

- Validar esquemas grandes dentro do passo do motor custaria tempo; por isso a validação fica na
  fronteira (decisão 2) e o benchmark do motor vigia o orçamento de 16 ms.

## Alternativas consideradas

- **Valibot** — modular e menor no navegador, mas com ecossistema menor e API menos conhecida; a
  vantagem de tamanho só importa no site, e o `zod/mini` cobre esse caso.
- **Ajv com JSON Schema** — rápido e padrão aberto, mas os tipos TypeScript exigem gerador ou
  duplicação (esquema + interface), as mensagens de erro são genéricas e há mais configuração.
- **Validadores escritos à mão** — sem dependência, mas repetitivos, fáceis de errar, com tipos e
  validação que podem divergir e um estilo diferente por pacote.

## Critérios de verificação

- Revisão de PR: nenhuma outra biblioteca de validação de esquema nos `package.json`.
- Todo dado de fora passa por um esquema Zod antes do uso, com testes do caso válido e do
  inválido; na SRV-01: `apps/server/src/config.ts` (ambiente) e
  `apps/server/src/session-format.ts` (ids, campanha e fatia).
- `npm run licenses` aceita o Zod como dependência de produção (MIT).

## Referências

- Documentação do Zod: <https://zod.dev> (acesso em 2026-11-23).
- Registro do npm: `zod` 4.6.7, licença MIT, publicada em 2026-10-12 (`npm view zod`, acesso em
  2026-11-23).
