# Glossário

Vocabulário do AI Fantasy. Entre parênteses, o id usado no código quando existe.

## Produto

| Termo | Significado |
| --- | --- |
| AI Fantasy | o produto: simulador web de conversas com NPCs que simulam pessoas |
| Hermeneutic Core | o motor de diálogo interpretativo; é o produto |
| Playground | um cenário criado pelo usuário a partir de uma premissa |
| Premissa | texto livre com o cenário e o enredo; só o SOM (para mapear) e o modelo de texto (para dar sabor) a leem |
| Preset | item de um catálogo fechado (lugar, clima, arquétipo, laço, acontecimento…); o motor só conhece presets |
| Ficha | o playground montado (lugar, horário, clima, elenco, laços, história) para revisar antes de começar |
| Fatia | uma conversa num lugar e num intervalo de tempo; a unidade simulada |
| Campanha | o conjunto de personagens e sua história ao longo de várias fatias |
| Inspetor | painel que mostra o estado oculto e o porquê de cada fala |

## Motor

| Termo | Significado |
| --- | --- |
| bp (*basis points*) | escala inteira: `0..=10000` (unipolar) ou `-10000..=10000` (bipolar) |
| Tick | 5 segundos de ficção; o tempo só anda pelos atos |
| Ponto de decisão | momento, depois de um ato ou de um tick de silêncio, em que o motor decide quem age |
| Passo do motor | o que `step` faz até o próximo ponto de decisão ou até precisar do jogador |
| Grade | o lugar da cena dividido em células, com paredes, portas e saídas |
| Ameaça | nível de perigo que cada personagem sente; alimenta a segurança física |
| Presença | efeito de quem está por perto, conforme o laço e a distância |
| Camadas | corpo, emoções, vontades, laços, percepção do momento e traços |
| Vontade | necessidade da pirâmide de Maslow, com déficit e peso por personagem |
| Vontade dominante | vontade com peso ≥ 7000; cada personagem tem 2 ou 3 |
| Vontade dirigida | vontade com alvo: desejo por alguém, vingança contra alguém, saudade de alguém |
| Precedência de Maslow | necessidades de baixo não atendidas abafam as de cima |
| Laço | o que A sente por B: oito eixos (confiança, afeto, respeito, atração, medo, ressentimento, dependência, intimidade) e rótulos |
| Percepção do momento | como A vê B agora (ameaça, hostilidade, interesse, sinceridade, emoção aparente); pode estar errada |
| Traço | personalidade estável e bipolar (coragem, temperamento, humor…) |
| Aptidão | perspicácia, eloquência e memória |
| Tendência | o comportamento recente de um traço; pesa mais o imediato |
| Cristalização | quando uma tendência mantida muda o traço de vez |
| Associação | medo ou apego a uma tag de lugar, a uma coisa ou a uma pessoa ausente |
| Estado do dia | como o personagem chega à cena (cansado, com fome, de ressaca…) |
| Sinal | marca visível ou audível do estado (tremor, rubor, voz alta…); é o "transparecer" |
| Vontade de agir | o quanto cada um quer agir agora; decide quem fala |
| Interrupção | agir quando outro devia responder |
| Fato | registro simbólico de um ato |
| Cópia | o que cada personagem sabe de um fato, com perspectiva (`DIRECT`, `FRAGMENT`, `SEEN`, `TOLD`) |
| Memória marcante | fato importante que persiste entre fatias |

## Conversa

| Termo | Significado |
| --- | --- |
| Ato (`act`) | o que se faz: cumprimentar, provocar, pedir, ameaçar, aproximar-se… (20 atos) |
| Tom (`tone`) | como se faz: caloroso, neutro, brincalhão, sedutor, irônico, agressivo |
| Tópico (`topic`) | sobre o quê: pessoa, coisa, lugar, acontecimento, segredo, rumor, sentimento, amenidades |
| Pedido | ato que exige resposta: pedir, oferecer, desculpar-se, ameaçar |
| Faixa de resultado | entusiasmo, aceita, parcial, recusa ou recusa firme |
| Leitura errada | interpretar o tom de um ato diferente do que foi dito |

## IA

| Termo | Significado |
| --- | --- |
| SOM (*System One Model*) | decisor tipado que converte texto livre em labels, presets e valores, com probabilidades (`systemOne`) |
| Modelo de texto | LLM que encena um ato já decidido como fala e gesto (`textModel`) |
| Pacote de encenação | o que o modelo de texto recebe: premissa, cena, falante, ouvintes, ato, fatos conhecidos, últimas falas |
| Confiança da leitura | a maior probabilidade do SOM para o ato e o alvo; abaixo de 7000 bp, pede confirmação |
| Etiqueta "entendido como" | o ato lido pelo SOM, mostrado para o jogador confirmar ou corrigir |
| Fala pronta | fala de modelo por ato e tom, usada quando a IA falha, recusa ou demora |
| OpenRouter | provedor de API que dá acesso ao SOM e ao modelo de texto |
| Servidor local | o processo em `127.0.0.1` que guarda a chave e fala com o OpenRouter |

## Controle e reprodução

| Termo | Significado |
| --- | --- |
| Modo de controle | `MANUAL` (o jogador escolhe os atos) ou `AUTO` (o motor escolhe, como no The Sims) |
| Modo automático | a conversa entre NPCs avança sozinha, ponto a ponto |
| Observar | rodar uma fatia sem personagem do jogador |
| Seed | número que fixa todos os sorteios; seed do elenco e seed da cena são separadas |
| Stream | sequência de sorteios de uma finalidade (`turn`, `choice`, `signal`…) |
| Registro da sessão | JSONL com versões, seeds, entradas, sorteios, eventos e chamadas de IA |
| Replay | reconstruir uma sessão a partir do registro, sem chamar os modelos |
| Forçar caminho | fixar o resultado de um sorteio, ou usar o modo "mais provável", para testar |

## Avaliação

| Termo | Significado |
| --- | --- |
| Pacote B | o conjunto de métricas e metas de validação |
| Rubrica | as perguntas de nota por fala e por cena |
| Avaliação cega | dar as notas antes de abrir o inspetor |
| Cenas douradas | 20 cenas fixas em 5 cenários usadas para comparar versões |
| Teste cego | 3 a 5 pessoas que não conhecem o sistema jogam e dizem se os NPCs parecem pessoas |
