#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

export const VOID_PUBLIC_BOOTSTRAP_COMMITTED_FRESHNESS_V1 =
  "VOID_PUBLIC_BOOTSTRAP_COMMITTED_FRESHNESS_V1";
export const DEFAULT_MIN_REMAINING_SECONDS_V1 = 24 * 60 * 60;

const AUTHORITY_KEYS = Object.freeze([
  "private_routes_exposed",
  "wallet_authority",
  "signer_authority",
  "validator_authority",
  "treasury_authority",
  "work_credit_authority",
  "money_movement_authority",
]);

function objectV1(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + " must be an object");
  }
  return value;
}

function timeMsV1(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(label + " must be a timestamp string");
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(label + " is invalid");
  return parsed;
}

function safeIntegerV1(value, label, minimum = 0) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(label + " must be a safe integer >= " + minimum);
  }
  return parsed;
}

export function assessCommittedBootstrapFreshnessV1(
  manifest,
  {
    nowMs = Date.now(),
    minRemainingSeconds = DEFAULT_MIN_REMAINING_SECONDS_V1,
  } = {},
) {
  const value = objectV1(manifest, "bootstrap manifest");
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) {
    throw new Error("nowMs must be a positive safe integer");
  }
  const minSeconds = safeIntegerV1(
    minRemainingSeconds,
    "minRemainingSeconds",
    0,
  );
  if (minSeconds > 7 * 24 * 60 * 60) {
    throw new Error("minRemainingSeconds exceeds seven days");
  }

  if (value.schema !== "void_public_bootstrap_v1") {
    throw new Error("bootstrap manifest schema mismatch");
  }
  if (value.network !== "VOID Network" || value.chain_id !== 2050) {
    throw new Error("bootstrap manifest network or chain mismatch");
  }
  if (value.private_tailnet_endpoints_published !== false) {
    throw new Error("bootstrap manifest exposes private tailnet endpoints");
  }

  const authority = objectV1(value.authority, "bootstrap authority");
  const authorityKeys = Object.keys(authority).sort();
  const expectedAuthorityKeys = [...AUTHORITY_KEYS].sort();
  if (JSON.stringify(authorityKeys) !== JSON.stringify(expectedAuthorityKeys)) {
    throw new Error("bootstrap authority keys mismatch");
  }
  for (const key of AUTHORITY_KEYS) {
    if (authority[key] !== false) {
      throw new Error("bootstrap authority must remain false: " + key);
    }
  }

  if (!Array.isArray(value.sync_endpoints)) {
    throw new Error("bootstrap sync_endpoints must be an array");
  }
  if (!Array.isArray(value.onion_endpoints)) {
    throw new Error("bootstrap onion_endpoints must be an array");
  }

  if (value.status === "hold_no_stable_seed") {
    if (value.sync_endpoints.length !== 0) {
      throw new Error("hold manifest must not publish sync endpoints");
    }
    return Object.freeze({
      ok: false,
      marker: VOID_PUBLIC_BOOTSTRAP_COMMITTED_FRESHNESS_V1,
      classification: "HOLD_NO_STABLE_SEED",
      remaining_seconds: null,
      min_remaining_seconds: minSeconds,
      expires_at: null,
    });
  }

  if (value.status !== "stable_https_seed") {
    throw new Error("unsupported bootstrap manifest status");
  }

  if (value.sync_endpoints.length < 1 || value.sync_endpoints.length > 8) {
    throw new Error("stable manifest must contain one through eight endpoints");
  }
  const enabled = value.sync_endpoints.filter(
    (endpoint) => endpoint && endpoint.enabled === true,
  );
  if (enabled.length === 0) {
    throw new Error("stable manifest has no enabled endpoint");
  }
  for (const endpoint of enabled) {
    objectV1(endpoint, "enabled bootstrap endpoint");
    if (endpoint.transport !== "https") {
      throw new Error("enabled bootstrap endpoint must use HTTPS");
    }
    if (endpoint.temporary !== false) {
      throw new Error("enabled bootstrap endpoint must declare temporary=false");
    }
    if (
      typeof endpoint.base !== "string" ||
      !endpoint.base.startsWith("https://")
    ) {
      throw new Error("enabled bootstrap endpoint base is invalid");
    }
  }

  const generatedAtMs = timeMsV1(value.generated_at, "generated_at");
  const expiresAtMs = timeMsV1(value.expires_at, "expires_at");
  if (expiresAtMs <= generatedAtMs) {
    throw new Error("bootstrap manifest validity interval is invalid");
  }
  const validityMs = expiresAtMs - generatedAtMs;
  if (
    validityMs < 60 * 60 * 1000 ||
    validityMs > 7 * 24 * 60 * 60 * 1000
  ) {
    throw new Error(
      "bootstrap manifest validity must be one hour through seven days",
    );
  }

  const remainingMs = expiresAtMs - nowMs;
  const thresholdMs = minSeconds * 1000;
  let classification = "FRESH";
  if (remainingMs <= 0) classification = "EXPIRED";
  else if (remainingMs <= thresholdMs) classification = "RENEWAL_REQUIRED";

  return Object.freeze({
    ok: classification === "FRESH",
    marker: VOID_PUBLIC_BOOTSTRAP_COMMITTED_FRESHNESS_V1,
    classification,
    remaining_seconds: Math.floor(remainingMs / 1000),
    min_remaining_seconds: minSeconds,
    expires_at: value.expires_at,
  });
}

