# Estratégia de testes

> Como o AI Fantasy é testado (ADR 0018). A qualidade das falas não é testada aqui: ela é medida
> pela [avaliação](<evaluation.md>).

## 1. O que significa "testável" aqui

- Todo comportamento do motor é verificável por entrada → eventos → estado, sem rede e sem
  relógio.
- Toda chamada de IA tem um falso determinístico e uma gravação de resposta real.
- Toda tela tem um caminho E2E com a IA falsa.
- Toda sessão gravada pode ser reproduzida e conferida pelo hash.

## 2. TDD

1. Escreva a **lista de testes** da tarefa antes do primeiro teste (cole no PR).
2. **Vermelho:** o menor teste que descreve o próximo comportamento, falhando pelo motivo certo.
3. **Verde:** o mínimo de código para passar.
4. **Refatorar:** limpar com a rede verde.

Nomes no formato `given <situação> when <ação> then <resultado>`:

```ts
describe("presence", () => {
  it("given a trusted father adjacent when computing threat then threat is lower than with him far away", () => {
    // arrange, act, assert — sem lógica condicional no teste
  });
});
```

## 3. Mapa das suítes

| Suíte | Ferramenta | Onde | Roda em |
| --- | --- | --- | --- |
| Unidade | Vitest | todos os pacotes | todo PR |
| Propriedades | fast-check + Vitest | `packages/engine` | todo PR |
| Ouro (transcrições simbólicas) | Vitest + snapshots | `packages/engine/test/golden` | todo PR |
| Replay | Vitest | `packages/engine/test/replay` | todo PR |
| Contrato das portas de IA | Vitest + falsos + gravações | `packages/ai` | todo PR |
| Servidor | Vitest + servidor em memória | `apps/server` | todo PR |
| Componentes | Vitest + Testing Library | `apps/web` | todo PR |
| E2E | Playwright com IA falsa | `apps/web/e2e` | todo PR |
| Benchmark do motor | script próprio | `packages/engine/bench` | PR que toca o motor |
| Mutação | Stryker | pacotes | PR (incremental) e noturno (completo) |
| Ao vivo | script manual | `npm run smoke:live` | só sob comando, com a chave |

## 4. Unidade

- Cada regra do [modelo de simulação](<../architecture/simulation-model.md>) e dos
  [atos](<../architecture/dialogue-acts.md>) tem testes que fixam entradas e conferem a saída
  exata em bp.
- Casos de limite: valores em 0, 10000, −10000; faixas de incômodo, urgente e crítico; empates
  resolvidos por id.
- Construa estados com funções de fábrica (`aCharacter().withTrait("temper", 8000)`), nunca com
  objetos gigantes copiados.

## 5. Propriedades

As invariantes da seção 18 do [modelo de simulação](<../architecture/simulation-model.md>) viram
propriedades com fast-check (seed fixa no CI para reproduzir falhas):

- valores sempre dentro das faixas após qualquer passo;
- mesma seed e entradas ⇒ mesmo hash;
- ameaça com protetor confiável (sem medo, ressentimento nem ameaça percebida dele) perto ≤
  ameaça com ele longe;
- sussurro não chega como `DIRECT` a mais de 1 célula;
- precedência de Maslow monotônica;
- o personagem do jogador em `MANUAL` nunca recebe ato do motor.

## 6. Ouro: transcrições simbólicas

- Cenas fixas com seed fixa produzem uma **transcrição simbólica** (atos, faixas, saídas,
  sorteios), sem texto de modelo.
- A transcrição fica em snapshot. Mudou o snapshot: o PR explica por quê (regra ou calibração) e
  o revisor confere.
- As cenas douradas da [avaliação](<evaluation.md>) também têm sua transcrição simbólica aqui.

## 7. Replay

- Sessões gravadas (falsas ou reais, sem dados pessoais) ficam em
  `packages/engine/test/replay/fixtures`.
