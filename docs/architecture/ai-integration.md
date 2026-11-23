# Integração de IA: SOM e modelo de texto

> **Especificação v1 — 2026-11-09.** Como o produto usa as duas IAs (D-19, D-20, D-21). Os
> fatos sobre o OpenRouter foram conferidos no catálogo público em 2026-11-09; preços e
> parâmetros mudam, então confira de novo antes de mudar a configuração.

## 1. Papéis e fronteira

| | SOM (System One Model) | Modelo de texto |
| --- | --- | --- |
| Faz | Converte texto livre (fala do jogador, premissa, linha de personagem) em labels, presets e valores, com probabilidades. | Encena um ato **já resolvido** como fala e gesto, com voz, sotaque e o enredo da premissa. |
| Nunca faz | Decidir o resultado de um ato, escrever texto, mudar estado. | Decidir o que acontece, inventar fatos, mudar laços ou status. |
| Saída | Decisões tipadas (`noul`, `choice`, `score`) — nunca prosa. | JSON `{fala, gesto}`. |
| Entra no estado? | Só depois de virar ato ou preset validado (e confirmado, se houver dúvida). | Nunca. Fica no registro de apresentação. |

**O motor decide tudo** (ADR [0016](<adr/0016-engine-decides-models-translate.md>)). Uma
resposta inválida, recusada ou lenta nunca trava a simulação: há caminho alternativo para tudo.

## 2. Onde roda

```text
Navegador (apps/web)  --HTTP-->  Servidor local 127.0.0.1 (apps/server)  --HTTPS-->  OpenRouter
                                  lê OPENROUTER_API_KEY do .env
```

- O navegador **nunca** fala com o OpenRouter nem vê a chave.
- O servidor escuta só em `127.0.0.1` e expõe `/api/som/*` e `/api/text/*`.
- A chave fica em `.env` (fora do git; há `.env.example` sem valor).
- Não há IA local por enquanto (D-19).

## 3. Modelos e configuração

| Papel | Modelo padrão | Rota | Conferido em 2026-11-09 |
| --- | --- | --- | --- |
| SOM | `typesafe/jev-1.14` | `POST https://openrouter.ai/api/alpha/decisions` (alpha) | consta do catálogo de modelos de decisão; contexto 262 144; entrada US$ 0,042 por milhão de tokens |
| Texto | `xiaomi/mimo-v2.6-pro` | `POST https://openrouter.ai/api/v1/chat/completions` | consta do catálogo; contexto ~1 M; entrada US$ 0,435 e saída US$ 0,87 por milhão de tokens; aceita `response_format`, `structured_outputs`, `temperature`, `seed`, `reasoning`, `max_tokens` |

Alternativas já existentes no catálogo, para troca por configuração: `perplexity/pplx-decider-v1.2`
(o padrão de decisões recomendado pela skill `som-agent-skill` do maintainer) e `liquid/d1`
(família LiquidAI do d1-2B, ponte natural para o futuro local).

Configuração no servidor: variáveis de ambiente lidas por um módulo tipado
(`apps/server/src/config.ts`, validado com Zod, [ADR 0021](<adr/0021-zod-for-schema-validation.md>)).
Valor vazio conta como ausente e vale o padrão; valor inválido impede o servidor de subir, com uma
linha `Erro: … — Solução: …` por variável. As variáveis do próprio servidor (porta, pasta de dados,
limites e log) estão na [arquitetura](<overview.md>), seção 5.3.

