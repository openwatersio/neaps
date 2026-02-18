import { createProgram } from "../src/program.js";

// Strip ANSI escape sequences from output
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~]|\].*?\x07)/g, "");
}

interface RunResult {
  stdout: string;
  exitCode: number | null;
  error: Error | null;
}

export async function run(args: string[]): Promise<RunResult> {
  const chunks: string[] = [];

  const originalWrite = process.stdout.write;
  process.stdout.write = ((chunk: unknown) => {
    chunks.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;

  // Suppress clack's stderr output in tests
  const originalStderrWrite = process.stderr.write;
  process.stderr.write = (() => true) as typeof process.stderr.write;

  let exitCode: number | null = null;
  let error: Error | null = null;

  try {
    const program = createProgram();
    program.exitOverride();
    program.configureOutput({
      writeOut: (str) => chunks.push(str),
    });
    await program.parseAsync(["node", "neaps", ...args]);
  } catch (err: unknown) {
    if (err && typeof err === "object" && "exitCode" in err) {
      exitCode = (err as { exitCode: number }).exitCode;
    }
    error = err instanceof Error ? err : new Error(String(err));
  } finally {
    process.stdout.write = originalWrite;
    process.stderr.write = originalStderrWrite;
  }

  return { stdout: stripAnsi(chunks.join("")), exitCode, error };
}
