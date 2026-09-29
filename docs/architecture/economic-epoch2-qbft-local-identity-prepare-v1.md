# Economic Epoch-2 QBFT local identity preparation v1

Marker: `VOID_ECONOMIC_EPOCH2_QBFT_LOCAL_IDENTITY_PREPARE_V1`

Status: source-only local key/attestation preparation tool.

## Purpose

Prepare one machine-local Besu QBFT node identity without starting Besu,
modifying validator state, or granting migration/activation authority.

The tool:

- reads the machine's canonical VOID node ID from loopback `/health.nodeId`;
- creates or reuses one local 32-byte secp256k1 Besu node key;
- stores that unencrypted node key only in a dedicated private local directory;
- enforces a private key file mode of `600`;
- derives the uncompressed Besu public key;
- derives the exact Besu validator address from that public key;
- writes one local private-attestation metadata file that contains no private
  key material; and
- writes one public attestation candidate matching the existing Precision/Nimo
  repository shape.

Besu documents `--node-private-key-file` as the node private-key file and
warns that the private key is not encrypted. The local custody directory
therefore remains private and off-repository.

## Invocation

Example for Xiphos:

```bash
node ops/common/void-economic-epoch2-qbft-local-identity-prepare-v1.mjs \
  --machine-role xiphos \
  --node-base http://127.0.0.1:4102/ \
  --output "$HOME/Downloads/void_epoch2_qbft_identity_xiphos_public_candidate_v1.json"
```

Example for Alienware:

```bash
node ops/common/void-economic-epoch2-qbft-local-identity-prepare-v1.mjs \
  --machine-role future-validator \
  --node-base http://127.0.0.1:4100/ \
  --output "$HOME/Downloads/void_epoch2_qbft_identity_future_validator_public_candidate_v1.json"
```

Default private custody root:

```text
~/.local/share/void/epoch2-qbft-validator-identity-v1/<machine-role>/
```

The local Besu node key filename is `nodekey`.

## Safety boundary

The node source must be loopback HTTP. The tool performs no external network
request, SSH, service start/restart, Besu launch, validator mutation, RPC
mutation, wallet access, transaction construction/signing/submission/broadcast,
Chain-2050 write, funds movement, migration, or public activation.

A generated public attestation is still unbound source evidence. It does not
place the identity into the production QBFT validator set by itself.


## Current topology note

The canonical production topology currently uses Precision, Nimo, and Xiphos.
No fourth validator is required for launch. This preparation tool remains
generic for future topology expansion only; any additional validator requires a
separate reviewed topology change.
