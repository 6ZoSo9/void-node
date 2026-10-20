# Buy VOID Epoch-2 V6R3 planner native first-entry V1

Marker: `VOID_BUY_VOID_EPOCH2_V6R3_PLAN_FIRST_ENTRY_V1`.

Status: **source/test/CI candidate only**. This closes the source-design gap recorded on
#3569 where direct `python3 ... --plan` would begin executing mutable checkout bytes
before the planner could authenticate itself.

## Bound planner generation

```text
planner_git_blob=19c6e1cdf9f2361cedfba4ea8d650a63eb5061ff
planner_sha256=95d9dd865bc226a7436a67fff977215e43aad034ce40c2c9126ecc49c469d627
planner_bytes=49025
planner_parent_pr=3569
```

The native launcher is intended for a later separately reviewed fixed root:

```text
/opt/void-buy-void-epoch2-v6r3-plan-first-entry-v1/
  void_buy_void_epoch2_v6r3_plan_first_entry_v1
  void_buy_void_epoch2_live_composition_runner_policy_upgrade_plan_v6r3.py
  policy-v1.conf
```

No production installation is performed or authorized by this source PR.

## First-entry contract

For the future host `--plan` path, the launcher requires:

- a fixed root-owned **static first instruction**; Python is never entered as root;
- root authentication of the fixed self/policy/planner/Python generations;
- `PR_SET_NO_NEW_PRIVS`, supplementary-group removal, permanent real/effective/saved
  UID/GID drop to `1000:1000`, and `PR_SET_DUMPABLE=0` before Python;
- file descriptors 0/1/2 reserved before any trusted open so a closed standard stream
  cannot steal a trusted planner/Python descriptor number;
- fixed self path plus root-owned, group/world-nonwritable ancestors and leaves;
- a second custody/ACL revalidation of self, policy, planner and Python **after** the
  privilege drop under the actual runtime identity;
- exact root-owned planner mode `0444`;
- planner SHA-256 and byte length matching the constants above **before Python starts**;
- a root-custodied policy that repeats the exact planner Git/SHA/size identity and binds
  the host's canonical `/usr/bin/python3` target by realpath, SHA-256 and byte length;
- planner and Python source executables are copied from authenticated originals into
  **sealed memfds**; the copies are SHA/size checked and write/grow/shrink sealed;
- retained sealed planner descriptor mapped to `/proc/self/fd/3` and revalidated
  **after** the mapping;
- retained sealed Python ELF mapped/revalidated and entered with `fexecve()`;
- isolated Python `-I -B -S`, with `site` import disabled;
- caller stdin replaced with an identity-checked character-device `/dev/null`;
- Linux `close_range(5, UINT_MAX, CLOSE_RANGE_UNSHARE)` closes every inherited
  descriptor beyond the fixed planner/Python fd slots, followed by a `/proc/self/fd`
  census before Python;
- a newly constructed loader/Python environment;
- `PR_SET_NO_NEW_PRIVS` before Python entry.

The launcher accepts only `--plan`. It does not expose installer/apply/service/payment
modes.

## Effective-capability drop gate

The native first-entry process must not rely on numeric UID/GID 1000 alone.
An inherited `SECBIT_NO_SETUID_FIXUP` plus inheritable/ambient capabilities
can preserve effective privilege across the root-to-runtime transition and
into Python. Before dropping privileges the native launcher rejects **any
nondefault inherited securebits** and clears ambient capabilities. After the
permanent UID/GID drop it clears all inheritable, permitted and effective
capabilities with Linux `capset`, verifies all three sets via `capget`,
clears ambient capabilities again, and checks saved IDs and the supplementary
group list. Every failure HOLDS before Python.

The hosted disposable adversary exercises both the inherited securebit alone
and securebit plus ambient/inheritable CAP_DAC_OVERRIDE. This source change
invalidates the earlier static ELF candidate and accepted binary lock in
#3573/#3574. Rebuild and reissue all binary, candidate and lock identities;
**never reuse the previous identity as installation authority**.

This is a *pre-exec capability* contract. `PR_SET_DUMPABLE(0)` is not a
post-exec Python guarantee; the independent #3579/#3580 dumpability
review gate remains required.

## Adversarial proof

The proof has two modes. **Default invocation is nonprivileged**: it compiles/checks the
source and exits before any `sudo` operation, emitting
`privileged_fixture_executed=false`.

