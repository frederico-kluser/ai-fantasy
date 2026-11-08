# Contrato CTR-05 — Evidências, versões e matriz de qualidade

> **Status:** **PROPOSTA PARA FREEZE — pendente de revisão independente**; nenhum código de
> aplicação, scaffold, toolchain Rust resolvido, peso, medição de aplicação ou release foi
> produzido por este contrato.

| Campo | Valor |
| --- | --- |
| Tarefa | `CTR-05` — Evidências, versões e matriz de qualidade |
| Dono | `S-CONTRACT` com `S-QA` |
| Perfil | `planner-specialist` |
| Fronteira | `05` |
| Data | `2026-11-08` |
| Base SHA | `50986fc9fdb89b4c92803a5b66f9d3b14b1f492f` |
| Manifesto | `docs/planning/wave-spec.md`, SHA-256 `328a8c7e121c9e4411bf0c105c3845c636e37bf208770fbc675f2cff4a360769` |
| Worktree | `C:\Users\kluse\Projects\ai-fantasy-worktrees\ctr-05`, branch `docs/ctr-05` |
| Contratos consumidos | CTR-01 rev 5 (`11ee9be`), CTR-02 rev 4 (`7b156f3`), CTR-03 (`445cb52`), CTR-04 (`47e3679`), todos presentes na base |
| Especificação consumida | DOC-02 rev 6 (`31416a1`) |
| Interfaces consumidas | `INT-01` (identidade, unidades e canonicalização), `INT-05` (passo autoritativo) |
| Interfaces produzidas | `INT-11`, `INT-18`, `INT-20` |
| Versão do contrato | v1 |
| ADR relacionado | [ADR 0001](<../../architecture/adr/0001-offline-first-runtime.md>), [ADR 0005](<../../architecture/adr/0005-deterministic-simulation-contract.md>), [ADR 0006](<../../architecture/adr/0006-tdd-coverage-mutation.md>) e [ADR 0007](<../../architecture/adr/0007-license-and-model-distribution.md>), todos **Aceite** |
| Revisão | `REVIEW-CTR-05` é obrigatória; este documento não se autoaprova |
| Implementação | Nenhuma; sem crate, `Cargo.toml`, teste de aplicação, peso, golden ou release |

Este contrato fecha a fronteira entre “o que o projeto afirma” e “o que o projeto provou”:
versões, licenças, artefactos de modelo, a máquina real de desenvolvimento/teste, os medidores
de qualidade e as interfaces que transportam modelos e gates (`INT-11`, `INT-18`, `INT-20`).
Ele é normativo e documental. Os tipos em `code spans` são propostas de domínio, não código
existente; os comandos com marca de descoberta pendente são **propostas**, não execuções.

## 1. Escopo, não-escopo e decisões preservadas

### 1.1 Escopo

- Classes de evidência: distinção normativa entre **alegação**, **observação**, **medição**,
  **reprodução**, **ausência** e **não execução**; proibição de converter alegação em medição.
- Fixação de versões e licenças: toolchain Rust, runtime de modelos, pesos, template de chat,
  projector, model cards, dependências e artefactos de release.
- Política de pin e MSRV: pin somente depois de evidência local; ferramenta ausente é reportada,
  nunca tratada como `N/A`.
- Registo da máquina real (Windows observado; Linux com procedimento e estado explícito) e da
  capacidade/fila do executor, sem mínimo, teto de hardware ou quota de agentes.
- Matriz requisito → medidor → job/comando → prova negativa para `fmt`, `clippy -D warnings`,
  `nextest`, cobertura de linha/ramo/diff, mutação, complexidade, `deny`/`audit`, documentação,
  offline, determinismo, artefactos de modelo, presença de evidência e release.
- Escopo de medição no bootstrap: o que é exigível em F0, o que fica `SEM_CODIGO_MENSURAVEL` e
  o que só é exigível depois de código mensurável; sem `N/A` automático e sem alegar pisos de
  `af-core`/`af-rules` cumpridos antes de existir crate medível.
- Regras de evidência e versionamento de artefactos, exclusão de dados voláteis de goldens e
  hashes, protocolo de reprodutibilidade, propriedade e registo de falha.
- Interfaces `INT-11` (transporte e supervisor locais), `INT-18` (runner e apresentação) e
  `INT-20` (gates e release), com tipos, invariantes, erros e consumidores.
- Critérios `AC-CTR-05-01` a `AC-CTR-05-04`, test list futura, decisões de freeze e pendências.

### 1.2 Não-escopo

- Implementar `xtask`, CI, crates, scaffolds, sidecars, supervisores, runners ou packaging.
- Editar `.github/workflows/ci.yml`, `rust-toolchain.toml`, `clippy.toml`, `rustfmt.toml`,
  `deny.toml`, `Cargo.*`, ADRs, índice de ADRs, `ROADMAP.md`, `wave-spec.md`, `decisions.md`,
  prompts, ledger ou contratos de outros donos.
- Escolher engine/render stack (D-06), custos de ação (DOC-02/CTR-02), semântica de rumor
  (`SOC-*`), geometria regional (CTR-03) ou gramática de propostas (CTR-04).
- Publicar, fazer push/PR/merge/tag, instalar dependências, executar `cargo`, inferência, rede,
  download de pesos ou abrir a base CoALA canônica.
- Declarar `DONE`, `INTEGRATED` ou freeze; o trabalhador entrega `DELIVERED_TO_REVIEW`.
- Substituir os gates de qualidade por metas de performance: latência, RAM/VRAM, 2,8 GB e
  regressão de 20% continuam diagnóstico, não gate numérico nesta fase.

### 1.3 Relação com as decisões D-01…D-08

Nenhuma decisão é reaberta; a tabela apenas declara compatibilidade.

| Decisão | Como este contrato a preserva |
| --- | --- |
| D-01 | O contrato mede o motor e a fundação; não antecipa render nem exige cliente 2D para aceitar gates técnicos. |
| D-02 | Nenhum medidor de wallclock entra em golden, hash, tick ou `ScenarioReport` comparável; tempo lógico é do CTR-02. |
| D-03 | As evidências de qualidade cobrem regras/rumores; não definem semântica social, que pertence a `SOC-*` e CTR-04. |
| D-04 | O overlay de silhuetas não é fonte de evidência nem de conhecimento; nenhum gate o usa como permissão. |
| D-05 | Registra o hardware real e a ausência de teto; não fixa mínimo, VRAM mínima, latência máxima ou perfil de produto. |
| D-06 | Nenhuma stack de render é escolhida; `INT-19`/`RENDER-01` continuam sob gate próprio. |
| D-07 | Gates e cenários são regionais por contrato; nenhum medidor seleciona localidade por viewport. |
| D-08 | Não fixa quota de agentes; capacidade e fila são reportadas como facto, não como limite de projeto. |

### 1.4 Convenções normativas

- **DEVE**, **NÃO DEVE**, **PODE** e **NÃO PODE** são normativos. Onde se lê DEVE, um revisor
  pode exigir prova que falhe sem a regra.
- `code spans` com nomes de tipos, funções e erros são **propostas de domínio**, não assinaturas
  compiladas. Blocos `text` são estrutura de contrato, não código executável.
- `§` refere-se a este contrato; `CTR-0x §y` refere-se ao contrato indicado; `DOC-02 §y` à
  especificação de gameplay. Links `#Lx-Ly` citam a fonte atual na base.
- Limiares de percentagem são inteiros em **basis points** (`bp`), `10000 = 100%`; não há
  `f32`/`f64`, arredondamento implícito ou comparação por igualdade de vírgula flutuante.
- Toda linha de evidência tem uma **classe** da §2.1. Um valor sem classe, comando, unidade e
  ambiente é alegação, não medição.
- Nenhum comando deste documento foi executado nesta tentativa, exceto os marcados
  **`OBSERVADO`**/`MEDIDO` nas §3.1 e §4. Comandos com **“descoberta pendente”** exigem
  `--help`/`show-config` reais antes de virar gate (ROADMAP §7).
- Este contrato não afirma o conteúdo de model cards, licenças de terceiros, versões de
  ferramentas ausentes, MSRV ou hashes. O que veio de documentação é `ALEGAÇÃO` (§2.1).

## 2. Epistemologia da evidência: alegação, observação e medição

### 2.1 Classes de evidência

| Classe | Definição | Prova mínima | Uso permitido |
| --- | --- | --- | --- |
| `ALEGAÇÃO` | Informação de fonte externa ou documentação, não reexecutada neste ambiente. | URL/revisão da fonte e data de acesso. | Contexto e contrato; nunca fecha gate numérico. |
| `OBSERVADO` | Saída de comando capturada neste ambiente, sem valor numérico de qualidade afirmado. | Comando, stdout/stderr, exit code, host, data. | Inventário, disponibilidade, existência. |
| `MEDIDO` | Valor numérico produzido por medidor nomeado, com unidade e escopo. | Comando, relatório, unidade, base SHA, host. | Gate numérico apenas se o medidor e o limiar estiverem congelados. |
| `REPRODUZIDO` | `MEDIDO` repetido em segunda execução ou segundo host, com mesmo resultado dentro da tolerância declarada. | Duas execuções e hashes/comparação. | Gate cross-platform e release. |
| `AUSENTE` | Ferramenta, ficheiro, artefacto ou relatório não encontrado. | Comando de descoberta, saída e erro de resolução. | Bloqueia o gate correspondente; **nunca** vira `N/A`. |
| `NÃO EXECUTADO` | O gate existe no plano, mas não foi executado nesta fase/ambiente. | Referência ao cartão/fase e motivo. | Estado explícito; não conta como sucesso. |
| `N/A` | Requisito estruturalmente inaplicável, com justificação contratual. | Entrada de `Waiver` nomeada, com dono, motivo, escopo e validade. | Só com `Waiver`; `N/A` automático é violação de política. |
| `DIFERIDO` | Requisito aplicável, mas fora da fase corrente por desenho aprovado. | Fase, cartão que o ativa e estado no `GateReport`. | Mantém o relatório `INCOMPLETO`; nunca `GO` para release. |

### 2.2 Regras invioláveis

1. **Alegação não vira medição.** Repetir uma fonte, formatar um número ou copiá-lo para um
   relatório não produz medição. `ALEGAÇÃO` só sobe de classe com comando e saída reais.
2. **Ferramenta ausente é `AUSENTE`.** `rustc`, `cargo`, `nextest`, `llvm-cov`, `mutants`,
   `deny`, `audit`, `lychee` ou `typos` não encontrados no `PATH` são reportados com o comando
   de descoberta e o erro. **NÃO DEVE** ser registado `N/A`, “não aplicável” ou “passou”.
3. **`N/A` só por `Waiver`.** Cada `Waiver` tem `gate`, `scope`, `owner`, `reason`, `expires_at`
   e `approved_by`. Sem isso, `verify_quality` emite `PolicyViolation` e o estado é `NO_GO`.
