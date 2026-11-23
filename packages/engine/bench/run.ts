/**
 * Engine benchmark (testing-strategy §11). Until SOC-05 delivers the engine step,
 * it only writes a placeholder report so the CI step already has its output.
 *
 * Usage: `npm run bench` (writes `reports/bench.md` under the current directory).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const REPORT = `# Benchmark do motor

O benchmark do passo do motor (cena padrão com 8 personagens, tempo médio e p95 de um
passo, orçamento de 16 ms) chega na tarefa SOC-05. Até lá, esta etapa só confirma que
o CI está pronto para publicar o resultado.
`;

/** Writes the benchmark report to `file`, creating its folder. */
export function writeBenchReport(file: string): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, REPORT, "utf8");
}

/* v8 ignore start -- @preserve: process entry point, run by `npm run bench` */
if (import.meta.main) {
  writeBenchReport(resolve("reports", "bench.md"));
}
/* v8 ignore stop -- @preserve */
