# EVAL-03 — Rodada de validação com o maintainer

> **Fase:** F6 — Validação · **Depende de:** [EVAL-02](<EVAL-02.md>) · **Branch:** `docs/eval-03-validation-round`
> **Título do PR:** `docs(eval): record the first validation round`
>
> Siga o [guia dos agentes](<README.md>) do começo ao fim. A tarefa não autoriza nada além
> do escopo abaixo.

## Objetivo

Conduzir a rodada de validação: rodar as cenas douradas com IA real, coletar as notas do maintainer, calcular as métricas, calibrar, repetir e registrar o resultado e a decisão.

## Leia antes

- [avaliação](<../../engineering/evaluation.md>) — §5 a §7
- [decisões](<../decisions.md>) — D-23

## Escopo

**Inclui:**

- Preparar e rodar as 20 cenas com a IA real (o maintainer joga e dá as notas).
- Calcular as métricas pelo painel.
- Calibração de números, prompts e presets, com novas rodadas quando preciso.
- Relatório em `docs/evaluation/AAAA-MM-DD.md`.
- Teste cego com 3 a 5 pessoas quando as metas forem atingidas.
- Registrar a decisão (validado, calibrar de novo ou revisar o modelo) em `decisions.md`.

**Não inclui:**

- Funcionalidades novas.

## Entregáveis

- `docs/evaluation/AAAA-MM-DD.md`
- decisão nova em `docs/planning/decisions.md`

## Lista de testes (escreva primeiro)

```text
- Os testes de ouro e de replay continuam verdes depois de cada calibração.
```

## Critérios de aceite

- [ ] Relatório publicado e decisão registrada.
- [ ] Se o passo do motor passou de 16 ms, a tarefa PERF-01 foi ativada.
- [ ] Definition of Done das [regras de desenvolvimento](<../../engineering/development-rules.md>) cumprida.
- [ ] Estado da tarefa atualizado no [ROADMAP](<../../../ROADMAP.md>).

## Cuidados

- Esta tarefa precisa do maintainer: o agente prepara, roda, mede e escreve; as notas são dele.
