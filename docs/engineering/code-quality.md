# Qualidade de Código: complexidade, documentação e refatoração

> **Normativo.** O objetivo não é “passar no lint”: é deixar código que uma pessoa
> consiga ler, testar e mudar daqui a seis meses. As métricas são um meio, não um fim.

## 1. Duas complexidades

### Ciclomática (McCabe)

Conta caminhos independentes: `if`, `else if`, `match` (por braço), `&&`/`||`, `?`,
`for`/`while`, `break`/`continue` com rótulo. Um `match` de 10 braços já é complexo.

```text
M = E - N + 2P   (grafo)
na prática: 1 + número de pontos de decisão
```

### Cognitiva

Mede o custo de **ler**: aninhamento, quebras de fluxo, recursão, sequências lógicas.
É a métrica que o `clippy::cognitive_complexity` estima. Um `if` dentro de `if` dentro de
`for` custa mais do que três `if` sequenciais.

**Regra prática:** se precisas de desenhar o fluxo num papel para entender, está alto.

## 2. Limites

| Métrica | Limite | Consequência |
| --- | --- | --- |
| Ciclomática | **10** | > 10 bloqueia; 11–12 exige justificação e issue; > 12 exige ADR. |
| Cognitiva | **10** | > 10 bloqueia. |
| Linhas lógicas/função | **40** | > 40 bloqueia. |
| Parâmetros | **5** | > 5 bloqueia; agrupa numa struct. |
| Aninhamento | **3** | > 3 bloqueia; early return/extração. |
| Braços de `match` | **12** | > 12 extrai por domínio. |
| Ficheiro | **400** (soft) | > 400 justifica no PR. |
| Módulo | **800** (soft) | > 800 justifica no PR. |
| Booleanos numa condição | **3** | > 3 extrai predicado nomeado. |
| Linhas por linha | **100** | `rustfmt` aplica. |

“Linhas lógicas” exclui comentários, documentação e linhas em branco.

## 3. Como medir e impor

### `clippy.toml`

```toml
cognitive-complexity-threshold = 10
too-many-arguments-threshold = 5
too-many-lines-threshold = 40
type-complexity-threshold = 250
```

### `Cargo.toml` (workspace)

```toml
[workspace.lints.rust]
unsafe_code = "forbid"
missing_docs = "deny"
unused_must_use = "deny"

[workspace.lints.clippy]
all = "deny"
pedantic = "warn"
nursery = "warn"
cognitive_complexity = "deny"
unwrap_used = "deny"
expect_used = "deny"
panic = "deny"
indexing_slicing = "deny"
todo = "deny"
unimplemented = "deny"
dbg_macro = "deny"
print_stdout = "deny"
print_stderr = "deny"
```

Algumas *lints* são *nursery* e podem mudar; o workspace fixa a versão do toolchain e o CI
é a fonte de verdade. Se uma *lint* for demasiado ruidosa, abre issue com dados — não
desligues em silêncio.

### `xtask`

Comandos previstos:

```bash
cargo xtask lint          # fmt + clippy + typos + docs
cargo xtask complexity    # relatório de métricas (rust-code-analysis ou similar)
cargo xtask check-offline # falha se houver rede fora de loopback
cargo xtask check-deps    # cargo deny + cargo audit
cargo xtask ci            # pipeline local equivalente ao CI
```

O relatório de complexidade é informativo no PR e bloqueante nos limiares duros.

## 4. Padrões de desenho

### Guard clauses em vez de pirâmide

```rust
// Antes: 4 níveis, difícil de ler
fn apply(rule: &Rule, ctx: &Context) -> Result<Effects, RuleError> {
    if rule.is_valid() {
        if let Some(target) = ctx.target() {
            if target.is_alive() {
                if rule.dc() <= 25 {
                    // ...
                }
            }
        }
    }
    Err(RuleError::Invalid)
}

// Depois: falha cedo, fluxo linear
fn apply(rule: &Rule, ctx: &Context) -> Result<Effects, RuleError> {
    let target = ctx.target().ok_or(RuleError::MissingTarget)?;
    ensure!(target.is_alive(), RuleError::TargetDead);
    ensure!(rule.dc() <= 25, RuleError::DcOutOfRange);
    // ...
}
```

