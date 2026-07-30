import {
  createHash,
  createPublicKey,
  sign as cryptoSign,
  timingSafeEqual,
  verify as cryptoVerify,
} from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { compileFunction } from "node:vm";
import { validateV3OnionHostname } from "./void-tor-onion-descriptor-v1.mjs";

export const VOID_NODE_ONION_BINDING_MARKER = "VOID_NODE_ONION_BINDING_V1";
export const VOID_NODE_ONION_BINDING_DOMAIN = "VOID_NODE_ONION_BINDING_V1";
export const VOID_NODE_ONION_BINDING_CANONICALIZATION = "void-canonical-json-v1";
export const VOID_NODE_ONION_BINDING_PATHS = Object.freeze([
  "/.well-known/void-node-onion-binding-v1.json",
  "/public-node/transports/tor-v1-binding.json",
]);

const MAX_BINDING_BYTES = 64 * 1024;
const MAX_VALIDITY_MS = 366 * 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const AUTHORITY = Object.freeze({
  read_only: true,
  transaction_submission: false,
  p2p_listener: false,
  mcp_listener: false,
  wallet_or_signer_access: false,
  work_credit_write: false,
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
    fail(`${label} keys mismatch: expected=${wanted.join(",")} actual=${actual.join(",")}`);
  }
}

function normalizeTimestamp(value, label) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) fail(`${label} must be a valid timestamp`);
  return date.toISOString();
}

function assertPort(value) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    fail("virtual_port must be an integer from 1 through 65535");
  }
  return port;
}

export function normalizeCanonicalVoidNodeIdV1(value, options = {}) {
  let text = "";
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    const bytes = Buffer.from(value);
    if (bytes.length < 1 || bytes.length > 512) fail("VOID nodeId binary length is invalid");
    const printable = [...bytes].every((byte) => byte >= 0x21 && byte <= 0x7e);
    text = printable ? bytes.toString("ascii") : bytes.toString("hex");
  } else if (isPlainObject(value) && value.type === "Buffer" && Array.isArray(value.data)) {
    if (value.data.some((entry) => !Number.isInteger(entry) || entry < 0 || entry > 255)) {
      fail("VOID nodeId buffer data is invalid");
    }
    return normalizeCanonicalVoidNodeIdV1(Buffer.from(value.data), options);
  } else if (typeof value === "string") {
    text = value;
  } else if ((value === undefined || value === null || value === "") && options.publicKeyPem) {
    text = createHash("sha256").update(String(options.publicKeyPem)).digest("hex");
  } else {
    fail("VOID nodeId must be a string or byte sequence");
  }

  if (text.length < 1 || text.length > 512) fail("VOID nodeId length is invalid");
  if (text.trim() !== text) fail("VOID nodeId must not contain surrounding whitespace");
  for (const character of text) {
    const code = character.codePointAt(0);
    if (code < 0x21 || code > 0x7e) {
      fail("VOID nodeId must contain printable ASCII without whitespace");
    }
  }
  return text;
}

function normalizeNodeId(value) {
  return normalizeCanonicalVoidNodeIdV1(value);
}

