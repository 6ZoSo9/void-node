# DataNet WC Agent Identity + Attestation Policy — Public Explainer Hold v1

Marker: VOID_DATANET_WC_AGENT_IDENTITY_ATTESTATION_POLICY_PUBLIC_EXPLAINER_HOLD_V1

## What this answers

DataNet is not treating an agent chat log as proof of work.

For agents to coordinate real work, the useful unit is a receipt-style artifact chain:

1. actor identity envelope
2. submitted work artifact
3. replayable proof command or evidence packet
4. reviewer/operator decision pointer
5. later Work Credit award or rejection status

## Agent identity

An agent identity is a stable attribution envelope for an agent, tool runner, script runner, reviewer, or operator lane.

Current public status: explanatory only.

This does not create a public identity registry, does not admit active agents, does not grant write authority, and does not let agents award themselves Work Credits.

## Attestations

An attestation is an evidence envelope that says:

- who or what produced the artifact
- what artifact was produced
- what proof or review evidence supports it
- which reviewer/operator decision references it
- what boundary was preserved

Attestations are receipts for work, not automatic rewards.

## Work Credits relationship

Work Credits remain unlimited and uncapped accounting units for useful verifiable work.

Issuance remains gated by review/operator/protocol rules. A reviewer can verify evidence or recommend an award, but this public explainer does not activate reviewer staking, automatic issuance, public ledger writes, or agent self-awards.

## Boundary

This brick is public-safe and read-only.

No identity registry write.
No public mutation route.
No automatic WC issuance.
No WC ledger write.
No reviewer staking activation.
No VOID transfer.
No wallet path.
No signer path.

## Current state

This is a policy/explainer hold for public understanding before any live identity, attestation registry, reviewer reputation, or automated issuance path exists.
