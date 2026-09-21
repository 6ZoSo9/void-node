#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1 = Object.freeze({
  marker: "VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1",
  login_domain: "VOID_PUBLIC_PARTICIPANT_READ_SESSION_LOGIN_V1",
  binding_registry_marker: "VOID_PUBLIC_PARTICIPANT_LOGIN_BINDINGS_V1",
  capability: "participant.account.read.v1",
  challenge_ttl_ms: 60_000,
  session_ttl_ms: 15 * 60_000,
  max_active_challenges: 256,
  max_active_sessions: 256,
  wallet_passphrase_transport: false,
  wallet_private_key_access: false,
  wallet_unlock_performed: false,
  signer_cache_written: false,
  signing_authority: false,
  wallet_send_authority: false,
  work_credit_mutation_authority: false,
  validator_mutation_authority: false,
  generic_rpc_authority: false,
});

const ACCOUNT_RE = /^[A-Za-z0-9._:-]{1,128}$/;
const HEX_32_RE = /^[0-9a-f]{32}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const TOKEN_RE = /^vps1\.([0-9a-f]{32})\.([A-Za-z0-9_-]{43})$/;
const SIGNATURE_RE = /^[A-Za-z0-9_-]{86}$/;
const MAX_BINDING_REGISTRY_BYTES = 256 * 1024;

function exactObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + "_object_required");
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    !actual.every((key, index) => key === expected[index])
  ) {
    throw new Error(label + "_shape_invalid");
  }
}

function safeAccount(raw) {
  const value = String(raw || "").trim();
  if (!ACCOUNT_RE.test(value)) throw new Error("account_invalid");
  return value;
}

function randomHex16(randomBytes) {
  return Buffer.from(randomBytes(16)).toString("hex");
}

function randomBase64Url32(randomBytes) {
  return Buffer.from(randomBytes(32)).toString("base64url");
}

function tokenDigest(token) {
  return crypto.createHash("sha256").update(token, "utf8").digest();
}

function publicKeyFingerprint(publicKey) {
  return crypto.createHash("sha256")
    .update(publicKey.export({ type: "spki", format: "der" }))
    .digest("hex");
}

function parseEd25519PublicKey(raw, expectedFingerprint) {
  if (typeof raw !== "string" || raw.length < 40 || raw.length > 1024) {
    throw new Error("binding_public_key_invalid");
  }
  const key = crypto.createPublicKey(raw);
  if (key.asymmetricKeyType !== "ed25519") {
    throw new Error("binding_public_key_type_invalid");
  }
  const fingerprint = publicKeyFingerprint(key);
  if (
    !SHA256_RE.test(String(expectedFingerprint || "")) ||
    fingerprint !== String(expectedFingerprint)
  ) {
    throw new Error("binding_public_key_fingerprint_mismatch");
  }
  return Object.freeze({ key, fingerprint });
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
  if (raw.status !== "active") throw new Error("binding_status_invalid");
  if (raw.key_type !== "ed25519") throw new Error("binding_key_type_invalid");
  if (
    !Array.isArray(raw.capabilities) ||
    raw.capabilities.length !== 1 ||
    raw.capabilities[0] !== VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.capability
  ) {
    throw new Error("binding_capability_invalid");
  }
  const parsed = parseEd25519PublicKey(
    raw.public_key_pem,
    raw.public_key_fingerprint_sha256,
  );
  return Object.freeze({
    account,
    status: "active",
    capability: VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.capability,
    public_key: parsed.key,
    public_key_fingerprint_sha256: parsed.fingerprint,
  });
}

function assertOwned(stat, label) {
  if (
    typeof process.getuid === "function" &&
    stat.uid !== process.getuid()
  ) {
    throw new Error(label + "_owner_invalid");
  }
}

