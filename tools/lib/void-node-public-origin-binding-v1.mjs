import {
  createHash,
  createPublicKey,
  sign as cryptoSign,
  timingSafeEqual,
  verify as cryptoVerify,
} from "node:crypto";

export const VOID_NODE_PUBLIC_ORIGIN_BINDING_MARKER =
  "VOID_NODE_PUBLIC_ORIGIN_BINDING_V1";
export const VOID_NODE_PUBLIC_ORIGIN_BINDING_DOMAIN =
  "VOID_NODE_PUBLIC_ORIGIN_BINDING_V1";
export const VOID_NODE_PUBLIC_ORIGIN_BINDING_CANONICALIZATION =
  "void-canonical-json-v1";
export const VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS = Object.freeze([
  "/.well-known/void-node-public-origin-binding-v1.json",
  "/public-node/identity/public-origin-binding-v1.json",
]);

const MAX_VALIDITY_MS = 366 * 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 2 * 60 * 1000;
const NODE_ID_PATTERN = /^[0-9a-f]{32}$/u;
const FINGERPRINT_PATTERN = /^[0-9a-f]{64}$/u;

const AUTHORITY = Object.freeze({
  read_only: true,
  transaction_submission: false,
  payment_authority: false,
  wallet_or_signer_access: false,
  work_credit_write: false,
  validator_mutation: false,
  governance_mutation: false,
  treasury_or_liquidity: false,
  void_settlement: false,
  node_runtime_mutation: false,
  operator_control: false,
});

function fail(message) {
  throw new Error(message);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value, expected, label) {
  if (!isPlainObject(value)) fail(`${label} must be an object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    fail(`${label} keys mismatch`);
  }
}

function canonicalTimestamp(value, label) {
  if (typeof value !== "string") fail(`${label} must be a timestamp string`);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) fail(`${label} must be a valid timestamp`);
  const canonical = date.toISOString();
  if (canonical !== value) fail(`${label} must use canonical ISO-8601 form`);
  return date;
}

export function normalizeVoidPublicOriginV1(value, label = "origin") {
  if (typeof value !== "string" || value.length < 1 || value.length > 2048) {
    fail(`${label} must be a non-empty origin string`);
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    fail(`${label} must be an absolute URL origin`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    fail(`${label} must use HTTP or HTTPS`);
  }
  if (
    parsed.username
    || parsed.password
    || parsed.pathname !== "/"
    || parsed.search
    || parsed.hash
  ) {
    fail(`${label} must not contain credentials, path, query, or fragment`);
  }
  if (parsed.origin === "null") fail(`${label} must have an origin`);
  return parsed.origin;
}

function normalizeNodeId(value, label = "node_id") {
  if (typeof value !== "string" || !NODE_ID_PATTERN.test(value)) {
    fail(`${label} must be 32 lowercase hexadecimal characters`);
  }
  return value;
}

function normalizeFingerprint(value, label) {
  if (typeof value !== "string" || !FINGERPRINT_PATTERN.test(value)) {
    fail(`${label} must be 64 lowercase hexadecimal characters`);
  }
  return value;
}

function normalizedPublicKey(publicKeyValue) {
  let key;
  try {
    key = publicKeyValue?.type ? publicKeyValue : createPublicKey(publicKeyValue);
  } catch {
    fail("public key is invalid");
  }
  if (key.type !== "public" || key.asymmetricKeyType !== "ed25519") {
    fail("public key must be Ed25519");
  }
  const pem = key.export({ type: "spki", format: "pem" }).toString();
  const der = key.export({ type: "spki", format: "der" });
  return {
    key,
    pem,
    fingerprint: createHash("sha256").update(der).digest("hex"),
  };
}

export function canonicalJsonV1(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("canonical JSON rejects non-finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJsonV1).join(",")}]`;
  }
  if (!isPlainObject(value)) {
    fail("canonical JSON accepts plain objects only");
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJsonV1(value[key])}`)
    .join(",")}}`;
}

export function unsignedVoidNodePublicOriginBindingBytesV1(bindingValue) {
  const clone = structuredClone(bindingValue);
  if (!isPlainObject(clone.signature)) fail("signature must be an object");
  delete clone.signature.value;
  return Buffer.concat([
    Buffer.from(VOID_NODE_PUBLIC_ORIGIN_BINDING_DOMAIN, "utf8"),
    Buffer.from([0]),
    Buffer.from(canonicalJsonV1(clone), "utf8"),
  ]);
}

export function voidNodePublicOriginBindingSha256V1(bindingValue) {
  return createHash("sha256")
    .update(Buffer.from(canonicalJsonV1(bindingValue), "utf8"))
    .digest("hex");
}

