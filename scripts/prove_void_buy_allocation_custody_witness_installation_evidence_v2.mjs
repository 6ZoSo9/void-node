#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_AUTHORITY_V2,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V2,
  collectBuyVoidAllocationCustodyWitnessInstallationEvidenceV2,
} from "../tools/void-buy-allocation-custody-witness-installation-evidence-v2.mjs";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_TRANSPORT_ENDPOINT_V1,
} from "../src/economic/buy_void_allocation_custody_witness_transport_v1.js";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V2,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_SHA256_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_ID_V1,
} from "../src/economic/buy_void_allocation_custody_witness_installation_qualification_v2.js";

const HANDLER_PATH =
  "/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v2.mjs";
const CONFIG_PATH =
  "/etc/void/buy-void-allocation-custody-witness-forced-command-v2.json";
const AUTHORITY_ROOT =
  "/var/lib/void-allocation-custody-witness-v1";
const WITNESS_NAME =
  "buy-void-allocation-custody-high-water-witness-v1.jsonl";
const INTENT_NAME =
  "buy-void-allocation-custody-witness-append-intent-v1.json";
const CONTINUITY_ATTESTATION =
  path.join(
    AUTHORITY_ROOT,
    "buy-void-allocation-custody-witness-identity-continuity-attestation-v1.json",
  );
const AUTHORIZED_KEYS =
  "/etc/ssh/authorized_keys/voidwitness";
const HOST_KEY =
  "/etc/ssh/ssh_host_ed25519_key.pub";
const NODE_PATH = "/usr/bin/node";
const ENV_PATH = "/usr/bin/env";
const DASH_PATH = "/usr/bin/dash";
const MACHINE_ID_PATH = "/etc/machine-id";

const FORCED_COMMAND =
  'test -z "$SSH_ORIGINAL_COMMAND" || exit 3; exec /usr/bin/env -i PATH=/usr/bin:/bin LANG=C LC_ALL=C VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V2=1 /usr/bin/node /usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v2.mjs --config=/etc/void/buy-void-allocation-custody-witness-forced-command-v2.json';

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
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
  throw new Error("noncanonical_test_value");
}

const sha256Id = (value) =>
  "sha256:" + crypto.createHash("sha256").update(value).digest("hex");

function sshEd25519Blob(byte) {
  const alg = Buffer.from("ssh-ed25519", "utf8");
  const key = Buffer.alloc(32, byte);
  const blob = Buffer.alloc(4 + alg.length + 4 + key.length);
  let offset = 0;
  blob.writeUInt32BE(alg.length, offset);
  offset += 4;
  alg.copy(blob, offset);
  offset += alg.length;
  blob.writeUInt32BE(key.length, offset);
  offset += 4;
  key.copy(blob, offset);
  return blob;
}

const hostKeyBlob = sshEd25519Blob(0x11);
const clientKeyBlob = sshEd25519Blob(0x22);
const hostKeySha = sha256Id(hostKeyBlob);
const clientKeySha = sha256Id(clientKeyBlob);
const knownHostsSha = sha256Id(Buffer.from("reviewed-known-hosts\n", "utf8"));

const transportPolicy = Object.freeze({
  transport: "ssh",
  remote_host: "nimo.void.internal",
  remote_port: 22,
  remote_user: "voidwitness",
  host_key_algorithm: "ssh-ed25519",
  host_key_sha256: hostKeySha,
  known_hosts_sha256: knownHostsSha,
  client_key_algorithm: "ssh-ed25519",
  client_public_key_sha256: clientKeySha,
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
  connect_timeout_ms: 8000,
  operation_timeout_ms: 30000,
  max_request_bytes: 256 * 1024,
  max_response_bytes: 24 * 1024 * 1024,
});

const config = Object.freeze({
  schema:
    "void_buy_void_allocation_custody_witness_installation_evidence_config_v2",
  marker:
    "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_CONFIG_V2",
  version: 2,
  transport_policy: transportPolicy,
});

