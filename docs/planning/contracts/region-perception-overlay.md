# Contrato CTR-03 — Região, percepção autoritativa e overlay privilegiado de silhuetas

> **Status:** **PROPOSTA PARA FREEZE — pendente de revisão independente; alcance visual
> aprovado pelo maintainer em 2026-11-08 (A1 + D1 + Z2 + N1 + O1, `max_silhouettes = 256`)** —
> nenhum código de aplicação, engine de render, teste executado, medição ou valor de hash foi
> produzido.

| Campo | Valor |
| --- | --- |
| Tarefa | `CTR-03` — Região, percepção e overlay privilegiado de silhuetas |
| Dono | `S-CONTRACT` |
| Perfil | `planner-specialist` |
| Fronteira | `03` |
| Data | `2026-11-08` |
| Base SHA | `b0cc40efa439d26d1b785c99e76daf5006a956ee` |
| Manifesto | `docs/planning/wave-spec.md`, SHA-256 `328a8c7e121c9e4411bf0c105c3845c636e37bf208770fbc675f2cff4a360769` |
| Worktree | `C:\Users\kluse\Projects\ai-fantasy-worktrees\ctr-03`, branch `docs/ctr-03` |
| Contrato consumido | `CTR-01` rev 5 — [identidade, unidades e eventos](<identity-events.md>), commit `11ee9be6c44a0651b291141130baf709ab46a004` |
| Especificação consumida | `DOC-02` — [sessão de gameplay social regional](<../gameplay-spec.md>), commit `31416a137be781b7534dcd6abc46d1d8fc895f65` |
| Alcance visual | **Aprovado pelo maintainer em 2026-11-08** — `A1 + D1 + Z2 + N1 + O1`, `max_silhouettes = 256` |
| Interfaces produzidas | `INT-03`, `INT-14`, `INT-15`, `INT-19` |
| ADR relacionado | [ADR 0009](<../../architecture/adr/0009-privileged-silhouette-overlay.md>), status **Proposto** |
| Versão do contrato | v1 |
| Revisão | `REVIEW-CTR-03` é obrigatória; este documento não se autoaprova |
| Implementação | Nenhuma; sem crate, `Cargo.toml`, binário, teste de aplicação ou escolha de stack |

Este contrato fecha as decisões de célula, material, estrutura, item, região procedural,
percepção autoritativa, overlay de silhuetas e interface lógica do cliente 2D que os cartões
`GRID-01`, `FOV-01`, `VIEW-01`, `RENDER-01`, `GRID-02`, `BEH-01` e `PLAY-01` precisam consumir.
Ele é normativo e documental: os tipos citados em `code spans` são propostas de domínio, não
código existente. Os caminhos de código mencionados são destinos futuros, não ficheiros atuais.

## 1. Escopo, não-escopo e decisões preservadas

### 1.1 Escopo

- Célula, superfície, preenchimento, material, opacidade, passagem, ocupação e classificação de
  célula; estrutura cúbica como agregado de blocos; item normal fora da grelha.
- `GridPoint`, níveis de `z`, chunks, `GridBounds` e limites contratuais de coordenadas.
- Payloads lógicos das secções canónicas `REGION`, `LOCALITIES`, `STRUCTURES` e `BLOCKS` que o
  CTR-01 deixou ao dono `CTR-03`, sem alterar tags, ordem, primitivas ou versão do envelope.
- `RegionSpec`, seed, geração determinística com pelo menos três localidades, portões, arestas,
  rotas, desempate, rejeições e preservação de áreas fora do foco (D-07).
- `compute_perception`, `update_memory` e `observer_view`; visão direcional determinística,
  memória congelada, estado desconhecido, `last_seen` e DTO por observador com tick e revisão.
- `player_silhouettes`: canal privilegiado somente leitura, elegibilidade geométrica, dados
  expostos e alcance `A1 + D1 + Z2 + N1 + O1` aprovado pelo maintainer em 2026-11-08 (D-04).
- Câmera, foco, navegação por `z` e viewport como apresentação pura, sem ticks, RNG, hash,
  agenda, memória ou congelamento de localidades (D-02/D-07).
- Interface lógica `present(...)` independente de linguagem e stack, projeção isométrica 2D,
  camadas, z-order, picking e input; gate de decisão de stack (D-06).
- Percepção abstrata para NPC/MLP (trilha W8/BEH) que exclui o overlay privilegiado.
- Erros tipados, validações atómicas, critérios de aceite `AC-CTR-03-01` a `AC-CTR-03-04`,
  testes futuros, tabela de decisões para freeze e pendências de aprovação humana.

### 1.2 Não-escopo

- Implementação, crates, `Cargo.toml`, binários, testes Rust, benchmarks, golden de hash ou
  medições de CPU/GPU.
- Escolha de engine, linguagem, biblioteca gráfica, ponte IPC, formato de assets, build ou
  política de testes do cliente; isso pertence ao gate de stack de `RENDER-01` (D-06).
- Render real, malhas, iluminação 3D, animação, áudio, câmera 3D ou qualquer pipeline de GPU.
- Custos de ação, agenda, RNG de simulação, save, replay, migração e transação: pertencem a
  `CTR-02`, `GAME-01`, `STORE-01`/`STORE-02` e `REPLAY-01`.
- Regras sociais, rumores, MLP/genoma, construção e combate: pertencem a `CTR-04`, `SOC-*`,
  `BEH-*` e `GRID-02`.
- Alterar `ROADMAP.md`, `wave-spec.md`, `decisions.md`, prompts, ADRs, ledger, outros
  contratos, `README.md` ou índices compartilhados.
- Reabrir qualquer decisão D-01 a D-08 ou declarar freeze, aceite, `DONE` ou `INTEGRATED`.

### 1.3 Relação com as decisões D-01 a D-08

Nenhuma decisão é reaberta; a tabela declara compatibilidade.

| Decisão | Como este contrato a preserva |
| --- | --- |
| D-01 | O contrato é de motor e de leitura, não de produto 2D final; não antecipa render nem TUI. |
| D-02 | Câmera, foco, zoom, resize, overlay e NLG custam 0 ticks; nenhum deles é sensor ou ação. |
| D-03 | Percepção e memória alimentam conhecimento e decisões sociais; o overlay não entra nesse canal. |
| D-04 | Silhuetas de todos os atrás de construções, inclusive não percebidos, em canal separado; nada de "somente percebidos". |
| D-05 | Nenhum limite de coordenadas, chunk ou silhueta é teto de hardware ou de desempenho; são validações de contrato. |
| D-06 | Nenhuma stack ou engine é escolhida; o gate de decisão e os critérios ficam explícitos. |
| D-07 | A região nasce multi-localidade, inteira no estado e no hash; foco não congela nem remove áreas. |
| D-08 | Entrega documental em worktree isolada, com revisão independente obrigatória; sem autoaprovação. |

### 1.4 Relação com CTR-01 rev 5 e DOC-02

- O CTR-01 fixa `EntityId(u64)` com `kind`/`index`/`generation`, os kinds `ACTOR = 1`,
  `ITEM = 2`, `LOCATION = 3`, `STRUCTURE = 4`, `RUMOR = 5`, `GATE = 6` e `EDGE = 7`,
  `LocationId`/`LocalityId`, `GateId`, `EdgeId`, `GridPoint`, `GridBounds`, `Tick`, `Seed`,
  canonicalização, ordem de secções, primitivas e precedência de erros de ID. Este contrato
  **não redefine** nada disso; apenas usa esses tipos e preenche os payloads das secções 1 a 4.
- O CTR-01 delegou explicitamente a este contrato a **semântica** de portão e aresta, a
  validade topológica, a criação concreta, a passagem e a rota. A semântica fica nas secções 4.4
  a 4.6; o packing e as rejeições de forma continuam no CTR-01.
- O DOC-02 (`docs/planning/gameplay-spec.md`, commit `31416a137be781b7534dcd6abc46d1d8fc895f65`)
  fixa a fixture de quatro localidades, as arestas de 24, 13, 18 e 15 ticks, terreno de
  1 a 4 ticks por célula, +1 por nível de `z`, viagem atómica, foco que não congela áreas e as
  regras de apresentação/overlay. Este contrato usa esses números como vetor curado e não os
  substitui por valores de produto.
- O DOC-02 mantém pendentes `PD-01` a `PD-09`; em especial, a seed canónica da fixture (`PD-09`)
  e o recorte de produto continuam decisões humanas. Este contrato não as antecipa.

### 1.5 Convenções normativas

- `MUST`, `MUST NOT`, `SHOULD` e `MAY` têm o sentido de requisito de contrato.
- Todos os inteiros multi-byte são big-endian; enums são `u16` com código, `0` inválido salvo
  indicação; `bool` é `u8` `0`/`1`. As primitivas vêm do CTR-01 §5.3.
- `code spans` com nomes de tipos, funções e erros são propostas, não assinaturas compiladas;
  blocos `text` são pseudocódigo e estrutura de dados de contrato, não código executável.
- Nenhum valor de hash, seed, medição ou bytes totais é afirmado como medido; quando um valor
  aparece, é regra de derivação ou vetor curado do DOC-02.
- Coordenadas usam `x` crescente para leste, `y` crescente para sul e `z` crescente para cima;
  norte é `-y`, este é `+x`, sul é `+y` e oeste é `-x`. Os códigos de direção são `1 = N`,
  `2 = L`, `3 = S`, `4 = O`.
- A unidade de célula é um bloco cúbico; não há distância contínua, `f32`, `f64`, `NaN` ou
  altura flutuante no estado autoritativo.
- "Revisão" de leitura significa o par `(tick, state_hash)` do CTR-01 mais a revisão própria da
  memória; não é um campo novo de autoridade.

## 2. Herança vinculante do CTR-01 e do DOC-02

### 2.1 O que este contrato não pode mudar

| Elemento | Regra herdada | Uso neste contrato |
| --- | --- | --- |
| `EntityId` | 16 bits `kind`, 32 bits `index`, 16 bits `generation`; `0` reservado | Gate, Edge, Location e Structure usam os kinds 3, 4, 6 e 7 sem outro packing. |
| `LocationId` | `EntityId` kind 3; `LocalityId` é alias; wire usa `LocationId` | Identidade da localidade; a grelha da localidade é um AABB separado. |
| `GateId` | `EntityId` kind 6 | Identidade do portão; a topologia é definida aqui. |
| `EdgeId` | `EntityId` kind 7 | Identidade da aresta; o par de extremos é definido aqui. |
| `StructureId` | `EntityId` kind 4 | Agregado de blocos; não é um cubo isolado. |
| `ItemId` | `EntityId` kind 2 | Item normal; nunca vira material, bloco ou ocupação. |
| `GridPoint` | `{ x: i32, y: i32, z: i16 }`, unidade inteira | Toda célula da grelha; sem `usize` ou packing de tile. |
| `GridBounds` | Inclusivo; `min <= max` por eixo | Limites de região, localidade, chunk e query. |
| `Tick`/`Seed` | Inteiros `u64`; ticks só por ações | Geração usa `Seed`; câmera e leitura não avançam `Tick`. |
| Secções | Tags 1..11, ordem ascendente, sem secção nova em v2 | `REGION`, `LOCALITIES`, `STRUCTURES` e `BLOCKS` são as tags 1 a 4; nada de tags 12+. |
| Primitivas | Big-endian, enum `u16`, sequência `u32`, `Option` por presença | Os payloads usam apenas estas primitivas. |
| Campos voláteis | Câmera, foco, UI, NLG, métricas fora do hash | O overlay e a câmera nunca entram em `state_hash`. |

### 2.2 `RegionId`, seed e fronteira de região

- `RegionId(u64)` é não nulo, **não** é `EntityId` e não partilha o espaço de IDs de entidades.
- A derivação proposta é determinística:
  `RegionId = first_u64_be(BLAKE3("AFRI" || generator_version u16 || seed u64 || spec_digest))`;
  `spec_digest` é `BLAKE3-256("AFRS" || campos canónicos de RegionSpec)`, com os campos na ordem
  da tabela §4.1 e inteiros big-endian, excluindo apenas `name_profile` (apresentação), e se o
  valor final for `0`, usa-se `1`. Incluir o spec evita que
  duas `RegionSpec` diferentes com a mesma seed/versão partilhem `RegionId`; o CTR-01 fala em
  seed e versão do gerador, pelo que esta extensão é confirmada na revisão de freeze (§13, linha
  21). Duas regiões com o mesmo `RegionId` e a mesma seed/versão/spec são a mesma região; o mesmo
  `RegionId` com seed, versão ou spec diferente é `RegionIdCollision` na importação.
- IDs de entidades são únicos **dentro da região**; não carregam `RegionId`. Importar ou
  mergear regiões exige remapeamento explícito e rejeita mistura com `ForeignReference`.
- O allocator é regional por kind (CTR-01 §2.4); gerar a mesma seed e a mesma `RegionSpec` produz
  os mesmos `(kind, index, generation)` e a mesma ordem de criação.

**Fronteira com CTR-02/INT-01:** `Seed` é `u64` opaco (newtype proposto), não `[u8;32]`; é o
segundo argumento de `generate_region` e o `seed u64` do payload `REGION`. `RegionId` e `spec_digest` são propriedade
deste contrato: o CTR-02/INT-01 **referenciam** estes tipos e a derivação, não os redefinem nem
criam um `Seed` alternativo. O `RegionId` e o `seed` entram no envelope/hash canónico do CTR-01;
a derivação `region_draw` é uma PRF de geração e **não** é um RNG de simulação paralelo, não
avança streams de `INT-02` e não altera `Tick`, agenda ou replay. Uma mudança de nome, tipo ou
fórmula desta fronteira exige revisão conjunta CTR-02/CTR-03 e deve ser reportada ao juiz.

### 2.3 Tipos lógicos propostos

| Tipo | Campos lógicos | Observação |
| --- | --- | --- |
| `RegionSpec` | versões, bounds, contagem e extensão de localidades, portões, perfis, densidade, política de arestas | Entrada pura de `generate_region`; a seed é argumento separado; sem I/O, relógio ou RNG global. |
| `RegionState` | `region_id`, seed, versão do gerador, bounds, localidades ordenadas, portões, arestas, estruturas, blocos | Estado regional completo; não depende de câmera ou foco. |
| `Locality` | `LocationId`, AABB, portões | Uma localidade pode ocupar muitas células; não é um tile. |
| `Gate` | `GateId`, célula, localidade, kind (`ESTRADA`/`TRILHA`), flags | Célula de passagem/chegada; não é um bloco sólido. |
| `Edge` | `EdgeId`, `gate_a`, `gate_b`, `cost_ticks`, `corridor_units` (4 contagens), estado, flags | Aresta entre localidades distintas; custo inteiro derivado do terreno agregado. |
| `Structure` | `StructureId`, localidade, kind, AABB, contagem de blocos | Agregado cúbico; casa, muro, ponte, árvore ou outro. |
| `Block` | localidade, `z`, `y`, `x`, superfície, preenchimento, `StructureId` opcional, papel, flags | Uma célula cúbica; item não é bloco. |
| `CameraState` | âncora, `camera_z`, zoom, viewport, camadas | Somente apresentação; nunca no estado. |
| `ViewSchema` | versão, detalhe de memória/atores, limite de células, consumidor | Não altera a geometria do FOV. |
| `PerceivedState` | observador, tick/hash, facing, alcance, células, atores, estruturas | Leitura derivada; não persistida como autoridade. |
| `EnvironmentMemory` | observador, revisão, último tick, células e atores com `last_seen` | Autoridade congelada por observador; codificação pendente em CTR-02. |
| `ObservationEnvelope` | versão, observador, tick/hash, `PerceivedState`, memória, desconhecido, permissões | DTO por observador; sem nomes, prosa ou overlay. |
| `SilhouetteContract` | versão e parâmetros aprovados de alcance/Z/nunca-visto/limite | Valores de `A1 + D1 + Z2 + N1 + O1`; `PA-06`/`PA-07` pendentes. |
| `SilhouetteQuery` | observador, âncora, `camera_z` | Consulta de apresentação; não é percepção. |
| `SilhouetteEnvelope` | versão, contrato, tick/hash, lista de silhuetas, truncamento | Canal privilegiado somente leitura. |
| `FrameReceipt` | sequência, tick/hash ecoados, versões, avisos | Recibo de apresentação; não é recibo de ação. |
| `AbstractPerception` | versão, observador, tick/hash, facing, atores percebidos, resumo de ambiente | Entrada de NPC/MLP; nunca inclui overlay. |

## 3. Grelha, células, materiais, estruturas e itens

### 3.1 Coordenadas, `z`, chunks e limites contratuais

A grelha é tridimensional, inteira e sem coordenadas contínuas. `GridBounds` é inclusivo. Os
limites abaixo são **validações de contrato** para manter a codificação, a ordem e os testes
determinísticos; não são teto de hardware, meta de desempenho ou licença para reduzir o produto a
uma vila (D-05/D-07). Alterá-los exige nova versão de `RegionSpec`/gerador e nova revisão.

