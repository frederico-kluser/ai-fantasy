# Modelo de simulação — Hermeneutic Core

> **Especificação v1 — 2026-11-09.** As **regras** deste documento são contrato do motor. Os
> **números** (taxas, limiares, pesos) são valores iniciais e calibráveis: mudar um número exige
> teste atualizado e nota no PR, não decisão nova. Mudar uma regra exige ADR. Produto em
> [`docs/product.md`](<../product.md>); atos em [atos de conversa](<dialogue-acts.md>); catálogos
> em [presets](<presets.md>).

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

## 2. Unidades e convenções

| Conceito | Convenção |
| --- | --- |
| Escala unipolar | inteiro `0..=10000` bp (0 = nada/bem; 10000 = máximo) |
| Escala bipolar | inteiro `-10000..=10000` bp |
| Probabilidade | inteiro em bp; sorteio uniforme `u ∈ [0, 10000)`; sucesso se `u < p` |
| Tick | **5 segundos** de ficção (`TICK_SECONDS = 5`); 12 ticks = 1 minuto |
| Relógio | `minuteOfDay = (startMinute + floor(tick × 5 / 60)) mod 1440` |
| Multiplicação em bp | `mulBp(a, b) = trunc(a × b / 10000)` |
| Aproximação de um alvo | `v ← v + trunc((alvo − v) × k / 10000)` |
| Limites | todo valor passa por `clamp` na faixa da sua escala ao fim de cada regra |

Nada de `Math.random`, `Date.now`, `Math.pow`, `Math.exp`, trigonometria ou números quebrados no
estado. Ver [regras de desenvolvimento](<../engineering/development-rules.md>).

## 3. A fatia (cena)

Uma **fatia** é uma conversa num lugar, num intervalo de tempo, com um conjunto de pessoas. O
motor simula só a fatia; entre fatias, aplica as regras de continuidade da seção 14.

### 3.1 Lugar e grade

- O lugar vem de um **preset de lugar** (ver [presets](<presets.md>)) e é uma grade `W × H`, com
  no máximo 48 × 48 células.
- Cada célula tem um tipo: `FLOOR` (piso), `WALL` (parede), `DOOR_OPEN`, `DOOR_CLOSED`, `WINDOW`,
  `LOW_OBSTACLE` (mesa, balcão: bloqueia passagem, não bloqueia visão nem som) e `ROUGH` (terreno
  difícil: custa 2 ticks para atravessar).
- O lugar tem propriedades em bp: `danger` (perigo), `comfort` (conforto), `privacy`
  (privacidade), `noise` (ruído ambiente), além de `baseTemperature` (bipolar) e `tags`
  (por exemplo `forest`, `water`, `dark`, `crowd`, `enclosed`) usadas pelas associações (5.7).
- Uma ou mais células de borda marcadas como `EXIT` são as saídas da cena.
- **Distância** entre células: Chebyshev (`max(|dx|, |dy|)`), em células.
- **Linha de visão**: supercobertura da reta entre os centros das células; `WALL`, `DOOR_CLOSED`
  bloqueiam; `WINDOW` deixa ver e abafa o som (ver 8.2).

### 3.2 Contexto: horário, clima e luz

| Elemento | Fonte | Efeitos principais |
| --- | --- | --- |
| Horário | `startMinute` da cena + ticks | fase do dia (`DAWN` 0h–5h, `MORNING` 5h–12h, `AFTERNOON` 12h–18h, `EVENING` 18h–22h, `LATE_NIGHT` 22h–24h) muda o ritmo do cansaço, a vontade de ir embora e a luz |
| Clima | preset de clima | temperatura-alvo, chuva/molhado, ruído, medo de tempestade para quem tem essa associação |
| Luz | fase do dia × clima × `dark` do lugar | alcance visual e precisão da percepção visual |

Alcance visual inicial: dia 20 células; entardecer e noite com iluminação 8; escuro 3.

### 3.3 Participantes