| Variável | Padrão | Aceita | No código | Uso |
| --- | --- | --- | --- | --- |
| `OPENROUTER_API_KEY` | — (obrigatória para IA) | qualquer texto | `aiApiKey` (`Secret`) | chave da conta |
| `AI_SOM_MODEL` | `typesafe/jev-1.14` | id sem espaços | `systemOneModel` | modelo de decisões |
| `AI_TEXT_MODEL` | `xiaomi/mimo-v2.6-pro` | id sem espaços | `textModel` | modelo de texto |
| `AI_TEXT_TEMPERATURE` | `0.8` | número de 0 a 2 | `textTemperature` | variedade das falas |
| `AI_TEXT_REASONING_EFFORT` | desligado (vazio) | `low`, `medium` ou `high` | `textReasoningEffort` | esforço de raciocínio, quando o modelo aceitar |
| `AI_TIMEOUT_MS` | `15000` | inteiro de 1 a 2147483647 | `aiTimeoutMs` | tempo máximo por chamada |
| `AI_BUDGET_USD_PER_CONVERSATION` | sem teto (vazio) até medir 5 cenas | número maior que 0 | `aiBudgetUsdPerConversation` | teto de custo (D-23) |

Números aceitam só dígitos com ponto decimal (`0.8`), sem sinal, espaço ou expoente. O teto de
`AI_TIMEOUT_MS` é o maior atraso que um timer do Node aceita (2³¹ − 1 ms); acima disso o timer
dispararia na hora. A chave fica num invólucro `Secret`: só `reveal()` devolve o valor, e texto,
JSON e `inspect` mostram `[redacted]`. `GET /api/health` diz se há chave (`aiKeyConfigured`), nunca
qual é.

Ids de modelo só existem na configuração; o código usa nomes de papel (seção 9).

## 4. SOM: contrato

### 4.1 Pedido

```json
{
  "model": "typesafe/jev-1.14",
  "state": { "...contexto compacto em JSON...": "..." },
  "questions": {
    "act": { "type": "choice", "instructions": "...", "criteria": { "GREET": "...", "OTHER": "..." } },
    "intensity": { "type": "score", "instructions": "...", "criteria": ["...", "..."] },
    "isFalse": { "type": "noul", "instructions": "..." }
  },
  "session_id": "<id da sessão>"
}
```

- Cabeçalho `Authorization: Bearer <chave>`, JSON UTF-8.
- No máximo **16 perguntas por chamada** (regra do projeto); acima disso, várias chamadas.
- Uma pergunta atômica por decisão. `choice` não exaustivo leva `OTHER` ou `NONE`.
- `score` usa régua de 2 a 10 com situações concretas: 9 níveis, do mais baixo ao mais alto.
- Não usar `box`.
- O texto do usuário vai no `state` como está. A língua das instruções (português ou inglês) é
  uma escolha a medir na tarefa AI-02: começar em inglês e comparar.

### 4.2 Resposta e conversão

- `noul` devolve uma probabilidade 0..1; `choice`, a opção escolhida com distribuição e
  `confidence`; `score`, a média ponderada com distribuição.
- Conversão para o motor, feita em `packages/ai` (o motor só recebe inteiros): probabilidade em
  bp = `clamp(Math.round(p × 10000), 0, 10000)`; intensidade =
  `clamp(Math.round((score − 2) × 1250), 0, 10000)`; `noul` vira `true` com probabilidade
  ≥ 5000 bp.
- **Confiança da leitura** = a menor entre a maior probabilidade de `act` e a maior de `target`.
- **Validação fechada:** número não finito, distribuição incoerente, opção inexistente ou HTTP 200
  com `error` = falha. Falha nunca vira ato: a interface cai para o menu de atos.

Detalhes fixados na AI-01 (`packages/ai/src/answers.ts` e `convert.ts`):

- **Forma neutra da porta.** A `SystemOnePort` devolve as respostas na forma do fio, com uma
  diferença: o `score` já vem na régua do projeto, de 2 a 10. O fio devolve o índice do nível
  (0..8) e o adaptador (AI-02) soma 2 ao `score` e às chaves de `probabilities` antes de
  devolver. Assim, `intensidade = clamp(Math.round((score − 2) × 1250), 0, 10000)`; a entrada é
  limitada à faixa antes de multiplicar (2 → 0, 7,3 → 6625, 10 → 10000).
