#!/usr/bin/env node
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  contentId,
} from "./lib/void_tor_native_bootstrap_transport_v1.mjs";
import {
  TOR_BOOTSTRAP_CHAIN_ID,
  TOR_BOOTSTRAP_NETWORK,
  TOR_BOOTSTRAP_RELEASE_ROOT_FILENAME,
  TOR_BOOTSTRAP_RELEASE_ROOT_SCHEMA,
  TOR_BOOTSTRAP_SIGNATURE_DOMAIN,
  TOR_BOOTSTRAP_SIGNED_MANIFEST_SCHEMA,
  torBootstrapManifestSigningPayload,
  torBootstrapReleaseKeyId,
  torBootstrapReleaseRootId,
  validateTorBootstrapReleaseRoot,
  validateTorBootstrapSignedManifest,
} from "./lib/void_tor_bootstrap_release_root_v1.mjs";

const MARKER = "VOID_TOR_BOOTSTRAP_RELEASE_ROOT_V1_PROOF";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRAPPER = path.join(ROOT, "scripts", "resolve_void_tor_public_bootstrap_release_root_v1.mjs");
const PRODUCTION_ROOT = path.join(ROOT, "config", TOR_BOOTSTRAP_RELEASE_ROOT_FILENAME);
const ONION = "ceirceirceirceirceirceirceirceirceirceirceirceircei7l4yd.onion";
const QUALIFICATION = `voidptq1_${"b".repeat(64)}`;
const AUTHORITY = Object.freeze({
  private_routes_exposed: false,
  wallet_authority: false,
  signer_authority: false,
  validator_authority: false,
  treasury_authority: false,
  work_credit_authority: false,
  money_movement_authority: false,
});
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "void-tor-release-root-proof-"));
const requested = [];

function stableJson(value) {
  const order = (entry) => {
    if (entry === null || typeof entry !== "object") return entry;
    if (Array.isArray(entry)) return entry.map(order);
    return Object.fromEntries(Object.keys(entry).sort().map((key) => [key, order(entry[key])]));
  };
  return `${JSON.stringify(order(value), null, 2)}\n`;
}

