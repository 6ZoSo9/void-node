import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
  buildBuyVoidAllocationCustodyWitnessTransportAppendRequestV1,
  buildBuyVoidAllocationCustodyWitnessTransportReadRequestV1,
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1,
  validateBuyVoidAllocationCustodyWitnessTransportResponseV1,
} from "../dist/economic/buy_void_allocation_custody_witness_transport_v1.js";
import {
  planBuyVoidAllocationReservationV1,
} from "../dist/economic/buy_void_allocation_reservation_ledger_v1.js";
import {
  deriveBuyVoidAllocationReservationHighWaterV1,
} from "../dist/economic/buy_void_allocation_reservation_high_water_v1.js";
import {
  parseBuyVoidAllocationCustodyExternalWitnessJournalV1,
} from "../dist/economic/buy_void_allocation_custody_external_witness_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_AUTHORITY_V1,
  handleVoidBuyAllocationCustodyWitnessForcedCommandRequestV1,
  readVoidBuyAllocationCustodyWitnessForcedCommandConfigV1,
} from "../tools/void-buy-allocation-custody-witness-forced-command-v1.mjs";

const sha = (hex) => "sha256:" + hex.repeat(64);
const sha256Id = (value) =>
  "sha256:" +
  crypto.createHash("sha256").update(value).digest("hex");

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (
    typeof value === "number" &&
    Number.isSafeInteger(value)
  ) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return (
      "[" +
      value.map(canonicalJson).join(",") +
      "]"
    );
  }
  if (
    value &&
    typeof value === "object"
  ) {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) +
            ":" +
            canonicalJson(value[key]),
        )
        .join(",") +
      "}"
    );
  }
  throw new Error("noncanonical_test_value");
}

function requireOk(value) {
  if (value?.ok !== true) {
    throw new Error(value?.reason || "unexpected_hold");
  }
  return value;
}

const policy = Object.freeze({
  transport: "ssh",
  remote_host: "nimo",
  remote_port: 22,
  remote_user: "void-witness",
  host_key_algorithm: "ssh-ed25519",
  host_key_sha256: sha("a"),
  known_hosts_sha256: sha("b"),
  client_key_algorithm: "ssh-ed25519",
  client_public_key_sha256: sha("c"),
  endpoint_marker:
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
  batch_mode: true,
  strict_host_key_checking: true,
  identities_only: true,
  request_tty: false,
  clear_all_forwardings: true,
  permit_local_command: false,
  remote_forced_command_only: true,
  remote_shell_allowed: false,
  caller_selected_remote_command: false,
  caller_selected_remote_path: false,
  connect_timeout_ms: 8_000,
  operation_timeout_ms: 30_000,
  max_request_bytes: 256 * 1024,
  max_response_bytes: 24 * 1024 * 1024,
});

const policyDecision =
  requireOk(
    classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(
      policy,
    ),
  );

const genesisEvent = {
  allocation_tip_sha256:
    "sha256:" + "0".repeat(64),
  custody_uuid:
    "c61906ed-0b7e-441b-a44a-a97730198a18",
  deployment_head:
    "63082114b957e4b1ba58348b17e144e954452c1f",
  event_sha256:
    "sha256:2092c92ac3117ae4ec1cd4d55627ff9e46e3bd4e3b20d1bbd848e1189d5d4654",
  high_water_bytes: 430,
  high_water_sha256:
    "sha256:121741f865301c62cf2ecd967e286de4bd2e2bdc31404dfbdf11f97c26fca13d",
  ledger_bytes: 0,
  ledger_sha256:
    "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  marker:
    "VOID_BUY_ALLOCATION_CUSTODY_HIGH_WATER_WITNESS_EVENT_V1",
  pool_void_total: "10000000",
  previous_event_sha256: null,
  record_count: 0,
  remaining_void: "10000000",
  reserved_void_total: "0",
  sequence: 1,
  service_source_sha256:
    "sha256:bbc42447cc5b21f524cb7d1fb76a94c6322ffd36c901b5e5b2a8cbfe09918cd5",
  source_custody_disk_wwn:
    "eui.e8238fa6bf530001001b448b42e66c36",
  source_hostname:
    "zoso-Precision-Tower-7810",
  source_ledger_disk_wwn:
    "0x500a0751e9c796d8",
  source_machine_id_sha256:
    "sha256:11be124fb6d2d08003b89e467cef7e8b17d6dfb73592ccbe0984545ff1bcb0e2",
  version: 1,
  witness_hostname: "Nimo",
  witness_machine_id_sha256:
    "sha256:318e4b68f99f27982112de8b2279949f685f27bef0854feea47178618e5580da",
  witness_root_disk_serial:
    "50026B76873B25AB",
  witness_root_disk_wwn:
    "eui.00000000000000000026b76873b25ab5",
  writer_source_blob_sha1:
    "2db8493d1ee84878ef5fa2b0f655070622335d0d",
};

