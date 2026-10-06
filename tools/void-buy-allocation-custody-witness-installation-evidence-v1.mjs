#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V1 =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V1";

export const VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_AUTHORITY_V1 =
  Object.freeze({
    source_contract: true,
    read_only_host_observation: true,
    content_addressed_receipt: true,
    exact_source_head_binding: true,
    installed_handler_blob_observed: true,
    installed_config_observed: true,
    authorized_key_observed: true,
    effective_sshd_policy_observed: true,
    sshd_process_environment_observed: true,
    node_binary_observed: true,
    host_public_key_observed: true,
    preexec_negative_probe: true,
    post_sanitization_environment_probe: true,
    mutation_performed: false,
    trusted_verification_clock_proven: false,
    evidence_generation_monotonicity_proven: false,
    client_policy_origin_proven: false,
    live_ssh_authentication_performed: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    live_witness_read_performed: false,
    live_witness_append_performed: false,
    runtime_integration: false,
    protected_high_water_custody_proven: false,
    independent_custody_proven: false,
    production_gate_ready: false,
    payment_acceptance: false,
    wallet_or_signer_access: false,
    private_key_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    chain2050_write: false,
    presale_activation: false,
    market_activation: false,
    funds_movement: false,
  });

const RECEIPT_SCHEMA =
  "void_buy_void_allocation_custody_witness_installation_evidence_v1";
const QUALIFICATION_SCHEMA =
  "void_buy_void_allocation_custody_witness_installation_qualification_v1";
const QUALIFICATION_MARKER =
  "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_QUALIFICATION_V1";
const TRANSPORT_ENDPOINT_MARKER =
  "VOID_BUY_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_V1";
const CONFIG_SCHEMA =
  "void_buy_void_allocation_custody_witness_forced_command_config_v1";
const CONFIG_MARKER =
  "VOID_BUY_ALLOCATION_CUSTODY_WITNESS_FORCED_COMMAND_CONFIG_V1";
const HANDLER_RELATIVE_PATH =
  "tools/void-buy-allocation-custody-witness-forced-command-v1.mjs";
const HANDLER_PATH =
  "/usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs";
const CONFIG_PATH =
  "/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json";
const NODE_PATH = "/usr/bin/node";
const SHELL_PATH = "/bin/sh";
const SSHD_PATH = "/usr/sbin/sshd";
const SYSTEMCTL_PATH = "/usr/bin/systemctl";
const GETENT_PATH = "/usr/bin/getent";
const ENV_PATH = "/usr/bin/env";
const GIT_PATH = "/usr/bin/git";
const HOST_PUBLIC_KEY_PATH = "/etc/ssh/ssh_host_ed25519_key.pub";
const AUTHORITY_ROOT =
  "/var/lib/void-allocation-custody-witness-v1";
const WITNESS_NAME =
  "buy-void-allocation-custody-high-water-witness-v1.jsonl";
const FORCED_COMMAND =
  'test -z "$SSH_ORIGINAL_COMMAND" || exit 3; exec /usr/bin/env -i PATH=/usr/bin:/bin LANG=C LC_ALL=C VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1=1 /usr/bin/node /usr/local/libexec/void/void-buy-allocation-custody-witness-forced-command-v1.mjs --config=/etc/void/buy-void-allocation-custody-witness-forced-command-v1.json';

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

const POLICY_KEYS = Object.freeze([
  "batch_mode",
  "caller_selected_remote_command",
  "caller_selected_remote_path",
  "clear_all_forwardings",
  "client_key_algorithm",
  "client_public_key_sha256",
  "connect_timeout_ms",
  "endpoint_marker",
  "host_key_algorithm",
  "host_key_sha256",
  "identities_only",
  "known_hosts_sha256",
  "max_request_bytes",
  "max_response_bytes",
  "operation_timeout_ms",
  "permit_local_command",
  "remote_forced_command_only",
  "remote_host",
  "remote_port",
  "remote_shell_allowed",
  "remote_user",
  "request_tty",
  "strict_host_key_checking",
  "transport",
]);

const SHA256_ID = /^sha256:[0-9a-f]{64}$/u;
const SHA1 = /^[0-9a-f]{40}$/u;
const USER = /^[a-z_][a-z0-9_-]{0,31}$/u;
const HOST =
  /^(?:[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?|\[[0-9a-f:]{2,64}\])$/u;
const VERSION = /^v?[0-9]+\.[0-9]+\.[0-9]+(?:[-+][A-Za-z0-9._-]+)?$/u;
const MAX_SMALL_FILE_BYTES = 2 * 1024 * 1024;
const MAX_NODE_BYTES = 256 * 1024 * 1024;
const MAX_COMMAND_BYTES = 512 * 1024;
const MAX_ENVIRON_BYTES = 256 * 1024;

function fail(code) {
  throw new Error(code);
}

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
        .map(
          (key) =>
            JSON.stringify(key) + ":" + canonicalJson(value[key]),
        )
        .join(",") +
      "}"
    );
  }
  fail("witness_installation_evidence_noncanonical_value");
}

