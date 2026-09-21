#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Wallet } from "ethers";

export const VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1 = Object.freeze({
  marker: "VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1",
  capability: "participant.account.read.v1",
  challenge_ttl_ms: 60_000,
  session_ttl_ms: 15 * 60_000,
  max_active_challenges: 256,
  max_active_sessions: 256,
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
const TOKEN_RE = /^vps1\.([0-9a-f]{32})\.([A-Za-z0-9_-]{43})$/;
const MAX_WALLET_RECORD_BYTES = 64 * 1024;

function exactObject(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + "_object_required");
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length ||
      !actual.every((key, index) => key === expected[index])) {
    throw new Error(label + "_shape_invalid");
  }
}

function safeAccount(raw) {
  const value = String(raw || "").trim();
  if (!ACCOUNT_RE.test(value)) throw new Error("account_invalid");
  return value;
}

function canonicalWalletRecord(raw) {
  exactObject(raw, [
    "version", "kind", "cipher", "kdf", "salt", "iv", "tag",
    "ciphertext", "address", "created_at", "exported_at",
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
    throw new Error("wallet_record_invalid");
  }
  return raw;
}

function readWalletRecord(dataDir, account) {
  const root = path.resolve(String(dataDir || ""));
  if (!path.isAbsolute(root)) throw new Error("data_dir_absolute_required");
  const target = path.join(root, "participant_wallets_v1", account + ".json");
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("wallet_record_type_invalid");
  if (stat.size < 2 || stat.size > MAX_WALLET_RECORD_BYTES) {
    throw new Error("wallet_record_size_invalid");
  }
  return canonicalWalletRecord(JSON.parse(fs.readFileSync(target, "utf8")));
}

function verifyPassphraseBinding(dataDir, account, passphrase) {
  if (typeof passphrase !== "string" || passphrase.length < 8 || passphrase.length > 1024) {
    throw new Error("passphrase_invalid");
  }
  const rec = readWalletRecord(dataDir, account);
  let privateKey = "";
  try {
    const salt = Buffer.from(rec.salt, "hex");
    const iv = Buffer.from(rec.iv, "hex");
    const tag = Buffer.from(rec.tag, "hex");
    const ciphertext = Buffer.from(rec.ciphertext, "hex");
    const key = crypto.scryptSync(passphrase, salt, 32);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    privateKey = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8").trim();
    if (!/^0x[0-9a-f]{64}$/i.test(privateKey)) throw new Error("wallet_private_key_invalid");
    const derived = new Wallet(privateKey).address.toLowerCase();
    if (derived !== String(rec.address).toLowerCase()) {
      throw new Error("wallet_address_binding_mismatch");
    }
    return Object.freeze({ account, address: String(rec.address) });
  } catch (error) {
    if (String(error?.message || error).includes("wallet_address_binding_mismatch")) throw error;
    throw new Error("account_authentication_failed");
  } finally {
    privateKey = "";
  }
}

function digestToken(token) {
  return crypto.createHash("sha256").update(token, "utf8").digest();
}

function randomHex16(randomBytes) {
  return Buffer.from(randomBytes(16)).toString("hex");
}

function randomBase64Url32(randomBytes) {
  return Buffer.from(randomBytes(32)).toString("base64url");
}

export function createVoidPublicParticipantReadSessionV1({
  dataDir,
  now = () => Date.now(),
  randomBytes = crypto.randomBytes,
} = {}) {
  const root = path.resolve(String(dataDir || ""));
  if (!path.isAbsolute(root)) throw new Error("data_dir_absolute_required");

  const challenges = new Map();
  const sessions = new Map();

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
      expires_at_ms: issuedAt + VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.challenge_ttl_ms,
      consumed: false,
    };
    challenges.set(id, row);
    return Object.freeze({
      marker: VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.marker,
      challenge_id: id,
      nonce,
      account,
      capability: VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.capability,
      issued_at_ms: row.issued_at_ms,
      expires_at_ms: row.expires_at_ms,
    });
  };

  const login = (raw) => {
    purge();
    exactObject(raw, ["challenge_id", "nonce", "account", "passphrase"], "login");
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
      throw new Error("challenge_mismatch");
    }

    const binding = verifyPassphraseBinding(root, account, raw.passphrase);

    purge();
    if (sessions.size >= VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.max_active_sessions) {
      throw new Error("session_capacity_reached");
    }
    const sessionId = randomHex16(randomBytes);
    const secret = randomBase64Url32(randomBytes);
    const token = `vps1.${sessionId}.${secret}`;
    const issuedAt = Number(now());
    sessions.set(sessionId, {
      token_sha256: digestToken(token),
      account,
      address: binding.address,
      capability: VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.capability,
      issued_at_ms: issuedAt,
      expires_at_ms: issuedAt + VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.session_ttl_ms,
      revoked: false,
    });
    return Object.freeze({
      marker: VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.marker,
      session_token: token,
      account,
      address: binding.address,
      capability: VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.capability,
      issued_at_ms: issuedAt,
      expires_at_ms: issuedAt + VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1.session_ttl_ms,
      wallet_unlocked: false,
      signing_authority: false,
      money_movement_authority: false,
    });
  };

  const authorize = (authorization, accountRaw) => {
    purge();
    const match = /^Bearer (vps1\.[A-Za-z0-9._-]+)$/.exec(String(authorization || ""));
    if (!match) throw new Error("session_authorization_required");
    const token = match[1];
    const parsed = TOKEN_RE.exec(token);
    if (!parsed) throw new Error("session_token_invalid");
    const row = sessions.get(parsed[1]);
    if (!row || row.revoked || row.expires_at_ms <= Number(now())) {
      throw new Error("session_unavailable");
    }
    const actual = digestToken(token);
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
    return Object.freeze({
      account: row.account,
      address: row.address,
      capability: row.capability,
      read_only: true,
      wallet_unlocked: false,
      signing_authority: false,
      money_movement_authority: false,
    });
  };

  const logout = (authorization) => {
    const match = /^Bearer (vps1\.[A-Za-z0-9._-]+)$/.exec(String(authorization || ""));
    if (!match) return false;
    const parsed = TOKEN_RE.exec(match[1]);
    if (!parsed) return false;
    const row = sessions.get(parsed[1]);
    if (!row) return false;
    const actual = digestToken(match[1]);
    if (
      actual.length !== row.token_sha256.length ||
      !crypto.timingSafeEqual(actual, row.token_sha256)
    ) return false;
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
