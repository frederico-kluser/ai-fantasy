# Arquitetura

> **v1 — 2026-11-09.** Como o código do AI Fantasy se organiza. O que o produto faz está em
> [`docs/product.md`](<../product.md>); as regras do motor, no
> [modelo de simulação](<simulation-model.md>). Decisões estruturais nos ADRs 0013–0021.

## 1. Visão em uma tela

```mermaid
flowchart LR
    subgraph NAV["Navegador"]
        UI["apps/web: playground, cena, inspetor, avaliação, sessões"]
        WK["Web Worker: packages/engine (núcleo puro)"]
    end
    subgraph SRV["Servidor local em 127.0.0.1 (apps/server)"]
        SOM["/api/som"]
        TXT["/api/text"]
        SES["/api/sessions"]
        AI["packages/ai: portas, prompts, validação, adaptadores"]
    end
    OR["OpenRouter"]
    DATA[("data/: campanhas e sessões, fora do git")]
    UI <-->|"entradas e eventos"| WK
    UI -->|"fala do jogador, premissa"| SOM
    UI -->|"pacote de encenação"| TXT
    UI -->|"salvar, carregar, replay"| SES
    SOM --> AI
    TXT --> AI
    AI -->|"HTTPS, chave do .env"| OR
    SES --> DATA
```

## 2. Pacotes e regras de dependência

O repositório é um monorepo TypeScript (workspaces do npm).

```text
ai-fantasy/
├── packages/
│   ├── engine/   núcleo puro e determinístico: domínio, presets, sorteio, regras, passo, replay
│   └── ai/       portas do SOM e do texto, prompts, validação, falas prontas (puro)
│                 + adaptadores do OpenRouter (só no servidor)
├── apps/
│   ├── server/   servidor local (Node 24): /api/som, /api/text, /api/sessions; guarda a chave
│   └── web/      site (React + Vite)
├── data/         campanhas e sessões gravadas (git-ignored)
└── docs/
```

| Pacote | Pode depender de | Não pode |
| --- | --- | --- |
| `packages/engine` | nada interno | I/O, DOM, APIs do Node, rede, relógio, `Math.random`, números quebrados no estado |
| `packages/ai` (parte pura) | `engine` (tipos e presets) | rede, DOM |
| `packages/ai` (adaptadores) | parte pura, `fetch` | ser importado pelo `web` |
| `apps/server` | `ai`, `engine` (tipos) | servir em outro endereço que não `127.0.0.1` |
| `apps/web` | `engine`, `ai` (parte pura) | chamar o OpenRouter, guardar a chave |

As regras são verificadas por lint (restrição de imports) e por um teste que falha se o motor
importar algo proibido.

## 3. O núcleo (`packages/engine`)

### 3.1 Módulos

| Módulo | Responsabilidade | Especificação |
| --- | --- | --- |
| `domain` | tipos, ids, aritmética em bp, versões | simulação §2 |
| `rng` | PRNG por stream, sorteio sem viés, registro, forçar caminho | simulação §15 |
| `time` | ticks, relógio, fases do dia, luz e alcance visual | simulação §2, §3.2 |
| `space` | grade, células cobertas e saídas, distância, linha de visão, audição, caminhos, movimento | simulação §3.1, §8.1, §8.2 |
| `presets` | catálogos e validação | [presets](<presets.md>) |
| `character` | camadas de status, traços, aptidões, associações | simulação §4, §5 |
| `context` | ameaça, presença, clima, horário | simulação §6 |
| `signals` | emissão, percepção e interpretação de sinais | simulação §7 |
| `acts` | catálogo, quem ouve, interpretação, avaliação, pedidos | [atos de conversa](<dialogue-acts.md>) |
| `decision` | utilidade, precedência de Maslow, escolha | simulação §10 |
| `turns` | vontade de agir, silêncio, interrupção, saída, fim | simulação §11 |
| `memory` | fatos, cópias, perspectiva, fidelidade, memórias marcantes | simulação §12 |
| `personality` | tendências e cristalização | simulação §13 |
| `generation` | elenco e laços a partir de presets | [presets](<presets.md>) |
| `scene` | o passo do motor e os eventos | simulação §16 |
| `session` | registro, hash, replay | simulação §15 |
| `continuity` | regras entre uma fatia e outra | simulação §14 |

