// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import { strict as assert } from "node:assert";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  VOID_DATANET_PAYLOAD_BYTES_V1,
  VOID_DATANET_PAYLOAD_READ_BYTES_V1,
  acquireDataNetAdmissionCapabilityV1,
  bindDataNetRootIdentityV1,
  classifyDataNetStateDerivedH1V1,
  deriveDataNetAdmissionCapabilityAddressDigestV1,
  deriveDataNetObjectQuotaKeyV1,
  reduceDataNetStateDerivedH1V1,
  type DataNetQuotaTupleV1,
} from "../src/storage/datanet_state_derived_h1_v1.js";

const MARKER = "VOID_DATANET_STATE_DERIVED_H1_V1_GREEN";
const ZERO_64_MIB_SHA256 = "3b6a07d0d404fab4e23b6d34bc6696a6a312dd92821332385e5af7c01c421351";
const SYNTHETIC_K = "e8fe4eb2e7737670f8ed82fbed8edd5643369ad0ddea72c9e6377bd53228f1a1";

function hashZeroPayload(): string {
  const block = Buffer.alloc(VOID_DATANET_PAYLOAD_READ_BYTES_V1);
  const hash = crypto.createHash("sha256");
  for (let offset = 0; offset < VOID_DATANET_PAYLOAD_BYTES_V1; offset += block.length) {
    hash.update(block);
  }
  return hash.digest("hex");
}

function writeExactPayload(filePath: string): void {
  const block = Buffer.alloc(VOID_DATANET_PAYLOAD_READ_BYTES_V1);
  let fd = -1;
  try {
    fd = fs.openSync(filePath, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL, 0o600);
    for (let offset = 0; offset < VOID_DATANET_PAYLOAD_BYTES_V1; offset += block.length) {
      const completed = fs.writeSync(fd, block, 0, block.length, offset);
      assert.equal(completed, block.length, `short fixture write at ${offset}`);
    }
    fs.fchmodSync(fd, 0o600);
    fs.fsyncSync(fd);
  } finally {
    if (fd >= 0) fs.closeSync(fd);
  }
}

function fsyncDirectory(directory: string): void {
  const fd = fs.openSync(directory, fs.constants.O_RDONLY | ((fs.constants as any).O_DIRECTORY || 0));
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}

async function expectBusy<T>(promise: Promise<T>): Promise<void> {
  let observed = "";
  try {
    await promise;
  } catch (error: any) {
    observed = String(error?.message || error);
  }
  assert.match(observed, /VOID_DATANET_STATE_DERIVED_H1_V1:CAPABILITY_BUSY:/);
}