- **Validação fechada, pergunta por pergunta**, contra as perguntas enviadas: resposta que não é
  objeto, pergunta sem resposta, resposta a pergunta não feita, campo desconhecido, `type`
  trocado, `noul` ou `confidence` fora de [0, 1], `score` fora de [2, 10], número não finito,
  opção (ou chave de `probabilities`) que não foi oferecida e distribuição cuja soma, arredondada
  para bp, fica a mais de 200 bp (0,02) de 10000 = falha. A primeira falha encontrada vai para o
  registro com o código e a pergunta.
- **Maior probabilidade** de uma pergunta (`top`): a maior das `probabilities`; sem
  distribuição, a `confidence`; sem as duas, 0 (cai na confirmação).
- **Fala do jogador → ato candidato** (`reading.ts`), pelas regras da
  [seção 11 dos atos](<dialogue-acts.md>): `NOBODY` ⇒ `targets = []`; `GROUP` ⇒ `"GROUP"`;
  `MOVE` com um alvo ⇒ `APPROACH`, sem alvo (ou com `GROUP`) ⇒ lacuna `DESTINATION`; `object` só
  em `REQUEST` e `OFFER` e diferente de `NONE`; `blamed` só com `isFalse` e diferente de `NONE`;
  ato sem fala ⇒ tópico `NONE`; `SMALL_TALK` dispensa referência; os outros tipos exigem um
  `topicRef` do mesmo tipo, senão o tópico fica `NONE` com a lacuna `TOPIC`. Com `OTHER` não há
  candidato. Confirmação: confiança abaixo de 7000 bp, `OTHER` ou qualquer lacuna. A validação
  do candidato contra a cena é do motor (SOC-01).

### 4.3 Conjuntos de perguntas

| Uso | Perguntas | Onde está a lista |
| --- | --- | --- |
| Fala do jogador → ato | `act`, `tone`, `target`, `topicType`, `topicRef`, `object`, `intensity`, `volume`, `isFalse`, `blamed` (as 10 sempre numa chamada) | [atos de conversa](<dialogue-acts.md>), seção 11 |
| Premissa → cena | lugar, tags naturais, clima, fase do dia, jogador presente, número de personagens | [presets](<presets.md>), seção 10 |
| Linha de personagem → presets | arquétipo, faixa etária, duas vontades dominantes, estado do dia, associação, registro de fala (7 por personagem; 2 personagens por chamada) | idem |
| Par de personagens → laço | arquétipo de laço com direção, até 2 acontecimentos com quem fez cada um (5 por par; 3 pares por chamada) | idem |

O `state` leva só o necessário: o texto, os presentes (id e nome), a cena em palavras e, para a
fala do jogador, os fatos que o personagem do jogador conhece (no máximo 12, os mais salientes).

Chaves e lotes fixados na AI-01 (`packages/ai/src/prompts/`):

- **Fala do jogador** (uma chamada, 10 perguntas): as opções de `target` e `blamed` são
  `char_<id>` (por id crescente, rubrica = nome); as de `topicRef`, `ref_1…ref_n` na ordem das
  entidades salientes recebidas (rubrica = descrição). O `state` leva `line`, `speaker`,
  `present`, `scene`, `knownFacts` (os 12 primeiros) e `topics`.
- **Cena:** `place`, `naturalTag`, `weather`, `dayPhase`, `playerPresent` e, sem linhas de
  personagem, `characterCount` (`"2"`…`"8"`).
- **Personagens:** `c<i>.archetype`, `c<i>.ageBand`, `c<i>.drive1`, `c<i>.drive2`,
  `c<i>.dayState`, `c<i>.association` (`fear_<tag>`, `attachment_<tag>` ou `NONE`) e
  `c<i>.register` (`FORMAL`, `COLLOQUIAL`, `RUSTIC`, `CULTURED`, `ARCHAIC`); `i` é a posição da
  linha, a partir de 0.
