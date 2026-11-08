# ADR 0007 — Licença do código e distribuição dos modelos

- **Status:** Aceite
- **Data:** 2026-11-08
- **Decisores:** @frederico-kluser
- **Relacionado:** ADR 0001, `docs/engineering/offline-ai.md`

## Contexto

O projeto é open-source e usa modelos de terceiros. É fácil prometer “open-source” e, sem
querer, violar a licença dos pesos ao empacotá-los no instalador, ou escolher uma licença
de código incompatível com contribuições e uso comercial.

## Decisão

### Código

- Licença **MIT** para todo o código deste repositório.
- Contribuições são *inbound = outbound* (MIT), sem CLA/DCO nesta fase.
- Dependências devem ter licença compatível com MIT; allowlist em `deny.toml`:
  MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, Zlib, Unicode-3.0, MPL-2.0
  (MPL apenas como dependência fraca, com revisão).
- GPL/AGPL/SSPL/BUSL não entram sem ADR e aprovação explícita.

### Modelos

- **Não** distribuímos pesos no repositório nem no instalador por padrão.
- O utilizador provisiona os pesos a partir do fornecedor e verifica o SHA-256 publicado.
- Os pesos estão sob a **LFM Open License v1.0** (Liquid AI), baseada em Apache 2.0 com
  limite comercial: uso comercial gratuito apenas para entidades com receita anual
  **< US$ 10 milhões**; acima disso, é necessária licença comercial da Liquid AI.
- O projeto **não relicencia** os pesos nem concede direitos sobre eles.
- Se no futuro houver um bundle, ele precisa de cumprir a licença (incluir cópia, avisos,
  NOTICE, marcar alterações), e o instalador deve mostrar a licença e o limite comercial.

### Assets

- Arte, ícones, fontes e áudio terão licença própria, declarada em
  `docs/legal/assets.md` quando existirem. Até lá, não entram assets de terceiros sem
  licença compatível e atribuição.

## Consequências

### Positivas

- Clareza jurídica para contribuidores e utilizadores.
- Sem violação de licença por “bundle” acidental.
- Compatível com uso comercial por estúdios pequenos (< US$ 10M).
- Facilita adoção e contribuição.

### Negativas / custos

- O utilizador tem um passo extra de provisionamento.
- Empresas ≥ US$ 10M precisam de licença comercial da Liquid AI.
- A licença dos modelos pode mudar; versões são pinadas e revisadas.
- MIT não tem concessão explícita de patentes (Apache 2.0 teria); risco aceito nesta fase.

## Alternativas consideradas

- **Apache-2.0 para o código**: boa concessão de patentes, mas mais burocrática; MIT é
  suficiente e é o default da fundação. Pode ser reavaliada antes de `v1.0`.
- **Distribuir pesos no repo**: rejeitado; tamanho, licença e reprodutibilidade.
- **Depender de API para evitar licença**: rejeitado; viola offline.
- **GPL para o código**: rejeitado; reduz adoção e não é necessário para o modelo de
  negócio.

## Critérios de verificação

- `LICENSE` é MIT e o README declara a licença.
- `cargo deny check licenses` passa com a allowlist.
- Nenhum `*.gguf`, `*.safetensors` ou `*.onnx` no repositório.
- `docs/engineering/offline-ai.md` explica o provisionamento e a licença.
- Release notes incluem avisos de licença de modelos quando aplicável.

## Referências

- [LFM Open License v1.0 — texto](https://www.liquid.ai/lfm-license)
- [LFM Open License — guia](https://docs.liquid.ai/lfm/help/model-license)
- [MIT License](https://opensource.org/license/mit)
- [SPDX License List](https://spdx.org/licenses/)