async function main(): Promise<void> {
  assert.equal(process.platform, "linux", "V25 capability proof is Linux-only");

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "void-datanet-v25-"));
  fs.chmodSync(root, 0o700);
  try {
    const payloadSha256 = hashZeroPayload();
    assert.equal(payloadSha256, ZERO_64_MIB_SHA256, "independent 64 MiB zero-payload vector changed");
    const tuple: DataNetQuotaTupleV1 = {
      chainId: 2050n,
      genesisHash: "42".repeat(32),
      commitmentType: 1,
      payloadSha256,
    };
    const rootIdentity = bindDataNetRootIdentityV1(root);
    const key = deriveDataNetObjectQuotaKeyV1(tuple);
    const capabilityDigest = deriveDataNetAdmissionCapabilityAddressDigestV1(rootIdentity, key);

    assert.equal(key, SYNTHETIC_K, "canonical V22 K derivation changed");
    assert.match(capabilityDigest, /^[0-9a-f]{64}$/);
    assert.equal(deriveDataNetObjectQuotaKeyV1({ ...tuple }), key);
    assert.notEqual(
      deriveDataNetObjectQuotaKeyV1({ ...tuple, commitmentType: 2 }),
      key,
      "commitment type must participate in K",
    );
    assert.notEqual(
      deriveDataNetObjectQuotaKeyV1({ ...tuple, chainId: 2051n }),
      key,
      "chain id must participate in K",
    );

    assert.deepEqual(
      reduceDataNetStateDerivedH1V1({ s0: "valid", s1: "missing", extraLeafCount: 0 }),
      { decision: "AUTHORIZE_H1", reason: "CANONICAL_S0_ONLY" },
    );
    assert.deepEqual(
      reduceDataNetStateDerivedH1V1({ s0: "valid", s1: "valid", extraLeafCount: 0 }),
      { decision: "DENY_H1", reason: "CANONICAL_S0_S1_FULL" },
    );
    assert.equal(
      reduceDataNetStateDerivedH1V1({ s0: "missing", s1: "missing", extraLeafCount: 0 }).decision,
      "HOLD",
    );
    assert.equal(
      reduceDataNetStateDerivedH1V1({ s0: "valid", s1: "invalid", extraLeafCount: 0 }).decision,
      "HOLD",
    );
    assert.equal(
      reduceDataNetStateDerivedH1V1({ s0: "valid", s1: "missing", extraLeafCount: 1 }).decision,
      "HOLD",
    );

    // Model the H0 publisher generation. It owns the capability while S0 is
    // created, then fully releases it before either E0 or R0 classification.
    const h0Publisher = await acquireDataNetAdmissionCapabilityV1(root, rootIdentity, tuple);
    assert.equal(h0Publisher.key, key);
    assert.equal(h0Publisher.addressDigest, capabilityDigest);
    assert.deepEqual(fs.readdirSync(root), [], "capability acquisition must not mutate the store namespace");
    await expectBusy(acquireDataNetAdmissionCapabilityV1(root, rootIdentity, tuple));
    assert.deepEqual(fs.readdirSync(root), [], "losing capability acquisition must not mutate the store namespace");

    const empty = classifyDataNetStateDerivedH1V1(h0Publisher);
    assert.equal(empty.decision, "HOLD");
    assert.equal(empty.reason, "S0_REQUIRED");
    assert.deepEqual(empty.ledger, { calls: 0, requested: 0, completed: 0 });

    writeExactPayload(path.join(root, "S0"));
    fsyncDirectory(root);
    await h0Publisher.release();

    // E0: ordinary H0 completion has no surviving publisher capability.
    // A new classifier capability must derive authorization only from S0.
    const e0Classifier = await acquireDataNetAdmissionCapabilityV1(root, rootIdentity, tuple);
    const e0 = classifyDataNetStateDerivedH1V1(e0Classifier);
    assert.equal(e0.decision, "AUTHORIZE_H1");
    assert.equal(e0.reason, "CANONICAL_S0_ONLY");
    assert.equal(e0.s0.state, "valid");
    assert.equal(e0.s1.state, "missing");
    assert.deepEqual(e0.ledger, {
      calls: 1025,
      requested: 67_108_865,
      completed: 67_108_864,
    });
    await e0Classifier.release();

    // R0: a separately acquired capability sees byte-identical S0-only state.
    // No schedule label, prior terminal, or process-history value is an input.
    const recovered = await acquireDataNetAdmissionCapabilityV1(root, rootIdentity, tuple);
    const r0 = classifyDataNetStateDerivedH1V1(recovered);
    assert.equal(r0.decision, "AUTHORIZE_H1");
    assert.equal(r0.reason, e0.reason);
    assert.equal(r0.key, e0.key);
    assert.equal(r0.payloadSha256, e0.payloadSha256);
    assert.deepEqual(r0.rootIdentity, e0.rootIdentity);
    assert.deepEqual(r0.s0.identity, e0.s0.identity);
    assert.deepEqual(r0.ledger, e0.ledger);

    // The fixture creates S1 only to exercise post-H1 classification. The V25
    // source lane intentionally does not yet claim an H1 publication primitive.
    writeExactPayload(path.join(root, "S1"));
    fsyncDirectory(root);
    const full = classifyDataNetStateDerivedH1V1(recovered);
    assert.equal(full.decision, "DENY_H1");
    assert.equal(full.reason, "CANONICAL_S0_S1_FULL");
    assert.equal(full.s0.state, "valid");
    assert.equal(full.s1.state, "valid");
    assert.deepEqual(full.ledger, {
      calls: 2050,
      requested: 134_217_730,
      completed: 134_217_728,
    });

    fs.writeFileSync(path.join(root, "S2"), "foreign", { flag: "wx", mode: 0o600 });
    fsyncDirectory(root);
    const overCap = classifyDataNetStateDerivedH1V1(recovered);
    assert.equal(overCap.decision, "HOLD");
    assert.equal(overCap.reason, "EXTRA_LEAF");
    assert.deepEqual(overCap.ledger, { calls: 0, requested: 0, completed: 0 });
    assert.equal(fs.readFileSync(path.join(root, "S2"), "utf8"), "foreign");
    await recovered.release();

    fs.unlinkSync(path.join(root, "S2"));
    const reacquired = await acquireDataNetAdmissionCapabilityV1(root, rootIdentity, tuple);
    assert.equal(reacquired.addressDigest, capabilityDigest, "released capability must be reacquirable at the same binding");
    const stillFull = classifyDataNetStateDerivedH1V1(reacquired);
    assert.equal(stillFull.decision, "DENY_H1");
    await reacquired.release();

    console.log(JSON.stringify({
      marker: MARKER,
      source_contract: "state-derived classifier + root/K abstract-AF_UNIX admission capability",
      chain_id: tuple.chainId.toString(),
      key,
      payload_sha256: payloadSha256,
      independent_k_vector: true,
      root_identity_stable: true,
      capability_exclusive: true,
      capability_reacquired_after_release: true,
      capability_namespace_mutations: 0,
      h0_capability_released_before_e0: true,
      e0_classifier_capability_generation_new: true,
      r0_capability_generation_new: true,
      e0_decision: e0.decision,
      r0_decision: r0.decision,
      paired_history_independent: e0.decision === r0.decision && e0.reason === r0.reason,
      full_decision: full.decision,
      over_cap_decision: overCap.decision,
      s2_preserved: true,
      e0_classification_ledger: e0.ledger,
      r0_classification_ledger: r0.ledger,
      full_classification_ledger: full.ledger,
      h1_publication_implemented: false,
      fresh_process_boundary_proved: false,
      production_runtime_touched: false,
      chain_authority_claimed: false,
      cold_storage_acceptance_claimed: false,
    }));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