### Predicados nomeados

```rust
// Antes
if actor.hp > 0 && !actor.statuses.contains(BLINDED) && actor.fear_bp < 7000 && has_line_of_sight {
    // ...
}

// Depois
if actor.can_act() && !actor.is_terrified() && has_line_of_sight {
    // ...
}
```

### Enum em vez de booleanos

```rust
// Antes: o call site mente
apply(rule, true);

// Depois
apply(rule, Mode::DryRun);
```

### Newtypes para invariantes

```rust
pub struct Dc(u8);
impl Dc {
    pub const MIN: u8 = 5;
    pub const MAX: u8 = 25;
    pub fn new(value: u8) -> Result<Self, RuleError> { ... }
}
```

### Tabela em vez de `match` gigante

Se o `match` mapeia dados para dados, usa uma tabela `const`/`phf` e mantém o `match` para
lógica. Um `match` de 30 braços é um cheiro, não uma virtude.

### Estado explícito

Evita flags combinatórias (`is_loading`, `has_error`, `is_empty`). Usa:

```rust
enum LoadState {
    Idle,
    Loading,
    Ready(World),
    Failed(LoadError),
}
```

## 5. Documentação

### Rustdoc

- `#![deny(missing_docs)]` em todos os crates públicos.
- Cada crate: `//!` com propósito, invariantes, exemplo, erros e complexidade.
- Cada item público: `///` com `# Examples`; `# Errors` e `# Panics` quando aplicável.
- Exemplos compilam (`cargo test --doc`); se não puderem, usa `no_run` e explica.
- Liga ao ADR/issue que explica a decisão.

```rust
/// Valida e materializa uma proposta de regra.
///
/// # Invariantes
///
/// - `target_dc` está em `[5, 25]`.
/// - Todos os efeitos estão na allowlist.
/// - Nenhum efeito referencia entidade morta.
///
/// # Errors
///
/// Devolve [`RuleError::DcOutOfRange`] se o DC estiver fora da escala,
/// [`RuleError::UnknownEffect`] se o efeito não for permitido.
///
/// # Examples
///
/// ```
/// # use af_rules::{Rule, validate};
/// let rule = Rule::minimal_for_test();
/// assert!(validate(&rule).is_ok());
/// ```
pub fn validate(rule: &Rule) -> Result<(), RuleError> { ... }
```

### Comentários

- Explicam **porquê**, não **o quê**. O código já diz o quê.
- Invariantes não óbvias: `// INVARIANT: hp <= hp_max; enforced by Physiology::clamp`.
- `// SAFETY:` obrigatório em cada bloco `unsafe`.
- `// TODO(#123): ...` — nunca `// TODO` sem issue.
- `// FIXME` só com issue e prazo.
- Não comentar código morto; apagar (o git guarda).

### Documentos

- ADR para decisões; `docs/engineering` para regras; roadmap para visão.
- Diagramas em Mermaid, versionáveis e revistos em PR.
- Não duplicar a mesma explicação em três sítios; liga em vez de copiar.
- Português na documentação de produto/engenharia; inglês no rustdoc.

## 6. Refatoração

### Princípios

1. **Refactor não muda comportamento.** Se muda, é `feat`/`fix`, não `refactor`.
2. **Testes verdes antes e depois.** Se não há testes, escreve primeiro (characterization
   tests).
3. **Passos pequenos.** Um commit = um passo; se algo falhar, é fácil reverter.
4. **Não refatorar e adicionar feature no mesmo PR.**
5. **API pública:** usa `cargo public-api` para ver o diff; mudanças de assinatura são
   SemVer.

### Playbook

