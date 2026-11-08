# Revisão final do planejamento — AI Fantasy

> **2026-11-08 · Versão refinada com as respostas do maintainer.**
> Esta revisão é do planejamento e da documentação, não da aplicação. Não autoriza scaffold,
> execução das ondas, commits, push, merge ou release. O projeto continua em F0.

## 1. As oito respostas já foram incorporadas

Não há uma nova entrevista de oito perguntas. O [registro de decisões](<decisions.md>) conserva
as respostas e o complemento da Q7; a [primeira revisão](<project-review.md>) é histórico da base anterior.

| Decisão confirmada | Consequência no plano |
| --- | --- |
| Motor validado primeiro, depois jogável 2D. | Marcos separados; TUI/headless não são o produto visual final. |
| Tempo avança conforme o personagem se move/fala. | Avanço lógico dirigido por ações; câmera, espera de modelo e texto NLG não são relógio da simulação. |
| Relações sociais e rumores primeiro. | Cenários sociais e consequências entre localidades priorizados. |
| Silhuetas de todos atrás das construções. | Exceção deliberada de apresentação; não limitar a atores já percebidos. Contratar separação entre overlay e conhecimento autoritativo. |
| Sem teto de hardware nesta etapa; CPU/GPU da mesma máquina em Windows/Linux. | Medições reproduzíveis por sistema; números antigos são referências diagnósticas, não limites de escopo impostos. |
| Stack do render ainda não escolhida. | Escolha e integração são gate futuro; motor não fica bloqueado por uma engine inventada. |
| Região procedural com várias localidades desde o início. | A primeira base simulável já testa região, trajetos e identidades entre áreas; foco em uma área não apaga o resto do mundo. |
| Subagents de desenvolvimento sem limite artificial. | Todas as tarefas independentes em worktrees próprias; barreira de entregas; juiz integra, resolve conflitos, valida, corrige e prepara a próxima onda. |

**Motivo da Q7 preservado:** detectar comportamentos e bugs entre áreas enquanto o desenvolvimento
foca uma delas, antes de os problemas escalarem. Uma vila isolada ou fixture curada não substitui
esse escopo de produto; fixtures pequenas continuam instrumentos de teste.

## 2. O que revisar agora

### Plano executável

O [ROADMAP](<../../ROADMAP.md>) é a fonte única de atividades, dependências, ondas e aceite.
Cada cartão mantém objetivo/entrega, dependências/dono, como fazer e aceite com erros/limites,
além do contrato global de TDD, testes compostos e evidências.

O [suplemento conforme o guia](<wave-spec.md>) traz **46 cartões no manifesto, 20 contratos
propostos, Consumes/Produces, declarações com dono, arquivos permitidos/proibidos, perfis,
alvos de verificação futura e 25 fronteiras topológicas calculadas**. Essas 25 fronteiras são
resultado do DAG, não um teto de agentes. Nenhuma delas foi executada.

O método do guia foi adaptado sem instalar suas skills nem acionar seu executor. O cap de
3–5 agentes do exemplo não foi adotado; worktrees próprias, barreira, juiz e revisão independente
foram preservados. Aprovar esta revisão não habilita `execution_enabled` nem autoriza construir.

Revise especialmente:

1. A região multi-localidades na primeira base simulável, não apenas quando chegar o cliente 2D.
2. A separação de tempo por ações, tempo de parede, render, fala simbólica e texto gerado.
3. O protocolo de worktree por tarefa, barreira e juiz — sem teto artificial de subagents.
4. O juiz resolvendo conflitos e problemas reais, com revisão independente inclusive das suas correções.
5. Os marcos técnico/2D/MLP e dependências condicionais de hardening/release.
6. As silhuetas de todos como camada privilegiada, separada da percepção e memória autoritativas.

### Fontes de definições reconciliadas

- [Roadmap de arquitetura](<../architecture/roadmap.md>): visão, blocos, tempo, percepção/silhuetas, IA e errata; execução aponta para o plano único.
- [Arquitetura de software](<../architecture/overview.md>): fronteiras de leitura/comando, dependências, determinismo e pontos ainda a contratar.
- [Índice da documentação](<../README.md>) e [README do projeto](<../../README.md>): navegação e promessa de produto coerentes.
- [Glossário](<../glossary.md>): não descreve a TUI como visualização final.
- [Contratos dos agentes](<../../AGENTS.md>) e [espelho](<../../CLAUDE.md>): identificam definições, execução e decisões; F0 e gates preservados.
- [ADRs](<../architecture/adr/README.md>): decisões estruturais novas registradas sem reescrever os ADRs aceitos anteriores.

## 3. Pendências técnicas não foram disfarçadas de decisões resolvidas

Estas pendências têm atividades, responsáveis e critérios de aceite no plano. Aprovar o
planejamento não significa que elas foram implementadas ou tecnicamente congeladas:

| Contrato futuro | O que precisa provar antes do consumidor |
| --- | --- |
| IDs, formato de evento e fatos completos. | Resolver u32/u64, soma de bytes e precisão em bp; não perder múltiplos efeitos para caber em um registro compacto. |
| Tempo e comandos. | Custos/durações em ticks, ações compostas, agendas dos NPCs e fala simbólica; nenhum relógio/render decide o estado. |
| Replay e durabilidade. | Entradas normalizadas de modelo/timeout/cancelamento, snapshot obsoleto, RNG transacional, autoridade de save e recuperação de crash. |
| Região inicial. | Identidades/rotas/agenda entre localidades, persistência/replay regional; foco de UI não modifica o conjunto simulado. |
| Silhuetas e percepção. | Alcance, níveis de altura e áreas nunca vistas explicitamente contratados, preservando “todos atrás das construções”; overlay não concede conhecimento aos NPCs/MLP por acidente. |
| Gramática das propostas. | Dialeto real → schema fechado/versionado, mapeamentos e cardinalidade; corpus de 200 válidas + 200 inválidas. |
| Modelos e ferramentas. | Fontes/licenças/revisões/hashes/capabilities, fakes/cassettes e gates medidos; alegações externas não contam como prova local. |
| Cliente 2D. | Stack, fronteira offline, build, teste e licenças de assets escolhidos antes de implementar o cliente. |
| MLP e evolução. | Matemática de ponto fixo, inputs percebidos, genomas, herança/reforço e 100 gerações comparáveis à FSM de referência. |

## 4. Como o planejamento será aceito

Aprovação significa que o texto traduz suas respostas e que o plano está pronto para orientar
trabalho futuro, com gates explícitos. Não significa que os contratos técnicos pendentes estão
aceitos, que as atividades estão concluídas ou que a implementação foi autorizada.

- As oito decisões e a nota da Q7 aparecem sem antigas recomendações prevalecendo sobre elas.
- Atividades independentes são paralelizáveis em worktrees; integração e correção têm um juiz responsável.
- O início das próximas ondas depende das entradas/contratos/gates reais, não de preencher uma tabela.
- Qualidade, offline, determinismo, licenças, TDD e PR permanecem obrigatórios.
- Não há duas tabelas concorrentes de execução nem comandos futuros apresentados como já disponíveis.
- Alterações e limitações de validação são reportadas; nenhum código de aplicação ou peso foi criado.

**Ação nesta revisão:** aprove o texto refinado se ele representa sua intenção; caso contrário,
anote os trechos do [ROADMAP](<../../ROADMAP.md>) que precisam mudar. As oito respostas recebidas
não serão solicitadas novamente. Se houver problema no envio do Plannotator, a devolutiva direta
no chat também pode registrar aprovação ou ajustes explícitos, sem confundir fechamento da janela com aceite.
