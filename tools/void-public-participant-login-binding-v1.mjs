#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  VOID_PUBLIC_PARTICIPANT_LOGIN_PAIRING_V1,
  consumeVoidPublicParticipantLoginPairingV1,
} from "./void-public-participant-login-pairing-v1.mjs";

export const VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_V1 = Object.freeze({
  marker: "VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_V1",
  registry_marker: "VOID_PUBLIC_PARTICIPANT_LOGIN_BINDINGS_V1",
  capability: "participant.account.read.v1",
  pairing_capability: "participant.login_key.bind.v1",
  wallet_passphrase_transport: false,
  wallet_private_key_access: false,
  login_private_key_access: false,
  session_authority_created: false,
  wallet_unlock_performed: false,
  transaction_signing: false,
  wallet_send_authority: false,
  work_credit_mutation_authority: false,
  validator_mutation_authority: false,
  money_movement_authority: false,
});

const ACCOUNT_RE = /^[A-Za-z0-9._:-]{1,128}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const MAX_REGISTRY_BYTES = 256 * 1024;
const MAX_BINDINGS = 1024;

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
  const value = String(raw || "").trim();
  if (!ACCOUNT_RE.test(value)) fail("account_invalid");
  return value;
}

function assertOwned(stat, label) {
  if (
    typeof process.getuid === "function" &&
    stat.uid !== process.getuid()
  ) {
    fail(label + "_owner_invalid");
  }
}

function ensurePrivateParent(file) {
  const rawPath = String(file || "");
  if (!path.isAbsolute(rawPath)) {
    fail("binding_registry_absolute_required");
  }
  const parent = path.dirname(path.resolve(rawPath));
  if (!fs.existsSync(parent)) {
    const grand = path.dirname(parent);
    const grandStat = fs.lstatSync(grand);
    if (!grandStat.isDirectory() || grandStat.isSymbolicLink()) {
      fail("binding_registry_parent_invalid");
    }
    fs.mkdirSync(parent, { mode: 0o700 });
  }
  const stat = fs.lstatSync(parent);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    fs.realpathSync(parent) !== parent
  ) {
    fail("binding_registry_parent_invalid");
  }
  assertOwned(stat, "binding_registry_parent");
  if ((stat.mode & 0o777) !== 0o700) {
    fail("binding_registry_parent_mode_invalid");
  }
  return parent;
}

function parseLoginPublicKey(raw) {
  const text = String(raw || "");
  if (
    text.length < 40 ||
    text.length > 1024 ||
    !/^[A-Za-z0-9_-]+$/.test(text)
  ) {
    fail("login_public_key_invalid");
  }
  let der;
  try {
    der = Buffer.from(text, "base64url");
  } catch {
    fail("login_public_key_invalid");
  }
  if (der.length < 32 || der.length > 512) {
    fail("login_public_key_invalid");
  }
  let key;
  try {
    key = crypto.createPublicKey({
      key: der,
      format: "der",
      type: "spki",
    });
  } catch {
    fail("login_public_key_invalid");
  }
  if (key.asymmetricKeyType !== "ed25519") {
    fail("login_public_key_type_invalid");
  }
  const canonicalDer = key.export({ type: "spki", format: "der" });
  if (!Buffer.from(canonicalDer).equals(der)) {
    fail("login_public_key_noncanonical");
  }
  const pem = key.export({ type: "spki", format: "pem" });
  const fingerprint = crypto.createHash("sha256")
    .update(canonicalDer)
    .digest("hex");
  return Object.freeze({
    pem: String(pem),
    fingerprint,
  });
}

function canonicalBinding(raw) {
  exactObject(raw, [
    "account",
    "status",
    "key_type",
    "public_key_pem",
    "public_key_fingerprint_sha256",
    "capabilities",
  ], "binding");

  const account = safeAccount(raw.account);
  if (
    raw.status !== "active" ||
    raw.key_type !== "ed25519" ||
    !SHA256_RE.test(String(raw.public_key_fingerprint_sha256 || "")) ||
    !Array.isArray(raw.capabilities) ||
    raw.capabilities.length !== 1 ||
    raw.capabilities[0] !==
      VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_V1.capability
  ) {
    fail("binding_invalid");
  }

  let key;
  try {
    key = crypto.createPublicKey(raw.public_key_pem);
  } catch {
    fail("binding_public_key_invalid");
  }
  if (key.asymmetricKeyType !== "ed25519") {
    fail("binding_public_key_type_invalid");
  }
  const fingerprint = crypto.createHash("sha256")
    .update(key.export({ type: "spki", format: "der" }))
    .digest("hex");
  if (fingerprint !== raw.public_key_fingerprint_sha256) {
    fail("binding_fingerprint_mismatch");
  }

  return Object.freeze({
    account,
    status: "active",
    key_type: "ed25519",
    public_key_pem: String(raw.public_key_pem),
    public_key_fingerprint_sha256: fingerprint,
    capabilities: [
      VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_V1.capability,
    ],
  });
}

function emptyRegistry() {
  return {
    marker:
      VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_V1.registry_marker,
    version: 1,
    bindings: [],
  };
}