function canonicalLine(value) {
  return canonicalJson(value) + "\n";
}

function sha256Id(value) {
  return (
    "sha256:" +
    crypto
      .createHash("sha256")
      .update(Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8"))
      .digest("hex")
  );
}

function gitBlobSha1(bytes) {
  const header = Buffer.from("blob " + String(bytes.length) + "\0", "utf8");
  return crypto
    .createHash("sha1")
    .update(header)
    .update(bytes)
    .digest("hex");
}

function exactObject(value, keys, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code);
  }
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

function exactString(value, code) {
  if (typeof value !== "string") fail(code);
  return value;
}

function exactInteger(value, min, max, code) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    fail(code);
  }
  return value;
}

function absolutePath(value, code) {
  const text = exactString(value, code);
  if (
    !path.isAbsolute(text) ||
    path.resolve(text) !== text ||
    text.includes("\0")
  ) {
    fail(code);
  }
  return text;
}

function modeNumber(stat) {
  return Number(stat.mode & 0o7777n);
}

function sameFile(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.mode === right.mode &&
    left.uid === right.uid &&
    left.gid === right.gid &&
    left.nlink === right.nlink &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function stableReadFile(file, maxBytes) {
  const before = fs.lstatSync(file, { bigint: true });
  if (
    !before.isFile() ||
    before.isSymbolicLink() ||
    before.nlink !== 1n ||
    before.size < 1n ||
    before.size > BigInt(maxBytes)
  ) {
    fail("witness_installation_evidence_file_invalid");
  }
  const fd = fs.openSync(
    file,
    fs.constants.O_RDONLY | Number(fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    if (!sameFile(before, opened)) {
      fail("witness_installation_evidence_file_identity_changed");
    }
    const size = Number(opened.size);
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const count = fs.readSync(fd, bytes, offset, size - offset, offset);
      if (count <= 0) {
        fail("witness_installation_evidence_file_short_read");
      }
      offset += count;
    }
    const after = fs.fstatSync(fd, { bigint: true });
    const visible = fs.lstatSync(file, { bigint: true });
    if (
      !sameFile(opened, after) ||
      !sameFile(after, visible) ||
      after.size !== BigInt(bytes.length)
    ) {
      fail("witness_installation_evidence_file_changed_during_read");
    }
    return Object.freeze({ bytes, stat: after });
  } finally {
    fs.closeSync(fd);
  }
}

function execStatus(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: options.encoding === "buffer" ? undefined : "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: MAX_COMMAND_BYTES,
  });
  if (result.error) throw result.error;
  const stdout =
    options.encoding === "buffer"
      ? Buffer.from(result.stdout ?? Buffer.alloc(0))
      : String(result.stdout ?? "");
  const stderr =
    options.encoding === "buffer"
      ? Buffer.from(result.stderr ?? Buffer.alloc(0))
      : String(result.stderr ?? "");
  if (
    Buffer.byteLength(stdout) > MAX_COMMAND_BYTES ||
    Buffer.byteLength(stderr) > MAX_COMMAND_BYTES
  ) {
    fail("witness_installation_evidence_command_output_too_large");
  }
  return Object.freeze({
    status: Number(result.status),
    stdout,
    stderr,
  });
}

function execText(command, args, code, options = {}) {
  const result = execStatus(command, args, options);
  if (result.status !== 0 || typeof result.stdout !== "string") {
    fail(code);
  }
  return result.stdout;
}