### 3.2 API pública (esboço)

```ts
// primeira fatia: elenco gerado (seed do elenco) e cena (seed da cena)
createScene(setup: SceneSetup, seeds: { castSeed: number; sceneSeed: number }): SceneState; // RngSeeds
// fatias seguintes: os mesmos personagens, com a história levada adiante
createSlice(campaign: CampaignState, setup: SliceSetup, sceneSeed: number): SceneState;
step(state: SceneState, input?: EngineInput): StepResult;
endSlice(state: SceneState, gap: TimeGap): CampaignState;
replay(log: SessionLog): ReplayResult;
hashState(state: SceneState): string;

type TimeGap = { hours: number; together: CharacterId[][] }; // horas inteiras; quem passou junto

type EngineInput =
  | { kind: "PLAYER_ACT"; act: ActLabel }          // ato confirmado do jogador
  | { kind: "TAKE_TURN"; characterId: CharacterId } // o jogador toma a vez
  | { kind: "SET_CONTROL"; characterId: CharacterId; mode: "MANUAL" | "AUTO" } // só o personagem do jogador; NPCs são sempre AUTO
  | { kind: "FORCE_DRAW"; selector: DrawSelector; outcome: number }
  | { kind: "SET_DRAW_MODE"; mode: "NORMAL" | "MOST_LIKELY" };

interface StepResult {
  state: SceneState;
  events: EngineEvent[];   // ActResolved, SignalPerceived, StatusChanged, Silence, CharacterLeft, SceneEnded, RenderRequested
  awaiting?: { kind: "PLAYER_ACT"; characterId: CharacterId };
  ended: boolean;
}
```

O evento `SignalPerceived` (simulação §7, SOC-02) tem a forma:

```ts
interface SignalPerceived {
  kind: "SignalPerceived";
  tick: number;
  observer: CharacterId;   // quem notou
  emitter: CharacterId;    // de quem é o sinal
  signal: SignalId;        // tremor, blush…
  channel: "VISUAL" | "VOCAL";
  trueCause: SignalCauseId;        // a causa verdadeira, para o inspetor
  interpretedCause: SignalCauseId; // o que o observador leu; pode estar errado
}
```

`step` resolve um ponto de decisão por chamada, na ordem da simulação §16. Se o personagem do
jogador em `MANUAL` precisar agir, devolve `awaiting` e não avança mais até receber `PLAYER_ACT`
(o mundo espera). `SliceSetup` escolhe lugar, horário, clima, quem participa (entre os personagens
da campanha), posições e estados do dia.

## 4. Pacote de IA (`packages/ai`)

- **Portas:** `SystemOnePort` (`decide`: uma chamada de até 16 perguntas) e `TextModelPort`
  (`renderLine`), assíncronas, com `Result` de falha tipada e o uso de cada chamada (modelo
  resolvido, tokens, custo e tempo). Sobre a porta, funções puras montam as chamadas
  (`buildPlayerLineCall`, `buildSceneCall`, `buildCharacterCalls`, `buildBondCalls`) e leem as
  respostas (`readPlayerLine` = montar, perguntar, validar e ler o ato candidato).
- **Parte pura:** construção das perguntas do SOM e do pacote de encenação, conversão de
  probabilidades para bp, validação das respostas, falas prontas por ato e tom, falsos
  determinísticos das duas portas.
- **Adaptadores:** cliente do OpenRouter para decisões e para chat, com tempo máximo, novas
  tentativas e telemetria. Só o servidor importa.

Contratos em [integração de IA](<ai-integration.md>).

