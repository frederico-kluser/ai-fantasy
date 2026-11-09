# Presets

> **Especificação v1 — 2026-11-09.** O motor só conhece presets: catálogos fechados, com ids
> estáveis, que valem para qualquer cenário (D-21). O SOM escolhe presets a partir da premissa
> que o usuário digita; o modelo de texto recebe a premissa para dar o sabor do mundo. Os números
> são iniciais e calibráveis.

## 1. Regras dos presets

1. Os catálogos vivem como dados tipados no pacote do motor (`packages/engine/src/presets/`),
   validados por esquema na carga e com uma versão única `PRESETS_VERSION`.
2. **Ids nunca mudam.** Para retirar um preset, marque-o como obsoleto; sessões antigas continuam
   a carregar.
3. Presets são **genéricos**: "interior social" serve para taverna, bar, café ou cantina de nave.
   O que muda de um cenário para outro é a premissa, que só o modelo de texto vê.
4. Valores com faixa (por exemplo `affection 6000–8000`) são sorteados no stream `generation` ao
   montar a cena.
5. Listas de corpo, emoções, vontades, laços, traços e sinais pertencem ao
   [modelo de simulação](<simulation-model.md>); este documento só as referencia.

## 2. Lugares

| Id | Nome | Exemplos em qualquer cenário | Perigo | Conforto | Privacidade | Ruído | Temperatura | Tags padrão | Grade padrão | Exposto ao clima |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `home` | lar | casa, quarto, cabana, apartamento | 500 | 8000 | 8000 | 1000 | +1000 | `enclosed` | 12 × 10, uma porta | não |
| `social_interior` | interior social | taverna, bar, café, salão | 2000 | 6000 | 2000 | 5000 | +1500 | `crowd`, `enclosed` | 16 × 12, balcão, mesas, porta | não |
| `workplace` | local de trabalho | oficina, ferraria, escritório, laboratório | 1500 | 4000 | 4000 | 4000 | 0 | — | 14 × 10, bancadas | não |
| `market` | comércio | mercado, feira, loja | 2000 | 4000 | 1000 | 6000 | 0 | `crowd` | 20 × 14, bancas | parcial |
| `public_square` | espaço público | praça, rua, estação | 2500 | 3000 | 500 | 5000 | clima | `crowd` | 24 × 18 aberto | sim |
| `wilderness` | ermo natural | floresta, campo, montanha, praia | 4000 | 3000 | 7000 | 1000 | clima | conforme a premissa (`forest`, `water`…) | 24 × 24, árvores e rochas | sim |
| `dangerous_place` | lugar perigoso | beco, ruína, esconderijo, zona de guerra | 7000 | 1000 | 6000 | 2000 | clima | `dark` | 16 × 16, entulho | parcial |
| `solemn_place` | lugar solene | templo, tribunal, hospital, velório | 1000 | 4000 | 3000 | 1000 | 0 | `enclosed`, `sacred` | 18 × 14 | não |
| `vehicle` | transporte | carroça, carro, trem, barco, nave | 3000 | 4000 | 5000 | 4000 | 0 | `enclosed` | 10 × 4 | parcial |
| `makeshift_shelter` | abrigo precário | acampamento, cela, trincheira, barraca | 5000 | 2000 | 4000 | 2000 | clima | — | 12 × 12 | sim |

Cada grade padrão é um gabarito com paredes, portas, obstáculos baixos, células `EXIT` e posições
iniciais sugeridas. A cena pode trocar o gabarito ou editar células.

## 3. Climas

| Id | Nome | Temperatura | Efeitos |
| --- | --- | --- | --- |
| `clear` | limpo | 0 | — |
| `cloudy` | nublado | −500 | luz um pouco menor |
| `rain` | chuva | −1000 | expostos ficam molhados (+1000 na vontade de sair); ruído +1500 |
| `storm` | tempestade | −1500 | como chuva; ruído +3000; luz escura; medo +1500 com associação `storm` |
| `snow` | neve | −4000 | expostos: frio forte |
| `heat` | calor forte | +4000 | sede ×1,5 |
| `cold` | frio forte | −3000 | — |
| `fog` | neblina | −500 | alcance visual pela metade |

## 4. Fases do dia e luz

As fases e seus efeitos estão no [modelo de simulação](<simulation-model.md>), seção 3.2. A luz
de cada fase: `MORNING` e `AFTERNOON` = dia; `DAWN` e `LATE_NIGHT` = escuro; `EVENING` = meia-luz.
Lugares fechados com `light: lit` mantêm meia-luz à noite.

## 5. Arquétipos de personagem

Traços em bp (faixas sorteadas em torno do valor ±1500); vontades dominantes recebem peso ≥ 7000.

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

Traços não citados são sorteados em `−2000..2000`; aptidões não citadas, em `3500..6500`;
"alta" significa `6500..8500`.

## 6. Arquétipos de laço

