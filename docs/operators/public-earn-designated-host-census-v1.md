# Public Earn designated-host census v1

Marker: `VOID_PUBLIC_EARN_DESIGNATED_HOST_CENSUS_V1`.

Status: **read-only host census source**. This is not an installer, deployment
tool, firewall verifier, Funnel cutover, or live acceptance receipt.

## Purpose

Ready #2993 closes the shared Public Earn mutation route at source level.
Ready #2997 defines the exact local UID/nftables policy shape required for:

```text
public-443 dispatcher
  -> Public Earn PROXY-v2 edge
  -> dedicated Public Earn claim/submit listener
```

This census is the first designated-host observer for that topology. Its job is
to answer a narrower question:

> What exact relevant runtime/service/listener/state/firewall metadata is
> actually present on Precision right now?

It deliberately does **not** claim the nftables rules are correct merely because
a table exists, and it does not claim the historical public mutation route has
been removed. Those remain later verification/cutover steps.

## Reviewed source generation

The census binds the exact reviewed runtime blobs inherited from Ready #2997:

- public-443 dispatcher:
  `bc39f84d3a2d70d26b54b9280ba5f0e23d7c7824`;
- Public Earn PROXY-v2 edge:
  `38da7cb2da07fb172c67080d4eebbfbb39d26d08`;
- Public Earn gateway:
  `140796d809a13171f0186a226bade1b4d82f406d`;
- #2997 isolation policy:
  `a87ecb2a8bd053aba3c6753f0677e2c524e7e24f`.

A running Node process is compared to the reviewed Git blob by reading only its
entry-script bytes from argv[1]. The entry path itself is not emitted.

## Canonical service units

The observer checks these **system** units:

```text
void-public-443-proxy-v2-dispatch-v1.service
void-public-earn-proxy-v2-edge-v1.service
void-public-earn-gateway-v1.service
```

System units are intentional: #2997 requires distinct effective UIDs. A legacy
single-user service arrangement may be observed as a HOLD but cannot satisfy
that isolation contract by assertion.

## Read-only observations

The collector may read:

- hostname and effective UID;
- `systemctl show` for the three canonical services;
- `/proc/<pid>/status`, argv[1], cwd, executable identity and only a strict
  allowlist of relevant environment keys;
- `ss -H -ltnp` for listener/PID ownership;
- filesystem **metadata only** for the Earn-edge rate-state parent/file;
- `nft -j list table inet void_public_earn_edge_v1`;
- the current checkout HEAD.

It never reads the rate-state file contents.

Environment output is limited to the topology keys needed to derive ports. It
does not emit the full process environment. The rate-state path is represented
only by SHA-256 plus file metadata.

The raw nftables JSON is never printed or written into the census result; only
presence, byte count and SHA-256 are emitted.

## Derived topology

The census derives, without inventing values:

- dispatcher listener port;
- dispatcher-selected Earn-edge port;
- Earn-edge listener port;
- Earn-edge loopback adapter-upstream port;
- shared gateway port;
- dedicated gateway mutation port;
- whether dispatcher target == Earn-edge listener;
- whether Earn-edge upstream == dedicated mutation listener;
- whether all three effective UIDs are non-root and pairwise distinct;
- whether NoNewPrivileges is active and CAP_NET_ADMIN absent;
- whether running entry scripts match the reviewed Git blobs;
- exact IPv4-loopback listener ownership for the observed ports;
- private same-UID rate-state custody shape.

A `policy_candidate_observed=true` result is still **not** live acceptance.
It only means the census found enough matching metadata to justify a later exact
nftables/publication verifier.

## Deliberate nonclaims

Every run keeps these false:

```text
nftables_ruleset_live_verified=false
old_direct_publication_cutover_verified=false
funnel_to_dispatcher_trust_proven=false
local_transport_trust_proven=false
runtime_integration=false
live_host_acceptance_claimed=false
```

This prevents a hash-only firewall observation or a stale cloudflared route from
being promoted into a trust claim.

## Modes

Self-test:

```bash
python3 -I -B ops/public/void_public_earn_designated_host_census_v1.py --self-test
```

Plan:

```bash
python3 -I -B ops/public/void_public_earn_designated_host_census_v1.py --plan
```

Read-only collection:

```bash
sudo python3 -I -B ops/public/void_public_earn_designated_host_census_v1.py \
  --run \
  --output "$HOME/Downloads/void-public-earn-designated-host-census-v1.json"
```

Root is not used to mutate anything. It is useful only so `ss`, `/proc` and
nftables metadata have complete visibility. If run without root,
`complete_privileged_visibility=false` prevents a positive policy-candidate
observation.

The output file is create-only and mode 0600.

## Expected current behavior

Before the future dedicated services/firewall are installed, a Precision run is
expected to return `HOST_INTEGRATION_HOLD`. That is useful evidence, not a
failure of the collector.

The collector must not be used as authority to install missing components.

## Verification

```bash
python3 -I -B ops/public/void_public_earn_designated_host_census_v1.py --self-test
python3 -I -B scripts/prove_void_public_earn_designated_host_census_v1.py
python3 -I -B ops/public/void_public_earn_designated_host_census_v1.py --plan
git diff --check
```

## Authority boundary

Read-only source/proof only. No service/systemd mutation, nftables write,
Funnel/Serve/DNS/network mutation, credential/key/wallet/signer access,
transaction/payment, Work Credit mutation, Chain-2050 mutation,
presale/market activation, inventory/treasury/liquidity action, or funds
movement.
