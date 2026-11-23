# Presets

> **Especificação v1.4 — 2026-11-23.** O motor só conhece presets: catálogos fechados, com ids
> estáveis, que valem para qualquer cenário (D-21). O SOM escolhe presets a partir da premissa
> que o usuário digita; o modelo de texto recebe a premissa para dar o sabor do mundo. Os números
> são iniciais e calibráveis. A v1.1 fixou luz, exposição ao clima, direção dos laços, valores
> iniciais da geração e o gancho de tensão; a v1.2 disse quem sabe de cada acontecimento e
> separou os sorteios do elenco dos de abertura da cena; a v1.3 fixou o formato dos gabaritos de
> grade, os nomes das tags, a carga e a versão dos catálogos (CORE-03); a v1.4 fixou o gerador do
> elenco, a abertura da cena, os travados e o contador de tentativa (seção 10.1, CORE-05).

## 1. Regras dos presets

1. Os catálogos vivem como dados tipados no pacote do motor (`packages/engine/src/presets/`),
   validados por esquema na carga e com uma versão única `PRESETS_VERSION`. A carga
   (`loadPresets`) confere o esquema de cada preset, os ids (sem repetição e sem faltar nenhum) e
   as referências entre catálogos, e devolve todos os erros encontrados, cada um com o catálogo,
   o id do preset e o caminho do campo.
2. **Ids nunca mudam.** Para retirar um preset, marque-o como obsoleto; sessões antigas continuam
   a carregar.
3. Presets são **genéricos**: "interior social" serve para taverna, bar, café ou cantina de nave.
   O que muda de um cenário para outro é a premissa, que só o modelo de texto vê.
4. Valores com faixa (por exemplo `affection 6000–8000`) são sorteados de forma uniforme e
   inclusiva: os do elenco (traços, pesos, déficits, laços, história) no stream `generation`, da
   seed do elenco; os de abertura da cena (estado do dia e posições) no stream `setup`, da seed da
   cena.
5. Listas de corpo, emoções, vontades, laços, traços e sinais pertencem ao
   [modelo de simulação](<simulation-model.md>); este documento só as referencia.

## 2. Lugares

| Id | Nome | Exemplos em qualquer cenário | Perigo | Conforto | Privacidade | Ruído | Temperatura | Iluminado | Tags padrão | Grade padrão | Exposto ao clima |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `home` | lar | casa, quarto, cabana, apartamento | 500 | 8000 | 8000 | 1000 | +1000 | sim | `enclosed` | 12 × 10, uma porta | não |
| `social_interior` | interior social | taverna, bar, café, salão | 2000 | 6000 | 2000 | 5000 | +1500 | sim | `crowd`, `enclosed` | 16 × 12, balcão, mesas, porta | não |
| `workplace` | local de trabalho | oficina, ferraria, escritório, laboratório | 1500 | 4000 | 4000 | 4000 | 0 | sim | — | 14 × 10, bancadas | não |
| `market` | comércio | mercado, feira, loja | 2000 | 4000 | 1000 | 6000 | 0 | não | `crowd` | 20 × 14, bancas | parcial |
| `public_square` | espaço público | praça, rua, estação | 2500 | 3000 | 500 | 5000 | clima | não | `crowd` | 24 × 18 aberto | sim |
| `wilderness` | ermo natural | floresta, campo, montanha, praia | 4000 | 3000 | 7000 | 1000 | clima | não | — | 24 × 24, árvores e rochas | sim |
| `dangerous_place` | lugar perigoso | beco, ruína, esconderijo, zona de guerra | 7000 | 1000 | 6000 | 2000 | clima | não | `dark` | 16 × 16, entulho | parcial |
| `solemn_place` | lugar solene | templo, tribunal, hospital, velório | 1000 | 4000 | 3000 | 1000 | 0 | sim | `enclosed`, `sacred` | 18 × 14 | não |
| `vehicle` | transporte | carroça, carro, trem, barco, nave | 3000 | 4000 | 5000 | 4000 | 0 | sim | `enclosed` | 10 × 4 | parcial |
| `makeshift_shelter` | abrigo precário | acampamento, cela, trincheira, barraca | 5000 | 2000 | 4000 | 2000 | clima | não | — | 12 × 12 | sim |

- **Temperatura** "clima" significa `baseTemperature = 0`: só o clima conta.
- **Iluminado** (`lit`): à noite o lugar fica em meia-luz em vez de escuro.
- **Tags padrão:** "—" é nenhuma. O ermo natural (`wilderness`) não tem tags padrão: a tag natural
  dele (`forest`, `water`…) vem da premissa, escolhida pelo SOM (seção 10, passo 2), ou da ficha.
- **Exposto ao clima:** "não" = todas as células cobertas (`roofed`); "sim" = nenhuma; "parcial" =
  o gabarito marca as cobertas.
