import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TOOL = path.resolve(
  "ops/public/operator-onboarding-v1/void-public-node-operator-evidence-attest-v1.py",
);
const DOC = path.resolve(
  "docs/public-node/public-node-operator-evidence-attestation-v1.md",
);
const SELF_CHECK = path.resolve(
  "tools/public-node-operator-self-check-v1.mjs",
);
const RECEIPT_REVIEW = path.resolve(
  "tools/public-node-operator-self-check-receipt-review-v1.mjs",
);
const PROOF_MARKER =
  "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_ATTESTATION_V1_PROOF_GREEN";

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

function createGreenPack(root: string): void {
  fs.mkdirSync(root, { mode: 0o700 });
  fs.chmodSync(root, 0o700);

  const checks = CHECK_IDS.map((id) => ({
    id,
    path: id === "health" ? "/health" : `/${id}`,
    ok: true,
    reason: null,
    observed: { fixture: true },
  }));

  const receipt = {
    marker: "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_V1",
    network: "Mainnet-0",
    read_only: true,
    observed_at: "2026-07-20T01:00:00.000Z",
    target: {
      scheme: "http",
      host_class: "loopback",
      port: 4101,
      raw_target_included: false,
    },
    summary: {
      status: "green",
      checks_total: checks.length,
      checks_green: checks.length,
      checks_failed: 0,
      failed_check_ids: [],
    },
    runtime: {
      node_id: "fixture-node-evidence-attestation-v1",
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

  const review = {
    marker: "VOID_PUBLIC_NODE_OPERATOR_SELF_CHECK_RECEIPT_REVIEW_V1",
    network: "Mainnet-0",
    reviewed_at: "2026-07-20T01:00:01.000Z",
    offline: true,
    receipt_sha256: sha256(receiptPath),
    accepted: true,
    receipt_status: "green",
    gate: "passed",
    require_green: true,
    summary: {
      checks_total: 13,
      checks_green: 13,
      checks_failed: 0,
      failed_check_ids: [],
    },
    checks: [],
    safety: {
      network_requests_performed: false,
      mutation_attempted: false,
      receipt_modified: false,
      raw_receipt_path_included: false,
      raw_receipt_body_included: false,
    },
  };

  const reviewPath = path.join(root, FILES.review);
  writePrivate(reviewPath, review);

  const receiptRecord = record(receiptPath, FILES.receipt);
  const reviewRecord = record(reviewPath, FILES.review);

  const manifest = {
    marker: "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_PACK_V1",
    network: "Mainnet-0",
    created_at: review.reviewed_at,
    read_only: true,
    status: "green",
    gate: "passed",
    allow_hold: false,
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
      self_check_exit_code: 0,
      review_exit_code: 0,
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
    .map((entry) => `${entry.sha256}  ${entry.name}`);

  fs.writeFileSync(
    path.join(root, FILES.checksums),
    `${lines.join("\n")}\n`,
    { mode: 0o600 },
  );
  fs.chmodSync(path.join(root, FILES.checksums), 0o600);
}

function run(args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync("python3", [TOOL, ...args], { encoding: "utf8" });
}

function loadStdout(result: ReturnType<typeof spawnSync>) {
  return JSON.parse(result.stdout);
}

function main(): void {
  assert(fs.existsSync(TOOL), "attestation tool missing");
  assert(fs.existsSync(DOC), "attestation documentation missing");

  const source = fs.readFileSync(TOOL, "utf8");
  const doc = fs.readFileSync(DOC, "utf8");

  assert(source.includes("void-public-node-evidence-attestation-v1"));
  assert(source.includes("VOID-PUBLIC-NODE-EVIDENCE-ATTESTATION-V1"));
  assert(!source.includes('NAMESPACE = "void-public-node-manifest-v1"'));
  assert(doc.includes("separate signature domain"));
  assert(doc.includes("private key"));

  const temp = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-evidence-attestation-proof-"),
  );

  try {
    const pack = path.join(temp, "pack");
    createGreenPack(pack);

    const key = path.join(temp, "operator.ed25519");
    const keygen = spawnSync(
      "ssh-keygen",
      ["-q", "-t", "ed25519", "-N", "", "-f", key],
      { encoding: "utf8" },
    );
    assert.equal(keygen.status, 0, keygen.stderr);
    fs.chmodSync(key, 0o600);

    const outputDir = path.join(temp, "out");
    const created = run([
      "create",
      "--pack-dir",
      pack,
      "--operator-id",
      "fixture-operator",
      "--node-key",
      "fixture-node",
      "--private-key",
      key,
      "--output-dir",
      outputDir,
    ]);
    assert.equal(created.status, 0, created.stderr || created.stdout);

    const createResult = loadStdout(created);
    assert.equal(
      createResult.marker,
      "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_ATTESTATION_SUBMISSION_V1",
    );
    assert.equal(createResult.private_key_in_bundle, false);
    assert.equal(createResult.evidence_pack_in_bundle, false);
    assert.equal(
      createResult.namespace,
      "void-public-node-evidence-attestation-v1",
    );

    const bundle = createResult.bundle;
    assert(fs.existsSync(bundle));
    assert.equal(fs.statSync(bundle).mode & 0o777, 0o600);

    const reviewOutput = path.join(temp, "attestation-review.json");
    const verified = run([
      "verify",
      "--bundle",
      bundle,
      "--pack-dir",
      pack,
      "--output",
      reviewOutput,
    ]);
    assert.equal(verified.status, 0, verified.stderr || verified.stdout);

    const review = JSON.parse(fs.readFileSync(reviewOutput, "utf8"));
    assert.equal(
      review.marker,
      "VOID_PUBLIC_NODE_OPERATOR_EVIDENCE_ATTESTATION_REVIEW_V1",
    );
    assert.equal(review.status, "passed");
    assert.equal(review.checks.signature_valid, true);
    assert.equal(review.checks.pack_hash_binding, true);
    assert.equal(review.checks.separate_signature_domain, true);
    assert.equal(review.decision_boundary.mutation_authority, false);
    assert.equal(fs.statSync(reviewOutput).mode & 0o777, 0o600);

    const tamperedPack = path.join(temp, "tampered-pack");
    fs.cpSync(pack, tamperedPack, { recursive: true });
    fs.chmodSync(tamperedPack, 0o700);
    for (const name of Object.values(FILES)) {
      fs.chmodSync(path.join(tamperedPack, name), 0o600);
    }
    fs.appendFileSync(path.join(tamperedPack, FILES.receipt), " ");

    const tampered = run([
      "verify",
      "--bundle",
      bundle,
      "--pack-dir",
      tamperedPack,
    ]);
    assert.equal(tampered.status, 2);
    const tamperedReview = loadStdout(tampered);
    assert.equal(tamperedReview.status, "failed");
    assert(tamperedReview.failures.length > 0);

    console.log(PROOF_MARKER);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

main();
