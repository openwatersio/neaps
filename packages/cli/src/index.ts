import { createProgram } from "./program.js";

createProgram()
  .parseAsync()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