function normalizedPublicKey(publicKeyValue) {
  const key = publicKeyValue?.type ? publicKeyValue : createPublicKey(publicKeyValue);
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

function classifyExistingNodeKeypairModuleV1(source) {
  const hasEsmSyntax = /(?:^|\n)\s*(?:import(?:\s|\{)|export(?:\s|\{))/m.test(source);
  const hasCommonJsSyntax = /(?:^|\n)\s*(?:(?:"use strict"|'use strict');\s*)?(?:Object\.defineProperty\(exports\b|exports\.[A-Za-z_$]|module\.exports\b|(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*require\s*\()/m.test(source);
  if (hasEsmSyntax === hasCommonJsSyntax) {
    fail("existing VOID keypair module format is ambiguous");
  }
  return hasEsmSyntax ? "module" : "commonjs";
}

function loadCommonJsKeypairModuleV1(modulePath, source) {
  const moduleValue = { exports: {} };
  const requireValue = createRequire(modulePath);
  const compiled = compileFunction(
    source,
    ["exports", "require", "module", "__filename", "__dirname"],
    { filename: modulePath },
  );
  compiled(
    moduleValue.exports,
    requireValue,
    moduleValue,
    modulePath,
    dirname(modulePath),
  );
  return moduleValue.exports;
}

function normalizeLoadedExistingVoidNodeKeypairV1(pairValue) {
  if (!isPlainObject(pairValue)) fail("existing VOID loadKeypair must return an object");
  const privateKey = pairValue.privateKey;
  if (privateKey?.type !== "private" || privateKey?.asymmetricKeyType !== "ed25519") {
    fail("existing VOID loadKeypair returned a non-Ed25519 private key");
  }

  let publicKey = pairValue.publicKey;
  if (publicKey?.type !== "public" || publicKey?.asymmetricKeyType !== "ed25519") {
    try {
      publicKey = typeof pairValue.pubPEM === "string"
        ? createPublicKey(pairValue.pubPEM)
        : createPublicKey(privateKey);
    } catch {
      fail("existing VOID loadKeypair did not provide a usable Ed25519 public key");
    }
  }
  if (publicKey?.type !== "public" || publicKey?.asymmetricKeyType !== "ed25519") {
    fail("existing VOID loadKeypair returned a non-Ed25519 public key");
  }

  const derivedPublic = createPublicKey(privateKey);
  const derivedDer = derivedPublic.export({ type: "spki", format: "der" });
  const suppliedDer = publicKey.export({ type: "spki", format: "der" });
  if (derivedDer.length !== suppliedDer.length || !timingSafeEqual(derivedDer, suppliedDer)) {
    fail("existing VOID loadKeypair returned mismatched private/public keys");
  }

  const canonicalPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const suppliedPem = typeof pairValue.pubPEM === "string" ? pairValue.pubPEM : canonicalPem;
  let suppliedPemKey;
  try {
    suppliedPemKey = createPublicKey(suppliedPem);
  } catch {
    fail("existing VOID loadKeypair returned invalid pubPEM");
  }
  const suppliedPemDer = suppliedPemKey.export({ type: "spki", format: "der" });
  if (suppliedPemDer.length !== suppliedDer.length || !timingSafeEqual(suppliedDer, suppliedPemDer)) {
    fail("existing VOID loadKeypair pubPEM does not match publicKey");
  }

  const probe = Buffer.from("VOID_NODE_ONION_BINDING_V1_EXISTING_KEYPAIR_PROBE", "utf8");
  const probeSignature = cryptoSign(null, probe, privateKey);
  if (!cryptoVerify(null, probe, publicKey, probeSignature)) {
    fail("existing VOID loadKeypair failed Ed25519 possession self-check");
  }

  const rawNodeId = pairValue.nodeId ?? pairValue.nodeID;
  const nodeId = normalizeCanonicalVoidNodeIdV1(rawNodeId, { publicKeyPem: suppliedPem });

  return {
    ...pairValue,
    privateKey,
    publicKey,
    pubPEM: suppliedPem,
    nodeId,
  };
}

export async function loadExistingVoidNodeKeypairV1(modulePathValue, keyPath) {
  const modulePath = realpathSync(resolve(modulePathValue));
  const moduleStat = lstatSync(modulePath);
  if (!moduleStat.isFile() || moduleStat.isSymbolicLink()) {
    fail("keypair module must be a regular non-symlink file");
  }
  if (moduleStat.size < 1 || moduleStat.size > 256 * 1024) {
    fail("keypair module size is invalid");
  }
  const source = readFileSync(modulePath, "utf8");
  const format = classifyExistingNodeKeypairModuleV1(source);
  const imported = format === "module"
    ? await import(`${pathToFileURL(modulePath).href}?void-binding-v1=${Date.now()}`)
    : loadCommonJsKeypairModuleV1(modulePath, source);
  const loadKeypair = imported?.loadKeypair || imported?.default?.loadKeypair || imported?.default;
  if (typeof loadKeypair !== "function") {
    fail("existing VOID keypair module does not export loadKeypair");
  }
  const loaded = await loadKeypair(keyPath);
  return normalizeLoadedExistingVoidNodeKeypairV1(loaded);
}

export function canonicalJsonV1(value) {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) fail("canonical JSON rejects non-finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJsonV1).join(",")}]`;
  if (!isPlainObject(value)) fail("canonical JSON accepts plain objects only");
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJsonV1(value[key])}`).join(",")}}`;
}

export function unsignedBindingBytesV1(bindingValue) {
  const clone = structuredClone(bindingValue);
  if (!isPlainObject(clone.signature)) fail("signature must be an object");
  delete clone.signature.value;
  return Buffer.concat([
    Buffer.from(VOID_NODE_ONION_BINDING_DOMAIN, "utf8"),
    Buffer.from([0]),
    Buffer.from(canonicalJsonV1(clone), "utf8"),
  ]);
}

function buildUnsigned({ nodeId, publicKey, onionHostname, virtualPort, issuedAt, expiresAt }) {
  const node = normalizedPublicKey(publicKey);
  const hostname = validateV3OnionHostname(onionHostname);
  const port = assertPort(virtualPort);
  const issued = normalizeTimestamp(issuedAt, "issued_at");
  const expires = normalizeTimestamp(expiresAt, "expires_at");
  const issuedMs = Date.parse(issued);
  const expiresMs = Date.parse(expires);
  if (expiresMs <= issuedMs) fail("expires_at must be later than issued_at");
  if (expiresMs - issuedMs > MAX_VALIDITY_MS) fail("binding validity may not exceed 366 days");
  const authority = port === 80 ? hostname : `${hostname}:${port}`;
  return {
    marker: VOID_NODE_ONION_BINDING_MARKER,
    version: 1,
    status: "active",
    issued_at: issued,
    expires_at: expires,
    node: {
      node_id: normalizeNodeId(nodeId),
      key_type: "ed25519",
      public_key_pem: node.pem,
      public_key_fingerprint_sha256: node.fingerprint,
      node_id_attestation: "signed-by-existing-void-node-key-v1",
    },
    transport: {
      protocol: "tor-v3",
      onion_hostname: hostname,
      uri: `http://${authority}`,
      virtual_port: port,
      address_role: "transport-endpoint",
    },
    surface: {
      id: "void-public-node-static-read-only-v1",
      methods: ["GET", "HEAD"],
      binding_paths: [...VOID_NODE_ONION_BINDING_PATHS],
      descriptor_paths: [
        "/.well-known/void-tor-onion-transport-v1.json",
        "/public-node/transports/tor-v1.json",
      ],
    },
    authority: { ...AUTHORITY },
    signature: {
      domain: VOID_NODE_ONION_BINDING_DOMAIN,
      algorithm: "ed25519",
      encoding: "base64",
      canonicalization: VOID_NODE_ONION_BINDING_CANONICALIZATION,
      value: "",
    },
  };
}

export function signVoidNodeOnionBindingV1(options = {}) {
  const privateKey = options.privateKey;
  if (!privateKey || privateKey.type !== "private" || privateKey.asymmetricKeyType !== "ed25519") {
    fail("private key must be Ed25519");
  }
  const derivedPublic = createPublicKey(privateKey);
  const suppliedPublic = normalizedPublicKey(options.publicKey || derivedPublic);
  const derivedDer = derivedPublic.export({ type: "spki", format: "der" });
  const suppliedDer = suppliedPublic.key.export({ type: "spki", format: "der" });
  if (derivedDer.length !== suppliedDer.length || !timingSafeEqual(derivedDer, suppliedDer)) {
    fail("private and public keys do not match");
  }
  const unsigned = buildUnsigned({ ...options, publicKey: suppliedPublic.key });
  const signature = cryptoSign(null, unsignedBindingBytesV1(unsigned), privateKey);
  if (signature.length !== 64) fail("Ed25519 signature must be 64 bytes");
  unsigned.signature.value = signature.toString("base64");
  return verifyVoidNodeOnionBindingV1(unsigned, {
    expectedNodeId: unsigned.node.node_id,
    expectedOnionHostname: unsigned.transport.onion_hostname,
    now: unsigned.issued_at,
    allowNotYetValidWithinSkew: true,
  }).binding;
}

export function verifyVoidNodeOnionBindingV1(value, options = {}) {
  exactKeys(value, ["marker", "version", "status", "issued_at", "expires_at", "node", "transport", "surface", "authority", "signature"], "binding");
  if (value.marker !== VOID_NODE_ONION_BINDING_MARKER || value.version !== 1 || value.status !== "active") {
    fail("binding marker, version, or status is invalid");
  }
  exactKeys(value.node, ["node_id", "key_type", "public_key_pem", "public_key_fingerprint_sha256", "node_id_attestation"], "node");
  exactKeys(value.transport, ["protocol", "onion_hostname", "uri", "virtual_port", "address_role"], "transport");
  exactKeys(value.surface, ["id", "methods", "binding_paths", "descriptor_paths"], "surface");
  exactKeys(value.authority, Object.keys(AUTHORITY), "authority");
  exactKeys(value.signature, ["domain", "algorithm", "encoding", "canonicalization", "value"], "signature");

  const nodeId = normalizeNodeId(value.node.node_id);
  if (value.node.key_type !== "ed25519" || value.node.node_id_attestation !== "signed-by-existing-void-node-key-v1") fail("node identity profile is invalid");
  const publicKey = normalizedPublicKey(value.node.public_key_pem);
  if (value.node.public_key_pem !== publicKey.pem) fail("public_key_pem is not canonical SPKI PEM");
  if (value.node.public_key_fingerprint_sha256 !== publicKey.fingerprint) fail("public key fingerprint mismatch");

  const hostname = validateV3OnionHostname(value.transport.onion_hostname);
  const port = assertPort(value.transport.virtual_port);
  const authority = port === 80 ? hostname : `${hostname}:${port}`;
  if (value.transport.protocol !== "tor-v3" || value.transport.uri !== `http://${authority}` || value.transport.address_role !== "transport-endpoint") fail("transport profile is invalid");
  if (value.surface.id !== "void-public-node-static-read-only-v1" || JSON.stringify(value.surface.methods) !== JSON.stringify(["GET", "HEAD"]) || JSON.stringify(value.surface.binding_paths) !== JSON.stringify(VOID_NODE_ONION_BINDING_PATHS) || JSON.stringify(value.surface.descriptor_paths) !== JSON.stringify(["/.well-known/void-tor-onion-transport-v1.json", "/public-node/transports/tor-v1.json"])) fail("surface profile is invalid");
  for (const [key, expected] of Object.entries(AUTHORITY)) if (value.authority[key] !== expected) fail(`authority.${key} mismatch`);
  if (value.signature.domain !== VOID_NODE_ONION_BINDING_DOMAIN || value.signature.algorithm !== "ed25519" || value.signature.encoding !== "base64" || value.signature.canonicalization !== VOID_NODE_ONION_BINDING_CANONICALIZATION) fail("signature profile is invalid");

  const signature = Buffer.from(String(value.signature.value || ""), "base64");
  if (signature.length !== 64 || signature.toString("base64") !== value.signature.value) fail("signature value is not canonical 64-byte base64");
  if (!cryptoVerify(null, unsignedBindingBytesV1(value), publicKey.key, signature)) fail("Ed25519 signature verification failed");

  const issued = normalizeTimestamp(value.issued_at, "issued_at");
  const expires = normalizeTimestamp(value.expires_at, "expires_at");
  if (issued !== value.issued_at || expires !== value.expires_at) fail("timestamps must be canonical ISO-8601");
  const issuedMs = Date.parse(issued);
  const expiresMs = Date.parse(expires);
  if (expiresMs <= issuedMs || expiresMs - issuedMs > MAX_VALIDITY_MS) fail("binding validity interval is invalid");
  const nowMs = new Date(options.now ?? Date.now()).getTime();
  if (!Number.isFinite(nowMs)) fail("verification time is invalid");
  if (!options.allowNotYetValidWithinSkew && issuedMs > nowMs + CLOCK_SKEW_MS) fail("binding is not yet valid");
  if (expiresMs <= nowMs) fail("binding is expired");

  if (options.expectedNodeId && nodeId !== normalizeNodeId(options.expectedNodeId)) fail("binding node_id does not match expected node");
  if (options.expectedOnionHostname && hostname !== validateV3OnionHostname(options.expectedOnionHostname)) fail("binding onion hostname does not match expected onion service");
  if (options.expectedVirtualPort !== undefined && port !== assertPort(options.expectedVirtualPort)) fail("binding virtual port does not match expected port");

  return {
    binding: structuredClone(value),
    summary: {
      node_id: nodeId,
      key_type: "ed25519",
      public_key_fingerprint_sha256: publicKey.fingerprint,
      issued_at: issued,
      expires_at: expires,
      binding_paths: [...VOID_NODE_ONION_BINDING_PATHS],
    },
  };
}

export function readAndVerifyVoidNodeOnionBindingV1(pathValue, options = {}) {
  const path = resolve(pathValue);
  const stat = lstatSync(path);
  if (!stat.isFile() || stat.isSymbolicLink()) fail("binding file must be a regular non-symlink file");
  if (stat.size < 2 || stat.size > MAX_BINDING_BYTES) fail("binding file size is invalid");
  const value = JSON.parse(readFileSync(path, "utf8"));
  return verifyVoidNodeOnionBindingV1(value, options);
}
