# Atos de conversa

> **Especificação v1.2 — 2026-11-09.** Toda fala e toda ação na fatia é um **ato**: ato × tom ×
> tópico, com valores (D-13). O motor decide e resolve atos; o SOM converte a fala livre do
> jogador num ato; o modelo de texto encena o ato. As regras gerais estão no
> [modelo de simulação](<simulation-model.md>), cujas convenções valem aqui (`/` é divisão
> inteira; `mulBp`; unidade `u`). Números são iniciais e calibráveis. A v1.1 trocou os "+" e "−"
> da v1 por números, definiu os valores dos atos dos NPCs, as respostas e os vieses da decisão;
> a v1.2 deu valência às respostas e fixou a versão falsa das mentiras e a ordem de cálculo.

## 1. Estrutura de um ato

```ts
interface ActLabel {
  act: ActId;                         // o que se faz (seção 2)
  tone: ToneId;                       // como se faz (seção 3)
  targets: CharacterId[] | "GROUP";   // a quem; GROUP = todos que ouvem; [] = ninguém em particular
  topic: Topic;                       // sobre o quê (seção 4); { type: "NONE" } em atos sem fala
  intensity: number;                  // 0..10000 bp
  volume: "WHISPER" | "NORMAL" | "SHOUT";
  isFalse: boolean;                   // marca de mentira (seção 5)
  object?: RequestObject;             // o que se pede ou oferece (só REQUEST e OFFER)
  destination?: Cell;                 // só MOVE
}
```

Interrupção não é escolhida: o motor a marca quando acontece ([modelo de
simulação](<simulation-model.md>), seção 11). Um ato com `targets = []` é ouvido normalmente, mas
não cria obrigação de resposta.

## 2. Atos

### 2.1 Atos de fala

| Id | Nome | Ticks | Efeito na conversa | Cria obrigação? |
| --- | --- | --- | --- | --- |
| `GREET` | cumprimentar | 1 | abre a conversa com alguém | não |
| `CHAT` | conversar (papo sobre um tópico) | 3 | mantém a conversa; interessa ou entedia | não |
| `ASK` | perguntar | 2 | pede uma informação | sim |
| `TELL` | contar (fato, rumor, segredo) | 3 (6 se `SECRET`) | espalha conhecimento | não |
| `PRAISE` | elogiar | 2 | valoriza o alvo | não |
| `TEASE` | provocar | 2 | testa limites; diverte ou fere | não |
| `ACCUSE` | acusar | 3 | confronta | sim |
| `REQUEST` | pedir | 2 | **pedido**: faixa de resultado | sim |
| `OFFER` | oferecer (ajuda, presente, acordo, promessa, encontro) | 2 | **pedido**: faixa de resultado | sim |
| `APOLOGIZE` | desculpar-se | 3 | **pedido** de perdão | sim |
| `THREATEN` | ameaçar | 2 | **pedido** sob coação | sim |
| `ACCEPT` | aceitar | 1 | responde a um pedido | não |
| `REFUSE` | recusar, negar, não responder | 1 | responde a um pedido, a uma pergunta ou a uma acusação | não |
| `FAREWELL` | despedir-se | 1 | anuncia a saída; quem está saindo começa a andar | não |

As vontades que cada ato serve, para a decisão, estão na seção 9.2.

### 2.2 Atos sem fala

| Id | Nome | Ticks | Observação |
| --- | --- | --- | --- |
| `STAY_SILENT` | ficar calado, só ouvir | 1 | se havia obrigação de resposta, conta como ignorar |
| `MOVE` | ir até uma célula | 1 | define o destino; o deslocamento segue nos ticks seguintes (simulação §8.1) |
| `APPROACH` | aproximar-se de alguém | 1 | para a 1 célula do alvo |
| `WITHDRAW` | afastar-se de alguém | 1 | vai a 4 células ou mais do alvo |
| `LEAVE` | sair da cena | 1 | anda até uma saída e deixa a fatia |
| `TOUCH` | contato físico | 1 | exige estar a 1 célula; o tom define o gesto |

`TOUCH` por tom: `WARM` abraço ou afago; `SEDUCTIVE` carícia; `PLAYFUL` cutucão; `NEUTRAL` toque
no ombro; `IRONIC` tapinha condescendente; `AGGRESSIVE` empurrão.

## 3. Tons

| Id | Nome | Efeito geral | Ambiguidade base | Confusões típicas (pior / melhor) |
| --- | --- | --- | --- | --- |
| `WARM` | caloroso | reforça o que é positivo | 500 | `SEDUCTIVE` (melhor) |
| `NEUTRAL` | neutro | sem modulação | 300 | `IRONIC` (pior) |
| `PLAYFUL` | brincalhão | suaviza ofensas quando há afeto; serve diversão | 1500 | `AGGRESSIVE` (pior), `IRONIC` (pior) |
| `SEDUCTIVE` | sedutor | mexe com atração e desejo; constrange quando indesejado | 1500 | `WARM` (melhor), `PLAYFUL` (melhor) |
| `IRONIC` | irônico | morde com elegância; mexe com respeito e ressentimento | 2500 | `AGGRESSIVE` (pior), `PLAYFUL` (melhor) |
| `AGGRESSIVE` | agressivo | negativo forte; medo e raiva | 500 | `PLAYFUL` (melhor) |

