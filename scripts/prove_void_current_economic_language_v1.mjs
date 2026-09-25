#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");

const docs = {
  readme: read("README.md"),
  agents: read("AGENTS.md"),
  releases: read("RELEASES.md"),
  currentTruth: read("ops/mainnet/CURRENT_TRUTH.md"),
  publicStatus: read("docs/public/mainnet0-current-public-status.md"),
  publicIndex: read("docs/public/README.md"),
  whitepaper: read("docs/public/void-network-whitepaper.md"),
  renState: read("docs/ren/current-state-v1.md"),
};

for (const [name, text] of Object.entries(docs)) {
  assert.doesNotMatch(
    text,
    /100\s*WC\s*=\s*1\s*VOID/i,
    name + " must not present retired fixed redemption as current truth",
  );
}

assert.match(docs.readme, /`VoidToken` inventory is distinct from native gas/);
assert.match(docs.readme, /historical/regression evidence only/);

assert.match(docs.agents, /`VoidToken` is distinct from native gas/);
assert.match(
  docs.agents,
  /one gas-liability journal and one nonce scheduler/,
);

assert.match(
  docs.releases,
  /canonical `VoidToken` market/presale inventory is distinct/,
);
assert.match(docs.releases, /native-gas capacity/replenishment model/);

assert.match(
  docs.currentTruth,
  /retained `VoidToken`\s+or protocol fees as automatic native-gas replenishment/m,
);
assert.match(
  docs.currentTruth,
  /Retired WC economic artifacts are likewise historical/regression-only/,
);

assert.match(
  docs.publicStatus,
  /delivery inventory is not the fulfiller's native gas balance/i,
);
assert.match(
  docs.publicStatus,
  /future source-chain refund requires its own source-chain fee budget/i,
);

assert.match(
  docs.publicIndex,
  /`VoidToken` inventory is distinct from Chain-2050 native gas/,
);

assert.match(
  docs.whitepaper,
  /Current Chain-2050 transaction gas is accounted from a distinct native balance/,
);
assert.match(
  docs.whitepaper,
  /per-payment gas reservation.*does not by itself prove lifetime gas capacity/is,
);

assert.match(docs.renState, /Open PR #1848 is BTC/VOID fee hardening source/);
assert.match(docs.renState, /Open PR #1849 is coupled presale/WC native-gas hardening source/);
assert.match(docs.renState, /It is not merged/runtime truth/);

console.log("VOID_CURRENT_ECONOMIC_LANGUAGE_V1_PROOF_GREEN");
console.log("voidtoken_native_gas_distinction=true");
console.log("fixed_wc_redemption_current_claim=false");
console.log("legacy_relayer_current_authority=false");
console.log("shared_nonce_scheduler_current_gate=true");
console.log("presale_lifetime_gas_claim_bounded=true");
console.log("source_chain_refund_fee_separate=true");
console.log("open_hardening_prs_not_promoted_to_runtime=true");
