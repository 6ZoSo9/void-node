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
- activation time and expiry.

The maximum lease is five minutes. The package fixes every live fact required by
the gate: private Buy runtime active, production WC/VOID active, public presale
active, same launch ceremony, public Buy intake authorized,
`runtime_or_launch_evidence=true`, and `source_ready_only=false`.

Both signing requests contain the same EIP-712 payload and typed-data digest,
but bind different expected signer roles.

## Assemble

`assemble` accepts the package plus the two public signatures. It rebuilds the
package before use, verifies both signatures against the fixed production
identities through the gate's canonical verification functions, and only then
returns:

- exact receipt object;
- exact pretty-JSON receipt bytes;
- receipt SHA-256;
- exact operator confirmation string consumed by the live gate.

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
