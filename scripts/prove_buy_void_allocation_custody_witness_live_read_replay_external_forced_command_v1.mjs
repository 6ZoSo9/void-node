#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_V1,
  handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1,
} from "../tools/void-buy-allocation-custody-witness-live-read-replay-external-forced-command-v1.mjs";
import {
  deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1,
} from "../dist/economic/buy_void_allocation_custody_witness_live_read_replay_high_water_v1.js";
import {
  planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1,
} from "../dist/economic/buy_void_allocation_custody_witness_live_read_replay_state_v1.js";
import {
  parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1,
} from "../dist/economic/buy_void_allocation_custody_witness_live_read_replay_external_witness_v1.js";

const WITNESS_NAME =
  "buy-void-allocation-custody-witness-live-read-replay-external-v1.jsonl";
const INTENT_NAME =
  "buy-void-allocation-custody-witness-live-read-replay-external-append-intent-v1.json";

function canonicalJson(value) {
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
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  throw new Error("noncanonical");
}

function canonicalLine(value) {
  return canonicalJson(value) + "\n";
}

function sha256Id(value) {
  return (
    "sha256:" +
    crypto.createHash("sha256").update(value).digest("hex")
  );
}

function requestId(label) {
  return (
    "voidwlrwreq1_" +
    crypto.createHash("sha256").update(label).digest("hex")
  );
}

const expectedHost = Object.freeze({
  witness_hostname: "Nimo",
  witness_machine_id_sha256:
    "sha256:48a3554126d621d6460385ebacf3d41b454157337271cb7405af012158f203d4",
  witness_root_disk_serial: "50026B76873B25AB",
  witness_root_disk_wwn:
    "eui.00000000000000000026b76873b25ab5",
});

const sourceIdentity = Object.freeze({
  source_hostname: "zoso-Precision-Tower-7810",
  source_journal_root:
    "/var/lib/void-allocation-ledger-v1/witness-live-read-replay-v1",
  source_high_water_root:
    "/var/lib/void-allocation-custody-v1/witness-live-read-replay-v1",
  source_journal_disk_wwn: "0x500a0751e9c796d8",
  source_high_water_disk_wwn:
    "eui.e8238fa6bf530001001b448b42e66c36",
});

function fixture() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "void-replay-external-forced-command-v1-"),
  );
  fs.chmodSync(root, 0o700);
  const witness = path.join(root, WITNESS_NAME);
  fs.writeFileSync(witness, Buffer.alloc(0), { mode: 0o600 });
  fs.chmodSync(witness, 0o600);
  return Object.freeze({
    root,
    witness,
    intent: path.join(root, INTENT_NAME),
    config: Object.freeze({
      schema:
        "void_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_config_v1",
      marker:
        "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_CONFIG_V1",
      version: 1,
      authority_root: root,
      witness_filename: WITNESS_NAME,
      source_identity: sourceIdentity,
      expected_witness_identity: expectedHost,
    }),
  });
}

function cleanup(f) {
  fs.rmSync(f.root, { recursive: true, force: true });
}

function highWater(journal) {
  const derived =
    deriveBuyVoidAllocationCustodyWitnessLiveReadReplayHighWaterV1(
      journal,
    );
  assert.equal(derived.ok, true);
  if (!derived.ok) throw new Error("high-water derive held");
  return Buffer.from(derived.high_water_json, "utf8");
}

function buildRequest({
  operation,
  id,
  journal = null,
  high_water = null,
}) {
  const value = Object.freeze({
    schema:
      "void_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_request_v1",
    marker:
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_REQUEST_V1",
    version: 1,
    operation,
    request_id: id,
    source_journal_json_base64:
      journal === null ? null : Buffer.from(journal).toString("base64"),
    source_high_water_json_base64:
      high_water === null
        ? null
        : Buffer.from(high_water).toString("base64"),
  });
  return Buffer.from(canonicalLine(value), "utf8");
}

