export const VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1 =
  Object.freeze({
    marker: "VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1",
    record_marker: "VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_RECORD_V1",
    challenge_marker: "VOID_PUBLIC_PARTICIPANT_READ_SESSION_V1",
    login_domain: "VOID_PUBLIC_PARTICIPANT_READ_SESSION_LOGIN_V1",
    capability: "participant.account.read.v1",
    algorithm: "Ed25519",
    key_type: "ed25519",
    record_version: 1,
    challenge_ttl_ms: 60_000,
    database_name: "void-participant-login-key-v1",
    database_version: 1,
    object_store_name: "login_keys_v1",
    private_key_extractable: false,
    raw_private_key_export: false,
    arbitrary_message_signing: false,
    network_access: false,
    local_storage_secret: false,
    session_storage_secret: false,
    cookie_secret: false,
    wallet_secret_access: false,
    wallet_signing_authority: false,
    transaction_signing_authority: false,
    money_movement_authority: false,
  });

const ACCOUNT_RE = /^[A-Za-z0-9._:-]{1,128}$/;
const HEX_32_RE = /^[0-9a-f]{32}$/;
const NONCE_RE = /^[A-Za-z0-9_-]{43}$/;
const PAYLOAD_RE = /^[A-Za-z0-9_-]{1,4096}$/;
const SHA256_RE = /^[0-9a-f]{64}$/;
const SIGNATURE_RE = /^[A-Za-z0-9_-]{86}$/;

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

function cryptoKeyShape(key, {
  type,
  extractable,
  usage,
} = {}) {
  return Boolean(
    key &&
    typeof key === "object" &&
    key.type === type &&
    key.extractable === extractable &&
    key.algorithm &&
    key.algorithm.name ===
      VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.algorithm &&
    Array.isArray(key.usages) &&
    key.usages.length === 1 &&
    key.usages[0] === usage
  );
}

