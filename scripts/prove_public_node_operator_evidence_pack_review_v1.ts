import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TOOL = path.resolve(
  "tools/public-node-operator-evidence-pack-review-v1.mjs",
);
const DOC = path.resolve(
  "docs/public-node/public-node-operator-evidence-pack-review-v1.md",
);
const SELF_CHECK = path.resolve(
  "tools/public-node-operator-self-check-v1.mjs",
);
const RECEIPT_REVIEW = path.resolve(
  "tools/public-node-operator-self-check-receipt-review-v1.mjs",
);
const PROOF_MARKER =
  "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_REVIEW_V1_PROOF_GREEN";

const FILES = {
  receipt: "operator-self-check-v1.json",
  review: "operator-self-check-receipt-review-v1.json",
  manifest: "operator-evidence-pack-v1.json",
  checksums: "SHA256SUMS.txt",
};

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

function sha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function writePrivate(file: string, value: unknown): void {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
  fs.chmodSync(file, 0o600);
}

function record(file: string, name: string) {
  const stat = fs.statSync(file);
  return {
    name,
    sha256: sha256(file),
    bytes: stat.size,
    mode: (stat.mode & 0o777).toString(8).padStart(3, "0"),
  };
}

function load(file: string) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function createPack(root: string, status: "green" | "hold", allowHold: boolean) {
  fs.mkdirSync(root, { mode: 0o700 });
  fs.chmodSync(root, 0o700);

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

  const receipt = {
    marker: "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1",
    network: "Mainnet-0",
    read_only: true,
    observed_at: "2026-07-19T21:41:35.000Z",
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
      node_id: "fixture-node-evidence-pack-review-v1",
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

  const receiptPath = path.join(root, FILES.receipt);
  writePrivate(receiptPath, receipt);

  const reviewPath = path.join(root, FILES.review);
  const reviewArgs = [
    RECEIPT_REVIEW,
    "--receipt",
    receiptPath,
    "--output",
    reviewPath,
    "--reviewed-at",
    "2026-07-19T21:41:36.000Z",
  ];
  if (!allowHold) reviewArgs.push("--require-green");
  const reviewRun = spawnSync(process.execPath, reviewArgs, { encoding: "utf8" });
  const expectedReviewExit = status === "green" || allowHold ? 0 : 2;
  assert.equal(
    reviewRun.status,
    expectedReviewExit,
    reviewRun.stderr || reviewRun.stdout,
  );
  const review = load(reviewPath);
  assert.equal(review.accepted, true, "fixture receipt must pass canonical reviewer");
  assert.equal(review.receipt_status, status);

  const receiptRecord = record(receiptPath, FILES.receipt);
  const reviewRecord = record(reviewPath, FILES.review);

  const manifest = {
    marker: "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_V1",
    network: "Mainnet-0",
    created_at: review.reviewed_at,
    read_only: true,
    status,
    gate:
      status === "green"
        ? "passed"
        : allowHold
          ? "passed_with_hold"
          : "hold",
    allow_hold: allowHold,
    artifacts: {
      receipt: receiptRecord,
      review: reviewRecord,
      checksums: {
        name: FILES.checksums,
        algorithm: "sha256",
        includes_manifest: true,
      },
    },
    bindings: {
      review_receipt_sha256_matches: true,
      receipt_status_matches_review: true,
      expected_peer_count: 2,
    },
    source_contracts: {
      self_check: {
        name: "public-node-operator-self-check-v1.mjs",
        sha256: sha256(SELF_CHECK),
      },
      receipt_review: {
        name: "public-node-operator-self-check-receipt-review-v1.mjs",
        sha256: sha256(RECEIPT_REVIEW),
      },
    },
    execution: {
      self_check_exit_code: status === "green" ? 0 : 2,
      review_exit_code: expectedReviewExit,
    },
    safety: {
      raw_target_included: false,
      raw_output_path_included: false,
      credentials_included: false,
      mutation_attempted: false,
      registration_attempted: false,
      validator_activation_attempted: false,
      ledger_write_attempted: false,
      peer_state_write_attempted: false,
      ticket_claim_attempted: false,
      buy_void_fulfillment_attempted: false,
    },
  };

  const manifestPath = path.join(root, FILES.manifest);
  writePrivate(manifestPath, manifest);
  const manifestRecord = record(manifestPath, FILES.manifest);

  const lines = [receiptRecord, reviewRecord, manifestRecord]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => `${entry.sha256}  ${entry.name}`)
    .join("\n");
  fs.writeFileSync(path.join(root, FILES.checksums), `${lines}\n`, {
    mode: 0o600,
  });
  fs.chmodSync(path.join(root, FILES.checksums), 0o600);
}