| Constante | Valor | Semântica |
| --- | --- | --- |
| `REGION_X_MIN` | `-524_288` | Menor `x` válido, inclusive. |
| `REGION_X_MAX` | `524_287` | Maior `x` válido, inclusive; `2^20` valores por eixo. |
| `REGION_Y_MIN` | `-524_288` | Menor `y` válido, inclusive. |
| `REGION_Y_MAX` | `524_287` | Maior `y` válido, inclusive. |
| `REGION_Z_MIN` | `0` | Nível base do terreno. |
| `REGION_Z_MAX` | `15` | Dezasseis níveis contratuais. |
| `CHUNK_SIZE_X` | `16` | Largura de chunk em células. |
| `CHUNK_SIZE_Y` | `16` | Profundidade de chunk em células. |
| `CHUNK_SIZE_Z` | `1` | Um nível por chunk. |
| `CHUNK_INDEX_MIN` | `-32_768` | Menor índice de chunk por eixo. |
| `CHUNK_INDEX_MAX` | `32_767` | Maior índice; `65_536` chunks por eixo. |
| `MIN_LOCALITIES` | `3` | Mínimo de localidades geradas (D-07). |
| `MAX_LOCALITIES` | `1_024` | Orçamento regional do CTR-01 §2.1. |
| `MIN_LOCALITY_EXTENT` | `8` | Menor lado de um AABB de localidade. |
| `MAX_LOCALITY_EXTENT` | `4_096` | Maior lado de um AABB de localidade. |
| `MIN_LOCALITY_GAP` | `2` | Células livres entre AABBs de localidades. |
| `MAX_GATES_PER_LOCALITY` | `8` | Portões por localidade. |
| `MAX_EDGES` | `262_144` | Arestas por região. |
| `MAX_STRUCTURES` | `1_048_576` | Estruturas por região. |
| `MAX_BLOCKS` | `2_147_483_647` | Blocos por região; cabe na contagem `u32` e no limite do CTR-01. |
| `MAX_BLOCKS_PER_STRUCTURE` | `65_535` | Blocos de uma estrutura. |
| `MAX_CORRIDOR_CELLS` | `16_383` | Células de corredor somadas de uma aresta; limita o custo a `65_534` ticks. |
| `MAX_EDGE_TICKS` | `65_535` | Custo total de uma aresta. |
| `MAX_SILHOUETTES` | `4_096` | Limite absoluto do envelope; o contrato aprovado usa `256`. |

Regras:

- Construir `GridPoint` fora de `REGION_*` é `CoordinateOutOfBounds`; não há clamp, wrap ou
  saturação silenciosa. `z` fora de `0..=15` é `InvalidZLevel`.
- Um `GridBounds` deve ter `min <= max` nos três eixos e estar contido nos limites regionais;
  caso contrário, é `InvalidRegionBounds` (região) ou `CoordinateOutOfBounds` (célula).
- Um chunk é a célula de indexação `(location_id, z, chunk_x, chunk_y)`, com
  `chunk_x = floor_div(x, 16)` e `chunk_y = floor_div(y, 16)`. A divisão é matemática, não
  truncada em direção a zero, para funcionar com coordenadas negativas.
- Chunk é unidade de consulta e de iteração, **não** é autoridade, não tem LOD, não suspende
  simulação e não pode ser usado para "não gerar" uma área. Uma célula não materializada tem o
  valor implícito `(NENHUMA, AR, sem estrutura)`; o chunk inteiro existe logicamente e entra na
  validação regional.
- A ordem canónica de iteração de chunks é `(location_id, z, chunk_y, chunk_x)` ascendente. A
  ordem de células dentro do chunk é `(z, y, x)` ascendente. Nenhuma ordem de `HashMap` participa.
- Chunks fora dos limites regionais não existem; não há coordenada negativa infinita nem
  "mundo infinito" implícito. Os limites são contratuais e independentes do hardware.

### 3.2 Célula, superfície e preenchimento

Cada célula cúbica tem dois códigos de material:

- `surface`: o material da superfície pisável no nível `z` (`NENHUMA` quando não há piso). É a
  superfície que determina apoio, custo de entrada e passagem vertical.
- `fill`: o material que ocupa o volume acima da superfície no mesmo nível (`AR` quando vazio).
  É o preenchimento que determina ocupação e opacidade.

Esta separação é necessária para representar paredes, telhados, pisos, portas, janelas e salas sem
duplicar a célula nem inventar um segundo tipo de coordenada. Uma parede no nível `z` é um `fill`
sólido com a superfície natural por baixo; um piso de sobrado é uma `surface` estrutural com `fill`
`AR`; um telhado é um `fill` `TELHADO` sobre a footprint. O item normal **não** tem `surface` nem
`fill`: ele vive em `ITEMS` com um holder, nunca em `BLOCKS`.

A classificação de célula (`CellType`) é **derivada** de `(surface, fill)` e não é um terceiro campo
canónico. A precedência é `ESTRUTURA`, `AGUA`, `VEGETACAO`, `ESTRADA`, `SOLIDO`, `VAZIO`:

| Código | `CellType` | Derivação |
| --- | --- | --- |
| 1 | `VAZIO` | Nenhum material estrutural, água, vegetação ou estrada; inclui `NENHUMA`+`AR`. |
| 2 | `SOLIDO` | Rocha natural (superfície ou preenchimento), sem material estrutural. |
| 3 | `AGUA` | Superfície `AGUA_RASA` ou `AGUA_PROFUNDA`. |
| 4 | `VEGETACAO` | Superfície `VEGETACAO_RASTEIRA` ou `VEGETACAO_DENSA`. |
| 5 | `ESTRADA` | Superfície `TERRA_BATIDA`, `ESTRADA`, `PAVIMENTO` ou `ENTULHO`. |
| 6 | `ESTRUTURA` | Qualquer material estrutural de superfície ou preenchimento. |

`CellType` é usado por apresentação, testes e depuração; consumidores autoritativos usam
`surface`/`fill`. Não se codifica `CellType` em `BLOCKS`; uma classificação divergente é
`NonCanonicalBlock`.

### 3.3 Materiais de superfície

Os custos de entrada seguem o DOC-02 §3.3: 1 para pavimento/estrada/terra batida, 2 para
vegetação rasteira/entulho, 3 para vegetação densa/rocha, 4 para água rasa; escada/rampa somam +1
por nível de `z` alterado. Água profunda é intransponível nesta sessão.

| Código | Material | Passável | Custo | Opaco na vertical | Estrutural | Notas |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `NENHUMA` | não | — | não | não | Sem piso; ator não pode ficar nesta célula. |
| 2 | `TERRA_BATIDA` | sim | 1 | sim | não | Terra compactada; grupo de estrada do DOC-02. |
| 3 | `ESTRADA` | sim | 1 | sim | não | Estrada regional. |
| 4 | `PAVIMENTO` | sim | 1 | sim | não | Calçamento simples. |
| 5 | `VEGETACAO_RASTEIRA` | sim | 2 | não | não | Não oclui visão nesta versão. |
| 6 | `VEGETACAO_DENSA` | sim | 3 | não | não | Custa 3; não cria silhueta nem oclui. |
| 7 | `ENTULHO` | sim | 2 | não | não | Terreno difícil; não é estrutura. |
| 8 | `AGUA_RASA` | sim | 4 | não | não | Vau; atravessável a pé. |
| 9 | `AGUA_PROFUNDA` | não | — | não | não | Intransponível; não há natação nesta sessão. |
| 10 | `ROCHA` | sim | 3 | sim | não | Rocha natural de superfície; bloqueia visão vertical. |
| 11 | `PISO_MADEIRA` | sim | 1 | sim | sim | Piso de estrutura; suporta ator. |
| 12 | `PISO_PEDRA` | sim | 1 | sim | sim | Piso de estrutura; suporta ator. |
| 13 | `ESCADA` | sim | 1 | não | sim | Liga `(x,y,z)` a `(x,y,z+1)` na mesma coluna. |
| 14 | `RAMPA` | sim | 1 | não | sim | Abstração de ligação vertical; geometria de rampa não é modelada. |

### 3.4 Materiais de preenchimento

| Código | Material | Passável | Opaco | Estrutural | Notas |
| --- | --- | --- | --- | --- | --- |
| 1 | `AR` | sim | não | não | Volume livre acima da superfície. |
| 2 | `PORTA` | sim | não | sim | Vão de passagem; não há estado aberta/fechada em v1. |
| 3 | `VIDRO` | não | não | sim | Deixa ver, não deixa passar. |
| 4 | `PAREDE_MADEIRA` | não | sim | sim | Parede de casa; ocupa a célula. |
| 5 | `PAREDE_PEDRA` | não | sim | sim | Parede de pedra/muro. |
| 6 | `TELHADO` | não | sim | sim | Cobertura; não é superfície pisável em v1. |
| 7 | `TRONCO` | não | sim | sim | Estrutura árvore; não cria silhueta privilegiada. |
| 8 | `FOLHAGEM` | não | sim | sim | Copa; oclui FOV, mas não é "construção" para o overlay. |
| 9 | `ROCHA` | não | sim | não | Rocha natural; oclui FOV, não é construção. |

Regras de material:

- `passable(cell)` exige `surface != NENHUMA`, `surface.passable`, `fill.passable`, ausência de
  outro ator e ausência de reserva de portão incompatível. Uma célula com `VIDRO`, `PAREDE_*`,
  `TELHADO`, `TRONCO`, `FOLHAGEM` ou `ROCHA` no `fill` é `CellImpassable`; um ator nunca é
  colocado aí (`InvalidOccupancy`).
- A opacidade horizontal é do `fill`; a opacidade vertical é da `surface` e só conta quando a
  linha de visão atravessa o plano da superfície (ver §5.3). Uma `surface` opaca não bloqueia
  visão no mesmo nível.
- `PORTA` e `VIDRO` são transparentes; `PORTA` é passável e `VIDRO` não. Não se inventa estado de
  porta, chave, fechadura ou destruição nesta versão.
- Uma célula tem no máximo um `fill` e uma `surface`; não há lista de materiais por célula,
  sobreposição de preenchimentos ou `HashMap` de materiais.
- O item normal não é material: nenhum `ItemId` pode aparecer em `surface`, `fill`, `BLOCKS`,
  `STRUCTURES` ou nas listas de passagem/opacidade. Tentar usá-lo como bloco é `WrongEntityKind`
  (ou `NonCanonicalBlock` na decodificação), nunca conversão silenciosa.

### 3.5 Estruturas cúbicas e papéis de bloco

Uma `Structure` é um agregado com identidade própria (`StructureId`, kind 4) e um conjunto de
blocos cúbicos. A estrutura não é um único cubo e não é uma entidade de apresentação: paredes,
pisos, telhados, portas, escadas e árvores são papéis dos seus blocos. Os `kind` propostos são:

| Código | `StructureKind` | Uso |
| --- | --- | --- |
| 1 | `CASA` | Paredes, piso, porta e telhado. |
| 2 | `MURO` | Linha de paredes, sem interior. |
| 3 | `PONTE` | Piso sobre água ou vão; não altera o terreno por baixo. |
| 4 | `ARVORE` | Tronco e folhagem; estrutura natural. |
| 5 | `CAVERNA` | Agregado natural reservado; não é gerado por omissão em v1. |
| 6 | `OUTRO` | Agregado válido sem semântica de produto. |

Papéis de bloco (`role`) e coerência obrigatória:

| Código | Papel | Combinação válida |
| --- | --- | --- |
| 0 | `NENHUM` | `structure_id = 0`; bloco natural sem dono. |
| 1 | `PISO` | `surface` `PISO_MADEIRA`/`PISO_PEDRA`; `fill` `AR`. |
| 2 | `PAREDE` | `fill` `PAREDE_MADEIRA`/`PAREDE_PEDRA`; superfície natural ou `NENHUMA`. |
| 3 | `TELHADO` | `fill` `TELHADO`; `surface` `NENHUMA`. |
| 4 | `PORTA` | `fill` `PORTA`; superfície passável. |
| 5 | `ESCADA` | `surface` `ESCADA`; `fill` `AR`. |
| 6 | `RAMPA` | `surface` `RAMPA`; `fill` `AR`. |
| 7 | `TRONCO` | `fill` `TRONCO`; superfície natural. |
| 8 | `FOLHAGEM` | `fill` `FOLHAGEM`; `surface` `NENHUMA`. |

Regras:

- Toda estrutura tem pelo menos um bloco e `block_count > 0`; sem blocos é `InvalidStructure`.
- Todos os blocos de uma estrutura pertencem à mesma localidade e ao AABB declarado; o AABB é o
  menor retângulo que contém todos os blocos e deve coincidir exatamente com o declarado. Um
  bloco com `structure_id` inexistente, de outra localidade, fora do AABB ou com papel
  incompatível é `InvalidStructure`.
- Uma célula pertence a no máximo uma estrutura; não há paredes sobrepostas na mesma célula. Um
  bloco estrutural não pode ocupar a célula de um portão nem impedir a passagem do portão.
- Estruturas podem compartilhar limites (duas casas encostadas) mas não blocos. `CASA` exige pelo
  menos um `PAREDE` e um `PISO`; `MURO` exige `PAREDE`; `ARVORE` exige `TRONCO`; `PONTE` exige
  `PISO`; a validação de completude é semântica e pertence a `GRID-02`, mas a coerência por
  bloco e o AABB são verificados já na decodificação regional.
- Demolir, construir ou alterar blocos é operação de `GRID-02`, não de `generate_region`. Toda
  mutação deve preservar IDs existentes, ordem canónica, AABB e validações; uma alteração
  incompleta é rejeitada atomicamente, sem bloco parcial.

### 3.6 Item normal fora da grelha

- `ItemId` kind 2, quantidade inteira e holder `(nenhum, ator, localidade, estrutura)` são do
  CTR-01 `ITEMS`. O item não ocupa célula, não tem coordenada, não bloqueia passagem, não tem
  opacidade e não entra em `BLOCKS`.
- Um item largado numa localidade não tem posição espacial em v1; a apresentação não o desenha
  no mapa. Inventário, equipamento e contentores são leitura de UI a partir do estado do ator,
  não percepção de FOV.
- O DTO de percepção v1 não enumera itens; um item na mão de um ator percebido continua sendo
  dado de ator, não célula. Adicionar item visível no chão exige contrato/versão novos, com
  coordenada explícita, e não pode converter o item em material ou bloco.
- A visualização de itens é adiada com o cliente; a camada `ITENS` do cliente fica reservada e
  vazia em v1 (ver §8.3).

### 3.7 Exemplos e negativos de célula, parede, telhado e andar

| Caso | Composição | Resultado esperado |
| --- | --- | --- |
| Sala fechada | Piso `PISO_MADEIRA` no interior, `PAREDE_PEDRA` no perímetro, `TELHADO` acima | Interior passável; parede bloqueia passagem e visão; telhado bloqueia visão de cima. |
| Porta aberta | Célula de perímetro com `fill = PORTA` | Passável e transparente; não há estado fechado em v1. |
| Janela | Célula de perímetro com `fill = VIDRO` | Transparente e intransponível; ver sem passar. |
| Dois andares | Piso `PISO_PEDRA` no nível `z+1`, parede no perímetro | Piso opaco separa níveis; escada transparece e liga andares. |
| Telhado pisável | `TELHADO` com `surface = NENHUMA` | Não é célula de ator; tentar mover para lá é `CellImpassable`. |
| Parede no mesmo nível | `fill = PAREDE_MADEIRA` entre duas células | Não há linha de visão nem passagem; overlay pode revelar silhueta atrás. |
| Árvore | `TRONCO` e `FOLHAGEM` | Bloqueia passagem e FOV; **não** é construção para silhueta. |
| Rocha natural | `fill = ROCHA` | Bloqueia passagem e FOV; **não** é construção para silhueta. |
| Água profunda | `surface = AGUA_PROFUNDA` | Intransponível; pode ser vista; não gera memória de piso pisável. |
| Célula fora dos limites | `x` acima de `REGION_X_MAX` | `CoordinateOutOfBounds`; sem clamp. |

### 3.8 Movimento cardeal e linha estrutural

- O deslocamento é **cardinal apenas** (norte, leste, sul, oeste); diagonais não são passagem
  válida e `GAME-01` as rejeita com `INTENCAO_INVALIDA`. Não há aresta diagonal, caminho diagonal
  ou custo diagonal neste contrato.
- Um ator ocupa no máximo uma célula por tick; a mudança de `z` só ocorre por `ESCADA`/`RAMPA` na
  mesma coluna `(x,y)` e soma +1 tick por nível ao custo da célula de destino. Não há queda, voo,
  teleporte ou sobreposição de atores.
- A **linha estrutural** usada por alcance social (`falar`, `negociar`, `ameaçar`) é uma checagem
  geométrica separada do FOV: mesma localidade e mesmo `z`, distância de Manhattan menor ou igual
  a `SOCIAL_REACH_CELLS = 2` (DOC-02), e a supercover 2D fechada entre as duas células não contém
  nenhum `fill` opaco (`PAREDE_*`, `TELHADO`, `TRONCO`, `FOLHAGEM`, `ROCHA`). `PORTA` e `VIDRO`
  não bloqueiam a linha (o vidro continua a bloquear movimento). A linha não usa `facing`, raio,
  memória, câmera ou overlay; um alvo lembrado não é alvo vivo.
- A linha estrutural é definida em `crates/af-core/src/region.rs` e consumida por `GAME-01`; não é
  campo de visão, não gera memória e não substitui `compute_perception`. Um alvo fora do alcance,
  noutro `z`, noutra localidade ou sem linha é rejeitado por `GAME-01` com o motivo de `DOC-02`,
  sem custo e sem RNG.

## 4. Região procedural multi-localidades (INT-03)

### 4.1 `RegionSpec` e seed

