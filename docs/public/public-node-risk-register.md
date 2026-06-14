# Public Node Risk Register v1

Marker: `VOID_PUBLIC_NODE_RISK_REGISTER_DOC_V1`

Route: `/public-node/risk-register.json`

Proof: `ops/mainnet0/public-node-risk-register-proof.sh`

## Purpose

Public Node Risk Register v1 is a read-only anti-hype truth surface for VOID Mainnet-0.

It lists known public-node, Work Credit, DataNet, validator, upgrade, and decentralization risks before public mutation or public earning are opened.

This page does not claim those risks are solved.

## Current phase

`guarded_mainnet_0_bootstrap`

Mainnet-0 remains intentionally guarded. Public mutation, public Work Credit awards, WC-to-VOID swap behavior, and validator mutation remain closed.

## v1 risk fields

Each risk entry exposes:

- `id`
- `title`
- `status`
- `gate_state`
- `public_mutation_open`
- `claim_state`
- `mitigation`
- `last_reviewed`

## v1 status rules

Allowed `status` values:

- `known`
- `gated`
- `mitigated`
- `not_open`
- `future_work`
- `must_not_be_claimed_yet`

Allowed `gate_state` values:

- `closed`
- `read_only`
- `operator_only`
- `controlled_test`
- `public_limited`
- `public_open`

Allowed `claim_state` values:

- `acknowledged_only`
- `gated_not_open`
- `mitigated_with_proof`
- `future_work`
- `must_not_be_claimed_solved`

## Anti-hype rules

A risk with `claim_state=must_not_be_claimed_solved` must not be described as solved in docs, UI, release notes, social posts, or public operator copy.

A risk with `gate_state=closed`, `gate_state=read_only`, or `gate_state=operator_only` must not expose `public_mutation_open=true`.

A risk may only move to `mitigated` or `mitigated_with_proof` after a matching proof surface exists and emits a green marker.

## v1 scope

Risk Register v1 is intentionally minimal.

It does not include Runtime Gate Lock v1, automated freshness enforcement, review affirmation hashes, proof levels, tester impact levels, UI rendering, or live rollup status.

Those belong to later layers.

## Current v1 risks

The route currently exposes eight risks:

- `guarded_bootstrap_centralization`
- `sybil_ddos_public_participation`
- `sparse_node_density`
- `datanet_core_isolation`
- `upgrade_transparency`
- `wc_economic_integrity`
- `datanet_content_liability`
- `client_resource_exhaustion`

## Safety claim

Risk Register v1 proves that VOID is publicly acknowledging its current risk state.

It does not prove the network is decentralized, Sybil-resistant, DDoS-resistant, globally redundant, open for public earning, or ready for public mutation.