Valores são do primeiro para o segundo (A→B) e de volta (B→A); eixos não citados ficam perto de
0. A geração aplica variação de ±1000 e mantém a reciprocidade dos rótulos.

| Id | Nome | Rótulos A→B / B→A | A→B típico | B→A típico | Acontecimentos típicos |
| --- | --- | --- | --- | --- | --- |
| `parent_child` | pai ou mãe e filho(a) | `PARENT` / `CHILD` | afeto 8000, confiança 6000, `care` dirigido | afeto 7000, confiança 7000, dependência 6000, respeito 6000 | `nursed_when_sick`, `kept_promise` |
| `siblings` | irmãos | `SIBLING` / `SIBLING` | afeto 6000, intimidade 8000, ressentimento 1500 | idem | `won_competition`, `helped_in_crisis` |
| `spouses` | cônjuges | `SPOUSE` / `SPOUSE` | afeto 7000, intimidade 9000, confiança 6000, atração 5000 | idem | `shared_grief`, `broken_promise` |
| `ex_partners` | ex-parceiros | `EX` / `EX` | afeto 3000, ressentimento 4000, intimidade 8000, atração 3000 | idem, com assimetria | `betrayed_trust`, `abandoned` |
| `lovers` | namorados | `PARTNER` / `PARTNER` | atração 8000, afeto 7000, intimidade 6000 | idem | `valuable_gift`, `shared_secret` |
| `old_friends` | amigos de longa data | `FRIEND` / `FRIEND` | afeto 7000, confiança 7000, intimidade 7000 | idem | `helped_in_crisis`, `shared_secret` |
| `rivals` | rivais | `RIVAL` / `RIVAL` | respeito 5000, ressentimento 5000 | idem | `won_competition`, `public_humiliation` |
| `enemies` | inimigos | `ENEMY` / `ENEMY` | ressentimento 8000, medo 3000, confiança 0 | idem | `betrayed_trust`, `violent_fight` |
| `creditor_debtor` | credor e devedor | `CREDITOR` / `DEBTOR` | confiança 3000, ressentimento 3000 | medo 3000, dependência 5000 | `lent_not_repaid` |
| `mentor_apprentice` | mentor e aprendiz | `MENTOR` / `APPRENTICE` | afeto 5000, respeito 3000 | respeito 8000, dependência 6000 | `taught_craft` |
| `boss_employee` | patrão e empregado | `BOSS` / `EMPLOYEE` | respeito 3000 | medo 3000, dependência 7000, ressentimento 2000 | `public_humiliation` |
| `colleagues` | colegas | `COLLEAGUE` / `COLLEAGUE` | confiança 4000, intimidade 4000 | idem | — |
| `neighbors` | vizinhos | `NEIGHBOR` / `NEIGHBOR` | intimidade 4000 | idem | `valuable_gift`, `violent_fight` |
| `acquaintances` | conhecidos | `ACQUAINTANCE` / `ACQUAINTANCE` | intimidade 2000 | idem | — |
| `strangers` | desconhecidos | `STRANGER` / `STRANGER` | tudo perto de 0 | idem | — |
| `unrequited_love` | paixão não correspondida | `CRUSH` / `ACQUAINTANCE` | atração 8000, afeto 6000, `desire` dirigido | atração 1000, afeto 3000 | `rejected_love` |
| `protector_protected` | protetor e protegido | — / — | afeto 6000, `care` dirigido | confiança 8000, dependência 7000 | `saved_life` |

## 7. Acontecimentos de história

Viram fatos anteriores à primeira fatia e, se importantes, memórias marcantes (ver
[modelo de simulação](<simulation-model.md>), seção 12). "A" fez; "B" sofreu ou recebeu.