const handlerBytes = fs.readFileSync(
  "tools/void-buy-allocation-custody-witness-forced-command-v2.mjs",
);
const handlerBlob = crypto
  .createHash("sha1")
  .update(Buffer.from("blob " + String(handlerBytes.length) + "\0", "utf8"))
  .update(handlerBytes)
  .digest("hex");
assert.equal(
  handlerBlob,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V2,
);

const machineId = "1".repeat(32);
const witnessMachineIdSha = sha256Id(Buffer.from(machineId, "utf8"));
const genesisBody = {
  allocation_tip_sha256: "sha256:" + "0".repeat(64),
  custody_uuid: "c61906ed-0b7e-441b-a44a-a97730198a18",
  deployment_head: "f0e89ae93a73a7f859e58dc088487a229cc70188",
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
    "sha256:" + "b".repeat(64),
  source_custody_disk_wwn: "eui.source-custody-0001",
  source_hostname: "precision.test",
  source_ledger_disk_wwn: "eui.source-ledger-0001",
  source_machine_id_sha256: "sha256:" + "a".repeat(64),
  version: 1,
  witness_hostname: "Nimo",
  witness_machine_id_sha256: witnessMachineIdSha,
  witness_root_disk_serial: "SERIAL1",
  witness_root_disk_wwn: "WWN1",
  writer_source_blob_sha1: "2db8493d1ee84878ef5fa2b0f655070622335d0d",
};
const genesisEvent = Object.freeze({
  ...genesisBody,
  event_sha256: sha256Id(Buffer.from(canonicalJson(genesisBody), "utf8")),
});
const witnessBytes = Buffer.from(canonicalJson(genesisEvent) + "\n", "utf8");


const continuityAttestationBody = Object.freeze({
  schema:
    "void_buy_void_allocation_custody_witness_identity_continuity_attestation_v1",
  marker:
    "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_ATTESTATION_V1",
  version: 1,
  continuity_scope: "machine_id_rotation_only",
  census_receipt_sha256:
    "sha256:17bdb840978606db5145696a7b5085cabbcf27dee76b35a1b57324c1021241ef",
  predecessor_witness_sha256:
    "sha256:a73c8c674bea5ed473938ddbf4275a651272fefd4e75d212d3d2bb8c8e5cbe1a",
  predecessor_witness_bytes: 1411,
  predecessor_event_count: 1,
  historical_predecessor_witness_pinned: true,
  predecessor_tip_event_sha256:
    "sha256:2092c92ac3117ae4ec1cd4d55627ff9e46e3bd4e3b20d1bbd848e1189d5d4654",
  predecessor_machine_id_sha256:
    "sha256:318e4b68f99f27982112de8b2279949f685f27bef0854feea47178618e5580da",
  successor_machine_id_sha256:
    "sha256:48a3554126d621d6460385ebacf3d41b454157337271cb7405af012158f203d4",
  stable_hostname: "Nimo",
  stable_root_disk_serial: "50026B76873B25AB",
  stable_root_disk_wwn:
    "eui.00000000000000000026b76873b25ab5",
  stable_ssh_hostkey_algorithm: "ssh-ed25519",
  stable_ssh_hostkey_fingerprint:
    "SHA256:3c9mfrwEQ9RKbVwL8pw/kvbCFt5imaj3QCK79yynkvk",
  existing_known_hosts_match: true,
  ssh_hostkey_update: false,
  v1_witness_retained_exact: true,
  v1_witness_history_rewritten: false,
  handler_integration_required: true,
  current_machine_id_runtime_admission_authorized: false,
  production_gate_ready: false,
});
const continuityAttestation = Object.freeze({
  ...continuityAttestationBody,
  attestation_id:
    "voidwica1_" +
    crypto
      .createHash("sha256")
      .update(canonicalJson(continuityAttestationBody))
      .digest("hex"),
});
assert.equal(
  continuityAttestation.attestation_id,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_ID_V1,
);
const continuityAttestationBytes = Buffer.from(
  canonicalJson(continuityAttestation) + "\n",
  "utf8",
);
assert.equal(
  sha256Id(continuityAttestationBytes),
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_SHA256_V1,
);

