# Estudos (histórico)

> Pesquisas que alimentaram a mudança de direção de 2026-11-09. **Não são contrato:** o produto
> vigente está em [`docs/product.md`](<../product.md>) e as regras do motor no
> [modelo de simulação](<../architecture/simulation-model.md>).

## Os estudos

| Estudo | Do que trata |
| --- | --- |
| [Avaliação e Arquitetura AI Fantasy](<Avaliação e Arquitetura AI Fantasy.md>) | diagnóstico do plano antigo; arquitetura com SOM de Kohonen, micro-redes neurais e LLM; diálogo em duas fases |
| [Expansão Sistêmica Do AI Fantasy](<Expansão Sistêmica Do AI Fantasy.md>) | calendário lógico, fisiologia, sanidade, necessidades psicológicas e utilidade, comércio, segredos e ganchos, tavernas, velhice |
| [Original — Roadmap Jogo Procedural Com LFM3](<Original - Roadmap Jogo Procedural Com LFM3.md>) | o roadmap original: registro simbólico de conversas, leitura sob demanda, família LFM3, texto livre com triagem por System One |

A análise de onde o projeto estava, as nove notas do maintainer e o formulário de 46 decisões
que levaram à mudança estão no primeiro commit do PR da refundação (`44f3e0a`), no histórico do
git.

## O que foi aproveitado

| Ideia dos estudos | Onde está agora |
| --- | --- |
| Diálogo em duas fases: resolver simbolicamente e depois dramatizar | o motor decide e o modelo de texto encena ([ADR 0016](<../architecture/adr/0016-engine-decides-models-translate.md>)) |
| Registro objetivo da conversa (falante, ouvinte, intenção, efeitos) | fatos e cópias com perspectiva (simulação §12) |
| Leitura evolutiva: o histórico entre duas pessoas vira subtexto | pacote de encenação com os fatos que o falante conhece ([integração de IA](<../architecture/ai-integration.md>) §5.1) |
| Texto livre do jogador com triagem por um decisor tipado | o SOM lê a fala do jogador ([atos de conversa](<../architecture/dialogue-acts.md>) §11) |
| Auditoria de fidelidade: zero alucinação mecânica | métrica de fatos inventados ([avaliação](<../engineering/evaluation.md>)) |
| Necessidades psicológicas e utilidade em aritmética inteira | vontades pela pirâmide de Maslow e escolha por utilidade (simulação §5.3 e §10) |
| Memória curta, longa e núcleo | memórias marcantes que persistem entre fatias (simulação §12) |
| Segredos, ganchos e acontecimentos marcantes | acontecimentos de história e gancho de tensão ([presets](<../architecture/presets.md>) §7 e §10) |
| Taverna como palco social | preset de lugar `social_interior` |
| Culpa ao agir contra quem se ama; alívio ao se vingar | efeitos em quem age ([atos de conversa](<../architecture/dialogue-acts.md>) §7) |

## O que ficou de fora

SOM de Kohonen, micro-redes neurais e plasticidade, genética e gerações, economia e itens,
sanidade com surtos, calendário de estações e velhice. Estão fora do produto atual
([`product.md`](<../product.md>) §6) e só voltam com decisão nova.

## As nove notas do maintainer

| Nota | Ideia | Onde terminou |
| --- | --- | --- |
| N-01 | status mudam a velocidade das ações | corpo e movimento na simulação (§5.1, custo de andar e cansaço) |
| N-02 | decisão e diálogo são papéis diferentes | D-19 e ADR 0016 |
| N-03 | só ouve quem está perto | D-16: audição pela geometria (simulação §8.2) |
| N-04 | interações com porcentagens, mesmo entre NPCs | D-26: sorteios semeados e replay (simulação §15) |
| N-05 | faltavam drives como vingança e saudade | D-12: vontades dirigidas (simulação §5.3) |
| N-06 | a repetição reforça a memória; o tempo apaga | simulação §14 (fidelidade, reforço ao falar de novo) |
| N-07 | o MVP começa pela conversa | D-09: o produto é o simulador de conversas |
| N-08 | apego também a coisas | associações (simulação §5.7) |
| N-09 | necessidades fisiológicas movem o personagem | camada do corpo e vontade de sair (simulação §5.1 e §11) |

## Cuidados ao ler os estudos

- Citam arquivos que não existem neste repositório (`DECISOES.md`, `PLANO-DE-MECANICAS-E-LOGICA.md`,
  `AI-FANTASY-PLANO.md`), que eram pacotes exportados para a pesquisa.
- Entre 90% e 94% dos bytes de cada estudo são imagens em base64; muitas fórmulas só existem como
  imagem.
- Frases como "validámos" não têm código nem dados por trás: os números são hipóteses.
- Parte das fontes são wikis de fãs e fóruns; o roadmap original perdeu seções na exportação.
- "JEV" nos estudos é termo histórico; hoje o papel se chama SOM (System One Model).
