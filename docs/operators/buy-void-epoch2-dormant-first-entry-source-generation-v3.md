# Buy VOID Epoch-2 dormant first-entry source generation V3

Status: **immutable source generation and accepted C6 artifact; actual C6-to-inner
handoff remains unverified until this focused hosted fixture succeeds**.

This follow-up changes only the native proof, this document and the
source-generation workflow. The application sources, manifest, existing
Python component proofs, accepted candidates and locks remain byte-for-byte
unchanged. A successful fixture is evidence from a disposable hosted namespace;
it is not evidence that the Precision host has fetched, installed or run them.

## Purpose

Source-generation V3 supersedes V2 only for future install authority. Historical
V1/V2 source generations remain byte-frozen evidence.

The V2 generation still bound the stale first-entry launcher V1. V3 replaces
that single authority dependency with the accepted runtime-head launcher V2
from #3450/#3451 while retaining the frozen child protocol, payload namespace,
native candidate, runtime installer, private-Git witness, descriptor custody,
terminal-truth, cleanup and publication protections.

## Immutable generation

Manifest:

`ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v3.conf`

Exact identity:

- Git blob: `de56bacb30bea0adc418e240cf3fb8d900b061ef`
- bytes: `2382`
- SHA-256:
  `8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9`
- source-generation ID:
  `voidbuye2dormantsourcegen3_8de1a4ebdfb16d31c7ca2891d074b47631540304d71f803353030c31ab355ca9`

## Current application sources

Inner installer V5:

- path:
  `ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v5.py`
- Git blob: `ce6930bc1be8239a3171d4922c44b96a50f5778b`
- bytes: `127528`
- SHA-256:
  `c9fbb7ce1c1788b52837635243c6393fc731ef12a7217cc9155d6ff86bd97bfb`

Native bootstrap V6:

- path:
  `ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6.c`
- Git blob: `560726bcae6ea0738502cb5e74b65f9116bd447d`
- bytes: `106792`
- SHA-256:
  `ac8673f51e4325e3ed1912a4f628cc3715c7199cda1c3cbdacbbcb710ae6b145`

## Launcher V2 authority

V3 binds the canonical runtime-head first-entry launcher V2:

- lock path:
  `ops/security/buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v2.json`
- lock Git blob:
  `227c2fa449abf1387925373c706ecd07775d5898`
- lock bytes: `4548`
- lock SHA-256:
  `7c4c207fb01d9bb4d8f6ab72b458464bf258373c7601e40e7a8e2719e3b4630a`
- lock ID:
  `voidbuye2dormantfirstentrylock2_89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543`
- candidate ID:
  `voidbuye2dormantfirstentrycand2_b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b`
- launcher bytes: `731072`
- launcher SHA-256:
  `4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28`

Inner installer V5 requires the lock itself to prove:

- `runtime_head_contract_accepted=true`
- `canonical_main_candidate_authority=true`
- `superseded_v1_lock_install_authority=false`
- `runtime_expected_head_compile_bound=false`
- strict lowercase runtime-head admission
- unchanged runtime-head forwarding
- repository HEAD absent from the launcher ELF
- frozen-child launcher path compatibility preserved

A matching hash without those semantics is insufficient.

## Frozen child compatibility

The runtime child protocol deliberately remains V1-compatible:

- protected payload root:
  `/opt/void-buy-void-epoch2-dormant-binder-installer-first-entry-v1`
- payload policy schema:
  `VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_INSTALLER_FIRST_ENTRY_POLICY_V1`
- parent-proof schema:
  `VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PARENT_PROOF_V1`

This is compatibility, not stale authority. Launcher V2 preserves those fixed
paths/protocol values while moving repository HEAD to authenticated runtime
input.

## Other bound inputs

Runtime installer remains:

- blob `f3d6b1559be7490303cf36338c4bfa38fdaa390a`
- bytes `57255`
- SHA-256
  `602d7fbc256d346b3f80adc93e3b20a39403be5158e944e23456851764a954b9`