const escapedCommand = FORCED_COMMAND
  .replaceAll("\\", "\\\\")
  .replaceAll('"', '\\"');
const authorizedKeysBytes = Buffer.from(
  'restrict,command="' +
    escapedCommand +
    '" ssh-ed25519 ' +
    clientKeyBlob.toString("base64") +
    "\n",
  "utf8",
);
const hostKeyBytes = Buffer.from(
  "ssh-ed25519 " + hostKeyBlob.toString("base64") + " nimo\n",
  "utf8",
);
const nodeBytes = Buffer.from("synthetic-node-binary-v24\n", "utf8");
const envBytes = Buffer.from("synthetic-env-binary\n", "utf8");
const dashBytes = Buffer.from("synthetic-dash-binary\n", "utf8");

const policySha = "sha256:" +
  crypto.createHash("sha256").update(canonicalJson(transportPolicy), "utf8")
    .digest("hex");
const forcedConfig = Object.freeze({
  authority_root: AUTHORITY_ROOT,
  marker: "VOID_BUY_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_CONFIG_V1",
  policy: transportPolicy,
  schema: "void_buy_void_allocation_custody_witness_forced_command_config_v1",
  version: 1,
  witness_filename: WITNESS_NAME,
});
const configBytes = Buffer.from(canonicalJson(forcedConfig) + "\n", "utf8");

function stat({
  type = "file",
  uid = 0,
  gid = 0,
  mode = type === "dir" ? 0o755 : 0o644,
  nlink = 1,
  size = 1,
  dev = 1,
  ino = 1,
}) {
  return Object.freeze({
    uid: BigInt(uid),
    gid: BigInt(gid),
    mode: BigInt(
      (type === "dir" ? 0o040000 : type === "symlink" ? 0o120000 : 0o100000) |
        mode,
    ),
    nlink: BigInt(nlink),
    size: BigInt(size),
    dev: BigInt(dev),
    ino: BigInt(ino),
    mtimeNs: 1n,
    ctimeNs: 1n,
    isFile() {
      return type === "file";
    },
    isDirectory() {
      return type === "dir";
    },
    isSymbolicLink() {
      return type === "symlink";
    },
  });
}

const baseFiles = new Map([
  [HANDLER_PATH, { bytes: handlerBytes, stat: stat({ uid: 0, gid: 0, mode: 0o444, size: handlerBytes.length, ino: 10 }) }],
  [NODE_PATH, { bytes: nodeBytes, stat: stat({ uid: 0, gid: 0, mode: 0o755, size: nodeBytes.length, ino: 11 }) }],
  [ENV_PATH, { bytes: envBytes, stat: stat({ uid: 0, gid: 0, mode: 0o755, size: envBytes.length, ino: 12 }) }],
  [DASH_PATH, { bytes: dashBytes, stat: stat({ uid: 0, gid: 0, mode: 0o755, size: dashBytes.length, ino: 13 }) }],
  [CONFIG_PATH, { bytes: configBytes, stat: stat({ uid: 1201, gid: 1201, mode: 0o600, size: configBytes.length, ino: 14 }) }],
  [AUTHORIZED_KEYS, { bytes: authorizedKeysBytes, stat: stat({ uid: 0, gid: 0, mode: 0o444, size: authorizedKeysBytes.length, ino: 15 }) }],
  [HOST_KEY, { bytes: hostKeyBytes, stat: stat({ uid: 0, gid: 0, mode: 0o644, size: hostKeyBytes.length, ino: 16 }) }],
  [MACHINE_ID_PATH, { bytes: Buffer.from(machineId + "\n", "utf8"), stat: stat({ uid: 0, gid: 0, mode: 0o444, size: 33, ino: 17 }) }],
  [path.join(AUTHORITY_ROOT, WITNESS_NAME), { bytes: witnessBytes, stat: stat({ uid: 1201, gid: 1201, mode: 0o600, size: witnessBytes.length, ino: 18 }) }],
  [CONTINUITY_ATTESTATION, { bytes: continuityAttestationBytes, stat: stat({ uid: 1201, gid: 1201, mode: 0o600, size: continuityAttestationBytes.length, ino: 19 }) }],
]);

