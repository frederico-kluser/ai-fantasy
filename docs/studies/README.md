# Estudos e revisão de mecânicas — AI Fantasy

> **Estado:** esboço de trabalho. Este README organiza as notas dos dois estudos da pasta e
> mostra como elas modificam o plano atual. **Nada aqui está ratificado**; os contratos
> DOC-02/CTR-01…CTR-05 continuam a ser a fonte técnica até uma decisão explícita.
>
> **Estudos de origem:**
>
> - [Avaliação e Arquitetura AI Fantasy](<Avaliação e Arquitetura AI Fantasy.md>)
> - [Expansão Sistêmica Do AI Fantasy](<Expansão Sistêmica Do AI Fantasy.md>)

## 1. Para que serve esta pasta

Esta pasta guarda análises longas e propostas de expansão. O README existe para:

1. registrar as notas que o maintainer considerou importantes;
2. dizer **o que muda** em relação ao plano atual (D-01…D-08, DOC-02, CTR-01…CTR-05, PDs);
3. separar **ideia**, **proposta**, **decisão pendente** e **conflito com contrato**;
4. permitir retomar o trabalho sem reler 1,5 MB de estudos.

Regra: uma nota só vira contrato depois de decisão humana, revisão do contrato afetado,
atualização dos consumidores e testes. Os estudos podem propor fórmulas; não as tornam cânone.

### O que cada estudo cobre

- **Avaliação e Arquitetura:** diagnóstico dos contratos atuais; arquitetura neuro-simbólica com
  SOM, micro-MLP e LLM; separação entre decisão, regra e diálogo; fecho proposto de P-07, P-04 e
  INT-04; plano sequencial de execução.
- **Expansão Sistêmica:** calendário lógico e escala temporal; fisiologia e necessidades;
  sanidade e o status 6; utilidade/agenda; comércio e rumores económicos; interações públicas,
  segredos e tavernas; velhice e gerações; resumo de alterações propostas aos contratos.

As fórmulas e números detalhados ficam nos estudos. Este README fica com as notas de decisão e
com o impacto no plano; não duplica 1,5 MB de análise.

## 2. O plano atual em uma página

O que já está contratado:

- **D-01:** motor antes do produto 2D.
- **D-02:** tempo por ação (mover/falar), não por relógio/UI/NLG.
- **D-03:** foco social e rumores.
- **D-04:** overlay de todas as silhuetas atrás de construções, em canal separado; não é conhecimento.
- **D-05:** CPU/GPU na mesma máquina, Windows/Linux, sem teto antecipado.
- **D-06:** 2D isométrico, nunca 3D; stack aberta.
- **D-07:** região multi-localidades desde a base.
- **D-08:** paralelismo sem cap, com revisor/juiz (processo).

Contratos de lógica: DOC-02 (comandos/tempo/sociedade), CTR-01 (identidade/eventos),
CTR-02 (tempo/RNG/replay/save), CTR-03 (região/percepção/overlay), CTR-04 (modelo/schema),
CTR-05 (toolchain/qualidade — não é mecânica).

O que está pendente: PD-01…PD-09, P-04, P-07, PA-06…PA-09, stack de render, fórmula do
modificador de check, escopo de itens/economia e MLP individual.

## 3. As nove notas

### N-01 — Ações físicas têm velocidade influenciada pelos status

**Nota:** o custo/ticket de uma ação física não deve ser fixo igual para todos. Status
fisiológicos (fome, fadiga, ferimentos, medo, etc.) alteram a velocidade base; por isso
**personagens diferentes levam tempos diferentes** para a mesma ação.

**Por que:** um personagem exausto, ferido ou com medo não se move como um descansado. Sem isso,
os status são decoração e o tempo deixa de refletir o estado do personagem.

**Impacto no plano atual:**

- D-02 continua válido (tempo por ação), mas o custo passa a ser **por ator**, não uma constante
  global.