**Chance de leitura errada** de um tom por um ouvinte `DIRECT` (stream `perception`):

```text
misread = clamp(
    ambiguity(tom)
  + 500 por faixa de distância acima de 3 células        // 4–6: 1; 7–12: 2; mais: 3
  + ruído / 5
  − perceptiveness(ouvinte) / 4
  + max(0, −trustInOthers(ouvinte)) / 4                    // desconfiado lê o pior
  + max(0, resentment − trust)(ouvinte→autor) / 5          // laço ruim lê o pior
  − affection(ouvinte→autor) / 10                          // laço bom lê certo
, 0, 9000)
```

Ao ler errado, o ouvinte sorteia entre as confusões típicas do tom. Peso de uma confusão "pior":
`10000 + resentment(ouvinte→autor) + max(0, −trustInOthers(ouvinte))`; de uma "melhor":
`10000 + affection(ouvinte→autor) + attraction(ouvinte→autor)`.

## 4. Tópicos e objetos

| Tipo | Significado | Referência |
| --- | --- | --- |
| `PERSON` | uma pessoa (presente, ausente, o ouvinte ou quem fala) | id do personagem |
| `THING` | um objeto, posse ou apego | id da associação |
| `PLACE` | um lugar | tag ou o lugar da cena |
| `EVENT` | algo que aconteceu | id do fato |
| `SECRET` | fato marcado como segredo | id do fato |
| `RUMOR` | fato conhecido de segunda mão (`TOLD`) | id do fato |
| `FEELING` | um sentimento ("o que sinto por você") | emoção ou eixo de laço |
| `SMALL_TALK` | amenidades: clima, trabalho, comida, o dia | — |
| `NONE` | sem tópico (atos sem fala) | — |

**Tópicos aceitos por ato:**

| Ato | Tipos aceitos |
| --- | --- |
| `GREET`, `FAREWELL` | `PERSON` (o alvo) ou `SMALL_TALK` |
| `CHAT` | todos, menos `SECRET` e `NONE` |
| `ASK`, `TELL` | todos, menos `NONE` (`TELL` de `EVENT`, `SECRET` ou `RUMOR` exige cópia do fato) |
| `PRAISE` | `PERSON`, `THING`, `FEELING` |
| `TEASE` | `PERSON`, `THING`, `EVENT`, `FEELING` |
| `ACCUSE` | `EVENT` ou `SECRET` em que o alvo é o ofensor, segundo a cópia de quem acusa |
| `REQUEST`, `OFFER` | `PERSON` (o alvo); o conteúdo vai em `object` |
| `APOLOGIZE` | `EVENT` (a ofensa) ou `PERSON` (o alvo) |
| `THREATEN` | `PERSON` (o alvo), `EVENT` ou `SECRET` (ameaça de expor) |
| `ACCEPT`, `REFUSE` | o tópico do ato respondido |
| atos sem fala | `NONE` |

O **ofensor** de um fato é o autor de um ato de valência ≤ −1 (pelo tom real) ou o lado marcado
como ofensor num acontecimento de história ([presets](<presets.md>), seção 7). Uma acusação é
**verdadeira** se o fato existe no registro com o alvo como ofensor; uma cópia falsa, vinda de
mentira, aponta para algo que não aconteceu. Um fato é **ruim para Y** quando Y é o ofensor dele
ou quando é um segredo de Y (`SECRET` em que Y é autor ou ofensor).

**Objetos de `REQUEST` e `OFFER`** e as vontades que cada um toca:

| Objeto | Vontade de quem recebe | Vontade de quem dá |
| --- | --- | --- |
| `HELP` | `physical_safety` | `care` |
| `INFORMATION` | `curiosity` | `influence` |
| `ITEM` | `material_security` | `care` |
| `MONEY` | `material_security` | `influence` |
| `COMPANY` | `company` | `company` |
| `FAVOR` | `purpose` | `influence` |
| `PROMISE` | `predictability` | `intimacy` |
| `SECRECY` (guardar segredo) | `dignity` | `intimacy` |
| `DATE` (encontro) | `desire` | `desire` |

## 5. Valores

- **Intensidade** (0..10000): força do ato.
  - Do jogador: o SOM devolve uma nota de 2 a 10, convertida por
    `clamp(round((nota − 2) × 1250), 0, 10000)` ([integração de IA](<ai-integration.md>)).
  - De um NPC: `3000 + mulBp(e, 7000)`, em que `e` é a intensidade da emoção que mais somou viés
    positivo ao candidato (0 se nenhuma); `ENTHUSIASTIC` usa 8000.
- **Volume:**
  - Do jogador: lido pelo SOM.
  - De um NPC: `WHISPER` em `TELL` de `SECRET` (só com todos os alvos a 1 célula); `SHOUT` se o
    alvo só ouviria gritando, ou com raiva ≥ 7000 em tom `AGGRESSIVE`; senão `NORMAL`.
