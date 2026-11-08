# ADR 0012 — Gramática de tool call e schema versionado de propostas

- **Status:** Proposto
- **Data:** 2026-11-08
- **Decisores:** S-CONTRACT, S-RULES, S-MODELS, S-NLG
- **Relaciona:** ADR 0004, ADR 0005, ADR 0008, ADR 0010, ADR 0011, CTR-04
- **Contrato:** [`model-schema.md`](../../planning/contracts/model-schema.md)

## Contexto

O LFM3 é o modelo local que propõe regras sociais emergentes. A tool call publicada não é XML:
`<function=propose_emergent_action>` e `</function=>` não são elementos válidos, o fecho de parâmetro
é `</parameter=>` e o bloco de raciocínio abre com `<think` sem `>`. Um parser XML convencional
rejeitaria o exemplo ou, pior, aceitaria uma segunda gramática e resolveria entidades/DTD que o
runtime não quer. O exemplo também omite `schema_version`, usa nomes divergentes
(`attributes_involved`, `on_success_changes`, `propagation_rules`), IDs simbólicos
(`carta_falsa_de_divida`) e valores que os contratos canônicos não conhecem (`ENEMY`,
`EXPOSED_LIAR`, `GROUP`).

O modelo é um produtor de dados não confiável: pode truncar, inventar campos, repetir parâmetros,
emitir duas chamadas, escrever 100 KiB ou tentar injetar instruções no raciocínio. Sem uma gramática
única, um schema fechado e uma matriz de rejeição, cada consumidor inventaria o seu parser e o núcleo
herdaria ambiguidade e comportamento não determinístico. O CTR-04 resolve essa fronteira; falta
registar a decisão estrutural.

## Decisão

1. **Dialeto exato, não XML.** O parser aceita apenas `<tool_call>`,
   `<function=propose_emergent_action>`, `<parameter=nome>`, `</parameter=>`, `</function=>` e
   `</tool_call>`, com um bloco opcional `<think` … `</think`. O fecho `</parameter` sem `=` é
   rejeitado em v1; o template do prompt DEVE emitir o dialeto histórico com `=`. XML convencional,
   `DOCTYPE`, entidades, `CDATA`, comentários e processing instructions são rejeitados. Há
   exatamente uma chamada por resposta; o raciocínio é opaco e limitado. Uma variante futura exige
   `frame_version` novo.
2. **Parser único e schema v1 fechado.** `parse_proposal` é a única função que transforma bytes em
   `RuleProposal`. `schema_version=1` é obrigatório; a ausência é `MissingParameter`; campos
   desconhecidos são rejeitados em todos os níveis, exceto os nomes reservados de proveniência, que
   são `ProvenanceFieldForbidden`, a partir de um único conjunto reservado; os quatro nomes
   históricos são aliases de migração e serão removidos em v2.
3. **Allowlist fechada sobre o CTR-01.** Os únicos kinds são `transfer_item`,
   `delta_relationship`, `attach_label`, `apply_status`, `propagate_rumor`, `delta_hp` e
   `transfer_currency`. `damage`/`heal` mapeiam conceptualmente para `delta_hp`; `spawn_rumor` não é
   efeito. Atributos (oito nomes do overview, sem códigos), eixos, rótulos e estados têm catálogo
   versionado; `GROUP` não existe. `transfer_item`/`required_item` ficam atrás de
   `ActionFacts.items_enabled` (default `false` no recorte DOC-02/PD-04). `transfer_currency` só é
   válido em `NEGOTIATE`/`INFORM_PATH`, com `from=actor`, `to=target`, `offer_currency=Some(amount)`
   e `currency_transfer_allowed=true`.
4. **Rejeitar por omissão; saturar só com autorização explícita.** DC, deltas, durações, IDs,
   escopos, carteiras e quantidades fora do intervalo são rejeitados. A saturação só existe em
   `delta_relationship` e `delta_hp` (cura), com `authorized_saturation=true`, e regista pedido,
   efetivo, política e `planned_fact_seq`. Dano letal é sempre rejeitado. Zero é `ZeroDelta`; fora
   do intervalo é `AmountOutOfRange`. A propagação usa exatamente 10000/1200/4000 (DOC-02/PD-07);
   outro valor é `PropagationBudgetMismatch`, não um piso ajustável. Não há clamp silencioso e não há
   dois códigos para a mesma condição.
