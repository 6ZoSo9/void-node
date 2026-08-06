#!/usr/bin/env node
import process from "node:process";
import {
  DEFAULT_MANIFEST_VALIDITY_MS,
  buildBootstrapManifest,
  readJsonFile,
  writeJsonAtomic,
} from "./lib/void_public_seed_qualification_v1.mjs";

const MARKER = "VOID_PUBLIC_BOOTSTRAP_MANIFEST_BUILDER_V1";

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const values = {
    receipts: [],
    output: process.env.VOID_PUBLIC_BOOTSTRAP_MANIFEST_OUTPUT || "",
    validityHours: Number(process.env.VOID_PUBLIC_BOOTSTRAP_MANIFEST_VALIDITY_HOURS || 72),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) fail(`missing value after ${argument}`);
      return argv[index];
    };
    if (argument === "--receipt") values.receipts.push(next());
    else if (argument === "--output") values.output = next();
    else if (argument === "--validity-hours") values.validityHours = Number(next());
    else if (argument === "--help" || argument === "-h") {
      console.log(`Usage: node scripts/build_void_public_bootstrap_manifest_v1.mjs --receipt receipt.json [--receipt receipt2.json] --output public/bootstrap/v1.json\n\nThe builder rejects temporary tunnels, loopback/private DNS, stale or tampered receipts, short observation windows, and any receipt that exposes private or economic authority.\n`);
      process.exit(0);
    } else fail(`unknown argument ${argument}`);
  }
  return values;
}

const options = parseArgs(process.argv.slice(2));
if (options.receipts.length === 0) fail("at least one --receipt is required");
if (!Number.isFinite(options.validityHours)) fail("--validity-hours must be numeric");

try {
  const receipts = options.receipts.map((path) => readJsonFile(path, `qualification receipt ${path}`));
  const validityMs = options.validityHours * 60 * 60 * 1000 || DEFAULT_MANIFEST_VALIDITY_MS;
  const manifest = buildBootstrapManifest(receipts, { validityMs });
  if (options.output) writeJsonAtomic(options.output, manifest);
  console.error(`${MARKER}_GREEN`);
  console.error(`manifest_id=${manifest.manifest_id}`);
  console.error(`seed_count=${manifest.sync_endpoints.length}`);
  console.error(`expires_at=${manifest.expires_at}`);
  console.error("temporary_seeds_published=false");
  console.error("private_tailnet_endpoints_published=false");
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
} catch (error) {
  fail(error?.message || String(error));
}