Cada participante tem uma posição na grade e um **modo de controle**: `MANUAL` (o jogador decide
os atos), `AUTO` (o motor decide; vale para NPCs e para o jogador que largou o controle). Pode
haver zero ou um personagem do jogador; com zero, a cena é só observada.

## 4. O personagem

| Parte | Conteúdo | Persiste entre fatias? |
| --- | --- | --- |
| Identidade | nome, idade, papel, descrição de voz — **apresentação, fora do hash** | sim |
| Traços e aptidões | 5.6 | sim (mudam devagar, seção 13) |
| Tendências | sinal recente de cada traço (seção 13) | sim |
| Corpo | 5.1 | sim, com recuperação entre fatias |
| Emoções | 5.2 | não (voltam à linha de base) |
| Vontades | 5.3 | sim |
| Laços | 5.4, um registro por pessoa conhecida | sim |
| Percepção do momento | 5.5, um registro por presente | não |
| Associações | 5.7 | sim |
| Memórias | fatos conhecidos e memórias marcantes (seção 12) | sim |

## 5. Camadas de status

### 5.1 Corpo

Necessidades unipolares (0 = bem; 10000 = crítico), exceto o térmico, que é bipolar.

| Id | Nome | Variação por tick (inicial) | Modificadores |
| --- | --- | --- | --- |
| `fatigue` | cansaço | +2 | ×2 em `DAWN`, ×1,5 em `LATE_NIGHT`; +5 por célula andada; +1 com medo ou raiva ≥ 7000 |
| `hunger` | fome | +1 | — |
| `thirst` | sede | +2 | ×1,5 com térmico ≥ 5000 (calor) |
| `bladder` | necessidade fisiológica | +3 | — |
| `pain` | dor | −1 (recupera) | definida pela cena ou por eventos |
| `thermal` | frio (−) ↔ calor (+) | aproxima-se do alvo com `k = 50` | alvo = temperatura do lugar + clima |
| `intoxication` | alteração (álcool, febre…) | −1 | definida pela cena |

Faixas: **incômodo** ≥ 5000; **urgente** ≥ 7500; **crítico** ≥ 9000 (para o térmico, o módulo).
O valor inicial de cada necessidade vem da cena ("estado do dia"), com sorteio na faixa do preset.

### 5.2 Emoções

Intensidade unipolar. Cada emoção tem uma **linha de base** por personagem (derivada dos traços)
e volta a ela a cada tick com `v ← base + trunc((v − base) × 9900 / 10000)` (meia-vida ≈ 6
minutos de ficção); a surpresa usa 9500.

| Id | Nome | Id | Nome |
| --- | --- | --- | --- |
| `joy` | alegria | `surprise` | surpresa |
| `sadness` | tristeza | `shame` | vergonha |
| `fear` | medo | `guilt` | culpa |
| `anger` | raiva | `jealousy` | ciúme |
| `disgust` | nojo | `boredom` | tédio |

O tédio é a exceção: sobe +5 por tick quando nada dito interessa ao personagem (nenhum ato
dirigido a ele, nenhum tópico ligado às suas vontades) e cai com qualquer evento relevante.

### 5.3 Vontades (pirâmide de Maslow)

Cada vontade tem um **déficit** (0 = satisfeita; 10000 = desesperada) e um **peso** por
personagem (o quanto aquilo importa para ele, vindo do arquétipo e dos traços). Cada personagem
tem 2 ou 3 vontades dominantes (peso ≥ 7000). Algumas vontades são **dirigidas** a um alvo.