4. **Versão/MSRV/pin só depois de evidência.** `rust-toolchain.toml` com canal flutuante, MSRV
   desconhecido ou “última versão estável” são `NÃO PINADO`/`ALEGAÇÃO`, não pin. O pin exige
   `rustc -vV`, build e suíte executados na versão candidata (§3.2).
5. **Número sem unidade/ambiente é inválido.** Percentagens em `bp`, tempos em `ms`, memória em
   bytes, com host, base SHA e comando. Um número sem esses campos é `ALEGAÇÃO`.
6. **Medição não entra no estado.** Nenhum resultado de `MEDIDO`/`REPRODUZIDO` entra em
   `canonical_state`, `state_hash`, golden determinístico ou comparação de `ScenarioReport`.
7. **Falha não é apagada.** Primeira falha é registada; retry não reescreve o histórico.
   *Flaky* é bug, não ruído (§6.7 deste contrato;
   [testing-strategy §15](<../../engineering/testing-strategy.md#L359-L364>)).
8. **Relatório ausente não é sucesso.** Ausência, truncamento, denominador indefinido, suíte
   pulada, job cancelado ou `N/A` automático produzem `NO_GO` (§5.4).

### 2.3 Registo de evidência

Cada evidência persistida (fora da worktree, em `.work/task-evidence/<ID>/attempt-NNN/`) tem:

| Campo | Conteúdo |
| --- | --- |
| `attempt` | Identificador imutável da tentativa; nova tentativa usa outro diretório. |
| `base_sha` | SHA da base em que o comando correu. |
| `command` | Linha exata, shell e diretório. |
| `exit_code` | Código do processo; “comando não encontrado” não é `0`. |
| `stdout_digest` | BLAKE3-256 do stdout, quando o conteúdo for prova. |
| `tool_versions` | Versões das ferramentas que produziram o resultado. |
| `host` | Sistema, CPU/GPU e memória relevantes (§4). |
| `class` | Uma das classes da §2.1. |
| `result` | Valor + unidade + limiar, quando aplicável. |

## 3. Versões, toolchain, model cards e licenças

### 3.1 Inventário observado nesta tentativa

Host: Windows, `attempt-001`, 2026-11-08. Comandos de descoberta: `Get-Command <tool>` e
`<tool> --version`. O resultado abaixo é `OBSERVADO`/`MEDIDO`/`AUSENTE`; não é uma declaração
sobre a máquina fora do `PATH`.

| Ferramenta | Resultado em `attempt-001` | Classe |
| --- | --- | --- |
| `git` | `2.53.0.windows.3` | `OBSERVADO` |
| `node` | `v24.18.0` | `OBSERVADO` |
| `npm` | `11.16.0` | `OBSERVADO` |
| `npx` + `markdownlint-cli2` | `0.24.0` (markdownlint `0.42.0`); 139 ficheiros, 0 issues, exit `0`, offline | `MEDIDO` (escopo Markdown) |
| `python` / `python3` | `3.12.10` | `OBSERVADO` |
| `rustc` | não reconhecido como comando; nenhum processo executado | `AUSENTE` |
| `cargo` | não reconhecido como comando | `AUSENTE` |
| `rustup` | não reconhecido como comando | `AUSENTE` |
| `cargo-nextest` | não encontrado | `AUSENTE` |
| `cargo-llvm-cov` | não encontrado | `AUSENTE` |
| `cargo-mutants` | não encontrado | `AUSENTE` |
| `cargo-deny` | não encontrado localmente (existe ação de CI em `ci.yml`) | `AUSENTE` |
| `cargo-audit` | não encontrado | `AUSENTE` |
| `lychee` | não encontrado localmente (existe ação de CI) | `AUSENTE` |
| `typos` | não encontrado | `AUSENTE` |

Consequência: nenhum gate Rust é executável nesta máquina nesta tentativa. Isso **não** é
`N/A`: é `AUSENTE`/`BLOQUEADO_POR_TOOLCHAIN`, e a ausência é reportada a `SCI-01`/`SCI-02`.

### 3.2 Toolchain Rust: estado declarado versus estado verificado

A base contém [`rust-toolchain.toml`](<../../../rust-toolchain.toml#L1-L4>) com:

```toml
[toolchain]
channel = "stable"
profile = "minimal"
components = ["rustfmt", "clippy", "llvm-tools-preview"]
```

| Aspeto | Estado em `attempt-001` | Regra |
| --- | --- | --- |
| Canal | `stable` é **flutuante**, não um pin exato. | `NÃO PINADO`; não afirmar versão. |
| `rust-version`/MSRV | `Cargo.toml` não existe; MSRV não declarado nem medido. | `NÃO PINADO`; não inventar MSRV. |
| Componentes | `rustfmt`, `clippy`, `llvm-tools-preview` declarados. | Compatíveis com os gates; resolvidos só com `rustup` real. |
| `edition` | `2024` em [`rustfmt.toml`](<../../../rustfmt.toml#L1-L4>). | Restrição de toolchain; o MSRV correspondente **NÃO** é afirmado aqui. |
| Resolução local | `rustc`/`cargo`/`rustup` ausentes do `PATH`. | `AUSENTE`; nenhuma versão foi resolvida. |

Procedimento de pin (dono `SCI-01`, gate `CP1`):

1. Instalar o canal candidato e registar `rustc -vV`, `cargo -V`, `rustup show`.
2. Criar `Cargo.toml` com `rust-version` **somente** após build, `nextest` e `clippy` verdes na
   versão candidata; derivar o MSRV do máximo real entre workspace e dependências, não de
   “última estável”.
3. Trocar `channel = "stable"` por versão exata (`1.xx.y`) e registar o SHA do instalador ou
   checksum do canal usado; o pin DEVE ser reproduzível em Windows e Linux.
4. Registar a mudança em evidência e, se o maintainer a considerar estrutural, em ADR próprio
   (fora da allowlist desta tarefa).
5. `cargo metadata --locked` e build `--locked` DEVEM passar com o pin; divergência de canal é
   `ToolchainMismatch` e bloqueia.

Nenhuma versão/MSRV é afirmada neste contrato. O valor `stable` da base é uma **configuração
observada**, não um pin aceite.

### 3.3 Artefactos de modelo, runtime, template e projector

O manifesto de modelos é um artefacto **sem pesos**, versionado como exemplo, e liga cada
modelo ao runtime, template e projector aplicáveis. Fonte de facto: [offline-ai §4](<../../engineering/offline-ai.md#L90-L144>),
[ADR 0007](<../../architecture/adr/0007-license-and-model-distribution.md#L25-L34>) e
[INT-11](<../wave-spec.md#L204-L211>).

| Artefacto | Papel | Caminho proposto | Identidade exigida | Estado em `attempt-001` |
| --- | --- | --- | --- | --- |
| Pesos d1-2B | `system_one` | `models/d1-2b/d1-2B-Q4_K_M.gguf` | `sha256`, `bytes`, licença, origem | `ALEGAÇÃO` (model card); não provisionado |
| Projector d1-2B | mídia (opcional) | `models/d1-2b/mmproj-d1-2B-Q8_0.gguf` | `sha256`, `bytes`; obrigatório se houver mídia | `ALEGAÇÃO`; não provisionado |
| Pesos LFM3 | `llm` | `models/lfm3-1.7b/LFM3-1.7B-Q4_0.gguf` | `sha256`, `bytes`, licença, origem | `ALEGAÇÃO`; não provisionado |
| Template de chat | prompt | `models/lfm3-1.7b/chat_template.jinja` | `sha256`, `template_version` | `ALEGAÇÃO`; não provisionado |
| Runtime llama.cpp | executor | binário/`llama-server` | nome, versão exata, `sha256` do binário | `AUSENTE`; versão não fixada |
| Model card d1-2B | proveniência | URL/revisão | URL, revisão, data | `ALEGAÇÃO`; não revalidado |
| Model card LFM3 | proveniência | URL/revisão | URL, revisão, data | `ALEGAÇÃO`; não revalidado |

Factos declarados (não medidos): d1-2B com 1,92B parâmetros, base LFM3-VL-2B, contexto 128K
(calibração ~64K), primitivas `noul`/`choice`/`score` em llama.cpp; LFM3-1.7B com 1,73B,
contexto 256K, 128.000 tokens, 24 camadas, GGUF Q4_0 ~1,05 GB e Q8_0 ~1,85 GB, tool calling no
dialeto da CTR-04. Fontes: [offline-ai §2](<../../engineering/offline-ai.md#L20-L67>) e
[roadmap de arquitetura §modelos](<../../architecture/roadmap.md#L530-L565>). Todos são
`ALEGAÇÃO` nesta tentativa; nenhum foi revalidado.

Regra de identidade: `VerifiedBundle` (§7.1) NÃO PODE iniciar sem `sha256` e `bytes` dos pesos,
versão exata do runtime e `sha256` do template; projector é obrigatório quando o modelo declara
entrada de mídia. Nenhum caminho pode escapar de `AF_MODELS_DIR` (`..`, symlink, absoluto).

### 3.4 Manifesto de modelos (esquema proposto)

```json
{
  "schema_version": 1,
  "models": [
    {
      "id": "d1-2b",
      "role": "system_one",
      "file": "d1-2b/d1-2B-Q4_K_M.gguf",
      "sha256": "<64 hex>",
      "bytes": 0,
      "license": {
        "spdx": "LicenseRef-LFM-Open-1.0",
        "name": "LFM Open License v1.0",
        "source": "https://www.liquid.ai/lfm-license",
        "commercial_limit_usd": 10000000
      },
      "source": {
        "url": "https://huggingface.co/LiquidAI/d1-2B-GGUF",
        "revision": "<revisao>"
      },
      "runtime": {
        "name": "llama.cpp",
        "version": "<versao exata>",
        "binary_sha256": "<64 hex>"
      },
      "template": {
        "file": "chat_template.jinja",
        "sha256": "<64 hex>",
        "template_version": "<versao>"
      },
      "projector": {
        "file": "mmproj-d1-2B-Q8_0.gguf",
        "sha256": "<64 hex>",
        "bytes": 0
      },
      "model_card": {
        "url": "https://huggingface.co/LiquidAI/d1-2B-GGUF",
        "revision": "<revisao>"
      }
    }
  ]
}
```

Invariantes: `id` único e não vazio; `role` em `{system_one, llm}`; `sha256` em 64 hex
minúsculos; `bytes > 0` (o `0` acima é placeholder, não medição); caminho relativo sem `..`;
licença obrigatória; runtime com versão exata (nunca `latest`/`stable`); template obrigatório
para `llm`; projector obrigatório se e só se houver mídia declarada; nenhuma URL de download é
usada pelo runtime. Placeholders (`<...>`, `0`) são **estrutura**, não evidência.

### 3.5 Licenças e obrigações

| Componente | Licença | Fonte | Verificação | Estado |
| --- | --- | --- | --- | --- |
| Código do repositório | MIT | [ADR 0007](<../../architecture/adr/0007-license-and-model-distribution.md#L14-L24>) | `LICENSE`, README, `cargo deny` | `ALEGAÇÃO` (não revalidada) |
| Pesos LFM3/d1-2B | LFM Open License v1.0; uso comercial gratuito < US$ 10 mi | [model license](<https://docs.liquid.ai/lfm/help/model-license>) | Leitura do texto + registo no manifesto | `ALEGAÇÃO` (não revalidada) |
| Dependências Rust | Allowlist: MIT, Apache-2.0, Apache-2.0 WITH LLVM-exception, BSD-2/3, ISC, Zlib, Unicode-3.0, MPL-2.0 | [`deny.toml`](<../../../deny.toml#L8-L19>) | `cargo deny check licenses` | `OBSERVADO` (config); gate `AUSENTE` |
| Dependências proibidas | GPL/AGPL/SSPL/BUSL, `openssl`/`openssl-sys` | [`deny.toml`](<../../../deny.toml#L22-L28>) | `cargo deny check bans` | `OBSERVADO` (config) |
| Assets | Nenhum asset de terceiros | [ADR 0007](<../../architecture/adr/0007-license-and-model-distribution.md#L36-L40>) | `docs/legal/assets.md` quando existir | `NÃO EXECUTADO` (sem assets) |
| Ferramentas de desenvolvimento | Não distribuídas com o produto | — | Registar proveniência quando empacotadas | `ALEGAÇÃO` |

Regras: pesos (`*.gguf`, `*.safetensors`, `*.onnx`, `*.mlx`) NUNCA entram no repositório,
no instalador ou no release; o release DEVE falhar se encontrar um; a licença dos modelos DEVE
ser exibida no provisionamento e referida nas notas de release quando aplicável; o projeto não
relicencia pesos. Ferramentas de desenvolvimento (Git, Node, Rust, Python) não são dependências
do produto e não entram no allowlist de `cargo deny`; a sua licença é registada apenas quando
forem distribuídas.

## 4. Máquina real, capacidade e justiça

### 4.1 Registo do host observado (Windows)

Snapshot datado; é evidência, não gate. Comandos: `Get-CimInstance` (`Win32_OperatingSystem`,
`Win32_Processor`, `Win32_ComputerSystem`, `Win32_PhysicalMemory`, `Win32_VideoController`,
`Win32_LogicalDisk`), `Get-Date`.

| Item | Valor observado | Classe | Nota |
| --- | --- | --- | --- |
| Host | `ONDOKAI` | `OBSERVADO` | Nome local; sem PII adicional. |
| SO | Windows 11 Home Single Language, `10.0.26200`, 64 bits | `OBSERVADO` | Build 26200. |
| CPU | Intel Core i9-14900HX; 24 núcleos, 32 lógicos; `MaxClockSpeed` 2200 MHz | `OBSERVADO` | `MaxClockSpeed` do WMI é base, não turbo. |
| RAM total | `34.049.417.216` bytes (31,71 GiB) | `OBSERVADO` | `Win32_ComputerSystem.TotalPhysicalMemory`. |
| Módulo de RAM | `34.359.738.368` bytes (32 GiB), 5600 MT/s, Kingston KF556S40-32 | `OBSERVADO` | Divergência com o total do SO; não reconciliar por inferência. |
| GPU 0 | Intel UHD Graphics, driver `32.0.101.5542` | `OBSERVADO` | iGPU. |
| GPU 1 | NVIDIA GeForce RTX 4070 Laptop GPU, driver `32.0.16.2101` | `OBSERVADO` | — |
| VRAM | `AdapterRAM` = `4.293.918.720` bytes | `OBSERVADO` | WMI é `u32` e não é fonte fiável de VRAM; **VRAM real NÃO MEDIDA**. |
| Disco C: | `1.022.763.200.512` bytes; livres `92.140.736.512` bytes (~85,8 GiB); NTFS | `OBSERVADO` | Headroom para `target/`, `mutants.out/`; não é requisito mínimo. |
| Data/hora | `2026-11-08T17:47:39-03:00` | `OBSERVADO` | Volátil; não entra em golden. |

Consequências honestas: (a) a máquina tem CPU/GPU da mesma classe que D-05 descreve, mas isso
não é um perfil mínimo nem um teto; (b) a VRAM não foi medida; (c) o disco livre é suficiente
para documentação, não foi testado para builds Rust completos; (d) não se afirma que o Linux é
esta máquina, nem paridade de resultados.

### 4.2 Registo Linux: estado e procedimento

`NÃO MEDIDO` em `attempt-001`. Nenhum valor de Linux é afirmado. A execução Linux (dono
`PERF-01`/`AI-01`, conforme o marco) DEVE registar, no mínimo:

| Campo | Comando proposto |
| --- | --- |
| Kernel/SO | `uname -a`, `/etc/os-release` |
| CPU | `lscpu` |
| RAM | `free -b` |
| GPU/VRAM/driver | `nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv` (se NVIDIA) |
| Disco | `df -B1` |
| Toolchain | `rustc -vV`, `cargo -V`, `rustup show` |
| Ferramentas | `command -v` para nextest/llvm-cov/mutants/deny/audit/lychee/typos |
| Resultado | mesma matriz da §5, com `MEDIDO`/`REPRODUZIDO` |

Enquanto não houver execução Linux, os gates cross-platform são `NÃO EXECUTADO`; um resultado
Windows não é “reproduzido” em Linux. D-05 não autoriza fingir a segunda execução.

### 4.3 Capacidade e fila do executor

- **Sem quota de agentes.** D-08 e o ROADMAP §4 proíbem teto artificial de subagents; este
  contrato não cria nenhum.
- **Capacidade observada:** esta tentativa correu com 1 trabalhador, 1 worktree e 1 base CoALA
  local. Métricas de fila/concorrência do orquestrador não foram expostas ao trabalhador; não
  se infere capacidade a partir disso.
- **Capacidade real é reportada como facto.** Se a ferramenta limitar concorrência, a fila for
  longa ou um job for cancelado, o registo DEVE dizer isso (§6.7), sem converter o limite em
  regra do projeto.
- **Trabalho pesado é exclusivo.** Mutação, soak, live de modelos e medições de performance não
  partilham a lane rápida de PR; a contenção de CPU/GPU/disco é registada no artefacto de
  performance, não escondida.
- **Justiça de agendamento:** a ordem de integração é determinística por `task_id`; nenhum
  trabalhador escreve na base canônica; worktrees são independentes; nenhum trabalhador remove
  worktree alheia; o revisor é quem preserva evidências e limpa.

### 4.4 Sem mínimo, teto ou promessa de desempenho

2,8 GB, latências, p95/p99 e “regressão de 20%” são referências **diagnósticas** herdadas
([overview §14](<../../architecture/overview.md#L491-L511>),
[ROADMAP §2](<../../../ROADMAP.md#L89-L99>)). Este contrato NÃO DEVE: definir hardware mínimo,
VRAM mínima, FPS, latência máxima bloqueante, número máximo de entidades, limite de agentes ou
orçamento de memória. Um SLO só existe com decisão humana explícita e dados; até lá, é
diagnóstico e fica fora dos gates de correção.

## 5. Matriz requisito → medidor → job → prova negativa

### 5.1 Como ler a matriz

- **Fase:** `B` = bootstrap documental (F0, sem `Cargo.toml`); `S` = pós-scaffold (workspace
  existe, pode não haver lógica); `C` = pós-código (código mensurável).
- **Estado 001:** situação em `attempt-001`, não uma promessa.
- **Prova negativa:** fixture/caso que DEVE produzir `NO_GO`. Um medidor sem prova negativa não
  está provado; é apenas configuração.
- **Job:** nome existente em [`ci.yml`](<../../../.github/workflows/ci.yml#L30-L196>) ou alias
  proposto (`xtask`). Nomes novos são `PROPOSTO` até `SCI-02` escrever o workflow.
- **Descoberta pendente:** o comando/flag ainda não foi confirmado por `--help` na versão
  instalada; não pode ser citado como executado.

### 5.2 Gates de código e qualidade

| # | Requisito | Medidor (unidade) | Job | Comando proposto | Fase | Estado 001 | Prova negativa | Dono |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Q-01 | Toolchain resolvido e pinado | `rustc -vV` vs `rust-toolchain.toml` | `rust` | `rustc -vV`, `cargo -V`, `rustup show` | S | `AUSENTE` (sem `rustc`) | Canal flutuante ou `rustc` divergente → `ToolchainMismatch` | `SCI-01` |
| Q-02 | Formatação | `rustfmt` | `rust` | `cargo fmt --all -- --check` | S | `NÃO EXECUTADO` | Ficheiro não formatado → exit ≠ 0 | `SCI-02` |
| Q-03 | Lint sem warnings | `clippy` | `rust` | `cargo clippy --workspace --all-targets --all-features -- -D warnings` | S | `NÃO EXECUTADO` | `unwrap`/warning → `-D warnings` falha | `SCI-02`/`SCI-03` |
| Q-04 | Suíte executada | `nextest` (testes) | `rust` | `cargo nextest run --workspace --profile ci --no-fail-fast` | S | `NÃO EXECUTADO` | Zero testes selecionados/perfil ausente → falha | `SCI-02` |
| Q-05 | Cobertura de linha | `cargo-llvm-cov` (bp) | `rust` | `cargo llvm-cov nextest --workspace --fail-under-lines 90` | C | `SEM_CODIGO_MENSURAVEL` | Linha global `8999` bp → `NO_GO` | `SCI-03` |
| Q-06 | Cobertura de ramo | `cargo-llvm-cov` (bp) | `rust`/`coverage` | `cargo llvm-cov report --branch --fail-under-branches 85` (descoberta pendente) | C | `SEM_CODIGO_MENSURAVEL` | Ramo global `8400` bp → `NO_GO` | `SCI-03` |
| Q-07 | Cobertura de diff | `cargo-llvm-cov`/lcov (bp) | `coverage` | Interseção lcov do diff contra `DIFF_BASE_SHA`; `--fail-under-lines 95` (descoberta pendente) | C | `SEM_CODIGO_MENSURAVEL` | Diff `9400` bp → `NO_GO` | `SCI-03` |
| Q-08 | Mutação | `cargo-mutants` + `xtask` (bp) | `mutants` | `cargo mutants --workspace --in-place --timeout 300`; score de `outcomes.json` no `xtask` | C | `AUSENTE` (ferramenta) | Global `7900` bp, core/rules `8900` bp → `NO_GO` | `SCI-03` |
| Q-09 | Complexidade configurada | `clippy` (limites) | `rust` | `clippy` com [`clippy.toml`](<../../../clippy.toml#L1-L7>) | S | `OBSERVADO` (config), `NÃO EXECUTADO` | Cognitiva `11`, 6 parâmetros ou 41 linhas lógicas → falha | `SCI-03` |
| Q-10 | Complexidade ciclomática/aninhamento | Medidor AST dedicado | `complexity` (proposto) | `cargo xtask complexity` (descoberta pendente; `rust-code-analysis` ou AST próprio) | C | `AUSENTE` (lacuna) | Ciclomática `11` ou aninhamento `4` → `NO_GO` | `SCI-03` |
| Q-11 | Licenças/bans/fontes | `cargo-deny` | `rust` | `cargo deny check` | S | `OBSERVADO` (config), `NÃO EXECUTADO` | GPL, `openssl`, yanked ou registry desconhecido → falha | `SCI-02` |
| Q-12 | Advisories | `cargo-audit` | `audit` (proposto) | `cargo audit` | S | `AUSENTE` (job e ferramenta) | Advisory semeado → falha | `SCI-02`/`SCI-03` |
| Q-13 | Rustdoc sem warnings | `rustdoc` | `rust` | `RUSTDOCFLAGS=-D warnings cargo doc --workspace --no-deps` | S | `NÃO EXECUTADO` | `missing_docs`/link quebrado → falha | `SCI-02` |
| Q-14 | Doc-tests | `cargo test --doc` | `rust` | `cargo test --workspace --doc` | S | `NÃO EXECUTADO` (job ausente) | Exemplo que não compila → falha | `SCI-03` |
| Q-15 | Markdown e links | `markdownlint-cli2` + `lychee` | `docs` | `npx --offline --no-install markdownlint-cli2 "**/*.md"`; `lychee --offline` | B/S/C | `MEDIDO` (0 issues, 139 files) | Link/heading quebrado ou MD0xx → falha | `CTR-05`/`SCI-02` |

### 5.3 Gates de fronteira, artefactos e release

| # | Requisito | Medidor (unidade) | Job | Comando proposto | Fase | Estado 001 | Prova negativa | Dono |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Q-16 | Offline real | `xtask check-offline` + transporte fake | `offline` (proposto) | `cargo xtask check-offline` | S/C | `AUSENTE` (`xtask` inexistente; CI faz `echo` quando falta) | Host externo, redirect, proxy ou `0.0.0.0` → falha | `SCI-04` |
| Q-17 | Determinismo | `xtask check-determinism` (hash/100 runs) | `determinism` (proposto) | `cargo xtask check-determinism` | C | `AUSENTE` | Mesma seed com hashes diferentes → `NO_GO` | `SCI-04` |
| Q-18 | Evidência presente e fail-closed | `verify_quality` (`GateReport`) | `build` | `cargo xtask verify-quality` (descoberta pendente) | S/C | `AUSENTE` | Relatório ausente/truncado, suíte pulada, `N/A` automático → `NO_GO` | `SCI-03`/`SCI-02` |
| Q-19 | Artefactos de modelo | `af models verify` | `models` (manual/CI opcional) | `af models verify --dir ./models` | S | `AUSENTE` (binário) | Hash/bytes/licença/runtime/template errados → falha | `AI-01` |
| Q-20 | Release sem pesos/segredos | `assemble_release` + scan | `release` (proposto) | `cargo xtask package` (descoberta pendente) | C | `AUSENTE` | `*.gguf`, segredo, SBOM/licença ausente, build não `--locked` → `ReleaseError` | `REL-01` |
| Q-21 | Evidência e recuperação CoALA | CLI CoALA local | manual/`build` | `coala.py where/search/get` | B/S/C | `OBSERVADO` (DB local, exit 0) | Busca vazia, resultado expirado ou fonte divergente → bloqueia entrega | `CTR-05`/revisor |

### 5.4 Escopo por fase: bootstrap, scaffold e código

O estado global do `GateReport` é `GO`, `NO_GO`, `INCOMPLETO` ou `BOOTSTRAP_GO`. `BOOTSTRAP_GO`
só é válido em fase `B` (sem `Cargo.toml`) e **nunca** autoriza release. A fase declarada NÃO
DEVE ser inferior à fase derivada do repositório: se `Cargo.toml` existe, a fase é no mínimo
`S`; tentar declarar `B` é `PolicyViolation`.

| Gate | Fase `B` (F0, docs) | Fase `S` (pós-scaffold) | Fase `C` (pós-código) |
| --- | --- | --- | --- |
| Markdown/link/`planning-check` | OBRIGATÓRIO | OBRIGATÓRIO | OBRIGATÓRIO |
| CoALA local (where/recall/sync/doctor/search/get) | OBRIGATÓRIO | OBRIGATÓRIO | OBRIGATÓRIO |
| Toolchain resolvido/pin | `AUSENTE`/`BLOQUEADO` | OBRIGATÓRIO | OBRIGATÓRIO |
| `fmt`/`clippy`/`nextest` | `NÃO EXECUTÁVEL` (sem workspace) | OBRIGATÓRIO | OBRIGATÓRIO |
| Cobertura linha/ramo/diff | `SEM_CODIGO_MENSURAVEL` | `SEM_CODIGO_MENSURAVEL` (declarações) | OBRIGATÓRIO |
| Pisos `af-core`/`af-rules` | `DIFERIDO_POR_AUSENCIA_DE_CRATE` | `DIFERIDO_POR_AUSENCIA_DE_CODIGO_MENSURAVEL` | OBRIGATÓRIO |
| Mutação | `DIFERIDO` | `DIFERIDO` | OBRIGATÓRIO |
| Complexidade configurada | `NÃO EXECUTÁVEL` | OBRIGATÓRIO (config `clippy`) | OBRIGATÓRIO |
| Complexidade ciclomática/aninhamento | `DIFERIDO` | OBRIGATÓRIO quando o medidor existir | OBRIGATÓRIO |
| `deny`/`audit` | `NÃO EXECUTÁVEL` | OBRIGATÓRIO | OBRIGATÓRIO |
| Rustdoc/doc-tests | `NÃO EXECUTÁVEL` | OBRIGATÓRIO | OBRIGATÓRIO |
| Offline | Scan estático do repositório | `xtask check-offline` | `xtask check-offline` + harness de egress |
| Determinismo | `NÃO EXECUTÁVEL` | `DIFERIDO` | OBRIGATÓRIO |
| Artefactos de modelo | `NÃO PROVISIONADO` | OBRIGATÓRIO quando `AI-01` existir | OBRIGATÓRIO |
| Release | `PROIBIDO` | `PROIBIDO` | OBRIGATÓRIO + decisão humana |

Regras do bootstrap:

1. **Nenhum piso de crate é “cumprido”.** `af-core`/`af-rules` não existem; os pisos
   95/90/100/100 são `DIFERIDO_POR_AUSENCIA_DE_CODIGO_MENSURAVEL`, não `100%`, não `N/A`, não
   “passou”.
2. **Crate vazio não é 100%.** Crate sem linhas instrumentáveis produz `NotMeasurable`; o
   `GateReport` fica `INCOMPLETO` ou `NO_GO`, nunca `GO`.
3. **`N/A` automático é proibido.** Um `Waiver` nomeado pode autorizar um gate específico numa
   fase específica; sem `Waiver`, `PolicyViolation`.
4. **Fase derivada, não declarada.** A presença de `Cargo.toml` eleva a fase mínima; a ausência
   de `Cargo.toml` não rebaixa um gate de código já aplicável.
5. **O bootstrap só fecha `CP1`.** `BOOTSTRAP_GO` é aceitável para scaffold/gates de fundação;
   não substitui `GO` de código nem autoriza release.

### 5.5 Catálogo de provas negativas

Cada prova é um fixture ou caso mínimo que DEVE produzir falha observável. A coluna “resultado
esperado” é o contrato do medidor, não uma execução.

| ID | Caso | Resultado esperado |
| --- | --- | --- |
| `NP-01` | Cobertura de ramo `8400` bp | `NO_GO` |
| `NP-02` | `af-core` linha/ramo `9400`/`8900` bp | `NO_GO` |
| `NP-03` | `af-rules` linha/ramo `9900` bp | `NO_GO` |
| `NP-04` | Cobertura de diff `9400` bp | `NO_GO` |
| `NP-05` | Mutação global `7900` bp e core/rules `8900` bp | `NO_GO` |
| `NP-06` | Função com ciclomática `11` | `NO_GO` |
| `NP-07` | Função com cognitiva `11` | `NO_GO` |
| `NP-08` | Função com `41` linhas lógicas | `NO_GO` |
| `NP-09` | Função com `6` parâmetros | `NO_GO` |
| `NP-10` | Aninhamento `4` | `NO_GO` |
| `NP-11` | `clippy` com warning sob `-D warnings` | `NO_GO` |
| `NP-12` | `cargo fmt --check` com diff | `NO_GO` |
| `NP-13` | `if` sem teste de ambos os ramos | `NO_GO` (ramo) |
| `NP-14` | Zero testes selecionados | `NO_GO` |
| `NP-15` | Relatório de cobertura ausente | `NO_GO` |
| `NP-16` | `N/A` automático em crate vazio | `NO_GO` (`PolicyViolation`) |
| `NP-17` | Transporte com URL externa (`http://example.com`) | `NO_GO` (`NonLoopbackHost`) |
| `NP-18` | Redirect/proxy remoto | `NO_GO` (`RedirectNotFollowed`/`ProxyRefused`) |
| `NP-19` | Mesma seed com hash divergente em 100 runs | `NO_GO` |
| `NP-20` | Peso com `sha256` errado | `NO_GO` (`HashMismatch`) |
| `NP-21` | Porta ocupada no `start` | `NO_GO` (`PortInUse`) |
| `NP-22` | Resposta acima de `max_reply_bytes` | `NO_GO` (`OversizeReply`) |
| `NP-23` | Licença de modelo ausente no manifesto | `NO_GO` (`LicenseMissing`) |
| `NP-24` | `*.gguf` no release | `NO_GO` (`WeightsIncluded`) |
| `NP-25` | Segredo detetado no pacote | `NO_GO` (`SecretDetected`) |
| `NP-26` | SBOM ausente no release | `NO_GO` (`SbomMissing`) |
| `NP-27` | Link/heading quebrado | `NO_GO` (docs/links) |
| `NP-28` | Busca CoALA vazia/expirada | Bloqueia `DELIVERED_TO_REVIEW` |

### 5.6 Limiares congelados (não reduzidos)

Nenhum limiar é inferior ao [ADR 0006](<../../architecture/adr/0006-tdd-coverage-mutation.md#L32-L44>),
ao [AGENTS.md §6](<../../../AGENTS.md#L55-L60>) ou ao [ROADMAP §6](<../../../ROADMAP.md#L754-L775>).

| Gate | Limiar | bp |
| --- | --- | --- |
| Linha global | ≥ 90% | `9000` |
| Ramo global | ≥ 85% | `8500` |
| `af-core` linha/ramo | ≥ 95% / ≥ 90% | `9500` / `9000` |
| `af-rules` linha/ramo | 100% | `10000` |
| Diff do PR | ≥ 95% | `9500` |
| Mutação global | ≥ 80% | `8000` |
| Mutação `af-core`/`af-rules` | ≥ 90% | `9000` |

Exclusões (`código gerado`, `main.rs`, testes, `#[cfg(test)]`) exigem justificação no
`Cargo.toml`/config de cobertura; “excluir para passar” é `PolicyViolation`. Mutantes
equivalentes são documentados e excluídos com justificação; nunca em silêncio.

## 6. Evidências, artefactos e versionamento

### 6.1 Classes de artefacto

| Artefacto | Versionado no repo? | Onde vive | Identidade | Dono |
| --- | --- | --- | --- | --- |
| Pesos (`*.gguf`) | **Nunca** | `AF_MODELS_DIR` do utilizador | `sha256` + `bytes` + licença + origem | Utilizador/`AI-01` verifica |
| Runtime (`llama-server`) | Não (binário) | instalação local; versão no manifesto | nome + versão exata + `sha256` | `AI-01` |
| Template de chat | Exemplo no repo; conteúdo real no bundle | `models/.../chat_template.jinja` | `sha256` + `template_version` | `AI-01`/`CTR-04` |
| Projector (`mmproj-*`) | **Nunca** | `AF_MODELS_DIR` | `sha256` + `bytes` | `AI-01` |
| Manifesto de modelos | Sim (exemplo, sem pesos) | `docs/engineering/model-manifest.example.json` | schema + campos | `AI-01` |
| Model card (snapshot) | Referência, não cópia | URL/revisão no manifesto | URL + revisão + data | `S-MODELS` |
| Cassette de teste | Sim, sanitizada | `tests/fixtures/**` | `request_hash`, `model_id`, `prompt_version`, `seed` | `AI-02`/`E2E-01` |
| SBOM | No artefacto de release | `release/sbom.json` | `sha256` | `REL-01` |
| `NOTICE`/licenças | Sim, quando aplicável | release | `sha256` | `REL-01` |
| Relatório de cobertura | Não (artefacto de CI) | `lcov.info`/artefacto | `sha256` + base SHA | `SCI-03` |
| `mutants.out/` | Não | worktree/artefacto | `outcomes.json` + config | `SCI-03` |
| Relatório de complexidade | Não (artefacto) | CI/artefacto | JSON + versão do medidor | `SCI-03` |
| `GateReport` | Não (artefacto) | CI/evidência | `policy_hash` + `reports_digest` + base SHA | `SCI-03`/juiz |
| `ScenarioReport` | Golden sim | `tests/e2e/golden/**` | schema + seed + hash | `E2E-01` |
| Perf/soak | Não | `docs/performance/`/artefacto | host + build + amostras | `PERF-01`/`SOAK-01` |

### 6.2 Identidade de artefacto

Todo artefacto referenciado por `INT-11`, `INT-18` ou `INT-20` usa:

```text
ArtifactRef {
  artifact_id: ArtifactId,   // estável, não derivado do caminho
  role: ArtifactRole,        // Weights | Runtime | Template | Projector | Sbom | License | Report
  path: RelativePath,        // relativo, sem "..", sem absoluto
  bytes: u64,                // > 0
  sha256: [u8; 32],          // conteúdo exato
  source: SourceRef,         // URL/revisão ou "local"
  license: LicenseRef,       // obrigatório para pesos/runtime/assets
}
```

`ArtifactRef` NÃO PODE ser construído só com caminho ou só com versão. `sha256` e `bytes` são
verificados antes do uso; qualquer divergência é erro tipado, nunca “aviso e continua”.

### 6.3 Regras por artefacto

- **Pesos:** nunca no repositório; `.gitignore` cobre `*.gguf`, `*.safetensors`, `*.onnx`,
  `*.mlx`, `*.bin`, `mmproj-*`; o runtime não descarrega; o manifesto é exemplo sem hashes
  reais; a verificação é local (`af models verify`) e falha fechada.
- **Runtime:** versão exata e `sha256` do binário; `stable`/`latest` não são pin; a versão entra
  no manifesto e na evidência de `AI-01`; trocar de runtime exige re-pin e reexecução dos gates
  de modelos.
- **Template:** `sha256` e `template_version`; um template novo invalida cassettes e cache de
  NLG; a versão do prompt (`prompt_version`) é independente do template e ambas entram na
  cassette.
- **Projector:** obrigatório apenas quando há mídia; se declarado, `sha256`/`bytes` são
  verificados; ausência com mídia declarada é `ProjectorMissing`.
- **Model card:** referência (URL + revisão + data), não uma cópia de conteúdo; uma mudança de
  revisão do card exige revisão da licença e do manifesto.
- **Release:** `assemble_release` NÃO PODE incluir pesos, segredos, PII, paths absolutos ou
  build não `--locked`; SBOM, licenças e `NOTICE` são obrigatórios quando aplicáveis.

### 6.4 Dados voláteis: exclusão obrigatória

NÃO DEVEM entrar em `canonical_state`, `state_hash`, golden determinístico, comparação de
`ScenarioReport` ou hash de release:

- relógio de parede (`Instant::now`, `SystemTime`, timestamps, duração, `started_at`);
- latência, p50/p95/p99, throughput, contagens de cache hit/miss por tempo;
- RSS/VRAM/GPU clocks/temperatura/energia, uso de CPU, número de threads do host;
- hostname, utilizador, caminho absoluto, `TEMP`, locale, timezone, variáveis de ambiente;
- ordem de iteração de `HashMap`, IDs aleatórios/UUIDs, portas efémeras, PIDs;
- cabeçalhos HTTP voláteis (`Date`, `Server`), versão de transporte;
- mtime/tamanho de ficheiros temporários, logs de ordem concorrente.

Onde ficam: artefactos de performance/soak e evidência (`docs/performance/`,
`.work/task-evidence/`), identificados por host/build/contexto/carga. Um golden que muda por
SO, versão de ferramenta ou relógio está mal desenhado
([testing-strategy §7](<../../engineering/testing-strategy.md#L127-L135>)).

### 6.5 Protocolo de reprodutibilidade

1. Registar `base_sha`, comando, shell, `exit_code`, `stdout_digest`, versões de ferramenta,
   host (§4), fixture/seed e hashes dos inputs.
2. Para gates determinísticos, repetir a execução e comparar sem os campos voláteis; duas
   execuções divergentes são `FLAKY` e bloqueiam.
3. Golden é aprovado por humano (`cargo insta review`); o CI nunca faz *bless* automático.
4. Um resultado `MEDIDO` só vira `REPRODUZIDO` com segunda execução (mesmo host) ou segundo
   host (cross-platform); sem isso, o estado é `MEDIDO`, não “paridade”.
5. Evidência de tentativa anterior não é reutilizada como se fosse medição nova; nova tentativa
   usa outro diretório.

### 6.6 Propriedade (RACI)

| Evidência | Produz | Revê | Aprova |
| --- | --- | --- | --- |
| Contrato e matriz | `S-CONTRACT` (CTR-05) | `REVIEW-CTR-05`/`S-QA` | Maintainer no freeze |
| Pin de toolchain | `SCI-01` | `S-QA` | Maintainer se estrutural |
| Cobertura/mutação/complexidade | `SCI-03` | `S-QA` | Juiz no aceite da onda |
| Offline/determinismo | `SCI-04` | Revisor independente | Juiz |
| Manifesto/hash de modelos | `AI-01` | `S-QA` | Maintainer (licença) |
| Cassettes/fakes | `AI-02`/`E2E-01` | `S-QA` | Juiz |
| SBOM/licenças de release | `REL-01` | `S-QA` | Maintainer (publicação) |
| Go/no-go | `REL-02` | Juiz | Maintainer |
| Preservação de evidência/worktree | Revisor | Juiz | — |

Nenhum produtor aprova a própria evidência; correções do juiz exigem revisão independente.

### 6.7 Registo de falha

```text
EvidenceFailure {
  failure_id: FailureId,          // estável, não reutilizado
  gate: GateId,
  scope: ScopeId,                 // crate/módulo/artefacto/host
  phase: Phase,                   // B | S | C
  command: String,
  exit_code: i32,
  classification: FailureClass,   // REAL_FAILURE | TOOL_ABSENT | REPORT_MISSING |
                                  // NOT_MEASURABLE | NOT_EXECUTED | POLICY_VIOLATION | FLAKY
  observed: String,               // valor + unidade
  expected: String,               // limiar + unidade
  evidence_path: RelativePath,
  first_seen: String,             // data da primeira observação
  retry_count: u32,
  hypothesis: String,
  next_action: String,
  consumer_impact: String,
  owner: TaskId,
}
```

Regras: registo append-only; a primeira falha não é apagada por um retry verde; `FLAKY` abre
issue e não é silenciado com `retry`/`#[ignore]`; `TOOL_ABSENT` não é `REAL_FAILURE` nem
`N/A`; `REPORT_MISSING`/`NOT_MEASURABLE` bloqueiam o gate; `POLICY_VIOLATION` exige correção de
política, não de número. A falha e a correção são preservadas na evidência da tentativa.

## 7. Interfaces INT-11, INT-18 e INT-20

### 7.1 INT-11 — Transporte e supervisor locais

Assinaturas propostas (destinos futuros `crates/af-llm/src/transport.rs` e
`crates/af-system-one/src/supervisor.rs`):

```text
Transport::post_loopback(request: LocalRequest) -> Result<RawModelReply, TransportError>
ModelSupervisor::start(bundle: &VerifiedBundle, launch: &LaunchSpec)
    -> Result<ModelHandle, ModelError>
ModelSupervisor::stop(handle: ModelHandle) -> Result<StopReceipt, ModelError>
```

| Tipo | Campos mínimos | Dono |
| --- | --- | --- |
| `LocalRequest` | `endpoint: LoopbackEndpoint`, `path`, `body: Vec<u8>`, `content_type`, `timeout_ms`, `max_reply_bytes`, `request_hash` (BLAKE3-256) | INT-11 |
| `LoopbackEndpoint` | `host` ∈ {`127.0.0.1`, `::1`}, `port` ≠ 0 | INT-11 |
| `VerifiedBundle` | `bundle_id`, `role`, `weights: ArtifactRef`, `runtime: RuntimeRef`, `template: TemplateRef`, `projector: Option<ArtifactRef>`, `license: LicenseRef`, `model_card: SourceRef`, `manifest_schema_version` | INT-11 |
| `LaunchSpec` | `bundle_id`, `host` (loopback), `port` (0 = efémera), `ctx_tokens`, `batch_tokens`, `ubatch_tokens`, `threads`, `gpu_layers`, `kv_cache_type`, `startup_timeout_ms`, `health_timeout_ms`, `env_allowlist`, `log_path` (temp), `no_webui` | INT-11 |
| `ModelHandle` | opaco; `bundle_id`, `pid` (do processo criado), `endpoint`, `launch_nonce` | INT-11 |
| `StopReceipt` | `bundle_id`, `pid`, `exit_status`, `port_released`, `owned: true` | INT-11 |

`RawModelReply` é propriedade do **INT-12** ([CTR-04 §4.1](<model-schema.md#L737-L750>));
`INT-11` apenas o preenche com `bytes`, `raw_digest`, `finish_reason` e `truncated`, e
transporta `model_id`/`prompt_version` do bundle. `INT-11` **NÃO PODE** redefinir o tipo, fazer
parse, validar schema, escolher efeitos ou completar resposta truncada
([CTR-04 §6.4](<model-schema.md#L1234-L1248>)).

Invariantes:

1. O host final é sempre loopback literal (`127.0.0.1`/`::1`); nomes, DNS, `0.0.0.0`, `::` e
   interfaces amplas são recusados.
2. Sem TLS na loopback (não há certificado/PKI no runtime); sem API keys, `Authorization`,
   cookies ou headers de telemetria.
3. Sem redirects, proxy (`HTTP_PROXY`/`HTTPS_PROXY` ignorados e recusados), retry automático ou
   download; um retry é decisão explícita do host e não altera ticks.
4. `start` verifica `sha256`/`bytes`/runtime/template/projector/licença **antes** de criar
   processo; falha não deixa processo órfão.
5. `stop` só encerra o PID registado no `ModelHandle`; nunca mata processo alheio, nunca usa
   `kill` amplo; falha de shutdown é erro, não silêncio.
6. Tempo de arranque/health/espera é evidência volátil; não avança tick, RNG ou agenda
   ([CTR-02 §2.7](<time-replay-save.md#L295-L313>)).
7. Limites: `MAX_REPLY_BYTES` (64 KiB no contrato de proposta, CTR-04), `timeout_ms` e
   `ctx_tokens` são validados; oversize/truncamento são erros tipados.

Erros `TransportError`: `NonLoopbackHost`, `ForbiddenScheme`, `DnsRefused`, `ProxyRefused`,
`RedirectNotFollowed`, `ConnectTimeout`, `ReadTimeout`, `OversizeReply`, `TruncatedReply`,
`MalformedEnvelope`, `HttpStatus`, `TlsRefused`, `RequestTooLarge`.

Erros `ModelError`: `ManifestMissing`, `ManifestSchema`, `HashMismatch`, `SizeMismatch`,
`LicenseMissing`, `LicenseNotAccepted`, `RuntimeMissing`, `RuntimeVersionMismatch`,
`TemplateMismatch`, `ProjectorMissing`, `ProjectorMismatch`, `ArtifactPathEscape`,
`UnsupportedRole`, `PortInUse`, `StartupTimeout`, `HealthFailed`, `ProcessExited`, `NotOwned`,
`StopTimeout`.

`ModelError` é o erro partilhado de transporte/supervisor: `AI-02` reutiliza-o, sem o redefinir.
As condições de abstenção do `INT-12` (timeout, indisponibilidade, resposta malformada) são
`DecisionAnswers.abstain`, não `ModelError` ([CTR-04 §6.1](<model-schema.md#L1197-L1211>)).

Aceite: ficheiro adulterado, instância errada, porta em conflito, timeout e oversize falham;
fallback e shutdown preservam jogo e recursos; nenhum pedido sai de loopback; nenhum tempo de
espera altera o mundo. Consumidores: `AI-02` (clientes), `CLI-01` (diagnóstico).

### 7.2 INT-18 — Runner e controles de apresentação

Assinaturas propostas (`crates/af-scenario/src/main.rs`, `crates/af-tui/src/lib.rs`):

```text
run_scenario(spec: ScenarioSpec, ports: ScenarioPorts) -> ScenarioReport
ui_transition(state: UiState, input: UiInput, view: &BaseReadView) -> UiTransition
```

| Tipo | Campos mínimos | Dono |
| --- | --- | --- |
| `ScenarioSpec` | `schema_version`, `name`, `seed`, `world.fixture`, `models.mode` (`fake`/`cassette`/`live`), `steps[]` declarativos | INT-18 |
| `ScenarioPorts` | fakes/cassettes, store temporário, transporte fake; sem rede | INT-18 |
| `ScenarioReport` | `schema_version`, `scenario`, `seed`, `ticks`, `final_state_hash`, `events[]` semânticos, `assertions[]` | INT-18 |
| `UiState`/`UiInput`/`UiTransition` | estado de apresentação, intenção de input, transição; sem escrita no mundo | INT-18 |

Invariantes: `steps` não têm `eval`/código/shell; `seed` explícita; `expect` falha com caminho,
esperado, obtido e `state_hash`; saída canónica sem dados voláteis; métricas de wallclock ficam
em artefacto separado; não há escrita fora do sandbox de teste (`AF_HOME`/`AF_SAVE_DIR`/tempdir);
input, NLG e câmera não geram tick por si; ausência de artefacto, zero testes ou cenário vazio
NÃO passam.

Exit codes (contrato do runner): `0` passou; `1` asserção falhou; `2` uso/cenário inválido;
`3` ambiente (modelo ausente em live, permissão); `4` timeout. Erros:
`InvalidSpec`, `UnknownStep`, `MissingFixture`, `ModelModeUnavailable`, `AssertionFailed`,
`SandboxViolation`, `ScenarioTimeout`, `NoTests`, `MissingArtifact`.

Aceite: catálogo regional/hermético; no-tests e ausência de artefacto falham; input/NLG/câmera
sem efeito temporal implícito; consumidores `MOTOR-01`/`PLAY-01`.

### 7.3 INT-20 — Gates e release

Assinaturas propostas (`xtask/src/quality.rs`, `xtask/src/offline.rs`,
`xtask/src/packaging.rs` e CI atribuído):

```text
verify_quality(reports: QualityReports, policy: &QualityPolicy) -> GateReport
assemble_release(inputs: ReleaseInputs, contract: &PackagingContract)
    -> Result<ReleaseArtifacts, ReleaseError>
```

| Tipo | Campos mínimos | Dono |
| --- | --- | --- |
| `QualityReports` | `toolchain`, `suites: BTreeMap<ScopeId, SuiteReport>`, `coverage`, `mutants`, `complexity`, `deps`, `docs`, `offline`, `determinism`, `evidence: EvidenceIndex` | INT-20 |
| `QualityPolicy` | `phase`, `floors` (bp), `required_reports`, `waivers: Vec<Waiver>`, `fail_closed: true`, `volatile_exclusions` | INT-20 |
| `GateReport` | `state`, `findings: Vec<Finding>`, `policy_hash`, `reports_digest`, `base_sha`, `tool_versions` | INT-20 |
| `Finding` | `gate`, `scope`, `classification`, `expected`, `actual`, `evidence_path` | INT-20 |
| `ReleaseInputs` | `base_sha`, `version` (calculada), `artifacts`, `licenses`, `sbom`, `gate_report`, `notices`, `excluded_weights` | INT-20 |
| `PackagingContract` | `allowed_paths`, `forbidden_patterns` (`*.gguf` etc.), `required_files`, `locked_build`, `authorization_required` | INT-20 |
| `ReleaseArtifacts` | `archive_path`, `sha256`, `bytes`, `sbom_path`, `license_bundle_path`, `manifest_path`, `reproducibility_receipt` | INT-20 |

`GateState`: `GO`, `NO_GO`, `INCOMPLETO`, `BOOTSTRAP_GO` (§5.4). `BOOTSTRAP_GO` é inválido em
`assemble_release`. Invariantes:

1. Relatório ausente, truncado, com denominador indefinido ou suíte pulada ⇒ `NO_GO`; nunca
   `GO`.
2. `N/A` sem `Waiver` ⇒ `PolicyViolation` ⇒ `NO_GO`.
3. Crate vazio/`NotMeasurable` ⇒ `NO_GO` (ou `INCOMPLETO` com `Waiver`), nunca 100%.
4. `af-core`/`af-rules` não são “cumpridos” antes de existir código mensurável.
5. `assemble_release` exige `GateState::GO` **e** autorização humana explícita; `NO_GO`,
   `INCOMPLETO` ou `BOOTSTRAP_GO` ⇒ `GateNotGo`.
6. Sem pesos, segredos, PII, paths absolutos ou dependência de rede; build `--locked`; SBOM e
   licenças presentes.
7. `verify_quality` é puro e determinístico: mesmos `reports` + `policy` ⇒ mesmo `GateReport`
   (exceto campos voláteis proibidos por desenho).

Erros `ReleaseError`: `GateNotGo`, `WeightsIncluded`, `SecretDetected`, `PiiDetected`,
`LicenseMissing`, `SbomMissing`, `VersionNotComputed`, `NotLocked`, `AuthorizationMissing`,
`PathEscape`, `InconsistentManifest`, `ArtifactHashMismatch`.

Aceite: medidores provados com fixtures; pisos reais cobrados no código aplicável; bootstrap
com política explícita e sem prova de produção inexistente; release exige gates e decisão
humana. Consumidores: juiz, `MOTOR-01`, `REL-02`.

### 7.4 Invariantes transversais

1. **Parser único.** `INT-11` transporta bytes; `INT-18` usa fakes/cassettes; nenhum dos dois
   reimplementa o parser de propostas da [CTR-04 §2.6](<model-schema.md#L270-L296>) ou o
   validador semântico. Um segundo parser é `PolicyViolation` de arquitetura.
2. **Determinismo.** Nenhum tipo de evidência, gate ou relatório entra no estado autoritativo;
   nenhuma interface usa `HashMap`, `f32`, relógio ou RNG global
   ([CTR-01 §5](<identity-events.md#L952-L1200>)).
3. **Offline.** Só loopback; `TransportError` recusa host externo, DNS, proxy, redirect e
   `0.0.0.0`; `AF_OFFLINE=1` é o default e `AF_OFFLINE=0` não habilita Internet
   ([ADR 0001](<../../architecture/adr/0001-offline-first-runtime.md>)).
4. **Modelo propõe, núcleo dispõe.** `RawModelReply` é dado não confiável; nenhum gate usa
   saída de modelo como autoridade ([ADR 0004](<../../architecture/adr/0004-model-proposes-core-disposes.md>)).
5. **Sem duplicação de contrato.** `VerifiedBundle`/`ArtifactRef` não redefinem `RawModelReply`,
   `SystemOnePort`, `LlmPort` ou `DecisionAnswers`; `GateReport` não invade o domínio do jogo.

### 7.5 Integração com CTR-01…CTR-04 (fonte e linha)

| Contrato | O que CTR-05 consome | O que CTR-05 não reabre |
| --- | --- | --- |
| CTR-01 ([§5.1](<identity-events.md#L952-L970>), [§5.5](<identity-events.md#L1158-L1175>)) | `canonical_state`/`state_hash`, exclusão de voláteis, BLAKE3-256 | Layout de ID, unidades, eventos, ordem de secções; nenhum campo de tooling no envelope. |
| CTR-02 ([§6.3](<time-replay-save.md#L1093-L1108>), [§6.4](<time-replay-save.md#L1110-L1126>), [§8.1](<time-replay-save.md#L1395-L1424>)) | o que fica fora do hash/golden, `step` puro, replay | Custos, agenda, RNG, durabilidade e recibo; nenhum wallclock em `StepOutcome`. |
| CTR-03 ([§5.7](<region-perception-overlay.md#L1022-L1035>), [§7](<region-perception-overlay.md#L1221-L1277>), [§8.5](<region-perception-overlay.md#L1360-L1369>)) | câmera/NLG não são sensores; runner não escreve estado | Geometria, FOV, overlay, stack de render; gates não usam silhueta como permissão. |
| CTR-04 ([§2.6](<model-schema.md#L270-L296>), [§4.1](<model-schema.md#L737-L750>), [§6](<model-schema.md#L1178-L1261>), [§8](<model-schema.md#L1396-L1535>)) | `RawModelReply`, portas, fakes/cassettes, parser único, corpus | Gramática, schema, validação, materialização e NLG; `INT-11` não faz parse. |
| DOC-02 ([§4.2](<../gameplay-spec.md#L169-L202>), [§15](<../gameplay-spec.md#L1056-L1072>)) | custos como referência de cenário; `PD-01`…`PD-09` | Valores de produto, custos, seed canónica; não se inventam. |

Regra de compatibilidade: uma mudança de `RawModelReply`, `VerifiedBundle`, `ScenarioReport`,
`GateReport` ou `ReleaseArtifacts` exige atualização do consumidor na mesma revisão e igualdade
literal verificada pelo juiz; nenhum consumidor improvisa tipo compatível.

### 7.6 Consumidores

| Consumidor | Interface | O que consome | O que não pode improvisar |
| --- | --- | --- | --- |
| `AI-01` | `INT-11` (produtor) | manifesto, hash/bytes, runtime/template/projector, supervisor | Download, host amplo, kill alheio, versão `stable` como pin. |
| `AI-02` | `INT-11`/`INT-12` | transporte loopback, `RawModelReply`, fakes/cassettes | Parse no transporte, inferência no tick, live por omissão. |
| `CLI-01` | `INT-11` | `af models verify/list`, `af doctor` | Diagnóstico que altera estado ou faz download. |
| `E2E-01` | `INT-18` (produtor) | `run_scenario`, `ScenarioReport`, exits 0–4 | `eval`, escrita fora do sandbox, wallclock no golden. |
| `TUI-01` | `INT-18` | `ui_transition`, `BaseReadView` | Tick por input/NLG/câmera; escrita no core. |
| `MOTOR-01` | `INT-18`/`INT-20` | cenário regional, `GateReport`, evidência | Tratar bootstrap como produção; ignorar relatório ausente. |
| `PLAY-01` | `INT-18` | runner/apresentação | Render como autoridade ou gate de motor. |
| `SCI-01` | `INT-11`/`INT-20` | pin de toolchain, `rust-version`, cmds | Pin sem evidência; MSRV inventado. |
| `SCI-02` | `INT-20` | jobs fail-closed, agregador `build` | `continue-on-error`, skip verde, `echo` no lugar de gate. |
| `SCI-03` | `INT-20` (produtor) | `verify_quality`, cobertura/mutação/complexidade | `N/A` automático, piso reduzido, relatório ausente como sucesso. |
| `SCI-04` | `INT-20` (produtor) | offline/determinismo | Gate por grep; `AF_OFFLINE=0` como Internet. |
| `REL-01` | `INT-20` (produtor) | `assemble_release`, SBOM, licenças | Pesos/segredos, build não `--locked`, versão digitada. |
| `REL-02`/juiz | `INT-20` | `GateReport`, go/no-go | Publicar sem `GO` e autorização humana. |

## 8. Critérios de aceite

### 8.1 `AC-CTR-05-01` — Versões, licenças, máquina e matriz

O contrato DEVE: distinguir `ALEGAÇÃO`/`OBSERVADO`/`MEDIDO`/`AUSENTE`/`NÃO EXECUTADO`; registar
toolchain declarado versus verificado (sem inventar versão/MSRV); identificar pesos, runtime,
template e projector com identidade/hash/licença/origem; registar a máquina real observada e o
procedimento Linux sem afirmar paridade; apresentar a matriz requisito → medidor → job →
prova negativa para todos os gates exigidos; declarar o escopo de bootstrap sem `N/A`
automático e sem alegar pisos de `af-core`/`af-rules` antes de código mensurável. Prova: §2–§5 e
§6; ausência de qualquer coluna é falha.

### 8.2 `AC-CTR-05-02` — Erros, limites e fail-closed

O contrato DEVE definir: ferramenta/artefacto ausente como `AUSENTE` (nunca `N/A`); `N/A` só
por `Waiver`; relatório ausente/truncado/suíte pulada/`NotMeasurable` como `NO_GO` ou
`INCOMPLETO`, nunca `GO`; provas negativas para cada limiar; erros tipados de `INT-11`
(host externo, redirect, proxy, timeout, oversize, hash), `INT-18` (spec inválida, no-tests,
sandbox, timeout, artefacto) e `INT-20` (`GateNotGo`, pesos, segredo, SBOM, licença,
autorização). Prova: §5.5, §6.7, §7.1–§7.3.

### 8.3 `AC-CTR-05-03` — Allowlist e não execução

Nenhum ficheiro **versionado** além de `docs/planning/contracts/toolchain-quality.md` foi
criado/alterado; o único artefacto temporário é `.work/planning-check.py`, coberto por
`/.work/` no `.gitignore` e ausente do commit. NÃO DEVE haver
edição de `ROADMAP.md`, `wave-spec.md`, `decisions.md`, prompts, outros contratos, CI,
`rust-toolchain.toml`, `Cargo.*`, ADR/índice, ledger ou código; nem `cargo`, rede, inferência,
pesos, API keys, push/PR/tag/rebase/force/`--no-verify`. Evidência fica fora da worktree; a base
CoALA canônica não é aberta. Prova: `git status`/diff da entrega e evidências.

### 8.4 `AC-CTR-05-04` — Consumo, produção e integração

O contrato DEVE consumir `INT-01`/`INT-05` sem reabrir CTR-01/CTR-02 e produzir `INT-11`,
`INT-18`, `INT-20` com tipos, invariantes, erros e consumidores; manter parser único,
determinismo, offline/loopback, model cards e `RawModelReply` de CTR-04; listar todos os
consumidores e o que não podem improvisar; integrar com CTR-01…CTR-04 por secção/linha. Prova:
§7.4–§7.6 e §10.

### 8.5 Rastreabilidade

| Critério | Exigência do cartão | Onde fecha | Prova documental | Implementação futura |
| --- | --- | --- | --- | --- |
| `AC-CTR-05-01` | Versões/licenças, máquina Windows/Linux, matriz | §2–§5 | Tabelas de classes, inventário, host, matriz e limiares | `SCI-01`/`SCI-03`/`AI-01` |
| `AC-CTR-05-02` | Alegação ≠ medição; falhas e ausências reportadas | §2.2, §5.4, §5.5, §6.7, §7 | Provas `NP-01`…`NP-28`; erros tipados | `SCI-02`/`SCI-03`/`SCI-04` |
| `AC-CTR-05-03` | Sem escrita fora da allowlist; sem execução indevida | §1.2, §8.3 | Diff/status e evidência externa | Revisor |
| `AC-CTR-05-04` | INT-11/18/20 e integração CTR-01…04 | §7 | Assinaturas, tabelas de consumo e linhas citadas | `AI-01`, `E2E-01`, `SCI-03`, `REL-01` |

## 9. Test list futura

Nomes no padrão do projeto; nenhum foi executado. São especificação de testes, não cobertura.

1. `given_rust_toolchain_file_when_read_then_channel_is_exact_or_marked_unpinned`
2. `given_floating_stable_channel_when_verify_toolchain_then_not_a_pin`
3. `given_rustc_missing_when_probe_tools_then_reports_absent_not_na`
4. `given_model_manifest_when_verify_then_hash_bytes_license_runtime_template_required`
5. `given_tampered_weight_when_verify_then_hash_mismatch`
6. `given_wrong_bytes_when_verify_then_size_mismatch`
7. `given_missing_license_entry_when_verify_then_release_blocked`
8. `given_media_declared_without_projector_when_start_then_projector_missing`
9. `given_runtime_version_latest_when_start_then_version_not_pinned`
10. `given_claim_only_row_when_report_gate_then_not_measured`
11. `given_missing_tool_when_gate_then_tool_absent_not_na`
12. `given_empty_crate_when_coverage_then_not_measurable_not_100`
13. `given_branch_8400_bp_when_verify_quality_then_no_go`
14. `given_core_9400_8900_bp_when_verify_quality_then_no_go`
15. `given_rules_9900_bp_when_verify_quality_then_no_go`
16. `given_diff_9400_bp_when_verify_quality_then_no_go`
17. `given_mutation_7900_bp_when_verify_quality_then_no_go`
18. `given_core_mutation_8900_bp_when_verify_quality_then_no_go`
19. `given_cyclomatic_11_when_complexity_then_no_go`
20. `given_nesting_4_when_complexity_then_no_go`
21. `given_missing_coverage_report_when_verify_quality_then_no_go`
22. `given_skipped_suite_when_verify_quality_then_no_go`
23. `given_automatic_na_when_verify_quality_then_policy_violation`
24. `given_waiver_without_expiry_when_verify_quality_then_policy_violation`
25. `given_phase_bootstrap_with_cargo_toml_when_verify_quality_then_phase_violation`
26. `given_non_loopback_host_when_post_loopback_then_non_loopback_host`
27. `given_redirect_when_post_loopback_then_redirect_not_followed`
28. `given_proxy_env_when_post_loopback_then_proxy_refused`
29. `given_oversize_reply_when_post_loopback_then_oversize_reply`
30. `given_foreign_pid_when_stop_then_not_owned`
31. `given_port_in_use_when_start_then_port_in_use`
32. `given_scenario_without_tests_when_run_then_exit_1`
33. `given_scenario_missing_fixture_when_run_then_exit_2`
34. `given_live_without_model_when_run_then_exit_3`
35. `given_scenario_timeout_when_run_then_exit_4`
36. `given_wallclock_field_in_scenario_report_when_compare_golden_then_rejected`
37. `given_weights_in_release_when_assemble_then_weights_included`
38. `given_secret_in_release_when_assemble_then_secret_detected`
39. `given_missing_sbom_when_assemble_then_sbom_missing`
40. `given_no_human_authorization_when_assemble_then_authorization_missing`
41. `given_same_seed_when_check_determinism_then_same_hash`
42. `given_instant_now_in_core_when_check_determinism_then_rejected`
43. `given_second_host_when_reproduce_coverage_then_same_classification`
44. `given_stale_coala_result_when_search_then_blocks_delivery`
45. `given_contract_path_when_search_coala_then_active_result_required`

## 10. Decisões para freeze

Cada linha é uma escolha estrutural. A recomendação é deste contrato; o freeze exige revisão
independente e ratificação do maintainer. Este documento não se autoaprova.

| # | Decisão | Recomendação | Justificativa | Impacto se rejeitada |
| --- | --- | --- | --- | --- |
| `F-01` | Classes de evidência e proibição de `N/A` automático | Aceitar §2.1–§2.2 | Impede “verde por ausência” e alegação virando medição. | Gates passariam a mentir em bootstrap e em ferramenta ausente. |
| `F-02` | Pin de toolchain só após evidência; `stable` não é pin | Aceitar §3.2 | Reprodutibilidade e MSRV reais; evita pin inventado. | Builds divergem entre hosts e releases não reproduzem. |
| `F-03` | Manifesto de modelos com runtime/template/projector/hash/licença | Aceitar §3.3–§3.4 | Fecha `INT-11` e `AI-01` sem pesos no repo. | Modelo não verificável; release ambíguo. |
| `F-04` | Licenças: MIT no código, LFM no peso, allowlist `deny.toml` | Aceitar §3.5 | Alinha ADR 0007 e obrigações comerciais. | Risco jurídico e release bloqueado. |
| `F-05` | Fase `B`/`S`/`C` derivada, não só declarada | Aceitar §5.4 | Impede bootstrap eterno e piso falso. | Relatório `GO` sem código mensurável. |
| `F-06` | Pisos `af-core`/`af-rules` são `DIFERIDO`, não `N/A`/100% | Aceitar §5.4 | Honestidade sobre ausência de crate. | Alegação de piso cumprido sem prova. |
| `F-07` | Limiares em `bp` e iguais aos do ADR 0006/ROADMAP | Aceitar §5.6 | Sem float, sem redução silenciosa. | Gate numérico instável ou rebaixado. |
| `F-08` | Cobertura de ramo/diff por `llvm-cov` com descoberta de flags | Aceitar §5.2 | Evita inventar flags; mede o que o ADR exige. | Ramo/diff não cobrados. |
| `F-09` | Mutação medida por `outcomes.json` + `xtask`, não flag fictícia | Aceitar §5.2 | Score auditável e reproduzível. | Mutação “passa” sem cálculo. |
| `F-10` | Complexidade ciclomática/aninhamento exige medidor AST dedicado | Aceitar §5.2 (Q-10) | `clippy` cobre cognitiva/linhas/params, não ciclomática/nesting. | Limites de AGENTS §6 não cobrados. |
| `F-11` | `INT-11` transporta `RawModelReply` de CTR-04, sem parse | Aceitar §7.1/§7.4 | Parser único e sem duplicação. | Dois parsers e divergência de schema. |
| `F-12` | `INT-20` fail-closed com `GateReport` explícito | Aceitar §7.3 | Relatório ausente/`N/A` nunca é sucesso. | Release e CP passam por omissão. |
| `F-13` | Voláteis fora de hash/golden; performance em artefacto separado | Aceitar §6.4 | Determinismo e goldens estáveis. | Golden quebra por host/relógio. |
| `F-14` | `BOOTSTRAP_GO` nunca autoriza release | Aceitar §5.4/§7.3 | Separa fundação de produção. | Release de bootstrap sem gates de código. |
| `F-15` | Evidência append-only, primeira falha preservada | Aceitar §6.7 | Auditoria e *flaky* visível. | Retry apaga histórico e esconde bug. |
| `F-16` | Linux é `NÃO MEDIDO` até execução real | Aceitar §4.2 | D-05 não autoriza fingir paridade. | Alegação cross-platform falsa. |

## 11. Como este contrato será consumido

| Consumidor | O que consome | O que não pode improvisar |
| --- | --- | --- |
| `AI-01` | §3.3–§3.4, §7.1 | Pesos no repo, runtime `latest`, kill alheio, download. |
| `AI-02` | §7.1, §7.4 | Parse no transporte, live por omissão, inferência no tick. |
| `CLI-01` | §7.1, §3.5 | Verificação que altera estado; download implícito. |
| `E2E-01` | §7.2, §6.4–§6.5 | `eval`, wallclock no golden, no-tests verde. |
| `TUI-01` | §7.2, §7.4 | Tick por input/NLG/câmera; escrita no core. |
| `MOTOR-01` | §5, §7.3 | Bootstrap como produção; relatório ausente como sucesso. |
| `PLAY-01` | §7.2 | Render como autoridade ou gate de motor. |
| `SCI-01` | §3.2, §5.4 | Pin/MSRV sem evidência; fase declarada abaixo da derivada. |
| `SCI-02` | §5.2–§5.4, §7.3 | Skip verde, `continue-on-error`, `echo` no lugar de gate. |
| `SCI-03` | §5.2, §5.5, §5.6, §7.3 | Piso reduzido, `N/A` automático, relatório ausente como `GO`. |
| `SCI-04` | §5.3, §7.4 | Offline por grep; determinismo sem hash/100 runs. |
| `REL-01` | §6.1–§6.3, §7.3 | Pesos/segredos, build não `--locked`, SBOM ausente. |
| `REL-02`/juiz | §5.4, §7.3, §6.6 | Publicar sem `GO` e autorização humana; autoaprovação. |

## 12. Limitações, pendências e estado da entrega

- **Documento normativo, sem código.** Nenhum crate, `Cargo.toml`, `xtask`, sidecar, runner,
  pacote, peso ou teste foi criado; nenhum gate Rust foi executado.
- **Toolchain local ausente.** `rustc`/`cargo`/`rustup` e todas as ferramentas Rust não foram
  encontrados no `PATH` desta sessão (`AUSENTE`, §3.1). Nenhuma versão/MSRV foi resolvida.
- **`rust-toolchain.toml` flutua.** `channel = "stable"` é configuração observada, não pin; o
  pin exato é pendência de `SCI-01` (§3.2).
- **CI parcialmente fail-open.** O job `rust` é pulado sem `Cargo.toml` e o agregador `build`
  aceita `skipped` ([ci.yml](<../../../.github/workflows/ci.yml#L82-L95>),
  [ci.yml](<../../../.github/workflows/ci.yml#L143-L166>)); o `check-offline` faz `echo` quando
  falta `xtask` ([ci.yml](<../../../.github/workflows/ci.yml#L135-L141>)). `SCI-02`/`SCI-04`
  DEVEM tornar isso fail-closed; este contrato apenas registra a lacuna.
- **Cobertura de ramo/diff não instrumentada.** A CI atual só impõe linha 90%
  ([ci.yml](<../../../.github/workflows/ci.yml#L114-L117>)); flags de ramo/diff exigem
  descoberta e implementação em `SCI-03`.
- **Complexidade ciclomática/aninhamento sem medidor.** `clippy.toml` cobre cognitiva,
  argumentos e linhas ([clippy.toml](<../../../clippy.toml#L1-L7>)); ciclomática e nesting
  continuam lacuna (`Q-10`).
- **Sem `audit` e doc-tests na CI atual.** `cargo audit` e `cargo test --doc` não aparecem no
  workflow; são gates propostos para `SCI-02`/`SCI-03`.
- **Linux não medido.** Nenhum valor Linux é afirmado; a execução exige o procedimento §4.2 e
  dono `PERF-01`/`AI-01`.
- **Model cards/licenças não revalidados.** d1-2B, LFM3, runtime e projector são `ALEGAÇÃO`;
  nenhum hash de peso ou versão de llama.cpp foi verificado nesta tentativa.
- **Pendências de produto herdadas:** `PD-01` (escala de tempo), `PD-03` (viagem/240 ticks),
  `PD-07` (rumor), `PD-08` (agenda) e `PD-09` (seed da fixture) condicionam goldens e cenários;
  `PA-06`…`PA-09` (dados expostos, debug, stack, seed) continuam abertas; `O-01` (versão de
  Flecs) e `O-12` (stack/perfis) permanecem abertas.
- **Sem ADR novo.** As decisões de tooling referem ADRs aceites; se o maintainer tratar o pin
  como estrutural, o ADR é ação pós-freeze fora da allowlist.
- **`DELIVERED_TO_REVIEW` não é `DONE`.** `REVIEW-CTR-05`, integração, recuperação CoALA
  canônica e cleanup são etapas seguintes; este documento não as antecipa.

## 13. Referências

- [Contrato CTR-01 — identidade, unidades e eventos](<identity-events.md>), rev 5.
- [Contrato CTR-02 — tempo, replay e durabilidade](<time-replay-save.md>), rev 4.
- [Contrato CTR-03 — região, percepção e overlay](<region-perception-overlay.md>).
- [Contrato CTR-04 — gramática e schema de propostas](<model-schema.md>).
- [DOC-02 — especificação de gameplay](<../gameplay-spec.md>), rev 6.
- [Especificação da onda](<../wave-spec.md>), manifesto SHA-256 `328a8c7e…a360769`.
- [Decisões do maintainer](<../decisions.md>), D-01…D-08.
- [ROADMAP — gates, cartões e comandos](<../../../ROADMAP.md#L754-L831>).
- [AGENTS.md — regras e gates](<../../../AGENTS.md#L55-L60>).
- [Regras de desenvolvimento](<../../engineering/development-rules.md>).
- [Estratégia de testes](<../../engineering/testing-strategy.md>).
- [Qualidade de código](<../../engineering/code-quality.md>).
- [IA offline](<../../engineering/offline-ai.md>).
- [Visão de arquitetura](<../../architecture/overview.md>).
- [ADR 0001 — offline first](<../../architecture/adr/0001-offline-first-runtime.md>).
- [ADR 0005 — contrato determinístico](<../../architecture/adr/0005-deterministic-simulation-contract.md>).
- [ADR 0006 — TDD, cobertura e mutação](<../../architecture/adr/0006-tdd-coverage-mutation.md>).
- [ADR 0007 — licença e distribuição](<../../architecture/adr/0007-license-and-model-distribution.md>).
- [ADR 0011 — tempo, replay e durabilidade](<../../architecture/adr/0011-time-replay-durability.md>).
- [markdownlint-cli2](<https://github.com/DavidAnson/markdownlint-cli2>), acesso em 2026-11-08.
- [cargo-nextest](<https://nexte.st/>), acesso em 2026-11-08.
- [cargo-llvm-cov](<https://github.com/taiki-e/cargo-llvm-cov>), acesso em 2026-11-08.
- [cargo-mutants](<https://mutants.rs/>), acesso em 2026-11-08.
- [cargo-deny](<https://embarkstudios.github.io/cargo-deny/>), acesso em 2026-11-08.
- [cargo-audit](<https://rustsec.org/>), acesso em 2026-11-08.
- [LFM Open License v1.0](<https://www.liquid.ai/lfm-license>), acesso em 2026-11-08.
- [Liquid AI — licença de modelos](<https://docs.liquid.ai/lfm/help/model-license>), acesso em 2026-11-08.
