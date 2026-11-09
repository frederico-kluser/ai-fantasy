# Modelo de simulação — Hermeneutic Core

> **Especificação v1.1 — 2026-11-09.** As **regras** deste documento são contrato do motor. Os
> **números** (taxas, limiares, pesos) são valores iniciais e calibráveis: mudar um número exige
> teste atualizado e nota no PR, não decisão nova. Mudar uma regra exige ADR. Produto em
> [`docs/product.md`](<../product.md>); atos, tabelas de efeito e vieses em
> [atos de conversa](<dialogue-acts.md>); catálogos em [presets](<presets.md>). A v1.1 fechou as
> lacunas apontadas na revisão da v1: números da decisão e da avaliação, ordem do passo,
> movimento, luz, uso da percepção, obrigações de resposta e regras entre fatias.

## 1. Princípios

1. **O motor decide tudo.** Quem fala, o que pretende, como cada um percebe e reage, quando
   alguém vai embora: tudo sai de regras e sorteios do motor. Os modelos de IA só traduzem
   (texto → labels; labels → texto).
2. **Determinismo.** Mesma seed + mesmas entradas ⇒ mesmos eventos e mesmo hash de estado.
3. **Inteiros.** Todo valor de estado é inteiro. Escalas em *basis points* (bp).
4. **Presets.** O motor só conhece catálogos fechados (lugares, arquétipos, atos…). Texto livre
   nunca entra no estado.
5. **Maslow no centro.** As vontades seguem a pirâmide de Maslow, e necessidades de baixo, quando
   não atendidas, abafam as de cima.
6. **Tudo é recalculado a cada fala dita ou ouvida**, considerando corpo, emoções, vontades,
   laços, percepção, traços, lugar, horário, clima e quem está perto.
7. **Sem lacuna para inventar.** Se uma regra precisar de um número que não está aqui nem em
   [atos de conversa](<dialogue-acts.md>) ou [presets](<presets.md>), a tarefa para e o número
   entra primeiro na especificação, no mesmo PR, com teste.

## 2. Unidades e convenções

| Conceito | Convenção |
| --- | --- |
| Escala unipolar | inteiro `0..=10000` bp (0 = nada/bem; 10000 = máximo) |
| Escala bipolar | inteiro `-10000..=10000` bp |
| Probabilidade | inteiro em bp; sorteio uniforme `u ∈ [0, 10000)`; sucesso se `u < p` |
| Divisão | **toda divisão é inteira**, truncada em direção a zero: `div(a, b) = Math.trunc(a / b)`; nas fórmulas, `/` significa `div` |
| Multiplicação em bp | `mulBp(a, b) = div(a × b, 10000)`; fatores como "×1,5" são escritos `mulBp(x, 15000)` |
| Aproximação de um alvo | `approach(v, alvo, k) = v + div((alvo − v) × k, 10000)` |
| Volta à base | `relax(v, base, r) = base + div((v − base) × r, 10000)` |
| Limites | todo valor passa por `clamp` na faixa da sua escala ao fim de cada regra |
| Tick | **5 segundos** de ficção (`TICK_SECONDS = 5`); 12 ticks = 1 minuto |
| Relógio | `minuteOfDay = (startMinute + div(tick × 5, 60)) mod 1440` |
| Unidade de efeito | `u = mulBp(800, intensidade do ato)` (detalhes em [atos de conversa](<dialogue-acts.md>), seção 7) |

Os produtos intermediários cabem com folga em inteiros seguros do JavaScript (< 2^53). Nada de
`Math.random`, `Date.now`, `Math.pow`, `Math.exp`, trigonometria ou números quebrados no estado.
Ver [regras de desenvolvimento](<../engineering/development-rules.md>).

## 3. A fatia (cena)

Uma **fatia** é uma conversa num lugar, num intervalo de tempo, com um conjunto de pessoas. O
motor simula só a fatia; entre fatias, aplica as regras de continuidade da seção 14.

### 3.1 Lugar e grade

O lugar vem de um **preset de lugar** (ver [presets](<presets.md>)) e é uma grade `W × H`, com
no máximo 48 × 48 células. O índice de uma célula é `y × W + x`; todo desempate espacial usa o
menor índice.

| Tipo de célula | Atravessar | Visão | Fala normal |
| --- | --- | --- | --- |
| `FLOOR` (piso) | 1 tick | livre | livre |
| `ROUGH` (terreno difícil) | 2 ticks | livre | livre |
| `DOOR_OPEN` | 1 tick | livre | livre |
| `DOOR_CLOSED` | 2 ticks (abre, passa e fecha; continua fechada) | bloqueia | bloqueia |
| `WINDOW` | não | livre | alcance pela metade |
| `LOW_OBSTACLE` (mesa, balcão) | não | livre | livre |
| `WALL` | não | bloqueia | bloqueia |

- Cada célula tem duas marcas: `exit` (saída da cena; só em células atravessáveis da borda) e
  `roofed` (coberta). No preset, "exposto ao clima" **não** = todas cobertas; **sim** = nenhuma;
  **parcial** = o gabarito marca quais.
- Propriedades do lugar em bp: `danger` (perigo), `comfort` (conforto), `privacy` (privacidade),
  `noise` (ruído ambiente) e `baseTemperature` (bipolar; "clima" no preset significa 0). Além
  disso, `lit` (iluminado à noite) e `tags` (por exemplo `forest`, `water`, `dark`, `crowd`,
  `enclosed`), usadas pelas associações (5.7).
- **Distância:** Chebyshev (`max(|dx|, |dy|)`), em células.
- **Linha de visão:** supercobertura da reta entre os centros das células; `WALL` e
  `DOOR_CLOSED` bloqueiam.
- **Caminho:** menor custo em ticks pelas células atravessáveis, com vizinhança de 8 direções;
  entre caminhos de mesmo custo, o que passa pela sequência de menores índices. Uma célula
  ocupada por outro personagem conta como bloqueada.
- **Ocupação:** no máximo um personagem por célula; as posições iniciais são distintas.

### 3.2 Contexto: horário, clima e luz

**Fases do dia** por `minuteOfDay`: `DAWN` `[0, 300)`, `MORNING` `[300, 720)`, `AFTERNOON`
`[720, 1080)`, `EVENING` `[1080, 1320)`, `LATE_NIGHT` `[1320, 1440)`.

**Clima** vem de um preset: temperatura, ruído extra e efeitos (ver [presets](<presets.md>),
seção 3). A tempestade acrescenta a tag `storm` à cena.

**Luz** é um nível da cena, `DAY`, `DIM` ou `DARK`, recalculado a cada tick por
`lightLevel(fase, clima, lugar)`:

1. Base pela fase: `MORNING` e `AFTERNOON` → `DAY`; `EVENING` → `DIM`; `LATE_NIGHT` e `DAWN` →
   `DARK`.
2. Lugar com `lit` e base `DARK` → `DIM`.
3. Lugar com a tag `dark` → um nível mais escuro.
4. Clima `storm` num lugar exposto (sim ou parcial) → um nível mais escuro.

| Nível | Alcance visual |
| --- | --- |
| `DAY` | 20 células |
| `DIM` | 8 células |
| `DARK` | 3 células |

Neblina (`fog`) num lugar exposto reduz o alcance à metade (mínimo 1). Com luz `DARK`, a tag
`dark` passa a valer como presente na cena (para as associações).

**Temperatura sentida:** o alvo térmico de cada personagem é
`baseTemperature + mulBp(temperatura do clima, roofed ? 2500 : 10000)`, pela célula onde ele
está.

### 3.3 Participantes

Cada participante tem uma posição na grade e um **modo de controle**: `MANUAL` (o jogador decide
os atos) ou `AUTO` (o motor decide; vale para NPCs e para o jogador que largou o controle). Pode
haver zero ou um personagem do jogador; com zero, a cena é só observada.

## 4. O personagem

| Parte | Conteúdo | Persiste entre fatias? |
| --- | --- | --- |
| Identidade | nome, faixa etária, papel, registro de fala — **apresentação, fora do hash** | sim |
| Traços e aptidões | 5.6 | sim (mudam devagar, seção 13) |
| Tendências | sinal recente de cada traço (seção 13) | sim |
| Corpo | 5.1 | sim, com recuperação entre fatias |
| Emoções | 5.2 | não (voltam à linha de base) |
| Vontades | 5.3 | sim |
| Laços | 5.4, um registro por pessoa conhecida | sim |
| Percepção do momento | 5.5, um registro por presente | não |
| Associações | 5.7 | sim |
| Memórias | cópias de fatos (seção 12) | só as memórias marcantes |
| Obrigações, destino de movimento, contadores da fatia | seções 8, 10 e 11 | não |

## 5. Camadas de status

### 5.1 Corpo

Necessidades unipolares (0 = bem; 10000 = crítico), exceto o térmico, que é bipolar.

| Id | Nome | Variação por tick | Modificadores |
| --- | --- | --- | --- |
| `fatigue` | cansaço | +2 | `DAWN`: `mulBp(2, 20000)` = +4; `LATE_NIGHT`: `mulBp(2, 15000)` = +3; +5 por célula andada; +1 com medo ou raiva ≥ 7000 |
| `hunger` | fome | +1 | — |
| `thirst` | sede | +2 | +3 com térmico ≥ 3000 (calor) |
| `bladder` | necessidade fisiológica | +3 | — |
| `pain` | dor | −1 (recupera) | definida pela cena ou por eventos |
| `thermal` | frio (−) ↔ calor (+) | `approach(thermal, alvo, 50)` | alvo pela seção 3.2 |
| `intoxication` | alteração (álcool, febre…) | −1 | definida pela cena |

Faixas: **incômodo** ≥ 5000; **urgente** ≥ 7500; **crítico** ≥ 9000 (para o térmico, o módulo).
A **maior necessidade** é o máximo entre `fatigue`, `hunger`, `thirst`, `bladder`, `pain`,
`|thermal|` e `intoxication`. O valor inicial de cada necessidade vem do estado do dia da cena
(presets, seção 9).

### 5.2 Emoções

Intensidade unipolar.

| Id | Nome | Id | Nome |
| --- | --- | --- | --- |
| `joy` | alegria | `surprise` | surpresa |
| `sadness` | tristeza | `shame` | vergonha |
| `fear` | medo | `guilt` | culpa |
| `anger` | raiva | `jealousy` | ciúme |
| `disgust` | nojo | `boredom` | tédio |

**Linha de base** de cada personagem (calculada na geração e recalculada quando um traço
cristaliza), limitada a `0..3000`:

| Emoção | Linha de base |
| --- | --- |
| `joy` | `1000 + humor / 4 + sociability / 10` |
| `sadness` | `500 − humor / 10` |
| `fear` | `500 − courage / 10` |
| `anger` | `500 + temper / 10` |
| demais | 0 |

Os acontecimentos de história somam deslocamentos à linha de base (presets, seção 7).

**A cada tick**, primeiro o decaimento e depois os ganhos do tick (associações, tédio, corpo):

- Decaimento: `relax(v, base, 9900)` (meia-vida ≈ 69 ticks, quase 6 minutos de ficção); a
  surpresa usa 9500. O tédio não decai.
- **Tédio** (exceção): sobe +25 por tick em que o ato em andamento não interessa ao personagem e
  +50 por tick de silêncio; cai 1000 a cada ato que lhe interessa ouvido como `DIRECT`, e 2000 se
  esse ato for dirigido a ele com valência positiva. Um ato **interessa** a X quando X é alvo, o
  tópico é X, um presente com quem X tem afeto, ressentimento ou atração ≥ 5000, um alvo de vontade
  dirigida de X, uma tag ou coisa associada a X, ou um fato de que X tem cópia.

Ganhos de emoção vindos de atos entram na hora em que o ato é resolvido (seção 9).

### 5.3 Vontades (pirâmide de Maslow)

Cada vontade tem um **déficit** (0 = satisfeita; 10000 = desesperada) e um **peso** por
personagem (o quanto aquilo importa para ele). Cada personagem tem de 2 a 3 vontades
**dominantes** (peso ≥ 7000). As vontades `intimacy`, `desire`, `care` e `justice` são
**dirigidas**: têm um déficit por alvo; as demais têm um déficit só.

