#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V2,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V2,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_SHA256_V1,
  VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_ID_V1,
  classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV2,
} from "../dist/economic/buy_void_allocation_custody_witness_installation_qualification_v2.js";
import {
  classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1,
} from "../dist/economic/buy_void_allocation_custody_witness_transport_v1.js";
import {
  parseBuyVoidAllocationCustodyExternalWitnessJournalV1,
} from "../dist/economic/buy_void_allocation_custody_external_witness_v1.js";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V2 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V2";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_AUTHORITY_V2 =
  Object.freeze({
    source_only_tool: true,
    read_only_host_observation: true,
    descriptor_bound_file_reads: true,
    fixed_security_sensitive_paths: true,
    root_owned_authorization_policy_observed: true,
    effective_sshd_policy_observed: true,
    preexec_binary_chain_observed: true,
    local_host_key_observed: true,
    authorized_client_key_observed: true,
    witness_storage_observed: true,
    host_identity_observed: true,
    canonical_parent_classifier_required: true,
    v2_qualification_required: true,
    continuity_attestation_observed: true,
    content_addressed_receipt: true,
    client_known_hosts_content_observed: false,
    preexec_runtime_execution_observed: true,
    live_evidence_origin_proven: false,
    trusted_verification_clock_proven: false,
    evidence_generation_monotonicity_proven: false,
    filesystem_write: false,
    ssh_execution: false,
    key_generation: false,
    authorized_keys_mutation: false,
    sshd_mutation: false,
    config_mutation: false,
    witness_mutation: false,
    service_start: false,
    service_restart: false,
    mount_mutation: false,
    permission_mutation: false,
    runtime_integration: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    inventory_mutation: false,
    market_activation: false,
    public_presale_activation: false,
    treasury_or_liquidity_movement: false,
    funds_movement: false,
  });

const CONFIG_SCHEMA =
  "void_buy_void_allocation_custody_witness_installation_evidence_config_v2";
const CONFIG_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_CONFIG_V2";
const RECEIPT_SCHEMA =
  "void_buy_void_allocation_custody_witness_installation_evidence_receipt_v2";

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
const CONTINUITY_ATTESTATION_PATH =
  AUTHORITY_ROOT +
  "/buy-void-allocation-custody-witness-identity-continuity-attestation-v1.json";
const REVIEWED_CENSUS_RECEIPT_SHA256 =
  "sha256:17bdb840978606db5145696a7b5085cabbcf27dee76b35a1b57324c1021241ef";
const HISTORICAL_PREDECESSOR_WITNESS_SHA256 =
  "sha256:a73c8c674bea5ed473938ddbf4275a651272fefd4e75d212d3d2bb8c8e5cbe1a";
const HISTORICAL_PREDECESSOR_WITNESS_BYTES = 1411;
const HISTORICAL_PREDECESSOR_EVENT_COUNT = 1;
const HISTORICAL_PREDECESSOR_TIP_EVENT_SHA256 =
  "sha256:2092c92ac3117ae4ec1cd4d55627ff9e46e3bd4e3b20d1bbd848e1189d5d4654";
const HISTORICAL_MACHINE_ID_SHA256 =
  "sha256:318e4b68f99f27982112de8b2279949f685f27bef0854feea47178618e5580da";
const SUCCESSOR_MACHINE_ID_SHA256 =
  "sha256:48a3554126d621d6460385ebacf3d41b454157337271cb7405af012158f203d4";
const REVIEWED_HOSTKEY_FINGERPRINT =
  "SHA256:3c9mfrwEQ9RKbVwL8pw/kvbCFt5imaj3QCK79yynkvk";
const MAX_CONTINUITY_ATTESTATION_BYTES = 16 * 1024;
const NODE_PATH = "/usr/bin/node";
const ENV_PATH = "/usr/bin/env";
const SHELL_PATH = "/bin/sh";
const SSHD_PATH = "/usr/sbin/sshd";
const HOST_KEY_PATH = "/etc/ssh/ssh_host_ed25519_key.pub";
const AUTHORIZED_KEYS_ROOT = "/etc/ssh/authorized_keys";
const FORCED_COMMAND =
  'test -z "$SSH_ORIGINAL_COMMAND" || exit 3; exec /usr/bin/env -i PATH=/usr/bin:/bin LANG=C LC_ALL=C VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V2=1 /usr/bin/node /usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v2.mjs --config=/etc/void/buy-void-allocation-custody-witness-forced-command-v2.json';

const MAX_FILE_BYTES = 16 * 1024 * 1024;
const MAX_CONFIG_BYTES = 256 * 1024;
const DANGEROUS_ENVIRONMENT_NAMES = Object.freeze([
  "BASH_ENV",
  "BASHOPTS",
  "ENV",
  "GCONV_PATH",
  "LD_AUDIT",
  "LD_LIBRARY_PATH",
  "LD_PRELOAD",
  "NODE_OPTIONS",
  "NODE_PATH",
  "OPENSSL_CONF",
  "PS4",
  "SHELLOPTS",
]);

function fail(code) {
  throw new Error(code);
}

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
  fail("witness_installation_evidence_noncanonical_value");
}

function sha256Id(value) {
  return "sha256:" + crypto.createHash("sha256").update(value).digest("hex");
}

function gitBlobSha1(bytes) {
  return crypto
    .createHash("sha1")
    .update(Buffer.from("blob " + String(bytes.length) + "\0", "utf8"))
    .update(bytes)
    .digest("hex");
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    fail(code);
  }
  return value;
}

function exactConfig(raw) {
  const value = exactObject(
    raw,
    ["schema", "marker", "version", "transport_policy"],
    "witness_installation_evidence_config_invalid",
  );
  if (
    value.schema !== CONFIG_SCHEMA ||
    value.marker !== CONFIG_MARKER ||
    value.version !== 2
  ) {
    fail("witness_installation_evidence_config_invalid");
  }
  const policy =
    classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(
      value.transport_policy,
    );
  if (policy.ok !== true) {
    fail(
      "witness_installation_evidence_transport_" +
        String(policy.reason || "invalid"),
    );
  }
  return Object.freeze({
    transport_policy: policy.policy,
    transport_policy_sha256: policy.policy_sha256,
  });
}