function sshdOutput(overrides = {}) {
  const values = {
    permituserenvironment: "no",
    authorizedkeysfile: AUTHORIZED_KEYS,
    strictmodes: "yes",
    pubkeyauthentication: "yes",
    passwordauthentication: "no",
    kbdinteractiveauthentication: "no",
    authenticationmethods: "publickey",
    permituserrc: "no",
    ...overrides,
  };
  return (
    Object.entries(values)
      .map(([key, value]) => key + " " + value)
      .join("\n") + "\n"
  );
}

function cloneFileMap() {
  return new Map(
    [...baseFiles].map(([key, value]) => [
      key,
      { bytes: Buffer.from(value.bytes), stat: value.stat },
    ]),
  );
}

function makeIo(options = {}) {
  const files = cloneFileMap();
  for (const file of options.missingFiles || []) {
    files.delete(file);
  }
  for (const [file, replacement] of Object.entries(options.files || {})) {
    const current = files.get(file);
    files.set(file, {
      bytes: replacement.bytes
        ? Buffer.from(replacement.bytes)
        : Buffer.from(current?.bytes || ""),
      stat: replacement.stat || current?.stat,
    });
  }
  let nodeReads = 0;
  return Object.freeze({
    nowMs() {
      return 1_800_000_000_000;
    },
    hostname() {
      return options.hostname || "Nimo";
    },
    lstat(file) {
      if (file === "/bin/sh") {
        return stat({ type: "symlink", uid: 0, gid: 0, mode: 0o777, ino: 40 });
      }
      if (file === AUTHORITY_ROOT) {
        return stat({ type: "dir", uid: 1201, gid: 1201, mode: 0o700, ino: 41 });
      }
      if (files.has(file)) return files.get(file).stat;
      return stat({ type: "dir", uid: 0, gid: 0, mode: 0o755, ino: 99 });
    },
    realpath(file) {
      if (file === "/bin/sh") return DASH_PATH;
      return file;
    },
    readFileNoFollow(file) {
      const value = files.get(file);
      if (!value) throw new Error("missing_fake_file:" + file);
      if (file === NODE_PATH && options.nodeDrift === true) {
        nodeReads += 1;
        if (nodeReads > 1) {
          return Object.freeze({
            bytes: Buffer.from("synthetic-node-binary-v24-drift\n", "utf8"),
            stat: value.stat,
          });
        }
      }
      return Object.freeze({
        bytes: Buffer.from(value.bytes),
        stat: value.stat,
      });
    },
    run(command, args) {
      if (command === "/usr/bin/getent") {
        assert.deepEqual(args, ["passwd", "voidwitness"]);
        return "voidwitness:x:1201:1201::/var/lib/voidwitness:/bin/sh\n";
      }
      if (command === NODE_PATH) {
        assert.deepEqual(args, ["--version"]);
        return options.nodeVersion || "v24.19.0\n";
      }
      if (command === "/usr/sbin/sshd") {
        return sshdOutput(options.sshd || {});
      }
      if (command === "/usr/bin/findmnt") {
        return "/dev/nvme0n1p2\n";
      }
      if (command === "/usr/bin/lsblk" && args[1] === "PKNAME") {
        return "nvme0n1\n";
      }
      if (command === "/usr/bin/lsblk" && args[1] === "SERIAL,WWN") {
        return (options.diskIdentity || "SERIAL1 WWN1") + "\n";
      }
      throw new Error("unexpected_fake_command:" + command + ":" + args.join(" "));
    },
    exists(file) {
      if (file === path.join(AUTHORITY_ROOT, INTENT_NAME)) return false;
      return files.has(file);
    },
  });
}

