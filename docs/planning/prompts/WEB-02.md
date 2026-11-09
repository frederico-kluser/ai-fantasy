# WEB-02 — Cena e controles (sem IA)

> **Fase:** F4 — Servidor e site sem IA · **Depende de:** [WEB-01](<WEB-01.md>), [SOC-05](<SOC-05.md>), [AI-01](<AI-01.md>) · **Branch:** `feat/web-02-scene-and-controls`
> **Título do PR:** `feat(web): add the scene view, transcript and controls`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Começar a cena a partir da ficha e mostrá-la: a grade com os personagens, a transcrição com falas prontas e gestos, os controles (passo, automático, pausa, tomar a vez, modo de controle) e a entrada do jogador por menu de atos.

## Leia antes

- [arquitetura](<../../architecture/overview.md>) — §6 e §7
- [modelo de simulação](<../../architecture/simulation-model.md>) — §11
- [atos de conversa](<../../architecture/dialogue-acts.md>) — §1
- [integração de IA](<../../architecture/ai-integration.md>) — §5.3

## Escopo

**Inclui:**

- Começar a cena a partir da ficha de revisão (`createScene` no worker).
- Grade com personagens e posições, atualizada pelos eventos.
- Transcrição com falas prontas de `packages/ai` e gestos.
- Controles de passo, automático com velocidade, pausa, tomar a vez e modo `MANUAL`/`AUTO` do personagem do jogador (NPCs são sempre `AUTO`).
- Entrada do jogador por menu de atos (ato, tom, alvo, tópico, intensidade, volume) enquanto não há SOM.
- Estado de espera do jogador e fim da fatia.

**Não inclui:**

- Fala livre (AI-02); encenação por modelo (AI-03).

## Entregáveis

- `apps/web/src/scene/`
- `apps/web/e2e/scene.spec.ts`

## Lista de testes (escreva primeiro)

```text
- E2E: given a review sheet when starting then the scene opens with the chosen cast
- given the engine awaiting the player when rendering then the act menu is enabled and autoplay stops
- given autoplay when a character leaves then the transcript shows the farewell and the grid removes them
- E2E: given an NPC-only scene in autoplay when it runs then it ends with one person left or by silence
- E2E: given the player in MANUAL when choosing an act from the menu then the NPCs answer
```

## Critérios de aceite

- [ ] Fluxo E2E 2 até começar a cena, fluxo 4 e fluxo 3 com menu.
- [ ] Funciona sem chave do OpenRouter.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- O mundo espera: nada avança enquanto o jogador decide.