function statRecord(stat) {
  return Object.freeze({
    uid: Number(stat.uid),
    gid: Number(stat.gid),
    mode: Number(stat.mode) & 0o7777,
    nlink: Number(stat.nlink),
    regular_file: stat.isFile(),
    directory: stat.isDirectory(),
    symlink: stat.isSymbolicLink(),
  });
}

function sameFile(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.mode === right.mode &&
    left.nlink === right.nlink
  );
}

function defaultIo() {
  const commandEnv = Object.freeze({
    PATH: "/usr/sbin:/usr/bin:/sbin:/bin",
    LANG: "C",
    LC_ALL: "C",
  });

  const readDescriptorBound = (
    file,
    maxBytes = MAX_FILE_BYTES,
    { testOnlyAfterOpenBeforeRead = null } = {},
  ) => {
    if (
      typeof fs.constants.O_NOFOLLOW !== "number" ||
      typeof fs.constants.O_DIRECTORY !== "number" ||
      !fs.existsSync("/proc/self/fd")
    ) {
      fail("witness_installation_evidence_descriptor_walk_unavailable");
    }
    const raw = String(file ?? "");
    if (!raw || !path.isAbsolute(raw) || raw.includes("\0")) {
      fail("witness_installation_evidence_file_invalid");
    }
    const resolved = path.resolve(raw);
    const visibleBefore = fs.lstatSync(resolved, { bigint: true });
    if (
      !visibleBefore.isFile() ||
      visibleBefore.isSymbolicLink() ||
      visibleBefore.nlink !== 1n ||
      visibleBefore.size < 1n ||
      visibleBefore.size > BigInt(maxBytes)
    ) {
      fail("witness_installation_evidence_file_invalid");
    }

    const root = path.parse(resolved).root;
    const parts = resolved
      .slice(root.length)
      .split(path.sep)
      .filter(Boolean);
    if (parts.length < 1) {
      fail("witness_installation_evidence_file_invalid");
    }

    let directoryFd = fs.openSync(
      root,
      fs.constants.O_RDONLY |
        fs.constants.O_DIRECTORY |
        fs.constants.O_NOFOLLOW,
    );
    let fd = -1;
    try {
      for (const component of parts.slice(0, -1)) {
        if (
          component === "." ||
          component === ".." ||
          component.includes("/") ||
          component.includes("\\")
        ) {
          fail("witness_installation_evidence_ancestor_invalid");
        }
        const nextFd = fs.openSync(
          path.join("/proc/self/fd", String(directoryFd), component),
          fs.constants.O_RDONLY |
            fs.constants.O_DIRECTORY |
            fs.constants.O_NOFOLLOW,
        );
        const next = fs.fstatSync(nextFd, { bigint: true });
        if (!next.isDirectory() || next.isSymbolicLink()) {
          fs.closeSync(nextFd);
          fail("witness_installation_evidence_ancestor_invalid");
        }
        fs.closeSync(directoryFd);
        directoryFd = nextFd;
      }

      const basename = parts.at(-1);
      if (
        !basename ||
        basename === "." ||
        basename === ".." ||
        basename.includes("/") ||
        basename.includes("\\")
      ) {
        fail("witness_installation_evidence_file_invalid");
      }
      fd = fs.openSync(
        path.join("/proc/self/fd", String(directoryFd), basename),
        fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
      );
      const opened = fs.fstatSync(fd, { bigint: true });
      if (
        !opened.isFile() ||
        opened.isSymbolicLink() ||
        opened.nlink !== 1n ||
        opened.size < 1n ||
        opened.size > BigInt(maxBytes) ||
        !sameFile(visibleBefore, opened)
      ) {
        fail("witness_installation_evidence_file_path_not_bound");
      }
      if (testOnlyAfterOpenBeforeRead !== null) {
        if (typeof testOnlyAfterOpenBeforeRead !== "function") {
          fail("witness_installation_evidence_test_hook_invalid");
        }
        testOnlyAfterOpenBeforeRead();
      }

      const expectedSize = Number(opened.size);
      const bytes = Buffer.alloc(expectedSize);
      let offset = 0;
      while (offset < expectedSize) {
        const count = fs.readSync(
          fd,
          bytes,
          offset,
          expectedSize - offset,
          offset,
        );
        if (count <= 0) {
          fail("witness_installation_evidence_file_short_read");
        }
        offset += count;
      }

      const probe = Buffer.alloc(1);
      const growth = fs.readSync(fd, probe, 0, 1, expectedSize);
      if (growth !== 0) {
        fail("witness_installation_evidence_file_grew_after_open");
      }

      const after = fs.fstatSync(fd, { bigint: true });
      const visibleAfter = fs.lstatSync(resolved, { bigint: true });
      if (
        bytes.length !== expectedSize ||
        !sameFile(opened, after) ||
        !sameFile(after, visibleAfter)
      ) {
        fail("witness_installation_evidence_file_changed");
      }
      return Object.freeze({ bytes, stat: opened });
    } finally {
      if (fd >= 0) {
        try { fs.closeSync(fd); } catch {}
      }
      try { fs.closeSync(directoryFd); } catch {}
    }
  };

  const runProbe = (command, args, options = {}) => {
    const result = spawnSync(command, args, {
      encoding: "utf8",
      timeout: 5_000,
      maxBuffer: 1024 * 1024,
      shell: false,
      env: options.env || commandEnv,
      input: options.input || "",
    });
    if (
      result.error ||
      result.signal ||
      !Number.isInteger(result.status) ||
      typeof result.stdout !== "string" ||
      typeof result.stderr !== "string"
    ) {
      fail("witness_installation_evidence_probe_failed");
    }
    return Object.freeze({
      status: result.status,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  };

  return Object.freeze({
    nowMs() {
      return Date.now();
    },
    hostname() {
      return os.hostname();
    },
    lstat(file) {
      return fs.lstatSync(file, { bigint: true });
    },
    realpath(file) {
      return fs.realpathSync(file);
    },
    readFileNoFollow(
      file,
      maxBytes = MAX_FILE_BYTES,
      options = {},
    ) {
      return readDescriptorBound(file, maxBytes, options);
    },
    machineIdSha256() {
      const machine = readDescriptorBound("/etc/machine-id", 4096)
        .bytes.toString("utf8").trim();
      if (!/^[0-9a-f]{32}$/u.test(machine)) {
        fail("witness_installation_evidence_machine_id_invalid");
      }
      return sha256Id(Buffer.from(machine, "utf8"));
    },
    run(command, args) {
      const result = runProbe(command, args, { env: commandEnv });
      if (result.status !== 0) {
        fail("witness_installation_evidence_command_failed");
      }
      return result.stdout;
    },
    runProbe,
    parentChainRootOwnedNonWritable(file) {
      const parent = path.dirname(path.resolve(String(file ?? "")));
      const root = path.parse(parent).root;
      const parts = parent
        .slice(root.length)
        .split(path.sep)
        .filter(Boolean);
      let fd = fs.openSync(
        root,
        fs.constants.O_RDONLY |
          fs.constants.O_DIRECTORY |
          fs.constants.O_NOFOLLOW,
      );
      let current = root;
      try {
        const validate = (opened, visible) => {
          return (
            opened.isDirectory() &&
            !opened.isSymbolicLink() &&
            visible.isDirectory() &&
            !visible.isSymbolicLink() &&
            opened.dev === visible.dev &&
            opened.ino === visible.ino &&
            opened.uid === visible.uid &&
            opened.gid === visible.gid &&
            opened.mode === visible.mode &&
            Number(opened.uid) === 0 &&
            (Number(opened.mode) & 0o022) === 0
          );
        };
        if (
          !validate(
            fs.fstatSync(fd, { bigint: true }),
            fs.lstatSync(current, { bigint: true }),
          )
        ) {
          return false;
        }
        for (const component of parts) {
          current = path.join(current, component);
          const visible = fs.lstatSync(current, { bigint: true });
          const nextFd = fs.openSync(
            path.join("/proc/self/fd", String(fd), component),
            fs.constants.O_RDONLY |
              fs.constants.O_DIRECTORY |
              fs.constants.O_NOFOLLOW,
          );
          const opened = fs.fstatSync(nextFd, { bigint: true });
          fs.closeSync(fd);
          fd = nextFd;
          if (!validate(opened, visible)) {
            return false;
          }
        }
        return true;
      } catch {
        return false;
      } finally {
        try { fs.closeSync(fd); } catch {}
      }
    },
    hostKeyOpenSshFingerprint(blob) {
      return (
        "SHA256:" +
        crypto
          .createHash("sha256")
          .update(blob)
          .digest("base64")
          .replace(/=+$/u, "")
      );
    },
    exists(file) {
      return fs.existsSync(file);
    },
  });
}

function rootOwnedNonWritableParents(io, file) {
  if (typeof io.parentChainRootOwnedNonWritable === "function") {
    return io.parentChainRootOwnedNonWritable(file) === true;
  }
  const resolved = path.resolve(file);
  const parent = path.dirname(resolved);
  const parsed = path.parse(parent);
  const parts = parent
    .slice(parsed.root.length)
    .split(path.sep)
    .filter(Boolean);
  let current = parsed.root;
  const paths = [current];
  for (const part of parts) {
    current = path.join(current, part);
    paths.push(current);
  }
  for (const candidate of paths) {
    const stat = io.lstat(candidate);
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      Number(stat.uid) !== 0 ||
      (Number(stat.mode) & 0o022) !== 0
    ) {
      return false;
    }
  }
  return true;
}

function inspectFixedFile(io, file, maxBytes = MAX_FILE_BYTES) {
  const observed = io.readFileNoFollow(file, maxBytes);
  return Object.freeze({
    bytes: observed.bytes,
    ...statRecord(observed.stat),
    root_owned_nonwritable_parent_chain:
      rootOwnedNonWritableParents(io, file),
  });
}

function parsePublicKeyBlob(text, allowComment) {
  const line = String(text).trim();
  const parts = line.split(/\s+/u);
  if (
    parts.length < 2 ||
    (!allowComment && parts.length !== 2) ||
    parts[0] !== "ssh-ed25519" ||
    !/^[A-Za-z0-9+/]+={0,2}$/u.test(parts[1])
  ) {
    fail("witness_installation_evidence_public_key_invalid");
  }
  const blob = Buffer.from(parts[1], "base64");
  if (blob.length < 51 || blob.toString("base64") !== parts[1]) {
    fail("witness_installation_evidence_public_key_invalid");
  }
  let offset = 0;
  const readString = () => {
    if (offset + 4 > blob.length) {
      fail("witness_installation_evidence_public_key_invalid");
    }
    const length = blob.readUInt32BE(offset);
    offset += 4;
    if (length < 1 || offset + length > blob.length) {
      fail("witness_installation_evidence_public_key_invalid");
    }
    const out = blob.subarray(offset, offset + length);
    offset += length;
    return out;
  };
  const algorithm = readString();
  const key = readString();
  if (
    algorithm.toString("utf8") !== "ssh-ed25519" ||
    key.length !== 32 ||
    offset !== blob.length
  ) {
    fail("witness_installation_evidence_public_key_invalid");
  }
  return Object.freeze({
    algorithm: "ssh-ed25519",
    blob,
    sha256: sha256Id(blob),
  });
}

function authorizedKeyEvidence(io, remoteUser, expectedClientKeySha256) {
  const file = AUTHORIZED_KEYS_ROOT + "/" + remoteUser;
  const observed = inspectFixedFile(io, file, 64 * 1024);
  const text = observed.bytes.toString("utf8");
  if (!text.endsWith("\n") || text.slice(0, -1).includes("\n")) {
    fail("witness_installation_evidence_authorized_keys_invalid");
  }
  const escapedCommand = FORCED_COMMAND
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"');
  const prefix =
    'restrict,command="' + escapedCommand + '" ssh-ed25519 ';
  if (!text.startsWith(prefix)) {
    fail("witness_installation_evidence_authorized_keys_invalid");
  }
  const keyToken = text.slice(prefix.length, -1);
  if (!keyToken || /\s/u.test(keyToken)) {
    fail("witness_installation_evidence_authorized_keys_invalid");
  }
  const publicKey = parsePublicKeyBlob("ssh-ed25519 " + keyToken, false);
  if (publicKey.sha256 !== expectedClientKeySha256) {
    fail("witness_installation_evidence_client_key_mismatch");
  }
  return Object.freeze({
    authorized_keys_path: file,
    authorized_keys_uid: observed.uid,
    authorized_keys_gid: observed.gid,
    authorized_keys_mode: observed.mode,
    authorized_keys_nlink: observed.nlink,
    authorized_keys_regular_file: observed.regular_file,
    authorized_keys_symlink: observed.symlink,
    authorized_keys_root_owned_nonwritable_parent_chain:
      observed.root_owned_nonwritable_parent_chain,
    line_sha256: sha256Id(observed.bytes),
    key_algorithm: publicKey.algorithm,
    public_key_sha256: publicKey.sha256,
    restrict: true,
    forced_command: FORCED_COMMAND,
    forced_command_present: true,
    forced_command_sha256: sha256Id(FORCED_COMMAND),
    environment_options: Object.freeze([]),
    permit_pty: false,
    permit_agent_forwarding: false,
    permit_port_forwarding: false,
    permit_x11_forwarding: false,
    permit_user_rc: false,
    caller_selected_command: false,
    caller_selected_path: false,
  });
}

function parseSshd(output) {
  const values = new Map();
  for (const raw of String(output).split(/\r?\n/u)) {
    const line = raw.trim();
    if (!line) continue;
    const space = line.indexOf(" ");
    if (space < 1) {
      fail("witness_installation_evidence_sshd_invalid");
    }
    const key = line.slice(0, space).toLowerCase();
    const value = line.slice(space + 1).trim();
    if (!values.has(key)) values.set(key, []);
    values.get(key).push(value);
  }
  return values;
}

function one(values, key) {
  const entries = values.get(key) || [];
  if (entries.length !== 1) {
    fail("witness_installation_evidence_sshd_invalid");
  }
  return entries[0];
}

function sshdEvidence(io, remoteUser, remoteHost) {
  const output = io.run(SSHD_PATH, [
    "-T",
    "-C",
    "user=" + remoteUser + ",host=" + remoteHost + ",addr=127.0.0.1",
  ]);
  const values = parseSshd(output);
  const acceptEnv = Object.freeze(
    (values.get("acceptenv") || [])
      .flatMap((value) => value.split(/\s+/u).filter(Boolean))
      .sort(),
  );
  if (
    one(values, "permituserenvironment") !== "no" ||
    one(values, "authorizedkeysfile") !==
      AUTHORIZED_KEYS_ROOT + "/" + remoteUser ||
    one(values, "strictmodes") !== "yes" ||
    one(values, "pubkeyauthentication") !== "yes" ||
    one(values, "passwordauthentication") !== "no" ||
    one(values, "kbdinteractiveauthentication") !== "no" ||
    one(values, "authenticationmethods") !== "publickey" ||
    one(values, "permituserrc") !== "no" ||
    acceptEnv.length !== 0
  ) {
    fail("witness_installation_evidence_sshd_invalid");
  }
  return Object.freeze({
    permit_user_environment: false,
    accept_env: acceptEnv,
    authorized_keys_file: AUTHORIZED_KEYS_ROOT + "/" + remoteUser,
    publickey_only: true,
    password_authentication: false,
    kbd_interactive_authentication: false,
    authorized_keys_environment_allowed: false,
    strict_modes: true,
    effective_config_sha256: sha256Id(Buffer.from(output, "utf8")),
  });
}

function passwdEntry(io, user) {
  const output = io.run("/usr/bin/getent", ["passwd", user]).trim();
  if (output.includes("\n")) {
    fail("witness_installation_evidence_account_invalid");
  }
  const parts = output.split(":");
  if (parts.length !== 7 || parts[0] !== user) {
    fail("witness_installation_evidence_account_invalid");
  }
  const uid = Number(parts[2]);
  const gid = Number(parts[3]);
  if (
    !Number.isSafeInteger(uid) ||
    uid < 1 ||
    !Number.isSafeInteger(gid) ||
    gid < 1 ||
    parts[6] !== SHELL_PATH
  ) {
    fail("witness_installation_evidence_account_invalid");
  }
  return Object.freeze({ uid, gid });
}

function accountEvidence(io, user) {
  const account = passwdEntry(io, user);
  const shellPathStat = io.lstat(SHELL_PATH);
  const shellResolvedPath = path.resolve(io.realpath(SHELL_PATH));
  const shell = inspectFixedFile(io, shellResolvedPath, MAX_FILE_BYTES);
  return Object.freeze({
    remote_user: user,
    uid: account.uid,
    gid: account.gid,
    shell_path: SHELL_PATH,
    shell_path_symlink: shellPathStat.isSymbolicLink(),
    shell_resolved_path: shellResolvedPath,
    shell_sha256: sha256Id(shell.bytes),
    shell_uid: shell.uid,
    shell_gid: shell.gid,
    shell_mode: shell.mode,
    shell_regular_file: shell.regular_file,
    shell_root_owned: shell.uid === 0,
    shell_root_owned_nonwritable_parent_chain:
      shell.root_owned_nonwritable_parent_chain,
    dedicated_account: true,
  });
}

function handlerEvidence(io) {
  const handler = inspectFixedFile(io, HANDLER_PATH, 2 * 1024 * 1024);
  return Object.freeze({
    path: HANDLER_PATH,
    source_git_blob_sha1:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_SOURCE_GIT_BLOB_SHA1_V2,
    installed_git_blob_sha1: gitBlobSha1(handler.bytes),
    uid: handler.uid,
    gid: handler.gid,
    mode: handler.mode,
    nlink: handler.nlink,
    regular_file: handler.regular_file,
    symlink: handler.symlink,
    root_owned_parent_chain:
      handler.root_owned_nonwritable_parent_chain,
  });
}

function executableEvidence(io, file) {
  const observed = inspectFixedFile(io, file, MAX_FILE_BYTES);
  const resolved = path.resolve(io.realpath(file));
  if (resolved !== file) {
    fail("witness_installation_evidence_executable_symlink");
  }
  return Object.freeze({
    path: file,
    resolved_path: resolved,
    sha256: sha256Id(observed.bytes),
    uid: observed.uid,
    gid: observed.gid,
    mode: observed.mode,
    regular_file: observed.regular_file,
    symlink: observed.symlink,
    root_owned: observed.uid === 0,
    root_owned_nonwritable_parent_chain:
      observed.root_owned_nonwritable_parent_chain,
  });
}

function parseCanonicalConfig(bytes) {
  if (!bytes.length || bytes.at(-1) !== 0x0a) {
    fail("witness_installation_evidence_config_file_invalid");
  }
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8").slice(0, -1));
  } catch {
    fail("witness_installation_evidence_config_file_invalid");
  }
  const raw = exactObject(
    value,
    [
      "schema",
      "marker",
      "version",
      "authority_root",
      "witness_filename",
      "policy",
    ],
    "witness_installation_evidence_config_file_invalid",
  );
  if (
    raw.schema !==
      "void_buy_void_allocation_custody_witness_forced_command_config_v1" ||
    raw.marker !==
      "VOID_BUY_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_CONFIG_V1" ||
    raw.version !== 1 ||
    raw.authority_root !== AUTHORITY_ROOT ||
    raw.witness_filename !== WITNESS_NAME ||
    canonicalJson(raw) + "\n" !== bytes.toString("utf8")
  ) {
    fail("witness_installation_evidence_config_file_invalid");
  }
  const policy =
    classifyBuyVoidAllocationCustodyWitnessTransportPolicyV1(raw.policy);
  if (policy.ok !== true) {
    fail("witness_installation_evidence_config_policy_invalid");
  }
  return Object.freeze({
    policy: policy.policy,
    policy_sha256: policy.policy_sha256,
  });
}