- **Grade padrão:** largura × altura (`W × H`) e o que o gabarito tem. Cada grade padrão é um
  gabarito com paredes, portas, obstáculos baixos, células `exit` e `roofed` e posições iniciais
  sugeridas (seção 2.1). A cena pode trocar o gabarito ou editar células.

### 2.1 Gabaritos de grade

Cada lugar traz um gabarito (`GridTemplate` no código) com quatro campos:

| Campo | Conteúdo | Regras |
| --- | --- | --- |
| `rows` | `H` linhas de `W` caracteres, de cima (`y = 0`) para baixo; o caractere `x` da linha `y` é a célula `(x, y)`, de índice `y × W + x` | `1 ≤ W, H ≤ 48` (`GRID_MAX`); todas as linhas com a mesma largura; só caracteres da legenda |
| `exits` | células `exit`, como `{ x, y }` | pelo menos 1; distintas; na borda (`x = 0`, `y = 0`, `x = W − 1` ou `y = H − 1`) e atravessáveis |
| `roofed` | células cobertas: `"ALL"` (todas), `"NONE"` (nenhuma) ou uma máscara de `H` linhas de `W` caracteres (`r` coberta, `.` descoberta) | segue a exposição ao clima: "não" ⇒ `"ALL"`; "sim" ⇒ `"NONE"`; "parcial" ⇒ máscara com pelo menos uma célula coberta e uma descoberta |
| `starts` | posições iniciais sugeridas, como `{ x, y }` | pelo menos 8 (o elenco tem até 8 personagens); distintas e atravessáveis |

Legenda dos caracteres de `rows` (fechada):

| Caractere | Tipo de célula |
| --- | --- |
| `.` | `FLOOR` |
| `,` | `ROUGH` |
| `d` | `DOOR_OPEN` |
| `D` | `DOOR_CLOSED` |
| `=` | `WINDOW` |
| `o` | `LOW_OBSTACLE` |
| `#` | `WALL` |

Atravessáveis são `FLOOR`, `ROUGH`, `DOOR_OPEN` e `DOOR_CLOSED` ([modelo de simulação](<simulation-model.md>),
seção 3.1). A carga recusa um gabarito fora dessas regras. Nos gabaritos padrão, toda posição
inicial é piso (`FLOOR`) e alcança uma saída andando só pelas quatro direções.

## 3. Climas

| Id | Nome | Temperatura | Ruído extra | Efeitos |
| --- | --- | --- | --- | --- |
| `clear` | limpo | 0 | 0 | — |
| `cloudy` | nublado | −500 | 0 | — |
| `rain` | chuva | −1000 | +1500 | quem está em célula descoberta: +1000 na vontade de sair |
| `storm` | tempestade | −1500 | +3000 | como chuva; acrescenta a tag `storm` à cena; escurece a luz de lugares expostos |
| `snow` | neve | −4000 | 0 | — |
| `heat` | calor forte | +4000 | 0 | — (a sede sobe com térmico ≥ 3000, simulação 5.1) |
| `cold` | frio forte | −3000 | 0 | — |
| `fog` | neblina | −500 | 0 | alcance visual pela metade em lugares expostos |

Dentro de células cobertas, só 25% da temperatura do clima chega ao alvo térmico (simulação 3.2).

## 4. Fases do dia e luz

As fases, a função de luz e os alcances visuais estão no [modelo de simulação](<simulation-model.md>),
seção 3.2. Em resumo: `MORNING` e `AFTERNOON` têm luz `DAY`; `EVENING`, `DIM`; `LATE_NIGHT` e
`DAWN`, `DARK` (ou `DIM` num lugar iluminado). A tag `dark` e a tempestade num lugar exposto
escurecem um nível cada.

## 5. Arquétipos de personagem

Traços em bp (cada valor citado é sorteado em ±1500 ao redor dele); as vontades citadas são as
dominantes do arquétipo.