- **Laços:** todo par de personagens com linha, `p<a>_<b>` com `a < b`: `bond` (os não
  direcionais pelo id; os direcionais como `<id>.ab`, A = primeiro, e `<id>.ba`, A = segundo),
  `event1`, `event1By` (`FIRST`/`SECOND`), `event2` e `event2By`.
- Instruções em inglês; as rubricas das opções são os nomes dos catálogos (pt-BR). A comparação
  de línguas fica para a AI-02.

### 4.4 Confirmação (D-20)

Se a confiança da leitura de `act` ou de `target` ficar abaixo de **7000 bp**, ou se `act` for
`OTHER`, a interface mostra a etiqueta "entendido como: provocar · brincalhão · Otávio ·
intensidade 6", que o jogador aceita ou corrige. Acima do limiar, o ato segue direto. A leitura, a
confiança e a eventual correção vão para o registro da sessão.

### 4.5 Erros

| Situação | Conduta |
| --- | --- |
| 400 / 422 | pedido inválido: falha terminal; corrigir o código |
| 401 / 402 / 403 | chave, crédito ou permissão: falha terminal; avisar na interface |
| 404 / 413 | modelo, rota ou tamanho: falha terminal |
| 429 / 5xx | até 2 novas tentativas com espera crescente e `Retry-After` |
| tempo esgotado | falha; a interface oferece o menu de atos |

## 5. Modelo de texto: contrato

### 5.1 Pacote de encenação

O motor emite `RenderRequested` com um pacote montado por uma função pura em `packages/ai`:

| Campo | Conteúdo |
| --- | --- |
| `premise` | a premissa digitada pelo usuário (o enredo) |
| `scene` | lugar, horário e clima em palavras |
| `speaker` | nome, faixa etária, arquétipo e registro de fala, traços marcantes em palavras, as 3 emoções e necessidades mais fortes em palavras, sinais visíveis |
| `listeners` | nomes, como o falante vê cada um agora e o laço resumido em palavras |
| `act` | ato, tom, intensidade em palavras, tópico descrito, volume, faixa de resultado se for resposta, marca de mentira |
| `knownFacts` | até 12 fatos que o falante conhece, na perspectiva dele, com "lembra bem" ou "lembra vagamente" |
| `recentLines` | as últimas 8 falas encenadas, com quem falou |
| `rules` | 1 a 3 frases; nada de números ou mecânica; não narrar pensamentos alheios; pt-BR no registro do personagem; só citar fatos de `knownFacts` |

Números de estado **nunca** vão no pacote: tudo é convertido em palavras por faixas.

### 5.2 Pedido e saída

- Mensagem de sistema: o modelo é o ator do personagem, encena o ato dado e segue as regras.
- Mensagem do usuário: o pacote em JSON.
- `response_format` com esquema JSON:

```json
{ "fala": "texto, até 400 caracteres", "gesto": "texto, até 120 caracteres, pode ser vazio" }
```

Tamanhos contados em caracteres (pontos de código), depois de tirar os espaços das pontas. A
`fala` pode ser vazia quando há `gesto` (atos sem fala); as duas vazias são recusadas.

### 5.3 Validação e caminho alternativo

1. Esquema e tamanho.
2. Sem números de mecânica nem palavras do motor (`bp`, `tick`, nomes de eixos com valores).
3. Só nomes de presentes ou de pessoas que estão nos fatos conhecidos.
4. Nomes próprios ou acontecimentos que não estão nos fatos conhecidos → marcados como possível
   fato inventado (a avaliação confere; ver [avaliação](<../engineering/evaluation.md>)).
5. Falhou: uma nova tentativa com instrução reforçada; falhou de novo, ou o modelo recusou, ou
   estourou o tempo: **fala de modelo pronto** (template por ato e tom, em `packages/ai`), marcada
   como alternativa no registro.

Regras testáveis da AI-01 (`packages/ai/src/line.ts`) para os passos 2 e 3, com os limites
conhecidos:

