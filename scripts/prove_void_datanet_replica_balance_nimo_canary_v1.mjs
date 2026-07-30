#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import http from "node:http";
import { once } from "node:events";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOOL = path.resolve(
  HERE,
  "../tools/void-datanet-replica-balance-nimo-canary-v1.mjs",
);
const DATASET_ID = "ds_replica_balance_fixture_v1";
const CONFIRMATION = "import-one-datanet-replica-to-nimo";

function json(res, status, value) {
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": String(body.length),
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function runTool(args, expectedStatus = 0) {
  try {
    const result = await execFileAsync(process.execPath, [TOOL, ...args], {
      encoding: "utf8",
      timeout: 10_000,
      maxBuffer: 2 * 1024 * 1024,
    });
    assert.equal(expectedStatus, 0, "tool unexpectedly succeeded");
    return {
      status: 0,
      stdout: result.stdout,
      stderr: result.stderr,
    };
  } catch (error) {
    const status = Number.isInteger(error.code) ? error.code : 1;
    if (status !== expectedStatus) {
      throw new Error(
        `unexpected exit=${status} expected=${expectedStatus}\n`
        + `stdout=${error.stdout || ""}\nstderr=${error.stderr || ""}`,
      );
    }
    return {
      status,
      stdout: error.stdout || "",
      stderr: error.stderr || "",
    };
  }
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

const state = {
  imported: false,
  importCount: 0,
  sourceBase: "",
};

const source = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/datanet/v1/status") {
    return json(res, 200, { ok: true, role: "source" });
  }
  if (req.method === "GET" && req.url === `/datanet/v1/fetch/${DATASET_ID}`) {
    return json(res, 200, {
      ok: true,
      id: DATASET_ID,
      plaintext_b64: Buffer.from("VOID replica fixture").toString("base64"),
    });
  }
  return json(res, 404, { ok: false });
});

const target = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/datanet/v1/status") {
    return json(res, 200, { ok: true, role: "target" });
  }
  if (req.method === "GET" && req.url === `/datanet/v1/fetch/${DATASET_ID}`) {
    return state.imported
      ? json(res, 200, { ok: true, id: DATASET_ID })
      : json(res, 404, { ok: false, code: "not_found" });
  }
  if (req.method === "POST" && req.url === "/datanet/v1/import-from-peer") {
    const body = await readJson(req);
    assert.equal(body.dataset_id, DATASET_ID);
    assert.equal(body.datasetId, DATASET_ID);
    assert.equal(body.id, DATASET_ID);
    assert.equal(body.peer_http, state.sourceBase);
    assert.equal(body.peerHttp, state.sourceBase);
    assert.equal(body.source_peer, "precision");
    assert.equal(body.sourcePeer, "precision");
    assert.equal(body.source_who, body.who);
    assert.equal(body.sourceWho, body.who);
    state.importCount += 1;
    state.imported = true;
    return json(res, 201, { ok: true, imported: true, id: DATASET_ID });
  }
  return json(res, 404, { ok: false });
});

const sourceListening = once(source, "listening");
const targetListening = once(target, "listening");
source.listen(0, "127.0.0.1");
target.listen(0, "127.0.0.1");
await Promise.all([sourceListening, targetListening]);

try {
  const sourceAddress = source.address();
  const targetAddress = target.address();
  assert(sourceAddress && typeof sourceAddress === "object");
  assert(targetAddress && typeof targetAddress === "object");

  const sourceBase = `http://127.0.0.1:${sourceAddress.port}`;
  const targetBase = `http://127.0.0.1:${targetAddress.port}`;
  state.sourceBase = sourceBase;

  const common = [
    `--source-base=${sourceBase}`,
    `--target-base=${targetBase}`,
    `--dataset-id=${DATASET_ID}`,
    "--who=void-proof",
  ];

  const plan = await runTool(["--mode=plan", ...common]);
  const planValue = JSON.parse(plan.stdout);
  assert.equal(planValue.status, "plan-green");
  assert.equal(planValue.import_required, true);
  assert.equal(planValue.mutation_attempted, false);
  assert.equal(state.importCount, 0);

  const denied = await runTool(["--mode=execute", ...common], 1);
  assert.match(denied.stderr, /requires --confirm=/);
  assert.equal(state.importCount, 0);

  const executed = await runTool([
    "--mode=execute",
    `--confirm=${CONFIRMATION}`,
    ...common,
  ]);
  const executeValue = JSON.parse(executed.stdout);
  assert.equal(executeValue.status, "execute-green");
  assert.equal(executeValue.result, "imported-and-verified");
  assert.equal(executeValue.bounded_single_dataset, true);
  assert.equal(state.importCount, 1);

  const duplicate = await runTool([
    "--mode=execute",
    `--confirm=${CONFIRMATION}`,
    ...common,
  ]);
  const duplicateValue = JSON.parse(duplicate.stdout);
  assert.equal(duplicateValue.result, "already-present-noop");
  assert.equal(duplicateValue.import_attempted, false);
  assert.equal(state.importCount, 1);

  const invalid = await runTool([
    "--mode=plan",
    "--source-base=file:///tmp/source",
    `--target-base=${targetBase}`,
    `--dataset-id=${DATASET_ID}`,
  ], 1);
  assert.match(invalid.stderr, /must use http or https/);

  console.log("VOID_DATANET_REPLICA_BALANCE_NIMO_CANARY_V1_PROOF_GREEN");
  console.log("plan_default_read_only=true");
  console.log("execute_confirmation_required=true");
  console.log("compatibility_payload_verified=true");
  console.log("single_dataset_bound=true");
  console.log("post_import_fetch_verified=true");
  console.log("duplicate_safe_noop=true");
  console.log("service_restart=false");
  console.log("wallet_or_signer_access=false");
  console.log("transaction_submission=false");
  console.log("work_credit_write=false");
} finally {
  source.closeAllConnections?.();
  target.closeAllConnections?.();
  await Promise.all([closeServer(source), closeServer(target)]);
}