| Nível | Id | Nome | Como o déficit muda (por tick e por evento) |
| --- | --- | --- | --- |
| 1 Fisiológico | `physical_relief` | alívio físico | **calculado**: `clamp((maior necessidade − 5000) × 2, 0, 10000)` |
| 2 Segurança | `physical_safety` | segurança física | `approach(déficit, ameaça, 1000)` por tick (seção 6) |
| 2 Segurança | `material_security` | segurança material | eventos com objetos `MONEY` e `ITEM` e acontecimentos de história |
| 2 Segurança | `predictability` | previsibilidade | −1 por tick; +2000 ao descobrir uma mentira; + metade de cada ganho de surpresa |
| 3 Pertença | `company` | companhia | +1 por tick; em tick de silêncio, `+ (sociability + 10000) / 4000`; cai com atos de valência positiva recebidos |
| 3 Pertença | `intimacy` | intimidade (dirigida) | cai com segredo contado, toque caloroso aceito e papo que interessa com o alvo; saudade entre fatias (seção 14) |
| 3 Pertença | `desire` | desejo (dirigida) | `approach(déficit, attraction(X→Y), 500)` por tick com Y presente e visível; cai com flerte bem recebido |
| 3 Pertença | `care` | cuidado (dirigida) | `approach(déficit, aflição aparente de Y, 1000)` por tick com Y presente (abaixo) |
| 4 Estima | `recognition` | reconhecimento | sobe ao ser ignorado ou interrompido; cai com elogios |
| 4 Estima | `dignity` | dignidade | sobe com acusação, ameaça, provocação ofensiva e toque indesejado |
| 4 Estima | `influence` | influência | sobe com pedidos recusados; cai com pedidos aceitos |
| 5 Realização | `curiosity` | curiosidade | +1 por tick; cai ao ouvir fato novo e papo que interessa |
| 5 Realização | `purpose` | propósito | cai quando uma oferta sua é aceita; sobe quando é recusada |
| 5 Realização | `fun` | diversão | +2 por tick com tédio ≥ 5000; cai com provocação brincalhona que diverte |
| 5 Realização | `justice` | justiça, inclui vingança (dirigida) | sobe com ofensas de Y; cai com desculpa de Y aceita, com Y exposto ou ferido |

Os valores dos eventos (em múltiplos da unidade `u`) estão na tabela de avaliação de
[atos de conversa](<dialogue-acts.md>), seção 7. **Aflição aparente** de Y para X: a intensidade
de `apparentEmotion(X→Y)` quando ela é `fear` ou `sadness` (senão 0), mais 3000 se
`apparentState(X→Y)` tiver alguma marca; limitada a 10000.

**Precedência de Maslow.** Para cada nível `L`, seja `maxLower` o maior déficit entre as vontades
dos níveis abaixo de `L` (nas dirigidas, o maior entre os alvos). Então:

```text
suppression(L) = clamp((maxLower − 5000) × 2, 0, 10000)
effectiveWeight(v) = mulBp(weight(v), 10000 − suppression(level(v)))
```

Com o alívio físico em 7500, as vontades de cima pesam metade; em 10000, somem da decisão.

### 5.4 Laços

Registro **direcionado** (o que A sente por B), com oito eixos unipolares e rótulos. Todo par de
presentes tem um registro; desconhecidos começam perto de 0.

| Id | Nome | Id | Nome |
| --- | --- | --- | --- |
| `trust` | confiança | `attraction` | atração |
| `affection` | afeto | `fearOf` | medo de B |
| `respect` | respeito | `resentment` | ressentimento |
| `dependence` | dependência | `closeness` | proximidade (quanto se conhecem) |

Os eixos `fearOf` e `closeness` não se confundem com a emoção `fear` nem com a vontade
`intimacy`.

Rótulos (removíveis): `PARENT`, `CHILD`, `SIBLING`, `GRANDPARENT`, `GRANDCHILD`, `SPOUSE`, `EX`,
`PARTNER`, `FRIEND`, `RIVAL`, `ENEMY`, `CREDITOR`, `DEBTOR`, `MENTOR`, `APPRENTICE`, `BOSS`,
`EMPLOYEE`, `COLLEAGUE`, `NEIGHBOR`, `ACQUAINTANCE`, `STRANGER`, `CRUSH` (paixão),
`PROTECTOR`, `PROTECTED`. Rótulos familiares e de papel têm recíproca obrigatória (`PARENT` ↔
`CHILD`, `CREDITOR` ↔ `DEBTOR`, `PROTECTOR` ↔ `PROTECTED`…).

### 5.5 Percepção do momento

Registro **direcionado** do observador X sobre cada presente Y. Não persiste entre fatias.

| Id | Significado | Prévia (valor sem sinais) |
| --- | --- | --- |
| `perceivedThreat` | quanto Y parece perigoso agora | `fearOf(X→Y)` |
| `perceivedHostility` | quanto Y parece hostil a X | `resentment(X→Y) / 2 + max(0, −trustInOthers(X)) / 4` |
| `perceivedInterest` | quanto Y parece interessado em X | `(affection + attraction)(X→Y) / 4` |
| `perceivedSincerity` | quanto Y parece sincero | `5000 + (trust − resentment)(X→Y) / 2 + trustInOthers(X) / 4` |
| `apparentEmotion` | emoção que Y parece sentir (id + intensidade) — pode estar errada | nenhuma |
| `apparentState` | marcas visíveis: cansado, com frio, alterado, ferido | vazio |

Todas as prévias são limitadas a `0..10000`. Os valores mudam por sinais interpretados (seção 7)
e por atos (seção 9). A cada tick sem atualização vinda de Y, cada valor faz
`relax(v, prévia, 9800)`. A intensidade de `apparentEmotion` faz o mesmo rumo a 0 e a emoção se
apaga abaixo de 1000; as marcas de `apparentState` somem depois de 60 ticks sem confirmação.

**Onde a percepção pesa:** na ameaça (seção 6), nos vieses da decisão (seção 10), na chance de
aceitar um pedido e de acreditar numa mentira ([atos de conversa](<dialogue-acts.md>), seções 5 e
8) e no cuidado (5.3).

### 5.6 Traços e aptidões

Traços bipolares (`-10000..=10000`), estáveis, mudados só pela cristalização (seção 13):

| Id | Polo negativo ↔ positivo | Id | Polo negativo ↔ positivo |
| --- | --- | --- | --- |
| `courage` | medroso ↔ corajoso | `empathy` | frio ↔ empático |
| `trustInOthers` | desconfiado ↔ crédulo | `pride` | humilde ↔ orgulhoso |
| `temper` | calmo ↔ explosivo | `honesty` | mentiroso ↔ honesto |
| `sociability` | reservado ↔ expansivo | `humor` | sério ↔ brincalhão |
| `selfControl` | impulsivo ↔ contido | `romanticBoldness` | recatado ↔ galanteador |

Aptidões unipolares: `perceptiveness` (perspicácia: ler sinais e intenções), `eloquence`
(eloquência: convencer, seduzir, ferir com palavras) e `memory` (lembrar fatos com fidelidade).

Toda regra usa o **traço efetivo** (seção 13). Fatores de traço sobre ganhos de emoção:

| Ganho | Fator |
| --- | --- |
| raiva | `mulBp(ganho, 10000 + temper / 2)` |
| medo | `mulBp(ganho, 10000 − courage / 2)` |
| culpa | `mulBp(ganho, 10000 + honesty / 2)` |

`selfControl` reduz a emissão de sinais (seção 7) e a aleatoriedade da escolha (seção 10);
`trustInOthers` puxa as prévias da percepção e a leitura de atos e sinais ambíguos.