- CTR-02/INT-04 precisam de uma função de custo: `custo_base × modificador_de_status`, com
  arredondamento e limites inteiros.
- Agenda, viagem, replay, testes de fixture e comparação de tempos mudam.
- É preciso decidir se o modificador é linear, por faixas ou tabela; e se há um mínimo de 1 tick.

**Status:** proposta forte; exige alteração de DOC-02/CTR-02 e novos testes.

### N-02 — Não é só LFM3: SOM de decisão + LLM de diálogo

**Nota:** o projeto não tem apenas modelos SOM de decisão; tem também **modelos de LLM** que
convertem a descrição simbólica em **diálogo**, quando o personagem está a ouvir ou presente.

**Por que:** a decisão social e a dramatização são tarefas diferentes. Um SOM/utility decide o que
o NPC quer; um LLM transforma o facto simbólico em fala interpretativa. Misturar as duas coisas
torna o comportamento opaco e caro.

**Impacto no plano atual:**

- O plano atual já separa “modelo propõe / núcleo dispõe” e NLG preguiçosa, mas não tem um papel
  explícito para o **LLM de diálogo**.
- É preciso separar três papéis: decisão (SOM/utility/regras), proposta de regra emergente
  (LFM3/schema) e realização de diálogo (LLM/NLG).
- O LLM de diálogo só entra quando há um ouvinte/presente; não é um narrador omnisciente.
- Latência, timeout e custo do LLM não podem avançar o tick; a conversa é resolvida
  simbolicamente antes e dramatizada depois.

**Status:** requer desenho de portas/modelos e decisão sobre quais modelos locais são suportados.

### N-03 — Acesso ao diálogo depende da proximidade

**Nota:** um personagem só tem acesso ao diálogo em função de quão próximo está dos falantes.
Fora do alcance, não ouve a conversa.

**Por que:** privacidade, eavesdropping e boatos dependem de quem ouve o quê. Se todos ouvem tudo,
a sociedade fica plana e os rumores perdem sentido.

**Impacto no plano atual:**

- CTR-03 tem visão/alcance/linha de visão e testemunhas; falta uma **percepção auditiva** própria
  (raio de audição, oclusores, ruído, língua).
- “Presente” e “a ouvir” não são a mesma coisa: podemos ver a silhueta e não ouvir as palavras.
- O diálogo acessível ao jogador deve ser filtrado pelo que os personagens presentes/ouvintes
  percebem; o jogador não ganha omnisciência.
- Testemunhas de rumor e testemunhas de fala podem divergir.

**Status:** proposta forte; exige extensão do CTR-03 e regras de interface.

### N-04 — Interações não são puramente determinísticas, nem entre NPCs

**Nota:** as interações não são puramente determinísticas, incluindo NPC↔NPC. Há uma
**percentagem de coisas acontecerem**; o procedural diz respeito à criação do mundo, mas as
interações podem levar a situações diferentes.

**Por que:** rigidez total torna a sociedade previsível e sem tensão. O jogador deve sentir que
uma conversa pode correr de formas diferentes.

**Impacto no plano atual — ponto crítico:**

- O projeto exige determinismo/replay: mesmo seed + entradas → mesmo estado/hash (D-05/CTR-02).
- A leitura compatível é: **estocástico na ficção, determinístico no replay** — o resultado é
  sorteado de probabilidades explícitas, com RNG semeado e registado; o mesmo seed reproduz a
  mesma sequência.
- Se “não determinístico” significar resultados diferentes com o mesmo seed/entradas, há
  **conflito direto** com CTR-02/D-05 e é preciso decisão humana.
- O modelo não pode ser a fonte do sorteio; o núcleo usa streams explícitos e regista o resultado.

**Status:** requer ratificação da interpretação “probabilístico, mas reproduzível”.

### N-05 — O diálogo está simplificado; faltam drives sociais

**Nota:** a mecânica de diálogo está simplificada. Falta coisa como **senso de vingança**,
**saudade** ou outros motores que fazem a sociedade mover-se.

