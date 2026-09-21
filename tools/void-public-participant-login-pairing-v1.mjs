#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Wallet } from "ethers";

export const VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1 = Object.freeze({
  marker: "VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1",
  capability: "participant.login_key.bind.v1",
  ticket_ttl_ms: 5 * 60_000,
  max_active_ticket_files: 512,
  wallet_passphrase_public_transport: false,
  wallet_unlock_performed: false,
  signer_cache_written: false,
  transaction_signing: false,
  wallet_send_authority: false,
  work_credit_mutation_authority: false,
  validator_mutation_authority: false,
  money_movement_authority: false,
  binding_registry_mutation_authority: false,
});

const ACCOUNT_RE = /^[A-Za-z0-9._:-]{1,128}$/;
const TOKEN_RE = /^vpp1\.([0-9a-f]{32})\.([A-Za-z0-9_-]{43})$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const MAX_WALLET_RECORD_BYTES = 64 * 1024;
const MAX_PASSPHRASE_FILE_BYTES = 4096;
const TICKET_VERSION = 1;

function fail(message) {
  throw new Error(message);
}

function exactObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(label + "_object_required");
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    !actual.every((key, index) => key === expected[index])
  ) {
    fail(label + "_shape_invalid");
  }
}

function safeAccount(raw) {
  const account = String(raw || "").trim();
  if (!ACCOUNT_RE.test(account)) fail("account_invalid");
  return account;
}

function assertOwned(stat, label) {
  if (
    typeof process.getuid === "function" &&
    stat.uid !== process.getuid()
  ) {
    fail(label + "_owner_invalid");
  }
}

function canonicalRegularFile(
  raw,
  label,
  { maxBytes, exactMode = null } = {},
) {
  const input = path.resolve(String(raw || ""));
  if (!path.isAbsolute(input)) fail(label + "_absolute_required");
  const stat = fs.lstatSync(input);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail(label + "_type_invalid");
  }
  if (fs.realpathSync(input) !== input) {
    fail(label + "_path_not_canonical");
  }
  assertOwned(stat, label);
  if (
    exactMode !== null &&
    (stat.mode & 0o777) !== exactMode
  ) {
    fail(label + "_mode_invalid");
  }
  if (
    Number.isSafeInteger(maxBytes) &&
    (stat.size < 1 || stat.size > maxBytes)
  ) {
    fail(label + "_size_invalid");
  }
  return Object.freeze({ path: input, stat });
}

function ensurePrivateDirectory(raw, label) {
  const input = path.resolve(String(raw || ""));
  if (!path.isAbsolute(input)) fail(label + "_absolute_required");

  if (!fs.existsSync(input)) {
    const parent = path.dirname(input);
    const parentStat = fs.lstatSync(parent);
    if (!parentStat.isDirectory() || parentStat.isSymbolicLink()) {
      fail(label + "_parent_invalid");
    }
    fs.mkdirSync(input, { mode: 0o700 });
  }

  const stat = fs.lstatSync(input);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    fail(label + "_type_invalid");
  }
  if (fs.realpathSync(input) !== input) {
    fail(label + "_path_not_canonical");
  }
  assertOwned(stat, label);
  if ((stat.mode & 0o777) !== 0o700) {
    fail(label + "_mode_invalid");
  }
  return input;
}

function fsyncDirectory(dir) {
  const fd = fs.openSync(dir, fs.constants.O_RDONLY);
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function ticketStateDirectories(stateDir) {
  const root = ensurePrivateDirectory(stateDir, "pairing_state_dir");
  const active = path.join(root, "active");
  const consumed = path.join(root, "consumed");
  for (const [dir, label] of [
    [active, "pairing_active_dir"],
    [consumed, "pairing_consumed_dir"],
  ]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { mode: 0o700 });
    const stat = fs.lstatSync(dir);
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      fs.realpathSync(dir) !== dir
    ) {
      fail(label + "_invalid");
    }
    assertOwned(stat, label);
    if ((stat.mode & 0o777) !== 0o700) fail(label + "_mode_invalid");
  }
  return Object.freeze({ root, active, consumed });
}

function canonicalWalletRecord(raw) {
  exactObject(raw, [
    "version",
    "kind",
    "cipher",
    "kdf",
    "salt",
    "iv",
    "tag",
    "ciphertext",
    "address",
    "created_at",
    "exported_at",
  ], "wallet_record");

  if (
    raw.version !== 1 ||
    raw.kind !== "void_participant_wallet" ||
    raw.cipher !== "aes-256-gcm" ||
    raw.kdf !== "scrypt" ||
    !/^[0-9a-f]{32}$/i.test(String(raw.salt || "")) ||
    !/^[0-9a-f]{24}$/i.test(String(raw.iv || "")) ||
    !/^[0-9a-f]{32}$/i.test(String(raw.tag || "")) ||
    !/^[0-9a-f]+$/i.test(String(raw.ciphertext || "")) ||
    String(raw.ciphertext).length > 4096 ||
    !/^0x[0-9a-f]{40}$/i.test(String(raw.address || "")) ||
    !Number.isSafeInteger(Number(raw.created_at)) ||
    !Number.isSafeInteger(Number(raw.exported_at))
  ) {
    fail("wallet_record_invalid");
  }
  return raw;
}

