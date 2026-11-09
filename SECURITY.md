# Política de Segurança

Segurança é requisito de arquitetura no **AI Fantasy**. O simulador roda num servidor local que
guarda uma chave de API e conversa com modelos de IA pela internet; a chave, o servidor local, os
arquivos de sessão e a fronteira entre modelo e motor são superfícies reais.

## Versões suportadas

| Versão | Suporte |
| --- | --- |
| Última release (`main`) | ✅ correções de segurança |
| Minor anterior (n-1) | ✅ melhor esforço |
| Versões mais antigas | ❌ |

Enquanto o projeto está na fase de fundação, não há versões publicadas; a política passa a
aplicar-se a partir de `v0.1.0`.

## Reportar uma vulnerabilidade

**Não** abra issues, discussions ou PRs públicos para vulnerabilidades.

Use o **GitHub Private Vulnerability Reporting**:

1. Abra <https://github.com/frederico-kluser/ai-fantasy/security/advisories/new>.
2. Descreva impacto, reprodução, versões ou commits afetados e, se possível, uma correção
   sugerida.

Inclua, quando aplicável: vetor e pré-condições (sessão manipulada? premissa ou fala maliciosa?
resposta de modelo?), passos de reprodução e se há dados de terceiros envolvidos.

### SLA

| Marco | Alvo |
| --- | --- |
| Confirmação de recebimento | **48 h** |
| Triagem e severidade inicial | **3 dias úteis** |
| Atualizações de estado | a cada **7 dias** |
| Correção ou mitigação para crítico | **30 dias** |
| Correção ou mitigação para os demais | **90 dias** |

Se o relatório estiver fora do escopo, explicamos por quê e indicamos o canal correto.

## Divulgação coordenada

- Mantenha a vulnerabilidade confidencial até existir correção e advisory público.
- Combinamos a data de divulgação, creditamos quem reportou (salvo pedido de anonimato) e
  avisamos quando a correção sair.
- *Embargo* de até **90 dias** a contar da confirmação; não estendemos sem acordo.
- Após a correção, publicamos um GitHub Security Advisory (CVE quando aplicável) e uma nota na
  release.

## Escopo

**Dentro do escopo:**

- vazamento da chave `OPENROUTER_API_KEY` (para o navegador, logs, respostas, sessões ou git);
- o servidor local aceitando conexões fora de `127.0.0.1`;
- a fronteira "o motor decide": texto do jogador, premissa ou resposta de modelo que consiga
  alterar estado sem passar por ato ou preset validado;
- texto de modelo exibido como HTML (injeção de script no site);
- acesso a arquivos fora de `data/` por ids de sessão manipulados (*path traversal*);
- corrupção de estado por sessão gravada manipulada;
- workflows de CI/CD e scripts de release deste repositório.

**Fora do escopo:**

- vulnerabilidades em dependências com advisory upstream já publicado (reporte ao fornecedor;
  nós atualizamos via Dependabot);
- problemas que só afetam versões não suportadas;
- engenharia social, ataques físicos e DoS contra GitHub, OpenRouter ou infraestrutura de
  terceiros;
- qualidade das falas, conteúdo gerado pelos modelos ou recusas dos provedores (o produto não
  tem filtro de conteúdo próprio; valem as políticas de cada provedor);
- *prompts* que só produzem texto estranho sem atravessar a fronteira de estado.

## Modelo de ameaças (resumo)

| Ativo | Ameaça | Mitigação |
| --- | --- | --- |
| Chave de API | vazamento | só no `.env` do servidor; nunca enviada ao navegador; redigida em logs; `.env` fora do git; varredura de segredos antes do push |
| Servidor local | acesso pela rede | *bind* obrigatório em `127.0.0.1`; sem CORS; limites de tamanho de pedido |
| Estado do motor | saída de modelo maliciosa | modelos só traduzem; validação por esquema; atos e presets de catálogo fechado; caminho alternativo em falha |
| Site | texto de modelo com HTML ou script | exibir sempre como texto; nunca `innerHTML` com conteúdo de modelo |
| Sessões | arquivo manipulado | formato versionado e validado; ids restritos a `[a-z0-9-]`; replay confere o hash |
| Dependências | cadeia de fornecimento | lockfile, `npm audit`, Dependabot, actions pinadas por SHA |
| CI | token excessivo | `permissions` mínimos; sem segredos em PRs de forks |

Detalhes de arquitetura em [`docs/architecture/overview.md`](docs/architecture/overview.md) e
[`docs/architecture/ai-integration.md`](docs/architecture/ai-integration.md).

## Endurecimento do repositório

- **Secret scanning** e **push protection** ativos quando o plano permitir.
- **Dependabot** para `npm` e `github-actions`.
- **Rulesets** em `main`: PR obrigatório, revisão conforme o número de maintainers
  (bootstrap: 0; 2 maintainers: 1; 3+: 2 + code owner), checks estritos, histórico linear,
  squash-only, sem force-push/delete, tags `v*` imutáveis.
- **OpenSSF Scorecard** publicado semanalmente.
- **CodeQL** para TypeScript e workflows, com `permissions` mínimos (configurado na FND-01).
- **Actions pinadas por SHA** (`owner/repo@<sha> # vX`), nunca por tag flutuante.

## Contato

- Vulnerabilidades: **GitHub Security Advisories** (canal preferido).
- Assuntos não sensíveis: issues e discussions do repositório.
- Não publicamos um e-mail de segurança enquanto não houver um endereço operacional; o canal do
  GitHub é monitorado e auditável.

## Reconhecimento

Agradecemos a quem reporta de boa-fé. Com permissão, o nome é incluído no advisory e na release
que corrige o problema.
