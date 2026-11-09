# Regras de desenvolvimento

> Contrato do dia a dia para quem escreve código no AI Fantasy, pessoa ou agente. Em conflito:
> instrução direta do maintainer > [`CLAUDE.md`](<../../CLAUDE.md>) > ADR > este documento.

## 1. Regras de ouro

1. **O motor decide; os modelos só traduzem** (ADR 0016). Nenhuma saída de IA muda estado sem
   virar ato ou preset validado.
2. **Determinismo no motor** (ADR 0017): mesma seed e mesmas entradas ⇒ mesmo hash.
3. **Teste primeiro** (ADR 0018): nenhum código de produção sem teste que falhou antes.
4. **A chave do OpenRouter nunca sai do servidor local** e nunca entra no git (ADR 0015).
5. **Só o que está no produto** ([`product.md`](<../product.md>)). Algo da lista "fora do
   produto" exige decisão nova.
6. **Documentação no mesmo PR** que a mudança de comportamento.

## 2. Idioma e estilo

- Documentação de produto e engenharia em **português do Brasil**.
- Identificadores, comentários de código, TSDoc, nomes de arquivo, mensagens de commit e títulos
  de PR em **inglês**.
- Termos do domínio no código usam os ids em inglês do
  [modelo de simulação](<../architecture/simulation-model.md>) (`fatigue`, `trust`, `TEASE`…).
- Formatação automática (Prettier); nada de discussão de estilo em revisão.

## 3. Arquitetura

- Respeite as dependências entre pacotes da [arquitetura](<../architecture/overview.md>), seção 2.
- `packages/engine` é puro: sem I/O, DOM, APIs do Node, rede, relógio ou aleatoriedade fora do
  PRNG.
- Toda dependência externa entra por uma porta (`SystemOnePort`, `TextModelPort`) ou pelo
  servidor.
- O navegador nunca importa os adaptadores do OpenRouter.

### Dependências

Dependência nova exige, no PR: por que é necessária, licença compatível com MIT, efeito no
tamanho do pacote do site, lockfile atualizado e `oss-gate.sh push --scan-only` limpo. Dependência
estrutural (framework, runtime, banco, modelo de IA) exige ADR.

## 4. Código TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- Proibido `any` (use `unknown` e estreite); `as` só com comentário justificando.
- Ids e escalas com tipos marcados (`CharacterId`, `Bp`) e construtores que validam.
- Uniões discriminadas no lugar de vários booleanos.
- **Erros esperados são valores** (`{ ok: true, value } | { ok: false, error }`); `throw` só para
  erro de programação (invariante violada).
- Dados de fora (respostas de IA, arquivos de sessão, pedidos HTTP) passam por validação de
  esquema antes de qualquer uso.
- Funções puras e dados imutáveis no motor; o estado novo é devolvido, nunca mutado no lugar.

## 5. Determinismo no motor

Proibido em `packages/engine`:

- `Math.random`, `Date.now`, `new Date()`, `performance.now`, `crypto.getRandomValues`;
- `Math.pow`, `Math.exp`, `Math.log`, trigonometria e qualquer resultado não inteiro guardado no
  estado;
- depender da ordem de iteração de objetos ou de `Map`/`Set` quando a ordem afeta o resultado
  (ordene por id);
- `JSON.stringify` para hash sem a serialização canônica do módulo `session`.

O lint bloqueia o que dá para bloquear; o resto é verificado pelos testes de determinismo.

## 6. Testes

Resumo; detalhes em [estratégia de testes](<testing-strategy.md>):

- ciclo vermelho → verde → refatorar, com lista de testes antes do primeiro;
- um comportamento por teste, nome `given … when … then …`;
- bug corrigido = teste de regressão que falhava antes;
- nenhum teste de PR depende de rede, chave, relógio real ou modelo de verdade.

## 7. Complexidade e tamanho

| Medida | Limite |
| --- | --- |
| Complexidade ciclomática | ≤ 10 por função |
| Complexidade cognitiva | ≤ 10 por função |
| Tamanho de função | ≤ 40 linhas |
| Parâmetros | ≤ 5 (use um objeto) |
| Aninhamento | ≤ 3 níveis |
| Arquivo | ≤ 400 linhas (sinal para dividir) |

Como medir e impor: [qualidade de código](<code-quality.md>).

## 8. Documentação

- API pública dos pacotes com TSDoc (o quê, parâmetros, erros, exemplo quando ajuda).
- Comentário explica **por quê**; o código explica o como.
- Mudou regra do motor: atualize o [modelo de simulação](<../architecture/simulation-model.md>) e
  escreva ADR. Mudou número: atualize a tabela de constantes e os testes.
- Concluiu uma tarefa do roadmap: atualize o estado dela no [ROADMAP](<../../ROADMAP.md>).

## 9. Git, commits e branches

- Nunca commitar direto em `main`: branch `<tipo>/<slug>` → PR → checks verdes → squash merge →
  apagar a branch.
- Tipos de branch: `feat fix docs style refactor perf test build ci revert hotfix release`.
- Conventional Commits em inglês, imperativo, ≤ 72 caracteres; o título do PR vira a mensagem do
  squash.
- Sincronizar é merge (`git merge origin/main`); **nunca** rebase, force-push ou `--no-verify`.

## 10. Definition of Done

- [ ] Teste primeiro, com casos de erro e limite.
- [ ] Lint, tipos, testes, cobertura e mutação verdes nos limiares.
- [ ] Complexidade dentro dos limites.
- [ ] Determinismo preservado (testes de replay verdes quando o motor mudou).
- [ ] Nenhuma saída de IA aplicada ao estado sem validação.
- [ ] Chave e dados pessoais fora do código, dos logs e do git.
- [ ] Documentação e ADR atualizados; links válidos (`npx markdownlint-cli2 "**/*.md"`).
- [ ] Estado da tarefa atualizado no ROADMAP.
- [ ] Commits convencionais; PR com plano de testes.

## 11. Segurança e privacidade

- `.env` fica fora do git; o repositório tem só `.env.example` sem valores.
- O servidor escuta só em `127.0.0.1`; nunca em `0.0.0.0`.
- Nada de chave, cabeçalho `Authorization` ou conteúdo completo de pedidos em logs.
- Sessões gravadas ficam em `data/` (fora do git). Não versione transcrições reais.
- Texto vindo de modelo é exibido como texto, nunca como HTML.

## 12. Código assistido por IA

Permitido, com transparência: declare no PR o que foi feito com IA. Quem abre o PR responde pelo
código, pela licença e pelos testes. Um modelo não aprova o próprio código.

## 13. Exceções

Uma exceção a estas regras precisa de justificativa no PR, prazo para ser removida e, se for
permanente, ADR.

## 14. Checklist rápido de revisão

- O teste falharia sem a mudança?
- O motor continua puro e determinístico?
- Alguma saída de IA chega ao estado sem validação?
- A chave ou dados pessoais aparecem em algum lugar?
- Complexidade e tamanho dentro dos limites?
- A especificação e o ROADMAP refletem a mudança?
