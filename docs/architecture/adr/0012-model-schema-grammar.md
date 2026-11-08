# ADR 0012 — Gramática de tool call e schema versionado de propostas

- **Status:** Proposto
- **Data:** 2026-11-08
- **Decisores:** S-CONTRACT, S-RULES, S-MODELS, S-NLG
- **Relaciona:** ADR 0004, ADR 0005, ADR 0008, ADR 0010, ADR 0011, CTR-04
- **Contrato:** [`model-schema.md`](../../planning/contracts/model-schema.md)

## Contexto

O LFM3 é o modelo local que propõe regras sociais emergentes. A tool call publicada não é XML:
`<function=propose_emergent_action>` e `</function=>` não são elementos válidos, e o bloco de
raciocínio abre com `<think` sem `>`. Um parser XML convencional rejeitaria o exemplo ou, pior,
aceitaria uma segunda gramática e resolveria entidades/DTD que o runtime não quer. O exemplo também
omite `schema_version`, usa nomes divergentes (`attributes_involved`, `on_success_changes`), IDs
simbólicos (`carta_falsa_de_divida`) e valores que os contratos canônicos não conhecem (`ENEMY`,
`EXPOSED_LIAR`, `GROUP`).

O modelo é um produtor de dados não confiável: pode truncar, inventar campos, repetir parâmetros,
emitir duas chamadas, escrever 100 KiB ou tentar injetar instruções no raciocínio. Sem uma gramática
única, um schema fechado e uma matriz de rejeição, cada consumidor inventaria o seu parser e o núcleo
herdaria ambiguidade e comportamento não determinístico. O CTR-04 resolve essa fronteira; falta
registar a decisão estrutural.

## Decisão

1. **Dialeto exato, não XML.** O parser aceita apenas `<tool_call>`,
   `<function=propose_emergent_action>`, `<parameter=nome>`, `</parameter`, `</function=>` e
   `</tool_call>`, com um bloco opcional `<think` … `</think`. XML convencional, `DOCTYPE`,
   entidades, `CDATA`, comentários e processing instructions são rejeitados. Há exatamente uma
   chamada por resposta; o raciocínio é opaco e limitado. Uma variante futura exige
   `frame_version` novo.
2. **Parser único e schema v1 fechado.** `parse_proposal` é a única função que transforma bytes em
   `RuleProposal`. `schema_version=1` é obrigatório; campos desconhecidos são rejeitados em todos os
   níveis; os três nomes do exemplo histórico são aliases de migração e serão removidos em v2.
3. **Allowlist fechada sobre o CTR-01.** Os únicos kinds são `transfer_item`,
   `delta_relationship`, `attach_label`, `apply_status`, `propagate_rumor`, `delta_hp` e
   `transfer_currency`. `damage`/`heal` mapeiam conceptualmente para `delta_hp`; `spawn_rumor` não é
   efeito. Atributos, eixos, rótulos e estados têm catálogo versionado; `GROUP` não existe.
4. **Rejeitar por omissão; saturar só com autorização explícita.** DC, deltas, durações, IDs,
   escopos, carteiras e quantidades fora do intervalo são rejeitados. A saturação só existe em
   `delta_relationship` e `delta_hp` (cura), com `authorized_saturation=true`, e regista pedido,
   efetivo, política e `fact_seq`. Dano letal é sempre rejeitado. Não há clamp silencioso.
5. **Proveniência e auditoria host-side.** O modelo não fornece identidade, tempo, RNG, prompt,
   modelo ou `fact_seq`. O host anexa esses campos e escreve o registo aceite na mesma transação
   durável do facto; rejeições têm registo próprio, sem publicar. A auditoria não entra no
   `WorldState`, no hash canônico ou no replay.
6. **Materializador puro e determinístico.** `materialize` recebe a regra validada, os factos e os
   desenhos já resolvidos; não lê relógio, RNG, rede ou overlay. Usa aritmética inteira, preserva
   1 bp, expande testemunhas por `ActorId`, limita a oito efeitos e recusa conflitos. Dry-run e
   commit têm de produzir o mesmo `effect_set_hash`.
