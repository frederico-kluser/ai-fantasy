# ADR 0015 — IA via OpenRouter, sem modelos locais por agora

- **Status:** Aceite
- **Data:** 2026-11-09
- **Decisores:** @frederico-kluser
- **Relacionado:** D-19, D-22; substitui os ADRs 0001 e 0003

## Contexto

O ADR 0001 exigia um runtime hermético, sem rede, com modelos locais da família LFM3 (d1-2B para
decisões, LFM3-1.7B para texto), e o ADR 0003 dizia que o JEV não era runtime. Para validar a
naturalidade das conversas rapidamente, o maintainer decidiu usar modelos via API e deixar os
locais para depois. "Offline-first" deixa de ser princípio do produto atual.

## Decisão

1. **SOM (decisões tipadas):** `typesafe/jev-1.14` pela rota de decisões do OpenRouter
   (`/api/alpha/decisions`).
2. **Modelo de texto:** `xiaomi/mimo-v2.6-pro` pela rota de chat do OpenRouter.
3. **Só o servidor local fala com o OpenRouter.** A chave `OPENROUTER_API_KEY` fica no `.env` do
   servidor; o navegador nunca a vê.
4. **Sem IA local por agora.** No futuro, o LFM3-1.7B e o d1 da LiquidAI entram como novos
   adaptadores das mesmas portas.
5. **Sem filtro de conteúdo próprio.** Valem as políticas do OpenRouter e de cada modelo, e a
   lei.
6. Os ids de modelo ficam na configuração; o código usa nomes de papel (`systemOne`,
   `textModel`). A regra antiga de nunca usar o nome do fornecedor no código continua.

## Consequências

### Positivas

- Qualidade alta de fala e de leitura desde o início; nada de baixar e servir pesos.
- Troca de modelo é configuração.

### Negativas / custos

- O produto depende de rede, de um provedor e de crédito; há custo por conversa.
- As conversas saem da máquina do usuário para o provedor.

### Riscos

- Mudança ou retirada de modelos no provedor. Mitigação: configuração, fixtures gravadas e
  falas prontas como caminho alternativo.
- Custo descontrolado. Mitigação: teto por conversa (D-23) e registro do custo de cada chamada.

## Alternativas consideradas

- **Modelos locais desde já** — validaríamos o sistema com modelos de ~2B cuja naturalidade em
  português não foi medida, misturando defeitos do sistema e do modelo.
- **Local e nuvem lado a lado** — mais trabalho antes de validar o básico.

## Critérios de verificação

- Nenhum código do navegador importa adaptadores do OpenRouter nem lê a chave.
- O servidor escuta só em `127.0.0.1`.
- Testes de PR não usam rede; o teste ao vivo é manual.

## Referências

- [Integração de IA](<../ai-integration.md>); catálogo público do OpenRouter conferido em
  2026-11-09.