5. **Proveniência e auditoria host-side.** O modelo não fornece identidade, tempo, RNG, prompt,
   modelo ou `fact_seq`. O host anexa esses campos e escreve o registo aceite na mesma transação
   durável do facto; rejeições têm registo próprio, sem publicar. O digest é `raw_digest`
   (BLAKE3-256), não `sha256`. A auditoria não entra no `WorldState`, no hash canônico ou no replay.
6. **Materializador puro e determinístico.** `materialize` recebe a regra validada, os factos e os
   desenhos já resolvidos; não lê relógio, RNG, rede ou overlay. Usa aritmética inteira, preserva
   1 bp, expande testemunhas por `ActorId`, limita a oito efeitos e recusa conflitos. O check chega
   como `ResolvedCheck` do INT-04/INT-07 (roll, total, DC, modificador, sucesso), com guarda
   `-20..=20`; o materializador verifica a coerência, não sorteia. Sem resolução, falha com
   `CheckResolutionMissing`; incoerência é `CheckMismatch`. Dry-run e commit têm de produzir o mesmo
   `effect_set_hash`.
7. **Portas e NLG com respostas finitas.** System One aceita até 16 perguntas `NOUL`/`CHOICE`/`SCORE`
   e normaliza tudo para inteiros, com `margin_bp` definido; timeout abstém sem consumir tick/RNG. A
   NLG constrói contexto com âncoras, `perspective` e `fact_flags`, separa prosa e claims, usa
   `ledger_hash` no cache key, verifica contra o ledger e cai para fallback determinístico em
   português. Overlay e silhuetas nunca são conhecimento.
8. **Corpus 200+200 como gate.** RULE-03 implementa 200 casos válidos e 200 inválidos, sem cópias,
   com código de erro exato e matriz de cobertura. O corpus corre contra o mesmo parser do runtime.

## Consequências

Positivas:

- Uma única gramática e um único parser eliminam divergência entre prompt, validação e testes.
- O schema fechado impede campos, efeitos e valores inventados de chegarem ao núcleo.
- A separação rejeição/saturação mantém o estado explicável e auditável, sem perda de 1 bp.
- O materializador puro permite dry-run, replay e testes determinísticos sem mundo real.
- A proveniência host-side protege contra spoofing de identidade, tempo e RNG pelo modelo.
- O corpus adversarial dá um gate objetivo para RULE-01/RULE-02 e para futuras mudanças de schema.

Negativas e riscos:

- O dialeto estrito pode rejeitar respostas de um modelo que emite XML convencional ou
  `</parameter` sem `=`; o prompt e o template têm de usar o dialeto exato, e o fallback é a ação
  nativa.
- O schema fechado exige revisão e novo `schema_version` para cada kind/atributo/estado novo.
- P-07 (atributos de linguagem/inteligência) continua aberta; o contrato exige a projeção dos oito
  nomes, mas a implementação fica bloqueada até o INT-04 a fornecer.
- A fórmula do modificador e a resolução do check pertencem ao INT-04/INT-07; sem elas, a
  validação/materialização falha em vez de inventar matemática, índices ou sorteios.
- O recorte DOC-02/PD-04 exclui itens; o kind CTR-01 fica atrás de `items_enabled=false` até decisão
  de produto (F-14).
- O limite de 525600 ticks é uma decisão de produto provisional, não um calendário ratificado; os
  valores de propagação são constantes DOC-02/PD-07 e exigiram re-pinagem para mudar.
- A verificação de prosa é conservadora, não universal; a NLG pode cair em fallback com mais
  frequência do que o desejável, e isso é preferível a mostrar ficção como facto.

## Alternativas rejeitadas

1. **Parser XML.** Rejeitaria o dialeto publicado ou aceitaria uma segunda gramática, com DTD,
   entidades e XXE; não há ganho para valores enumerados.