`RegionSpec` é uma entrada pura, inteira e explícita; não há defaults escondidos nem leitura de
ambiente. A seed é o segundo argumento de `generate_region` (`Seed(u64)` do CTR-01), não um campo
de `RegionSpec`; `0` é um valor válido, não um sentinela.

| Campo | Tipo | Faixa/valores | Regra |
| --- | --- | --- | --- |
| `spec_version` | `u16` | `1` | Outra versão é `UnsupportedRegionSpec`. |
| `generator_version` | `u16` | `1` | Outra versão é `UnsupportedGeneratorVersion`. |
| `bounds` | `GridBounds` | dentro dos limites regionais | Define a região inteira, não o foco. |
| `locality_count` | `u16` | `3..=1_024` | Mínimo de três localidades interligadas. |
| `locality_extent_min` | `u16` | `8..=4_096` | Menor lado AABB. |
| `locality_extent_max` | `u16` | `min..=4_096` | Maior lado AABB. |
| `locality_gap` | `u16` | `2..=64` | Células livres entre AABBs. |
| `gates_per_locality` | `u8` | `1..=8` | Portões por localidade. |
| `terrain_profile` | `u16` | `1..=4` | Perfil de terreno; tabelas propostas em §4.3. |
| `structure_profile` | `u16` | `1..=4` | Perfil de estruturas. |
| `structure_density_bp` | `u16` | `0..=10_000` | Densidade de estruturas por localidade. |
| `edge_policy` | `u16` | `1 = árvore mínima`, `2 = mínima + extras` | Política de conexão. |
| `extra_edges` | `u16` | `0..=65_535` | Só usadas na política 2. |
| `initial_blocked_edges` | `u16` | `0..=65_535` | Bloqueio determinístico para testes; não é regra de produto. |
| `name_profile` | `u16` | `1..=4` | Nomes procedurais de apresentação, fora do hash. |

Validações de `RegionSpec`:

- `spec_version != 1` é `UnsupportedRegionSpec`; `generator_version != 1` é
  `UnsupportedGeneratorVersion`; qualquer faixa inválida é `InvalidRegionSpec`.
- `bounds` deve estar contido em `REGION_X/Y/Z_*`; `min <= max`; caso contrário,
  `InvalidRegionBounds`.
- `locality_extent_min > locality_extent_max` é `InvalidRegionSpec`; `bounds` pequeno demais para
  a contagem pedida é `InvalidRegionSpec`, não um ajuste silencioso.
- `edge_policy = 1` com `extra_edges > 0` é `InvalidRegionSpec`: a política 1 não aceita extras.
  `edge_policy = 2` aceita `extra_edges`; o excesso é ignorado apenas depois de a árvore mínima
  existir.
- `initial_blocked_edges` é validado **depois** da seleção das arestas: maior que o número de
  arestas selecionadas é `InvalidBlockedEdgeCount`, sem truncagem; o valor nunca escolhe arestas
  inexistentes.
- A seed não é consumida pelo RNG de simulação de `CTR-02`; a geração tem derivação própria
  (§4.2) e não avança streams de ação. A fixture DOC-02 é um manifesto de teste separado
  (§4.9), não um modo de `generate_region`.

### 4.2 Derivação determinística da geração

A geração usa um expansor determinístico próprio, separado do RNG de simulação (`INT-02`), para
que `generate_region` seja uma função pura de `(spec, seed)` sem exigir estado de mundo:

```text
region_draw(seed, generator_version, stream, counter):
  material = "AFRG" || u16_be(generator_version) || u64_be(seed) || u8(stream) || u64_be(counter)
  digest   = BLAKE3-256(material)
  return first_u64_be(digest)

uniform_below(n, seed, generator_version, stream, counter_ref):
  if n == 0: error InvalidRegionSpec
  limit = (2^64 / n) * n
  repeat at most 1_024 times:
    v = region_draw(seed, generator_version, stream, counter_ref)
    counter_ref += 1
    if v < limit: return v % n
  error RegionGenerationFailed
```

Streams: `1 = PLACEMENT`, `2 = TERRAIN`, `3 = STRUCTURES`, `4 = NAMES`. O contador começa em `0`
por stream e incrementa uma vez por draw, na ordem fixa do algoritmo. `NAMES` não entra no
`RegionState` canónico nem no hash; nomes são derivados de apresentação e podem ser recalculados.
Não há `thread_rng`, relógio, `HashMap`, `f32` ou leitura de ambiente. O mesmo gerador e a mesma
seed produzem a mesma sequência de draws em Windows e Linux.

### 4.3 Fases da geração (ordem normativa)

1. Validar `RegionSpec`, versões, bounds e faixas; sem consumir draws.
2. Derivar `RegionId` (§2.2).
3. **Colocar localidades**: com margem e gap, sortear âncoras e extensões dentro de `bounds`; no
   máximo `1_024` tentativas por localidade; rejeitar sobreposição de AABB expandido por
   `locality_gap`; se não couber, `RegionGenerationFailed`.
4. Ordenar os AABB aceites por `(min_y, min_x, min_z)` e alocar `LocationId` pelo menor índice
   livre do allocator regional; a mesma ordem produz os mesmos IDs.
5. **Gerar terreno** por localidade, em ordem `(location_id, z, y, x)`; a superfície vem do perfil
   de terreno; o preenchimento começa em `AR`; nenhuma estrutura ainda.
6. **Escolher portões** na borda do AABB a `z = REGION_Z_MIN`, em ordem `(z, y, x)`; apenas
   células passáveis, convertendo a superfície para `TERRA_BATIDA` quando necessário; alocar
   `GateId` em ordem `(location_id, ordem do candidato)`. O primeiro portão é `ESTRADA`, o segundo
   `TRILHA`, alternando; localidades com um portão recebem `ESTRADA`.
7. **Construir o grafo de arestas**: candidatos entre localidades vizinhas (até quatro vizinhas
   por distância ao centro, desempate por `LocationId`); para cada par, escolher o par de portões
   de menor custo de corredor (desempate por `(gate_a, gate_b)`); calcular `corridor_units` e
   `cost_ticks` conforme §4.5; selecionar uma árvore geradora mínima por Kruskal com ordem
   `(cost_ticks, gate_a, gate_b, location_a, location_b)`; adicionar extras da política 2 na
   mesma ordem até `extra_edges`; se não houver árvore que ligue todas as localidades,
   `RegionGenerationFailed`. Alocar `EdgeId` após ordenar as arestas finais por
   `(gate_a, gate_b)`; se `initial_blocked_edges` exceder o número de arestas selecionadas,
   `InvalidBlockedEdgeCount`; marcar como `BLOQUEADA` as primeiras `initial_blocked_edges`
   arestas dessa ordem.
8. **Gerar estruturas** por localidade, em ordem determinística, até ao orçamento
   `structures_budget = min(64, floor(area_xy * structure_density_bp / 10_000))` por localidade;
   tentar até `structures_budget * 4` posições; estruturas que não cabem são ignoradas, não
   inventadas; reservar células de portão e uma coroa de uma célula; alocar `StructureId` após
   ordenar por `(location_id, min_y, min_x, min_z, kind)`. Os blocos são gerados junto e ordenados
   depois por `(location_id, z, y, x)`.
9. Validar invariantes completos (§4.7), canonicalizar e devolver `RegionState` atomicamente. Uma
   falha em qualquer fase não devolve estado parcial nem consome IDs.

Perfis de terreno propostos (pesos inteiros, soma `10_000`; a ordem da tabela é a ordem de
desempate):

| Perfil | Materiais e pesos |
| --- | --- |
| 1 `PLANICIE` | `TERRA_BATIDA` 5000, `ESTRADA` 1000, `VEGETACAO_RASTEIRA` 3000, `AGUA_RASA` 500, `ROCHA` 500 |
| 2 `FLORESTA` | `TERRA_BATIDA` 2000, `VEGETACAO_DENSA` 5000, `VEGETACAO_RASTEIRA` 2500, `AGUA_RASA` 500 |
| 3 `MONTANHA` | `ROCHA` 4500, `TERRA_BATIDA` 3000, `VEGETACAO_RASTEIRA` 1500, `ESTRADA` 1000 |
| 4 `PANTANO` | `AGUA_RASA` 4000, `VEGETACAO_DENSA` 3000, `TERRA_BATIDA` 2500, `ENTULHO` 500 |

Estes pesos são propostas de geração, não valores de produto aprovados; testes comparam a mesma
seed, não uma estética específica. A fixture do DOC-02 fixa o terreno necessário para os custos
24/13/18/15 e não depende destes pesos.

Perfis de estrutura propostos (pesos em basis points, sem floats; a ordem é a de desempate):

| Perfil | `StructureKind` e pesos |
| --- | --- |
| 1 `ALDEIA` | `CASA` 7000, `MURO` 2000, `PONTE` 1000 |
| 2 `FLORESTA` | `ARVORE` 8000, `CASA` 2000 |
| 3 `MISTO` | `CASA` 4000, `MURO` 2000, `ARVORE` 3000, `PONTE` 1000 |
| 4 `FORTIFICADO` | `MURO` 5000, `CASA` 4000, `PONTE` 1000 |

Cada estrutura gerada usa os papéis de §3.5; uma posição que não caiba ou que colida com portão,
corredor protegido ou outra estrutura é ignorada. A densidade e o perfil não podem introduzir
estrutura sem blocos, bloco sem estrutura ou papel incompatível; essas condições são rejeitadas na
validação final.

### 4.4 Portões: semântica e validade

- Um portão é uma célula de chegada/partida de uma localidade, com `GateId` kind 6, localidade
  dona, célula e kind `ESTRADA` (1) ou `TRILHA` (2). O portão não é um bloco sólido: a célula
  continua passável e pode ser ocupada pelo ator que chega.
- O portão pertence exatamente a uma localidade; a célula está dentro do AABB da localidade e no
  nível `REGION_Z_MIN` em v1. Portão em célula intransponível, fora do AABB, duplicado na mesma
  localidade ou ausente da tabela é `InvalidGate`.
- Precedência de validação de `GateId` (CTR-01 §2.5): forma inválida (`NONE`, all-ones, `kind =
  0`, `index = 0`, `generation = 0`) é `InvalidEntityId`; `kind` diferente de 6 é
  `WrongEntityKind`; slot livre/geração antiga é `StaleEntityId`; ID vivo mas fora do grafo,
  célula inválida ou par inconsistente é `InvalidGate`.
- Um portão sem aresta é válido e permanece no estado; apenas é inalcançável por rota. Não se
  remove um portão por não estar em foco.
- Duas localidades não podem partilhar a mesma célula de portão (AABBs não se sobrepõem). Um
  portão pode ser referenciado por várias arestas; o mesmo par de portões não pode repetir.

### 4.5 Arestas: topologia, custo e estado

- Uma aresta é um par **não ordenado** de portões de localidades distintas: `gate_a < gate_b`
  numericamente; `gate_a != gate_b`; nenhum extremo ausente ou stale; nenhuma aresta com os dois
  portões na mesma localidade (`InvalidEdge`). O par não pode repetir outra aresta, mesmo com
  `EdgeId` diferente (`DuplicateEdge`).
- O corredor é uma **amostra agregada de terreno**, não um caminho célula a célula percorrido.
  Para a geração procedural, a amostra é a supercover 2D do segmento entre os centros dos
  portões no nível `z = REGION_Z_MIN`, incluindo os dois extremos; cada célula tocada contribui
  para um dos quatro escalões de custo do DOC-02 §3.3:
  `c1` = células de custo 1 (estrada, pavimento, terra batida), `c2` = custo 2 (vegetação
  rasteira, entulho), `c3` = custo 3 (vegetação densa, rocha), `c4` = custo 4 ou superfície
  intransponível. Uma célula intransponível conta como `c4` e não bloqueia a aresta, porque a
  viagem é atómica e abstrata.
- `corridor_units = (c1, c2, c3, c4)` é armazenado na aresta; a soma
  `c1 + c2 + c3 + c4` fica em `1..=MAX_CORRIDOR_CELLS`. O custo é exatamente
  `cost_ticks = c1 + 2*c2 + 3*c3 + 4*c4 + 2` (a sobrecarga fixa de `2` ticks do DOC-02 §3.2).
  A fixture DOC-02 pode fixar `corridor_units` diretamente no manifesto, sem depender da
  geometria da supercover; o mesmo cálculo de custo vale para os dois casos.
- `cost_ticks` é inteiro em `1..=MAX_EDGE_TICKS`; overflow ou valor acima é `EdgeCostOverflow`.
  O valor guardado deve ser igual ao recalculado pela fórmula (`EdgeCostMismatch`); soma zero,
  soma acima de `MAX_CORRIDOR_CELLS` ou contagem que não caiba em `u16` é `InvalidCorridorUnits`.
  Uma geração cuja amostra exceda `MAX_CORRIDOR_CELLS` é `CorridorTooLong`, sem truncagem.
- Estruturas e ocupação de atores não alteram `corridor_units` nem o custo de uma aresta já
  criada; o corredor é amostragem de terreno, não um caminho de simulação.
- Estado `PASSÁVEL` (1) ou `BLOQUEADA` (2); outro valor é `UnsupportedEdgeState`. Aresta bloqueada
  é ignorada em `find_route`, mas permanece no estado e no hash. O DOC-02 fixa o custo simétrico;
  não há direção, portagem, encontro de estrada ou assalto nesta sessão.
- Arestas de portões com `z` diferente são `EdgeElevationMismatch` em v1; ligações multi-nível
  entre localidades exigem contrato novo.

### 4.6 `generate_region` e `find_route`

```text
generate_region(spec: &RegionSpec, seed: Seed) -> Result<RegionState, RegionError>
find_route(region: &RegionState, request: RouteRequest) -> Result<Route, RegionError>
```

`generate_region` é puro e determinístico: mesma `RegionSpec`, mesma seed e mesma versão produzem
o mesmo `RegionState` canónico, os mesmos IDs, os mesmos portões, as mesmas arestas e as mesmas
rotas. Não lê câmera, foco, viewport, UI, ficheiro, relógio, rede ou modelo. A região inteira,
inclusive localidades fora do foco, é devolvida; não há geração preguiçosa por localidade.

`RouteRequest` contém `origin: LocationId` e `destination: LocationId`; ambos devem existir no
`RegionState`, ser do kind 3 e não estar stale. `find_route`:

- considera apenas arestas `PASSÁVEL`; arestas `BLOQUEADA` não participam;
- minimiza `total_ticks = soma de cost_ticks` da rota, em `u64` com soma verificada (sem wrap);
  um overflow é `RouteCostOverflow` e rejeita a rota;
- desempata pela sequência lexicográfica de `LocationId` visitados, incluindo origem e destino,
  e depois pela sequência lexicográfica de `EdgeId`; nunca pela ordem de `HashMap`;
- devolve a rota com arestas ordenadas pela travessia, portões de embarque/chegada, localidades
  visitadas e custo total; não devolve caminho célula a célula nem animação;
- rejeita `origin == destination` com `RouteOriginEqualsDestination`; localidade desconhecida com
  `UnknownLocation`; ausência de rota com `RouteImpossible`; grafo inválido com `InvalidEdge`;
- não cobra ticks, não consome RNG, não altera estado e não depende da câmera. Limites de
  `MAX_TRAVEL_EDGES`/`MAX_TRAVEL_TICKS` do DOC-02 são aplicados por `GAME-01`, não por esta
  função, que apenas devolve a rota ótima.

A rota pode atravessar uma localidade fora do foco; a agenda e o estado dessa localidade continuam
no `RegionState` e são processados por `GAME-01`. A câmera não seleciona quais localidades
existem e não remove nenhuma do hash (D-07).

### 4.7 Invariantes regionais

1. `RegionState` contém todas as localidades, portões, arestas, estruturas e blocos; nenhum
   subconjunto dependente de foco, câmera, viewport ou LOD.
2. Todo `GateId`/`EdgeId` referenciado existe, é do kind correto, está vivo e é coerente com a
   topologia; nenhuma referência dangling.
3. Todo bloco está dentro de uma localidade e dos limites regionais; toda estrutura tem blocos
   coerentes e AABB exato; todo portão está numa célula passável.
4. Nenhum par de localidades se sobrepõe; nenhum par de portões de uma aresta é da mesma
   localidade; nenhum par de arestas repete o mesmo par de portões.
5. Nenhum ID é reutilizado; colisão é `DuplicateEntityId`; IDs obsoletos são `StaleEntityId`.
6. Nenhum item aparece em `BLOCKS`; nenhum material é `ItemId`; nenhum `f32`, `HashMap`, `usize`
   ou relógio entra em payload, ordem ou hash.
7. A mesma seed/spec/versão reproduz bytes canónicos; uma alteração de qualquer campo afeta o
   hash da secção correspondente.
8. Toda aresta tem `corridor_units` com soma em `1..=MAX_CORRIDOR_CELLS` e
   `cost_ticks = c1 + 2*c2 + 3*c3 + 4*c4 + 2`; o `FixtureManifest` DOC-02 materializa um estado
   que satisfaz estes invariantes e é rejeitado com `InvalidFixture` se divergir.

### 4.8 Payloads canónicos das secções 1 a 4

Os payloads abaixo preenchem as tags `REGION`, `LOCALITIES`, `STRUCTURES` e `BLOCKS` do CTR-01
§5.2, na ordem ascendente das tags e sem padding. Os tipos e larguras são os das primitivas do
CTR-01; não se altera o envelope, a versão nem a ordem das secções. Os campos de outros donos
(`ACTORS`, `AGENDA`, `RNG`, etc.) não são tocados.

