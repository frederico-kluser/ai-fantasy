# Glossário

Vocabulário canónico do AI Fantasy. Se um termo não estiver aqui, não invente outro: abra
uma issue para o adicionar. A documentação em português usa estes termos; o código usa os
equivalentes em inglês indicados entre parênteses.

## Produto e motor

| Termo | Definição |
| --- | --- |
| **AI Fantasy** | RPG procedural inspirado no Adventure Mode de Dwarf Fortress, com região de várias localidades desde a base e visualização final 2D isométrica, nunca 3D real. TUI/ASCII é depuração e validação do motor. |
| **Hermeneutic Core** | O motor determinístico do jogo: ECS, tick, regras, conversação, persistência. |
| **Offline-first** | O runtime não usa rede. Só é permitido *loopback* para os *sidecars* locais de modelo. |
| **Tick** | Passo lógico do mundo, avançado pelo custo determinístico de ações como movimentar-se e falar. Relógio real, texto NLG, espera de inferência, UI e câmera não acrescentam ticks por si só. Custos e ordem de agenda ainda a contratar. |
| **Seed** (`Seed`) | `u64` que determina todas as sequências pseudoaleatórias. Mesmo seed + mesmas entradas ⇒ mesmo estado. |
| **Replay** | Reprodução de uma sessão sem inferência ou relógio real, usando seed e entradas autoritativas normalizadas. Formato do log, RNG e autoridade do save permanecem em CTR-01/CTR-02 do plano de execução. |
| **Estado autoritativo** (`authoritative state`) | Região, entidades, agendas, genomas, percepção/memória e fatos relevantes às decisões. Câmera, overlay privilegiado e métricas não o alteram; protocolo durável e campos completos ainda a contratar. |
| **Estado canónico** (`canonical state`) | Serialização determinística do estado, com chaves ordenadas e formatação fixa, usada para hashes e golden tests. |
| **Hash de estado** (`state hash`) | BLAKE3 do estado canónico num tick; prova de determinismo. |

## Simulação

| Termo | Definição |
| --- | --- |
| **ECS** | *Entity Component System*: entidades são IDs; componentes são dados; sistemas são funções sobre queries. |
| **Entidade** (`Entity`) | Ator, item, local, rumor ou evento. ID estável e geracional. |
| **Componente** (`Component`) | Bloco de dados puro (atributos, fisiologia, traços, inventário). Sem lógica. |
| **Sistema** (`System`) | Função determinística que lê/escreve componentes numa ordem fixa. |
| **Relação** (`Relationship`) | Par de entidades com semântica (amizade, inimizade, casamento). No Flecs, é uma *pair*. |
| **Ator** (`Actor`) | Entidade jogável ou NPC com atributos, fisiologia, traços e memória. |
| **NPC** | *Non-player character*; ator controlado pela simulação. |
| **Traço** (`Trait`) | Valor em ponto fixo `[0, 1]` que modula comportamento (combatividade, empatia, medo). |
| **Utilidade** (`Utility AI`) | Seleção de ação por pontuação ponderada, determinística e testável. |
| **FSM** | *Finite State Machine*; máquina de estados comportamental local. |
| **Rumor** | Informação com fidelidade, alcance, meia-vida e portadores vivos; degrada no espaço-tempo. |
| **Evento de conversa** (`ConversationEvent`) | Registo simbólico compacto de uma interação: ator, alvo, ação, deltas, labels, status. Sem strings de diálogo. |
| **Zero-string log** | Princípio de que o *game loop* não gera nem guarda palavras; guarda enums, IDs e números. |
| **NLG** | *Natural Language Generation*: tradução de tuplos em diálogo, feita sob procura. |
| **NLU** | *Natural Language Understanding*: interpretação de intenção em texto livre. |
| **Lazy NLG** | O diálogo só é gerado quando o jogador o abre; nunca por tick. |
| **Hermenêutica** | Reconstrução interpretativa de uma sequência de eventos simbólicos, com âncoras factuais. |
| **Tempo por ação** (`action-driven time`) | Tempo avança por ações autoritativas do personagem, não pela duração da apresentação. Agenda regional processa o intervalo lógico contratado. |
| **Região procedural** (`procedural region`) | Conjunto de várias localidades geradas desde a primeira base simulável, com interações entre áreas; foco/câmera não congela outras áreas nem as remove do hash. |
| **Memória de ambientes** (`last-seen memory`) | Snapshot da última percepção autoritativa; permanece congelado fora do FOV. Desenhar uma silhueta não o atualiza. |
| **Percepção autoritativa** (`authoritative perception`) | Informação percebida pelo personagem que pode alimentar conhecimento e decisões de NPC/MLP; distinta de privilégio visual do jogador. |
| **Overlay de silhuetas** (`privileged silhouette overlay`) | Apresentação privilegiada de todos os personagens atrás de construções, inclusive não percebidos. Alcance/Z ainda em revisão; não atualiza memória ambiental, rumores ou conhecimento/MLP dos NPCs. |
| **Mini-MLP individual** (`individual behavior MLP`) | Rede pequena em ponto fixo que modula FSM/Utility AI a partir de percepção autoritativa; experiência/herança/evolução na trilha posterior. Sem LLM/sidecar no tick. |