7. **Portas e NLG com respostas finitas.** System One aceita até 16 perguntas `NOUL`/`CHOICE`/`SCORE`
   e normaliza tudo para inteiros; timeout abstém sem consumir tick/RNG. A NLG constrói contexto com
   âncoras, separa prosa e claims, verifica contra o ledger e cai para fallback determinístico em
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

- O dialeto estrito pode rejeitar respostas reais de um modelo que emite XML convencional; o prompt
  e o template têm de usar o dialeto exato, e o fallback é a ação nativa.
- O schema fechado exige revisão e novo `schema_version` para cada kind/atributo/estado novo.
- P-07 (atributos de linguagem/inteligência) continua aberta; o contrato exige a projeção, mas a
  implementação fica bloqueada até o INT-04 a fornecer.
- A fórmula do modificador de check pertence ao INT-04; se não existir, a validação falha em vez de
  inventar matemática.
- O limite de 525600 ticks é uma decisão de produto provisional, não um calendário ratificado.
- A verificação de prosa é conservadora, não universal; a NLG pode cair em fallback com mais
  frequência do que o desejável, e isso é preferível a mostrar ficção como facto.

## Alternativas rejeitadas

1. **Parser XML.** Rejeitaria o dialeto publicado ou aceitaria uma segunda gramática, com DTD,
   entidades e XXE; não há ganho para valores enumerados.
2. **Regex ou extração do primeiro objeto JSON.** Não prova unicidade, não distingue chamadas
   múltiplas, não mede profundidade e não tem offsets estáveis.
3. **Aceitar o exemplo histórico literalmente.** Deixaria passar IDs simbólicos, `GROUP`, `ENEMY`,
   `EXPOSED_LIAR` e a ausência de versão, todos incompatíveis com CTR-01/DOC-02.
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
- Testes de framing: múltiplas chamadas, XML convencional, `DOCTYPE`, truncamento, 64 KiB, UTF-8.
- Testes de schema: versão, desconhecidos, duplicados, tipos, intervalos, catálogos, selectores.
- Testes de validação: posse, item/rumor, alvo morto/ausente, auto-transferência, escopo.
- Testes de materialização: saturação autorizada, dano letal, 1 bp, oito efeitos, hash, preview/commit.
- Testes de portas: 16 perguntas, timeout, score inválido, fakes/cassettes, live ignorado.
- Testes de NLG: claim inventada, prosa contraditória, fallback, cache/locale, overlay não usado.
- Revisão independente `REVIEW-CTR-04` antes de qualquer freeze ou implementação.

## Referências

- [`model-schema.md`](../../planning/contracts/model-schema.md) — contrato completo.
- [`identity-events.md`](../../planning/contracts/identity-events.md) — efeitos, rótulos, estados.
- [`time-replay-save.md`](../../planning/contracts/time-replay-save.md) — desenhos, durabilidade.
- [`region-perception-overlay.md`](../../planning/contracts/region-perception-overlay.md) — overlay.
- [`gameplay-spec.md`](../../planning/gameplay-spec.md) — intents, escopos, cognição.
- [`overview.md`](../overview.md) — arquitetura e portas.
- [`roadmap.md`](../roadmap.md) — sequência e interfaces.
- [ADR 0004](0004-model-proposes-core-disposes.md) — o modelo propõe, o núcleo dispõe.
- [ADR 0005](0005-deterministic-simulation-contract.md) — contrato determinístico.
- [ADR 0008](0008-action-driven-simulation-time.md) — tempo por ação.
- [ADR 0010](0010-identity-event-layout.md) — layout de identidade.
- [ADR 0011](0011-time-replay-durability.md) — replay e durabilidade.
- [`offline-ai.md`](../../engineering/offline-ai.md) — LFM3 local, loopback.
- [`testing-strategy.md`](../../engineering/testing-strategy.md) — fakes, cassettes, E2E.
- [`ROADMAP.md`](../../../ROADMAP.md) — execução e ondas.