function optionsV1(argv) {
  let manifest = "public/bootstrap/v1.json";
  let minRemainingSeconds = DEFAULT_MIN_REMAINING_SECONDS_V1;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--manifest") {
      manifest = String(argv[++index] || "").trim();
      if (!manifest) throw new Error("--manifest requires a path");
    } else if (argument === "--min-remaining-seconds") {
      minRemainingSeconds = safeIntegerV1(
        argv[++index],
        "--min-remaining-seconds",
        0,
      );
    } else if (argument === "--help" || argument === "-h") {
      process.stdout.write(
        "Usage: node tools/void-public-bootstrap-committed-freshness-v1.mjs [--manifest public/bootstrap/v1.json] [--min-remaining-seconds 86400]\n",
      );
      return { help: true };
    } else {
      throw new Error("unknown argument: " + argument);
    }
  }
  return { help: false, manifest, minRemainingSeconds };
}

function main() {
  const options = optionsV1(process.argv.slice(2));
  if (options.help) return;

  const manifest = JSON.parse(
    fs.readFileSync(path.resolve(options.manifest), "utf8"),
  );
  const result = assessCommittedBootstrapFreshnessV1(manifest, {
    minRemainingSeconds: options.minRemainingSeconds,
  });

  console.log(VOID_PUBLIC_BOOTSTRAP_COMMITTED_FRESHNESS_V1);
  console.log("manifest=" + options.manifest);
  console.log("classification=" + result.classification);
  console.log("expires_at=" + (result.expires_at || ""));
  console.log(
    "remaining_seconds=" +
      (result.remaining_seconds === null ? "" : result.remaining_seconds),
  );
  console.log("min_remaining_seconds=" + result.min_remaining_seconds);
  console.log("network_access=false");
  console.log("repository_mutation=false");
  console.log("publication_authority=false");

  if (!result.ok) {
    console.error(VOID_PUBLIC_BOOTSTRAP_COMMITTED_FRESHNESS_V1 + "_HOLD");
    process.exitCode = 2;
    return;
  }

  console.log(VOID_PUBLIC_BOOTSTRAP_COMMITTED_FRESHNESS_V1 + "_GREEN");
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main();
  } catch (error) {
    console.error(
      VOID_PUBLIC_BOOTSTRAP_COMMITTED_FRESHNESS_V1 +
        "_FAIL: " +
        error.message,
    );
    process.exitCode = 1;
  }
}
