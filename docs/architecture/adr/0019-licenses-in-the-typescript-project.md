# ADR 0019 — Licenças do código, das dependências e dos modelos no projeto TypeScript

- **Status:** Aceite
- **Data:** 2026-11-09
- **Decisores:** @frederico-kluser
- **Relacionado:** D-19; substitui o ADR 0007

## Contexto

O ADR 0007 fixava a licença MIT, a não distribuição de pesos de modelos e a verificação de
licenças com ferramentas de Rust. A stack agora é TypeScript (ADR 0014) e, por enquanto, os
modelos são usados via OpenRouter, sem pesos locais (ADR 0015).

## Decisão

1. **Código sob MIT**, inbound = outbound, sem CLA nem DCO.
2. **Dependências** só com licenças compatíveis com MIT: MIT, Apache-2.0, BSD-2-Clause,
   BSD-3-Clause, ISC, 0BSD, Zlib, Unicode-3.0 e BlueOak-1.0.0; MPL-2.0 só como dependência fraca
   e com revisão; GPL, AGPL, SSPL e BUSL só com ADR. O CI verifica a lista (configurado na
   FND-01).
3. **Pesos de modelos não são distribuídos** pelo projeto. Quando modelos locais voltarem (LFM3,
   d1), o usuário os obtém do fornecedor, sob a licença do fornecedor (no caso da Liquid AI, a
   LFM Open License), e o projeto não os relicencia.
4. **Uso via OpenRouter:** a chave e a conta são do usuário; os termos do OpenRouter e de cada
   modelo valem para as chamadas que ele fizer.
5. Conteúdo de terceiros (textos, imagens, nomes) só entra com licença verificada e atribuição.

## Consequências

### Positivas

- O motor pode ser usado livremente em jogos e mods (D-24).
- A verificação de licenças passa a ser automática no CI.

### Negativas / custos

- Algumas bibliotecas úteis ficam de fora por licença.

### Riscos

- Dependência transitiva com licença incompatível. Mitigação: verificação no CI a cada PR.

## Alternativas consideradas

- **Manter o ADR 0007** — a decisão de fundo continua, mas as verificações e referências eram da
  stack antiga.

## Critérios de verificação

- O job de CI falha com dependência fora da lista.
- Nenhum arquivo de pesos de modelo é versionado (`.gitignore` e revisão).

## Referências

- [Contribuição](<../../../CONTRIBUTING.md>), [arquitetura](<../overview.md>).
