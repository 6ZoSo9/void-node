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
binder_git_blob=5c3f2f8f6d49e67017ad30e6c61bd8af6a11a3ab
binder_sha256=a66dfc54a7cbaed0257119fb5f6ee0d4cd094c31ad0407358219601f466fcf11
binder_bytes=52936
native_preentry_git_blob=87a2efeb8ba5ef3d07d79f665931d5ece9976f78
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

## Original configured executable pathname custody — P1 repair

The predecessor retained trusted executable FDs but called
`fs.realpathSync(file)` **before** checking the original configured path's
ancestry. This allowed a symlink inside a runtime-UID-writable ancestor to
redirect the configured name to a different root-owned ELF. The subsequent
root/ACL checks saw only the redirected target's safe ancestry.

The repaired source requires an absolute, lexically normalized canonical
configured path and checks every **configured** root-owned/nonwritable
ancestor and original leaf with `lstat` before calling realpath. The leaf
must be a regular non-symlink; the actual realpath must equal the configured
name exactly. That original canonical path is again checked on every
retained-FD revalidation before privileged first exec. There is no fallback
to an externally chosen executable path.

Source-only self-tests reject a noncanonical `/usr/bin/../bin/git` alias
and, where the host is usrmerge, the `/bin/git` symlinked-ancestor alias.
The positive fixture still first-executes the retained benign Git executable
without entering production native/credential/signing paths.

```text
source_parent_pr=3613
source_parent_head=f956e8268f7528a1b3729c25869d16bce9c2fb62
binder_git_blob=5c3f2f8f6d49e67017ad30e6c61bd8af6a11a3ab
binder_sha256=a66dfc54a7cbaed0257119fb5f6ee0d4cd094c31ad0407358219601f466fcf11
binder_bytes=52936
native_preentry_git_blob=87a2efeb8ba5ef3d07d79f665931d5ece9976f78
protected_install_authorized=false
host_plan_authorized=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

**Required:** exact-head CI and independent security review, then regenerate
all native candidate/lock/policy identities and complete host qualification.
Do not treat this source proof as a production credential or payment authority.
PROTECT THE CORE.


## Accepted native V6R2 ELF bytes at retained root first-exec — P1 repair

This source-only successor closes a **distinct, more serious** trust gap
left after the pathname/symlink TOCTOU fix: root-owned executable
metadata and a stable retained FD can describe an unexpected native
program. The binder cannot run such a replacement as root simply because
its inode, ancestor permissions and timestamps are plausible.

Before any privileged first execution of the fixed
`/opt/void-buy-void-epoch2-live-composition-v3/void_buy_void_epoch2_live_composition_native_preentry_v3`,
the binder now authenticates the **retained native descriptor's bytes**,
both at root-tool opening and immediately before the live native child
spawn. The accepted identity is independently source-bound to tracked
`ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v6r2.json`
(Git blob `bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b`), with accepted
static ELF SHA-256, exact byte count, x86-64 ELF64 little-endian ET_EXEC
shape and **no PT_INTERP/PT_DYNAMIC**. The digest reader uses bounded,
positional reads from the exact original FD, no pathname reopen, followed
by terminal FD and visible-source generation revalidation. An unrelated
root-owned ELF, shebang script, interpreter-bearing executable, wrong
size or wrong digest must HOLD before root child execution.

```text
parent_pr=3614
parent_head=c6e0024a1e4b29d42e74a23adca8e4d64e03d152
native_accepted_lock_id=voidbuye2nativecandlock6r2_ab95f15c8f2731adf6bfd97dfd5467495c90bdb5ee267948efc6a522be74b417
native_accepted_lock_git_blob=bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b
native_accepted_elf_sha256=85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8
native_accepted_elf_bytes=726976
repaired_binder_git_blob=fec8dcf902e15aa4d121ac6561bd00cc0eb503ac
repaired_binder_sha256=bb7fa509f25037fe7d8ed164edb90c8f8acf55120cc36809d5a32b94ab2ad8a8
repaired_binder_bytes=58859
repaired_binder_native_preentry_c_blob=370ba9a37b1e1d31d4f3aac5de6e173e5bde0941
HOST_PRODUCTION_NATIVE_EXECUTION=false
protected_install_authorized=false
live_execution_authorized=false
credential_access=false
private_key_access=false
signing=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

The disposable fixture constructs a **non-executed fake static ELF** in
a new private directory and checks positive digest/ELF acceptance plus
wrong digest, wrong bytes, PT_INTERP and fake script rejection. It does
not invoke the installed native child, wallets, signers or credentials.
The accepted V6R2 lock also has `protected_install_authorized=false` and
`live_execution_authorized=false`; these remain false. This is *not*
permission to run the native code on Precision or enable intake.

**HOLD:** source proof and exact-head CI, genuinely independent review,
reproducible runtime/loader and external host installed-generation evidence,
root/ACL/source-first-entry custody and separately authorized future
payment/presale canaries remain mandatory. No production host action follows.

PROTECT THE CORE.