| Nível | Id | Nome | Dirigida? | Como o déficit muda |
| --- | --- | --- | --- | --- |
| 1 Fisiológico | `physical_relief` | alívio físico | não | **calculado**: maior necessidade do corpo acima de 5000, reescalada para 0..10000 |
| 2 Segurança | `physical_safety` | segurança física | não | aproxima-se do nível de ameaça percebida (seção 6) com `k = 1000` |
| 2 Segurança | `material_security` | segurança material | não | por eventos (dívidas, perdas, pedidos) |
| 2 Segurança | `predictability` | previsibilidade | não | sobe com surpresas e mentiras descobertas |
| 3 Pertença | `company` | companhia | pode ser (saudade) | +1/tick quando ninguém se dirige a ele; cai com atos calorosos recebidos |
| 3 Pertença | `intimacy` | intimidade | sim | por eventos; saudade cresce entre fatias (seção 14) |
| 3 Pertença | `desire` | desejo | sim | sobe com a atração (laço) pelo alvo presente; cai com flerte aceito |
| 3 Pertença | `care` | cuidado | sim | sobe quando um protegido está ameaçado ou sofrendo |
| 4 Estima | `recognition` | reconhecimento | não | sobe ao ser ignorado; cai com elogios e conquistas |
| 4 Estima | `dignity` | dignidade | não | sobe com humilhação, acusação e ameaça recebidas |
| 4 Estima | `influence` | influência | não | sobe com pedidos recusados; cai quando convence |
| 5 Realização | `curiosity` | curiosidade | pode ser | +1/tick; cai ao aprender algo novo |
| 5 Realização | `purpose` | propósito | não | por eventos ligados ao papel do personagem |
| 5 Realização | `fun` | diversão | não | +2/tick com tédio ≥ 5000; cai com provocação bem recebida e humor |
| 5 Realização | `justice` | justiça (inclui vingança) | sim | sobe com ofensas e traições; cai com desculpas aceitas ou ofensor exposto |

**Precedência de Maslow.** Para cada nível `L`, seja `maxLower` o maior déficit entre as vontades
dos níveis abaixo de `L`. Então:

```text
suppression(L) = clamp((maxLower − 5000) × 2, 0, 10000)
effectiveWeight(v) = mulBp(weight(v), 10000 − suppression(level(v)))
```

Com o alívio físico em 7500, as vontades de cima pesam metade; em 10000, somem da decisão.

### 5.4 Laços

Registro **direcionado** (o que A sente por B), com oito eixos unipolares e rótulos.

| Id | Nome | Id | Nome |
| --- | --- | --- | --- |
| `trust` | confiança | `attraction` | atração |
| `affection` | afeto | `fear` | medo (de B) |
| `respect` | respeito | `resentment` | ressentimento |
| `dependence` | dependência | `intimacy` | intimidade (quanto se conhecem) |

Rótulos (removíveis): `PARENT`, `CHILD`, `SIBLING`, `GRANDPARENT`, `GRANDCHILD`, `SPOUSE`, `EX`,
`PARTNER`, `FRIEND`, `RIVAL`, `ENEMY`, `CREDITOR`, `DEBTOR`, `MENTOR`, `APPRENTICE`, `BOSS`,
`EMPLOYEE`, `COLLEAGUE`, `NEIGHBOR`, `ACQUAINTANCE`, `STRANGER`, `CRUSH` (paixão). Rótulos
familiares e de papel têm recíproca obrigatória (`PARENT` ↔ `CHILD`, `CREDITOR` ↔ `DEBTOR`…).

### 5.5 Percepção do momento

Registro **direcionado** do observador sobre cada presente, refeito a cada tick a partir de sinais
e atos percebidos (seções 7 e 8). Não persiste entre fatias.

| Id | Significado |
| --- | --- |
| `perceivedThreat` | quanto B parece perigoso agora |
| `perceivedHostility` | quanto B parece hostil a mim |
| `perceivedInterest` | quanto B parece interessado em mim |
| `perceivedSincerity` | quanto B parece sincero |
| `apparentEmotion` | emoção que B parece sentir (id + intensidade) — pode estar errada |
| `apparentState` | marcas visíveis: cansado, com frio, alterado, ferido, nervoso |

Sem sinais novos, cada valor volta 2% por tick a uma **prévia** derivada do laço (por exemplo, a
ameaça percebida volta ao medo que A tem de B).

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

Os traços modulam as regras: `temper` escala o ganho de raiva; `courage` reduz o ganho de medo;
`selfControl` reduz a emissão de sinais (seção 7) e a aleatoriedade da escolha (seção 10);
`trustInOthers` puxa a interpretação de atos ambíguos para o lado bom ou ruim.