### 5.7 Associações: medos e apegos

Valência bipolar de um personagem com uma **tag** (`forest`, `water`, `dark`, `crowd`,
`storm`…), uma **coisa** (um objeto ou tópico) ou uma **pessoa ausente**. **Tags presentes** são
as tags do lugar, mais `storm` com tempestade e `dark` com luz `DARK`.

- Associação negativa com uma tag presente: `mulBp(|valência|, 5000)` na ameaça (seção 6) e +20
  de medo por tick. **Exemplo do produto:** quem tem medo da floresta sente mais as ameaças lá e
  a própria segurança cai.
- Associação positiva com uma tag presente: `−mulBp(valência, 3000)` na ameaça e +10 de alegria
  por tick.
- Associação com uma coisa ou pessoa ausente vira tópico preferido (valência positiva) ou evitado
  (negativa) nas conversas ([atos de conversa](<dialogue-acts.md>), seção 9.3).

## 6. Contexto e presença

A cada tick, o motor calcula para cada personagem `X` um **nível de ameaça** (0..10000), que
alimenta o déficit de `physical_safety`:

```text
threat(X) = clamp(
    danger(lugar) / 2
  + Σ tags presentes com associação negativa de X:  mulBp(|valência|, 5000)
  − Σ tags presentes com associação positiva de X:  mulBp(valência, 3000)
  + 1000 se a luz é DARK
  + Σ presentes Y:  mulBp(max(fearOf, resentment, perceivedThreat)(X→Y), proximity(d)) / 2
  − Σ presentes Y:  mulBp((trust + affection)(X→Y) / 2, proximity(d)) / 4
  − mulBp(comfort(lugar), 2000)
, 0, 10000)
```

`proximity(d)`, por distância em células e só se X vê ou ouve Y: `d ≤ 1` → 10000; `d ≤ 3` →
7000; `d ≤ 6` → 4000; `d ≤ 12` → 2000; acima disso ou sem percepção → 0.

**Exemplo do produto:** um filho com confiança 8000, afeto 9000 e nenhum medo do pai reduz a
própria ameaça em 2125 com o pai ao lado (`d ≤ 1`) e só em 425 com o pai do outro lado do salão
(`d ≤ 12`). Quem teme esse pai sente o oposto.

Outros efeitos de contexto:

- **Horário:** em `LATE_NIGHT` e `DAWN`, +1500 na vontade de ir embora (seção 11).
- **Clima:** chuva ou tempestade com o personagem numa célula descoberta somam +1000 à vontade de
  ir embora; o clima muda o alvo térmico (3.2).
- **Ruído:** `noise` do lugar mais o ruído do clima (limitado a 10000) reduz o alcance da fala
  normal (8.2).

## 7. Sinais e transparência

O estado de cada personagem **transparece** em sinais que os outros podem perceber. Vale também
para o personagem do jogador.

| Causa | Intensidade usada |
| --- | --- |
| `fear`, `sadness`, `anger`, `disgust`, `shame`, `guilt`, `jealousy`, `joy`, `boredom` | a emoção |
| `attraction` | maior `attraction(X→Y)` entre os presentes que X vê |
| `lying` | 7000 durante os ticks de um ato próprio com `isFalse`; 0 fora deles |
| `cold` | `max(0, −thermal)` |
| `fatigue`, `pain`, `intoxication` | a necessidade do corpo |

| Sinal | Canal | Causas possíveis |
| --- | --- | --- |
| `tremor` | visual | `fear`, `cold` |
| `shakyVoice` | vocal | `fear`, `sadness` |
| `avertedGaze` | visual | `shame`, `guilt`, `fear`, `lying` |
| `stepBack` | visual | `fear`, `disgust` |
| `clenchedFists` | visual | `anger` |
| `raisedVoice` | vocal | `anger`, `joy` |
| `blush` | visual | `shame`, `attraction`, `anger` |
| `fixedStare` | visual | `anger`, `jealousy`, `attraction` |
| `lowGaze` | visual | `shame`, `sadness` |
| `nervousLaugh` | vocal | `shame`, `fear` |
| `smile` | visual | `joy`, `attraction` |
| `laugh` | vocal | `joy` |
| `quietVoice` | vocal | `sadness`, `fatigue` |
| `tears` | visual | `sadness`, `joy` |
| `grimace` | visual | `disgust`, `pain` |
| `yawn` | visual | `fatigue`, `boredom` |
| `slump` | visual | `fatigue`, `sadness` |
| `slurredSpeech` | vocal | `intoxication`, `fatigue` |

**Emissão** (stream `signal`). A cada tick, para cada causa com intensidade `i ≥ 5000` e cada
sinal ligado a ela:

```text
p = clamp(mulBp(clamp((i − 5000) × 2, 0, 10000), 10000 − selfControl / 2), 0, 10000)
```

`selfControl = +10000` emite metade; `−10000` emite 50% a mais (até o limite). Um sinal emitido
por mais de uma causa no mesmo tick sai uma vez só, com a causa de maior intensidade como causa
verdadeira (empate: a primeira da lista do sinal).

**Notar** (stream `perception`). Sinais visuais exigem linha de visão e alcance visual; vocais
exigem estar no alcance da fala normal (8.2). Chance:

```text
notice = clamp(7000 + perceptiveness / 5, 0, 9500)
       − 2000 se fatigue ≥ 7500 ou intoxication ≥ 5000
       − 1000 × faixas de distância acima de 3 células   (4–6: 1; 7–12: 2; mais: 3)
```

**Interpretar** (stream `perception`). Quem nota sorteia uma causa entre as possíveis do sinal,
com pesos:

| Peso | Valor |
| --- | --- |
| base de cada causa possível | 10000 |
| causa verdadeira | `+ perceptiveness` |
| `cold` com alvo térmico do emissor ≤ −2000 | `mulBp(peso, 20000)` |
| `fatigue` em `DAWN` ou `LATE_NIGHT` | `mulBp(peso, 20000)` |
| causas ameaçadoras (`anger`, `disgust`, `jealousy`, `lying`) | `mulBp(peso, 10000 − trustInOthers / 2)` e, se o observador tem `resentment` ou `fearOf` ≥ 5000 pelo emissor, mais `mulBp(peso, 15000)` |

A causa escolhida atualiza a percepção do observador sobre o emissor — e **pode estar errada**,
que é de onde vêm os mal-entendidos:

| Causa interpretada | Efeito na percepção |
| --- | --- |
| `anger` | `perceivedHostility` +1500, `perceivedThreat` +1000 |
| `disgust` | `perceivedHostility` +1000 |
| `jealousy` | `perceivedHostility` +500 |
| `lying` | `perceivedSincerity` −1500 |
| `attraction` | `perceivedInterest` +1500 |
| `joy` | `perceivedInterest` +500 |
| `boredom` | `perceivedInterest` −1000 |
| `cold`, `fatigue`, `pain`, `intoxication` | marca correspondente em `apparentState` |

