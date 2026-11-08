# Contrato CTR-04 — Gramática de chamadas e schema fechado de propostas

- **Status:** PROPOSTA PARA FREEZE — pendente de revisão independente
- **Task:** `CTR-04` · **Dono:** S-CONTRACT · **Fronteira:** 04
- **Data:** 2026-11-08
- **Base SHA:** `b73385beed68c89e3fb789e00e51a877aeb563f6`
- **Manifesto:** [`wave-spec.md`](../wave-spec.md) SHA-256 `328a8c7e121c9e4411bf0c105c3845c636e37bf208770fbc675f2cff4a360769`
- **Worktree / branch:** `../ai-fantasy-worktrees/ctr-04` · `docs/ctr-04`
- **Consome:** `INT-01`, `INT-04` · **Especifica:** `INT-08`, `INT-09`, `INT-12`, `INT-13`
- **Revisores:** S-RULES, S-MODELS, S-NLG · **Revisão:** `REVIEW-CTR-04`
- **ADR:** [`0012-model-schema-grammar.md`](../../architecture/adr/0012-model-schema-grammar.md) (Proposto)
- **Implementação:** nenhuma neste estágio; este contrato não autoriza scaffold nem código.

## 1. Escopo e autoridade

### 1.1 O que este contrato fixa

Este contrato fecha a fronteira entre o modelo local e o núcleo determinístico no que respeita a
propostas de regras emergentes. Fixa, de forma normativa e testável:

1. o **dialeto exato** da tool call publicada pelo LFM3, incluindo marcadores, preâmbulo de raciocínio,
   uma única chamada por resposta e a proibição de XML convencional;
2. o **schema fechado e versionado** da proposta (`RuleProposal` v1), com nomes canônicos, mapeamento
   dos nomes do exemplo histórico, tipos, cardinalidades, catálogos e limites;
3. as regras de **parse** (framing, bytes, profundidade, duplicados, truncamento) e o **parser único**
   que separa bytes não confiáveis de dados tipados;
4. as regras de **validação contra factos** (`parse_proposal` → `validate_rule`), incluindo posse,
   alcance, existência, morte, selectores, IDs e alvos;
5. a distinção entre **rejeição** e **saturação autorizada**, sem qualquer clamp silencioso e sem perda
   de 1 bp;
6. a **materialização pura** (`materialize`), determinística, com allowlist de efeitos, DC, deltas e
   durações, até oito efeitos por resultado;
7. os **portos** `SystemOnePort` e `LlmPort`, com respostas finitas e normalizadas;
8. a **NLG preguiçosa** com âncoras, claims, cache e fallback determinístico em português;
9. o **corpus adversarial** de 200 casos válidos e 200 inválidos que a implementação futura deve passar;
10. a **proveniência e auditoria** host-side, fora do estado autoritativo e fora do hash do mundo.

### 1.2 O que este contrato não faz

- Não implementa código, crates, testes, binários, sidecars ou prompts executáveis.
- Não escolhe engine, stack gráfica, biblioteca de JSON, biblioteca de modelo ou transporte.
- Não redefine tipos de outros donos: `ConversationFact` e os efeitos canônicos pertencem ao
  [`identity-events.md`](identity-events.md) (CTR-01); desenhos, relógio, durabilidade e `RngState`
  pertencem ao [`time-replay-save.md`](time-replay-save.md) (CTR-02); percepção, overlay e regiões
  pertencem ao [`region-perception-overlay.md`](region-perception-overlay.md) (CTR-03); custos,
  intents e mecânica social pertencem ao [`gameplay-spec.md`](../gameplay-spec.md) (DOC-02).
- Não fixa o texto do prompt, o template de chat, o formato de cassette ou o empacotamento do modelo.
- Não decide o calendário do jogo; o limite de `duration_ticks` é uma constante de produto deste
  contrato e está marcado como decisão de freeze.
- Não aprova o scaffold, não fecha o stack de render (D-06) e não substitui a ratificação de produto
  das propostas `PD-01`…`PD-09`.
- Não autoriza push, PR, merge em branch protegida, tag ou release.

### 1.3 Decisões preservadas

| Decisão | Efeito neste contrato |
| --- | --- |
| D-01 — engine antes de 2D | Nenhuma dependência de render, câmara ou UI entra no schema ou na materialização. |
| D-02 — tempo por movimento/fala | A materialização não lê relógio, não cria ticks e recebe `Tick`/`Seed` do núcleo. |
| D-03 — foco social/rumor | O allowlist de efeitos é social; não há combate tático, magia ou economia de mercado. |
| D-04 — múltiplas localidades | Selectores são locais ao `ActionFacts`; a propagação regional é metadado, não efeito. |
| D-05 — silhuetas separadas | Overlay e `player_silhouettes` nunca são conhecimento nem entrada de validação. |
| D-06 — 2D isométrico | Fora do escopo; o schema não transporta coordenadas de render. |
| D-07 — offline, sem hardware mínimo | O contrato não exige rede, GPU, pesos distribuídos ou telemetria. |
| D-08 — sem tecto artificial de subagentes | Irrelevante para o contrato; não é mencionado em schema ou runtime. |

### 1.4 Convenções normativas

- **DEVE**, **NÃO DEVE**, **PODE** e **NÃO PODE** são normativos. Onde se lê DEVE, um revisor pode
  exigir teste que falhe sem a regra.
- Valores em `code span` são literais. Números são inteiros decimais; não há vírgula flutuante,
  expoente, `NaN`, `Infinity` ou `null` no schema v1.
- "Bytes" significa octetos UTF-8, não caracteres. "Profundidade" conta contentores JSON, com a raiz
  a valer 1.
- "Proposta" é o valor não confiável (`RuleProposal`); "regra validada" é o valor ligado a factos
  (`ValidatedRule`); "conjunto de efeitos" é a saída pura (`EffectSet`).
- "Host" é o processo que detém o mundo e as portas; "modelo" é o LFM3 local. O modelo nunca é
  autoridade.
- Exemplos são ilustrativos e não executáveis. Nenhum exemplo afirma que um ator, item ou rumor
  existe num save real.
- Este documento não usa `MUST`; a versão inglesa, se existir, deve refletir a mesma matriz.

### 1.5 Problema que este contrato resolve

O exemplo público de tool call do LFM3 não é XML: usa `<function=propose_emergent_action>` e
`</function=>`, não usa atributos citados, e o bloco de raciocínio abre com `<think` sem `>`. Um
parser XML convencional rejeitaria o exemplo, ou pior, normalizaria marcadores e aceitaria uma
segunda gramática. O exemplo também omite `schema_version`, usa nomes divergentes
(`attributes_involved`, `on_success_changes`), usa IDs simbólicos (`carta_falsa_de_divida`) e um
estado que o CTR-01 não conhece (`ENEMY`, `EXPOSED_LIAR`), e um escopo de propagação (`GROUP`) que o
DOC-02 não define. Sem uma gramática única, um schema fechado e uma matriz de rejeição, cada
consumidor inventaria o seu parser e o núcleo herdaria ambiguidade, truncamento e campos
desconhecidos. Este contrato substitui o exemplo histórico por um exemplo canônico reconciliado e
define o que é aceite, o que é rejeitado e com que erro.

## 2. Gramática da chamada

### 2.1 Porque não se usa um parser XML

1. O dialeto publicado não é XML bem formado. `<function=nome>` não é um elemento XML válido;
   `</function=>` não é um fecho XML válido; `<think` não é um início de elemento válido.
2. Um parser XML introduziria uma segunda gramática (DTD, entidades, CDATA, namespaces, comentários,
   processing instructions) e superfície de XXE/billion laughs, sem qualquer ganho: os valores são
   enumerações, IDs e JSON pequeno.
3. A normalização XML (espaços em atributos, entidades, case folding) tornaria o parser dependente de
   detalhes do fornecedor e impediria a matriz de rejeição exata.
4. O contrato exige um **scanner de bytes dedicado**, sem resolução de entidades e sem acesso a
   ficheiro, rede ou variável de ambiente durante o parse.

Assim, XML convencional (`<function name="...">`, `</function>`, atributos citados, declaração XML,
`DOCTYPE`, `ENTITY`, `CDATA`, comentários) é **rejeitado** em v1 com `MalformedFrame` ou
`ForbiddenXmlConstruct`. Uma futura variante exigiria `frame_version` novo e revisão deste contrato.

### 2.2 Gramática canônica

```text
reply        = [ reasoning ] tool_call [ trailing_ws ]
trailing_ws  = { " " | "\t" | "\r" | "\n" }
reasoning    = "<think" opaque "</think"
tool_call    = "<tool_call>" call "</tool_call>"
call         = "<function=propose_emergent_action>" parameter+ "</function=>"
parameter    = "<parameter=" name ">" value parameter-close
parameter-close = "</parameter=>"
```

Regras:

1. `tool_call` aparece **exatamente uma vez**. Zero chamadas é `MissingCall`; duas ou mais é
   `MultipleCalls`. Não há chamadas em paralelo, nem chamada dentro de `reasoning`.
2. O nome da função é exatamente `propose_emergent_action`. Qualquer outro nome é `UnknownTool`.
3. Cada parâmetro tem um `name` do conjunto canônico ou do conjunto de aliases da §3.1. O parser
   verifica primeiro o conjunto reservado da §3.2.1; um nome reservado é
   `ProvenanceFieldForbidden` (stage `FRAME`), mesmo que também não seja canônico. Nome fora dos
   dois conjuntos é `UnknownParameter`; `name` vazio, com espaço, com aspas ou com `=` é
   `MalformedParameter`.
4. O fecho do parâmetro é exatamente `</parameter=>`, o mesmo dialeto do exemplo histórico. O fecho
   `</parameter` seguido de `>` (sem `=`), `</parameter >`, `</parameter/>` e `</PARAMETER=>` são
   `MalformedFrame`. Não há variante aceite em v1: o template do prompt DEVE emitir
   `</parameter=>`.
5. O fecho da função é exatamente `</function=>`. `</function>`, `</function >` e `</function= >`
   são `MalformedFrame`.
6. O fecho da chamada é exatamente `</tool_call>`, uma vez. Texto não vazio depois dele é
   `TrailingContent`; espaços, tabs, CR e LF são permitidos.
7. Não há texto entre `tool_call` e `call`, nem entre parâmetros, exceto espaços/tabs/CR/LF.
8. A ordem dos parâmetros é livre. Cada campo obrigatório aparece exatamente uma vez, contando
   canônico e alias como o mesmo campo; duas ocorrências é `DuplicateParameter`.
9. `reasoning` é opcional, aparece no máximo uma vez e antes de `tool_call`. O conteúdo é
   semanticamente opaco: não é interpretado, executado ou usado para escolher uma segunda chamada,
   mas os marcadores de framing são verificados (§2.7).
10. `trailing_ws` não pode conter uma segunda chamada, um segundo bloco de raciocínio ou qualquer
    marcador de parâmetro.

Forma canônica aceite (valores ilustrativos, schema na §3):

```text
<think
peso a dívida e a testemunha.
</think
<tool_call>
<function=propose_emergent_action>
<parameter=schema_version>
1
</parameter=>
<parameter=action_label>
ameacar_publicamente
</parameter=>
<parameter=attributes>
{"actor_primary":"LANGUAGE","actor_secondary":"INTELLIGENCE","target_primary":"PERCEPTION","target_secondary":"EMOTIONAL_STABILITY","required_item":1002}
</parameter=>
<parameter=target_dc>
16
</parameter=>
<parameter=on_success>
{"effects":[{"kind":"transfer_item","item":1001,"from":"target","to":"actor","quantity":1},{"kind":"delta_relationship","target":"target","axis":"fear","amount_bp":3500}]}
</parameter=>
<parameter=on_failure>
{"effects":[{"kind":"delta_relationship","target":"target","axis":"hostility","amount_bp":6000}]}
</parameter=>
</function=>
</tool_call>
```

O exemplo canônico em JSON está na §3.10. Um exemplo não é um fixture e não implica que os IDs
existam; `transfer_item` e `required_item` só são aceites com `ActionFacts.items_enabled=true`
(§3.6 e §4.4).

### 2.3 Valores, escapes e entidades

1. Valores escalares (`schema_version`, `target_dc`, `action_label`) são texto UTF-8 sem
   marcadores; espaços/tabs/CR/LF nas extremidades são aparados. `action_label` é um token ASCII
   `[A-Za-z0-9_.-]{1,64}`; não é texto livre nem prompt.
2. Valores de objeto (`attributes`, `on_success`, `on_failure`, `propagation`) são JSON válido do
   subconjunto da §3.2.
3. Strings JSON só podem conter os tokens, enumerações, rótulos e IDs definidos neste contrato. Não
   há prosa, HTML, `script`, caminho de ficheiro, URL ou comando. `\u` só é aceite se decodificar
   para um caráter ASCII permitido no campo; qualquer outro escape é `InvalidEscape`.
4. Não há expansão de entidades. `&amp;`, `&#65;` e `&xxe;` são literais inválidos nos campos, não
   entidades. `DOCTYPE`, `ENTITY`, `CDATA`, comentários XML, processing instructions e declaração
   XML são `ForbiddenXmlConstruct`.
5. Não há `null` em v1. Campos opcionais estão ausentes, não nulos. `quantity` ausente vale `1`
   apenas onde a §3.4 o declara.
6. Números são inteiros decimais sem sinal de mais, sem zeros à esquerda (exceto `0`), sem ponto,
   sem expoente, sem hexadecimal e sem `-0`. Fora disso é `JsonNonIntegerNumber` ou
   `JsonNumberOutOfRange`.
7. Chaves JSON duplicadas são `JsonDuplicateKey`. Chaves desconhecidas são `UnknownField`, em
   qualquer nível. A comparação é byte a byte, sensível a caixa.
8. Não há comentários JSON, vírgulas finais, `NaN`, `Infinity`, `true`/`false` fora de
   `requires_living_carrier`, nem arrays fora dos campos declarados.

### 2.4 Limites