- **Mentira (`isFalse`):** afirmar como verdadeiro algo falso.
  - **Versão falsa:** uma mentira sobre um fato (`TELL` de `EVENT`, `SECRET` ou `RUMOR`, ou
    `REFUSE` que nega uma acusação) conta o mesmo fato com outro **ofensor**: ninguém (negação)
    ou a pessoa culpada pela mentira. O motor guarda a versão falsa como cópia marcada; o modelo
    de texto encena a distorção.
  - Do jogador: lida pelo SOM (probabilidade ≥ 5000 ⇒ `true`); o culpado vem da pergunta
    `blamed` (seção 11; `NONE` = negação).
  - De um NPC com `honesty` efetiva ≤ −3000: para cada candidato `TELL` sobre um fato,
    `APOLOGIZE` e `OFFER` de `PROMISE`, entra também a variante mentirosa. Num fato cujo ofensor
    é o próprio autor ou alguém por quem ele tem afeto ≥ 6000, a versão falsa nega; senão, culpa
    o presente por quem o autor tem maior ressentimento (≥ 3000; sem ninguém assim, não há
    variante). Negar uma acusação verdadeira (`REFUSE`) é sempre mentira e nega.
  - **Detecção** (stream `perception`): quem tem cópia própria do fato com fidelidade ≥ 5000 e
    verdadeira detecta com chance `clamp(4000 + perceptiveness / 2 − eloquence(autor) / 4, 0,
    9500)`; quem não detecta, ou tem cópia falsa, fica com a própria cópia.
  - **Crença:** quem não tem cópia do fato acredita com chance
    `clamp((trust + perceivedSincerity)(ouvinte→autor) / 2, 500, 9500)`. Quem acredita recebe a
    cópia `TOLD` da versão falsa; quem não acredita faz `perceivedSincerity` −1500.
  - **Mentira sem fato** (desculpa ou promessa falsa): é descoberta quando um ouvinte `DIRECT`
    interpreta um sinal `lying` do autor durante os ticks do ato; fora disso, interpretar
    `lying` só reduz a sinceridade percebida (simulação §7).
  - **Mentira descoberta:** `trust` −1500 (o teto por ato), `resentment` +1000,
    `perceivedSincerity` −3000, `predictability` +2000, e a cópia do fato da mentira ganha +3000
    de importância.
- **Objeto** de um NPC: em `REQUEST`, cada objeto cuja "vontade de quem recebe" está entre as
  duas vontades de maior `mulBp(effectiveWeight, deficit)` do autor (nas dirigidas, o déficit
  dirigido ao alvo do candidato); em `OFFER`, cada objeto cuja "vontade de quem dá" é dominante no
  autor.
- **Alvos:** um ou mais personagens; `GROUP` dirige o ato a todos que ouvem; `[]`, a ninguém.

## 6. Combinações que o produto pede

Paquera e provocação não são atos próprios; são combinações (D-13).

| O que se quer | Combinação típica |
| --- | --- |
| Paquera | `PRAISE` ou `CHAT` em `SEDUCTIVE`; `TOUCH` em `SEDUCTIVE`; `OFFER` (`DATE`) em `WARM` |
| Provocação amistosa | `TEASE` em `PLAYFUL` |
| Provocação hostil | `TEASE` em `IRONIC` ou `AGGRESSIVE` |
| Deboche | `PRAISE` em `IRONIC` |
| Ameaça velada | `THREATEN` em `IRONIC` ou `WARM` (sorriso que gela) |
| Desculpa falsa | `APOLOGIZE` em `IRONIC`, ou com `isFalse` |
| Confidência | `TELL` com tópico `SECRET` em `WHISPER` |
| Fofoca | `TELL` com tópico `RUMOR` sobre um ausente |
| Chantagem | `THREATEN` com tópico `SECRET` do alvo |

Todas as combinações de ato e tom são válidas; o tom modula o efeito (7.2).

## 7. Avaliação: o que o ato faz em quem ouve

### 7.1 Unidade e tabela

`u = mulBp(800, intensidade)`. Na tabela, os números são múltiplos da unidade:

- **emoções:** `k × u`, com os fatores de traço (simulação 5.6);
- **vontades:** `k × u` no déficit (negativo = satisfaz);
- **laços:** `k × (u / 2)`, com teto de ±1500 por eixo por ato.

A linha vale para cada **alvo** que ouviu como `DIRECT`. Valência e linhas dependem da
interpretação (o tom lido). Quando mais de uma linha do mesmo ato vale (por exemplo, `TELL` de um
segredo que também é fato novo), os efeitos se somam e a valência é a de maior módulo.

