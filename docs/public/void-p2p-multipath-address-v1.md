# VOID P2P multipath peer addresses v1

Status: source-only foundation for issue #1040 and launch blocker #1005.

## Why this exists

VOID's existing raw TCP mesh already supports multiple configured bootstrap
targets, retry/backoff, HELLO address exchange, PEERS exchange, and automatic
dialing of learned peers. The remaining address parser was still based on a
single-colon `host:port` assumption, which made native IPv6 unusable and allowed
unvalidated learned strings to reach later dialing logic.

This lane fixes that foundation without adding a hosted dependency or changing
the deployed network.

## Canonical v1 address forms

Accepted:

```text
192.0.2.10:4700
peer.example:4700
[2001:db8::10]:4700
```

IPv6 must be bracketed when a port is present. DNS names are normalized to
lowercase. IPv6 is normalized through the platform URL parser. Ports are
integers from 1 through 65535. Operator-configured `BOOTSTRAP_ADDRS` retains
legacy tolerance for optional whitespace around comma-separated entries; learned
HELLO/PEERS addresses themselves remain strict and reject whitespace.

Rejected before dialing:

- unbracketed IPv6 plus port;
- IPv6 zone identifiers;
- whitespace or control characters;
- userinfo, paths, queries, and fragments;
- malformed brackets;
- missing, zero, negative, non-numeric, or out-of-range ports; and
- malformed DNS labels.

## Runtime boundary

The canonical parser is shared by:

- bootstrap-list normalization;
- advertised listen-address formatting;
- self-address comparison;
- HELLO listen-address ingestion;
- PEERS learned-address ingestion;
- P2P-to-HTTP compatibility inference; and
- `net.createConnection` dialing.

Malformed HELLO/PEERS addresses are discarded before they can enter the known,
dialing, or backoff sets.

The wire protocol remains the existing VOID TCP protocol. Circuit Relay v2,
DCUtR, AutoNAT v2, persistent peer storage, and bootstrap-record v2 are separate
follow-on lanes.

## Resilience proof

The focused proof starts two local VOID nodes while configuring the client with
two bootstrap targets: one deliberately closed port and one healthy peer. The
healthy peer must connect even while the failed peer is independently backing
off.

The same proof injects malformed learned PEERS addresses and requires that none
enter known/dial/backoff state.

Expected marker:

```text
VOID_P2P_MULTIPATH_ADDRESS_V1_PROOF_GREEN
ipv6_bracketed_peer_address_supported=true
unbracketed_ipv6_with_port_accepted=false
multiple_bootstrap_targets_independent=true
malformed_learned_peer_dialed=false
single_required_seed=false
wallet_signer_validator_wc_money_authority=0
```

## Authority boundary

This source lane does not modify a router, firewall, live interface, running
service, Tailnet, DNS, cloud account, bootstrap manifest, wallet, signer,
validator, treasury, Work Credits, transactions, or funds. It does not deploy
or publish a stable public seed.