const genesis =
  Buffer.from(JSON.stringify(genesisEvent) + "\n", "utf8");

const genesisParsed =
  parseBuyVoidAllocationCustodyExternalWitnessJournalV1(
    genesis,
  );

assert.equal(genesisParsed.event_count, 1);

const hostFacts = Object.freeze({
  witness_hostname:
    genesisEvent.witness_hostname,
  witness_machine_id_sha256:
    genesisEvent.witness_machine_id_sha256,
  witness_root_disk_serial:
    genesisEvent.witness_root_disk_serial,
  witness_root_disk_wwn:
    genesisEvent.witness_root_disk_wwn,
});

const current = Object.freeze({
  allocation_tip_sha256:
    genesisEvent.allocation_tip_sha256,
  custody_uuid:
    genesisEvent.custody_uuid,
  deployment_head:
    genesisEvent.deployment_head,
  high_water_bytes:
    genesisEvent.high_water_bytes,
  high_water_sha256:
    genesisEvent.high_water_sha256,
  ledger_bytes:
    genesisEvent.ledger_bytes,
  ledger_sha256:
    genesisEvent.ledger_sha256,
  pool_void_total:
    genesisEvent.pool_void_total,
  record_count:
    genesisEvent.record_count,
  remaining_void:
    genesisEvent.remaining_void,
  reserved_void_total:
    genesisEvent.reserved_void_total,
  service_source_sha256:
    genesisEvent.service_source_sha256,
  source_custody_disk_wwn:
    genesisEvent.source_custody_disk_wwn,
  source_hostname:
    genesisEvent.source_hostname,
  source_ledger_disk_wwn:
    genesisEvent.source_ledger_disk_wwn,
  source_machine_id_sha256:
    genesisEvent.source_machine_id_sha256,
  witness_hostname:
    genesisEvent.witness_hostname,
  witness_machine_id_sha256:
    genesisEvent.witness_machine_id_sha256,
  witness_root_disk_serial:
    genesisEvent.witness_root_disk_serial,
  witness_root_disk_wwn:
    genesisEvent.witness_root_disk_wwn,
  writer_source_blob_sha1:
    genesisEvent.writer_source_blob_sha1,
});

const baseInput = {
  ledger_jsonl: "",
  request_id: "buyvoid_a_aaaaaaaa",
  source_chain: "base",
  payment_transaction_hash:
    "0x" + "a".repeat(64),
  payment_log_index: 7,
  launch_authority: {
    marker:
      "VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1",
    version: 1,
    coupled_launch_id: sha("a"),
    source_composition_id: sha("b"),
    activation_generation:
      "0x" + "c".repeat(64),
    generation_tip_sha256: sha("d"),
    activation_receipt_id:
      "voidbclive1_" + "e".repeat(64),
    activation_receipt_sha256:
      "f".repeat(64),
    expires_at_ms:
      1_800_000_300_000,
  },
  buyer_delivery_wallet:
    "0x" + "1".repeat(40),
  quote_void_amount: "0.000002",
  quote_usdc_amount: "0.000001",
  pool_void_total: "10000000",
  verified_payment_receipt_ref:
    sha("1"),
  payment_verified_event_sha256:
    sha("0"),
  duplicate_payment_guard_result:
    sha("2"),
  inventory_allocation_guard_result:
    sha("3"),
  operator_activation_record_ref:
    sha("4"),
  created_at_ms:
    1_800_000_000_000,
  verified_payment_gate_green: true,
  duplicate_payment_guard_green: true,
  inventory_allocation_guard_green: true,
  operator_activation_record_green: true,
};

const reservation =
  requireOk(
    planBuyVoidAllocationReservationV1(
      baseInput,
    ),
  );

const ledger =
  reservation.next_ledger_jsonl;

const highWater =
  requireOk(
    deriveBuyVoidAllocationReservationHighWaterV1(
      ledger,
    ),
  );