Toda causa que é emoção também vira `apparentEmotion` com intensidade 6000.

## 8. Atos, escuta e interpretação

### 8.1 O ato

Cada ação é um **ato** com ato × tom × tópico e valores. Catálogo, custos e efeitos em
[atos de conversa](<dialogue-acts.md>). Um ato custa ticks; durante esses ticks o mundo da fatia
avança (corpo, emoções, sinais, movimentos).

**Movimento.** `MOVE`, `APPROACH`, `WITHDRAW`, `LEAVE` e `FAREWELL` (de quem está saindo) custam
1 tick e definem um **destino**. O deslocamento acontece nos ticks seguintes, em paralelo aos
atos dos outros: 1 célula por tick (2 ticks em `ROUGH` e `DOOR_CLOSED`), pelo caminho de menor
custo, recalculado a cada tick. Se o próximo passo está ocupado, o personagem espera aquele tick.

| Ato | Destino |
| --- | --- |
| `MOVE` | a célula escolhida |
| `APPROACH` | a célula livre a distância 1 do alvo mais perto do personagem; para ao chegar a `d ≤ 1` |
| `WITHDRAW` | a célula livre mais perto do personagem com distância ≥ 4 do alvo (sem nenhuma, a mais distante alcançável) |
| `LEAVE` / `FAREWELL` de saída | a célula `exit` alcançável mais perto; ao chegar, o personagem deixa a fatia |

Sem caminho até o destino, o ato acontece (o personagem tenta) mas ninguém se move; uma saída sem
caminho é cancelada.

### 8.2 Quem ouve

| Volume | Alcance (células) | Paredes e portas |
| --- | --- | --- |
| `WHISPER` (sussurro) | 1 | bloqueado por qualquer bloqueio de visão |
| `NORMAL` | `max(3, 8 − ruído / 2000)` | `WALL` e `DOOR_CLOSED` bloqueiam; `WINDOW` reduz o alcance à metade |
| `SHOUT` (grito) | 30 | `WALL` reduz o alcance à metade; atravessa portas |

Cada presente recebe uma **perspectiva** do ato:

| Perspectiva | Quando | O que sabe |
| --- | --- | --- |
| `DIRECT` | dentro do alcance | tudo |
| `FRAGMENT` | além do alcance, até o dobro dele, com chance 3000 (5000 para sussurro a 2 células), stream `perception` | que houve o ato, quem fez e para quem; não o tópico |
| `SEEN` | não ouviu, mas vê quem agiu | quem fez e para quem; num ato sem fala, o ato inteiro |
| nenhuma | o resto | nada |

Só quem recebe `DIRECT` sofre as consequências completas do ato (seção 9). `FRAGMENT` e `SEEN`
geram cópia do fato (seção 12) e, num ato de valência ≤ −2, `perceivedHostility` +500 sobre o
autor.

### 8.3 Interpretação

Cada ouvinte `DIRECT` interpreta o ato. O tom pode ser **lido errado**: a chance vem da
ambiguidade do tom, da distância, do ruído, da perspicácia, da desconfiança e do laço com o autor
(fórmula em [atos de conversa](<dialogue-acts.md>), seção 3). Um tom `IRONIC` dito por alguém de
quem se desconfia tende a ser lido como `AGGRESSIVE`; um `PLAYFUL` dito por um amigo tende a ser
lido certo. A interpretação, não o ato real, gera as consequências para aquele ouvinte; o ato
real fica no registro.

## 9. Consequências (avaliação emocional)

Para cada ouvinte `DIRECT`, em ordem de id, o ato interpretado gera, nesta ordem (os **alvos**
recebem a linha inteira da tabela de avaliação; os demais ouvintes `DIRECT`, só as regras de
testemunha de [atos de conversa](<dialogue-acts.md>), seção 7.4):

1. **Emoções:** deltas da tabela de avaliação, em múltiplos da unidade `u`, com os
   multiplicadores do tom e os fatores de traço (5.6).
2. **Laços com quem agiu:** deltas em meias unidades, limitados a ±1500 por eixo por ato
   (`BOND_DELTA_CAP`).
3. **Vontades:** deltas de déficit da tabela de avaliação.
4. **Percepção do momento** sobre o autor: valência ≤ −1 → `perceivedHostility`
   `+ 1000 × |valência|`; valência ≥ 1 com o ouvinte entre os alvos → `perceivedInterest`
   `+ 500 × valência`; `THREATEN` → `perceivedThreat` +2000.
5. **Obrigação de resposta** e, nos pedidos, **faixa de resultado** (seção 10 e
   [atos de conversa](<dialogue-acts.md>), seção 8).

Depois, os efeitos **em quem agiu** (culpa por mentir, por ferir quem se ama; alívio de justiça
por ferir um ofensor) e, se houve, os efeitos da **interrupção** (seção 11). Tabelas, unidade,
multiplicadores e pedidos estão em [atos de conversa](<dialogue-acts.md>), seções 5, 7 e 8.

## 10. Decisão: escolher o ato

Quando um personagem em modo `AUTO` ganha a vez:

1. **Obrigação primeiro.** Se ele deve uma resposta, só entram como candidatos as **respostas
   possíveis** (com bônus `OBLIGATION_BONUS = 4000` na utilidade) e `STAY_SILENT` (ignorar, que
   tem custo social):

   | Ato recebido | Respostas possíveis |
   | --- | --- |
   | `ASK` | `TELL` sobre o tópico perguntado (pode ser mentira); `REFUSE` (não responder) |
   | `ACCUSE` | `APOLOGIZE` (admitir); `REFUSE` (negar, com `isFalse` se a acusação for verdadeira); `ACCUSE` de volta ao autor |
   | `REQUEST`, `OFFER`, `APOLOGIZE`, `THREATEN` | **a resposta fixada pela faixa sorteada** ([atos de conversa](<dialogue-acts.md>), seção 8) |

   Sem obrigação, seguem os passos 2 a 4.