function buildUnsigned({
  nodeId,
  publicKey,
  origin,
  issuedAt,
  expiresAt,
}) {
  const node = normalizedPublicKey(publicKey);
  const issued = new Date(issuedAt);
  const expires = new Date(expiresAt);
  if (!Number.isFinite(issued.getTime())) fail("issued_at must be valid");
  if (!Number.isFinite(expires.getTime())) fail("expires_at must be valid");
  if (expires.getTime() <= issued.getTime()) {
    fail("expires_at must be later than issued_at");
  }
  if (expires.getTime() - issued.getTime() > MAX_VALIDITY_MS) {
    fail("binding validity may not exceed 366 days");
  }

  return {
    marker: VOID_NODE_PUBLIC_ORIGIN_BINDING_MARKER,
    version: 1,
    status: "active",
    issued_at: issued.toISOString(),
    expires_at: expires.toISOString(),
    network: {
      name: "VOID Mainnet-0",
      identity: "mainnet0",
      chain_id: 2050,
    },
    origin: {
      value: normalizeVoidPublicOriginV1(origin),
    },
    node: {
      node_id: normalizeNodeId(nodeId),
      key_type: "ed25519",
      public_key_pem: node.pem,
      public_key_fingerprint_sha256: node.fingerprint,
    },
    surface: {
      binding_paths: [...VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS],
      health: {
        path: "/health",
        methods: ["GET"],
      },
      work_credit_status: {
        path: "/wc/public-earning-pilot-v1/status",
        methods: ["GET"],
      },
      same_origin_only: true,
      redirects_allowed: false,
    },
    authority: { ...AUTHORITY },
    signature: {
      domain: VOID_NODE_PUBLIC_ORIGIN_BINDING_DOMAIN,
      algorithm: "ed25519",
      encoding: "base64",
      canonicalization: VOID_NODE_PUBLIC_ORIGIN_BINDING_CANONICALIZATION,
      key_id: `ed25519:${node.fingerprint}`,
      value: "",
    },
  };
}

export function signVoidNodePublicOriginBindingV1(options = {}) {
  const privateKey = options.privateKey;
  if (
    !privateKey
    || privateKey.type !== "private"
    || privateKey.asymmetricKeyType !== "ed25519"
  ) {
    fail("private key must be Ed25519");
  }
  const derivedPublic = createPublicKey(privateKey);
  const supplied = normalizedPublicKey(options.publicKey || derivedPublic);
  const derivedDer = derivedPublic.export({ type: "spki", format: "der" });
  const suppliedDer = supplied.key.export({ type: "spki", format: "der" });
  if (
    derivedDer.length !== suppliedDer.length
    || !timingSafeEqual(derivedDer, suppliedDer)
  ) {
    fail("private and public keys do not match");
  }

  const binding = buildUnsigned({
    ...options,
    publicKey: supplied.key,
  });
  const signature = cryptoSign(
    null,
    unsignedVoidNodePublicOriginBindingBytesV1(binding),
    privateKey,
  );
  if (signature.length !== 64) fail("Ed25519 signature must be 64 bytes");
  binding.signature.value = signature.toString("base64");
  return binding;
}

function strictBase64(value, label) {
  if (
    typeof value !== "string"
    || value.length < 1
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)
  ) {
    fail(`${label} must be canonical base64`);
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) {
    fail(`${label} must be canonical base64`);
  }
  return bytes;
}

