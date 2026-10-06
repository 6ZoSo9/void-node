#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_AUTHORITY_V1,
  classifyBuyVoidAllocationCustodyWitnessIdentityContinuityV1,
} from "../src/economic/buy_void_allocation_custody_witness_identity_continuity_v1.js";

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJson(record[key]),
        )
        .join(",") +
      "}"
    );
  }
  throw new Error("noncanonical_test_value");
}

function sha256Id(value: string | Buffer): string {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

const genesisBody = {
  allocation_tip_sha256: "sha256:" + "0".repeat(64),
  custody_uuid: "c61906ed-0b7e-441b-a44a-a97730198a18",
  deployment_head: "63082114b957e4b1ba58348b17e144e954452c1f",
  high_water_bytes: 430,
  high_water_sha256:
    "sha256:121741f865301c62cf2ecd967e286de4bd2e2bdc31404dfbdf11f97c26fca13d",
  ledger_bytes: 0,
  ledger_sha256:
    "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  marker: "VOID_BUY_ALLOCATION_CUSTODY_HIGH_WATER_WITNESS_EVENT_V1",
  pool_void_total: "10000000",
  previous_event_sha256: null,
  record_count: 0,
  remaining_void: "10000000",
  reserved_void_total: "0",
  sequence: 1,
  service_source_sha256:
    "sha256:bbc42447cc5b21f524cb7d1fb76a94c6322ffd36c901b5e5b2a8cbfe09918cd5",
  source_custody_disk_wwn: "eui.e8238fa6bf530001001b448b42e66c36",
  source_hostname: "zoso-Precision-Tower-7810",
  source_ledger_disk_wwn: "0x500a0751e9c796d8",
  source_machine_id_sha256:
    "sha256:11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2",
  version: 1,
  witness_hostname: "Nimo",
  witness_machine_id_sha256:
    "sha256:318e4b68f99f27982112de8b2279949f685f27bef0854feea47178618e5580da",
  witness_root_disk_serial: "50026B76873B25AB",
  witness_root_disk_wwn: "eui.00000000000000000026b76873b25ab5",
  writer_source_blob_sha1: "2db8493d1ee84878ef5fa2b0f655070622335d0d",
};

const genesisEvent = Object.freeze({
  ...genesisBody,
  event_sha256: sha256Id(canonicalJson(genesisBody)),
});

assert.equal(
  genesisEvent.event_sha256,
  "sha256:2092c92ac3117ae4ec1cd4d55627ff9e46e3bd4e3b20d1bbd848e1189d5d4654",
);

const witness = Buffer.from(
  canonicalJson(genesisEvent) + "\n",
  "utf8",
);

assert.equal(
  sha256Id(witness),
  "sha256:a73c8c674bea5ed473938ddbf4275a651272fefd4e75d212d3d2bb8c8e5cbe1a",
);
assert.equal(witness.length, 1411);

const evidence = Object.freeze({
  schema:
    "void_buy_void_allocation_custody_witness_identity_continuity_evidence_v1",
  marker:
    "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_V1",
  version: 1,
  census_receipt_sha256:
    "sha256:17bdb840978606db5145696a7b5085cabbcf27dee76b35a1b57324c1021241ef",
  read_only_census: true,
  ssh_hostkey_algorithm: "ssh-ed25519",
  ssh_hostkey_fingerprint:
    "SHA256:3c9mfrwEQ9RKbVwL8pw/kvbCFt5imaj3QCK79yynkvk",
  existing_known_hosts_match: true,
  ssh_hostkey_update: false,
  predecessor_witness_sha256: sha256Id(witness),
  predecessor_witness_bytes: witness.length,
  predecessor_witness_mode: "0600",
  predecessor_witness_links: 1,
  predecessor_event_count: 1,
  predecessor_tip_event_sha256: genesisEvent.event_sha256,
  predecessor_hostname: "Nimo",
  predecessor_machine_id_sha256:
    "sha256:318e4b68f99f27982112de8b2279949f685f27bef0854feea47178618e5580da",
  predecessor_root_disk_serial: "50026B76873B25AB",
  predecessor_root_disk_wwn: "eui.00000000000000000026b76873b25ab5",
  successor_hostname: "Nimo",
  successor_machine_id_sha256:
    "sha256:48a3554126d621d6460385ebacf3d41b454157337271cb7405af012158f203d4",
  successor_root_disk_serial: "50026B76873B25AB",
  successor_root_disk_wwn: "eui.00000000000000000026b76873b25ab5",
  drift_class: "machine_id_only",
});

const decision =
  classifyBuyVoidAllocationCustodyWitnessIdentityContinuityV1({
    predecessor_witness_jsonl: witness,
    evidence,
  });

if (decision.ok !== true) {
  throw new Error(decision.reason);
}
assert.equal(decision.status, "continuity_candidate_valid");
assert.match(decision.attestation.attestation_id, /^voidwica1_[0-9a-f]{64}$/u);
assert.equal(
  decision.attestation.predecessor_machine_id_sha256,
  evidence.predecessor_machine_id_sha256,
);
assert.equal(
  decision.attestation.successor_machine_id_sha256,
  evidence.successor_machine_id_sha256,
);
assert.equal(decision.attestation.v1_witness_retained_exact, true);
assert.equal(decision.attestation.v1_witness_history_rewritten, false);
assert.equal(
  decision.attestation.historical_predecessor_witness_pinned,
  true,
);
assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_AUTHORITY_V1
    .historical_predecessor_witness_pinned,
  true,
);
assert.equal(decision.attestation.handler_integration_required, true);
assert.equal(
  decision.attestation.current_machine_id_runtime_admission_authorized,
  false,
);
assert.equal(decision.production_gate_ready, false);