| Constante | Valor | Medida | Violação |
| --- | --- | --- | --- |
| `MAX_REPLY_BYTES` | 65536 | bytes UTF-8 da resposta inteira | `PayloadTooLarge` |
| `MAX_REASONING_BYTES` | 8192 | bytes UTF-8 do bloco de raciocínio | `ReasoningTooLarge` |
| `MAX_PARAMETERS` | 7 | parâmetros canônicos ou aliases, contados uma vez | `TooManyParameters` |
| `MAX_JSON_DEPTH` | 6 | contentores JSON, raiz = 1 | `JsonDepthExceeded` |
| `MAX_EFFECTS_PER_BRANCH` | 8 | efeitos na lista `on_success` ou `on_failure` | `EffectCountExceeded` |
| `MAX_LABELS_PER_BRANCH` | 3 | efeitos `attach_label` no mesmo ramo | `LabelCountExceeded` |
| `MAX_CALLS` | 1 | blocos `tool_call` | `MultipleCalls` |
| `MAX_FUNCTION_NAME_BYTES` | 64 | nome depois de `<function=` | `MalformedFrame` |
| `MAX_PARAMETER_NAME_BYTES` | 32 | nome do parâmetro | `MalformedParameter` |
| `MAX_ACTION_LABEL_BYTES` | 64 | valor de `action_label` | `InvalidActionLabel` |

Os limites são medidos antes de qualquer alocação proporcional ao valor. Não há descompressão,
normalização Unicode, conversão de charset ou leitura de ficheiro. Um valor exatamente no limite é
aceite; um byte acima é rejeitado. O limite de 4K tokens de geração do modelo é uma restrição de
prompt/transporte, não do parser: o parser mede bytes e não confia no contador de tokens.

### 2.5 Matriz de aceite e rejeição

| Construção | Aceite | Rejeitado | Erro |
| --- | --- | --- | --- |
| `<tool_call>` … `</tool_call>` exatos | sim | — | — |
| `<function=propose_emergent_action>` | sim | — | — |
| `</function=>` | sim | — | — |
| `</function>` | — | sim | `MalformedFrame` |
| `<function name="...">` | — | sim | `MalformedFrame` |
| `<function=outra_coisa>` | — | sim | `UnknownTool` |
| `<parameter=nome>` sem aspas | sim | — | — |
| `<parameter="nome">` | — | sim | `MalformedParameter` |
| `<parameter=nome >` | — | sim | `MalformedParameter` |
| `</parameter=>` | sim | — | — |
| `</parameter` seguido de `>` | — | sim | `MalformedFrame` |
| `</parameter >` | — | sim | `MalformedFrame` |
| `</parameter/>` | — | sim | `MalformedFrame` |
| `<think` … `</think` | sim, uma vez | duas vezes | `DuplicateReasoning` |
| `<think` sem `</think` | — | sim | `TruncatedReasoning` |
| `<thinkx` … `</thinkx>` | — | sim | `MalformedFrame` |
| Texto antes de `<tool_call>` | — | sim | `PreambleNotAllowed` |
| Texto depois de `</tool_call>` | — | sim | `TrailingContent` |
| Duas chamadas | — | sim | `MultipleCalls` |
| Parâmetro duplicado | — | sim | `DuplicateParameter` |
| Alias + canônico do mesmo campo | — | sim | `DuplicateParameter` |
| Parâmetro desconhecido | — | sim | `UnknownParameter` |
| `schema_version` ausente | — | sim | `MissingParameter` |
| Declaração XML / `DOCTYPE` | — | sim | `ForbiddenXmlConstruct` |
| `CDATA` / comentário / PI | — | sim | `ForbiddenXmlConstruct` |
| Entidade `&xxe;` | — | sim | `ForbiddenXmlConstruct` |
| UTF-8 inválido / BOM / NUL | — | sim | `InvalidUtf8` / `ForbiddenByte` |
| Resposta vazia | — | sim | `EmptyReply` |
| Acima de 65536 bytes | — | sim | `PayloadTooLarge` |
| Fecho de parâmetro ausente | — | sim | `TruncatedFrame` |
| Chave JSON duplicada | — | sim | `JsonDuplicateKey` |
| Número decimal/expoente | — | sim | `JsonNonIntegerNumber` |
| `null` | — | sim | `WrongType` |
| Campo desconhecido no JSON | — | sim | `UnknownField` |
| Nome de proveniência reservado | — | sim | `ProvenanceFieldForbidden` |

### 2.6 Fronteira de parser único

1. `parse_proposal` é a **única** função autorizada a transformar bytes de resposta em
   `RuleProposal`. Nenhum consumidor (RULE-01, RULE-02, APP-01, E2E-01) pode extrair o "primeiro
   objeto JSON", aplicar regex ao texto, reimplementar o framing ou chamar `serde_json` sobre uma
   fatia antes de o scanner provar que há exatamente uma chamada e um valor por parâmetro.
2. O prompt e o parser partilham o mesmo descritor de schema (`RuleSchema`). Uma mudança de schema
   atualiza os dois e incrementa `schema_version`; o parser não tem defaults fora do descritor.
3. O parser não faz I/O, não abre ficheiros, não resolve entidades, não consulta rede, ambiente ou
   relógio, não usa `eval` e não gera código. Valores são dados, nunca instruções.
4. O parser não produz estrutura parcial: ou devolve `RuleProposal` completo, ou um erro tipado com
   estágio, código, caminho do campo e deslocamento em bytes. Não há `unwrap`, `panic` ou recuperação
   silenciosa.
5. Um consumidor que precise de outra representação (por exemplo, um evento CTR-01) recebe
   `ValidatedRule`/`EffectSet`, não os bytes. A NLG tem o seu próprio parser de narrativa, mas nunca
   reutiliza o parser de propostas para outro artefacto.

### 2.7 Preâmbulo de raciocínio

O bloco `<think` … `</think` é semanticamente opaco e não é auditado por conteúdo. PODE conter
texto livre em UTF-8, mas NÃO PODE conter os marcadores `<tool_call>`, `</tool_call>`,
`<function=`, `</function=>`, `<parameter=` ou `</parameter`; se contiver, é `MarkerInValue`. O bloco não é executado, não é obedecido, não é
indexado e não é usado para escolher outra chamada; o host regista apenas o seu digest e o tamanho.
Um bloco truncado ou com fecho divergente é rejeitado, mesmo que o resto da resposta pareça válido.
A verificação de marcadores não é interpretação semântica: é a mesma fronteira de framing do resto
da resposta.

## 3. Schema fechado da proposta

### 3.1 Nomes canônicos e aliases

| Nome no exemplo histórico | Nome canônico v1 | Estado |
| --- | --- | --- |
| `attributes_involved` | `attributes` | alias aceite em v1, deprecado |
| `on_success_changes` | `on_success` | alias aceite em v1, deprecado |
| `on_failure_changes` | `on_failure` | alias aceite em v1, deprecado |
| `propagation_rules` | `propagation` | alias aceite em v1, deprecado |
| `action_label` | `action_label` | canônico |
| `target_dc` | `target_dc` | canônico |
| `schema_version` | `schema_version` | obrigatório; ausente no exemplo |

Regras de alias:

1. Um alias e o canônico correspondente contam como o mesmo campo. Enviar os dois é
   `DuplicateParameter`; enviar o mesmo alias duas vezes também.
2. Não há aliases dentro do JSON (`effects`, `kind`, `amount_bp`, etc.) nem para labels, status,
   eixos, atributos ou escopos. A compatibilidade limita-se aos quatro nomes de parâmetro acima.
3. Os aliases existem apenas para aceitar respostas de um prompt antigo durante a migração. O prompt
   v1 usa os nomes canônicos; um prompt v2 remove os aliases e o parser passa a rejeitá-los como
   `UnknownParameter`.
4. O exemplo canônico da §3.10 usa apenas nomes canônicos e inclui `schema_version`.
5. `propagation_rules` é o nome do único exemplo histórico; `propagation` é o nome canônico. A linha
   não afirma que o exemplo usava `propagation`.

### 3.2 Topo da proposta

| Campo | Tipo | Obrigatório | Regra |
| --- | --- | --- | --- |
| `schema_version` | inteiro | sim | exatamente `1`; outro valor é `UnsupportedSchemaVersion`; ausente é `MissingParameter` com `parameter=schema_version` |
| `action_label` | string | sim | token ASCII `[A-Za-z0-9_.-]{1,64}`; não é prosa |
| `attributes` | objeto | sim | §3.3, quatro chaves obrigatórias e `required_item` opcional |
| `target_dc` | inteiro | sim | `5..=25`, inclusive |
| `on_success` | objeto | sim | `{"effects": [...]}` com `1..=8` efeitos |
| `on_failure` | objeto | sim | `{"effects": []}` ou `1..=8` efeitos |
| `propagation` | objeto | não | §3.7; ausente significa "sem semente de rumor" |

O objeto raiz tem exatamente estas chaves. `deny_unknown_fields` é obrigatório em todos os níveis.
Qualquer chave não declarada é `UnknownField`, exceto os nomes reservados da §3.2.1, que são
sempre `ProvenanceFieldForbidden`. O modelo não fornece identidade, tempo, RNG, proveniência ou IDs
de facto.

#### 3.2.1 Nomes reservados

O conjunto reservado é exaustivo e único para parâmetros e chaves JSON:

```text
proposal_id, rule_id, proposal_hash, schema_id, frame_version, provenance, model, model_id,
model_sha256, model_version, prompt, prompt_hash, prompt_version, cassette_id, request_id,
tick, revision, region_id,
actor_id, target_id, fact_seq, planned_fact_seq, seed, temperature, trace, draw, rng,
timestamp, notes, raw_digest, raw_reply_bytes, rule_content_hash, effect_set_hash,
validator_version, facts_hash, parse_status, validation_status, error_stage, error_code,
requested_amount, effective_amount, saturation_policy, saturation_axis,
narrative_version, fallback_template_version
```

Um nome deste conjunto, como parâmetro ou como chave em qualquer objeto, é
`ProvenanceFieldForbidden`, verificado **antes** de `UnknownParameter`/`UnknownField`. Isto é
normativo para §2.2, §2.5, §4.2, §4.3 e §4.6.7; não há uma segunda lista.

### 3.3 Atributos

| Campo | Tipo | Obrigatório | Regra |
| --- | --- | --- | --- |
| `actor_primary` | enum | sim | §3.8.1 |
| `actor_secondary` | enum | sim | §3.8.1, diferente de `actor_primary` |
| `target_primary` | enum | sim | §3.8.1 |
| `target_secondary` | enum | sim | §3.8.1, diferente de `target_primary` |
| `required_item` | inteiro | não | `ItemId > 0`; exige `items_enabled=true` e posse pelo ator |

O objeto tem **quatro chaves obrigatórias** e, opcionalmente, `required_item`; portanto tem quatro
ou cinco chaves, nunca outra contagem. `actor_*` e `target_*` podem coincidir entre si (o ator e o
alvo podem partilhar um atributo); apenas o par primário/secundário de cada lado tem de ser
distinto. Os atributos não alteram `target_dc`; alimentam o modificador de check calculado pelo
INT-04 (§5.2), nunca um clamp.

### 3.4 Efeitos

Cada efeito é um objeto com `kind` e os campos da tabela. O objeto tem exatamente as chaves listadas
para o seu `kind`; qualquer outra é `UnknownField`. Não há texto livre, `description`, `reason` ou
`narrative`.

| `kind` | Kind CTR-01 | Campos | Alvos permitidos |
| --- | --- | --- | --- |
| `transfer_item` | `TRANSFER_ITEM` | `item`, `from`, `to`, `quantity?` | `actor`, `target` |
| `delta_relationship` | `DELTA_RELATIONSHIP` | `target`, `axis`, `amount_bp`, `authorized_saturation?` | `target`, `bystanders` |
| `attach_label` | `ATTACH_LABEL` | `target`, `label` | `target`, `bystanders` |
| `apply_status` | `APPLY_STATUS` | `target`, `status`, `duration_ticks` | `actor`, `target`, `bystanders` |
| `propagate_rumor` | `PROPAGATE_RUMOR` | `rumor`, `target`, `amount_bp` | `target`, `bystanders` |
| `delta_hp` | `DELTA_HP` | `target`, `amount`, `authorized_saturation?` | `actor`, `target`, `bystanders` |
| `transfer_currency` | `TRANSFER_CURRENCY` | `from`, `to`, `amount` | `actor`, `target` |

Regras por efeito:

1. `transfer_item`: `item` é `ItemId > 0`; `from` e `to` são `actor` ou `target` e têm de ser
   diferentes (`SelfTransfer`); `quantity` ausente vale `1`, presente é inteiro `1..=2147483647`.
   Exige `ActionFacts.items_enabled=true`; caso contrário é `ItemEffectNotEnabled` (o recorte
   DOC-02/PD-04 exclui itens por omissão). Verifica posse, quantidade e duplicação; não move itens
   de `bystanders`.
2. `delta_relationship`: `amount_bp` é inteiro `-10000..=10000`, diferente de zero (`ZeroDelta`
   quando zero; `AmountOutOfRange` quando fora do intervalo). A fonte é sempre o ator; o efeito
   altera `(actor, target, axis)`. `target=actor` é `SelfTarget`; `bystanders` expande para cada
   testemunha elegível.
3. `attach_label`: a fonte é sempre o ator; `target=actor` é `SelfTarget`; o rótulo é único por
   `(actor, target)` e o ramo tem no máximo três `attach_label` (`LabelCountExceeded`).
4. `apply_status`: `duration_ticks` é inteiro `1..=525600`; um estado já presente no alvo é
   `StatusAlreadyPresent` (não há refresh nem stack); o catálogo é o da §3.8.4.
5. `propagate_rumor`: `rumor` é `RumorId > 0`; `amount_bp` é inteiro `1..=10000` e DEVE ser
   exatamente a fidelidade da cópia de origem em `ActionFacts` (`RumorFidelityMismatch` caso
   contrário). O host aplica `TRANSFER_LOSS_BP` e as regras de portador do SOC-03; o modelo não
   escolhe a perda, as testemunhas nem cria rumor. A criação de um rumor novo é o bloco
   `propagation`.
6. `delta_hp`: `amount` é inteiro `-1000000..=1000000`, diferente de zero; fora do intervalo é
   `HpDeltaOutOfRange`. Dano que leve o alvo a menos de `1` é `LethalDamageNotAuthorized`; não há
   morte em v1. Cura acima do máximo sem saturação autorizada é `ClampNotAuthorized`; com a flag,
   satura e registra.
7. `transfer_currency`: `from` é `actor` e `to` é `target` (com `actor=speaker` e
   `target=listener`), `amount` é inteiro `1..=10000`, `ActionFacts.offer_currency` é `Some(amount)`
   com o mesmo `amount`, `ActionFacts.result_class=1` e `ActionFacts.currency_transfer_allowed=true`;
   a soma conserva-se e a carteira do destino não pode exceder `10000` (`WalletOverflow`). Só é
   válido quando o `intent` do facto é `NEGOTIATE` (2) ou `INFORM_PATH` (9), conforme
   `identity-events.md` §4.5.2. Qualquer desvio — intent, `result_class != 1`, direção invertida,
   oferta `None`/`Some(0)`/diferente do `amount` ou gate `false` — é `IntentEffectMismatch`.
