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

for (const [name, source] of Object.entries(docs)) {
  assert.doesNotMatch(
    source,
    /100\s*WC\s*=\s*1\s*VOID/i,
    name + " must not present retired fixed redemption as current truth",
  );
}

assert.match(docs.readme, /private loopback EVM\/Anvil execution layer/);
assert.match(
  docs.readme,
  /does not yet prove those two histories are identical or anchored/i,
);
assert.match(docs.readme, /historical\/regression evidence only/);

assert.match(docs.agents, /`VoidToken` is distinct from native gas/);
assert.match(docs.agents, /one gas-liability journal and nonce scheduler/);
assert.match(
  docs.agents,
  /Private-EVM\/public-chain equivalence/,
);
assert.match(docs.agents, /Retired 100:1\/dev-relayer semantics have no/);

assert.match(
  docs.releases,
  /private economic EVM versus public VOID-chain relationship/,
);
assert.match(docs.releases, /sustainable native-gas model/);

assert.match(
  docs.currentTruth,
  /private loopback Anvil\/EVM configured with chain\s+ID 2050/m,
);
assert.match(
  docs.currentTruth,
  /current source does not prove both histories are identical or anchored/m,
);
assert.match(
  docs.currentTruth,
  /Retired WC economic artifacts are likewise historical\/regression-only/,
);

assert.match(
  docs.publicStatus,
  /separate private loopback EVM\/Anvil execution layer/,
);
assert.match(
  docs.publicStatus,
  /private economic EVM versus the public VOID-node chain/i,
);
assert.match(
  docs.publicStatus,
  /future source-chain refund requires its own source-chain fee budget/i,
);

assert.match(docs.publicIndex, /private loopback EVM\/Anvil layer/);
assert.match(
  docs.publicIndex,
  /independent public verification path must be resolved/,
);

assert.match(docs.whitepaper, /### 4\.1A Economic EVM boundary/);
assert.match(
  docs.whitepaper,
  /private loopback EVM\/Anvil execution layer configured with chain ID/,
);
assert.match(
  docs.whitepaper,
  /healthy private RPC is not by itself public-chain\s+economic finality/m,
);
assert.match(
  docs.whitepaper,
  /Current Chain-2050 transaction gas is accounted from a distinct native balance/,
);
assert.match(
  docs.whitepaper,
  /per-payment gas reservation.*does not by itself prove lifetime gas capacity/is,
);

assert.match(docs.renState, /Open PR #1848 is BTC\/VOID fee hardening source/);
assert.match(docs.renState, /Open PR #1849 is coupled presale\/WC hardening source/);
assert.match(docs.renState, /It is not merged\/runtime truth/);
assert.match(
  docs.renState,
  /Do not claim\s+those histories are identical or anchored until a reviewed binding proves it/m,
);
assert.match(
  docs.readme,
  /reviewed participant path to control and transfer delivered `VoidToken`/,
);
assert.match(
  docs.publicStatus,
  /reviewed participant post-purchase token-control path/,
);
assert.match(
  docs.publicIndex,
  /participants must also have a reviewed way to verify, control, and later transfer\/use delivered `VoidToken`/,
);
assert.match(
  docs.whitepaper,
  /participants to authorize and submit later\s+transfers\/use of delivered `VoidToken`/m,
);
assert.match(
  docs.renState,
  /participant-usable post-purchase\s+`VoidToken` control\/transfer path/m,
);

console.log("VOID_CURRENT_ECONOMIC_LANGUAGE_V1_PROOF_GREEN");
console.log("voidtoken_native_gas_distinction=true");
console.log("fixed_wc_redemption_current_claim=false");
console.log("legacy_relayer_current_authority=false");
console.log("shared_nonce_scheduler_current_gate=true");
console.log("presale_lifetime_gas_claim_bounded=true");
console.log("source_chain_refund_fee_separate=true");
console.log("economic_execution_layer_identity_explicit=true");
console.log("public_private_history_equivalence_not_claimed=true");
console.log("participant_post_purchase_token_control_required=true");
console.log("open_hardening_prs_not_promoted_to_runtime=true");