const alternateGenesisBody = {
  ...genesisBody,
  custody_uuid: "d72017fe-1c8f-452c-b55b-b08841209b29",
};
const alternateGenesisEvent = Object.freeze({
  ...alternateGenesisBody,
  event_sha256: sha256Id(canonicalJson(alternateGenesisBody)),
});
const alternateWitness = Buffer.from(
  canonicalJson(alternateGenesisEvent) + "\n",
  "utf8",
);
assert.equal(alternateWitness.length, witness.length);
assert.notEqual(sha256Id(alternateWitness), sha256Id(witness));
const alternatePredecessor =
  classifyBuyVoidAllocationCustodyWitnessIdentityContinuityV1({
    predecessor_witness_jsonl: alternateWitness,
    evidence: {
      ...evidence,
      predecessor_witness_sha256: sha256Id(alternateWitness),
      predecessor_witness_bytes: alternateWitness.length,
      predecessor_event_count: 1,
      predecessor_tip_event_sha256:
        alternateGenesisEvent.event_sha256,
    },
  });
assert.equal(alternatePredecessor.ok, false);
if (alternatePredecessor.ok !== false) {
  throw new Error("expected alternate historical predecessor HOLD");
}
assert.equal(
  alternatePredecessor.reason,
  "witness_identity_continuity_historical_predecessor_mismatch",
);

const held = (
  patch: Record<string, unknown>,
  reason: string,
): void => {
  const result =
    classifyBuyVoidAllocationCustodyWitnessIdentityContinuityV1({
      predecessor_witness_jsonl: witness,
      evidence: { ...evidence, ...patch },
    });
  assert.equal(result.ok, false);
  if (result.ok !== false) throw new Error("expected_hold");
  assert.equal(result.reason, reason);
};

held(
  { successor_hostname: "OtherNimo" },
  "witness_identity_continuity_multi_field_drift_rejected",
);
held(
  { successor_root_disk_serial: "different-disk" },
  "witness_identity_continuity_multi_field_drift_rejected",
);
held(
  { successor_root_disk_wwn: "eui.different" },
  "witness_identity_continuity_multi_field_drift_rejected",
);
held(
  {
    successor_machine_id_sha256:
      evidence.predecessor_machine_id_sha256,
  },
  "witness_identity_continuity_machine_id_not_rotated",
);
held(
  { existing_known_hosts_match: false },
  "witness_identity_continuity_evidence_invalid",
);
held(
  { ssh_hostkey_update: true },
  "witness_identity_continuity_evidence_invalid",
);
held(
  { drift_class: "multi_field" },
  "witness_identity_continuity_evidence_invalid",
);
held(
  {
    predecessor_witness_sha256:
      "sha256:" + "f".repeat(64),
  },
  "witness_identity_continuity_predecessor_witness_mismatch",
);
held(
  {
    predecessor_machine_id_sha256:
      "sha256:" + "f".repeat(64),
  },
  "witness_identity_continuity_predecessor_identity_mismatch",
);

for (const [key, value] of Object.entries(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_AUTHORITY_V1,
)) {
  if (
    [
      "v1_witness_history_rewritten",
      "v1_witness_mutation",
      "live_evidence_origin_proven",
      "live_continuity_attestation_proven",
      "handler_integration",
      "current_machine_id_runtime_admission",
      "external_transport_authenticated",
      "external_witness_storage_proven",
      "protected_high_water_custody_proven",
      "independent_custody_proven",
      "production_gate_ready",
      "payment_acceptance",
      "wallet_or_signer_access",
      "transaction_broadcast",
      "funds_movement",
    ].includes(key)
  ) {
    assert.equal(value, false, key);
  }
}

const source = fs.readFileSync(
  new URL(
    "../src/economic/buy_void_allocation_custody_witness_identity_continuity_v1.ts",
    import.meta.url,
  ),
  "utf8",
);

assert.doesNotMatch(
  source,
  /node:(?:fs|net|tls|http|https|child_process|worker_threads)/u,
);
assert.doesNotMatch(
  source,
  /spawnSync|execFileSync|execSync|fork\(/u,
);

console.log(
  "VOID_BUY_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_V1_PROOF_GREEN",
);
console.log("machine_id_only_drift_required=true");
console.log("stable_hostname_required=true");
console.log("stable_root_disk_serial_required=true");
console.log("stable_root_disk_wwn_required=true");
console.log("existing_known_hosts_match_required=true");
console.log("ssh_hostkey_update_must_be_false=true");
console.log("v1_witness_retained_exact=true");
console.log("v1_witness_history_rewritten=false");
console.log("historical_predecessor_witness_pinned=true");
console.log("alternate_valid_predecessor_rejected=true");
console.log("candidate_matches_reviewed_census_fixture=true");
console.log("live_evidence_origin_proven=false");
console.log("handler_integration=false");
console.log("current_machine_id_runtime_admission=false");
console.log("external_transport_authenticated=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