function bytesToBase64url(bytes) {
  const view = bytes instanceof Uint8Array
    ? bytes
    : new Uint8Array(bytes);
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < view.length; offset += chunk) {
    binary += String.fromCharCode(
      ...view.subarray(offset, Math.min(view.length, offset + chunk)),
    );
  }
  return globalThis.btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64urlToBytes(text, label) {
  const value = String(text || "");
  if (!PAYLOAD_RE.test(value)) fail(label + "_invalid");

  let binary;
  try {
    const normalized = value
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const padding =
      normalized.length % 4 === 0
        ? ""
        : "=".repeat(4 - (normalized.length % 4));
    binary = globalThis.atob(normalized + padding);
  } catch (error) {
    void error;
    fail(label + "_invalid");
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  if (bytesToBase64url(bytes) !== value) {
    fail(label + "_noncanonical");
  }
  return bytes;
}

async function publicDescriptor({
  account,
  publicKey,
  cryptoImpl,
}) {
  if (
    !cryptoKeyShape(publicKey, {
      type: "public",
      extractable: true,
      usage: "verify",
    })
  ) {
    fail("login_public_key_invalid");
  }

  const spki = new Uint8Array(
    await cryptoImpl.subtle.exportKey("spki", publicKey),
  );
  const fingerprint = bytesToBase64url(
    new Uint8Array(
      await cryptoImpl.subtle.digest("SHA-256", spki),
    ),
  );
  const fingerprintHex = [...base64urlToBytes(
    fingerprint,
    "login_public_key_fingerprint_base64url",
  )]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

  if (!SHA256_RE.test(fingerprintHex)) {
    fail("login_public_key_fingerprint_invalid");
  }

  return Object.freeze({
    account,
    key_type:
      VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.key_type,
    public_key_spki_base64url: bytesToBase64url(spki),
    public_key_fingerprint_sha256: fingerprintHex,
    capability:
      VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.capability,
    private_key_extractable: false,
  });
}

async function validateRecord(record, account, cryptoImpl) {
  exactObject(
    record,
    [
      "marker",
      "version",
      "account",
      "key_type",
      "capability",
      "public_key_spki_base64url",
      "public_key_fingerprint_sha256",
      "public_key",
      "private_key",
      "created_at_ms",
    ],
    "login_key_record",
  );

  if (
    record.marker !==
      VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.record_marker ||
    record.version !==
      VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.record_version ||
    record.account !== account ||
    record.key_type !==
      VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.key_type ||
    record.capability !==
      VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.capability ||
    !SHA256_RE.test(
      String(record.public_key_fingerprint_sha256 || ""),
    ) ||
    !Number.isSafeInteger(record.created_at_ms) ||
    record.created_at_ms < 0 ||
    !cryptoKeyShape(record.public_key, {
      type: "public",
      extractable: true,
      usage: "verify",
    }) ||
    !cryptoKeyShape(record.private_key, {
      type: "private",
      extractable: false,
      usage: "sign",
    })
  ) {
    fail("login_key_record_invalid");
  }

  const descriptor = await publicDescriptor({
    account,
    publicKey: record.public_key,
    cryptoImpl,
  });
  if (
    descriptor.public_key_spki_base64url !==
      record.public_key_spki_base64url ||
    descriptor.public_key_fingerprint_sha256 !==
      record.public_key_fingerprint_sha256
  ) {
    fail("login_key_record_public_key_mismatch");
  }

  return Object.freeze({
    record,
    descriptor,
  });
}

function validateChallenge(account, challenge) {
  exactObject(
    challenge,
    [
      "ok",
      "marker",
      "challenge_id",
      "nonce",
      "account",
      "capability",
      "signing_domain",
      "signing_payload_base64url",
      "issued_at_ms",
      "expires_at_ms",
    ],
    "login_challenge",
  );

  if (
    challenge.ok !== true ||
    challenge.marker !==
      VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.challenge_marker ||
    challenge.account !== account ||
    challenge.capability !==
      VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.capability ||
    challenge.signing_domain !==
      VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.login_domain ||
    !HEX_32_RE.test(String(challenge.challenge_id || "")) ||
    !NONCE_RE.test(String(challenge.nonce || "")) ||
    !PAYLOAD_RE.test(
      String(challenge.signing_payload_base64url || ""),
    ) ||
    !Number.isSafeInteger(challenge.issued_at_ms) ||
    !Number.isSafeInteger(challenge.expires_at_ms) ||
    challenge.expires_at_ms - challenge.issued_at_ms !==
      VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.challenge_ttl_ms
  ) {
    fail("login_challenge_invalid");
  }

  const payloadBytes = base64urlToBytes(
    challenge.signing_payload_base64url,
    "login_challenge_payload",
  );
  let payloadText;
  try {
    payloadText = new TextDecoder("utf-8", {
      fatal: true,
    }).decode(payloadBytes);
  } catch (error) {
    void error;
    fail("login_challenge_payload_invalid");
  }

  let payload;
  try {
    payload = JSON.parse(payloadText);
  } catch (error) {
    void error;
    fail("login_challenge_payload_invalid");
  }

  const expected = [
    VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.login_domain,
    account,
    challenge.challenge_id,
    challenge.nonce,
    challenge.issued_at_ms,
    challenge.expires_at_ms,
    VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.capability,
  ];

  if (
    !Array.isArray(payload) ||
    payload.length !== expected.length ||
    !payload.every((value, index) => value === expected[index]) ||
    JSON.stringify(payload) !== JSON.stringify(expected) ||
    new TextEncoder().encode(JSON.stringify(expected)).length !==
      payloadBytes.length ||
    bytesToBase64url(
      new TextEncoder().encode(JSON.stringify(expected)),
    ) !== challenge.signing_payload_base64url
  ) {
    fail("login_challenge_payload_mismatch");
  }

  return Object.freeze({
    payloadBytes,
    challenge_id: challenge.challenge_id,
    nonce: challenge.nonce,
  });
}

export function createVoidParticipantBrowserLoginKeyV1({
  cryptoImpl = globalThis.crypto,
  store,
  now = () => Date.now(),
} = {}) {
  if (
    !cryptoImpl ||
    !cryptoImpl.subtle ||
    typeof cryptoImpl.subtle.generateKey !== "function" ||
    typeof cryptoImpl.subtle.exportKey !== "function" ||
    typeof cryptoImpl.subtle.digest !== "function" ||
    typeof cryptoImpl.subtle.sign !== "function"
  ) {
    fail("webcrypto_required");
  }
  if (
    !store ||
    typeof store.get !== "function" ||
    typeof store.add !== "function"
  ) {
    fail("login_key_store_required");
  }

  const create = async (accountRaw) => {
    const account = safeAccount(accountRaw);
    const existing = await store.get(account);
    if (existing !== undefined && existing !== null) {
      fail("login_key_already_exists");
    }

    const pair = await cryptoImpl.subtle.generateKey(
      {
        name:
          VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.algorithm,
      },
      false,
      ["sign", "verify"],
    );

    if (
      !pair ||
      !cryptoKeyShape(pair.publicKey, {
        type: "public",
        extractable: true,
        usage: "verify",
      }) ||
      !cryptoKeyShape(pair.privateKey, {
        type: "private",
        extractable: false,
        usage: "sign",
      })
    ) {
      fail("generated_login_key_invalid");
    }

    const descriptor = await publicDescriptor({
      account,
      publicKey: pair.publicKey,
      cryptoImpl,
    });
    const createdAt = Number(now());
    if (!Number.isSafeInteger(createdAt) || createdAt < 0) {
      fail("clock_invalid");
    }

    const record = {
      marker:
        VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.record_marker,
      version:
        VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.record_version,
      account,
      key_type:
        VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.key_type,
      capability:
        VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.capability,
      public_key_spki_base64url:
        descriptor.public_key_spki_base64url,
      public_key_fingerprint_sha256:
        descriptor.public_key_fingerprint_sha256,
      public_key: pair.publicKey,
      private_key: pair.privateKey,
      created_at_ms: createdAt,
    };

    try {
      await store.add(record);
    } catch (error) {
      void error;
      fail("login_key_store_conflict");
    }

    return descriptor;
  };

  const describe = async (accountRaw) => {
    const account = safeAccount(accountRaw);
    const record = await store.get(account);
    if (record === undefined || record === null) {
      fail("login_key_not_found");
    }
    return (
      await validateRecord(record, account, cryptoImpl)
    ).descriptor;
  };

  const signChallenge = async (accountRaw, challenge) => {
    const account = safeAccount(accountRaw);
    const validatedChallenge = validateChallenge(
      account,
      challenge,
    );
    const record = await store.get(account);
    if (record === undefined || record === null) {
      fail("login_key_not_found");
    }
    const validated = await validateRecord(
      record,
      account,
      cryptoImpl,
    );

    const signature = bytesToBase64url(
      new Uint8Array(
        await cryptoImpl.subtle.sign(
          {
            name:
              VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.algorithm,
          },
          validated.record.private_key,
          validatedChallenge.payloadBytes,
        ),
      ),
    );
    if (!SIGNATURE_RE.test(signature)) {
      fail("login_signature_invalid");
    }

    return Object.freeze({
      challenge_id: validatedChallenge.challenge_id,
      nonce: validatedChallenge.nonce,
      account,
      signature_base64url: signature,
    });
  };

  return Object.freeze({
    create,
    describe,
    signChallenge,
    authority:
      VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1,
  });
}

function idbRequest(request, label) {
  return new Promise((resolve, reject) => {
    request.addEventListener(
      "success",
      () => resolve(request.result),
      { once: true },
    );
    request.addEventListener(
      "error",
      () => reject(new Error(label)),
      { once: true },
    );
  });
}

function idbTransactionDone(transaction, label) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener(
      "complete",
      () => resolve(),
      { once: true },
    );
    transaction.addEventListener(
      "abort",
      () => reject(new Error(label)),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () => reject(new Error(label)),
      { once: true },
    );
  });
}

