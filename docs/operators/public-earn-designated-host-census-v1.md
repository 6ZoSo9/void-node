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

The collector no longer reads a running process command line to discover its
entry script. Under the no-credential authority boundary, arbitrary argv bytes
are not treated as safe configuration evidence. The reviewed checkout source
blobs remain bound, while live running-entry source binding is explicitly
unobserved until a separate non-secret process-source evidence contract exists.

The collector also independently re-hashes the four reviewed source files in
the checkout and requires those Git blobs to match before
`policy_candidate_observed=true` can be emitted.

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
- `/proc/<pid>/stat` kernel start ticks, `status`, and executable identity;
- exact IPv4-loopback listener/PID metadata from `ss -H -ltnp`;
- `ss -H -ltnp` for listener/PID ownership;
- filesystem **metadata only** for the Earn-edge rate-state parent/file;
- `nft -j list table inet void_public_earn_edge_v1`;
- the current checkout HEAD.

It never reads the rate-state file contents.

The collector does **not** read `/proc/<pid>/environ`, the full systemd
environment, or `/proc/<pid>/cmdline`. This is an access boundary, not merely
an output-redaction rule. Consequently, configured upstream targets and the
rate-state path are not inferred from secret-bearing process state.

The raw nftables JSON is never printed or written into the census result; only
presence, byte count and SHA-256 are emitted.

Each run records `observed_at_utc` in canonical whole-second UTC form. The
census does not promote that timestamp into a freshness acceptance claim; a
later verifier must apply its own bounded age/skew policy.

## Safe observed topology metadata

Without reading process environment or command-line bytes, the census may still
report:

- stable systemd MainPID + kernel start-tick generations;
- effective UID/GID, NoNewPrivileges and CAP_NET_ADMIN absence;
- exact IPv4-loopback ports owned by each observed service PID;
- reviewed checkout source blobs; and
- presence plus digest/size of the dedicated nftables table.

It deliberately does **not** assign those observed ports to configured
dispatcher targets, Earn-edge upstreams, shared-vs-dedicated gateway roles, or
the rate-state path. Those relationships require a later reviewed **non-secret
topology evidence contract** that is actually bound to the installed services.

Therefore this generation always keeps
`topology_configuration_observed=false`,
`running_entry_source_binding_observed=false`, and
`non_secret_topology_evidence_required=true`. A live census is safe HOLD
evidence, not a path to `policy_candidate_observed=true` by itself.

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

A Precision run is expected to return
`NON_SECRET_TOPOLOGY_EVIDENCE_REQUIRED` even if some services/listeners are
present. That result is useful safe HOLD evidence: this generation will not
trade the no-credential boundary for a positive topology claim.

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