function parseResponse(text) {
  const value = JSON.parse(text);
  assert.equal(
    canonicalLine(value),
    text,
    "response must be canonical single-line JSON",
  );
  assert.equal(
    value.marker,
    "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_RESPONSE_V1",
  );
  assert.equal(value.external_transport_authenticated, false);
  assert.equal(value.external_witness_storage_proven, false);
  assert.equal(value.production_gate_ready, false);
  assert.equal(value.funds_movement, false);
  return value;
}

const deps = Object.freeze({
  read_host_facts_impl() {
    return expectedHost;
  },
});

{
  const f = fixture();
  try {
    const read = buildRequest({
      operation: "read",
      id: requestId("empty-read"),
    });
    const result =
      handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
        f.config,
        read,
        deps,
      );
    const response = parseResponse(result.response_json);
    assert.equal(response.initialized, false);
    assert.equal(response.witness_bytes, 0);
    assert.equal(response.event_count, 0);
    assert.equal(response.tip_event_sha256, null);
    assert.equal(response.operation_performed, false);
    assert.equal(response.recovered_intent, false);
    assert.equal(fs.readFileSync(f.witness).length, 0);
    assert.equal(fs.existsSync(f.intent), false);

    const journal0 = Buffer.alloc(0);
    const append0 = buildRequest({
      operation: "append",
      id: requestId("append-genesis"),
      journal: journal0,
      high_water: highWater(journal0),
    });
    const append0Value = JSON.parse(append0.toString("utf8"));
    assert.equal(
      append0Value.source_journal_json_base64,
      "",
      "canonical genesis replay journal must encode as empty base64",
    );
    const invalidEmptyHighWater = Buffer.from(
      canonicalLine({
        ...append0Value,
        request_id: requestId("append-genesis-empty-high-water"),
        source_high_water_json_base64: "",
      }),
      "utf8",
    );
    assert.throws(
      () =>
        handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
          f.config,
          invalidEmptyHighWater,
          deps,
        ),
      /append_payload_invalid/u,
    );
    const appended =
      handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
        f.config,
        append0,
        deps,
      );
    const appendedResponse = parseResponse(appended.response_json);
    assert.equal(appendedResponse.initialized, true);
    assert.equal(appendedResponse.event_count, 1);
    assert.equal(appendedResponse.witnessed_replay_sequence, 0);
    assert.equal(appendedResponse.operation_performed, true);
    assert.equal(fs.existsSync(f.intent), false);

    const witness1 = fs.readFileSync(f.witness);
    const parsed1 =
      parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1(
        witness1,
      );
    assert.equal(parsed1.event_count, 1);
    assert.equal(parsed1.tip.replay_sequence, 0);
    assert.equal(
      parsed1.tip.source_journal_disk_wwn,
      sourceIdentity.source_journal_disk_wwn,
    );
    assert.equal(
      parsed1.tip.witness_root_disk_wwn,
      expectedHost.witness_root_disk_wwn,
    );

    const idempotent =
      handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
        f.config,
        append0,
        deps,
      );
    const idempotentResponse = parseResponse(idempotent.response_json);
    assert.equal(idempotentResponse.operation_performed, false);
    assert.equal(idempotentResponse.event_count, 1);
    assert.deepEqual(fs.readFileSync(f.witness), witness1);

    const issued =
      planBuyVoidAllocationCustodyWitnessLiveReadChallengeIssueV1({
        journal_jsonl: journal0,
        entropy_sha256: "sha256:" + "1".repeat(64),
        issued_at_ms: 1_000,
        expires_at_ms: 39_000,
      });
    assert.equal(issued.ok, true);
    if (!issued.ok) throw new Error("issue held");
    const journal1 = Buffer.from(issued.next_journal_jsonl, "utf8");
    const append1 = buildRequest({
      operation: "append",
      id: requestId("append-sequence-1"),
      journal: journal1,
      high_water: highWater(journal1),
    });
    const second =
      handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
        f.config,
        append1,
        deps,
      );
    const secondResponse = parseResponse(second.response_json);
    assert.equal(secondResponse.operation_performed, true);
    assert.equal(secondResponse.event_count, 2);
    assert.equal(secondResponse.witnessed_replay_sequence, 1);

    const parsed2 =
      parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1(
        fs.readFileSync(f.witness),
      );
    assert.equal(parsed2.event_count, 2);
    assert.equal(parsed2.tip.replay_sequence, 1);
  } finally {
    cleanup(f);
  }
}

