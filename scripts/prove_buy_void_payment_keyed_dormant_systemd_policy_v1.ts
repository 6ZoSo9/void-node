#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_BUY_VOID_ERC20_PRODUCTION_CREDENTIAL_BINDING_EVIDENCE_ID_V1,
} from "../src/economic/buy_void_erc20_production_credential_binding_evidence_v1.js";
import {
  VOID_BUY_VOID_CANONICAL_PRESALE_ECONOMICS_V1,
} from "../src/economic/buy_void_crash_consistent_saga_server_policy_v1.js";

const ROOT = process.cwd();
const DROPIN = path.join(
  ROOT,
  "ops/systemd/void-node-live.service.d/91-buy-void-payment-keyed-production-dormant-v1.conf.example",
);
const CANDIDATE = path.join(
  ROOT,
  "ops/mainnet0/buy-void-payment-keyed-production-candidate-v1.json",
);

const text = fs.readFileSync(DROPIN, "utf8");
const candidate = JSON.parse(
  fs.readFileSync(CANDIDATE, "utf8"),
) as Record<string, any>;

assert.match(text, /^\[Service\]$/m);
assert.equal(/^[ \t]*LoadCredential=/m.test(text), false);
assert.equal(
  /^[ \t]*Environment=CREDENTIALS_DIRECTORY=/m.test(text),
  false,
);

const env = new Map<string, string>();
for (const rawLine of text.split(/\r?\n/)) {
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

assert.deepEqual(
  Object.fromEntries([...env.entries()].sort(([a], [b]) => a.localeCompare(b))),
  Object.fromEntries(
    Object.entries(portableCandidate).sort(([a], [b]) => a.localeCompare(b)),
  ),
);

assert.equal(
  env.get("VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED"),
  "0",
);
assert.equal(
  env.get("VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED"),
  "0",
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
console.log("runtime_enabled=false");
console.log("runtime_apply_enabled=false");
console.log("canonical_pool_id=buy-void-presale-v1");
console.log("accepted_max_gas_limit=320000");
console.log("credential_binding_evidence_exact=true");
console.log("credentials_directory_host_derived=true");
console.log("loadcredential_mutation=false");
console.log("service_mutation=false");
console.log("transaction_broadcast=false");
console.log("funds_action=false");
