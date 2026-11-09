# ADR 0017 — Determinismo, replay exato e forçar caminho

- **Status:** Aceite
- **Data:** 2026-11-09
- **Decisores:** @frederico-kluser
- **Relacionado:** D-26; substitui o ADR 0005 e encerra a proposta 0011 (nunca aceita; removida)

## Contexto

As conversas variam porque o motor sorteia (porcentagens), e o maintainer quer essa variação.
Ao mesmo tempo, precisa de testes repetíveis e de um controle para seguir sempre o mesmo caminho.
Os ADRs 0005 e 0011 tratavam disso para o motor em Rust, com formatos binários e save durável.

## Decisão

1. **Estado em inteiros** (bp) e nenhuma fonte de aleatoriedade fora do PRNG do motor.
2. **PRNG de 32 bits** só com operações inteiras, uma stream por finalidade, semeada pela seed e
   pelo nome da stream. A seed do elenco é separada da seed da cena.
3. **Todo sorteio é registrado** com sequência, finalidade, limite, valor e resultado.
4. **Forçar caminho** (um sorteio específico ou o modo "mais provável") é uma entrada registrada
   e reproduzível.
5. **Registro da sessão** em JSONL com versões do motor, dos presets e dos prompts, seeds, cena,
   entradas, sorteios, eventos e chamadas de IA.
6. **Replay exato:** reconstrói o estado só a partir do registro, confere o hash a cada passo e
   nunca chama os modelos.

## Consequências

### Positivas

- Mesma seed e mesmas entradas dão a mesma conversa; seed nova, conversa nova.
- Todo comportamento estranho pode ser reproduzido e depurado.

### Negativas / custos

- Disciplina constante no motor (nada de APIs não determinísticas).
- Registros maiores, porque gravam as respostas das IAs.

### Riscos

- Mudança de regra quebrar replays antigos. Mitigação: versão do motor no registro e testes de
  ouro com sessões gravadas.

## Alternativas consideradas

- **Replay só do simbólico, com texto gerado de novo** — mantido como recurso
  ("re-encenar este turno"), mas não como replay oficial.
- **Sem replay** — impossível depurar.

## Critérios de verificação

- Invariantes 1 e 8 do [modelo de simulação](<../simulation-model.md>) como testes.
- Teste de ouro: sessões gravadas reproduzem o mesmo hash final.

## Referências

- [Modelo de simulação](<../simulation-model.md>), seção 15.