function normalizePolicy(value) {
  const raw = exactObject(
    value,
    POLICY_KEYS,
    "witness_installation_evidence_policy_invalid",
  );
  if (
    raw.transport !== "ssh" ||
    typeof raw.remote_host !== "string" ||
    !HOST.test(raw.remote_host) ||
    typeof raw.remote_user !== "string" ||
    !USER.test(raw.remote_user) ||
    raw.remote_port !== 22 ||
    raw.host_key_algorithm !== "ssh-ed25519" ||
    !SHA256_ID.test(String(raw.host_key_sha256 || "")) ||
    !SHA256_ID.test(String(raw.known_hosts_sha256 || "")) ||
    raw.client_key_algorithm !== "ssh-ed25519" ||
    !SHA256_ID.test(String(raw.client_public_key_sha256 || "")) ||
    raw.endpoint_marker !== TRANSPORT_ENDPOINT_MARKER ||
    raw.batch_mode !== true ||
    raw.strict_host_key_checking !== true ||
    raw.identities_only !== true ||
    raw.request_tty !== false ||
    raw.clear_all_forwardings !== true ||
    raw.permit_local_command !== false ||
    raw.remote_forced_command_only !== true ||
    raw.remote_shell_allowed !== false ||
    raw.caller_selected_remote_command !== false ||
    raw.caller_selected_remote_path !== false ||
    raw.connect_timeout_ms !== 8_000 ||
    raw.operation_timeout_ms !== 30_000 ||
    raw.max_request_bytes !== 256 * 1024 ||
    raw.max_response_bytes !== 24 * 1024 * 1024
  ) {
    fail("witness_installation_evidence_policy_invalid");
  }
  return Object.freeze({ ...raw });
}

function pathChain(pathname) {
  const resolved = path.resolve(pathname);
  const parts = resolved.split(path.sep).filter(Boolean);
  const out = [path.parse(resolved).root];
  let current = path.parse(resolved).root;
  for (const part of parts) {
    current = path.join(current, part);
    out.push(current);
  }
  return out;
}

function rootOwnedParentChain(file, nonWritable) {
  const parent = path.dirname(file);
  for (const entry of pathChain(parent)) {
    const stat = fs.lstatSync(entry, { bigint: true });
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      stat.uid !== 0n ||
      (nonWritable && (modeNumber(stat) & 0o022) !== 0)
    ) {
      return false;
    }
  }
  return true;
}

function parsePasswd(text, expectedUser) {
  const lines = text.trimEnd().split("\n").filter(Boolean);
  if (lines.length !== 1) fail("witness_installation_evidence_passwd_invalid");
  const fields = lines[0].split(":");
  if (fields.length !== 7 || fields[0] !== expectedUser) {
    fail("witness_installation_evidence_passwd_invalid");
  }
  const uid = Number(fields[2]);
  const gid = Number(fields[3]);
  if (
    !Number.isSafeInteger(uid) ||
    !Number.isSafeInteger(gid) ||
    uid < 1 ||
    gid < 1
  ) {
    fail("witness_installation_evidence_passwd_invalid");
  }
  return Object.freeze({
    user: fields[0],
    uid,
    gid,
    home: fields[5],
    shell: fields[6],
  });
}

function parsePublicKeyFields(text, code) {
  const line = text.trim();
  const fields = line.split(/\s+/u);
  if (fields.length < 2) fail(code);
  const algorithm = fields[0];
  const encoded = fields[1];
  if (algorithm !== "ssh-ed25519" || !/^[A-Za-z0-9+/]+={0,2}$/u.test(encoded)) {
    fail(code);
  }
  const keyBlob = Buffer.from(encoded, "base64");
  if (keyBlob.length < 32 || keyBlob.toString("base64") !== encoded) {
    fail(code);
  }
  return Object.freeze({
    algorithm,
    encoded,
    key_blob_sha256: sha256Id(keyBlob),
  });
}

function splitAuthorizedKeyLine(line) {
  let quoted = false;
  let escaped = false;
  let splitAt = -1;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && /\s/u.test(ch)) {
      splitAt = i;
      break;
    }
  }
  if (quoted || escaped || splitAt <= 0) {
    fail("witness_installation_evidence_authorized_key_invalid");
  }
  const optionsText = line.slice(0, splitAt);
  const keyText = line.slice(splitAt).trim();
  return Object.freeze({ optionsText, keyText });
}

function parseAuthorizedKeyOptions(text) {
  const out = [];
  let start = 0;
  let quoted = false;
  let escaped = false;
  for (let i = 0; i <= text.length; i += 1) {
    const ch = text[i];
    if (i === text.length || (!quoted && ch === ",")) {
      const token = text.slice(start, i).trim();
      if (!token) fail("witness_installation_evidence_authorized_key_invalid");
      out.push(token);
      start = i + 1;
      continue;
    }
    if (escaped) {
      escaped = false;
    } else if (ch === "\\") {
      escaped = true;
    } else if (ch === '"') {
      quoted = !quoted;
    }
  }
  if (quoted || escaped) {
    fail("witness_installation_evidence_authorized_key_invalid");
  }
  return out;
}

