# Buy VOID coupled launch gate v1

Marker: `VOID_BUY_COUPLED_LAUNCH_GATE_V1_GREEN`

## Purpose

Keep public Buy VOID request intake and the production WC/VOID opening behind
one fail-closed admission boundary.

The runtime must not treat any one of these as sufficient authority:

- the public Buy intake environment toggle;
- source-level coupled launch `SOURCE_READY`;
- the final coupled source-promotion artifact; or
- a caller-supplied boolean claiming that launch occurred.

`SOURCE_READY` grants no funding or activation authority.

## Canonical source inputs

The source half reads exactly:

- `ops/mainnet0/wc-void-production-candidate-v1.json`;
- `ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json`;
- `ops/mainnet0/economic-evm-successor-migration-candidate-v1.json`.

It delegates readiness to
`classifyVoidWcVoidCoupledLaunchReadinessV1(...)` and additionally binds the
reviewed coupled launch ID:

`sha256:fe02b5c813adea98f55e8587759df9316f7a8d5f1123114dc851cbad863fdc26`

Nested policy drift is therefore rejected by the canonical classifiers instead
of being reduced to a hand-picked set of top-level booleans.

A source-ready result records the canonical coupled composition ID, but it still
reports activation/funding/presale/market/funds authority false.

## Live activation evidence

Public intake additionally requires a separately authorized live coupled-launch
receipt. No such production receipt is committed by this source lane.

The runtime requires a cryptographically authorized receipt plus three
environment transport bindings.

The receipt must carry an EIP-712 signature recovering to the fixed existing
WC/VOID launch-controller identity:

`0x2f1e0005e865b772b268bd8c797bf3eaa901d97e`

The signed payload binds execution epoch 2, the launch-controller role ID, the
exact coupled launch ID, the exact source composition ID, a 32-byte activation
nonce, a 32-byte activation generation, activation and expiry times, the
content-addressed receipt ID, and every boolean that claims the private Buy
runtime / WC/VOID market / presale were activated in the same ceremony. A
different signer, malformed signature, changed signed field, expired lease,
superseded generation, or future-dated activation time fails closed.

The four environment bindings are:

- `VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_PATH`: exact absolute path to a
  private receipt;
- `VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_SHA256`: exact SHA-256 of those
  receipt bytes;
- `VOID_BUY_COUPLED_LIVE_ACTIVATION_GENERATION`: exact signed launch
  generation; deactivation or a replacement ceremony must advance or remove it;
  and
- `VOID_BUY_COUPLED_LIVE_ACTIVATION_CONFIRM`: exact operator confirmation
  `activate-coupled-public-buy-v1:<generation>:<receipt_id>:<receipt_sha256>`.

The receipt is accepted only when it is a stable, direct, operator-owned private
regular file under no-follow descriptor traversal, with no group/other
permissions and no link aliases. File ownership, SHA-256, and the confirmation
string provide custody/integrity binding; they are not launch authority. The
EIP-712 launch-controller signature is the authority proof.

Its content must be content-addressed and bind:

- marker `VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1`;
- status `COUPLED_PUBLIC_LAUNCH_ACTIVE`;
- the fixed launch-controller signer;
- a unique bytes32 activation nonce;
- the exact active bytes32 activation generation;
- activation and expiry timestamps with a maximum five-minute lease;
- a valid launch-controller EIP-712 signature;
- the exact coupled launch ID;
- the exact current source composition ID;
- private Buy VOID runtime active;
- production WC/VOID market active;
- public presale active;
- the same launch ceremony;
- public Buy request intake explicitly authorized;
- `runtime_or_launch_evidence=true`; and
- `source_ready_only=false`.

A missing path, digest, generation, confirmation, insecure file, changed file,
stale composition ID, expired lease, superseded generation, malformed receipt,
wrong/invalid signature, future-dated activation, or any false launch fact holds
intake closed. The receipt is therefore a renewable activation lease rather than
permanent evidence of a past ceremony. A self-authored JSON fixture with
internally consistent hashes and environment confirmation cannot open production
intake.

The existing final coupled source-promotion lane is deliberately not accepted as
live evidence: that lane explicitly retains
`public_intake_enabled=false`,
`market_activation_authorized=false`, and
`public_presale_activation_authorized=false`.

## Runtime admission

The two public Buy VOID surfaces require both:

`VOID_BUY_REQUESTS_ENABLED=1`

and

`readBuyLaunchGateV1().ready === true`.

Thus the environment toggle alone cannot open intake, source readiness alone
cannot open intake, and live evidence for one side of the coupled opening cannot
open the other side independently. A later shutdown can close intake by removing
or advancing the active generation, and an unattended activation receipt
self-closes when its lease expires.

Ethereum payment verification/finality remains a separate prerequisite; this
gate does not replace the Ethereum finality gate.

## Current state

The checked-in canonical economic candidates remain `HOLD`, and no production
live coupled-activation receipt is installed by this change. Merging this source
therefore does not open Buy VOID intake, activate WC/VOID, or activate the
presale.

## Authority

Source/package/proof only:

- no request-intake activation;
- no runtime/config mutation;
- no service restart;
- no wallet, signer, credential, or private-key access;
- no payment or transaction action;
- no inventory reservation or funding;
- no presale/WC market activation;
- no liquidity, treasury, token, or funds movement.

## Verification

```bash
node scripts/prove_void_wc_void_coupled_launch_readiness_v1.mjs
node scripts/prove_void_buy_coupled_launch_gate_v1.mjs
node scripts/prove_void_buy_coupled_launch_runtime_integration_v1.mjs
```

The focused proof uses only a temporary synthetic EIP-712 signer and live-receipt
fixture. It proves the signature format plus parser/custody/digest/confirmation
behavior, lease expiry, generation supersession, and explicitly proves that a
valid synthetic signature cannot satisfy the fixed production launch-controller
identity. CI never has the production
launch-controller key, cannot mint production activation evidence, and carries
no runtime or economic authority.
