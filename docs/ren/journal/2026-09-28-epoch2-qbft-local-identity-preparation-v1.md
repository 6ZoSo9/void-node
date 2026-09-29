> **Superseded topology note — 2026-09-29:** This entry is a historical snapshot.
> The current canonical production QBFT topology is three validators
> (Precision, Nimo, Xiphos), quorum 2, Byzantine fault tolerance 0.
> A fourth validator is not a current launch prerequisite. Current truth is
> `ops/mainnet0/economic-epoch2-qbft-topology-v1.json`.

# Epoch-2 QBFT local identity preparation v1

Marker: `VOID_REN_EPOCH2_QBFT_LOCAL_IDENTITY_PREPARE_V1`

On 2026-09-28, the production epoch-2 runtime blocker was narrowed to two
missing independent Besu QBFT identity slots.

The repository already binds Precision and Nimo. It still requires two more
independently attested live machine identities before production QBFT extraData
or a production validator set may be promoted.

A generic local preparation tool was added for the remaining machines. It:

- reads the machine's own loopback `/health.nodeId`;
- generates/reuses a machine-local Besu secp256k1 node key;
- keeps the unencrypted private node key off-repository with mode `600`;
- emits only public key/address identity evidence;
- starts no Besu service; and
- grants no validator mutation, Chain-2050 write, migration, or activation.

At the time of this entry, the intended next candidate was Xiphos and the
working plan also contemplated a possible fourth host. No identity was
considered bound until its actual local public attestation was produced,
reviewed, and merged.

**Superseded 2026-09-29:** the canonical production topology is now the three
attested machines Precision, Nimo, and Xiphos. No fourth host is required for
launch.

Historical truth at the close of this 2026-09-28 entry was:

- QBFT attested identities: 2;
- then-required identities: 4;
- production extraData built: false;
- production validator set bound: false;
- production epoch-2 RPC target selected: false;
- migration authorized: false; and
- public activation authorized: false.

Memory for context. Repo for truth. Brood journal for continuity.
