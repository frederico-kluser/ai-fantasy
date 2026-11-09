# WEB-01 — Site base e playground manual

> **Fase:** F4 — Servidor e site sem IA · **Depende de:** [FND-01](<FND-01.md>), [CORE-05](<CORE-05.md>) · **Branch:** `feat/web-01-shell-and-manual-playground`
> **Título do PR:** `feat(web): add the app shell, engine worker and manual playground`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Montar o site com as rotas principais, o motor num Web Worker e a criação manual de playground (lugar, horário, clima, elenco, laços, posições) até a ficha de revisão com uma configuração de cena válida.

## Leia antes

- [produto](<../../product.md>) — §3
- [arquitetura](<../../architecture/overview.md>) — §6
- [presets](<../../architecture/presets.md>) — §2 a §9
- [estratégia de testes](<../../engineering/testing-strategy.md>) — §10

## Escopo

**Inclui:**

- Rotas: Playground, Cena, Sessões e Avaliação (as três últimas como esqueleto).
- Protocolo de mensagens com o Web Worker do motor; a geração de elenco roda no worker.
- Tema claro e escuro.
- Playground manual: preset de lugar e gabarito, horário, clima, personagens por arquétipo com edição, laços gerados e editáveis (travar e sortear de novo), posições na grade, escolha do personagem do jogador.
- Ficha de revisão que valida a configuração da cena (começar a cena é da WEB-02).

**Não inclui:**

- Premissa pelo SOM (AI-04).
- Começar a cena e a tela da cena (WEB-02).

## Entregáveis

- `apps/web/src/`
- `apps/web/e2e/manual-playground.spec.ts`

## Lista de testes (escreva primeiro)

```text
- given the manual form with no character when submitting then validation explains what is missing
- given a cast seed when regenerating bonds with one locked then the locked bond stays
- given the worker when generating a cast then it answers with the generated characters and bonds
- E2E: given a manual playground when confirming then the review sheet shows the chosen cast and a valid setup
```

## Critérios de aceite

- [ ] Fluxo E2E 2 até a ficha de revisão.
- [ ] Formulários acessíveis (rótulos e teclado).
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Texto vindo de qualquer lugar é exibido como texto, nunca como HTML.