2. **Candidatos.** Combinações de ato × alvo × tom × tópico, com os valores, montadas assim:
   - **Atos:** os 20 menos `MOVE`, `ACCEPT`, `REFUSE`, `FAREWELL` e `LEAVE` (estes cinco só
     aparecem como resposta ou pela regra de saída), respeitando as pré-condições de
     [atos de conversa](<dialogue-acts.md>), seção 9.1.
   - **Alvos:** cada presente que ouviria o ato (`NORMAL`, ou `SHOUT` se só assim ouviria);
     `GROUP` em `GREET`, `CHAT` e `TELL` quando há dois ou mais ouvintes; para `TOUCH`, só quem
     está a 1 célula; para `APPROACH`, quem está visível e a mais de 1 célula; para `WITHDRAW`,
     quem está a até 3 células.
   - **Tons:** os 3 de maior viés para aquele ato e alvo (seção 9.3 de atos de conversa); empate
     pela ordem `WARM`, `NEUTRAL`, `PLAYFUL`, `SEDUCTIVE`, `IRONIC`, `AGGRESSIVE`.
   - **Tópicos salientes**, por alvo (até 4, nesta ordem, sem repetir): o tópico do último ato
     dirigido a ele; o alvo de uma vontade dominante dirigida; o fato de maior importância de que
     ele tem cópia envolvendo um presente; um sentimento (`FEELING`) se afeto, atração ou
     ressentimento pelo alvo ≥ 6000; o próprio alvo (`PERSON`); uma coisa ou tag associada
     presente; `SMALL_TALK`. Cada ato usa só os tipos de tópico que aceita (atos de conversa,
     seção 4).
   - **Valores:** intensidade, volume, mentira e objeto pelas regras de
     [atos de conversa](<dialogue-acts.md>), seção 5.
3. **Utilidade** (inteiro) de cada candidato:

   ```text
   U = Σ_vontades mulBp(mulBp(effectiveWeight(v), deficit(v)), satisfaction(ato, tom, v))
     + viés das emoções + viés dos traços + viés do laço com o alvo
     + viés da percepção do alvo + viés das associações do tópico
     + Σ vontades dominantes dirigidas ao alvo com satisfaction ≥ 6000:  mulBp(deficit(v, alvo), 2000)
     − 1500 × repetições do mesmo ato e tópico entre os últimos 6 atos do próprio personagem
   ```

   - Nas vontades dirigidas, `deficit(v)` é o déficit dirigido ao alvo do candidato (0 em
     `GROUP` e sem alvo).
   - `satisfaction(ato, tom, v)` está na seção 9.2 de atos de conversa; os vieses, na seção 9.3.
   - Em `GROUP`, o viés do laço e o da percepção são a média (truncada) entre os alvos.
4. **Escolha** (stream `choice`). Os 5 melhores candidatos (`TOP_K`; empate pela ordem de
   geração) entram num sorteio ponderado:

   ```text
   w = min(U − U_min5 + 1, 10000)          // U_min5 = menor U entre os 5
   selfControl ≥ 3000:   w = w × w          // escolha mais previsível
   selfControl ≤ −3000:  w = w + 2000       // mais impulsivo
   ```

   O total dos pesos fica abaixo de 2^31.

O personagem do jogador em `AUTO` usa exatamente a mesma regra. Em `MANUAL`, o motor nunca escolhe
atos por ele.

**Obrigações.** Um ato `ASK`, `ACCUSE`, `REQUEST`, `OFFER`, `APOLOGIZE` ou `THREATEN` dirigido a
alguém (não em `GROUP` nem sem alvo) cria, para cada alvo que o ouviu como `DIRECT`, uma
obrigação de resposta. Ela acaba quando o alvo age: se o ato for uma resposta possível, foi
respondida; senão, foi ignorada. Também é ignorada se passarem `OBLIGATION_TTL_TICKS = 12` ticks
sem resposta. Ignorar tem os efeitos de `STAY_SILENT` devido (atos de conversa, seção 7).

## 11. Vontade de agir, turnos, silêncio e saída

Em cada **ponto de decisão** (fim de um ato ou de um tick de silêncio), na ordem da seção 16:

1. **Saída.** Para cada personagem em `AUTO` que não está saindo:

   ```text
   leave = max(0, maior necessidade do corpo − 5000)
         + max(0, ameaça − 6000)
         + max(0, boredom − 6000)
         + 1500 se o horário é LATE_NIGHT ou DAWN
         + 1000 se está numa célula descoberta com chuva ou tempestade
         + 3000 se cumpriu ou perdeu de vez o objetivo da cena
   stay  = mulBp(company, 3000)
         + mulBp(maior desire dirigido a um presente, 4000)
         + mulBp(curiosity, 2000)
         + 3000 se deve uma resposta
   ```

   - Cumprir o objetivo: uma vontade dominante dirigida a um presente caiu abaixo de 1000 nesta
     fatia. Perder de vez: um pedido dele a esse presente recebeu `HARD_REFUSE`.
   - Se `leave − stay ≥ 3000` (`LEAVE_MARGIN`), sorteia-se a saída no stream `leave` com
     `p = clamp((leave − stay) × 2, 0, 9500)`.
   - Maior necessidade do corpo ≥ 9000 força a saída de um NPC, sem sorteio.
   - O personagem do jogador em `MANUAL` nunca sai sozinho: recebe aviso e emite sinais.
   - Quem decide sair age imediatamente, antes do sorteio da vez: faz `FAREWELL` se agiu ou
     recebeu um ato nos últimos 12 ticks, senão `LEAVE`. Daí em diante caminha até a saída e não
     disputa mais a vez.
2. **Vontade de agir** de cada presente que não está saindo:

   ```text
   urge = 2000 + (sociability + 10000) × 3000 / 20000
        + 4000 se o último ato foi dirigido a ele (+1000 se lhe deixou uma obrigação)
        + mulBp(maior emoção, 3000)
        + mulBp(pressão social, 2000)
        + min(ticks de silêncio × 50, 3000) × (sociability + 10000) / 20000
        − max(0, fatigue − 5000) / 2
   ```

   **Pressão social** = maior `mulBp(effectiveWeight(v), deficit(v))` entre as vontades dos
   níveis 3 a 5 (nas dirigidas, o maior entre os alvos presentes).
3. **Quem age:** se o jogador pediu a vez (`TAKE_TURN`), é ele. Senão, entre quem tem
   `urge ≥ 4000` (`URGE_THRESHOLD`), sorteio ponderado pela vontade no stream `turn`. Se ninguém
   passa do limiar, há **um tick de silêncio**: o tédio sobe (5.2), a companhia sobe para os
   expansivos (5.3) e o contador de silêncio cresce. Qualquer ato zera o contador.
4. **Interrupção:** se há uma obrigação pendente do último ato e quem age não é o devedor nem o
   autor desse ato, o ato é marcado como interrupção: o devedor sofre raiva `+1u` (com o fator de
   `temper`), `recognition` `+1u` e `respect` pelo interruptor `−1` meia unidade; o interruptor
   recebe o sinal de traço `selfControl` − leve. A obrigação continua até vencer.
