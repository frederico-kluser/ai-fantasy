# ADR 0008 — Avançar a simulação por ações do personagem

- **Status:** Proposto — decisão de produto registrada; contrato técnico em revisão
- **Data:** 2026-11-08
- **Decisor da intenção de produto:** @frederico-kluser
- **Relacionado:** [ADR 0005](<0005-deterministic-simulation-contract.md>), [decisão D-02](<../../planning/decisions.md#d-02--tempo-avança-pelas-ações-do-personagem>)
- **Implementação:** não iniciada; este ADR não autoriza scaffold ou código

## Contexto

O núcleo já usa ticks lógicos determinísticos, mas isso não define a experiência temporal.
A antiga referência de 100 ms podia ser interpretada incorretamente como atualização
contínua por relógio real. A devolutiva do maintainer foi: “Tempo se move de acordo ao
personagem se mover/falar”.

Ler diálogo, aguardar inferência ou navegar na câmera não deve consumir simulação por
acidente. A primeira base também é regional: focar uma localidade não pode suspender as
outras nem apagar sua contribuição ao estado canônico.

## Decisão de produto registrada

1. O avanço do mundo é orientado por ações autoritativas do personagem. Movimentação e
   fala simbólica têm duração/custo lógico determinístico; não são medidas pelo relógio real.
2. A fala que consome tempo é o ato no mundo, não o texto gerado, o tempo de leitura ou a
   duração de áudio. Gerar NLG novamente não executa novamente a fala.
3. UI, câmera, navegação por z-levels, espera de modelos e observação de informações já
   produzidas não acrescentam ticks por si só.
4. Ao processar o intervalo lógico de uma ação, sistemas e agendas de NPCs processam os
   ticks devidos da região. A área em foco não define a existência ou atividade das demais.
5. O [ADR 0005 aceito](<0005-deterministic-simulation-contract.md>) permanece intacto.
   Esta proposta complementa a intenção de produto sem substituir seu determinismo.

## Contrato técnico ainda em revisão

CTR-02, DOC-02 e os cartões de core do [ROADMAP](<../../../ROADMAP.md>) precisam fechar:

- Catálogo de ações, unidade de custo, duração por ação e regras de ações compostas.
- Ordem entre efeitos do comando, avanço de ticks e execução de agendas dos NPCs.
- Custos e efeitos de ação inválida, rejeitada, cancelada, repetida ou parcialmente planejada.
- Política de atividade entre localidades, sem presumir congelamento por câmera ou LOD.
- Registro de entradas normalizadas, inferência, abstenção e timeout para replay sem modelos.
- Promoção transacional do estado e RNG, autoridade durável e publicação do resultado.

Não se aprova neste ADR um tick por movimento/fala, uma taxa em milissegundos, uma fórmula
numérica, ordem de agenda concreta ou custo universal de rejeição. Não há nova porta ou
assinatura de código aprovada apenas por esse registro.

## Consequências

### Positivas

- A experiência de tempo corresponde às ações do personagem, não à velocidade da máquina.
- Diálogo e apresentação não alteram silenciosamente a simulação.
- Bugs regionais podem ser encontrados cedo, mesmo com foco de teste em uma área.
- Replays podem reproduzir a mesma agenda quando custos, entradas e ordem forem contratados.

### Custos e riscos

- Agendas e ações compostas precisam de contrato explícito para evitar avanço duplicado.
- Inferência fora do núcleo exige revalidação e registro de entradas externas relevantes.
- Região completa requer medição de trabalho por ação; nenhum teto de hardware foi fixado
  nesta etapa e nenhuma suspensão de áreas foi aprovada por conveniência.

## Alternativas consideradas

- **Relógio real contínuo:** não representa a resposta recebida; não é o ritmo adotado.
- **Um tick fixo para toda ação:** não foi escolhido; custos precisam ser especificados.
- **Tempo definido pelo texto NLG:** incompatível com fala simbólica e NLG somente leitura.
- **Congelar áreas fora da câmera:** incompatível com a decisão regional desde a base.

## Critérios de verificação planejados

- A mesma sequência de ações e entradas normalizadas produz ticks, agendas, efeitos e hash
  iguais em reexecuções e entre Windows/Linux, sem usar relógio real para decidir.
- Ler ou regenerar uma conversa e navegar por z-levels conserva tick, RNG e estado regional.
- Falar simbolicamente uma vez cobra o custo contratado uma vez, independentemente de cache.
- Durante os ticks de uma ação, um evento/rumor de outra localidade evolui conforme a agenda
  contratada; mudar foco não congela sistemas nem remove entidades do hash.
- Rejeição, cancelamento, resposta tardia e falha de durabilidade seguem resultados e custos
  explicitamente definidos, sem aplicação parcial ou consumo definitivo indevido de RNG.

Esses critérios são especificação de testes futuros; não foram executados neste pacote.

## Referências locais

- [Registro das respostas do maintainer](<../../planning/decisions.md>) — 2026-11-08.
- [Tempo e determinismo canônicos](<../roadmap.md#23-tick-tempo-e-determinismo>).
- [Estratégia de testes](<../../engineering/testing-strategy.md>).
- [ROADMAP de execução](<../../../ROADMAP.md>).