**Por que:** relações e labels sozinhos não explicam por que um NPC procura alguém, guarda rancor,
sente falta ou arrisca uma confissão. Sem drives, o diálogo é reativo e sem subtexto.

**Impacto no plano atual:**

- CTR-01 tem eixos de relação e labels, mas não tem **drives/motivações** explícitas.
- É preciso decidir um conjunto pequeno e testável: vingança, saudade, medo, ambição, curiosidade,
  pertença, justiça, etc. (os estudos propõem cinco necessidades; ver N-09).
- Drives alimentam a agenda (o que o NPC faz) e o diálogo (o que ele diz e omite).
- Drives não são texto: são estado simbólico com valores inteiros e limiares.

**Status:** requer nova secção de estado social e decisão sobre a lista mínima.

### N-06 — Rumores persistem por difusão e ensaio; o tempo degrada a memória

**Nota:** um rumor pode persistir se for muito difundido. Um personagem que **fala ou ouve** o
rumor N vezes pode não o esquecer; mas o tempo degrada a memória do personagem sobre o rumor.

**Por que:** rumor não é só uma cópia com fidelidade; é uma memória rehearsada. A repetição
reforça, o tempo apaga, e a difusão aumenta a chance de sobrevivência.

**Impacto no plano atual:**

- CTR-01/CTR-02/CTR-04 têm cópia por portador, fidelidade, meia-vida e limiar de cognição; falta
  **força de memória** por ator, contador de ensaios e limiar de esquecimento.
- É preciso distinguir: fidelidade da cópia (qualidade da informação) × força da memória
  (probabilidade de ser lembrada/retransmitida).
- Falar/ouvir N vezes reforça; não falar por muito tempo degrada; difusão ampla pode manter o
  rumor vivo mesmo com o tempo.
- Isto interage com a perceção (N-03), com os drives (N-05) e com a probabilidade (N-04).

**Status:** proposta forte; exige extensão de contratos e testes de memória.

### N-07 — O MVP começa pelo diálogo, negociação, paquera, provocação e conversa

**Nota:** o roadmap deve mudar: a primeira coisa do MVP a confirmar é o **sistema de diálogo,
negociação, paquera, provocação e conversa**.

**Por que:** é o diferencial social; validar isso primeiro evita construir mundo/economia/combate
antes de saber se a conversa é interessante.

**Impacto no plano atual:**

- O ROADMAP/wave-spec atuais começam por contratos + scaffold + núcleo; a ordem do **MVP de
  produto** deve passar a ser social-first.
- O primeiro vertical slice deve ter: dois ou mais NPCs próximos, perceção de fala, uma conversa,
  uma negociação, uma paquera/provocação, reações probabilísticas, diálogo gerado e memória/rumor.
- Movimento físico pode existir como mínimo para posicionar os atores; combate, construção,
  economia e mundo grande ficam depois.
- É preciso decidir se “paquera” e “provocação” são intenções canónicas novas ou variações de
  `SOCIAL_TALK`/`NEGOTIATE`/`EXTORTION`.

**Status:** decisão de roadmap; requer atualização de DOC-02, ROADMAP e wave-spec.

### N-08 — Atributos afetivos também a coisas, não só a pessoas

**Nota:** personagens podem ter atributos afetivos não apenas a pessoas, mas a **coisas** — o que
dá senso de posse ou de perseguir algo.

**Por que:** apego a um objeto, herança, relíquia ou casa explica comportamento que relações
interpessoais não explicam. É a base de posse, inveja, presente, roubo e persistência.

**Impacto no plano atual:**

- CTR-01 só tem relações direcionadas entre atores; falta **apego a objeto/local**.
- É preciso decidir se o alvo é `ItemId`, `StructureId`, `LocalityId` ou uma categoria.
- Interage com PD-04 (itens/economia fora por omissão) e com o inventário; se itens ficam fora,
  o apego pode começar por lugares/heranças/ideias.