## 5. Servidor local (`apps/server`)

| Rota | Faz |
| --- | --- |
| `POST /api/som/player-line` | lê a fala do jogador e devolve o ato provável com confiança |
| `POST /api/som/premise` | mapeia premissa e linhas de personagem para presets |
| `POST /api/text/render` | encena um pacote e devolve `{fala, gesto}` validado ou a fala pronta |
| `GET /api/sessions/campaigns` | lista as campanhas gravadas e as fatias de cada uma |
| `GET`, `PUT /api/sessions/campaigns/:campaignId` | lê e grava a campanha (`campaign.json`) |
| `GET`, `PUT /api/sessions/campaigns/:campaignId/slices/:sliceId` | lê e grava uma fatia (JSONL) |
| `GET /api/health` | `{ "status": "ok", "aiKeyConfigured": boolean }`: diz se há chave, sem revelá-la |

Escuta só em `127.0.0.1` (constante, não configurável) e só atende o próprio site (seção 10). Em
desenvolvimento, o Vite (`127.0.0.1:5173`) encaminha `/api` para o servidor; em uso normal, o
servidor entrega o site já compilado (`apps/web/dist`). As rotas `/api/som/*` e `/api/text/*`
chegam com a AI-02 e a AI-03.

### 5.1 Sessões

Contrato da WEB-03 e da EVAL-01. Formatos, ids e gravação na seção 8.

| Pedido | Corpo | Resposta |
| --- | --- | --- |
| `GET /api/sessions/campaigns` | — | `200 { "campaigns": [{ "id": "…", "sliceIds": ["1", "2", "2-b"] }] }`, campanhas e fatias em ordem lexicográfica; só entram campanhas com `campaign.json` |
| `GET …/campaigns/:campaignId` | — | `200` com o `campaign.json` (`application/json; charset=utf-8`); `404` se não existe |
| `PUT …/campaigns/:campaignId` | `application/json`: objeto com `formatVersion` inteiro ≥ 1 | `204`; grava ou substitui a campanha; `409` se o arquivo continua em uso |
| `GET …/campaigns/:campaignId/slices/:sliceId` | — | `200` com os bytes gravados (`application/x-ndjson; charset=utf-8`); `404` se não existe |
| `PUT …/campaigns/:campaignId/slices/:sliceId` | `application/x-ndjson` (seção 8) | `204`; grava exatamente o que recebeu; `404` se a campanha não existe (ela é gravada antes das fatias); `409` se o arquivo continua em uso |

Id fora do padrão dá `400` antes de tocar no disco; corpo inválido, `400`; outro tipo de conteúdo,
`415`. Uma gravação cujo arquivo continua em uso depois de todas as novas tentativas (seção 8)
dá `409 SESSION_BUSY` e deixa o arquivo antigo como estava: o site pode tentar de novo. Não há
`DELETE` por enquanto.

### 5.2 Erros

Todo erro é JSON, `{ "error": { "code": "…", "message": "…" } }`, com o código estável para o site
e a mensagem em português para pessoas. A mensagem nunca repete o conteúdo do pedido.

| Status | `code` | Quando |
| --- | --- | --- |
| 400 | `INVALID_ID` | `campaignId` ou `sliceId` fora do padrão da seção 8 |
| 400 | `INVALID_BODY` | campanha ou fatia inválida; JSON malformado ou vazio |
| 4xx | `REQUEST_REJECTED` | outro pedido recusado antes da rota (URL malformada, parâmetro longo demais…) |
| 400 | `MALFORMED_REQUEST` | o parser HTTP não entendeu o pedido (linha ou cabeçalho malformado) |
| 403 | `FORBIDDEN_HOST`, `FORBIDDEN_ORIGIN` | pedido de fora do site local (seção 10) |
| 404 | `NOT_FOUND` | rota, campanha ou fatia inexistente |
| 408 | `REQUEST_TIMEOUT` | o pedido demorou demais para chegar |
| 409 | `SESSION_BUSY` | o arquivo da sessão continuou em uso depois de todas as novas tentativas |
| 413 | `BODY_TOO_LARGE` | corpo acima do limite da rota (seção 5.3) |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | tipo de conteúdo que a rota não aceita |
| 431 | `HEADERS_TOO_LARGE` | cabeçalhos acima do tamanho máximo do Node (16 KiB) |
| 500 | `INTERNAL_ERROR` | falha interna; a pilha vai para o log, nunca para a resposta |

