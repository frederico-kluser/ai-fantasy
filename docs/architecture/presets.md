# Presets

> **Especificação v1.1 — 2026-11-09.** O motor só conhece presets: catálogos fechados, com ids
> estáveis, que valem para qualquer cenário (D-21). O SOM escolhe presets a partir da premissa
> que o usuário digita; o modelo de texto recebe a premissa para dar o sabor do mundo. Os números
> são iniciais e calibráveis. A v1.1 fixou luz, exposição ao clima, direção dos laços, valores
> iniciais da geração e o gancho de tensão.

## 1. Regras dos presets

1. Os catálogos vivem como dados tipados no pacote do motor (`packages/engine/src/presets/`),
   validados por esquema na carga e com uma versão única `PRESETS_VERSION`.
2. **Ids nunca mudam.** Para retirar um preset, marque-o como obsoleto; sessões antigas continuam
   a carregar.
3. Presets são **genéricos**: "interior social" serve para taverna, bar, café ou cantina de nave.
   O que muda de um cenário para outro é a premissa, que só o modelo de texto vê.
4. Valores com faixa (por exemplo `affection 6000–8000`) são sorteados no stream `generation` ao
   montar o elenco, de forma uniforme e inclusiva.
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
| `wilderness` | ermo natural | floresta, campo, montanha, praia | 4000 | 3000 | 7000 | 1000 | clima | não | conforme a premissa (`forest`, `water`…) | 24 × 24, árvores e rochas | sim |
| `dangerous_place` | lugar perigoso | beco, ruína, esconderijo, zona de guerra | 7000 | 1000 | 6000 | 2000 | clima | não | `dark` | 16 × 16, entulho | parcial |
| `solemn_place` | lugar solene | templo, tribunal, hospital, velório | 1000 | 4000 | 3000 | 1000 | 0 | sim | `enclosed`, `sacred` | 18 × 14 | não |
| `vehicle` | transporte | carroça, carro, trem, barco, nave | 3000 | 4000 | 5000 | 4000 | 0 | sim | `enclosed` | 10 × 4 | parcial |
| `makeshift_shelter` | abrigo precário | acampamento, cela, trincheira, barraca | 5000 | 2000 | 4000 | 2000 | clima | não | — | 12 × 12 | sim |

- **Temperatura** "clima" significa `baseTemperature = 0`: só o clima conta.
- **Iluminado** (`lit`): à noite o lugar fica em meia-luz em vez de escuro.
- **Exposto ao clima:** "não" = todas as células cobertas (`roofed`); "sim" = nenhuma; "parcial" =
  o gabarito marca as cobertas.
- Cada grade padrão é um gabarito com paredes, portas, obstáculos baixos, células `exit` e
  `roofed` e posições iniciais sugeridas. A cena pode trocar o gabarito ou editar células.

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
| déficit inicial das dominantes / das demais | `4000..6000` / `2000..4000` |
| déficit inicial de uma vontade dirigida criada por laço ou acontecimento | 3000, mais o que o acontecimento somar |
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

| Id | Nome | Efeito em A | Efeito em B | Ofensor | Segredo? |
| --- | --- | --- | --- | --- | --- |
| `helped_in_crisis` | ajudou numa crise | afeto +1000 | confiança +2000, afeto +1500, dependência +1000 | — | não |
| `saved_life` | salvou a vida | afeto +1000 | confiança +3000, afeto +2500, dependência +2000 | — | não |
| `lent_not_repaid` | emprestou e não recebeu de volta | ressentimento +2500, confiança −2000, `material_security` +1500 | culpa de base +500, vergonha de base +500 | B | não |
| `betrayed_trust` | traiu a confiança | culpa de base +1000 se `honesty` > 0 | confiança −4000, ressentimento +4000, `justice` dirigida +3000 | A | pode ser |
| `public_humiliation` | humilhou em público | — | ressentimento +3500, `dignity` +3000, `justice` dirigida +2500 | A | não |
| `abandoned` | abandonou | culpa de base +1000 | afeto −2000, ressentimento +3000, `intimacy` dirigida +2000 | A | não |
| `nursed_when_sick` | cuidou na doença | afeto +1000 | afeto +2000, confiança +1500 | — | não |
| `stole` | roubou | culpa de base +1000 se `honesty` > 0 | ressentimento +3000, confiança −3000 (só se B sabe) | A | sim, até ser descoberto |
| `lied_seriously` | mentiu sobre algo grave | — | confiança −3000 (só se B sabe) | A | sim, até ser descoberto |
| `won_competition` | venceu uma disputa | alegria de base +500 | ressentimento +2000, respeito +1500 | — | não |
| `taught_craft` | ensinou um ofício | afeto +1000 | respeito +3000, afeto +1500 | — | não |
| `rejected_love` | declarou amor e foi rejeitado(a) | vergonha de base +500; atração mantida | culpa de base +300 | — | não |
| `violent_fight` | brigaram feio | ressentimento +3000, medo de +1500 | idem | ambos | não |
| `forgave` | perdoou | ressentimento −3000 | culpa de base −500 | — | não |
| `shared_secret` | compartilhou um segredo | proximidade +2000 | confiança +2000, proximidade +2000 | — | sim (o conteúdo) |
| `informed_on` | delatou | — | ressentimento +4000, `justice` dirigida +4000 | A | sim |
| `shared_grief` | perderam alguém em comum | proximidade +2000, tristeza de base +500 | idem | — | não |
| `valuable_gift` | deu um presente valioso | — | afeto +2000, dependência +500 | — | não |
| `broken_promise` | quebrou uma promessa | culpa de base +500 | confiança −2500, ressentimento +2000 | A | não |
| `kept_promise` | cumpriu uma promessa difícil | — | confiança +2500, respeito +1500 | — | não |
| `secret_affair` | traiu B com outra pessoa, às escondidas | culpa de base +1000 se `honesty` > 0 | — (B não sabe) | A | sim |