function configEvidence(io, expectedPolicySha256, account) {
  const config = inspectFixedFile(io, CONFIG_PATH, MAX_CONFIG_BYTES);
  const parsed = parseCanonicalConfig(config.bytes);
  if (parsed.policy_sha256 !== expectedPolicySha256) {
    fail("witness_installation_evidence_config_policy_mismatch");
  }
  return Object.freeze({
    path: CONFIG_PATH,
    sha256: sha256Id(config.bytes),
    uid: config.uid,
    gid: config.gid,
    mode: config.mode,
    nlink: config.nlink,
    regular_file: config.regular_file,
    symlink: config.symlink,
    root_owned_nonwritable_parent_chain:
      config.root_owned_nonwritable_parent_chain,
    authority_root: AUTHORITY_ROOT,
    witness_filename: WITNESS_NAME,
    policy_sha256: parsed.policy_sha256,
    owner_matches_account:
      config.uid === account.uid && config.gid === account.gid,
  });
}

function hostKeyEvidence(io, expectedSha256) {
  const observed = inspectFixedFile(io, HOST_KEY_PATH, 64 * 1024);
  const key = parsePublicKeyBlob(observed.bytes.toString("utf8"), true);
  const opensshFingerprint =
    typeof io.hostKeyOpenSshFingerprint === "function"
      ? String(io.hostKeyOpenSshFingerprint(key.blob))
      : (
          "SHA256:" +
          crypto
            .createHash("sha256")
            .update(key.blob)
            .digest("base64")
            .replace(/=+$/u, "")
        );
  if (!/^SHA256:[A-Za-z0-9+/]{43}$/u.test(opensshFingerprint)) {
    fail("witness_installation_evidence_host_key_mismatch");
  }
  if (
    key.sha256 !== expectedSha256 ||
    observed.uid !== 0 ||
    observed.gid !== 0 ||
    !observed.regular_file ||
    observed.symlink ||
    !observed.root_owned_nonwritable_parent_chain ||
    ![0o444, 0o644].includes(observed.mode)
  ) {
    fail("witness_installation_evidence_host_key_mismatch");
  }
  return Object.freeze({
    path: HOST_KEY_PATH,
    sha256: key.sha256,
    openssh_fingerprint: opensshFingerprint,
    file_sha256: sha256Id(observed.bytes),
  });
}

