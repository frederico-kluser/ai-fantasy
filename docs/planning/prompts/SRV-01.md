# SRV-01 — Servidor local

> **Fase:** F4 — Servidor e site sem IA · **Depende de:** [FND-01](<FND-01.md>) · **Branch:** `feat/srv-01-local-server`
> **Título do PR:** `feat(server): add the local server, config and session storage`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Criar o servidor local em `127.0.0.1` com configuração, saúde, armazenamento de campanhas e fatias, limites de pedido e o modo de teste com portas de IA falsas.

## Leia antes

- [arquitetura](<../../architecture/overview.md>) — §5, §8 e §10
- [integração de IA](<../../architecture/ai-integration.md>) — §2 e §3
- [regras de desenvolvimento](<../../engineering/development-rules.md>) — §11
- [estratégia de testes](<../../engineering/testing-strategy.md>) — §9

## Escopo

**Inclui:**

- Configuração tipada a partir do ambiente, com os padrões da integração de IA.
- `GET /api/health` dizendo se há chave, sem revelá-la.
- Rotas de campanhas e fatias em `data/`, com ids validados.
- Limite de tamanho dos pedidos.
- Entrega do site compilado; encaminhamento do Vite em desenvolvimento.
- Modo de teste que injeta as portas falsas de IA.

**Não inclui:**

- Adaptadores do OpenRouter (AI-02, AI-03).

## Entregáveis

- `apps/server/src/`

## Lista de testes (escreva primeiro)

```text
- given the server started when listing its address then it is 127.0.0.1
- given a configured key when calling health then the response says configured and never contains the key
- given a session id with ../ when saving then the request is rejected
- given a body above the limit when posting then the server answers 413
- given a saved slice when reading it back then the JSONL is identical
```

## Critérios de aceite

- [ ] Nenhuma resposta ou log contém a chave.
- [ ] Gates verdes.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Nunca escute em `0.0.0.0`.