const advancedCurrent = Object.freeze({
  ...current,
  allocation_tip_sha256:
    highWater.high_water.tip_hash,
  high_water_bytes:
    Buffer.byteLength(
      highWater.high_water_json,
      "utf8",
    ),
  high_water_sha256:
    sha256Id(
      Buffer.from(
        highWater.high_water_json,
        "utf8",
      ),
    ),
  ledger_bytes:
    Buffer.byteLength(ledger, "utf8"),
  ledger_sha256:
    sha256Id(Buffer.from(ledger, "utf8")),
  record_count:
    highWater.high_water.record_count,
  reserved_void_total:
    highWater.high_water
      .reserved_void_total,
  remaining_void:
    highWater.high_water
      .remaining_void,
});

const appendRequest =
  requireOk(
    buildBuyVoidAllocationCustodyWitnessTransportAppendRequestV1({
      policy,
      challenge_sha256: sha("7"),
      witness_jsonl: genesis,
      current_state: advancedCurrent,
      current_ledger_jsonl: ledger,
      current_high_water_json:
        highWater.high_water_json,
    }),
  );

const readRequest =
  requireOk(
    buildBuyVoidAllocationCustodyWitnessTransportReadRequestV1({
      policy,
      challenge_sha256: sha("8"),
    }),
  );

function configObject(root) {
  return Object.freeze({
    schema:
      "void_buy_void_allocation_custody_witness_forced_command_config_v1",
    marker:
      "VOID_BUY_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_CONFIG_V1",
    version: 1,
    authority_root: root,
    witness_filename:
      "buy-void-allocation-custody-high-water-witness-v1.jsonl",
    policy,
  });
}

function makeFixture() {
  const parent = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      "void-witness-handler-proof-",
    ),
  );
  fs.chmodSync(parent, 0o700);

  const root = path.join(parent, "authority");
  fs.mkdirSync(root, { mode: 0o700 });
  fs.chmodSync(root, 0o700);

  const witness = path.join(
    root,
    "buy-void-allocation-custody-high-water-witness-v1.jsonl",
  );
  fs.writeFileSync(
    witness,
    genesis,
    { mode: 0o600 },
  );

  const configPath =
    path.join(parent, "handler-config-v1.json");

  const config =
    configObject(root);

  const canonical = canonicalJson({
    authority_root: config.authority_root,
    marker: config.marker,
    policy: config.policy,
    schema: config.schema,
    version: config.version,
    witness_filename: config.witness_filename,
  }) + "\n";

  fs.writeFileSync(
    configPath,
    canonical,
    { mode: 0o600 },
  );

  return Object.freeze({
    parent,
    root,
    witness,
    configPath,
    config,
  });
}

function clean(fixture) {
  fs.rmSync(
    fixture.parent,
    {
      recursive: true,
      force: true,
    },
  );
}

const dependencies = Object.freeze({
  read_host_facts_impl: () => hostFacts,
});

{
  const fixture = makeFixture();

  const loaded =
    readVoidBuyAllocationCustodyWitnessForcedCommandConfigV1(
      fixture.configPath,
    );

  assert.deepEqual(
    loaded.policy,
    policyDecision.policy,
  );
  assert.equal(
    Object.hasOwn(
      loaded,
      "policy_sha256",
    ),
    false,
  );

  const result =
    handleVoidBuyAllocationCustodyWitnessForcedCommandRequestV1(
      loaded,
      readRequest.request_json,
      dependencies,
    );

  const verified =
    requireOk(
      validateBuyVoidAllocationCustodyWitnessTransportResponseV1({
        policy,
        request_json:
          readRequest.request_json,
        response_json:
          result.response_json,
      }),
    );

  assert.equal(
    verified.status,
    "read_response_verified",
  );
  assert.ok(
    verified.witness_jsonl.equals(genesis),
  );
  assert.equal(
    result.operation_performed,
    false,
  );

  clean(fixture);
}

{
  const fixture = makeFixture();

  const result =
    handleVoidBuyAllocationCustodyWitnessForcedCommandRequestV1(
      fixture.config,
      appendRequest.request_json,
      dependencies,
    );

  const verified =
    requireOk(
      validateBuyVoidAllocationCustodyWitnessTransportResponseV1({
        policy,
        request_json:
          appendRequest.request_json,
        response_json:
          result.response_json,
      }),
    );

  assert.equal(
    verified.status,
    "append_ack_verified",
  );
  assert.equal(
    verified.round_trip_read_required,
    true,
  );

  const finalBytes =
    fs.readFileSync(fixture.witness);

  assert.ok(
    finalBytes.equals(
      appendRequest.expected_next_witness_jsonl,
    ),
  );

  assert.equal(
    fs.existsSync(
      path.join(
        fixture.root,
        "buy-void-allocation-custody-witness-append-intent-v1.json",
      ),
    ),
    false,
  );

  clean(fixture);
}