8. `authorized_saturation` só existe em `delta_relationship` e `delta_hp`; em qualquer outro `kind`
   é `UnsupportedSaturation`. Ausente vale `false`.
9. `damage`, `heal`, `spawn_rumor`, `set_flag`, `teleport`, `give_xp` e `kill` não são kinds v1;
   são `UnknownEffect`. `damage`/`heal` mapeiam conceptualmente para `delta_hp`, mas o modelo DEVE
   emitir o nome canônico.
10. O allowlist é fechado e refere os sete kinds do CTR-01; nenhum efeito novo é inventado neste
    contrato. Um kind futuro exige `schema_version` novo e revisão do CTR-01.
11. `transfer_currency` só pode aparecer no ramo `on_success` e apenas quando `result_class=1`.
    Quando `result_class!=1`, `ActionFacts.offer_currency` é `None` e o ramo tem zero
    `transfer_currency`; uma oferta ou um efeito nesse estado é `IntentEffectMismatch`. Quando
    `result_class=1` e `offer_currency=Some(amount)` com `amount` em `1..=10000`, `on_success`
    contém exatamente um `transfer_currency` com esse `amount`; `Some(0)` ou `None` são
    `IntentEffectMismatch` e exigem zero ocorrências. Qualquer segunda ocorrência no mesmo ramo é
    `DuplicateCurrencyEffect`, independentemente do par `from/to`. Se `from == to`, é
    `SelfTransfer`, verificado antes dos testes de direção. Estas regras são de validação e
    antecedem a materialização.

### 3.5 Selectores

| Selector | Liga a | Contextos válidos | Expansão |
| --- | --- | --- | --- |
| `actor` | ator da ação | `from`/`to` de `transfer_item`; `from` de `transfer_currency`; alvo de `apply_status`/`delta_hp` | um ator |
| `target` | alvo da ação | alvo de qualquer efeito; `to` de `transfer_currency`; `from`/`to` de `transfer_item` | um ator, se existir |
| `bystanders` | testemunhas elegíveis | `delta_relationship`, `attach_label`, `apply_status`, `delta_hp`, `propagate_rumor` | lista ordenada, 0..N |
| `region` | região | apenas `propagation.scope` | não é alvo de efeito |

Regras:

1. Não há IDs de ator numéricos no lugar de selectores. Um inteiro ou um nome de ator em `target`,
   `from` ou `to` é `InvalidSelector`; o host liga os símbolos `actor`/`target` a `ActorId`
   concretos e nunca aceita um ID escolhido pelo modelo.
2. `actor` como alvo de `delta_relationship`, `attach_label` ou `propagate_rumor` é `SelfTarget`
   (a fonte é o próprio ator); a tabela de contextos acima já exclui esses usos. `actor` como alvo
   de `apply_status`/`delta_hp` é permitido (autoestado), mas dano letal continua rejeitado.
3. `region` como alvo de efeito, `from`, `to` ou `holder` é `InvalidSelector`. O escopo regional é
   metadado de propagação, não um efeito sobre todos os atores da região.
4. `bystanders` é a lista que o INT-04 projeta a partir de percepção autoritativa, alcance e linha
   de visão, já filtrada pelas regras de testemunha do DOC-02. O materializador não calcula
   testemunhas e NÃO PODE ler overlay, câmara ou `player_silhouettes`.
5. A lista de `bystanders` é ordenada por `ActorId` ascendente e não contém o ator. A expansão de
   um template ocorre na posição do template, na ordem da lista; duplicados são removidos; o total
   de efeitos depois da expansão não pode exceder oito (`EffectSetOverflow`).
6. Se `target` for `bystanders` e a lista estiver vazia, o template não produz efeito. Um ramo de
   sucesso só com templates de testemunhas pode materializar zero efeitos; isso é registado com
   `no_effect_reason=NO_ELIGIBLE_BYSTANDER`, não é erro de schema.
7. `transfer_item` e `transfer_currency` não aceitam `bystanders`; um item ou quantia não é
   transferido para "todos os presentes". `propagate_rumor` aceita, porque uma cópia de rumor por
   testemunha é uma operação social definida pelo SOC-03.
8. `quantity` de `transfer_item` é por par `(from,to)`; se o mesmo item for transferido duas vezes
   no mesmo ramo, é `DuplicateItemEffect`.

### 3.6 IDs, existência e posse

1. `ItemId` e `RumorId` são inteiros positivos (`> 0`), nunca strings, nomes simbólicos, UUIDs ou
   caminhos. `"carta_falsa_de_divida"`, `"item-1"`, `0` e `-1` são `InvalidId`.
2. O item DEVE existir no `ActionFacts`, estar na posse de `from` em quantidade suficiente e não
   estar já na posse de `to` (identidade única) — caso contrário `ItemNotFound`, `ItemNotHeld`,
   `QuantityOutOfRange` ou `ItemAlreadyHeld`.
3. O rumor DEVE existir e o ator DEVE ter uma cópia ativa; `RumorNotFound`/`RumorNotKnown` caso
   contrário. A fidelidade mínima de cognição é a do DOC-02 (`MIN_COGNITION_BP = 4000` na proposta
   de produto); abaixo disso é `RumorFidelityTooLow`.
4. Ator e alvo DEVEM existir, estar vivos e presentes na mesma localidade; `ActorNotFound`,
   `ActorDead`, `TargetNotFound`, `TargetDead`, `TargetOutOfReach` caso contrário.
5. O alvo de `attach_label`, `delta_relationship` ou `propagate_rumor` não pode ser o próprio ator;
   `SelfTarget`. `apply_status` e `delta_hp` podem ter o ator como alvo (autoestado), mas dano
   letal continua rejeitado.
6. O `required_item` DEVE estar na posse do ator; `MissingPossession`. O materializador não remove
   o item requerido; ele é uma condição, não um custo.
7. Nenhuma verificação usa overlay, conhecimento privilegiado do jogador, câmara, UI ou estado de
   render. O `ActionFacts` é a única fonte; se um campo necessário faltar, é `MissingFact` e a
   validação falha — o consumidor NÃO PODE adivinhar.

### 3.7 Propagação

`propagation` é um objeto opcional com exatamente cinco chaves. Em v1 os valores de orçamento são
constantes do DOC-02/PD-07, não uma escolha do modelo:

| Campo | Valor v1 | Regra |
| --- | --- | --- |
| `scope` | `LOCAL` ou `REGIONAL` | `GROUP` é `UnknownScope` |
| `initial_fidelity_bp` | `10000` | exatamente a semente DOC-02; outro valor é `PropagationBudgetMismatch` |
| `half_life_ticks` | `1200` | exatamente `HALF_LIFE_TICKS`; outro valor é `PropagationBudgetMismatch` |
| `requires_living_carrier` | `true` | `false` é `UnsupportedPropagation` |
| `min_cognition_bp` | `4000` | exatamente `MIN_COGNITION_BP`; outro valor é `PropagationBudgetMismatch` |

1. O bloco é metadado para a criação de um rumor novo pelo SOC-02/SOC-03; não é um efeito CTR-01 e
   não é aplicado pelo materializador. A materialização apenas o transporta e valida os valores.
2. `scope=REGIONAL` significa que a semente pode atravessar a localidade de origem segundo as
   regras do DOC-02; não significa telepatia nem conhecimento imediato de toda a região.
3. O bloco só é aplicável se `ActionFacts.rumor_seed_allowed` for `true` (ação social com
   testemunhas ou intenção compatível); caso contrário é `PropagationNotApplicable`.
4. `half_life_ticks`, `min_cognition_bp` e `initial_fidelity_bp` são exatamente os valores
   contratados. O modelo NÃO PODE propor 2400, 3999 ou 9999; fazê-lo é `PropagationBudgetMismatch`.
   Alterar estes valores exige re-pinagem de produto do DOC-02/PD-07 e `schema_version` novo, não
   um clamp.
5. Não há RNG, relógio ou escrita de mundo na validação. A semente efectiva, a perda de fidelidade,
   os portadores e os 16 sorteios por pulso pertencem ao passo social e ao CTR-02.

### 3.8 Catálogos

#### 3.8.1 Atributos

| Nome | Nota | Fonte |
| --- | --- | --- |
| `STRENGTH` | físico | overview §7.2 |
| `AGILITY` | físico | overview §7.2 |
| `RESILIENCE` | físico | overview §7.2 |
| `PERCEPTION` | mental | overview §7.2; DOC-02 usa `percepcao_bp` |
| `INTELLIGENCE` | mental | overview §7.2; DOC-02 usa `inteligencia_bp`; P-07 |
| `LANGUAGE` | social | overview §7.2; DOC-02 usa `linguagem_bp`; P-07 |
| `MEMORY` | mental | overview §7.2 |
| `EMOTIONAL_STABILITY` | social | overview §7.2; exemplo do roadmap |

Os oito nomes são o vocabulário canônico do modelo em v1, com origem no componente `Attributes` do
overview (§7.2). Este contrato NÃO lhes atribui códigos numéricos: a codificação física e a
normalização em `0..=10000` pertencem ao CTR-01/DOC-02, e o INT-04 projeta os valores no
`ActionFacts`. A pendência P-07 (atributos de linguagem/inteligência no CTR-01) continua aberta:
enquanto não fechar, um atributo ausente é `MissingFact`, nunca um valor inventado. Um nome fora
desta tabela é `UnknownAttribute`.

#### 3.8.2 Eixos de relação

| Nome | Ordem CTR-01 |
| --- | --- |
| `trust` | 1 |
| `fear` | 2 |
| `empathy` | 3 |
| `dependence` | 4 |
| `hostility` | 5 |

Nomes em minúsculas, exatamente estes; `TRUST`, `Trust`, `affection` e `love` são `UnknownAxis`.

#### 3.8.3 Rótulos

| Código | Nome canônico | Fonte |
| --- | --- | --- |
| 1 | `FRIENDSHIP` | CTR-01 §4.5 |
| 2 | `MARRIAGE` | CTR-01 §4.5 |
| 3 | `ENMITY` | CTR-01 §4.5 |
| 4 | `FAMILY` | CTR-01 §4.5 |
| 5 | `ALLIANCE` | CTR-01 §4.5 |
| 6 | `LIAR` | CTR-01 §4.5 |

`ENEMY` e `EXPOSED_LIAR` do exemplo histórico não são rótulos válidos: mapeiam para `ENMITY` e
`LIAR`, respectivamente, e o modelo DEVE emitir o nome canônico. Não há aliases de rótulo.

#### 3.8.4 Estados

| Código | Nome canônico | Nota |
| --- | --- | --- |
| 1 | `BLEEDING` | status temporizado que espelha a flag fisiológica |
| 2 | `BLINDED` | status temporizado que espelha a flag fisiológica |
| 3 | `BURNING` | status temporizado que espelha a flag fisiológica |
| 4 | `STARVING` | status temporizado que espelha a flag fisiológica |
| 5 | `FATIGUED` | status temporizado que espelha a flag fisiológica |
| 6 | reservado | NÃO PODE ser usado em v1 |
| 7 | `INTIMIDATED` | alinhado com o vetor do CTR-01 e com o exemplo |
| 8..32 | reservado | rejeitado até `schema_version` novo |

O código 6 fica deliberadamente vago para preservar `7 = INTIMIDATED` no vetor dourado do CTR-01
(`identity-events.md`, `status=7`, `duration=600`); renumerar 7 para 6 quebraria o vetor. Os códigos
1..5 são status temporizados que espelham as cinco flags fisiológicas do overview §7.2; a duração
vem de `APPLY_STATUS`, e a flag de fisiologia continua a ser o estado de leitura. Um código
reservado é `UnknownStatus`. Não há aliases (`INTIMIDATE`, `FEARED`) nem refresh de estado.

#### 3.8.5 Kinds

O allowlist é exatamente o da §3.4: `transfer_item`, `delta_relationship`, `attach_label`,
`apply_status`, `propagate_rumor`, `delta_hp`, `transfer_currency`. Qualquer outro valor de `kind`,
incluindo `damage`, `heal` e `spawn_rumor`, é `UnknownEffect`.

#### 3.8.6 Versionamento dos catálogos

Os catálogos fazem parte de `schema_version=1`. Adicionar, remover ou renomear um atributo, eixo,
rótulo, estado ou kind exige `schema_version` novo, revisão do CTR-01 quando o código for canônico,
e atualização do prompt e do parser no mesmo commit. Não há "modo compatível" implícito. Os nomes são
sensíveis a caixa e não têm normalização.

### 3.9 Cardinalidade e duplicados

1. `on_success.effects` tem `1..=8` templates; vazio é `EmptyEffectSet` e mais de oito é
   `EffectCountExceeded`. `on_failure.effects` tem `0..=8`; um array vazio é válido e significa
   "nenhum efeito mecânico no fracasso".
2. No máximo três `attach_label` por ramo (`MAX_LABELS_PER_BRANCH`). No máximo oito `apply_status`
   por ramo, implícito no limite de efeitos.
3. Soma dos dois ramos ≤ 16 templates. Isso não é um orçamento de jogo; é apenas o limite de
   memória do parser.
4. São rejeitados como duplicados: chave JSON repetida (`JsonDuplicateKey`), parâmetro repetido
   (`DuplicateParameter`), alias + canônico (`DuplicateParameter`), dois `attach_label` com o mesmo
   alvo e rótulo (`DuplicateLabel`), dois `apply_status` com o mesmo alvo e estado
   (`DuplicateStatus`), duas transferências do mesmo item entre o mesmo par (`DuplicateItemEffect`),
   duas alterações do mesmo trio `(actor,target,axis)` (`DuplicateRelationshipEffect`), duas
   transferências de moeda no mesmo ramo, qualquer par (`DuplicateCurrencyEffect`) e duas propagações do mesmo
   rumor para o mesmo alvo (`DuplicateRumorEffect`).
5. Um array de efeitos não pode conter `null`, objeto vazio, `kind` ausente ou um efeito que não
   seja objeto. Um ramo sem `effects` é `MissingField`; `effects` que não seja array é `WrongType`.

### 3.10 Exemplo canônico

Valores ilustrativos; nenhum ator, item ou rumor é afirmado como existente. O exemplo segue os
nomes canônicos, os catálogos e os limites deste contrato.

