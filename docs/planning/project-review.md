# AI Fantasy — revisão de definições e decisões no Plannotator

> **Rodada 1 · 2026-11-08 · Registro histórico da revisão inicial.**
> As oito perguntas foram respondidas diretamente pelo maintainer, incluindo a nota da Q7;
> as respostas válidas estão no [registro de decisões](<decisions.md>). Não reapresentar estas perguntas.
> O inventário e os achados abaixo descrevem a base anterior à devolutiva; recomendações antigas
> não prevalecem sobre as respostas humanas nem sobre as definições canônicas reconciliadas.
> O resultado foi usado para refinar o [roadmap de execução](<../../ROADMAP.md>), sem autorizar aplicação ou publicação.

## 1. Como revisar e o que será entregue

1. Responda às oito perguntas abaixo e anote qualquer definição que não represente sua intenção.
2. Revise o inventário, os problemas técnicos e as alternativas; não precisa decidir detalhes que testes podem resolver.
3. Envie as anotações. Eu registrarei cada resposta como decisão, ajuste ou questão ainda aberta.
4. Reorganizarei atividades, dependências, ondas de agentes auxiliares e critérios de aceite no roadmap.
5. Se aparecer uma decisão nova indispensável, haverá outra rodada curta; a aprovação final será do documento refinado.

**Não será tratado como decisão:** silêncio, pergunta pulada, recomendação não selecionada ou fechamento da janela.
Uma aprovação com perguntas essenciais sem resposta não será interpretada como autorização para adivinhar o escopo.

### Fontes e autoridade

- Contratos operacionais: [AGENTS](<../../AGENTS.md>) e [CLAUDE](<../../CLAUDE.md>).
- Definições canônicas atuais: [roadmap de arquitetura](<../architecture/roadmap.md>).
- Arquitetura: [overview](<../architecture/overview.md>); decisões aceitas: [ADRs](<../architecture/adr/README.md>).
- Engenharia: [desenvolvimento](<../engineering/development-rules.md>), [testes](<../engineering/testing-strategy.md>), [qualidade](<../engineering/code-quality.md>), [IA offline](<../engineering/offline-ai.md>).
- Visão apresentada ao usuário: [README](<../../README.md>); processo: [governança](<../../GOVERNANCE.md>).
- [Documento original](<../../Roadmap%20Jogo%20Procedural%20Com%20LFM3.md>): **histórico, sem autoridade normativa**.

**Proposta documental:** manter as definições e a errata no roadmap de arquitetura; usar o novo
[ROADMAP](<../../ROADMAP.md>) como fonte única de atividades, dependências e estado de execução.
Após sua aprovação, a tabela antiga de fases será reconciliada e apontará para ele. Não moveremos
arquivos nem mudaremos silenciosamente o documento canônico ou ADRs aceitos.

## 2. Oito decisões suas — primeira rodada

### D-01 — Marco de produto e ordem de prioridades

:::question
O que deve contar como a primeira entrega realmente pronta para você?

Hoje o roadmap chama F0–F7 de MVP, mas só oferece TUI; blocos, fog of war e visualização final aparecem em F9. Recomendo distinguir a prova técnica do motor de uma primeira versão jogável que já representa o produto prometido.

- [ ] Motor validado primeiro, depois versão jogável 2D — dois marcos distintos, sem chamar TUI de produto final
- [ ] Primeira entrega pública já jogável em 2D — render e conteúdo mínimo entram antes da estabilização final
- [ ] Apenas motor/TUI nesta etapa — o roadmap completo preserva render 2D posterior, fora do primeiro marco

Recommended: Motor validado primeiro, depois versão jogável 2D
:::

### D-02 — Ritmo de simulação e espera pela IA

:::question
Como o tempo do jogo deve avançar enquanto o jogador escolhe ou escreve uma ação?

O núcleo já tem ticks lógicos; isso não define se a experiência é por turnos ou em tempo real. Essa escolha afeta justiça do combate, fila de comandos e respostas de IA que chegam quando o mundo já mudou.

- [ ] Por turnos no primeiro jogável — o mundo avança por ações explícitas; menor risco enquanto validamos as regras
- [ ] Tempo real com pausa — simulação contínua, pausa deliberada para decisões e leitura
- [ ] Tempo real sem pausa — o mundo continua durante decisões, com cancelamento e revalidação de respostas atrasadas

Recommended: Por turnos no primeiro jogável
:::

### D-03 — Experiência central da primeira fatia jogável

:::question
Qual experiência precisa ser excelente primeiro, antes de ampliarmos o jogo?

Já existem intenções sociais, combate, fuga e construção na visão, mas não um recorte de gameplay com começo, consequência e fim. Recomendo uma vila pequena em que negociar, mentir e espalhar rumores mudem relações observáveis; exploração e combate entram como suporte mínimo.

- [ ] Relações sociais e rumores — negociar, mentir, extorquir e observar consequências
- [ ] Exploração e construção — escavar, construir, navegar e descobrir ambientes
- [ ] Combate e sobrevivência — confrontos, fuga, fome e recursos como ciclo principal
- [ ] Sandbox equilibrado — uma versão mínima de cada eixo, com maior esforço de integração

Recommended: Relações sociais e rumores
:::

### D-04 — Silhueta de personagem e informação oculta

:::question
Uma silhueta deve revelar alguém que o personagem jogador não consegue perceber?

Os documentos dizem que personagens atrás de construções aparecem como silhuetas, mas também exigem áreas nunca vistas escuras e memória congelada. Recomendo distinguir oclusão do desenho de bloqueio real da visão: a silhueta ajuda a enxergar alguém já percebido, sem funcionar como raio X.

- [ ] Só personagens já percebidos — a silhueta resolve oclusão visual sem revelar áreas ocultas
- [ ] Personagem jogador e aliados conhecidos — outros só aparecem com percepção atual
- [ ] Todos atrás das construções — escolha explícita de raio X; exige definir limites e revisar a regra de fog of war

Recommended: Só personagens já percebidos
:::

### D-05 — Hardware de referência e plataformas

:::question
Qual máquina deve ser a referência para aprovar desempenho da primeira versão?

Windows, Linux e macOS são objetivos existentes, mas latências e memória não têm hardware ou perfil de medição fixado. Recomendo escolher uma máquina doméstica real como referência, manter execução sem modelos funcional e medir IA local separadamente; escreva CPU, RAM e GPU na nota se souber.

- [ ] Meu PC Windows como referência — CI de portabilidade desktop, desempenho aprovado na máquina que vou usar
- [ ] Portátil sem GPU dedicada como referência — prioriza CPU e baixo consumo, possivelmente com IA mais lenta
- [ ] Perfis separados CPU e GPU — metas por perfil, sem exigir a mesma latência de máquinas diferentes