function machineIdentity(io) {
  if (typeof io.machineIdSha256 !== "function") {
    fail("witness_installation_evidence_machine_id_probe_missing");
  }
  const machineIdSha256 = String(io.machineIdSha256());
  if (!/^sha256:[0-9a-f]{64}$/u.test(machineIdSha256)) {
    fail("witness_installation_evidence_machine_id_invalid");
  }
  const source = io
    .run("/usr/bin/findmnt", ["-n", "-o", "SOURCE", "/"])
    .trim();
  if (!source.startsWith("/dev/")) {
    fail("witness_installation_evidence_root_source_invalid");
  }
  const parentName = io
    .run("/usr/bin/lsblk", ["-ndo", "PKNAME", source])
    .trim();
  const parent =
    parentName && /^[A-Za-z0-9._-]+$/u.test(parentName)
      ? "/dev/" + parentName
      : source;
  const identity = io
    .run("/usr/bin/lsblk", ["-ndo", "SERIAL,WWN", parent])
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
  if (identity.length !== 2) {
    fail("witness_installation_evidence_root_identity_invalid");
  }
  return Object.freeze({
    hostname: io.hostname(),
    machine_id_sha256: machineIdSha256,
    root_source: source,
    root_parent_device: parent,
    root_disk_serial: identity[0],
    root_disk_wwn: identity[1],
  });
}