`REGION` (tag 1), com as arestas do grafo regional:

```text
generator_version u16
flags u16                  (0)
seed u64
min_x i32
max_x i32
min_y i32
max_y i32
min_z i16
max_z i16
edge_count u32
repeat edge_count, ordered by edge_id ascending:
  edge_id u64
  gate_a u64
  gate_b u64
  cost_ticks u32
  corridor_c1 u16
  corridor_c2 u16
  corridor_c3 u16
  corridor_c4 u16
  state u8                (1 = PASSÁVEL, 2 = BLOQUEADA)
  flags u8                (0)
```

`LOCALITIES` (tag 2), com os portões de cada localidade:

```text
count u32
repeat count, ordered by location_id ascending:
  location_id u64
  min_x i32
  max_x i32
  min_y i32
  max_y i32
  min_z i16
  max_z i16
  gate_count u8
  repeat gate_count, ordered by gate_id ascending:
    gate_id u64
    x i32
    y i32
    z i16
    kind u16              (1 = ESTRADA, 2 = TRILHA)
    flags u16             (0)
```

`STRUCTURES` (tag 3):

```text
count u32
repeat count, ordered by structure_id ascending:
  structure_id u64
  location_id u64
  kind u16
  flags u16               (0)
  min_x i32
  max_x i32
  min_y i32
  max_y i32
  min_z i16
  max_z i16
  block_count u32
```

`BLOCKS` (tag 4), apenas células não implícitas:

```text
count u32
repeat count, ordered by (location_id, z, y, x) ascending:
  location_id u64
  z i16
  y i32
  x i32
  surface u16
  fill u16
  structure_id u64        (0 = sem estrutura)
  role u16                (0 = NENHUM)
  flags u16               (0)
```

Regras de payload:

- `REGION` tem `flags = 0`; qualquer bit não nulo é `NonZeroFlags`. `edge_count` é `u32`; acima
  de `MAX_EDGES` é `InvalidRegionPayload`, nunca truncagem.
- Cada aresta de `REGION` tem `gate_a < gate_b`, ambos `GateId` kind 6 vivos e presentes em
  `LOCALITIES`; `corridor_c1..c4` com soma em `1..=MAX_CORRIDOR_CELLS`;
  `cost_ticks = c1 + 2*c2 + 3*c3 + 4*c4 + 2` (`EdgeCostMismatch` se divergir); `state` 1/2 e
  `flags = 0`; o par de portões é único e não se repete noutra aresta.
- `LOCALITIES` tem `count` igual ao número de localidades; `gate_count` em `1..=8`; a lista de
  portões é ordenada por `gate_id`; `kind` 1/2; `flags = 0`.
- `STRUCTURES` tem IDs kind 4, `block_count > 0`, AABB exato e ordenado por `structure_id`;
  `kind` 1..=6; `flags = 0`.
- `BLOCKS` tem chave `(location_id, z, y, x)` única; `surface`/`fill` dos catálogos §3.3/§3.4;
  `structure_id = 0` exige `role = 0`; `structure_id != 0` exige estrutura existente, mesma
  localidade e `role` coerente; `flags = 0`.
- O bloco implícito `(surface = NENHUMA, fill = AR, structure_id = 0, role = 0)` **não** é
  codificado; codificá-lo é `NonCanonicalBlock`. Um bloco não implícito com a mesma combinação
  também é rejeitado.
- A ordem das localidades, estruturas e blocos é a ordem canónica do CTR-01 §5.4; uma ordem
  errada é `CanonicalOrderViolation`; chave repetida é `DuplicateCanonicalKey`.
- O `RegionId` e o `tick` vêm do envelope do CTR-01, não do payload `REGION`. `seed` e
  `generator_version` são os únicos metadados de geração no payload.
- A codificação das arestas em `REGION` e dos portões em `LOCALITIES` é a recomendação deste
  contrato para não criar tags novas; a confirmação com o dono do CTR-01 é uma decisão de freeze
  (§13, linha 1). Se não for aceite, o CTR-01 precisa de secções novas antes de qualquer
  implementação; este contrato não altera o CTR-01 por conta própria.

### 4.9 Fixture curada do DOC-02

A fixture é um `FixtureManifest` v1 — instrumento de teste, não um modo de `generate_region`
nem o produto. O manifesto é propriedade de `GRID-01`, que o materializa num `RegionState`; os
consumidores são `GAME-01`, `SOC-01`, `SOC-03` e `E2E-01`. O estado materializado passa as mesmas
validações de §4.7/§4.8; a seed `0` é de teste e não aprova `PD-09`. Os nomes são ilustrativos e
não canónicos. O manifesto é fechado: AABBs, IDs, portões, regra de terreno e contagens de
corredor bastam para reconstruir a fixture sem inventar layout. O manifesto **não** usa
`gates_per_locality = 2` como override: os portões são explícitos e produzem 2/2/2/1 por
localidade.

| Campo do `FixtureManifest` | Valor |
| --- | --- |
| `manifest_version` | `1` |
| `name` | `DOC02_FIXTURE_V1` |
| `region_id` | `0x0000_0000_0000_0001` (vetor de teste; não afirma o resultado de `generate_region` para a seed) |
| `seed` | `0` (somente fixture; `PD-09` canónico continua pendente) |
| `generator_version` | `1` |
| `bounds` | `(0, 0, 0)..(129, 71, 0)` |
| `terrain_rule` | Todas as células de cada localidade em `z = 0` têm `surface = TERRA_BATIDA`, `fill = AR`, `structure_id = 0`, `role = 0`; fora das localidades, o bloco é implícito `(NENHUMA, AR)`. |

Localidades e portões:

| Localidade | `LocationId` | AABB | Portões |
| --- | --- | --- | --- |
| `L1` Vau do Junco | `0x0003_0000_0001_0001` | `x 0..31`, `y 0..31`, `z 0` | `G1a` `(31,16,0)` `ESTRADA`; `G1b` `(16,31,0)` `TRILHA` |
| `L2` Feira de Sal | `0x0003_0000_0002_0001` | `x 64..95`, `y 0..31`, `z 0` | `G2a` `(64,16,0)` `ESTRADA`; `G2b` `(80,31,0)` `TRILHA` |
| `L3` Atalaia do Norte | `0x0003_0000_0003_0001` | `x 34..65`, `y 40..71`, `z 0` | `G3a` `(48,71,0)` `ESTRADA`; `G3b` `(48,40,0)` `TRILHA` |
| `L4` Bosque de Cobre | `0x0003_0000_0004_0001` | `x 98..129`, `y 40..71`, `z 0` | `G4a` `(98,56,0)` `ESTRADA` |

Portões (`GateId` kind 6, geração 1, na ordem de alocação `L1, L2, L3, L4`):

| Portão | `GateId` | Célula | Kind |
| --- | --- | --- | --- |
| `G1a` | `0x0006_0000_0001_0001` | `(31,16,0)` | `ESTRADA` |
| `G1b` | `0x0006_0000_0002_0001` | `(16,31,0)` | `TRILHA` |
| `G2a` | `0x0006_0000_0003_0001` | `(64,16,0)` | `ESTRADA` |
| `G2b` | `0x0006_0000_0004_0001` | `(80,31,0)` | `TRILHA` |
| `G3a` | `0x0006_0000_0005_0001` | `(48,71,0)` | `ESTRADA` |
| `G3b` | `0x0006_0000_0006_0001` | `(48,40,0)` | `TRILHA` |
| `G4a` | `0x0006_0000_0007_0001` | `(98,56,0)` | `ESTRADA` |

Arestas (`EdgeId` kind 7, geração 1; `gate_a < gate_b` e custo pela fórmula de §4.5):

| Nome | `EdgeId` | Portões | `corridor_units` (c1,c2,c3,c4) | `cost_ticks` |
| --- | --- | --- | --- | --- |
| `E12` Vau–Feira | `0x0007_0000_0001_0001` | `G1a`–`G2a` | `6, 0, 0, 4` | `6 + 0 + 0 + 16 + 2 = 24` |
| `E13` Vau–Atalaia | `0x0007_0000_0002_0001` | `G1b`–`G3b` | `5, 3, 0, 0` | `5 + 6 + 0 + 0 + 2 = 13` |
| `E24` Feira–Bosque | `0x0007_0000_0003_0001` | `G2a`–`G4a` | `5, 4, 0, 0` | `5 + 8 + 0 + 0 + 2 = 15` |
| `E23` Atalaia–Feira | `0x0007_0000_0004_0001` | `G2b`–`G3a` | `4, 0, 4, 0` | `4 + 0 + 12 + 0 + 2 = 18` |

A ordem de `EdgeId` é a ordem canónica de alocação por `(gate_a, gate_b)`: `(1,3)`, `(2,6)`,
`(3,7)`, `(4,5)`. A regra de terreno materializa `4096` blocos (`4 × 32 × 32`); não há
estruturas. A fixture é válida apenas se: os AABBs não se sobrepõem e respeitam
`MIN_LOCALITY_GAP = 2`, cada portão está no AABB da sua localidade e numa célula passável,
`gate_count` é `2/2/2/1`, as arestas usam os pares acima, `corridor_units` e `cost_ticks`
satisfazem a fórmula, e as rotas abaixo reproduzem. Qualquer divergência é `InvalidFixture`; não
há correção silenciosa.

Rotas de referência: `L1` para `L2` pela direta `E12` = 24 ticks; pela alternativa `E13` + `E23`
= 31 ticks, vence a direta. `L3` para `L4` por `E23` + `E24` = 33 ticks; por `L1` = 52 ticks,
vence a primeira. Com `E12` bloqueada, `L1` para `L2` passa a 31 ticks. Com `E24` bloqueada,
`L4` fica inalcançável e `find_route` devolve `RouteImpossible`; a recusa de viagem com
`ROTA_IMPOSSIVEL` e 0 tick é de `GAME-01`. O manifesto não pode ser usado para reduzir o produto
a uma vila nem para dispensar a geração procedural com pelo menos três localidades.

## 5. Percepção autoritativa e memória (INT-14)

### 5.1 Três estados e separação de canais

Cada célula, ator ou estrutura tem, para um observador, um de três estados autoritativos:

| Estado | Semântica | Atualização |
| --- | --- | --- |
| **Visão ativa** | Está no FOV direcional do observador no estado corrente. | Recalculada a partir do estado autoritativo; não é persistida como memória. |
| **Memória congelada** | Foi vista antes e não está no FOV atual; guarda o último snapshot autoritativo. | Só muda com nova percepção autoritativa do mesmo observador. |
| **Desconhecido** | Nunca foi percebida pelo observador. | Não se cria por câmera, overlay, render, NLG, UI ou leitura. |

O estado de percepção é por **observador**. Não existe percepção global, "verdade do jogador" no
hash, sensor de câmera ou memória compartilhada. A câmera pode mostrar uma localidade, mas não
transforma o personagem em observador dela.

### 5.2 Observador e `ViewSchema`

- O observador é um `ActorId` vivo, presente no mundo, com célula, `facing` e atributos
  normalizados; um ator em trânsito não tem célula e não pode ser observador
  (`ObserverInTransit`); ator inexistente é `ObserverNotFound`; morto é `ObserverDead`; sem
  `facing`/célula válida é `InvalidObserverState`.
- O `facing` autoritativo é cardinal (`1 = N`, `2 = L`, `3 = S`, `4 = O`). Um `mover` bem-sucedido
  atualiza o `facing` para a direção do último passo cardinal; ações sociais e câmera não o
  alteram. Um ator sem `facing` não é um observador válido; não se inventa uma direção por
  omissão.
- A geometria do FOV é fixa no schema v1: raio efetivo derivado de `percepcao_bp` (atributo
  normalizado `0..=10_000` do CTR-01), arco frontal de 120 graus e `z_span = 1`. O raio é:
  `reach = radius_min + floor((radius_max - radius_min) * percepcao_bp / 10_000)`, com
  `radius_min = 4`, `radius_max = 12`, truncagem em direção a zero e sem `f32`. A fórmula e os
  valores são propostas de contrato; não são balanceamento de produto nem valores medidos.
- `ViewSchema` é o schema de **detalhe e consumidor**, não um botão de FOV: `schema_version = 1`,
  `include_memory`, `include_actors`, `max_cells` em `1..=65_536`, `consumer` em
  `1 = PLAYER`, `2 = NPC`, `3 = MLP`, `4 = DEBUG`. Versão desconhecida é `UnknownViewSchema`;
  `max_cells` inválido é `InvalidViewSchema`. Nenhum pedido de cliente aumenta raio, arco ou
  `z_span`; um schema que tente alargar geometria é rejeitado, não satisfeito.
- `DEBUG` é leitura de desenvolvimento, não shipping; não pode alimentar decisão de NPC/MLP. O
  consumidor `PLAYER` e o consumidor `NPC`/`MLP` recebem o mesmo canal autoritativo; o overlay é
  outro contrato e outro consumidor.

### 5.3 Algoritmo de FOV direcional

Para um observador na célula `o = (x, y, z)` e `facing f`, uma célula `c` é candidata se:

1. `c` está dentro dos limites regionais e `|c.z - o.z| <= 1` (`z_span` v1).
2. `dx = c.x - o.x`, `dy = c.y - o.y`; `dx*dx + dy*dy <= reach*reach` (distância horizontal
   inteira; o alcance é inclusivo).
3. O arco direcional inclui `c`:
   - `FRENTE_120` (schema v1): `dot = dx*fx + dy*fy`, `cross = dx*fy - dy*fx`; exige `dot > 0`
     e `cross*cross <= 3*dot*dot` (aproximação inteira de ±60 graus, bordas incluídas);
   - `FRENTE_90`: `dot > 0` e `cross*cross <= dot*dot` (±45 graus);
   - `FRENTE_180`: `dot >= 0` (±90 graus);
   - `TOTAL_360`: sem restrição de arco.
   As variantes `FRENTE_90`, `FRENTE_180` e `TOTAL_360` existem apenas para testes/schema futuro;
   o schema v1 usa `FRENTE_120` para todos, sem `HashMap` de arcos. As comparações usam `i64` e
   não `f32`; os limites são fechados e determinísticos.
4. A linha de visão entre centros não é bloqueada.

A linha de visão usa a **supercover fechada**: o conjunto de células cujo cubo unitário fechado
intersecta o segmento fechado entre os centros de `o` e `c`, excluindo as células de origem e
destino. A definição é única; empates em arestas/cantos incluem todas as células tocadas e são
resolvidos de forma conservadora (qualquer célula opaca bloqueia). Não há Bresenham dependente de
implementação, arredondamento de `f32` ou desempate por ordem de iteração.

Bloqueiam a linha:

- qualquer célula tocada com `fill.opaque = true` (`PAREDE_*`, `TELHADO`, `TRONCO`, `FOLHAGEM`,
  `ROCHA`); `VIDRO` e `PORTA` não bloqueiam;
- a passagem por um plano de superfície: para cada nível `L` em `zmin+1..=zmax`, onde
  `zmin = min(o.z, c.z)` e `zmax = max(o.z, c.z)`, considerar as células tocadas no nível `L`,
  **incluindo a célula de origem e a de destino quando estiverem nesse nível**; se qualquer uma
  tiver `surface.opaque = true`, a linha é bloqueada. Um piso, terra, rocha ou estrada opacos
  bloqueiam; `ESCADA`, `RAMPA`, água e vegetação são transparentes e permitem ver o nível
  seguinte. Isto trata pisos, andares e vãos de escada sem uma regra especial por nome, e exige
  uma abertura transparente em **todos** os planos atravessados (uma escada isolada não abre um
  piso intermédio opaco).
- Consequência explícita da regra: **o piso de apoio do alvo conta**. Um alvo no andar superior
  sobre `PISO_PEDRA`/`PISO_MADEIRA` opaco não é visto de baixo, mesmo que exista uma `ESCADA`
  noutra célula; para ser visto de baixo, o alvo tem de estar numa célula de superfície
  transparente (`ESCADA` ou `RAMPA`) no nível superior e a linha deve atravessar os planos por
  essa mesma coluna. Simetricamente, um observador sobre um piso opaco não vê o andar de baixo
  através desse piso; a abertura tem de estar na superfície da célula do observador (escada ou
  rampa). O piso de apoio não é ignorado por ser o destino.
- Células fora dos limites regionais não são tocadas nem visíveis; não há wrap nem leitura de
  memória de outra região.

Células visíveis de ambiente são as células não implícitas (superfície ou preenchimento
relevante) que passam os quatro critérios; uma célula de puro `AR`/`NENHUMA` não acrescenta
informação de ambiente. Atores vivos visíveis são os que estão em célula visível e dentro do FOV;
estruturas visíveis são as que têm pelo menos um bloco visível. Itens não entram no FOV v1.

### 5.4 `compute_perception`

```text
compute_perception(world: &WorldState, observer: ActorId) -> Result<PerceivedState, VisibilityError>
```

- Valida observador, célula, `facing`, atributos e limites; não lê câmera, viewport, overlay, NLG,
  UI, relógio ou RNG; não escreve estado, memória, last-seen, agenda ou hash.
- Calcula o FOV acima e devolve `PerceivedState` com observador, `tick`, `state_hash`, `facing`,
  `reach_cells`, células visíveis ordenadas por `(z, y, x)`, atores visíveis ordenados por
  `ActorId` e estruturas visíveis ordenadas por `StructureId`.
