# ADR 0001 — Runtime offline-first e hermético

- **Status:** Aceite
- **Data:** 2026-11-08
- **Decisores:** @frederico-kluser
- **Relacionado:** ADR 0004, ADR 0007

## Contexto

O AI Fantasy é jogado em portáteis e desktops domésticos, muitas vezes sem Internet estável
ou sem vontade de enviar dados para a nuvem. O roadmap original assumia modelos locais de
~2B, mas misturava essa promessa com serviços externos e com um “motor JEV” que não existe
como runtime. Precisamos de uma regra que não se negocie por conveniência de
implementação.

## Decisão

O runtime é **hermético**:

1. Nenhuma ligação TCP/UDP para fora de `127.0.0.1`/`::1`. Só os *sidecars* locais de
   modelo podem abrir *loopback*.
2. Não há API keys, contas, telemetria remota, *feature flags* remotas ou *downloads*
   automáticos durante o jogo.
3. Pesos de modelos, *prompts*, saves e caches são ficheiros locais. O utilizador é
   responsável por os provisionar e verificar.
4. Se um modelo faltar ou falhar, o jogo continua em **modo determinístico** (fallback).
5. Qualquer dependência que introduza rede no runtime é rejeitada em review e no gate de
   arquitetura (`xtask check-offline`), salvo se for explicitamente um adaptador de
   *loopback*.

## Consequências

### Positivas

- Privacidade por padrão: nenhum dado de jogo sai da máquina.
- Testes herméticos: o CI não depende de rede nem de modelos.
- Latência previsível e sem custo por token.
- Alinhamento com a licença dos modelos (execução local, sem API).

### Negativas / custos

- Provisionamento manual dos pesos (download e verificação fora do jogo).
- Maior esforço de *fallback* e de *design* de UI para “modelo indisponível”.
- Sem atualizações automáticas de modelo; versões são pinadas por hash.
- Suporte a hardware heterogéneo (CPU/GPU/Apple Silicon) fica por nossa conta.

## Alternativas consideradas

- **API na nuvem (Jev/OpenRouter)**: rejeitada por violar privacidade, offline e
  previsibilidade; além disso, JEV não é um motor de regras.
- **Híbrido opcional na nuvem**: rejeitado nesta fase; se algum dia existir, será um
  adaptador separado, desligado por padrão e nunca requisito do jogo.
- **Download automático de modelos**: rejeitado no runtime; pode existir um comando
  explícito de provisionamento, com hash e aceitação de licença, fora do *game loop*.

## Critérios de verificação

- `xtask check-offline` falha se encontrar `reqwest`, `hyper`, `tokio` com features de
  rede ou URLs não-loopback em crates de runtime.
- Teste de integração arranca o binário com `AF_OFFLINE=1` e verifica que nenhum
  *sidecar* é lançado sem modelos e que o jogo chega a um tick.
- Revisão de PR exige justificação para qualquer nova dependência que faça I/O.

## Referências

- [LFM3-1.7B — model card](https://huggingface.co/LiquidAI/LFM3-1.7B) (execução local,
  GGUF/ONNX).
- [d1-2B-GGUF — model card](https://huggingface.co/LiquidAI/d1-2B-GGUF) (llama.cpp,
  `/v1/systemone`).
- [LFM Open License v1.0](https://www.liquid.ai/lfm-license).