| Ato interpretado | Valência | Emoções do alvo | Laço do alvo com o autor | Vontades do alvo |
| --- | --- | --- | --- | --- |
| `GREET` | +1 | `joy` +1 | `affection` +1, `trust` +1, `closeness` +1 | `company` −2 |
| `CHAT`, tópico interessa | +1 | `joy` +1 | `closeness` +1 | `company` −2, `curiosity` −1, `intimacy` (ao autor) −1 |
| `CHAT`, não interessa | 0 | — (tédio pela simulação 5.2) | — | `company` −1 |
| `ASK` | 0 | se o tópico é segredo ou fato ruim do alvo: `shame` +2, `fear` +1 | — | — |
| `TELL`, fato novo para o alvo | +1 | `surprise` +1 | `trust` +1 | `curiosity` −2 |
| `TELL` de segredo ao alvo | +2 | `joy` +1 | `trust` +2, `closeness` +2 | `intimacy` (ao autor) −2 |
| `TELL` de fato ruim para o alvo | −2 | `anger` +2, `shame` +2 | `resentment` +2 | `dignity` +2 |
| `TELL`, demais casos (fato já conhecido, pessoa, sentimento, coisa, lugar, amenidades) | como `CHAT` | como `CHAT` | como `CHAT` | como `CHAT` |
| `PRAISE` | +2 | `joy` +2 | `affection` +1, `respect` +1 | `recognition` −3 |
| `TEASE`, diverte (`PLAYFUL` e afeto ≥ 5000) | +1 | `joy` +2 | `affection` +1 | `fun` −2 |
| `TEASE`, ofende (demais casos) | −1 | `anger` +2, `shame` +1 | `respect` −1, `resentment` +2 | `dignity` +2, `justice` (ao autor) +1 |
| `ACCUSE` | −2 | `anger` +3; se verdadeira: `shame` +2, `guilt` +2 | `trust` −2, `resentment` +2 | `dignity` +3, `justice` (ao autor) +2 |
| `REQUEST` | 0 | — | — | — (efeitos na resposta, 8.3) |
| `OFFER`, sinceridade percebida ≥ 5000 | +2 | `joy` +2 | `trust` +1, `affection` +1 | — (efeitos na resposta) |
| `OFFER`, sinceridade percebida < 5000 | 0 | — | `trust` −1 | `predictability` +1 |
| `APOLOGIZE`, sinceridade percebida ≥ 5000 | +1 | `anger` −2, `sadness` −1 | `resentment` −2, `trust` +1 | — (perdão na resposta) |
| `APOLOGIZE`, sinceridade percebida < 5000 | −1 | `anger` +1 | `resentment` +1 | — |
| `THREATEN` | −3 | `fear` +3 (também `× (10000 + fearOf) / 10000`), `anger` +2 | `fearOf` +2, `resentment` +2, `trust` −3 | `physical_safety` +3, `dignity` +2, `justice` (ao autor) +2 |
| `ACCEPT` (resposta a pedido) | `ENTHUSIASTIC` +3; `ACCEPT` +2; `PARTIAL` +1 | ver 8.3 | ver 8.3 | ver 8.3 |
| `REFUSE` a um pedido | −1 (`HARD_REFUSE` vai em `AGGRESSIVE`) | ver 8.3 | ver 8.3 | ver 8.3 |
| `REFUSE` a uma pergunta (não responder) | −1 | `anger` +1 | `trust` −1 | `curiosity` +1 |
| `REFUSE` a uma acusação (negar) | −1 | `anger` +1 | `trust` −1 | `justice` (a quem negou) +1 |
| `FAREWELL` | 0 | `sadness` +1 se afeto ≥ 6000 | — | `company` +1 |
| `STAY_SILENT` devido (ignorar) | −1 | `anger` +1 | `respect` −1 | `recognition` +2 |
| `TOUCH` `WARM`, afeto ≥ 4000 | +2 | `joy` +2 | `affection` +1, `closeness` +1 | `intimacy` (ao autor) −2 |
| `TOUCH` `WARM`, afeto < 4000 | −1 | `disgust` +1 | — | `dignity` +1 |
| `TOUCH` `SEDUCTIVE`, atração ≥ 5000 | +2 | `joy` +2 | `attraction` +2 | `desire` (ao autor) −2 |
| `TOUCH` `SEDUCTIVE`, atração < 5000 | −2 | `disgust` +2, `shame` +1 | `resentment` +1 | `dignity` +2 |
| `TOUCH` `PLAYFUL`, afeto ≥ 5000 | +1 | `joy` +1 | — | `fun` −1 |
| `TOUCH` `PLAYFUL`, afeto < 5000 | −1 | `anger` +1 | — | `dignity` +1 |
| `TOUCH` `NEUTRAL` | 0 | — | — | — |
| `TOUCH` `IRONIC` | −1 | `anger` +1, `shame` +1 | `respect` −1 | `dignity` +1 |
| `TOUCH` `AGGRESSIVE` | −3 | `fear` +2, `anger` +2 | `fearOf` +2, `resentment` +2 | `physical_safety` +2, `dignity` +2, `justice` (ao autor) +2 |
| `APPROACH` | +1 com afeto ou atração ≥ 6000; −1 com `fearOf` ≥ 5000; senão 0 | `fear` +1 se `fearOf` ≥ 5000 | — | `company` −1 |
| `WITHDRAW` | −1 com afeto ≥ 6000; senão 0 | `sadness` +1 se afeto ≥ 6000 | — | `company` +1 |
| `MOVE`, `LEAVE` | 0 | — | — | — |

"Afeto", "atração", `fearOf` e "sinceridade percebida" são sempre do alvo pelo autor. Numa
resposta, o "alvo" da linha é quem fez a pergunta, a acusação ou o pedido. Um ato sem linha
aplicável tem valência 0 e nenhum efeito.

