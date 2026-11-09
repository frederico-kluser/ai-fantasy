# EVAL-01 — Avaliação no site e painel de métricas

> **Fase:** F6 — Validação · **Depende de:** [WEB-03](<WEB-03.md>), [AI-03](<AI-03.md>) · **Branch:** `feat/eval-01-ratings-and-metrics`
> **Título do PR:** `feat(web): add blind ratings and the validation metrics panel`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Permitir avaliar cada fala e cada cena com a rubrica, em modo cego, e calcular automaticamente as métricas do pacote B.

## Leia antes

- [avaliação](<../../engineering/evaluation.md>) — inteiro
- [arquitetura](<../../architecture/overview.md>) — §6

## Escopo

**Inclui:**

- Rubrica por fala e por cena; modo cego (inspetor fechado até dar as notas).
- Notas gravadas junto da fatia.
- Métricas automáticas: leitura do SOM, tempo p95, custo por conversa, fatos inventados marcados e passo do motor.
- Painel agregado por conjunto de cenas e exportação.

**Não inclui:**

- Cenas douradas (EVAL-02).

## Entregáveis

- `apps/web/src/evaluation/`
- funções puras de métricas com testes
- `apps/web/e2e/evaluation.spec.ts`

## Lista de testes (escreva primeiro)

```text
- given 10 player lines with 1 correction when computing then SOM reading is 90%
- given latencies when computing then p95 follows the nearest-rank definition
- given blind mode when rating is pending then the inspector is locked
- E2E: given a finished scene when rating then the panel updates
```

## Critérios de aceite

- [ ] Fluxo E2E 7.
- [ ] Métricas batem com as definições da avaliação.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Sem dados pessoais nas exportações.
