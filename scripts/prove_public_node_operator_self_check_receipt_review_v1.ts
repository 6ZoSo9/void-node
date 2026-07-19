import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TOOL = path.resolve("tools/public-node-operator-self-check-receipt-review-v1.mjs");
const DOC = path.resolve("docs/public-node/public-node-operator-self-check-receipt-review-v1.md");
const PROOF_MARKER =
  "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_RECEIPT_REVIEW_V1_PROOF_GREEN";

const CHECK_IDS = [
  "health",
  "readiness",
  "chain_head",
  "peer_visibility",
  "well_known_discovery",
  "route_index",
  "route_manifest",
  "self_check_snapshot",
  "public_discovery_alignment",
];

function receipt(status: "green" | "hold") {
  const checks = CHECK_IDS.map((id) => ({
    id,
    path: id === "health" ? "/health" : `/${id}`,
    ok: true,
    reason: null,
    observed: { fixture: true },
  }));

  if (status === "hold") {
    checks[4] = {
      id: "well_known_discovery",
      path: "/.well-known/void-public-node.json",
      ok: false,
      reason: "well_known_discovery_contract_mismatch",
      observed: { fixture: true },
    };
  }

  const failed = checks.filter((entry) => !entry.ok);
  return {
    marker: "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1",
    network: "Mainnet-0",
    read_only: true,
    observed_at: "2026-07-19T16:41:55.055Z",
    target: {
      scheme: "http",
      host_class: "loopback",
      port: 4101,
      raw_target_included: false,
    },
    summary: {
      status,
      checks_total: checks.length,
      checks_green: checks.length - failed.length,
      checks_failed: failed.length,
      failed_check_ids: failed.map((entry) => entry.id),
    },
    runtime: {
      node_id: "fixture-node-self-check-review-v1",
      http_port: 4101,
      p2p_port: 4701,
      chain_head: 1856587,
      peer_count: 2,
      expected_peer_count: 2,
      ready: true,
      gap: 0,
      txroot_live: 1,
    },
    checks,
    safety: {
      methods_used: ["GET"],
      redirects_followed: false,
      credentials_sent: false,
      mutation_attempted: false,
      registration_attempted: false,
      validator_activation_attempted: false,
      staking_attempted: false,
      wallet_connection_attempted: false,
      ledger_write_attempted: false,
      peer_state_write_attempted: false,
      validator_set_write_attempted: false,
      ticket_claim_attempted: false,
      buy_void_fulfillment_attempted: false,
    },
  };
}

function run(
  input: string,
  output: string,
  extra: string[] = [],
): ReturnType<typeof spawnSync> {
  return spawnSync(
    process.execPath,
    [
      TOOL,
      "--receipt",
      input,
      "--output",
      output,
      "--reviewed-at",
      "2026-07-19T17:00:00Z",
      ...extra,
    ],
    { encoding: "utf8" },
  );
}