**Surpresa:** `surprise` +2 quando o ato tem valência ≥ 2 vindo de quem o alvo tem `resentment`
≥ 6000, ou valência ≤ −2 vindo de quem tem `affection` ≥ 6000. Cada ganho de surpresa soma metade
dele ao déficit de `predictability`.

### 7.2 Multiplicadores do tom

"Efeitos positivos" são os bons para o alvo; "negativos", o contrário:

- emoção boa: `joy`; ruins: `sadness`, `fear`, `anger`, `disgust`, `shame`, `guilt`, `jealousy`,
  `boredom`; neutra: `surprise`;
- eixos bons: `trust`, `affection`, `respect`, `attraction`, `closeness`; ruins: `fearOf`,
  `resentment`; neutro: `dependence`;
- déficit que cai é bom; que sobe, ruim.

Efeitos neutros não recebem multiplicador. As linhas de `TOUCH` já são por tom e não recebem esta
seção; as demais, inclusive as de `TEASE`, recebem.

| Tom lido | Positivos | Negativos | Valência | Extras |
| --- | --- | --- | --- | --- |
| `WARM` | `mulBp(x, 12000)` | ×1 | igual | — |
| `NEUTRAL` | ×1 | ×1 | igual | — |
| `PLAYFUL` | ×1 | `mulBp(x, 5000)` com afeto ≥ 5000 | +1 se negativa e afeto ≥ 5000 | — |
| `SEDUCTIVE` | regra abaixo | ×1 | regra abaixo | regra abaixo |
| `IRONIC` | `mulBp(x, 2500)` | ×1 | `min(valência, 0) − 1` | `resentment` +1, `respect` −1; se a valência original era ≥ 1 (deboche): `anger` +1, `shame` +1 |
| `AGGRESSIVE` | 0 | `mulBp(x, 15000)` | `min(valência, 0) − 2` | `fear` +1, `anger` +1 |

**`SEDUCTIVE`:**

- com atração do alvo pelo autor ≥ 5000: positivos ×1, `attraction` +1, `desire` (ao autor)
  −1, valência +1;
- com atração < 5000 e `romanticBoldness` do alvo < 0: positivos 0, `shame` +2, `disgust` +1,
  `dignity` +1, valência −1 (constrangimento);
- com atração < 5000 e `romanticBoldness` ≥ 0: positivos `mulBp(x, 5000)`, valência igual.

Valências ficam em `−3..+3`.

**Ordem de cálculo** de cada efeito (cada passo trunca): `k × u` (ou `k × (u / 2)` nos laços) →
multiplicador do tom → soma dos extras do tom → fator de traço da emoção (simulação 5.6) → fator
especial da linha (o de `fearOf` em `THREATEN`) → teto de ±1500 nos laços.

### 7.3 Efeitos em quem agiu

| Situação | Efeito no autor |
| --- | --- |
| ato com `isFalse` e `honesty` > 0 | `guilt` +1 (com o fator de culpa) |
| valência ≤ −2 contra quem ele tem `affection` ≥ 6000 | `guilt` +1 |
| valência ≤ −2 contra quem ele tem `justice` dirigida ≥ 5000 | `justice` (ao alvo) −2; `joy` +1 se `temper` > 0 |

### 7.4 Testemunhas

Ouvintes `DIRECT` que não são alvo:

- recebem só as emoções da linha, com `mulBp(x, 5000)`;
- num `TELL` de fato novo para eles, recebem a cópia `TOLD` e `curiosity` −1;
- num ato de valência ≤ −2 contra alguém de quem a testemunha tem `affection` ≥ 6000: `anger`
  +1 e `care` (a esse alguém) +2;
- num `TELL` de fato ruim sobre Y, quem tem `justice` dirigida a Y faz `justice` −3 (Y exposto);
- num ato de valência ≤ −2: `perceivedHostility` sobre o autor `+ 500 × |valência|`.

**Ciúme:** quem percebe (`DIRECT` ou `SEEN`) um ato de valência ≥ 1 em `SEDUCTIVE` ou `WARM` de Z
para Y, tendo atração ≥ 6000 por Y ou rótulo `SPOUSE` ou `PARTNER` com Y, faz `jealousy` +2 e
`resentment` por Z +1 (meia unidade), com a unidade do ato percebido.

## 8. Pedidos: aceite, faixas e respostas

### 8.1 Probabilidade de aceite

`REQUEST`, `OFFER`, `APOLOGIZE` e `THREATEN` criam uma obrigação de resposta. A **faixa de
resultado** é sorteada no stream `resolution` quando o alvo, em `AUTO`, ganha a vez com a
obrigação pendente, com o estado daquele momento. Um alvo em `MANUAL` responde como quiser, e
nada é sorteado.

```text
p = clamp(
    BASE[ato]                                   // REQUEST 5000 · OFFER 6000 · APOLOGIZE 5000 · THREATEN 4000
  + (trust − resentment)(alvo→autor) / 5
  + affection(alvo→autor) / 10
  + (perceivedSincerity(alvo→autor) − 5000) / 5
  + (eloquence(autor) − 5000) / 10
  + ajuste do tom                               // WARM +500 · SEDUCTIVE +1000 com atração(alvo→autor) ≥ 5000, senão −1000
                                                // IRONIC −700 · AGGRESSIVE −1500 (exceto em THREATEN)
  + ajuste de vontade                           // tabela abaixo
  + (só THREATEN) (fearOf(alvo→autor) − courage(alvo) / 2) / 3
  − 700 se ceder humilha o alvo diante de testemunhas
, 500, 9500)
```