function run(
  packDir: string,
  output: string,
  extra: string[] = [],
): ReturnType<typeof spawnSync> {
  return spawnSync(
    process.execPath,
    [
      TOOL,
      "--pack-dir",
      packDir,
      "--output",
      output,
      "--reviewed-at",
      "2026-07-19T22:00:00Z",
      ...extra,
    ],
    { encoding: "utf8" },
  );
}

function copyPack(source: string, destination: string): void {
  fs.cpSync(source, destination, { recursive: true });
  fs.chmodSync(destination, 0o700);
  for (const name of Object.values(FILES)) {
    fs.chmodSync(path.join(destination, name), 0o600);
  }
}

function rewriteChecksums(packDir: string): void {
  const names = [FILES.manifest, FILES.receipt, FILES.review].sort();
  const lines = names.map(
    (name) => `${sha256(path.join(packDir, name))}  ${name}`,
  );
  fs.writeFileSync(
    path.join(packDir, FILES.checksums),
    `${lines.join("\n")}\n`,
    { mode: 0o600 },
  );
  fs.chmodSync(path.join(packDir, FILES.checksums), 0o600);
}

function rebindManifestArtifacts(packDir: string): void {
  const manifestPath = path.join(packDir, FILES.manifest);
  const manifest = load(manifestPath);
  manifest.artifacts.receipt = record(
    path.join(packDir, FILES.receipt),
    FILES.receipt,
  );
  manifest.artifacts.review = record(
    path.join(packDir, FILES.review),
    FILES.review,
  );
  writePrivate(manifestPath, manifest);
  rewriteChecksums(packDir);
}

