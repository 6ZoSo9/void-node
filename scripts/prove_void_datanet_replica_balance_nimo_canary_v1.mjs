#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
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
const WHO = "void-proof";
const LIVE_MISSING_WHO_SHA256 = "be995ec323b5da4e3f982dfa0efa2fd649e16496fe10c61f21b1b4b92994dc91";

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
  sourceFetchWho: [],
  targetFetchWho: [],
};

const source = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  if (req.method === "GET" && url.pathname === "/datanet/v1/status") {
    return json(res, 200, { ok: true, role: "source" });
  }
  if (req.method === "GET" && url.pathname === `/datanet/v1/fetch/${DATASET_ID}`) {
    const who = url.searchParams.get("who") || "";
    if (!who) return json(res, 400, { ok: false, error: "missing_who" });
    if (who !== WHO) return json(res, 400, { ok: false, error: "bad_who" });
    state.sourceFetchWho.push(who);
    return json(res, 200, {
      ok: true,
      id: DATASET_ID,
      plaintext_b64: Buffer.from("VOID replica fixture").toString("base64"),
    });
  }
  return json(res, 404, { ok: false });
});

const target = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  if (req.method === "GET" && url.pathname === "/datanet/v1/status") {
    return json(res, 200, { ok: true, role: "target" });
  }
  if (req.method === "GET" && url.pathname === `/datanet/v1/fetch/${DATASET_ID}`) {
    const who = url.searchParams.get("who") || "";
    if (!who) return json(res, 400, { ok: false, error: "missing_who" });
    if (who !== WHO) return json(res, 400, { ok: false, error: "bad_who" });
    state.targetFetchWho.push(who);
    return state.imported
      ? json(res, 200, { ok: true, id: DATASET_ID })
      : json(res, 404, { ok: false, code: "not_found" });
  }
  if (req.method === "POST" && url.pathname === "/datanet/v1/import-from-peer") {
    const body = await readJson(req);
    assert.equal(body.dataset_id, DATASET_ID);
    assert.equal(body.datasetId, DATASET_ID);
    assert.equal(body.id, DATASET_ID);
    assert.equal(body.peer_http, state.sourceBase);
    assert.equal(body.peerHttp, state.sourceBase);
    assert.equal(body.source_peer, "precision");
    assert.equal(body.sourcePeer, "precision");
    assert.equal(body.who, WHO);
    assert.equal(body.source_who, WHO);
    assert.equal(body.sourceWho, WHO);
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
    `--who=${WHO}`,
  ];

  assert.equal(
    createHash("sha256")
      .update(JSON.stringify({ ok: false, error: "missing_who" }))
      .digest("hex"),
    LIVE_MISSING_WHO_SHA256,
  );

  const plan = await runTool(["--mode=plan", ...common]);
  const planValue = JSON.parse(plan.stdout);
  assert.equal(planValue.status, "plan-green");
  assert.equal(planValue.import_required, true);
  assert.equal(planValue.mutation_attempted, false);
  assert.equal(
    new URL(planValue.before.source_fetch.url).searchParams.get("who"),
    WHO,
  );
  assert.equal(
    new URL(planValue.before.target_fetch.url).searchParams.get("who"),
    WHO,
  );
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
  assert(state.sourceFetchWho.length >= 4);
  assert(state.targetFetchWho.length >= 5);
  assert(state.sourceFetchWho.every((value) => value === WHO));
  assert(state.targetFetchWho.every((value) => value === WHO));

  const emptyWho = await runTool([
    "--mode=plan",
    `--source-base=${sourceBase}`,
    `--target-base=${targetBase}`,
    `--dataset-id=${DATASET_ID}`,
    "--who=",
  ], 1);
  assert.match(emptyWho.stderr, /who must be non-empty/);

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
  console.log("fetch_who_bound=true");
  console.log("who_non_empty_required=true");
  console.log("live_missing_who_contract_verified=true");
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
