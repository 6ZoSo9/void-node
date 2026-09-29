# Epoch-2 QBFT live topology preflight v1

Marker: `VOID_ECONOMIC_EPOCH2_QBFT_LIVE_TOPOLOGY_PREFLIGHT_V1`

Status: read-only three-host observation gate.

## Purpose

Collect the live network and host facts needed before a private production
successor QBFT runtime can be planned for Precision, Nimo, and Xiphos.

This gate does not start Besu, create a listener, modify Docker, install a
service, read validator private-key bytes, construct/sign/submit/broadcast a
transaction, mutate Chain-2050, or move funds.

## Observed hosts

The Precision runner observes:

- Precision locally;
- Nimo through the operator SSH alias `Nimo` by default; and
- Xiphos through the operator SSH alias `xiphos` by default.

The aliases can be replaced only through `VOID_NIMO_SSH_TARGET` and
`VOID_XIPHOS_SSH_TARGET`. Addresses and SSH key paths are not committed.

For each host the runner checks:

- exact hostname and user;
- one current Tailscale IPv4 in `100.64.0.0/10`;
- clean `main` aligned to the same exact repository head;
- the canonical Epoch-2 QBFT node-key file exists and remains mode 0400/0600;
- node-key bytes are not read or emitted;
- the exact raw-transaction-domain plugin JAR is present;
- Docker is reachable and the pinned Besu image is already present;
- TCP port 30313 is vacant for the future private QBFT peer listener; and
- TCP port 18553 is vacant for the future loopback RPC boundary.

A green result derives the exact three static enode URLs from the already
committed Besu public keys and the freshly observed Tailscale addresses.

## Next gate

A green preflight permits source planning for a private, pre-public-activation
three-validator successor runtime. It does not itself authorize starting that
runtime. Starting a QBFT validator network creates authoritative successor-chain
blocks and remains a separate operator/Sovereign action.
