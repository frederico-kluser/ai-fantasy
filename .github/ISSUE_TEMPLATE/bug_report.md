---
name: Bug report
about: Reporte um problema reproduzível no AI Fantasy
title: '[bug] '
labels: bug, triage
assignees: ''
---

<!--
  NÃO use este formulário para vulnerabilidades. Use o canal privado:
  https://github.com/frederico-kluser/ai-fantasy/security/advisories/new
-->

## Resumo

<!-- O que está errado, em uma ou duas frases. -->

## Reprodução

<!-- Passos mínimos e exatos. Inclua seed, save, cenário ou comando. -->

1.
2.
3.

```text
# comandos/inputs exatos
```

## Esperado vs. observado

**Esperado:**

**Observado:**

```text
# logs, stack trace, output canónico (remova segredos/dados pessoais)
```

## Ambiente

- Versão/commit do AI Fantasy:
- SO e versão:
- Rust (`rustc -V`):
- Modelo (d1-2B/LFM3) e quantização, se aplicável:
- `AF_OFFLINE`:
- Hardware (CPU/GPU/RAM), se for performance:

## Determinismo

- Seed:
- `state_hash` (se disponível):
- O bug reproduz em 100% das execuções? [ ] sim [ ] não [ ] não sei
- Save/cenário anexado? [ ] sim [ ] não

## Contexto adicional

<!-- Regressão, workaround, issues relacionadas, suspeita de causa. -->

## Checklist

- [ ] Procurei issues existentes.
- [ ] Removi segredos e dados pessoais dos logs.
- [ ] Este relatório não é uma vulnerabilidade de segurança.