function unquoteAuthorizedValue(token, prefix) {
  if (!token.startsWith(prefix + '="') || !token.endsWith('"')) {
    return null;
  }
  const inner = token.slice(prefix.length + 2, -1);
  let out = "";
  let escaped = false;
  for (const ch of inner) {
    if (escaped) {
      if (ch !== "\\" && ch !== '"') {
        fail("witness_installation_evidence_authorized_key_invalid");
      }
      out += ch;
      escaped = false;
    } else if (ch === "\\") {
      escaped = true;
    } else {
      out += ch;
    }
  }
  if (escaped) fail("witness_installation_evidence_authorized_key_invalid");
  return out;
}

export function testOnlyParseBuyVoidWitnessAuthorizedKeyV1(text) {
  if (
    typeof text !== "string" ||
    !text.endsWith("\n") ||
    text.includes("\r") ||
    text.slice(0, -1).includes("\n")
  ) {
    fail("witness_installation_evidence_authorized_key_invalid");
  }
  const line = text.slice(0, -1);
  const split = splitAuthorizedKeyLine(line);
  const optionTokens = parseAuthorizedKeyOptions(split.optionsText);
  const parsedKey = parsePublicKeyFields(
    split.keyText,
    "witness_installation_evidence_authorized_key_invalid",
  );
  const optionNames = new Set();
  const environmentOptions = [];
  let command = null;
  for (const token of optionTokens) {
    const commandValue = unquoteAuthorizedValue(token, "command");
    if (commandValue !== null) {
      if (command !== null) fail("witness_installation_evidence_authorized_key_invalid");
      command = commandValue;
      optionNames.add("command");
      continue;
    }
    const environmentValue = unquoteAuthorizedValue(token, "environment");
    if (environmentValue !== null) {
      environmentOptions.push(environmentValue);
      optionNames.add("environment");
      continue;
    }
    if (!/^[A-Za-z0-9-]+$/u.test(token)) {
      fail("witness_installation_evidence_authorized_key_invalid");
    }
    optionNames.add(token.toLowerCase());
  }
  return Object.freeze({
    line,
    option_names: Object.freeze([...optionNames].sort()),
    command,
    environment_options: Object.freeze([...environmentOptions]),
    key_algorithm: parsedKey.algorithm,
    public_key_sha256: parsedKey.key_blob_sha256,
  });
}

export function testOnlyParseBuyVoidWitnessSshdEffectiveV1(text) {
  if (typeof text !== "string") {
    fail("witness_installation_evidence_sshd_invalid");
  }
  const values = new Map();
  const acceptEnv = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const space = line.indexOf(" ");
    const key = (space < 0 ? line : line.slice(0, space)).toLowerCase();
    const value = space < 0 ? "" : line.slice(space + 1).trim();
    if (key === "acceptenv") {
      if (value) acceptEnv.push(...value.split(/\s+/u));
      continue;
    }
    if (!values.has(key)) values.set(key, value);
  }
  return Object.freeze({
    permit_user_environment: values.get("permituserenvironment") === "yes",
    permit_user_rc: values.get("permituserrc") === "yes",
    pubkey_authentication: values.get("pubkeyauthentication") !== "no",
    password_authentication: values.get("passwordauthentication") !== "no",
    kbd_interactive_authentication:
      values.get("kbdinteractiveauthentication") !== "no",
    authentication_methods: values.get("authenticationmethods") || "",
    accept_env: Object.freeze([...acceptEnv].sort()),
  });
}

function parseNullEnvironment(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length > MAX_ENVIRON_BYTES) {
    fail("witness_installation_evidence_sshd_environment_invalid");
  }
  const out = new Map();
  for (const part of bytes.toString("utf8").split("\0")) {
    if (!part) continue;
    const index = part.indexOf("=");
    if (index <= 0) {
      fail("witness_installation_evidence_sshd_environment_invalid");
    }
    const name = part.slice(0, index);
    if (out.has(name)) {
      fail("witness_installation_evidence_sshd_environment_invalid");
    }
    out.set(name, part.slice(index + 1));
  }
  return out;
}

function exactSanitizedEnvironment(text) {
  const out = new Map();
  for (const line of String(text).split("\n")) {
    if (!line) continue;
    const index = line.indexOf("=");
    if (index <= 0) fail("witness_installation_evidence_env_probe_invalid");
    const name = line.slice(0, index);
    if (out.has(name)) fail("witness_installation_evidence_env_probe_invalid");
    out.set(name, line.slice(index + 1));
  }
  const expected = new Map([
    ["PATH", "/usr/bin:/bin"],
    ["LANG", "C"],
    ["LC_ALL", "C"],
    ["VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1", "1"],
  ]);
  if (
    out.size !== expected.size ||
    [...expected].some(([key, value]) => out.get(key) !== value)
  ) {
    fail("witness_installation_evidence_env_probe_invalid");
  }
  return Object.freeze(Object.fromEntries(expected));
}