function collect(io = makeIo()) {
  return collectBuyVoidAllocationCustodyWitnessInstallationEvidenceV2(
    config,
    io,
  );
}

const baseline = collect();
assert.equal(
  baseline.marker,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V2,
);
assert.match(baseline.collector_receipt_sha256, /^sha256:[0-9a-f]{64}$/u);
assert.equal(baseline.host_key_observed, true);
assert.equal(baseline.authorized_client_key_observed, true);
assert.equal(baseline.effective_sshd_policy_observed, true);
assert.equal(baseline.continuity_attestation_observed, true);
assert.match(baseline.installation_qualification_id, /^voidwiq2_[0-9a-f]{64}$/u);
assert.equal(baseline.client_known_hosts_content_observed, false);
assert.equal(baseline.preexec_runtime_execution_observed, false);
assert.equal(baseline.live_evidence_origin_proven, false);
assert.equal(baseline.external_transport_authenticated, false);
assert.equal(baseline.external_witness_storage_proven, false);
assert.equal(baseline.protected_high_water_custody_proven, false);
assert.equal(baseline.independent_custody_proven, false);
assert.equal(baseline.runtime_integration, false);
assert.equal(baseline.production_gate_ready, false);
assert.equal(baseline.filesystem_write_performed, false);
assert.equal(baseline.ssh_execution_performed, false);
assert.equal(baseline.witness_mutation_performed, false);
assert.equal(baseline.funds_movement, false);
assert.equal(baseline.host_identity.hostname, "Nimo");
assert.equal(
  baseline.host_identity.machine_id_sha256,
  witnessMachineIdSha,
);
assert.equal(baseline.witness_storage.witness_hostname, "Nimo");
assert.equal(
  baseline.witness_storage.witness_machine_id_sha256,
  witnessMachineIdSha,
);
assert.equal(baseline.witness_storage.root_disk_serial, undefined);
assert.equal(
  baseline.witness_storage.witness_root_disk_serial,
  "SERIAL1",
);

for (const key of [
  "filesystem_write",
  "ssh_execution",
  "key_generation",
  "authorized_keys_mutation",
  "sshd_mutation",
  "config_mutation",
  "witness_mutation",
  "service_start",
  "service_restart",
  "mount_mutation",
  "permission_mutation",
  "runtime_integration",
  "payment_acceptance",
  "wallet_or_signer_access",
  "private_key_access",
  "transaction_construction",
  "transaction_signing",
  "transaction_broadcast",
  "chain2050_write",
  "inventory_mutation",
  "market_activation",
  "public_presale_activation",
  "treasury_or_liquidity_movement",
  "funds_movement",
]) {
  assert.equal(
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_AUTHORITY_V2[
      key
    ],
    false,
    key,
  );
}

{
  const bad = makeIo({
    files: {
      [AUTHORIZED_KEYS]: {
        stat: stat({
          uid: 1201,
          gid: 1201,
          mode: 0o444,
          size: authorizedKeysBytes.length,
          ino: 15,
        }),
      },
    },
  });
  assert.throws(
    () => collect(bad),
    /witness_installation_evidence_parent_witness_installation_authorized_key_invalid/u,
  );
}

{
  const bad = makeIo({
    sshd: { strictmodes: "no" },
  });
  assert.throws(
    () => collect(bad),
    /witness_installation_evidence_sshd_invalid/u,
  );
}

{
  const bad = makeIo({
    sshd: {
      authorizedkeysfile: "/var/lib/voidwitness/.ssh/authorized_keys",
    },
  });
  assert.throws(
    () => collect(bad),
    /witness_installation_evidence_sshd_invalid/u,
  );
}

{
  const bad = makeIo({
    nodeVersion: "v22.19.0\n",
  });
  const result = collect(bad);
  assert.equal(
    result.installation_qualification_id !== baseline.installation_qualification_id,
    true,
    "a different reviewed Node major must produce a different qualification",
  );
}

