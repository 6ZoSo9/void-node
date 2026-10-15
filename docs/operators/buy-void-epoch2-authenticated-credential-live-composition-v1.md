# Buy VOID Epoch-2 authenticated credential live composition v1

Marker: `VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V1`.

Status: **source-only live runner; live execution remains separately authorized**.

## Purpose

This runner closes the provenance gap left intentionally by the V2 source-only
evidence composer.

The V2 helper can verify a sealed public signing record and cross-check a
credential/V6 qualification object, but a pure JSON classifier cannot prove
that the qualification object actually came from the root-authenticated live
collector.

This runner establishes that provenance by invoking the merged live qualifier
itself before and after a fresh sealed signing probe.

## Privileged first-entry boundary

The live runner is not authoritative when executed directly from the mutable
worktree.

Live execution requires the reviewed runner Git object to be streamed to plain
Node on stdin. The runner rejects direct file execution for live mode.

The root runner imports **only Node builtins**. It does not import repository
modules or `node_modules`.

For the credential/V6 qualification it:

1. uses the runtime UID to obtain the exact qualifier bytes from
   `git show <expected-head>:<qualifier-path>`;
2. requires exact qualifier Git blob
   `8dc5d53dfcc52c261a3da0ee692f3a4fcc0bfc4c`;
3. embeds those exact bytes in an isolated Python stdin bootstrap;
4. sets the qualifier's canonical `__file__` path so its existing source-root
   and dependency-blob verification operate unchanged;
5. executes `--run` as root without executing the mutable worktree qualifier
   file itself.

## Sealed signing child

The runner obtains the sealed signer program from the exact expected Git head
and requires Git blob:

`bb58ec88472b724e23aeccf65f44f4582c4a1440`.

It launches that Git-object program only after dropping to UID/GID 1000 with
`setpriv --no-new-privs --clear-groups`.

The root parent never receives private-key bytes. The sealed child:
- reads only the systemd materialized Epoch-2 credential;
- derives the immutable fulfiller;
- performs one domain-separated non-transaction signature;
- locally verifies the signature;
- zeroes credential/private-key/signature buffers;
- returns only the already-reviewed public evidence JSON.

## Stability and composition

The runner performs:

1. authenticated credential/V6 qualification;
2. sealed Git-object signing probe;
3. authenticated credential/V6 qualification again.

The two qualification records must be byte-canonically identical.

The sealed record must agree with the authenticated qualification on:
- MainPID;
- credential ID;
- SHA-256 of the exact authenticated `LoadCredential` binding;
- SHA-256 of the exact expected service cgroup line.

A successful receipt is content-addressed and includes the complete public
sealed evidence, but it does not emit the authenticated credential source path
or private credential material.

## Authority boundary

A GREEN live receipt proves authenticated installed-credential/key-control
composition only.

It remains:
- `production_host_evidence_authority=false`;
- `transaction_constructed=false`;
- `transaction_submitted=false`;
- `transaction_broadcast=false`;
- `rpc_call=false`;
- `payment_acceptance=false`;
- `public_presale_activation=false`;
- `wc_void_market_activation=false`;
- `funds_movement=false`.

The sealed child does access credential contents and private-key material in
memory and performs one non-transaction signature. Therefore live execution is
a separately authorized sensitive operation.

## Future separately authorized live command

Only after the protected credential-query pair and protected V6 query are
installed/qualified, run from the repository root:

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

runner_path=ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v1.mjs
runner_blob="$("${clean_git[@]}" rev-parse "${head}:${runner_path}")"
test "$runner_blob" = 28d718eb4155e47dbe8d476a4cf45f2d3871e4db

"${clean_git[@]}" cat-file blob "$runner_blob" |
sudo env -i \
  PATH=/usr/bin:/bin \
  LANG=C \
  LC_ALL=C \
  /usr/bin/node --input-type=module - \
    --run \
    --confirm RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V1 \
    --expected-head "$head"
```

That operation is **not** authorized by this PR.

Next gate after a GREEN live receipt:

`BIND_AUTHENTICATED_EPOCH2_CREDENTIAL_EVIDENCE_IN_DORMANT_CANDIDATE_SUCCESSOR`.

PROTECT THE CORE.