function readRegistry(file) {
  const rawPath = String(file || "");
  if (!path.isAbsolute(rawPath)) {
    fail("binding_registry_absolute_required");
  }
  const target = path.resolve(rawPath);
  if (!fs.existsSync(target)) return emptyRegistry();

  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail("binding_registry_type_invalid");
  }
  if (fs.realpathSync(target) !== target) {
    fail("binding_registry_path_not_canonical");
  }
  assertOwned(stat, "binding_registry");
  if ((stat.mode & 0o777) !== 0o600) {
    fail("binding_registry_mode_invalid");
  }
  if (stat.size < 2 || stat.size > MAX_REGISTRY_BYTES) {
    fail("binding_registry_size_invalid");
  }

  const raw = JSON.parse(fs.readFileSync(target, "utf8"));
  exactObject(raw, ["marker", "version", "bindings"], "binding_registry");
  if (
    raw.marker !==
      VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_V1.registry_marker ||
    raw.version !== 1 ||
    !Array.isArray(raw.bindings) ||
    raw.bindings.length > MAX_BINDINGS
  ) {
    fail("binding_registry_invalid");
  }

  const seen = new Set();
  const bindings = raw.bindings.map((candidate) => {
    const binding = canonicalBinding(candidate);
    if (seen.has(binding.account)) {
      fail("binding_registry_duplicate_account");
    }
    seen.add(binding.account);
    return binding;
  });

  return {
    marker:
      VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_V1.registry_marker,
    version: 1,
    bindings,
  };
}

function fsyncDirectory(dir) {
  const fd = fs.openSync(dir, fs.constants.O_RDONLY);
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function writeRegistryAtomic(file, registry) {
  const rawPath = String(file || "");
  if (!path.isAbsolute(rawPath)) {
    fail("binding_registry_absolute_required");
  }
  const target = path.resolve(rawPath);
  const parent = ensurePrivateParent(target);
  const temp = path.join(
    parent,
    "." + path.basename(target) + ".tmp." +
      process.pid + "." + crypto.randomBytes(8).toString("hex"),
  );

  const body = Buffer.from(
    JSON.stringify(registry, null, 2) + "\n",
    "utf8",
  );
  if (body.length > MAX_REGISTRY_BYTES) {
    fail("binding_registry_size_invalid");
  }

  const fd = fs.openSync(
    temp,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL,
    0o600,
  );
  try {
    fs.writeFileSync(fd, body);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }

  try {
    fs.renameSync(temp, target);
    fs.chmodSync(target, 0o600);
    fsyncDirectory(parent);
  } catch (error) {
    try {
      fs.unlinkSync(temp);
    } catch (cleanupError) {
      void cleanupError;
    }
    throw error;
  }
}

function acquireRegistryLock(registryFile) {
  const rawPath = String(registryFile || "");
  if (!path.isAbsolute(rawPath)) {
    fail("binding_registry_absolute_required");
  }
  const target = path.resolve(rawPath);
  const parent = ensurePrivateParent(target);
  const lock = target + ".lock";
  const fd = fs.openSync(
    lock,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL,
    0o600,
  );
  try {
    fs.writeFileSync(
      fd,
      JSON.stringify({
        marker: "VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_LOCK_V1",
        pid: process.pid,
      }) + "\n",
    );
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fsyncDirectory(parent);
  return Object.freeze({
    release() {
      fs.unlinkSync(lock);
      fsyncDirectory(parent);
    },
  });
}

export function bindVoidPublicParticipantLoginKeyV1({
  account: accountRaw,
  pairingToken,
  loginPublicKeySpkiBase64url,
  pairingStateDir,
  bindingRegistryFile,
  now = () => Date.now(),
} = {}) {
  const account = safeAccount(accountRaw);
  const loginKey = parseLoginPublicKey(
    loginPublicKeySpkiBase64url,
  );

  const lock = acquireRegistryLock(bindingRegistryFile);
  try {
    const registry = readRegistry(bindingRegistryFile);
    if (registry.bindings.some((row) => row.account === account)) {
      fail("binding_account_exists");
    }
    if (registry.bindings.length >= MAX_BINDINGS) {
      fail("binding_registry_capacity_reached");
    }

    const paired =
      consumeVoidPublicParticipantLoginPairingV1({
        account,
        pairingToken,
        stateDir: pairingStateDir,
        now,
      });

    if (
      paired.capability !==
        VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_V1.pairing_capability ||
      paired.account !== account ||
      paired.consumed !== true
    ) {
      fail("pairing_evidence_invalid");
    }

    const entry = canonicalBinding({
      account,
      status: "active",
      key_type: "ed25519",
      public_key_pem: loginKey.pem,
      public_key_fingerprint_sha256: loginKey.fingerprint,
      capabilities: [
        VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_V1.capability,
      ],
    });

    const next = {
      marker:
        VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_V1.registry_marker,
      version: 1,
      bindings: [...registry.bindings, entry]
        .sort((a, b) => a.account.localeCompare(b.account)),
    };
    writeRegistryAtomic(bindingRegistryFile, next);

    return Object.freeze({
      marker: VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_V1.marker,
      account,
      wallet_address: paired.wallet_address,
      public_key_fingerprint_sha256:
        entry.public_key_fingerprint_sha256,
      capability:
        VOID_PUBLIC_PARTICIPANT_LOGIN_BINDING_V1.capability,
      binding_created: true,
      pairing_consumed: true,
      wallet_passphrase_transport: false,
      wallet_private_key_access: false,
      login_private_key_access: false,
      session_authority_created: false,
      wallet_unlocked: false,
      signing_authority: false,
      money_movement_authority: false,
    });
  } finally {
    lock.release();
  }
}
