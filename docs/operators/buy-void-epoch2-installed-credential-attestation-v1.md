# Buy VOID Epoch-2 installed credential attestation V1

Marker: `VOID_BUY_VOID_EPOCH2_CREDENTIAL_ATTESTATION_V1`

## Purpose

This lane supplies the missing operator evidence boundary between the reviewed
Epoch-2 signer source and any later runtime/payment activation decision.

It is intentionally separate from the historical Epoch-1 readiness probe.
The only accepted credential identity is:

`buy-void-epoch2-fulfiller-v1`

and the only accepted public signer is the immutable Epoch-2 fulfiller:

`0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a`

The source-only systemd example is:

`ops/systemd/void-node-live.service.d/97-buy-void-epoch2-fulfiller-credential-v1.conf.example`

It contains a placeholder private source path and is **not** installed by this
PR.

## What the explicit probe proves

After exact operator confirmation, the probe:

1. requires the exact current Epoch-2 source qualifier and reviewed source
   blobs;
2. reads the effective **user** `void-node-live.service` state through
   `systemctl --user show`;
3. requires the service to be active/running with exactly one effective
   `LoadCredential=buy-void-epoch2-fulfiller-v1:...` binding;
4. obtains `CREDENTIALS_DIRECTORY` only from the live service process
   environment under `/proc/<MainPID>/environ`;
5. accepts only a systemd-managed credential directory under
   `/run/user/<uid>/credentials/void-node-live.service` (or the system
   manager equivalent);
6. invokes the existing reviewed Epoch-2 credential signer, which reads the
   fixed credential leaf and requires it to derive the immutable fulfiller;
7. creates a fresh 32-byte challenge and derives the probe payment-delivery ID
   from the exact source head plus that challenge, then signs exactly one local
   capability-probe transaction with:
   - Chain ID 2050;
   - the exact Epoch-2 presale target;
   - the reviewed Epoch-2 access-list marker;
   - nonce `Number.MAX_SAFE_INTEGER`;
   - gas limit `1`, deliberately below the 21,000 EVM intrinsic transaction-gas floor;
   - zero max/priority fee;
   - zero native value;
   - one atomic VOID unit to the immutable fulfiller itself;
8. locally parses the signed transaction and requires the exact signer plus
   the canonical non-executable probe envelope: MAX_SAFE_INTEGER nonce, gas
   limit `1` (below EVM intrinsic gas), zero fees/value, exact presale target/access list, and exact
   `fulfill(..., immutable fulfiller, 1)` calldata;
9. rejects caller-selected nonce/fee/calldata variants and rejects a probe
   whose payment-delivery ID does not derive from the exact source head plus
   this invocation's fresh challenge, even if the expected key signed it;
10. binds only the challenge SHA-256 (not secret material) into the evidence;
11. discards the raw signed transaction and emits only public identities and
   hashes.

The probe is non-executable by construction because its gas limit is `1`, below the
21,000 base EVM intrinsic transaction-gas requirement (and far below the additional
calldata/access-list intrinsic cost). The extreme nonce is defense in depth, not the
execution barrier. The code performs no RPC request and never submits or broadcasts
the signed bytes.

## Disabled default

Running the CLI without `--probe` performs no systemd observation, no
`/proc` read, no credential read, and no signing:

```bash
node --import tsx scripts/void_buy_void_epoch2_credential_attestation_v1.ts
```

## Explicit operator probe

Only after the distinct E2 credential is separately installed into the live
Precision user service:

```bash
node --import tsx scripts/void_buy_void_epoch2_credential_attestation_v1.ts \
  --probe \
  --confirm probeBuyVoidEpoch2InstalledCredentialSigningCapabilityV1
```

Do **not** paste a private key, seed phrase, credential file, or credential
contents into ChatGPT, a shell argument, a Git file, or the probe output.

A GREEN result is evidence only. It does not enable Buy VOID, mutate the
service, restart systemd, call Chain 2050, broadcast a transaction, accept a
payment, activate the presale/WC market, or move funds.

## Source-generation binding

The operator CLI fails closed unless the stacked #2833 generation has the exact
reviewed identities for the Epoch-2 source qualifier, credential signer,
current full runtime, and this attestation core. The evidence also records
content-addressed source identities plus the existing public credential-source
binding ID.

This addresses the mechanism required for the dormant candidate gates:

- installed systemd credential identity;
- active signing capability;
- binding credential evidence to the current runtime source generation.

It does **not** replace the separate public EIP-191 launch-operator
signer-control challenge and does not itself promote the dormant candidate.

## Verification

```bash
node --import tsx scripts/prove_buy_void_epoch2_credential_attestation_v1.ts
node --import tsx scripts/void_buy_void_epoch2_credential_attestation_v1.ts
npm run typecheck
npm run build
```

**PROTECT THE CORE.**
