# Contrato CTR-01 — Identidade, unidades e eventos sem perda de fatos

> **Status:** **PROPOSTA PARA FREEZE** — pendente de revisão independente e aceite; nenhum código de aplicação foi criado.

| Campo | Valor |
| --- | --- |
| Tarefa | `CTR-01` — Identidade, unidades e eventos sem perda de fatos |
| Dono | `S-CONTRACT` |
| Perfil | `planner-specialist` |
| Fronteira | `02` |
| Data | `2026-11-08` |
| Base SHA | `c412cd4c0da291d3797e3cc4dd4429199ac979b3` |
| Manifesto | `docs/planning/wave-spec.md`, SHA-256 `328a8c7e121c9e4411bf0c105c3845c636e37bf208770fbc675f2cff4a360769` |
| Worktree | `C:\Users\kluse\Projects\ai-fantasy-worktrees\ctr-01`, branch `docs/ctr-01` |
| Interfaces | `INT-01` (identidade, unidades e canonicalização) e `INT-07` (conversa factual e propagação) |
| ADR | [ADR 0010](<../../architecture/adr/0010-identity-event-layout.md>), status **Proposto** |
| Revisão | `REVIEW-CTR-01` é obrigatória; este documento não se autoaprova |
| Implementação | Nenhuma; sem código de aplicação, sem testes de aplicação e sem valores de hash inventados |