function witnessStorage(io, account) {
  const rootStat = io.lstat(AUTHORITY_ROOT);
  if (
    !rootStat.isDirectory() ||
    rootStat.isSymbolicLink() ||
    Number(rootStat.uid) !== account.uid ||
    Number(rootStat.gid) !== account.gid ||
    (Number(rootStat.mode) & 0o7777) !== 0o700
  ) {
    fail("witness_installation_evidence_authority_root_invalid");
  }
  const witness = inspectFixedFile(
    io,
    path.join(AUTHORITY_ROOT, WITNESS_NAME),
    MAX_FILE_BYTES,
  );
  if (
    witness.uid !== account.uid ||
    witness.gid !== account.gid ||
    witness.mode !== 0o600
  ) {
    fail("witness_installation_evidence_witness_file_invalid");
  }
  const parsed =
    parseBuyVoidAllocationCustodyExternalWitnessJournalV1(witness.bytes);
  const intentPath = path.join(AUTHORITY_ROOT, INTENT_NAME);
  const evidence = Object.freeze({
    authority_root: AUTHORITY_ROOT,
    root_dev: String(rootStat.dev),
    root_ino: String(rootStat.ino),
    root_uid: Number(rootStat.uid),
    root_gid: Number(rootStat.gid),
    root_mode: Number(rootStat.mode) & 0o7777,
    witness_path: path.join(AUTHORITY_ROOT, WITNESS_NAME),
    witness_sha256: parsed.witness_sha256,
    witness_bytes: witness.bytes.length,
    event_count: parsed.event_count,
    tip_event_sha256: parsed.tip.event_sha256,
    witness_hostname: parsed.tip.witness_hostname,
    witness_machine_id_sha256: parsed.tip.witness_machine_id_sha256,
    witness_root_disk_serial: parsed.tip.witness_root_disk_serial,
    witness_root_disk_wwn: parsed.tip.witness_root_disk_wwn,
    intent_present: io.exists(intentPath),
  });
  return Object.freeze({
    evidence,
    bytes: Buffer.from(witness.bytes),
    parsed,
  });
}

