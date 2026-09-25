# Ren Current State V1

Marker: `VOID_REN_CURRENT_STATE_V1`

Snapshot seed: 2026-09-24 America/Chicago / 2026-09-25Z.

This is a **derived handoff cache**. Refresh live GitHub and runtime evidence before acting.

## Repository anchor

- Repository: `6ZoSo9/void-node`
- Main observed when this snapshot was seeded: `67a87e0bd5b2782c09ebe99ead096338c68ebd10`
- That commit merged PR #1812, repairing registration of the Tor external-acceptance workflow.
- A newer `main` immediately makes the SHA above historical, not authoritative.

## Coordination

- Current coordination hub: #1507, unless an explicit successor has replaced it.
- Scheduled Brood roster: 15 workers.
- Ren is interactive coordinator, not a scheduled worker slot.
- Ada is the coordinator/liveness steward and is assigned the Ren continuity chronicler duty in #1814.
- Scheduled source authority remains lane-specific and draft/source-only unless separately authorized.

## Operating priorities

The repository working agreement currently prioritizes:

1. customer revenue, automatic fulfillment readiness, and verifiable receipts;
2. outside AI-agent discovery/authentication/capability negotiation and bounded paid work;
3. network reliability, recovery, security, and independent operation;
4. public usability and honest discoverability;
5. reusable integrations/evidence quality;
6. bounded Green/Amber exploration.

Urgency does not convert source authority into wallet, signer, transaction, treasury, liquidity, validator, Work Credit, deployment, or funds authority.

## Public-network launch truth

Issue #1005 remains the multipath public-bootstrap launch blocker. Its acceptance target requires fresh nodes outside the operator Tailnet to join through multiple independent bootstrap failure domains and survive loss of an initial bootstrap component.

Recent Tor bootstrap work and workflow repairs are evidence toward that target; a merged workflow or manifest is not by itself final external acceptance.

## Continuity rule

Before substantial work, Ren should use this file to recover orientation, then verify every task-relevant statement against live sources.

When material truth changes, Ada should update this file and append a short journal record that states:

- what changed;
- exact issue/PR/commit references where available;
- the highest truth state actually proven;
- what remains unproven or separately authorized.

No journal entry may silently promote source-green to merged, merged to deployed, deployed to externally accepted, or readiness to economic activation.