- **Mecânica:** qualquer algarismo (de qualquer escrita), o sinal `%` e as palavras `bp`, `tick`
  e `ticks` (sem distinguir maiúsculas) recusam a fala. O modelo escreve números por extenso
  ("três moedas"); "300 anos" com algarismos cai na fala pronta, um falso positivo aceito.
- **Nomes desconhecidos:** uma palavra que começa com maiúscula é tratada como nome, salvo se
  abre frase (início do texto ou depois de `.`, `!`, `?`, `…` ou `:`, ignorando espaços, aspas,
  parênteses e travessões), se está toda em maiúsculas (grito), se está entre as exceções
  (`Deus`, `Senhor`, `Senhora`, `Dona`, `Dom`, `Seu`, `Sr`, `Sra`, `Doutor`, `Doutora`, `Mestre`)
  ou se é uma palavra de um dos nomes conhecidos enviados no pedido (presentes e pessoas dos fatos
  conhecidos; "Maria Clara" deixa passar "Clara"). Limites: um nome escrito em minúscula ou que
  abre frase passa; lugares e povos com maiúscula que não estejam nos nomes conhecidos são
  recusados (falso positivo que leva à fala pronta).
- **Falas prontas** (`packages/ai/src/prompts/fallback-data.ts`): pelo menos uma por ato e tom
  (20 × 6), em pt-BR; atos sem fala só têm gesto. O único marcador é o vocativo `, {alvo}`,
  trocado pelo nome do alvo ou removido quando não há um. A escolha é determinística: quem chama
  passa um índice inteiro e vale o template na posição `índice mod quantidade`; nada de `Math.random`. Toda
  fala pronta passa na validação acima.

### 5.4 Cache, demora e custo

- Cache pela soma do pacote, do modelo e da versão do prompt; guardado na sessão.
- O mundo espera (D-11): enquanto a fala não chega, a interface mostra que o personagem vai
  falar; nada avança.
- O custo de cada chamada (`usage`) entra no registro; ao passar do teto da conversa, a sessão
  continua só com falas de modelo pronto e avisa o usuário.
- **Sem filtro de conteúdo próprio** (D-22). Recusas do modelo ou do provedor viram caminho
  alternativo e ficam marcadas.

## 6. Registro e replay

Toda chamada grava no registro da sessão: papel, modelo resolvido, pedido (sem a chave),
resposta bruta, resultado interpretado, validação, tempo e custo. O replay **usa o que foi
gravado** e nunca chama os modelos.

## 7. Prompts versionados

Prompts, conjuntos de perguntas e falas prontas vivem em `packages/ai/src/prompts/` com
`PROMPT_VERSION` (formato `AAAA-MM-DD.n`). Mudar um
prompt exige rodar de novo as cenas douradas ([avaliação](<../engineering/evaluation.md>)) e anotar
o resultado no PR.

## 8. Testes

- **Falsos determinísticos** das duas portas para todos os testes de unidade, integração e E2E.
- **Gravações** de respostas reais (sem a chave) como fixtures de contrato.
- **Teste ao vivo** só por comando explícito (`npm run smoke:live`, exige a chave); nunca no CI.
- Nenhum teste de PR depende de rede.

## 9. Nomes no código

- Papéis, não modelos: `systemOne` (SOM) e `textModel`.
- Nomes de modelos e de seus fabricantes (`jev`, `mimo`, `deepseek`, `liquid`…) nunca aparecem em
  identificadores, arquivos ou rotas; ids de modelo só na configuração.
- O adaptador do gateway pode se chamar `openrouter` (`packages/ai/src/openrouter/`): ele é a
  integração de transporte, não um modelo, e trocar de modelo não mexe nele.

## 10. Futuro: modelos locais

Quando o offline voltar, a porta `textModel` ganha um adaptador para o LFM3-1.7B e a porta
`systemOne` para o d1 da LiquidAI, servidos localmente. As portas, o pacote de encenação e as
perguntas não mudam; só o adaptador.