| Id | Nome | Exemplos | Traços marcantes | Vontades dominantes | Aptidões | Voz (para o modelo de texto) |
| --- | --- | --- | --- | --- | --- | --- |
| `caretaker` | cuidador(a) | mãe, enfermeira, curandeira | `empathy` +7000, `temper` −3000 | `care`, `intimacy`, `company` | perspicácia alta | acolhedora, pergunta muito |
| `protector` | protetor(a) | guarda, irmão mais velho, policial | `courage` +7000, `trustInOthers` −2000 | `care`, `physical_safety`, `dignity` | — | firme, frases curtas |
| `proud_worker` | trabalhador(a) orgulhoso(a) | ferreiro, pedreiro, artesão | `pride` +6000, `honesty` +4000 | `purpose`, `recognition`, `dignity` | — | direta, poucas palavras |
| `merchant` | negociante calculista | comerciante, agiota, vendedor | `trustInOthers` −3000, `sociability` +3000 | `material_security`, `influence` | eloquência alta | persuasiva, interesseira |
| `adventurer` | aventureiro(a) impulsivo(a) | viajante, mercenário, explorador | `courage` +6000, `selfControl` −5000 | `fun`, `curiosity`, `purpose` | — | animada, exagera |
| `scholar` | estudioso(a) curioso(a) | sábio, professor, cientista | `sociability` −2000, `honesty` +3000 | `curiosity`, `recognition` | memória e perspicácia altas | precisa, cheia de referências |
| `seducer` | sedutor(a) | galanteador, cortesã, conquistador | `romanticBoldness` +8000, `honesty` −2000 | `desire`, `recognition`, `fun` | eloquência alta | charmosa, insinuante |
| `rebel` | rebelde | jovem revoltado, insurgente | `temper` +5000, `pride` +4000, `trustInOthers` −4000 | `justice`, `dignity`, `influence` | — | provocadora, sarcástica |
| `authoritarian` | líder autoritário | chefe, patriarca, capitão | `pride` +7000, `empathy` −3000 | `influence`, `recognition`, `predictability` | — | imperativa |
| `shy_observer` | tímido(a) observador(a) | aprendiz, escriba, filho quieto | `sociability` −7000, `courage` −3000 | `company`, `physical_safety`, `curiosity` | perspicácia alta | hesitante, fala baixo |
| `devout` | devoto(a) | sacerdote, beata, monge | `honesty` +6000, `empathy` +3000 | `purpose`, `predictability`, `justice` | — | solene, moralista |
| `trickster` | malandro(a) | trapaceiro, golpista simpático | `honesty` −7000, `humor` +6000 | `fun`, `material_security`, `influence` | eloquência alta | esperta, cheia de gírias do mundo |
| `elder` | ancião, anciã | avó, velho sábio | `selfControl` +5000, `courage` +2000 | `intimacy`, `purpose`, `recognition` | memória alta | pausada, conta histórias |
| `child` | criança | filho pequeno, menina curiosa | `humor` +4000, `selfControl` −6000 | `curiosity`, `company`, `physical_safety` | — | simples, pergunta direto |
| `bitter_loner` | solitário(a) amargo(a) | eremita, viúvo ranzinza | `sociability` −6000, `trustInOthers` −6000, `temper` +3000 | `dignity`, `physical_safety` | — | seca, ácida |
| `bohemian` | boêmio(a) | músico, poeta, bardo | `humor` +5000, `sociability` +6000, `selfControl` −3000 | `fun`, `recognition`, `desire` | eloquência alta | expressiva, poética |

Valores que o arquétipo não cita:

| O quê | Valor sorteado |
| --- | --- |
| traços não citados | `−2000..2000` |
| aptidões não citadas / "alta" | `3500..6500` / `6500..8500` |
| peso das vontades dominantes / das demais | `7000..9000` / `2000..5000` |
| déficit inicial das vontades não dirigidas: dominantes / demais | `4000..6000` / `2000..4000` |
| déficit inicial de uma vontade dirigida: criada por laço ou acontecimento / qualquer outra pessoa | 3000, mais o que o acontecimento somar / 0 |
| linhas de base das emoções | fórmulas da simulação 5.2 |

`physical_relief` e `physical_safety` não são sorteados: são calculados (simulação 5.3).

**Vontades dominantes vindas do SOM:** as escolhas do SOM (até 2) vêm primeiro, seguidas das do
arquétipo, sem repetir, até o total de 3.

## 6. Arquétipos de laço

Eixos do laço, com o nome usado nas tabelas: confiança (`trust`), afeto (`affection`), respeito
(`respect`), dependência (`dependence`), atração (`attraction`), medo de (`fearOf`),
ressentimento (`resentment`) e proximidade (`closeness`). Valores são do primeiro para o segundo
(A→B) e de volta (B→A); eixos não citados ficam em `0..500`. A geração aplica variação de ±1000 e
mantém a reciprocidade dos rótulos. Uma vontade "dirigida" cria em A a vontade com alvo B
(déficit 3000).

