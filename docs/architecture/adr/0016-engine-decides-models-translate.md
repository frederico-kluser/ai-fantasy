# ADR 0016 — O motor decide; os modelos só traduzem

- **Status:** Aceito
- **Data:** 2026-11-09
- **Decisores:** @frederico-kluser
- **Relacionado:** D-19, D-20; substitui o ADR 0004 e encerra a proposta 0012 (nunca aceita; removida)

## Contexto

O ADR 0004 ("o modelo propõe, o núcleo dispõe") deixava o modelo propor regras novas, validadas
por uma gramática (ADR 0012). O maintainer foi explícito: quem decide não é o modelo; o motor
simula e decide tudo com porcentagens, e o SOM só entra para entender o que o jogador quer fazer.

## Decisão

1. **O motor decide** todo resultado: quem age, que ato, como cada um interpreta, o que muda,
   quem vai embora. Sempre por regras e sorteios registrados.
2. **O SOM só converte** texto livre (fala do jogador, premissa, linha de personagem) em labels,
   presets e valores, com probabilidades. Se a confiança da leitura do ato ou do alvo ficar
   abaixo de 7000 bp, o jogador confirma ou corrige.
3. **O modelo de texto só encena** um ato já resolvido, recebendo só o que o falante sabe. Sua
   saída é apresentação e nunca entra no estado.
4. **Nenhum modelo propõe regras**, efeitos ou atos novos. O catálogo de atos é fechado.
5. Toda saída de modelo é **entrada registrada**, validada por esquema; falha, recusa ou demora
   levam a um caminho alternativo (menu de atos ou fala pronta), nunca a estado inválido.

## Consequências

### Positivas

- Comportamento explicável e testável; o inspetor mostra o porquê de cada fala.
- Trocar de modelo não muda o comportamento dos personagens.

### Negativas / custos

- A riqueza do comportamento depende do motor e dos presets, não da criatividade do modelo.

### Riscos

- O modelo de texto inventar fatos ao encenar. Mitigação: pacote só com fatos conhecidos,
  validação e métrica de fatos inventados (meta zero).

## Alternativas consideradas

- **O modelo escolhe o ato dentro do permitido** — mais fluido, mas o maintainer quer o motor
  decidindo tudo.
- **Interpretação livre pelo modelo com extração de estado** — perde controle, consistência e
  replay.

## Critérios de verificação

- Nenhum caminho de código aplica saída de modelo ao estado sem passar por um ato ou preset
  validado (teste e revisão).
- Invariante 10 do [modelo de simulação](<../simulation-model.md>).

## Referências

- [Integração de IA](<../ai-integration.md>), [atos de conversa](<../dialogue-acts.md>).