- A mesma `WorldState`, o mesmo observador e o mesmo `facing` produzem o mesmo `PerceivedState`
  byte a byte (ordem canónica); a função é pura e pode ser chamada em leitura, dry-run ou teste.
- `PerceivedState` é derivado e não persistido como autoridade. A chamada não avança `Tick`, não
  consome RNG e não cria fato/evento. Uma alteração oculta fora do FOV não aparece no resultado.
- `state_hash` é o hash regional do CTR-01 para o estado lido; o DTO o usa como revisão de
  consistência, não como novo campo autoritativo.

### 5.5 `update_memory`

```text
update_memory(previous: EnvironmentMemory, perceived: &PerceivedState)
  -> Result<EnvironmentMemory, VisibilityError>
```

- `EnvironmentMemory` pertence ao observador e contém `revision u64`, `last_perception_tick u64`,
  células de ambiente com `(surface, fill, structure_id, role, first_seen_tick, last_seen_tick)` e
  atores com `(actor_id, cell, facing, last_seen_tick)`.
- Para cada célula visível, a memória atualiza o snapshot para o valor atual e `last_seen_tick`;
  se a célula já era memória e não está visível, **nada** é alterado, mesmo que o mundo tenha
  mudado. Para cada ator visível, atualiza posição/facing/`last_seen_tick`; um ator que deixou de
  ser visto permanece congelado na última posição, não é removido nem "corrigido" para a posição
  live.
- `last_seen` só muda com percepção autoritativa nova. Câmera, overlay, render, NLG, resize,
  troca de foco, abrir memória ou consultar DTO não chamam `update_memory` e não renovam
  `last_seen`.
- `last_perception_tick` recebe sempre o tick de `perceived` (percepção autoritativa nova); se
  nenhum registo de célula/ator mudou, `revision` permanece. Se algo mudou, `revision` incrementa
  exatamente 1. Um tick menor que o último é `MemoryTickRegression`; observador diferente é
  `MemoryObserverMismatch`. A operação é atómica e não produz memória parcial.
- Esta memória é o snapshot de ambiente e de última posição vista; IDs de eventos/rumores,
  relações, labels e conhecimento social continuam nos contratos `CTR-01`/`CTR-02`/`SOC-*` e não
  são redefinidos aqui.
- A memória não expira em v1: não há esquecimento, decaimento, remoção por distância ou
  `forget`. Uma célula nunca vista continua desconhecida; uma célula vista permanece na memória
  até revisão explícita de contrato futuro.
- Um ator lembrado é **apresentação congelada**, não um alvo vivo: alcance social, testemunho,
  interação e rumor exigem o ator atual no estado; a memória não pode ser usada para justificar
  presença atual, ataque ou conhecimento de NPC. Um NPC pode usar a memória para navegar pelo
  ambiente lembrado, mas não para tratar um ator lembrado como presente.

### 5.6 `observer_view` e DTO por observador

```text
observer_view(world: &WorldState, observer: ActorId, schema: ViewSchema)
  -> Result<ObservationEnvelope, VisibilityError>
```

- Valida observador, schema e memória; devolve um DTO imutável e somente leitura, com
  `dto_version = 1`, observador, `tick`, `state_hash`, `facing`, `schema_version`, alcance,
  `PerceivedState`, memória (se `include_memory`) e limites de desconhecido.
- O DTO não contém nomes, prosa, HP, inventário, relações, agenda, intenção, rumor, overlay,
  câmera, coordenadas de ecrã, stack ou texto NLG. Nomes de localidades são apresentação derivada
  de `(seed, LocationId, name_profile)` e não entram no DTO nem no hash.
- Células em `perceived` são visão ativa; células em `memory` são memória congelada; qualquer
  célula dentro de `unknown_bounds` e ausente das duas listas é desconhecida. O envelope não
  enumera o complemento (que pode ser enorme); consumidores usam a ausência como desconhecido e
  não inferem terreno live.
- `max_cells` limita a soma de células devolvidas em `perceived` e `memory`; exceder o limite é
  `ViewOutputLimitExceeded` e rejeita o DTO inteiro, sem truncagem silenciosa. Consumidores podem
  pedir menos canais (`include_memory = false`, `include_actors = false`), nunca mais geometria.
- A versão do DTO é `1`; `0` ou versões desconhecidas são `UnsupportedViewVersion`; campos
  em falta, ordem errada, `state_hash` inconsistente com o mundo lido ou `dto_version` inválida
  são `InvalidObservationEnvelope`. O DTO é consistente por `(tick, state_hash, memory_revision)`;
  um consumidor que o guarde e compare com outro tick deve tratá-lo como histórico, não live.
- `observer_view` não atualiza memória, não avança tick, não consome RNG e não altera hash. É a
  única entrada de conhecimento de NPC/MLP; o overlay não é incluído nem autorizado por este DTO.

### 5.7 Câmera, render e NLG não são sensores

- A câmera não é parâmetro de `compute_perception`, `update_memory` ou `observer_view`; foco,
  zoom, viewport, `camera_z`, resize, painel aberto, overlay e histórico não alteram FOV,
  memória, last-seen, tick, RNG ou hash.
- Render e cliente são consumidores; não escrevem no núcleo, não calculam FOV autoritativo, não
  atualizam memória e não podem usar pixels, oclusão de sprite ou asset para justificar
  conhecimento.
- NLG é lazy e somente leitura; texto, tokens, latência, cache e locale não são percepção. Duas
  prosas diferentes para o mesmo fato produzem o mesmo DTO, tick e hash.
- Uma leitura repetida sem mudança autoritativa devolve o mesmo DTO; uma leitura depois de uma
  ação que avança o mundo devolve o novo tick/hash e a memória atualizada apenas pelas células
  então visíveis.

### 5.8 Exemplos e negativos de percepção

| Caso | Entrada | Resultado |
| --- | --- | --- |
| Parede no mesmo nível | Observador e alvo separados por `PAREDE_PEDRA`, mesmo `z` | Alvo não visível; última posição vista permanece congelada. |
| Porta aberta | `PORTA` entre os dois, mesma linha | Alvo visível e passável; não há estado fechado. |
| Janela | `VIDRO` entre os dois | Alvo visível; movimento para a célula é `CellImpassable`. |
| Telhado | Observador em terraço `z=3`, alvo atrás de `TELHADO` em `z=2` | Linha tocada no telhado opaco; alvo não visível. |
| Dois andares | Observador no piso `z=0`, alvo no piso `z=1`, alvo sobre `PISO_PEDRA` opaco | Alvo **não** visível: o piso de apoio do destino está no plano `z=1` e bloqueia. |
| Escada (alvo na escada) | Observador no piso de baixo, alvo na célula `ESCADA`/`RAMPA` do nível `z=1`, mesma coluna `x,y` | Alvo visível: a superfície transparente da célula do alvo abre o plano. |
| Piso superior opaco | Observador no piso de baixo, escada noutra célula, alvo sobre `PISO_PEDRA` no nível `z=1` | Alvo **não** visível: a escada intermediária não abre o piso de apoio opaco do alvo. |
| Fora do `z_span` | `abs(dz) > 1` | Não visível, mesmo com linha livre. |
| Fora do arco | Alvo atrás do observador em `FRENTE_120` | Não visível, mesmo adjacente. |
| Limite do raio | Alvo exatamente em `reach` | Visível se o arco e a linha permitirem; o limite é inclusivo. |
| Canto/aresta | Linha passa exatamente por canto de parede | Supercover conservadora inclui a parede; bloqueia. |
| Fora da região | Alvo em `x` fora de `REGION_X_MAX` | Não existe; consulta de célula é `CoordinateOutOfBounds`, FOV não faz wrap. |
| Câmera sobre parede | Câmera move para outro `z`, observador parado | DTO idêntico; câmera não é sensor. |
| Ator lembrado | Ator visto ontem, hoje fora do FOV | Permanece na memória na posição antiga; não é alvo vivo. |
| Observador morto | `ActorId` morto | `ObserverDead`; nenhuma memória nova. |
| Schema desconhecido | `schema_version = 2` | `UnknownViewSchema`; sem leitura parcial. |

## 6. Overlay privilegiado de silhuetas (INT-15)

### 6.1 Finalidade e separação

O overlay é um canal de **apresentação** para o jogador humano, separado da percepção autoritativa
e da memória. Ele materializa a exceção deliberada de D-04: todos os personagens atrás de
construções, **inclusive não percebidos**, aparecem como silhuetas. Ele não é uma quarta camada de
memória, não é percepção, não é autorização para o ambiente ficar conhecido e não é um sensor de
NPC/MLP/rumor.

O overlay não se restringe a atores percebidos nem a atores na memória; uma implementação que
filtre por FOV, memória, `last_seen` ou "já visto" viola o contrato. O ator em linha livre mas
fora do arco/raio **não** é silhueta, porque não está atrás de construção; ele continua sujeito à
percepção autoritativa. A exceção é geométrica e limitada, não uma revelação global.

### 6.2 `SilhouetteQuery` e `SilhouetteContract`

```text
player_silhouettes(world: &WorldState, query: &SilhouetteQuery,
                   contract: &SilhouetteContract)
  -> Result<SilhouetteEnvelope, VisibilityError>
```

`SilhouetteQuery` (v1 fixa `A1`, sem campo de âmbito alternativo):

| Campo | Tipo | Regra |
| --- | --- | --- |
| `observer` | `ActorId` | Jogador vivo; é o único dono do canal. |
| `anchor` | `GridPoint` | Âncora da câmera; `anchor.z` deve ser igual a `camera_z`; a célula deve pertencer a exatamente uma localidade (`A1`). |
| `camera_z` | `i16` | Nível exibido; `0..=15`; deve ser igual a `anchor.z`; não move ator. |

`SilhouetteContract` v1 (valores aprovados; um valor diferente exige versão nova):

| Campo | Valor v1 | Regra |
| --- | --- | --- |
| `contract_version` | `1` | Outra versão é `UnknownSilhouetteContract`. |
| `max_distance_cells` | `32` | Distância máxima a partir da âncora (`D1` aprovado). |
| `z_below` | `1` | Um nível abaixo de `camera_z` (`Z2` aprovado). |
| `z_above` | `1` | Um nível acima de `camera_z` (`Z2` aprovado). |
| `require_construction_occluder` | `true` | Silhueta só atrás de construção opaca (`O1` aprovado). |
| `max_silhouettes` | `256` | Limite determinístico; zero é `InvalidSilhouetteContract`. |
| `allowed_roles` | `0b111` | Bits 0/1/2 correspondem aos papéis 1/2/3 (`PAREDE`/`TELHADO`/`PISO`); bits 3..15 devem ser `0`. |

O contrato é um valor versionado e imutável de configuração. Ele não é escolhido pelo cliente,
não é inferido de assets, não é ampliado por zoom e não entra no save/replay. A combinação
`A1 + D1 + Z2 + N1 + O1` foi **aprovada pelo maintainer em 2026-11-08**; `A2`/`A3`/`Z3`/`O2` e
`N2` não são representáveis na v1 e exigem campo/versão nova e nova decisão (§6.5).

Validação conjunta: `contract.contract_version == 1`, todos os valores da tabela exatamente
iguais aos aprovados, `contract.allowed_roles` sem bits desconhecidos,
`contract.require_construction_occluder = true`, `anchor.z == camera_z`, `0 <= camera_z <= 15`,
`anchor` contido numa localidade e observador válido. Contrato divergente é
`InvalidSilhouetteContract`; query divergente é `InvalidSilhouetteQuery`; âncora fora de
localidade é `AnchorOutsideLocality`; `anchor.z != camera_z` é `CameraAnchorMismatch`. Não há
resultado parcial nem default de âmbito.

### 6.3 Elegibilidade: todos atrás de construções, inclusive não percebidos

Um ator é elegível para silhueta se **todos** os critérios valem:

1. É um ator vivo, diferente do observador (o avatar do jogador não é silhueta).
2. Está numa célula da região, não em trânsito (ator em trânsito não tem célula e não está atrás
   de construção).
3. A célula está na **localidade da âncora** (`A1`), a `max_distance_cells = 32` dela, e na faixa
   `[camera_z - 1, camera_z + 1]` (`Z2`).
4. Existe **pelo menos uma construção opaca** tocada pela linha de visão entre o olho da câmera
   (a própria `anchor`, com `anchor.z == camera_z`) e a célula do ator: `PAREDE`, `TELHADO` ou
   `PISO` estrutural (`O1`). A linha usa a mesma supercover 3D de §5.3 (incluindo a regra de
   planos de superfície), mas aqui procura um oclusor de construção e **não** calcula FOV.
   `VIDRO` e `PORTA` são transparentes e não contam; `ROCHA`, `TRONCO`, `FOLHAGEM` e vegetação
   **não** são construções e não geram silhueta nesta versão.
5. O ator não está na mesma célula do observador nem é uma duplicata/stale; iteração é sobre
   atores vivos ordenados por `ActorId`.
6. A área nunca vista é **incluída** (`N1` aprovado): nenhuma célula ou ator é excluído por falta
   de memória, `last_seen` ou FOV. Não existe filtro “já visto” na v1.

O critério 4 é o que distingue "atrás de construção" de "não percebido por distância, arco ou
escuridão". Um ator não percebido em campo aberto **não** aparece no overlay; a exceção de D-04
não é um radar de todos os atores. Uma área nunca vista pode conter um ator atrás de parede e é
elegível pela `N1` aprovada; excluí-la exigiria uma nova decisão do maintainer e uma versão nova
do contrato, nunca um filtro implícito de implementação.

### 6.4 Envelope, dados expostos e limites

`SilhouetteEnvelope`:

| Campo | Conteúdo | Regra |
| --- | --- | --- |
| `envelope_version` | `u16 = 1` | Outra versão é `UnsupportedSilhouetteVersion`. |
| `contract_version` | `u16` | Eco do contrato aplicado. |
| `tick` / `state_hash` | `u64` / 32 bytes | Eco do estado lido; consistência com o DTO. |
| `scope` | `LOCALITY` fixo | Âmbito aplicado; a v1 não tem outro valor. |
| `truncated` / `omitted_count` | `bool` / `u32` | Truncagem determinística, nunca silenciosa. |
| `silhouettes` | lista ordenada | Ordenada por `(distance_squared, actor_id)` ascendente. |

Cada silhueta expõe **somente**:

- `actor_id` (identidade), `cell` (`GridPoint`), `facing` (direção atual), `occluder_role`
  (código 1 = `PAREDE`, 2 = `TELHADO`, 3 = `PISO`), `occluder_cell` (célula da construção que
  oclui) e `memory_class` (`1 = MEMORIA`, `2 = NUNCA_VISTO`), derivada da memória do observador
  sem recalcular FOV.

Não expõe nome, espécie, HP, inventário, relações, agenda, intenção, rumor, texto, arte, cor,
retrato, atributos, `state_hash` de outro observador, caminho, posição futura ou qualquer campo
que não esteja na lista. A silhueta é uma presença genérica; o cliente escolhe um estilo aprovado,
não inventa dados. A `occluder_cell` pode ser usada para orientar o efeito visual, não para
revelar o interior da construção.

- O envelope é somente leitura: `world` é `&WorldState`, não há escrita, RNG, tick, memória,
  last-seen, agenda, fato, evento ou save. O `tick`/`state_hash` são eco, não um novo commit.
- `max_silhouettes` é aplicado depois de ordenar por `(distance_squared, actor_id)`; se houver
  mais candidatos, devolve os primeiros e `truncated = true` com `omitted_count`; a ordem é
  estável e não depende de `HashMap`. `max_silhouettes = 0` é `InvalidSilhouetteContract`.
- Consulta inválida (âncora fora dos limites ou fora de qualquer localidade, `camera_z` inválido,
  `anchor.z != camera_z`, observador morto/inexistente/em trânsito) é
  `InvalidSilhouetteQuery`/`AnchorOutsideLocality`/`CameraAnchorMismatch`/`ObserverDead`/
  `ObserverNotFound`/`ObserverInTransit`; não há resultado parcial.
- `player_silhouettes` exige a permissão `PlayerPresentation`; NPC, MLP, rumor, testemunho e
  alcance social não têm essa permissão e recebem `OverlayAccessDenied`. Uma versão `DEBUG` é
  separada, não shipping e nunca alimenta decisão.

### 6.5 Alcance geométrico aprovado

A combinação `A1 + D1 + Z2 + N1 + O1`, com `max_silhouettes = 256`, foi **aprovada pelo
maintainer em 2026-11-08**. Ela é a única configuração da v1; não há campo de âmbito, distância
alternativa, exclusão de área nunca vista ou oclusor natural no contrato.

| Dimensão | Valor aprovado | Efeito |
| --- | --- | --- |
| Âmbito | `A1` `LOCALITY` | Apenas a localidade que contém a âncora; âncora fora de localidade é rejeitada. |
| Distância | `D1` | `32` células a partir da âncora. |
| Níveis `z` | `Z2` | `camera_z - 1..=camera_z + 1`; paredes, telhados e pisos continuam a ocluir. |
| Áreas nunca vistas | `N1` | Incluídas dentro do âmbito; nenhuma filtragem por memória/`last_seen`/FOV. |
| Oclusores | `O1` | Apenas `PAREDE`/`TELHADO`/`PISO` estruturais opacos. |
| Limite | `256` | Truncagem determinística por `(distance_squared, actor_id)`. |

