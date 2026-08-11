#!/usr/bin/env node
import process from "node:process";
import {
  DEFAULT_MAX_RESPONSE_BYTES,
  qualifyPublicSeed,
  writeJsonAtomic,
} from "./lib/void_public_seed_qualification_v1.mjs";

const MARKER = "VOID_PUBLIC_SEED_QUALIFICATION_V1";
const GREEN_MARKER = "VOID_PUBLIC_SEED_QUALIFICATION_V1_GREEN";

function fail(message) {
  console.error(`${MARKER}_FAIL: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const values = {
    endpoint: process.env.VOID_PUBLIC_SEED_CANDIDATE || "",
    samples: Number(process.env.VOID_PUBLIC_SEED_QUALIFICATION_SAMPLES || 3),
    intervalMs: Number(process.env.VOID_PUBLIC_SEED_QUALIFICATION_INTERVAL_MS || 30_000),
    timeoutMs: Number(process.env.VOID_PUBLIC_SEED_QUALIFICATION_TIMEOUT_MS || 10_000),
    maxBytes: Number(
      process.env.VOID_PUBLIC_SEED_QUALIFICATION_MAX_BYTES || DEFAULT_MAX_RESPONSE_BYTES,
    ),
    output: process.env.VOID_PUBLIC_SEED_QUALIFICATION_OUTPUT || "",
    allowLoopbackFixture:
      process.env.VOID_PUBLIC_SEED_QUALIFICATION_ALLOW_LOOPBACK_FIXTURE === "1",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) fail(`missing value after ${argument}`);
      return argv[index];
    };
    if (argument === "--endpoint") values.endpoint = next();
    else if (argument === "--samples") values.samples = Number(next());
    else if (argument === "--interval-ms") values.intervalMs = Number(next());
    else if (argument === "--timeout-ms") values.timeoutMs = Number(next());
    else if (argument === "--max-bytes") values.maxBytes = Number(next());
    else if (argument === "--output") values.output = next();
    else if (argument === "--allow-loopback-fixture") values.allowLoopbackFixture = true;
    else if (argument === "--help" || argument === "-h") {
      console.log(`Usage: node scripts/qualify_void_public_seed_v1.mjs --endpoint https://seed.example-or-public-ip [options]\n\nOptions:\n  --samples N          Number of live samples (default: 3)\n  --interval-ms N      Delay between samples (default: 30000)\n  --timeout-ms N       Per-request timeout (default: 10000)\n  --max-bytes N        Maximum response bytes (default: 16777216)\n  --output PATH        Write the qualification receipt atomically\n`);
      process.exit(0);
    } else fail(`unknown argument ${argument}`);
  }
  return values;
}

const options = parseArgs(process.argv.slice(2));
if (!options.endpoint) fail("--endpoint or VOID_PUBLIC_SEED_CANDIDATE is required");

try {
  const receipt = await qualifyPublicSeed(options.endpoint, {
    sampleCount: options.samples,
    intervalMs: options.intervalMs,
    timeoutMs: options.timeoutMs,
    maxBytes: options.maxBytes,
    allowLoopbackFixture: options.allowLoopbackFixture,
    onSample(sample, index, total) {
      console.error(
        `${MARKER}_SAMPLE index=${index}/${total} head=${sample.head} observed_at=${sample.observed_at}`,
      );
    },
  });
  if (options.output) writeJsonAtomic(options.output, receipt);
  console.error(GREEN_MARKER);
  console.error(`qualification_id=${receipt.qualification_id}`);
  console.error(`endpoint=${receipt.endpoint}`);
  console.error(`address_source=${receipt.address_source}`);
  console.error(`sample_count=${receipt.sample_count}`);
  console.error("temporary_provider=false");
  console.error("private_routes_exposed=false");
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
} catch (error) {
  fail(error?.message || String(error));
}