5. **Jogador:** se quem age é o personagem do jogador em `MANUAL`, o motor **pausa e espera** a
   entrada (o mundo espera). Em qualquer ponto de decisão o jogador também pode tomar a vez; se
   alguém devia uma resposta, isso conta como interrupção.
6. **Fim da fatia:** quando resta uma pessoa ou menos (quem está saindo conta até chegar à
   saída), ou após 60 ticks seguidos de silêncio (`SILENCE_END_TICKS`, "a conversa morreu").

## 12. Memória, fatos e perspectiva

- Cada ato vira um **fato** no registro: `id`, tick, autor, ato, tom, tópico, alvos, volume,
  faixa de resultado e marca de mentira. Acontecimentos da história gerada (presets) entram como
  fatos anteriores à primeira fatia.
- Cada personagem guarda **cópias** dos fatos que percebeu, com perspectiva e **fidelidade**
  inicial:

  | Perspectiva | Fidelidade inicial |
  | --- | --- |
  | `DIRECT` | 10000 |
  | `FRAGMENT` | 5000 |
  | `SEEN` | 3000 |
  | `TOLD` (alguém contou) | `mulBp(fidelidade da cópia de quem contou, 8000)` |

- **`TOLD`:** quando um `TELL` tem como tópico um fato (`EVENT`, `SECRET` ou `RUMOR`), cada
  ouvinte `DIRECT` que não tem cópia desse fato ganha uma cópia `TOLD`. Se o `TELL` for mentira e
  o ouvinte acreditar, a cópia guarda a versão falsa (marcada no estado, invisível para o
  personagem); recontada, a falsidade se espalha.
- **Importância** de um fato para um personagem:

  ```text
  importance = clamp(Σ |deltas de emoção| + 2 × Σ |deltas de laço| + 3000 se é autor, alvo ou tópico, 0, 10000)
  ```

  Cópias com importância ≥ 6000 (`MEMORY_IMPORTANCE`) são **memórias marcantes**: só elas
  persistem entre fatias, até 50 por personagem (`MEMORIES_MAX`; sai a de menor importância,
  empate pelo fato mais antigo).
- Contar de novo um fato devolve a cópia de quem conta à maior fidelidade que ela já teve.
- **Ninguém cita o que não sabe:** o pacote enviado ao modelo de texto só leva fatos de que o
  falante tem cópia (ver [integração de IA](<ai-integration.md>)).

## 13. Personalidade que muda

1. Cada ato escolhido emite **sinais de traço** (tabela em
   [atos de conversa](<dialogue-acts.md>), seção 10): forte = ±10000; leve = ±5000.
2. A **tendência** de cada traço sinalizado no ato segue o sinal, com mais peso para o imediato:
   `tend ← tend + (sinal − tend) × 1000 / 10000`. Traços não sinalizados no ato não mudam.
3. O **traço efetivo** usado em todas as regras é `clamp(trait + mulBp(tend, 3000), −10000,
   10000)`: o comportamento recente colore a personalidade de agora.
4. **Contador de cristalização** por traço: a cada ato do personagem, se `|tend| ≥ 6000`, soma 1
   e anota a fatia; se a tendência muda de sinal ou cai abaixo de 6000, zera o contador e as
   fatias anotadas.
5. **Cristalização**, avaliada só no fim de cada fatia (`endSlice`): com contador ≥ 30 e pelo
   menos 2 fatias anotadas, o traço anda 500 bp na direção da tendência, as linhas de base das
   emoções são recalculadas e o contador recomeça. É assim que um padrão mantido vira
   característica fixa.

Só sinais fortes levam a tendência a 6000 (com 9 atos seguidos); sinais leves param em 5000 e
não cristalizam.

## 14. Entre uma fatia e outra

O usuário escolhe o intervalo até a próxima fatia: um número inteiro de horas
(`TimeGap = { hours, together }`), em que `together` lista os grupos de personagens que passaram o
intervalo juntos. `days = hours / 24`. As regras diárias se aplicam `days` vezes, uma a uma, em
inteiros:

- **Corpo:** volta aos valores do estado `rested` (presets, seção 9), salvo o que a nova cena
  definir.
- **Emoções:** voltam à linha de base.
- **Saudade:** para cada par que não passou o intervalo junto, se `closeness` ou `affection`
  ≥ 6000, a vontade `intimacy` dirigida ao outro sobe +500 por dia.
- **Vingança:** `justice` dirigida faz `−mulBp(déficit, 1000)` por dia.
- **Memória:** a fidelidade de cada memória marcante faz `−mulBp(fidelidade, 100 − memory / 200)`
  por dia (de 1% a 0,5% ao dia, conforme a aptidão `memory`).
- **Tendências:** `−mulBp(tend, 1000)` por dia.
- Percepção, obrigações, contadores da fatia e cópias não marcantes são descartados.

## 15. Aleatoriedade, replay e forçar caminho

- **Gerador:** `sfc32` (32 bits, estado de 4 palavras, só `Math.imul`, `|`, `^`, `>>>`). As 4
  palavras iniciais de cada stream vêm de `splitmix32` a partir de `hash32(seed, nome)`, e as 12
  primeiras saídas são descartadas.
- **`hash32(seed, nome)`:** FNV-1a de 32 bits sobre os bytes UTF-8 de `"<seed>:<nome>"`.
- **Streams:** uma por finalidade — `generation`, `turn`, `choice`, `signal`, `perception`,
  `resolution`, `leave`. A seed do elenco alimenta só `generation`; a seed da cena alimenta as
  demais. Assim se varia uma sem mexer na outra.
- **Sorteio sem viés:** `draw(stream, bound)`, com `0 < bound ≤ 2^31`, usa rejeição para entregar
  um inteiro uniforme em `[0, bound)`. `drawChance(p)` é `draw(stream, 10000) < p`;
  `drawWeighted(pesos)` sorteia pelo total.
- **Registro:** todo sorteio entra no registro da sessão com número de sequência, tick, stream,
  finalidade, limite, valor, probabilidade (se houver) e resultado.
- **Forçar caminho (testes):** o inspetor pode forçar o resultado de um sorteio identificado
  (por sequência ou por finalidade e alvo) ou ligar o modo "mais provável" (`MOST_LIKELY`), que
  resolve cada sorteio pelo resultado de maior probabilidade (empate: o menor índice). Forçar é
  uma **entrada** registrada e reproduzível.
- **Hash do estado:** FNV-1a de 64 bits (com `BigInt`) sobre a serialização canônica do estado
  (chaves ordenadas, só inteiros e strings), em 16 dígitos hexadecimais. Não é criptográfico; só
  confere o replay.