Alternativas **não representáveis na v1** (exigem campo, versão e decisão nova; não são opções
válidas hoje): `A2` recorte por viewport, `A3` região inteira, `Z3` todos os níveis, `O2`
adicionar tronco/folhagem/rocha e `N2` excluir áreas nunca vistas. `N2` em especial contradiz
D-04 e o AC-CTR-03-03; não pode ser reintroduzida como opção técnica.

O número `32` e a faixa `±1` são decisões de produto aprovadas, não medições. `VIEW-01` pode
implementar o canal com esta configuração depois do freeze; `RENDER-01` continua dependente da
stack (`PA-08`), e a lista de campos expostos (`PA-06`) e o debug (`PA-07`) continuam pendentes.
`RENDER-01` não pode aumentar o alcance, mudar oclusores ou reativar `N2` por conta própria.

### 6.6 O overlay não é fonte de conhecimento

- `player_silhouettes` não chama `update_memory`, não altera `last_seen`, não cria ou atualiza
  célula de memória, não muda `facing`, não move ator, não avança `Tick`, não consome RNG e não
  altera `state_hash`.
- O envelope não entra em save, replay, log factual, agenda, MLP, NPC, rumor, testemunho, alcance
  social, linha estrutural ou seleção de alvo. Um NPC não pode referir-se a uma silhueta; uma MLP
  não pode recebê-la como input; um rumor não pode ser semeado por ela.
- A presença revelada é do jogador humano, não do personagem. Uma ação subsequente do jogador
  continua sujeita às regras normais de validação, custo, alcance e percepção; o overlay não
  autoriza interação através de parede.
- O overlay pode ser desligado sem alterar a simulação; ligar/desligar, abrir/fechar e consultar
  custam 0 ticks e não mudam hash, memória, agenda ou conhecimento. O cache de apresentação, se
  existir, fica fora do estado, do save e do hash.
- Testes de contaminação devem comparar, antes e depois de uma consulta de overlay: `state_hash`,
  `tick`, cursores de RNG, memória/last-seen, fatos, agenda e saída de MLP. Qualquer diferença é
  falha bloqueante.

## 7. Câmera, foco e níveis

### 7.1 `CameraState` é apresentação

`CameraState` proposto: `anchor: GridPoint` (centro da vista), `camera_z: i16` (`0..=15`), `zoom_permille`
(`500..=4_000`), `viewport_width_cells: u16`, `viewport_height_cells: u16`, `layer_mask: u32` e
`overlay_enabled: bool`. Não há rotação, perspectiva, `fov` de câmera ou altura flutuante em v1.
Todos os campos são inteiros e vivem fora do `WorldState`, do save autoritativo e do hash.

- `anchor` deve estar nos limites regionais e `anchor.z` deve ser **igual** a `camera_z`; um valor
  divergente é `CameraAnchorMismatch` (ou `InvalidCameraState` na câmera). `camera_z` deve ser um
  nível válido; zoom e viewport devem ser positivos. `layer_mask` usa os bits 0..7 para as oito
  camadas de §8.3 (bit 0 = camada 1); bits 8..31 devem ser `0`, caso contrário `InvalidCameraState`.
  O cliente pode corrigir apenas a apresentação, nunca o mundo.
- A câmera pode olhar uma localidade, uma parede, um telhado ou uma área desconhecida; isso não
  cria percepção, memória, terreno, ator, estrutura ou fato. O desconhecido continua desconhecido
  no canal autoritativo. Para o overlay, a âncora tem de estar dentro de uma localidade; a câmera
  em terreno selvagem não define “localidade da âncora” e a query é rejeitada com
  `AnchorOutsideLocality`.
- O cliente pode usar `anchor`/`camera_z` na query de overlay como janela geométrica de
  apresentação; isso não converte a câmera em observador nem em sensor. O observador de FOV é
  sempre o ator.

### 7.2 Operações de câmera e foco

| Operação | Custo | Pode alterar estado autoritativo | Pode alterar conhecimento do personagem |
| --- | --- | --- | --- |
| Mover câmera, arrastar, rolar | 0 | não | não |
| Subir/descer `z` exibido | 0 | não | não |
| Zoom, resize, trocar layout | 0 | não | não |
| Trocar foco de localidade | 0 | não | não |
| Abrir/fechar mapa, memória ou overlay | 0 | não | não |
| Abrir/fechar histórico ou diário | 0 | não | não |
| Gerar/regenerar/reproduzir NLG ou áudio | 0 | não | não |
| Pausar/retomar render ou perder frames | 0 | não | não |

Nenhuma dessas operações pode congelar localidades, suspender agenda, aplicar LOD autoritativo,
interromper propagação de rumor, reduzir população ou remover entidades do estado. O DOC-02 §3.4 e
o ADR 0008 são vinculantes. A comparação de `state_hash` antes/depois é obrigatória nos testes.

### 7.3 Câmera não seleciona o mundo simulado

- `generate_region` gera a região inteira antes de qualquer render; o render não cria localidade,
  não "acorda" chunk e não decide o que existe. Um cliente que nunca abriu uma localidade não a
  remove do estado, da agenda, do hash ou do save.
- A agenda de cada localidade processa os ticks devidos de qualquer ação autoritativa,
  independentemente do foco. Um NPC em outra localidade continua a agir, viajar e propagar rumor
  nos ticks cobertos por uma ação do jogador.
- Trocar de foco não altera `facing`, célula, memória, relações, rumores, RNG ou agenda. Não há
  "pausa por distância" nem simulação preguiçosa; uma otimização futura exige política
  determinística explícita e comparação contra baseline regional (D-07).
- O `z` da câmera não é o `z` do ator. Ver um andar de cima não permite interagir com ele; o
  alcance social, a ocupação e a linha estrutural usam a célula e o `z` do ator, não a câmera.
- O render pode mostrar uma célula fora do FOV como desconhecida ou como memória; não pode
  preencher o desconhecido com terreno live, silhueta de ator em campo aberto ou dado de outra
  localidade. O overlay é a única exceção, e apenas nos limites aprovados.

## 8. Cliente 2D e interface lógica (INT-19)

### 8.1 `present(...)` independente de linguagem e stack

```text
present(observation: ObservationEnvelope, silhouettes: SilhouetteEnvelope,
        camera: CameraState) -> FrameReceipt
```

A interface é lógica, não escolhe linguagem, engine, framework, biblioteca, formato de asset,
protocolo, processo ou ponte. Ela recebe **somente leitura** (DTO observado, envelope de silhuetas
e câmera) e devolve um recibo de apresentação; não recebe `WorldState`, não chama regra, não
escreve estado e não avança tempo.

`FrameReceipt` proposto: `frame_seq u64` (contador local do cliente), `presented_tick u64`,
`state_hash [u8;32]` ecoado, `observation_version u16`, `silhouette_contract_version u16`,
`overlay_drawn bool`, `warnings` (lista de códigos) e `picked` opcional. O recibo é diagnóstico de
apresentação; não é recibo de ação, não entra no save/hash/replay e não pode ser usado para
autorizar efeito. Tempo de parede, FPS e latência podem aparecer em diagnóstico local, nunca em
golden, hash ou decisão.

O cliente deve rejeitar/avisar quando `observation.tick/state_hash` e
`silhouettes.tick/state_hash` não coincidem, quando o contrato de silhuetas diverge dos valores
aprovados ou quando a versão do DTO é desconhecida (`STALE_OBSERVATION`, `OVERLAY_CONTRACT_MISMATCH`,
`UNSUPPORTED_DTO`). Um frame com aviso pode desenhar ambiente, mas não deve misturar canais
inconsistentes nem inventar dados.

### 8.2 Projeção isométrica 2D, nunca 3D real

A projeção é isométrica 2D, com fórmula inteira determinística:

```text
sx = (x - y) * (TILE_W / 2)
sy = (x + y) * (TILE_H / 2) - z * LEVEL_H
```

`TILE_W = 64`, `TILE_H = 32` e `LEVEL_H = 16` são valores lógicos propostos, não aprovados pela
stack; `TILE_W`/`TILE_H` devem ser pares para não criar meias unidades. A câmera aplica translação
inteira e zoom inteiro; não há perspectiva, matriz 4x4, malha, iluminação 3D, profundidade de GPU
ou câmera 3D. A ordenação visual usa `(z, y, x, layer, id)` e é estável; sprites podem ser
desenhados em qualquer resolução, mas a lógica de célula continua inteira.

Picking é a operação inversa lógica: dado um ponto de ecrã e a câmera, devolver a célula/entidade
mais alta na ordem de camadas; em empate, a chave de ordenação decide. O cliente pode aproximar a
projeção para desenhar, mas a célula devolvida deve ser a lógica e o resultado deve ser
reproduzível. Um clique ambíguo ou fora do mapa devolve `PickingMiss`, não um palpite que altere o
mundo. A especificação fina de assets, atlas, interpolação e arredondamento pertence a
`RENDER-01`, depois da stack.

### 8.3 Camadas e z-order

| Ordem | Camada | Conteúdo | Regra |
| --- | --- | --- | --- |
| 1 | `TERRENO_ATIVO` | Superfícies visíveis ativas | Só o que está no DTO ativo. |
| 2 | `ESTRUTURA_ATIVA` | Paredes, pisos, telhados, portas visíveis | Oclusão visual normal; sem revelar interior não percebido. |
| 3 | `ATORES_ATIVOS` | Atores percebidos | Ordenados por `(z, y, x, actor_id)`. |
| 4 | `MEMORIA_AMBIENTE` | Células e estruturas congeladas | Dessaturado/estilo de memória; nunca atualizado por overlay. |
| 5 | `MEMORIA_ATORES` | Últimas posições vistas de atores | Fantasmas não interativos; não são alvos. |
| 6 | `ITENS` | Reservada | Vazia em v1; item não é célula. |
| 7 | `SILHUETAS_PRIVILEGIADAS` | Todas as silhuetas elegíveis | Canal separado, só para o jogador; acima do ambiente, dos atores e dos itens. |
| 8 | `UI` | Painéis, seleção, texto | Não escreve no mundo. |

O overlay é composto depois do ambiente/atores e antes da UI, para que a silhueta seja visível
através da construção; ele não substitui o sprite do ambiente, não apaga a memória e não é
desenhado para NPC/MLP/debug de decisão. A camada de silhuetas é sempre a última camada de mundo e
nunca é fundida com `ATORES_ATIVOS`, para que um teste possa distinguir os canais.

### 8.4 Input e picking

- Movimento de câmera, zoom, troca de `z` exibido, abrir/fechar overlay, abrir histórico e
  redimensionar são input de apresentação: 0 ticks, sem intent de mundo.
- Clique/tecla de ação produz um **candidato** a `PlayerIntent` (mover, falar, viajar, etc.) com
  alvo/célula; o cliente envia ao app e não aplica nada. A validação, o custo, o RNG e o commit
  pertencem a `GAME-01`/`APP-01`. Um clique inválido não cria evento nem tick.
- Picking usa o último frame apresentado, com `state_hash` ecoado; se o app já está noutro
  estado, o cliente rejeita a seleção ou re-apresenta, sem aplicar em estado obsoleto.
- Texto livre, prosa, tokens, áudio e latência não são intent de fala; a fala é simbólica
  (`registro`/`topic`) e a NLG é lazy, fora do tick.
- O cliente não calcula FOV, memória, rota, passagem, oclusão autoritativa ou custo como
  autoridade; pode calcular apenas apresentação (sprite, interpolação, culling visual) e picking
  lógico. Um cálculo de apresentação divergente não pode reescrever o DTO.

### 8.5 O que o cliente não pode escrever

O cliente **não pode** escrever `WorldState`, `RegionState`, `EnvironmentMemory`, `last_seen`,
`facing`, `Tick`, RNG, agenda, relações, rumores, fatos, eventos, save, replay, regras ou hash.
Também não pode: alterar percepção por câmera ou overlay; criar/remover ator, localidade, portão,
aresta, estrutura ou bloco; mudar o resultado de uma ação; usar um asset como verdade; chamar
`update_memory`; decidir quais localidades existem; ou transformar silhueta em conhecimento de
NPC/MLP. A API de leitura é separada da API de ação, e o cliente só tem a primeira; a ação passa
por `APP-01`.

### 8.6 Gate de decisão de stack (D-06)

Antes de qualquer implementação do cliente, o maintainer deve decidir e registar:

1. Linguagem/engine 2D e biblioteca de janela/input.
2. Ponte entre núcleo e cliente (IPC, FFI, processo, protocolo e serialização), se houver.
3. Build, empacotamento, distribuição e reprodução em Windows/Linux.
4. Formato/licença de assets, atlas, fontes e som; sem pesos, segredos ou download automático.
5. Harness de testes visuais, goldens de projeção/camadas/picking e limites de flakiness.
6. Política de diagnóstico CPU/GPU sem teto antecipado (D-05); números medidos são diagnóstico.
7. Allowlist de ficheiros de código do cliente, revisão S-UI e integração no juiz.

O gate proposto é `RENDER_STACK_AND_CODE_ALLOWLIST`; sem ele, `RENDER-01` pode no máximo produzir
documento de decisão, nunca código de UI. Este contrato não escolhe nenhuma das opções acima. A
decisão do maintainer deve ser registada em `decisions.md` e refletida no contrato
`docs/planning/contracts/render-client.md` (ainda inexistente, por isso não linkado), sem alterar
este documento por conveniência de implementação.

## 9. Percepção abstrata para W8 (NPC/MLP)

### 9.1 Princípio

A trilha W8/BEH (BEH-01 a BEH-04) recebe uma **percepção abstrata equivalente** derivada somente
da percepção autoritativa e da memória autoritativa. Ela exclui, por construção, o overlay
privilegiado, a câmera, o ecrã, a NLG e qualquer dado que o personagem não tenha percebido. Um NPC
não vê o que o jogador vê por apresentação; uma MLP não aprende com silhueta, zoom, painel ou
histórico.

### 9.2 `AbstractPerception` v1

| Campo | Conteúdo | Regra |
| --- | --- | --- |
| `schema_version` | `u16 = 1` | Outra versão é `UnknownAbstractPerceptionVersion`. |
| `observer`, `tick`, `state_hash` | Identidade e revisão | Eco do estado autoritativo lido. |
| `facing`, `reach_cells` | Direção e alcance | Do observador, não da câmera. |
| `visible_actors` | Lista ordenada por `ActorId` | Cada item tem `actor_id`, `bearing_quadrant` (`0..3`), `distance_bucket` (`1..=4`) e `elevation_bucket` (`-1..=1`); somente atores vivos no FOV atual. |
| `environment_features` | Contagens inteiras | `passable_neighbors`, `opaque_neighbors`, `water_neighbors`, `vegetation_neighbors`, `road_neighbors`, cada uma em `0..=4`; vizinhança cardinal no mesmo `z`. |
| `memory_summary` | Contagens | `remembered_cells u32`, `remembered_actors u32` e `last_seen_tick_max u64`; nunca posições de atores lembrados. |
| `unknown_ratio_bp` | `0..=10_000` | Fração do quadrado local `(2*reach+1)^2` no mesmo `z` sem visão ativa nem memória. |

Fórmulas exatas (sem `f32`; `dx = actor.x - observer.x`, `dy = actor.y - observer.y`,
`dz = actor.z - observer.z`, `forward = dx*fx + dy*fy`, `right = -dx*fy + dy*fx`, com
`(fx, fy)` o vetor `facing`):

- `bearing_quadrant`: `0` se `forward > 0` e `abs(forward) >= abs(right)`; `1` se `right > 0` e
  `abs(right) > abs(forward)`; `2` se `forward < 0` e `abs(forward) >= abs(right)`; `3` nos
  restantes casos. Empates favorecem frente/trás de forma determinística.
- `distance_bucket`: `1` se `dx*dx + dy*dy <= 4`; `2` se `<= 16`; `3` se `<= 64`; `4` caso
  contrário (o FOV v1 tem `reach <= 12`, logo `d2 <= 144`).
- `elevation_bucket`: `-1` se `dz < 0`, `0` se `dz = 0`, `1` se `dz > 0` (o FOV v1 limita
  `abs(dz) <= 1`).
- `unknown_ratio_bp = floor(unknown_cells * 10_000 / total_cells)`, onde `total_cells =
  (2*reach+1)^2` e `unknown_cells` conta as células do quadrado local que não estão em
  `perceived` nem em `memory`; `total_cells > 0` é garantido por `reach >= 4`.
- `environment_features`: as quatro células cardinais no mesmo `z`; `passable_neighbors` conta
  as passáveis por §3.4, `opaque_neighbors` as com `fill.opaque`, e água/vegetação/estrada as do
  `CellType` correspondente; cada contagem fica em `0..=4`. `memory_summary` conta células e
  atores com `last_seen` e o maior `last_seen_tick`; não expõe posições de atores lembrados.

- `AbstractPerception` não contém `SilhouetteEnvelope`, `camera`, `anchor`, coordenadas de ecrã,
  nomes, HP, inventário, relações, rumores, agenda, intenção, prosa ou qualquer campo de overlay.
  Também não contém a posição live de um ator não percebido; a memória de ator é apresentação
  congelada, não input de decisão de alvo.
