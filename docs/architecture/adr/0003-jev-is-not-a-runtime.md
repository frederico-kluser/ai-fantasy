# ADR 0003 — JEV não é runtime; o System One é o d1-2B local

- **Status:** Aceite (corrige o roadmap original)
- **Data:** 2026-11-08
- **Decisores:** @frederico-kluser
- **Relacionado:** ADR 0001, ADR 0004

## Contexto

O documento “Roadmap Jogo Procedural Com LFM3” descrevia o **JEV** como “motor de regras
dinâmicas” executado pelo LFM3-1.7B, com *tool calls*, telemetria e propagação. Essa
descrição não corresponde à realidade:

- **JEV** é o nome do modelo *System One* da TypeSafe, acedido por API (incluindo
  OpenRouter). É um **modelo**, não um motor de jogo.
- O projeto é **100% offline**; não pode depender de uma API na nuvem.
- O papel que o documento chamava “JEV” é o **papel de System One**, materializado
  localmente pelo **LiquidAI/d1-2B**.
- Nada “roda no JEV”: não há processo, servidor, base de dados, fila ou motor JEV.

## Decisão

1. **JEV é terminologia histórica.** Fica apenas na errata e no glossário; não é um
   componente de arquitetura.
2. O papel de decisão rápida é chamado **System One** no código e na documentação
   (`system_one`, `SystemOnePort`).
3. O modelo que o implementa é o **d1-2B local** (llama.cpp `/v1/systemone` ou ONNX
   Runtime), com as primitivas `noul`, `choice` e `score` no caminho llama.cpp.
4. O LFM3-1.7B local **não é JEV** e **não aplica regras**: ele pode **propor** uma regra
   estruturada; o núcleo valida e materializa (ADR 0004).
5. O código não usa o identificador `jev` para módulos, tipos, rotas, tabelas ou
   variáveis. Se houver compatibilidade histórica, o alias fica confinado a documentação.

## Consequências

### Positivas

- Arquitetura honesta: um modelo de decisão local, um modelo de linguagem local, um núcleo
  determinístico.
- Zero dependência de rede, API keys ou preços de terceiros.
- Testes podem usar *fakes* de System One e LLM, sem mocks de um “motor” fictício.
- A errata elimina confusão em reviews e issues.

### Negativas / custos

- Perde-se o rótulo “JEV” como marca interna; é preciso comunicar a renomeação.
- O d1-2B via llama.cpp só suporta `noul`, `choice` e `score`; escolha múltipla,
  extração, estimativas e `box` exigem ONNX/Transformers ou ficam fora do escopo.
- A qualidade do d1-2B local tem de ser medida no nosso hardware, não presumida dos
  números da fabricante.

## Alternativas consideradas

- **Usar JEV via OpenRouter**: rejeitado por violar offline, privacidade e custo;
  além disso, JEV é um modelo de decisão, não um motor de regras.
- **Reimplementar JEV localmente (EdgeJev)**: rejeitado nesta fase; adiciona um terceiro
  modelo e uma licença/qualidade a validar, sem benefício sobre o d1-2B.
- **Manter “JEV” como nome do módulo de regras**: rejeitado; perpetua a confusão e induz
  a arquiteturas com processo/servidor.

## Critérios de verificação

- `rg -i '\bjev\b' crates/` não encontra nada (exceto `docs/` e comentários históricos
  justificados).
- `rg 'jev_' crates/` não encontra rotas, tabelas ou funções.
- O diagrama de arquitetura não tem caixa “JEV”; tem “System One (d1-2B)”.
- Teste de integração do *sidecar* falha se o binário tentar contactar um *host* que não
  seja loopback.

## Referências

- [TypeSafe — System One](https://docs.typesafe.ai/concepts/system-one) (“Jev is TypeSafe’s
  flagship model and the first System One model”).
- [OpenRouter — Jev](https://openrouter.ai/docs/guides/community/jev) (modelo servido por
  API).
- [d1-2B-GGUF](https://huggingface.co/LiquidAI/d1-2B-GGUF) (`noul`, `choice`, `score` em
  llama.cpp).
- [LFM3-1.7B](https://huggingface.co/LiquidAI/LFM3-1.7B) (modelo de texto, não um motor).