function main(): void {
  assert(fs.existsSync(TOOL), "review tool missing");
  assert(fs.existsSync(DOC), "review documentation missing");

  const source = fs.readFileSync(TOOL, "utf8");
  const doc = fs.readFileSync(DOC, "utf8");
  assert(source.includes("VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_REVIEW_V1"));
  assert(source.includes("canonical_receipt_review_replay"));
  assert(!source.includes('from "node:http"'));
  assert(!source.includes('from "node:https"'));
  assert(!source.includes("fetch("));
  assert(doc.includes("offline"));
  assert(doc.includes("exact four-artifact set"));
  assert(doc.includes("exit code `3`"));

  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-evidence-pack-review-proof-"),
  );

  try {
    const greenPack = path.join(temp, "green-pack");
    createPack(greenPack, "green", false);
    const greenOutput = path.join(temp, "green-review.json");
    const green = run(greenPack, greenOutput, ["--require-green"]);
    assert.equal(green.status, 0, green.stderr || green.stdout);
    const greenReview = load(greenOutput);
    assert.equal(
      greenReview.marker,
      "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_REVIEW_V1",
    );
    assert.equal(greenReview.accepted, true);
    assert.equal(greenReview.pack_status, "green");
    assert.equal(greenReview.gate, "passed");
    assert.equal(greenReview.summary.checks_failed, 0);
    assert.equal(greenReview.safety.network_requests_performed, false);
    assert.equal(greenReview.safety.mutation_attempted, false);
    assert.equal(fs.statSync(greenOutput).mode & 0o777, 0o600);

    const holdPack = path.join(temp, "hold-pack");
    createPack(holdPack, "hold", false);
    const holdOutput = path.join(temp, "hold-review.json");
    const hold = run(holdPack, holdOutput);
    assert.equal(hold.status, 0, hold.stderr || hold.stdout);
    assert.equal(load(holdOutput).pack_status, "hold");

    const strictOutput = path.join(temp, "strict-review.json");
    const strict = run(holdPack, strictOutput, ["--require-green"]);
    assert.equal(strict.status, 2, strict.stderr || strict.stdout);
    assert.equal(load(strictOutput).gate, "hold");

    const checksumPack = path.join(temp, "checksum-tamper-pack");
    copyPack(greenPack, checksumPack);
    fs.appendFileSync(path.join(checksumPack, FILES.receipt), " ");
    const checksumOutput = path.join(temp, "checksum-tamper-review.json");
    const checksumTamper = run(checksumPack, checksumOutput);
    assert.equal(checksumTamper.status, 3);
    assert(
      load(checksumOutput).summary.failed_check_ids.includes(
        "checksum_binding",
      ),
    );

    const sourcePack = path.join(temp, "source-tamper-pack");
    copyPack(greenPack, sourcePack);
    const sourceManifestPath = path.join(sourcePack, FILES.manifest);
    const sourceManifest = load(sourceManifestPath);
    sourceManifest.source_contracts.self_check.sha256 = "0".repeat(64);
    writePrivate(sourceManifestPath, sourceManifest);
    rewriteChecksums(sourcePack);
    const sourceOutput = path.join(temp, "source-tamper-review.json");
    const sourceTamper = run(sourcePack, sourceOutput);
    assert.equal(sourceTamper.status, 3);
    assert(
      load(sourceOutput).summary.failed_check_ids.includes(
        "source_contract_binding",
      ),
    );

    const extraPack = path.join(temp, "extra-artifact-pack");
    copyPack(greenPack, extraPack);
    fs.writeFileSync(path.join(extraPack, "extra.txt"), "unexpected\n", {
      mode: 0o600,
    });
    const extraOutput = path.join(temp, "extra-artifact-review.json");
    const extra = run(extraPack, extraOutput);
    assert.equal(extra.status, 3);
    assert(
      load(extraOutput).summary.failed_check_ids.includes("artifact_set"),
    );

    const permissionPack = path.join(temp, "permission-pack");
    copyPack(greenPack, permissionPack);
    fs.chmodSync(path.join(permissionPack, FILES.review), 0o644);
    const permissionOutput = path.join(temp, "permission-review.json");
    const permission = run(permissionPack, permissionOutput);
    assert.equal(permission.status, 3);
    assert(
      load(permissionOutput).summary.failed_check_ids.includes("permissions"),
    );

    const forgedPack = path.join(temp, "forged-semantic-review-pack");
    copyPack(greenPack, forgedPack);
    const forgedReceiptPath = path.join(forgedPack, FILES.receipt);
    const forgedReceipt = load(forgedReceiptPath);
    forgedReceipt.safety.wallet_connection_attempted = true;
    writePrivate(forgedReceiptPath, forgedReceipt);

    const forgedReviewPath = path.join(forgedPack, FILES.review);
    const forgedReview = load(forgedReviewPath);
    forgedReview.receipt_sha256 = sha256(forgedReceiptPath);
    writePrivate(forgedReviewPath, forgedReview);
    rebindManifestArtifacts(forgedPack);

    const forgedOutput = path.join(temp, "forged-semantic-review.json");
    const forged = run(forgedPack, forgedOutput);
    assert.equal(forged.status, 3, forged.stderr || forged.stdout);
    const forgedResult = load(forgedOutput);
    assert(
      forgedResult.summary.failed_check_ids.includes(
        "canonical_receipt_review_replay",
      ),
      "forged self-attested review must fail canonical semantic replay",
    );

    console.log("canonical_receipt_review_replayed=true");
    console.log("forged_self_attested_review_rejected=true");
    console.log(PROOF_MARKER);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

main();