| Id | Nome | Rótulos A→B / B→A | A→B típico | B→A típico | Acontecimentos típicos |
| --- | --- | --- | --- | --- | --- |
| `parent_child` | pai ou mãe (A) e filho(a) (B) | `PARENT` / `CHILD` | afeto 8000, confiança 6000, proximidade 8000, `care` dirigido | afeto 7000, confiança 7000, dependência 6000, respeito 6000, proximidade 8000 | `nursed_when_sick`, `kept_promise` |
| `siblings` | irmãos | `SIBLING` / `SIBLING` | afeto 6000, proximidade 8000, ressentimento 1500 | idem | `won_competition`, `helped_in_crisis` |
| `spouses` | cônjuges | `SPOUSE` / `SPOUSE` | afeto 7000, proximidade 9000, confiança 6000, atração 5000 | idem | `shared_grief`, `broken_promise` |
| `ex_partners` | ex-parceiros | `EX` / `EX` | afeto 3000, ressentimento 4000, proximidade 8000, atração 3000 | afeto 2000, ressentimento 5000, proximidade 8000, atração 2000 | `betrayed_trust`, `abandoned` |
| `lovers` | namorados | `PARTNER` / `PARTNER` | atração 8000, afeto 7000, proximidade 6000, `desire` dirigido | idem | `valuable_gift`, `shared_secret` |
| `old_friends` | amigos de longa data | `FRIEND` / `FRIEND` | afeto 7000, confiança 7000, proximidade 7000 | idem | `helped_in_crisis`, `shared_secret` |
| `rivals` | rivais | `RIVAL` / `RIVAL` | respeito 5000, ressentimento 5000, proximidade 4000 | idem | `won_competition`, `public_humiliation` |
| `enemies` | inimigos | `ENEMY` / `ENEMY` | ressentimento 8000, medo de 3000, `justice` dirigida | idem | `betrayed_trust`, `violent_fight` |
| `creditor_debtor` | credor (A) e devedor (B) | `CREDITOR` / `DEBTOR` | confiança 3000, ressentimento 3000 | medo de 3000, dependência 5000 | `lent_not_repaid` |
| `mentor_apprentice` | mentor (A) e aprendiz (B) | `MENTOR` / `APPRENTICE` | afeto 5000, respeito 3000, proximidade 5000 | respeito 8000, dependência 6000, proximidade 5000 | `taught_craft` |
| `boss_employee` | patrão (A) e empregado (B) | `BOSS` / `EMPLOYEE` | respeito 3000, proximidade 3000 | medo de 3000, dependência 7000, ressentimento 2000, proximidade 3000 | `public_humiliation` |
| `colleagues` | colegas | `COLLEAGUE` / `COLLEAGUE` | confiança 4000, proximidade 4000 | idem | — |
| `neighbors` | vizinhos | `NEIGHBOR` / `NEIGHBOR` | proximidade 4000 | idem | `valuable_gift`, `violent_fight` |
| `acquaintances` | conhecidos | `ACQUAINTANCE` / `ACQUAINTANCE` | proximidade 2000 | idem | — |
| `strangers` | desconhecidos | `STRANGER` / `STRANGER` | tudo em `0..500` | idem | — |
| `unrequited_love` | paixão (A) não correspondida (B) | `CRUSH` / `ACQUAINTANCE` | atração 8000, afeto 6000, proximidade 3000, `desire` dirigido | atração 1000, afeto 3000, proximidade 3000 | `rejected_love` |
| `protector_protected` | protetor (A) e protegido (B) | `PROTECTOR` / `PROTECTED` | afeto 6000, proximidade 5000, `care` dirigido | confiança 8000, dependência 7000, proximidade 5000 | `saved_life` |

Os arquétipos com papéis diferentes para A e B (`parent_child`, `creditor_debtor`,
`mentor_apprentice`, `boss_employee`, `unrequited_love`, `protector_protected`) são **direcionais**:
a escolha diz quem é A.

**Coerência do grafo de laços** (verificada na geração e na edição manual):

1. No máximo um `SPOUSE` e um `PARTNER` por personagem.
2. Ninguém é ancestral de si mesmo (`PARENT` não forma ciclo).
3. **Família transitiva:** se A é `PARENT` de B e B é `PARENT` de C, então A é `GRANDPARENT` de C
   (e C `GRANDCHILD` de A); dois filhos do mesmo `PARENT` são `SIBLING`. A geração acrescenta
   esses rótulos, com o arquétipo `siblings` para irmãos sem laço escolhido.

## 7. Acontecimentos de história

Viram fatos anteriores à primeira fatia e, se importantes, memórias marcantes (ver
[modelo de simulação](<simulation-model.md>), seção 12). "A" fez; "B" sofreu ou recebeu. Os
efeitos são deltas nos eixos do laço de cada um **com o outro**, déficits de vontade (dirigidas
ao outro, quando marcadas) e deslocamentos na linha de base de emoções ("de base"). A coluna
**ofensor** diz quem fez algo errado (para acusações, [atos de conversa](<dialogue-acts.md>),
seção 4).