### 5.7 Associações: medos e apegos

Valência bipolar de um personagem com uma **tag de lugar** (`forest`, `water`, `dark`, `crowd`…),
uma **coisa** (um objeto ou tópico) ou uma **pessoa ausente**.

- Associação negativa com uma tag presente no lugar: soma `mulBp(|valência|, 5000)` à ameaça
  percebida do ambiente e +20 de medo por tick. **Exemplo do produto:** quem tem medo da floresta
  sente mais as ameaças lá e a própria segurança cai.
- Associação positiva: reduz a ameaça do ambiente e dá +10 de alegria por tick.
- Associação com uma coisa ou pessoa vira tópico preferido (ou evitado) nas conversas.

## 6. Contexto e presença

A cada tick, o motor calcula para cada personagem `X` um **nível de ameaça** (0..10000) que
alimenta o alvo do déficit de `physical_safety`:

```text
threat(X) = clamp(
    danger(lugar) / 2
  + associações negativas com as tags do lugar
  + efeito do clima (tempestade: +1500 para quem tem medo associado)
  + escuro (+1000 se a luz é "escuro")
  + Σ sobre cada presente Y:  mulBp(max(fear, resentment)(X→Y), proximity(d)) / 2
  − Σ sobre cada presente Y:  mulBp((trust + affection)(X→Y) / 2, proximity(d)) / 4
  − mulBp(comfort(lugar), 2000)
, 0, 10000)
```

`proximity(d)`, por distância em células e só se X vê ou ouve Y: `d ≤ 1` → 10000; `d ≤ 3` → 7000;
`d ≤ 6` → 4000; `d ≤ 12` → 2000; acima disso ou sem percepção → 0.

**Exemplo do produto:** um filho com confiança 8000 e afeto 9000 pelo pai reduz a própria ameaça
em 2125 com o pai ao lado (`d ≤ 1`) e só em 425 com o pai do outro lado do salão (`d ≤ 12`). Quem
teme esse pai sente o oposto.

Outros efeitos de contexto:

- **Horário:** em `LATE_NIGHT` e `DAWN`, +1500 na vontade de ir embora (seção 11) para quem não
  tem motivo forte para ficar.
- **Clima:** chuva ou tempestade com o personagem exposto (célula sem teto, ver preset) somam
  +1000 à vontade de ir embora e mudam o alvo térmico.
- **Ruído:** `noise` do lugar reduz o alcance da fala normal (seção 8.2).

## 7. Sinais e transparência

O estado de cada personagem **transparece** em sinais que os outros podem perceber. Vale também
para o personagem do jogador.

| Sinal | Canal | Causas possíveis |
| --- | --- | --- |
| `tremor` | visual | medo, frio |
| `shakyVoice` | vocal | medo, tristeza |
| `avertedGaze` | visual | vergonha, culpa, medo, mentira |
| `stepBack` | visual | medo, nojo |
| `clenchedFists` | visual | raiva |
| `raisedVoice` | vocal | raiva, alegria intensa |
| `blush` | visual | vergonha, atração, raiva |
| `fixedStare` | visual | raiva, ciúme, atração |
| `lowGaze` | visual | vergonha, tristeza |
| `nervousLaugh` | vocal | vergonha, medo |
| `smile` | visual | alegria, atração |
| `laugh` | vocal | alegria, diversão |
| `quietVoice` | vocal | tristeza, cansaço |
| `tears` | visual | tristeza, alegria intensa |
| `grimace` | visual | nojo, dor |
| `yawn` | visual | cansaço, tédio |
| `slump` | visual | cansaço, tristeza |
| `slurredSpeech` | vocal | alteração, cansaço extremo |

**Emissão.** Para cada causa com intensidade `i ≥ 5000`, a chance de emitir cada sinal ligado a
ela no tick é:

```text
p = mulBp(clamp((i − 5000) × 2, 0, 10000), 10000 − selfControl / 2)
```