Os erros do parser HTTP (400, 408 e 431) são escritos direto na conexão, que é fechada em seguida;
uma conexão que o cliente derrubou fica como está. Duas respostas saem do próprio Node, antes do
Fastify, e por isso sem o corpo JSON: um pedido HTTP/1.1 sem o cabeçalho `Host` recebe
`400 Bad Request` vazio, e um cabeçalho `Expect` diferente de `100-continue` recebe
`417 Expectation Failed` vazio.

### 5.3 Configuração

Um módulo tipado (`apps/server/src/config.ts`, validado com Zod, [ADR 0021](<adr/0021-zod-for-schema-validation.md>))
lê o ambiente depois de carregar o `.env` da raiz; variáveis já definidas no ambiente vencem.
Valor vazio conta como ausente (vale o padrão). Valor inválido impede o servidor de subir: ele
imprime uma linha `Erro: … — Solução: …` por variável. O mesmo vale para uma porta que o servidor
não consegue usar: ocupada por outro programa (`EADDRINUSE`) ou recusada pelo sistema (`EACCES`,
como as faixas que o Hyper-V reserva no Windows). As variáveis de IA estão na
[integração de IA](<ai-integration.md>), seção 3; as do servidor são estas:

| Variável | Padrão | Aceita |
| --- | --- | --- |
| `PORT` | `4318` | inteiro de 0 a 65535 (0: o sistema escolhe uma porta livre) |
| `DATA_DIR` | `data/` na raiz do repositório | caminho; um relativo parte da raiz do repositório, nunca da pasta atual |
| `BODY_LIMIT_BYTES` | `1048576` (1 MiB) | inteiro maior que 0: corpo máximo de toda rota, menos as gravações de sessão |
| `SESSION_BODY_LIMIT_BYTES` | `33554432` (32 MiB) | inteiro maior que 0: corpo máximo de `PUT` de campanha e de fatia |
| `LOG_LEVEL` | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` ou `silent` |

### 5.4 Log

O log é o do Fastify (pino): uma linha JSON por evento no stdout, a partir de `LOG_LEVEL`. Entra
cada pedido (método, URL, host, status e tempo), as recusas 4xx só com o código do framework e as
falhas 500 com a pilha; nunca o corpo do pedido. `req.headers.authorization` e
`req.headers.cookie` saem como `[Redacted]`, e a chave vive num invólucro `Secret` que vira
`[redacted]` em texto, em JSON e no `inspect` do Node: nem um log acidental da configuração a
revela. Nos testes, sem destino de log, o servidor fica em silêncio.

### 5.5 Ponto de extensão

`buildApp({ config, webDistDir, plugins, logger })` monta o app sem escutar (os testes usam
`inject`); `startServer` faz o mesmo e escuta em `127.0.0.1:<PORT>`. Os `plugins` são plugins do
Fastify registrados depois das rotas centrais, com `{ config }` nas opções: as rotas de IA (AI-02 e
AI-03), o modo de teste com portas falsas e as rotas de avaliação (EVAL-01) entram por aí, e a
proteção da seção 10, os limites e os erros em JSON valem para elas.

## 6. Site (`apps/web`)

| Tela | Conteúdo |
| --- | --- |
| Playground | premissa e linhas de personagem → ficha montada pelo SOM → revisão e edição → começar; também criação manual |
| Cena | grade com os personagens, falas e gestos, entrada livre do jogador com a etiqueta "entendido como", controles (passo, automático, pausa, tomar a vez, modo de controle) |
| Inspetor | camadas de cada personagem, laços, percepção, vontades de agir, sorteios, efeitos, leitura do SOM e pacote enviado ao modelo de texto; seed, forçar caminho e modo "mais provável" |
| Avaliação | notas por fala e por cena, modo cego, painel de métricas |
| Sessões | campanhas, fatias, replay, ramificação, exportação da transcrição em Markdown |

O motor roda num **Web Worker** para o modo automático não travar a interface. Texto vindo dos
modelos é exibido como texto (nunca como HTML).

### 6.1 Base do site (WEB-01)

Decisões da tarefa WEB-01, tomadas pelo orquestrador sob delegação do maintainer:

1. **Rotas por hash, sem biblioteca:** `#/playground` (padrão, também para `#` vazio), `#/scene`,
   `#/sessions` e `#/evaluation`; um endereço desconhecido mostra "Página não encontrada". O
   roteador (`apps/web/src/app/routes.ts`) é uma tabela e um `useSyncExternalStore` sobre
   `hashchange`, de modo que o site construído funciona servido de qualquer pasta. Cena, Sessões e
   Avaliação são esqueletos até a WEB-02, a WEB-03 e a EVAL-01.
