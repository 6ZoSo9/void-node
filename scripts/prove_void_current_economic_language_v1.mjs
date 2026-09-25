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
  capabilityMatrix: read("docs/public/current-capability-matrix.md"),
  gatewayContent: read("docs/public/void-public-gateway-foundation-v1/site-content.json"),
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

assert.match(
  docs.agents,
  /WC\/VOID starts with 10M `VoidToken` \/ 0 WC/,
);
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
  docs.readme,
  /Open PR #1851 records the chosen successor direction/,
);
assert.match(
  docs.readme,
  /immutable Economic Genesis Archive/,
);
assert.match(
  docs.readme,
  /migration preserves final live\s+`VoidToken\.totalSupply\(\)` exactly/m,
);
assert.match(
  docs.whitepaper,
  /immutable \*\*Economic Genesis Archive\*\*/,
);
assert.match(
  docs.whitepaper,
  /migrate only live economic\s+value\/obligations to a clean non-Anvil successor execution layer/m,
);
assert.match(
  docs.currentTruth,
  /Open PR #1851 records the chosen successor architecture/,
);
assert.match(
  docs.renState,
  /Open PR #1851 records the chosen execution-layer path/,
);
assert.match(
  docs.currentTruth,
  /AdminGate, ConfigGate, legacy relayer,\s+default-Anvil authority, and zero-balance bootstrap plumbing do not migrate by\s+default/m,
);
assert.match(
  docs.renState,
  /AdminGate\/ConfigGate and\s+other obsolete zero-value bootstrap plumbing stay archived unless a final\s+live dependency proves otherwise/m,
);
assert.match(
  docs.whitepaper,
  /AdminGate, ConfigGate, dev-relayer\/default-Anvil\s+authority, and other obsolete zero-value bootstrap plumbing do not migrate by\s+default/m,
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
assert.match(
  docs.readme,
  /bounded micro-purchase\/micro-trade gas-grief protection/,
);
assert.match(
  docs.currentTruth,
  /No hidden minimum.*unbounded microscopic economic obligations/is,
);
assert.match(
  docs.publicStatus,
  /A disclosed minimum, batching\/amortization, user-paid gas, or another reviewed\s+bounded mechanism/m,
);
assert.match(
  docs.whitepaper,
  /very small payments can create nearly\s+the same fulfillment transaction cost as large payments/m,
);
assert.match(
  docs.renState,
  /micro-purchase\/micro-trade gas-grief\s+protection/m,
);
assert.match(
  docs.readme,
  /Any unpaid payment\/trade instruction that reserves gas or inventory must also have bounded expiry/,
);
assert.match(
  docs.currentTruth,
  /Unpaid instructions\/intents must not pin gas or inventory indefinitely/,
);
assert.match(
  docs.publicStatus,
  /Unpaid payment instructions also need bounded lifetime and outstanding-count\s+limits/m,
);
assert.match(
  docs.whitepaper,
  /A separate unpaid-reservation abuse path must also be closed/,
);
assert.match(
  docs.renState,
  /TTL \+ outstanding-count caps\s+and deterministic late-payment reconciliation/m,
);
assert.match(
  docs.readme,
  /WC\/VOID's zero-WC-seed opening also needs a fixed price-forming window/,
);
assert.match(
  docs.currentTruth,
  /WC\/VOID's deterministic reserve-ratio formula is not itself a manipulation\s+defense/m,
);
assert.match(
  docs.publicStatus,
  /WC\/VOID's opening price is also not first-arriver authority/,
);
assert.match(
  docs.whitepaper,
  /WC\/VOID's one-sided opening has an additional market-formation risk/,
);
assert.match(
  docs.renState,
  /WC\/VOID opening price also needs cohort-integrity gates/,
);
assert.match(
  docs.readme,
  /balanced opening batch: 5M VOID is allocated pro rata.*5M VOID remains/is,
);
assert.match(
  docs.agents,
  /5M participant opening tranche \+ 5M retained reserve/,
);
assert.match(
  docs.releases,
  /5M participant opening tranche plus 5M retained VOID reserve/,
);
assert.match(
  docs.currentTruth,
  /5M VOID opening-sale tranche and 5M retained VOID reserve/,
);
assert.match(
  docs.publicStatus,
  /5M VOID participant opening tranche and retains 5M VOID plus all settled opening WC/,
);
assert.match(
  docs.publicIndex,
  /5M participant opening tranche and 5M retained VOID reserve/,
);
assert.match(
  docs.whitepaper,
  /verified opening WC cohort buys a fixed 5M-VOID tranche pro rata.*other 5M VOID plus all settled WC/is,
);
assert.match(
  docs.renState,
  /10M VOID allocation as 5M participant opening tranche \+ 5M retained reserve/,
);
assert.match(
  docs.readme,
  /standard Anvil prefunded accounts with publicly known keys/,
);
assert.match(
  docs.currentTruth,
  /Historical private-EVM state includes standard Anvil prefunded addresses with\s+publicly known private keys/m,
);
assert.match(
  docs.publicStatus,
  /historical standard Anvil prefunded\s+accounts whose development keys are public knowledge/m,
);
assert.match(
  docs.whitepaper,
  /standard Anvil prefunded development\s+accounts whose keys are publicly known/m,
);
assert.match(
  docs.renState,
  /standard Anvil prefunded known-key\s+accounts/m,
);
assert.match(
  docs.readme,
  /Public economic instructions\/quotes must disclose every fee component/,
);
assert.match(
  docs.currentTruth,
  /Public economic authority requires complete fee disclosure/,
);
assert.match(
  docs.publicStatus,
  /Any future public economic instruction must show the complete effective cost/,
);
assert.match(
  docs.whitepaper,
  /Economic cost disclosure is part of launch safety/,
);
assert.match(
  docs.renState,
  /complete fee\/gas\/gross-net\s+disclosure/m,
);
assert.match(
  docs.currentTruth,
  /50-bps AMM protocol fee\s+from a separate 100-bps reserve-recycling\/buyback spread/m,
);
assert.match(
  docs.whitepaper,
  /0\.50% AMM protocol\s+fee and the separate 1% reserve-recycling buyback spread/m,
);
assert.match(
  docs.readme,
  /planned recovery checkpoint is block 37371, while accepted economic receipt evidence reaches at least block 37391/,
);
assert.match(
  docs.currentTruth,
  /planned\s+recovery checkpoint is block 37371, while accepted economic receipt evidence\s+reaches at least block 37391/m,
);
assert.match(
  docs.publicStatus,
  /recovery plan names checkpoint block 37371, but later accepted\s+economic evidence reaches at least block 37391/m,
);
assert.match(
  docs.whitepaper,
  /planned recovery checkpoint at block\s+37371 predates accepted economic receipt evidence at block 37391/m,
);
assert.match(
  docs.renState,
  /recovery checkpoint 37371 while accepted economic\s+evidence reaches 37391\+/m,
);
assert.match(
  docs.capabilityMatrix,
  /Local account wallet status \| Live, read-only/,
);
assert.match(
  docs.capabilityMatrix,
  /PR #1850 fail-closes create\/import\/unlock\/export\/send mutation routes by default/,
);
assert.match(
  docs.capabilityMatrix,
  /economic execution-layer identity\/public verification, participant post-purchase token control/,
);
assert.match(
  docs.gatewayContent,
  /VOID separates public network truth from guarded economic execution/,
);
assert.match(
  docs.gatewayContent,
  /Inspect or connect/,
);
assert.doesNotMatch(
  docs.gatewayContent,
  /Chain-2050 is the guarded truth and settlement layer/,
);
assert.doesNotMatch(
  docs.gatewayContent,
  /Set up a local wallet or connect a node/,
);

console.log("VOID_CURRENT_ECONOMIC_LANGUAGE_V1_PROOF_GREEN");
console.log("voidtoken_native_gas_distinction=true");
console.log("fixed_wc_redemption_current_claim=false");
console.log("legacy_relayer_current_authority=false");
console.log("shared_nonce_scheduler_current_gate=true");
console.log("presale_lifetime_gas_claim_bounded=true");
console.log("source_chain_refund_fee_separate=true");
console.log("economic_execution_layer_identity_explicit=true");
console.log("economic_genesis_archive_successor_architecture_selected=true");
console.log("migration_supply_bound_to_final_live_total_supply=true");
console.log("admin_gate_successor_required=false");
console.log("migration_model=value_and_obligation_conservation_not_old_architecture=true");
console.log("public_private_history_equivalence_not_claimed=true");
console.log("participant_post_purchase_token_control_required=true");
console.log("micro_obligation_gas_grief_protection_required=true");
console.log("hidden_minimum_selected=false");
console.log("unpaid_reservation_hoarding_protection_required=true");
console.log("late_payment_after_expiry_reconciliation_required=true");
console.log("wc_void_opening_cohort_integrity_required=true");
console.log("wc_void_first_arriver_price_authority=false");
console.log("wc_void_balanced_opening_tranche_void=5000000");
console.log("wc_void_post_opening_void_reserve=5000000");
console.log("wc_void_opening_allocation_policy=pro_rata_largest_remainder_v1");
console.log("known_anvil_dev_account_public_submission_blocked=true");
console.log("complete_public_economic_cost_disclosure_required=true");
console.log("btc_void_combined_protocol_fee_buyback_spread_policy_reviewed=false");
console.log("private_evm_checkpoint_37371_stale_vs_accepted_37391=true");
console.log("private_evm_current_durability_required=true");
console.log("capability_matrix_wallet_mutation_claim=false");
console.log("gateway_economic_execution_boundary_explicit=true");
console.log("open_hardening_prs_not_promoted_to_runtime=true");