"Ceder humilha diante de testemunhas": há outro ouvinte `DIRECT`, a privacidade do lugar é menor
que 4000 e o pedido é `THREATEN`, ou é `REQUEST` ou `APOLOGIZE` com `pride` do alvo ≥ 5000.

| Pedido | +1500 se for dominante no alvo | −1500 se for dominante no alvo |
| --- | --- | --- |
| `REQUEST` | a vontade de quem dá o objeto | `material_security`, quando o objeto é `MONEY` ou `ITEM` |
| `OFFER` | a vontade de quem recebe o objeto | — |
| `APOLOGIZE` | `intimacy` dirigida ao autor | `justice` dirigida ao autor |
| `THREATEN` | `physical_safety` | `dignity` |

Nas vontades dirigidas, conta só a dirigida ao autor com déficit ≥ 3000.

### 8.2 Faixas e respostas

Com `u` sorteado em `[0, 10000)` (no modo `MOST_LIKELY`, vence a faixa mais larga; simulação §15):

| Condição | Faixa | Resposta do alvo em `AUTO` |
| --- | --- | --- |
| `u < mulBp(p, 2000)` | `ENTHUSIASTIC` (aceita com entusiasmo) | `ACCEPT` em `WARM`, intensidade 8000 |
| `u < mulBp(p, 8000)` | `ACCEPT` | `ACCEPT` em `WARM` ou `NEUTRAL` (o de maior viés) |
| `u < p` | `PARTIAL` (aceita com condição ou hesitação) | `ACCEPT` em `NEUTRAL`, com os efeitos de 8.3 pela metade |
| `u < p + mulBp(10000 − p, 7000)` | `REFUSE` | `REFUSE` em `NEUTRAL` |
| restante | `HARD_REFUSE` (recusa firme, com ofensa) | `REFUSE` em `AGGRESSIVE` |

A resposta fica fixada: quando o alvo ganha a vez, escolhe só entre ela e `STAY_SILENT`
(simulação §10). A faixa vai para o registro e para o modelo de texto, que encena a resposta.

Quando o alvo é o jogador em `MANUAL`, a faixa registrada sai do que ele fez: `ACCEPT` em `WARM`
com intensidade ≥ 7000 → `ENTHUSIASTIC`; outro `ACCEPT` → `ACCEPT`; `REFUSE` em `AGGRESSIVE` →
`HARD_REFUSE`; outro `REFUSE` → `REFUSE`; qualquer outro ato → obrigação ignorada.

### 8.3 Efeitos da resposta

A unidade é a da resposta. "Autor" é quem fez o pedido; "alvo", quem responde.

| Pedido e resposta | No autor do pedido | No alvo |
| --- | --- | --- |
| `REQUEST` aceito | vontade de quem recebe o objeto −3, `influence` −2, `joy` +2 (+3 se `ENTHUSIASTIC`), `affection` +1 pelo alvo, `dependence` +1 pelo alvo | vontade de quem dá o objeto −1; com `MONEY` ou `ITEM`, `material_security` +1 |
| `OFFER` aceita | vontade de quem dá o objeto −3, `purpose` −2, `joy` +2 | vontade de quem recebe o objeto −3; com `MONEY` ou `ITEM`, o autor faz `material_security` +1 |
| `APOLOGIZE` aceita | `guilt` −2, `intimacy` (ao alvo) −1 | `justice` (ao autor) −2, `resentment` pelo autor −2 |
| `THREATEN` aceita (ceder) | `influence` −3 | `fear` +1, `resentment` pelo autor +2, `dignity` +2 |
| qualquer pedido recusado | `influence` +2, a vontade do pedido +1, `anger` +1, `sadness` +1; `purpose` +1 se era `OFFER` | `dignity` −1 se era `THREATEN` |
| `HARD_REFUSE` (além da linha acima) | `resentment` pelo alvo +2, `dignity` +1 | — |

Uma pergunta respondida (`TELL`) segue a linha de `TELL`; uma acusação admitida (`APOLOGIZE`) ou
negada (`REFUSE`) segue a linha do próprio ato.

## 9. Escolha do ato (dados da decisão)

### 9.1 Pré-condições dos candidatos de um NPC

| Ato | Só entra se |
| --- | --- |
| `GREET` | o autor ainda não cumprimentou o alvo nesta fatia |
| `TELL` de `SECRET` | todos os alvos estão a 1 célula (vai em `WHISPER`) e o autor tem cópia do fato |
| `ACCUSE` | o autor tem cópia de um fato em que o alvo é o ofensor |
| `REQUEST`, `OFFER` | há objeto pela regra da seção 5 |
| `APOLOGIZE` | `guilt` ≥ 2000, ou o alvo acusou o autor nesta fatia |
| `TOUCH` | alvo a 1 célula |
| `APPROACH` | alvo visível a mais de 1 célula |
| `WITHDRAW` | alvo a até 3 células |
| demais | o alvo ouviria o ato |

### 9.2 Satisfação das vontades