2. **Estilo:** CSS puro com propriedades personalizadas, sem framework. O tema segue
   `prefers-color-scheme`; o seletor "Tema" (do sistema, claro, escuro) marca a raiz com
   `data-theme` e guarda a escolha em `localStorage` (`ai-fantasy.theme`). Todo acesso ao
   armazenamento fica em `try/catch`: com ele bloqueado, o tema vale só para a página.
3. **Estado:** React (`useReducer` e `useState`), sem biblioteca de estado. O formulário do
   playground é um dado puro (`playground/model.ts`) mudado por um redutor com uma função por ação
   (`playground/reducer.ts`).
4. **Protocolo do worker** (`apps/web/src/engine/protocol.ts`), versionado (`v: 1`) e validado
   com Zod dos dois lados (ADR 0021):

   | Pedido | Resposta com valor |
   | --- | --- |
   | `{ v, id, kind: "generateCast", input, seeds }` | `{ v, id, ok: true, kind: "generateCast", cast }` (a vista do elenco: nomes, vontades dominantes, associações, laços com rótulo, rascunhos e gancho) |
   | `{ v, id, kind: "checkSetup", setup }` | `{ v, id, ok: true, kind: "checkSetup", review }` (personagens com célula e jogador, e o `hashState` dos personagens abertos) |

   Falha é valor: `{ v, id, ok: false, error: { code, problems } }`, com `code` entre
   `BAD_REQUEST` (envelope inválido; `id` nulo se não havia id válido), `CAST_REJECTED`,
   `SETUP_REJECTED` e `WORKER_FAILED` (o motor lançou, ou a resposta saiu do protocolo, ou o
   worker caiu), e cada problema com `path` e `message` em português. O cliente
   (`engine/client.ts`) dá a cada pedido um id e uma promessa que **nunca rejeita**. O worker
   (`engine/engine.worker.ts`) só liga `self` ao manipulador puro (`engine/handler.ts`); sem
   `Worker` (testes de unidade), o mesmo manipulador responde no próprio processo. O worker mora
   em `apps/web`, então o motor continua sem efeitos colaterais (`sideEffects: false`).
5. **Seeds:** o site sorteia a seed do elenco e a da cena com `crypto.getRandomValues` (nunca o
   motor), mostra as duas e deixa editar ou sortear de novo. Mudar a seed do elenco recomeça as
   tentativas; mudar a da cena não muda o elenco.
6. **Acessibilidade:** todo campo tem rótulo visível ligado a ele; grupos em `fieldset` com
   `legend`; problemas num `role="alert"`; foco visível (`:focus-visible`); os testes acham
   elementos por papel e rótulo.