function writeJson(name, value) {
  const file = path.join(temporary, name);
  fs.writeFileSync(file, stableJson(value), { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  return file;
}

function runAsync(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = childProcess.spawn(command, args, {
      cwd: ROOT,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

function runSync(command, args, options = {}) {
  const result = childProcess.spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    env: { ...process.env, ...(options.env || {}) },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout || ""}${result.stderr || ""}`);
  }
  return String(result.stdout || "");
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

function createActiveRoot(keyPairs, threshold = keyPairs.length) {
  const body = {
    schema: TOR_BOOTSTRAP_RELEASE_ROOT_SCHEMA,
    network: TOR_BOOTSTRAP_NETWORK,
    chain_id: TOR_BOOTSTRAP_CHAIN_ID,
    status: "active",
    signature_domain: TOR_BOOTSTRAP_SIGNATURE_DOMAIN,
    threshold,
    keys: keyPairs.map(({ publicKey }) => {
      const der = publicKey.export({ type: "spki", format: "der" });
      return {
        key_id: torBootstrapReleaseKeyId(der),
        algorithm: "ed25519",
        public_key_spki_base64: der.toString("base64"),
      };
    }),
    authority: { ...AUTHORITY },
  };
  return { ...body, root_id: torBootstrapReleaseRootId(body) };
}

function createManifest(now = Date.now()) {
  const body = {
    schema: "void_public_bootstrap_v1",
    network: "VOID Network",
    chain_id: 2050,
    status: "stable_tor_seed",
    generated_at: new Date(now - 60_000).toISOString(),
    expires_at: new Date(now + 2 * 60 * 60 * 1000).toISOString(),
    sync_endpoints: [],
    onion_endpoints: [
      {
        transport: "tor_v3_http",
        base: `http://${ONION}`,
        priority: 0,
        enabled: true,
        temporary: false,
        qualification_id: QUALIFICATION,
        qualified_at: new Date(now - 60_000).toISOString(),
        qualified_head: 1856587,
      },
    ],
    private_tailnet_endpoints_published: false,
    authority: { ...AUTHORITY },
    notes: "release-root proof fixture",
  };
  return { ...body, manifest_id: contentId("voidpbm1_", body, "manifest_id") };
}

function createEnvelope(root, manifest, keyPairs) {
  const payload = torBootstrapManifestSigningPayload(root, manifest);
  return {
    schema: TOR_BOOTSTRAP_SIGNED_MANIFEST_SCHEMA,
    root_id: root.root_id,
    manifest,
    signatures: keyPairs.map(({ privateKey, publicKey }) => {
      const der = publicKey.export({ type: "spki", format: "der" });
      return {
        key_id: torBootstrapReleaseKeyId(der),
        signature_base64: crypto.sign(null, payload, privateKey).toString("base64"),
      };
    }),
  };
}

function createSocksFixture() {
  return net.createServer((socket) => {
    socket.once("data", (greeting) => {
      assert.deepEqual([...greeting], [0x05, 0x01, 0x00]);
      socket.write(Buffer.from([0x05, 0x00]));
      socket.once("data", (connectRequest) => {
        assert.equal(connectRequest[0], 0x05);
        assert.equal(connectRequest[1], 0x01);
        assert.equal(connectRequest[3], 0x03);
        const length = connectRequest[4];
        const hostname = connectRequest.subarray(5, 5 + length).toString("ascii");
        const port = connectRequest.readUInt16BE(5 + length);
        requested.push({ hostname, port });
        socket.write(Buffer.from([0x05, 0x00, 0x00, 0x01, 127, 0, 0, 1, 0, 80]));
        socket.once("data", (httpRequest) => {
          const request = httpRequest.toString("utf8");
          assert.match(request, /^GET \/__void\/ready\.json HTTP\/1\.1\r\n/);
          assert.match(request, new RegExp(`\r\nHost: ${ONION.replaceAll(".", "\\.")}\r\n`));
          const body = `${JSON.stringify({ ready: true, head: 1856587, gap: 0, txroot_live: 1 })}\n`;
          socket.end([
            "HTTP/1.1 200 OK",
            "Content-Type: application/json; charset=utf-8",
            "X-VOID-Public-Seed-Gateway: v1",
            `Content-Length: ${Buffer.byteLength(body)}`,
            "Connection: close",
            "",
            body,
          ].join("\r\n"));
        });
      });
    });
  });
}

function changedBase64(value) {
  const bytes = Buffer.from(value, "base64");
  bytes[0] ^= 0x01;
  return bytes.toString("base64");
}

const socks = createSocksFixture();
try {
  const keyPair = crypto.generateKeyPairSync("ed25519");
  const root = createActiveRoot([keyPair], 1);
  const manifest = createManifest();
  const envelope = createEnvelope(root, manifest, [keyPair]);
  const rootFile = writeJson("active-root.json", root);
  const envelopeFile = writeJson("signed-manifest.json", envelope);

  const validatedRoot = validateTorBootstrapReleaseRoot(root, { allowHold: false });
  const validatedEnvelope = validateTorBootstrapSignedManifest(envelope, validatedRoot);
  assert.equal(validatedEnvelope.manifestId, manifest.manifest_id);
  assert.equal(validatedEnvelope.validSignatureCount, 1);
  console.log("[PASS] active embedded Ed25519 release-root contract");

  const overrideRejected = await runAsync(process.execPath, [
    WRAPPER,
    "--release-root-file", rootFile,
    "--signed-manifest-file", envelopeFile,
    "--verify-only",
  ]);
  assert.equal(overrideRejected.code, 1);
  assert.match(overrideRejected.stderr, /release-root override is test-only/);
  assert.equal(requested.length, 0);
  console.log("[PASS] embedded release root cannot be replaced without the explicit test-only gate");

  const verifyOnly = await runAsync(process.execPath, [
    WRAPPER,
    "--release-root-file", rootFile,
    "--signed-manifest-file", envelopeFile,
    "--test-only-allow-release-root-override",
    "--verify-only",
  ], {
    VOID_TOR_BOOTSTRAP_TEST_ONLY: "1",
  });
  assert.equal(verifyOnly.code, 0, verifyOnly.stderr);
  assert.equal(verifyOnly.signal, null);
  assert.equal(verifyOnly.stdout.trim(), manifest.manifest_id);
  assert.match(verifyOnly.stderr, /manual_manifest_id_required=false/);
  assert.match(verifyOnly.stderr, /_VERIFY_GREEN/);
  console.log("[PASS] manual manifest-ID entry removed by release-root verification");

  const socksPort = await listen(socks);
  const live = await runAsync(process.execPath, [
    WRAPPER,
    "--release-root-file", rootFile,
    "--signed-manifest-file", envelopeFile,
    "--test-only-allow-release-root-override",
  ], {
    VOID_TOR_BOOTSTRAP_TEST_ONLY: "1",
    VOID_TOR_SOCKS_PORT: String(socksPort),
    VOID_TOR_BOOTSTRAP_TIMEOUT_MS: "3000",
  });
  assert.equal(live.code, 0, live.stderr);
  assert.equal(live.signal, null);
  assert.equal(live.stdout.trim(), `http://${ONION}`);
  assert.match(live.stderr, /VOID_TOR_PUBLIC_BOOTSTRAP_RELEASE_ROOT_RESOLVER_V1_GREEN/);
  assert.match(live.stderr, /VOID_TOR_PUBLIC_BOOTSTRAP_RESOLVER_V1_GREEN/);
  assert.deepEqual(requested, [{ hostname: ONION, port: 80 }]);
  await close(socks);
  console.log("[PASS] release root to signed manifest to Tor resolver composition");

  const productionHold = JSON.parse(fs.readFileSync(PRODUCTION_ROOT, "utf8"));
  assert.equal(productionHold.status, "hold_no_signing_keys");
  assert.throws(
    () => validateTorBootstrapReleaseRoot(productionHold, { allowHold: false }),
    /hold state/,
  );
  console.log("[PASS] production root remains explicit hold without a signing key");

  const modifiedEnvelope = structuredClone(envelope);
  modifiedEnvelope.manifest.notes = "substituted";
  assert.throws(
    () => validateTorBootstrapSignedManifest(modifiedEnvelope, validatedRoot),
    /manifest ID does not match/,
  );

  const invalidSignature = structuredClone(envelope);
  invalidSignature.signatures[0].signature_base64 = changedBase64(
    invalidSignature.signatures[0].signature_base64,
  );
  assert.throws(
    () => validateTorBootstrapSignedManifest(invalidSignature, validatedRoot),
    /signature verification failed/,
  );

  const duplicateSignature = structuredClone(envelope);
  duplicateSignature.signatures.push(structuredClone(duplicateSignature.signatures[0]));
  assert.throws(
    () => validateTorBootstrapSignedManifest(duplicateSignature, validatedRoot),
    /duplicate signature key ID/,
  );

  const secondPair = crypto.generateKeyPairSync("ed25519");
  const thresholdRoot = createActiveRoot([keyPair, secondPair], 2);
  const thresholdEnvelope = createEnvelope(thresholdRoot, manifest, [keyPair]);
  assert.throws(
    () => validateTorBootstrapSignedManifest(
      thresholdEnvelope,
      validateTorBootstrapReleaseRoot(thresholdRoot, { allowHold: false }),
    ),
    /threshold was not met/,
  );

  const unknownRoot = structuredClone(root);
  unknownRoot.unknown = true;
  assert.throws(
    () => validateTorBootstrapReleaseRoot(unknownRoot),
    /keys mismatch/,
  );

  const stringChainRoot = structuredClone(root);
  stringChainRoot.chain_id = String(TOR_BOOTSTRAP_CHAIN_ID);
  stringChainRoot.root_id = torBootstrapReleaseRootId(stringChainRoot);
  assert.throws(
    () => validateTorBootstrapReleaseRoot(stringChainRoot, { allowHold: false }),
    /network contract mismatch/,
  );

  const resealedUnknownManifest = structuredClone(manifest);
  resealedUnknownManifest.unknown = true;
  resealedUnknownManifest.manifest_id = contentId(
    "voidpbm1_",
    resealedUnknownManifest,
    "manifest_id",
  );
  const resealedUnknownEnvelope = createEnvelope(
    root,
    resealedUnknownManifest,
    [keyPair],
  );
  assert.throws(
    () => validateTorBootstrapSignedManifest(resealedUnknownEnvelope, validatedRoot),
    /signed manifest keys mismatch/,
  );

  const expiredManifest = structuredClone(manifest);
  expiredManifest.generated_at = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  expiredManifest.expires_at = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  expiredManifest.manifest_id = contentId(
    "voidpbm1_",
    expiredManifest,
    "manifest_id",
  );
  const expiredEnvelope = createEnvelope(root, expiredManifest, [keyPair]);
  assert.throws(
    () => validateTorBootstrapSignedManifest(expiredEnvelope, validatedRoot),
    /signed manifest is expired/,
  );

  const authorityManifest = structuredClone(manifest);
  authorityManifest.authority.wallet_authority = true;
  authorityManifest.manifest_id = contentId(
    "voidpbm1_",
    authorityManifest,
    "manifest_id",
  );
  const authorityEnvelope = createEnvelope(root, authorityManifest, [keyPair]);
  assert.throws(
    () => validateTorBootstrapSignedManifest(authorityEnvelope, validatedRoot),
    /wallet_authority must be false/,
  );
  console.log("[PASS] signature verification also enforces the complete Tor manifest contract");

  const forgedEnvelope = createEnvelope(root, manifest, [secondPair]);
  const secondDer = secondPair.publicKey.export({ type: "spki", format: "der" });
  const forgedValidatedRoot = {
    root,
    keys: [{
      key_id: torBootstrapReleaseKeyId(secondDer),
      publicKey: secondPair.publicKey,
    }],
  };
  assert.throws(
    () => validateTorBootstrapSignedManifest(forgedEnvelope, forgedValidatedRoot),
    /unknown key/,
  );

  const originalDer = keyPair.publicKey.export({ type: "spki", format: "der" });
  const nonCanonicalDer = Buffer.concat([originalDer, Buffer.from([0])]);
  const nonCanonicalBody = {
    schema: TOR_BOOTSTRAP_RELEASE_ROOT_SCHEMA,
    network: TOR_BOOTSTRAP_NETWORK,
    chain_id: TOR_BOOTSTRAP_CHAIN_ID,
    status: "active",
    signature_domain: TOR_BOOTSTRAP_SIGNATURE_DOMAIN,
    threshold: 1,
    keys: [{
      key_id: torBootstrapReleaseKeyId(nonCanonicalDer),
      algorithm: "ed25519",
      public_key_spki_base64: nonCanonicalDer.toString("base64"),
    }],
    authority: { ...AUTHORITY },
  };
  const nonCanonicalRoot = {
    ...nonCanonicalBody,
    root_id: torBootstrapReleaseRootId(nonCanonicalBody),
  };
  assert.throws(
    () => validateTorBootstrapReleaseRoot(nonCanonicalRoot, { allowHold: false }),
    /invalid|canonical DER/,
  );
  console.log("[PASS] prevalidated-root forgery and noncanonical public-key encodings rejected");

  const substitutedRoot = createActiveRoot([secondPair], 1);
  assert.throws(
    () => validateTorBootstrapSignedManifest(
      envelope,
      validateTorBootstrapReleaseRoot(substitutedRoot, { allowHold: false }),
    ),
    /root ID mismatch/,
  );
  console.log("[PASS] substitution, signature, duplicate, threshold, and schema boundaries");

  const symlinkRoot = path.join(temporary, "root-link.json");
  fs.symlinkSync(rootFile, symlinkRoot);
  const symlinkResult = await runAsync(process.execPath, [
    WRAPPER,
    "--release-root-file", symlinkRoot,
    "--signed-manifest-file", envelopeFile,
    "--test-only-allow-release-root-override",
    "--verify-only",
  ], {
    VOID_TOR_BOOTSTRAP_TEST_ONLY: "1",
  });
  assert.equal(symlinkResult.code, 1);
  assert.match(symlinkResult.stderr, /regular non-symlink/);

  const manualResult = await runAsync(process.execPath, [
    WRAPPER,
    "--release-root-file", rootFile,
    "--signed-manifest-file", envelopeFile,
    "--test-only-allow-release-root-override",
    "--verify-only",
  ], {
    VOID_TOR_BOOTSTRAP_TEST_ONLY: "1",
    VOID_TOR_BOOTSTRAP_EXPECTED_MANIFEST_ID: manifest.manifest_id,
  });
  assert.equal(manualResult.code, 1);
  assert.match(manualResult.stderr, /manual expected manifest ID must not be supplied/);
  assert.equal(requested.length, 1);
  console.log("[PASS] symlink and manual-ID ambiguity rejected before network access");

  if (process.argv.includes("--full")) {
    const out = path.join(temporary, "release-out");
    runSync(process.execPath, [
      "tools/build-public-release-v1.mjs",
      "--out", out,
      "--version", "0.0.0-tor-root-proof",
      "--source-date-epoch", "1700000000",
    ]);
    const releaseManifest = JSON.parse(
      fs.readFileSync(path.join(out, "void-node-release-manifest.json"), "utf8"),
    );
    const archive = path.join(out, releaseManifest.archive);
    const listing = runSync("tar", ["-tzf", archive]).split("\n").filter(Boolean);
    const embeddedPath = listing.find((entry) =>
      entry.endsWith(`/config/${TOR_BOOTSTRAP_RELEASE_ROOT_FILENAME}`),
    );
    assert.ok(embeddedPath, "release archive does not embed the Tor bootstrap root");
    const embedded = runSync("tar", ["-xOzf", archive, embeddedPath]);
    assert.equal(embedded, fs.readFileSync(PRODUCTION_ROOT, "utf8"));
    const top = embeddedPath.split("/")[0];
    const contents = runSync("tar", ["-xOzf", archive, `${top}/RELEASE-CONTENTS-SHA256`]);
    const expectedHash = crypto.createHash("sha256")
      .update(fs.readFileSync(PRODUCTION_ROOT))
      .digest("hex");
    assert.match(
      contents,
      new RegExp(`^${expectedHash}  config/${TOR_BOOTSTRAP_RELEASE_ROOT_FILENAME}$`, "m"),
    );
    console.log("[PASS] release archive embeds and internally hashes the hold trust root");
  }

  console.log(`${MARKER}_GREEN`);
  console.log("release_root_content_addressed=true");
  console.log("release_root_signature_algorithm=ed25519");
  console.log("signed_manifest_threshold_enforced=true");
  console.log("manual_manifest_id_required=false");
  console.log("production_private_key_generated=false");
  console.log("production_release_root_status=hold_no_signing_keys");
  console.log("manifest_substitution_rejected=true");
  console.log("root_substitution_rejected=true");
  console.log("signature_replay_across_roots_rejected=true");
  console.log("strict_manifest_contract_verified=true");
  console.log("embedded_release_root_override_rejected=true");
  console.log("forged_prevalidated_root_rejected=true");
  console.log("canonical_public_key_der_required=true");
  console.log("dns_resolution_required=false");
  console.log("domain_registrar_required=false");
  console.log("certificate_authority_required=false");
  console.log("cloud_provider_required=false");
  console.log("wallet_signer_validator_wc_money_authority=0");
} finally {
  if (socks.listening) await close(socks);
  fs.rmSync(temporary, { recursive: true, force: true });
}