```json
{
  "schema_version": 1,
  "action_label": "ameacar_publicamente",
  "attributes": {
    "actor_primary": "LANGUAGE",
    "actor_secondary": "INTELLIGENCE",
    "target_primary": "PERCEPTION",
    "target_secondary": "EMOTIONAL_STABILITY",
    "required_item": 1002
  },
  "target_dc": 16,
  "on_success": {
    "effects": [
      {
        "kind": "transfer_item",
        "item": 1001,
        "from": "target",
        "to": "actor",
        "quantity": 1
      },
      {
        "kind": "delta_relationship",
        "target": "target",
        "axis": "fear",
        "amount_bp": 3500
      },
      {
        "kind": "delta_relationship",
        "target": "target",
        "axis": "empathy",
        "amount_bp": -2500
      },
      {
        "kind": "attach_label",
        "target": "target",
        "label": "ENMITY"
      },
      {
        "kind": "apply_status",
        "target": "target",
        "status": "INTIMIDATED",
        "duration_ticks": 600
      }
    ]
  },
  "on_failure": {
    "effects": [
      {
        "kind": "delta_relationship",
        "target": "target",
        "axis": "hostility",
        "amount_bp": 6000
      },
      {
        "kind": "attach_label",
        "target": "target",
        "label": "LIAR"
      }
    ]
  },
  "propagation": {
    "scope": "LOCAL",
    "initial_fidelity_bp": 10000,
    "half_life_ticks": 1200,
    "requires_living_carrier": true,
    "min_cognition_bp": 4000
  }
}
```

#### 3.10.1 Reconciliação com o exemplo histórico

| Exemplo histórico | Canônico v1 | Razão |
| --- | --- | --- |
| sem `schema_version` | `"schema_version": 1` | versão explícita obrigatória |
| `attributes_involved` | `attributes` | nome canônico |
| `on_success_changes` | `on_success` | nome canônico |
| `on_failure_changes` | `on_failure` | nome canônico |
| `propagation_rules` | `propagation` | nome canônico; alias aceite |
| `</parameter=>` no fecho | `</parameter=>` | dialeto histórico mantido; `</parameter` sem `=` é rejeitado |
| `"item": "carta_falsa_de_divida"` | `"item": 1001` | `ItemId` inteiro; nomes simbólicos são inválidos |
| `"required_item": "carta_falsa_de_divida"` | `"required_item": 1002` | idem; exige `items_enabled=true` |
| `"label": "ENEMY"` | `"label": "ENMITY"` | catálogo CTR-01 |
| `"label": "EXPOSED_LIAR"` | `"label": "LIAR"` | catálogo CTR-01 |
| `"status": "INTIMIDATED"`, `duration` 600 | `status: "INTIMIDATED"`, `duration_ticks: 600` | nome do campo canônico |
| `"scope": "GROUP"` | `"scope": "LOCAL"` | `GROUP` não existe no DOC-02 |
| `half_life_ticks: 2400` | `1200` exato | valor DOC-02/PD-07; 2400 exigiria re-pinagem |
| `target_dc: 16` | mantido | dentro de `5..=25` |
| `LANGUAGE`/`INTELLIGENCE` | mantidos | nomes do overview; P-07 em aberto |

O exemplo histórico continua a ser um artefacto de referência, não um fixture. A reconciliação não
altera o CTR-01, o DOC-02 nem a decisão de produto sobre `GROUP`; apenas escolhe o vocabulário
canônico da fronteira do modelo. O exemplo usa `transfer_item`/`required_item`, que só são aceites
com `items_enabled=true`; no recorte DOC-02/PD-04 por omissão, uma proposta com itens é
`ItemEffectNotEnabled`.

## 4. Parse, validação e auditoria

### 4.1 Interfaces e tipos

```text
parse_proposal(raw: RawModelReply, schema: &RuleSchema) -> Result<RuleProposal, RuleError>
validate_rule(proposal: RuleProposal, facts: &ActionFacts, schema: &RuleSchema)
    -> Result<ValidatedRule, RuleError>
```

`parse_proposal` é puro: sem factos, sem I/O, sem relógio, sem RNG, sem rede e sem ambiente. Produz
`RuleProposal` com selectores simbólicos por resolver e sem proveniência. `validate_rule` é puro:
lê `ActionFacts`, liga selectores, verifica o mundo e produz `ValidatedRule`; não escreve, não
desenha, não chama modelo e não consome RNG.

| Tipo | Campos mínimos | Dono |
| --- | --- | --- |
| `RawModelReply` | `bytes`, `raw_digest` (BLAKE3-256), `model_id`, `prompt_version`, `finish_reason`, `truncated` | INT-12 |
| `RuleProposal` | `schema_version`, `action_label`, `attributes`, `target_dc`, `on_success`, `on_failure`, `propagation`, `raw_digest` | INT-08 |
| `ValidatedRule` | `schema_version`, `proposal_hash`, `action_label`, `check`, `bindings`, `success_effects`, `failure_effects`, `propagation`, `facts_hash`, `tick`, `revision`, `check_modifier`, `saturation_policies`, `validator_version` | INT-08 |
| `RuleError` | `stage`, `code`, `path`, `byte_offset`, `parameter`, `expected`, `actual_digest` | INT-08 |
| `RuleSchema` | `schema_id`, `schema_version`, `frame_version` e as constantes da §4.1.2 | INT-08 |
| `ProposalContext` | `region_id`, `actor`, `target?`, `intent`, `attributes`, `candidates`, `locale`, `prompt_version` | INT-12 |

`ValidatedRule.check` contém `target_dc` e os atributos usados; a resolução do check (`roll`,
`total`, `success`, `modifier`) chega em `ResolvedDraws.check`, produzida pelo INT-04/INT-07. `RuleError.stage`
é um de `FRAME`, `JSON`, `SCHEMA`, `SEMANTIC`, `MATERIALIZE`. O erro não inclui o texto bruto do
modelo na mensagem ao utilizador; inclui o caminho do campo, o deslocamento em bytes e o digest.
`RuleError` não é `retryable` por omissão: repetir a mesma resposta produz o mesmo erro.

#### 4.1.1 Projeções exigidas de `ActionFacts`

`ActionFacts` pertence ao INT-04 e NÃO é redefinido aqui. Este contrato exige que ele projete, no
mínimo:

| Grupo | Campos |
| --- | --- |
| Contexto | `tick`, `revision`, `region_id`, `actor`, `target?`, `intent`, `result_class`, `location`, `cell`, `facts_hash` |
| Atores | `alive`, `attributes`, `hp`, `hp_max`, `wallet`, `inventory`, `labels`, `statuses`, `relationships`, `rumor_copies` |
| Itens | `exists`, `holder`, `quantity`, `items_enabled` |
| Rumores | `exists`, `copies` com fidelidade por ator |
| Testemunhas | `bystanders` ordenados por `ActorId`, já filtrados por percepção/alcance/LOS |
| Check | `check_modifier: i16` no intervalo `-20..=20`, calculado pelo INT-04 a partir dos atributos e do alvo |
| Propagação | `rumor_seed_allowed: bool` |
| Moeda | `offer_currency: Option<u32>` (igual a `amount` quando usado; `None` quando `result_class!=1`) e `currency_transfer_allowed: bool` (falso ⇒ `IntentEffectMismatch`) |

Se um campo necessário faltar ou for inconsistente, o resultado é `MissingFact`; o consumidor NÃO
PODE inventar, inferir de overlay ou ler o mundo por outra via. A lista de `bystanders` é imutável
durante a validação e a materialização: se mudar entre as duas, é `StaleFacts`. `items_enabled=false`
é o default do recorte DOC-02/PD-04; nesse caso qualquer `transfer_item`/`required_item` é
`ItemEffectNotEnabled`.

#### 4.1.2 Constantes de schema

| Constante | Valor v1 | Nota |
| --- | --- | --- |
| `schema_id` | `af.rule-proposal` | identidade do schema |
| `schema_version` | `1` | obrigatório no payload |
| `frame_version` | `1` | dialeto da §2, com `</parameter=>` |
| `check_die` | `20` | escala d20; `roll` em `1..=20` no `ResolvedCheck` |
| `check_modifier_min/max` | `-20` / `20` | guarda de validação; a fórmula é do INT-04 |
| `target_dc_min/max` | `5` / `25` | inclusive |
| `amount_bp_min/max` | `-10000` / `10000` | inclusive; zero é `ZeroDelta` |
| `duration_ticks_max` | `525600` | decisão de freeze; ver §10 |
| `initial_fidelity_bp` | `10000` | semente DOC-02/PD-07 |
| `half_life_ticks` | `1200` | constante DOC-02/PD-07 |
| `min_cognition_bp` | `4000` | constante DOC-02/PD-07 |
| `max_quantity` | `2147483647` | `i32::MAX` |
| `max_effects` | `8` | por ramo |
| `max_labels` | `3` | por ramo |
| `status_catalog_version` | `1` | §3.8.4 |
| `label_catalog_version` | `1` | §3.8.3 |
| `attribute_catalog_version` | `1` | §3.8.1 |
| `effect_catalog_version` | `1` | §3.8.5 |

Qualquer alteração a estes valores é uma alteração de schema e exige revisão; não há override por
ambiente, ficheiro de configuração ou prompt. O modificador de check tem guarda `-20..=20`; a
derivação concreta (soma de atributos, divisão, arredondamento) é dependência aberta do INT-04 e
está registada em F-13.

### 4.2 Erros de framing e JSON

| Código | Quando |
| --- | --- |
| `EmptyReply` | zero bytes após aparar whitespace |
| `PayloadTooLarge` | mais de 65536 bytes |
| `InvalidUtf8` | sequência UTF-8 inválida |
| `ForbiddenByte` | BOM, NUL ou controlo não permitido |
| `MissingCall` | nenhum `<tool_call>` |
| `MultipleCalls` | dois ou mais `<tool_call>` |
| `UnknownTool` | função diferente de `propose_emergent_action` |
| `MalformedFrame` | marcador divergente, fecho errado, atributo citado |
| `TruncatedFrame` | chamada, função, parâmetro ou fecho incompleto |
| `TruncatedReasoning` | `<think` sem `</think` |
| `DuplicateReasoning` | dois blocos de raciocínio |
| `ReasoningTooLarge` | raciocínio acima de 8192 bytes |
| `PreambleNotAllowed` | texto antes de `<tool_call>` ou de `<think` |
| `TrailingContent` | texto não vazio depois de `</tool_call>` |
| `UnknownParameter` | nome fora do conjunto canônico/alias |
| `DuplicateParameter` | campo repetido, incluindo alias + canônico |
| `MalformedParameter` | nome vazio, com espaço, aspas ou `=` |
| `MissingParameter` | campo obrigatório ausente |
| `TooManyParameters` | mais de sete parâmetros |
| `MarkerInValue` | marcador de framing dentro de valor ou raciocínio |
| `ForbiddenXmlConstruct` | `DOCTYPE`, `ENTITY`, `CDATA`, comentário, PI ou declaração XML |
| `InvalidEscape` | escape Unicode não permitido no campo |
| `JsonSyntax` | JSON malformado, vírgula final ou comentário |
| `JsonDepthExceeded` | profundidade > 6 |
| `JsonDuplicateKey` | chave repetida no mesmo objeto |
| `JsonNonIntegerNumber` | decimal, expoente, hexadecimal ou `-0` |
| `JsonNumberOutOfRange` | inteiro fora do tipo do campo |

### 4.3 Erros de schema e semântica

| Código | Quando |
| --- | --- |
| `MissingParameter` | parâmetro obrigatório ausente, incluindo `schema_version` |
| `UnsupportedSchemaVersion` | versão presente e diferente de `1` |
| `UnknownField` | chave não declarada, exceto nomes reservados de proveniência |
| `ProvenanceFieldForbidden` | qualquer nome do conjunto reservado da §3.2.1, como parâmetro ou chave JSON; verificado antes de `UnknownParameter`/`UnknownField` |
| `MissingField` | chave obrigatória ausente dentro de um objeto já parseado |
| `WrongType` | tipo JSON errado, incluindo `null` |
| `InvalidActionLabel` | token fora de `[A-Za-z0-9_.-]{1,64}` |
| `DcOutOfRange` | `target_dc` fora de `5..=25` |
| `UnknownAttribute` | nome fora da §3.8.1 |
| `DuplicateAttribute` | primário e secundário iguais no mesmo lado |
| `UnknownAxis` | eixo fora da §3.8.2 |
| `UnknownLabel` | rótulo fora da §3.8.3 |
| `UnknownStatus` | estado fora da §3.8.4, incluindo reservados |
| `UnknownEffect` | `kind` fora do allowlist |
| `UnsupportedSaturation` | `authorized_saturation` num kind que não o aceita |
| `AmountOutOfRange` | `amount_bp` fora de `-10000..=10000`; zero é `ZeroDelta` |
| `ZeroDelta` | delta de relação ou HP igual a zero |
| `HpDeltaOutOfRange` | `delta_hp.amount` fora de `-1000000..=1000000` |
| `EmptyEffectSet` | `on_success.effects` vazio |
| `DurationOutOfRange` | `duration_ticks` fora de `1..=525600` |
| `InvalidCheckModifier` | `facts.check_modifier` fora de `-20..=20`; ausente é `MissingFact` |
| `ArithmeticOverflow` | soma inteira na validação excedeu o tipo |
| `EffectCountExceeded` | mais de oito efeitos num ramo |
| `LabelCountExceeded` | mais de três `attach_label` num ramo |
| `DuplicateLabel` | mesmo alvo e rótulo duas vezes |
| `DuplicateStatus` | mesmo alvo e estado duas vezes |
| `DuplicateItemEffect` | mesmo item e par `from/to` duas vezes |
| `DuplicateRelationshipEffect` | mesmo `(actor,target,axis)` duas vezes |
| `DuplicateCurrencyEffect` | duas transferências de moeda no mesmo ramo, qualquer par `from/to` |
| `DuplicateRumorEffect` | mesma testemunha e rumor duas vezes |
| `InvalidSelector` | seletor desconhecido, ID numérico ou `region` como alvo |
| `InvalidId` | item/rumor não inteiro positivo |
| `UnknownScope` | escopo fora de `LOCAL`/`REGIONAL`; `GROUP` incluído |
| `UnsupportedPropagation` | `requires_living_carrier=false` ou bloco inválido |
| `PropagationNotApplicable` | `rumor_seed_allowed=false` |
| `PropagationBudgetMismatch` | `initial_fidelity_bp != 10000`, `half_life_ticks != 1200` ou `min_cognition_bp != 4000` |
| `SelfTransfer` | `from` e `to` iguais |
| `SelfTarget` | alvo relacional/rótulo/rumor igual ao ator |
| `ActorNotFound` | ator ausente dos factos |
| `ActorDead` | ator morto |
| `TargetNotFound` | alvo ausente quando o seletor o exige |
| `TargetDead` | alvo morto |
| `TargetOutOfReach` | alvo fora de alcance/LOS |
| `MissingPossession` | `required_item` não está com o ator |
| `ItemEffectNotEnabled` | `items_enabled=false` e a proposta usa item |
| `ItemNotFound` | item inexistente |
| `ItemNotHeld` | item não está com `from` |
| `QuantityOutOfRange` | quantidade insuficiente ou acima do estoque |
| `ItemAlreadyHeld` | `to` já tem o mesmo `ItemId` |
| `InsufficientCurrency` | carteira de `from` insuficiente |
| `IntentEffectMismatch` | `transfer_currency` com intent diferente de `NEGOTIATE`/`INFORM_PATH`, `result_class!=1` com oferta/efeito, direção `from!=actor`/`to!=target`, `offer_currency` `None`/`Some(0)`/diferente do `amount`, `currency_transfer_allowed=false`, presença em `on_failure`, ou ausência/presença indevida quando `result_class=1` e a oferta existe |
| `WalletOverflow` | carteira de `to` acima de `10000` |
| `RumorNotFound` | rumor inexistente |
| `RumorNotKnown` | ator sem cópia ativa |
| `RumorFidelityMismatch` | `amount_bp` diferente da fidelidade da cópia de origem |
| `RumorFidelityTooLow` | cópia abaixo de `min_cognition_bp` |
| `StatusAlreadyPresent` | estado já presente no alvo |
| `LethalDamageNotAuthorized` | dano levaria o alvo a menos de 1 |
| `ClampNotAuthorized` | soma de relação ou cura fora do intervalo sem `authorized_saturation` |
| `CheckResolutionMissing` | `ResolvedDraws.check` ausente |
| `CheckMismatch` | `roll`/`total`/`target_dc`/`modifier`/`success` incoerentes |
| `MissingFact` | projeção necessária ausente |
| `StaleTarget` | alvo mudou entre contexto e validação |
| `StaleFacts` | `facts_hash`/`revision` divergente |
| `OverlayNotKnowledge` | tentativa de usar overlay/silhueta como facto |