for (const phase of [
  "interrupt_after_intent",
  "interrupt_after_partial_append",
  "interrupt_after_full_append",
]) {
  const f = fixture();
  try {
    const journal0 = Buffer.alloc(0);
    const append0 = buildRequest({
      operation: "append",
      id: requestId("crash-" + phase),
      journal: journal0,
      high_water: highWater(journal0),
    });
    const hooks =
      phase === "interrupt_after_intent"
        ? { interrupt_after_intent: true }
        : phase === "interrupt_after_partial_append"
          ? { interrupt_after_partial_append: true }
          : { interrupt_after_full_append: true };
    assert.throws(
      () =>
        handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
          f.config,
          append0,
          {
            ...deps,
            hooks,
          },
        ),
      /witness_replay_external_forced_command_test_interrupt_/u,
      phase,
    );
    assert.equal(fs.existsSync(f.intent), true, phase);

    const recovered =
      handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
        f.config,
        append0,
        deps,
      );
    const response = parseResponse(recovered.response_json);
    assert.equal(response.initialized, true, phase);
    assert.equal(response.event_count, 1, phase);
    assert.equal(response.witnessed_replay_sequence, 0, phase);
    assert.equal(response.recovered_intent, true, phase);
    assert.equal(fs.existsSync(f.intent), false, phase);
    const parsed =
      parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1(
        fs.readFileSync(f.witness),
      );
    assert.equal(parsed.event_count, 1, phase);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const journal0 = Buffer.alloc(0);
    const append = buildRequest({
      operation: "append",
      id: requestId("intent-unlinked-before-write"),
      journal: journal0,
      high_water: highWater(journal0),
    });
    assert.throws(
      () =>
        handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
          f.config,
          append,
          {
            ...deps,
            hooks: { unlink_intent_after_create: true },
          },
        ),
      /ENOENT|witness_replay_external_forced_command_intent_invalid/u,
    );
    assert.equal(
      fs.readFileSync(f.witness).length,
      0,
      "missing just-created intent must HOLD before any witness byte is written",
    );
    assert.equal(fs.existsSync(f.intent), false);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const journal0 = Buffer.alloc(0);
    const append = buildRequest({
      operation: "append",
      id: requestId("orphan-torn-recovery"),
      journal: journal0,
      high_water: highWater(journal0),
    });
    assert.throws(
      () =>
        handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
          f.config,
          append,
          {
            ...deps,
            hooks: { interrupt_after_partial_append: true },
          },
        ),
      /test_interrupt_after_partial_append/u,
    );
    assert.equal(fs.existsSync(f.intent), true);
    const torn = fs.readFileSync(f.witness);
    assert.ok(torn.length > 0, "partial append must leave a torn tail");

    fs.unlinkSync(f.intent);
    assert.equal(fs.existsSync(f.intent), false);

    const read = buildRequest({
      operation: "read",
      id: requestId("orphan-torn-read"),
    });
    assert.throws(
      () =>
        handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
          f.config,
          read,
          deps,
        ),
      /witness|json|newline|invalid|parse/u,
    );
    assert.deepEqual(
      fs.readFileSync(f.witness),
      torn,
      "read must not repair or mutate an orphan torn witness",
    );

    const recovered =
      handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
        f.config,
        append,
        deps,
      );
    const recoveredResponse = parseResponse(recovered.response_json);
    assert.equal(recoveredResponse.initialized, true);
    assert.equal(recoveredResponse.operation_performed, true);
    assert.equal(recoveredResponse.recovered_intent, true);
    assert.equal(recoveredResponse.event_count, 1);
    assert.equal(recoveredResponse.witnessed_replay_sequence, 0);
    assert.equal(fs.existsSync(f.intent), false);
    const parsed =
      parseBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessJournalV1(
        fs.readFileSync(f.witness),
      );
    assert.equal(parsed.event_count, 1);
    assert.equal(parsed.tip.replay_sequence, 0);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const journal0 = Buffer.alloc(0);
    const append = buildRequest({
      operation: "append",
      id: requestId("tampered-intent"),
      journal: journal0,
      high_water: highWater(journal0),
    });
    assert.throws(
      () =>
        handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
          f.config,
          append,
          {
            ...deps,
            hooks: { interrupt_after_intent: true },
          },
        ),
      /test_interrupt_after_intent/u,
    );
    const forgedLine = Buffer.from(canonicalLine({ forged: true }), "utf8");
    const intent = JSON.parse(fs.readFileSync(f.intent, "utf8"));
    intent.next_line_base64 = forgedLine.toString("base64");
    intent.expected_next_witness_sha256 = sha256Id(forgedLine);
    intent.expected_next_witness_bytes = forgedLine.length;
    intent.next_event_count = 1;
    intent.next_tip_event_sha256 = sha256Id("forged-tip");
    intent.next_witnessed_replay_sequence = 0;
    fs.writeFileSync(f.intent, canonicalLine(intent), { mode: 0o600 });

    assert.throws(
      () =>
        handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
          f.config,
          append,
          deps,
        ),
      /intent_plan_mismatch/u,
    );
    assert.equal(
      fs.readFileSync(f.witness).length,
      0,
      "tampered intent must HOLD before witness mutation",
    );
    assert.equal(
      fs.existsSync(f.intent),
      true,
      "tampered intent must remain for operator inspection",
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const journal0 = Buffer.alloc(0);
    const append = buildRequest({
      operation: "append",
      id: requestId("pending"),
      journal: journal0,
      high_water: highWater(journal0),
    });
    assert.throws(
      () =>
        handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
          f.config,
          append,
          {
            ...deps,
            hooks: { interrupt_after_intent: true },
          },
        ),
      /test_interrupt_after_intent/u,
    );
    const read = buildRequest({
      operation: "read",
      id: requestId("read-while-pending"),
    });
    assert.throws(
      () =>
        handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
          f.config,
          read,
          deps,
        ),
      /nonappend_blocked_by_intent/u,
    );
    const mismatch = buildRequest({
      operation: "append",
      id: requestId("mismatch"),
      journal: journal0,
      high_water: highWater(journal0),
    });
    assert.throws(
      () =>
        handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
          f.config,
          mismatch,
          deps,
        ),
      /pending_intent_request_mismatch/u,
    );
    const recovered =
      handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
        f.config,
        append,
        deps,
      );
    assert.equal(parseResponse(recovered.response_json).event_count, 1);
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const read = buildRequest({
      operation: "read",
      id: requestId("bad-host"),
    });
    assert.throws(
      () =>
        handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
          f.config,
          read,
          {
            read_host_facts_impl() {
              return {
                ...expectedHost,
                witness_root_disk_serial: "DRIFTED",
              };
            },
          },
        ),
      /host_identity_mismatch/u,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const read = JSON.parse(
      buildRequest({
        operation: "read",
        id: requestId("extra-field"),
      }).toString("utf8"),
    );
    read.authority_root = "/tmp/evil";
    assert.throws(
      () =>
        handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
          f.config,
          Buffer.from(canonicalLine(read), "utf8"),
          deps,
        ),
      /request_invalid/u,
    );
  } finally {
    cleanup(f);
  }
}