- A conversão para `AbstractPerception` é determinística e versionada; o mesmo `PerceivedState` e
  a mesma memória produzem o mesmo DTO. As fórmulas desta secção pertencem a CTR-03; BEH-01
  consome o resultado e não redefine buckets, direções ou distâncias. Não há `f32`, normalização
  por média móvel, ruído ou RNG.
- BEH-01 pode consumir `observer_view` diretamente com `consumer = MLP` ou o DTO abstrato
  equivalente; em qualquer caso, a permissão é a mesma e o overlay é negado. Um teste deve provar
  que mudar silhuetas, câmera ou texto NLG não altera scores/ações da MLP.

### 9.3 Aprovação

A percepção abstrata v1 é **proposta** e depende do aceite do contrato de comportamento (BEH-01/
S-BEHAVIOR) e da revisão independente. A expressão "equivalente aprovada" só pode ser usada
depois desse aceite; este documento não declara que W8 está aprovada. Se BEH-01 precisar de mais
campos, a versão sobe e a mudança é revista; não se acrescenta silhueta, câmera ou conhecimento
privilegiado para "melhorar" a decisão.

## 10. Erros e validações

### 10.1 Atomicidade

Toda validação rejeita sem efeito parcial: nenhum estado, tick, cursor de RNG, ID, memória,
`last_seen`, bloco, aresta, fato ou evento é publicado; nenhuma leitura privilegiada altera o
mundo. Um erro numa célula invalida a região/DTO inteiro; um erro numa aresta invalida o grafo da
operação; um erro num bloco invalida a estrutura/região. O chamador pode registar o erro, mas não
publicar metade.

### 10.2 Condições e resultados

| Condição | Deteção | Resultado |
| --- | --- | --- |
| `RegionSpec` com versão desconhecida | `generate_region` | `UnsupportedRegionSpec`. |
| Gerador com versão desconhecida | `generate_region` | `UnsupportedGeneratorVersion`. |
| Bounds fora dos limites ou `min > max` | `RegionSpec`/`GridBounds` | `InvalidRegionBounds`. |
| Contagem, extensão, gap, perfil ou densidade inválidos | `RegionSpec` | `InvalidRegionSpec`. |
| `edge_policy = 1` com `extra_edges > 0` | `RegionSpec` | `InvalidRegionSpec`. |
| `initial_blocked_edges` maior que as arestas selecionadas | geração | `InvalidBlockedEdgeCount`. |
| `REGION.edge_count` acima de `MAX_EDGES` | payload | `InvalidRegionPayload`. |
| `corridor_units` com soma zero/acima do limite | validação | `InvalidCorridorUnits`. |
| Amostra procedural acima de `MAX_CORRIDOR_CELLS` | geração | `CorridorTooLong`. |
| `FixtureManifest` incoerente com o vetor DOC-02 | fixture | `InvalidFixture`. |
| Localidades sobrepostas ou fora dos bounds | geração | `LocalityOverlap`/`LocalityOutOfBounds`. |
| Localidade sem portão ou portão em célula inválida | geração/validação | `InvalidGate`. |
| Grafo sem árvore que ligue todas as localidades | geração | `RegionGenerationFailed`. |
| Coordenada fora dos limites regionais | construção/consulta | `CoordinateOutOfBounds`; sem clamp. |
| `z` fora de `0..=15` | construção/consulta | `InvalidZLevel`. |
| Colisão de `EntityId` na região | allocator | `DuplicateEntityId`; sem reciclagem silenciosa. |
| `LocationId` duplicado ou desconhecido | validação/rota | `DuplicateLocationId`/`UnknownLocation`. |
| `RegionId` igual com seed/spec/versão diferente | importação | `RegionIdCollision`; sem merge silencioso. |
| `GateId` com forma inválida | consulta | `InvalidEntityId` (CTR-01). |
| `GateId` de outro newtype (kind diferente de 6) | consulta | `WrongEntityKind`. |
| `GateId` bem formado mas stale | consulta | `StaleEntityId`. |
| `GateId` vivo fora do grafo, célula inválida ou duplicado | validação | `InvalidGate`. |
| `EdgeId` com forma inválida/stale | consulta | `InvalidEntityId`/`StaleEntityId`. |
| `EdgeId` vivo ausente do grafo de arestas | validação | `InvalidEdge`. |
| Aresta com extremos inválidos, mesma localidade, self-loop ou par repetido | validação | `InvalidEdge`/`DuplicateEdge`. |
| Aresta com portões de `z` diferente | validação | `EdgeElevationMismatch`. |
| Custo de aresta divergente do recalculado | validação | `EdgeCostMismatch`. |
| Custo de aresta acima de `MAX_EDGE_TICKS` | validação | `EdgeCostOverflow`. |
| Estado de aresta desconhecido | validação | `UnsupportedEdgeState`. |
| Rota com origem igual ao destino | `find_route` | `RouteOriginEqualsDestination`. |
| Rota sem solução | `find_route` | `RouteImpossible`. |
| Custo total de rota com overflow | `find_route` | `RouteCostOverflow`. |
| Pedido de rota com localidade/campo inválido | `find_route` | `InvalidRouteRequest`/`UnknownLocation`. |
| Dois atores na mesma célula | ocupação | `InvalidOccupancy`; sem sobreposição. |
| Célula com `fill`/`surface` intransponível | passagem | `CellImpassable`. |
| Célula ocupada por ator/reserva | passagem | `CellOccupied`. |
| Material desconhecido | `BLOCKS`/validação | `UnknownMaterial`. |
| `StructureKind`/`role` desconhecido | `STRUCTURES`/`BLOCKS` | `UnknownStructureKind`/`UnknownStructureRole`. |
| Estrutura vazia, AABB divergente ou bloco fora | `STRUCTURES` | `InvalidStructure`. |
| Bloco implícito codificado, duplicado ou fora de ordem | `BLOCKS` | `NonCanonicalBlock`/`DuplicateCanonicalKey`/`CanonicalOrderViolation`. |
| `ItemId` usado como material/bloco/estrutura | validação | `WrongEntityKind`; item nunca vira voxel. |
| Flags/reservado não nulo | decodificação | `NonZeroFlags`/`NonZeroReserved`. |
| Observador inexistente | percepção | `ObserverNotFound`. |
| Observador morto | percepção | `ObserverDead`. |
| Observador em trânsito ou sem célula/facing | percepção | `ObserverInTransit`/`InvalidObserverState`. |
| Esquema de visão desconhecido | `observer_view` | `UnknownViewSchema`. |
| Esquema de visão com faixa/limite inválido | `observer_view` | `InvalidViewSchema`. |
| Memória de outro observador | `update_memory` | `MemoryObserverMismatch`. |
| Tick de memória regressivo | `update_memory` | `MemoryTickRegression`. |
| DTO com versão inválida/desconhecida | leitura | `UnsupportedViewVersion`. |
| DTO com campo/ordem/hash inconsistente | leitura | `InvalidObservationEnvelope`. |
| DTO acima de `max_cells` | `observer_view` | `ViewOutputLimitExceeded`; sem truncagem. |
| NPC/MLP a pedir overlay | permissão | `OverlayAccessDenied`. |
| Contrato de silhuetas desconhecido/inválido | overlay | `UnknownSilhouetteContract`/`InvalidSilhouetteContract`. |
| Query de overlay inválida | overlay | `InvalidSilhouetteQuery`. |
| Âncora fora de qualquer localidade (`A1`) | overlay | `AnchorOutsideLocality`. |
| `anchor.z != camera_z` | overlay/câmera | `CameraAnchorMismatch`. |
| Envelope de silhuetas com versão inválida | leitura | `UnsupportedSilhouetteVersion`. |
| `max_silhouettes` zero | contrato | `InvalidSilhouetteContract`. |
| Câmera com `z`/âncora/zoom/`layer_mask` inválido | apresentação | `InvalidCameraState`. |
| `present` com DTO de outro tick/hash | cliente | `STALE_OBSERVATION` (aviso; não aplica). |
| Stack/render sem aprovação | processo | `RENDER_STACK_AND_CODE_ALLOWLIST` bloqueado; sem código. |
| Versão de percepção abstrata desconhecida | W8 | `UnknownAbstractPerceptionVersion`. |
| Escrita vinda do cliente | fronteira | `ClientWriteAttempt`; a API não expõe escrita. |

## 11. Critérios de aceite

Os critérios abaixo são rastreáveis ao cartão CTR-03 e às interfaces. Nenhum foi executado nesta
etapa; cada linha indica a prova documental e o teste futuro que deve prová-lo.

### 11.1 AC-CTR-03-01 — Célula, material, estrutura, item e região

Critério: existem tipos de célula (vazio/sólido/água/vegetação/estrada/estrutura), materiais com
opacidade/passagem/ocupação, estrutura cúbica com blocos e item normal fora da grelha; `z` e
níveis, chunks e limites contratuais estão definidos; a região é gerada deterministicamente com
pelo menos três localidades, portões e arestas com topologia válida; o `FixtureManifest` DOC-02
reproduz quatro localidades e custos 24/13/18/15 com terreno de 1 a 4 ticks e +1 por `z`; coordenadas
inválidas, ocupação ilegal, passagem impossível e colisão de identidade são rejeitadas; a mesma
seed gera a mesma região, IDs e rotas; área fora do foco permanece no estado.

Prova documental: §3.1–§3.8, §4.1–§4.9, §10.2 e a decisão de payload/fixture em §13.

Teste futuro: `GRID-01` com `region_generation.rs`; `GRID-02` com blocos/estruturas; `GAME-01`
com a fixture de custos.

### 11.2 AC-CTR-03-02 — Percepção autoritativa e memória

Critério: visão direcional determinística em grelha com três estados; `compute_perception`,
`update_memory` e `observer_view` definidos; `last_seen` só muda com nova percepção autoritativa;
câmera/render/NLG não são sensores; paredes, telhados, andares, salas e limites têm exemplos e
negativos; DTO por observador com tick/revisão; mesma entrada/trajetória reproduz FOV e memória;
mudança oculta não renova `last_seen`; observador morto/inexistente, schema de visão desconhecido
e versão de DTO inválida são rejeitados.

Prova documental: §5.1–§5.8 e §10.2.

Teste futuro: `FOV-01` com `perception_memory.rs`; `VIEW-01` com `view_silhouettes.rs`; `BEH-01`
com inputs abstratos.

### 11.3 AC-CTR-03-03 — Overlay privilegiado de silhuetas

Critério: o overlay mostra todos os personagens atrás de construções, inclusive não percebidos,
em canal separado; não se restringe a percebidos nem a lembrados; não atualiza `last_seen`,
memória, NPC, MLP, rumor, testemunho, hash, tick, RNG, agenda ou save; é somente leitura; não
expõe dados além do contrato; o alcance `A1 + D1 + Z2 + N1 + O1` foi **aprovado pelo maintainer
em 2026-11-08** (`max_silhouettes = 256`), com âncora obrigatoriamente dentro de uma localidade; um
ator não percebido em campo aberto não é silhueta; um ator não percebido atrás de parede é
silhueta quando elegível, inclusive em área nunca vista (`N1`).

Prova documental: §6.1–§6.6, §10.2 e §14.

Teste futuro: `VIEW-01` com `view_silhouettes.rs`; comparação de hash/memória/tick antes/depois;
teste de permissão NPC/MLP.

### 11.4 AC-CTR-03-04 — Câmera, região antes do render, INT-19 e W8

Critério: subir/descer `z` e navegar não alteram ticks, RNG, hash, agenda nem congelam
localidades; a câmera não seleciona o mundo simulado; a região existe antes do render; o cliente
2D tem interface lógica `present(...)` independente de stack, projeção isométrica 2D (nunca 3D
real), camadas, z-order, picking e input, sem escolher engine/ponte; o cliente não escreve estado
autoritativo e o gate de stack está registado; a percepção abstrata de W8 exclui o overlay e
NPC/MLP só recebem percepção autoritativa.

Prova documental: §7.1–§7.3, §8.1–§8.6, §9.1–§9.3 e §14.

Teste futuro: `RENDER-01` (documento de decisão e harness visual), `PLAY-01` (aceite 2D),
`BEH-01`/`BEH-02` (score/ação invariantes ao overlay).

### 11.5 Rastreabilidade dos critérios

| Critério | Exigência do cartão | Onde este contrato fecha | Prova documental | Implementação futura |
| --- | --- | --- | --- | --- |
| `AC-CTR-03-01` | Célula/material/estrutura/item, grelha, chunks, região multi-localidade, portões/arestas, rotas e rejeições | §3.1–§3.8, §4.1–§4.9, §10.2 | Tabelas de materiais, payloads, fixture 24/13/18/15 e testes de colisão/limite | `GRID-01`, `GRID-02`, `GAME-01` com fixture e golden de região. |
| `AC-CTR-03-02` | FOV direcional, três estados, memória, `last_seen`, DTO por observador, câmera/NLG não sensores | §5.1–§5.8, §10.2 | Exemplos de parede/porta/janela/telhado/andar/limite e testes de memória congelada | `FOV-01` com `perception_memory.rs`; `VIEW-01` consome o DTO. |
| `AC-CTR-03-03` | Silhuetas de todos atrás de construções, inclusive não percebidos, sem contaminar conhecimento/hash/tick | §6.1–§6.6, §10.2, §14 | `A1 + D1 + Z2 + N1 + O1` aprovado, lista de campos e testes de contaminação | `VIEW-01` com `view_silhouettes.rs`, com o alcance aprovado. |
| `AC-CTR-03-04` | Câmera sem tick/hash/agenda, região antes do render, INT-19 sem stack, W8 sem overlay | §7.1–§7.3, §8.1–§8.6, §9.1–§9.3, §14 | Tabela de custos 0, fórmula de projeção, gate e exclusões do DTO abstrato | `RENDER-01`, `PLAY-01`, `BEH-01`/`BEH-02` com testes visuais e de score. |

## 12. Testes futuros propostos

Os nomes seguem `given_..._when_..._then_...` e **não foram executados**. São especificação de
testes, não alegação de cobertura.

### 12.1 GRID-01 — região, células e rotas

- `given_same_seed_and_spec_when_generate_region_then_canonical_bytes_identical`
- `given_three_localities_when_generate_then_all_connected_and_present`
- `given_doc02_fixture_manifest_when_materialize_then_four_localities_and_costs_24_13_18_15`
- `given_doc02_fixture_manifest_when_validate_then_gate_pairings_and_terrain_match`
- `given_same_seed_when_find_route_then_identical_route_and_cost`
- `given_corridor_units_when_compute_edge_then_cost_is_formula_plus_two`
- `given_edge_with_zero_corridor_units_when_validate_then_invalid_corridor_units`
- `given_z_change_when_move_stairs_then_cost_adds_one_per_level`
- `given_gate_pair_when_validate_edge_then_distinct_localities_and_unordered_pair`
- `given_duplicate_gate_pair_when_generate_then_duplicate_edge_rejected`
- `given_gate_id_malformed_when_query_then_invalid_entity_id`
- `given_gate_alive_outside_graph_when_validate_then_invalid_gate`
- `given_edge_with_same_locality_when_validate_then_invalid_edge`
- `given_duplicate_entity_id_when_generate_then_rejected_atomically`
- `given_same_seed_different_spec_when_generate_then_distinct_region_id`
- `given_wall_between_when_social_reach_then_line_blocked`
- `given_window_between_when_social_reach_then_line_allowed_but_move_blocked`
- `given_diagonal_move_when_resolve_then_cardinal_only`
- `given_coordinate_outside_region_when_construct_then_coordinate_out_of_bounds`
- `given_z_above_fifteen_when_construct_then_invalid_z_level`
- `given_overlapping_localities_when_generate_then_rejected`
- `given_two_actors_same_cell_when_place_then_invalid_occupancy`
- `given_impassable_fill_when_place_actor_then_cell_impassable`
- `given_blocked_edge_when_find_route_then_alternative_or_route_impossible`
- `given_tied_routes_when_find_route_then_locality_sequence_then_edge_id`
- `given_origin_equals_destination_when_find_route_then_rejected`
- `given_normal_item_when_generate_then_not_a_block_or_material`
- `given_region_with_unfocused_locality_when_compare_hash_then_locality_still_present`
- `given_chunk_outside_bounds_when_query_then_no_wrap`

### 12.2 FOV-01 — percepção e memória

- `given_same_world_facing_schema_when_compute_perception_then_identical`
- `given_wall_between_when_compute_perception_then_actor_not_visible`
- `given_open_door_between_when_compute_perception_then_actor_visible_and_passable`
- `given_window_between_when_compute_perception_then_visible_but_impassable`
- `given_roof_between_when_compute_perception_then_not_visible`
- `given_floor_between_floors_when_compute_perception_then_not_visible`
- `given_target_on_stair_cell_when_compute_perception_then_visible`
- `given_target_on_opaque_upper_floor_when_compute_perception_then_not_visible`
- `given_target_outside_z_span_when_compute_perception_then_not_visible`
- `given_target_outside_facing_arc_when_compute_perception_then_not_visible`
- `given_target_at_exact_reach_when_compute_perception_then_visible`
- `given_hidden_actor_moves_when_update_memory_then_last_seen_unchanged`
- `given_visible_actor_moves_when_update_memory_then_last_seen_updates`
- `given_ticks_advance_outside_fov_when_observer_view_then_memory_frozen`
- `given_camera_pan_when_observer_view_then_dto_identical`
- `given_nlg_regenerated_when_observer_view_then_dto_identical`
- `given_dead_observer_when_compute_perception_then_observer_dead`
- `given_unknown_schema_when_observer_view_then_unknown_view_schema`
- `given_unknown_dto_version_when_decode_then_unsupported_view_version`
- `given_never_seen_cell_when_observer_view_then_unknown_not_live_terrain`
- `given_remembered_actor_when_social_reach_then_not_a_live_target`
- `given_same_authoritative_trajectory_when_replay_perception_then_same_fov_and_memory`

