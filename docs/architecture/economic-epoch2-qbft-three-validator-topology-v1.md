# Economic Epoch-2 QBFT three-validator topology v1

Marker: `VOID_ECONOMIC_EPOCH2_QBFT_TOPOLOGY_V1`

The production validator inventory is:

- Precision
- Nimo
- Xiphos

No fourth production machine is currently available. The canonical launch
topology is therefore three independently attested Besu QBFT validators.

## Quorum and fault boundary

Besu 26.8.1 computes BFT validator quorum as:

```text
ceil(2N/3)
```

This is bound to Besu release
`d97cbd61976a52bb109e637196fef9a8ebf2b617`,
`consensus/common/src/main/java/org/hyperledger/besu/consensus/common/bft/BftHelpers.java`,
Git blob `6c52dd719144a4d85fd61f9efe06b353f34c9316`, where
`calculateRequiredValidatorQuorum` calls
`Util.fastDivCeiling(2 * validatorCount, 3)`.

For `N=3`:

```text
required quorum = 2
Byzantine fault tolerance = floor((N - 1) / 3) = 0
```

So the three-validator topology can form a two-validator quorum, but it must not
be described as tolerating one Byzantine validator. Four validators would be
the minimum topology for one Byzantine-fault margin.

The fourth-validator count is therefore an **expansion/safety target**, not a
current launch prerequisite.

## Canonical production roles

The only production validator machine roles in this topology are:

```text
precision
nimo
xiphos
```

An unassigned fourth slot is not a HOLD condition.

## Gate consequences

The production identity requirement becomes:

```text
required_live_node_count=3
attested_live_node_count=3
attested_identity_slots_remaining=0
```

The three identities still require:

- unique VOID node IDs;
- unique Besu public keys and validator addresses;
- exact public-key/address derivation;
- content-addressed public identity attestations;
- exact QBFT `extraData`;
- production-genesis binding; and
- per-validator raw-domain runtime evidence.

Reducing the topology from four to three does **not** authorize:

- validator mutation;
- migration;
- public activation;
- transaction broadcast;
- Chain-2050 writes; or
- funds movement.

## Superseded fourth-identity path

The earlier fourth-identity preparation/import tooling is retained only for
historical continuity and possible future topology expansion. It is not part of
the active production critical path and must not be presented as a pending
operator task.

A later fourth validator may be added through a separately reviewed topology
change.