## IA offline

| Termo | Definição |
| --- | --- |
| **System One** | Classe de modelos que devolvem decisões tipadas e probabilidades, sem gerar texto. |
| **JEV** | Rótulo histórico usado em rascunhos para o papel de System One. **Não é runtime, motor, processo ou dependência.** No código, usar `system_one`. |
| **d1-2B** | Modelo de decisão local da Liquid AI (1,92B, base LFM3-VL-2B) que materializa o papel de System One. |
| **LFM3-1.7B** | Modelo de texto local (1,73B, 256K de contexto) usado para NLU/NLG e proposta de regras. |
| **Primitiva** | Tipo de pergunta do System One: `noul` (sim/não), `choice` (escolha), `score` (nota). |
| **noul** | Pergunta binária; devolve probabilidade de “sim” em `[0, 1]`. |
| **choice** | Escolha entre opções nomeadas; devolve distribuição de probabilidade. |
| **score** | Nota numa rubrica ordenada; devolve valor e confiança. |
| **Forward pass** | Uma passagem do modelo; o d1-2B responde sem gerar tokens (`output_tokens = 0`). |
| **Sidecar** | Processo local `llama-server` que serve o modelo via HTTP em `127.0.0.1`. |
| **Model supervisor** | Componente que arranca, verifica, reinicia e encerra os *sidecars*. |
| **Fallback determinístico** | Comportamento do jogo quando o modelo não está disponível: heurísticas nativas, sem quebrar o save. |
| **Cassette** | Resposta de modelo gravada e sanitizada, usada para testes herméticos. |
| **Modelo propõe, núcleo dispõe** | Princípio: a saída do modelo é dado não confiável; só o materializador determinístico altera estado. |

## Regras

| Termo | Definição |
| --- | --- |
| **Ação nativa** (`native action`) | Ação com handler determinístico no core. Não passa pelo LFM3. |
| **Ação emergente** (`emergent action`) | Combinação de intenções sem handler nativo; exige proposta de regra. |
| **Proposta de regra** (`RuleProposal`) | JSON estruturado gerado pelo LFM3, ainda não validado. |
| **Regra** (`Rule`) | Proposta validada, versionada, com efeitos tipados e proveniência. |
| **Materializador** (`RuleMaterializer`) | Função pura que transforma `Rule + Context` num `EffectSet` determinístico. |
| **Efeito** (`Effect`) | Mudança tipada de estado: dano, delta de relação, transferência de item, status, rumor. |
| **Clamp** | Limite numérico aplicado por código (DC, deltas, durações) para impedir valores absurdos. |
| **Validação semântica** | Verificação de que IDs existem, efeitos são permitidos e o alvo é válido. |
| **Dry-run** | Aplicação da regra numa cópia do estado para verificar invariantes antes de a cometer. |
| **Proveniência** (`provenance`) | Modelo, versão, hash do *prompt*, tick e cassette que originaram a regra; serve para auditoria, não para lógica. |
| **Quarentena** | Estado de uma regra proposta que ainda não passou em validação/dry-run. |
| **DC** | *Difficulty Class*, na escala D20 (5–25 no AI Fantasy), calculada por código a partir do tier. |

