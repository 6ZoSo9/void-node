# Authenticated paid-work production activation live canary scope v1

This is the final source-readiness artifact.

Artifact: `ops/mainnet0/authenticated-paid-work-production-activation-live-canary-scope-v1.json`

Artifact SHA-256: `4d2a253d43334b5b0c2053007e0135a9467a1f58c0841d79778caf58ffc68f8e`

Reference ID: `voidapwlcs1_d7de055750dc99faedf51d2a62c94e2dad055be5c2660d439c14ec5527dc03bb`

## Readiness effect

This closes `live_canary_scope`. The source-readiness blocker count becomes zero, but activation remains operationally **HOLD** pending private preflight, a canonical execution plan and digest, and ZoSo's fresh operation-bound confirmation.

## Exact future canary

The future canary permits one systemd-user oneshot start, one owner-private dry-run command with `apply=false`, and zero retries. Public or customer work, external HTTP, quote acceptance, payment, dispatch, Work Credits, wallet/signer access, signing, transaction broadcast, settlement, and fund movement are forbidden.

Success requires exit status 0, terminal `inactive/dead`, an owner-private empty activation root, no replay pointer/generation/staging/lock, no listener or ingress, and one non-secret receipt. Operational HOLD remains after the canary pending separate paid-work authorization.

Any failed or ambiguous preflight aborts before mutation. Any later failure enters the reviewed rollback plan. A second start, automatic retry, and automatic reactivation are forbidden.

## Source binding

The artifact binds eight reviewed dependencies at `b32a13792bb4d94fb0da52c175930e9ccf03d631`, including the merged activation-execution confirmation protocol.

## Authority boundary

This publication creates source text only. It does not materialize a plan or lease, issue or verify a live confirmation, write configuration, create persistence, write service files, reload systemd, start a service, read credentials, deploy, activate, accept a quote, execute payment, dispatch work, write Work Credits, access wallets/signers, sign, settle, broadcast a transaction, or move funds.


## Preservation-first recomposition

The original local candidate commit `0b45585b7ba11bd35403b5298bc6247bd5e5589c` remains untouched.

This successor source is recomposed on current `main` `b32a13792bb4d94fb0da52c175930e9ccf03d631` and
refreshes every dependency by path, source commit, Git blob SHA-1, and SHA-256.

The activation-execution confirmation dependency now binds the merged
dynamic-main repair:

- merge: `b32a13792bb4d94fb0da52c175930e9ccf03d631`
- artifact SHA-256: `e2f6cecc52047931ce78445ef00c8eeba990a7f552a9b20efc93d6638f5809f6`

The future execution `main` is not statically pinned by this source artifact.
A future execution plan must capture `origin/main` after all read-only
preflight gates, bind that commit into the canonical plan digest and ZoSo's
fresh confirmation, and revalidate it immediately before the first mutation.

Source-readiness completion is not activation authority. Publication does not
execute the canary, read a credential, materialize an Authorization header,
perform an authenticated POST, execute payment, dispatch work, write Work
Credits, access a wallet or signer, deploy, activate, or move funds.
