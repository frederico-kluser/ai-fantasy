# WEB-03 — Inspetor e sessões

> **Fase:** F4 — Servidor e site sem IA · **Depende de:** [WEB-02](<WEB-02.md>), [SRV-01](<SRV-01.md>), [SOC-06](<SOC-06.md>) · **Branch:** `feat/web-03-inspector-and-sessions`
> **Título do PR:** `feat(web): add the inspector, forced paths and session management`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Mostrar por que cada coisa aconteceu e permitir controlar a reprodução e a campanha: inspetor completo, seeds, forçar caminho, modo "mais provável", salvar, carregar, reproduzir, ramificar, exportar e continuar para a fatia seguinte.

## Leia antes

- [arquitetura](<../../architecture/overview.md>) — §3.2, §6 e §8
- [modelo de simulação](<../../architecture/simulation-model.md>) — §14 e §15
- [estratégia de testes](<../../engineering/testing-strategy.md>) — §10

## Escopo

**Inclui:**

- Inspetor por personagem: camadas, laços, percepção, vontades de agir e de sair.
- Registro de sorteios com forçar caminho e modo `MOST_LIKELY`; seeds visíveis e editáveis.
- Leitura do SOM e pacote de encenação (quando existirem).
- Sessões: salvar e carregar campanhas e fatias pelo servidor, replay passo a passo, ramificar e exportar a transcrição em Markdown.
- Continuar a campanha: encerrar a fatia, escolher o intervalo (horas e quem passou junto) e montar a fatia seguinte (`endSlice` e `createSlice`).

**Não inclui:**

- Avaliação (EVAL-01).

## Entregáveis

- `apps/web/src/inspector/`
- `apps/web/src/sessions/`
- `apps/web/e2e/inspector.spec.ts`
- `apps/web/e2e/sessions.spec.ts`

## Lista de testes (escreva primeiro)

```text
- given a forced draw when stepping then the inspector shows the forced outcome and its effect
- given a saved slice when reloading then replay reaches the same final hash
- given a fork when continuing then both branches are listed
- given a transcript when exporting then the Markdown lists speaker, line and gesture in order
- given a finished slice when continuing with a 72-hour gap then the next slice opens with the same characters
```

## Critérios de aceite

- [ ] Fluxos E2E 5, 6 e 8.
- [ ] Gates verdes.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- A exportação em Markdown pode ser anotada no Plannotator pelo maintainer.