function normalizeConfig(raw) {
  const value = exactObject(
    raw,
    [
      "evidence_generation",
      "repo_root",
      "sshd_service_unit",
      "transport_policy",
    ],
    "witness_installation_evidence_config_invalid",
  );
  const repoRoot = absolutePath(
    value.repo_root,
    "witness_installation_evidence_config_invalid",
  );
  const evidenceGeneration = exactInteger(
    value.evidence_generation,
    1,
    Number.MAX_SAFE_INTEGER,
    "witness_installation_evidence_config_invalid",
  );
  const unit = exactString(
    value.sshd_service_unit,
    "witness_installation_evidence_config_invalid",
  );
  if (!/^[A-Za-z0-9_.@-]{1,128}\.service$/u.test(unit)) {
    fail("witness_installation_evidence_config_invalid");
  }
  const policy = normalizePolicy(value.transport_policy);
  return Object.freeze({
    repo_root: repoRoot,
    evidence_generation: evidenceGeneration,
    sshd_service_unit: unit,
    transport_policy: policy,
  });
}

function collect() {
  const rawConfig = process.env
    .VOID_BUY_VOID_WITNESS_INSTALLATION_EVIDENCE_CONFIG_JSON;
  if (!rawConfig) fail("witness_installation_evidence_config_env_required");
  let parsed;
  try {
    parsed = JSON.parse(rawConfig);
  } catch {
    fail("witness_installation_evidence_config_json_invalid");
  }
  const config = normalizeConfig(parsed);
  const policy = config.transport_policy;

  const sourceHead = execText(
    GIT_PATH,
    ["-C", config.repo_root, "rev-parse", "HEAD"],
    "witness_installation_evidence_git_head_failed",
  ).trim();
  if (!SHA1.test(sourceHead)) {
    fail("witness_installation_evidence_git_head_invalid");
  }
  const trackedStatus = execText(
    GIT_PATH,
    ["-C", config.repo_root, "status", "--porcelain=v1", "--untracked-files=no"],
    "witness_installation_evidence_git_status_failed",
  );
  if (trackedStatus.trim()) {
    fail("witness_installation_evidence_repository_not_clean");
  }
  const sourceBlob = execText(
    GIT_PATH,
    [
      "-C",
      config.repo_root,
      "rev-parse",
      "HEAD:" + HANDLER_RELATIVE_PATH,
    ],
    "witness_installation_evidence_source_blob_failed",
  ).trim();
  if (!SHA1.test(sourceBlob)) {
    fail("witness_installation_evidence_source_blob_invalid");
  }

  const passwd = parsePasswd(
    execText(
      GETENT_PATH,
      ["passwd", policy.remote_user],
      "witness_installation_evidence_passwd_failed",
    ),
    policy.remote_user,
  );

  const shellVisible = fs.lstatSync(SHELL_PATH, { bigint: true });
  const shellResolved = fs.realpathSync.native(SHELL_PATH);
  const shellFile = stableReadFile(shellResolved, MAX_SMALL_FILE_BYTES);

  const handlerFile = stableReadFile(HANDLER_PATH, MAX_SMALL_FILE_BYTES);
  const installedBlob = gitBlobSha1(handlerFile.bytes);

  const nodeVisible = fs.lstatSync(NODE_PATH, { bigint: true });
  const nodeResolved = fs.realpathSync.native(NODE_PATH);
  const nodeFile = stableReadFile(NODE_PATH, MAX_NODE_BYTES);
  const nodeVersion = execText(
    NODE_PATH,
    ["--version"],
    "witness_installation_evidence_node_version_failed",
    { env: { PATH: "/usr/bin:/bin", LANG: "C", LC_ALL: "C" } },
  ).trim();
  if (!VERSION.test(nodeVersion)) {
    fail("witness_installation_evidence_node_version_invalid");
  }
  const nodeMajor = Number(nodeVersion.replace(/^v/u, "").split(".")[0]);

  const configFile = stableReadFile(CONFIG_PATH, MAX_SMALL_FILE_BYTES);
  let installedConfig;
  try {
    installedConfig = JSON.parse(configFile.bytes.toString("utf8"));
  } catch {
    fail("witness_installation_evidence_installed_config_invalid");
  }
  exactObject(
    installedConfig,
    ["schema", "marker", "version", "authority_root", "witness_filename", "policy"],
    "witness_installation_evidence_installed_config_invalid",
  );
  if (
    installedConfig.schema !== CONFIG_SCHEMA ||
    installedConfig.marker !== CONFIG_MARKER ||
    installedConfig.version !== 1 ||
    installedConfig.authority_root !== AUTHORITY_ROOT ||
    installedConfig.witness_filename !== WITNESS_NAME ||
    canonicalJson(installedConfig.policy) !== canonicalJson(policy)
  ) {
    fail("witness_installation_evidence_installed_config_invalid");
  }
  const expectedConfig = Object.freeze({
    schema: CONFIG_SCHEMA,
    marker: CONFIG_MARKER,
    version: 1,
    authority_root: AUTHORITY_ROOT,
    witness_filename: WITNESS_NAME,
    policy,
  });
  if (
    configFile.bytes.toString("utf8") !== canonicalLine(expectedConfig)
  ) {
    fail("witness_installation_evidence_installed_config_not_canonical");
  }
  const policySha256 = sha256Id(canonicalJson(policy));

  const authorizedKeysPath =
    "/var/lib/" + policy.remote_user + "/.ssh/authorized_keys";
  const authorizedKeys = stableReadFile(
    authorizedKeysPath,
    MAX_SMALL_FILE_BYTES,
  );
  const parsedAuthorized = testOnlyParseBuyVoidWitnessAuthorizedKeyV1(
    authorizedKeys.bytes.toString("utf8"),
  );
  const authorizedOptions = new Set(parsedAuthorized.option_names);
  const sshParent = fs.lstatSync(path.dirname(authorizedKeysPath), {
    bigint: true,
  });
  const restrict = authorizedOptions.has("restrict");
  const exactCommand = parsedAuthorized.command === FORCED_COMMAND;

  const hostKeyFile = stableReadFile(
    HOST_PUBLIC_KEY_PATH,
    MAX_SMALL_FILE_BYTES,
  );
  const hostPublic = parsePublicKeyFields(
    hostKeyFile.bytes.toString("utf8"),
    "witness_installation_evidence_host_key_invalid",
  );
  if (
    hostPublic.algorithm !== policy.host_key_algorithm ||
    hostPublic.key_blob_sha256 !== policy.host_key_sha256 ||
    parsedAuthorized.key_algorithm !== policy.client_key_algorithm ||
    parsedAuthorized.public_key_sha256 !== policy.client_public_key_sha256
  ) {
    fail("witness_installation_evidence_key_policy_mismatch");
  }

  const sshdText = execText(
    SSHD_PATH,
    [
      "-T",
      "-C",
      "user=" + policy.remote_user + ",host=" +
        policy.remote_host + ",addr=127.0.0.1",
    ],
    "witness_installation_evidence_sshd_failed",
  );
  const sshd = testOnlyParseBuyVoidWitnessSshdEffectiveV1(sshdText);

  const mainPidText = execText(
    SYSTEMCTL_PATH,
    ["show", config.sshd_service_unit, "--property=MainPID", "--value", "--no-pager"],
    "witness_installation_evidence_sshd_pid_failed",
  ).trim();
  if (!/^[1-9][0-9]*$/u.test(mainPidText)) {
    fail("witness_installation_evidence_sshd_pid_invalid");
  }
  const sshdPid = Number(mainPidText);
  if (!Number.isSafeInteger(sshdPid)) {
    fail("witness_installation_evidence_sshd_pid_invalid");
  }
  const sshdEnvironmentBytes = fs.readFileSync(
    "/proc/" + String(sshdPid) + "/environ",
  );
  const sshdEnvironment = parseNullEnvironment(sshdEnvironmentBytes);
  const dangerousAbsent = DANGEROUS_ENVIRONMENT_NAMES.filter(
    (name) => !sshdEnvironment.has(name),
  );
  if (dangerousAbsent.length !== DANGEROUS_ENVIRONMENT_NAMES.length) {
    fail("witness_installation_evidence_sshd_dangerous_environment_present");
  }

  const originalCommandProbe = execStatus(
    SHELL_PATH,
    ["-c", FORCED_COMMAND],
    {
      env: {
        PATH: "/usr/bin:/bin",
        LANG: "C",
        LC_ALL: "C",
        SSH_ORIGINAL_COMMAND: "forbidden-client-command",
      },
    },
  );
  if (
    originalCommandProbe.status !== 3 ||
    String(originalCommandProbe.stdout) !== "" ||
    String(originalCommandProbe.stderr) !== ""
  ) {
    fail("witness_installation_evidence_original_command_probe_failed");
  }

  const envProbe = execText(
    ENV_PATH,
    [
      "-i",
      "PATH=/usr/bin:/bin",
      "LANG=C",
      "LC_ALL=C",
      "VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V1=1",
      ENV_PATH,
    ],
    "witness_installation_evidence_env_probe_failed",
  );
  const closedNodeEnvironment = exactSanitizedEnvironment(envProbe);

  const account = Object.freeze({
    dedicated_account:
      passwd.home === "/var/lib/" + policy.remote_user &&
      passwd.user === policy.remote_user,
    uid: passwd.uid,
    gid: passwd.gid,
    shell_path: passwd.shell,
    shell_resolved_path: shellResolved,
    shell_path_symlink: shellVisible.isSymbolicLink(),
    shell_regular_file: shellFile.stat.isFile(),
    shell_root_owned:
      Number(shellFile.stat.uid) === 0 && Number(shellFile.stat.gid) === 0,
    shell_uid: Number(shellFile.stat.uid),
    shell_gid: Number(shellFile.stat.gid),
    shell_mode: modeNumber(shellFile.stat),
    shell_sha256: sha256Id(shellFile.bytes),
  });

  const handler = Object.freeze({
    source_git_blob_sha1: sourceBlob,
    installed_git_blob_sha1: installedBlob,
    path: HANDLER_PATH,
    uid: Number(handlerFile.stat.uid),
    gid: Number(handlerFile.stat.gid),
    mode: modeNumber(handlerFile.stat),
    nlink: Number(handlerFile.stat.nlink),
    regular_file: handlerFile.stat.isFile(),
    symlink: false,
    root_owned_parent_chain: rootOwnedParentChain(HANDLER_PATH, true),
  });

  const node = Object.freeze({
    path: NODE_PATH,
    resolved_path: nodeResolved,
    uid: Number(nodeFile.stat.uid),
    gid: Number(nodeFile.stat.gid),
    mode: modeNumber(nodeFile.stat),
    regular_file: nodeFile.stat.isFile(),
    symlink: nodeVisible.isSymbolicLink(),
    root_owned:
      Number(nodeFile.stat.uid) === 0 && Number(nodeFile.stat.gid) === 0,
    sha256: sha256Id(nodeFile.bytes),
    node_major: nodeMajor,
    node_version: nodeVersion,
  });

  const installed = Object.freeze({
    path: CONFIG_PATH,
    uid: Number(configFile.stat.uid),
    gid: Number(configFile.stat.gid),
    mode: modeNumber(configFile.stat),
    nlink: Number(configFile.stat.nlink),
    regular_file: configFile.stat.isFile(),
    symlink: false,
    root_owned_nonwritable_parent_chain:
      rootOwnedParentChain(CONFIG_PATH, true),
    sha256: sha256Id(configFile.bytes),
    policy_sha256: policySha256,
    authority_root: AUTHORITY_ROOT,
    witness_filename: WITNESS_NAME,
  });

  const authorizedKey = Object.freeze({
    authorized_keys_path: authorizedKeysPath,
    authorized_keys_uid: Number(authorizedKeys.stat.uid),
    authorized_keys_gid: Number(authorizedKeys.stat.gid),
    authorized_keys_mode: modeNumber(authorizedKeys.stat),
    authorized_keys_nlink: Number(authorizedKeys.stat.nlink),
    authorized_keys_regular_file: authorizedKeys.stat.isFile(),
    authorized_keys_symlink: false,
    authorized_keys_parent_private:
      sshParent.isDirectory() &&
      !sshParent.isSymbolicLink() &&
      Number(sshParent.uid) === passwd.uid &&
      Number(sshParent.gid) === passwd.gid &&
      modeNumber(sshParent) === 0o700,
    key_algorithm: parsedAuthorized.key_algorithm,
    public_key_sha256: parsedAuthorized.public_key_sha256,
    restrict,
    forced_command_present: command !== null,
    forced_command: parsedAuthorized.command,
    forced_command_sha256: sha256Id(FORCED_COMMAND),
    environment_options: parsedAuthorized.environment_options,
    permit_pty: authorizedOptions.has("pty"),
    permit_agent_forwarding: authorizedOptions.has("agent-forwarding"),
    permit_port_forwarding: authorizedOptions.has("port-forwarding"),
    permit_x11_forwarding: authorizedOptions.has("x11-forwarding"),
    permit_user_rc: authorizedOptions.has("user-rc"),
    caller_selected_command: !exactCommand,
    caller_selected_path: !exactCommand,
    line_sha256: sha256Id(authorizedKeys.bytes),
  });

  const publickeyOnly =
    sshd.pubkey_authentication === true &&
    sshd.authentication_methods === "publickey";

  const sshdPacket = Object.freeze({
    permit_user_environment: sshd.permit_user_environment,
    authorized_keys_environment_allowed: sshd.permit_user_environment,
    publickey_only: publickeyOnly,
    password_authentication: sshd.password_authentication,
    kbd_interactive_authentication:
      sshd.kbd_interactive_authentication,
    accept_env: sshd.accept_env,
    effective_config_sha256: sha256Id(Buffer.from(sshdText, "utf8")),
  });

  const preexec = Object.freeze({
    original_command_rejected_before_sanitization:
      originalCommandProbe.status === 3 && exactCommand,
    environment_cleared_before_node: true,
    user_rc_executed:
      authorizedOptions.has("user-rc") || sshd.permit_user_rc,
    shell_startup_hook_executed:
      dangerousAbsent.length !== DANGEROUS_ENVIRONMENT_NAMES.length,
    dangerous_environment_absent: dangerousAbsent,
    env_path: ENV_PATH,
    node_environment: closedNodeEnvironment,
  });

  const hostBinding = Object.freeze({
    remote_host: policy.remote_host,
    remote_port: policy.remote_port,
    host_key_algorithm: hostPublic.algorithm,
    host_key_sha256: hostPublic.key_blob_sha256,
    known_hosts_sha256: policy.known_hosts_sha256,
    client_public_key_sha256: parsedAuthorized.public_key_sha256,
  });

  const collectedAtMs = Date.now();
  if (!Number.isSafeInteger(collectedAtMs) || collectedAtMs < 1) {
    fail("witness_installation_evidence_clock_invalid");
  }

  const packet = Object.freeze({
    schema: QUALIFICATION_SCHEMA,
    marker: QUALIFICATION_MARKER,
    version: 1,
    collected_at_ms: collectedAtMs,
    evidence_generation: config.evidence_generation,
    transport_policy: policy,
    account,
    handler,
    node,
    config: installed,
    authorized_key: authorizedKey,
    sshd: sshdPacket,
    preexec,
    host_binding: hostBinding,
  });

  const derivation = Object.freeze({
    source_head_sha: sourceHead,
    handler_source_git_blob_sha1: sourceBlob,
    handler_installed_git_blob_sha1: installedBlob,
    transport_policy_sha256: policySha256,
    sshd_service_unit: config.sshd_service_unit,
    sshd_main_pid: sshdPid,
    sshd_environment_sha256: sha256Id(sshdEnvironmentBytes),
    host_public_key_path: HOST_PUBLIC_KEY_PATH,
    host_public_key_blob_sha256: hostPublic.key_blob_sha256,
    authorized_keys_line_sha256: sha256Id(authorizedKeys.bytes),
    client_public_key_blob_sha256: parsedAuthorized.public_key_sha256,
    client_side_known_hosts_origin_proven: false,
  });

  const body = Object.freeze({
    schema: RECEIPT_SCHEMA,
    marker:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V1,
    version: 1,
    packet,
    derivation,
    mutation_performed: false,
    trusted_verification_clock_proven: false,
    evidence_generation_monotonicity_proven: false,
    client_policy_origin_proven: false,
    live_ssh_authentication_performed: false,
    external_transport_authenticated: false,
    external_witness_storage_proven: false,
    runtime_integration: false,
    production_gate_ready: false,
    funds_movement: false,
    authority:
      VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_AUTHORITY_V1,
  });

  return Object.freeze({
    ...body,
    packet_sha256: sha256Id(canonicalJson(packet)),
    collector_receipt_sha256: sha256Id(canonicalJson(body)),
  });
}

export function collectBuyVoidAllocationCustodyWitnessInstallationEvidenceV1(
  config,
) {
  const previous =
    process.env.VOID_BUY_VOID_WITNESS_INSTALLATION_EVIDENCE_CONFIG_JSON;
  try {
    process.env.VOID_BUY_VOID_WITNESS_INSTALLATION_EVIDENCE_CONFIG_JSON =
      JSON.stringify(config);
    return collect();
  } finally {
    if (previous === undefined) {
      delete process.env
        .VOID_BUY_VOID_WITNESS_INSTALLATION_EVIDENCE_CONFIG_JSON;
    } else {
      process.env.VOID_BUY_VOID_WITNESS_INSTALLATION_EVIDENCE_CONFIG_JSON =
        previous;
    }
  }
}

function main() {
  const result = collect();
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}

const invoked =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    main();
  } catch (error) {
    process.stderr.write(
      "HOLD " +
        (error instanceof Error ? error.message : String(error)) +
        "\n",
    );
    process.exit(2);
  }
}