Accepted native candidate remains:

- bytes `726976`
- SHA-256
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`

Root-custodied host tools remain `/usr/bin/python3` and `/usr/bin/git`.

## V6 production namespace

The fixed V6 bootstrap root is:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v6`

Its fixed inputs are:

- `bin/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6`
- `source-generation-v3.conf`
- `policy-v1.conf`

Host policy schema:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6`

The policy binds the exact host Python and Git generations. Their digests are
read from this policy at admission; they are not the compiler host's tool
identities embedded in the accepted C6 ELF.

## Operation namespace

- source generation prefix: `voidbuye2dormantsourcegen3_`
- plan prefix: `voidbuye2dormantfirstentryinstall5_`
- confirmation:
  `INSTALL_ACCEPTED_EPOCH2_DORMANT_FIRST_ENTRY_V5_CREATE_ONLY`

## Accepted C6 artifact

The accepted release input is fixed by
`ops/security/buy-void-epoch2-dormant-first-entry-bootstrap-v6-candidate-lock-v1.json`:

- lock Git blob: `f2ce1364dd776bfbf1aa1ef59ce999cb46037b73`
- lock ID:
  `voidbuye2dormantbootstraplock3_4d87f4ce1f97883012a8695c86b85bee5b8b54ae2b6ade1dd761cc23ad5d9396`
- accepted C6 ELF bytes: `874608`
- accepted C6 ELF SHA-256:
  `618c2c9e3bf49715d844b08fa0787340b8b84ecea0bf9ae350f889ee6deac52c`
- accepted C6 ELF Git blob:
  `b577d70666f98ac59a75b84b3dab741fe7b93a4b`

The lock binds the exact C6 source, inner V5 and manifest identities above.
The fixture reads this existing acceptance as data; it creates no new candidate
or lock and does not grant the lock's still-false operational authorities.

The full proof requires three explicit, normalized absolute file arguments:
`--accepted-bootstrap`, `--accepted-launcher` and `--accepted-native`.
Both the ordinary caller and the isolated driver check the C6 bytes and digest.
The caller also checks the accepted lock/source-generation relationship and
rechecks all three input files after the isolated driver exits. The static
C6 binary built for component tests is never substituted for the accepted ELF.

## Proof boundary


The focused proofs preserve the V2-generation adversarial coverage:

- exact closed 35-row manifest grammar;
- all bound source and payload identities;
- raw Git tree/index/worktree comparison;
- private Git metadata and no object fetch;
- source witness lifetime through final parent validation;
- descriptor substitution and generation drift rejection;
- hostile environment / unsafe Python flag rejection;
- child resource clamping and cleanup;
- terminal state, stage identity, publication-aware receipts and close failures;
- V6 static native self-test, parser/candidate/checkout helper tests;
- dirty, staged, untracked, split-index, storage redirect, mode/symlink and
  missing-object rejection.

Earlier V1/V2/V4/V5 source generations are explicitly frozen in the proofs.

## Existing component evidence and the added boundary

The merged source gate already exercised the canonical native helper cases:
16 hash lengths, 226 parser rejections, 33 argument/environment/signal
rejections, six tool/payload rejections, 22 checkout rejections and six private
Git rejections. Its receipts explicitly reported
`production_parent_handoff_proven=false`,
`installer_child_created=false` and `privileged_fixture_executed=false`.
See the [source-merge run](https://github.com/6ZoSo9/void-node/actions/runs/39049054685)
on `906afc7dc3662af678a625566b9f43d752953785`.

The revised native proof retains those component cases and compile-contract
negative controls. The canonical inner-generation and terminal proofs are
unchanged. Their simulated admission and publication tests remain component
evidence; their markers do not satisfy the new native handoff gate.

The full native proof adds exactly four invocations of the accepted C6 ELF,
which itself authenticates and starts the exact canonical inner V5 from its
sealed descriptor. It uses the production C6 root, fixed self filename, policy,
manifest and command-line grammar. No parent-validator override or fabricated
13-descriptor map is installed. C6 creates and retains the real descriptor
roles and private parent proof through its child's exit.

### Four-call fixture

A fresh SHA-1 `main` checkout contains exactly five tracked `100644` files:
manifest V3, inner V5, C6 source, the accepted C2 lock and the frozen runtime
installer source. It has a physical `.git`, closed local config and an ordinary
v2 index. The fixture copies its checkout nodes as UID/GID 1000 and leaves the
runtime installer source as data.

The driver creates C6's fixed root and five-row V6 host policy in its private
`/opt`. Accepted C2 and native input files are retained separately as data. The
C2 payload root is absent for the first call.

| Call | Required actual result | State observation |
| --- | --- | --- |
| Absent-root plan A | Inner reports the ready-for-create-only state, authenticated generation and a V5 plan ID; final C6 receipt is GREEN. | Payload and stage roots stay absent; all observed bytes and generation metadata stay unchanged. |
| Installed-root plan B | After the driver seeds the exact accepted C2/native/runtime/policy payload in the compatible V1 namespace, inner reports the installed GREEN state; final C6 receipt is GREEN. | The driver takes a new baseline after its seed. B must differ from A, and this call must preserve that baseline. |
| Apply stale A | Inner reports `expected_plan_id_mismatch` and `publication=false`; C6 reports the child-failed HOLD with its child-started fact, without a native GREEN. | Installed payload and checkout stay unchanged; no stage appears. |
| Apply current B | Inner reports `ALREADY_GREEN` and `protected_install_performed=false`; final C6 receipt is GREEN. | Installed payload and checkout stay unchanged; no stage appears. |

The driver seeding step is fixture setup. It places the accepted C2 ELF at the
V1-compatible launcher filename, accepted native input and frozen runtime
installer at their exact V1 payload paths, and a separate three-row V1 Python
policy. It invokes none of those payloads. The two applies exercise the stale
plan and already-installed branches only; the driver never asks the inner to
publish a new installation.

For each invocation the proof requires both the actual inner terminal receipt
and the subsequent final native receipt. A child success alone is insufficient:
C6 must finish its postchild generation checks and cleanup. For stale apply,
the child HOLD and the native child-failed HOLD must both be present. The
native and Python private-Git cleanup keys have different spellings; each is
checked against its actual output channel.

### Canonical receipt limits

The installed plan currently emits this legacy action:

`next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_INSTALLED_READ_ONLY_QUALIFICATION_V1`

The fixture verifies that exact text as the canonical receipt. It does not
interpret it as evidence that an installed C2 consumer has been qualified.

Canonical inner V5 emits neither `publication=` nor `next_action=` in
`ALREADY_GREEN`. This proof preserves that source behavior and requires those
two fields to remain absent in that terminal slice. Its own receipts make the
absence explicit:

```text
production_canonical_installed_plan_qualification_receipt_verified=true
production_canonical_already_green_publication_receipt_present=false
production_canonical_already_green_next_action_present=false
production_no_publication_observed=true
```

The last fact is the fixture's observation: unchanged bytes, inode, mode,
ownership, link count, size, mtime and ctime, together with continued stage
absence and the actual already-installed branch result. It is not an invented
inner `publication=false` receipt. Access-time equality is not claimed.

### Private namespace and cleanup

The full proof requires explicit `--isolate-production-fixture`. It refuses
the designated Precision hostname and checks that all fixed targets are absent
before mounting anything. There is no local or less-isolated fallback.

Only the production driver runs with root privileges. A root-owned hard timeout
starts `unshare` with private mount propagation, a PID namespace and a private
proc mount. It creates neither a user namespace nor a UTS namespace. The driver
is PID 1, while each real C6 child has a PID greater than one, preserving the
inner's actual native-parent admission.

The driver uses fresh root-owned tmpfs mounts: 16 MiB/256 inodes for executable
`/opt`, and 8 MiB/256 inodes for non-executable `/home`; both are `nosuid,nodev`.
The flat source/data bundle is validated before the private `/home` hides the
runner checkout. Checkout construction is bounded to 128 entries and 1 MiB.
The input reader caps each accepted artifact at the existing 2 MiB bound.

The caller binds the original `/`, `/opt`, `/home` metadata and mount/PID/user/UTS
namespace identities before starting the helper and rechecks them in
`finally`. The driver retains directory and file descriptors for its own
created nodes, refuses unknown or substituted entries, removes only that owned
forest, closes fresh descriptors and uses ordinary reverse-order unmounts.
It reports GREEN only after owned-node cleanup, unmounts and restoration of the
original anchor identities. Failed cleanup reports HOLD.

The driver directly terminates the native process group and reaps its direct
C6 child on a call timeout. Native and Python Git children can have separate
process groups; PID-namespace teardown and ordinary-unmount refusal provide the
remaining descendant/lifetime backstop. A 180-second helper alarm, 210-second
root-owned hard timeout and 240-second outer timeout bound the fixture.

## Focused hosted workflow

The source-generation workflow binds the exact three modified `100644` proof,
document and workflow paths. PR scope uses the unique common ancestor of the
event base and head. A push uses its literal `before` commit. The predecessor
blobs of all three files must match the reviewed canonical versions; extra
paths, add/delete/rename operations and mode changes fail. All frozen production
and accepted-input dependency pins are checked independently. The old
eight-addition source-generation scope and its historical PR-base bridge do
not apply to this evidence-only follow-up.

Manual dispatch checks the same exact pinned tree, while explicitly reporting
`event_diff_scope_verified=false`; it does not invent a historical modification
claim.

Before the isolated fixture, the ordinary caller derives the three already
accepted inputs through their pinned materializers:

- C6: `materialize_buy_void_epoch2_dormant_first_entry_bootstrap_v6.py --derive-dir ABSENT_DIRECTORY`;
- C2: `materialize_buy_void_epoch2_dormant_binder_installer_first_entry_v2.py --derive ABSENT_FILE`;
- native input: `materialize_buy_void_epoch2_dormant_binder_native_v2.py --derive ABSENT_FILE`.

The workflow checks the accepted C6 ELF and accompanying manifest identities
after materialization; the native proof independently checks the ELF again.
The materializers' candidate builds and inert self-tests run outside the
isolated driver. Their source pin checks are kept separate from the actual
four-call handoff. The C2 materializer's Git guard receipts apply to its own
Git calls; accepted nested helpers supply their own environments, so this is
not a claim of whole-derivation network isolation.

The native proof's `--components-only` mode runs the retained component suite
without any accepted-artifact or isolation arguments. It never emits
`_SOURCE_PROOF_GREEN` and reports the full handoff facts false. The workflow
requires the full mode, the accepted C6 identity, all four per-call facts,
completed namespace cleanup and
`production_parent_handoff_proven=true`. Those are pass conditions for a future
hosted run, not evidence supplied by this document.

## Authority

This proof update changes no production source, manifest, candidate, lock or
protected-install contract. It performs no operation on Precision and does not
grant a deployment, live launcher/native/binder execution, service mutation,
credential/private-key access, signing, transaction/RPC, payment acceptance,
presale/WC activation, treasury/liquidity action or funds movement.

The accepted C6 ELF is executed only inside the explicitly authorized disposable
hosted proof namespace. C2 and the accepted native payload are data throughout.
Even a GREEN full fixture proves that boundary on its hosted tool and kernel
generation; an operator-host handoff and installed-consumer qualification still
need their own exact evidence.

**PROTECT THE CORE.**