7. **Texto como texto:** nomes e descrições digitados, e tudo que vem do worker, são renderizados
   como texto do React; nada usa `dangerouslySetInnerHTML`.
8. **Ficha de revisão:** o playground manual vira uma **configuração de cena** (`SceneSetup`,
   `apps/web/src/playground/setup.ts`, versão 1): `presetsVersion`, `seeds`, a entrada do elenco
   (`CastInputData`, com `attempt` e os travados — inclusive os pares que a família acrescenta),
   `place`, `grid` (o lugar cujo gabarito a cena usa), `naturalTag`, `weather`, `startMinute`,
   `positions` (por id; `null` sorteia) e `player` (`null` só assiste). `checkSceneSetup` valida
   o esquema e a versão dos presets e roda `generateCast` e `openScene` do próprio motor; só uma
   configuração que passa chega à ficha. A WEB-02 começa a cena a partir dela.
9. **Travas no formulário** (presets §10.1, "Tentativas e travados"): "Sortear de novo" soma 1 à
   tentativa e mantém os personagens e laços travados. Mudar arquétipo, vontades ou associação de
   um personagem destrava o personagem; mudar o par, o arquétipo ou os acontecimentos de um laço
   destrava o laço; editar um eixo sorteado trava o laço com o valor editado (limitado a
   `0..10000`). Qualquer mudança nos laços ou a remoção de um personagem descarta as travas dos
   pares derivados. Uma geração que chega depois de o elenco mudar é descartada.

## 7. Fluxo de um turno

1. O motor chega a um ponto de decisão. Se o sorteado é o jogador em `MANUAL`, devolve
   `awaiting`.
2. O jogador escreve. O site manda a fala para `/api/som/player-line`.
3. Com confiança ≥ 7000 bp, o ato segue; abaixo disso, aparece a etiqueta para confirmar ou
   corrigir.
4. O site entrega `PLAYER_ACT` ao motor; o motor resolve o ato, avança os ticks e decide os
   próximos atos dos NPCs até precisar do jogador de novo.
5. Para cada `RenderRequested`, o site pede a fala a `/api/text/render` e a mostra quando chega.
   Enquanto isso, a cena espera.
6. Tudo (entradas, sorteios, respostas das IAs) entra no registro da sessão.

## 8. Dados e persistência

| Coisa | Formato | Onde |
| --- | --- | --- |
| Campanha | JSON: personagens persistentes, memórias, tempo entre fatias | `data/campaigns/<campaignId>/campaign.json` |
| Fatia | JSONL: cabeçalho (versões, seeds, cena) + entradas, sorteios, eventos e chamadas de IA | `data/campaigns/<campaignId>/slices/<sliceId>.jsonl` |
| Avaliações | JSON por fatia | junto da fatia |
| Presets | dados tipados versionados | `packages/engine/src/presets/` |

`data/` é a pasta `DATA_DIR` (seção 5.3), fora do git. Todo formato tem `formatVersion`, inteiro
≥ 1: no objeto da campanha e na primeira linha (o cabeçalho) da fatia.

- **Ids** (`campaignId` e `sliceId`): `^[a-z0-9][a-z0-9-]{0,63}$`, isto é, de 1 a 64 caracteres
  entre `a-z`, `0-9` e `-`, começando por letra ou número. As fatias se chamam `1`, `2`… e, numa
  ramificação, `2-b`. Sem ponto, barra ou contrabarra, um id nunca sai da sua pasta; um id
  inválido é recusado antes de tocar no disco e, por defesa em profundidade, todo caminho montado
  ainda precisa ficar dentro de `DATA_DIR`. Os nomes de dispositivo que o Windows reserva (`con`,
  `prn`, `aux`, `nul`, `com0` a `com9`, `lpt0` a `lpt9`) também não valem como id: muitas
  ferramentas não abrem esses arquivos, com ou sem extensão (`nul.jsonl`).
