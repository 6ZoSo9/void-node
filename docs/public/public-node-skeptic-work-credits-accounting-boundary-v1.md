# Public Node Work Credits Accounting Boundary v1

Marker: `VOID_PUBLIC_NODE_SKEPTIC_WORK_CREDITS_ACCOUNTING_BOUNDARY_DOC_V1`

This document is a Work Credits accounting boundary disclosure. It does not create Work Credits, move VOID, write the WC ledger, admit validators, or claim WC consensus power.

Parent disclosure:

```text
/public-node/skeptic-audit-readiness.json

Child route:

/public-node/skeptic/work-credits-accounting-boundary-v1.json

Route marker:

VOID_PUBLIC_NODE_SKEPTIC_WORK_CREDITS_ACCOUNTING_BOUNDARY_V1
1. Native economic truth

VOID is the consensus/security asset.

Work Credits are useful-work accounting and reward eligibility scaffolding.

The v1 boundary is:

consensus_security_asset=VOID
work_credits_role=useful_work_accounting_and_reward_eligibility_scaffolding
work_credits_are_consensus_asset=false
work_credits_are_native_currency=false
work_credits_are_staking_asset=false
work_credits_can_influence_block_finality=false
work_credits_can_directly_mutate_validator_set=false
work_credits_automatic_governance_power=false
work_credits_indirect_influence_scope=manual_operator_review_only
2. Public route boundary

Public routes are read-only.

The v1 public boundary is:

public_routes_read_only=true
public_route_mutation_allowed=false
public_wc_award_allowed=false
public_wc_ledger_write_allowed=false
public_wc_to_void_swap_allowed=false
public_money_movement_allowed=false
public_wallet_send_allowed=false
public_validator_mutation_allowed=false
public_buy_void_fulfillment_allowed=false
public_review_record_write_allowed=false

Public evidence can support review. It cannot directly award, mint, swap, send, stake, admit validators, or mutate the ledger.

3. Accounting state boundary

Useful-work evidence can be referenced by the operator, but public evidence does not create an automatic award.

The v1 state boundary is:

public_evidence_can_be_referenced=true
public_evidence_can_create_automatic_award=false
candidate_state_requires_operator_review=true
review_record_requires_operator_action=true
award_intent_requires_operator_action=true
award_record_requires_operator_action=true
ledger_entry_requires_operator_action=true
duplicate_ledger_entry_check_required_before_write=true
positive_nonzero_wc_delta_required_before_write=true
source_hash_chain_required_before_write=true
exact_operator_confirmation_required_before_write=true
default_state=blocked_not_ready_for_ledger_write

This preserves the useful-work trail without letting public traffic become a money printer.

4. Not claimed in v1

This route does not claim:

automatic_wc_awards
public_wc_minting
wc_as_consensus_asset
wc_block_finality_power
wc_automatic_validator_admission
wc_automatic_governance
wc_to_void_public_swap
public_money_movement
production_grade_reward_oracle
5. Current guardrails

Current guardrails:

public_read_only_routes
no_public_wc_award
no_public_wc_ledger_write
no_public_wc_to_void_swap
no_public_money_movement
no_public_wallet_send
no_public_validator_mutation
manual_operator_review_required
source_hash_chain_required_before_future_ledger_write
duplicate_ledger_entry_check_required_before_future_ledger_write
proof_script_marker_checks
live_status_rollup_guards
6. Allowed future path

The allowed future path is private, operator-controlled, and gated.

public_receipts_can_support_operator_review=true
operator_may_later_create_review_record=true
operator_may_later_create_award_intent_packet=true
operator_may_later_create_award_record=true
operator_may_later_create_ledger_entry_preview=true
operator_may_later_execute_private_ledger_write_after_gates=true
public_route_can_execute_private_ledger_write=false
public_route_can_reveal_private_command=false

Passing the proof for this route means the public disclosure matches the declared v1 boundary. It does not mean Work Credits have become consensus, money movement, validator power, or automatic rewards.