- **Replay exato:** seed + versões (motor e presets) + cena + entradas (atos do jogador, respostas
  do SOM, correções, sorteios forçados, trocas de modo de controle) + falas do modelo de texto
  gravadas reproduzem a sessão. O hash do estado é conferido a cada passo.

## 16. O passo do motor (ordem de execução)

Esta ordem é normativa. Desempates por id crescente do personagem. Cada chamada de `step`
resolve **um ponto de decisão**:

1. **Entrada:** aplicar a entrada recebida (`SET_CONTROL`, `FORCE_DRAW` e `SET_DRAW_MODE` mudam o
   estado; `TAKE_TURN` marca o jogador como próximo a agir; `PLAYER_ACT` é o ato do jogador que
   estava sendo aguardado e vai direto ao passo 6).
2. **Obrigações vencidas** viram ignoradas (seção 10).
3. **Saídas** (seção 11, item 1): quem decide sair age agora e pula para o passo 6.
4. **Quem age** (seção 11, itens 2 e 3) ou um tick de silêncio (vai ao passo 7 com 1 tick).
5. **Jogador em `MANUAL`:** devolver `awaiting` e parar.
6. **Resolver o ato** — o de saída (passo 3), o do jogador (`PLAYER_ACT`) ou o escolhido pela
   seção 10 para quem está em `AUTO`: validar; marcar interrupção; ouvintes e perspectivas; interpretação; consequências (seção 9); obrigação e
   faixa de resultado; fatos e cópias; tendências de quem agiu (seção 13); destino de movimento.
7. **Avançar os ticks** do custo do ato (ou o tick de silêncio). Em cada tick, nesta ordem, para
   todos os presentes:
   1. movimento de quem tem destino (8.1), com cansaço por célula andada;
   2. corpo (5.1), incluindo o alvo térmico pela célula;
   3. emoções: decaimento, depois ganhos do tick (associações, tédio, corpo) (5.2);
   4. luz, tags presentes, ameaça (seção 6) e vontades (5.3);
   5. sinais: emissão de todos, depois notar e interpretar de cada observador, depois `relax` da
      percepção sem atualização (seção 7 e 5.5);
   6. chegada à saída: quem alcança a célula `exit` deixa a fatia.
8. **Fim da fatia** (seção 11, item 6).
9. **Eventos e hash:** emitir `ActResolved`, `SignalPerceived`, `StatusChanged`, `Silence`,
   `CharacterLeft`, `SceneEnded` e `RenderRequested` (um por ato de fala, com os dados simbólicos
   para o pacote de encenação), e atualizar o hash.

## 17. Constantes iniciais

| Constante | Valor | Seção |
| --- | --- | --- |
| `TICK_SECONDS` | 5 | 2 |
| `GRID_MAX` | 48 | 3.1 |
| `VISION_DAY` / `VISION_DIM` / `VISION_DARK` | 20 / 8 / 3 | 3.2 |
| `ROOFED_WEATHER_SHARE` | 2500 | 3.2 |
| `DISCOMFORT` / `URGENT` / `CRITICAL` | 5000 / 7500 / 9000 | 5.1 |
| `EMOTION_DECAY` / `SURPRISE_DECAY` | 9900 / 9500 por tick | 5.2 |
| `EMOTION_BASELINE_MAX` | 3000 | 5.2 |
| `BOREDOM_RATE` / `BOREDOM_SILENCE_RATE` | 25 / 50 por tick | 5.2 |
| `BOREDOM_RELIEF` / `BOREDOM_RELIEF_ADDRESSED` | 1000 / 2000 | 5.2 |
| `DOMINANT_DRIVE_WEIGHT` | 7000 | 5.3 |
| `PERCEPTION_RELAX` | 9800 por tick | 5.5 |
| `APPARENT_EMOTION_INTENSITY` | 6000 | 7 |
| `EFFECT_UNIT_MAX` | 800 | 2 |
| `BOND_DELTA_CAP` | 1500 por eixo por ato | 9 |
| `OBLIGATION_BONUS` / `OBLIGATION_TTL_TICKS` | 4000 / 12 | 10 |
| `TONES_PER_ACT` / `TOPICS_MAX` / `TOP_K` | 3 / 4 / 5 | 10 |
| `REPEAT_PENALTY` / `REPEAT_WINDOW` | 1500 / 6 atos | 10 |
| `GOAL_BONUS` | 2000 | 10 |
| `URGE_THRESHOLD` | 4000 | 11 |
| `LEAVE_MARGIN` | 3000 | 11 |
| `SILENCE_END_TICKS` | 60 | 11 |
| `WITHDRAW_DISTANCE` | 4 | 8.1 |
| `MEMORY_IMPORTANCE` / `MEMORIES_MAX` | 6000 / 50 | 12 |
| `TOLD_FIDELITY` | 8000 | 12 |
| `TENDENCY_RATE` / `TENDENCY_WEIGHT` | 1000 / 3000 | 13 |
| `CRYSTAL_THRESHOLD` / `CRYSTAL_ACTS` / `CRYSTAL_SLICES` / `CRYSTAL_STEP` | 6000 / 30 / 2 / 500 | 13 |

## 18. Invariantes testáveis

Cada uma vira teste (unitário ou de propriedade) no pacote do motor:

1. Mesma seed e mesmas entradas ⇒ mesma lista de eventos e mesmo hash, em qualquer máquina.
2. Depois de qualquer passo, todo valor está dentro da faixa da sua escala.
3. O estado não contém texto livre; nomes e premissa ficam no registro de apresentação, fora do
   hash.
4. Se X não tem medo, ressentimento nem ameaça percebida por Y (`fearOf`, `resentment` e
   `perceivedThreat` = 0) e tem confiança e afeto ≥ 6000 por Y, a ameaça de X com Y a 1 célula é
   menor ou igual à ameaça com Y a 12 células, com Y percebido nas duas posições (o exemplo do
   pai).
5. Um sussurro nunca chega como `DIRECT` a quem está a mais de 1 célula; paredes bloqueiam a
   fala normal.
6. Aumentar um déficit de nível baixo nunca aumenta o peso efetivo de uma vontade de nível alto.
7. Um NPC com necessidade do corpo crítica sai da cena em número finito de pontos de decisão,
   se houver caminho até uma saída.
8. Forçar um sorteio muda só aquele resultado e o que dele decorre, e o replay com o mesmo
   sorteio forçado é idêntico.
9. O personagem do jogador em `MANUAL` nunca recebe um ato escolhido pelo motor.
10. Nenhuma saída de modelo de IA altera o estado sem passar por um ato ou preset validado.
11. Nenhum personagem ocupa célula não atravessável, e nunca há dois personagens na mesma célula.
12. Toda obrigação de resposta termina (respondida ou ignorada) em no máximo 12 ticks.
