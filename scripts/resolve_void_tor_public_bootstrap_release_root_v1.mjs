#!/usr/bin/env node
import childProcess from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  TOR_BOOTSTRAP_RELEASE_ROOT_FILENAME,
  loadTorBootstrapReleaseRootFile,
  loadTorBootstrapSignedManifestFile,
} from "./lib/void_tor_bootstrap_release_root_v1.mjs";

const MARKER = "VOID_TOR_PUBLIC_BOOTSTRAP_RELEASE_ROOT_RESOLVER_V1";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RESOLVER = path.join(ROOT, "scripts", "resolve_void_tor_public_bootstrap_v1.mjs");

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const values = {
    releaseRootFile: process.env.VOID_TOR_BOOTSTRAP_RELEASE_ROOT_FILE || "",
    signedManifestFile: process.env.VOID_TOR_BOOTSTRAP_SIGNED_MANIFEST_FILE || "",
    verifyOnly: false,
    testOnlyAllowReleaseRootOverride: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`missing value after ${argument}`);
      return argv[index];
    };
    if (argument === "--release-root-file") values.releaseRootFile = next();
    else if (argument === "--signed-manifest-file") values.signedManifestFile = next();
    else if (argument === "--verify-only") values.verifyOnly = true;
    else if (argument === "--test-only-allow-release-root-override") {
      values.testOnlyAllowReleaseRootOverride = true;
    } else throw new Error(`unexpected argument ${argument}`);
  }
  if (String(process.env.VOID_TOR_BOOTSTRAP_EXPECTED_MANIFEST_ID || "").trim()) {
    throw new Error("manual expected manifest ID must not be supplied in release-root mode");
  }
  if (values.releaseRootFile) {
    if (
      !values.testOnlyAllowReleaseRootOverride ||
      process.env.VOID_TOR_BOOTSTRAP_TEST_ONLY !== "1"
    ) {
      throw new Error(
        "release-root override is test-only and requires both the explicit flag and VOID_TOR_BOOTSTRAP_TEST_ONLY=1",
      );
    }
  } else if (values.testOnlyAllowReleaseRootOverride) {
    throw new Error("test-only release-root override flag requires an explicit root file");
  }
  if (!values.signedManifestFile) {
    throw new Error("signed Tor bootstrap manifest envelope is required");
  }
  return values;
}

function defaultReleaseRootFile() {
  const embedded = path.join(ROOT, "bootstrap", TOR_BOOTSTRAP_RELEASE_ROOT_FILENAME);
  if (fs.existsSync(embedded)) return embedded;
  const source = path.join(ROOT, "config", TOR_BOOTSTRAP_RELEASE_ROOT_FILENAME);
  if (fs.existsSync(source)) return source;
  throw new Error("embedded Tor bootstrap release root is missing");
}

function writePrivateManifest(directory, manifest) {
  const file = path.join(directory, "verified-tor-bootstrap-manifest.json");
  fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
  return file;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const releaseRootFile = args.releaseRootFile || defaultReleaseRootFile();
  const releaseRoot = loadTorBootstrapReleaseRootFile(releaseRootFile, { allowHold: false });
  const signed = loadTorBootstrapSignedManifestFile(args.signedManifestFile, releaseRoot);

  console.error(`marker=${MARKER}`);
  console.error(`release_root=${releaseRoot.target}`);
  console.error(`release_root_id=${releaseRoot.root.root_id}`);
  console.error(`signed_manifest=${signed.target}`);
  console.error(`manifest_id=${signed.manifestId}`);
  console.error(`valid_signature_count=${signed.validSignatureCount}`);
  console.error(
    `test_only_release_root_override=${args.testOnlyAllowReleaseRootOverride ? "true" : "false"}`,
  );
  console.error("manual_manifest_id_required=false");
  console.error("dns_resolution_required=false");
  console.error("domain_registrar_required=false");
  console.error("certificate_authority_required=false");
  console.error("cloud_provider_required=false");

  if (args.verifyOnly) {
    console.error(`${MARKER}_VERIFY_GREEN`);
    process.stdout.write(`${signed.manifestId}\n`);
    return;
  }

  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "void-tor-release-root-resolver-"));
  try {
    fs.chmodSync(temporary, 0o700);
    const manifestFile = writePrivateManifest(temporary, signed.manifest);
    const env = { ...process.env };
    delete env.VOID_TOR_BOOTSTRAP_EXPECTED_MANIFEST_ID;
    delete env.VOID_TOR_BOOTSTRAP_MANIFEST_FILE;
    const result = childProcess.spawnSync(
      process.execPath,
      [
        RESOLVER,
        "--manifest-file",
        manifestFile,
        "--expected-manifest-id",
        signed.manifestId,
      ],
      {
        cwd: ROOT,
        env,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 128 * 1024 * 1024,
      },
    );
    if (result.error) throw result.error;
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.status !== 0) {
      throw new Error(`Tor bootstrap resolver failed with rc=${result.status}`);
    }
    console.error(`${MARKER}_GREEN`);
    process.stdout.write(String(result.stdout || ""));
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

main().catch((error) => fail(error?.stack || String(error)));
