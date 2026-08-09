# Buy VOID production private-services foreground operator v1

Marker:

`VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_V1`

Tracks #1128. Builds only an operator entrypoint above merged #1106 and reuses the
canonical production policy resolver from merged #1118.

## Purpose

Turn the already-reviewed production private-services activation coordinator into
an explicit foreground operator process without exposing a direct CLI on either
low-level private Unix-socket service.

The operator does not add signing or transaction-submission authority. It makes
the existing service-start authority usable, reviewable, and lifecycle-bounded.

## Canonical policy

The operator calls `resolveBuyVoidProductionPreflightOperatorPolicyV1()` and uses
its exact `production_policy` unchanged.

It does not parse or accept caller overrides for:

- native execution runtime root or policy;
- fulfillment wallet;
- chain-2050 RPC URL;
- custodian socket path;
- custody-store path;
- broadcaster socket path;
- broadcaster state path;
- credentials directory; or
- expected signer fingerprint.

The reused resolver keeps the native execution runtime disabled and derives the
signer fingerprint from the server-owned fulfillment wallet.

The provider-submission identifier returned by the existing chain-2050 readiness
boundary is accepted only under that boundary's existing sanitized provider-ID
contract. This operator does not invent a narrower provider-ID grammar.

## Dry-run default

Default invocation:

```bash
npx tsx scripts/buy_void_production_private_services_operator_v1.ts
```

Dry run delegates once to merged #1106 with `apply=false` and prints a sanitized
receipt containing the exact production activation-plan ID, policy/path/RPC
fingerprints, and the independent confirmation strings required for apply.

Dry run performs zero RPC probes, zero service starts, zero credential reads,
zero signing, zero submission/broadcast, and zero money movement.

Dry-run calls also reject activation confirmation/plan arguments instead of silently
ignoring them. The five apply-only authority inputs are accepted only when
`apply=true`; the CLI likewise rejects those flags unless `--apply` is present.

Raw private paths, the wallet address, RPC URL, credentials, private key material,
and in-process service handles are never serialized by the operator receipt.

## Explicit apply

Applied activation requires all existing #1106 authority echoes:

```text
--apply
--confirm buyVoidStartProductionPrivateServicesV1
--expected-plan-id-sha256 <exact dry-run plan ID>
--rpc-readiness-confirm buyVoidProbeProductionChain2050RpcReadinessV1
--custodian-confirm buyVoidStartPreparedTransactionCustodianCredentialServiceV1
--broadcaster-confirm buyVoidStartPreparedTransactionBroadcasterSubmissionV1
```

Those values are forwarded to the reviewed #1106 coordinator. They are not
synthesized, inferred, normalized into weaker authority, or replaced by one
combined confirmation.

The real transaction-submission confirmation
`buyVoidSubmitPreparedTransactionFromOpaqueCustodyV1` is not part of this CLI.

A successful apply may perform the existing read-only chain-2050 readiness probe
and may create/listen on the reviewed private Unix sockets. Startup still reports
and requires:

```text
credential_read_performed=false
signing_performed=false
submit_once_performed=false
transaction_broadcast_performed=false
money_movement_performed=false
```

## Signal capture before activation

In apply mode, the CLI installs its one-shot SIGINT/SIGTERM latch **before** it
calls the activation operator.

This closes the startup signal window where a termination request could otherwise
arrive after a private socket was started but before shutdown handlers existed.
If a signal arrives while #1106 is still completing its bounded activation, the
signal is retained. A successful start is then shut down immediately through the
normal foreground session path.

Dry-run mode installs no signal latch. Held/planned outcomes remove any apply-mode
handlers before returning.

## Foreground ownership

A successful start returns two in-process `stop()` handles from #1106. The CLI
never serializes them. Instead, the CLI becomes their foreground owner and stays
running until the latched SIGINT or SIGTERM is consumed.

On the first shutdown request it:

1. attempts broadcaster stop exactly once;
2. then attempts custodian stop exactly once; and
3. prints a sanitized shutdown receipt.

The custodian stop is attempted even if broadcaster stop fails. A stop failure is
reported as `cleanup_failed`; it is never relabeled as a clean stop.