function readWalletRecord(dataDir, account) {
  const root = path.resolve(String(dataDir || ""));
  if (!path.isAbsolute(root)) fail("data_dir_absolute_required");

  const walletRoot = path.join(root, "participant_wallets_v1");
  const rootStat = fs.lstatSync(walletRoot);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    fail("wallet_root_invalid");
  }

  const target = path.join(walletRoot, account + ".json");
  const file = canonicalRegularFile(
    target,
    "wallet_record",
    { maxBytes: MAX_WALLET_RECORD_BYTES },
  );
  return canonicalWalletRecord(
    JSON.parse(fs.readFileSync(file.path, "utf8")),
  );
}

function readLocalPassphrase(file) {
  const admitted = canonicalRegularFile(
    file,
    "wallet_passphrase_file",
    {
      maxBytes: MAX_PASSPHRASE_FILE_BYTES,
      exactMode: 0o600,
    },
  );

  const raw = fs.readFileSync(admitted.path, "utf8");
  const passphrase = raw.replace(/\r?\n$/, "");
  if (
    passphrase.length < 8 ||
    passphrase.length > 1024 ||
    /[\0\r\n]/.test(passphrase)
  ) {
    fail("wallet_passphrase_file_invalid");
  }
  return passphrase;
}

function verifyWalletOwnership(dataDir, account, passphraseFile) {
  const record = readWalletRecord(dataDir, account);
  let privateKey = "";
  try {
    const passphrase = readLocalPassphrase(passphraseFile);
    const salt = Buffer.from(record.salt, "hex");
    const iv = Buffer.from(record.iv, "hex");
    const tag = Buffer.from(record.tag, "hex");
    const ciphertext = Buffer.from(record.ciphertext, "hex");
    const key = crypto.scryptSync(passphrase, salt, 32);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    privateKey = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8").trim();

    if (!/^0x[0-9a-f]{64}$/i.test(privateKey)) {
      fail("account_authentication_failed");
    }

    const derived = new Wallet(privateKey).address.toLowerCase();
    const recorded = String(record.address).toLowerCase();
    if (derived !== recorded) {
      fail("wallet_address_binding_mismatch");
    }

    return Object.freeze({
      account,
      wallet_address: String(record.address),
    });
  } catch (error) {
    if (
      String(error?.message || error) ===
      "wallet_address_binding_mismatch"
    ) {
      throw error;
    }
    fail("account_authentication_failed");
  } finally {
    privateKey = "";
  }
}

function tokenSha256(token) {
  return crypto.createHash("sha256")
    .update(token, "utf8")
    .digest("hex");
}

function canonicalTicket(raw) {
  exactObject(raw, [
    "marker",
    "version",
    "ticket_id",
    "account",
    "wallet_address",
    "token_sha256",
    "capability",
    "issued_at_ms",
    "expires_at_ms",
  ], "pairing_ticket");

  if (
    raw.marker !== VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1.marker ||
    raw.version !== TICKET_VERSION ||
    !/^[0-9a-f]{32}$/.test(String(raw.ticket_id || "")) ||
    !ACCOUNT_RE.test(String(raw.account || "")) ||
    !/^0x[0-9a-f]{40}$/i.test(String(raw.wallet_address || "")) ||
    !SHA256_RE.test(String(raw.token_sha256 || "")) ||
    raw.capability !== VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1.capability ||
    !Number.isSafeInteger(Number(raw.issued_at_ms)) ||
    !Number.isSafeInteger(Number(raw.expires_at_ms)) ||
    Number(raw.expires_at_ms) <= Number(raw.issued_at_ms)
  ) {
    fail("pairing_ticket_invalid");
  }

  return raw;
}

function readTicket(file, label) {
  const admitted = canonicalRegularFile(
    file,
    label,
    { maxBytes: 16 * 1024, exactMode: 0o600 },
  );
  return canonicalTicket(
    JSON.parse(fs.readFileSync(admitted.path, "utf8")),
  );
}

function countTicketFiles(dir) {
  const names = fs.readdirSync(dir);
  if (
    names.length >
    VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1.max_active_ticket_files
  ) {
    fail("pairing_ticket_capacity_reached");
  }
  return names;
}

function activeTicketForAccount(activeDir, account, nowMs) {
  for (const name of countTicketFiles(activeDir)) {
    if (!/^[0-9a-f]{32}\.json$/.test(name)) {
      fail("pairing_active_namespace_invalid");
    }
    const row = readTicket(
      path.join(activeDir, name),
      "pairing_active_ticket",
    );
    if (
      row.account === account &&
      Number(row.expires_at_ms) > nowMs
    ) {
      return row;
    }
  }
  return null;
}

