# Atos de conversa

> **Especificação v1 — 2026-11-09.** Toda fala e toda ação na fatia é um **ato**: ato × tom ×
> tópico, com valores (D-13). O motor decide e resolve atos; o SOM converte a fala livre do
> jogador num ato; o modelo de texto encena o ato. As regras gerais estão no
> [modelo de simulação](<simulation-model.md>). Números são iniciais e calibráveis.

## 1. Estrutura de um ato

```ts
interface ActLabel {
  act: ActId;              // o que se faz (seção 2)
  tone: ToneId;            // como se faz (seção 3)
  targets: CharacterId[] | "GROUP";  // a quem; GROUP = todos que ouvem
  topic: Topic;            // sobre o quê (seção 4)
  intensity: number;       // 0..10000 bp
  volume: "WHISPER" | "NORMAL" | "SHOUT";
  isFalse: boolean;        // marca de mentira: afirma como verdadeiro algo falso
  object?: RequestObject;  // o que se pede ou oferece (só REQUEST e OFFER)
  destination?: Cell;      // só atos de movimento
}
```

Interrupção não é escolhida: o motor a marca quando acontece (ver
[modelo de simulação](<simulation-model.md>), seção 11).

## 2. Atos

### 2.1 Atos de fala

| Id | Nome | Ticks | Efeito na conversa | Vontades do autor que serve |
| --- | --- | --- | --- | --- |
| `GREET` | cumprimentar | 1 | abre a conversa com alguém | companhia, previsibilidade |
| `CHAT` | conversar (papo sobre um tópico) | 3 | mantém a conversa; interessa ou entedia | companhia, intimidade, diversão, curiosidade |
| `ASK` | perguntar | 2 | cria obrigação de resposta | curiosidade, previsibilidade |
| `TELL` | contar (fato, rumor, segredo, história) | 3 (+3 se segredo ou história) | espalha conhecimento | reconhecimento, companhia, influência, justiça (expor) |
| `PRAISE` | elogiar | 2 | valoriza o alvo | intimidade, cuidado, influência, desejo (sedutor) |
| `TEASE` | provocar | 2 | testa limites; diverte ou fere | diversão, influência, justiça, desejo (sedutor) |
| `ACCUSE` | acusar | 3 | confronta; cria obrigação de resposta | justiça, dignidade, influência |
| `REQUEST` | pedir | 2 | **pedido**: gera disposição de resposta | depende do objeto (seção 5) |
| `OFFER` | oferecer (ajuda, presente, acordo, promessa, encontro) | 2 | **pedido**: gera disposição de resposta | cuidado, influência, companhia, desejo |
| `APOLOGIZE` | desculpar-se | 3 | **pedido** de perdão | intimidade, dignidade, alívio de culpa |
| `THREATEN` | ameaçar | 2 | **pedido** sob coação | influência, segurança, justiça |
| `ACCEPT` | aceitar | 1 | responde a um pedido | conforme o pedido |
| `REFUSE` | recusar | 1 | responde a um pedido | dignidade, influência |
| `FAREWELL` | despedir-se | 1 | anuncia a saída | alívio físico, segurança |

### 2.2 Atos sem fala

| Id | Nome | Ticks | Observação |
| --- | --- | --- | --- |
| `STAY_SILENT` | ficar calado, só ouvir | 1 | se havia obrigação de resposta, conta como ignorar |
| `MOVE` | ir até uma célula | 1 por célula (2 em `ROUGH`) | caminho mínimo na grade |
| `APPROACH` | aproximar-se de alguém | 1 por célula | muda a presença (proximidade) |
| `WITHDRAW` | afastar-se de alguém | 1 por célula | idem |
| `LEAVE` | sair da cena | 1 por célula até uma `EXIT` | ao chegar, o personagem deixa a fatia |
| `TOUCH` | contato físico | 1 | exige estar a 1 célula; o tom define o gesto |

`TOUCH` por tom: `WARM` abraço ou afago; `SEDUCTIVE` carícia; `PLAYFUL` cutucão; `NEUTRAL` toque
no ombro; `IRONIC` tapinha condescendente; `AGGRESSIVE` empurrão.

## 3. Tons