Este contrato fecha as decisões de dados que o achado L-01 da
[revisão de projeto](<../project-review.md#L266-L272>) deixou em aberto. Ele especifica bytes,
faixas e rejeições; não implementa `crates/af-domain/src/lib.rs`, `crates/af-conversation/src/events.rs`
nem qualquer outro caminho futuro. Os caminhos de código citados são destinos propostos, não
arquivos existentes.

## 1. Escopo, não-escopo e decisões preservadas

### 1.1 Escopo

- Largura e empacotamento de IDs geracionais para atores, itens, localidades, estruturas e rumores.
- Sentinelas, reciclagem, overflow, deteção de ID obsoleto e rejeição de colisão entre localidades.
- Unidades autoritativas: `Tick`, coordenadas, quantidades, HP, ponto fixo Q16.16 e basis points.
- Layout binário versionado do registo completo de conversa, com cabeçalho, efeitos tipados e limites.
- Projeção compacta como leitura derivada, sem substituir o log factual autoritativo.
- `ConversationFact` e o contrato de `encode_events`/`decode_events` com ida e volta exata.
- Canonicalização INT-01: envelope, ordem, coleções ordenadas, exclusões voláteis e hash BLAKE3.
- Erros tipados, vetores de bytes escritos à mão e rastreabilidade dos critérios de aceite.
- [ADR 0010](<../../architecture/adr/0010-identity-event-layout.md>) com a decisão estrutural, status **Proposto**.

### 1.2 Não-escopo

- Custos de ação, cadência, agenda regional, transação de RNG e replay: pertencem a `DOC-02`/`CTR-02`.
- Geração procedural, geometria, FOV, percepção e overlay: pertencem a `CTR-03`.
- Schema de regras, DC, allowlist de efeitos e materializador: pertencem a `CTR-04`.
- Durabilidade SQLite/WAL, checkpoint, migração de save e recuperação: pertencem a `STORE-01`/`CTR-02`.
- Render, TUI, câmera, NLG, modelos e sidecars: não entram no estado autoritativo nem no tick.
- Implementação, `Cargo.toml`, crates, testes Rust, benchmarks e valores de hash golden.
- Reabrir qualquer decisão D-01…D-08 ou editar ADRs aceites.

### 1.3 Relação com as decisões D-01…D-08

Nenhuma decisão é reaberta. A tabela apenas declara compatibilidade.

| Decisão | Como este contrato a preserva |
| --- | --- |
| D-01 | O contrato é de motor, não de produto 2D; não antecipa render nem TUI. |
| D-02 | `Tick` é a única noção de tempo do núcleo; relógio de parede e UI não avançam o mundo. Custos não são definidos aqui. |
| D-03 | Deltas sociais e fatos de conversa são exatos em basis points, sem prosa no tick. |
| D-04 | Overlay de silhuetas não entra no estado, no hash nem nos fatos; nenhuma identidade é criada por apresentação. |
| D-05 | Os bytes são idênticos em Windows e Linux; não há dependência de hardware, `usize` ou layout do compilador. |
| D-06 | Nenhuma stack de render é escolhida ou pressuposta. |
| D-07 | A região é multi-localidade desde a base: `LocationId` completo, allocator regional único e hash de todas as localidades. |
| D-08 | A entrega é documental, em worktree isolada, sujeita a revisor individual e juiz; não há autoaprovação. |

### 1.4 Relação com o achado L-01

O [L-01](<../project-review.md#L266-L272>) regista quatro contradições: IDs `u32` versus geracionais
`u64`, uma tabela de evento que soma 46 bytes mas declara 42 + 6, deltas `i8` em pontos percentuais
que não preservam 1 bp e um registo compacto com um único item/HP para até oito efeitos. Este
contrato resolve as quatro por decisão explícita, não por ajuste aritmético de 46 para 48.

- Identidade: `EntityId(u64)` com `kind`/`index`/`generation` explícitos (§2).
- Unidades: basis points inteiros com faixa exata e Q16.16 onde frações forem necessárias (§3).
- Log: registo completo `94 + 32n` bytes, com `n` efeitos e `n ≤ 8` (§4).
- Projeção: índice compacto de 104 bytes que referencia o registo completo por offset, comprimento e
  BLAKE3-256; não é um formato de replay nem uma cópia lossy (§4.8).

### 1.5 Convenções normativas

- `MUST`, `MUST NOT`, `SHOULD` e `MAY` têm o sentido de requisito de contrato usado neste documento.
- Offsets são zero-based, em bytes, a partir do início do registo ou da secção indicada.
- Todos os inteiros multi-byte no wire são **big-endian**; inteiros negativos usam complemento de dois.
- `v1` significa a versão 1 deste contrato e do formato; nenhum campo reservado pode ser usado sem
  nova versão.
- Tipos em code spans são propostas de domínio, não código existente. Nomes de erros são propostas
  de variantes tipadas.
- Os vetores da §7 foram escritos à mão e conferidos por aritmética; nenhum teste de aplicação foi
  executado e nenhum valor de hash é afirmado.

## 2. Identidade geracional

### 2.1 Largura escolhida

A identidade é um `EntityId(u64)` embalado em três campos:

| Bits | Campo | Largura | Semântica |
| --- | --- | --- | --- |
| 63..48 | `kind` | 16 | Tipo de entidade; `0` reservado, `1..5` definidos em v1. |
| 47..16 | `index` | 32 | Índice do slot no allocator regional; `0` reservado. |
| 15..0 | `generation` | 16 | Geração do slot; `0` reservado, incrementa na reciclagem. |

Um `u32` isolado não serve: não cabem nele o índice, a geração e a tag de tipo sem reduzir a
geração a poucos bits ou manter uma tabela lateral obrigatória. Uma tabela lateral reintroduz
ambiguidade entre localidades e não permite detetar um ID obsoleto apenas pelos bytes. O `u64`
escolhido mantém a identidade autossuficiente no wire e no save.

A largura do índice é justificada pela escala regional de D-07. O orçamento de referência é de
1.024 localidades com até 2.097.152 entidades por localidade — `2^31` identidades por tipo —, metade
do espaço utilizável de `2^32 - 1` índices. O allocator é **único por região e por tipo**, não por
localidade: uma entidade que se move entre localidades conserva o mesmo ID. Se cada localidade
tivesse o seu próprio contador, duas localidades poderiam emitir o mesmo `(kind, index, generation)`
e a colisão seria silenciosa; o allocator regional elimina essa possibilidade.

A geração de 16 bits permite 65.535 reciclagens por slot. Ao esgotar, o slot é aposentado, nunca
reutilizado com geração `0`; isso evita o clássico ABA, em que um ID antigo passaria a apontar para
uma entidade nova. A tag de 16 bits cobre os cinco tipos de v1 e deixa espaço reservado para tipos
futuros; valores não atribuídos são rejeitados em v1.

### 2.2 Empacotamento e exemplos

```text
EntityId = (kind << 48) | (index << 16) | generation
KIND_MASK       = 0xFFFF_0000_0000_0000
INDEX_MASK      = 0x0000_FFFF_FFFF_0000
GENERATION_MASK = 0x0000_0000_0000_FFFF
```

| ID | `kind` | `index` | `generation` | Valor hexadecimal | Bytes big-endian |
| --- | --- | --- | --- | --- | --- |
| Primeiro `ActorId` vivo | `ACTOR` = 1 | 1 | 1 | `0x0001_0000_0001_0001` | `00 01 00 00 00 01 00 01` |
| `LocationId` de exemplo | `LOCATION` = 3 | `0x0000_1234` | 2 | `0x0003_0000_1234_0002` | `00 03 00 00 12 34 00 02` |
| `ItemId` de exemplo | `ITEM` = 2 | `0x0000_002A` | 1 | `0x0002_0000_002A_0001` | `00 02 00 00 00 2A 00 01` |
| `RumorId` de exemplo | `RUMOR` = 5 | 7 | 1 | `0x0005_0000_0007_0001` | `00 05 00 00 00 07 00 01` |

O primeiro `ActorId` vivo é `1 << 48` + `1 << 16` + `1`. O `LocationId` mostra que a localidade não
é um índice de tile: ela tem identidade própria, e as coordenadas ficam em campos separados (§3.2).

### 2.3 Valores reservados e sentinelas

| Valor | Nome | Uso permitido |
| --- | --- | --- |
| `0x0000_0000_0000_0000` | `EntityId::NONE` | Apenas referência opcional ausente; proibido em campo obrigatório. |
| `0xFFFF_FFFF_FFFF_FFFF` | `EntityId::INVALID` | Nunca; rejeitado na descodificação e na construção. |
| `kind = 0` | sem tipo | Nunca; rejeitado. |
| `index = 0` | sem slot | Nunca; rejeitado. |
| `generation = 0` | não nascido | Nunca; rejeitado. |
| `kind = 6..65535` | reservado | Rejeitado em v1; exige versão/contrato novo. |

Um campo opcional usa `NONE` apenas se o seu tipo de domínio for `Option<EntityId>` e o formato
declarar essa opcionalidade. Um campo obrigatório com `NONE` é `InvalidEntityId`, não "ausente".
Nenhum outro valor é sentinela: `index = 0xFFFF_FFFF` ou `generation = 0xFFFF` só são válidos se o
slot estiver realmente ocupado nessa geração; não significam "fim" ou "todos".

### 2.4 Alocação, reciclagem e overflow

1. Cada região tem um allocator por `EntityKind`, com uma tabela de slots indexada por `u32`.
2. A alocação escolhe o **menor índice livre e não aposentado**. A escolha é determinística e não
   consome RNG.
3. Um slot novo começa em `generation = 1`; a entidade viva usa essa geração.
4. Ao destruir/remover uma entidade, o slot fica livre e a geração incrementa. O ID antigo passa a
   divergir da geração atual e é `StaleEntityId`.
5. Se a geração a incrementar seria `0x1_0000`, o slot é **aposentado**: não volta à lista de livres.
6. Se não houver slot livre nem aposentável disponível, a alocação devolve `IdSpaceExhausted`; nunca
   faz wrap para `0`.
7. A alocação é transacional com a operação que a pediu: se forem necessários `k` IDs e não for
   possível obter todos, nenhum é consumido e o estado não muda.
8. O estado do allocator (ocupação e geração por slot) é autoritativo e entra na canonicalização
   pela secção de atores/itens do dono competente; não é reconstruído por conveniência.

A política de "menor índice livre" é deliberadamente simples. Um free list arbitrário, um
`HashMap` ou um índice escolhido por hash tornaria a alocação dependente de ordem de iteração e
quebraria o replay.

### 2.5 Deteção de ID obsoleto

A consulta de um `EntityId` segue esta ordem, sem reparar o valor armazenado:

1. Rejeitar `NONE`, `INVALID`, `kind = 0`, `index = 0` ou `generation = 0` com `InvalidEntityId`.
2. Se o `kind` não corresponder ao newtype esperado (`ActorId`, `ItemId`, `LocationId`,
   `StructureId` ou `RumorId`), devolver `WrongEntityKind`.
3. Consultar o slot `(kind, index)`. Se estiver livre ou a geração atual for diferente da geração
   do ID, devolver `StaleEntityId` com o ID armazenado e a geração atual.
4. Só então devolver a entidade viva.

| Situação | Resultado | O que nunca acontece |
| --- | --- | --- |
| ID de ator morto, slot ainda livre | `StaleEntityId` | Resolver para o próximo ator. |
| ID antigo após reutilização do slot | `StaleEntityId` | Comparar apenas `index`. |
| `ItemId` passado onde se espera `ActorId` | `WrongEntityKind` | Conversão implícita por cast. |
| `NONE` num campo obrigatório | `InvalidEntityId` | Tratar como `Option::None`. |
| `INVALID` ou `kind` reservado | `InvalidEntityId` | Ignorar o registo e continuar. |

Um ID histórico nunca é reescrito para a entidade atual. Se uma apresentação precisa de mostrar
"antigo ocupante", resolve o ID histórico como registo histórico, não como apontador vivo. Essa
regra é o que impede que uma transferência ou um fato de conversa mude de dono quando um slot é
reciclado.

### 2.6 Regras por tipo de entidade

| Entidade | `kind` | Estabilidade | Reciclagem e histórico |
| --- | --- | --- | --- |
| Ator | `ACTOR` = 1 | Conserva o ID ao mover-se entre localidades, células e agendas. | Morte/remoção incrementa a geração; fatos antigos mantêm o ID antigo e ficam `StaleEntityId`. |
| Item | `ITEM` = 2 | Conserva o ID em todas as transferências, mudanças de contentor e localizações. | Consumo/destruição recicla com nova geração; dividir uma pilha cria um `ItemId` novo, sem duplicar o antigo. |
| Localidade | `LOCATION` = 3 | Identidade própria, estável entre sessões; pode ocupar várias células. | Destruir/regenerar cria novo ID; nunca se reutiliza o ID de uma localidade com outra geografia. |
| Estrutura | `STRUCTURE` = 4 | Agregado com identidade própria (casa, árvore, caverna), distinto de um cubo de célula. | Destruição/reciclagem incrementa a geração; fatos históricos não passam a apontar para a estrutura nova. |
| Rumor | `RUMOR` = 5 | Conserva o ID enquanto a origem e o conteúdo lógico existirem no estado. | Extinção remove o rumor do estado; referências históricas continuam a resolver o ID antigo ou ficam stale. |

O item não muda de ID quando muda de mão: "quem o possui" é um fato de estado, não parte da
identidade. A localidade não muda de ID quando o jogador muda a câmera: foco é apresentação. A
estrutura não é reduzida a um único cubo: a grade de blocos é outra camada de dados (§5).

### 2.7 Região, localidades e colisão

- `RegionId(u64)` é não nulo, gerado deterministicamente a partir da seed e da versão do gerador;
  não é um `EntityId` e não partilha o espaço de IDs de entidades.
- IDs de entidades são únicos **dentro de uma região**. Duas regiões podem ter o mesmo valor
  numérico; comparar IDs de regiões diferentes sem remapeamento é erro de contrato.
- O `EntityId` **não carrega** `RegionId`: a região vem do envelope do estado/log. Um valor
  numericamente igual noutra região não é detetável pelos bits do ID e nunca deve ser comparado sem
  o `RegionId` de origem; a fronteira de importação/merge é quem rejeita a mistura.
- Importar/mergear regiões exige uma tabela de remapeamento explícita e novos IDs no destino; nunca
  se assume que "mesmo número = mesma entidade".
- A região inclui todas as localidades no estado e no hash, mesmo as que não estão em foco (D-07).
- O allocator regional rejeita `DuplicateEntityId` se o gerador tentar emitir um par
  `(kind, index, generation)` já ocupado.

### 2.8 Invariantes de identidade

1. Todo ID vivo tem `kind`, `index` e `generation` não nulos.
2. `kind` e `generation` nunca são inferidos de `index` ou de estado atual.
3. Um ID histórico é imutável; a consulta pode falhar, mas não pode "corrigir" o ID.
4. O allocator não faz wrap e não usa RNG, hash de nome ou ordem de `HashMap`.
5. A mesma sequência de criação/destruição produz os mesmos IDs na mesma versão de contrato.
6. O hash regional inclui IDs de todas as localidades, não apenas a que está em foco.

## 3. Unidades e ponto fixo

### 3.1 Tick e duração

- `Tick(u64)` é a única noção de tempo do núcleo. `0` é o estado inicial; ticks avançam apenas por
  ações do mundo, conforme D-02. O contrato não define custos.
- `Tick` é monotônico não decrescente no log. Soma com `checked_add`; overflow devolve
  `TickOverflow`, sem wrap e sem alterar estado, eventos ou RNG.
- `DurationTicks(u32)` representa durações de status/agenda; `0` é inválido quando o campo exige
  duração positiva. O `amount` de um efeito é `i32`, pelo que uma duração codificada em v1 é
  `1..=2^31-1`; um valor maior exige outro contrato/versão, não truncamento.
- Relógio de parede, `Instant`, FPS, latência e tempo de inferência **não** são ticks e não entram
  no estado autoritativo, no log de fatos ou no hash.

### 3.2 Coordenadas

- `GridPoint { x: i32, y: i32, z: i16 }` identifica uma célula da grade inteira; a unidade é um
  bloco/célula, nunca uma distância contínua.
- `z` é o nível; não há `f32`, `f64` nem alturas flutuantes. `x`, `y` e `z` são exatos.
- `GridBounds { min: GridPoint, max: GridPoint }` é inclusivo; `contains` exige
  `min.x <= max.x`, `min.y <= max.y` e `min.z <= max.z`.
- Construir um `GridPoint` fora dos limites da região é `CoordinateOutOfBounds`; não há clamp
  silencioso para a borda.
- `LocationId` e `GridPoint` são conceitos distintos: a localidade é uma identidade nomeada que
  pode abranger muitas células; a coordenada é uma posição. Não se embala um tile num `u32` e não se
  usa a coordenada como identidade.
- `ConversationFact` guarda a localidade e a célula exata do fato; uma visita ou render posterior
  não reescreve esses campos.

### 3.3 Quantidades, HP e efeitos

| Tipo | Representação | Faixa e semântica |
| --- | --- | --- |
| `Quantity(u32)` | Inteiro sem sinal | `1..=2_147_483_647` em efeitos de transferência; `0` é inválido; o limite superior cabe no `amount i32` do wire. |
| `Hp(i32)` | Inteiro com sinal | HP atual/máximo; máximo `> 0`; atual em `[0, max]`. O estado não usa porcentagem. |
| `HpDelta(i32)` | Inteiro com sinal | `!= 0`; a aplicação que exceda o intervalo válido rejeita ou satura apenas com política autorizada (§3.6). |
| `OutcomeBp(u16)` | Basis points | `0..=10_000`; `10_000` = 100%. |
| `ValenceBp(i16)` | Basis points | `-10_000..=10_000`; sinal preservado. |
| `BasisPoints(i16)` | Basis points | `-10_000..=10_000`; passo exato de 1 bp. |
| `UnitBp(u16)` | Basis points absolutos | `0..=10_000`; usado em fidelidade, relações e limiares. |
| `Q16_16(i32)` | Ponto fixo 16.16 | `raw / 65_536`; passo `1/65_536`; usado em atributos/traços, não em deltas de relação. |

Adições e subtrações de quantidades, HP e ticks usam aritmética verificada. Overflow, underflow ou
resultado fora da faixa devolvem erro tipado e rejeitam a operação inteira; não há `wrapping_*`,
`saturating_*` silencioso nem conversão por `as` que trunque.

### 3.4 Basis points e Q16.16

- Relações sociais (confiança, medo, empatia, dependência, hostilidade) usam **basis points
  inteiros**: `10_000` bp = 100%; `1` bp = 0,01%. O estado guarda o valor absoluto em `UnitBp` e os
  fatos guardam o delta exato em `BasisPoints`.
- `Q16.16` é o ponto fixo autoritativo para valores fracionários de atributos, traços e cálculos
  internos que precisem de mais de 1 bp de resolução. O valor é sempre o `i32` cru; não há `f32`.
- A conversão entre Q16.16 e basis points é explícita e **arredonda com metade para longe de zero**;
  nunca é usada para reescrever um delta que já está em bp. Um delta de 1 bp permanece `1` no log e
  não passa por Q16.16.
- Probabilidades vindas de modelo são normalizadas na fronteira com aritmética inteira e regra de
  arredondamento declarada; `NaN`, `Inf` e `-0.0` não existem no estado autoritativo.

A escolha de dois sistemas tem uma razão: basis points são exatos para o domínio social e para o
wire; Q16.16 é necessário para curvas e traços, mas converter 1 bp para Q16.16 produz
`6,5536` unidades cruas e não é representável sem arredondamento. Guardar o delta social em Q16.16
introduziria exatamente a perda que o L-01 denuncia.

### 3.5 Por que `i8` percentual não preserva 1 bp

Um `i8` tem 256 valores. Se a unidade for "ponto percentual", o passo é 100 bp: os valores
`-100..=100` representam apenas múltiplos de 100 bp e **1 bp não existe**. Se a unidade for basis
point, a faixa `-128..=127` não cobre `-10_000..=10_000` (20.001 valores). Em qualquer das duas
leituras, 20.001 valores não cabem em 256; a perda é aritmética, não uma questão de arredondamento
aceitável.

O `i16` cobre `-32_768..=32_767`, portanto contém os 20.001 valores de `-10_000..=10_000` com passo
de 1 bp. O wire usa `i32` no `amount` do efeito para uniformizar todos os tipos de efeito; a
validação de relação restringe o valor a `[-10_000, +10_000]` antes de codificar. O `i32` não
autoriza deltas fora dessa faixa.

### 3.6 Deltas de relação: faixa, clamp autorizado e rejeição

Seja `old` o valor atual da relação em `UnitBp` (`0..=10_000`) e `delta` o `BasisPoints` do efeito.
A aplicação calcula `raw = old as i32 + delta as i32` e decide:

| Condição | Resultado |
| --- | --- |
| `raw` em `[0, 10_000]` | Novo valor `raw`; efeito exato, sem flag de saturação. |
| `raw` fora de `[0, 10_000]` e política do efeito é `AuthorizedSaturation` | Novo valor é o limite (`0` ou `10_000`); o efeito efetivo é `novo - old`; se for `0`, o efeito é omitido; se for diferente de `0`, é emitido com `AUTHORIZED_SATURATION` e o valor efetivo. |
| `raw` fora de `[0, 10_000]` e política é `Reject` | `ClampNotAuthorized`/`DeltaOutOfRange`; rejeita o fato inteiro, sem efeito parcial, sem append e sem mudança de estado. |

Regras adicionais:

- Um `delta` fora de `[-10_000, +10_000]` é `DeltaOutOfRange` antes de qualquer aplicação.
- Um `delta = 0` é `ZeroDelta`; não se emite efeito vazio. Se a saturação produzir delta efetivo
  zero, o efeito é omitido e o fato não regista uma mudança que não existiu.
- `AuthorizedSaturation` é uma política declarada pelo schema/regra que produziu o efeito; não é
  inferida pelo código, não é o comportamento por omissão e não pode ser aplicada retroativamente.
- O log guarda o **delta efetivo**, não o delta proposto. O delta proposto, quando relevante, fica
  no log de propostas de `CTR-04`; o fato de conversa não é o lugar para reconstruir a proposta.
- O flag `AUTHORIZED_SATURATION` no efeito é a única prova de que houve saturação; sem ele, o
  delta do log é exato e não admite segundo clamp no replay.

O mesmo princípio se aplica a `HpDelta`: ou a regra declara saturação autorizada e o log guarda o
efeito efetivo com flag, ou o efeito é rejeitado. Não existe "clamp para não falhar".

### 3.7 Proibições no estado autoritativo

- Sem `f32`/`f64`, `NaN` ou `Inf` em estado, eventos, hash ou decisões.
- Sem `Instant`, `SystemTime`, relógio de parede, FPS ou latência em decisões.
- Sem `HashMap`/`HashSet` como coleção autoritativa ou ordem de iteração.
- Sem `usize`, endereços, ponteiros, `#[repr(packed)]` ou layout de compilador no wire.
- Sem `String`/`&str` de conversa no tick; a NLG é lazy e fora do estado (§4.6).
- Sem custos de ação inventados; este contrato não fixa números de custo.

## 4. Layout de evento versionado

### 4.1 Cabeçalho comum

Todo registo começa por um cabeçalho de 16 bytes. O mesmo formato serve ao registo completo e à
projeção; o campo `kind` distingue-os.

| Offset | Campo | Tipo | v1 | Semântica |
| --- | --- | --- | --- | --- |
| 0 | `magic` | 4 bytes | `AFEV` | `41 46 45 56`; identifica o formato de evento. |
| 4 | `version` | `u8` | `1` | Versão do layout; `0` e `> 1` rejeitados. |
| 5 | `kind` | `u8` | `1` ou `2` | `1` = fato completo; `2` = projeção; `0` e `3..255` rejeitados. |
| 6 | `flags` | `u16` | `0` | Reservado; qualquer bit não nulo é rejeitado em v1. |
| 8 | `body_len` | `u32` | ver §4.4/§4.8 | Comprimento do corpo após o cabeçalho. |
| 12 | `reserved` | `u32` | `0` | MUST ser zero; não nulo é rejeitado. |

O cabeçalho não tem `kind` de entidade nem `region_id`: o log pertence a uma região e o envelope
durável dessa região é responsabilidade de `STORE-01`/`CTR-02`. O `kind` do cabeçalho é o tipo de
registo, não o tipo de entidade.

### 4.2 Ordem canônica, endianness e alinhamento

- A ordem dos campos é a ordem da tabela: cabeçalho, núcleo, efeitos na ordem do array. Não há
  reordenação, campos omissos ou extensões no fim em v1.
- Todos os inteiros multi-byte são big-endian. `u64` `1000` é `00 00 00 00 00 00 03 E8`; `i32` `-1`
  é `FF FF FF FF`; `i16` `-12` é `FF F4`.
- O formato é **byte-packed**: não há padding de alinhamento, nem antes nem depois de campos ou
  efeitos. O offset dos efeitos começa em 94 e não é múltiplo de 4; isso é intencional e não requer
  alinhamento porque a leitura é feita byte a byte, nunca por cast de memória.
- `body_len` conta apenas o corpo; o total é `16 + body_len`. Um `body_len` que não corresponda
  exatamente à soma derivada é `LengthMismatch`.
- Não se usa `#[repr(C)]`, `#[repr(packed)]`, `transmute`, `bytemuck` ou `unsafe` para ler o wire. A
  codificação/descodificação é explícita campo a campo.
- A mesma sequência de bytes é produzida em Windows, Linux, macOS e arquiteturas diferentes; não há
  dependência de `to_ne_bytes`, `usize` ou ordem de campos do compilador.

### 4.3 Versão, flags e reservas

- `version = 1` é a única aceite. Um leitor v1 que encontre `version = 2` devolve
  `UnsupportedVersion` e não tenta interpretar os bytes como v1.
- `flags = 0` em v1 para os dois `kind`. Bits futuros exigem nova versão; não há negociação de
  funcionalidades por flags nesta versão.
- `reserved` do cabeçalho e todos os campos reservados do corpo/efeitos MUST ser zero. Um leitor v1
  rejeita qualquer valor não nulo com `NonZeroReserved`; não ignora "por compatibilidade".
- Um `kind` desconhecido é `UnknownEventKind`; não é ignorado, não é tratado como evento genérico.
- Adicionar um novo `kind`, um novo `effect_kind`, um novo seletor ou um novo campo exige uma nova
  versão do contrato e um decoder que a aceite. O decoder novo pode continuar a ler v1; o decoder v1
  não é obrigado a ler v2 e MUST falhar de forma explícita.
- Não há migração implícita no decoder. Migrar v1 para v2 é re-codificar os fatos com validação e
  comparar o golden; nunca reinterpretar os mesmos bytes.

### 4.4 Registo completo `CONVERSATION_FACT`

O corpo do registo completo tem uma parte fixa de 78 bytes e `n` efeitos de 32 bytes cada:

```text
body_len = 78 + 32 * n
total    = 16 + body_len = 94 + 32 * n
0 <= n <= 8
```

| Offset | Campo | Tipo | Bytes | Semântica |
| --- | --- | --- | --- | --- |
| 16 | `fact_seq` | `u64` | 8 | Identidade do fato no log regional; `>= 1`. |
| 24 | `tick` | `u64` | 8 | Tick do fato; não decrescente no log. |
| 32 | `speaker` | `u64` (`ActorId`) | 8 | Ator que fala/age; `kind = ACTOR`. |
| 40 | `listener` | `u64` (`ActorId`) | 8 | Ator que ouve/recebe; `kind = ACTOR`. |
| 48 | `location` | `u64` (`LocationId`) | 8 | Localidade histórica do fato; `kind = LOCATION`. |
| 56 | `cell_x` | `i32` | 4 | Coordenada x da célula do fato. |
| 60 | `cell_y` | `i32` | 4 | Coordenada y da célula do fato. |
| 64 | `cell_z` | `i16` | 2 | Nível z da célula do fato. |
| 66 | `intent` | `u16` | 2 | Intenção simbólica; `1..7`, `0` e reservados rejeitados. |
| 68 | `outcome_bp` | `u16` | 2 | Grau de sucesso em bp; `0..=10_000`. |
| 70 | `valence_bp` | `i16` | 2 | Valência em bp; `-10_000..=10_000`. |
| 72 | `fact_flags` | `u16` | 2 | `DIRECT`/`RETOLD`; outros bits reservados. |
| 74 | `effects_count` | `u8` | 1 | `n`; `0..=8` em v1. |
| 75 | `labels_count` | `u8` | 1 | Número de efeitos `ATTACH_LABEL`; `0..=3`; deve coincidir com a contagem. |
| 76 | `reserved` | `u16` | 2 | MUST ser zero. |
| 78 | `source_fact_seq` | `u64` | 8 | Fato antecedente imediato; `0` se o fato é de primeira mão. |
| 86 | `origin_tick` | `u64` | 8 | Tick do primeiro fato da cadeia; igual a `tick` se `source_fact_seq = 0`. |
| **Soma fixa** | | | **78** | Próximo offset: 94. |

O campo `labels_count` é redundante em relação ao array de efeitos, mas é obrigatório para que um
leitor possa aplicar o limite de 3 labels e para que a projeção valide o índice sem percorrer todos
os efeitos. O decoder verifica a igualdade; não confia no campo.

Tamanhos por número de efeitos:

| `n` | `body_len` | Total do registo |
| --- | --- | --- |
| 0 | 78 | 94 |
| 1 | 110 | 126 |
| 2 | 142 | 158 |
| 3 | 174 | 190 |
| 4 | 206 | 222 |
| 5 | 238 | 254 |
| 6 | 270 | 286 |
| 7 | 302 | 318 |
| 8 | 334 | 350 |

### 4.5 Efeitos tipados

Cada efeito ocupa 32 bytes. O `kind` é a tag explícita; não se depende do layout de um `enum` Rust.
Os campos não usados por um `kind` MUST ser zero; um valor não nulo é `NonZeroUnusedField`.

| Offset no efeito | Campo | Tipo | Bytes | Semântica |
| --- | --- | --- | --- | --- |
| +0 | `kind` | `u8` | 1 | `1..6` em v1; `0` e `7..255` rejeitados. |
| +1 | `selector` | `u8` | 1 | Eixo, label ou status; `0` quando não usado. |
| +2 | `flags` | `u16` | 2 | Bit 0 = `AUTHORIZED_SATURATION`; restantes MUST zero. |
| +4 | `subject` | `u64` | 8 | Item/rumor alvo quando aplicável; `0` caso contrário. |
| +12 | `source` | `u64` | 8 | Ator de origem quando aplicável; `0` caso contrário. |
| +20 | `target` | `u64` | 8 | Ator alvo quando aplicável; `0` caso contrário. |
| +28 | `amount` | `i32` | 4 | Delta bp, HP, quantidade ou duração; interpretação por `kind`. |
| **Soma** | | | **32** | O efeito `i` começa em `94 + 32*i`. |

Tipos de efeito:

| `kind` | Nome | `selector` | `subject` | `source` | `target` | `amount` |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `TRANSFER_ITEM` | 0 | `ItemId` | `HolderRef` de origem | `HolderRef` de destino | `Quantity` `1..=2^31-1`; `source != target`. |
| 2 | `DELTA_RELATIONSHIP` | eixo 1..5 | 0 | 0 | `ActorId` | `BasisPoints` `-10_000..=10_000`, `!= 0`; flag de saturação permitida. |
| 3 | `ATTACH_LABEL` | label 1..5 | 0 | 0 | `ActorId` | 0; máximo 3 labels distintos por fato. |
| 4 | `APPLY_STATUS` | status 1..32 | 0 | 0 | `ActorId` | `DurationTicks` `1..=2^31-1`. |
| 5 | `PROPAGATE_RUMOR` | 0 | `RumorId` | `ActorId` | `ActorId` | `UnitBp` `1..=10_000`; `source != target`. |
| 6 | `DELTA_HP` | 0 | 0 | 0 | `ActorId` | `HpDelta` `!= 0`; flag de saturação permitida. |

`TRANSFER_ITEM` usa `HolderRef`: um `EntityId` de kind `ACTOR`, `LOCATION` ou `STRUCTURE`. O kind do
ID valida a origem/destino; um item pode ser transferido entre atores ou entre um ator e uma
localidade/estrutura, e a localidade histórica do fato continua no campo `location` do registo. Um
`HolderRef` com outro kind é `InvalidHolderKind`. Itens não são contentores de outros itens em v1;
essa extensão exigiria contrato/versão novos.

Eixos de relação (`selector` do `kind` 2):

| Código | Eixo |
| --- | --- |
| 1 | `TRUST` (confiança) |
| 2 | `FEAR` (medo) |
| 3 | `EMPATHY` (empatia) |
| 4 | `DEPENDENCE` (dependência) |
| 5 | `HOSTILITY` (hostilidade) |

Labels (`selector` do `kind` 3): `1` = `FRIENDSHIP`, `2` = `MARRIAGE`, `3` = `ENMITY`,
`4` = `FAMILY`, `5` = `ALLIANCE`. Um label é um fato anexado; a remoção de label não é representada
em v1 e exige contrato/versão novos.

Status (`selector` do `kind` 4): código `1..32` do catálogo congelado no schema de regras. Este
contrato fixa o limite e a representação; o catálogo semântico pertence a `CTR-04`. Código `0`,
`> 32` ou não presente no schema é rejeitado.

Limites e rejeições dos efeitos:

- `n > 8` é `EffectCountExceeded`.
- `labels_count > 3` ou mais de 3 efeitos `ATTACH_LABEL` é `LabelCountExceeded`.
- Dois `ATTACH_LABEL` com o mesmo `selector` no mesmo fato é `DuplicateLabel`.
- `TRANSFER_ITEM` com quantidade zero é `TransferQuantityZero`; overflow de quantidade é
  `QuantityOverflow`; `source == target` é `SourceEqualsTarget`.
- `DELTA_RELATIONSHIP` com `amount = 0` é `ZeroDelta`; fora da faixa é `DeltaOutOfRange`; eixo
  desconhecido é `UnknownSelector`.
- `AUTHORIZED_SATURATION` em `kind` diferente de 2 ou 6 é `NonZeroFlags`.
- `subject`/`source`/`target` não usados e não nulos são `NonZeroUnusedField`; isso impede esconder
  dados em campos "livres".
- Um efeito inválido rejeita o fato inteiro; não há aplicação dos efeitos anteriores.

### 4.6 `ConversationFact` e proveniência

O tipo de domínio correspondente é `ConversationFact`; os campos do wire são a sua forma canônica.
Não há `String`, `Vec<String>`, `HashMap` ou texto de conversa no fato.

| Campo de domínio | Tipo | Regra |
| --- | --- | --- |
| `fact_seq` | `u64` | `>= 1`; contínuo por `+1` no log; nunca reutilizado. |
| `tick` | `Tick` | Não decrescente; âncora temporal do fato. |
| `speaker` | `ActorId` | Ator que fala/age; não pode ser `NONE`. |
| `listener` | `ActorId` | Ator que ouve/recebe; não pode ser `NONE`. |
| `location` | `LocationId` | Localidade **histórica** do fato; não é a localização atual do ator. |
| `cell` | `GridPoint` | Célula exata do fato; não é recalculada por visita/render. |
| `intent` | `Intent` | Enum `1..7`; ver tabela abaixo. |
| `outcome_bp` | `OutcomeBp` | `0..=10_000`. |
| `valence_bp` | `ValenceBp` | `-10_000..=10_000`. |
| `fact_flags` | `FactFlags` | Bits `DIRECT` e `RETOLD`; restantes zero. |
| `effects` | `Vec<ConversationEffect>` | Ordem semântica; `0..=8` elementos; aplicada nessa ordem. |
| `labels_count` | `u8` | Derivado; `0..=3`; deve coincidir. |
| `source_fact_seq` | `u64` | `0` ou um `fact_seq` anterior; proveniência imediata. |
| `origin_tick` | `Tick` | Tick do primeiro fato da cadeia; `== tick` se `source_fact_seq = 0`. |

Intenções de v1:

| Código | Intenção |
| --- | --- |
| 1 | `GREETING` |
| 2 | `NEGOTIATE` |
| 3 | `EXTORTION` |
| 4 | `LIE` |
| 5 | `BRIBE` |
| 6 | `SHARE_RUMOR` |
| 7 | `APPEASE` |

`FactFlags`:

| Bit | Nome | Semântica |
| --- | --- | --- |
| 0 | `DIRECT` | O fato ocorreu na localidade/célula registada, com speaker e listener presentes. |
| 1 | `RETOLD` | O fato é uma recontagem; `source_fact_seq != 0`. |
| 2..15 | reservado | MUST ser zero. |

Combinações válidas: `DIRECT=1, RETOLD=0` (primeira mão); `DIRECT=0, RETOLD=1` (recontagem em que
a presença não é afirmada); `DIRECT=1, RETOLD=1` (recontagem feita numa interação direta). A
combinação `DIRECT=0, RETOLD=0` é `InvalidFactFlags`: todo fato é de primeira mão ou recontado.

Proveniência e âncoras:

- `source_fact_seq = 0` significa fato de primeira mão; `origin_tick` MUST ser igual a `tick`.
- `source_fact_seq != 0` MUST ser menor que `fact_seq`, apontar para um fato existente no mesmo log
  e ter `origin_tick` igual ao `origin_tick` desse antecedente. A cadeia é acíclica por construção
  (`seq` estritamente crescente).
- A raiz da cadeia é o fato com `source_fact_seq = 0`; o seu `tick` é o `origin_tick` de todos os
  descendentes. Assim, uma recontagem preserva a âncora do tick original e a identidade de quem
  falou/ouviu em cada elo, sem reconstruir o passado a partir do estado atual.
- `speaker`, `listener`, `location` e `cell` de uma recontagem são os do **elo atual** (quem conta,
  quem ouve, onde), não os do fato original; o elo original permanece no log e é alcançável pela
  cadeia. Nenhum campo histórico é sobrescrito.
- `fact_seq` é a identidade do fato no log; não é um ID de entidade e não usa o packing da §2.

### 4.7 `encode_events` e `decode_events`

Assinaturas propostas:

```rust
encode_events(facts: &[ConversationFact], codec: &EventCodec) -> Result<CanonicalBytes, CodecError>
decode_events(bytes: &CanonicalBytes, codec: &EventCodec) -> Result<Vec<ConversationFact>, CodecError>
decode_log(bytes: &CanonicalBytes, codec: &EventCodec) -> Result<Vec<ConversationFact>, CodecError>
decode_projection(bytes: &CanonicalBytes) -> Result<ProjectionRef, CodecError>
```

`ProjectionRef` contém os campos da §4.8 e não contém deltas nem efeitos: é uma referência tipada ao
registo completo, não um `ConversationFact`.

`EventCodec` carrega `version` (`u8`, v1 = 1), `max_effects` (`u8`, v1 = 8) e `max_labels`
(`u8`, v1 = 3). Um codec v1 com limites diferentes de 8/3 é inválido. Não carrega limites de região,
custos, relógio ou configuração de apresentação.

Regras de `encode_events`:

1. Validar cada fato e cada efeito; qualquer falha rejeita o lote inteiro, sem bytes parciais.
2. Exigir `fact_seq` estritamente crescente e contíguo (`+1`) dentro do lote; o primeiro `fact_seq`
   do lote pode ser `> 1` quando o lote é uma continuação de um log existente.
3. Exigir `tick` não decrescente dentro do lote.
4. Codificar o cabeçalho, o núcleo e os efeitos na ordem do array, sem normalizar, arredondar,
   ordenar ou comprimir.
5. Devolver `CanonicalBytes` com a concatenação exata dos registos; um lote vazio devolve zero bytes
   e é válido como no-op.
6. Não validar a existência de `source_fact_seq` fora do lote; essa validação é feita pelo append no
   log com o índice de fatos anteriores. Um novo `ConversationFact` só é aceito no append depois
   dessa validação.

Regras de `decode_events`:

1. Ler registos até ao fim exato dos bytes; um cabeçalho incompleto, `body_len` inconsistente ou
   bytes sobrantes é `TruncatedRecord`/`LengthMismatch`/`TrailingBytes`.
2. Rejeitar `version`, `kind`, `flags`, `reserved`, `effects_count`, `labels_count`, tags,
   seletores, campos não usados não nulos e faixas inválidas, sem tentar reparar.
3. Preservar a ordem dos efeitos e todos os valores exatos; não há normalização de IDs, deltas ou
   coordenadas.
4. Um `kind = 2` (projeção) não é devolvido como `ConversationFact`; `decode_events` rejeita-o com
   `UnexpectedProjection` (a leitura de projeção tem função própria).
5. `decode_log` valida o log completo: primeiro `fact_seq = 1`, contiguidade, ticks não decrescentes
   e existência/coerência de `source_fact_seq`/`origin_tick`; devolve `FactGap`,
   `NonMonotonicFactSeq` ou `OriginMismatch` quando aplicável.

Ida e volta:

- `decode_events(encode_events(facts, codec), codec)` devolve fatos semanticamente iguais, incluindo
  ordem dos efeitos, flags de saturação e proveniência.
- `encode_events(decode_events(bytes, codec), codec)` devolve os mesmos bytes para bytes canónicos
  válidos; não há reescrita de campos reservados nem de paddings (não existem).
- Nenhuma compressão é aplicada por `encode_events`. Uma camada de armazenamento pode comprimir o
  log apenas se a descompressão for byte-exata e verificada; compressão lossy é proibida.

### 4.8 Projeção compacta `CONVERSATION_PROJECTION`

A projeção é um **índice derivado**, não um fato e não um formato de replay. Ela permite listar,
ordenar e localizar fatos sem duplicar deltas ou efeitos. O log completo continua a ser a única
autoridade.

| Offset | Campo | Tipo | Bytes | Semântica |
| --- | --- | --- | --- | --- |
| 16 | `fact_seq` | `u64` | 8 | Copiado exatamente do fato. |
| 24 | `tick` | `u64` | 8 | Copiado exatamente. |
| 32 | `speaker` | `u64` | 8 | Copiado exatamente; `ActorId` completo. |
| 40 | `listener` | `u64` | 8 | Copiado exatamente; `ActorId` completo. |
| 48 | `location` | `u64` | 8 | Copiado exatamente; `LocationId` histórico completo. |
| 56 | `log_offset` | `u64` | 8 | Offset absoluto do registo completo no log append-only. |
| 64 | `log_length` | `u32` | 4 | Comprimento do registo completo; MUST ser `94 + 32*n`. |
| 68 | `effects_count` | `u8` | 1 | `0..=8`; copiado do fato. |
| 69 | `labels_count` | `u8` | 1 | `0..=3`; copiado do fato. |
| 70 | `reserved` | `u16` | 2 | MUST ser zero. |
| 72 | `record_hash` | 32 bytes | 32 | BLAKE3-256 do registo completo (cabeçalho + corpo). |
| **Soma** | | | **88** | Total do registo: 104 bytes. |

Regras da projeção:

- O `body_len` do cabeçalho é exatamente 88; `kind = 2`; `version = 1`; `flags = 0`; `reserved = 0`.
- `record_hash` é BLAKE3-256 dos bytes exatos do registo completo referenciado, não do fato em
  domínio e não da projeção. Não há truncamento do hash.
- `log_length` é `94 + 32 * effects_count`; se não for, a projeção é inválida.
- `log_offset + log_length` MUST caber no log; offset e comprimento não podem sobrepor outro registo
  completo.
- A projeção é construída **depois** do append do registo completo, a partir do fato já validado.
  Se o append falhar, não há projeção.
- Ao ler, o consumidor abre o registo completo em `log_offset`, verifica `kind = 1`, `version = 1`,
  `body_len`, `effects_count`, `labels_count` e `record_hash`; só depois descodifica. Qualquer
  divergência é `ProjectionMismatch`/`DanglingProjection`, e o registo completo prevalece.
- A projeção pode ser apagada e reconstruída a partir do log a qualquer momento; reconstruir não
  altera fatos. Nunca se reconstrói o log a partir da projeção.
- `encode_events` MUST NOT aceitar projeções; `state_hash` MUST NOT incluir a projeção.

Prova de que a projeção não perde fatos:

| Fato a preservar | Onde está a verdade | Como a projeção prova que não perde |
| --- | --- | --- |
| Delta de 1 bp | `amount i32` do efeito completo | A projeção não tem campo de delta; não pode arredondar. A leitura segue offset/comprimento/hash e devolve o `i32` exato. |
| Até 8 transferências | 8 efeitos de 32 bytes | `effects_count = 8` e `log_length = 350` são obrigatórios; o hash cobre os 8 efeitos. Uma projeção com `effects_count = 8` que aponte para 126 bytes é rejeitada. |
| Identidade histórica | `speaker`/`listener`/`location` `u64` completos | A projeção copia os três campos sem truncar; não usa a localização atual nem o índice do slot. |
| Localidade após mudança | `location` do fato original | O campo é copiado; a projeção não consulta o estado atual, pelo que uma mudança de localidade não reescreve o índice. |
| Recontagem/origem | `source_fact_seq` e `origin_tick` no registo completo | A projeção referencia o registo; a cadeia e a âncora continuam no log e são validadas por `decode_log`. |
| Múltiplas localidades | `LocationId` `u64`, sem packing de tile | Não há bits de localidade no ID; duas localidades não colidem por construção do allocator regional. |

A projeção é "compacta" por ser um índice de 104 bytes, não por descartar campos. O registo completo
paga o custo de preservar os fatos; a projeção paga 104 bytes por fato para permitir leitura rápida.
Essa separação é a resposta do L-01 à tentação de voltar a um registo de 46 bytes que perde dados.

### 4.9 Comparação com o registo legado de 46 bytes

O exemplo legado soma 46 bytes. A aritmética dos campos está correta
(`8 + 4 + 4 + 4 + 2 + 1 + 1 + 4 + 2 + 4 + 4 + 4 + 4 = 46`), mas a declaração de "42 úteis + 6
reservados" não corresponde à tabela: os campos publicados somam 46, não 48. Corrigir 42 → 46 não
resolve o problema.

| Campo legado | Bytes | Por que não serve como autoridade |
| --- | --- | --- |
| `tick` | 8 | Correto, mas sem `fact_seq` não há identidade de fato nem deteção de lacuna. |
| `location` | 4 | Tile empacotado, sem geração; não distingue localidades históricas. |
| `speaker`/`listener` | 8 | `u32` sem geração; um slot reciclado faz o fato apontar para outra pessoa. |
| `intent`/`valence`/`outcome` | 4 | `intent` sem versão; `valence`/`outcome` em `i8`/`u8` percentuais; perde 1 bp e não cobre a faixa. |
| `delta_empathy`…`delta_hostility` | 4 | Quatro `i8`; 20.001 valores não cabem em 256. |
| `delta_hp` | 2 | Um único delta; não representa múltiplos efeitos. |
| `item` | 4 | Um único item; não representa transferências múltiplas nem origem/destino. |
| `labels` | 4 | Bitmask sem contagem de efeitos; não diz quantos labels foram anexados nem a ordem. |
| `statuses` | 4 | Bitmask fisiológico sem duração nem alvo tipado. |
| `rumor` | 4 | Um rumor sem fidelidade, origem ou portador. |
| Cabeçalho/versão | 0 | Não há `magic`, `version`, `kind`, `flags`, `body_len` nem reservas; truncamento/versão não são detetáveis. |
| Proveniência | 0 | Não há `source_fact_seq`/`origin_tick`; recontagem não é representável. |

Por isso o formato autoritativo é `94 + 32n` (até 350 bytes) e a projeção é um índice de 104 bytes.
O aumento é o custo explícito de preservar identidade, 1 bp e até oito efeitos; não é um orçamento
de "48 bytes" a cumprir.

### 4.10 Soma e offsets conferidos

- Cabeçalho: 4 + 1 + 1 + 2 + 4 + 4 = 16.
- Núcleo: 8 + 8 + 8 + 8 + 8 + 4 + 4 + 2 + 2 + 2 + 2 + 2 + 1 + 1 + 2 + 8 + 8 = 78.
- Efeito: 1 + 1 + 2 + 8 + 8 + 8 + 4 = 32.
- Total com `n` efeitos: 16 + 78 + 32n = 94 + 32n.
- `n = 8`: 94 + 256 = 350; `body_len = 334`.
- Projeção: 16 + 8 + 8 + 8 + 8 + 8 + 8 + 4 + 1 + 1 + 2 + 32 = 104; `body_len = 88`.

## 5. Canonicalização INT-01

### 5.1 API

```rust
canonical_state(state: &WorldState) -> Result<CanonicalBytes, DomainError>
state_hash(bytes: &CanonicalBytes) -> StateHash
```

`CanonicalBytes` é uma sequência opaca de bytes; `StateHash` é `[u8; 32]` produzido por BLAKE3-256.
`canonical_state` é puro: não lê ficheiros, ambiente, relógio, rede ou modelo. `state_hash` não
recanonicaliza nem valida semanticamente o estado; exige bytes produzidos por `canonical_state`.

### 5.2 Envelope canônico

| Offset | Campo | Tipo | v1 | Semântica |
| --- | --- | --- | --- | --- |
| 0 | `magic` | 4 bytes | `AFCS` | `41 46 43 53`. |
| 4 | `version` | `u8` | `1` | Versão do estado canônico. |
| 5 | `flags` | `u8` | `0` | Reservado; MUST zero. |
| 6 | `reserved` | `u16` | `0` | MUST zero. |
| 8 | `body_len` | `u32` | variável | Comprimento do corpo. |
| 12 | `reserved` | `u32` | `0` | MUST zero. |

Corpo:

```text
region_id u64
tick u64
section_count u16
section[section_count]
```

Cada secção é `tag u16`, `payload_len u32`, `payload[payload_len]`. Em v1, `section_count = 10` e as
tags aparecem exatamente uma vez, em ordem ascendente; uma secção ausente, duplicada ou fora de
ordem é `CanonicalOrderViolation`. Não há padding entre secções.

| Tag | Secção | Dono do payload | Fixado aqui |
| --- | --- | --- | --- |
| 1 | `REGION` | `CTR-03` | Limites e seed; `RegionId`/`tick` vêm do envelope. |
| 2 | `LOCALITIES` | `CTR-03` | IDs ordenados; ordem e primitivas. |
| 3 | `STRUCTURES` | `CTR-03` | IDs ordenados; ordem e primitivas. |
| 4 | `BLOCKS` | `CTR-03` | Ordem por localidade/z/y/x; primitivas. |
| 5 | `ACTORS` | `CTR-02` | IDs ordenados; ordem e primitivas. |
| 6 | `ITEMS` | `CTR-01` | Layout exato abaixo. |
| 7 | `RELATIONSHIPS` | `CTR-01` | Layout exato abaixo. |
| 8 | `RUMORS` | `CTR-03` | IDs ordenados; ordem e primitivas. |
| 9 | `AGENDA` | `CTR-02` | Ordem por `(due_tick, seq)`; primitivas. |
| 10 | `RNG` | `CTR-02` | Streams ordenadas por código; primitivas. |

Os payloads das secções cujo dono é outro contrato só podem ser preenchidos depois de esse contrato
estar congelado; este contrato fixa o envelope, as tags, a ordem, as primitivas e os payloads de
`ITEMS`/`RELATIONSHIPS`. Nenhum consumidor pode trocar a ordem ou inventar uma secção nova.

Payload de `ITEMS` (tag 6):

```text
count u32
repeat count:
  item_id u64
  holder_kind u8   (0 = nenhum, 1 = ator, 2 = localidade, 3 = estrutura)
  holder_id u64    (0 se holder_kind = 0; caso contrário, ID do tipo correspondente)
  quantity u32
```

`item_id` é único; a lista é ordenada por `item_id` ascendente. `quantity` é `1..=2^31-1`. Um
`holder_id` com `kind` errado ou `0` quando `holder_kind != 0` é `InvalidCanonicalItem`.

Payload de `RELATIONSHIPS` (tag 7):

```text
count u32
repeat count:
  source u64       (ActorId)
  target u64       (ActorId)
  axis u16         (1..5)
  value_bp u16     (0..=10_000)
```

A lista é ordenada por `(source, target, axis)` ascendente; o par `(source, target, axis)` é único.
Uma relação com `source == target` é `InvalidRelationship`; uma relação ausente não é preenchida com
zero "por conveniência" — o estado deve conter apenas relações existentes.

### 5.3 Primitivas de codificação

| Tipo lógico | Codificação canônica |
| --- | --- |
| `u8`/`u16`/`u32`/`u64` | Big-endian, largura fixa. |
| `i16`/`i32`/`i64` | Complemento de dois, big-endian, largura fixa. |
| `bool` | `u8` `0` ou `1`; outro valor é `InvalidBoolean`. |
| Enum | `u16` com código; `0` inválido salvo indicação; desconhecido rejeitado. |
| `Option<T>` | `u8` presença (`0`/`1`) seguido de `T` quando `1`; `0` não tem payload. |
| Sequência | `u32` contagem seguida dos elementos; limite máximo verificado. |
| Conjunto/mapa | Elementos ordenados pela chave codificada, sem repetição. |
| ID | `u64` da §2; sem compressão. |
| Texto | Nenhum `String`/UTF-8 no estado canônico v1; nomes de apresentação ficam fora do hash. |
| Ponto fixo | `Q16.16` como `i32` cru; bp como `i16`/`u16`. |
| `usize`/ponteiro | Proibidos; não entram no wire. |

### 5.4 Ordem canônica e coleções

1. Secções na ordem das tags 1..10; `section_count = 10`.
2. Localidades por `LocationId` ascendente; estruturas por `StructureId`; atores por `ActorId`;
   itens por `ItemId`; rumores por `RumorId`.
3. Blocos por `(LocationId, z, y, x)` ascendente; a chave é explícita, nunca a ordem de um `HashMap`.
4. Relações por `(source, target, axis)`; inventário por ordem semântica (a ordem de aquisição é
   preservada, não ordenada por ID); efeitos de um fato pela ordem do array.
5. Agenda por `(due_tick, sequence)`; RNG por código de stream; streams de domínio separadas.
6. Duplicar uma chave única é `DuplicateCanonicalKey`; não se escolhe a última ocorrência.
7. O canonicalizador pode ordenar uma cópia; não muta o estado de entrada.

### 5.5 Campos voláteis excluídos

| Excluído | Motivo |
| --- | --- |
| `Instant`, `SystemTime`, relógio de parede, FPS, latência | Não decidem o mundo; D-02. |
| Câmera, foco, zoom, viewport, seleção de UI, layout da TUI | Apresentação; D-04/D-07. |
| Texto NLG, prompt, cache de narrativa, locale/timezone | Leitura lazy; não é fato nem estado. |
| Métricas, tracing, logs, contadores de diagnóstico | Diagnóstico; não afeta decisões. |
| Ordem de `HashMap`/`HashSet`, endereços, `usize`, nomes de ficheiro | Não determinístico ou dependente do host. |
| Saúde/pid/porta de sidecar, estado de rede | Fora do núcleo; porta de adaptador. |
| Caminho/permissões do save | Armazenamento, não simulação. |

Incluídos no hash: `Tick`, seed, estado de RNG, agenda, IDs, posições, componentes que afetam
decisões, relações, itens, rumores, fatos e configuração congelada que altere a simulação. A
exclusão é por contrato explícito, não por "o campo não parece importante".

### 5.6 Idempotência, ida e volta e hash regional

- `canonical_state` é determinístico: o mesmo estado semântico produz os mesmos bytes,
  independentemente da ordem de inserção nas coleções.
- `decode_canonical(canonical_state(state))` devolve um estado equivalente; re-canonicalizar os
  mesmos dados produz os mesmos bytes.
- `state_hash` é BLAKE3-256 dos bytes exatos, incluindo `magic`, `version`, `body_len` e todo o
  corpo; não é hash de um `Debug`, de JSON ou de uma estrutura em memória.
- O hash é regional: inclui todas as localidades e entidades, mesmo fora do foco. Câmera, viewport e
  UI não são entradas; duas execuções com o mesmo estado e a mesma versão produzem o mesmo hash em
  Windows e Linux.
- Não há valores de hash neste documento. O golden será capturado por `CORE-01` depois do freeze dos
  contratos e guardado como vetor de teste; inventar um valor agora seria uma falsa medição.

### 5.7 Versão e evolução

- `version = 1` é a única aceite; `0` e `> 1` são `UnsupportedVersion`.
- Uma mudança de campo, ordem, tag, codificação ou semântica exige nova versão e migração explícita.
- O decoder novo pode ler v1; o decoder v1 não lê v2. Não há "campos opcionais" ou "ignorar o que não
  se conhece" em v1.
- A migração compara o golden e preserva IDs, fatos e âncoras; não reescreve o passado a partir do
  estado atual.

## 6. Erros e validações

### 6.1 Regra de atomicidade

Toda validação rejeita **sem efeito parcial**: nenhum fato é anexado, nenhum efeito é aplicado,
nenhum ID é consumido, nenhum byte é escrito e nenhum cursor de RNG avança. Um erro num único efeito
invalida o fato inteiro; um erro num único fato invalida o lote de `encode_events`. O chamador pode
registar o erro, mas não publicar metade.

### 6.2 Condições e resultados

| Condição | Deteção | Resultado |
| --- | --- | --- |
| ID com `kind`/`index`/`generation` nulo | `EntityId` | `InvalidEntityId`. |
| ID de outra região | `RegionId` do envelope/importação, não bits do ID | `ForeignReference`; exige remapeamento; não se compara ID sem contexto. |
| ID duplicado na mesma região | allocator | `DuplicateEntityId`; sem reutilização silenciosa. |
| Geração diverge do slot | consulta | `StaleEntityId`; não resolve para o novo ocupante. |
| `kind` não corresponde ao newtype | consulta | `WrongEntityKind`. |
| Sem slot livre | allocator | `IdSpaceExhausted`; sem wrap. |
| Geração a esgotar | despawn | Slot aposentado; sem reutilização com `0`. |
| `Tick` overflow | soma | `TickOverflow`; sem avanço parcial. |
| Quantidade zero/overflow | efeito | `TransferQuantityZero`/`QuantityOverflow`. |
| Delta de relação zero/fora da faixa | efeito | `ZeroDelta`/`DeltaOutOfRange`. |
| Saturação sem autorização | aplicação | `ClampNotAuthorized`; rejeita o fato. |
| Coordenada fora dos limites | construção | `CoordinateOutOfBounds`; sem clamp. |
| Registo truncado | decoder | `TruncatedRecord`; sem fatos parciais. |
| `body_len` inconsistente | decoder | `LengthMismatch`; rejeita o registo. |
| Bytes sobrantes após o último registo | decoder | `TrailingBytes`; rejeita o lote. |
| `version` desconhecida | decoder | `UnsupportedVersion`; sem leitura parcial. |
| `kind` de evento desconhecido | decoder | `UnknownEventKind`; não ignora. |
| `kind`/`selector` de efeito desconhecido | decoder | `UnknownEffectKind`/`UnknownSelector`. |
| `flags` ou reservado não nulo | decoder | `NonZeroFlags`/`NonZeroReserved`. |
| Campo não usado não nulo | decoder | `NonZeroUnusedField`. |
| `effects_count > 8` | decoder/encoder | `EffectCountExceeded`. |
| `labels_count > 3` | decoder/encoder | `LabelCountExceeded`. |
| Label repetido no fato | encoder | `DuplicateLabel`. |
| `source == target` em transferência/rumor | encoder | `SourceEqualsTarget`. |
| `TRANSFER_ITEM` com holder de kind inválido | encoder | `InvalidHolderKind`. |
| `fact_seq` não contíguo | `decode_log` | `FactGap`; rejeita o log. |
| `fact_seq` no máximo | append | `FactSeqExhausted`; sem wrap. |
| `tick` decrescente | `decode_log` | `NonMonotonicFactSeq`. |
| `source_fact_seq` inexistente/`origin_tick` errado | `decode_log` | `OriginMismatch`. |
| `DIRECT=0` e `RETOLD=0` | encoder | `InvalidFactFlags`. |
| Projeção com hash/offset errado | leitura | `ProjectionMismatch`/`DanglingProjection`; log prevalece. |
| Projeção passada a `decode_events` | decoder | `UnexpectedProjection`. |
| Secção canónica ausente/duplicada/fora de ordem | canonicalizador | `CanonicalOrderViolation`. |
| Chave canónica duplicada | canonicalizador | `DuplicateCanonicalKey`. |
| `bool` fora de `0`/`1` | canonicalizador | `InvalidBoolean`. |
| `String`/`f32`/`HashMap` em estado autoritativo | revisão/xtask | `NonCanonicalState`; não entra no hash. |

## 7. Vetores de teste da especificação

Os vetores abaixo são **exemplos de bytes escritos à mão**. Não foram produzidos por um teste de
aplicação, não foram medidos e não afirmam um golden de estado. A aritmética é conferível pelas
tabelas; o objetivo é fixar o wire para `CORE-01`/`SOC-02`.

### 7.1 Empacotamento de IDs

| ID | Valor | Bytes |
| --- | --- | --- |
| `ActorId` (ATOR, 1, 1) | `0x0001_0000_0001_0001` | `00 01 00 00 00 01 00 01` |
| `LocationId` (LOCALIDADE, `0x1234`, 2) | `0x0003_0000_1234_0002` | `00 03 00 00 12 34 00 02` |
| `ItemId` (ITEM, `0x2A`, 1) | `0x0002_0000_002A_0001` | `00 02 00 00 00 2A 00 01` |
| `RumorId` (RUMOR, 7, 1) | `0x0005_0000_0007_0001` | `00 05 00 00 00 07 00 01` |

Teste de obsolescência: o ID antigo `00 01 00 00 00 05 00 07` (ator, índice 5, geração 7) deixa de
ser válido quando o slot 5 passa para a geração 8; a consulta devolve `StaleEntityId`, mesmo que o
novo ocupante seja outro ator. `00 00 00 00 00 00 00 00` é `NONE` e não pode preencher `speaker` ou
`listener`; `FF FF FF FF FF FF FF FF` é `INVALID`.

### 7.2 Cabeçalho e oito efeitos

Fato de exemplo com oito efeitos: `fact_seq = 1`, `tick = 1000` (`0x03E8`), speaker
`0x0001_0000_0001_0001`, listener `0x0001_0000_0001_0002`, localidade
`0x0003_0000_1234_0002`, célula `(104, 88, 0)`, intenção `NEGOTIATE = 2`, `outcome_bp = 7500`
(`0x1D4C`), `valence_bp = 2500` (`0x09C4`), `fact_flags = DIRECT`, `effects_count = 8`,
`labels_count = 1`, `source_fact_seq = 0`, `origin_tick = 1000`.

Efeitos, na ordem:

| # | `kind` | `selector` | `subject` | `source` | `target` | `amount` |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `TRANSFER_ITEM` = 1 | 0 | item `0x0002_0000_002A_0001` | speaker | listener | `1` |
| 2 | `TRANSFER_ITEM` = 1 | 0 | item `0x0002_0000_002B_0001` | listener | speaker | `3` |
| 3 | `DELTA_RELATIONSHIP` = 2 | `TRUST` = 1 | 0 | 0 | listener | `-1` |
| 4 | `DELTA_RELATIONSHIP` = 2 | `FEAR` = 2 | 0 | 0 | listener | `3500` (`0x0DAC`) |
| 5 | `ATTACH_LABEL` = 3 | `ENMITY` = 3 | 0 | 0 | listener | `0` |
| 6 | `APPLY_STATUS` = 4 | status 7 | 0 | 0 | listener | `600` (`0x0258`) |
| 7 | `PROPAGATE_RUMOR` = 5 | 0 | rumor `0x0005_0000_0007_0001` | speaker | listener | `9000` (`0x2328`) |
| 8 | `DELTA_HP` = 6 | 0 | 0 | 0 | listener | `-12` (`0xFFFFFFF4`) |

Hexdump do registo completo, 350 bytes:

```text
0000  41 46 45 56 01 01 00 00 00 00 01 4E 00 00 00 00
0010  00 00 00 00 00 00 00 01 00 00 00 00 00 00 03 E8
0020  00 01 00 00 00 01 00 01 00 01 00 00 00 01 00 02
0030  00 03 00 00 12 34 00 02 00 00 00 68 00 00 00 58
0040  00 00 00 02 1D 4C 09 C4 00 01 08 01 00 00 00 00
0050  00 00 00 00 00 00 00 00 00 00 00 00 03 E8 01 00
0060  00 00 00 02 00 00 00 2A 00 01 00 01 00 00 00 01
0070  00 01 00 01 00 00 00 01 00 02 00 00 00 01 01 00
0080  00 00 00 02 00 00 00 2B 00 01 00 01 00 00 00 01
0090  00 02 00 01 00 00 00 01 00 01 00 00 00 03 02 01
00A0  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
00B0  00 00 00 01 00 00 00 01 00 02 FF FF FF FF 02 02
00C0  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
00D0  00 00 00 01 00 00 00 01 00 02 00 00 0D AC 03 03
00E0  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
00F0  00 00 00 01 00 00 00 01 00 02 00 00 00 00 04 07
0100  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
0110  00 00 00 01 00 00 00 01 00 02 00 00 02 58 05 00
0120  00 00 00 05 00 00 00 07 00 01 00 01 00 00 00 01
0130  00 01 00 01 00 00 00 01 00 02 00 00 23 28 06 00
0140  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
0150  00 00 00 01 00 00 00 01 00 02 FF FF FF F4
```

Conferência aritmética:

- Cabeçalho: `41 46 45 56` + `01` + `01` + `0000` + `0000014E` + `00000000` = 16 bytes.
- `body_len` `0x14E` = 334; `334 = 78 + 8 * 32`.
- Total: `16 + 334 = 350`; último offset é `0x15D` (350 - 1).
- Efeito 1 em `94 = 0x5E`; efeito 8 em `94 + 7*32 = 318 = 0x13E`.
- O primeiro efeito começa com `01 00`; o oitavo começa em `0x13E` com `06 00`; o `amount` `-12` no
  fim é `FF FF FF F4`.

### 7.3 Fato com delta de 1 bp

Fato mínimo com um único `DELTA_RELATIONSHIP` de `+1` bp: `fact_seq = 2`, `tick = 1001`
(`0x03E9`), mesmos speaker/listener/localidade/célula, `intent = APPEASE = 7`, `outcome_bp = 0`,
`valence_bp = 0`, `fact_flags = DIRECT`, `effects_count = 1`, `labels_count = 0`,
`source_fact_seq = 0`, `origin_tick = 1001`. Efeito: `kind = 2`, `selector = TRUST = 1`,
`amount = +1`.

Hexdump do registo, 126 bytes:

```text
0000  41 46 45 56 01 01 00 00 00 00 00 6E 00 00 00 00
0010  00 00 00 00 00 00 00 02 00 00 00 00 00 00 03 E9
0020  00 01 00 00 00 01 00 01 00 01 00 00 00 01 00 02
0030  00 03 00 00 12 34 00 02 00 00 00 68 00 00 00 58
0040  00 00 00 07 00 00 00 00 00 01 01 00 00 00 00 00
0050  00 00 00 00 00 00 00 00 00 00 00 00 03 E9 02 01
0060  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00
0070  00 00 00 01 00 00 00 01 00 02 00 00 00 01
```

Conferência aritmética:

- `body_len` `0x006E` = 110; `110 = 78 + 1 * 32`.
- Total: `16 + 110 = 126`; último offset `0x7D`.
- O efeito começa em `94 = 0x5E`: `02 01 00 00` (kind 2, selector 1, flags 0), `subject = 0`,
  `source = 0`, `target = listener`, `amount = 00 00 00 01`.
- O valor `1` no `amount` é exatamente 1 bp; não há multiplicação por 100 nem passagem por `i8`.

### 7.4 Nota sobre os vetores

Os bytes acima foram compostos campo a campo e conferidos pela soma de offsets; não houve execução
de `cargo`, teste de integração, medição de desempenho ou captura de hash. Qualquer divergência
entre este documento e uma implementação futura é erro de um dos dois e deve ser resolvida por
revisão e golden de `CORE-01`, não por "ajustar o teste ao código".

## 8. Rastreabilidade dos critérios de aceite

| Critério | Exigência do cartão | Onde este contrato fecha | Prova documental | Implementação futura |
| --- | --- | --- | --- | --- |
| `AC-CTR-01-01` | Layout real, offsets, soma e ordem dos bytes | §2.2, §4.1–§4.4, §4.10 | Tabelas de offsets e soma `94 + 32n`; hexdump de 350 bytes | `CORE-01`/`SOC-02` com golden de tamanho e offsets. |
| `AC-CTR-01-02` | ID obsoleto, overflow, truncamento, versão/reserva inválida rejeitados | §2.4–§2.5, §4.3, §6.2 | Tabela de erros e casos de sentinela/geração | Testes de rejeição sem efeito parcial. |
| `AC-CTR-01-03` | Compactação mantém tabela e limites provados | §4.5, §4.8, §4.9 | Limites 8/3; projeção 104; prova de preservação por offset/hash | `SOC-02` com round-trip e projeção reconstruível. |
| `AC-CTR-01-04` | Múltiplas localidades/transferências e deltas não perdem identidade ou fatos; ADR | §2.6–§2.7, §3.5–§3.6, §4.6, §7.2 | IDs completos, 8 efeitos, `-1`/`+1` bp, `location` histórico; [ADR 0010](<../../architecture/adr/0010-identity-event-layout.md>) | `GRID-01`/`SOC-02`/`STORE-01` com corpus regional e golden. |

## 9. Checklist e pendências para freeze

Cada linha é uma decisão estrutural. A recomendação é a deste contrato; o freeze exige aceite do
maintainer e revisão independente. Este documento não se autoaprova.

| # | Decisão | Recomendação | Justificativa | Impacto se rejeitada |
| --- | --- | --- | --- | --- |
| 1 | Largura do ID | `u64` com `kind`/`index`/`generation` | Identidade autossuficiente, geração detetável e escala regional. | Voltar a `u32` exigiria tabela lateral e não detetaria ID obsoleto. |
| 2 | Repartição de bits | 16/32/16 | 4,29 mil milhões de índices, 65.535 gerações e 65.535 tipos. | Outra repartição muda todos os bytes e o golden. |
| 3 | Allocator | Um por região e por tipo | Evita colisão entre localidades e preserva ID ao mover. | Allocators por localidade podem duplicar IDs. |
| 4 | Geração esgotada | Aposentar o slot | Evita ABA e reutilização com geração `0`. | Reutilizar em wrap tornaria IDs antigos perigosos. |
| 5 | Endianness | Big-endian em todo o wire | Igual em Windows/Linux e independente do host. | Little-endian quebraria o golden e a portabilidade. |
| 6 | Registo completo | `94 + 32n`, `n ≤ 8` | Preserva todos os fatos, efeitos e proveniência. | Um formato fixo de 46/48 bytes volta a perder dados. |
| 7 | Projeção | Índice de 104 bytes com offset/comprimento/BLAKE3-256 | Leitura rápida sem duplicar nem arredondar fatos. | Uma projeção com deltas voltaria a ser uma cópia lossy. |
| 8 | Deltas sociais | `i16`/`i32` em basis points, faixa `-10.000..10.000` | 1 bp exato; 20.001 valores não cabem em `i8`. | `i8` percentual perde 1 bp; `f32` perde determinismo. |
| 9 | Valores fracionários | Q16.16 para atributos; bp para relações | Precisão definida sem float. | Floats quebrariam hash/replay. |
| 10 | Saturação | Só com política autorizada e flag; caso contrário rejeitar | Nada de clamp silencioso. | Clamp silencioso esconde regra inválida e altera fatos. |
| 11 | Efeitos | Array tipado, tag explícita, 8 no máximo | Cobre transferências, relações, labels, status, rumor e HP. | Um campo único por fato não representa o domínio. |
| 12 | Labels | 3 no máximo, distintos, por fato | Limite de produto e validação barata. | Sem limite, o fato cresce sem orçamento e a UI não fecha. |
| 13 | Versão | v1 estrita; desconhecida rejeitada | Evita leitura parcial e corrupção silenciosa. | Ignorar versão/ reserva esconde incompatibilidade. |
| 14 | Hash | BLAKE3-256 do estado canónico; sem valores inventados | Determinismo e golden capturado por `CORE-01`. | Outro algoritmo/ordem muda o hash e o replay. |
| 15 | Texto no tick | Proibido; NLG lazy fora do estado | Zero-string e separação modelo/núcleo. | Texto no tick torna o hash dependente de locale/modelo. |

Pendências de freeze, explicitamente em aberto até aceite:

- Confirmar a repartição 16/32/16 e a tag de 16 bits com `CORE-01`/`S-CORE`.
- Confirmar o limite de 3 labels e o catálogo de status com `RULE-01`/`CTR-04`.
- Confirmar que `ITEMS`/`RELATIONSHIPS` são os payloads canónicos finais e que as secções dos outros
  donos não precisam de campos adicionais.
- Capturar o golden de estado e os goldens de evento em `CORE-01`/`SOC-02`; este contrato não os
  substitui.
- Aceitar [ADR 0010](<../../architecture/adr/0010-identity-event-layout.md>) e atualizar o índice de
  ADRs num PR próprio (fora da allowlist desta tarefa).

## 10. Como este contrato será consumido

| Consumidor | Interface | O que consome | O que não pode improvisar |
| --- | --- | --- | --- |
| `CORE-01` | `INT-01` (produtor) | IDs, unidades, `canonical_state`/`state_hash` | Outra repartição de bits, float, `HashMap`, ordem de compilador ou hash sem golden. |
| `CORE-02` | `INT-01`, `INT-05` | IDs, tick, efeitos, fatos | Allocator por localidade, custo inventado, clamp silencioso ou reescrita de ID histórico. |
| `GRID-01` | `INT-01`, `INT-03` | `LocationId`, `GridPoint`, limites | Empacotar tile em `u32`, usar câmera como seletor ou congelar localidades fora do foco. |
| `SOC-02` | `INT-01`, `INT-07` | `ConversationFact`, `encode_events`/`decode_events`, projeção | Mais de 8 efeitos/3 labels, compressão lossy, prosa no tick ou projeção como autoridade. |
| `STORE-01` | `INT-01`, `INT-07`, `INT-10` | Log completo, projeção, offsets/hash | Salvar só viewport, reparar log pela projeção ou aceitar versão/reserva desconhecida. |
| `RULE-01` | `INT-01`, `INT-08` | Tags de efeito, faixas, saturação | Criar `effect_kind`/seletor novo sem contrato ou mascarar inválido com clamp. |
| `BEH-01` | `INT-01`, `INT-07` | Fatos históricos, IDs, deltas | Reconstruir o passado pelo estado atual, usar overlay como testemunho ou texto como estado. |

Consumidores indiretos de `INT-07`: `STORE-02` (migração), `NLG-01` (leitura lazy) e `E2E-01`
(cenários regionais) devem ler o log factual e a projeção somente como índice; não podem criar fatos,
alterar deltas ou tratar a projeção como registo completo.

## 11. Limitações e estado da entrega

- Documento normativo, sem código de aplicação; nenhum crate, `Cargo.toml`, teste Rust ou benchmark
  foi criado.
- Nenhum valor de hash de estado ou de evento é afirmado; os goldens pertencem a `CORE-01`/`SOC-02`.
- O [ADR 0010](<../../architecture/adr/0010-identity-event-layout.md>) está **Proposto**; o índice
  [docs/architecture/adr/README.md](<../../architecture/adr/README.md>) não foi editado porque está
  fora da allowlist desta tarefa. A atualização do índice é pendência de integração.
- O diretório `docs/planning/contracts/` é novo e não tem índice compartilhado; a descoberta é feita
  pelo caminho e pela CoALA local.
- As secções canónicas de região, agenda, RNG e componentes de ator pertencem a `CTR-02`/`CTR-03`;
  este contrato fixa o envelope e a ordem, não substitui esses contratos.
- A revisão `REVIEW-CTR-01` e o aceite do maintainer são obrigatórios; `DELIVERED_TO_REVIEW` não é
  `DONE`, `INTEGRATED` nem freeze.

## 12. Referências

- [Revisão de projeto — L-01](<../project-review.md#L266-L272>).
- [Especificação da onda — INT-01](<../wave-spec.md#L114-L121>) e
  [INT-07](<../wave-spec.md#L168-L175>).
- [Decisões do maintainer — D-07](<../decisions.md#L107-L124>).
- [Visão de arquitetura — IDs e unidades](<../../architecture/overview.md#L248-L259>).
- [Visão de arquitetura — registo de conversa](<../../architecture/overview.md#L273-L306>).
- [Roadmap de arquitetura — tempo e determinismo](<../../architecture/roadmap.md#L245-L271>).
- [Roadmap de arquitetura — região multi-localidade](<../../architecture/roadmap.md#L413-L438>).
- [ADR 0002 — núcleo determinístico](<../../architecture/adr/0002-rust-flecs-deterministic-core.md>).
- [ADR 0005 — contrato de simulação determinística](<../../architecture/adr/0005-deterministic-simulation-contract.md>).
- [ADR 0008 — tempo por ações](<../../architecture/adr/0008-action-driven-simulation-time.md>).
- [ADR 0010 — identidade e layout de evento](<../../architecture/adr/0010-identity-event-layout.md>).
- [Regras de desenvolvimento](<../../engineering/development-rules.md>).
- [BLAKE3](https://github.com/BLAKE3-team/BLAKE3), acesso em 2026-11-08.
- [Fixed-point arithmetic](https://en.wikipedia.org/wiki/Fixed-point_arithmetic), acesso em 2026-11-08.
- [Flecs — determinism discussion](https://github.com/SanderMertens/flecs/discussions), acesso em 2026-11-08.