| Id | Nome | Efeito em A | Efeito em B | Ofensor | Segredo? | Quem sabe |
| --- | --- | --- | --- | --- | --- | --- |
| `helped_in_crisis` | ajudou numa crise | afeto +1000 | confiança +2000, afeto +1500, dependência +1000 | — | não | ambos |
| `saved_life` | salvou a vida | afeto +1000 | confiança +3000, afeto +2500, dependência +2000 | — | não | ambos |
| `lent_not_repaid` | emprestou e não recebeu de volta | ressentimento +2500, confiança −2000, `material_security` +1500 | culpa de base +500, vergonha de base +500 | B | não | ambos |
| `betrayed_trust` | traiu a confiança | culpa de base +1000 se `honesty` > 0 | confiança −4000, ressentimento +4000, `justice` dirigida +3000 | A | com chance 5000 | ambos; só A se for secreto |
| `public_humiliation` | humilhou em público | — | ressentimento +3500, `dignity` +3000, `justice` dirigida +2500 | A | não | ambos |
| `abandoned` | abandonou | culpa de base +1000 | afeto −2000, ressentimento +3000, `intimacy` dirigida +2000 | A | não | ambos |
| `nursed_when_sick` | cuidou na doença | afeto +1000 | afeto +2000, confiança +1500 | — | não | ambos |
| `stole` | roubou | culpa de base +1000 se `honesty` > 0 | ressentimento +3000, confiança −3000 (só se B sabe) | A | sim, até ser descoberto | só A |
| `lied_seriously` | mentiu sobre algo grave | — | confiança −3000 (só se B sabe) | A | sim, até ser descoberto | só A |
| `won_competition` | venceu uma disputa | alegria de base +500 | ressentimento +2000, respeito +1500 | — | não | ambos |
| `taught_craft` | ensinou um ofício | afeto +1000 | respeito +3000, afeto +1500 | — | não | ambos |
| `rejected_love` | declarou amor e foi rejeitado(a) | vergonha de base +500; atração mantida | culpa de base +300 | — | não | ambos |
| `violent_fight` | brigaram feio | ressentimento +3000, medo de +1500 | idem | ambos | não | ambos |
| `forgave` | perdoou | ressentimento −3000 | culpa de base −500 | — | não | ambos |
| `shared_secret` | compartilhou um segredo | proximidade +2000 | confiança +2000, proximidade +2000 | — | sim (o conteúdo) | ambos |
| `informed_on` | delatou | — | ressentimento +4000, `justice` dirigida +4000 | A | sim | ambos |
| `shared_grief` | perderam alguém em comum | proximidade +2000, tristeza de base +500 | idem | — | não | ambos |
| `valuable_gift` | deu um presente valioso | — | afeto +2000, dependência +500 | — | não | ambos |
| `broken_promise` | quebrou uma promessa | culpa de base +500 | confiança −2500, ressentimento +2000 | A | não | ambos |
| `kept_promise` | cumpriu uma promessa difícil | — | confiança +2500, respeito +1500 | — | não | ambos |
| `secret_affair` | traiu B com outra pessoa, às escondidas | culpa de base +1000 se `honesty` > 0 | — (B não sabe) | A | sim | só A |

Deslocamentos de base somam à linha de base calculada e respeitam o teto de 3000. Quem sabe
recebe uma cópia `DIRECT` com fidelidade 8000. "Segredo" é segredo para terceiros: ninguém além
de quem sabe tem cópia. Um acontecimento que não é segredo é sabido pelos dois; a coluna "Quem
sabe" diz quem tem cópia quando ele é segredo. Quando só A sabe, os efeitos em B ("só se B sabe") esperam até B receber
uma cópia do fato e então se aplicam uma vez: o estado de B guarda a lista dos fatos já aplicados
(`historyApplied`, vazia na geração), e perder a cópia e saber de novo não os aplica outra vez
(SOC-03; `applyDeferredHistory`, logo depois da gravação do ato). Se `betrayed_trust` é secreto, sorteia-se no stream
`generation`.

## 8. Associações

Tags usadas por lugares e por medos e apegos:

| Id | Nome |
| --- | --- |
| `forest` | floresta |
| `water` | água |
| `dark` | escuro |
| `heights` | altura |
| `crowd` | multidão |
| `enclosed` | lugar fechado |
| `storm` | tempestade |
| `fire` | fogo |
| `animals` | animais |
| `sacred` | sagrado |

- Cada personagem recebe de 0 a 2 associações sorteadas: a tag é uniforme entre as 10; com
  chance 7000 é um medo (valência `−8000..−4000`), senão um apego (`3000..6000`).
- O SOM pode acrescentar uma, escolhida da premissa (por exemplo, "perdeu o irmão num naufrágio"
  → medo de `water`), com valência −6000 (medo) ou +5000 (apego).
- No máximo 3 por personagem; apegos a coisas e pessoas ausentes vêm da premissa ou da edição
  manual.

## 9. Estado do dia

Valores de abertura do corpo e das emoções, sorteados no stream `setup`; não mudam a linha de
base. O padrão é `rested`.

