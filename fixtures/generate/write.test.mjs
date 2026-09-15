import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { writeGenerated } from "./write.mjs";

test("writes normally and reports drift in check mode", () => {
  const dir = mkdtempSync(join(tmpdir(), "neaps-fixtures-"));
  const path = join(dir, "fixture.json");

  try {
    writeGenerated(path, "expected\n", false);
    assert.equal(readFileSync(path, "utf8"), "expected\n");
    assert.doesNotThrow(() => writeGenerated(path, "expected\n", true));

    writeFileSync(path, "stale\n");
    assert.throws(() => writeGenerated(path, "expected\n", true), /fixture drift/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