`selfControl = +10000` emite metade; `−10000` emite 50% a mais (até o limite de 10000).

**Percepção.** Sinais visuais exigem linha de visão e alcance visual; sinais vocais exigem
audição (8.2). A chance de notar é `7000 + perceptiveness / 5` (limitada a 9500), menos 2000 com
cansaço urgente ou alteração ≥ 5000, menos 1000 por faixa de distância acima de 3 células.

**Interpretação.** Quem nota escolhe uma causa entre as possíveis, por sorteio ponderado: o peso
de cada causa vem do contexto (frio no clima pesa a favor de `frio` no tremor), do laço e do
traço `trustInOthers` (desconfiados puxam para causas ameaçadoras). A causa escolhida atualiza a
percepção do momento (5.5) — e **pode estar errada**, que é de onde vêm os mal-entendidos.

## 8. Atos, escuta e interpretação

### 8.1 O ato

Cada ação é um **ato** com ato × tom × tópico e valores. Catálogo, custos e efeitos em
[atos de conversa](<dialogue-acts.md>). Um ato custa ticks; durante esses ticks o mundo da fatia
avança (corpo, emoções, sinais).

### 8.2 Quem ouve

| Volume | Alcance (células) | Paredes e portas |
| --- | --- | --- |
| `WHISPER` (sussurro) | 1 | bloqueado por qualquer obstáculo de visão |
| `NORMAL` | 8 − `noise`/2000 (mínimo 3) | `WALL` e `DOOR_CLOSED` bloqueiam; `WINDOW` reduz o alcance à metade |
| `SHOUT` (grito) | 30 | `WALL` reduz à metade; atravessa portas |

Além do alcance, até o dobro dele, outros podem ouvir **fragmentos** com chance 3000 (5000 para
sussurros a 2 células): sabem que houve o ato e com quem, mas não o tópico.

### 8.3 Interpretação

Cada ouvinte interpreta o ato. O tom pode ser **lido errado**: a chance de erro vem da ambiguidade
do tom ([atos de conversa](<dialogue-acts.md>)), da distância, do ruído, da perspicácia e do laço.
Um tom `IRONIC` dito por alguém de quem se desconfia tende a ser lido como `AGGRESSIVE`; um
`PLAYFUL` dito por um amigo tende a ser lido certo. A interpretação, não o ato real, é o que gera
as consequências para aquele ouvinte; o ato real fica no registro.

## 9. Consequências (avaliação emocional)

Para cada ouvinte, o ato interpretado gera, nesta ordem:

1. **Emoções:** deltas tirados da tabela de avaliação do ato e do tom, escalados pela
   intensidade e pelos traços (por exemplo, raiva × `(10000 + temper) / 10000`).
2. **Laços com quem agiu:** deltas nos eixos (afeto, confiança, respeito, atração, medo,
   ressentimento), limitados a ±1500 por ato para evitar saltos.
3. **Vontades:** satisfação ou frustração (um elogio reduz `recognition`; uma acusação pública
   aumenta `dignity`).
4. **Percepção do momento:** hostilidade, interesse e sinceridade percebidos.
5. **Disposição de resposta**, se o ato for um pedido (pedir, oferecer, desculpar-se, ameaçar): o
   motor sorteia a faixa de resultado e o alvo passa a dever uma resposta (seção 11).

A probabilidade de aceitar um pedido e as faixas de resultado estão em
[atos de conversa](<dialogue-acts.md>). Quem age também sofre efeitos: mentir dá culpa a quem é
honesto; humilhar quem se ama dá culpa; vingar-se de um inimigo alivia `justice` e dá alegria a
quem tem `temper` alto.

## 10. Decisão: escolher o ato

Quando um personagem em modo `AUTO` ganha a vez:

1. **Obrigação primeiro.** Se ele deve uma resposta (seção 11), o ato de resposta (`ACCEPT` ou
   `REFUSE`, com tom tirado das emoções) entra com bônus alto, mas não é certo: ignorar é possível
   e tem custo social.