| Id | Nome | Corpo | Emoções |
| --- | --- | --- | --- |
| `rested` | descansado | todas as necessidades em `0..2000`, térmico 0 | — |
| `tired` | cansado | `fatigue` `6000..7500` | — |
| `hungry` | com fome | `hunger` `6000..8000` | — |
| `hungover` | de ressaca | `fatigue` 5000, `pain` 2000, `intoxication` 2000 | — |
| `needs_bathroom` | apertado | `bladder` `6500..8000` | — |
| `cheerful` | bem-humorado | — | `joy` 4000 |
| `shaken` | abalado | — | `fear` 3000, `sadness` 3000 |

Necessidades não citadas seguem `rested`.

## 10. Da premissa aos presets (SOM)

1. **Entrada.** O usuário digita a premissa (texto livre) e, opcionalmente, uma linha por
   personagem (até 8). Uma linha pode marcar o personagem do jogador ("eu sou…").
2. **Cena** (uma chamada, 6 perguntas): lugar (`choice` entre os 10 + `OTHER`), tag natural
   (`choice` entre as tags + `NONE`), clima (`choice`), fase do dia (`choice`; vira o minuto
   inicial `DAWN` 180, `MORNING` 540, `AFTERNOON` 900, `EVENING` 1200, `LATE_NIGHT` 1350),
   presença do jogador (`noul`) e, se não houver linhas de personagens, quantos personagens
   (`choice` 2–8). Com o jogador presente e nenhuma linha marcada como dele, o primeiro
   personagem é o do jogador; a ficha permite trocar.
3. **Personagens** (7 perguntas cada, em lotes de 2 personagens por chamada): arquétipo (`choice`
   entre os 16), faixa etária (`choice`: `CHILD`, `TEEN`, `YOUNG`, `ADULT`, `ELDER` — só
   apresentação), primeira e segunda vontade dominante (`choice` entre as 15 + `NONE`), estado do
   dia (`choice` entre os 7), associação (`choice` entre "medo de" e "apego a" cada tag + `NONE`)
   e registro de fala (`choice`: formal, coloquial, rústico, culto, arcaico — só apresentação).
4. **Laços** (5 perguntas por par, em lotes de 3 pares por chamada): arquétipo de laço (`choice`
   entre os 17, com as duas direções de cada arquétipo direcional), primeiro acontecimento
   (`choice` entre os 21 + `NONE`), quem o fez (`choice`: o primeiro ou o segundo), segundo
   acontecimento e quem o fez. Pares `strangers` não levam acontecimentos.
5. **Preenchimento.** O gerador sorteia o que falta do elenco dentro das faixas (seções 5 a 8)
   no stream `generation` e aplica a coerência do grafo (seção 6); o estado do dia (seção 9) e as
   posições na grade são valores de abertura da cena, sorteados no stream `setup` (regra 4 da
   seção 1). Detalhes na seção 10.1.
6. **Gancho de tensão.** Um laço tem **tensão** quando, em qualquer direção, ressentimento ou
   medo de ≥ 3000, há fato secreto entre os dois, há rótulo `CREDITOR`/`DEBTOR`, a atração de um
   lado é ≥ 6000 e a do outro ≤ 2000, ou há `justice` dirigida ≥ 3000. Se dois ou mais personagens
   se conhecem (laço diferente de `strangers`) e nenhum laço tem tensão, o gerador escolhe, entre
   esses pares, o de menores ids e acrescenta um acontecimento sorteado entre `betrayed_trust`,
   `lent_not_repaid`, `secret_affair`, `rejected_love`, `broken_promise` e `informed_on`, com
   quem fez também sorteado. O gancho garante tensão: só entram no sorteio os acontecimentos que,
   aplicados ao par com quem fez sorteado e com qualquer marca de segredo que possam ter, deixam o
   laço com tensão pela definição acima (peso 0 nos outros, como `rejected_love`, que não mexe em
   eixo de tensão). `secret_affair` e `informed_on` são sempre segredo, então há sempre opção. É o
   gancho que dá do que falar.
7. **Revisão.** A ficha montada aparece para o usuário editar. Campos em que a maior
   probabilidade do SOM ficou abaixo de 7000 bp aparecem destacados.
8. **Nomes e descrições.** São apresentação, fora do hash: vêm das linhas do usuário, de uma lista
   semeada por cenário ou do modelo de texto (só como apresentação).

Cada chamada ao SOM tem no máximo 16 perguntas. O pacote de perguntas exato está em
[integração de IA](<ai-integration.md>).

### 10.1 O gerador do elenco e a abertura da cena

O motor oferece duas funções puras (`packages/engine/src/generation/`): **gerar o elenco**
(`generateCast`, seed do elenco, stream `generation`) e **abrir a cena** (`openScene`, seed da
cena, stream `setup`). A criação à mão usa a mesma entrada e as mesmas validações; o SOM só
preenche escolhas dessa entrada.

