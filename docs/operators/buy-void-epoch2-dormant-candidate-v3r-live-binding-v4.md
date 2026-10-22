# Buy VOID Epoch-2 dormant candidate V3R live binding V4 — dynamic current-source successor


## Current source-only installed-Binder receipt integrity successor — October 20

**This section supersedes historical Binder source/size/preentry pins below.**

The native parent still authenticates an exact, sealed Binder JavaScript
snapshot **before root fork** and streams only the sealed source to Node.
That proves which program executes, but the previous Node terminal check
only compared the installed Binder by `dev,ino,uid,gid,mode,nlink,size`,
not file bytes or `mtimeNs/ctimeNs`. A privileged same-inode and same-size
in-place change *after stage* could pass the old final receipt check.
This is **evidence freshness**, not an unsealed-code execution bypass.

The reviewed descendant requires the private, root native-parent proof to
carry its own **compile-bound accepted Binder SHA-256 and byte count**.
Every `revalidateBinderPreentry()`, including the check immediately before
constructing the binding receipt, performs a positional retained-FD read,
requires the expected exact length and EOF, computes SHA-256 over those
bytes, and matches the native parent's digest. It checks the retained FD
against the visible installed pathname and requires the **same**
dev/inode/UID/GID/mode/link count/size/**mtimeNs/ctimeNs** before and
after reading, failing closed on any mismatch.

An actual nonprivileged disposable Node test writes a 4096-byte file,
authenticates it, overwrites the **same inode with a different 4096 bytes**,
and requires terminal revalidation to reject. A second test replaces the
visible pathname and requires HOLD against the originally retained FD.
No fixture accesses the protected installation directory or credentials.

```text
parent_pr=3640
parent_head=d44a2a57abf80d41eac605cbe8518f0dc7b673b7
binder_js_blob=d2d648b144d3b406ff845a597fa4b9f54167b6bc
binder_js_sha256=c447151d7bc4d1b3ffc5e9c8d58b92e8f041e3aa6c0c5747d6da621471e28207
binder_js_bytes=66650
native_preentry_c_blob=e5920575541001bff00abf894f0d62869d8f2452
binder_source_proof_blob=63c7a41d6e6e40e109fb5baaba5539754d0d87b2
installed_binder_terminal_fd_digest_checked=true
native_policy_exact_physical_bytes_canonical=true
native_policy_embedded_nul_blank_suffix_leading_zero_rejected=true
privileged_live_execution=false
credential_access=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

The native policy reader now treats the policy as one exact bounded physical
byte sequence rather than a NUL-terminated token stream. It requires exactly
six nonempty visible-ASCII lines in fixed order, exactly one final LF, fixed
lowercase-hex widths, and canonical positive decimal byte counts without
leading zeros. Embedded NUL/CR/control bytes, blank or extra lines, hidden
suffixes, a missing final LF, and leading-zero decimal aliases are rejected by
the same `parse_policy_bytes()` routine used by production. The compiled
unprivileged C `--self-test` exercises that exact parser with a canonical
positive and malformed physical-byte negatives before emitting GREEN.

This changes the **native preentry source** and therefore invalidates the
prior compiled preentry ELF generation; a new content-addressed
preentry executable and root-custodied installed-generation proof are
mandatory. The accepted V6R2 **native child** ELF lock is separate and
unchanged. Source-only CI is not installed source, host first-entry,
Node/Git loader closure, postexec isolation or independent security review.

Terminal digest + metadata is a **point-in-time** installed-file
observation; without an authorized exclusive writer lease it cannot promise
that an independently privileged actor never writes immediately after
that observation. No stronger continuously-current or production-ready
receipt claim is made.

**HOLD:** Draft/unmerged. No protected host `--run`, installation,
service changes, private keys, wallet, signing, RPC, transaction/payment,
public presale/WC activation, treasury/liquidity or funds movement.
The temporary self-test cleanup now closes its own descriptor and removes
only its own disposable file/directory; no raw empty catches remain. This
refinement changes the exact accepted source and C/native proof bytes, so
only the above current-generation pins are valid. Repo-wide tracked-empty-
catch CI must be evaluated on the newly pinned exact head.

Tor renewal is managed in the other chat.

PROTECT THE CORE.



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
binder_git_blob=42daad33b05f054d57486ada174b82e18e4ed115
binder_sha256=39679b4b025a29f735af544b9cec49d4b060113ef03f2a5a5ee1b0bbbf5c716a
binder_bytes=56856
native_preentry_git_blob=7e551be76ed5c774978558def29e91f15bfd8cd1
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
binder_git_blob=42daad33b05f054d57486ada174b82e18e4ed115
binder_sha256=39679b4b025a29f735af544b9cec49d4b060113ef03f2a5a5ee1b0bbbf5c716a
binder_bytes=56856
native_preentry_git_blob=7e551be76ed5c774978558def29e91f15bfd8cd1
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

## Accepted native retained-FD first-exec — P1 source-only repair

Parent #3614 prevented configured-path symlink redirection but could still
execute a substituted root-owned native ELF. This child authenticates the
already-open native FD before every privileged native first execution.

The source-exact native V6R2 repository candidate lock
`voidbuye2nativecandlock6r2_ab95f15c8f2731adf6bfd97dfd5467495c90bdb5ee267948efc6a522be74b417`
(Git blob `bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b`) pins
SHA-256 `85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8`
and exactly 726,976 bytes. The binder reads these bytes from the **retained
file descriptor**, checks inode/custody again after hashing, and rejects an
invalid ELF64 LE x86-64 ET_EXEC, script, wrong program headers, PT_INTERP or
PT_DYNAMIC. A disposable negative test opens a different root-owned Git ELF
as the native candidate and requires rejection before first exec.

**Installed identity remains unproven.** If Precision has a different actual
binary generation, this check intentionally HOLDs until a separately accepted
current lock is reviewed and the full binder/C/preentry hashes are reissued.
A source test is not permission to invoke installed root services, credentials,
wallets, signing, RPC, payments, public presale/WC or treasury/funds operations.

PROTECT THE CORE.

## Privileged root-child ELF parser adversarial evidence — current Draft successor

This **supersedes only the historical binder source identity in the preceding
section**, without changing the accepted V6R2 native child lock or any
production release authority.

The prior negative self-test treated `/usr/bin/git` as a fake native ELF:
its actual size usually failed the fixed 726,976-byte V6R2 gate, leaving the
SHA-256, ELF header, program-header, PT_INTERP, PT_DYNAMIC, PT_LOAD bounds,
short-read and retained descriptor generation checks **untested**.

In this source-only successor, `verifyRetainedNativeElfBytes()` contains the
existing retained-FD byte SHA-256 check and full native ELF parser. The
privileged wrapper `requirePinnedNativeExecutionClosure()` still passes
**only** the immutable accepted V6R2 SHA-256 and 726,976-byte count.
No runtime caller receives a parameter allowing arbitrary ELF acceptance.

An unprivileged `--self-test` creates a unique 0600 disposable, synthetic
120-byte static ELF64/ET_EXEC buffer. It does **not execute these bytes**.
The positive case confirms digest/header/program-header acceptance. Recomputed
digest **negative** cases independently reach forbidden PT_INTERP, PT_DYNAMIC,
missing PT_LOAD, malformed PT header, invalid PT_LOAD segment bounds, and a
non-ELF script header. Same-size different content must fail SHA-256. An
isolated positional read fault and simulated in-place generation drift must
hold before producing a trusted child receipt. The fixture uses only its
private temporary leaf, restores any patched `fs.readSync`, and performs
create-only bounded cleanup.

Current source-generation binding:

```text
parent_pr=3625
parent_head=e4950e1351ea82a8a16e24dacdcd08b193f5d6ea
binder_git_blob=0577da295cc86fd03a4d02fcedc3e8f8ad2e3546
binder_sha256=8da01f816940b2ed1328fab4e9a1f198ccb42cfb6678a3d3d01f1e955473462e
binder_bytes=61268
binder_native_preentry_git_blob=53903d0cde07de302848fb67d9c23928cec96f20
binder_proof_git_blob=d639588b9fade6ea46941e6ddeae21917d18550b
native_lock_v6r2_git_blob=bc3cb6d7843447ed1f0f769c2d298bb76dac8b1b
native_accepted_elf_sha256=85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8
native_accepted_elf_bytes=726976
production_host_execution=false
protected_install_authorized=false
credential_access=false
signing=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

This is a **source CI contract**, not proof that the installed native/Node
generation on Precision matches the pinned ELF or that customer payments are
safe. Distinct independent security review, protected host installation and
qualification, verified runtime closure and operation-specific payment/custody
canary remain mandatory. No source merge, protected host access or financial
activation follows from this proof.

PROTECT THE CORE.


## Source proof optimized-code-object denial — defensive successor

The ELF-parser fixture above has complete source-only native tests, but its
Python verifier relies on **assert** for Git/SHA-256/lock identity and
subprocess-result acceptance. Running a verification script with `-O` or
`-OO` strips those conditions. Independently compiled code objects created
with `compile(..., optimize=1/2)` can remove them even if the enclosing
`python3 -I -B -S` interpreter's `sys.flags.optimize` is zero. A printed
`PROOF_GREEN` must never bypass the assertions it claims to have checked.

The verified Python source in this successor begins immediately after its shebang with a built-in `sys` import and
**pre-stdlib fail-closed** checks: reject nonzero `sys.flags.optimize`,
`not __debug__`, or missing `-I -B -S` isolation/no-bytecode/no-site.
The optimized cases exit 2, produce **no stdout**, and print exactly
`HOLD=optimized_python_forbidden` on stderr before attempting Git, Node,
binder, compiler or native actions.

The source-only CI invokes the proof through `python3 -I -B -S` and
requires two genuine optimized-process negatives (`-O`, `-OO`) plus
two optimized-code-object negatives (compile levels 1 and 2 inside an
unoptimized `-I -B -S` process). All four must fail closed before the
normal proof may emit its success marker. The incumbent Binder JS/native
preentry C bytes, accepted V6R2 lock and nine runtime/source dependency
pins remain **unchanged**.

```text
parent_pr=3631
parent_head=268680e4e00d7adfed4695a3051ddb437510262a
binder_git_blob=0577da295cc86fd03a4d02fcedc3e8f8ad2e3546
native_preentry_c_git_blob=53903d0cde07de302848fb67d9c23928cec96f20
optimized_proof_git_blob=764a6ec4357cf3b69f14cb377e78acd1c5b93b52
optimized_process_negative_fixtures=2
optimized_code_object_negative_fixtures=2
protected_install_authorized=false
live_execution_authorized=false
credential_access=false
signing=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

This change qualifies only an **unoptimized source-proof entry** and its
synthetic regressions. It does not independently authenticate Python
interpreter startup, dynamic libraries/import hooks, the installed root
executable, current host signer or wallet, or the production presale.
A genuinely distinct security reviewer, host-specific installation and
operator authorization remain mandatory. Never promote the dormant candidate
or enable live payments from a source-proof transcript.

PROTECT THE CORE.



### P1 pre-guard import repair — current exact source generation

Automated review at the prior Draft head found an additional first-instruction
bypass: even `from __future__ import annotations` can load an
attacker-controlled sibling `__future__.py` when `-I` is missing,
**before** the Python proof's built-in `sys` flags guard. In an isolated
disposable reproduction, that sibling module printed an attacker marker
before the intended HOLD.

The proof did not need postponed annotations. The current verifier therefore
**removes the entire future import** and checks the built-in `sys` entry
flags and code-object `__debug__` immediately after the shebang.
It also tests a copied verifier in a unique disposable directory containing
a deliberately hostile `__future__.py`: invoking without `-I`
(`-B -S`) must exit 2 with empty stdout and only the exact stderr
`HOLD=isolated_python_proof_required`. No sibling import marker may print.
The existing two `-O/-OO` and two optimized-code-object negatives remain.

```text
current_proof_git_blob=764a6ec4357cf3b69f14cb377e78acd1c5b93b52
previous_proof_git_blob=ddb8c20714be8d6feee7eaf0f148fb1fd744491b
pre_guard_future_import_poison_rejected=true
isolated_no_site_python_proof_entry_required=true
HOST_EXECUTION_AUTHORITY=false
private_key_access=false
signing=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

The prior CI result belongs **only** to the preceding verifier blob and does
not qualify this modified source. Fresh exact-head CI and independent P1
security review are mandatory. Source guards still cannot authenticate the
Python interpreter's own startup or any real installed privileged native.

PROTECT THE CORE.



## CURRENT CHILD SOURCE — independent ELF PT_LOAD extent tests (October 20, 2026)

This source-only descendant of the hardened/optimizer-safe [#3633](https://github.com/6ZoSo9/void-node/pull/3633)
closes the outstanding P1 **parser-fixture coverage** finding on the
historical [#3631](https://github.com/6ZoSo9/void-node/pull/3631).
The previous single negative had `p_filesz=200` and `p_memsz=0`:
the validator's `p_memsz < p_filesz || p_offset+p_filesz > expectedBytes`
short-circuited on its memory-size branch, leaving the separate
file-extent branch untested.

The disposable **nonexecuted**, 0600 synthetic ELF fixture now verifies
both subconditions independently:

- Memory-size violation **only:** `p_filesz=1`, `p_memsz=0`, `p_offset=0`,
  with the segment completely inside the fixture file.
- File-extent violation **only:** `p_filesz=200`, `p_memsz=200`,
  `p_offset=0`; the memory-size condition is false.
- Offset-plus-file violation **only:** `p_offset=110`, `p_filesz=20`,
  `p_memsz=20`; the segment start is inside the file but its end is not.

Every case must fail inside the **real** retained-FD native ELF parser
with `trusted_native_load_segment_bounds_invalid`. Removing either
production branch makes its dedicated regression fail. The existing
positive ELF and independent malformed-header, PT_INTERP, PT_DYNAMIC,
missing PT_LOAD, digest, partial read and generation-drift cases remain.

```text
parent_pr=3633
parent_head=8a58301048437f6406349665dcd6c48287fce53a
binder_git_blob=be4a40954e5541168ab3403ad5b9b74207dc5ddd
binder_sha256=31309bffffc09dbb7ced849feb61f3b61c5226f6ec66cdcdba3e315bc08cedbd
binder_bytes=62308
native_preentry_c_git_blob=417195505fff1157e401a7e7b6262609fcfca5bf
binder_source_proof_git_blob=23e195dbe80d8fbdb5edd1a6b974f3f6e476fe3c
native_accepted_elf_sha256=85f9b772e27e1e74199188c838ca107c91cdbc6e08ac20c47e8988c258073de8
native_accepted_elf_bytes=726976
optimized_python_negative_fixtures=2
optimized_code_object_negative_fixtures=2
pre_guard_future_import_poison_rejected=true
ptload_independent_negative_fixtures=3
private_key_access=false
signing=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

This tests exact code paths in a **disposable unprivileged synthetic ELF**,
not a production native executable. None of these source-check results
authorize root native first entry, protected filesystem installation,
real signer/credential access, customer payment, presale/WC activation
or funds movement. Full exact-head CI and genuinely independent P1
security review are required. The fixed accepted V6R2 ELF/lock remains
unchanged. Tor renewal is managed separately.

PROTECT THE CORE.


## CURRENT SOURCE-ONLY DESCENDANT — freeze accepted binder JS before root Node fork

The native parent previously read and hashed the retained root-owned Binder
script, then forked root Node and streamed **the original mutable file
descriptor** to its stdin pipe. An in-place privileged writer could change
the same inode without altering dev/ino/mode/uid/gid/nlink/size between
the verification and later source-stream pass. A correct SHA of the
**earlier** file contents therefore did not prove the bytes ultimately
interpreted by root Node.

This descendant stages exactly `BINDER_BYTES=62308` from the trusted root
Binder descriptor into a private `memfd_create(MFD_ALLOW_SEALING)` **before
fork**. It requires exact length and accepted Binder SHA-256 of the
**staged bytes**, adds all four irrevocable write/grow/shrink/seal flags,
verifies the seals and staged digest again, and checks the original
installed generation including mtime/ctime before child creation. Only
the fully verified sealed memfd is released through the existing
source pipe to the existing root Node `--input-type=module -` entrypoint;
the original file descriptor is never used as the source byte stream.
The parent streams **exactly** BINDER_BYTES, not arbitrary new EOF data.
It retains the existing parent proof, file-identity bindings, Node ELF
policy, root custody, pipe cleanup and negative economic authority.

The disposable unprivileged C `--self-test` uses a temporary six-byte
source file; it stages/seals accepted bytes, overwrites the *original
same-inode, same-size* file via a different handle, confirms the immutable
stage refuses write and still streams the original accepted text only,
and rejects a fresh stage from the mutated original. No protected file
or actual Node/binder root child is executed in this fixture.

```text
parent_pr=3637
parent_head=891db34c74ebbba102515e5184f157ec1898cb46
staged_native_preentry_c_git_blob=e3eae688ed8b378fe219a9aa39271c2312262161
binder_js_git_blob=be4a40954e5541168ab3403ad5b9b74207dc5ddd
binder_js_sha256=31309bffffc09dbb7ced849feb61f3b61c5226f6ec66cdcdba3e315bc08cedbd
binder_js_bytes=62308
binder_verified_sealed_memfd_source=true
binder_same_inode_mutation_streams_only_accepted_bytes=true
protected_install_authorized=false
host_plan_authorized=false
credential_access=false
private_key_access=false
signing=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

This is a changed **root native preentry source generation**, not an
accepted or installed binary. Rebuild/reidentify its native binary,
rerun exact-head compiler/proof/CI, obtain genuinely distinct security
review, and separately qualify first entry and host dependencies before
any future protected invocation. No previous native ELF/lock is
implicitly reissued, and this fixture does **not** license production
root execution or presale/customer payments.

Tor renewal is handled in another chat. PROTECT THE CORE.


## Native trusted-leaf FIFO replacement cannot block — source-only successor

The native preentry's `open_trusted()` verifies a root-owned, canonical
regular leaf with `lstat` and then revalidates the retained FD with
`fstat`. A concurrent **privileged** cutover replacing that checked leaf
with a FIFO after `lstat` could previously stall the **blocking**
`open(O_RDONLY|O_NOFOLLOW)` before reaching its fail-closed generation
check. This is an availability/first-entry provenance issue conditional on a
trusted-root path being replaced; it is **not** evidence of an exploitable
Precision root-writable ancestor or current host compromise.

The same native trusted-leaf opening helper now uses
`O_RDONLY|O_CLOEXEC|O_NOFOLLOW|O_NONBLOCK`. The original ancestor, mode,
UID/GID, link-count, regular type and before/open/visible generation tests
remain. If a FIFO appears, the open returns without waiting for a writer
and `safe_regular()` rejects the special FD. The existing sealed accepted
Binder-JS memfd snapshot and root Node first-entry contract are unchanged.

An unprivileged **actual native C self-test** creates a disposable 0600 FIFO
without a writer, uses the *same helper* as `open_trusted`, verifies the
returned descriptor is a FIFO rejected by `safe_regular`, and requires the
`trusted_fifo_swap_open_nonblocking=true` marker. A blocking helper would
hang and time out in the hosted 10-second self-test rather than report
success. The exact source proof pins this changed native C Git blob:

```text
parent_pr=3639
parent_head=9746fdd767f35cb08e2967c616fb5da4a144c44e
native_preentry_source_blob=78b2264a46adfc457c648dd2c57838c246c3ca71
binder_js_git_blob=be4a40954e5541168ab3403ad5b9b74207dc5ddd
binder_js_bytes=62308
HOST_EXECUTION_AUTHORIZED=false
credential_access=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

This invalidates prior compiled-native-preentry **source generation** evidence.
It does not alter the separately accepted V6R2 *child* ELF or its lock.
Requalify the new native-preentry source, build/lock any future installed
binary, obtain genuinely independent review and perform a separately approved
host-generation qualification. Do not invoke protected `--run` on the
basis of a synthetic fixture. Tor is being handled separately.

PROTECT THE CORE.
