#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_AUTHORITY_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V1,
  collectBuyVoidAllocationCustodyWitnessInstallationEvidenceV1,
  testOnlyParseBuyVoidWitnessAuthorizedKeyV1,
  testOnlyParseBuyVoidWitnessSshdEffectiveV1,
} from "../tools/void-buy-allocation-custody-witness-installation-evidence-v1.mjs";
import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V1,
  classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1,
} from "../src/economic/buy_void_allocation_custody_witness_installation_qualification_v1.js";

const HANDLER_PATH =
  "/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs";
const CONFIG_PATH =
  "/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json";
const NODE_PATH = "/usr/bin/node";
const HOST_PUBLIC_KEY_PATH = "/etc/ssh/ssh_host_ed25519_key.pub";
const AUTHORIZED_KEYS_PATH =
  "/var/lib/void-witness/.ssh/authorized_keys";
const FORCED_COMMAND =
  'test -z "$SSH_ORIGINAL_COMMAND" || exit 3; exec /usr/bin/env -i PATH=/usr/bin:/bin LANG=C LC_ALL=C VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1=1 /usr/bin/node /usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs --config=/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json';

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

const canonicalLine = (value: unknown): string =>
  canonicalJson(value) + "\n";

const sha256Id = (value: string | Buffer): string =>
  "sha256:" +
  crypto
    .createHash("sha256")
    .update(Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8"))
    .digest("hex");

const gitBlobSha1 = (bytes: Buffer): string =>
  crypto
    .createHash("sha1")
    .update(Buffer.from("blob " + String(bytes.length) + "\0", "utf8"))
    .update(bytes)
    .digest("hex");

type Kind = "file" | "dir" | "symlink";

function fakeStat({
  kind,
  uid,
  gid,
  mode,
  size = 0,
  ino,
}: {
  kind: Kind;
  uid: number;
  gid: number;
  mode: number;
  size?: number;
  ino: number;
}) {
  const fileType =
    kind === "file" ? 0o100000 :
    kind === "dir" ? 0o040000 :
    0o120000;
  const fullMode = BigInt(fileType | mode);
  return Object.freeze({
    dev: 1n,
    ino: BigInt(ino),
    mode: fullMode,
    uid: BigInt(uid),
    gid: BigInt(gid),
    nlink: 1n,
    size: BigInt(size),
    mtimeNs: 10n,
    ctimeNs: 11n,
    isFile: () => kind === "file",
    isDirectory: () => kind === "dir",
    isSymbolicLink: () => kind === "symlink",
  });
}

function requireOk<T>(value: T): Extract<T, { ok: true }> {
  const runtime = value as T & { ok?: boolean; reason?: string };
  if (runtime.ok !== true) {
    throw new Error(runtime.reason || "unexpected HOLD");
  }
  return value as Extract<T, { ok: true }>;
}

function expectCollectHold(
  build: () => ReturnType<typeof makeFixture>,
  mutate: (fixture: ReturnType<typeof makeFixture>) => void,
  pattern: RegExp,
): void {
  const fixture = build();
  mutate(fixture);
  assert.throws(
    () =>
      collectBuyVoidAllocationCustodyWitnessInstallationEvidenceV1(
        fixture.config,
        { io: fixture.io },
      ),
    pattern,
  );
}

function escapeAuthorizedCommand(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function sshEd25519Blob(rawKey: Buffer): Buffer {
  assert.equal(rawKey.length, 32);
  const algorithm = Buffer.from("ssh-ed25519", "ascii");
  const firstLength = Buffer.alloc(4);
  firstLength.writeUInt32BE(algorithm.length, 0);
  const secondLength = Buffer.alloc(4);
  secondLength.writeUInt32BE(rawKey.length, 0);
  return Buffer.concat([
    firstLength,
    algorithm,
    secondLength,
    rawKey,
  ]);
}

function makeFixture() {
  const handlerBytes = fs.readFileSync(
    "tools/void-buy-allocation-custody-witness-forced-command-v1.mjs",
  );
  const sourceBlob = gitBlobSha1(handlerBytes);
  assert.equal(
    sourceBlob,
    VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V1,
    "current merged forced-command source must match the qualification pin",
  );

  const clientBlob = sshEd25519Blob(Buffer.alloc(32, 0x11));
  const hostBlob = sshEd25519Blob(Buffer.alloc(32, 0x22));
  assert.equal(clientBlob.length, 51);
  assert.equal(hostBlob.length, 51);
  const clientEncoded = clientBlob.toString("base64");
  const hostEncoded = hostBlob.toString("base64");
  const clientSha = sha256Id(clientBlob);
  const hostSha = sha256Id(hostBlob);

  const policy = Object.freeze({
    transport: "ssh",
    remote_host: "nimo",
    remote_port: 22,
    remote_user: "void-witness",
    host_key_algorithm: "ssh-ed25519",
    host_key_sha256: hostSha,
    known_hosts_sha256: sha256Id("known-hosts"),
    client_key_algorithm: "ssh-ed25519",
    client_public_key_sha256: clientSha,
    endpoint_marker:
      "VOID_BUY_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_V1",
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

  const installedConfig = Object.freeze({
    schema:
      "void_buy_void_allocation_custody_witness_forced_command_config_v1",
    marker:
      "VOID_BUY_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_CONFIG_V1",
    version: 1,
    authority_root: "/var/lib/void-allocation-custody-witness-v1",
    witness_filename:
      "buy-void-allocation-custody-high-water-witness-v1.jsonl",
    policy,
  });
  const configBytes = Buffer.from(canonicalLine(installedConfig), "utf8");

  const authorizedLine =
    'restrict,command="' +
    escapeAuthorizedCommand(FORCED_COMMAND) +
    '" ssh-ed25519 ' +
    clientEncoded +
    " witness\n";
  const authorizedBytes = Buffer.from(authorizedLine, "utf8");
  const hostKeyBytes = Buffer.from(
    "ssh-ed25519 " + hostEncoded + " nimo\n",
    "utf8",
  );

  const files = new Map<string, Buffer>([
    ["/usr/bin/dash", Buffer.from("fake-dash-binary\n")],
    [HANDLER_PATH, handlerBytes],
    [NODE_PATH, Buffer.from("fake-node-binary\n")],
    [CONFIG_PATH, configBytes],
    [AUTHORIZED_KEYS_PATH, authorizedBytes],
    [HOST_PUBLIC_KEY_PATH, hostKeyBytes],
    [
      "/proc/123/environ",
      Buffer.from("PATH=/usr/bin:/bin\0LANG=C\0LC_ALL=C\0", "utf8"),
    ],
  ]);

  let nextIno = 100;
  const stats = new Map<string, ReturnType<typeof fakeStat>>();
  const setDir = (
    pathname: string,
    uid: number,
    gid: number,
    mode: number,
  ) => {
    stats.set(
      pathname,
      fakeStat({ kind: "dir", uid, gid, mode, ino: nextIno++ }),
    );
  };
  const setFile = (
    pathname: string,
    uid: number,
    gid: number,
    mode: number,
  ) => {
    const bytes = files.get(pathname);
    assert.ok(bytes);
    stats.set(
      pathname,
      fakeStat({
        kind: "file",
        uid,
        gid,
        mode,
        size: bytes.length,
        ino: nextIno++,
      }),
    );
  };

  for (const directory of [
    "/",
    "/usr",
    "/usr/local",
    "/usr/local/libexec",
    "/usr/local/libexec/void",
    "/etc",
    "/etc/void",
  ]) {
    setDir(directory, 0, 0, 0o755);
  }
  setDir("/var", 0, 0, 0o755);
  setDir("/var/lib", 0, 0, 0o755);
  setDir("/var/lib/void-witness", 1201, 1201, 0o700);
  setDir("/var/lib/void-witness/.ssh", 1201, 1201, 0o700);

  stats.set(
    "/bin/sh",
    fakeStat({ kind: "symlink", uid: 0, gid: 0, mode: 0o777, ino: nextIno++ }),
  );
  setFile("/usr/bin/dash", 0, 0, 0o755);
  setFile(HANDLER_PATH, 0, 0, 0o444);
  setFile(NODE_PATH, 0, 0, 0o755);
  setFile(CONFIG_PATH, 1201, 1201, 0o600);
  setFile(AUTHORIZED_KEYS_PATH, 1201, 1201, 0o600);
  setFile(HOST_PUBLIC_KEY_PATH, 0, 0, 0o644);

  let nextFd = 10;
  const openFiles = new Map<number, string>();

  const state = {
    dirtyGit: false,
    sourceBlob,
    nodeVersion: "v24.21.0",
    sshdText: [
      "permituserenvironment no",
      "permituserrc no",
      "pubkeyauthentication yes",
      "passwordauthentication no",
      "kbdinteractiveauthentication no",
      "authenticationmethods publickey",
      "",
    ].join("\n"),
    daemonEnvironment: files.get("/proc/123/environ")!,
    originalCommandStatus: 3,
    originalCommandStdout: "",
    originalCommandStderr: "",
    systemctlPids: ["123", "123"],
    systemctlCalls: 0,
    envProbeText: [
      "PATH=/usr/bin:/bin",
      "LANG=C",
      "LC_ALL=C",
      "VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1=1",
      "",
    ].join("\n"),
  };

  const io = {
    lstat(pathname: string) {
      const stat = stats.get(pathname);
      if (!stat) throw new Error("ENOENT:" + pathname);
      return stat;
    },
    realpath(pathname: string) {
      if (pathname === "/bin/sh") return "/usr/bin/dash";
      return pathname;
    },
    open(pathname: string) {
      if (!files.has(pathname)) throw new Error("ENOENT:" + pathname);
      const fd = nextFd++;
      openFiles.set(fd, pathname);
      return fd;
    },
    fstat(fd: number) {
      const pathname = openFiles.get(fd);
      if (!pathname) throw new Error("EBADF");
      return stats.get(pathname)!;
    },
    read(
      fd: number,
      buffer: Buffer,
      offset: number,
      length: number,
      position: number,
    ) {
      const pathname = openFiles.get(fd);
      if (!pathname) throw new Error("EBADF");
      const bytes = files.get(pathname)!;
      if (position >= bytes.length) return 0;
      const count = Math.min(length, bytes.length - position);
      bytes.copy(buffer, offset, position, position + count);
      return count;
    },
    close(fd: number) {
      openFiles.delete(fd);
    },
    readFile(pathname: string) {
      if (pathname === "/proc/123/environ") {
        return Buffer.from(state.daemonEnvironment);
      }
      const bytes = files.get(pathname);
      if (!bytes) throw new Error("ENOENT:" + pathname);
      return Buffer.from(bytes);
    },
    execStatus(command: string, args: string[]) {
      if (command === "/usr/bin/git") {
        if (args.includes("status")) {
          return {
            status: 0,
            stdout: state.dirtyGit ? " M tracked-file\n" : "",
            stderr: "",
          };
        }
        if (args.at(-1) === "HEAD") {
          return {
            status: 0,
            stdout: "1".repeat(40) + "\n",
            stderr: "",
          };
        }
        if (
          args.at(-1) ===
          "HEAD:tools/void-buy-allocation-custody-witness-forced-command-v1.mjs"
        ) {
          return {
            status: 0,
            stdout: state.sourceBlob + "\n",
            stderr: "",
          };
        }
      }
      if (command === "/usr/bin/getent") {
        return {
          status: 0,
          stdout:
            "void-witness:x:1201:1201:VOID Witness:/var/lib/void-witness:/bin/sh\n",
          stderr: "",
        };
      }
      if (command === "/usr/bin/node") {
        return { status: 0, stdout: state.nodeVersion + "\n", stderr: "" };
      }
      if (command === "/usr/sbin/sshd") {
        return { status: 0, stdout: state.sshdText, stderr: "" };
      }
      if (command === "/usr/bin/systemctl") {
        const value =
          state.systemctlPids[
            Math.min(
              state.systemctlCalls,
              state.systemctlPids.length - 1,
            )
          ];
        state.systemctlCalls += 1;
        return { status: 0, stdout: value + "\n", stderr: "" };
      }
      if (command === "/bin/sh") {
        return {
          status: state.originalCommandStatus,
          stdout: state.originalCommandStdout,
          stderr: state.originalCommandStderr,
        };
      }
      if (command === "/usr/bin/env") {
        return { status: 0, stdout: state.envProbeText, stderr: "" };
      }
      throw new Error("unexpected command:" + command + " " + args.join(" "));
    },
    nowMs() {
      return 1_800_000_000_000;
    },
  };

  const config = {
    repo_root: path.resolve("."),
    evidence_generation: 7,
    sshd_service_unit: "ssh.service",
    transport_policy: policy,
  };

  return { config, io, state, files, stats, sourceBlob };
}

const fixture = makeFixture();
const receipt =
  collectBuyVoidAllocationCustodyWitnessInstallationEvidenceV1(
    fixture.config,
    { io: fixture.io },
  );
assert.equal(
  receipt.marker,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V1,
);
assert.match(receipt.packet_sha256, /^sha256:[0-9a-f]{64}$/u);
assert.match(receipt.collector_receipt_sha256, /^sha256:[0-9a-f]{64}$/u);
assert.equal(receipt.mutation_performed, false);
assert.equal(receipt.trusted_verification_clock_proven, false);
assert.equal(receipt.evidence_generation_monotonicity_proven, false);
assert.equal(receipt.client_policy_origin_proven, false);
assert.equal(receipt.live_ssh_authentication_performed, false);
assert.equal(receipt.external_transport_authenticated, false);
assert.equal(receipt.external_witness_storage_proven, false);
assert.equal(receipt.runtime_integration, false);
assert.equal(receipt.production_gate_ready, false);
assert.equal(receipt.funds_movement, false);
assert.equal(receipt.derivation.source_head_sha, "1".repeat(40));
assert.equal(receipt.derivation.handler_source_git_blob_sha1, fixture.sourceBlob);
assert.equal(receipt.derivation.handler_installed_git_blob_sha1, fixture.sourceBlob);
assert.equal(receipt.derivation.sshd_main_pid, 123);
assert.equal(receipt.derivation.sshd_main_pid_revalidated, true);
assert.equal(receipt.packet.authorized_key.restrict, true);
assert.equal(receipt.packet.authorized_key.forced_command, FORCED_COMMAND);
assert.equal(receipt.packet.authorized_key.environment_options.length, 0);
assert.equal(receipt.packet.sshd.publickey_only, true);
assert.deepEqual(receipt.packet.sshd.accept_env, []);
assert.equal(
  receipt.packet.preexec.original_command_rejected_before_sanitization,
  true,
);
assert.equal(receipt.packet.preexec.environment_cleared_before_node, true);
assert.equal(receipt.packet.preexec.user_rc_executed, false);
assert.equal(receipt.packet.preexec.shell_startup_hook_executed, false);

const qualified = requireOk(
  classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1(
    receipt.packet,
  ),
);
assert.equal(qualified.status, "source_installation_evidence_qualified");
assert.equal(qualified.live_nimo_installed, false);
assert.equal(qualified.external_transport_authenticated, false);
assert.equal(qualified.external_witness_storage_proven, false);
assert.equal(qualified.runtime_integration, false);
assert.equal(qualified.production_gate_ready, false);

const parsedKey = testOnlyParseBuyVoidWitnessAuthorizedKeyV1(
  fixture.files.get(AUTHORIZED_KEYS_PATH)!.toString("utf8"),
);
assert.equal(parsedKey.command, FORCED_COMMAND);
assert.equal(parsedKey.option_names.includes("restrict"), true);
assert.equal(parsedKey.environment_options.length, 0);
assert.match(parsedKey.public_key_sha256, /^sha256:[0-9a-f]{64}$/u);

assert.throws(
  () =>
    testOnlyParseBuyVoidWitnessAuthorizedKeyV1(
      'restrict,command="' +
        escapeAuthorizedCommand(FORCED_COMMAND) +
        '" ssh-ed25519 ' +
        Buffer.alloc(32, 0x33).toString("base64") +
        " malformed\n",
    ),
  /witness_installation_evidence_authorized_key_invalid/u,
  "arbitrary base64 bytes must not masquerade as an OpenSSH ED25519 blob",
);

const malformedWire = Buffer.concat([
  sshEd25519Blob(Buffer.alloc(32, 0x44)),
  Buffer.from([0]),
]);
assert.throws(
  () =>
    testOnlyParseBuyVoidWitnessAuthorizedKeyV1(
      'restrict,command="' +
        escapeAuthorizedCommand(FORCED_COMMAND) +
        '" ssh-ed25519 ' +
        malformedWire.toString("base64") +
        " trailing\n",
    ),
  /witness_installation_evidence_authorized_key_invalid/u,
  "OpenSSH key blobs with trailing wire bytes must HOLD",
);

const parsedSshd = testOnlyParseBuyVoidWitnessSshdEffectiveV1(
  fixture.state.sshdText,
);
assert.equal(parsedSshd.permit_user_environment, false);
assert.equal(parsedSshd.permit_user_rc, false);
assert.equal(parsedSshd.authentication_methods, "publickey");
assert.deepEqual(parsedSshd.accept_env, []);

expectCollectHold(
  makeFixture,
  (value) => {
    value.state.dirtyGit = true;
  },
  /witness_installation_evidence_repository_not_clean/u,
);

expectCollectHold(
  makeFixture,
  (value) => {
    value.config.repo_root = "/tmp";
  },
  /witness_installation_evidence_repo_root_mismatch/u,
);

expectCollectHold(
  makeFixture,
  (value) => {
    value.state.systemctlPids = ["123", "124"];
  },
  /witness_installation_evidence_sshd_pid_changed/u,
);

expectCollectHold(
  makeFixture,
  (value) => {
    value.state.sourceBlob = "0".repeat(40);
  },
  /witness_installation_evidence_handler_blob_mismatch/u,
);

expectCollectHold(
  makeFixture,
  (value) => {
    const changed = Buffer.from("mutated-installed-handler\n");
    value.files.set(HANDLER_PATH, changed);
    const stat = value.stats.get(HANDLER_PATH)!;
    value.stats.set(
      HANDLER_PATH,
      fakeStat({
        kind: "file",
        uid: Number(stat.uid),
        gid: Number(stat.gid),
        mode: Number(stat.mode & 0o7777n),
        size: changed.length,
        ino: Number(stat.ino),
      }),
    );
  },
  /witness_installation_evidence_handler_blob_mismatch/u,
);

expectCollectHold(
  makeFixture,
  (value) => {
    value.state.sshdText += "acceptenv NODE_OPTIONS\n";
  },
  /witness_installation_preexec_invalid|unexpected HOLD/u,
);

expectCollectHold(
  makeFixture,
  (value) => {
    value.state.daemonEnvironment = Buffer.from(
      "PATH=/usr/bin:/bin\0NODE_OPTIONS=--import=/tmp/evil.mjs\0",
      "utf8",
    );
  },
  /witness_installation_evidence_sshd_dangerous_environment_present/u,
);

expectCollectHold(
  makeFixture,
  (value) => {
    value.state.originalCommandStatus = 0;
  },
  /witness_installation_evidence_original_command_probe_failed/u,
);

expectCollectHold(
  makeFixture,
  (value) => {
    value.state.envProbeText += "NODE_OPTIONS=\n";
  },
  /witness_installation_evidence_env_probe_invalid/u,
);

{
  const value = makeFixture();
  const bytes = value.files.get(AUTHORIZED_KEYS_PATH)!;
  const text = bytes.toString("utf8").replace("restrict,", "restrict,pty,");
  const changed = Buffer.from(text, "utf8");
  value.files.set(AUTHORIZED_KEYS_PATH, changed);
  const stat = value.stats.get(AUTHORIZED_KEYS_PATH)!;
  value.stats.set(
    AUTHORIZED_KEYS_PATH,
    fakeStat({
      kind: "file",
      uid: Number(stat.uid),
      gid: Number(stat.gid),
      mode: Number(stat.mode & 0o7777n),
      size: changed.length,
      ino: Number(stat.ino),
    }),
  );
  const collected =
    collectBuyVoidAllocationCustodyWitnessInstallationEvidenceV1(
      value.config,
      { io: value.io },
    );
  const held =
    classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV1(
      collected.packet,
    );
  assert.equal(held.ok, false);
  assert.match(String(held.reason), /witness_installation_authorized_key_invalid/u);
}

{
  const value = makeFixture();
  const altered = {
    ...value.config,
    transport_policy: {
      ...value.config.transport_policy,
      client_public_key_sha256: sha256Id(Buffer.alloc(32, 0x44)),
    },
  };
  assert.throws(
    () =>
      collectBuyVoidAllocationCustodyWitnessInstallationEvidenceV1(
        altered,
        { io: value.io },
      ),
    /witness_installation_evidence_installed_config_invalid|witness_installation_evidence_key_policy_mismatch/u,
  );
}

const trueKeys = new Set([
  "source_contract",
  "read_only_host_observation",
  "content_addressed_receipt",
  "exact_source_head_binding",
  "installed_handler_blob_observed",
  "installed_config_observed",
  "authorized_key_observed",
  "effective_sshd_policy_observed",
  "sshd_process_environment_observed",
  "node_binary_observed",
  "host_public_key_observed",
  "preexec_negative_probe",
  "post_sanitization_environment_probe",
]);
for (const [key, value] of Object.entries(
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_AUTHORITY_V1,
)) {
  assert.equal(value, trueKeys.has(key), key);
}

console.log(
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V1_GREEN",
);
console.log("exact_2508_packet_classifies=true");
console.log("installed_handler_blob_observed=true");
console.log("installed_config_observed=true");
console.log("authorized_key_observed=true");
console.log("effective_sshd_policy_observed=true");
console.log("sshd_process_environment_observed=true");
console.log("sshd_main_pid_revalidated=true");
console.log("collector_repo_root_bound=true");
console.log("original_command_negative_probe=true");
console.log("post_sanitization_environment_probe=true");
console.log("trusted_verification_clock_proven=false");
console.log("evidence_generation_monotonicity_proven=false");
console.log("client_policy_origin_proven=false");
console.log("live_ssh_authentication_performed=false");
console.log("external_transport_authenticated=false");
console.log("external_witness_storage_proven=false");
console.log("runtime_integration=false");
console.log("production_gate_ready=false");
console.log("funds_movement=false");
