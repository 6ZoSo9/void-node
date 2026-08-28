import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const TOOL = path.resolve("tools/public-node-operator-self-check-v1.mjs");
const DOC = path.resolve("docs/public-node/public-node-operator-self-check-v1.md");
const RESPONSE_BOUND_PROOF = path.resolve(
  "scripts/prove_public_node_operator_self_check_response_bound_v1.mjs",
);
const RESPONSE_BOUND_MARKER =
  "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_RESPONSE_BOUND_V1_GREEN";
const PROOF_MARKER = "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1_PROOF_GREEN";

async function runResponseBoundProof() {
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [RESPONSE_BOUND_PROOF], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (status) => resolve({ status, stdout, stderr }));
  });
}

async function main() {
  assert(fs.existsSync(TOOL), "tool missing");
  assert(fs.existsSync(DOC), "documentation missing");
  assert(fs.existsSync(RESPONSE_BOUND_PROOF), "response-bound proof missing");

  const source = fs.readFileSync(TOOL, "utf8");
  const doc = fs.readFileSync(DOC, "utf8");
  for (const marker of [
    "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1",
    "VOID_PUBLIC_NODE_AGENT_DISCOVERY_V1",
    "VOID_PUBLIC_NODE_ROUTE_INDEX_V1",
    "VOID_PUBLIC_NODE_ROUTE_MANIFEST_V1",
    "VOID_PUBLIC_NODE_SELF_CHECK_SNAPSHOT_V1",
  ]) {
    assert(source.includes(marker), `source marker missing: ${marker}`);
  }
  assert(doc.includes("GET-only"));
  assert(doc.includes("2 MiB"));
  assert(doc.includes("origins require HTTPS"));
  assert(doc.includes("exit code `2`"));
  assert(doc.includes("mutation"));

  const proof = await runResponseBoundProof();
  assert.equal(proof.status, 0, proof.stderr || proof.stdout);
  assert(
    proof.stdout.includes(RESPONSE_BOUND_MARKER),
    `response-bound marker missing: ${proof.stdout}`,
  );

  console.log(PROOF_MARKER);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