**Entrada do elenco** (`CastInput`), validada por esquema antes de qualquer sorteio:

| Campo | Conteúdo |
| --- | --- |
| `attempt` | contador de tentativa, inteiro ≥ 0 (0 na primeira geração) |
| `characters` | de 1 a 8 personagens; o id de cada um é a posição na lista (0, 1, 2…) |
| `characters[i].archetype` | arquétipo de personagem (seção 5) |
| `characters[i].identity` | nome, pronomes, descrição, papel, faixa etária (padrão `ADULT`) e registro de fala (padrão `COLLOQUIAL`): apresentação, fora do hash |
| `characters[i].dominantDrives` | escolhas do SOM para as vontades dominantes: até 2, sem repetir (padrão nenhuma) |
| `characters[i].dayState` | estado do dia (seção 9; padrão `rested`), aplicado só na abertura |
| `characters[i].association` | associação escolhida pelo SOM: tag e `FEAR` ou `ATTACHMENT` (padrão nenhuma) |
| `characters[i].locked` | os valores sorteados do personagem, quando ele está travado (padrão nenhum) |
| `bonds` | laços escolhidos, no máximo um por par: `a` e `b` (ids; `a` é o lado A do arquétipo), o arquétipo de laço (seção 6), os acontecimentos (cada um com o id e quem fez, `a` ou `b`) e `locked` |
| `derived` | rascunhos travados dos pares que a família transitiva acrescenta: `a` (o avô, ou o irmão de menor id), `b` e `locked` (padrão nenhum) |

Os **valores sorteados** de um personagem (o rascunho, `CharacterDraft`) são os traços, as
aptidões, os pesos das 15 vontades, os déficits iniciais das vontades não dirigidas (menos
`physical_relief` e `physical_safety`, que são calculados) e as associações. Os de um laço
(`BondDraft`) são os oito eixos de A→B e de B→A e, para cada acontecimento, se ele é segredo. Um
rascunho travado precisa ser possível: pesos com 2 ou 3 dominantes (≥ 7000), até 3 associações com
tags distintas, uma marca de segredo por acontecimento e só segredos que o acontecimento admite;
um travado de par derivado precisa nomear um par que a família acrescenta, com o lado A certo, e
não tem marcas de segredo. Um rascunho impossível, de personagem ou de laço, é sempre o erro
`IMPOSSIBLE_DRAFT`; o esquema (campos, tipos, faixas da escala) é `INVALID_INPUT`.
A edição manual de um personagem ou laço gerado é um rascunho travado com os valores editados.

**Validação.** Toda falha é um erro como valor, com um código e o caminho do item (por exemplo
`bonds.2`): esquema inválido (inclui arquétipo desconhecido), personagem inexistente, laço de
alguém consigo, dois laços no mesmo par, autor de acontecimento fora do par, acontecimento num par
`strangers`, rascunho impossível, mais de um `SPOUSE` ou de um `PARTNER` por personagem, ciclo de
`PARENT` (um erro por laço do ciclo, no caminho dele) e conflito de família (um par com duas relações de parentesco diferentes entre pai ou mãe,
irmão e avô, depois da família transitiva). O gerador devolve todos os erros encontrados e não
sorteia nada.

**Ordem da geração** (um único drawer, tick 0, só o stream `generation`):

1. **Personagens**, por id crescente; um travado não sorteia. Para cada um: os traços (ordem do
   catálogo, faixa `valor ± 1500` do arquétipo ou `−2000..2000`, limitada à escala), as aptidões
   (`3500..6500` ou, se altas, `6500..8500`), os pesos das vontades na ordem do catálogo
   (dominantes `7000..9000`, demais `2000..5000`), os déficits das vontades não dirigidas
   sorteadas (dominantes `4000..6000`, demais `2000..4000`) e as associações: primeiro a do SOM
   (valência −6000 ou +5000), depois de 0 a 2 sorteadas: o número é uniforme em 0..2
   (`draw(3)`, `ASSOCIATION_COUNT`) e cada uma tem a tag uniforme entre as ainda não usadas
   (`ASSOCIATION_TAG`), a chance 7000 de ser medo (`ASSOCIATION_FEAR`) e a valência na faixa
   (`ASSOCIATION_VALENCE`).
2. **Laços escolhidos**, por par (menor id, depois o outro); um travado não sorteia. Para cada
   um: os eixos de A→B e depois os de B→A, na ordem do catálogo (valor típico ± 1000 limitado a
   `0..10000`, ou `0..500` se não citado); depois a marca de segredo de cada acontecimento, na
   ordem da lista, sorteada só quando a chance está entre 1 e 9999.
