# Buy VOID Epoch-2 dormant runtime candidate V2

V2 is the source-successor composition after acceptance of the public
Epoch-2 signer-control evidence.

It does not replace or mutate V1. V1 remains the frozen candidate in which
signer control was unproven.

## What changed from V1

The runtime configuration is unchanged and remains disabled.

V2 accepts the content-addressed public EIP-191 signer-control record and closes
exactly one gate:

\`prove_launch_operator_signer_controls_exact_immutable_epoch2_fulfiller\`

The accepted signer-control evidence establishes point-in-time off-chain
control of the immutable fulfiller
\`0x0f0b8aa14e1c9764fa8e4fa8b38fd3d3b8c2498a\`.

It does not establish systemd credential identity or current live runtime
source binding.

## V2 source qualification

The V2 source qualifier first runs the frozen V1 source qualification. It then
requires exact Git blobs for:

- the frozen V1 candidate;
- the V2 candidate;
- the public signer-control evidence;
- the frozen V1 source-qualification tool;
- the public evidence verifier.

It accepts V2 only when the runtime configuration and authority object remain
exactly equal to V1, the public EIP-191 evidence independently recovers the
immutable fulfiller, and the remaining gate list is exactly V1 minus the
completed signer-control gate.

## Remaining gates

Five gates remain:

1. independently attest the systemd credential identity and active signing
   capability;
2. bind accepted signer evidence to current runtime source generation;
3. qualify the live fee envelope and exact chain receipt;
4. complete the current Chain-2050 one-payment/one-fulfillment canary;
5. coupled presale and WC/VOID Sovereign activation.

## Authority boundary

V2 remains candidate-only.

\`FULL_RUNTIME_ENABLED=0\` and \`FULL_RUNTIME_APPLY_ENABLED=0\`.

No credential or wallet access, service mutation, transaction signing or
broadcast, customer payment acceptance, presale activation, WC/VOID activation,
or funds movement is authorized by this source successor.