Recommended: Meu PC Windows como referência
:::

### D-06 — Integração com o render que você fornecerá

:::question
Como você pretende desenvolver e conectar a visualização 2D ao motor?

A documentação atribui o render ao maintainer, mas não define sua stack ou a fronteira de integração. Recomendo um contrato de leitura filtrado por personagem e versionado desde cedo; a implementação do cliente depende da sua escolha, sem acrescentar sockets fora dos sidecars de modelos.

- [ ] Cliente Rust no mesmo processo — integração por API de leitura; menor superfície de IPC
- [ ] Cliente separado em outra stack — definir linguagem e ponte offline em ADR antes de implementar
- [ ] Ainda não escolhi a stack — aprovar só o contrato de leitura e adiar a ligação concreta

Recommended: Ainda não escolhi a stack
:::

### D-07 — Dimensão do mundo e conteúdo inicial

:::question
Qual tamanho e tipo de mundo deve delimitar a primeira fatia de gameplay?

O alvo técnico de 10 mil entidades serve para stress, não define conteúdo jogável. Uma vila pequena com ambientes e personagens curados permite provar relações, construção e visão antes de gerar regiões inteiras; números precisos serão propostos e medidos, não confundidos com promessas.

- [ ] Uma vila pequena com cenários curados — geração determinística limitada e conteúdo fácil de revisar
- [ ] Uma região procedural com várias localidades — exploração maior, mais geração e persistência desde o início
- [ ] Um laboratório de cenários sem campanha — primeiro validar mecânicas, depois construir conteúdo jogável

Recommended: Uma vila pequena com cenários curados
:::

### D-08 — Paralelismo e orçamento de subagents

:::question
Qual limite de subagents simultâneos você quer para executar as ondas no futuro?

Mais agentes só ajudam quando contratos e arquivos não se sobrepõem; há custo de revisão e integração. Recomendo quatro no máximo: até três implementadores em áreas isoladas e um revisor independente, com um integrador coordenando e checkpoints humanos entre ondas.

- [ ] Até 4 subagents — bom paralelismo com revisão dedicada e integrações pequenas
- [ ] Até 2 subagents — menor custo e menos conflitos; ondas mais longas
- [ ] Até 6 subagents — mais paralelismo apenas após contratos estáveis e medição de ganho

Recommended: Até 4 subagents
:::

## 3. Inventário completo das definições atuais

**Legenda:** DEC = decisão existente; NOR = regra normativa; DES = desenho ainda sem implementação;
META = alvo a medir; ABERTO = escolha ou contrato incompleto; HIST = histórico corrigido.
Nenhum item DES ou META significa que a funcionalidade já existe.

### 3.1 Identidade, visão e limites