| Cheiro | Refactor seguro |
| --- | --- |
| Função longa | Extrair funções por intenção; manter testes. |
| `if` aninhado | Guard clauses; extrair predicados. |
| `match` gigante | Extrair por variante/domínio; tabela para dados. |
| Parâmetros demais | Introduzir struct de contexto; builder. |
| Booleanos | Enum com nome; newtype. |
| Duplicação (3ª vez) | Extrair função/trait; testar. |
| Estado implícito | Enum de estado; tornar inválido irrepresentável. |
| Dependência cíclica | Introduzir porta/trait; inverter direção. |
| Módulo gigante | Separar por razão de mudança (não por tipo). |
| Código morto | Apagar; sem `#[allow(dead_code)]`. |
| Número mágico | Constante nomeada + unidade. |
| Erro genérico | Variante tipada com contexto. |

### Sequência segura

```text
1. Escrever/verificar testes que fixam o comportamento atual.
2. Fazer a menor transformação possível.
3. Correr testes (unit + integração + E2E relevante).
4. Commit `refactor(scope): ...` (sem misturar feature).
5. Repetir.
6. No fim, revisão de legibilidade e complexidade.
```

### Refactor de API pública

- Deprecar primeiro: `#[deprecated(note = "use X; remove in 0.3")]`.
- Manter a versão antiga por pelo menos um MINOR.
- Documentar migração no CHANGELOG e no rustdoc.
- Nunca quebrar sem MAJOR.

## 7. Legibilidade humana

- **Nomes completos.** `calculate_effective_dc` > `calc_dc`; `merchant_inventory` >
  `inv2`.
- **Unidades no nome.** `timeout_ms`, `fear_delta_bp`, `half_life_ticks`.
- **Simetria.** `open`/`close`, `encode`/`decode`, `load`/`save`.
- **Sem negação dupla.** `is_visible` > `!is_invisible`.
- **Sem abreviações inventadas.** `msg`, `ctx`, `cfg` são aceites; `mgr`, `proc`, `tmpz`
  não.
- **Português nos docs, inglês no código.** Não misturar idiomas em identificadores.
- **Comentário de topo do módulo** responde: por que existe, o que garante, o que não faz.
- **Erros acionáveis:** dizem o que falhou, onde e o que fazer; sem “erro interno”.

## 8. Métricas e revisão

- Relatório de complexidade no CI (por função/módulo).
- Dashboard simples em `docs/performance/` ou artifact do CI; sem serviço externo.
- Review olha para: tamanho, complexidade, duplicação, clareza, testes, docs, offline.
- Um PR que aumenta a complexidade média sem justificação é rejeitado.
- Não otimizar prematuramente: primeiro clear, depois profile, depois optimize.

## 9. Exceções

Uma função acima do limite pode ser aceite se:

- for gerada (parser/state machine) e estiver isolada;
- tiver teste de propriedade e cobertura de ramo;
- a decomposição tornar o código pior (raro, mas acontece com `match` de protocolo);
- houver `#[allow(clippy::...)]` com comentário, issue e prazo.

Mesmo em exceção, o limite não desaparece: o `xtask complexity` continua a reportar.

## 10. Checklist de qualidade

- [ ] A função cabe numa tela e num parágrafo?
- [ ] O nome diz o que faz sem precisar de comentário?
- [ ] Há mais de 3 níveis de aninhamento?
- [ ] Consegues testar cada ramo sem mocks rebuscados?
- [ ] Os erros são tipados e acionáveis?
- [ ] A documentação explica o porquê e tem exemplo?
- [ ] A mudança piora a API pública? Há deprecação/migração?
- [ ] O código está no crate certo e na direção de dependência certa?
- [ ] Não há `unsafe`, `unwrap`, `panic`, `todo!` fora de teste?
- [ ] O PR é `refactor` sem mudança de comportamento?

## 11. Referências

- [McCabe — A Complexity Measure (1976)](https://www.literateprogramming.com/mccabe.pdf)
- [Clippy — cognitive_complexity](https://rust-lang.github.io/rust-clippy/master/index.html#cognitive_complexity)
- [Refactoring — Martin Fowler](https://refactoring.com/)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [Clippy lint list](https://rust-lang.github.io/rust-clippy/master/)
