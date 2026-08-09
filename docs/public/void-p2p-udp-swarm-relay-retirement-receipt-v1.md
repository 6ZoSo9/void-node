# VOID P2P UDP swarm relay-retirement receipt v1

Status: source-only audit primitive stacked on the fail-closed relay-retirement executor v1. No Node mount, live relay mutation, or public/production UDP activation is performed by this lane.

## Purpose

Provide one deterministic, closed-schema receipt for a **terminal** relay-retirement executor snapshot without widening the executor's mutation authority.

The receipt is intended to let later Node/runtime/operator surfaces record exactly what the one-shot executor concluded:

- relay retirement completed;
- the retirement callback explicitly rejected the operation; or
- the callback threw after invocation, so the mutation result is indeterminate.

A pending executor state is not receipt-eligible.

## Input trust boundary

The builder consumes a `VoidUdpSwarmRelayRetirementExecutorSnapshotV1` supplied by the already-reviewed executor boundary. It does not inspect sockets, peer maps, relay streams, health probes, or network traffic itself.

The builder independently validates the snapshot's closed shape and exact binding syntax before producing a receipt. It rejects unknown snapshot/binding fields, malformed bindings, non-v1 snapshots, non-terminal phases, inconsistent phase/result combinations, and any snapshot claiming authority outside the executor's reviewed boundary.

This receipt is therefore a deterministic normalization of a trusted executor snapshot. It is **not** a signature, consensus certificate, remote attestation, or independent proof that a live network mutation occurred.

## Terminal semantics

The only accepted phase/result combinations are:

| Executor phase | Receipt disposition | `relay_retirement_performed` |
| --- | --- | --- |
| `retired` | `relay_retired` | `true` |
| `callback_rejected` | `retirement_callback_rejected` | `false` |
| `callback_indeterminate` | `retirement_callback_indeterminate` | `null` |

All three require `retirement_callback_attempted=true`.

`pending` fails closed with `snapshot_not_terminal`.

The `callback_indeterminate` case deliberately preserves `null`; it must never be rewritten to a false certainty after a callback throws.

## Content address

Every successful receipt contains `receipt_id_sha256`, computed as SHA-256 over the exact JSON serialization of the fixed-order receipt material before the ID field is appended.

The material binds:

- the v1 receipt domain and version;
- exact session ID;
- exact expected peer node ID;
- exact relay node ID;
- exact relay stream ID;
- executor terminal phase;
- normalized disposition;
- callback-attempted state;
- tri-state retirement result; and
- the fixed no-extra-authority fields.

Equivalent terminal snapshots therefore produce the same receipt ID. A changed binding or changed terminal disposition produces a different ID.

The content address is an integrity/deduplication identifier. It does not add signing or authorization authority.

## Fail-closed authority boundary

The builder will not produce a receipt if the supplied snapshot claims any of these as true:

- direct-route mutation;
- verified-direct evidence persistence; or
- production UDP activation.

Successful receipts also fix these receipt-side fields:

- `relay_mutation_performed=false` — the receipt builder itself performs no relay mutation;
- `direct_route_mutation_performed=false`;
- `verified_direct_evidence_persisted=false`;
- `production_udp_activation_performed=false`.

The receipt does not convert a successful punched/authenticated direct socket into durable evidence that the peer's signed listen addresses are publicly dialable. That remains outside the UDP swarm retirement boundary.

## Collision boundary

This lane is additive and does not modify `src/node_core.ts`.

A separate in-progress Node relay-retirement mount may later choose to consume this primitive after its own runtime integration settles, but that branch is not modified, rebased, reconciled, or otherwise touched here.

## Authority / non-claims

This lane performs source, proof, documentation, CI, branch publication, and draft PR metadata only.

It does not:

- close or mutate a relay socket;
- mutate the normal peer map or direct route;
- persist verified-direct reachability evidence;
- allocate or activate public/production UDP;
- deploy or restart services;
- change router, firewall, DNS, interface, or Tailnet state;
- access credentials or private keys;
- access wallet, signer, validator, treasury, or Work Credit authority;
- sign, submit, or broadcast a transaction; or
- move funds.

Marking ready for review and merge remain separate repository gates.