| ID | Definição | Estado e fonte |
| --- | --- | --- |
| V-01 | AI Fantasy é o jogo; Hermeneutic Core é o motor. | DEC · [visão](<../architecture/roadmap.md#11-visão>) |
| V-02 | RPG procedural inspirado no Adventure Mode de Dwarf Fortress; mundo simulado, não gerado como prosa. | DEC · [visão](<../architecture/roadmap.md#1-visão-pilares-e-não-objetivos>) |
| V-03 | Fase atual F0: documentação e governança; sem workspace ou executável. | NOR · [contrato](<../../AGENTS.md#1-identidade-e-estado>) |
| V-04 | Nenhuma base de código sem pedido explícito e PR de scaffold aprovado para integração. | NOR · [contrato](<../../AGENTS.md#1-identidade-e-estado>) |
| V-05 | Jogo funciona sem modelos; a alternativa determinística (fallback) não bloqueia o arranque. | DEC · [fallback](<../engineering/offline-ai.md#7-fallback-e-degradação>) |
| V-06 | Multiplayer, nuvem, contas, modding arbitrário, editor visual e agente que joga sozinho estão fora desta fase. | DEC · [não objetivos](<../architecture/roadmap.md#13-não-objetivos-nesta-fase>) |
| V-07 | Visualização final é 2D isométrica; 3D real está excluído, não apenas adiado. | DEC · [visualização](<../architecture/roadmap.md#210-visualização-2d-isométrico-sem-3d-real>) |
| V-08 | TUI/ASCII serve para depuração, testes de ponta a ponta (E2E) e fallback; não é a visualização final. | DEC · [visualização](<../architecture/roadmap.md#210-visualização-2d-isométrico-sem-3d-real>) |
| V-09 | Windows, Linux e macOS primeiro; dispositivos móveis requerem decisão posterior. | DEC/ABERTO · [atributos](<../architecture/overview.md#1-objetivo-e-atributos-de-qualidade>) |

### 3.2 Simulação, mundo e personagens

| ID | Definição | Estado e fonte |
| --- | --- | --- |
| S-01 | Rust 2024 estável; Flecs pelo adaptador Rust flecs_ecs; versão, versão mínima do Rust (MSRV) e segurança do adaptador a validar. | DEC/ABERTO · [ADR 0002](<../architecture/adr/0002-rust-flecs-deterministic-core.md>) |
| S-02 | ECS com IDs estáveis geracionais, componentes de dados e relacionamentos nativos. | DES · [ECS](<../architecture/roadmap.md#21-ecs-com-relacionamentos-nativos>) |
| S-03 | Atributos: força, agilidade, resiliência, percepção, inteligência, linguagem, memória e estabilidade emocional. | DES · [componentes](<../architecture/overview.md#72-componentes-do-ator>) |
| S-04 | Fisiologia: HP, fadiga, fome e estados; inventário ordenado e equipamento. | DES · [componentes](<../architecture/overview.md#72-componentes-do-ator>) |
| S-05 | Traços: combatividade, empatia, medo, curiosidade, lealdade e ganância; relações com confiança, medo, empatia, dependência e hostilidade. | DES · [componentes](<../architecture/overview.md#72-componentes-do-ator>) |
| S-06 | Máquina de estados (FSM) + Utility AI com FORM_PARTY, NEGOTIATE, INITIATE_COMBAT, FLEE e APPEASE; A* para fuga. | DES · [comportamento](<../architecture/roadmap.md#22-comportamento-autónomo>) |
| S-07 | Tick lógico u64, alvo conceitual de 100 ms de simulação; render desacoplado. Ritmo do jogador em D-02. | DES/ABERTO · [tick](<../architecture/roadmap.md#23-tick-tempo-e-determinismo>) |
| S-08 | Tick em uma única thread; sistemas ordenados; consultas ordenadas quando afetam o resultado. | NOR · [ADR 0005](<../architecture/adr/0005-deterministic-simulation-contract.md>) |
| S-09 | ChaCha20 com sequências independentes (streams) combat/social/rumor/spawn; behavior previsto para evolução. | DES · [determinismo](<../architecture/adr/0005-deterministic-simulation-contract.md>) e [MLP](<../architecture/roadmap.md#28-mini-mlp-por-personagem-e-redes-por-raçaespécie-individualidade>) |
| S-10 | Estado autoritativo usa inteiros, ponto fixo e basis points; sem ponto flutuante, HashMap, relógio real ou RNG global. | NOR · [ADR 0005](<../architecture/adr/0005-deterministic-simulation-contract.md>) |
| S-11 | Hash BLAKE3 do estado canônico; seed + entradas devem reproduzir o mesmo estado. O contrato de entradas externas precisa ser completado. | NOR/ABERTO · [ADR 0005](<../architecture/adr/0005-deterministic-simulation-contract.md>) |
| S-12 | Mundo em grelha inteira x/y/z, com níveis; escavar, construir, cortar árvores, abrir e tapar buracos. | DEC/DES · [blocos](<../architecture/roadmap.md#29-mundo-em-blocos-estilo-dwarf-fortress--minecraft>) |
| S-13 | Material estrutural é cubo; casas, muros, pontes, escadas e cavernas se compõem deles. | DEC · [blocos](<../architecture/roadmap.md#29-mundo-em-blocos-estilo-dwarf-fortress--minecraft>) |
| S-14 | Itens de uso, consumo, roupa e combate não são cubos; pertencem ao inventário. | DEC · [blocos](<../architecture/roadmap.md#29-mundo-em-blocos-estilo-dwarf-fortress--minecraft>) |
| S-15 | Direção do olhar, linha de visão e memória do ambiente pertencem à simulação, não à câmera. | DEC/DES · [visibilidade](<../architecture/roadmap.md#211-visibilidade-campo-de-visão-e-memória-de-ambientes-fog-of-war>) |
| S-16 | Três camadas: visão ativa ao vivo, memória desvanecida congelada e nunca visto escuro; inclui o último estado observado das criaturas. | DEC · [visibilidade](<../architecture/roadmap.md#211-visibilidade-campo-de-visão-e-memória-de-ambientes-fog-of-war>) |
| S-17 | Câmera navega por níveis de altura (z-levels) sem mudar posição, olhar ou estado autoritativo. | DEC · [visibilidade](<../architecture/roadmap.md#211-visibilidade-campo-de-visão-e-memória-de-ambientes-fog-of-war>) |
| S-18 | Silhuetas por oclusão; o limite de informação exposta precisa de D-04. | DEC/ABERTO · [visualização](<../architecture/roadmap.md#210-visualização-2d-isométrico-sem-3d-real>) |
| S-19 | Mini-MLP próprio por personagem, arquétipo de raça/espécie, variação, aprendizado de vida e transmissão a descendentes. | DEC/DES · [MLP](<../architecture/roadmap.md#28-mini-mlp-por-personagem-e-redes-por-raçaespécie-individualidade>) |
| S-20 | Treino por reforço local e evolução, cruzamento e mutação; a rede modula a FSM, não aplica efeitos. | DES · [MLP](<../architecture/roadmap.md#28-mini-mlp-por-personagem-e-redes-por-raçaespécie-individualidade>) |
| S-21 | Genomas pequenos em ponto fixo, versionados no save, com hash SHA-256; inferência pura; FSM de referência preservada. | DES · [MLP](<../architecture/roadmap.md#28-mini-mlp-por-personagem-e-redes-por-raçaespécie-individualidade>) |

### 3.3 Conversa, regras, IA e persistência

| ID | Definição | Estado e fonte |
| --- | --- | --- |
| C-01 | Conversas geram eventos simbólicos, sem prosa no tick; memória referencia eventos e rumores. | DEC/DES · [conversa](<../architecture/roadmap.md#24-registo-objetivo-de-conversa-zero-string>) |
| C-02 | Evento previsto de 48 bytes; tick/local/orador/ouvinte/intenção/valência/resultado/deltas/item/labels/status/rumor. O formato contém inconsistências de tamanho, identidade e precisão. | DES/ABERTO · [evento](<../architecture/overview.md#73-registo-de-conversa-zero-string>) |
| C-03 | Intenções GREETING, NEGOTIATE, EXTORTION, LIE, BRIBE, SHARE_RUMOR, APPEASE; esquema de enums versionado ainda não existe. | DES · [evento](<../architecture/overview.md#73-registo-de-conversa-zero-string>) |
| C-04 | NLG só quando conversa ou histórico é aberto; âncoras factuais e cache por sequência/modelo/prompt/locale. | DEC/DES · [lazy NLG](<../architecture/roadmap.md#25-leitura-hermenêutica-lazy-nlg>) |
| C-05 | Rumor tem fidelidade, meia-vida, escopo, portadores vivos e cognição mínima; degradação no núcleo. | DES · [rumores](<../architecture/roadmap.md#26-rumores-e-propagação>) |
| C-06 | LFM3-1.7B para NLU, propostas e NLG; d1-2B como System One local de triagem tipada. | DEC · [IA offline](<../engineering/offline-ai.md#1-três-nomes-três-coisas-diferentes>) |
| C-07 | JEV é apenas histórico ou errata; nunca processo, banco, motor ou identificador de código. | NOR/HIST · [ADR 0003](<../architecture/adr/0003-jev-is-not-a-runtime.md>) |
| C-08 | llama.cpp local é o caminho principal; noul/choice/score; até 16 perguntas; other/none e bandas de confiança. | DES · [prompt System One](<../engineering/offline-ai.md#51-system-one-d1-2b>) |
| C-09 | ONNX, modelos multimodais, áudio/voz e primitivas extras não são dependências do MVP. | DEC/ABERTO · [compatibilidade](<../architecture/roadmap.md#35-compatibilidade-de-runtimes>) |
| C-10 | Processos auxiliares locais (sidecars) com verificação de hash/tamanho, saúde, tempo limite, porta local, encerramento e nova tentativa manual. | DES · [runtime](<../architecture/overview.md#9-runtime-offline-e-sidecars>) |
| C-11 | Sem rede externa, API keys, telemetria remota ou downloads automáticos; loopback só para modelos. | NOR · [ADR 0001](<../architecture/adr/0001-offline-first-runtime.md>) |
| C-12 | Modelo só propõe RuleProposal; esquema fechado e versionado, sem código/SQL/shell/eval. | NOR · [ADR 0004](<../architecture/adr/0004-model-proposes-core-disposes.md>) |
| C-13 | Normalizar → triagem → nativo ou proposta → parser → validação → materialização → simulação prévia (dry-run) → aplicação/eventos. | DES · [fluxo](<../architecture/roadmap.md#41-pipeline>) |
| C-14 | Efeitos: transfer_item, delta_relationship, attach_label, apply_status, spawn_rumor, damage e heal. | DES · [efeitos](<../architecture/roadmap.md#44-schema-e-efeitos>) |
| C-15 | DC 5–25; deltas −10.000…10.000 bp; até 8 efeitos por resultado; até 3 labels; duração ≤ um ano de jogo; resposta ≤ 64 KiB. | DES · [validação](<../architecture/roadmap.md#45-validação-segurança-e-balanceamento>) |
| C-16 | IDs, alvos, posse e status têm validação semântica; rejeição preserva o mundo; dry-run verifica invariantes. | NOR · [ADR 0004](<../architecture/adr/0004-model-proposes-core-disposes.md>) |
| C-17 | Proveniência de modelo/versão/hash do prompt/tick/cassette; rejeições auditáveis; promoção a regra nativa só humana. | DEC/DES · [ciclo de regras](<../architecture/roadmap.md#46-ciclo-de-vida-de-uma-regra>) |
| C-18 | SQLite incorporado ao binário, WAL e chaves estrangeiras; tabelas migrações/saves/events/narratives/rules/telemetry. | DES · [persistência](<../architecture/overview.md#10-persistência>) |
| C-19 | Save versionado AIFS + seed/tick/hash/payload/checksum; tmp/fsync/rename/backup; migração apenas para versões seguintes. O conteúdo serializado e o protocolo SQLite/arquivo precisam ser definidos. | DES/ABERTO · [persistência](<../architecture/overview.md#10-persistência>) |
| C-20 | Logs estruturados locais; métricas e telemetria agregada por adesão explícita (opt-in); sem dados pessoais ou prompts completos por padrão. | DEC/DES · [observabilidade](<../architecture/overview.md#12-observabilidade>) |
| C-21 | Fallback: heurística para triagem; recusa clara de ações emergentes sem LLM; narrativa por template determinístico. | DEC/DES · [fallback](<../engineering/offline-ai.md#7-fallback-e-degradação>) |

### 3.4 Arquitetura, engenharia e governança

| ID | Definição | Estado e fonte |
| --- | --- | --- |
| E-01 | Crates: domain, ports, rules, conversation, core, nlg, system-one, llm, store, app, tui, scenario e xtask. | DES · [crates](<../architecture/overview.md#4-componentes-e-crates>) |
| E-02 | Domínio puro; core não importa adaptadores/app/UI/store; app concentra a composição e a injeção de dependências; sem async no núcleo. | NOR · [arquitetura](<../engineering/development-rules.md#3-arquitetura>) |
| E-03 | Portas Clock, RngSource, SystemOnePort, LlmPort, SaveStore, EventSink, ModelSupervisor, Transport e TelemetrySink. | DES · [portas](<../architecture/overview.md#5-portas-e-adaptadores>) |
| E-04 | thiserror em bibliotecas; anyhow só em app/binários; AfError com códigos estáveis. | NOR/DES · [erros](<../architecture/overview.md#11-erros-e-invariantes>) |
| E-05 | Sem unsafe fora da FFI aprovada; sem unwrap/expect/panic/todo/unimplemented em bibliotecas. | NOR · [arquitetura](<../engineering/development-rules.md#3-arquitetura>) |
| E-06 | TDD com lista de testes e Red/Green/Refactor; um comportamento por teste; bug exige teste de regressão. | NOR · [TDD](<../engineering/testing-strategy.md#2-tdd-red--green--refactor>) |
| E-07 | Testes unitários sem I/O; integração com diretório temporário; E2E com modelos falsos ou respostas gravadas; contratos fake/real; modelos reais só em execução noturna ou manual, não obrigatórios em PR. | NOR · [testes](<../engineering/testing-strategy.md#9-testes-com-modelos>) |
| E-08 | Cobertura global de 90% de linhas e 85% de ramos; rules 100/100; core 95/90; diff 95%; mutação global 80%, core/rules 90%. | NOR · [ADR 0006](<../architecture/adr/0006-tdd-coverage-mutation.md>) |
| E-09 | Complexidades ciclomática e cognitiva ≤ 10; função ≤ 40 linhas; ≤ 5 parâmetros; aninhamento ≤ 3; match ≤ 12 braços. | NOR · [qualidade](<../engineering/code-quality.md#2-limites>) |
| E-10 | API pública documentada; exemplos compilam; documentação e ADR no mesmo PR; resultados de referência (goldens) aprovados por humano. | NOR · [documentação](<../engineering/development-rules.md#7-documentação>) |
| E-11 | Branch efêmera tipo/slug → PR → checks → squash; merge para sincronizar; nunca rebase, force-push ou no-verify. | NOR · [contrato](<../../AGENTS.md#3-regras-não-negociáveis>) |
| E-12 | Commits e PRs convencionais em inglês; versão calculada, changelog gerado; release sem data prometida. | NOR · [governança](<../../GOVERNANCE.md#releases>) |
| E-13 | Código MIT; pesos não distribuídos; licença dos modelos separada; assets exigem licença e atribuição. | NOR/ABERTO · [ADR 0007](<../architecture/adr/0007-license-and-model-distribution.md>) |
| E-14 | Um maintainer: PR e checks obrigatórios, nenhuma aprovação adicional exigida pelo GitHub no bootstrap; agente auxiliar não substitui responsabilidade humana. | NOR · [bootstrap](<../../GOVERNANCE.md#bootstrap-de-revisão-estado-atual>) |
| E-15 | CoALA local é entrada e catálogo, não autoridade acima da fonte; não guardar segredos nem duplicar documentação. | NOR · [memória](<../../AGENTS.md#11-memória-local-coala>) |
| E-16 | Mudanças médias exigem issue e ADR; mudanças grandes exigem RFC pública por pelo menos 14 dias, ADR e votação. ADR aceito é imutável; mudanças o substituem por novo ADR. | NOR · [decisões:61–85](<../../GOVERNANCE.md#L61-L85>) |
| E-17 | BDFL resolve empate ou impasse e guarda visão/licença; maintainers revisam, integram, publicam e coordenam segurança; reviewers não fazem merge. Transição exige ao menos três maintainers ativos com ≥ 6 meses e ≥ 10 PRs relevantes. Votação tem quórum de maioria, aprovação por maioria simples sem objeção técnica não resolvida; mudanças de governança exigem dois terços, e o BDFL não pode alterar os princípios unilateralmente. Bootstrap mantém PR, checks, auto-review e threads resolvidas; com 2 maintainers exige 1 aprovação, com 3+ exige 2 e code owner. | NOR · [papéis:18–27](<../../GOVERNANCE.md#L18-L27>), [bootstrap:40–52](<../../GOVERNANCE.md#L40-L52>), [votação:73–78](<../../GOVERNANCE.md#L73-L78>) e [mudanças:107–110](<../../GOVERNANCE.md#L107-L110>) |
| E-18 | Vulnerabilidades têm reporte privado, nunca issue pública; confirmação em 48 h, triagem em 3 dias úteis, atualização a cada 7 dias, correção ou mitigação crítica em 30 dias e demais em 90. Embargo de até 90 dias da confirmação, sem extensão unilateral. São alvos de resposta, não provas de serviço já prestado. | NOR/META · [reporte e SLA:18–43](<../../SECURITY.md#L18-L43>) e [divulgação:47–54](<../../SECURITY.md#L47-L54>) |
| E-19 | Documentação de produto/engenharia em pt-BR; identificadores, comentários de código, rustdoc, commits, branches e PRs em inglês; erros para o jogador em português. | NOR · [idiomas:25–33](<../engineering/development-rules.md#L25-L33>) |

### 3.5 Números que não são fatos de implementação

Os documentos atribuem aos modelos 1,92B e 1,73B parâmetros, contextos de 128K e 256K tokens,
calibração até cerca de 64K, saída System One de zero tokens, quantizações e licença com limiar de US$ 10 milhões.
**Nesta revisão conferimos a documentação local, não revalidamos esses model cards ou licenças externamente.**
Antes de integrar: registrar fonte primária, revisão imutável, licença exata, hashes e prova local de compatibilidade.

| Meta atual | Como tornar verificável |
| --- | --- |
| Tick com 10 mil entidades: p50 < 2 ms; p99 < 5 ms. | Fixture, duração, aquecimento, amostras, hardware, build e percentis definidos. |
| Triagem de 16 questões: p95 < 100 ms em desktop; proposta < 2 s; NLG de 3 eventos < 4 s; cache < 5 ms. | Medir perfis de D-05; qualidade separada de latência, sem LLM avaliando lógica. |
| Memória combinada < 2,8 GB. | Definir RAM, VRAM, picos, compartilhamento e contexto; incluir mapa, memória de personagens e genomas no perfil de jogo. |
| Save/load de 10 mil entidades < 250 ms p95. | Dados reais versionados, tamanho e operações de sincronização com disco definidos por plataforma. |
| Teste prolongado de 12 h (soak); teste rápido de 10 mil ticks (smoke). | Testes diferentes: soak com agenda de ações e modelos; smoke lógico rápido sem relógio real. |
| NLG de 100 sequências sem alucinação mecânica. | Zero erro aceito no corpus revisado, não promessa de detectar toda alucinação em prosa arbitrária. |
| Regras: 200 válidas + 200 inválidas. | Requisito exato do [ADR 0004](<../architecture/adr/0004-model-proposes-core-disposes.md>), não 200 no total. |
| MLP: 100 gerações, 100 execuções e mutação de código ≥ 90%. | Cenários de genética, aprendizagem e extinção; hash completo, FSM de referência e diversidade mensurável. |

## 4. O que não está claro, por que importa e como fazer melhor

### L-01 — Evento binário e IDs contraditórios · bloqueia contrato de dados

- **Evidência:** [overview:209–220](<../architecture/overview.md#L209-L220>) declara IDs u32 e depois geracionais u64; [evento:242–260](<../architecture/overview.md#L242-L260>) soma 46 bytes, mas declara 42 + 6. Os deltas i8 em pontos percentuais não preservam 1 bp permitido pelo [schema:304–311](<../architecture/overview.md#L304-L311>). O registro compacto contém apenas um item e um delta de HP, enquanto o schema permite até oito efeitos e múltiplos alvos.
- **Impacto:** perda de identidade histórica, precisão e fatos necessários ao replay e à reconstrução de diálogos; múltiplas transferências e efeitos não cabem na projeção publicada sem um registro complementar.
- **Alternativas:** IDs completos e deltas em basis points em um registro versionado maior; ou registro compacto com tabela de referência estável, limites provados e eventos completos à parte. Só corrigir 42 → 46 não resolve a geração dos IDs nem a perda de informação.
- **Recomendação:** definir semântica de identidade primeiro, separar modelo de domínio do formato serializado e preservar todos os fatos dos efeitos aceitos. Tratar o registro compacto como projeção, caso seja mantido; aprovar tamanho, ordem dos bytes, sentinelas e versão em ADR. Testes de tamanho, ida e volta da serialização, delta de 1 bp, transferências múltiplas, ID obsoleto e golden binário.
- **Como poderia ter sido feito:** calcular o formato com uma tabela de posições dos campos e exemplos antes de prometer 48 bytes; tratar o tamanho como orçamento, não como fonte de identidade ou justificativa para descartar fatos.

### L-02 — Replay sem registrar inferência e timeout · bloqueia prova de determinismo

- **Evidência:** [ADR 0005:42](<../architecture/adr/0005-deterministic-simulation-contract.md#L42>) promete seed + log; [ADR 0004:10–14](<../architecture/adr/0004-model-proposes-core-disposes.md#L10-L14>) reconhece LLM não determinístico; [fallback:200–202](<../engineering/offline-ai.md#L200-L202>) depende de tempo limite.
- **Alternativas:** reexecutar o modelo e aceitar divergência, incompatível com o contrato; ou registrar todas as entradas externas relevantes normalizadas.
- **Recomendação:** log versionado com comando resolvido, resposta validada, abstenção, timeout ou cancelamento, ordem, tick e snapshot usado. Replay não faz inferência nem consulta relógio; consome essas entradas.
- **Como poderia ter sido feito:** especificar a fronteira determinística e o que pertence ao log antes de dizer “mesma seed + comando”.

### L-03 — Proposta chega depois que o mundo mudou · bloqueia aplicação segura

- **Evidência:** [fluxo](<../architecture/roadmap.md#41-pipeline>) trabalha com snapshot e modelo fora do tick; falta contrato de validade entre dry-run e commit.
- **Alternativas:** pausar conforme D-02; revalidar no tick de aplicação; ou cancelar e propor novamente com limite de tentativas.
- **Recomendação:** snapshot, tick e hash de origem, identificador de pedido, revalidação semântica e aplicação atômica na fronteira do tick. Dry-run não consome RNG definitivo nem deixa efeitos parciais; estado e streams são promovidos juntos.
- **Como poderia ter sido feito:** um protocolo de transação de comando, não duas chamadas independentes “dry-run” e “commit”.

### L-04 — “XML estrito” não corresponde à sintaxe ilustrada

- **Evidência:** [exemplo de tool call:627–658](<../architecture/roadmap.md#L627-L658>) usa `<function=...>` e `<parameter=...>`, diferentes de XML convencional bem formado. Também usa `attributes_involved`, `on_success_changes`, `on_failure_changes` e `propagation_rules`, enquanto o [schema:269–306](<../architecture/overview.md#L269-L306>) exige `attributes`, `on_success`, `on_failure`, `propagation` e `schema_version`; a versão obrigatória está ausente do exemplo.
- **Alternativas:** parser específico de gramática delimitada; ou normalização confiável para esquema intermediário, se comprovada contra runtime de versão fixa.
- **Recomendação:** definir gramática do fornecedor, delimitação, quantidade de chamadas, limites e mapeamentos `attributes_involved` → `attributes`, `on_success_changes` → `on_success`, `on_failure_changes` → `on_failure` e `propagation_rules` → `propagation`. Tornar a versão obrigatória no contrato e reconciliar os exemplos. Rejeitar ferramenta desconhecida, campos duplicados, extração ambígua, múltiplos resultados e conteúdo excessivo.
- **Como poderia ter sido feito:** corpus real, respostas gravadas (cassettes) e gramática formal antes de escolher biblioteca XML e declarar suporte.

### L-05 — Blocos e percepção chegam tarde demais

- **Evidência:** [fases:1091–1103](<../architecture/roadmap.md#L1091-L1103>) põem grelha e FOV em F9; A*, rumores e MLP com “estado percebido” dependem anteriormente de geometria ou percepção.
- **Alternativas:** percepção abstrata ou falsa temporária; antecipar contrato e grelha mínima; antecipar todo o render e aumentar o escopo.
- **Recomendação:** contrato e grelha mínima no núcleo; percepção filtrada antes de F8 e do render. Construção rica e cliente 2D podem continuar posteriores. Planejar um grafo de dependências (DAG), não uma sequência artificial F0 → F9.
- **Como poderia ter sido feito:** desenhar dependências de dados e cenários antes de numerar as fases.

### L-06 — Casa, árvore e caverna não podem ser todos “um cubo” sem distinção

- **Evidência:** [blocos](<../architecture/roadmap.md#29-mundo-em-blocos-estilo-dwarf-fortress--minecraft>) mistura os tipos HOUSE/CAVE/TREE com materiais e estrutura composta.
- **Alternativas:** célula cúbica de material elementar + agregados semânticos; célula lógica ampla; objeto volumétrico separado. A construção cúbica já está decidida.
- **Recomendação:** separar célula, material e ocupação de estrutura agregada e de item de inventário. Definir vazio, água, passagem, opacidade, coordenadas, limites, regiões de armazenamento (chunks) e operações atômicas; sem prometer fluidos complexos nesta rodada.
- **Como poderia ter sido feito:** glossário de mundo e regras de ocupação antes de listar tipos heterogêneos no mesmo enum.

### L-07 — Visibilidade, memória e oclusão ainda não formam um contrato de leitura

- **Evidência:** [visibilidade](<../architecture/roadmap.md#211-visibilidade-campo-de-visão-e-memória-de-ambientes-fog-of-war>) e [visualização](<../architecture/roadmap.md#210-visualização-2d-isométrico-sem-3d-real>) não distinguem filtro por observador de oclusão da imagem do personagem.
- **Alternativas:** entregar o mundo completo e confiar no render, arriscado; entregar objeto de leitura (DTO) por observador com visão, memória, desconhecido e metadados limitados.
- **Recomendação:** DTO imutável com versão, tick e observador, somente com dados perceptíveis; snapshot da última visão para memória. Direção e posição são comandos; câmera e z-level são estado de apresentação. Aplicar D-04 sem atualizar criaturas ocultas.
- **Como poderia ter sido feito:** exemplos “parede bloqueia a linha de visão”, “telhado só encobre a imagem” e “andar nunca visitado” antes de prometer silhuetas universais.

### L-08 — MLP já foi aprovado, mas treino ainda é um desenho incompleto

- **Evidência:** [MLP](<../architecture/roadmap.md#28-mini-mlp-por-personagem-e-redes-por-raçaespécie-individualidade>) define 2–3 camadas e reforço/evolução sem ativação, arredondamento, recompensa, escala temporal, herança e controle de diversidade.
- **Alternativas:** escalonar inferência → genética → aprendizagem, preservando a decisão; implementar tudo junto e perder diagnóstico causal.
- **Recomendação:** contrato de entradas percebidas, saídas, versões e custo; FSM de referência; inferência pura em ponto fixo antes de genética e reforço. Especificar a relação entre pesos aprendidos e transmitidos sem apagar a herança já aprovada. Extinção remove população ativa, não destrói evidência necessária ao replay histórico.
- **Como poderia ter sido feito:** separar hipótese científica, protocolo de experimento e funcionalidade de produto; comparar resultados contra a FSM de referência.

### L-09 — “Nenhum modelo no tick” precisa distinguir IA de linguagem de MLP local

- **Evidência:** [overview:203](<../architecture/overview.md#L203>) veda qualquer modelo no tick; [MLP](<../architecture/roadmap.md#28-mini-mlp-por-personagem-e-redes-por-raçaespécie-individualidade>) permite inferência determinística barata nele; [mapeamento d1](<../architecture/roadmap.md#34-mapeamento-dos-modelos-para-subsistemas>) inclui reações de NPC.
- **Recomendação:** nenhum LLM ou System One servido por sidecar decide o tick por resposta em tempo real; NPC usa FSM/Utility AI e posteriormente MLP puro. Sugestão de modelo pré-computada só entra como entrada registrada e validada, se aprovada. Não colocar d1 em cada NPC ou tick.
- **Como poderia ter sido feito:** regra sobre efeito e determinismo, não sobre a palavra genérica “modelo”.

### L-10 — Saves misturam arquivo atômico e SQLite WAL sem protocolo

- **Evidência:** [persistência](<../architecture/overview.md#10-persistência>) especifica SQLite e tmp/fsync/rename, mas não diz qual artefato é a autoridade nem como snapshot e log ficam consistentes.
- **Alternativas:** transação SQLite para autoridade e exportação AIFS; ou snapshot AIFS mais log SQLite com protocolo de checkpoint. Não renomear um banco WAL aberto como se fosse arquivo simples.
- **Recomendação:** escolher e testar protocolo, marcador de commit, revisão, checksum, ordem dos bytes e codec, sincronização com disco e renomeação por sistema operacional, backup e recuperação de falha. Injetar falha em cada etapa; nunca perder o último save válido.
- **Como poderia ter sido feito:** decidir a unidade de durabilidade e recuperação antes de listar APIs de disco.

### L-11 — Proibição de rede precisa ser invariável e testada além da URL

- **Evidência:** [AF_OFFLINE](<../architecture/overview.md#9-runtime-offline-e-sidecars>) aparece como configuração; [ADR 0001](<../architecture/adr/0001-offline-first-runtime.md>) veda rede externa sempre.
- **Recomendação:** `AF_OFFLINE=0` nunca habilita nuvem; no máximo, rejeitar a configuração. Validar endereço final, IPv4/IPv6, redirecionamento, proxy, ambiente e resolução de nomes; proibir redirecionamento externo e escuta fora de loopback. Verificação estática e prova dinâmica são complementares.
- **Como poderia ter sido feito:** política de capacidades do transporte e supervisor, com tabela de casos adversariais, antes de usar uma configuração booleana como proteção.

### L-12 — Qualidade prometida, qualidade efetivamente imposta

- **Evidência:** [CI:114–117](<../../.github/workflows/ci.yml#L114-L117>) só impõe 90% de linhas globais; [ADR 0006](<../architecture/adr/0006-tdd-coverage-mutation.md>) exige ramos, diff, limites por crate e mutação. [build:143–165](<../../.github/workflows/ci.yml#L143-L165>) aceita o job Rust como ignorado sem exigir a verificação prévia no agregador.
- **Recomendação:** cartões específicos para prova negativa de cada gate e matriz de plataformas, levantamento de ferramentas e perfis, agregador que bloqueie diante de falha ou ausência de prova e exceções documentadas. Não alegar que F0 verde prova os gates Rust; não enfraquecer metas para acomodar ferramentas.
- **Como poderia ter sido feito:** matriz “requisito → medidor → comando verificado → job obrigatório → teste que faz falhar”.

### L-13 — Roadmap linear e critérios vagos não orientam agentes auxiliares

- **Evidência:** [fases](<../architecture/roadmap.md#10-roadmap-por-fases>) contém uma linha por fase e condiciona o início de cada fase à conclusão da anterior, sem mapear trabalhos independentes que poderiam ocorrer em paralelo.
- **Recomendação:** [roadmap de execução](<../../ROADMAP.md>) com entradas, saídas, responsáveis por arquivos e contratos, dependências, revisão independente, pacotes pequenos e retorno da onda se o gate falhar. Integração seriada; execução paralela só em áreas não sobrepostas.
- **Como poderia ter sido feito:** cartões de trabalho antes de cronograma; separar numeração temática F de ordem operacional W.

### L-14 — Alegações externas e licença precisam de proveniência, não novas marcas de confiança

- **Evidência:** [confiança](<../architecture/roadmap.md#12-confiança-e-verificação>) chama fatos de “verificados”, mas o manifesto e o runtime concreto ainda não existem. O [exemplo de manifesto:106–132](<../engineering/offline-ai.md#L106-L132>) lista hashes dos pesos; os [artefatos e a configuração:73–103](<../engineering/offline-ai.md#L73-L103>) também incluem runtime, template de conversa e projector quando houver mídia.
- **Recomendação:** manter como declaração da documentação até verificar fonte primária, licença do artefato, revisão e compatibilidade local. O manifesto completo deve registrar versão e hash do runtime, dos pesos, do template e do projector aplicável, além de tamanho, origem e configurações relevantes; referenciar essa identidade nas cassettes e na proveniência. Sem trocar modelos ou stack automaticamente; incompatibilidade exige decisão e ADR. Download de pesos só por provisionamento explícito fora do jogo.
- **Como poderia ter sido feito:** registro de evidências com URL, revisão, data, artefato e experimento, com estados separados para “fornecedor declara” e “funciona aqui”. Nenhuma verificação externa foi realizada nesta revisão.

### L-15 — Produto ainda não tem regras suficientes para uma fatia jogável

- **Evidência:** [macroações](<../architecture/roadmap.md#22-comportamento-autónomo>) cita ciclo tático, mas não define turnos, deslocamento, custos, combate, morte, recursos, construção, objetivos, duração ou sucesso do cenário.
- **Recomendação:** D-01/02/03/07 delimitam o produto; uma especificação pequena fecha comandos, consequências, limites e corpus de cenários antes do primeiro comportamento. Não prometer campanha, criação ampla de itens, fluidos, economia regional ou centenas de raças nesta fase.
- **Como poderia ter sido feito:** descrever uma sessão concreta do jogador e convertê-la em cenários de aceite antes de uma lista de subsistemas.

### L-16 — Saída canônica e fontes de arquitetura ainda têm definições divergentes

- **Evidência:** o [JSON de referência:202–219](<../engineering/testing-strategy.md#L202-L219>) inclui `tick_ms_p95`, uma medição de relógio real, mas exige saída sem dados voláteis; comparar esse valor no golden torna o resultado dependente de hardware e carga. A [tabela de crates:86–100](<../architecture/overview.md#L86-L100>) e o [diagrama de dependências:119–142](<../architecture/overview.md#L119-L142>) divergem na ligação entre core e NLG e na interpretação das setas. O [diagrama do README:80–98](<../../README.md#L80-L98>) mistura fluxo de execução e dependências, sugerindo ligações do core à persistência e de regras ao System One sem explicitar adaptadores. O [glossário:11](<../glossary.md#L11>) ainda define o jogo como texto/ASCII, enquanto o [README:37–42](<../../README.md#L37-L42>) e a decisão canônica exigem visualização final 2D isométrica.
- **Impacto:** goldens instáveis, implementadores seguindo grafos incompatíveis e apresentação do produto contraditória; uma documentação “verde” não prova que os contratos entre fontes estão reconciliados.
- **Alternativas:** tolerâncias para métricas e manutenção manual de explicações duplicadas; ou resultado semântico determinístico separado das métricas, com um grafo de dependências autoritativo e referências explícitas entre as fontes.
- **Recomendação:** separar métricas de relógio real em artefato de desempenho, fora do hash e da comparação estrita de golden; manter no resultado canônico apenas dados reproduzíveis. Planejar provas negativas de dependências permitidas e proibidas, reconciliar tabela e diagramas com legendas distintas para fluxo e importação, e atualizar [glossário](<../glossary.md>) e [README](<../../README.md>) por referência às decisões aprovadas. Essas atualizações devem ser cartões de trabalho no escopo documental aprovado, não alterações silenciosas desta rodada nas fontes canônicas.
- **Como poderia ter sido feito:** validar o grafo e exemplos de saída contra os contratos antes de replicá-los; publicar métricas com perfil de medição e separar “TUI de depuração” de “visualização final”.

### L-17 — Regras de governança, configuração e status observado não estão alinhados

- **Evidência:** [CODEOWNERS:3–5](<../../CODEOWNERS#L3-L5>) afirma revisão de code owner obrigatória, mas o [bootstrap:40–52](<../../GOVERNANCE.md#L40-L52>) e o [ruleset local:24–26](<../../.github/rulesets/regras-main.json#L24-L26>) têm zero aprovações e revisão de code owner desabilitada nesta etapa. O [ruleset de nomes:18–19](<../../.github/rulesets/regras-nomes-de-branch.json#L18-L19>) admite `chore/*`, fora dos doze tipos fechados no [contrato:35–36](<../../AGENTS.md#L35-L36>). A [checagem de commits:167–189](<../../.github/workflows/ci.yml#L167-L189>) examina apenas os últimos 25 commits e isenta padrões como `fixup!` e `squash!`; o comentário remete à validação do título do PR/squash, mas esse passo não valida o título. A [política de segurança:96](<../../SECURITY.md#L96>) declara push protection ativo, enquanto o diagnóstico de planejamento registrado ao fim desta revisão informa recurso indisponível no plano atual; a revisão editorial não consultou o serviço para confirmar seu estado.
- **Impacto:** colaboradores podem confundir objetivo futuro, regra normativa, configuração local e capacidade realmente disponível; lacunas de validação podem produzir uma aprovação verde sem demonstrar todos os requisitos anunciados.
- **Alternativas:** manter exceções e avisos dispersos; ou caracterizar cada comportamento atual e reconciliar comentário, contrato, configuração e status com evidência rastreável.
- **Recomendação:** planejar testes de caracterização de nomes, revisão e mensagens/título do PR, inclusive casos negativos e automação; explicar o bootstrap no comentário de [CODEOWNERS](<../../CODEOWNERS>) e alinhar tipos aceitos sem ampliar silenciosamente a política. Definir o alcance da checagem de commits e o gate obrigatório do título, sem presumir que uma amostra de 25 commits prova todo o PR. Separar no relatório de segurança “requisito”, “configuração local”, “fornecedor/plano declara” e “estado confirmado em data identificada”; registrar indisponibilidade e mitigação sem afirmar proteção ativa não comprovada. Nenhum ruleset, workflow ou política é alterado por esta revisão.
- **Como poderia ter sido feito:** manter uma matriz de governança com requisito, configuração, prova negativa, origem da evidência e status operacional, sem transformar diagnóstico incompleto em decisão ou garantia.

## 5. Melhorias propostas sem alterar os pilares

| Melhoria | Benefício | Custo/limite |
| --- | --- | --- |
| Separar marco técnico e produto 2D. | Entrega honesta e redução de risco. | Dois checklists de release; D-01 decide. |
| Antecipar grelha mínima e contrato de percepção. | Evita refazer A*, rumores, MLP e UI. | Não antecipar render completo nem mundo ilimitado. |
| Resolver ações nativas determinísticas antes de consultar modelos. | Menos latência e fallback previsível. | Texto livre pode exigir NLU; comando tipado não precisa de d1. |
| Implementar regras com modelos falsos antes dos adaptadores reais. | Segurança e TDD independentes de hardware e modelos. | O corpus tem de espelhar a gramática real depois. |
| NLG com âncoras, citações de eventos e fallback seguro. | Menos fato inventado aceito e melhor diagnóstico. | Prosa arbitrária não tem garantia semântica total. |
| Grafo de trabalho e responsabilidades por fronteira. | Paralelismo útil, poucos conflitos. | Contratos compartilhados têm responsável único pela escrita. |
| Manifesto com versões fixas e evidências por plataforma. | Builds, modelos e benchmarks reproduzíveis. | Manutenção explícita e revisão por release. |
| MLP experimental em trilha independente do render. | Mede benefício sem bloquear o motor. | Não eliminar individualidade ou genética da visão aprovada. |
| Gate de recuperação de falhas e observação filtrada. | Save confiável e ausência de vazamento de informação oculta. | Testes adversariais desde a base, não só no endurecimento final. |

## 6. Questões técnicas que serão resolvidas por evidência

Não exigem uma pergunta sua agora, salvo discordância com a recomendação:

- Representação concreta de ID, formato e versionamento de evento e codec de snapshot: ADR, fixtures e limites antes de implementar.
- Versões fixas de Rust, Flecs, llama.cpp e ferramentas: compatibilidade, licença, segurança dos adaptadores e matriz antes de fixar versões.
- Delimitação de tool calls, mapeamento de schema e arredondamento das probabilidades: contratos e cassettes adversariais.
- Protocolo de checkpoint, RNG transacional e entradas de replay: testes de falha, replay e dry-run.
- Algoritmos de FOV e A*, divisão em regiões, descarte de elementos fora da tela e limites: comparar alternativas determinísticas com fixtures e perfis de D-05.
- Recompensa, genética e ativação do MLP: protocolo científico, FSM de referência e decisões revisáveis; não inventar resultado positivo.
- Limiares de confiança, tamanho de contexto e política de tentativas: corpus de qualidade; nunca tentativas ilimitadas ou por adivinhação.
- Licenças de assets e idiomas adicionais: bloqueadores das respectivas entregas, sem inventar assets ou traduzir tudo antes de medir português.

## 7. Registro da rodada e condição de fechamento

| Decisão | Estado |
| --- | --- |
| D-01 a D-08 | Respondidas pelo maintainer; nota da Q7 recebida. Ver [decisões](<decisions.md>). |
| Fonte única de execução no [ROADMAP](<../../ROADMAP.md>), definições canônicas preservadas | Reconciliação documental realizada após a devolutiva; texto refinado em revisão final. |
| Correções L-01 a L-17 e trilhas de validação | Achados da base inicial, corrigidos documentalmente ou convertidos em contratos e atividades rastreáveis; nenhuma aplicação implementada. |
| Implementação, commits, push, PR e merge | Não autorizados por esta revisão documental. |

### Aceite do planejamento final

- Todas as definições existentes foram preservadas ou alteradas por decisão humana rastreável.
- Perguntas essenciais respondidas; pendências não essenciais têm responsável, ponto de revisão e impacto.
- Cada atividade tem objetivo, como executar, dependências, responsável pelos arquivos e aceite observável.
- Ondas têm entradas, paralelismo permitido, revisão independente e saída que bloqueia diante de falha ou ausência de prova.
- Não existem duas tabelas concorrentes de execução ou comandos futuros apresentados como disponíveis.
- Contratos, ADRs e documentos afetados têm atualização planejada ou realizada no escopo aprovado.
- Links e Markdown validados; limitações de ferramentas explicitadas; nenhuma funcionalidade implementada por engano.
- Você revisou o roadmap refinado e aprovou a versão final, distinta deste primeiro rascunho.

**Base observada pelo agente responsável pelo planejamento:** branch documental criada; enforce/doctor sem itens em falta; CoALA saudável;
nenhum manifesto Cargo. Avisos de governança: Scorecard 6,7 abaixo do alvo 7 e recursos de metadados e proteção de push
indisponíveis no plano do GitHub. Esses avisos não foram ocultados nem “resolvidos” com relaxamento de política.
A revisão editorial deste documento não reexecutou governança, CoALA ou testes.