3. **Família transitiva** (seção 6): pares sem laço escolhido que viram irmãos ganham o arquétipo
   `siblings`; pares que viram avô e neto ganham os eixos do arquétipo `parent_child` (o avô como
   A) com os rótulos `GRANDPARENT`/`GRANDCHILD`; como em `parent_child`, o avô também ganha a
   vontade `care` dirigida ao neto (déficit 3000). São sorteados como no passo 2, por par, salvo
   os travados em `derived`.
4. **Fatos de história**: os acontecimentos dos laços, por par e na ordem da lista, viram fatos
   com ids 0, 1, 2…
5. **Gancho de tensão** (seção 10, passo 6): primeiro quem fez (`TENSION_AUTHOR`, `draw(2)`: 0 é
   o de menor id), depois o acontecimento entre os seis com pesos iguais, peso 0 nos que não
   garantem tensão para esse autor (`TENSION_EVENT`), e, se for o caso, o segredo; vira o fato
   seguinte.

**Efeitos da história.** Os deltas de eixo somam aos eixos sorteados de quem sofreu o efeito com
o outro (limitados a `0..10000`); os de vontade não dirigida somam ao déficit sorteado; uma
vontade dirigida ao outro, criada pelo laço ou por um acontecimento, começa em 3000 e soma os
deltas dos acontecimentos (sem entrada, a vontade dirigida a alguém vale 0); os deslocamentos
de base de cada emoção somam-se e ficam guardados no estado, e a linha de base é a fórmula da
simulação 5.2 mais eles. Quem sabe ganha a cópia `DIRECT` com fidelidade
8000 e importância pela fórmula da simulação 12 (deslocamentos de base como deltas de emoção, os
deltas de eixo como deltas de laço e +3000, porque A e B estão envolvidos). Quando só A sabe, B
não tem cópia e os efeitos em B não se aplicam na geração: o motor os aplica, uma vez, quando B
recebe uma cópia do fato (SOC-03); os efeitos vêm do catálogo. Lacuna registrada para a SOC-03:
como uma cópia não marcante some entre fatias e B pode recebê-la de novo, a SOC-03 guarda no
estado de B uma marca de "efeitos de história já aplicados" por fato, para não aplicá-los duas
vezes.

**Saída.** O elenco (`Cast`): as identidades, o estado de cada personagem por id (corpo em 0,
emoções na linha de base, célula 0 e ameaça 0 até a abertura), os fatos, o estado do dia escolhido
de cada um, os rascunhos (os personagens por id; os laços escolhidos na ordem da entrada e depois
os pares derivados, marcados como `derived`, na ordem dos pares) e o gancho, se houve; mais o
estado do sorteio e os registros.

**Tentativas e travados.** Gerar de novo usa a mesma seed do elenco com o contador de tentativa
`n`: a stream `generation` da tentativa `n` é semeada com `hash32(castSeed, "generation#<n>")`, e
a tentativa 0 é a stream normal (`hash32(castSeed, "generation")`). O que está travado não sorteia
e não muda; o resto é sorteado de novo. Os acontecimentos e os arquétipos vêm da entrada, então o
grafo continua coerente com os travados. Um par derivado (avô e neto, irmãos implícitos) se trava
pela lista `derived` da entrada, com o rascunho que a saída marcou como `derived`. Para manter o
gancho, inclua-o nos acontecimentos do laço antes de travá-lo.

**Abertura da cena** (`openScene`, um drawer, tick 0, só o stream `setup`): para cada personagem
por id, o corpo na ordem do catálogo, cada necessidade na faixa do estado do dia ou, se ele não a
citar, na de `rested`; as emoções voltam à linha de base e as que o estado do dia cita recebem o
valor dele; o déficit de `physical_relief` é calculado do corpo (simulação 5.3), e as percepções e
a ameaça começam vazias. Uma faixa de um valor só não sorteia. Depois as posições: as dadas à mão
(células atravessáveis e distintas) primeiro; para os demais, por id, uma posição sugerida livre
do gabarito, uniforme (`START_CELL`); sem sugerida livre, a célula atravessável livre de menor
índice.

## 11. Como estender

- Novo preset: PR com os dados, o teste de esquema, um teste de geração com seed fixa e a
  atualização deste documento.
- Mudar faixas: é calibração; atualize os testes que dependem delas.
- Nunca reaproveite um id para outro significado.
- Toda mudança nos dados sobe `PRESETS_VERSION` (`MAJOR.MINOR.PATCH`, hoje `0.1.0`): o MINOR quando
  muda a simulação (números, listas, gabaritos, presets novos), o PATCH quando só muda texto de
  exibição. Um teste guarda o hash dos catálogos de cada versão, e as tabelas destes documentos
  são conferidas com os dados por outro teste.
