# Governança

Este documento explica **quem decide o quê**, como as decisões são registadas e como o
projeto passa de single-maintainer para uma governança aberta sem perder o rumo técnico.

## Princípios

1. **Transparência** — decisões técnicas relevantes ficam em ADR ou issue pública.
2. **Consenso preguiçoso** (*lazy consensus*) — propostas sem objeção fundamentada avançam.
3. **Uma voz, um voto** — quando há votação, cada maintainer ativo tem um voto.
4. **Código acima de hierarquia** — uma objeção técnica precisa de evidência (teste,
   benchmark, falha reproduzível), não de cargo.
5. **Segurança e "o motor decide" não são negociáveis** — nenhuma votação pode remover a
   regra zero (o motor decide; os modelos só traduzem) nem permitir que a chave de API saia do
   servidor local. Até 2026-11-09 este princípio protegia o runtime offline; a mudança está
   registrada em D-29 e no ADR 0015.

## Papéis

| Papel | Responsabilidade |
| --- | --- |
| **BDFL** (atual) | Decisão final em empate ou impasse; guarda da visão e da licença. |
| **Maintainer** | Revisão, merge, release, triagem de segurança e roadmap. |
| **Contributor** | PRs, issues, docs, testes; segue o `CONTRIBUTING.md`. |
| **Reviewer** | Revisão técnica de áreas específicas, sem poder de merge. |

O BDFL é **@frederico-kluser** até existirem pelo menos **três maintainers ativos** com
histórico consistente (≥ 6 meses e ≥ 10 PRs relevantes). Nessa altura, o BDFL propõe uma
transição para um *steering group* de 3–5 pessoas, registada em ADR.

## Como se torna maintainer

Por convite do BDFL, com evidência pública de:

- contribuições técnicas sustentadas (não apenas volume);
- revisões de qualidade e respeito ao Código de Conduta;
- domínio de uma área (core, rules, NLG, IA offline, infraestrutura);
- compromisso de responder a segurança e reviews em prazo razoável.

O convite é anunciado numa issue e entra em vigor após 7 dias sem objeção fundamentada.

### Bootstrap de revisão (estado atual)

Enquanto houver **um único maintainer**, o ruleset de `main` exige **0 aprovações**,
porque o GitHub não permite autoaprovação e um requisito de 2 bloquearia todo o projeto.
Isso não é permissão para saltar o processo:

- PR obrigatório, checks verdes, histórico linear, squash-only e threads resolvidas;
- o checklist do PR é preenchido e o autor faz auto-review explícita;
- quando houver **2 maintainers**, a exigência sobe para **1 aprovação**;
- quando houver **3+**, sobe para **2 aprovações + code owner**.

A mudança é feita em `.github/rulesets/regras-main.json` no mesmo PR que atualiza este
documento. O objetivo é chegar a 2 aprovações; o bootstrap é temporário e auditável.

## Processo de decisão

### Mudanças pequenas

Bug fix, docs, testes, refactor local, dependência compatível: **PR + review normal**.
Não precisa de ADR.

### Mudanças médias

Nova API pública, novo componente, alteração de schema de save/regras, performance
relevante: **issue + ADR**. O ADR entra no PR e é imutável depois de aceite (novo ADR
supersede o antigo).

### Mudanças grandes

Linguagem/stack, modelo de IA, licença, governança, ruptura de compatibilidade:
**RFC** numa issue com prazo mínimo de **14 dias** para comentários, seguida de ADR e
votação de maintainers. Em empate, decide o BDFL.

**Fase inicial (um único maintainer):** enquanto houver só um maintainer, o BDFL pode decidir
mudanças grandes diretamente, registrando-as em `docs/planning/decisions.md` e em ADR. A RFC de
14 dias passa a valer quando houver um segundo maintainer. Foi assim que o produto foi
redefinido em 2026-11-09 (D-09 a D-29, ADRs 0013 a 0018).

### Votação

- Quórum: maioria dos maintainers ativos.
- Voto: comentário explícito `+1`, `0` ou `-1` com justificativa.
- Aprovado: maioria simples, sem `-1` técnico não resolvido.
- Empate: BDFL decide e regista a justificativa.

## ADRs

- Local: [`docs/architecture/adr/`](docs/architecture/adr/).
- Formato: contexto → decisão → consequências → alternativas → referências.
- Numeração sequencial, quatro dígitos (`0007-...`).
- Um ADR aceite não é editado; é **superseded** por outro.
- Toda a decisão que afete arquitetura, segurança, licença ou contrato público exige ADR.

## Releases

- Cadência: quando houver mudanças significativas; sem promessa de datas.
- A versão é calculada a partir dos commits (`oss-version.py`/release-please).
- O CHANGELOG é gerado; a release é criada com tag anotada e notas.
- Apenas maintainers podem aprovar releases.
- Uma versão publicada nunca retrocede; reverter um BREAKING exige novo MAJOR.

## Segurança

- Relatos seguem [`SECURITY.md`](SECURITY.md), nunca issues públicas.
- O maintainer de segurança coordena triagem, correção e advisory.
- Divulgação coordenada com prazo máximo de 90 dias, salvo acordo.

## Conflitos de interesse

Quem revisa deve declarar conflito (emprego, contrato, interesse comercial no modelo ou
fornecedor). Em conflito, abstém-se da decisão; outro maintainer assume.

## Alterações a este documento

Mudanças de governança exigem RFC de 14 dias e aprovação de **dois terços** dos
maintainers ativos. O BDFL não pode alterar unilateralmente os princípios 1–5, exceto na fase
inicial com um único maintainer, sempre com decisão registrada (como em D-29).