{
  const f = fixture();
  try {
    const badConfig = {
      ...f.config,
      source_identity: {
        ...sourceIdentity,
        source_hostname: 123,
      },
    };
    assert.throws(
      () =>
        handleVoidBuyAllocationCustodyWitnessLiveReadReplayExternalForcedCommandRequestV1(
          badConfig,
          buildRequest({
            operation: "read",
            id: requestId("bad-source"),
          }),
          deps,
        ),
      /source_identity_invalid/u,
    );
  } finally {
    cleanup(f);
  }
}

for (const key of [
  "shell_access",
  "generic_write_primitive",
  "generic_delete_primitive",
  "generic_rename_primitive",
  "service_control_primitive",
  "live_nimo_installed",
  "server_controlled_policy_origin_proven",
  "external_transport_authenticated",
  "external_witness_storage_proven",
  "live_remote_read_performed",
  "live_remote_append_performed",
  "runtime_integration",
  "rollback_resistance_proven",
  "protected_high_water_custody_proven",
  "independent_custody_proven",
  "production_gate_ready",
  "wallet_or_signer_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "chain2050_write",
  "presale_activation",
  "market_activation",
  "funds_movement",
]) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_AUTHORITY_V1[
      key
    ],
    false,
    key,
  );
}

for (const key of [
  "source_handler",
  "forced_command_boundary",
  "root_owned_nonwritable_config_parent_required",
  "root_owned_read_only_config_file_required",
  "fixed_witness_filename",
  "fixed_intent_filename",
  "descriptor_pinned_authority_root",
  "nofollow_ancestor_walk",
  "nofollow_config_read",
  "nofollow_witness_open",
  "shared_cross_process_lock",
  "canonical_external_witness_planner_required",
  "one_planned_event_per_append",
  "durable_append_intent",
  "exact_idempotence",
  "torn_append_recovery",
  "planner_bound_orphan_torn_recovery",
  "witness_file_fsync",
  "authority_directory_fsync",
  "post_mutation_path_rebind",
  "server_observed_witness_identity_required",
  "original_remote_command_rejected",
]) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_AUTHORITY_V1[
      key
    ],
    true,
    key,
  );
}

