# Avaliação e validação

> Como saber se o produto funciona (D-23). Testes provam que o código faz o que a especificação
> diz; a avaliação mede se as conversas **parecem de gente**.

## 1. O que se valida

A hipótese do produto: um motor de laços, vontades e atos, com resultados sorteados e
consequências que persistem, produz conversas que parecem naturais quando o modelo de texto as
encena. A avaliação responde a cinco perguntas:

1. **Naturalidade:** as falas soam como pessoas, com voz própria e subtexto?
2. **Variedade:** elencos e laços sorteados geram situações realmente diferentes?
3. **Consequência:** o que acontece numa fatia muda a próxima de forma perceptível?
4. **Controle:** o modelo encena sem inventar fatos nem decidir resultados?
5. **Viabilidade:** custo, tempo de resposta e desempenho do motor cabem no uso real?

## 2. Métricas e metas (pacote B)

| Métrica | Como se mede | Meta |
| --- | --- | --- |
| Naturalidade | nota do maintainer de 1 a 5 em "soa natural" e "parece gente", por fala | média ≥ 4 nas 20 cenas douradas |
| Coerência | sim/não por fala: combina com status, laços e contexto? | ≥ 90% sim |
| Fatos inventados | sim/não por fala, mais a marca automática da validação | 0 |
| Leitura do SOM | falas do jogador que seguiram sem correção ÷ falas do jogador | ≥ 90% |
| Tempo de resposta | do fim do ato até a fala aparecer | ≤ 5 s em 95% dos casos |
| Custo por conversa | soma de `usage` das chamadas da fatia | ≤ teto fixado após as 5 primeiras cenas |
| Passo do motor | benchmark com 8 personagens | ≤ 16 ms |

Por cena, também: "foi interessante?" (1 a 5) e "as consequências fizeram sentido?" (1 a 5). Não
têm meta; servem para orientar a calibração.

## 3. Rubrica por fala

| Pergunta | Escala |
| --- | --- |
| Soa natural? | 1 a 5 |
| Parece gente (não um robô nem um assistente)? | 1 a 5 |
| Combina com o personagem, o laço e o momento? | sim/não |
| Cita algo que não aconteceu ou que o personagem não sabe? | sim/não |
| Comentário | livre |

A avaliação pode ser **cega**: o inspetor só abre depois de dar as notas, para que saber a
mecânica não influencie a nota.

## 4. Cenas douradas

- **20 cenas em 5 cenários diferentes** (por exemplo: taverna de fantasia, família numa cozinha
  contemporânea, acampamento numa floresta à noite, escritório, nave espacial).
- Cada cena é um arquivo de configuração com premissa, presets, elenco, laços, história e seeds,
  versionado no repositório (`eval/scenes/`).
- Pelo menos uma cena por mecânica central: paquera, provocação, cobrança de dívida, segredo,
  reencontro com saudade, medo do lugar, presença protetora (o pai perto), conversa só entre NPCs,
  alguém que vai embora por necessidade do corpo.
- A transcrição simbólica de cada cena é teste de ouro (ver
  [estratégia de testes](<testing-strategy.md>)).

## 5. Uma rodada de validação

1. Rodar as 20 cenas com a IA real, jogando onde houver personagem do jogador.
2. Dar as notas da rubrica (modo cego).
3. O painel calcula as métricas automaticamente.
4. Escrever o relatório em `docs/evaluation/AAAA-MM-DD.md`: métricas, o que falhou, exemplos de
   falas boas e ruins (sem dados pessoais) e hipóteses de calibração.
5. Calibrar (números do motor, prompts, presets) e repetir.

## 6. Teste cego com outras pessoas

Antes de declarar o produto validado: 3 a 5 pessoas que não conhecem o sistema jogam pelo menos
3 cenas cada. Pergunta principal: "os personagens pareciam pessoas?" (sim/não) e o porquê. Meta:
a maioria responde sim.

## 7. Decisão

| Resultado | Decisão |
| --- | --- |
| Todas as metas do pacote B e o teste cego aprovados | **validado**: registrar decisão nova e planejar o próximo passo do produto |
| Metas próximas | calibrar e repetir a rodada |
| Naturalidade muito abaixo com o motor certo | revisar o modelo de simulação (ADR) ou os prompts |
| Passo do motor acima de 16 ms de forma consistente | ativar a tarefa PERF-01 (WebAssembly) |
| Custo acima do teto | ajustar prompts, contexto ou modelo |
