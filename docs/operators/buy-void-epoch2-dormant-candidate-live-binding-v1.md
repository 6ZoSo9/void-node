# Buy VOID Epoch-2 dormant candidate live credential binding v1

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_LIVE_BINDING_V1`.

Status: **source-only live binding runner; live execution remains separately
authorized**.

## Purpose

The existing dormant Epoch-2 payment candidate intentionally keeps installed
credential identity and active signing capability false until live evidence
exists.

This runner is the first gate allowed to promote those two facts. It does not
accept caller-supplied live receipt JSON. Instead, in one root-controlled
operation it executes the exact reviewed authenticated credential live
composition runner, receives that fresh receipt directly, and binds it to the
exact dormant candidate Git object.

## Exact dependencies

- authenticated credential live-composition runner Git blob:
  `28d718eb4155e47dbe8d476a4cf45f2d3871e4db`;
- dormant Epoch-2 candidate Git blob:
  `2c861c021192c034c98404989cd25b26788cd0f0`;
- dormant candidate proof Git blob:
  `0d9eb90c27031b9820a139be2af63c4c07433e20`.

The parent validates a clean exact `main` checkout before obtaining either
Git object.

## Live child

The parent obtains the exact authenticated credential live-composition runner
from Git and executes it as a root Node stdin child using its own explicit live
confirmation token and expected head.

That child in turn:
- performs authenticated credential/V6 qualification before and after;
- executes the exact sealed signer Git object after dropping to UID/GID 1000;
- reads credential material only inside the sealed child;
- performs one domain-separated non-transaction signature;
- returns the public live-composition receipt.

The dormant-candidate binder never accepts an arbitrary receipt file, stdin
receipt, command-line receipt, or environment receipt.

## Bound receipt

Only after the child receipt validates may the result state:

- `systemd_credential_identity_proven=true`;
- `active_signing_capability_proven=true`;
- `runtime_source_generation_bound=true`;
- `authenticated_private_manager_generation_bound=true`.

It deliberately keeps:

- `signer_offchain_control_proven=false`;
- `transaction_signing_proven=false`;
- `customer_safe_to_pay=false`;
- every runtime/payment/presale/WC/funds authority false.

The old dormant candidate JSON remains unchanged. The live binder emits a
content-addressed receipt only; it performs no repository or production file
write.

## Remaining gates

After a GREEN binding receipt:

1. prove launch-operator signer control of the immutable Epoch-2 fulfiller;
2. qualify the live gas/fee envelope and exact chain receipt;
3. run the current one-payment/one-fulfillment canary;
4. obtain coupled presale + WC/VOID Sovereign activation.

## Future separately authorized command

Live execution is sensitive because its child eventually reads the credential
and performs one non-transaction signature.

Only after this PR and the child runner are reviewed/merged and the protected
credential/V6 prerequisites are green:

```bash
repo=/home/zoso/dev/void-node
cd "$repo"

clean_git=(
  env -i
  HOME="$HOME"
  PATH=/usr/bin:/bin
  LANG=C
  LC_ALL=C
  GIT_OPTIONAL_LOCKS=0
  GIT_NO_REPLACE_OBJECTS=1
  GIT_CONFIG_NOSYSTEM=1
  GIT_CONFIG_GLOBAL=/dev/null
  GIT_CONFIG_SYSTEM=/dev/null
  /usr/bin/git
  --no-replace-objects
  -c core.fsmonitor=false
  -c core.hooksPath=/dev/null
)

head="$("${clean_git[@]}" rev-parse --verify HEAD)"
test "$("${clean_git[@]}" branch --show-current)" = main
test -z "$("${clean_git[@]}" status --porcelain=v1 --untracked-files=all)"

binder_path=ops/precision/void_buy_void_epoch2_dormant_candidate_live_binding_v1.mjs
binder_blob="$("${clean_git[@]}" rev-parse "${head}:${binder_path}")"
test "$binder_blob" = e81dd50afe348dd90950b9efe9cde77025c149a9

"${clean_git[@]}" cat-file blob "$binder_blob" |
sudo env -i \
  PATH=/usr/bin:/bin \
  LANG=C \
  LC_ALL=C \
  /usr/bin/node --input-type=module - \
    --run \
    --confirm RUN_EPOCH2_DORMANT_CANDIDATE_LIVE_BINDING_V1 \
    --expected-head "$head"
```

This operation is **not authorized by this PR**.

PROTECT THE CORE.