2. **Candidatos.** Combinações de ato × alvo (presentes que ouvem) × tom × tópico, limitadas a no
   máximo 64 por heurística: tópicos salientes (alvos das vontades, fatos recentes, a pessoa
   presente, o lugar) e tons compatíveis com os traços.
3. **Utilidade** (inteiro) de cada candidato:

   ```text
   U = Σ_vontades mulBp(effectiveWeight(v), deficit(v)) × satisfaction(ato, tom, v) / 10000
     + viés das emoções (raiva favorece ACCUSE/THREATEN; medo favorece WITHDRAW/LEAVE…)
     + viés dos traços (humor favorece PLAYFUL; romanticBoldness favorece SEDUCTIVE…)
     + viés do laço com o alvo (afeto favorece WARM; ressentimento favorece IRONIC/AGGRESSIVE)
     + bônus de objetivo de cena (até +2000 se o ato avança uma vontade dominante dirigida)
     − penalidade de repetição (−1500 por repetição do mesmo ato e tópico nos últimos 6 atos)
   ```

   A tabela `satisfaction(ato, tom, v)` está em [atos de conversa](<dialogue-acts.md>).
4. **Escolha.** Os 5 melhores candidatos entram num sorteio ponderado. Peso de cada um:
   `U − U_min + 1`; com `selfControl ≥ 3000` o peso é elevado ao quadrado (escolha mais
   previsível), com `selfControl ≤ −3000` todos ganham +2000 (mais impulsivo). Tudo em inteiros.

O personagem do jogador em `AUTO` usa exatamente a mesma regra. Em `MANUAL`, o motor nunca escolhe
atos por ele.

## 11. Vontade de agir, turnos, silêncio e saída

Em cada **ponto de decisão** (fim de um ato ou de um tick de silêncio):

1. **Vontade de agir** de cada presente:

   ```text
   urge = 2000 + (sociability + 10000) × 3000 / 20000
        + 4000 se o último ato foi dirigido a ele  (+1000 se foi pergunta ou pedido)
        + mulBp(maior emoção, 3000)
        + mulBp(maior déficit de vontade com efeito social, 2000)
        + min(ticks de silêncio × 50, 3000) × (sociability + 10000) / 20000
        − max(0, fatigue − 5000) / 2
   ```

2. **Quem age:** entre quem tem `urge ≥ 4000` (`URGE_THRESHOLD`), sorteio ponderado pela vontade.
   Se ninguém passa do limiar, há **um tick de silêncio**: tédio sobe, `company` sobe para os
   expansivos, e o contador de silêncio cresce.
3. **Interrupção:** se quem foi sorteado não é a pessoa a quem o último ato se dirigia e essa
   pessoa ainda não respondeu, o ato é marcado como interrupção (respeito cai, raiva sobe em quem
   foi interrompido, conforme traços).
4. **Jogador:** se o sorteado é o personagem do jogador em `MANUAL`, o motor **pausa e espera** a
   entrada (o mundo espera). Em qualquer ponto de decisão o jogador também pode tomar a vez; se
   alguém aguardava resposta, isso conta como interrupção.
5. **Saída:** para cada personagem em `AUTO`:

   ```text
   leave = max(0, maior necessidade do corpo − 5000)
         + max(0, ameaça − 6000)
         + max(0, boredom − 6000)
         + 1500 se o horário é LATE_NIGHT ou DAWN
         + 1000 se exposto a chuva ou tempestade
         + 3000 se a vontade dominante dirigida foi satisfeita ou frustrada de vez
   stay  = mulBp(company, 3000) + mulBp(desire pelo alvo presente, 4000)
         + mulBp(curiosity, 2000) + 3000 se deve uma resposta
   ```

   Se `leave − stay ≥ 3000`, o motor sorteia a saída com `p = clamp((leave − stay) × 2, 0, 9500)`.
   Quem sai faz `FAREWELL` (se estiver conversando) e depois `LEAVE` até uma célula `EXIT`.
   Necessidade do corpo ≥ 9000 força a saída de um NPC. O personagem do jogador em `MANUAL` nunca
   sai sozinho: recebe aviso e emite sinais.
