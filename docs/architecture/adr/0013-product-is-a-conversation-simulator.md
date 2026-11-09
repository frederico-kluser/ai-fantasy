# ADR 0013 — O produto é um simulador de fatias de conversa

- **Status:** Aceito
- **Data:** 2026-11-09
- **Decisores:** @frederico-kluser
- **Relacionado:** D-09, D-10, D-11, D-21, D-24; encerra as propostas 0008, 0009 e 0010 (nunca aceitas; removidas, ficam no histórico do git)

## Contexto

O plano anterior construía primeiro um motor regional em Rust (várias localidades, campo de
visão, silhuetas, cliente 2D isométrico, rede neural por personagem) e só depois testava se as
conversas eram boas. Eram 46 tarefas com ondas, juiz e manifesto com hash, cinco contratos de
~100 KB e nenhuma linha de código. O maintainer avaliou o plano como inchado e redefiniu o
produto numa conversa em 2026-11-09, uma pergunta por vez.

## Decisão

1. **O motor é o produto.** O AI Fantasy é um simulador web de conversas com NPCs que simulam
   pessoas; o motor se chama Hermeneutic Core.
2. **A unidade é uma fatia de conversa**, não o mundo: um lugar (grade com paredes), um horário,
   um clima e quem participa. O tempo anda em ticks pelos atos e o mundo espera o jogador.
3. **Qualquer cenário:** a premissa digitada vira presets genéricos; a pirâmide de Maslow
   organiza as vontades.
4. **Visão:** o motor deve servir, no futuro, de base para sistemas de NPCs em jogos e mods.
5. **Fora do escopo:** mundo contínuo e região, visual 2D isométrico e silhuetas, rede neural e
   evolução genética, IA local por enquanto, economia, combate, regras inventadas por modelo e o
   processo de 46 tarefas. Voltar a qualquer um exige decisão nova.

A definição canônica está em [`docs/product.md`](<../../product.md>).

## Consequências

### Positivas

- O que mais importa (a conversa) é validado primeiro, com pouco código.
- O motor fica genérico e reutilizável por jogos e mods.
- O roadmap cabe em 24 tarefas com critérios claros.

### Negativas / custos

- O jogo completo sai do horizonte próximo.
- Contratos, ADRs propostos e prompts do plano antigo deixam de valer e foram removidos ou
  substituídos.

### Riscos

- O escopo voltar a crescer aos poucos. Mitigação: a lista "fora do produto" em `product.md` e a
  exigência de decisão nova para qualquer item dela.

## Alternativas consideradas

- **Um jogo que cresce a partir do diálogo** — mantinha a visão, mas o inchaço voltaria sem
  portões firmes.
- **Um jogo pequeno de conversa** — jogável cedo, mas traz de volta o escopo de jogo (objetivo,
  ritmo, conteúdo).
- **Manter o plano antigo** — rejeitado pelo maintainer.

## Critérios de verificação

- O ROADMAP só contém tarefas do produto definido aqui.
- PRs que acrescentam itens da lista "fora do escopo" sem decisão nova são recusados em revisão.

## Referências

- Registro das decisões: [`docs/planning/decisions.md`](<../../planning/decisions.md>).
- Análise que levou à mudança: [`docs/studies/README.md`](<../../studies/README.md>).