- **Fatia em JSONL:** texto UTF-8 que termina com `\n`, um objeto JSON por linha. O servidor grava
  e devolve os bytes recebidos, sem reescrever nada (`\r\n` e espaços incluídos).
- **Campanha:** o servidor regrava o objeto recebido como JSON com 2 espaços de indentação e `\n`
  no fim; os campos ficam como vieram.
- **Escrita atômica:** primeiro um arquivo temporário na mesma pasta (`.<nome>.<uuid>.tmp`, criado
  com exclusividade e gravado em disco), depois `rename`; quem lê vê o arquivo antigo ou o novo,
  nunca a metade. Qualquer falha apaga o temporário (um arquivo que já existia nesse caminho nunca
  é tocado).
- **Arquivo em uso:** no Windows, o `rename` sobre um arquivo aberto por outro leitor falha por um
  instante (`EPERM`, `EACCES` ou `EBUSY`). O servidor tenta de novo depois de 10, 20, 40, 80, 160,
  320, 640 e 1000 ms (cerca de 2,3 s ao todo); se o arquivo continua em uso, a gravação volta como
  `busy` (`409 SESSION_BUSY`) e o arquivo antigo fica. As leituras e gravações de um mesmo arquivo
  entram numa fila, uma por vez, então um leitor do próprio servidor nunca segura o arquivo durante
  o `rename` (as novas tentativas ficam para outros programas, como um antivírus); arquivos
  diferentes andam ao mesmo tempo.
- **Listagem:** campanhas e fatias em ordem lexicográfica, comparando caracteres (`"1"`, `"10"`,
  `"2"`); entradas que não seguem o padrão (temporários, outros arquivos) ficam de fora.

## 9. Determinismo e fronteiras

- O estado autoritativo vive só no motor e só muda por `step`.
- Saídas de IA são **entradas** registradas, nunca estado direto.
- Texto livre (premissa, falas, nomes) fica no registro de apresentação, fora do hash.
- O replay reconstrói o estado a partir do registro e confere o hash a cada passo.

## 10. Segurança

- Chave do OpenRouter só no servidor, lida do `.env` para um invólucro `Secret` (seção 5.4); nunca
  em logs, respostas ou no git.
- Servidor só em `127.0.0.1`; limites de tamanho nos pedidos (seção 5.3).
- **Só o site local usa o servidor.** Escutar em `127.0.0.1` não basta: uma página de outro site
  aberta no mesmo navegador ainda consegue mandar pedidos para ele, e as rotas de IA gastam a
  chave. Por isso:
  - o cabeçalho `Host` precisa ser `127.0.0.1:<porta>` ou `localhost:<porta>` (a porta em que o
    pedido chegou) ou `127.0.0.1:5173`/`localhost:5173` (o Vite em desenvolvimento); senão,
    `403 FORBIDDEN_HOST`. Isso barra o *DNS rebinding*, em que um domínio estranho passa a
    resolver para `127.0.0.1`;
  - um pedido que pode mudar estado (todo método menos `GET`, `HEAD` e `OPTIONS`) e traz o
    cabeçalho `Origin` só passa se a origem for `http://` de um desses hosts; senão,
    `403 FORBIDDEN_ORIGIN`. Sem `Origin` (uma ferramenta local, não um navegador), passa;
  - não há CORS: nenhuma resposta traz `Access-Control-Allow-*`, então o navegador impede outros
    sites de ler as respostas.
- Respostas de modelos são dados não confiáveis: validadas por esquema e exibidas como texto.
- Política de vulnerabilidades em [`SECURITY.md`](<../../SECURITY.md>).

## 11. Desempenho

Orçamento: um passo do motor com 8 personagens em até **16 ms** numa máquina de desenvolvimento
comum. Um benchmark do motor roda a cada PR que toca `packages/engine`. Se o orçamento estourar de
forma consistente, a tarefa condicional de WebAssembly (PERF-01) entra no roadmap (D-18).