6. **Fim da fatia:** quando resta uma pessoa ou menos, ou após 60 ticks seguidos de silêncio
   (`SILENCE_END_TICKS`, "a conversa morreu").

## 12. Memória, fatos e perspectiva

- Cada ato vira um **fato** no registro: `id`, tick, quem, ato, tom, tópico, alvos, volume,
  faixa de resultado, marca de mentira.
- Cada personagem guarda **cópias** dos fatos que percebeu, com a perspectiva: `DIRECT` (ouviu
  tudo), `FRAGMENT` (ouviu pedaços), `SEEN` (viu, não ouviu) ou `TOLD` (alguém contou depois), e
  uma fidelidade em bp.
- A **importância** de um fato para um personagem vem do tamanho dos deltas que ele sofreu e de
  estar envolvido. Fatos com importância ≥ 6000 viram **memórias marcantes** e persistem entre
  fatias (até 50 por personagem; sai a menos importante).
- Os acontecimentos da história gerada (presets) entram como fatos anteriores à primeira fatia.
- **Ninguém cita o que não sabe:** o pacote enviado ao modelo de texto só leva fatos de que o
  falante tem cópia (ver [integração de IA](<ai-integration.md>)).

## 13. Personalidade que muda

1. Cada ato escolhido emite **sinais de traço** (tabela em
   [atos de conversa](<dialogue-acts.md>)): ameaçar com tom agressivo puxa `temper` e `courage`
   para cima; pedir desculpas puxa `pride` para baixo; mentir puxa `honesty` para baixo.
2. A **tendência** de cada traço segue os atos recentes, com mais peso para o imediato:
   `tend ← tend + trunc((sinal − tend) × 1000 / 10000)` a cada ato do personagem.
3. O **traço efetivo** usado nas regras é `trait + mulBp(tend, 3000)`: o comportamento recente
   colore a personalidade de agora.
4. **Cristalização:** quando `|tend| ≥ 6000` no mesmo sentido por pelo menos 30 atos, espalhados
   por pelo menos 2 fatias, o traço anda 500 bp na direção da tendência e o contador recomeça. É
   assim que um padrão mantido vira característica fixa.

## 14. Entre uma fatia e outra

O usuário escolhe quanto tempo passa até a próxima fatia (horas ou dias). O motor aplica:

- **Corpo:** volta ao estado de descanso do preset (assume-se que comeram e dormiram), exceto o
  que a nova cena definir.
- **Emoções:** voltam à linha de base.
- **Saudade:** para cada pessoa ausente com intimidade ou afeto ≥ 6000, `intimacy` dirigida a ela
  sobe +500 por dia de intervalo.
- **Vingança:** `justice` dirigida decai 10% por dia sem reforço.
- **Memória:** a fidelidade das cópias de fatos cai 1% por dia (mais devagar com `memory` alta);
  falar de novo sobre um fato o devolve à fidelidade máxima que o falante teve.
- **Tendências:** decaem 10% por dia de intervalo.

## 15. Aleatoriedade, replay e forçar caminho

- **Gerador:** PRNG de 32 bits com estado inteiro (por exemplo `sfc32` ou `xoshiro128**`),
  implementado só com operações inteiras (`Math.imul`, `>>>`).
- **Streams:** uma por finalidade — `generation`, `turn`, `choice`, `signal`, `perception`,
  `resolution`, `leave` — cada uma semeada por `hash32(seed, nome)`. A seed do elenco é separada
  da seed da cena, para variar uma sem mexer na outra.
- **Sorteio sem viés:** `draw(stream, bound)` usa rejeição para entregar um inteiro uniforme em
  `[0, bound)`.
- **Registro:** todo sorteio entra no registro da sessão com número de sequência, tick, stream,
  finalidade, limite, valor, probabilidade (se houver) e resultado.