The privileged fixture exists only behind the explicit
`--isolated-disposable-fixture` flag used on a disposable hosted runner. It never
changes global `/opt` ownership/mode and never recursively deletes a path. Instead it:

1. compiles the production-default launcher statically and requires no `PT_INTERP`;
2. compiles a proof-only launcher whose fixed root is a unique absent path under
   root-custodied `/run`;
3. refuses the fixture if that unique root already exists;
4. creates the root and its three files create-only and records their exact generations;
5. demonstrates a dynamic `LD_PRELOAD` positive control, then proves the static launcher
   does not execute the preload constructor before `main()`;
6. invokes the fixed launcher as root and requires the irreversible drop to numeric
   UID/GID `1000:1000` before Python;
7. supplies caller stdin Python plus hostile `PYTHONPATH`/`LD_PRELOAD`, requiring none
   to become child authority;
8. requires the exact planner to clear both its root and exact-UID/GID guards and HOLD at
   the later hosted-only `git_failed:rev-parse` boundary, proving Python entered the
   planner as UID/GID `1000:1000`;
9. closes fd0 before the real native first entry and requires the exact authenticated
   planner to still execute from the revalidated mapped fd3;
10. replaces the planner with a same-size modified root-owned file and requires
    `planner_identity_invalid` before Python;
11. invokes the launcher from a wrong path and requires rejection before Python;
12. invokes the correct fixed launcher directly as UID/GID `1000:1000` and requires
    `root_static_first_entry_required` before Python;
13. verifies the sealed memfd write adversary fails with `EPERM`;
14. cleans up only if the fixture root retains its exact inode/custody identity and each
    installed leaf still matches the exact generation the proof created, removes those
    leaves individually, then uses `rmdir` on the empty root.

If any cleanup generation or directory shape differs, the proof fails closed instead of
deleting unknown content. The proof contains no global `/opt` mutation, no preclean,
and no `rm -rf`.

After sealed copies are created and revalidated, the original planner/Python paths are no
longer execution authority.

## Policy shape

The later protected installation must provide a root-owned `0444` policy:

```text
schema=VOID_BUY_VOID_EPOCH2_V6R3_PLAN_FIRST_ENTRY_POLICY_V1
planner_git_blob=19c6e1cdf9f2361cedfba4ea8d650a63eb5061ff
planner_sha256=95d9dd865bc226a7436a67fff977215e43aad034ce40c2c9126ecc49c469d627
planner_bytes=49025
python_realpath=<canonical /usr/bin/python3 target>
python_sha256=<exact host Python SHA-256>
python_bytes=<exact host Python bytes>
runtime_uid=1000
runtime_gid=1000
```

The host-specific Python identity **and the core stdlib/lib-dynload/dynamic-loader
closure reachable under `-I -S`** must be derived and accepted in a separate protected
candidate/install lane.

The launcher is deliberately privilege-reducing: root exists only to authenticate the
protected first-entry chain and perform the irreversible identity transition. The planner
and all Python code execute only after the process is permanently non-root.

## Required lifecycle

This source publication is not host authority. Required successor order:

1. exact-head source proof GREEN;
2. reproducible static launcher candidate and binary identity lock;
3. host Python + core stdlib/lib-dynload/dynamic-loader + policy identity
   census/acceptance;
4. create-only root-owned installation;
5. installed read-only qualification of launcher/planner/policy/Python custody;
6. distinct independent review;
7. only then separately authorize the non-executing host planner invocation.

Direct checkout `python3 ... --plan` remains HOLD.

## Negative authority

```text
protected_install_authorized=false
host_plan_authorized=false
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
```

## Root-opened output-descriptor custody — additive repair

Building on the #3582 nondefault-securebits rejection and irreversible
Linux-capability clear, this successor also blocks **inherited regular
stdout/stderr file descriptors** before any HOLD can print into them.
Output is permitted only through writable pipes, TTYs, or `/dev/null`.
A root-opened regular-file fd1/fd2 retains write authority despite the
UID/GID1000 transition, so unsafe destinations exit nonzero without writing.
Disposable source-CI fixtures exercise both unsafe output paths and verify
root-owned sentinel files remain empty.

This is an ADDITIVE source/test repair; it preserves all of #3582's
`capset`/securebits/ambient-capability tests. The older #3573/#3574 ELF
candidate and accepted lock are superseded for future installation.
A new exact-generation binary candidate/lock, independent review, and
separately authorized installed host qualification remain mandatory.

PROTECT THE CORE.