### 4.4 Rejeição versus saturação autorizada

A regra é **rejeitar por omissão**. Nenhum valor é ajustado ao intervalo sem uma autorização
explícita no payload e sem registo de auditoria. A tabela separa o que nunca é clamp do que pode ser
saturado.

| Situação | Resultado | Código |
| --- | --- | --- |
| `target_dc` fora de `5..=25` | rejeita | `DcOutOfRange` |
| `amount_bp` fora de `-10000..=10000` | rejeita | `AmountOutOfRange` |
| `delta_hp.amount` fora de `-1000000..=1000000` | rejeita | `HpDeltaOutOfRange` |
| `on_success.effects` vazio | rejeita | `EmptyEffectSet` |
| `amount_bp` igual a zero | rejeita | `ZeroDelta` |
| `duration_ticks` fora de `1..=525600` | rejeita | `DurationOutOfRange` |
| orçamento de propagação diferente de 10000/1200/4000 | rejeita | `PropagationBudgetMismatch` |
| `scope=GROUP` | rejeita | `UnknownScope` |
| `requires_living_carrier=false` | rejeita | `UnsupportedPropagation` |
| soma de relação fora de `-10000..=10000`, sem flag | rejeita | `ClampNotAuthorized` |
| soma de relação fora do intervalo, com `authorized_saturation=true` | satura no limite, regista | aceite com `AUTHORIZED_SATURATION` |
| cura acima de `hp_max`, sem flag | rejeita | `ClampNotAuthorized` |
| cura acima de `hp_max`, com flag | satura em `hp_max`, regista | aceite com `AUTHORIZED_SATURATION` |
| dano que levaria a HP < 1 | rejeita sempre | `LethalDamageNotAuthorized` |
| carteira de destino acima de `10000` | rejeita | `WalletOverflow` |
| item já com o destino | rejeita | `ItemAlreadyHeld` |
| estado já presente | rejeita | `StatusAlreadyPresent` |
| item usado com `items_enabled=false` | rejeita | `ItemEffectNotEnabled` |
| moeda com intent, `result_class!=1` com oferta/efeito, direção, oferta, ramo ou presença/ausência incoerentes | rejeita | `IntentEffectMismatch` |
| duas transferências de moeda no mesmo ramo, qualquer par | rejeita | `DuplicateCurrencyEffect` |
| DC/duração/quantidade/escopo fora do limite | nunca satura | rejeição |

Regras de saturação:

1. `authorized_saturation` é um pedido do modelo, não uma autorização do núcleo. A validação só a
   aceita se o schema e o núcleo permitirem a política e se o delta proposto for ele próprio válido.
   Um delta inválido é rejeitado mesmo com a flag.
2. A saturação só pode tornar um valor **válido mas fora do intervalo de domínio** num valor de
   fronteira. Nunca transforma um alvo morto, um item inexistente, uma posse ausente ou um DC
   inválido em aceite.
3. A validação calcula `old + delta` a partir de `ActionFacts` e é o **primeiro** estágio que pode
   detectar a saturação; devolve `ClampNotAuthorized` quando a flag falta. A materialização repete a
   verificação na staging e devolve o mesmo código, com `stage=MATERIALIZE`, se os factos tiverem
   mudado. Não existe um segundo código para o mesmo caso. A soma é verificada com aritmética
   inteira antes de qualquer ramo; overflow é `ArithmeticOverflow`, nunca saturação.
4. Cada saturação produz um registo com `requested_amount`, `effective_amount`,
   `saturation_policy`, `saturation_axis`, `rule_id` e `planned_fact_seq`. O efeito no `EffectSet`
   usa o valor efetivo; o pedido original fica na auditoria. Isto satisfaz o requisito do CTR-01 de
   registar delta pedido, valor final, regra/política e `fact_seq`.
5. O `EffectSet` pode omitir um efeito cujo delta efetivo seja zero (por exemplo, relação já no
   limite), com `no_effect_reason=SATURATED_TO_ZERO`; não é um clamp silencioso.
6. O mapeamento `score`→DC do System One (§6.3) é uma tabela total, não um clamp: um score fora de
   `1..=5` é resposta inválida, não um DC ajustado.

### 4.5 Atomicidade e tratamento de erro

1. O parse e a validação param no primeiro erro. Não há resultado parcial, lista de erros acumulados
   ou efeito aplicado "até falhar".
2. `parse_proposal` e `validate_rule` não têm efeitos colaterais: não escrevem `WorldState`, não
   incrementam `Tick`, não consomem `Seed`, não criam `fact_seq` e não escrevem no save.
3. Uma proposta rejeitada é um resultado normal do sistema, registado em auditoria (§4.6); não é
   `panic`, `unwrap` ou exceção não tratada. O utilizador recebe uma mensagem genérica; o texto do
   modelo não é reproduzido na UI.
4. Se a auditoria de uma proposta aceite não puder ser escrita, o commit falha e o efeito não é
   aplicado; a auditoria faz parte da durabilidade da ação aceite.
5. `validate_rule` verifica `facts_hash`/`revision`; uma regra validada para outra revisão é
   `StaleFacts` e não pode ser materializada. Não há "revalidar por baixo" sem nova validação.

### 4.6 Proveniência e auditoria

A proveniência é **host-side**. O modelo não a fornece, não a pode influenciar e não a vê no
payload. Os campos abaixo são anexados pelo host ao registo de auditoria, nunca ao `RuleProposal`.

| Campo | Origem | Nota |
| --- | --- | --- |
| `proposal_id` | host | monotónico por save/região |
| `rule_id` | host | derivado do hash canônico da proposta |
| `schema_id`/`schema_version`/`frame_version` | host | versão usada no parse |
| `model_id`/`model_sha256` | manifesto do modelo | sem pesos no save |
| `prompt_version`/`prompt_hash` | host | BLAKE3-256 do template |
| `cassette_id` | host | obrigatório em teste/replay |
| `seed`/`temperature` | amostragem do modelo | não são o `Seed` do núcleo |
| `request_id` | host | correlação com o transporte |
| `tick`/`revision`/`region_id` | factos | contexto da ação |
| `actor_id`/`target_id` | factos | ligação dos selectores |
| `facts_hash` | factos | BLAKE3-256 da projeção |
| `raw_digest`/`raw_reply_bytes` | host | digest BLAKE3-256 e tamanho |
| `parse_status`/`validation_status` | host | aceite/rejeitado |
| `error_stage`/`error_code` | host | quando rejeitado |
| `rule_content_hash` | host | BLAKE3-256 do `ValidatedRule` |
| `effect_set_hash` | host | BLAKE3-256 do `EffectSet` |
| `planned_fact_seq` | host | sequência do facto; verificado no commit |
| `requested_amount`/`effective_amount` | host | por efeito saturado |
| `saturation_policy`/`saturation_axis` | host | por efeito saturado |
| `validator_version` | host | versão do validador |

Regras de auditoria:

1. Uma proposta aceite é registada na **mesma transação durável** que a revisão e o `fact_seq` da
   ação. O `planned_fact_seq` é o próximo valor e é verificado no commit; se divergir, a transação
   falha e nada é publicado. O nome `fact_seq` só aparece no facto já publicado.
2. Uma proposta rejeitada é registada numa transação própria, com `planned_fact_seq=0`, sem efeito,
   sem tick e sem RNG. O registo inclui estágio, código, caminho, `raw_digest` e tamanho; o texto
   bruto pode ser guardado como blob local para diagnóstico, com retenção definida pelo host.
3. `raw_digest` é o mesmo digest de 32 bytes (BLAKE3-256) que o CTR-02 regista como entrada externa;
   não há duas verdades sobre o que o modelo devolveu. Não existe campo `raw_reply_sha256`.
4. A auditoria NÃO faz parte do `WorldState`, NÃO entra no hash canônico, NÃO é reproduzida pelo
   replay e NÃO é necessária para reconstruir o mundo. Pode ser rotacionada ou apagada sem alterar
   o estado; a ausência de um registo de rejeição não altera o hash.
5. Não há relógio de parede no registo. O tempo é `tick`/`revision`; um timestamp local, se
   existir, fica fora do registo durável e não é autoritativo.
6. Não são guardados segredos, chaves, pesos, prompts completos de sistema ou dados pessoais. O
   `prompt_hash` identifica o template sem o armazenar.
7. O modelo NÃO PODE enviar qualquer nome do conjunto reservado da §3.2.1, como parâmetro ou chave
   JSON; a presença de qualquer um é sempre `ProvenanceFieldForbidden`, verificada antes de
   `UnknownParameter`/`UnknownField`, e nunca `UnknownField`.

## 5. Materialização de efeitos

### 5.1 Interface e desenhos

```text
materialize(rule: &ValidatedRule, facts: &ActionFacts, draws: &ResolvedDraws)
    -> Result<EffectSet, RuleError>
```

`ResolvedDraws` é uma **vista read-only exigida por este contrato**, montada pelo host a partir da
resolução nativa/social. Este contrato NÃO aloca desenhos, streams ou domínios e NÃO lê `RngState`.
Campos exigidos:

| Campo | Regra |
| --- | --- |
| `check` | exatamente um `ResolvedCheck`; ausente é `CheckResolutionMissing` |
| `facts_hash`/`revision` | eco da revisão usada; divergência é `StaleFacts` |
| `draw_refs` | referências para auditoria; não alteram a materialização |

`ResolvedCheck` é produzido pelo INT-04/INT-07 (resolução social/nativa), não pelo materializador:

| Campo | Regra |
| --- | --- |
| `success` | booleano final do check |
| `roll` | inteiro `1..=20` |
| `total` | inteiro; DEVE ser `roll + modifier` |
| `target_dc` | inteiro `5..=25`; DEVE ser igual a `rule.check.target_dc` |
| `modifier` | inteiro `-20..=20`; DEVE ser igual a `facts.check_modifier` |

O materializador NÃO cria, promove ou rebobina desenhos e NÃO calcula a fórmula do check; verifica a
coerência do `ResolvedCheck` e escolhe o ramo. A ausência do check é `CheckResolutionMissing`; uma
incoerência de `roll`/`total`/`target_dc`/`modifier`/`success` é `CheckMismatch`. O contrato exige
que o INT-04/INT-07 forneça esta resolução; enquanto não existir, a materialização falha fechada com
`CheckResolutionMissing` e não adivinha um índice. Esta dependência está em F-13.

### 5.2 Check e seleção de ramo

1. `check = draws.check`; se ausente, `CheckResolutionMissing`.
2. Verifica `1 <= check.roll <= 20`; `check.target_dc == rule.check.target_dc`;
   `check.modifier == facts.check_modifier`; `check.total == check.roll + check.modifier`;
   `check.success == (check.total >= check.target_dc)`. Qualquer desvio é `CheckMismatch`.
3. `facts.check_modifier` é calculado pelo INT-04 a partir dos atributos primário/secundário do ator
   e do alvo. A fórmula concreta é dependência aberta do INT-04 (F-13); este contrato fixa apenas a
   guarda `-20..=20`. Se faltar, é `MissingFact`; fora da guarda é `InvalidCheckModifier`.
4. O ramo escolhido é `on_success` quando `check.success=true` e `on_failure` caso contrário. O ramo
   não escolhido não é materializado e não produz efeitos, mas o seu conteúdo já foi validado.
5. Não há crítico, falha automática, empate especial ou segundo desenho; `target_dc` é o DC
   validado, não um valor recalculado a partir de `score` ou de atributos.

### 5.3 Resolução, expansão e staging

1. Os templates são processados na ordem do payload. Um template com `bystanders` expande na posição
   do template, pela ordem ascendente de `ActorId` da lista ligada em `ValidatedRule`.
2. Cada efeito bound é aplicado a uma **cópia de staging** dos factos, na ordem de expansão. A cópia
   não é o mundo e não é escrita; serve para calcular valores efetivos e detectar conflitos.
3. `transfer_item`: verifica `items_enabled`, posse/quantidade na staging, decrementa a origem e
   incrementa o destino. Duplicação de `ItemId` foi decidida na validação (`DuplicateItemEffect`).
   O item não é clonado; a identidade conserva-se.
4. `delta_relationship`: `raw = old + amount_bp`. Se `raw` estiver em `-10000..=10000`, aplica o
   delta exato. Se estiver fora e `authorized_saturation=true`, satura no limite e regista
   `requested`/`effective`. Se estiver fora sem flag, `ClampNotAuthorized`. O delta proposto tem de
   ser válido antes da soma.
5. `delta_hp`: `raw = old + amount`. Cura acima de `hp_max` satura em `hp_max` apenas com flag; sem
   flag é `ClampNotAuthorized`; dano que leve a menos de 1 é sempre `LethalDamageNotAuthorized`.
