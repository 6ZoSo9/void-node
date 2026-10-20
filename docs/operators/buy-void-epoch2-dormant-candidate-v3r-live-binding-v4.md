# Buy VOID Epoch-2 dormant candidate V3R live binding V4 — dynamic current-source successor

Marker: `VOID_BUY_VOID_EPOCH2_DORMANT_CANDIDATE_V3R_LIVE_BINDING_V4`.

Status: **source/test/CI only**. This Draft does not install the binder, execute the
live binding, read credentials, sign transactions, accept payments, activate the
presale or WC/VOID market, mutate services, or move funds.

## Why V4 exists

The historical V3 source lane compile-bound:

- source HEAD `0ada7fde0d90c3946b10693f4621cbd690bfcde6`;
- source tree `9e930fba9aacfafb5b163767302786cd7f31c81e`;
- historical installed-generation compatibility V3 from PR #3535.

That shape self-invalidates when canonical `main` advances. It also ties current
source authority to a historical compatibility program that is intentionally absent
from the current-main #3546 integration.

V4 removes all compile-time current-source HEAD/tree authority and does not depend on
the historical #3535 compatibility V3 source.

## Runtime/current-source split

Runtime policy authority remains anchored to:

```text
runtime_head=4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb
runtime_tree=de12c9d2d5e475d435d21da3b047d7b63b69e2b7
runner_v4_sha256=c5976f6b96a5c29807fb188d0ede4f0fe812512f199a083272df2e1a7acb4953
```

The **policy SHA-256 is not a source constant** in V4. #3546 derives the final policy
from the protected host's exact Node executable identity plus runtime head and Runner V4
identity. The existing V3 native first-entry authenticates that installed policy before
dispatching Runner V4, and the child receipt must report `native_preentry_policy_bound=true`.
The Binder therefore records policy authority through the authenticated child rather than
reusing the predecessor policy hash.

Current source is observed at live execution from the canonical checkout. The binder
requires:

1. canonical Git dir/worktree pinning;
2. `main` branch;
3. exact tracked checkout state without enumerating or granting authority to untracked paths;
4. bounded raw `cat-file -t/-p` commit-parent traversal from current source HEAD to
   the runtime head;
5. no revision-walk/graft metadata as ancestry authority;
6. exact runtime/current equality for the complete nine-entry runtime-sensitive
   credential dependency set already accepted by #3546;
7. the exact dormant candidate V4 Git object at the observed current source HEAD;
8. terminal source HEAD/tree/branch/tracked-state revalidation.

The complete runtime-sensitive set is:

- installed credential qualifier V3R;
- protected qualifier replacement V3R;
- V6 live qualifier;
- V6 protected replacement;
- credential-query ELF lock V3R;
- credential-query ELF lock V2;
- V6 query ELF lock;
- allocation-custody host-evidence parser V4;
- sealed credential attestation V2.

## Sensitive sequence

Native Preentry V4 remains the first live entry. It binds:

- its own installed generation;
- the exact Binder V4 Git blob, SHA-256 and byte count;
- fixed root-custodied `/usr/bin/node`;
- the existing V3 runtime policy and runtime head;
- a private parent/child generation proof carrying both requested source and runtime heads.

Binder V4 then:

1. proves current source compatibility;
2. requires the caller-provided source head to equal the observed canonical source head;
3. authenticates the exact dormant candidate V4 Git object from that source generation;
4. executes the existing fixed V3 native first-entry path with the runtime policy head only;
5. requires that native path to dispatch the post-#3546 Runner V4 generation and validates a
   `voide2livecomp4_...` receipt;
6. cross-checks the child Runner V4 receipt's observed current-source HEAD/tree against
   the Binder's pre-sensitive source snapshot;
7. repeats the complete current-source compatibility proof;
8. requires the pre/post source snapshots to be identical;
9. revalidates the native parent proof;
10. emits a V4 candidate-binding receipt.

The installed native/Runner V4 receipt is runtime evidence. Current-source compatibility is
a separate proof, and the two are cross-bound by the child's observed source HEAD/tree.
A Runner V3 receipt is rejected. The Binder does not restate historical V6R2/predecessor
generation claims that Runner V4 does not expose. V4 does not revive or reinterpret
historical compatibility V3 output.

## Exact source identities

```text
binder_git_blob=6159eb6f79c0dfccafd31484415b92eefaa06662
binder_sha256=f1b6cd8235641cc51bbf682526774abadf814da2066e0e6b7035ca9d58277cd2
binder_bytes=50894
native_preentry_git_blob=cdd647e8ef49f234eea1e5fbd933148a31014eef
dormant_candidate_git_blob=e569c9211e01f14c7c00dd1c5041d4dfb0817609
runtime_dependency_count=9
```

These identities are source-candidate identities only. No protected installation or
host execution authority follows from them.

## Negative authority

Always false in this source lane:

```text
host_execution=false
protected_filesystem_mutation=false
canonical_checkout_mutation=false
installed_policy_mutation=false
service_mutation=false
systemd_mutation=false
credential_access=false
private_key_access=false
wallet_or_signer_access=false
signing=false
transaction=false
transaction_broadcast=false
payment_acceptance=false
customer_safe_to_pay=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

## Next gate

After exact-head source CI and independent review, derive a content-addressed
Binder V4 native-preentry candidate lock/install/qualification lifecycle. Installation
and any live execution remain separate authorization boundaries.

PROTECT THE CORE.


## Retained privileged first-execution repair (source-only)

The original Binder V4 authenticated only the executable leaf before
reopening `/usr/bin/setpriv` and the fixed native child by path as root.
This check-to-first-exec window could select a different object after the
metadata check on an unsafe host. The repaired V4 source now:

- retains exact Git, setpriv and native executable file descriptors through
  the entire sensitive source-before/child/source-after sequence;
- qualifies root-owned, non-symlink, non-writable directories at every
  ancestor; checks executable leaf metadata/identity including timestamps;
  checks effective runtime UID 1000 writability under a dropped child;
- first-executes setpriv and native only through inherited
  `/proc/self/fd/<number>` handles with fd3+ stdio remapping, denying
  closed-standard-fd aliases rather than silently reopening;
- revalidates retained and visible file generations immediately before and
  after each launch, and again before emitting a receipt;
- exercises actual harmless unprivileged Git procfd execution, unsafe
  `/tmp` ancestor rejection and a substituted visible executable-path
  negative, under a source-only hosted self-test.

This does **not** qualify the root-installed binder, native preentry, runtime
Python/Git dynamic dependency closure, post-`fexecve` process isolation or
credential signing. The exact source rebind supersedes predecessor binary
identities; a new native ELF candidate/lock and separate independent review
must precede any installation. Host/transaction/payment/presale authority
remains explicitly false.

PROTECT THE CORE.