- Apego alimenta drives, negociação, presente e conflito.

**Status:** proposta; depende da decisão sobre itens/economia.

### N-09 — Necessidades fisiológicas movem o personagem

**Nota:** necessidades fisiológicas precisam de ser consideradas porque também movem o personagem.

**Por que:** fome, fadiga, sono, sede e segurança não são só status; determinam o que o NPC
procura, aceita ou arrisca. Sem elas, a agenda é arbitrária.

**Impacto no plano atual:**

- CTR-01 já tem HP, fadiga, fome e flags, mas não a **progressão** nem o efeito na decisão.
- É preciso decidir taxas, limiares e consequências; os estudos propõem basis points, pulsos de
  10 ticks e limiares de 7500 bp, mas isso ainda não é contrato.
- As necessidades alimentam a utilidade da agenda (o que fazer) e o custo das ações (N-01).
- Cuidado com o contrato não-letal: incapacitação/coma podem ser preferíveis a morte; isso exige
  decisão.

**Status:** proposta forte; requer extensão de CTR-01/CTR-02 e decisão sobre morte/incapacitação.

## 4. Como as notas conversam entre si

```text
Fisiologia (N-09) ──> velocidade/custo (N-01) ──> tempo por ator
       │                                            │
       ├──> drives (N-05) ──> agenda/decisão ──> diálogo (N-02)
       │                                            │
       └──> apego a coisas (N-08) ──> posse/negociação
                                                    │
Percepção/audição (N-03) ──> quem ouve ──> rumor (N-06)
                                                    │
Probabilidade (N-04) ──> resultados variados, mas replay determinístico
                                                    │
Roadmap (N-07) ──> MVP social primeiro
```

Consequências transversais:

- **Tempo:** deixa de ser uma tabela global e passa a ser uma função do ator + estado + ação.
- **Determinismo:** probabilidade não pode significar caos; tem de haver RNG semeado, registo e
  replay.
- **Modelos:** decisão, proposta de regra e diálogo são papéis separados; nenhum escreve no estado.
- **Percepção:** ver, ouvir e conversar são camadas diferentes; o jogador não é omnisciente.
- **Memória:** rumor é cópia + memória + ensaio + tempo, não só fidelidade.
- **Sociedade:** relações + labels + drives + necessidades + apego; sem isso o diálogo é plano.

## 5. Impacto por documento

| Documento | O que precisa mudar |
| --- | --- |
| `DECISOES.md` | Novas decisões propostas: velocidade por status, modelos separados, proximidade/audição, probabilidade reproduzível, drives, memória de rumor, MVP social, apego a coisas, fisiologia. |
| `PLANO-DE-MECANICAS-E-LOGICA.md` | Atualizar tempo, modelos, perceção, diálogo, rumores, necessidades e escopo. |
| `DOC-02` (`gameplay-spec.md`) | Novas intenções (paquera/provocação?), custos por ator, audição, drives, fisiologia, MVP. |
| `CTR-01` (`identity-events.md`) | Estado afetivo/necessidades/apego, memória de rumor, eventual `stress/age`, novos factos. |
| `CTR-02` (`time-replay-save.md`) | Custo variável por ator, RNG de interações, streams de probabilidade, replay. |
| `CTR-03` (`region-perception-overlay.md`) | Audição/alcance de diálogo, privacidade, testemunhas de fala vs visão. |
| `CTR-04` (`model-schema.md`) | Papel do LLM de diálogo, portas, separação decisão/regra/diálogo, validação. |
| `ROADMAP.md` / `wave-spec.md` | Reordenar o MVP para social-first; adiar mundo/economia/combate. |

## 6. Proposta de MVP social-first

**Objetivo:** provar que a conversa é interessante antes de construir o resto.

**Vertical slice mínimo:**

