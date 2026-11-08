# Validação documental do plano e dos prompts

## Escopo

Esta validação cobre planejamento e documentos. Não executa trabalhadores, revisores, worktrees,
cleanup, código de aplicação, modelos locais, testes Rust ou publicação. O projeto permanece F0.

## Evidências obtidas

- Plano refinado com as oito respostas do maintainer, complemento de D-07 e orientação final do Plannotator.
- 46 cartões com objetivos, dependências, procedimentos, donos e aceites específicos.
- Manifesto acíclico com 25 fronteiras de referência e 20 contratos propostos; nenhuma colisão de arquivo na mesma fronteira de referência.
- 95 documentos no [índice dos prompts](<prompts/README.md>): 46 workers, 46 revisores individuais, orquestrador, juiz e índice.
- Em cada worker: skill/where/recall, sync/doctor, busca com espécie/caminho real, checagem JSON e get/fonte antes de DELIVERED_TO_REVIEW.
- Em cada revisor: R1 local, integração do juiz, R2 canônica/backup/importação seletiva, verificação de caminhos/resultado e cleanup seguro pelo revisor.
- Prompts incluem cartões, interfaces, decisões/anti-escopo, worktree/branch e protocolo; execução explicitamente desabilitada neste pedido.
- Markdownlint passou na rodada de 129 arquivos; links, IDs, campos, snapshot do manifesto, espelho AGENTS/CLAUDE e fonte CoALA foram verificados pelo validador documental local.
- CoALA sincronizou os documentos; o teste de **95/95 prompts** passou com busca ativa no caminho exato, `get --provenance` e comparação das informações com a fonte atual.

## O que o teste CoALA provou

Foram usados apenas comandos oficiais da skill, sem abrir a base ou fazer dump. Resultados
vazios, espécies/fontes erradas, registros suplantados, get falho ou informação ausente na fonte
impedem aprovação. CoALA pode repetir títulos ao segmentar parágrafos; a comparação valida as
partes recuperadas no documento atual, não um layout contíguo artificial.

As evidências temporárias incluem IDs reais, fontes, exit codes e comparações. Essa prova
mostra que **os prompts e suas informações** são recuperáveis agora. Não afirma que uma futura
implementação de CORE/RULES/MLP foi construída ou testada; a recuperação do código produzido
será obrigatória em cada worker/revisor quando a execução for expressamente autorizada.

## Preservação e segurança

Nenhum arquivo Rust ou manifesto Cargo foi criado. Nenhuma worktree de implementação foi
criada/removida, nem branch apagada, commit/push/PR/merge/release executados. Memória binária e
logs locais permanecem privados/fora da entrega pública; o pacote de prompts contém Markdown.

O [registro de aprovação](<approval.md>) distingue aprovação do planejamento de autorização de
construção. Os contratos técnicos, escolha de stack/alcance visual e implementação permanecem
atividades futuras com dono/gate, não resultados concluídos.