{
  const badFiles = {};
  badFiles[HANDLER_PATH] = {
    bytes: Buffer.from(handlerBytes.toString("utf8") + "\n"),
    stat: stat({
      uid: 0,
      gid: 0,
      mode: 0o444,
      size: handlerBytes.length + 1,
      ino: 10,
    }),
  };
  assert.throws(
    () => collect(makeIo({ files: badFiles })),
    /witness_installation_evidence_parent_witness_installation_handler_invalid/u,
  );
}

{
  const bad = makeIo({
    diskIdentity: "SERIAL2 WWN2",
  });
  assert.throws(
    () => collect(bad),
    /witness_installation_evidence_host_witness_identity_mismatch/u,
  );
}

{
  const bad = makeIo({
    hostname: "OtherHost",
  });
  assert.throws(
    () => collect(bad),
    /witness_installation_evidence_host_witness_identity_mismatch/u,
  );
}

{
  const bad = makeIo({ nodeDrift: true });
  assert.throws(
    () => collect(bad),
    /witness_installation_evidence_changed_during_collection/u,
  );
}


{
  assert.throws(
    () => collect(makeIo({ missingFiles: [CONTINUITY_ATTESTATION] })),
    /missing_fake_file|witness_installation_evidence_file_invalid/u,
  );
}

{
  const tampered = Buffer.from(continuityAttestationBytes);
  tampered[10] ^= 1;
  assert.throws(
    () =>
      collect(
        makeIo({
          files: {
            [CONTINUITY_ATTESTATION]: {
              bytes: tampered,
              stat: stat({
                uid: 1201,
                gid: 1201,
                mode: 0o600,
                size: tampered.length,
                ino: 19,
              }),
            },
          },
        }),
      ),
    /witness_installation_evidence_continuity_attestation_invalid/u,
  );
}

{
  assert.throws(
    () =>
      collect(
        makeIo({
          files: {
            [CONTINUITY_ATTESTATION]: {
              stat: stat({
                uid: 0,
                gid: 0,
                mode: 0o600,
                size: continuityAttestationBytes.length,
                ino: 19,
              }),
            },
          },
        }),
      ),
    /witness_installation_evidence_continuity_attestation_invalid/u,
  );
}

const source = fs.readFileSync(
  "tools/void-buy-allocation-custody-witness-installation-evidence-v2.mjs",
  "utf8",
);
assert.doesNotMatch(
  source,
  /fs\.(?:writeFileSync|appendFileSync|renameSync|unlinkSync|mkdirSync|chmodSync|chownSync)\(/u,
);
assert.doesNotMatch(
  source,
  /spawnSync\(\s*["']\/usr\/bin\/ssh["']/u,
);
assert.match(source, /client_known_hosts_content_observed:\s*false/u);
assert.match(source, /preexec_runtime_execution_observed:\s*false/u);
assert.match(
  source,
  /witness_installation_evidence_host_witness_identity_mismatch/u,
);

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V2_GREEN",
);
console.log("read_only_host_observation=true");
console.log("root_owned_authorization_policy_observed=true");
console.log("effective_sshd_policy_observed=true");
console.log("v2_handler_config_command_bound=true");
console.log("continuity_attestation_observed=true");
console.log("continuity_attestation_missing_rejected=true");
console.log("continuity_attestation_tamper_rejected=true");
console.log("continuity_attestation_owner_mismatch_rejected=true");
console.log("preexec_binary_chain_observed=true");
console.log("host_witness_identity_bound=true");
console.log("double_census_stability_required=true");
console.log("content_addressed_receipt=true");
console.log("client_known_hosts_content_observed=false");
console.log("preexec_runtime_execution_observed=false");
console.log("live_evidence_origin_proven=false");
console.log("external_transport_authenticated=false");
console.log("external_witness_storage_proven=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