### 12.3 VIEW-01 — silhuetas privilegiadas

- `given_unperceived_actor_behind_wall_when_player_silhouettes_then_present`
- `given_perceived_actor_in_open_field_when_player_silhouettes_then_absent`
- `given_unperceived_actor_in_open_field_when_player_silhouettes_then_absent`
- `given_never_seen_actor_behind_wall_when_overlay_then_present`
- `given_anchor_outside_locality_when_overlay_then_rejected`
- `given_anchor_z_differs_from_camera_z_when_overlay_then_rejected`
- `given_overlay_contract_diverges_from_approved_values_when_query_then_rejected`
- `given_overlay_query_when_compare_state_hash_then_unchanged`
- `given_overlay_query_when_compare_memory_and_last_seen_then_unchanged`
- `given_overlay_query_when_compare_tick_and_rng_then_unchanged`
- `given_dead_actor_when_player_silhouettes_then_absent`
- `given_actor_in_transit_when_player_silhouettes_then_absent`
- `given_actor_beyond_distance_when_player_silhouettes_then_absent`
- `given_actor_outside_z_band_when_player_silhouettes_then_absent`
- `given_overlay_contract_unknown_when_query_then_rejected`
- `given_many_candidates_when_limit_then_deterministic_truncation`
- `given_npc_consumer_when_request_overlay_then_overlay_access_denied`
- `given_silhouette_changes_when_mlp_inputs_then_scores_unchanged`

### 12.4 RENDER-01 / PLAY-01 / BEH-01 — câmera, cliente e W8

- `given_camera_z_changed_when_compare_hash_and_agenda_then_unchanged`
- `given_camera_anchor_z_differs_when_camera_state_then_invalid`
- `given_camera_layer_mask_unknown_bit_when_camera_state_then_invalid`
- `given_camera_pan_between_localities_when_compare_region_then_unchanged`
- `given_viewport_resize_when_compare_tick_then_unchanged`
- `given_region_not_rendered_when_request_frame_then_region_exists_first`
- `given_present_with_mismatched_hash_when_frame_then_warning_not_write`
- `given_client_pick_when_create_intent_then_no_direct_state_write`
- `given_isometric_projection_when_pick_then_cell_roundtrip`
- `given_two_entities_same_pixel_when_pick_then_contract_z_order`
- `given_unknown_stack_when_attempt_ui_code_then_gate_blocked`
- `given_abstract_perception_when_build_then_no_overlay_or_camera_fields`
- `given_overlay_or_camera_change_when_mlp_scores_then_unchanged`
- `given_camera_zoom_when_observer_view_then_dto_identical`

## 13. Decisões para freeze

Cada linha é uma decisão estrutural. A recomendação é deste contrato; o freeze exige revisão
independente e aceite do maintainer. Este documento não se autoaprova.

| # | Decisão | Recomendação | Justificativa | Impacto se rejeitada |
| --- | --- | --- | --- | --- |
| 1 | Onde vivem portões e arestas no estado canónico | Portões em `LOCALITIES`, arestas em `REGION`, sem tags novas | Mantém as 11 secções do CTR-01 e o envelope v2; evita redefinir packing. | Rejeitar exige emenda ao CTR-01 (novas secções 12/13) antes de qualquer estado regional com hash. |
| 2 | Modelo de célula | `surface` + `fill` em vez de um único material | Representa piso, parede, telhado, porta e vão sem duplicar a célula. | Um único material não distingue piso de parede/telhado e força campos laterais. |
| 3 | Tipo de célula | Derivado de `(surface, fill)`, não codificado | Evita redundância e divergência no hash. | Codificar `CellType` cria campo duplicado que pode contradizer os materiais. |
| 4 | Limites de coordenadas | `2^20` valores por eixo e `z` 0..15; chunk 16×16×1 | Validação contratual, portável e suficiente; não é teto de hardware. | Limites menores reduzem a região; maiores exigem nova versão e revisão de overflow. |
| 5 | Geração de aleatoriedade | BLAKE3 contador `AFRG`, separado de INT-02 | `generate_region` é puro e reproduzível sem estado de RNG de simulação. | Usar RNG global quebra pureza/determinismo; usar outro hash muda a região. |
| 6 | Fixture DOC-02 | `FixtureManifest` v1 fechado (AABBs, IDs, portões, `terrain_rule`, `corridor_units`), materializado como `RegionState` validado | Preserva o vetor curado sem modo implícito nem seed inventada. | Sem manifesto, GAME-01/E2E não reproduzem os custos pinados; a fixture não substitui o produto procedural. |
| 7 | Custo de aresta | `corridor_units` (c1..c4) + 2 ticks; unidade intransponível conta como c4 | Coerente com DOC-02, reproduzível e independente de caminho célula a célula. | Outro custo muda rotas, agenda e testes de viagem. |
| 8 | Desempate de rota | Custo, sequência lexicográfica de `LocationId`, depois `EdgeId` | É a regra do DOC-02 e não usa `HashMap`. | Outro desempate torna rotas e replay não reproduzíveis. |
| 9 | FOV v1 | Cilindro `reach` + arco 120° + supercover conservadora + `z_span = 1` | Determinístico, testável com parede/telhado/andar e sem floats. | Arco/raio diferentes mudam memória e testes; supercover não conservadora cria leaks. |
| 10 | Memória inclui atores | Sim, `last_seen` congelado, mas não como alvo vivo | Cumpre a memória do ambiente e criaturas do roadmap sem dar presença atual. | Sem atores lembrados, o snapshot fica incompleto; tratá-los como vivos contamina decisões. |
| 11 | Expiração de memória | Sem expiração em v1 | Simplicidade determinística; esquecimento exige contrato e testes próprios. | Expiração altera replay e NPC; precisa de versão nova. |
| 12 | Codificação da memória | Dentro da secção `ACTORS` (tag 5), dono CTR-02 | CTR-01 não aloca secção de memória; `ACTORS` é o agregado do observador. | Sem acordo com CTR-02, memória não persiste/replay; exige secção nova no CTR-01. |
| 13 | Revisão de leitura | `(tick, state_hash)` + `memory_revision`; sem campo novo de autoridade | Usa autoridades existentes e evita inventar revisão de mundo. | Um contador novo duplicaria autoridade e poderia divergir do hash. |
| 14 | Overlay: quem é elegível | Somente atrás de construção opaca; não é radar de campo aberto | Mantém D-04 literal e evita revelar atores não percebidos sem oclusão. | Filtrar por percebidos viola D-04; incluir campo aberto revela demais. |
| 15 | Overlay: dados expostos | ID, célula, facing, oclusor e classe de memória; nada mais | Presença genérica sem atributos, inventário ou relações. | Campos extra ampliam o vazamento e exigem revisão de segurança. |
| 16 | Overlay: permissão | Só jogador; debug separado e não shipping | NPC/MLP não podem receber o canal privilegiado. | Um canal genérico contamina decisão e rumor. |
| 17 | Overlay: alcance | `A1 + D1 + Z2 + N1 + O1`, `max_silhouettes = 256` — **aprovado pelo maintainer em 2026-11-08** | Cumpre D-04 sem omnisciência regional; testável sem projeção. | Mudar a combinação exige nova decisão, campos/versão e testes. |
| 18 | Stack do cliente | Aberta; gate `RENDER_STACK_AND_CODE_ALLOWLIST` | D-06; nenhuma escolha silenciosa. | Escolher agora contradiz o maintainer e bloqueia revisão de assets/licença. |
| 19 | Cliente e escrita | `present` só lê; ação por `APP-01` | Separação core/UI e autoridade. | Um cliente que escreve corrompe save e replay. |
| 20 | W8 abstrato | Sem overlay, câmera, ecrã ou ator lembrado como vivo | NPC/MLP só usam percepção autoritativa. | Contaminação torna decisões dependentes da apresentação. |
| 21 | Derivação de `RegionId` | Incluir `spec_digest` além de seed/versão | Evita duas `RegionSpec` distintas com o mesmo `RegionId`. | Sem isso, specs diferentes podem colidir na importação; com isso, o CTR-01 confirma a extensão. |
| 22 | `facing` e `percepcao_bp` | Componentes autoritativos do ator em `CTR-02` | `compute_perception` não inventa direção nem atributo. | Sem componente fixado, o FOV não é reproduzível e o DTO é ambíguo. |
| 23 | `Seed`/`RegionId` entre contratos | `Seed(u64)`, `RegionId` e `spec_digest` são definidos aqui e referenciados por CTR-02/INT-01; não há RNG paralelo | Alinha CTR-02 e o roadmap (`Seed(u64)`), evita `[u8;32]` e preserva a identidade regional. | Outro tipo/derivação quebra REGION, hash e importação; exige revisão conjunta. |

## 14. Pendências de aprovação humana

`PA-01` a `PA-05` foram **aprovados pelo maintainer em 2026-11-08**; `PA-06` a `PA-09` continuam
pendentes. Uma alteração de qualquer item exige nova revisão do contrato e dos testes.

| ID | Decisão | Status | Recomendação/impacto |
| --- | --- | --- | --- |
| `PA-01` | Âmbito do overlay | **Aprovado 2026-11-08** — `A1` localidade | `VIEW-01` pode implementar dentro da localidade; âncora fora dela é `AnchorOutsideLocality`. |
| `PA-02` | Distância máxima | **Aprovado 2026-11-08** — `32` células | Limite fixo; qualquer outro valor exige nova decisão/versão. |
| `PA-03` | Faixa de `z` | **Aprovado 2026-11-08** — `camera_z ± 1` | Andares fora da faixa não entram no envelope. |
| `PA-04` | Áreas nunca vistas | **Aprovado 2026-11-08** — incluir (`N1`) | `N2`/exclusão por memória não é opção da v1. |
| `PA-05` | Oclusores | **Aprovado 2026-11-08** — `PAREDE`/`TELHADO`/`PISO` (`O1`) | `O2`/rocha/vegetação exigem nova decisão e versão. |
| `PA-06` | Dados expostos na silhueta | Pendente | Lista mínima de §6.4; mais campos exigem revisão de segurança. |
| `PA-07` | Overlay de debug | Pendente | Canal separado, não shipping; nunca fonte de MLP/NPC. |
| `PA-08` | Stack/ponte/build/assets/testes | Pendente — gate `RENDER_STACK_AND_CODE_ALLOWLIST` | Sem decisão não há código de UI; o motor não é bloqueado. |
| `PA-09` | Seed canónica da fixture (`PD-09`) | Pendente | O `FixtureManifest` usa `seed = 0` de teste; não antecipa a seed de produto. |

A aprovação de `PA-01` a `PA-05` satisfaz o alcance visual de D-04. O overlay ainda é uma proposta
documental até ao freeze e à revisão independente; a implementação de `VIEW-01` não começa antes
do freeze, e `RENDER-01` continua dependente de `PA-08`. Os testes de produto não podem declarar
aprovado qualquer valor de `PA-06` a `PA-09`.

## 15. Consumo por cartões

| Cartão | Interface | Consome | Não pode improvisar |
| --- | --- | --- | --- |
| `GRID-01` | `INT-03` | `RegionSpec`, geração, IDs, portões, arestas, rotas, payloads 1–4 | Outro packing, geração por foco, aresta sem par válido, custo fora do contrato. |
| `GRID-02` | `INT-03` | blocos, estruturas, papéis, AABB, mutação atómica | Item como bloco, estrutura vazia, AABB divergente, mutação parcial. |
| `FOV-01` | `INT-14` | FOV v1, três estados, memória, DTO, erros | Câmera como sensor, memória por overlay, float/RNG, DTO sem versão. |
| `VIEW-01` | `INT-14`/`INT-15` | leitura observada, silhuetas, permissões, alcance aprovado; `PA-06`/`PA-07` pendentes | Filtro "somente percebidos", alcance fora do contrato, escrita no mundo. |
| `RENDER-01` | `INT-15`/`INT-19` | `present`, projeção, camadas, picking, gate de stack | Escolher engine, escrever estado, revelar além do contrato, 3D real. |
| `PLAY-01` | `INT-19` | cliente 2D, câmera, overlay aprovado, ação via app | Tratar overlay como conhecimento, pausar áreas, mudar hash por câmera. |
| `BEH-01` | `INT-16`/`INT-14` | `AbstractPerception` v1, sem overlay | Receber silhueta, câmera ou ator lembrado como vivo. |
| `TUI-01` | `INT-18` | leitura/base view, foco e apresentação | Congelar agenda, cobrar tick por foco, escrever no core. |

## 16. Limitações e estado da entrega

- Documento normativo, sem código de aplicação; nenhum crate, `Cargo.toml`, binário, teste Rust,
  benchmark ou escolha de engine foi criado.
- Nenhum valor de hash, seed canónica, medição de FPS/CPU/GPU ou golden visual é afirmado; os
  valores da fixture são os do DOC-02, não uma medição deste contrato.
- O [ADR 0009](<../../architecture/adr/0009-privileged-silhouette-overlay.md>) continua **Proposto**;
  a aprovação do alcance é registada como decisão de produto neste contrato e em `PA-01`–`PA-05`,
  não altera o status do ADR e não edita o ficheiro do ADR nem o índice.
- O diretório `docs/planning/contracts/` contém este contrato e o CTR-01, mas não tem índice
  compartilhado; a descoberta é pelo caminho e pela CoALA local.
- A codificação de portões/arestas em `REGION`/`LOCALITIES`, a memória dentro de `ACTORS` e a
  derivação de `RegionId` com `spec_digest` são recomendações de fronteira que precisam de
  confirmação dos donos de CTR-01/CTR-02. Sem essa confirmação, a persistência/hash de memória,
  o grafo e a identidade regional ficam bloqueados; este contrato não altera os outros contratos
  por conta própria.
- `facing` e `percepcao_bp` são componentes autoritativos do ator que devem ser fixados em
  `CTR-02`; sem eles, `compute_perception` não tem direção nem raio reproduzíveis e deve devolver
  `InvalidObserverState` em vez de inventar um default.
- O overlay tem `A1 + D1 + Z2 + N1 + O1` **aprovado em 2026-11-08**; `PA-06` (dados expostos),
  `PA-07` (debug), `PA-08` (stack) e `PA-09` (seed) continuam pendentes. Nenhuma dessas quatro
  pendências pode ser decidida pela implementação.
- A stack do cliente, a ponte, o build, os assets, os testes visuais e a allowlist de código
  continuam sob o gate `RENDER_STACK_AND_CODE_ALLOWLIST` (D-06); este contrato não escolhe.
- A revisão `REVIEW-CTR-03` e o aceite do maintainer são obrigatórios; `DELIVERED_TO_REVIEW` não
  é `DONE`, `INTEGRATED` nem freeze.
- Os testes listados são propostas futuras; nenhum foi executado, nenhuma cobertura foi medida e
  nenhuma falha de teste de aplicação foi simulada.

## 17. Referências

- [Contrato CTR-01 — identidade, unidades e eventos](<identity-events.md#L91-L270>).
- [Contrato CTR-01 — coordenadas](<identity-events.md#L286-L301>).
- [Contrato CTR-01 — canonicalização](<identity-events.md#L952-L1200>).
- [Contrato CTR-01 — erros](<identity-events.md#L1202-L1266>).
- [DOC-02 — região, grafo e foco](<../gameplay-spec.md#L56-L145>).
- [DOC-02 — independência de NLG e UI](<../gameplay-spec.md#L891-L934>).
- [DOC-02 — decisões pendentes](<../gameplay-spec.md#L1056-L1072>).
- [Wave spec — INT-03](<../wave-spec.md#L132-L145>), [INT-14](<../wave-spec.md#L231-L238>),
  [INT-15](<../wave-spec.md#L240-L247>) e [INT-19](<../wave-spec.md#L277-L284>).
- [ROADMAP — CTR-03, GRID-01, FOV-01, VIEW-01, RENDER-01, PLAY-01 e BEH-01](<../../../ROADMAP.md>).
- [Decisões do maintainer — D-04](<../decisions.md#L63-L78>), [D-06](<../decisions.md#L97-L105>)
  e [D-07](<../decisions.md#L107-L124>).
- [ADR 0009 — silhuetas privilegiadas](<../../architecture/adr/0009-privileged-silhouette-overlay.md>).
- [ADR 0002 — núcleo determinístico](<../../architecture/adr/0002-rust-flecs-deterministic-core.md>).
- [ADR 0005 — contrato de simulação determinística](<../../architecture/adr/0005-deterministic-simulation-contract.md>).
- [ADR 0008 — tempo por ações](<../../architecture/adr/0008-action-driven-simulation-time.md>).
- [ADR 0010 — identidade e layout de evento](<../../architecture/adr/0010-identity-event-layout.md>).
- [Visão de arquitetura — percepção regional](<../../architecture/overview.md#L364-L381>).
- [Roadmap de arquitetura — visibilidade e memória](<../../architecture/roadmap.md#L475-L530>).
- [Regras de desenvolvimento](<../../engineering/development-rules.md>).
- [Estratégia de testes](<../../engineering/testing-strategy.md>).
