# Buy VOID Epoch-2 dormant first-entry protected-installer bootstrap plan V6

Marker:

`VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PROTECTED_INSTALLER_BOOTSTRAP_PLAN_V6`.

Status: **source/test/CI and future non-root/read-only planning only**.

## Purpose

This is the non-executing source gate after the merged V6 protected-bootstrap
installed qualification (#3465) and the canonical V6 materializer publication
repair (#3466).

It does not run the installed bootstrap, does not invoke the protected installer,
does not call `sudo`, and does not claim that installed V6 qualification has
already occurred.

The plan binds:

- exact current checkout HEAD/tree and raw tracked bytes on clean `main`;
- merged V6 qualifier source Git blob
  `e16b0ce71a4522b21762fa824c96aefb58e3a25b`;
- V6 protected-bootstrap installer source Git blob
  `c9dd842b620f2ed7c3fdd5876c222a419b6b0c68`;
- accepted runtime-head launcher lock V2 and canonical launcher materializer;
- accepted dormant-binder native lock V3 and native materializer;
- exact launcher and native artifact bytes supplied to the planner;
- current root-owned `/usr/bin/python3` and `/usr/bin/git` generations that a
  later qualification executor must revalidate;
- the exact V6 installed bootstrap identity and source-generation V3 manifest;
- one content-addressed bootstrap `--installer-plan` argv.

## Why V6 does not call the qualifier directly

Merged V6 installed qualification is deliberately a root-required read-only
host check. This planner is deliberately non-root and no-sudo.

The planner therefore does **not** bypass or monkeypatch the qualifier's root
gate. It authenticates the exact qualifier generation and freezes a
`qualification_contract` describing the result that must be obtained by a
later separately authorized read-only executor.

The required qualification includes:

- exact V6 lock and candidate IDs;
- stable protected root generation;
- exact Python/Git policy binding;
- exact checkout generation;
- two descriptor-bound bootstrap self-tests with stable output;
- exact bootstrap and source-generation manifest identities;
- all bootstrap execution beyond self-test, inner installer apply, filesystem
  write, service/systemd mutation, credential/key/signing, transaction/payment,
  presale/WC activation, treasury/liquidity and funds authority false.

The later executor must authenticate the exact qualifier source bytes before any
root Python source executes. This plan records
`descriptor_bound_source_execution_required=true`; it does not treat a
caller-selected worktree pathname as privileged first-instruction authority.

## Accepted V6 bootstrap generation

Expected installed bootstrap:

- lock:
  `voidbuye2dormantbootstraplock3_5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b`;
- candidate:
  `voidbuye2dormantbootstrapcand3_13521be924148818f4869bf24e535d2ecd54a27483daca74e17ba05128c96062`;
- ELF bytes: `874608`;
- ELF SHA-256:
  `c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b`;
- ELF Git blob:
  `a91707c3e5803071fc73c3451c9bcb3b774f8b48`;
- source-generation V3 manifest: 2382 bytes;
- manifest SHA-256:
  `aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662`;
- manifest Git blob:
  `6e0630af72111bd9976dcc38cdcdada1904dd067`.

Installed target:

`/opt/void-buy-void-epoch2-dormant-first-entry-protected-install-bootstrap-v6/bin/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v6`

## Accepted launcher/native inputs

Launcher V2:

- lock ID
  `voidbuye2dormantfirstentrylock2_89b8e50609c148f844a64b7566f919a32ef9f1a863318f1cc891bd3ee6539543`;
- candidate ID
  `voidbuye2dormantfirstentrycand2_b9c71a294db1259f8dc599aec82a246170eea75c941180e39aab23c52885e70b`;
- 731072 bytes;
- SHA-256
  `4e54056d22a084c1649ddbce3ef1933513bebbd11de7fa76b26d7b636a262a28`;
- Git blob `798907b18c73ee2cc1dea0fe05b36f27ab4137a7`.

Dormant-binder native V2:

- lock ID
  `voidbuye2dormantbinderlock3_a206b43c158746ac2b685f770efe573f014ec672f2c9e8cf0759c2cf7ac1f23a`;
- candidate ID
  `voidbuye2dormantbindercand2_8ee7517895544b58b4b383f0bd1b63b671a2b354656d28016eeae2b47185a20d`;
- 726976 bytes;
- SHA-256
  `ca078f3a81191847d5b0b75de99e4d8f7e389fd051afdb76338f28e157ae5a7c`.

Both caller-supplied artifact paths are descriptor-read, exact size/hash checked,
and rebound-path changes HOLD. The launcher additionally requires exact Git-blob
identity.

## Planned bootstrap argv

After the required V6 installed qualification is separately obtained and
revalidated, the content-bound argv is exactly:

```text
<installed V6 bootstrap>
  --installer-plan
  --launcher <accepted launcher path>
  --native <accepted native path>
  --expected-head <exact current lowercase 40-hex main HEAD>
```

The planner only emits this argv as JSON. It never executes it.

Changing the checkout generation or either artifact pathname/identity changes
the content-addressed plan ID.

The receipt emits the complete canonical body as `plan_body_json`. A consumer
parses that field, canonicalizes it with sorted keys, compact separators and
ASCII JSON escaping, then checks that `voidbuye2protectedbootstrapplan6_` plus
its SHA-256 equals `plan_id`. This includes the checkout tree and observed
artifact metadata; the argv and qualification-contract projections alone are
not the hash preimage. A matching ID proves content binding, not authorization
or installed-host evidence. The later executor must freshly verify its inputs.

## Host-tool alias custody

The repaired V6 installer/qualifier generation also permits a root-owned
`/usr/bin/python3` selector to be a symbolic link. The selector itself must be
root-owned and either a regular file or symlink. Writable-mode rejection applies
to regular aliases; the resolved executable target and every resolved parent
directory remain subject to root ownership, non-group/world-writable ancestry,
regular-file/executable checks, `O_NOFOLLOW` descriptor opening, exact hashing,
and final path/descriptor generation revalidation.

This does not admit caller-owned Python paths or weaken the fixed
`/usr/bin/python3` policy boundary.

## Read-only checkout observation

The planner compares the complete raw HEAD tree and stage-zero index maps, then
hashes each tracked worktree entry directly. It does not use `git status` or
filtered diffs to establish cleanliness. Repository-configured filesystem
monitors and content filters therefore cannot run through those observations
or make different physical bytes appear accepted.

Ordinary regular files, executable files and symbolic-link contents have exact
Git type, executable-bit and blob checks. Unmerged entries, sparse or
skip-worktree entries, assume-unchanged entries, unsupported modes and differing
raw content hold the plan. Filter- or line-ending-normalized worktrees must still
match the raw committed bytes. The existing standard-ignore policy for
untracked files is preserved.
The checkout and its `.git` directory must be physical directories; linked
worktree metadata files and symlinked parents hold the plan. Reads are limited
to 30,000 tracked entries, 16 MiB per regular file, 256 MiB total tracked content,
and 1,024 retained directories. Git output is capped at 8 MiB per observation
with a 20-second deadline.
Bounded descriptor reads and generation rechecks detect changes during the
observation; they do not make a caller-owned checkout immutable afterward.

The focused proof uses private Git repositories and inert callback markers to
exercise normal and adversarial observations, and checks that the complete
emitted plan body round-trips to its ID. It does not execute the installed
qualifier, bootstrap or protected installer.

## Authority boundary

The source and its focused proof keep all of these false:

```text
installed_qualification_performed=false
bootstrap_execution_performed=false
protected_installer_apply_performed=false
filesystem_write=false
service_mutation=false
systemd_mutation=false
credential_access=false
private_key_access=false
signing=false
transaction=false
rpc_call=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

No Precision host mutation, bootstrap execution, credential access, payment,
presale/WC activation or funds movement is authorized by this source gate.

Next action after source acceptance is a **separately authorized read-only V6
qualification + plan execution evidence step**, still with protected installer
apply disabled.

**PROTECT THE CORE.**

## Post-merge V6 planner entrypoint consistency

The canonical merged planner has exactly one top-level `main()` and one
`if __name__ == "__main__"` guard. Direct CLI execution and import-based
inspection therefore refer to the same argument validation and HOLD output
contract; duplicate shadow functions and unreachable duplicate entry guards
are forbidden by the focused AST proof.

The focused workflow binds the current reviewed planner/proof/document
Git blobs. A PR against current `main` may touch only this planner,
its proof, documentation, and focused workflow; post-merge `push` and
`workflow_dispatch` validate exact current blobs and full diff hygiene
without incorrectly requiring the historical four-path initial ADD-only diff.

This is a source/proof repair only. It does not execute the installed
qualifier, the bootstrap, or the protected installer; credential access,
payment acceptance, presale/WC activation, and funds movement remain false.