| Id | Nome | Efeito em A | Efeito em B | Segredo? |
| --- | --- | --- | --- | --- |
| `helped_in_crisis` | ajudou numa crise | afeto +1000 | confiança +2000, afeto +1500, dependência +1000 | não |
| `saved_life` | salvou a vida | afeto +1000 | confiança +3000, afeto +2500, dependência +2000 | não |
| `lent_not_repaid` | emprestou e não recebeu | ressentimento +2500, confiança −2000 | culpa e vergonha na memória | não |
| `betrayed_trust` | traiu a confiança | culpa (se honesto) | confiança −4000, ressentimento +4000, `justice` dirigida +3000 | pode ser |
| `public_humiliation` | humilhou em público | — | ressentimento +3500, `dignity` +3000, `justice` dirigida +2500 | não |
| `abandoned` | abandonou | culpa | afeto −2000, ressentimento +3000, saudade | não |
| `nursed_when_sick` | cuidou na doença | afeto +1000 | afeto +2000, confiança +1500 | não |
| `stole` | roubou | culpa (se honesto) | ressentimento +3000, confiança −3000 (se souber) | sim, até ser descoberto |
| `lied_seriously` | mentiu sobre algo grave | — | confiança −3000 (se souber) | sim, até ser descoberto |
| `won_competition` | venceu uma disputa | orgulho | ressentimento +2000, respeito +1500 | não |
| `taught_craft` | ensinou um ofício | afeto +1000 | respeito +3000, afeto +1500 | não |
| `rejected_love` | declarou amor e foi rejeitado | vergonha na memória; atração mantida | culpa leve | não |
| `violent_fight` | brigaram feio | ressentimento +3000, medo +1500 | idem | não |
| `forgave` | perdoou | ressentimento −3000 | culpa −1000 | não |
| `shared_secret` | compartilhou um segredo | intimidade +2000 | confiança +2000, intimidade +2000 | sim (o conteúdo) |
| `informed_on` | delatou | — | ressentimento +4000, `justice` dirigida +4000 | sim |
| `shared_grief` | perderam alguém em comum | intimidade +2000, tristeza residual | idem | não |
| `valuable_gift` | deu um presente valioso | — | afeto +2000, dependência +500 | não |
| `broken_promise` | quebrou uma promessa | culpa | confiança −2500, ressentimento +2000 | não |
| `kept_promise` | cumpriu uma promessa difícil | — | confiança +2500, respeito +1500 | não |
| `secret_affair` | caso secreto com um terceiro | intimidade +, culpa | — (o terceiro traído não sabe) | sim |

## 8. Associações

Tags usadas por lugares e por medos e apegos: `forest`, `water`, `dark`, `heights`, `crowd`,
`enclosed`, `storm`, `fire`, `animals`, `sacred`. Cada personagem recebe de 0 a 3 associações,
sorteadas pelo arquétipo e pela história (por exemplo, quem perdeu alguém num naufrágio tende a
ter medo de `water`). Apegos a coisas e pessoas ausentes vêm da história ou da premissa.

## 9. Estado do dia

Faixas iniciais do corpo e das emoções na abertura da cena; padrão é `rested`.

| Id | Nome | Corpo | Emoções |
| --- | --- | --- | --- |
| `rested` | descansado | tudo em 0–2000 | — |
| `tired` | cansado | `fatigue` 6000–7500 | — |
| `hungry` | com fome | `hunger` 6000–8000 | — |
| `hungover` | de ressaca | `fatigue` 5000, `pain` 2000, `intoxication` 2000 | — |
| `needs_bathroom` | apertado | `bladder` 6500–8000 | — |
| `cheerful` | bem-humorado | — | `joy` 4000 |
| `shaken` | abalado | — | `fear` 3000, `sadness` 3000 |

## 10. Da premissa aos presets (SOM)

1. **Entrada.** O usuário digita a premissa (texto livre) e, opcionalmente, uma linha por
   personagem (até 8). Uma linha pode marcar o personagem do jogador ("eu sou…").
2. **Cena.** Uma chamada ao SOM com perguntas atômicas: lugar (`choice` entre os 10 + `OTHER`),
   tags naturais (`choice`), clima (`choice`), fase do dia (`choice`), presença do jogador
   (`noul`) e, se não houver linhas de personagens, quantos personagens (`choice` 2–8).
3. **Personagens.** Uma chamada por personagem: arquétipo (`choice` entre os 16), faixa etária,
   primeira e segunda vontade dominante (`choice` entre as 15), estado do dia (`choice`),
   associação (`choice` entre as tags + `NONE`) e registro de fala (`choice`: formal, coloquial,
   rústico, culto, arcaico).
4. **Laços.** Para cada par, o arquétipo de laço (`choice` entre os 17); para os laços que não
   são `strangers`, até 2 acontecimentos de história (`choice` entre os 21 + `NONE`).
5. **Preenchimento.** O gerador sorteia o que falta dentro das faixas dos presets (traços, eixos,
   posições na grade), no stream `generation`. Se dois ou mais personagens se conhecem e nenhum
   laço tem tensão, ele acrescenta um acontecimento que crie tensão (ressentimento, segredo,
   dívida, desejo ou saudade): é o gancho que dá do que falar.
6. **Revisão.** A ficha montada aparece para o usuário editar. Campos em que a maior
   probabilidade do SOM ficou abaixo de 7000 bp aparecem destacados.
7. **Nomes e descrições.** São apresentação, fora do hash: vêm das linhas do usuário, de uma lista
   semeada por cenário ou do modelo de texto (só como apresentação).

Cada chamada ao SOM tem no máximo 16 perguntas; personagens e pares são agrupados em lotes. O
pacote de perguntas exato está em [integração de IA](<ai-integration.md>).

## 11. Como estender

- Novo preset: PR com os dados, o teste de esquema, um teste de geração com seed fixa e a
  atualização deste documento.
- Mudar faixas: é calibração; atualize os testes que dependem delas.
- Nunca reaproveite um id para outro significado.