Repeated shutdown calls against the same operator session reuse the first shutdown
operation and do not stop either service twice. The duplicate receipt is marked
`duplicate_shutdown=true` and retains the original shutdown trigger.

The operator does not daemonize itself, does not background either service, and
does not automatically restart or retry activation.

## Held / residual service state

The #1106 coordinator already attempts rollback for partial activation. If it
returns held while conservatively reporting a custodian or broadcaster as still
active after return, the operator preserves that truth in:

```text
residual_service_state=true
custodian_service_active_after_return=<bool>
broadcaster_service_active_after_return=<bool>
```

It does not claim that rollback was clean and does not invent a second automatic
cleanup retry when #1106 returned a normal held result without service handles.

If the coordinator itself throws rather than returning its normal bounded
result, the operator reports `side_effect_state_known=false` instead of claiming
that no startup side effect occurred. Unknown side-effect state is always treated
as residual service risk.

A returned `held` decision is trusted only when its exact #1106 marker, version,
status, applied state, authority object, plan binding, typed lifecycle fields, and
zero credential/sign/submit/broadcast/money flags all validate. A malformed held
result is a boundary failure. If it unexpectedly carries service handles, cleanup
is attempted in broadcaster-then-custodian order, but the receipt remains
conservative with `side_effect_state_known=false`.

The wrapper does not introduce a second provider-submission-ID parser. Successful
provider IDs remain owned and sanitized by the reviewed chain-2050/#1106 stack;
this operator only requires the already-reviewed successful value to be non-empty.

## Unexpected started-result cleanup

A separate case exists when #1106 reports `ok=true`, `status=started`, and returns
service handles, but the result contradicts the reviewed started boundary—for
example a mutation/signing/broadcast flag is wrong, a binding is wrong, or the
provider ID is malformed.

Because those returned handles are available to this wrapper, the operator does
not simply discard them. It attempts bounded cleanup in the same safe order:

1. broadcaster stop once;
2. custodian stop once.

Successful cleanup clears the corresponding residual-service flag. Failed or
missing cleanup keeps that service conservatively active in the held receipt.
There is no automatic retry.

## Closed CLI surface

Accepted options are only:

- `--apply`;
- `--confirm`;
- `--expected-plan-id-sha256`;
- `--rpc-readiness-confirm`;
- `--custodian-confirm`;
- `--broadcaster-confirm`; and
- `--help`.

There is no wallet/RPC/runtime-root/signer/credential/private-path override and
no transaction submission flag.

CLI parse/argument failures occur before activation invocation and are reported as
known zero-side-effect failures (`side_effect_state_known=true`,
`residual_service_state=false`). Errors after activation invocation remain
conservative (`side_effect_state_known=false`, `residual_service_state=true`).

## Proof

Focused proof:

```bash
npx --no-install tsx scripts/prove_buy_void_production_private_services_operator_v1.ts
```

Expected marker:

```text
VOID_BUY_VOID_PRODUCTION_PRIVATE_SERVICES_OPERATOR_V1_PROOF_GREEN
```

The focused proof covers canonical-policy reuse, dry-run I/O exclusion, exact
confirmation forwarding, sanitized receipts, shutdown order, duplicate shutdown,
cleanup failure, unknown-side-effect residual handling, unexpected-start cleanup,
provider-ID contract alignment, and signal-latch-before-activation source order.

The focused workflow also preserves the merged #1106 activation proof, #1118
policy/preflight operator proof, production RPC readiness, custodian credential
activation, broadcaster submission activation, repository typecheck/build, and
committed-range diff hygiene on Node.js 22, 24, and 26.

## Authority boundary

This source lane performs no production operation merely by being published,
reviewed, or merged.

A future real `--apply` is a separate operational authorization to run the
read-only RPC readiness check and start the private custodian/broadcaster service
capabilities. It still does not authorize a credential read, transaction signing,
`submit_once`, `eth_sendRawTransaction`, inventory mutation, public fulfilled
closeout, Work Credit/validator mutation, or fund movement.

Real preparation/signing and real transaction submission remain later independent
value-bearing authorization gates.

Refs #1128, #1106, #1118, #1104, #1102, #1100.