function readBindingRegistry(file) {
  const rawPath = String(file || "");
  if (!path.isAbsolute(rawPath)) {
    throw new Error("binding_registry_absolute_required");
  }
  const input = path.resolve(rawPath);
  const parent = path.dirname(input);
  const parentStat = fs.lstatSync(parent);
  if (
    !parentStat.isDirectory() ||
    parentStat.isSymbolicLink() ||
    fs.realpathSync(parent) !== parent
  ) {
    throw new Error("binding_registry_parent_invalid");
  }
  assertOwned(parentStat, "binding_registry_parent");
  if ((parentStat.mode & 0o777) !== 0o700) {
    throw new Error("binding_registry_parent_mode_invalid");
  }

  const stat = fs.lstatSync(input);
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error("binding_registry_type_invalid");
  }
  if (fs.realpathSync(input) !== input) {
    throw new Error("binding_registry_path_not_canonical");
  }
  assertOwned(stat, "binding_registry");
  if ((stat.mode & 0o777) !== 0o600) {
    throw new Error("binding_registry_mode_invalid");
  }
  if (stat.size < 2 || stat.size > MAX_BINDING_REGISTRY_BYTES) {
    throw new Error("binding_registry_size_invalid");
  }

  const raw = JSON.parse(fs.readFileSync(input, "utf8"));
  exactObject(raw, ["marker", "version", "bindings"], "binding_registry");
  if (
    raw.marker !== VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.binding_registry_marker ||
    raw.version !== 1 ||
    !Array.isArray(raw.bindings)
  ) {
    throw new Error("binding_registry_invalid");
  }

  const map = new Map();
  for (const candidate of raw.bindings) {
    const binding = canonicalBinding(candidate);
    if (map.has(binding.account)) throw new Error("binding_registry_duplicate_account");
    map.set(binding.account, binding);
  }
  return map;
}

function loginSigningBytes(row) {
  const value = [
    VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.login_domain,
    row.account,
    row.id,
    row.nonce,
    row.issued_at_ms,
    row.expires_at_ms,
    VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.capability,
  ];
  return Buffer.from(JSON.stringify(value), "utf8");
}

function signatureBytes(raw) {
  const text = String(raw || "");
  if (!SIGNATURE_RE.test(text)) throw new Error("login_signature_invalid");
  const bytes = Buffer.from(text, "base64url");
  if (bytes.length !== 64) throw new Error("login_signature_invalid");
  return bytes;
}