6. `attach_label`, `apply_status`, `transfer_currency` e `propagate_rumor` reexecutam na staging
   apenas existência, posse, carteira, HP, fidelidade, intenção, ramo e alvo; duplicados, catálogo e
   intervalos já foram decididos na validação e NÃO são reavaliados aqui. Não há criação implícita de
   rumor. `transfer_currency` exige `from=actor`, `to=target`, `offer_currency=Some(amount)`,
   `result_class=1`, `currency_transfer_allowed=true`, intent `NEGOTIATE`/`INFORM_PATH` e presença
   apenas em `on_success`, exatamente uma quando a oferta existe; qualquer desvio é
   `IntentEffectMismatch`.
7. `propagate_rumor` não escolhe a perda: usa a fidelidade da cópia de origem validada e deixa a
   aplicação de `TRANSFER_LOSS_BP` e as testemunhas para o SOC-03. Um `amount_bp` diferente da
   fidelidade de origem é `RumorFidelityMismatch`.
8. Um efeito cujo valor efetivo é zero (saturação no limite, delta anulado) é omitido do `EffectSet`
   com `no_effect_reason=SATURATED_TO_ZERO` e registado em auditoria; a contagem final pode ser
   menor que a dos templates.
9. Se a expansão ultrapassar oito efeitos, é `EffectSetOverflow`. Conflitos de conservação
   (carteira inconsistente, HP impossível) são `EffectConflict`; duplicados de item/moeda foram
   decididos na validação. Não há aplicação parcial: o conjunto inteiro é rejeitado.
10. Um ramo de sucesso com apenas templates de testemunhas pode materializar zero efeitos; o
    `EffectSet` fica vazio com `no_effect_reason=NO_ELIGIBLE_BYSTANDER`. Um ramo de sucesso sem
    templates é impossível pelo schema.

### 5.4 Pureza, determinismo e 1 bp

1. `materialize` não faz I/O, não abre ficheiros, não lê rede/ambiente/relógio, não usa RNG, não
   consulta o modelo, não escreve no mundo e não altera `ActionFacts`.
2. Não há `HashMap` na saída; a ordem é a do payload e a de `bystanders` por `ActorId`. Não há
   `f32`/`f64` em nenhum cálculo. Toda a aritmética é inteira e verificada.
3. `amount_bp` atravessa parse → validação → materialização → `EffectSet` → CTR-01 sem divisão,
   percentagem, Q16.16 ou arredondamento. Um delta de `1` bp permanece `1` bp; um delta de `-1` bp
   permanece `-1` bp.
4. As mesmas entradas (`ValidatedRule`, `ActionFacts`, `ResolvedDraws`) produzem o mesmo `EffectSet`
   e o mesmo `effect_set_hash` em qualquer máquina, execução ou ordem de validação.
5. `EffectSet` contém: `branch`, `effects` (valores CTR-01 canônicos, na ordem), `effect_set_hash`,
   `saturation_records`, `no_effect_reason: Option<NoEffectReason>`, `facts_hash`, `revision`,
   `rule_content_hash`. `NoEffectReason` é o enum fechado
   `NO_ELIGIBLE_BYSTANDER | SATURATED_TO_ZERO`; não há outros valores.
6. `effect_set_hash` é BLAKE3-256 sobre `schema_version || branch || effect_count ||` a codificação
   canônica CTR-01 de cada efeito, seguida dos registos de saturação. Não inclui tick, ator, path ou
   texto; esses ficam na auditoria.

### 5.5 Dry-run e commit

1. O dry-run chama `validate_rule` e `materialize` sobre a revisão atual e devolve uma prévia com
   `rule_content_hash`, `effect_set_hash`, `effects`, `check` e `saturation_records`. Não promove o
   cursor de desenhos (`position_before == position_after`) e não escreve.
2. O commit usa a `ValidatedRule` e o `EffectSet` exatos da prévia, com os desenhos registados. NÃO
   reparseia a resposta do modelo e NÃO volta a pedir ao modelo.
3. Se a revisão mudou entre a prévia e o commit, o núcleo revalida uma vez contra a nova revisão. Se
   o alvo, a posse, as testemunhas ou o `facts_hash` mudaram, é `StaleFacts`/`StaleTarget`; não há
   commit "quase igual".
4. Se a re-materialização produzir um `effect_set_hash` diferente do da prévia, é
   `PreviewDiverged`; o commit falha e nada é aplicado.
5. O commit promove o cursor de desenhos uma vez, atribui `fact_seq` e escreve o efeito, a revisão e
   a auditoria na mesma transação. Falha de qualquer parte reverte o conjunto.
6. `validate_rule` e `materialize` não são chamados duas vezes com políticas diferentes; a
   `saturation_policy` usada na prévia é a mesma do commit.

### 5.6 Erros de materialização

| Código | Estágio | Quando |
| --- | --- | --- |
| `CheckResolutionMissing` | M | `ResolvedDraws.check` ausente |
| `CheckMismatch` | M | `roll`/`total`/`target_dc`/`modifier`/`success` incoerentes |
| `InvalidCheckModifier` | V/M | modificador fora de `-20..=20` (ausente é `MissingFact`) |
| `EffectSetOverflow` | M | mais de oito efeitos após expansão |
| `EffectConflict` | M | conflito entre efeitos na staging |
| `ClampNotAuthorized` | V/M | saturação ausente numa soma que a exigia |
| `LethalDamageNotAuthorized` | V/M | dano efetivo levaria a HP < 1 |
| `WalletOverflow` | V/M | carteira efetiva acima de 10000 |
| `InsufficientCurrency` | V/M | saldo efetivo insuficiente |
| `IntentEffectMismatch` | V/M | intent/oferta/direção/gate/ramo de moeda incoerentes; `result_class!=1` com oferta/efeito |
| `DuplicateCurrencyEffect` | V | duas transferências de moeda no mesmo ramo, qualquer par |
| `DuplicateItemEffect` | V | duas transferências do mesmo item no mesmo ramo |
| `ItemEffectNotEnabled` | V/M | item usado com `items_enabled=false` |
| `ItemNotFound` | V/M | item ausente na staging |
| `ItemNotHeld` | V/M | item não está com a origem |
| `ItemAlreadyHeld` | V/M | destino já tem o item |
| `QuantityOutOfRange` | V/M | stock efetivo insuficiente |
| `MissingPossession` | V/M | `required_item` não está com o ator |
| `StatusAlreadyPresent` | V | estado já presente |
| `RumorNotFound` | V/M | rumor ausente na staging |
| `RumorNotKnown` | V/M | origem sem cópia ativa |
| `RumorFidelityTooLow` | V/M | cópia abaixo do limiar |
| `RumorFidelityMismatch` | V/M | fidelidade de origem diferente do `amount_bp` |
| `ActorDead`/`TargetDead` | M | ator/alvo morreu entre validação e materialização |
| `StaleTarget` | M | alvo mudou entre validação e materialização |
| `PreviewDiverged` | M | hash da prévia diferente do commit |
| `StaleFacts` | M | revisão mudou |
| `ArithmeticOverflow` | V/M | soma inteira excedeu o tipo |

`V` = validação (não reemitido na materialização); `M` = materialização; `V/M` = pode ser reemitido
pela staging se os factos mudaram. Duplicados, catálogo, intervalos, DC e cardinalidade são `V`-only.
A staging reexecuta existência, posse, carteira, HP, fidelidade, intenção, ramo e alvo; se os factos
mudaram, emite também `ActorDead`, `TargetDead`, `StaleTarget` ou `StaleFacts`. Um erro de
conservação é `EffectConflict`; não existe um segundo código para o mesmo caso.

## 6. Portas de modelo

### 6.1 `SystemOnePort`

```text
decide(state: &DecisionState, questions: &[TypedQuestion])
    -> Result<DecisionAnswers, ModelError>
```

`DecisionState` é um estado factual limitado, sem prosa, sem instruções e sem overlay; é dado, não
prompt. `TypedQuestion` tem `id` (`1..=16`, único e ascendente), `kind` (`NOUL`, `CHOICE`, `SCORE`),
`prompt` (texto do host, limitado a 512 bytes) e, conforme o kind, `options` ou `levels`.

| Kind | Resposta normalizada | Regra |
| --- | --- | --- |
| `NOUL` | `NO` ou `UNKNOWN` | primitivo negativo/ausente; uma pergunta afirmativa usa `CHOICE` |
| `CHOICE` | um código de opção, incluindo `OTHER`/`NONE` quando aplicável | opção fora da lista é inválida |
| `SCORE` | nível inteiro `1..=5` | sem `0`, `6`, decimal ou `NaN` |

1. No máximo 16 perguntas por chamada; `id` repetido é `DuplicateQuestion`; mais de 16 é
   `TooManyQuestions`.
2. `OTHER` e `NONE` são opções explícitas com códigos reservados; não são um "catch-all" para uma
   opção desconhecida. Uma opção não listada é `MalformedAnswer` e leva a abstenção.
3. `DecisionAnswers` contém respostas finitas, `confidence_bp` inteiro `0..=10000`, `margin_bp`
   inteiro `0..=10000` (diferença entre a probabilidade mais alta e a segunda mais alta, em bp;
   para `NOUL`/`SCORE` sem distribuição, `margin_bp=10000`), `abstain` opcional com razão
   `TIMEOUT`, `UNAVAILABLE`, `MALFORMED`, `LOW_CONFIDENCE` ou `OTHER`, e o `raw_digest`. Não contém
   floats.
4. Probabilidades do fornecedor podem chegar como `f32` na fronteira, mas são convertidas
   imediatamente para bp inteiros com arredondamento "meio para longe de zero" e normalização por
   maior resto para somar 10000. `NaN`, `Inf`, negativo, `>1` ou soma zero são `MalformedAnswer` ou
   abstenção; nenhum float atravessa a porta para o estado.
5. Um timeout ou indisponibilidade produz abstenção, não uma exceção; o núcleo continua com a ação
   nativa e não consome tick/RNG pela chamada falhada.

### 6.2 Normalização de `NOUL`

`NO` quando o primitivo devolve uma resposta negativa com confiança; `UNKNOWN` quando devolve
nulo/ausente, quando a confiança é insuficiente ou quando o fornecedor não responde. `UNKNOWN` leva a
`review`/abstenção; nunca é convertido em `YES`. Uma pergunta que precise de uma afirmação usa
`CHOICE` com opções explícitas.

### 6.3 Faixas e `score`→DC

| Faixa | Condição | Efeito |
| --- | --- | --- |
| `act` | confiança ≥ `8000` bp, `margin_bp` ≥ `1000` e resposta não ambígua | host pode agir |
| `review` | confiança `5000..=7999` bp ou `margin_bp` < `1000` | host revê/abstem |
| `abstain` | confiança < `5000` bp, `UNKNOWN`, `OTHER`, `NONE`, timeout ou inválido | sem decisão |

`margin_bp` é o campo da §6.1.3: diferença entre a opção mais provável e a segunda, em bp, após
normalização; é `10000` quando só existe uma resposta possível (`NOUL`/`SCORE`). A faixa da chamada
é a **pior** faixa entre as respostas: `act` só se todas forem `act`; `abstain` se qualquer for
`abstain`; caso contrário `review`. A tabela `score`→DC é total e fixa: `1→5`, `2→10`, `3→15`,
`4→20`, `5→25`; não há clamp. Um `score` fora de `1..=5` é resposta inválida, não um DC saturado.

### 6.4 `LlmPort`

```text
propose_rule(context: &ProposalContext) -> Result<RawModelReply, ModelError>
render_narrative(context: &NarrativeContext) -> Result<RawModelReply, ModelError>
```

1. A porta transporta bytes e metadados; não faz parse, não valida, não aplica e não escolhe efeitos.
2. `propose_rule` recebe `ProposalContext` (INT-12), impõe `MAX_REPLY_BYTES`, timeout, identidade do
   modelo e versão do prompt; o parser reimpõe os limites e é a única autoridade sobre a forma.
3. `render_narrative` devolve bytes de narrativa; a NLG (§7) faz o parse do formato de narrativa. O
   parser de propostas não é reutilizado para narrativa.
4. Uma resposta truncada (`finish_reason=length` ou `truncated=true`) é entregue como
   `RawModelReply` e rejeitada pelo parser (`TruncatedFrame`); a porta não "completa" a resposta.
5. A porta não tem estado autoritativo, não escreve no save e não altera o mundo.

### 6.5 Fakes, cassettes e modo live

1. `FakeSystemOne` e `FakeLlm` implementam as mesmas portas e são usados em todos os testes de PR.
2. Uma cassette regista `request_hash`, `model_id`, `prompt_version`, `seed`, `temperature`,
   `raw_reply`, `normalized_answers` e `cassette_id`; o replay verifica o `request_hash` e falha se a
   prompt mudou. A cassette é um fixture de teste, não estado de jogo.
3. O modo live só é ativado por flag explícita do host, nunca por omissão, e só usa loopback. Testes
   live são `#[ignore]` e de execução manual/nightly; nenhum teste de PR depende de rede, GPU, pesos
   ou relógio real.
4. A suite de contrato corre contra fake e contra live (live ignorado por omissão), com os mesmos
   casos normalizados; uma divergência de normalização é bug da porta, não do teste.

## 7. NLG preguiçosa

### 7.1 `build_context`

```text
build_context(events: &[ConversationFact], request: &NarrativeRequest)
    -> Result<NarrativeContext, NlgError>
```

1. `build_context` é puro e só lê os factos fornecidos; não lê o mundo atual, a câmara, a UI ou o
   overlay. O contexto é derivado do facto e das suas âncoras, não do presente.
2. `NarrativeRequest` inclui `fact_seq`, `locale` BCP-47, `perspective`, identidade do modelo e
   `anchor` (`tick`, `revision`, `state_hash`). Sem âncora é `MissingAnchor`.
3. `NarrativeContext` inclui `context_version=1`, `fact_seq`, `origin_tick`, `anchor_tick`,
   `anchor_revision`, `anchor_state_hash`, `locale`, `perspective`, `fact_flags` (`DIRECT`/
   `RETOLD`), `facts`, `ledger` (claims derivadas dos factos), `ledger_hash` e `identity`. Não
   inclui prosa.
4. O contexto respeita `DIRECT`/`RETOLD`: um facto recontado não é apresentado como testemunho
   direto; `perspective` e `fact_flags` fazem parte do contexto e do cache key.
5. Limites do contexto: até 16 factos, 32 claims e 16 KiB de JSON canónico (sem prosa). Acima disso
   é `ContextTooLarge`; não há truncagem silenciosa. O limite de 8 KiB de prosa pertence à resposta
   do modelo (§7.2), não ao contexto.