2. **Regex ou extração do primeiro objeto JSON.** Não prova unicidade, não distingue chamadas
   múltiplas, não mede profundidade e não tem offsets estáveis.
3. **Aceitar o exemplo histórico literalmente no schema.** Deixaria passar IDs simbólicos, `GROUP`,
   `ENEMY`, `EXPOSED_LIAR` e a ausência de versão, todos incompatíveis com CTR-01/DOC-02; o framing,
   esse, mantém o fecho histórico `</parameter=>`.
4. **Múltiplas chamadas por resposta.** Torna a escolha ambígua e a auditoria não determinística;
   uma ação por resposta é o contrato.
5. **Schema sem versão ou aberto a campos extra.** Impede evolução controlada e permite que o modelo
   forneça proveniência, tempo e RNG.
6. **Clamp silencioso.** Esconde valores pedidos, quebra a auditoria e viola o requisito do CTR-01 de
   registar pedido e efetivo.
7. **Proveniência fornecida pelo modelo.** É spoofável e contamina o save com dados não confiáveis.
8. **Um parser por consumidor.** Multiplica dialetos e bugs; o corpus deixaria de ser um gate único.
9. **Verificação semântica universal da prosa.** Não é decidível com um modelo de 1.7B e daria falsa
   segurança; a verificação conservadora + fallback é honesta sobre o limite.

## Verificação

- Corpus de 200 casos válidos e 200 inválidos, com código exato, sem cópias e matriz de cobertura.
- Testes de framing: `</parameter=>` canônico, `</parameter` rejeitado, múltiplas chamadas, XML,
  `DOCTYPE`, truncamento, 64 KiB, UTF-8.
- Testes de schema: versão ausente (`MissingParameter`), aliases (incluindo `propagation_rules`),
  desconhecidos/proveniência, duplicados, tipos, intervalos, catálogos, selectores.
- Testes de validação: posse, item/rumor, `items_enabled`, alvo morto/ausente, auto-transferência,
  auto-alvo relacional, intent/oferta de moeda, escopo, constantes exatas de propagação (10000/1200/4000).
- Testes de materialização: saturação autorizada, dano letal, 1 bp, oito efeitos, hash,
  preview/commit, `CheckResolutionMissing`/`CheckMismatch`, moeda e orçamento de propagação.
- Testes de portas: 16 perguntas, timeout, score inválido, margem 999/1000, fakes/cassettes, live
  ignorado.
- Testes de NLG: claim inventada, prosa contraditória, fallback, cache/locale, duas perspetivas,
  overlay não usado.
- Revisão independente `REVIEW-CTR-04` R3 antes de qualquer freeze ou implementação.

## Referências

- [`model-schema.md`](../../planning/contracts/model-schema.md) — contrato completo.
- [`identity-events.md`](../../planning/contracts/identity-events.md) — efeitos, rótulos, estados.
- [`time-replay-save.md`](../../planning/contracts/time-replay-save.md) — desenhos, durabilidade.
- [`region-perception-overlay.md`](../../planning/contracts/region-perception-overlay.md) — overlay.
- [`gameplay-spec.md`](../../planning/gameplay-spec.md) — intents, escopos, cognição.
- [`overview.md`](../overview.md) — arquitetura, atributos e portas.
- [`roadmap.md`](../roadmap.md) — sequência, exemplo e interfaces.
- [ADR 0004](0004-model-proposes-core-disposes.md) — o modelo propõe, o núcleo dispõe.
- [ADR 0005](0005-deterministic-simulation-contract.md) — contrato determinístico.
- [ADR 0008](0008-action-driven-simulation-time.md) — tempo por ação.
- [ADR 0010](0010-identity-event-layout.md) — layout de identidade.
- [ADR 0011](0011-time-replay-durability.md) — replay e durabilidade.
- [`offline-ai.md`](../../engineering/offline-ai.md) — LFM3 local, loopback.
- [`testing-strategy.md`](../../engineering/testing-strategy.md) — fakes, cassettes, E2E.
- [`ROADMAP.md`](../../../ROADMAP.md) — execução e ondas.
