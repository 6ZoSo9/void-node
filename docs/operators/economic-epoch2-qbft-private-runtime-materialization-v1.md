# Epoch-2 private QBFT runtime materialization v1

Marker: `VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_MATERIALIZATION_V1`

Status: source-only prepare package. Installation and validator start remain
separate lifecycle gates.

## Purpose

Convert one reviewed private
`VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_PLAN_V1` into an exact per-host
runtime bundle without installing or starting the validator.

The host preparation runner builds only a private output directory containing:

- the exact reviewed Epoch-2 Besu genesis;
- genesis build evidence;
- the host's exact two-peer `static-nodes.json`;
- the rendered user-systemd unit; and
- a content-addressed materialization/preparation receipt.

The bundle is mode-restricted and is not repository source.

## Network and RPC shape

Every host uses:

- Besu 26.8.1 at the pinned image digest;
- the exact raw-transaction-domain plugin;
- P2P TCP port 30313;
- discovery disabled;
- an explicit two-peer static-node file;
- maximum two peers; and
- minimum one peer for synchronization.

The rendered Docker publication binds P2P only to the current tailnet IPv4 from
the private plan.

Only Precision publishes JSON-RPC, and only to:

`127.0.0.1:18553 -> container 8545`

Nimo and Xiphos remain RPC-disabled.

## Rootless Docker and validator-key boundary

V1 requires the existing operator Docker daemon to report rootless mode.
The rendered container runs as UID/GID `0:0` **inside the rootless user
namespace**. Under rootless Docker, container UID 0 maps to the host operator
UID, while nonzero container UIDs map into the subordinate UID range. This lets
the validator consume the operator-owned mode-0400/0600 node key without
weakening its host permissions.

The container still uses `--cap-drop=ALL`,
`--security-opt=no-new-privileges:true`, read-only key/plugin/config mounts,
and `Restart=no` for the initial ceremony runtime.

Preparation verifies only validator-key filesystem metadata:

- expected role-specific path;
- regular non-symlink file;
- owner is the current operator user; and
- mode is 0400 or 0600.

The preparation runner does **not** read the node-key bytes. Exact private-key to
public-validator identity revalidation remains part of the separately authorized
activation gate immediately before start.

## Genesis

Preparation invokes the existing reviewed builder with the exact client-neutral
state manifest and production QBFT extra-data evidence.

The resulting `genesis.json` must equal SHA-256:

`6a074665f4e282ad02d1f96314509295a0b2c6c8645a04989fd1a4b3ad232941`

No RPC or chain runtime is used to build it.

## Prepare-only authority

The host runner may write only its caller-selected private output directory. It
does not write the final runtime root and does not install the rendered unit.

It performs read-only Docker security/image inspection, requires rootless mode,
and never runs, pulls, starts, or stops a container.

It does not:

- install a systemd unit;
- run `systemctl daemon-reload`;
- enable or start a service;
- start a P2P or RPC listener;
- read validator private-key bytes;
- construct, sign, submit, or broadcast transactions;
- create Chain-2050 blocks;
- move tokens or funds; or
- authorize migration or public activation.

## Remaining gates

After source review and merge, the operational sequence remains deliberately
separate:

1. prepare the exact bundle independently on Precision, Nimo, and Xiphos;
2. compare the three genesis hashes and role-specific materialization receipts
   with the bundle-set verifier;
3. require one green
   `VOID_ECONOMIC_EPOCH2_QBFT_PRIVATE_RUNTIME_BUNDLE_SET_V1` receipt;
4. separately authorize installation of the reviewed bundles;
5. perform a fresh topology/key/plugin/port revalidation;
6. separately authorize validator start; and
7. prove two-of-three QBFT quorum before any transaction-submission authority is
   considered.

Starting the second validator can begin authoritative successor block
production, so validator start is not implied by materialization readiness.

## Three-host bundle-set verification

After all three host bundles have been prepared and copied to one private
operator workspace, Precision may run
`ops/precision/void-precision-epoch2-qbft-private-runtime-bundle-set-v1.mjs`.

That verifier requires exactly one bundle for each role and independently
checks the common private-plan bytes, common exact genesis, genesis-builder
evidence, content-addressed materialization identity, static peer set, rendered
unit hash, and every local preparation check. It emits a mode-0600 bundle-set
receipt and performs no network, service, Docker, key, transaction, or chain
action.