1. Dois ou três NPCs numa localidade, com posições e necessidades básicas.
2. O jogador aproxima-se; só ouve quem está ao alcance.
3. Inicia conversa, negociação, paquera ou provocação.
4. O NPC decide com base em relações, drives, necessidades e probabilidade semeada.
5. O resultado é um facto simbólico; o LLM gera o diálogo fora do tick.
6. O rumor/memória resultante pode ser lembrado, ensaiado e transmitido.
7. O mesmo seed reproduz a mesma cena; um seed diferente pode dar outra.

**Fora do primeiro slice:** combate, construção, economia completa, mundo grande, render final,
MLP individual, genética.

**Critério de sucesso proposto:**

- o jogador consegue ter uma conversa com dois NPCs e obter resultados diferentes em execuções
  diferentes;
- o mesmo seed/inputs reproduz a mesma conversa;
- um NPC que não está perto não ouve o diálogo;
- uma relação/emoção muda de forma observável;
- um rumor pode sobreviver por repetição e degradar-se pelo tempo;
- o diálogo gerado não inventa factos fora do ledger.

## 7. O que ainda não sabemos fazer

- **Probabilidade + determinismo:** definir a fronteira exata entre “resultado variado” e “replay
  exato”; sem isso, N-04 conflita com CTR-02.
- **Modelos locais:** qual LLM/SOM, latência, memória, qualidade de diálogo e custo; ainda não há
  medição.
- **Audição:** como modelar raio, oclusores, ruído e língua sem transformar perceção numa segunda
  FOV.
- **Drives:** lista mínima, escala, interação e como evitar que dominem a personalidade.
- **Memória de rumor:** como combinar fidelidade, ensaio, difusão e esquecimento sem inflar o save.
- **Fisiologia:** taxas, limiares, incapacitação e relação com a regra não-letal.
- **Apego a coisas:** como representar posse/apego sem economia completa.
- **MVP:** quanto de movimento/mundo é necessário para o slice social; e como medir “conversa
  interessante”.
- **Roadmap:** como reordenar sem quebrar contratos já congelados e sem perder os gates.

## 8. Onde precisamos da tua decisão

1. **Probabilidade:** “não determinístico” significa **probabilístico com RNG semeado e replay
   exato**, ou resultados diferentes com o mesmo seed? A segunda opção conflita com D-05/CTR-02 e
   precisa de uma decisão explícita.
2. **MVP:** confirmas o slice social (diálogo/negociação/paquera/provocação) como primeira
   entrega, com movimento mínimo e sem combate/economia?
3. **Modelos:** queremos LLM local só para diálogo e SOM/utility para decisão, ou o LFM3 também
   propõe regras? Qual é o modelo mínimo aceitável para o primeiro slice?
4. **Audição:** o alcance de diálogo é o mesmo do alcance social de 2 células, ou há um raio de
   audição próprio? Uma parede bloqueia som? Quem está atrás de uma parede vê silhueta mas não
   ouve?
5. **Drives:** qual é a lista mínima? Vingança e saudade entram já? Como se medem e como decaem?
6. **Fisiologia:** fome/fadiga podem causar incapacitação/coma? O contrato não-letal mantém-se?
7. **Apego a coisas:** começa por itens, lugares ou ambos? Isto força a decisão sobre PD-04
   (itens/economia dentro ou fora)?
8. **Roadmap:** aceitas adiar mundo/economia/combate e reordenar as ondas para social-first?

## 9. Próximos passos sugeridos

1. Responder às oito decisões acima; registar em `DECISOES.md` como D-09… (propostas).
2. Atualizar `PLANO-DE-MECANICAS-E-LOGICA.md` com a versão social-first.
3. Abrir revisões de DOC-02/CTR-01…CTR-04 para os pontos aceitos.
4. Reordenar `ROADMAP.md`/`wave-spec.md` e criar o primeiro slice social.
5. Só depois retomar scaffold/código com os contratos atualizados.

---

**Regra final:** os estudos são matéria-prima, não contrato. Se uma nota mudar um valor já
congelado, a mudança tem de ser explícita, revista e testada — nunca “silenciosa”.