`satisfaction(ato, tom, vontade)` em níveis: 3 = 9000, 2 = 6000, 1 = 3000, ausente = 0. Quando
ato e tom dão níveis diferentes para a mesma vontade, vale o maior.

| Ato | Serve muito (3) | Serve (2) | Serve pouco (1) |
| --- | --- | --- | --- |
| `GREET` | — | `company` | `predictability` |
| `CHAT` | `company` | `intimacy`, `fun` | `curiosity` |
| `ASK` | `curiosity` | `predictability` | `company` |
| `TELL` | `recognition` | `company`, `influence` | `justice` (fato ruim sobre um ofensor) |
| `PRAISE` | — | `intimacy`, `care` | `influence` |
| `TEASE` | `fun` | `influence` | `justice` |
| `ACCUSE` | `justice` | `dignity` | `influence` |
| `REQUEST` | a vontade de quem recebe o objeto | — | `company` |
| `OFFER` | a vontade de quem dá o objeto | `influence` | `purpose` |
| `APOLOGIZE` | `intimacy` | `dignity` | `predictability` |
| `THREATEN` | `influence` | `physical_safety`, `justice` | — |
| `ACCEPT` (resposta) | — | a vontade que o pedido atende no alvo (perdão: `intimacy`; ceder a ameaça: `physical_safety`) | — |
| `REFUSE` (resposta) | — | `dignity` | `influence` |
| `APPROACH` | — | `company` | `desire` |
| `WITHDRAW` | `physical_safety` | — | `dignity` |
| `TOUCH` | — | `intimacy` | `care` |
| `STAY_SILENT` | — | — | — |

Somas de tom: `SEDUCTIVE` acrescenta `desire` 3; `PLAYFUL`, `fun` 2; `AGGRESSIVE`, `influence` 2 e
`justice` 2 quando o alvo é um ofensor (`justice` dirigida a ele ≥ 5000); `IRONIC`, `fun`,
`influence` e `justice` 1; `WARM`, `intimacy` 1. Sair não é escolhido aqui: é a regra de saída
(simulação §11).

### 9.3 Vieses

Cada viés soma `mulBp(fonte, peso do ato + peso do tom)` para cada linha. Nos traços, a fonte é o
traço efetivo (bipolar: um traço negativo inverte o viés). Pesos ausentes valem 0.

**Emoções do autor:**

| Emoção | Atos | Tons |
| --- | --- | --- |
| `joy` | `CHAT` +1500, `PRAISE` +1500, `GREET` +1000, `TEASE` +1000 | `WARM` +1500, `PLAYFUL` +1500, `AGGRESSIVE` −1500 |
| `sadness` | `STAY_SILENT` +1500, `TELL` +1000, `WITHDRAW` +1000 | `PLAYFUL` −1500 |
| `fear` | `WITHDRAW` +3000, `STAY_SILENT` +1500, `APOLOGIZE` +1000, `THREATEN` −3000, `ACCUSE` −2000 | `AGGRESSIVE` −2000 |
| `anger` | `ACCUSE` +3000, `THREATEN` +2000, `TEASE` +1000, `PRAISE` −2000, `APOLOGIZE` −2000 | `AGGRESSIVE` +2000, `IRONIC` +1000, `WARM` −1500 |
| `disgust` | `WITHDRAW` +2000, `TOUCH` −3000 | `IRONIC` +1000 |
| `surprise` | `ASK` +2000 | — |
| `shame` | `STAY_SILENT` +2000, `WITHDRAW` +2000, `APOLOGIZE` +1000 | — |
| `guilt` | `APOLOGIZE` +3000, `OFFER` +1500, `ACCUSE` −2000 | `WARM` +1000 |
| `jealousy` | `ACCUSE` +2000, `TEASE` +1000 | `IRONIC` +1500 |
| `boredom` | `TEASE` +1500, `CHAT` +1000, `STAY_SILENT` −1000 | `PLAYFUL` +1000 |

**Traços efetivos do autor:**

| Traço | Atos | Tons |
| --- | --- | --- |
| `humor` | `TEASE` +1000 | `PLAYFUL` +2000 |
| `romanticBoldness` | — | `SEDUCTIVE` +2500 |
| `temper` | `ACCUSE` +1000, `THREATEN` +1000 | `AGGRESSIVE` +2000 |
| `empathy` | `OFFER` +1000, `PRAISE` +500 | `WARM` +1500, `AGGRESSIVE` −1500 |
| `sociability` | `CHAT` +1000, `GREET` +1000, `STAY_SILENT` −1500 | — |
| `courage` | `THREATEN` +1000, `ACCUSE` +1000, `WITHDRAW` −1500 | — |
| `pride` | `REFUSE` +1000, `APOLOGIZE` −2000 | — |
| `selfControl` | — | `AGGRESSIVE` −1000 |
| `trustInOthers` | `TELL` +500, `ASK` +500 | `IRONIC` −500 |
| `honesty` | variante mentirosa: −3000 | — |

**Laço do autor com o alvo:**

