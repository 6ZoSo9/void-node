# Mainnet-0 Canonical Incident Bundle Template

Status: operator template for recording a canonical safety incident

## Purpose

This template is the operator-facing bundle to fill out when Mainnet-0 experiences divergence, checkpoint challenge, bad-block suspicion, or canonical safety failure.

---

## Bundle header

- incident_id
- started_at
- operator_label
- severity_tier
- classification
  - local anomaly
  - noisy reorg
  - sustained divergence
  - bad-block suspicion
  - invalid-state suspicion
  - checkpoint challenge
  - canonical safety failure

---

## Chain position

- local_head_height
- local_head_hash
- peer_head_height
- peer_head_hash
- disputed_height
- disputed_hash
- parent_height
- parent_hash

---

## Checkpoint / finality context

- accepted_checkpoint_height
- accepted_checkpoint_hash
- checkpoint_challenged
- checkpoint_crossed_by_reorg
- checkpoint_notes

---

## Reorg / divergence context

- observed_reorg_depth
- observed_reorg_frequency
- convergence_status
- validator_convergence_status
- branch_notes

---

## Correctness / state context

- suspected_bad_block
- suspected_invalid_state
- txroot_or_header_evidence
- persisted_state_evidence
- reproduced_on_multiple_nodes
- evidence_notes

---

## Validator context

- validators_on_branch_a
- validators_on_branch_b
- validators_unresponsive
- validator_notes

---

## Decision / response

- response_level
  - observe_only
  - warning
  - incident_watch
  - coordinated_response
  - canonical_recovery
- canonical_guidance_issued
- rollback_or_fork_considered
- rollback_or_fork_justification
- operator_notes

---

## Example skeleton

incident_id: INC-YYYYMMDD-001
started_at: TBD
operator_label: TBD
severity_tier: TBD
classification: TBD

local_head_height: TBD
local_head_hash: TBD
peer_head_height: TBD
peer_head_hash: TBD
disputed_height: TBD
disputed_hash: TBD
parent_height: TBD
parent_hash: TBD

accepted_checkpoint_height: TBD
accepted_checkpoint_hash: TBD
checkpoint_challenged: false
checkpoint_crossed_by_reorg: false
checkpoint_notes: ""

observed_reorg_depth: TBD
observed_reorg_frequency: TBD
convergence_status: TBD
validator_convergence_status: TBD
branch_notes: ""

suspected_bad_block: false
suspected_invalid_state: false
txroot_or_header_evidence: ""
persisted_state_evidence: ""
reproduced_on_multiple_nodes: false
evidence_notes: ""

validators_on_branch_a: []
validators_on_branch_b: []
validators_unresponsive: []
validator_notes: ""

response_level: TBD
canonical_guidance_issued: false
rollback_or_fork_considered: false
rollback_or_fork_justification: ""
operator_notes: ""