- **Forçar caminho (testes):** o inspetor pode forçar o resultado de um sorteio identificado
  (por sequência ou por finalidade e alvo) ou ligar o modo "mais provável", que resolve cada
  sorteio pelo resultado de maior probabilidade. Forçar é uma **entrada** registrada e
  reproduzível.
- **Replay exato:** seed + versões (motor e presets) + cena + entradas (atos do jogador, respostas
  do SOM, correções, sorteios forçados, trocas de modo de controle) + falas do modelo de texto
  gravadas reproduzem a sessão. O hash do estado é conferido a cada passo.

## 16. O passo do motor (ordem de execução)

Para cada ponto de decisão, sempre nesta ordem (desempates por id crescente do personagem):

1. Calcular vontades de agir e de sair (seção 11); resolver saídas.
2. Escolher quem age (ou silêncio).
3. Se for o jogador em `MANUAL`, pausar até a entrada.
4. Resolver o ato: custo em ticks, quem ouve, interpretação, consequências, disposição de
   resposta, fato e cópias.
5. Para cada tick consumido: corpo, emoções, ameaça e vontades, sinais e percepção, tendências.
6. Emitir eventos (`ActResolved`, `SignalPerceived`, `StatusChanged`, `Silence`, `CharacterLeft`,
   `SceneEnded`, `RenderRequested`) e atualizar o hash.

## 17. Constantes iniciais

| Constante | Valor | Seção |
| --- | --- | --- |
| `TICK_SECONDS` | 5 | 2 |
| `GRID_MAX` | 48 | 3.1 |
| `EMOTION_DECAY` / `SURPRISE_DECAY` | 9900 / 9500 por tick | 5.2 |
| `DISCOMFORT` / `URGENT` / `CRITICAL` | 5000 / 7500 / 9000 | 5.1 |
| `DOMINANT_DRIVE_WEIGHT` | 7000 | 5.3 |
| `PERCEPTION_RELAX` | 2% por tick | 5.5 |
| `BOND_DELTA_CAP` | 1500 por ato | 9 |
| `CANDIDATES_MAX` / `TOP_K` | 64 / 5 | 10 |
| `REPEAT_PENALTY` | 1500 | 10 |
| `URGE_THRESHOLD` | 4000 | 11 |
| `LEAVE_MARGIN` | 3000 | 11 |
| `SILENCE_END_TICKS` | 60 | 11 |
| `MEMORY_IMPORTANCE` / `MEMORIES_MAX` | 6000 / 50 | 12 |
| `TENDENCY_RATE` / `TENDENCY_WEIGHT` | 1000 / 3000 | 13 |
| `CRYSTAL_THRESHOLD` / `CRYSTAL_ACTS` / `CRYSTAL_SLICES` / `CRYSTAL_STEP` | 6000 / 30 / 2 / 500 | 13 |

## 18. Invariantes testáveis

Cada uma vira teste (unitário ou de propriedade) no pacote do motor:

1. Mesma seed e mesmas entradas ⇒ mesma lista de eventos e mesmo hash, em qualquer máquina.
2. Depois de qualquer passo, todo valor está dentro da faixa da sua escala.
3. O estado não contém texto livre; nomes e premissa ficam no registro de apresentação, fora do
   hash.
4. Com confiança e afeto ≥ 6000 por Y, a ameaça de X com Y a 1 célula é menor ou igual à
   ameaça com Y a 12 células (o exemplo do pai).
5. Um sussurro nunca chega como `DIRECT` a quem está a mais de 1 célula; paredes bloqueiam a
   fala normal.
6. Aumentar um déficit de nível baixo nunca aumenta o peso efetivo de uma vontade de nível alto.
7. Um NPC com necessidade do corpo crítica sai da cena em número finito de pontos de decisão,
   se houver caminho até uma saída.
8. Forçar um sorteio muda só aquele resultado e o que dele decorre, e o replay com o mesmo
   sorteio forçado é idêntico.
9. O personagem do jogador em `MANUAL` nunca recebe um ato escolhido pelo motor.
10. Nenhuma saída de modelo de IA altera o estado sem passar por um ato ou preset validado.
