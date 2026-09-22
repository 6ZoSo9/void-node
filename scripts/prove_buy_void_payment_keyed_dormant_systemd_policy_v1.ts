#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
} from "../src/economic/buy_void_erc20_production_credential_binding_evidence_v1.js";
import {
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1,
} from "../src/economic/buy_void_crash_consistent_saga_server_policy_v1.js";
import {
  VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_CARRIER_ROOT_ENV_V1,
} from "../src/economic/buy_void_payment_history_terminal_projection_v1.js";
import {
  verifyBuyVoidHistoryCarrierRootV1,
} from "../src/economic/buy_void_history_carrier_v1.js";

const ROOT = process.cwd();
const DROPIN = path.join(
  ROOT,
  "ops/systemd/void-node-live.service.d/91-buy-void-payment-keyed-production-dormant-v1.conf.example",
);
const CANDIDATE = path.join(
  ROOT,
  "ops/mainnet0/buy-void-payment-keyed-production-candidate-v1.json",
);
const ACTIVATION = path.join(
  ROOT,
  "ops/mainnet0/buy-void-production-activation-evidence-v1.json",
);
const CARRIER = path.join(
  ROOT,
  "ops/mainnet0/buy-void-production-history-carrier-attestation-v1.json",
);
const PREPARATION = path.join(
  ROOT,
  "ops/mainnet0/buy-void-payment-keyed-dormant-host-preparation-v1.json",
);

const EXPECTED_CARRIER_ROOT =
  "32649ce8d7edf089d4078d97fd72832d0b44da4736b5d58cdf3cde969a33ab1a";
const EXPECTED_CARRIER_ATTESTATION_ID =
  "voidbvhca1_0b7f99cbbf4dfbd8c3673d8915350b1d972bf1579d3798a52ab052eb3acb3465";
const EXPECTED_PREPARATION_ID =
  "voidbvhdp1_29c16c2160b12ec91c5c95877ac55a811309a88c2770f561c46c342fd0c60196";
const EXPECTED_DROPIN_SHA256 =
  "d244e9e6a8e2fc14179861676fa7843a7be6cc5e05b3481afd7bf72eb6ef3e9c";
const EXPECTED_ENV_SHA256 =
  "e27af7da5754b160ff535486972f93fb740fe869ccd336161da866462da68312";
const EXPECTED_TERMINAL_MERGE =
  "68746191f075826cb191a07d2ae4cc52aac0077e";
const EXPECTED_TERMINAL_BLOB =
  "21d67d61d0823190066303fc75c90008003e60b9";

function sha256(value: Buffer | string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value: unknown): string {
  if (value === null) return "null";
  if (
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error("non-canonical-number:" + String(value));
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(record)
        .sort()
        .map(
          (key) =>
            JSON.stringify(key) +
            ":" +
            canonicalJson(record[key]),
        )
        .join(",") +
      "}"
    );
  }
  throw new Error("non-canonical-value:" + typeof value);
}

