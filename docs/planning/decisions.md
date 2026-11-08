# Decisões do maintainer — revisão do roadmap

> **2026-11-08 · Respostas humanas registradas · Escopo documental.**
> Fonte: devolutiva enviada diretamente pelo maintainer no chat, complementada pela resposta
> sobre a nota da Q7. As oito escolhas estão resolvidas; recomendações anteriores não prevalecem
> sobre estas respostas. Isso não autoriza implementar, commitar, fazer push ou publicar.

## 1. Proveniência e situação da revisão

A [primeira revisão](<project-review.md>) foi aberta no Plannotator. O processo permaneceu
ativo sem entregar decisão ou feedback ao agente. O maintainer informou que havia enviado
as respostas e colou as oito escolhas no chat; o complemento da Q7 foi solicitado e recebido
separadamente. **Essas respostas diretas são a fonte desta consolidação.**

A sessão antiga foi encerrada por substituição depois que todas as respostas e o complemento
foram recebidos. Encerramento do processo não foi contado como aprovação do documento.
Não se afirma que a interface travou nem que houve submissão concluída no CLI.

- [ROADMAP](<../../ROADMAP.md>): plano de execução refinado com estas decisões.
- [Roadmap de arquitetura](<../architecture/roadmap.md>): definições canônicas e errata.
- [Arquitetura de software](<../architecture/overview.md>): fronteiras e contratos.
- [ADRs](<../architecture/adr/README.md>): decisões estruturais e propostas de contratos.

## 2. Respostas e consequências obrigatórias

### D-01 — Motor validado antes do produto 2D

**Resposta:** “Motor validado primeiro, depois versão jogável 2D”.

**Decisão:** separar o marco técnico do motor do primeiro produto jogável em 2D isométrico.
TUI/headless permite validar o motor, mas não representa a visualização final. MLP e evolução
continuam no roadmap posterior e não bloqueiam o marco técnico por padrão.

**Impacto:** marcos e releases deixam explícito o que foi entregue. Não exigir render para
aprovar o motor, nem chamar o motor/TUI de produto visual final.

### D-02 — Tempo avança pelas ações do personagem

**Resposta:** “Tempo se move de acordo ao personagem se mover/falar”.

**Decisão:** tempo lógico dirigido por ações do personagem, não por relógio real contínuo.
Movimentação e fala são entradas da simulação que produzem avanço determinístico de ticks.

**Impacto:** custos/durações pertencem aos comandos e regras de gameplay. Abrir histórico,
renderizar, navegar a câmera, aguardar inferência ou gerar mais palavras no NLG não acrescenta
simulação por si só. A fala que custa tempo é o ato simbólico executado pelo personagem,
não a duração da geração de texto, leitura ou áudio.

**Detalhamento posterior:** catálogo de ações, custos em ticks, ordem das agendas dos NPCs e
política de ações compostas precisam de contrato e testes antes da implementação. Não
inventar valores de custo ou converter a resposta em um tick de relógio de 100 ms obrigatório.

### D-03 — Relações sociais e rumores como prioridade

**Resposta:** “Relações sociais e rumores”.

**Decisão:** o primeiro ciclo de gameplay prioriza interações sociais, relações observáveis
e rumores, com exploração/combate/construção no recorte necessário para apoiar e testar esse eixo.

**Impacto:** cenários de negociação, mentira, extorsão, troca de informação, confiança e
propagação entre localidades têm prioridade sobre uma campanha extensa ou sistemas ricos de combate.

### D-04 — Silhuetas de todos atrás das construções

**Resposta:** “Todos atrás das construções”.

**Decisão:** não restringir as silhuetas somente a atores que o personagem já percebeu.
A escolha admite revelar presença atrás de construções; é uma exceção deliberada de apresentação
à restrição anterior que condicionava toda informação desenhada ao campo de visão.

**Impacto:** distinguir percepção autoritativa de atores, memória congelada do ambiente e
camada privilegiada de silhuetas para o jogador. A camada não altera automaticamente o
conhecimento de NPCs, entradas percebidas da MLP ou informações de rumores. A memória do
ambiente não é atualizada silenciosamente porque uma silhueta foi desenhada.

**Detalhamento posterior:** alcance, recorte da câmera, nível de altura, presença em área nunca
vista e relação com paredes/telhados ainda exigem contrato explícito. Essas decisões não
podem reintroduzir “somente atores percebidos” disfarçado de implementação técnica.

### D-05 — Desenvolver e testar na mesma máquina Windows/Linux, sem teto agora

**Resposta:** “Não estou me limitando por isso nesse momento mas minha CPU/GPU serão usadas
para desenvolver e testar tanto no windows quanto no linux dessa mesma maquina”.

