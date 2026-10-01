# WC/VOID launch-controller control requalification v1

Marker: `VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1`

Status: source-only public control-proof contract. It does not assign a
launch-controller role, read a private key, access a wallet/signer, construct or
sign a transaction, broadcast, deploy the market vault, fund inventory, activate
WC/VOID or the presale, or move funds.

## Why this gate exists

The current WC/VOID vault role/deployment preflight correctly remains:

```text
HOLD_LAUNCH_CONTROLLER_REQUALIFICATION_REQUIRED
```

Two role identities are current and source-backed:

- settlement executor:
  `0xc884f631c3881b8b672bfcbf019c856146cd7f73`;
- Sovereign closeout controller:
  `0xe1f147b6b2671f140c4107fa4a1dd5f7cbd06d0b`.

The historical dedicated launch-controller candidate:

```text
0x2f1e0005e865b772b268bd8c797bf3eaa901d97e
```

was generated offline on Nimo on 2026-09-25. Historical evidence records that
the key was created offline and available at generation time, but it explicitly
records:

```text
signing_challenge_performed=false
```

That historical generation receipt is not current role authority.

This contract supplies a fresh proof-of-control mechanism without importing the
private key into the repository or online verifier.

## Current launch binding

Every challenge is bound to the exact current canonical source inputs:

- coupled candidate Git blob
  `d78bc88dd26c47921a54c081a79ceefc0d5abcee`;
- accepted vault identity Git blob
  `c85b6bc59caac6bc765cb8e969cb980386161d12`;
- coupled launch
  `sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26`;
- bytes32 launch identity
  `0xfe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26`;
- accepted compiled identity
  `voidwcvci1_51841520b1db294e44023c127bbe7caa28d8f87a97c788109b6609222941125a`;
- Epoch-2 VOID token
  `0x470075b85352eb86f7d089fb9ba88945f12aad94`.

Challenge preparation requires a clean Git worktree. The challenge records the
current HEAD/tree and exact source blobs. Verification requires the challenge
HEAD to remain an ancestor of the verifier's current HEAD and requires both
canonical source blobs to remain byte-identical.

Unrelated later commits therefore do not invalidate a challenge, but changing
the launch or accepted vault identity does.

## EIP-712 challenge

Domain:

```text
name    = VOID WC/VOID Launch Controller Control
version = 1
chainId = 2050
salt    = keccak256(
  "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_REQUALIFICATION_V1"
)
```

The signed `LaunchControllerControl` value binds:

- execution epoch 2;
- fixed launch-controller role ID;
- candidate address;
- current coupled launch ID;
- current compiled identity ID;
- canonical VOID token;
- SHA-256 of the exact source binding;
- random 32-byte nonce;
- issued time; and
- expiry time.

The challenge file embeds the exact EIP-712 `domain`, `types`, and `value`
so an offline signer does not need to reconstruct them.

Default TTL is 900 seconds. Accepted TTL is 60..1800 seconds.

## Candidate control is not role authority

The challenge generator accepts a candidate EOA address.

A valid signature proves only:

```text
CANDIDATE_CONTROL_VERIFIED_ROLE_NOT_AUTHORIZED
```

The verifier recovers the signer from the EIP-712 signature and requires it to
equal the challenged candidate address.

This deliberately separates two decisions:

1. **control proof** — does somebody currently control this EOA?
2. **role selection/authorization** — should this EOA become the current
   WC/VOID vault launch controller?

This lane answers only question 1.

The later #2225 role/deployment preflight must independently require the evidence
candidate address to equal the separately selected launch-controller address and
must still perform its own role-separation and authority checks.

## Historical candidate

The source exports the historical reference:

```text
address =
0x2f1e0005e865b772b268bd8c797bf3eaa901d97e

public_identity_sha256 =
7ca273a6b188e64e7099d57e7705345559fe7156c12406cde5097ce47350f431

current_authority=false
signing_challenge_previously_verified=false
```

A future live challenge may target that address, but merely naming it does not
restore its 2026-09-25 role proposal.

## Offline operational flow

Only after this source lane is accepted/merged:

1. Prepare a fresh challenge from a clean reviewed repository generation.
2. Transfer the public challenge JSON to Nimo.
3. Keep Nimo offline.
4. Use the dedicated launch-controller private key to sign the embedded EIP-712
   typed data.
5. Return only the 65-byte public signature (or a public signature envelope).
6. Verify the challenge/signature before the challenge expires.
7. Preserve the resulting public evidence for review.
8. Only a later role/deployment gate may decide whether to consume that evidence
   for a specific candidate address.

The verifier itself never reads the private key.

A future signing helper, if used, must remain an explicitly reviewed offline
operator action. This source lane intentionally contains no signing code.

## CLI

Prepare challenge:

```bash
node tools/void-wc-void-launch-controller-control-requalification-v1.mjs \
  prepare \
  --candidate-address 0x... \
  --ttl-seconds 900 \
  --output /absolute/private-work/challenge.json
```

The output is create-only mode 0600 and prints its SHA-256, challenge ID, typed
data digest, and expiry.

Verification consumes exact challenge/signature file SHA-256 values:

```bash
node tools/void-wc-void-launch-controller-control-requalification-v1.mjs \
  verify \
  --challenge /absolute/challenge.json \
  --challenge-sha256 <64hex> \
  --signature /absolute/signature.json \
  --signature-sha256 <64hex> \
  --output /absolute/control-evidence.json
```

Signature envelope schema:

```json
{
  "marker": "VOID_WC_VOID_LAUNCH_CONTROLLER_CONTROL_SIGNATURE_V1",
  "version": 1,
  "challenge_id": "voidwclcc1_...",
  "signature": "0x..."
}
```

The signature is public cryptographic evidence; no private-key material belongs
in the envelope.

## Evidence authority

A green evidence artifact is self-contained. It embeds:

- the exact normalized challenge envelope;
- the exact public signature envelope;
- the source binding and typed-data digest;
- the candidate address and current launch/vault/token identities; and
- the challenge validity deadline.

Its `voidwlcce1_...` identity is content-addressed over the signed proof
material and authority posture, not the verifier's wall-clock observation time.
Re-verifying the same still-valid artifact therefore derives the same evidence
ID.

A downstream consumer must call
`reverifyVoidWcVoidLaunchControllerControlEvidenceV1(...)` (or an equivalent
reviewed composition) at the **current evaluation time**. Re-verification reruns
current source binding, challenge expiry, EIP-712 signer recovery and semantic
cross-links. It does not trust the artifact's summary booleans.

A green evidence artifact explicitly remains:

```text
control_verified=true
role_binding_authorized=false
deployment_authorized=false
inventory_funding_authorized=false
market_activation_authorized=false
public_presale_activation_authorized=false
funds_movement_authorized=false
```

It does not authorize a systemd/runtime change, contract call, deployment,
funding, transaction, or market action. #2225 must additionally require the
reverified candidate address to equal the separately selected launch-controller
address before that later role/deployment lane can advance.
