# Política de Segurança

Segurança é requisito de arquitetura no **AI Fantasy**. O jogo é offline, mas isso não o
torna imune: pesos de modelos, ficheiros de save, *prompts* e o *sidecar* local são
superfícies reais.

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
2. Descreva impacto, reprodução, versões/commits afetados e, se possível, uma correção
   sugerida.

Inclua, quando aplicável:

- vetor de ataque e pré-condições (ficheiro local? save malicioso? modelo? *prompt*?);
- passos de reprodução ou *proof of concept*;
- se o problema depende de hardware/quantização específicos;
- se há dados de terceiros envolvidos.

### SLA

| Marco | Alvo |
| --- | --- |
| Confirmação de receção | **48 h** |
| Triagem e severidade inicial | **3 dias úteis** |
| Atualizações de estado | a cada **7 dias** |
| Correção/mitigação para crítico | **30 dias** |
| Correção/mitigação para restantes | **90 dias** |

Se o relatório estiver fora do escopo, explicamos por quê e indicamos o canal correto.

## Divulgação coordenada

- Mantenha a vulnerabilidade confidencial até existir correção e advisory público.
- Combinamos a data de divulgação, creditamos quem reportou (salvo pedido de anonimato) e
  avisamos quando a correção sair.
- *Embargo* de até **90 dias** a contar da confirmação; não estendemos sem acordo.
- Após a correção, publicamos um GitHub Security Advisory (CVE quando aplicável) e uma
  nota na release.

## Escopo

**Dentro do escopo:**

- o código do runtime, incluindo o núcleo determinístico, o materializador de regras, o
  parser de *tool calls* e a persistência SQLite;
- a cadeia de fornecimento dos modelos (verificação de hash, *downloads*, caminhos de
  carregamento, permissões de ficheiros);
- a fronteira “modelo propõe / núcleo dispõe”: *prompt injection* que consiga alterar
  estado, executar ações ou escapar do schema;
- *path traversal* em carregamento de saves, fixtures, modelos e *assets*;
- corrupção de save/estado provocada por entrada não confiável;
- workflows de CI/CD e scripts de release deste repositório.

**Fora do escopo:**

- vulnerabilidades em dependências com advisory upstream já publicado (reporte ao
  fornecedor; nós atualizamos via Dependabot);
- problemas que só afetam versões não suportadas;
- engenharia social, ataques físicos e DoS contra GitHub ou infraestrutura de terceiros;
- qualidade/calibração dos modelos ou alucinações sem impacto de segurança demonstrável;
- *prompts* que apenas produzam texto ofensivo sem atravessar a fronteira de estado.

## Modelo de ameaças (resumo)

| Ativo | Ameaça | Mitigação |
| --- | --- | --- |
| Estado do jogo | Regra maliciosa gerada por modelo | Schema fechado, *allowlist* de efeitos, *clamps*, validação e materializador determinístico. |
| Save | Ficheiro manipulado | Formato versionado, limites de tamanho, validação, *checksum*, sem *deserialization* arbitrária. |
| Pesos do modelo | Ficheiro trocado/adulterado | Hash SHA-256 publicado, verificação no arranque, caminho explícito e permissões restritas. |
| *Sidecar* local | Processo escuta em `0.0.0.0` | *Bind* obrigatório em `127.0.0.1`, porta efémera, sem autenticação remota, *kill* no shutdown. |
| *Prompt* | Injeção indireta | Estado tratado como dado, delimitadores, sem instruções executáveis, validação pós-modelo. |
| Dependências | *Supply chain* | Lockfile, `cargo deny`, `cargo audit`, Dependabot, actions pinadas por SHA. |
| CI | *Token* excessivo | `permissions` mínimos, ambientes protegidos, sem segredos em PRs de forks. |

Detalhes de arquitetura em [`docs/architecture/overview.md`](docs/architecture/overview.md)
e [`docs/engineering/offline-ai.md`](docs/engineering/offline-ai.md).

## Endurecimento do repositório

- **Secret scanning** e **push protection** ativos.
- **Dependabot** para `cargo` e `github-actions`.
- **Rulesets** em `main`: PR obrigatório, revisão conforme o número de maintainers
  (bootstrap: 0; 2 maintainers: 1; 3+: 2 + code owner), checks estritos,
  histórico linear, squash-only, sem force-push/delete, tags `v*` imutáveis.
- **OpenSSF Scorecard** publicado semanalmente.
- **CodeQL** para Rust, com `permissions` mínimos.
- **Actions pinadas por SHA** (`owner/repo@<sha> # vX`), nunca por tag flutuante.
- **Sem segredos em workflows**; quando existirem, apenas em *Environment* protegido.

## Contacto

- Vulnerabilidades: **GitHub Security Advisories** (canal preferido).
- Assuntos não sensíveis: issues/discussions do repositório.
- Não publicamos um e-mail de segurança enquanto não houver um endereço operacional; o
  canal do GitHub é monitorizado e auditável.

## Reconhecimento

Agradecemos a quem reporta de boa-fé. Com permissão, o nome é incluído no advisory e na
release que corrige o problema.