function continuityAttestationEvidence(io, account) {
  const observed = inspectFixedFile(
    io,
    CONTINUITY_ATTESTATION_PATH,
    MAX_CONTINUITY_ATTESTATION_BYTES,
  );
  const digest = sha256Id(observed.bytes);
  if (
    digest !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_SHA256_V1 ||
    observed.uid !== account.uid ||
    observed.gid !== account.gid ||
    observed.mode !== 0o600 ||
    observed.nlink !== 1 ||
    observed.regular_file !== true ||
    observed.symlink !== false
  ) {
    fail("witness_installation_evidence_continuity_attestation_invalid");
  }

  let parsed;
  try {
    if (
      observed.bytes.length < 3 ||
      observed.bytes.at(-1) !== 0x0a
    ) {
      fail("witness_installation_evidence_continuity_attestation_invalid");
    }
    parsed = JSON.parse(
      observed.bytes.toString("utf8").slice(0, -1),
    );
  } catch {
    fail("witness_installation_evidence_continuity_attestation_invalid");
  }
  const expectedKeys = [
    "schema",
    "marker",
    "version",
    "continuity_scope",
    "census_receipt_sha256",
    "predecessor_witness_sha256",
    "predecessor_witness_bytes",
    "predecessor_event_count",
    "historical_predecessor_witness_pinned",
    "predecessor_tip_event_sha256",
    "predecessor_machine_id_sha256",
    "successor_machine_id_sha256",
    "stable_hostname",
    "stable_root_disk_serial",
    "stable_root_disk_wwn",
    "stable_ssh_hostkey_algorithm",
    "stable_ssh_hostkey_fingerprint",
    "existing_known_hosts_match",
    "ssh_hostkey_update",
    "v1_witness_retained_exact",
    "v1_witness_history_rewritten",
    "handler_integration_required",
    "current_machine_id_runtime_admission_authorized",
    "production_gate_ready",
    "attestation_id",
  ];
  exactObject(
    parsed,
    expectedKeys,
    "witness_installation_evidence_continuity_attestation_invalid",
  );
  if (
    canonicalJson(parsed) + "\n" !== observed.bytes.toString("utf8") ||
    parsed.schema !==
      "void_buy_void_allocation_custody_witness_identity_continuity_attestation_v1" ||
    parsed.marker !==
      "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_IDENTITY_CONTINUITY_ATTESTATION_V1" ||
    parsed.version !== 1 ||
    parsed.continuity_scope !== "machine_id_rotation_only" ||
    parsed.attestation_id !==
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_ID_V1 ||
    parsed.census_receipt_sha256 !== REVIEWED_CENSUS_RECEIPT_SHA256 ||
    parsed.predecessor_witness_sha256 !==
      HISTORICAL_PREDECESSOR_WITNESS_SHA256 ||
    parsed.predecessor_witness_bytes !==
      HISTORICAL_PREDECESSOR_WITNESS_BYTES ||
    parsed.predecessor_event_count !==
      HISTORICAL_PREDECESSOR_EVENT_COUNT ||
    parsed.predecessor_tip_event_sha256 !==
      HISTORICAL_PREDECESSOR_TIP_EVENT_SHA256 ||
    parsed.predecessor_machine_id_sha256 !==
      HISTORICAL_MACHINE_ID_SHA256 ||
    parsed.successor_machine_id_sha256 !== SUCCESSOR_MACHINE_ID_SHA256 ||
    parsed.historical_predecessor_witness_pinned !== true ||
    parsed.stable_ssh_hostkey_algorithm !== "ssh-ed25519" ||
    parsed.existing_known_hosts_match !== true ||
    parsed.ssh_hostkey_update !== false ||
    parsed.v1_witness_retained_exact !== true ||
    parsed.v1_witness_history_rewritten !== false ||
    parsed.handler_integration_required !== true ||
    parsed.current_machine_id_runtime_admission_authorized !== false ||
    parsed.production_gate_ready !== false
  ) {
    fail("witness_installation_evidence_continuity_attestation_invalid");
  }
  const body = { ...parsed };
  delete body.attestation_id;
  const derivedId =
    "voidwica1_" +
    crypto
      .createHash("sha256")
      .update(canonicalJson(body), "utf8")
      .digest("hex");
  if (derivedId !== parsed.attestation_id) {
    fail("witness_installation_evidence_continuity_attestation_invalid");
  }

  const qualification = Object.freeze({
    path: CONTINUITY_ATTESTATION_PATH,
    sha256: digest,
    attestation_id:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_CONTINUITY_ATTESTATION_ID_V1,
    census_receipt_sha256: REVIEWED_CENSUS_RECEIPT_SHA256,
    uid: observed.uid,
    gid: observed.gid,
    mode: observed.mode,
    nlink: observed.nlink,
    regular_file: observed.regular_file,
    symlink: observed.symlink,
  });
  return Object.freeze({
    qualification,
    record: Object.freeze({ ...parsed }),
  });
}

