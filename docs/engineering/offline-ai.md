# IA offline: d1-2B, LFM3 e o que *não* é JEV

> Este documento é a referência operacional para modelos, *sidecars*, licenças e
> *fallback*. A arquitetura geral está em [`../architecture/overview.md`](../architecture/overview.md);
> a errata do JEV está no [roadmap](../architecture/roadmap.md#0-errata-jev-não-é-runtime).

## 1. Três nomes, três coisas diferentes

| Nome | O que é | Onde corre | Usamos? |
| --- | --- | --- | --- |
| **JEV** | Modelo *System One* da TypeSafe, servido por API (OpenRouter ou API própria). | Nuvem do fornecedor. | **Não.** Seria online, pago e fora do nosso controlo. |
| **d1-2B** | Modelo de decisão local da Liquid AI, 1,92B, base LFM3-VL-2B. Devolve respostas tipadas sem gerar tokens. | Local, via llama.cpp `/v1/systemone` ou ONNX Runtime. | **Sim**, é o nosso System One. |
| **LFM3-1.7B** | Modelo de texto local, 1,73B, 256K de contexto, com *tool calling* e *deferred tools*. | Local, via llama.cpp (HTTP) ou ONNX/Transformers. | **Sim**, para NLU/NLG e proposta de regras. |

**JEV não é um motor de regras.** É um modelo de decisão. Nada “executa no JEV”; não há
processo, servidor, fila, base de dados ou motor JEV neste projeto. O papel que os
rascunhos chamavam “JEV” é o **System One**, materializado pelo d1-2B. Ver
[ADR 0003](../architecture/adr/0003-jev-is-not-a-runtime.md).

## 2. Factos verificados (2026-11-08)

### d1-2B

| Propriedade | Valor | Fonte |
| --- | --- | --- |
| Parâmetros | 1,92B | model card / documentação Liquid AI |
| Base | LFM3-VL-2B | idem |
| Modalidades | texto, imagens, vídeo | idem |
| Saída | respostas tipadas + probabilidades, **0 tokens gerados** | idem |
| Contexto | 128K tokens (calibração fiável até ~64K) | idem |
| Primitivas em llama.cpp | `noul`, `choice`, `score` | `d1-2B-GGUF` |
| Não suportado em llama.cpp | `multiple: true`, extração, estimativas, `box` | idem |
| Endpoint | `POST /v1/systemone` | idem |

Consequência prática: o caminho llama.cpp cobre a triagem que precisamos. Se um dia
precisarmos de escolha múltipla, extração, `number` com intervalo ou `box`, teremos de usar
ONNX Runtime ou Transformers — e isso é um ADR novo, não uma suposição.

### LFM3-1.7B

| Propriedade | Valor | Fonte |
| --- | --- | --- |
| Parâmetros | 1,73B | model card |
| Contexto | 256K tokens (input + output) | model card |
| Arquitetura | 24 camadas: 13 convoluções curtas com *gate*, 5 atenção de janela deslizante (256), 6 atenção global | model card |
| Vocabulário | 128.000 tokens, 16 línguas (inclui português) | model card |
| Licença | LFM Open License v1.0 | model card |
| GGUF Q4_0 | ~1,05 GB | model card / benchmark |
| GGUF Q8_0 | ~1,85 GB | model card / benchmark |
| Tool calling | XML `<tool_call><function=...><parameter=...>` | model card |
| Tool search | `defer_loading=True` + `tool_reference` | model card |

Consequência prática: o LFM3 é grande o suficiente para propor uma regra estruturada e
escrever diálogo, e pequeno o suficiente para correr num portátil. Não é um motor de
regras, não é determinístico e não deve estar no *game loop*.

### JEV (para memória)

- É o primeiro modelo *System One* da TypeSafe; devolve decisões tipadas e probabilidades,
  não texto [^1].
- É servido por API (incluindo OpenRouter) [^2]; não é um runtime de jogo.
- Existem reimplementações locais (por exemplo, EdgeJev), mas **não as adotamos** nesta
  fase: seria um terceiro modelo, com outra licença e outra qualidade a validar, sem
  vantagem sobre o d1-2B local.

[^1]: <https://docs.typesafe.ai/concepts/system-one>
[^2]: <https://openrouter.ai/docs/guides/community/jev>

## 3. Runtime: llama.cpp e ONNX

### llama.cpp

- Versão com suporte a LFM3 e ao endpoint `/v1/systemone`; fixar a versão no manifesto e
  no README de provisionamento.
- `llama-server` com `--host 127.0.0.1`; nunca `0.0.0.0`.
- d1-2B: `-b`/`-ub` têm de caber o estado + mídia; para texto, 8192 é o ponto de partida.
- LFM3: `--chat-template-file` com o template atual; `-c` de acordo com o orçamento
  (32K no caminho comum, 256K só quando necessário).
- `-ctk q8_0 -ctv q8_0` para reduzir KV cache; validar qualidade no nosso hardware.
- *Health check*: `GET /health`; timeout de arranque de 30 s; *kill* gracioso no shutdown.

### ONNX

- Necessário apenas se usarmos primitivas que o llama.cpp não cobre.
- Runtime: `onnxruntime` (CPU/GPU) com `q4f16`/`q4`.
- O adaptador ONNX implementa a mesma `SystemOnePort`; os testes de contrato são os mesmos.
- Não introduzir ONNX “só por precaução”: é uma dependência pesada e um caminho de
  manutenção a mais.

## 4. Provisionamento (sem rede no jogo)

O repositório **não** contém pesos. O utilizador obtém os ficheiros do fornecedor e
coloca-os em `AF_MODELS_DIR` (default `./models`).

```text
models/
  manifest.json
  d1-2b/
    d1-2B-Q4_K_M.gguf
    mmproj-d1-2B-Q8_0.gguf        # se houver mídia
  lfm3-1.7b/
    LFM3-1.7B-Q4_0.gguf
    chat_template.jinja
```

`manifest.json` (versionado no repositório como exemplo, sem os pesos) deve declarar:

```json
{
  "schema_version": 1,
  "models": [
    {
      "id": "d1-2b",
      "role": "system_one",
      "file": "d1-2b/d1-2B-Q4_K_M.gguf",
      "sha256": "<64 hex>",
      "bytes": 1234567890,
      "license": "LFM Open License v1.0",
      "source": "https://huggingface.co/LiquidAI/d1-2B-GGUF"
    },
    {
      "id": "lfm3-1.7b",
      "role": "llm",
      "file": "lfm3-1.7b/LFM3-1.7B-Q4_0.gguf",
      "sha256": "<64 hex>",
      "bytes": 1050000000,
      "license": "LFM Open License v1.0",
      "source": "https://huggingface.co/LiquidAI/LFM3-1.7B"
    }
  ]
}
```

Comandos previstos:

```bash
af models verify --dir ./models      # verifica hash, tamanho, licença declarada
af models list                       # mostra o que está instalado
af doctor                            # modelos + saves + portas + permissões
```

Não haverá `af models download` no runtime. Se existir um comando de conveniência, será
explícito, fora do jogo, com aceitação de licença e verificação de hash — e nunca chamado
automaticamente.

## 5. Contratos de prompt

### 5.1 System One (d1-2B)

- Estado: JSON curto e factual (local, ator, alvo, comando, labels, status).
- Perguntas: no máximo **16** por chamada; `noul`, `choice` ou `score`.
- `choice` inclui sempre `other`/`none` quando o espaço pode não cobrir a entrada.
- `score` usa níveis descritivos, não apenas números.
- Estado abaixo de ~64K tokens para preservar calibração; acima disso, resumir.
- Resposta: probabilidades + confiança; o código decide bandas (`act`, `review`,
  `abstain`) com limiares determinísticos.
- *Prompt injection*: o estado é dado, não instrução; sem “ignore as regras” no *prompt*
  que possa ser ecoado; validação posterior.

### 5.2 LFM3 (proposta de regra)

- *System prompt* fixo, versionado (`prompt_version`), com o schema e a *allowlist*.
- Ferramenta `propose_emergent_action` com parâmetros JSON; sem ferramentas perigosas.
- `defer_loading=True` para o catálogo de ferramentas nativas; só `search_tools` visível.
- *Output* máximo: 4K tokens; `temperature=0.1`, `top_k=50`, `repeat_penalty=1.1`.
- Parsing XML estrito; JSON validado com `serde` + `deny_unknown_fields`; tamanho máximo
  64 KiB; sem *eval*.
- Se o modelo falhar ou violar o schema: rejeitar, registar motivo, não tocar no estado.
- A resposta do LFM3 **nunca** é aplicada diretamente; passa pelo materializador.

### 5.3 LFM3 (NLG)

- Prompt com a sequência de eventos, labels, status e âncoras factuais.
- Instrução: não inventar trocas de itens, dano, mortes ou relações que não estejam nos
  eventos.
- Temperatura configurável; para testes, `0.0` e seed fixo.
- Saída limitada; cache por hash da sequência + modelo + prompt + locale.
- Verificação factual automatizada: um checklist confirma que itens/HP/labels citados
  existem no evento; caso contrário, rejeitar e usar template determinístico.

## 6. Licenças e distribuição

- **Código:** MIT.
- **Pesos:** LFM Open License v1.0 (Liquid AI), baseada em Apache 2.0 com limite comercial:
  uso comercial gratuito para entidades com receita anual **< US$ 10 milhões**; acima
  disso, é necessária licença comercial da Liquid AI [^3].
- O projeto **não distribui** pesos; o utilizador obtém-nos do fornecedor.
- Se algum dia distribuirmos um *bundle*, temos de incluir a licença, os avisos, o NOTICE
  (se existir) e marcar alterações; e o instalador deve mostrar o limite comercial.
- Não usar marcas da Liquid AI para sugerir afiliação; é permitido dizer “usa modelos
  Liquid AI”.
- A licença dos modelos pode mudar; fixar versão/hash e rever antes de cada release.

[^3]: <https://docs.liquid.ai/lfm/help/model-license> e <https://www.liquid.ai/lfm-license>

## 7. *Fallback* e degradação

| Situação | Comportamento |
| --- | --- |
| d1-2B indisponível | Triagem por heurística nativa (regras determinísticas); ações nativas continuam. |
| d1-2B lento (acima do orçamento) | *Timeout*, *fallback* e registo de métrica; não bloquear o tick. |
| LFM3 indisponível | Ações emergentes são recusadas com explicação; NLG usa template determinístico. |
| Regra inválida | Rejeitada; o jogador vê o motivo; o mundo não muda. |
| Modelo alucina no NLG | *Checklist* factual falha; usa-se template; regista-se a rejeição. |
| Save antigo | Migração; se falhar, não sobrescrever e oferecer *backup*. |

O jogo tem de ser **jogável sem modelos**. A IA melhora a experiência; não é uma
dependência dura.

## 8. Testes com modelos

| Nível | Como | Onde corre |
| --- | --- | --- |
| Unit | `ScriptedSystemOne`, `FixtureLlm`; sem rede. | Todo PR |
| Contrato | Mesmos casos contra fake e adaptador real (loopback). | PR crítico / nightly |
| Cassette | Resposta real gravada, sanitizada, replay. | Todo PR |
| Live | Modelos reais, latência e qualidade. | Nightly/manual |
| Soak | 12 h com modelos e memória monitorizada. | Nightly/manual |

Regras:

- Nenhum teste de PR depende de pesos ou rede.
- Cassettes não contêm dados pessoais nem *prompts* sensíveis; são versionadas.
- Testes live são `#[ignore]` com instruções claras; falham se o modelo não estiver
  disponível (não são “verdes por omissão”).
- Métricas de latência/memória são registadas com hardware e versão do modelo.

## 9. Checklist de integração

- [ ] Pesos verificados por SHA-256 e tamanho.
- [ ] `llama-server` em `127.0.0.1`, porta efémera, `--no-webui` se aplicável.
- [ ] Endpoint `/v1/systemone` responde `output_tokens: 0`.
- [ ] LFM3 devolve *tool call* XML válido e o parser aceita/rejeita corretamente.
- [ ] Nenhum pedido fora de loopback (teste com transporte falso).
- [ ] *Fallback* testado com modelos desligados.
- [ ] Licença e limite comercial exibidos no provisionamento.
- [ ] Latência e memória medidas no hardware alvo.
- [ ] Shutdown limpa processos e portas.