function writeCreateOnlyJson(file, value) {
  const fd = fs.openSync(
    file,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL,
    0o600,
  );
  try {
    const body = Buffer.from(
      JSON.stringify(value, null, 2) + "\n",
      "utf8",
    );
    fs.writeFileSync(fd, body);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fsyncDirectory(path.dirname(file));
}

export function issueVoidPublicParticipantLoginPairingV1({
  account: accountRaw,
  dataDir,
  passphraseFile,
  stateDir,
  now = () => Date.now(),
  randomBytes = crypto.randomBytes,
} = {}) {
  const account = safeAccount(accountRaw);
  const dirs = ticketStateDirectories(stateDir);
  const nowMs = Number(now());
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    fail("clock_invalid");
  }

  if (activeTicketForAccount(dirs.active, account, nowMs)) {
    fail("pairing_ticket_already_active");
  }

  const ownership = verifyWalletOwnership(
    dataDir,
    account,
    passphraseFile,
  );

  const id = Buffer.from(randomBytes(16)).toString("hex");
  const secret = Buffer.from(randomBytes(32)).toString("base64url");
  if (
    !/^[0-9a-f]{32}$/.test(id) ||
    !/^[A-Za-z0-9_-]{43}$/.test(secret)
  ) {
    fail("random_source_invalid");
  }

  const token = `vpp1.${id}.${secret}`;
  const record = canonicalTicket({
    marker: VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1.marker,
    version: TICKET_VERSION,
    ticket_id: id,
    account,
    wallet_address: ownership.wallet_address,
    token_sha256: tokenSha256(token),
    capability: VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1.capability,
    issued_at_ms: nowMs,
    expires_at_ms:
      nowMs + VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1.ticket_ttl_ms,
  });

  writeCreateOnlyJson(
    path.join(dirs.active, id + ".json"),
    record,
  );

  return Object.freeze({
    marker: VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1.marker,
    pairing_token: token,
    account,
    wallet_address: ownership.wallet_address,
    capability: record.capability,
    issued_at_ms: record.issued_at_ms,
    expires_at_ms: record.expires_at_ms,
    wallet_passphrase_public_transport: false,
    wallet_unlocked: false,
    signing_authority: false,
    money_movement_authority: false,
  });
}

export function consumeVoidPublicParticipantLoginPairingV1({
  account: accountRaw,
  pairingToken,
  stateDir,
  now = () => Date.now(),
} = {}) {
  const account = safeAccount(accountRaw);
  const token = String(pairingToken || "");
  const parsed = TOKEN_RE.exec(token);
  if (!parsed) fail("pairing_token_invalid");

  const dirs = ticketStateDirectories(stateDir);
  const activePath = path.join(dirs.active, parsed[1] + ".json");
  const consumedPath = path.join(
    dirs.consumed,
    parsed[1] + ".json",
  );

  let row;
  try {
    row = readTicket(activePath, "pairing_active_ticket");
  } catch {
    fail("pairing_ticket_unavailable");
  }

  const nowMs = Number(now());
  if (
    row.account !== account ||
    Number(row.expires_at_ms) <= nowMs ||
    row.capability !==
      VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1.capability
  ) {
    fail("pairing_ticket_unavailable");
  }

  const actual = Buffer.from(tokenSha256(token), "hex");
  const expected = Buffer.from(row.token_sha256, "hex");
  if (
    actual.length !== expected.length ||
    !crypto.timingSafeEqual(actual, expected)
  ) {
    fail("pairing_ticket_unavailable");
  }

  if (fs.existsSync(consumedPath)) {
    fail("pairing_ticket_unavailable");
  }

  try {
    fs.renameSync(activePath, consumedPath);
  } catch {
    fail("pairing_ticket_unavailable");
  }
  fsyncDirectory(dirs.active);
  fsyncDirectory(dirs.consumed);

  return Object.freeze({
    marker: VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1.marker,
    ticket_id: row.ticket_id,
    account: row.account,
    wallet_address: row.wallet_address,
    capability: row.capability,
    consumed: true,
    binding_registry_mutated: false,
    wallet_unlocked: false,
    signing_authority: false,
    money_movement_authority: false,
  });
}

function parseArgs(argv) {
  const values = { command: "" };
  if (argv.length === 0) fail("command_required");
  values.command = argv[0];
  for (let index = 1; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      fail("argument_invalid");
    }
    values[key.slice(2)] = value;
  }
  return values;
}

const isDirectRun =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) ===
    fileURLToPath(import.meta.url);

if (isDirectRun) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.command !== "issue") fail("unsupported_command");
    const result = issueVoidPublicParticipantLoginPairingV1({
      account: args.account,
      dataDir: args["data-dir"],
      passphraseFile: args["passphrase-file"],
      stateDir: args["state-dir"],
    });
    process.stdout.write(JSON.stringify(result) + "\n");
  } catch (error) {
    process.stderr.write(
      "VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1_HOLD " +
        String(error?.message || error) +
        "\n",
    );
    process.exitCode = 1;
  }
}