function classifyWitnessIdentity(
  host,
  hostKey,
  witness,
  continuity,
) {
  const tip = witness.parsed.tip;
  if (
    host.hostname !== tip.witness_hostname ||
    host.root_disk_serial !== tip.witness_root_disk_serial ||
    host.root_disk_wwn !== tip.witness_root_disk_wwn ||
    continuity.stable_hostname !== tip.witness_hostname ||
    continuity.stable_root_disk_serial !== tip.witness_root_disk_serial ||
    continuity.stable_root_disk_wwn !== tip.witness_root_disk_wwn ||
    continuity.stable_ssh_hostkey_fingerprint !==
      REVIEWED_HOSTKEY_FINGERPRINT ||
    hostKey.openssh_fingerprint !== REVIEWED_HOSTKEY_FINGERPRINT
  ) {
    fail("witness_installation_evidence_host_witness_identity_mismatch");
  }

  if (host.machine_id_sha256 === tip.witness_machine_id_sha256) {
    return Object.freeze({
      identity_path: "historical_exact",
      continuity_attestation_consumed: false,
    });
  }

  if (
    tip.witness_machine_id_sha256 !== HISTORICAL_MACHINE_ID_SHA256 ||
    host.machine_id_sha256 !== SUCCESSOR_MACHINE_ID_SHA256 ||
    continuity.predecessor_machine_id_sha256 !==
      tip.witness_machine_id_sha256 ||
    continuity.successor_machine_id_sha256 !== host.machine_id_sha256
  ) {
    fail("witness_installation_evidence_host_witness_identity_mismatch");
  }

  if (witness.bytes.length < HISTORICAL_PREDECESSOR_WITNESS_BYTES) {
    fail("witness_installation_evidence_historical_predecessor_mismatch");
  }
  const prefix = witness.bytes.subarray(
    0,
    HISTORICAL_PREDECESSOR_WITNESS_BYTES,
  );
  const historical =
    parseBuyVoidAllocationCustodyExternalWitnessJournalV1(prefix);
  if (
    sha256Id(prefix) !== HISTORICAL_PREDECESSOR_WITNESS_SHA256 ||
    historical.event_count !== HISTORICAL_PREDECESSOR_EVENT_COUNT ||
    historical.tip.event_sha256 !==
      HISTORICAL_PREDECESSOR_TIP_EVENT_SHA256
  ) {
    fail("witness_installation_evidence_historical_predecessor_mismatch");
  }

  return Object.freeze({
    identity_path: "reviewed_machine_id_continuity",
    continuity_attestation_consumed: true,
  });
}

function preexecEvidence(io, envExec) {
  if (typeof io.runProbe !== "function") {
    fail("witness_installation_evidence_preexec_probe_missing");
  }
  const baseEnv = {
    PATH: "/usr/sbin:/usr/bin:/sbin:/bin",
    LANG: "C",
    LC_ALL: "C",
  };
  const rejected = io.runProbe(
    SHELL_PATH,
    ["-c", FORCED_COMMAND],
    {
      env: {
        ...baseEnv,
        SSH_ORIGINAL_COMMAND: "caller-controlled-probe",
      },
    },
  );
  if (
    rejected.status !== 3 ||
    rejected.stdout !== "" ||
    rejected.stderr !== ""
  ) {
    fail("witness_installation_evidence_original_command_probe_failed");
  }

  const hostileEnv = { ...baseEnv };
  for (const name of DANGEROUS_ENVIRONMENT_NAMES) {
    hostileEnv[name] = "VOID_FORBIDDEN_ENV_VALUE";
  }
  const sanitized = io.runProbe(
    ENV_PATH,
    [
      "-i",
      "PATH=/usr/bin:/bin",
      "LANG=C",
      "LC_ALL=C",
      "VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V2=1",
      ENV_PATH,
    ],
    { env: hostileEnv },
  );
  const environmentLines = sanitized.stdout
    .split(/\r?\n/u)
    .filter(Boolean)
    .sort();
  const expectedLines = [
    "LANG=C",
    "LC_ALL=C",
    "PATH=/usr/bin:/bin",
    "VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V2=1",
  ].sort();
  if (
    sanitized.status !== 0 ||
    sanitized.stderr !== "" ||
    environmentLines.length !== expectedLines.length ||
    environmentLines.some(
      (line, index) => line !== expectedLines[index],
    )
  ) {
    fail("witness_installation_evidence_environment_probe_failed");
  }

  const startup = io.runProbe(
    SHELL_PATH,
    ["-c", 'printf "VOID_PREEXEC_SAFE\\n"'],
    {
      env: {
        ...baseEnv,
        ENV: "/dev/stdin",
        BASH_ENV: "/dev/stdin",
      },
      input: 'printf "VOID_PREEXEC_HOOK_RAN\\n"\n',
    },
  );
  if (
    startup.status !== 0 ||
    startup.stdout !== "VOID_PREEXEC_SAFE\n" ||
    startup.stdout.includes("VOID_PREEXEC_HOOK_RAN")
  ) {
    fail("witness_installation_evidence_startup_hook_probe_failed");
  }

  return Object.freeze({
    env_path: ENV_PATH,
    env_resolved_path: envExec.resolved_path,
    env_sha256: envExec.sha256,
    env_uid: envExec.uid,
    env_gid: envExec.gid,
    env_mode: envExec.mode,
    env_regular_file: envExec.regular_file,
    env_symlink: envExec.symlink,
    env_root_owned_nonwritable_parent_chain:
      envExec.root_owned_nonwritable_parent_chain,
    original_command_rejected_before_sanitization: true,
    environment_cleared_before_node: true,
    user_rc_executed: false,
    shell_startup_hook_executed: false,
    dangerous_environment_absent: DANGEROUS_ENVIRONMENT_NAMES,
    node_environment: Object.freeze({
      PATH: "/usr/bin:/bin",
      LANG: "C",
      LC_ALL: "C",
      VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V2: "1",
    }),
  });
}