export function verifyVoidNodePublicOriginBindingV1(bindingValue, options = {}) {
  const binding = structuredClone(bindingValue);
  exactKeys(binding, [
    "marker",
    "version",
    "status",
    "issued_at",
    "expires_at",
    "network",
    "origin",
    "node",
    "surface",
    "authority",
    "signature",
  ], "binding");

  if (
    binding.marker !== VOID_NODE_PUBLIC_ORIGIN_BINDING_MARKER
    || binding.version !== 1
    || binding.status !== "active"
  ) {
    fail("binding marker, version, or status mismatch");
  }

  exactKeys(binding.network, ["name", "identity", "chain_id"], "binding.network");
  if (
    binding.network.name !== "VOID Mainnet-0"
    || binding.network.identity !== "mainnet0"
    || binding.network.chain_id !== 2050
  ) {
    fail("binding network mismatch");
  }

  exactKeys(binding.origin, ["value"], "binding.origin");
  const signedOrigin = normalizeVoidPublicOriginV1(
    binding.origin.value,
    "binding.origin.value",
  );
  if (signedOrigin !== binding.origin.value) {
    fail("binding origin must be canonical");
  }

  const expectedOrigin = normalizeVoidPublicOriginV1(
    options.expectedOrigin,
    "expected origin",
  );
  if (signedOrigin !== expectedOrigin) {
    fail("binding origin does not match the selected coordinator origin");
  }

  exactKeys(binding.node, [
    "node_id",
    "key_type",
    "public_key_pem",
    "public_key_fingerprint_sha256",
  ], "binding.node");
  const nodeId = normalizeNodeId(binding.node.node_id, "binding.node.node_id");
  const expectedNodeId = normalizeNodeId(
    options.expectedNodeId,
    "expected node_id",
  );
  if (nodeId !== expectedNodeId) {
    fail("binding node_id does not match live health identity");
  }
  if (binding.node.key_type !== "ed25519") fail("binding node key type mismatch");

  const trustedFingerprint = normalizeFingerprint(
    options.expectedPublicKeyFingerprintSha256,
    "independent public-key fingerprint trust pin",
  );
  const node = normalizedPublicKey(binding.node.public_key_pem);
  if (binding.node.public_key_pem !== node.pem) {
    fail("binding public key PEM must be canonical");
  }
  if (binding.node.public_key_fingerprint_sha256 !== node.fingerprint) {
    fail("binding public-key fingerprint mismatch");
  }
  if (node.fingerprint !== trustedFingerprint) {
    fail("binding public key does not match independent trust pin");
  }

  exactKeys(binding.surface, [
    "binding_paths",
    "health",
    "work_credit_status",
    "same_origin_only",
    "redirects_allowed",
  ], "binding.surface");
  if (
    JSON.stringify(binding.surface.binding_paths)
      !== JSON.stringify(VOID_NODE_PUBLIC_ORIGIN_BINDING_PATHS)
    || binding.surface.same_origin_only !== true
    || binding.surface.redirects_allowed !== false
  ) {
    fail("binding surface mismatch");
  }
  exactKeys(binding.surface.health, ["path", "methods"], "binding.surface.health");
  if (
    binding.surface.health.path !== "/health"
    || JSON.stringify(binding.surface.health.methods) !== JSON.stringify(["GET"])
  ) {
    fail("binding health surface mismatch");
  }
  exactKeys(
    binding.surface.work_credit_status,
    ["path", "methods"],
    "binding.surface.work_credit_status",
  );
  if (
    binding.surface.work_credit_status.path
      !== "/wc/public-earning-pilot-v1/status"
    || JSON.stringify(binding.surface.work_credit_status.methods)
      !== JSON.stringify(["GET"])
  ) {
    fail("binding Work Credit status surface mismatch");
  }

  exactKeys(binding.authority, Object.keys(AUTHORITY), "binding.authority");
  for (const [key, expected] of Object.entries(AUTHORITY)) {
    if (binding.authority[key] !== expected) {
      fail(`binding authority.${key} mismatch`);
    }
  }

  exactKeys(binding.signature, [
    "domain",
    "algorithm",
    "encoding",
    "canonicalization",
    "key_id",
    "value",
  ], "binding.signature");
  if (
    binding.signature.domain !== VOID_NODE_PUBLIC_ORIGIN_BINDING_DOMAIN
    || binding.signature.algorithm !== "ed25519"
    || binding.signature.encoding !== "base64"
    || binding.signature.canonicalization
      !== VOID_NODE_PUBLIC_ORIGIN_BINDING_CANONICALIZATION
    || binding.signature.key_id !== `ed25519:${node.fingerprint}`
  ) {
    fail("binding signature profile mismatch");
  }

  const issued = canonicalTimestamp(binding.issued_at, "binding.issued_at");
  const expires = canonicalTimestamp(binding.expires_at, "binding.expires_at");
  const nowMs = options.nowMs ?? Date.now();
  if (!Number.isFinite(nowMs)) fail("verification time is invalid");
  if (issued.getTime() > nowMs + CLOCK_SKEW_MS) {
    fail("binding issuance is too far in the future");
  }
  if (expires.getTime() <= nowMs) fail("binding is expired");
  if (expires.getTime() <= issued.getTime()) {
    fail("binding validity interval is invalid");
  }
  if (expires.getTime() - issued.getTime() > MAX_VALIDITY_MS) {
    fail("binding validity exceeds 366 days");
  }

  const signature = strictBase64(binding.signature.value, "binding signature");
  if (signature.length !== 64) fail("binding signature must contain 64 bytes");
  if (
    !cryptoVerify(
      null,
      unsignedVoidNodePublicOriginBindingBytesV1(binding),
      node.key,
      signature,
    )
  ) {
    fail("binding Ed25519 signature verification failed");
  }

  return Object.freeze({
    marker: binding.marker,
    origin: signedOrigin,
    node_id: nodeId,
    public_key_fingerprint_sha256: node.fingerprint,
    issued_at: binding.issued_at,
    expires_at: binding.expires_at,
    binding_sha256: voidNodePublicOriginBindingSha256V1(binding),
    trust: Object.freeze({
      independent_public_key_fingerprint_required: true,
      signed_origin_matches_selected_origin: true,
      signed_node_id_matches_live_health: true,
    }),
    authority: Object.freeze({ ...AUTHORITY }),
  });
}