6. `ledger_hash` é BLAKE3-256 sobre a codificação canônica do ledger (claims ordenadas e os seus
   campos), calculado pelo host antes da geração. É esse hash que entra no cache key, não as claims
   do modelo.

### 7.2 Prosa e claims separadas

O modelo devolve um objeto JSON fechado:

```json
{
  "narrative_version": 1,
  "prose": "Texto em português, sem HTML.",
  "claims": [
    {
      "kind": "item_transferred",
      "item": 1001,
      "from": 1,
      "to": 2,
      "quantity": 1
    }
  ]
}
```

1. `narrative_version` é `1`; `prose` é string UTF-8 de 1..8192 bytes, sem `<`, `>`, `script`,
   caminho, URL ou marcador de tool call; `claims` é um array fechado de 0..32 objetos.
2. Os kinds de claim são fechados: `item_transferred`, `hp_changed`, `label_attached`,
   `status_applied`, `relationship_changed`, `currency_transferred`, `rumor_shared`, `actor_moved`,
   `location`, `death`. `death` só é válido se o facto contiver morte; em v1 não há morte, pelo que
   qualquer claim `death` é `UnsupportedClaim`.
3. Cada claim tem exatamente os campos do seu kind, com IDs inteiros, rótulos/estados canônicos e
   quantidades inteiras. Não há texto livre, opinião, intenção ou previsão.
4. As claims podem ser fornecidas pelo modelo ou derivadas pelo host a partir do ledger. O host
   compara-as com o ledger e rejeita claims não suportadas; uma claim do modelo nunca é aceite por
   si só.
5. A prosa e as claims são campos separados; a prosa nunca é analisada como JSON e as claims nunca
   são concatenadas na prosa.

### 7.3 `verify_claims`

```text
verify_claims(claims: &NarrativeClaims, facts: &NarrativeContext)
    -> Result<VerifiedNarrative, NlgError>
```

1. Verifica que cada claim corresponde a um facto/efeito do ledger: item, direção, quantidade, HP,
   rótulo, estado, relação, moeda, rumor, movimento ou localização. Claim sem suporte é
   `UnsupportedClaim`; claim que contradiz o ledger é `ContradictedClaim`.
2. Verifica a prosa contra um conjunto fechado de tokens factuais: IDs de item/rumor, nomes de
   rótulo/estado, números de HP/moeda, direções e palavras de morte. Um token factual que não exista
   no ledger é `UnsupportedMention`; um número que contradiga o ledger é `ContradictedMention`.
3. A verificação é **conservadora, não universal**: não promete detetar toda a alucinação semântica
   em adjetivos, causalidade ou estilo. Promete que nenhum item, número, rótulo, estado, rumor, morte
   ou direção inventado é aceite, e que uma menção não suportada leva a fallback.
4. Se a verificação falhar, o resultado é fallback determinístico em português; a prosa do modelo não
   é mostrada como facto. O fallback é seguro e não inventa.
5. `VerifiedNarrative` contém `text`, `claims`, `claims_origin` (`MODEL`/`HOST`), `fallback_used`,
   `reason` e `cache_key`; só texto verificado ou fallback é devolvido.

### 7.4 `cache_key` e leitura preguiçosa

1. `cache_key = BLAKE3-256(context_version || fact_seq || origin_tick || anchor_tick ||
   anchor_revision || anchor_state_hash || locale || perspective || fact_flags ||
   ledger_hash || prompt_version || model_id || model_version || narrative_schema_version ||
   fallback_template_version)`.
2. O key NÃO inclui o tick atual, a câmara, a UI, o overlay, o caminho do save ou o relógio. Ler a
   cache não altera `Tick`, `revision` ou hash do mundo.
3. Duas perspetivas ou flags `DIRECT`/`RETOLD` diferentes sobre o mesmo facto e âncora produzem
   chaves diferentes; não há reutilização de narrativa entre observadores. Uma mudança de locale,
   modelo, prompt, schema, factos, perspectiva, âncora ou template de fallback invalida a entrada.
   `context_version` versiona o contexto, `narrative_version` é o campo de versão da resposta e
   `narrative_schema_version` versiona prosa/claims; `fallback_template_version` versiona o catálogo
   de fallback. São quatro versões distintas, não sinónimos.
4. A cache é local, não autoritativa e não entra no save. Pode ser apagada sem perda de estado.
5. A geração é preguiçosa e fora do tick: só quando o texto é pedido; um timeout do modelo produz
   fallback e não bloqueia o núcleo.

### 7.5 Overlay, percepção e `RETOLD`

1. A NLG NÃO PODE usar `player_silhouettes`, overlay privilegiado, câmara, células escondidas ou
   qualquer conhecimento que o ouvinte não tenha. O contexto só contém factos testemunhados,
   recebidos ou recontados.
2. Um facto `RETOLD` é narrado como relato ("segundo…"), nunca como observação direta; um facto
   `DIRECT` pode ser narrado na primeira pessoa da perspetiva.
3. Um boato sem portador vivo não é narrado como conhecimento atual; a ausência de portador é
   `NoLivingCarrier` e leva a fallback.
4. A NLG não altera labels, estados, relações, rumores ou HP; é apresentação, não simulação.

### 7.6 Fallback determinístico

1. O fallback é gerado a partir do ledger, em português (`pt-PT` por omissão; `pt-BR` é um locale
   suportado), com templates versionados e sem RNG, sem relógio e sem modelo.
2. Cada claim tem um template; a ordem é a do ledger. Um ledger vazio produz uma frase genérica
   factual ("Nada de factual a narrar."), nunca uma invenção.
3. O fallback é cacheável com `fallback_template_version`; uma mudança de template invalida a cache.
4. O fallback não é um texto "de erro" na UI; é a narrativa segura quando a geração/verificação falha.
5. Uma resposta do modelo com HTML, marcadores, tamanho excessivo, JSON inválido ou versão errada é
   rejeitada antes da verificação e leva a fallback (`MalformedNarrative`).

### 7.7 Testes futuros de NLG

A implementação NLG-01/NLG-02 DEVE planejar 100 sequências com cassette e verificar:

1. zero aceitações de item/HP/rótulo/morte/moeda/rumor inventados;
2. fallback em falha de modelo, timeout, claim não suportada e prosa contraditória;
3. cache hit/miss, invalidação por locale, modelo, prompt e schema;
4. leitura de narrativa não altera tick, revisão ou hash do mundo;
5. `DIRECT`/`RETOLD` e ausência de overlay no contexto;
6. nenhuma menção a silhuetas, câmara ou células não percebidas.

Este contrato define o plano; não executa os testes nem afirma que existem.

## 8. Parser único e corpus adversarial

### 8.1 Fronteira única

A §2.6 é normativa: `parse_proposal` é o único parser de propostas. A implementação RULE-01 não pode
ter um "parser rápido" para um caminho e um "parser completo" para outro; o corpus corre contra a
mesma função que o runtime usa. O prompt e o parser partilham `RuleSchema`; o teste de contrato falha
se o prompt e o parser discordarem sobre nomes, limites ou catálogos.

### 8.2 Composição do corpus

O corpus planejado tem 200 casos válidos e 200 inválidos, sem cópias. Cada caso tem `id`, `seed`,
`raw` (ou cassette), `expected` (`Ok` ou código de erro) e a categoria. Um caso inválido é uma
mutação de um seed válido, com um único defeito, e espera um código exato.

Casos válidos (10 categorias × 20):

| Categoria | Cobertura |
| --- | --- |
| mínimo | `schema_version`, `action_label`, quatro atributos obrigatórios, DC, um efeito de sucesso, falha vazia |
| completo | todos os campos, ambos os ramos, propagação |
| aliases | os quatro nomes históricos (`attributes_involved`, `on_success_changes`, `on_failure_changes`, `propagation_rules`), um por caso |
| efeitos | cada um dos sete kinds, isolado e combinado |
| selectores | `actor`, `target`, `bystanders` com 0, 1 e N testemunhas |
| fronteiras | DC 5/25, `amount_bp` ±10000, `duration` 1/525600, `half_life` 1200 exato |
| catálogos | cada atributo, eixo, rótulo e estado válido |
| propagação | `LOCAL`, `REGIONAL`, valores exatos 10000/1200/4000 |
| raciocínio | ausente, presente, 8192 bytes exatos |
| cardinalidade | oito efeitos, três labels, resposta de 65535 bytes |

Casos inválidos (12 categorias, 200 casos):

| Categoria | Casos | Exemplos de código |
| --- | --- | --- |
| framing/marcadores | 20 | `MalformedFrame`, `UnknownTool`, `MissingCall` |
| truncamento/UTF-8 | 15 | `TruncatedFrame`, `TruncatedReasoning`, `InvalidUtf8` |
| XML/XXE/entidades | 15 | `ForbiddenXmlConstruct`, `MalformedFrame` |
| tamanho/profundidade | 10 | `PayloadTooLarge`, `JsonDepthExceeded`, `TooManyParameters` |
| múltiplas chamadas/parâmetros | 15 | `MultipleCalls`, `DuplicateParameter`, `UnknownParameter` |
| versão | 10 | `MissingParameter`, `UnsupportedSchemaVersion` |
| desconhecidos/duplicados | 20 | `UnknownField`, `JsonDuplicateKey`, `DuplicateLabel` |
| tipos/números | 20 | `WrongType`, `JsonNonIntegerNumber`, `JsonNumberOutOfRange` |
| intervalos | 20 | `DcOutOfRange`, `AmountOutOfRange`, `DurationOutOfRange` |
| efeitos/cardinalidade | 20 | `UnknownEffect`, `EffectCountExceeded`, `UnsupportedSaturation` |
| selectores/entidades/posse | 20 | `InvalidSelector`, `ItemNotHeld`, `SelfTransfer` |
| propagação/labels/status | 15 | `UnknownScope`, `UnknownStatus`, `PropagationNotApplicable` |

Regras do corpus:

1. Nenhum caso conta duas vezes; um válido e um inválido que diferem num campo desconhecido são
   casos distintos.
2. Cada requisito deste contrato tem pelo menos um caso válido e um inválido na matriz de cobertura;
   a matriz é um artefacto da implementação, não deste documento.
3. Um caso inválido não pode ser aceite por outro erro; o código esperado é comparado exatamente.
4. Os fixtures ficam fora deste contrato e são versionados com a implementação. O corpus não usa
   rede, GPU, pesos ou relógio real; usa o fake e a cassette.
5. RULE-03 implementa o corpus em `crates/af-rules/tests/` com um fixture de propostas e um fake de
   modelo. O corpus é o gate de aceitação do parser; uma mudança de gramática ou schema exige correr
   os 400 casos.
6. O caso mínimo válido inclui os **quatro** atributos obrigatórios; não existe um caso "com um
   atributo". O caso de cardinalidade usa 65535 bytes de resposta, abaixo de `MAX_REPLY_BYTES`
   (65536), não um limite de JSON que o schema não tem.

### 8.3 Testes futuros

Nomes no formato do projeto, um comportamento por teste:

```text
given_reply_with_two_tool_calls_when_parsed_then_multiple_calls
given_standard_xml_function_when_parsed_then_malformed_frame
given_doctype_when_parsed_then_forbidden_xml_construct
given_reply_over_64k_when_parsed_then_payload_too_large
given_truncated_parameter_when_parsed_then_truncated_frame
given_parameter_close_without_equals_when_parsed_then_malformed_frame
given_alias_and_canonical_when_parsed_then_duplicate_parameter
given_propagation_rules_alias_when_parsed_then_propagation_bound
given_missing_schema_version_when_parsed_then_missing_parameter
given_unknown_field_when_parsed_then_unknown_field
given_provenance_parameter_when_parsed_then_provenance_forbidden
given_provenance_json_field_when_parsed_then_provenance_forbidden
given_float_amount_when_parsed_then_json_non_integer_number
given_dc_26_when_validated_then_dc_out_of_range
given_group_scope_when_validated_then_unknown_scope
given_symbolic_item_when_validated_then_invalid_id
given_absent_item_when_validated_then_item_not_found
given_item_not_held_when_validated_then_item_not_held
given_item_with_items_disabled_when_validated_then_item_effect_not_enabled
given_self_transfer_when_validated_then_self_transfer
given_relationship_target_actor_when_validated_then_self_target
given_label_target_actor_when_validated_then_self_target
given_four_labels_when_validated_then_label_count_exceeded
given_zero_relationship_delta_when_validated_then_zero_delta
given_relationship_sum_over_range_without_flag_when_validated_then_clamp_not_authorized
given_relationship_sum_over_range_with_flag_when_materialized_then_saturated_with_record
given_heal_over_max_without_flag_when_validated_then_clamp_not_authorized
given_lethal_damage_when_validated_then_lethal_damage_not_authorized
given_eight_bystanders_when_materialized_then_effect_set_overflow
given_same_inputs_when_materialized_twice_then_same_hash
given_one_bp_delta_when_materialized_then_one_bp_preserved
given_preview_and_commit_when_unchanged_then_same_effect_set_hash
given_stale_revision_when_committed_then_stale_facts
given_check_resolution_missing_when_materialized_then_check_resolution_missing
given_check_mismatch_when_materialized_then_check_mismatch
given_check_modifier_21_when_validated_then_invalid_check_modifier
given_currency_without_negotiate_intent_when_validated_then_intent_effect_mismatch
given_currency_reversed_when_validated_then_intent_effect_mismatch
given_currency_offer_mismatch_when_validated_then_intent_effect_mismatch
given_currency_gate_false_when_validated_then_intent_effect_mismatch
given_currency_on_success_when_validated_then_accepted
given_currency_result_class_two_when_validated_then_intent_effect_mismatch
given_currency_offer_zero_when_validated_then_intent_effect_mismatch
given_empty_success_effects_when_validated_then_empty_effect_set
given_hp_delta_over_limit_when_validated_then_hp_delta_out_of_range
given_currency_on_failure_when_validated_then_intent_effect_mismatch
given_currency_twice_when_validated_then_duplicate_currency_effect
given_currency_self_when_validated_then_self_transfer
given_currency_missing_when_offer_present_then_intent_effect_mismatch
given_currency_extra_when_offer_absent_then_intent_effect_mismatch
given_currency_failed_negotiation_when_validated_then_accepted_without_currency
given_currency_distinct_pairs_when_validated_then_duplicate_currency_effect
given_overflowing_relationship_sum_when_validated_then_arithmetic_overflow
given_half_life_2400_when_validated_then_propagation_budget_mismatch
given_min_cognition_3999_when_validated_then_propagation_budget_mismatch
given_initial_fidelity_9999_when_validated_then_propagation_budget_mismatch
given_seventeen_questions_when_deciding_then_too_many_questions
given_score_six_when_normalized_then_malformed_answer
given_single_choice_when_normalized_then_margin_10000
given_timeout_when_deciding_then_abstain_without_tick
given_margin_999_when_deciding_then_review
given_invented_item_claim_when_verified_then_fallback
given_two_perspectives_when_cache_key_then_different_keys
given_retold_fact_when_context_built_then_retold_flag
given_overlay_silhouette_when_context_built_then_not_used
given_cache_hit_when_read_then_tick_unchanged
given_locale_change_when_cache_key_then_different_key
given_fallback_template_change_when_cache_key_then_different_key
```