async function openLoginKeyDatabase(indexedDBImpl) {
  const request = indexedDBImpl.open(
    VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.database_name,
    VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.database_version,
  );

  request.addEventListener("upgradeneeded", () => {
    const db = request.result;
    if (
      !db.objectStoreNames.contains(
        VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.object_store_name,
      )
    ) {
      db.createObjectStore(
        VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.object_store_name,
        { keyPath: "account" },
      );
    }
  });

  const db = await idbRequest(
    request,
    "login_key_database_open_failed",
  );
  if (
    !db.objectStoreNames.contains(
      VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.object_store_name,
    )
  ) {
    db.close();
    fail("login_key_database_schema_invalid");
  }
  return db;
}

export function createVoidParticipantLoginKeyIndexedDbStoreV1({
  indexedDBImpl = globalThis.indexedDB,
  secureContext = globalThis.isSecureContext,
} = {}) {
  if (secureContext !== true) {
    fail("secure_context_required");
  }
  if (!indexedDBImpl || typeof indexedDBImpl.open !== "function") {
    fail("indexeddb_required");
  }

  const get = async (accountRaw) => {
    const account = safeAccount(accountRaw);
    const db = await openLoginKeyDatabase(indexedDBImpl);
    try {
      const transaction = db.transaction(
        VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.object_store_name,
        "readonly",
      );
      const store = transaction.objectStore(
        VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.object_store_name,
      );
      const result = await idbRequest(
        store.get(account),
        "login_key_store_read_failed",
      );
      await idbTransactionDone(
        transaction,
        "login_key_store_read_failed",
      );
      return result;
    } finally {
      db.close();
    }
  };

  const add = async (record) => {
    const account = safeAccount(record?.account);
    if (account !== record.account) {
      fail("login_key_store_record_invalid");
    }

    const db = await openLoginKeyDatabase(indexedDBImpl);
    try {
      const transaction = db.transaction(
        VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.object_store_name,
        "readwrite",
      );
      const store = transaction.objectStore(
        VOID_PUBLIC_PARTICIPANT_BROWSER_LOGIN_KEY_V1.object_store_name,
      );
      await idbRequest(
        store.add(record),
        "login_key_store_add_failed",
      );
      await idbTransactionDone(
        transaction,
        "login_key_store_add_failed",
      );
    } finally {
      db.close();
    }
  };

  return Object.freeze({ get, add });
}