{
  const maxEnvelopeRequest = buildRequest({
    operation: "append",
    id: requestId("intent-capacity-envelope"),
    journal: Buffer.alloc(8 * 1024 * 1024),
    high_water: Buffer.alloc(16 * 1024, 0x61),
  });
  assert.ok(
    maxEnvelopeRequest.length <= 12 * 1024 * 1024,
    "maximum decoded replay/high-water envelope must fit request ceiling",
  );
  const nestedRequestBase64Bytes = Buffer.byteLength(
    maxEnvelopeRequest.toString("base64"),
    "utf8",
  );
  assert.ok(
    nestedRequestBase64Bytes > 8 * 1024 * 1024,
    "retired 8 MiB intent ceiling cannot hold a near-limit request after the second base64 layer",
  );
  const derivedIntentCeiling =
    4 * Math.ceil((12 * 1024 * 1024) / 3) +
    4 * Math.ceil((4 * 1024) / 3) +
    64 * 1024;
  assert.ok(
    derivedIntentCeiling >
      nestedRequestBase64Bytes + 4 * Math.ceil((4 * 1024) / 3),
    "derived intent ceiling must cover request rebinding plus one maximal witness event and metadata",
  );
}

const source = fs.readFileSync(
  "tools/void-buy-allocation-custody-witness-live-read-replay-external-forced-command-v1.mjs",
  "utf8",
);
for (const token of [
  "withBuyVoidFilesystemBakeryLockV1",
  "planBuyVoidAllocationCustodyWitnessLiveReadReplayExternalWitnessAdvanceV1",
  "O_NOFOLLOW",
  "O_DIRECTORY",
  "fs.fsyncSync",
  "fs.ftruncateSync",
  "SSH_ORIGINAL_COMMAND",
  "VOID_BUY_VOID_REPLAY_EXTERNAL_WITNESS_FORCED_COMMAND_V1",
  "openPinnedRootOwnedDirectory",
  "assertRootOwnedDirectoryVisible",
  "config_parent_invalid",
  "config_path_not_bound",
  "config_changed_during_read",
  "assertExactPrivateFile",
  "recoverOrphanTornAppend",
  "planner_bound_orphan_torn_recovery",
  "unlink_intent_after_create",
]) {
  assert.equal(source.includes(token), true, token);
}
assert.match(
  source,
  /function openPinnedRootOwnedDirectory\(rawPath, reason\)[\s\S]*O_DIRECTORY \| O_NOFOLLOW[\s\S]*_ancestor_changed/u,
  "config parent must be descriptor-walked from filesystem root",
);
assert.match(
  source,
  /function readRootOwnedConfig\(configPath\)[\s\S]*openPinnedRootOwnedDirectory\([\s\S]*visibleBefore[\s\S]*sameFile\(visibleBefore, opened\)[\s\S]*assertRootOwnedDirectoryVisible/u,
  "config file must remain bound to the pinned root-owned parent",
);
assert.doesNotMatch(source, /child_process\.exec/u);
assert.doesNotMatch(source, /\beval\s*\(/u);
assert.doesNotMatch(source, /process\.env\[[^\]]+\]\s*=/u);
assert.doesNotMatch(
  source,
  /MAX_INTENT_BYTES\s*=\s*8\s*\*\s*1024\s*\*\s*1024/u,
  "intent capacity must not regress to the request-smaller 8 MiB ceiling",
);
assert.match(
  source,
  /4 \* Math\.ceil\(MAX_REQUEST_BYTES \/ 3\)[\s\S]{0,180}4 \* Math\.ceil\(MAX_WITNESS_EVENT_BYTES \/ 3\)[\s\S]{0,180}MAX_INTENT_METADATA_BYTES/u,
  "intent ceiling must remain derived from request, event, and metadata bounds",
);
assert.match(
  source,
  /function unlinkPrivateFile\([\s\S]*fs\.unlinkSync\(pinned\);[\s\S]*fs\.fsyncSync\(directory\.fd\);[\s\S]*assertPrivateDirectoryVisible\(/u,
  "final intent cleanup must rebind the authority-root pathname",
);
assert.match(
  source,
  /createPrivateFile\([\s\S]*INTENT_NAME[\s\S]*assertExactPrivateFile\([\s\S]*INTENT_NAME[\s\S]*appendWithHooks\(/u,
  "new append must rebind exact durable intent bytes before witness mutation",
);

assert.equal(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_V1,
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_V1",
);

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_LIVE_READ_REPLAY_EXTERNAL_FORCED_COMMAND_V1_GREEN",
);
console.log("fixed_witness_path=true");
console.log("caller_selected_identity=false");
console.log("server_observed_witness_identity=true");
console.log("read_empty_witness_nonmutating=true");
console.log("canonical_genesis_append=true");
console.log("empty_genesis_journal_base64_admitted=true");
console.log("empty_high_water_base64_rejected=true");
console.log("one_planned_event_per_append=true");
console.log("exact_idempotence=true");
console.log("intent_only_crash_recovered=true");
console.log("torn_append_crash_recovered=true");
console.log("planner_bound_orphan_torn_recovery=true");
console.log("post_create_intent_unlink_holds_before_witness_write=true");
console.log("orphan_torn_read_nonmutating=true");
console.log("final_intent_cleanup_rebind=true");
console.log("full_append_precleanup_crash_recovered=true");
console.log("read_pending_intent_holds=true");
console.log("mismatched_recovery_request_holds=true");
console.log("tampered_intent_revalidated_before_write=true");
console.log("max_request_intent_capacity_bound=true");
console.log("retired_8mib_intent_ceiling=false");
console.log("host_identity_drift_rejected=true");
console.log("caller_path_injection_rejected=true");
console.log("config_parent_descriptor_walk=true");
console.log("config_file_descriptor_binding=true");
console.log("live_nimo_installed=false");
console.log("external_transport_authenticated=false");
console.log("external_witness_storage_proven=false");
console.log("rollback_resistance_proven=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");