- O teste reconstrói cada sessão a partir do registro e confere o hash em cada passo e no fim.
- Forçar caminho: o mesmo sorteio forçado reproduz a mesma sessão.

## 8. Contrato das portas de IA

- **Falsos:** `FakeSystemOne` devolve leituras determinísticas a partir de tabelas; `FakeTextModel`
  devolve falas previsíveis a partir do pacote.
- **Gravações:** respostas reais gravadas uma vez (sem a chave) testam a conversão, a validação e
  os erros.
- **Erros:** cada linha da tabela de erros da [integração de IA](<../architecture/ai-integration.md>)
  tem teste (400, 401, 429 com nova tentativa, tempo esgotado, JSON inválido, HTTP 200 com
  `error`).
- **Validação da fala:** números de mecânica, nomes desconhecidos e tamanho excessivo são
  rejeitados; o caminho alternativo devolve a fala pronta.

## 9. Servidor

- Sobe em memória numa porta livre de `127.0.0.1`.
- Confere que nenhuma resposta contém a chave, que pedidos grandes demais são recusados e que ids
  de sessão inválidos não acessam fora de `data/`.
- Os adaptadores usam um `fetch` falso; nenhum teste chama o OpenRouter.

## 10. E2E (Playwright)

O servidor roda em modo de teste com as portas falsas. Fluxos mínimos:

1. Criar playground por premissa → revisar a ficha → começar.
2. Criar playground à mão.
3. Conversar: escrever uma fala com leitura confiante (segue direto) e uma com leitura duvidosa
   (aparece a etiqueta, corrigir).
4. Modo automático entre NPCs até alguém sair e a fatia terminar.
5. Inspetor: ver sorteios, forçar um sorteio, conferir o efeito.
6. Salvar, carregar, reproduzir e ramificar uma sessão.
7. Avaliar falas e ver o painel de métricas.
8. Continuar a campanha: encerrar a fatia, escolher o intervalo e abrir a fatia seguinte com os
   mesmos personagens.

Selecione elementos por papel e texto acessível, nunca por classe CSS.

## 11. Benchmark do motor

Cena padrão com 8 personagens; mede o tempo médio e o p95 de um passo. O orçamento é 16 ms
([avaliação](<evaluation.md>)). No CI, o limite é folgado (para não falhar por máquina lenta) e o
valor é publicado no resumo do PR; o gatilho do WebAssembly usa a medição na máquina de
desenvolvimento.

## 12. Cobertura e mutação

| Escopo | Linhas | Ramos | Mutação |
| --- | --- | --- | --- |
| Repositório | ≥ 90% | ≥ 85% | ≥ 80% |
| `packages/engine` | ≥ 95% | ≥ 90% | ≥ 90% |
| Linhas novas do PR | ≥ 95% | — | — |

Stryker roda de forma incremental nos PRs (só arquivos mudados) e completo à noite.

## 13. CI

Ordem: instalar (`npm ci`) → lint → tipos → unidade, propriedades, ouro, replay, contrato,
servidor, componentes → cobertura com limiares → E2E → benchmark (se o motor mudou) → mutação
incremental → documentação (markdownlint e links) → job agregador `build`.

## 14. O que não testar

- A qualidade literária das falas: isso é [avaliação](<evaluation.md>).
- Disponibilidade e preços do OpenRouter.
- Bibliotecas de terceiros por dentro.

## 15. Testes instáveis

Teste instável é bug. Não silencie com nova tentativa nem com `skip`: abra uma issue, corrija a
causa (geralmente tempo, ordem ou estado compartilhado) e só então volte a exigir.

## 16. Modelos

### Lista de testes (cole no PR)

```text
- given … when … then …   (unidade)
- given … when … then …   (limite)
- given … when … then …   (erro)
- propriedade: …
- E2E: …
```

### Plano de testes do PR

- Testes escritos antes da implementação: sim/não (por quê).
- Suítes afetadas e resultado.
- O que não foi testado e por quê.