**Decisão:** usar CPU/GPU da máquina do maintainer para desenvolvimento e testes em Windows
e Linux; não impor teto de hardware ou desempenho como restrição de escopo nesta etapa.

**Impacto:** registrar hardware, sistema, build, contexto, população e consumo nos experimentos.
Números anteriores de latência/memória são referências diagnósticas e medidos honestamente,
não gates de aceite de um perfil doméstico ainda não escolhido. Preservar gates de correção,
qualidade, determinismo, segurança e funcionamento offline.

**Detalhamento posterior:** requisitos mínimos do produto, perfis CPU/GPU e política de regressão
serão decididos com dados. Portabilidade para outros sistemas permanece uma trilha planejada;
não fingir que o mesmo teste foi executado nos dois sistemas sem evidências de cada execução.

### D-06 — Stack de render ainda não escolhida

**Resposta:** “Ainda não escolhi a stack”.

**Decisão:** manter a stack do cliente 2D aberta. A decisão final por 2D isométrico sem 3D real
permanece; não escolher uma engine, linguagem ou ponte IPC por conta própria.

**Impacto:** contratar primeiro a API de leitura e a camada de silhuetas; criar um gate explícito
para escolher integração/build/testes/ativos antes do cartão do cliente. Isso não bloqueia o motor.

### D-07 — Região procedural com várias localidades desde o início

**Resposta:** “Uma região procedural com várias localidades”.

**Complemento confirmado:** “Importante ser já assim desde o inicio porque podemos encontrar
comportamentos enquanto focamos em uma area, para poder ja ver e resolver bugs antes de eles escalarem”.

**Decisão:** a primeira base simulável já é regional e contém várias localidades. Não começar
com uma vila isolada como arquitetura de produto, deixando relações entre áreas para uma fase tardia.

**Impacto:** geração determinística, identidade espacial e caminhos entre localidades entram
na base; cada subsistema inclui integração regional assim que nasce. O foco de desenvolvimento,
UI ou observação em uma área não elimina o restante da região do estado nem congela sua agenda
silenciosamente. Testar cedo efeitos que atravessam áreas, saves, replay e isolamento de identidades.

Fixtures unitárias pequenas e cenários curados continuam úteis; eles são instrumentos de teste,
não justificativa para rebaixar o escopo regional aprovado. Níveis de atividade/otimização,
se necessários, exigem política determinística explícita e comparação contra baseline regional.

### D-08 — Todas as tarefas independentes em worktrees, sem limite artificial

**Resposta:** “Não existe limite sendo bem claro esses subagents sao para desenvolvimento
LOGO, tidas as tags que poderem ser paralelizadas em suas proprias worktrees e assim o forem
devem ser independentes e depois um juiz deve juntar tudo e resolver os conflitos validar
arrumar o que surgir de problema e preparar a proxiam onda, NAO TEMOS LIMITES”.

**Decisão:** não impor limite artificial de 2, 4 ou 6 subagents. Em cada onda, delegar todas
as atividades realmente independentes em suas próprias branches/worktrees. Esses agentes
trabalham no **desenvolvimento**, não são entidades ou inferências do runtime do jogo.

**Impacto:** construir o DAG e congelar interfaces necessárias; executar os pacotes independentes;
aguardar a barreira de entregas; o juiz integra os resultados, resolve conflitos, valida,
corrige problemas e prepara a próxima onda. O juiz não apenas concatena relatórios nem aceita
uma integração que falhou. Merge e testes compostos são obrigatórios; nunca rebase/force-push.

Capacidade real das ferramentas, filas ou falhas de execução deve ser informada quando ocorrer,
sem transformá-la em um limite de projeto inventado. Código corrigido pelo juiz também recebe
TDD/regressão e revisão independente; ele não aprova sozinho o próprio código. Decisões de
produto/ADRs/goldens/PR/releases continuam sob responsabilidade humana conforme a governança.

## 3. O que está resolvido e o que é trabalho futuro

**Resolvido pelo maintainer:** os oito eixos acima e o motivo de começar com região multi-localidades.
Não reapresentar as oito perguntas como se tivessem sido puladas.

**Trabalho técnico planejado:** custos de ações, formato/IDs/eventos, log de replay e transações,
semântica detalhada da camada de silhuetas, contratos regionais, stack de render, instrumentação
de gates, matemática/genética e formato da MLP. Cada pendência tem atividade, dono e critério
de aceite no [ROADMAP](<../../ROADMAP.md>), sem alegar implementação ou freeze já concluídos.

**Estado do documento:** decisões humanas registradas; planejamento aprovado no Plannotator com a orientação de acrescentar os prompts e gates CoALA/revisor. Ver [aprovação](<approval.md>).
Nenhuma resposta foi inferida de ausência de feedback, encerramento de janela ou recomendação.