Estes testes são um plano; nenhum foi executado neste estágio documental.

## 9. Critérios de aceitação

### 9.1 `AC-CTR-04-01` — framing e dialeto

A implementação DEVE aceitar exatamente uma chamada no dialeto da §2, com os marcadores exatos e o
nome `propose_emergent_action`. DEVE rejeitar XML convencional, `DOCTYPE`/entidades/CDATA/comentários,
múltiplas chamadas, texto antes/depois, marcadores divergentes, truncamento, UTF-8 inválido, BOM/NUL
e respostas acima de 64 KiB. O raciocínio é opaco e limitado a 8192 bytes. Prova: matriz da §2.5,
casos de framing/truncamento/XML e testes correspondentes.

### 9.2 `AC-CTR-04-02` — schema e semântica

A implementação DEVE exigir `schema_version=1`, rejeitar campos desconhecidos em todos os níveis,
aplicar o mapeamento de aliases, os tipos, as cardinalidades, os catálogos e o allowlist dos sete
kinds. DEVE rejeitar duplicados, IDs inválidos, itens/rumores inexistentes, posse ausente,
auto-transferência, auto-alvo relacional, estados reservados, escopos inválidos e proveniência vinda
do modelo. Prova: matrizes §3.4–§3.9, tabela §4.3 e casos de schema/semântica.

### 9.3 `AC-CTR-04-03` — validação e materialização

A implementação DEVE separar parse, validação e materialização; rejeitar por omissão; saturar apenas
com `authorized_saturation` nas duas políticas permitidas; materializar no máximo oito efeitos, de
forma pura, determinística e sem perda de 1 bp. DEVE recusar factos obsoletos, alvo morto, posse
ausente, dano letal e conflitos; DEVE garantir que dry-run e commit produzem o mesmo
`effect_set_hash`; NÃO DEVE escrever no mundo, consumir RNG ou ler relógio. Prova: §4.4, §5 e testes
de saturação, hash, 1 bp, preview/commit e stale.

### 9.4 `AC-CTR-04-04` — portas, NLG, parser único e corpus

A implementação DEVE limitar System One a 16 perguntas `NOUL`/`CHOICE`/`SCORE`, normalizar respostas
para inteiros e abster em timeout/baixa confiança, sem custo de tick/RNG. Os portos DEVEM ter fakes e
cassettes; o modo live é explícito e loopback. A NLG DEVE construir contexto com âncoras, separar
prosa e claims, verificar claims e prosa contra o ledger, cair para fallback em português e usar um
cache key sem tick/câmara/overlay. DEVE existir um único parser de propostas e um corpus planejado de
200+200 casos. Overlay e silhuetas NÃO PODEM ser conhecimento. Prova: §6, §7, §8 e testes de portas,
NLG, cache e corpus.

### 9.5 Rastreabilidade

| Requisito do cartão | Secções | Testes futuros |
| --- | --- | --- |
| framing/dialeto, uma call, XML/XXE, 64 KiB | §2, §9.1 | `multiple_calls`, `standard_xml_function`, `parameter_close_without_equals`, `payload_too_large` |
| schema fechado, versão, aliases, tipos, allowlist | §3, §9.2 | `missing_schema_version`, `propagation_rules_alias`, `provenance_parameter`, `unknown_field` |
| DC/deltas/duração, rejeição vs saturação, ≤8 | §4.4, §5, §9.3 | `zero_relationship_delta`, `clamp_not_authorized`, `saturated_with_record`, `effect_set_overflow` |
| selectores, IDs, posse, alvos, overlay | §3.5–§3.7, §9.2 | `self_transfer`, `self_target`, `item_not_held`, `item_effect_not_enabled` |
| moeda e `result_class` | §3.4.7/§3.4.11, §4.4 | `currency_on_success`, `currency_result_class_two`, `currency_distinct_pairs` |
| check e orçamento de propagação | §3.7, §5.2 | `check_resolution_missing`, `check_mismatch`, `propagation_budget_mismatch` |
| portas System One/LLM, fakes/cassettes | §6, §9.4 | `too_many_questions`, `malformed_answer`, `abstain_without_tick`, `margin_999` |
| NLG âncoras/claims/fallback/cache | §7, §9.4 | `invented_item_claim`, `two_perspectives`, `retold_fact`, `cache_hit_tick_unchanged` |
| parser único e corpus 200+200 | §8, §9.4 | corpus completo (400 casos) |
| proveniência/auditoria host-side | §4.6 | auditoria (RULE-02/APP-01) |

## 10. Decisões para freeze

| # | Decisão | Recomendação | Impacto se recusada |
| --- | --- | --- | --- |
| F-01 | Dialeto exato e não XML | aceitar `</parameter=>` e `</function=>` exatos; XML convencional rejeitado | novo `frame_version` e prompt alternativo |
| F-02 | Aliases de parâmetro | manter os quatro aliases em v1; remover em v2 | respostas do prompt antigo rejeitadas |
| F-03 | `schema_version` obrigatório | `1` explícito; ausente é `MissingParameter` | payload sem versão rejeitado |
| F-04 | Allowlist de efeitos | sete kinds CTR-01; `damage`/`heal` mapeiam para `delta_hp`; `spawn_rumor` não é efeito | schema maior e revisão do CTR-01 |
| F-05 | Catálogos | oito atributos do overview sem códigos; eixos §3.8.2; rótulos §3.8.3; estados §3.8.4 (6 reservado, 7 `INTIMIDATED`) | conflito com o vetor CTR-01 e com o exemplo |
| F-06 | Selectores | `actor`/`target`/`bystanders`; `actor` não é alvo relacional/rótulo/rumor; `region` só em propagação | IDs de ator no payload e risco de spoofing |
| F-07 | Rejeição vs saturação | rejeitar por omissão; saturação só com flag nas duas políticas; um único código por condição | clamps silenciosos e perda de auditabilidade |
| F-08 | Limite de duração | `525600` ticks como teto de produto | sem teto testável; revisão do DOC-02 |
| F-09 | Faixas System One | `act` ≥8000 e margem ≥1000; `review` 5000–7999 ou margem <1000; `abstain` <5000; score 1–5 → 5/10/15/20/25 | decisões inconsistentes entre ações |
| F-10 | Propagação | constantes exatas DOC-02/PD-07: `initial=10000`, `half_life=1200`, `min_cognition=4000`; sem escolha de perda pelo modelo | undercut do DOC-02 e do SOC-03; outro valor exige re-pinagem |
| F-11 | Auditoria | mesma transação para aceite; rejeição separada; sem relógio de parede; `raw_digest` BLAKE3 | perda de prova e de `planned_fact_seq` |
| F-12 | Corpus | 200 válidos + 200 inválidos, sem cópias | parser sem gate adversarial |
| F-13 | Check de regra emergente | `ResolvedCheck` fornecido pelo INT-04/INT-07; materializador verifica, não sorteia; modificador com guarda `-20..=20` | materializador sem resolução de check testável |
| F-14 | Itens vs PD-04 | manter o kind CTR-01 atrás de `items_enabled`; default `false` no recorte DOC-02 | contradição com "sem itens" ou remoção de `transfer_item` |

As decisões F-01, F-03, F-04, F-05, F-06, F-07 e F-10 são as que mais afetam outros contratos; devem
ser confirmadas no freeze antes de RULE-01/RULE-02/NLG-01 começarem. F-08, F-09, F-11, F-13 e F-14
são constantes de produto/engenharia e podem ser confirmadas com o maintainer.

## 11. Consumo e interfaces

| Consumidor | Interface | O que DEVE consumir | O que NÃO PODE improvisar |
| --- | --- | --- | --- |
| RULE-01 | `parse_proposal` | §2, §3, §4.2, corpus | segundo parser, regex, `serde_json` sobre fatia |
| RULE-02 | `validate_rule`, `materialize` | §4–§5, catálogos, saturação | clamp silencioso, RNG, leitura de overlay |
| RULE-03 | corpus/fixtures/fakes | §8 | casos copiados, rede, relógio |
| AI-02 | `SystemOnePort`, `LlmPort` | §6; `ProposalContext` | inferência no tick, floats no estado, live por omissão |
| NLG-01/02 | `build_context`, `verify_claims`, `cache_key` | §7; `perspective`/`fact_flags`/`ledger_hash` | prosa como facto, overlay, cache por tick atual |
| APP-01 | orquestração e auditoria | §4.6, §5.5 | proveniência inventada, commit sem auditoria |
| E2E-01 | fake/cassette | §6.5, §8 | modelo real em teste de PR |
| REVIEW-CTR-04 | verificações independentes | §9 | aceitar sem prova ou sem corpus |

## 12. Limitações e pendências

1. Este é um documento de contrato; não há código, testes executados, crate, binário ou prompt.
2. O status é proposta; o freeze exige revisão independente e decisão de produto. `DELIVERED_TO_REVIEW`
   não é `DONE`. R1, R2, R3 e R4 fecharam todos os B; D-14, N-04 e N-14 ficaram em aberto na R4 e
   esta revisão responde-lhes. Uma R5 independente continua obrigatória antes do freeze.
3. O ADR 0012 é novo e o índice de ADRs não é editado aqui; a atualização do índice é tarefa de
   integração. O manifesto lista apenas o contrato em `files_allowed`; o ADR é o artefacto
   companion autorizado pelo brief do orquestrador e deve ser reconciliado no manifesto/juiz.
4. P-07 (atributos de linguagem/inteligência) continua aberta; o catálogo §3.8.1 exige a projeção
   dos oito nomes do overview, mas não afirma que o armazenamento já os tem.
5. A fórmula do modificador de check é do INT-04; este contrato fixa a guarda `-20..=20`, não a
   derivação. A resolução do check é fornecida pelo INT-04/INT-07 como `ResolvedCheck`; sem ela, o
   materializador falha com `CheckResolutionMissing` e não sorteia nem inventa um índice.
6. A semântica de criação/perda de rumor é do SOC-02/SOC-03; este contrato valida o pedido, exige a
   fidelidade de origem e transporta o metadado, mas não aplica `TRANSFER_LOSS_BP` nem escolhe
   portadores.
7. Itens: o CTR-01 tem `TRANSFER_ITEM`, mas o recorte DOC-02/PD-04 exclui itens. O schema mantém o
   kind atrás de `items_enabled` (default `false`); sem decisão de produto, uma proposta com itens é
   `ItemEffectNotEnabled`. F-14 regista a decisão.
8. Os testes live não foram executados; não há pesos, rede, GPU ou sidecar neste estágio.
9. Os exemplos não são fixtures e não afirmam existência de atores, itens ou rumores.
10. O limite `525600`, as faixas de confiança e a guarda de check são decisões de freeze. Os valores
    de propagação (10000/1200/4000) são constantes DOC-02/PD-07, não pisos ajustáveis; alterá-los
    exige re-pinagem de produto e `schema_version` novo.
11. Nenhuma alteração foi feita a `ROADMAP.md`, `wave-spec.md`, `decisions.md`, prompts, outros
    contratos, índice de ADRs ou ledger.

## 13. Referências

Locais:

- [`identity-events.md`](identity-events.md) — efeitos, rótulos, estados, IDs, `AUTHORIZED_SATURATION`,
  `fact_seq`.
- [`time-replay-save.md`](time-replay-save.md) — desenhos, `RngState`, passo, durabilidade, entrada
  externa e `raw_digest`.
- [`region-perception-overlay.md`](region-perception-overlay.md) — percepção, overlay, testemunhas e
  proibição de conhecimento privilegiado.
- [`gameplay-spec.md`](../gameplay-spec.md) — intents, custos, escopos, `MIN_COGNITION_BP`,
  `HALF_LIFE_TICKS`.
- [`wave-spec.md`](../wave-spec.md) — manifesto, interfaces e cartão CTR-04.
- [`decisions.md`](../decisions.md) — decisões D-01…D-08 e propostas de produto.
- [`overview.md`](../../architecture/overview.md) — crates, portas e fronteiras.
- [`roadmap.md`](../../architecture/roadmap.md) — sequência, exemplo de tool call e interfaces.
- [`0004-model-proposes-core-disposes.md`](../../architecture/adr/0004-model-proposes-core-disposes.md)
  — o modelo propõe, o núcleo dispõe.
- [`0005-deterministic-simulation-contract.md`](../../architecture/adr/0005-deterministic-simulation-contract.md)
  — determinismo, ticks, seeds e hash.
- [`0008-action-driven-simulation-time.md`](../../architecture/adr/0008-action-driven-simulation-time.md)
  — tempo por ação, sem relógio de parede.
- [`0010-identity-event-layout.md`](../../architecture/adr/0010-identity-event-layout.md) — layout de
  identidade e eventos.
- [`0011-time-replay-durability.md`](../../architecture/adr/0011-time-replay-durability.md) — replay
  e durabilidade.
- [`0012-model-schema-grammar.md`](../../architecture/adr/0012-model-schema-grammar.md) — ADR desta
  decisão.
- [`offline-ai.md`](../../engineering/offline-ai.md) — LFM3, loopback, sem pesos distribuídos.
- [`testing-strategy.md`](../../engineering/testing-strategy.md) — TDD, fakes, cassettes, E2E.
- [`ROADMAP.md`](../../../ROADMAP.md) — execução, ondas e juiz.
- [`AGENTS.md`](../../../AGENTS.md) — contrato operacional e regra zero.

Externas:

- <https://huggingface.co/LiquidAI/LFM3-1.7B> — modelo e dialeto de tool call publicado.
- <https://www.rfc-editor.org/rfc/rfc8259> — JSON.
- <https://www.rfc-editor.org/rfc/rfc8439> — ChaCha20-Poly1305, referência do CTR-02.
- <https://owasp.org/www-community/attacks/XML_External_Entity_(XXE)_Processing> — XXE, razão para
  não usar parser XML.
- <https://github.com/BLAKE3-team/BLAKE3> — BLAKE3, hashes de conteúdo e auditoria.
