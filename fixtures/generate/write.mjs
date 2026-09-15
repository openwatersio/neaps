import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname } from "node:path";

export function writeGenerated(path, content, check = process.argv.includes("--check")) {
  if (check) {
    if (!existsSync(path) || readFileSync(path, "utf8") !== content) {
      throw new Error(`fixture drift: ${path}`);
    }
    console.log("checked", basename(path));
    return;
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log("wrote", basename(path));
}

export function writeJSON(path, value) {
  writeGenerated(path, `${JSON.stringify(value, null, 2)}\n`);
}
