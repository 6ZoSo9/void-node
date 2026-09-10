// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

import assert from "node:assert/strict";

import {
  VOID_DATANET_STATE_DERIVED_H1_V1,
  classifyDatanetH1StateV1,
  deriveDatanetObjectQuotaKeyV1,
} from "../src/storage/datanet_state_derived_h1_v1.js";

const H = "11".repeat(32);
const GENESIS = "00".repeat(31) + "01";
const ROOT = "dev=259:ino=424242";
const K = deriveDatanetObjectQuotaKeyV1({
  chain_id: 2050n,
  genesis_hash: GENESIS,
  commitment_type: 1n,
  payload_sha256: H,
});

assert.equal(K, "6104826324f0eabbe2f9b41ad53844e0028670eca202a92f494b384b8ed0063e");

const validS0 = { status: "valid", dev: "259", ino: "1001", bytes: 67_108_864, sha256: H } as const;
const validS1 = { status: "valid", dev: "259", ino: "1002", bytes: 67_108_864, sha256: H } as const;

function observation(overrides: Record<string, unknown> = {}) {
  return {
    v: 1,
    root_identity: ROOT,
    quota_key: K,
    expected_sha256: H,
    expected_bytes: 67_108_864,
    mutation_custody_retired: true,
    extra_leaf_count: 0,
    s0: validS0,
    s1: { status: "missing" },
    ...overrides,
  };
}

let cases = 0;
function check(name: string, body: () => void): void {
  body();
  cases += 1;
  process.stdout.write(`ok ${cases} - ${name}\n`);
}

check("ordinary E0 S0-only state authorizes H1", () => {
  const result = classifyDatanetH1StateV1(observation());
  assert.equal(result.format, VOID_DATANET_STATE_DERIVED_H1_V1);
  assert.equal(result.decision, "AUTHORIZE_H1");
  assert.equal(result.reason, "S0_ONLY_VERIFIED");
  assert.equal(Object.isFrozen(result), true);
});

check("recovery R0 byte-identical S0-only state gives the same result", () => {
  const ordinary = classifyDatanetH1StateV1(observation());
  const recovery = classifyDatanetH1StateV1(JSON.parse(JSON.stringify(observation())));
  assert.deepEqual(recovery, ordinary);
});

check("full S0+S1 state denies another H1", () => {
  const result = classifyDatanetH1StateV1(observation({ s1: validS1 }));
  assert.equal(result.decision, "DENY_H1");
  assert.equal(result.reason, "S0_S1_VERIFIED_CAP_REACHED");
});

check("S0/S1 inode alias fails closed", () => {
  const result = classifyDatanetH1StateV1(observation({
    s1: { ...validS1, ino: validS0.ino },
  }));
  assert.deepEqual([result.decision, result.reason], ["HOLD", "SLOT_ALIAS"]);
});

check("active mutation custody fails closed", () => {
  const result = classifyDatanetH1StateV1(observation({ mutation_custody_retired: false }));
  assert.deepEqual([result.decision, result.reason], ["HOLD", "MUTATION_CUSTODY_ACTIVE"]);
});

check("extra third leaf fails closed", () => {
  const result = classifyDatanetH1StateV1(observation({ extra_leaf_count: 1 }));
  assert.deepEqual([result.decision, result.reason], ["HOLD", "EXTRA_LEAF_PRESENT"]);
});

check("missing S0 fails closed", () => {
  const result = classifyDatanetH1StateV1(observation({ s0: { status: "missing" } }));
  assert.deepEqual([result.decision, result.reason], ["HOLD", "S0_MISSING"]);
});

check("invalid S0 fails closed", () => {
  const result = classifyDatanetH1StateV1(observation({ s0: { status: "invalid", detail: "torn" } }));
  assert.deepEqual([result.decision, result.reason], ["HOLD", "S0_INVALID"]);
});

check("foreign S0 fails closed", () => {
  const result = classifyDatanetH1StateV1(observation({ s0: { status: "foreign", detail: "wrong-owner" } }));
  assert.deepEqual([result.decision, result.reason], ["HOLD", "S0_FOREIGN"]);
});

check("invalid S1 fails closed", () => {
  const result = classifyDatanetH1StateV1(observation({ s1: { status: "invalid", detail: "torn" } }));
  assert.deepEqual([result.decision, result.reason], ["HOLD", "S1_INVALID"]);
});

check("foreign S1 fails closed", () => {
  const result = classifyDatanetH1StateV1(observation({ s1: { status: "foreign", detail: "occupied" } }));
  assert.deepEqual([result.decision, result.reason], ["HOLD", "S1_FOREIGN"]);
});

check("S0 hash mismatch cannot masquerade as valid", () => {
  const result = classifyDatanetH1StateV1(observation({
    s0: { ...validS0, sha256: "22".repeat(32) },
  }));
  assert.deepEqual([result.decision, result.reason], ["HOLD", "SLOT_BINDING_MISMATCH"]);
});

check("S0 byte-length mismatch cannot masquerade as valid", () => {
  const result = classifyDatanetH1StateV1(observation({
    s0: { ...validS0, bytes: validS0.bytes - 1 },
  }));
  assert.deepEqual([result.decision, result.reason], ["HOLD", "SLOT_BINDING_MISMATCH"]);
});

check("S1 hash mismatch fails closed rather than consuming another slot", () => {
  const result = classifyDatanetH1StateV1(observation({
    s1: { ...validS1, sha256: "22".repeat(32) },
  }));
  assert.deepEqual([result.decision, result.reason], ["HOLD", "SLOT_BINDING_MISMATCH"]);
});

check("schedule/history labels are not admitted reducer inputs", () => {
  assert.throws(
    () => classifyDatanetH1StateV1({ ...observation(), schedule_label: "R0" }),
    /OBSERVATION_KEYS_INVALID/,
  );
});

check("campaign and receipt metadata cannot enter slot evidence", () => {
  assert.throws(
    () => classifyDatanetH1StateV1(observation({
      s0: { ...validS0, campaign_id: "campaign-2" },
    })),
    /SLOT_KEYS_INVALID/,
  );
});

check("quota key is lowercase fixed-width canonical hex", () => {
  assert.throws(
    () => classifyDatanetH1StateV1(observation({ quota_key: K.toUpperCase() })),
    /QUOTA_KEY_INVALID/,
  );
});

check("K changes when a canonical commitment field changes", () => {
  const changed = deriveDatanetObjectQuotaKeyV1({
    chain_id: 2050n,
    genesis_hash: GENESIS,
    commitment_type: 1n,
    payload_sha256: "12".repeat(32),
  });
  assert.notEqual(changed, K);
});

check("K rejects values outside u64/u16 domains", () => {
  assert.throws(() => deriveDatanetObjectQuotaKeyV1({
    chain_id: 1n << 64n,
    genesis_hash: GENESIS,
    commitment_type: 1n,
    payload_sha256: H,
  }), /CHAIN_ID_INVALID/);
  assert.throws(() => deriveDatanetObjectQuotaKeyV1({
    chain_id: 2050n,
    genesis_hash: GENESIS,
    commitment_type: 1n << 16n,
    payload_sha256: H,
  }), /COMMITMENT_TYPE_INVALID/);
});

assert.equal(cases, 19);
process.stdout.write(`VOID_DATANET_STATE_DERIVED_H1_V1_GREEN cases=${cases} quota_key=${K}\n`);
