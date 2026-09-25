#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import childProcess from "node:child_process";
import { pathToFileURL } from "node:url";

const MARKER = "VOID_NIMO_TOR_MANIFEST_OFFLINE_SIGN_V2";
const REPO = process.env.VOID_NODE_ROOT || path.join(os.homedir(), "dev", "void-node");
const EXPECTED_HEAD = "b3dd74142ce33ffe3c456a42822e98eee885e4d9";
const EXPECTED_ROOT_ID = "voidptr1_14f2cba76fc64e04cf8efd50e300dba21170f59e2c3441b33f6b415d31b1b839";
const EXPECTED_KEY_ID = "voidtpk1_6111a98528baf5e781f02456b17bd8f5f01ec0a5e81432366564e515be705c94";
const EXPECTED_MANIFEST_ID = "voidpbm1_7e0b4b4ece2de85c340a59a460eff3fb71aa7b7efe7cb9fa11ce523b52c3940f";
const EXPECTED_MANIFEST_SHA256 = "313331abd311fe3abb0f6809b623c7c6c9ead7f0caed13e22a92d0e1169c7f0e";
const EXPECTED_QUALIFICATION_ID = "voidptq1_0b74fcb71ee546b71ce988c47d250d899c0fc1a20011acaf5bfacef2d8429820";
const EXPECTED_QUALIFICATION_SHA256 = "713673d070ba3c5deb757e2705b1714ea2bd987eac420bc39201b0f8e12564d2";
const EXPECTED_ONION = "6a4r6osb37sp2t6nbx7dpdnq5wfdzdrn5axt7t33kduzuznarqqpnkid.onion";
const EXPECTED_EXPIRY = "2026-09-25T02:38:57.981Z";

const POINTER = path.join(
  os.homedir(),
  ".local",
  "state",
  "void",
  "tor-bootstrap-manifest-v1",
  "current-candidate-path",
);
const PRIVATE_KEY = path.join(
  os.homedir(),
  ".local",
  "share",
  "void",
  "tor-bootstrap-release-key-v1",
  "private",
  "tor-bootstrap-release-key-v1.pkcs8.pem",
);
const OUTPUT_DIR = path.join(
  os.homedir(),
  ".local",
  "state",
  "void",
  "tor-bootstrap-manifest-v1",
);

