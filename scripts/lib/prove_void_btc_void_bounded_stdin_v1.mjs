import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const PROOF_DEADLINE_MS = 4000;

function runCli(cliPath, input, { endStdin }) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${cliPath} exceeded proof deadline`));
    }, PROOF_DEADLINE_MS);
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr });
    });
    child.stdin.write(input);
    if (endStdin) child.stdin.end();
  });
}

export async function proveBtcVoidBoundedStdinV1({
  cliPath,
  validInput,
  holdMarker,
}) {
  const ordinary = await runCli(cliPath, validInput, { endStdin: true });
  assert.equal(ordinary.code, 0, ordinary.stderr);
  assert.equal(ordinary.signal, null);
  assert.equal(ordinary.stderr, "");
  assert.doesNotMatch(ordinary.stdout, /_HOLD:/);
  assert.doesNotThrow(() => JSON.parse(ordinary.stdout));

  for (const heldOpenInput of [validInput, '{"schema":']) {
    const held = await runCli(cliPath, heldOpenInput, { endStdin: false });
    assert.equal(held.code, 1, held.stderr);
    assert.equal(held.signal, null);
    assert.equal(held.stdout, "");
    assert.match(held.stderr, new RegExp(`^${holdMarker}: stdin idle deadline exceeded after 500ms\\n$`));
  }
}
