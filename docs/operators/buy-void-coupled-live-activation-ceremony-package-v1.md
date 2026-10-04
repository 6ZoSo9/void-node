# Buy VOID coupled live-activation ceremony package v1

Marker: `VOID_BUY_COUPLED_LIVE_ACTIVATION_CEREMONY_PACKAGE_V1`

Status: source-only unsigned ceremony and public-signature assembly contract.

## Purpose

The coupled Buy VOID gate accepts a short-lived EIP-712
`CoupledPublicLaunchActivation` lease only when both fixed identities sign the
same exact typed payload:

- launch-controller:
  `0x2f1e0005e865b772b268bd8c797bf3eaa901d97e`
- Sovereign co-signer:
  `0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b`

This tool closes the non-secret handoff around that ceremony. It does not read a
key and does not sign.

## Prepare

`prepare` builds one content-addressed package from explicit ceremony facts:

- exact source composition ID;
- active generation and journal tip;
- activation nonce;
- activation time and expiry;
- package evaluation time.

The package refuses future-dated or already-expired leases at preparation time.
The maximum lease is five minutes. The package fixes every live fact required by
the gate: private Buy runtime active, production WC/VOID active, public presale
active, same launch ceremony, public Buy intake authorized,
`runtime_or_launch_evidence=true`, and `source_ready_only=false`.

Both signing requests contain the same EIP-712 payload, canonical JSON SHA-256,
and actual EIP-712 digest, but bind different expected signer roles. Package
creation does not claim that source readiness or generation authority was live-
verified; those remain separate ceremony inputs and gate checks.

## CLI example

Prepare prints only the unsigned package:

```bash
node tools/void-buy-coupled-live-activation-ceremony-package-v1.mjs prepare \
  --source-composition-id sha256:<64hex> \
  --activation-generation 0x<64hex> \
  --generation-tip-sha256 sha256:<64hex> \
  --activation-nonce 0x<64hex> \
  --activated-at-ms <ms> \
  --expires-at-ms <ms> \
  --evaluated-at-ms <ms>
```

After the two public signatures exist, assembly verifies the fixed production
identities and prints the receipt package; it still does not install or activate it:

```bash
node tools/void-buy-coupled-live-activation-ceremony-package-v1.mjs assemble \
  --package /absolute/package.json \
  --activation-signature 0x<130hex> \
  --sovereign-signature 0x<130hex>
```

## Assemble

`assemble` accepts the package plus the two public signatures. It rebuilds the
package before use, verifies both signatures against the fixed production
identities through the gate's canonical verification functions, and only then
returns:

- exact receipt object;
- exact pretty-JSON receipt bytes;
- receipt SHA-256;
- exact operator confirmation string consumed by the live gate.

A successful finalization proves only the fixed signer pair over the exact
package payload. It does not independently prove that source composition,
generation authority, or lease time are still live when the receipt is later
used. The runtime gate rechecks all of those conditions.

The assembler does not install the receipt, modify service configuration,
publish a generation, restart anything, or activate intake.

## Boundary

This lane performs no:

- private-key or wallet access;
- signing;
- transaction construction/signing/broadcast;
- Chain-2050 or WC-ledger write;
- inventory or liquidity movement;
- market or presale activation;
- runtime/service mutation;
- funds movement.

Synthetic proof signatures are deliberately unable to finalize a production
receipt because finalization always verifies against the two fixed production
addresses.

## Stacking

This PR is stacked on the Buy VOID coupled-launch gate PR because the typed-data
and receipt-verification contract lives there. After the base PR is merged, this
lane can be restacked onto `main` without changing its ceremony semantics.