function git(args: string[]): string {
  return execFileSync("/usr/bin/git", args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function gitObjectExists(spec: string): boolean {
  try {
    execFileSync(
      "/usr/bin/git",
      ["cat-file", "-e", spec],
      {
        cwd: ROOT,
        stdio: ["ignore", "ignore", "ignore"],
      },
    );
    return true;
  } catch {
    return false;
  }
}

const text = fs.readFileSync(DROPIN, "utf8");
const candidate = JSON.parse(
  fs.readFileSync(CANDIDATE, "utf8"),
) as Record<string, any>;
const activation = JSON.parse(
  fs.readFileSync(ACTIVATION, "utf8"),
) as Record<string, any>;
const carrier = JSON.parse(
  fs.readFileSync(CARRIER, "utf8"),
) as Record<string, any>;
const preparation = JSON.parse(
  fs.readFileSync(PREPARATION, "utf8"),
) as Record<string, any>;

const dropinLines = text.split("\n");
assert.equal(
  dropinLines.some((line) => line.trim() === "[Service]"),
  true,
);
assert.equal(
  dropinLines.some((line) =>
    line.trim().startsWith("LoadCredential="),
  ),
  false,
);
assert.equal(
  dropinLines.some((line) =>
    line.trim().startsWith(
      "Environment=CREDENTIALS_DIRECTORY=",
    ),
  ),
  false,
);

const env = new Map<string, string>();
for (const rawLine of dropinLines) {
  const line = rawLine.trim();
  if (!line.startsWith("Environment=")) continue;
  const assignment = line.slice("Environment=".length);
  const index = assignment.indexOf("=");
  assert.notEqual(index, -1, "environment assignment must contain =");
  const key = assignment.slice(0, index);
  const value = assignment.slice(index + 1);
  assert.ok(key.length > 0);
  assert.equal(env.has(key), false, "duplicate environment key: " + key);
  env.set(key, value);
}

const staticCandidate =
  candidate.candidate_configuration as Record<string, string>;
const portableCandidate = Object.fromEntries(
  Object.entries(staticCandidate).filter(
    ([key]) => key !== "CREDENTIALS_DIRECTORY",
  ),
);
const expectedEnv = {
  ...portableCandidate,
  [VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_CARRIER_ROOT_ENV_V1]:
    EXPECTED_CARRIER_ROOT,
};

assert.deepEqual(
  Object.fromEntries(
    [...env.entries()].sort(([a], [b]) => a.localeCompare(b)),
  ),
  Object.fromEntries(
    Object.entries(expectedEnv).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
  ),
);
assert.equal(env.size, 23);

assert.equal(
  VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_CARRIER_ROOT_ENV_V1,
  "VOID_BUY_VOID_HISTORY_CARRIER_ROOT_SHA256",
);
assert.equal(
  env.get("VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED"),
  "0",
);
assert.equal(
  env.get(
    "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED",
  ),
  "0",
);
assert.equal(
  env.get(VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_CARRIER_ROOT_ENV_V1),
  EXPECTED_CARRIER_ROOT,
);
assert.equal(
  env.get("VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT"),
  "320000",
);
assert.equal(
  env.get("VOID_BUY_VOID_INVENTORY_POOL_ID"),
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1.pool_id,
);
assert.equal(
  env.get(
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_INVENTORY_POLICY_VERSION",
  ),
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1.inventory_policy_version,
);
assert.equal(
  env.get(
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_POOL_CAPACITY_VOID_UNITS",
  ),
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1.pool_capacity_void_units,
);
assert.equal(
  env.get(
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_MAX_RESERVATION_VOID_UNITS",
  ),
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1.max_reservation_void_units,
);
assert.equal(
  env.get(
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_NUMERATOR",
  ),
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1.rate_void_units_numerator,
);
assert.equal(
  env.get(
    "VOID_BUY_VOID_CRASH_CONSISTENT_SAGA_RATE_VOID_UNITS_DENOMINATOR",
  ),
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1.rate_void_units_denominator,
);
assert.equal(
  env.get("VOID_BUY_VOID_ERC20_CREDENTIAL_BINDING_EVIDENCE_ID"),
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
);

assert.equal(
  activation.marker,
  "VOID_BUY_VOID_PRODUCTION_ACTIVATION_EVIDENCE_V1",
);
assert.equal(
  activation.source_main_commit,
  candidate.source_main_commit,
);
assert.equal(
  activation.production_gas_observation
    ?.accepted_production_runtime_gas_ceiling,
  candidate.accepted_production_runtime_gas_ceiling,
);
assert.equal(
  activation.production_gas_observation
    ?.accepted_production_runtime_gas_ceiling,
  env.get("VOID_BUY_VOID_PAYMENT_KEYED_MAX_GAS_LIMIT"),
);
assert.equal(
  activation.deployment?.deployment_attested,
  true,
);
assert.equal(
  activation.inventory_funding?.post_state
    ?.inventory_funding_verified,
  true,
);
assert.equal(
  activation.contracts?.fulfillment,
  env.get(
    "VOID_BUY_VOID_PAYMENT_KEYED_FULFILLMENT_CONTRACT_ADDRESS",
  ),
);
assert.equal(
  activation.contracts?.void_token,
  env.get("VOID_BUY_VOID_DELIVERY_TOKEN_ADDRESS"),
);
assert.equal(
  activation.contracts?.fulfillment_wallet,
  env.get("VOID_BUY_VOID_NATIVE_DELIVERY_WALLET_ADDRESS"),
);
assert.equal(
  activation.activation_boundary?.runtime_enabled,
  false,
);
assert.equal(
  activation.activation_boundary?.runtime_apply_enabled,
  false,
);
assert.equal(
  activation.activation_boundary?.public_activation,
  false,
);

assert.equal(
  carrier.marker,
  "VOID_BUY_VOID_PRODUCTION_HISTORY_CARRIER_ATTESTATION_V1",
);
assert.equal(carrier.version, 1);
assert.equal(
  carrier.attestation_id,
  EXPECTED_CARRIER_ATTESTATION_ID,
);
const verifiedCarrierRoot =
  verifyBuyVoidHistoryCarrierRootV1(
    carrier.carrier?.carrier_root,
  );
assert.equal(
  verifiedCarrierRoot.carrier_root_sha256,
  EXPECTED_CARRIER_ROOT,
);
assert.equal(
  verifiedCarrierRoot.pool_id,
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1.pool_id,
);
assert.equal(verifiedCarrierRoot.carrier_generation, 1);
assert.equal(verifiedCarrierRoot.reservation_count, "1");
assert.equal(verifiedCarrierRoot.obligation_count, "0");
assert.equal(carrier.authority?.carrier_root_publication, false);
assert.equal(carrier.authority?.runtime_activation, false);
assert.equal(carrier.authority?.transaction_broadcast, false);
assert.equal(carrier.authority?.funds_movement, false);

assert.equal(
  sha256(text),
  EXPECTED_DROPIN_SHA256,
);
const envObject = Object.fromEntries(env.entries());
assert.equal(
  sha256(canonicalJson(envObject)),
  EXPECTED_ENV_SHA256,
);

assert.equal(
  preparation.marker,
  "VOID_BUY_VOID_PAYMENT_KEYED_DORMANT_HOST_PREPARATION_V1",
);
assert.equal(preparation.version, 1);
assert.equal(preparation.issue_number, 1679);
assert.equal(
  preparation.status,
  "source_prepared_pending_precision_host_apply",
);
assert.equal(
  preparation.preparation_id,
  EXPECTED_PREPARATION_ID,
);
const {
  preparation_id: ignoredPreparationId,
  ...preparationCore
} = preparation;
assert.equal(
  "voidbvhdp1_" + sha256(canonicalJson(preparationCore)),
  EXPECTED_PREPARATION_ID,
);
void ignoredPreparationId;

assert.equal(
  preparation.dropin?.path,
  "ops/systemd/void-node-live.service.d/91-buy-void-payment-keyed-production-dormant-v1.conf.example",
);
assert.equal(
  preparation.dropin?.sha256,
  EXPECTED_DROPIN_SHA256,
);
assert.equal(
  preparation.dropin?.environment_count,
  env.size,
);
assert.equal(
  preparation.dropin?.environment_sha256,
  EXPECTED_ENV_SHA256,
);
assert.deepEqual(
  preparation.prepared_environment,
  {
    VOID_BUY_VOID_HISTORY_CARRIER_ROOT_SHA256:
      EXPECTED_CARRIER_ROOT,
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED:
      "0",
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED:
      "0",
  },
);

const inputs =
  preparation.inputs as Record<string, any>;
const expectedInputBlobs: Record<string, string> = {
  [inputs.production_candidate.path]:
    inputs.production_candidate.blob_sha1,
  [inputs.activation_evidence.path]:
    inputs.activation_evidence.blob_sha1,
  [inputs.carrier_attestation.path]:
    inputs.carrier_attestation.blob_sha1,
  [inputs.terminal_projection.path]:
    inputs.terminal_projection.blob_sha1,
};
assert.deepEqual(expectedInputBlobs, {
  "ops/mainnet0/buy-void-payment-keyed-production-candidate-v1.json":
    "1b605ebf698b69ef3a27eb2546df700878b53cf9",
  "ops/mainnet0/buy-void-production-activation-evidence-v1.json":
    "69b4d32f712e99c09da20938c37e32c58e22f8d9",
  "ops/mainnet0/buy-void-production-history-carrier-attestation-v1.json":
    "85c7855c7c1a048933c9124ee510aa59d62f7bf0",
  "src/economic/buy_void_payment_history_terminal_projection_v1.ts":
    EXPECTED_TERMINAL_BLOB,
});
for (const [file, blob] of Object.entries(expectedInputBlobs)) {
  assert.equal(
    git(["rev-parse", "HEAD:" + file]),
    blob,
    "prepared input blob drift: " + file,
  );
}

assert.equal(
  inputs.carrier_attestation.attestation_id,
  EXPECTED_CARRIER_ATTESTATION_ID,
);
assert.equal(
  inputs.carrier_attestation.carrier_root_sha256,
  EXPECTED_CARRIER_ROOT,
);
assert.equal(
  inputs.carrier_attestation.merge_commit,
  "ea93f9276195d677c0064d14cfce66cf194cb9a8",
);
assert.equal(
  inputs.terminal_projection.pr,
  1669,
);
assert.equal(
  inputs.terminal_projection.merge_commit,
  EXPECTED_TERMINAL_MERGE,
);
assert.equal(
  inputs.terminal_projection.carrier_root_env,
  VOID_BUY_VOID_PAYMENT_HISTORY_TERMINAL_CARRIER_ROOT_ENV_V1,
);

const terminalMergeAvailable =
  gitObjectExists(EXPECTED_TERMINAL_MERGE + "^{commit}");
if (terminalMergeAvailable) {
  execFileSync(
    "/usr/bin/git",
    [
      "merge-base",
      "--is-ancestor",
      EXPECTED_TERMINAL_MERGE,
      "HEAD",
    ],
    {
      cwd: ROOT,
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
}

assert.deepEqual(preparation.authority, {
  carrier_root_snapshot_pin_only: true,
  chain2050_write: false,
  credential_content_read: false,
  funds_movement: false,
  host_mutation: false,
  inventory_mutation: false,
  live_carrier_root_rotation_authority: false,
  public_activation: false,
  runtime_apply_enabled: false,
  runtime_enabled: false,
  service_action: false,
  source_only_preparation: true,
  transaction_broadcast: false,
  transaction_signing: false,
  treasury_or_liquidity_action: false,
  wallet_or_signer_access: false,
});

for (const [key, value] of env) {
  assert.equal(
    /private.?key|mnemonic|seed.?phrase|raw.?signed/i.test(key),
    false,
    "secret-bearing key forbidden: " + key,
  );
  assert.equal(
    /private.?key|mnemonic|seed.?phrase|raw.?signed/i.test(value),
    false,
    "secret-bearing value forbidden for: " + key,
  );
}

console.log(
  "VOID_BUY_VOID_PAYMENT_KEYED_DORMANT_SYSTEMD_POLICY_V1_PROOF_GREEN",
);
console.log(
  "dormant_host_preparation_id=" +
    preparation.preparation_id,
);
console.log("runtime_enabled=false");
console.log("runtime_apply_enabled=false");
console.log(
  "carrier_root_pin=" + EXPECTED_CARRIER_ROOT,
);
console.log("carrier_attestation_exact=true");
console.log(
  "terminal_projection_merge_verified=" +
    String(terminalMergeAvailable),
);
console.log("current_input_blob_continuity=true");
console.log("carrier_root_snapshot_pin_only=true");
console.log("canonical_pool_id=buy-void-presale-v1");
console.log("accepted_max_gas_limit=320000");
console.log("credential_binding_evidence_exact=true");
console.log("credentials_directory_host_derived=true");
console.log("loadcredential_mutation=false");
console.log("host_mutation=false");
console.log("service_mutation=false");
console.log("transaction_broadcast=false");
console.log("funds_action=false");
