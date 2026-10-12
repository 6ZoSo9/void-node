# VOID P2P reachability classification contract v1

Status: source-only contract/proof foundation. No runtime P2P behavior is activated by this lane.

Launch blocker #1005 requires reachability/dialability classification after authenticated peer identity and persistent reconnect. The active P2P stack is still being developed in #1044/#1048, so this lane deliberately avoids their runtime files and defines the truth boundary first.

## Why this boundary exists

A failed inbound dial does **not** identify a NAT type. It also does not prove that a node needs a relay. Firewalls, transient routing, observer outages, address-family mismatch, stale advertisements, and other conditions can all produce the same failure.

VOID therefore separates observations from conclusions. This contract permits only these bounded classifications:

- `direct_confirmed`: at least two fresh, successful, authenticated dialbacks from distinct observer node identities **and** distinct declared observer failure domains to the same public IP/port and exact subject node ID;
- `direct_observed_unconfirmed`: at least one fresh authenticated dialback succeeds, but the independent-failure-domain threshold is not met;
- `outbound_observed`: an authenticated outbound session from the subject has been observed, with no fresh successful dialback;
- `non_public_address`: the candidate is not a public direct IPv4/IPv6 literal; and
- `unknown`: evidence is insufficient.

No classification infers a NAT type or concludes that a relay is required.

## Observation contract

Every `void_p2p_reachability_observation_v1` is content-addressed as `voidpro1_<sha256>` and binds:

- VOID Network / chain ID 2050;
- exact 32-hex subject and observer node IDs, matching the authenticated P2P identity contract;
- one declared observer failure domain;
- one canonical IPv4 `host:port` or bracketed IPv6 `[host]:port` candidate;
- one observation time;
- either `authenticated_outbound_seen` or `authenticated_dialback`;
- success/failure outcome;
- the exact authenticated subject identity for successful evidence;
- bounded latency for successful evidence; and
- zero private/economic authority.

Successful evidence that authenticates a different node ID is rejected. Failed evidence cannot claim an authenticated identity or latency.

IPv6 zone identifiers, unbracketed IPv6, zero/out-of-range ports, credentials, paths, query strings, fragments, whitespace, and control characters are rejected.

## Freshness and independence

The default evidence age is 15 minutes. Stale observations remain auditable inputs but do not count toward the current classification.

Two successful observations from two different node IDs but the **same declared failure domain** do not satisfy `direct_confirmed`. Likewise, one observer node ID cannot claim multiple failure domains and satisfy the threshold. Both observer identity and failure-domain independence are required.

This is a source contract, not a Sybil-proof identity system. Its node-ID width is intentionally the same 32 lowercase hexadecimal characters produced and verified by `deriveVoidNodeIdFromPublicPemV1`, so authenticated peer IDs can be bound without a second identity namespace or lossy translation. Runtime integration must later bind observer identity/failure-domain policy to the authenticated P2P layer under separate review.

## Direct-address boundary

The v1 contract classifies direct IP reachability only. Public IPv4 literals are accepted after excluding non-public/special ranges. IPv6 direct candidates must be global-unicast `2000::/3` and must not be loopback, ULA, link-local, multicast, documentation, mapped-v4, or other explicitly excluded ranges.

DNS, Tor, relay, and future transport-ranked addresses are separate transport/discovery concerns. They must not silently become direct-IP evidence.

## Fail-closed inference boundary

The emitted `void_p2p_reachability_record_v1` always carries:

```text
nat_type_inferred=false
relay_required_inferred=false
single_failed_dialback_proves_unreachable=false
direct_confirmation_requires_independent_authenticated_dialbacks=true
direct_confirmation_min_independent_observers=2
direct_confirmation_min_independent_failure_domains=2
runtime_integration_performed=false
network_calls_performed=false
```

A future AutoNAT/reachability runtime may consume equivalent authenticated evidence, but it must not weaken these truth semantics without a separately reviewed contract version.

## Proof coverage

The focused proof demonstrates:

- canonical IPv4 and bracketed IPv6 parsing;
- unbracketed IPv6 and zone-ID rejection;
- two independent authenticated dialbacks produce `direct_confirmed`;
- one successful observer does not produce `direct_confirmed`;
- two successful observers in one failure domain do not produce `direct_confirmed`;
- one observer claiming multiple failure domains does not produce `direct_confirmed`;
- outbound success plus failed dialbacks produces `outbound_observed`, not an unreachable/NAT claim;
- failed dialbacks alone remain `unknown`;
- non-public addresses cannot become `direct_confirmed`;
- stale success evidence does not count;
- identity-mismatched successful evidence is rejected;
- authenticated P2P 32-hex node IDs are accepted directly, while legacy 64-hex fixtures are rejected;
- future, tampered, duplicate, and unknown-field observations fail closed;
- content-addressed records reject semantic tamper, including correctly re-sealed classification lies;
- non-canonical alternate IPv6 spellings are rejected; and
- wallet/signer/validator/Work Credit/money authority remains zero.

Expected marker:

```text
VOID_P2P_REACHABILITY_CLASSIFICATION_CONTRACT_V1_PROOF_GREEN
independent_authenticated_dialback_required=true
single_observer_direct_confirmed=false
same_failure_domain_direct_confirmed=false
same_observer_multiple_domains_direct_confirmed=false
failed_dialback_nat_type_inferred=false
failed_dialback_relay_requirement_inferred=false
outbound_only_classified_without_unreachable_claim=true
non_public_direct_confirmed=false
identity_mismatched_dialback_accepted=false
resealed_semantic_lie_accepted=false
noncanonical_ipv6_accepted=false
stale_observation_counted=false
runtime_integration_performed=false
network_calls_performed=false
wallet_signer_validator_wc_money_authority=0
```

## Non-overlap

This lane does not modify `src/node_core.ts`, the active #1044 authenticated-peer implementation, #1048 verified-peer cache/reconnect files, bootstrap-record v2 files, Buy VOID paths, Tor bootstrap files, or any service/runtime configuration.

## Non-actions

No network probe is executed by the source proof or verifier unless a future caller separately creates evidence. This lane does not deploy, restart services, change firewall/router/interface state, access credentials, wallets, keys, or signers, mutate validator or Work Credit state, submit transactions, publish bootstrap records, or move funds.

Refs #1005. Designed as the reachability/dialability truth contract immediately after #1045/#1048, with runtime integration intentionally deferred until the authenticated P2P stack settles.