| Id | Nome | Efeito geral | Ambiguidade base | Confusão típica |
| --- | --- | --- | --- | --- |
| `WARM` | caloroso | reforça o que é positivo; aproxima afeto e confiança | 500 | com `SEDUCTIVE` |
| `NEUTRAL` | neutro | sem modulação | 300 | com `IRONIC`, para desconfiados |
| `PLAYFUL` | brincalhão | suaviza ofensas quando há afeto; serve diversão | 1500 | com `AGGRESSIVE` sem afeto; com `IRONIC` |
| `SEDUCTIVE` | sedutor | mexe com atração e desejo; constrange quando indesejado | 1500 | com `WARM` ou `PLAYFUL` |
| `IRONIC` | irônico | morde com elegância; mexe com respeito e ressentimento | 2500 | com `AGGRESSIVE` ou `PLAYFUL` |
| `AGGRESSIVE` | agressivo | negativo forte; medo e raiva | 500 | raramente com `PLAYFUL` |

**Chance de leitura errada** de um tom por um ouvinte:

```text
misread = clamp(
    ambiguity(tom)
  + 500 por faixa de distância acima de 3 células
  + noise(lugar) / 5
  + 2000 se ouviu só um fragmento
  − perceptiveness(ouvinte) / 4
  + max(0, −trustInOthers(ouvinte)) / 4   // desconfiado lê o pior
, 0, 9000)
```

Ao ler errado, o ouvinte escolhe entre as confusões típicas do tom: desconfiados e quem tem
ressentimento pendem para o tom mais negativo; quem tem afeto ou atração, para o mais positivo.

## 4. Tópicos e objetos

| Tipo | Significado | Referência |
| --- | --- | --- |
| `PERSON` | uma pessoa (presente, ausente, o próprio ouvinte ou quem fala) | id do personagem ou pessoa citada |
| `THING` | um objeto, posse ou apego | id da associação |
| `PLACE` | um lugar | tag ou o lugar da cena |
| `EVENT` | algo que aconteceu | id do fato |
| `SECRET` | fato marcado como segredo | id do fato |
| `RUMOR` | fato conhecido de segunda mão (`TOLD`) | id do fato |
| `FEELING` | um sentimento ("o que sinto por você") | emoção ou eixo de laço |
| `SMALL_TALK` | amenidades: clima, trabalho, comida, o dia | — |

Objetos de `REQUEST` e `OFFER`: `HELP`, `INFORMATION`, `ITEM`, `MONEY`, `COMPANY`, `FAVOR`,
`PROMISE`, `SECRECY` (guardar segredo), `DATE` (encontro).

## 5. Valores

- **Intensidade** (0..10000): força do ato. Do SOM vem como nota de 2 a 10, convertida por
  `(nota − 2) × 1250`.
- **Volume:** define quem ouve (ver [modelo de simulação](<simulation-model.md>), seção 8.2).
- **Mentira:** quando `isFalse`, quem conhece o fato verdadeiro detecta com chance
  `4000 + perceptiveness / 2 − eloquence(autor) / 4`; quem não conhece acredita conforme a
  confiança no autor. Mentira descoberta: confiança −2000, ressentimento +1000, e o fato da
  mentira vira memória.
- **Alvos:** um ou mais personagens; `GROUP` dirige o ato a todos que ouvem.

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

Todas as combinações de ato e tom são válidas; o tom modula o efeito.

## 7. Avaliação: o que o ato faz em quem ouve

A **unidade** de efeito é `unit = mulBp(800, intensity) × multiplicador do tom × fator de traço`.
Emoções recebem múltiplos da unidade; laços recebem metade da unidade, com teto de 1500 por ato.