Deslocamentos de base somam à linha de base calculada e respeitam o teto de 3000. "Só se B sabe":
o segredo começa conhecido só por A; B ganha os efeitos quando receber uma cópia do fato.

## 8. Associações

Tags usadas por lugares e por medos e apegos: `forest`, `water`, `dark`, `heights`, `crowd`,
`enclosed`, `storm`, `fire`, `animals`, `sacred`.

- Cada personagem recebe de 0 a 2 associações sorteadas: a tag é uniforme entre as 10; com
  chance 7000 é um medo (valência `−8000..−4000`), senão um apego (`3000..6000`).
- O SOM pode acrescentar uma, escolhida da premissa (por exemplo, "perdeu o irmão num naufrágio"
  → medo de `water`), com valência −6000 (medo) ou +5000 (apego).
- No máximo 3 por personagem; apegos a coisas e pessoas ausentes vêm da premissa ou da edição
  manual.

## 9. Estado do dia

Valores de abertura do corpo e das emoções; não mudam a linha de base. O padrão é `rested`.

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
   (`choice` entre as tags + `NONE`), clima (`choice`), fase do dia (`choice`), presença do
   jogador (`noul`) e, se não houver linhas de personagens, quantos personagens (`choice` 2–8).
3. **Personagens** (7 perguntas cada, em lotes de 2 personagens por chamada): arquétipo (`choice`
   entre os 16), faixa etária (`choice`: `CHILD`, `TEEN`, `YOUNG`, `ADULT`, `ELDER` — só
   apresentação), primeira e segunda vontade dominante (`choice` entre as 15 + `NONE`), estado do
   dia (`choice` entre os 7), associação (`choice` entre "medo de" e "apego a" cada tag + `NONE`)
   e registro de fala (`choice`: formal, coloquial, rústico, culto, arcaico — só apresentação).
4. **Laços** (5 perguntas por par, em lotes de 3 pares por chamada): arquétipo de laço (`choice`
   entre os 17, com as duas direções de cada arquétipo direcional), primeiro acontecimento
   (`choice` entre os 21 + `NONE`), quem o fez (`choice`: o primeiro ou o segundo), segundo
   acontecimento e quem o fez. Pares `strangers` não levam acontecimentos.
5. **Preenchimento.** O gerador sorteia o que falta dentro das faixas (seções 5 a 9) e as
   posições na grade, no stream `generation`, e aplica a coerência do grafo (seção 6).
6. **Gancho de tensão.** Um laço tem **tensão** quando, em qualquer direção, ressentimento ou
   medo de ≥ 3000, há fato secreto entre os dois, há rótulo `CREDITOR`/`DEBTOR`, a atração de um
   lado é ≥ 6000 e a do outro ≤ 2000, ou há `justice` dirigida ≥ 3000. Se dois ou mais personagens
   se conhecem (laço diferente de `strangers`) e nenhum laço tem tensão, o gerador escolhe, entre
   esses pares, o de menores ids e acrescenta um acontecimento sorteado entre `betrayed_trust`,
   `lent_not_repaid`, `secret_affair`, `rejected_love`, `broken_promise` e `informed_on`, com
   quem fez também sorteado. É o gancho que dá do que falar.
7. **Revisão.** A ficha montada aparece para o usuário editar. Campos em que a maior
   probabilidade do SOM ficou abaixo de 7000 bp aparecem destacados.
8. **Nomes e descrições.** São apresentação, fora do hash: vêm das linhas do usuário, de uma lista
   semeada por cenário ou do modelo de texto (só como apresentação).

Cada chamada ao SOM tem no máximo 16 perguntas. O pacote de perguntas exato está em
[integração de IA](<ai-integration.md>).

## 11. Como estender

- Novo preset: PR com os dados, o teste de esquema, um teste de geração com seed fixa e a
  atualização deste documento.
- Mudar faixas: é calibração; atualize os testes que dependem delas.
- Nunca reaproveite um id para outro significado.
