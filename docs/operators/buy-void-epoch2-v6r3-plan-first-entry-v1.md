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
- fixed self path plus root-owned, group/world-nonwritable ancestors and leaves;
- a second custody/ACL revalidation of self, policy, planner and Python **after** the
  privilege drop under the actual runtime identity;
- exact root-owned planner mode `0444`;
- planner SHA-256 and byte length matching the constants above **before Python starts**;
- a root-custodied policy that repeats the exact planner Git/SHA/size identity and binds
  the host's canonical `/usr/bin/python3` target by realpath, SHA-256 and byte length;
- retained planner descriptor inherited as `/proc/self/fd/3`;
- retained Python ELF entered with `fexecve()`;
- isolated Python `-I -B -S`, with `site` import disabled;
- caller stdin replaced with `/dev/null`;
- a newly constructed loader/Python environment;
- `PR_SET_NO_NEW_PRIVS` before Python entry.

The launcher accepts only `--plan`. It does not expose installer/apply/service/payment
modes.

## Adversarial proof

Hosted CI:

1. compiles the real launcher statically and requires no `PT_INTERP`;
2. demonstrates a dynamic `LD_PRELOAD` positive control, then proves the static launcher
   does not execute the preload constructor before `main()`;
3. installs only a disposable root-owned fixture at the exact fixed `/opt` path;
4. invokes the real launcher through its fixed path as root, requiring the launcher itself
   to perform the irreversible drop to numeric UID/GID `1000:1000` before Python;
5. supplies caller stdin Python and hostile `PYTHONPATH`, requiring neither to execute;
6. requires the authenticated planner marker to appear, proving Python reached the exact
   retained planner bytes;
7. replaces the planner with a same-size modified root-owned file and requires rejection
   at `planner_identity_invalid` **before Python starts**;
8. invokes the launcher from a wrong path and requires rejection before Python.

The fixture is deleted at the end of the hosted proof.

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

The host-specific Python identity must be derived and accepted in a separate protected
candidate/install lane.

The launcher is deliberately privilege-reducing: root exists only to authenticate the
protected first-entry chain and perform the irreversible identity transition. The planner
and all Python code execute only after the process is permanently non-root.

## Required lifecycle

This source publication is not host authority. Required successor order:

1. exact-head source proof GREEN;
2. reproducible static launcher candidate and binary identity lock;
3. host Python + policy identity census/acceptance;
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

PROTECT THE CORE.
