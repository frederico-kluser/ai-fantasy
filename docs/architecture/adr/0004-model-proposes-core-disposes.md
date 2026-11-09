# ADR 0004 — O modelo propõe, o núcleo dispõe

- **Status:** Superseded by ADR 0016 (2026-11-09; era Aceite)
- **Data:** 2026-11-08
- **Decisores:** @frederico-kluser
- **Relacionado:** ADR 0001, ADR 0003, ADR 0005

## Contexto

Um LLM local é útil para interpretar ações inéditas e gerar diálogo, mas é:

- não determinístico (amostragem, quantização, versão do modelo);
- suscetível a *prompt injection* e a alucinações;
- incapaz de garantir invariantes de jogo (HP ≥ 0, itens existentes, DC na escala).

Deixar o modelo alterar estado diretamente torna o jogo impossível de testar, de auditar e
de balancear.

## Decisão

Estabelecemos uma fronteira rígida:

1. **O modelo propõe** — o LFM3-1.7B devolve uma `RuleProposal` (JSON) através de uma *tool
   call* XML, ou texto para NLG. Nada mais.
2. **O núcleo valida** — schema fechado (`deny_unknown_fields`), versão, *allowlist* de
   efeitos, IDs existentes, *clamps* numéricos, orçamento de efeitos e propagação.
3. **O núcleo materializa** — `RuleMaterializer` é uma função pura que produz um
   `EffectSet` determinístico. Não há código, shell, SQL ou *eval* gerado pelo modelo.
4. **Dry-run obrigatório** — a regra é aplicada numa cópia do estado; invariantes e hash
   são verificados antes de tocar no estado autoritativo.
5. **Proveniência** — modelo, versão, hash do *prompt*, cassette e tick ficam registados
   para auditoria. Isso não torna a proposta confiável; só rastreável.
6. **Rejeição é resultado normal** — regra inválida devolve erro tipado e não altera o
   mundo. O jogador recebe uma mensagem compreensível e o jogo continua.

## Consequências

### Positivas

- Estado do jogo sempre válido, independentemente da qualidade do modelo.
- Regras emergentes testáveis com fixtures, sem modelo real.
- Balanceamento centralizado em código, não em *prompts*.
- Auditoria e replay possíveis.

### Negativas / custos

- O schema e o materializador são trabalho de engenharia sério (não é “só prompt”).
- A expressividade fica limitada ao que o schema permite; novas mecânicas exigem novos
  efeitos tipados.
- Regras rejeitadas podem frustrar o jogador; a UX precisa de explicar o motivo.
- O modelo pode propor algo válido mas desinteressante; curadoria e *budgets* ajudam.

## Alternativas consideradas

- **Modelo escreve JSON e o jogo aplica direto**: rejeitado; inseguro, não testável,
  impossível de balancear.
- **Modelo gera código (Rhai/Lua)**: rejeitado; superfície de ataque e complexidade de
  sandbox; o schema tipado cobre o caso de uso.
- **Sem modelo, só regras nativas**: rejeitado; perde-se a proposta de valor
  (ações emergentes).
- **Humano aprova cada regra em tempo real**: rejeitado para o loop normal; pode existir
  como modo “strict”/debug.

## Critérios de verificação

- 200 propostas válidas e 200 inválidas em teste: 0 inválidas aplicadas, 0 pânicos.
- Teste de *prompt injection*: texto no estado não consegue introduzir efeitos fora do
  schema.
- `RuleMaterializer` com cobertura de ramo 100% e mutação ≥ 90%.
- Dry-run deteta violação de invariante antes de qualquer escrita no estado.

## Referências

- [TypeSafe — How to build with System One](https://docs.typesafe.ai/concepts/how-to-build-with-system-one)
  (combinar respostas com verificações determinísticas).
- [LFM3-1.7B — tool calling](https://huggingface.co/LiquidAI/LFM3-1.7B#tool-calling).
- [OWASP LLM Top 10 — Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/).