| Ato (interpretado) | Valência | Emoções do ouvinte | Laços do ouvinte com o autor | Vontades do ouvinte |
| --- | --- | --- | --- | --- |
| `GREET` | +1 | alegria + | afeto +, confiança + | companhia − |
| `CHAT` | +1 se o tópico interessa, senão 0 | alegria + ou tédio + | intimidade + | companhia −, curiosidade − se interessa |
| `ASK` | 0 | vergonha ou medo + se o tópico é `SECRET` dele | — | — |
| `TELL` | conforme o fato | segredo contado a ele: alegria +; fato ruim sobre ele: raiva, vergonha + | segredo: confiança +, intimidade + | curiosidade − |
| `PRAISE` | +2 | alegria +; com `SEDUCTIVE` e atração baixa: vergonha + | afeto +, atração + (sedutor) | reconhecimento −, desejo ± |
| `TEASE` | −1 (+1 com `PLAYFUL` e afeto ≥ 5000) | diversão: alegria +; ofensa: raiva +, vergonha + | respeito ±, ressentimento + se ofendeu | dignidade + se ofendeu, diversão − se divertiu |
| `ACCUSE` | −2 | raiva +, vergonha + e culpa + se for verdade | confiança −, ressentimento + | dignidade +, justiça + |
| `REQUEST` | 0 | — | dependência + se aceito | ver faixas (seção 8) |
| `OFFER` | +1 a +2 | alegria +; desconfiança se `perceivedSincerity` baixa | confiança +, afeto + | conforme o objeto |
| `APOLOGIZE` | +1 | raiva −, tristeza − | ressentimento −, confiança + se sincera | justiça − se aceita |
| `THREATEN` | −3 | medo + (escala com medo do autor), raiva + (escala com `temper`) | medo +, ressentimento +, confiança −− | segurança física +, dignidade + |
| `ACCEPT` | +1 a +2 | alegria + | afeto + | a vontade do pedido − |
| `REFUSE` | −1 | raiva + pequena, tristeza + | — | influência +, a vontade do pedido + |
| `FAREWELL` | 0 | tristeza + se afeto alto | — | companhia +, saudade começa |
| `STAY_SILENT` (quando devia responder) | −1 | raiva + pequena | respeito − | reconhecimento + |
| `TOUCH` | `WARM`: +2 com afeto ≥ 4000, senão −1; `SEDUCTIVE`: +2 com atração ≥ 5000, senão −2; `AGGRESSIVE`: −3 | conforme valência: alegria, vergonha, nojo, medo, raiva | afeto, atração, medo, ressentimento | desejo, segurança |

Multiplicadores do tom: `WARM` ×1,2 nos positivos; `AGGRESSIVE` ×1,5 nos negativos e no medo e na
raiva; `IRONIC` soma ressentimento de meia unidade; `PLAYFUL` corta pela metade os negativos
quando há afeto ≥ 5000; `SEDUCTIVE` leva o efeito para atração e desejo, ou para vergonha e nojo
quando a atração do ouvinte pelo autor é baixa e `romanticBoldness` dele é negativo.

Quem age também é afetado: `isFalse` dá culpa +1 unidade a quem tem `honesty > 0`; ferir quem
se ama dá culpa; ferir um inimigo com `justice` alta alivia `justice` e dá alegria a quem tem
`temper > 0`.

## 8. Pedidos: aceite e faixas de resultado

`REQUEST`, `OFFER`, `APOLOGIZE` e `THREATEN` geram, no alvo, uma **disposição de resposta**
sorteada na hora:

```text
p = clamp(
    BASE[ato]                              // REQUEST 5000 · OFFER 6000 · APOLOGIZE 5000 · THREATEN 4000
  + (trust − resentment)(alvo→autor) / 5
  + affection(alvo→autor) / 10
  + (eloquence(autor) − 5000) / 10
  + ajuste do tom                          // WARM +500 · SEDUCTIVE +1000 com atração ≥ 5000, senão −1000
                                           // IRONIC −700 · AGGRESSIVE −1500 (exceto em THREATEN)
  + 1500 se o pedido atende uma vontade dominante do alvo; −1500 se a fere
  + (THREATEN) (fear(alvo→autor) − courage(alvo) / 2) / 3
  − 700 se há testemunhas, o lugar tem pouca privacidade e ceder humilha o alvo
, 500, 9500)
```

Com `u` sorteado em `[0, 10000)` no stream `resolution`:

| Condição | Faixa | Resposta que o alvo deve |
| --- | --- | --- |
| `u < p × 0,2` | `ENTHUSIASTIC` (aceita com entusiasmo) | `ACCEPT` caloroso |
| `u < p × 0,8` | `ACCEPT` | `ACCEPT` |
| `u < p` | `PARTIAL` (aceita com condição ou hesitação) | `ACCEPT` com contrapedido, ou `REQUEST` de volta |
| `u < p + (10000 − p) × 0,7` | `REFUSE` | `REFUSE` |
| restante | `HARD_REFUSE` (recusa firme, com ofensa) | `REFUSE` agressivo; ressentimento + |

A faixa fica registrada e vai para o modelo de texto, que encena a resposta com ela. Ceder a uma
ameaça soma medo e ressentimento ao alvo e satisfaz `influence` do autor; resistir frustra o
autor e pode escalar o conflito.

## 9. Satisfação das vontades (para escolher o ato)

`satisfaction(ato, tom, vontade)` em níveis: 3 = 9000, 2 = 6000, 1 = 3000, ausente = 0.

| Ato | Serve muito (3) | Serve (2) | Serve pouco (1) |
| --- | --- | --- | --- |
| `GREET` | — | companhia | previsibilidade |
| `CHAT` | companhia | intimidade, diversão | curiosidade |
| `ASK` | curiosidade | previsibilidade | companhia |
| `TELL` | reconhecimento | companhia, influência | justiça (expor um ofensor) |
| `PRAISE` | — | intimidade, cuidado | influência |
| `TEASE` | diversão | influência | justiça |
| `ACCUSE` | justiça | dignidade | influência |
| `REQUEST` | a vontade do objeto pedido | — | companhia |
| `OFFER` | cuidado | influência, companhia | propósito |
| `APOLOGIZE` | intimidade | dignidade | previsibilidade |
| `THREATEN` | influência | segurança física, justiça | — |
| `ACCEPT` / `REFUSE` | conforme o pedido | dignidade (recusar) | — |
| `FAREWELL` / `LEAVE` | alívio físico | segurança física | — |
| `APPROACH` | — | companhia | desejo |
| `WITHDRAW` | segurança física | — | dignidade |
| `TOUCH` | — | intimidade | cuidado |

Somas de tom: `SEDUCTIVE` acrescenta desejo 3; `PLAYFUL` acrescenta diversão 2; `AGGRESSIVE`
acrescenta influência 2 e justiça 2 quando o alvo é um ofensor; `IRONIC` acrescenta diversão,
influência e justiça 1; `WARM` acrescenta intimidade 1.

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
| `STAY_SILENT` quando devia responder; `WITHDRAW` por medo | `sociability` − leve, `courage` − leve |
| `GREET` ou `CHAT` em `WARM` | `sociability` + leve, `empathy` + leve |
| `OFFER` de `HELP` | `empathy` + forte |
| interromper alguém | `selfControl` − leve |
| não revidar com raiva ≥ 7000 | `selfControl` + forte |
| sair por medo (`LEAVE` com ameaça ≥ 6000) | `courage` − forte |

## 11. Da fala livre ao ato (SOM)

Quando o jogador escreve, o SOM recebe a fala, o contexto da cena e os fatos que o personagem do
jogador conhece, e responde a perguntas atômicas (detalhes em
[integração de IA](<ai-integration.md>)):

| Pergunta | Tipo | Opções |
| --- | --- | --- |
| `act` | `choice` | os 20 atos + `OTHER` |
| `tone` | `choice` | os 6 tons |
| `target` | `choice` | os presentes que ouvem + `GROUP` + `NOBODY` |
| `topicType` | `choice` | os 8 tipos de tópico |
| `topicRef` | `choice` | entidades salientes conhecidas + `NONE` + `OTHER` |
| `object` | `choice` | só se `act` for `REQUEST` ou `OFFER` |
| `intensity` | `score` | régua de 2 a 10 |
| `volume` | `choice` | `WHISPER`, `NORMAL`, `SHOUT` |
| `isFalse` | `noul` | "a fala afirma como verdade algo que contradiz os fatos conhecidos?" |

Se a maior probabilidade de `act` ou de `target` ficar abaixo de 7000 bp, ou se `act` for
`OTHER`, a interface mostra a etiqueta "entendido como" para o jogador confirmar ou corrigir
(D-20). A leitura original e a correção ficam registradas.