function run(command, args, { allowFailure = false } = {}) {
  const result = childProcess.spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (!allowFailure && result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed: ${(result.stderr || result.stdout || "").trim()}`,
    );
  }
  return {
    status: result.status,
    stdout: String(result.stdout || "").trim(),
    stderr: String(result.stderr || "").trim(),
  };
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function requireRegularFile(target, label) {
  const resolved = fs.realpathSync(target);
  if (resolved !== path.resolve(target)) {
    throw new Error(`${label} path is not canonical`);
  }
  const stat = fs.lstatSync(resolved);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`${label} is not a regular file`);
  }
  return { resolved, stat };
}

function refuseIfOnline() {
  const ipv4 = run("ip", ["-4", "route", "show", "default"], { allowFailure: true });
  const ipv6 = run("ip", ["-6", "route", "show", "default"], { allowFailure: true });
  if (ipv4.stdout || ipv6.stdout) {
    throw new Error(
      `network default route is present; disconnect every network interface before signing; ipv4=${JSON.stringify(ipv4.stdout)} ipv6=${JSON.stringify(ipv6.stdout)}`,
    );
  }
}

console.log(MARKER);
console.log(`repo=${REPO}`);
console.log(`expected_head=${EXPECTED_HEAD}`);
console.log(`expected_root_id=${EXPECTED_ROOT_ID}`);
console.log(`expected_key_id=${EXPECTED_KEY_ID}`);
console.log(`expected_manifest_id=${EXPECTED_MANIFEST_ID}`);
console.log(`expected_manifest_sha256=${EXPECTED_MANIFEST_SHA256}`);
console.log(`expected_qualification_id=${EXPECTED_QUALIFICATION_ID}`);
console.log(`expected_qualification_sha256=${EXPECTED_QUALIFICATION_SHA256}`);
console.log("network_required=false");
console.log("network_calls=false");
console.log("private_key_read=true");
console.log("wallet_or_signer_access=false");
console.log("validator_authority=false");
console.log("work_credit_authority=false");
console.log("transaction_signing=false");
console.log("transaction_broadcast=false");
console.log("chain2050_write=false");
console.log("funds_movement=false");

refuseIfOnline();
console.log("default_ipv4_route_present=false");
console.log("default_ipv6_route_present=false");
console.log("offline_signing_gate=true");

if (run("git", ["-C", REPO, "branch", "--show-current"]).stdout !== "main") {
  throw new Error("repository branch is not main");
}
if (run("git", ["-C", REPO, "status", "--porcelain=v1"]).stdout !== "") {
  throw new Error("repository is dirty");
}
if (run("git", ["-C", REPO, "rev-parse", "HEAD"]).stdout !== EXPECTED_HEAD) {
  throw new Error("repository head mismatch");
}
console.log("repository_exact_head=true");

const rootFile = path.join(REPO, "config", "void-tor-bootstrap-release-root-v1.json");
requireRegularFile(rootFile, "production Tor release root");
const rootRaw = JSON.parse(fs.readFileSync(rootFile, "utf8"));

const lib = await import(
  pathToFileURL(
    path.join(REPO, "scripts", "lib", "void_tor_bootstrap_release_root_v1.mjs"),
  ).href
);

const validatedRoot = lib.validateTorBootstrapReleaseRoot(rootRaw, {
  allowHold: false,
});
if (
  validatedRoot.root.root_id !== EXPECTED_ROOT_ID ||
  validatedRoot.root.status !== "active" ||
  validatedRoot.root.threshold !== 1 ||
  validatedRoot.root.keys.length !== 1 ||
  validatedRoot.root.keys[0].key_id !== EXPECTED_KEY_ID
) {
  throw new Error("production Tor release-root identity mismatch");
}
console.log("production_root_active=true");

requireRegularFile(POINTER, "candidate pointer");
const manifestPath = fs.readFileSync(POINTER, "utf8").trim();
if (!path.isAbsolute(manifestPath)) {
  throw new Error("candidate pointer is not an absolute path");
}
const manifestInfo = requireRegularFile(manifestPath, "unsigned manifest");
const manifestBytes = fs.readFileSync(manifestInfo.resolved);
if (sha256(manifestBytes) !== EXPECTED_MANIFEST_SHA256) {
  throw new Error("unsigned manifest SHA-256 mismatch");
}
const manifest = JSON.parse(manifestBytes.toString("utf8"));
const validatedManifest = lib.validateTorBootstrapManifestContract(manifest, Date.now());
if (validatedManifest.manifestId !== EXPECTED_MANIFEST_ID) {
  throw new Error("unsigned manifest ID mismatch");
}
if (
  manifest.onion_endpoints?.length !== 1 ||
  manifest.onion_endpoints[0]?.qualification_id !== EXPECTED_QUALIFICATION_ID ||
  manifest.onion_endpoints[0]?.base !== `http://${EXPECTED_ONION}` ||
  manifest.expires_at !== EXPECTED_EXPIRY
) {
  throw new Error("unsigned manifest public endpoint binding mismatch");
}
if (!String(manifest.notes || "").includes(EXPECTED_QUALIFICATION_SHA256)) {
  throw new Error("unsigned manifest notes do not bind the expected qualification receipt SHA-256");
}
if (!String(manifest.notes || "").includes("external GitHub reachability confirmed after Wi-Fi Tor restart")) {
  throw new Error("unsigned manifest does not bind the external reachability fact");
}

const remainingMs = Date.parse(manifest.expires_at) - Date.now();
if (!Number.isFinite(remainingMs) || remainingMs < 20 * 60 * 1000) {
  throw new Error(
    `unsigned manifest has insufficient remaining lifetime: ${Math.floor(remainingMs / 1000)} seconds`,
  );
}
console.log(`manifest_file=${manifestInfo.resolved}`);
console.log(`manifest_remaining_seconds=${Math.floor(remainingMs / 1000)}`);
console.log("manifest_contract_valid=true");

const privateInfo = requireRegularFile(PRIVATE_KEY, "Tor bootstrap private key");
if ((privateInfo.stat.mode & 0o777) !== 0o600) {
  throw new Error("Tor bootstrap private key mode must be 0600");
}
const privatePem = fs.readFileSync(privateInfo.resolved, "utf8");
const privateKey = crypto.createPrivateKey(privatePem);
if (privateKey.asymmetricKeyType !== "ed25519") {
  throw new Error("Tor bootstrap private key is not Ed25519");
}
const derivedPublic = crypto.createPublicKey(privateKey);
const publicDer = Buffer.from(
  derivedPublic.export({ type: "spki", format: "der" }),
);
const derivedKeyId = lib.torBootstrapReleaseKeyId(publicDer);
if (derivedKeyId !== EXPECTED_KEY_ID) {
  throw new Error("private key does not derive the committed Tor release key ID");
}
const committedPublic = Buffer.from(
  validatedRoot.root.keys[0].public_key_spki_base64,
  "base64",
);
if (!publicDer.equals(committedPublic)) {
  throw new Error("private key public half does not match committed Tor release root");
}
console.log("private_key_matches_committed_public_key=true");

const payload = lib.torBootstrapManifestSigningPayload(
  validatedRoot.root,
  validatedManifest.manifest,
);
const signature = crypto.sign(null, payload, privateKey);
if (signature.length !== 64) {
  throw new Error(`unexpected Ed25519 signature length: ${signature.length}`);
}

const envelope = {
  schema: "void_tor_bootstrap_signed_manifest_v1",
  root_id: EXPECTED_ROOT_ID,
  manifest: validatedManifest.manifest,
  signatures: [
    {
      key_id: EXPECTED_KEY_ID,
      signature_base64: signature.toString("base64"),
    },
  ],
};

const validatedEnvelope = lib.validateTorBootstrapSignedManifest(
  envelope,
  validatedRoot,
  { nowMs: Date.now() },
);
if (
  validatedEnvelope.manifestId !== EXPECTED_MANIFEST_ID ||
  validatedEnvelope.validSignatureCount !== 1
) {
  throw new Error("signed Tor manifest envelope did not validate exactly");
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true, mode: 0o700 });
fs.chmodSync(OUTPUT_DIR, 0o700);
const stamp = new Date().toISOString().replace(/[-:.]/g, "");
const output = path.join(
  OUTPUT_DIR,
  `signed-tor-bootstrap-${EXPECTED_HEAD}-${stamp}-refresh-v2.json`,
);
if (fs.existsSync(output)) {
  throw new Error("signed envelope output already exists");
}
fs.writeFileSync(output, `${JSON.stringify(envelope, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx",
  mode: 0o600,
});
fs.chmodSync(output, 0o600);

const outputBytes = fs.readFileSync(output);
const reread = JSON.parse(outputBytes.toString("utf8"));
const rereadValidation = lib.validateTorBootstrapSignedManifest(
  reread,
  validatedRoot,
  { nowMs: Date.now() },
);
if (
  rereadValidation.manifestId !== EXPECTED_MANIFEST_ID ||
  rereadValidation.validSignatureCount !== 1
) {
  throw new Error("persisted signed envelope failed validation");
}

const signedPointer = path.join(OUTPUT_DIR, "current-signed-envelope-path");
fs.writeFileSync(signedPointer, `${output}\n`, {
  encoding: "utf8",
  flag: fs.existsSync(signedPointer) ? "w" : "wx",
  mode: 0o600,
});
fs.chmodSync(signedPointer, 0o600);

console.log("signature_generated=true");
console.log("signature_algorithm=ed25519");
console.log("valid_signature_count=1");
console.log(`manifest_id=${EXPECTED_MANIFEST_ID}`);
console.log(`qualification_id=${EXPECTED_QUALIFICATION_ID}`);
console.log(`signed_envelope_file=${output}`);
console.log(`signed_envelope_sha256=${sha256(outputBytes)}`);
console.log(`signed_pointer=${signedPointer}`);
console.log("private_key_printed=false");
console.log("private_key_exported=false");
console.log("publication_performed=false");
console.log(`${MARKER}_GREEN`);
console.log("next_gate=reconnect_and_export_refreshed_public_signed_envelope");