function collectOnce(config, io, observedAtMs) {
  const policy = config.transport_policy;
  const account = accountEvidence(io, policy.remote_user);
  const handler = handlerEvidence(io);
  const nodeExec = executableEvidence(io, NODE_PATH);
  const nodeVersion = io.run(NODE_PATH, ["--version"]).trim();
  const nodeMatch =
    /^v?([0-9]+)\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9._-]+)?$/u.exec(
      nodeVersion,
    );
  if (!nodeMatch) {
    fail("witness_installation_evidence_node_version_invalid");
  }
  const envExec = executableEvidence(io, ENV_PATH);
  const configFile = configEvidence(
    io,
    config.transport_policy_sha256,
    account,
  );
  if (!configFile.owner_matches_account) {
    fail("witness_installation_evidence_config_owner_invalid");
  }
  const authorizedKey = authorizedKeyEvidence(
    io,
    policy.remote_user,
    policy.client_public_key_sha256,
  );
  const sshd = sshdEvidence(io, policy.remote_user, policy.remote_host);
  const hostKey = hostKeyEvidence(io, policy.host_key_sha256);
  const host = machineIdentity(io);
  const witness = witnessStorage(io, account);
  const continuityAttestation =
    continuityAttestationEvidence(io, account);
  const witnessIdentity = classifyWitnessIdentity(
    host,
    hostKey,
    witness,
    continuityAttestation.record,
  );

  const evidence = Object.freeze({
    schema:
      "void_buy_void_allocation_custody_witness_installation_qualification_v2",
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V2,
    version: 2,
    collected_at_ms: observedAtMs,
    evidence_generation: observedAtMs,
    transport_policy: policy,
    account,
    handler,
    node: Object.freeze({
      ...nodeExec,
      node_major: Number(nodeMatch[1]),
      node_version: nodeVersion,
    }),
    continuity_attestation: continuityAttestation.qualification,
    config: Object.freeze({
      path: configFile.path,
      sha256: configFile.sha256,
      uid: configFile.uid,
      gid: configFile.gid,
      mode: configFile.mode,
      nlink: configFile.nlink,
      regular_file: configFile.regular_file,
      symlink: configFile.symlink,
      root_owned_nonwritable_parent_chain:
        configFile.root_owned_nonwritable_parent_chain,
      authority_root: configFile.authority_root,
      witness_filename: configFile.witness_filename,
      policy_sha256: configFile.policy_sha256,
    }),
    authorized_key: authorizedKey,
    sshd,
    preexec: preexecEvidence(io, envExec),
    host_binding: Object.freeze({
      remote_host: policy.remote_host,
      remote_port: policy.remote_port,
      host_key_algorithm: "ssh-ed25519",
      host_key_sha256: hostKey.sha256,
      known_hosts_sha256: policy.known_hosts_sha256,
      client_public_key_sha256: authorizedKey.public_key_sha256,
    }),
  });

  const qualification =
    classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV2(
      evidence,
    );
  if (qualification.ok !== true) {
    fail(
      "witness_installation_evidence_parent_" +
        String(qualification.reason || "hold"),
    );
  }

  return Object.freeze({
    evidence,
    qualification,
    host,
    host_key: hostKey,
    witness: witness.evidence,
    witness_identity: witnessIdentity,
  });
}

export function testOnlyReadBuyVoidAllocationCustodyWitnessInstallationEvidenceFileV2(
  file,
  maxBytes = 4096,
  testOnlyAfterOpenBeforeRead = null,
) {
  const io = defaultIo();
  const observed = io.readFileNoFollow(
    file,
    maxBytes,
    { testOnlyAfterOpenBeforeRead },
  );
  return Buffer.from(observed.bytes);
}

export function collectBuyVoidAllocationCustodyWitnessInstallationEvidenceV2(
  rawConfig,
  injectedIo = null,
) {
  const config = exactConfig(rawConfig);
  const io = injectedIo || defaultIo();
  const observedAtMs = Number(io.nowMs());
  if (!Number.isSafeInteger(observedAtMs) || observedAtMs < 1) {
    fail("witness_installation_evidence_clock_invalid");
  }
  const first = collectOnce(config, io, observedAtMs);
  const second = collectOnce(config, io, observedAtMs);
  if (
    canonicalJson(first.evidence) !== canonicalJson(second.evidence) ||
    canonicalJson(first.host) !== canonicalJson(second.host) ||
    canonicalJson(first.witness) !== canonicalJson(second.witness) ||
    canonicalJson(first.witness_identity) !==
      canonicalJson(second.witness_identity)
  ) {
    fail("witness_installation_evidence_changed_during_collection");
  }

  const body = Object.freeze({
    schema: RECEIPT_SCHEMA,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V2,
    version: 2,
    installation_qualification_id:
      second.qualification.qualification_id,
    installation_evidence_sha256:
      sha256Id(Buffer.from(canonicalJson(second.evidence), "utf8")),
    normalized_qualification_sha256:
      sha256Id(
        Buffer.from(
          canonicalJson(second.qualification.normalized),
          "utf8",
        ),
      ),
    host_identity: second.host,
    witness_storage: second.witness,
    witness_identity_path:
      second.witness_identity.identity_path,
    continuity_attestation_consumed:
      second.witness_identity.continuity_attestation_consumed,
    host_key_observed: true,
    authorized_client_key_observed: true,
    effective_sshd_policy_observed: true,
    continuity_attestation_observed: true,
    client_known_hosts_content_observed: false,
    preexec_runtime_execution_observed: true,
    live_evidence_origin_proven: false,
    trusted_verification_clock_proven: false,
    evidence_generation_monotonicity_proven: false,
    filesystem_write_performed: false,
    ssh_execution_performed: false,
    witness_mutation_performed: false,
    host_mutation_performed: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    runtime_integration: false,
    production_gate_ready: false,
    funds_movement: false,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_AUTHORITY_V2,
  });

  return Object.freeze({
    ...body,
    collector_receipt_sha256:
      sha256Id(Buffer.from(canonicalJson(body), "utf8")),
  });
}

function main() {
  const raw = process.env
    .VOID_BUY_VOID_WITNESS_INSTALLATION_EVIDENCE_V2_CONFIG_JSON;
  if (!raw) {
    fail("witness_installation_evidence_config_env_required");
  }
  let config;
  try {
    config = JSON.parse(raw);
  } catch {
    fail("witness_installation_evidence_config_json_invalid");
  }
  const result =
    collectBuyVoidAllocationCustodyWitnessInstallationEvidenceV2(config);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(fileURLToPath(import.meta.url))
) {
  main();
}