## Testes e qualidade

| Termo | Definição |
| --- | --- |
| **TDD** | *Test-Driven Development*: Red → Green → Refactor. Teste primeiro, sempre. |
| **Testável a 100%** | Todo o comportamento tem observabilidade e controlabilidade por uma porta pública; não significa 100% de cobertura de linhas. |
| **Test list** | Lista de comportamentos a implementar, escrita antes do primeiro teste. |
| **Unit test** | Teste de uma função/módulo sem I/O, rede, relógio real ou processo. |
| **Property test** | Teste que verifica uma invariante para entradas geradas (proptest). |
| **Contract test** | Teste que valida a mesma interface contra fake e adaptador real. |
| **Golden test** | Comparação com uma saída canónica aprovada (insta). |
| **E2E** | Teste ponta a ponta do binário, com cenário, seed e modelos falsos. |
| **Fixture** | Dado de teste versionado, pequeno e determinístico. |
| **Fake** | Implementação de teste de uma porta, controlável e determinística. |
| **Cassette** | Ver acima; usada para replay de modelo. |
| **Mutation testing** | Introduz mutações no código e verifica se os testes as matam (cargo-mutants). |
| **Cobertura de diff** | Percentagem de linhas novas cobertas por testes; gate de PR. |
| **Complexidade ciclomática** | Número de caminhos independentes numa função (McCabe). Limite: 10. |
| **Complexidade cognitiva** | Custo mental de ler uma função (aninhamento, quebras de fluxo). Limite: 10. |
| **ADR** | *Architecture Decision Record*: decisão, contexto, consequências. |
| **RFC** | Proposta de mudança grande, discutida em issue antes de ADR. |

## Governança

| Termo | Definição |
| --- | --- |
| **Conventional Commits** | Formato `tipo(escopo)!: descrição`; alimenta changelog e SemVer. |
| **SemVer** | `MAJOR.MINOR.PATCH`; a versão é calculada dos commits, não digitada. |
| **Ruleset** | Regra do GitHub que impõe PR, reviews, checks, nomes de branch e tags imutáveis. |
| **Squash merge** | Integração que colapsa os commits do PR num só; é merge, não rebase. |
| **Merge** | Única estratégia de sincronização/integração permitida. Rebase é proibido. |
| **CoALA** | Memória local do projeto (`.agents/ai-fantasy-coala-agent-skill/`) com notas e catálogo de código. |
| **Gate** | Verificação obrigatória (commit, push, PR, release, segurança) que não se contorna. |
| **Subagent de desenvolvimento** | Agente delegado de uma tarefa planejada e independente, com worktree/arquivos isolados; não é componente do runtime. A decisão D-08 não impõe cap artificial. |
| **Juiz de integração** | Papel independente que fecha a barreira, integra, resolve conflitos, valida/corrige e prepara a próxima onda; não substitui responsabilidade humana nem autoriza execução pelo planejamento. |

**Revisão documental: 2026-11-08.** [Definições](<architecture/roadmap.md>) e
[respostas do maintainer](<planning/decisions.md>) são as fontes semânticas; atividades,
dependências, contratos CTR e critérios ficam no [ROADMAP de execução](<../ROADMAP.md>).
[ADR 0008](<architecture/adr/0008-action-driven-simulation-time.md>) e
[ADR 0009](<architecture/adr/0009-privileged-silhouette-overlay.md>) são propostas de contratos,
não implementações aceitas.