function load(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function main(): void {
  assert(fs.existsSync(TOOL), "reviewer tool missing");
  assert(fs.existsSync(DOC), "reviewer documentation missing");

  const source = fs.readFileSync(TOOL, "utf8");
  const doc = fs.readFileSync(DOC, "utf8");

  assert(source.includes("VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_RECEIPT_REVIEW_V1"));
  assert(source.includes("VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1"));
  assert(!source.includes('from "node:http"'));
  assert(!source.includes('from "node:https"'));
  assert(!source.includes("fetch("));
  assert(doc.includes("offline"));
  assert(doc.includes("exit code `3`"));
  assert(doc.includes("--require-green"));

  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-self-check-receipt-review-proof-"),
  );

  try {
    const greenInput = path.join(temp, "green-receipt.json");
    const greenOutput = path.join(temp, "green-review.json");
    fs.writeFileSync(greenInput, `${JSON.stringify(receipt("green"), null, 2)}\n`);

    const green = run(greenInput, greenOutput);
    assert.equal(green.status, 0, green.stderr || green.stdout);
    const greenReview = load(greenOutput);
    assert.equal(
      greenReview.marker,
      "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_RECEIPT_REVIEW_V1",
    );
    assert.equal(greenReview.accepted, true);
    assert.equal(greenReview.receipt_status, "green");
    assert.equal(greenReview.gate, "passed");
    assert.equal(greenReview.summary.checks_failed, 0);
    assert.equal(greenReview.safety.network_requests_performed, false);
    assert.equal(greenReview.safety.mutation_attempted, false);
    assert.equal(fs.statSync(greenOutput).mode & 0o777, 0o600);

    const holdInput = path.join(temp, "hold-receipt.json");
    const holdOutput = path.join(temp, "hold-review.json");
    fs.writeFileSync(holdInput, `${JSON.stringify(receipt("hold"), null, 2)}\n`);

    const hold = run(holdInput, holdOutput);
    assert.equal(hold.status, 0, hold.stderr || hold.stdout);
    const holdReview = load(holdOutput);
    assert.equal(holdReview.accepted, true);
    assert.equal(holdReview.receipt_status, "hold");
    assert.equal(holdReview.gate, "passed");

    const strictOutput = path.join(temp, "strict-review.json");
    const strict = run(holdInput, strictOutput, ["--require-green"]);
    assert.equal(strict.status, 2, strict.stderr || strict.stdout);
    const strictReview = load(strictOutput);
    assert.equal(strictReview.accepted, true);
    assert.equal(strictReview.receipt_status, "hold");
    assert.equal(strictReview.gate, "hold");

    const tamperedReceipt = receipt("green");
    tamperedReceipt.safety.mutation_attempted = true;
    const tamperedInput = path.join(temp, "tampered-receipt.json");
    const tamperedOutput = path.join(temp, "tampered-review.json");
    fs.writeFileSync(
      tamperedInput,
      `${JSON.stringify(tamperedReceipt, null, 2)}\n`,
    );

    const tampered = run(tamperedInput, tamperedOutput);
    assert.equal(tampered.status, 3, tampered.stderr || tampered.stdout);
    const tamperedReview = load(tamperedOutput);
    assert.equal(tamperedReview.accepted, false);
    assert.equal(tamperedReview.gate, "rejected");
    assert(
      tamperedReview.summary.failed_check_ids.includes("safety_boundary"),
    );

    const inconsistentReceipt = receipt("green");
    inconsistentReceipt.summary.checks_green = 8;
    const inconsistentInput = path.join(temp, "inconsistent-receipt.json");
    const inconsistentOutput = path.join(temp, "inconsistent-review.json");
    fs.writeFileSync(
      inconsistentInput,
      `${JSON.stringify(inconsistentReceipt, null, 2)}\n`,
    );

    const inconsistent = run(inconsistentInput, inconsistentOutput);
    assert.equal(inconsistent.status, 3, inconsistent.stderr || inconsistent.stdout);
    const inconsistentReview = load(inconsistentOutput);
    assert.equal(inconsistentReview.accepted, false);
    assert(
      inconsistentReview.summary.failed_check_ids.includes(
        "summary_consistency",
      ),
    );


    const invalidInput = path.join(temp, "invalid-receipt.json");
    const invalidOutput = path.join(temp, "invalid-review.json");
    fs.writeFileSync(invalidInput, "{not-json\n");

    const invalid = run(invalidInput, invalidOutput);
    assert.equal(invalid.status, 3, invalid.stderr || invalid.stdout);
    const invalidReview = load(invalidOutput);
    assert.equal(invalidReview.accepted, false);
    assert.equal(invalidReview.gate, "rejected");
    assert.equal(invalidReview.receipt_sha256, null);
    assert.deepEqual(invalidReview.summary.failed_check_ids, ["receipt_load"]);

    console.log(PROOF_MARKER);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

main();