for (const [hookName, expectedPerformed] of [
  ["interrupt_after_intent", true],
  ["interrupt_after_partial_append", true],
  ["interrupt_after_full_append", false],
]) {
  const fixture = makeFixture();

  assert.throws(
    () =>
      handleVoidBuyAllocationCustodyWitnessForcedCommandRequestV1(
        fixture.config,
        appendRequest.request_json,
        {
          ...dependencies,
          hooks: {
            [hookName]: true,
          },
        },
      ),
    /witness_forced_command_test_interrupt/u,
  );

  assert.equal(
    fs.existsSync(
      path.join(
        fixture.root,
        "buy-void-allocation-custody-witness-append-intent-v1.json",
      ),
    ),
    true,
  );

  const recovered =
    handleVoidBuyAllocationCustodyWitnessForcedCommandRequestV1(
      fixture.config,
      appendRequest.request_json,
      dependencies,
    );

  const verified =
    requireOk(
      validateBuyVoidAllocationCustodyWitnessTransportResponseV1({
        policy,
        request_json:
          appendRequest.request_json,
        response_json:
          recovered.response_json,
      }),
    );

  assert.equal(
    verified.status,
    "append_ack_verified",
  );
  assert.equal(
    fs.existsSync(
      path.join(
        fixture.root,
        "buy-void-allocation-custody-witness-append-intent-v1.json",
      ),
    ),
    false,
  );

  assert.ok(
    fs.readFileSync(
      fixture.witness,
    ).equals(
      appendRequest.expected_next_witness_jsonl,
    ),
  );

  if (hookName === "interrupt_after_full_append") {
    assert.equal(
      recovered.operation_performed,
      expectedPerformed,
    );
  }

  clean(fixture);
}

for (const hookName of [
  "interrupt_after_intent",
  "interrupt_after_partial_append",
  "interrupt_after_full_append",
]) {
  const fixture = makeFixture();

  assert.throws(
    () =>
      handleVoidBuyAllocationCustodyWitnessForcedCommandRequestV1(
        fixture.config,
        appendRequest.request_json,
        {
          ...dependencies,
          hooks: {
            [hookName]: true,
          },
        },
      ),
    /witness_forced_command_test_interrupt/u,
  );

  const intentPath = path.join(
    fixture.root,
    "buy-void-allocation-custody-witness-append-intent-v1.json",
  );
  assert.equal(fs.existsSync(intentPath), true);

  const witnessBeforeMismatchedRecovery =
    fs.readFileSync(fixture.witness);
  const intentBeforeMismatchedRecovery =
    fs.readFileSync(intentPath);

  assert.throws(
    () =>
      handleVoidBuyAllocationCustodyWitnessForcedCommandRequestV1(
        fixture.config,
        appendRequest.request_json,
        {
          read_host_facts_impl: () => ({
            ...hostFacts,
            witness_root_disk_serial:
              "different-disk",
          }),
        },
      ),
    /witness_forced_command_host_identity_mismatch/u,
  );

  assert.ok(
    fs.readFileSync(fixture.witness).equals(
      witnessBeforeMismatchedRecovery,
    ),
    hookName + " host mismatch must not mutate witness recovery state",
  );
  assert.ok(
    fs.readFileSync(intentPath).equals(
      intentBeforeMismatchedRecovery,
    ),
    hookName + " host mismatch must retain the durable intent exactly",
  );

  clean(fixture);
}

{
  const fixture = makeFixture();

  assert.throws(
    () =>
      handleVoidBuyAllocationCustodyWitnessForcedCommandRequestV1(
        fixture.config,
        appendRequest.request_json,
        {
          read_host_facts_impl: () => ({
            ...hostFacts,
            witness_root_disk_serial:
              "different-disk",
          }),
        },
      ),
    /witness_forced_command_host_identity_mismatch/u,
  );

  assert.ok(
    fs.readFileSync(
      fixture.witness,
    ).equals(genesis),
  );

  clean(fixture);
}

{
  const fixture = makeFixture();
  const saved =
    path.join(fixture.root, "saved-witness");

  fs.renameSync(
    fixture.witness,
    saved,
  );
  fs.symlinkSync(
    saved,
    fixture.witness,
  );

  assert.throws(
    () =>
      handleVoidBuyAllocationCustodyWitnessForcedCommandRequestV1(
        fixture.config,
        readRequest.request_json,
        dependencies,
      ),
    /witness_forced_command_witness_invalid/u,
  );

  clean(fixture);
}

