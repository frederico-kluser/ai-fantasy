# ADR 0009 — Separar silhuetas privilegiadas da percepção autoritativa

- **Status:** Proposto — decisão de produto registrada; contrato técnico em revisão
- **Data:** 2026-11-08
- **Decisor da intenção de produto:** @frederico-kluser
- **Relacionado:** [decisão D-04](<../../planning/decisions.md#d-04--silhuetas-de-todos-atrás-das-construções>), [ADR 0005](<0005-deterministic-simulation-contract.md>)
- **Implementação:** não iniciada; API, permissões e algoritmo não aprovados

## Contexto

O ambiente usa visão ativa, memória congelada da última observação e escuro para o nunca
percebido. A revisão sugeriu restringir silhuetas aos atores já percebidos; o maintainer
escolheu explicitamente “Todos atrás das construções”.

A intenção inclui revelar presença de atores não percebidos: é um “raio X” deliberado para
apresentação ao jogador. Aplicar essa escolha não pode atualizar automaticamente last-seen,
transformar a câmera em sensor ou dar esse conhecimento aos NPCs/MLPs.

## Decisão de produto registrada

1. Todos os personagens atrás das construções, incluindo os não percebidos, são
   apresentados como silhuetas. Não reduzir a decisão a “somente atores no FOV”.
2. O ambiente conserva suas três camadas autoritativas. A silhueta é um overlay privilegiado
   adicional de apresentação, não uma quarta camada de memória ou nova percepção do ator.
3. Dados atuais usados nesse overlay não atualizam last-seen, memória ambiental, informação
   de rumores, conhecimento de NPCs ou entradas percebidas da MLP.
4. A API de leitura distingue percepção/memória por observador de dados privilegiados do
   overlay. O cliente não escreve no core nem usa o overlay como sensor de NPCs.
5. Câmera e navegação por z-levels alteram somente apresentação; não avançam ticks, mudam
   direção autoritativa ou congelam outras localidades.
6. A visualização final continua 2D isométrica, nunca 3D real. A stack de render permanece
   aberta e não é escolhida por este ADR.

O jogador humano recebe informação privilegiada de apresentação; isso não equivale a
registrar percepção no personagem. Comandos decorrentes da escolha humana continuam sujeitos
às regras normais de validação, custo e aplicação do núcleo.

## Contrato técnico ainda em revisão

CTR-03, FOV-01, VIEW-01 e RENDER-01 do [ROADMAP](<../../../ROADMAP.md>) devem especificar:

- Alcance e recorte das silhuetas, incluindo áreas nunca visitadas ou percebidas.
- Relação entre z-level atual, andares acima/abaixo, paredes, telhados e oclusão de projeção.
- Forma e quantidade de informação exposta além da presença; não presumir atributos extras.
- Identidade de personagem, revisão/tick e consistência dos dados nas duas interfaces.
- Permissões e composição do overlay de jogador/depuração, sem consumo por NPCs/MLPs.
- Ordem visual e testes que distingam ambiente last-seen de silhueta atual privilegiada.

Não se aprova alcance ilimitado para toda a região, número de andares, algoritmo de seleção,
DTO concreto ou acesso externo ao mundo inteiro. Essas pendências não podem ser usadas para
reintroduzir o filtro rejeitado de apenas atores previamente percebidos.

## Consequências

### Positivas

- A apresentação corresponde à escolha explícita do maintainer.
- Silhuetas e memória deixam de disputar uma única definição de “visível”.
- A simulação conserva conhecimento e decisões reprodutíveis, independentes da câmera.

### Custos e riscos

- Informação de presença é revelada deliberadamente ao jogador; o contrato deve deixar isso
  claro sem apresentar a exceção como falha acidental de fog of war.
- Uma API privilegiada precisa de fronteira e testes para não contaminar decisões dos NPCs.
- Estado atual do overlay e snapshot histórico do ambiente podem divergir legitimamente;
  goldens precisam distinguir os dois canais.

## Alternativas consideradas

- **Silhuetas só para atores percebidos:** recomendação não selecionada pelo maintainer.
- **FOV autoritativo enxergando através de paredes para todos:** mistura privilégio de
  apresentação com conhecimento do personagem e não representa a separação requerida.
- **Overlay privilegiado separado:** registra a intenção escolhida; detalhes técnicos ficam
  em revisão antes de implementar.

## Critérios de verificação planejados

- Um ator não percebido atrás de construção aparece como silhueta conforme o alcance/Z
  contratados, sem ser excluído somente por não estar no FOV.
- Desenhar ou atualizar silhuetas não modifica last-seen, conhecimento de NPCs, inputs de
  MLP, informações de rumores, tick, RNG ou hash autoritativo.
- Após ações avançarem o mundo, presença privilegiada atual pode mudar sem reescrever o
  snapshot de ambiente observado anteriormente.
- Navegar pela câmera/z-levels conserva a simulação de todas as localidades.
- As respostas de percepção e overlay são somente leitura, consistentes por revisão/tick
  e não expõem dados privilegiados à interface de decisão de NPCs/MLPs.
- Casos de área escura, parede, telhado e andares seguem contrato explícito; não há exclusão
  de atores não percebidos por conveniência de implementação.

Esses critérios são especificação de testes futuros; não foram executados neste pacote.

## Referências locais

- [Registro das respostas do maintainer](<../../planning/decisions.md>) — 2026-11-08.
- [Visibilidade e memória canônicas](<../roadmap.md#211-visibilidade-campo-de-visão-e-memória-de-ambientes-fog-of-war>).
- [Arquitetura de software](<../overview.md>).
- [ROADMAP de execução](<../../../ROADMAP.md>).