| Eixo | Atos | Tons |
| --- | --- | --- |
| `affection` | `PRAISE` +1000, `OFFER` +1000, `TOUCH` +500, `THREATEN` −2000, `ACCUSE` −1000 | `WARM` +2000, `AGGRESSIVE` −2000 |
| `trust` | `TELL` +1000, `ASK` +500, `REQUEST` +1000 | — |
| `respect` | `ACCUSE` −1000, `TEASE` −500 | `IRONIC` −1000 |
| `attraction` | `APPROACH` +1000, `PRAISE` +1000, `TOUCH` +500 | `SEDUCTIVE` +2500 |
| `fearOf` | `WITHDRAW` +2000, `ACCUSE` −2000, `THREATEN` −2000 | `AGGRESSIVE` −2500 |
| `resentment` | `ACCUSE` +1500, `PRAISE` −1500 | `IRONIC` +1500, `AGGRESSIVE` +1500, `WARM` −1500 |
| `dependence` | `REQUEST` +1500, `REFUSE` −1000 | — |
| `closeness` | `CHAT` +500, `TELL` +500, `TOUCH` +1000 | — |

**Percepção do autor sobre o alvo:**

| Campo | Atos | Tons |
| --- | --- | --- |
| `perceivedHostility` | `WITHDRAW` +1500, `ACCUSE` +1000 | `AGGRESSIVE` +1000, `IRONIC` +1000, `WARM` −1000 |
| `perceivedInterest` | `CHAT` +1000, `PRAISE` +500 | `SEDUCTIVE` +1500, `WARM` +1000 |
| `perceivedThreat` | `WITHDRAW` +2000, `APOLOGIZE` +500 | `AGGRESSIVE` −1500 |
| `perceivedSincerity` | `TELL` +500, `REQUEST` +500 | — |

**Associações:** um tópico que se refere a uma coisa, tag ou pessoa ausente com associação de
valência `a` soma `mulBp(a, 2000)` aos candidatos `CHAT`, `TELL` e `ASK` (positiva atrai, negativa
afasta).

## 10. Sinais de traço (personalidade)

Cada ato emite sinais de traço que alimentam as tendências
([modelo de simulação](<simulation-model.md>), seção 13). Forte = ±10000; leve = ±5000.

| Ato e tom | Sinais |
| --- | --- |
| `THREATEN` ou `ACCUSE` em `AGGRESSIVE` | `temper` + forte, `courage` + leve, `empathy` − leve |
| `TEASE` em `PLAYFUL` | `humor` + forte |
| `PRAISE` ou `TOUCH` em `SEDUCTIVE`; `OFFER` de `DATE` | `romanticBoldness` + forte |
| `APOLOGIZE` | `pride` − forte, `empathy` + leve |
| `REFUSE` em `AGGRESSIVE` | `pride` + leve, `temper` + leve |
| qualquer ato com `isFalse` | `honesty` − forte |
| `TELL` de segredo alheio | `honesty` − leve, `empathy` − leve |
| `STAY_SILENT` quando devia responder; `WITHDRAW` com medo ≥ 5000 | `sociability` − leve, `courage` − leve |
| `GREET` ou `CHAT` em `WARM` | `sociability` + leve, `empathy` + leve |
| `OFFER` de `HELP` | `empathy` + forte |
| interromper alguém | `selfControl` − leve |
| responder sem `AGGRESSIVE` e com valência ≥ 0 a um ato de valência ≤ −2, estando com raiva ≥ 7000 | `selfControl` + forte |
| sair (`FAREWELL` ou `LEAVE`) com ameaça ≥ 6000 | `courage` − forte |

## 11. Da fala livre ao ato (SOM)

Quando o jogador escreve, o SOM recebe a fala, o contexto da cena e os fatos que o personagem do
jogador conhece, e responde a perguntas atômicas (detalhes em
[integração de IA](<ai-integration.md>)):

| Pergunta | Tipo | Opções |
| --- | --- | --- |
| `act` | `choice` | os 20 atos + `OTHER` |
| `tone` | `choice` | os 6 tons |
| `target` | `choice` | os presentes que ouvem + `GROUP` + `NOBODY` (vira `targets = []`) |
| `topicType` | `choice` | os 8 tipos de tópico com fala |
| `topicRef` | `choice` | entidades salientes conhecidas + `NONE` + `OTHER` |
| `object` | `choice` | os objetos + `NONE` (só vale em `REQUEST` e `OFFER`) |
| `intensity` | `score` | régua de 2 a 10 |
| `volume` | `choice` | `WHISPER`, `NORMAL`, `SHOUT` |
| `isFalse` | `noul` | "a fala afirma como verdade algo que contradiz os fatos conhecidos?" |
| `blamed` | `choice` | as pessoas conhecidas + `NONE` (só vale com `isFalse`: quem a mentira culpa) |

As 10 perguntas vão sempre na mesma chamada; respostas que não se aplicam ao ato lido são
ignoradas. `MOVE` lido com alvo vira `APPROACH`; sem alvo, a interface pede a célula no mapa e
registra a escolha como correção.

A **confiança da leitura** é a menor entre a maior probabilidade de `act` e a maior de `target`.
Abaixo de 7000 bp, ou com `act` = `OTHER`, a interface mostra a etiqueta "entendido como" para o
jogador confirmar ou corrigir (D-20). A leitura original e a correção ficam registradas.