export function createVoidPublicParticipantReadSessionV1({
  bindingRegistryFile,
  now = () => Date.now(),
  randomBytes = crypto.randomBytes,
} = {}) {
  if (!bindingRegistryFile) {
    throw new Error("binding_authority_required");
  }

  const challenges = new Map();
  const sessions = new Map();

  const resolveBinding = (account) => {
    try {
      return readBindingRegistry(bindingRegistryFile).get(account) || null;
    } catch {
      return null;
    }
  };

  const purge = () => {
    const current = Number(now());
    for (const [id, row] of challenges) {
      if (row.expires_at_ms <= current || row.consumed) challenges.delete(id);
    }
    for (const [id, row] of sessions) {
      if (row.expires_at_ms <= current || row.revoked) sessions.delete(id);
    }
  };

  const challenge = (accountRaw) => {
    purge();
    if (challenges.size >= VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.max_active_challenges) {
      throw new Error("challenge_capacity_reached");
    }
    const account = safeAccount(accountRaw);
    const id = randomHex16(randomBytes);
    const nonce = randomBase64Url32(randomBytes);
    const issuedAt = Number(now());
    const row = {
      id,
      nonce,
      account,
      issued_at_ms: issuedAt,
      expires_at_ms:
        issuedAt + VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.challenge_ttl_ms,
      consumed: false,
    };
    challenges.set(id, row);
    return Object.freeze({
      marker: VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.marker,
      challenge_id: id,
      nonce,
      account,
      capability: VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.capability,
      signing_domain: VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.login_domain,
      signing_payload_base64url: loginSigningBytes(row).toString("base64url"),
      issued_at_ms: row.issued_at_ms,
      expires_at_ms: row.expires_at_ms,
    });
  };

  const login = (raw) => {
    purge();
    exactObject(raw, [
      "challenge_id",
      "nonce",
      "account",
      "signature_base64url",
    ], "login");

    const account = safeAccount(raw.account);
    const id = String(raw.challenge_id || "");
    if (!HEX_32_RE.test(id)) throw new Error("challenge_invalid");
    const row = challenges.get(id);
    if (!row || row.consumed) throw new Error("challenge_unavailable");

    row.consumed = true;
    challenges.delete(id);

    if (
      row.account !== account ||
      row.nonce !== String(raw.nonce || "") ||
      row.expires_at_ms <= Number(now())
    ) {
      throw new Error("account_authentication_failed");
    }

    const binding = resolveBinding(account);
    if (!binding) throw new Error("account_authentication_failed");

    let signature;
    try {
      signature = signatureBytes(raw.signature_base64url);
    } catch {
      throw new Error("account_authentication_failed");
    }

    if (!crypto.verify(null, loginSigningBytes(row), binding.public_key, signature)) {
      throw new Error("account_authentication_failed");
    }

    purge();
    if (sessions.size >= VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.max_active_sessions) {
      throw new Error("session_capacity_reached");
    }

    const sessionId = randomHex16(randomBytes);
    const secret = randomBase64Url32(randomBytes);
    const token = `vps1.${sessionId}.${secret}`;
    const issuedAt = Number(now());
    sessions.set(sessionId, {
      token_sha256: tokenDigest(token),
      account,
      public_key_fingerprint_sha256:
        binding.public_key_fingerprint_sha256,
      capability: VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.capability,
      issued_at_ms: issuedAt,
      expires_at_ms:
        issuedAt + VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.session_ttl_ms,
      revoked: false,
    });

    return Object.freeze({
      marker: VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.marker,
      session_token: token,
      account,
      public_key_fingerprint_sha256:
        binding.public_key_fingerprint_sha256,
      capability: VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.capability,
      issued_at_ms: issuedAt,
      expires_at_ms:
        issuedAt + VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.session_ttl_ms,
      wallet_unlocked: false,
      signing_authority: false,
      money_movement_authority: false,
    });
  };

  const authorize = (authorization, accountRaw) => {
    purge();
    const match = /^Bearer (vps1\.[A-Za-z0-9._-]+)$/.exec(
      String(authorization || ""),
    );
    if (!match) throw new Error("session_authorization_required");

    const token = match[1];
    const parsed = TOKEN_RE.exec(token);
    if (!parsed) throw new Error("session_token_invalid");

    const row = sessions.get(parsed[1]);
    if (!row || row.revoked || row.expires_at_ms <= Number(now())) {
      throw new Error("session_unavailable");
    }

    const actual = tokenDigest(token);
    if (
      actual.length !== row.token_sha256.length ||
      !crypto.timingSafeEqual(actual, row.token_sha256)
    ) {
      throw new Error("session_token_invalid");
    }

    const account = safeAccount(accountRaw);
    if (account !== row.account) throw new Error("session_account_mismatch");
    if (row.capability !== VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.capability) {
      throw new Error("session_capability_mismatch");
    }

    const currentBinding = resolveBinding(account);
    if (
      !currentBinding ||
      currentBinding.public_key_fingerprint_sha256 !==
        row.public_key_fingerprint_sha256
    ) {
      throw new Error("session_binding_stale");
    }

    return Object.freeze({
      account: row.account,
      public_key_fingerprint_sha256:
        row.public_key_fingerprint_sha256,
      capability: row.capability,
      read_only: true,
      wallet_unlocked: false,
      signing_authority: false,
      money_movement_authority: false,
    });
  };

  const logout = (authorization) => {
    const match = /^Bearer (vps1\.[A-Za-z0-9._-]+)$/.exec(
      String(authorization || ""),
    );
    if (!match) return false;

    const parsed = TOKEN_RE.exec(match[1]);
    if (!parsed) return false;

    const row = sessions.get(parsed[1]);
    if (!row) return false;

    const actual = tokenDigest(match[1]);
    if (
      actual.length !== row.token_sha256.length ||
      !crypto.timingSafeEqual(actual, row.token_sha256)
    ) {
      return false;
    }

    row.revoked = true;
    sessions.delete(parsed[1]);
    return true;
  };

  return Object.freeze({
    challenge,
    login,
    authorize,
    logout,
    authority: VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1,
  });
}