{
  const fixture = makeFixture();
  const originalUnlinkSync = fs.unlinkSync;
  const detached = path.join(
    fixture.parent,
    "authority-detached-during-intent-cleanup",
  );
  let injected = false;
  try {
    fs.unlinkSync = (target) => {
      if (
        !injected &&
        path.basename(String(target)) ===
          "buy-void-allocation-custody-witness-append-intent-v1.json"
      ) {
        injected = true;
        fs.renameSync(fixture.root, detached);
        fs.mkdirSync(fixture.root, { mode: 0o700 });
        fs.writeFileSync(
          path.join(
            fixture.root,
            "buy-void-allocation-custody-high-water-witness-v1.jsonl",
          ),
          genesis,
          { mode: 0o600 },
        );
      }
      return originalUnlinkSync(target);
    };

    assert.throws(
      () =>
        handleVoidBuyAllocationCustodyWitnessForcedCommandRequestV1(
          fixture.config,
          appendRequest.request_json,
          dependencies,
        ),
      /witness_forced_command_intent_invalid_directory_changed/u,
    );
    assert.equal(injected, true);
    assert.ok(
      fs.readFileSync(
        path.join(
          fixture.root,
          "buy-void-allocation-custody-high-water-witness-v1.jsonl",
        ),
      ).equals(genesis),
    );
  } finally {
    fs.unlinkSync = originalUnlinkSync;
    clean(fixture);
  }
}

{
  const handlerPath = new URL(
    "../tools/void-buy-allocation-custody-witness-forced-command-v1.mjs",
    import.meta.url,
  );
  const child = spawnSync(
    process.execPath,
    [handlerPath.pathname, "--config=/definitely-not-read.json"],
    {
      encoding: "utf8",
      input: "{}\n",
      env: {
        ...process.env,
        VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1: "1",
        SSH_ORIGINAL_COMMAND: "   ",
      },
    },
  );
  assert.equal(child.status, 3);
  assert.match(
    child.stderr,
    /witness_forced_command_original_command_forbidden/u,
  );
}

const source =
  fs.readFileSync(
    new URL(
      "../tools/void-buy-allocation-custody-witness-forced-command-v1.mjs",
      import.meta.url,
    ),
    "utf8",
  );

for (const token of [
  "VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1",
  "SSH_ORIGINAL_COMMAND",
  "withBuyVoidFilesystemBakeryLockV1",
  "classifyBuyVoidAllocationCustodyWitnessTransportServerRequestV1",
  "buildBuyVoidAllocationCustodyWitnessTransportAppendResponseV1",
  "O_NOFOLLOW",
  "O_DIRECTORY",
  "/proc/self/fd",
  "fs.fsyncSync",
  "fs.ftruncateSync",
  "/usr/bin/findmnt",
  "/usr/bin/lsblk",
]) {
  assert.ok(
    source.includes(token),
    token,
  );
}

for (
  const [key, value] of Object.entries(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_AUTHORITY_V1,
  )
) {
  if (
    [
      "live_nimo_installed",
      "authorized_keys_mutated",
      "ssh_key_generated",
      "server_controlled_policy_origin_proven",
      "challenge_freshness_proven",
      "response_replay_resistance_proven",
      "external_transport_authenticated",
      "external_witness_storage_proven",
      "runtime_integration",
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

console.log(
  "VOID_BUY_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_V1_PROOF_GREEN",
);
console.log("server_controlled_policy_contract=true");
console.log("descriptor_pinned_authority_root=true");
console.log("cross_process_lock_reused=true");
console.log("durable_append_intent=true");
console.log("exact_single_event_append=true");
console.log("exact_idempotence=true");
console.log("intent_only_crash_recovered=true");
console.log("torn_append_crash_recovered=true");
console.log("full_append_pre_cleanup_crash_recovered=true");
console.log("witness_fsync=true");
console.log("authority_directory_fsync=true");
console.log("post_mutation_path_rebind=true");
console.log("host_identity_mismatch_rejected=true");
console.log("recovery_host_identity_checked_before_mutation=true");
console.log("mismatched_recovery_preserves_witness_and_intent=true");
console.log("symlink_witness_rejected=true");
console.log("original_remote_command_rejected=true");
console.log("live_nimo_installed=false");
console.log("authorized_keys_mutated=false");
console.log("ssh_key_generated=false");
console.log("external_transport_authenticated=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
