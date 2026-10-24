# Buy VOID Epoch-2 V6R3 runner/policy non-executing upgrade plan — main integration

Marker: `VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_RUNNER_POLICY_UPGRADE_PLAN_V6R3`.

Status: **source/test/CI + future non-executing host plan only**. There is no apply
mode in this generation.

## Main-based source identities

```text
integration_pr=3546
main_base=0ada7fde0d90c3946b10693f4621cbd690bfcde6
candidate_id=voidbuye2runnerpolcand6r3_a9f60a75a96d74c9bbae89f6d9867886f6fb9b60b9a7bd7da4137c4502c2557f
accepted_lock_id=voidbuye2runnerpollock6r3_7cce6937b504ce5ec9dd1fe7aaa303763035f9d6486a081619be346793787dc7
accepted_lock_blob=daab812f9925364ad89ff3bd59fdd18b9c98d553
planner_blob=b9e69cab21b3031f0fb8000c0970a4cb99163d74
runner_git_blob=4e84b6eb77c284ecf7d85b609cec4d1cf130c7a7
runner_sha256=88e51377e473d4f0352f949f87ab5566078c85dddb1ab3e8e1bbb9908bfba19b
runner_bytes=66548
runtime_head=4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb
```

All stacked #3543 lock/plan identities are superseded for current authority.

## Future non-executing host plan

A separately authorized non-root `--plan` will:

1. authenticate the current source generation and complete nine-entry runtime-sensitive
   dependency closure with network-capable Git transport disabled;
2. bind the accepted main-based V6R3 lock and Runner V4 Git object;
3. descriptor-snapshot the protected host Node binary;
4. derive the existing V6R2 policy using runtime head `4c80887...`;
5. derive the V6R3 policy using the same runtime head and accepted Runner V4 identity;
6. observe whether the protected root is old V6R2 READY state or already V6R3 GREEN;
7. content-address the resulting plan.

The planner performs terminal source revalidation after the host observations.

If the protected root is READY, the next boundary is a **separate** V6R3 runner/policy
atomic-upgrade authorization. If it is already GREEN, the next boundary is a separate
installed read-only qualification.

## Negative authority

```text
filesystem_write=false
runner_execution=false
native_execution=false
live_composition_execution=false
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

No Precision host plan is authorized merely by this source publication. No protected
install or live binding follows automatically.

PROTECT THE CORE.


## Runtime-release Runner repair rebind

This non-executing plan is now bound to the repaired Runner V4 generation that:

- pins the canonical Git dir/worktree for current-source observation;
- keeps Git lazy fetch, transport and prompts disabled;
- executes the historical sealed-v2 probe from the exact protected runtime release `/opt/void-node-live/releases/4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`;
- keeps runtime policy head `4c80887...` distinct from the advancing source checkout.

Current accepted source identities:

```text
candidate_id=voidbuye2runnerpolcand6r3_a9f60a75a96d74c9bbae89f6d9867886f6fb9b60b9a7bd7da4137c4502c2557f
accepted_lock_id=voidbuye2runnerpollock6r3_7cce6937b504ce5ec9dd1fe7aaa303763035f9d6486a081619be346793787dc7
accepted_lock_blob=daab812f9925364ad89ff3bd59fdd18b9c98d553
runner_git_blob=4e84b6eb77c284ecf7d85b609cec4d1cf130c7a7
runner_sha256=88e51377e473d4f0352f949f87ab5566078c85dddb1ab3e8e1bbb9908bfba19b
runner_bytes=66548
planner_blob=b9e69cab21b3031f0fb8000c0970a4cb99163d74
```

The planner remains read-only and has no apply mode.


## Raw-object ancestry rebind

Current accepted inputs:

```text
lock_id=voidbuye2runnerpollock6r3_7dd8db2619e9c02ef8120e6d5e4e716946b991787dea7128fb51ed63290e4af7
candidate_id=voidbuye2runnerpolcand6r3_8ffc05fc997f4dc19a3174ca588b812afd126565235361bb6048170701ba1af1
runner_blob=340a0cf0eec589a44f20d44143e353ea25250973
runner_sha256=c5976f6b96a5c29807fb188d0ede4f0fe812512f199a083272df2e1a7acb4953
runner_bytes=70767
planner_blob=596265d01d762bc3ecbcb7683e8fb4b5d50ce691
```

The planner no longer uses revision-walk ancestry. It traverses bounded raw commit
parent headers and rejects graft-only ancestry. It also refuses a lock unless that
lock explicitly records raw-object ancestry as required and graft/revision metadata
as non-authoritative.

The planner remains non-executing and has no apply mode. No protected filesystem
mutation, Runner/native execution, credential/key/signing, transaction/RPC/payment,
activation, treasury/liquidity, or funds authority is added.

## Runtime-UID ACL-sealed Runner planner rebind

The non-executing V6R3 plan is now rebound to the accepted ACL-sealed source generation:

```text
accepted_lock_id=voidbuye2runnerpollock6r3_e65f2b3a34ce06a34bd2cc1e2f91e877fa3c6d67621fd02a191b1aae374a3a21
accepted_lock_blob=7b113cb2547ed60a8e42a55cf4ad48e193cda89a
candidate_id=voidbuye2runnerpolcand6r3_c2d5d08f412be224ad0f05745b5ce3e03dafb5a55d807632ae2b3ec6fb59c6b1
runner_blob=2f17fd716f266fc1e12144799879d949983cc807
runner_sha256=1685536b4717963dc35459695e80f13841e330ed278b88b6a5004134aab2a030
runner_bytes=82972
planner_blob=fdd58c3e120e255d1cd88b749b062f910537559c
```

This rebind changes only source provenance for the future separately authorized host plan.
The runtime policy head remains `4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`,
the native V3 identity remains reused, and policy Node identity remains protected-host-derived.

The planner still has no apply mode and does not execute the Runner/native path, access
credentials or private keys, sign/broadcast transactions, accept payments, activate
the presale/WC market, mutate services, or move funds.


## Historical nonblocking sealed-V3 accepted-lock repair

Historical source identities preceding the retained-first-exec successor:

```text
candidate_id=voidbuye2runnerpolcand6r3_aaa50e1bbfe2303045336c03be2bacd504a736a0fd04f97d4f38be7e76fbba7d
accepted_lock_id=voidbuye2runnerpollock6r3_72ecfe7a0d5aa87237520290cdf63cf0faef821931ef094ac0ec5dd1858e496f
accepted_lock_blob=a9565f1dbe49e694ee07eb0cfdddb42d591d856b
runner_git_blob=11a147d565bd0ee3ff48c4e3cb75d608b59e87b1
runner_sha256=9302bcbdf70c3d4fd46be5deb0a2101ab09d51bf84171e43f2b5fb6e6b4f92a8
runner_bytes=82972
planner_blob=185e409aab47c8d391025decec1e58f9288fb5e2
```

That historical generation used compatibility run 39344749462 and candidate run
39344747264. It preserved the nonblocking sealed-V3/FIFO-race requirements but is
superseded by the retained-first-exec source, V8 lock, and planner generation recorded
below. It has no current install authority.

## Host-plan custody / first-exec repair — Draft child of #3562

The prior planner audited only the mode and ownership of a protected root, listed a
directory by pathname before opening it, and executed the host Git binary by
pathname. This admitted a plan-time directory generation / ACL race and left the
source-authenticating Git first-exec image unbound. A root-owned leaf with a named
runtime-UID write ACL was not rejected by the previous metadata-only test.

The source-only repair requires all of the following for a future separately
authorized `--plan` run:

- Real/effective UID and GID **1000/1000**, because checks use that exact
  identity's effective-credential POSIX ACL access. Any other host-plan
  identity must HOLD rather than silently audit the wrong user.
- Root-owned, nonsymlink, group/world-nonwritable directory **ancestors** down
  to each protected root, with effective runtime-UID nonwritability and
  metadata generation snapshots. `/opt` is audited before any stage/current
  predecessor pathname probes.
- A retained, no-follow, nonblocking directory FD, proven to be the admitted
  root generation, drives `os.listdir(fd)` and all child reads; the visible
  ancestor/root generation is revalidated before returning READY/GREEN.
- `/usr/bin/git` and its ancestors are custody checked; the Git child executes
  its **retained executable FD** via `/proc/self/fd/<n>` and `pass_fds`,
  with terminal FD/path/ancestor revalidation instead of pathname first exec.
- `/usr/bin/node` receives the same ancestor/ACL custody barrier before
  hashing; no-follow/nonblocking regular-file FD checks and terminal
  generation revalidation guard against a regular-file-to-FIFO open race.
- Protected child opens are nonblocking and require the retained generation
  to be a regular file before reading.

This source/test/CI child is bound to the accepted V8 retained-first-exec lock from
#3567 and therefore requires the #3566 Runner descriptor-first-exec repair. It does
not merge, install, qualify or activate a production generation. No host `--plan`
was invoked, and all payment/credential/signing, presale/WC activation and funds
authority remain **false**.

The planner also reobserves the host Node digest and protected READY/GREEN
state before returning a plan. Synthetic self-tests force late Node and
protected-state drift and require HOLD, preventing an earlier valid snapshot
from being treated as terminal authority.

The `--self-test` fixture also directly executes the retained Git ELF via
`/proc/self/fd/<n>` and inherited `pass_fds` with `cwd=/`, requesting
`--version` only. This tests the critical retained-first-exec mechanism on
the hosted runner; it does not authenticate or inspect Precision's host
binary, execute the production Runner, or authorize a host plan.

Planner Git blob: `19c6e1cdf9f2361cedfba4ea8d650a63eb5061ff`.


## Host planner first-exec gate

This Draft does **not** authorize direct execution of the checkout path with
`python3 ... --plan`. The planner's source snapshot runs only after Python has
already begun executing that file, so it cannot by itself authenticate its own
first instruction.

Before any future host `--plan`, a separately reviewed external launcher must
authenticate the exact planner Git blob
`19c6e1cdf9f2361cedfba4ea8d650a63eb5061ff` before executing planner bytes,
while preserving the non-root UID/GID 1000 boundary. Until that launcher is
qualified, host-plan execution remains HOLD.

## Protected leaf effective-ACL custody refinement

Every protected native, Runner, and policy leaf is now checked for effective runtime-UID
write access using descriptor-relative `os.access(..., dir_fd=root_fd,
effective_ids=True, follow_symlinks=False)` before and after byte authentication.
Writable leaves, missing/rebound leaves, and unavailable ACL audits fail closed.

The hosted self-test uses synthetic non-writing fixtures to require rejection of both a
runtime-writable leaf and an unavailable ACL audit. This adds no host mutation,
credential access, signing, transaction/payment, activation, service action, or funds
movement authority.

## Retained-first-exec V8 lock rebind

```text
lock_blob=d28ebbd3fe1d89a1940b039af64e10a6cb96065e
lock_id=voidbuye2runnerpollock6r3_0633e059bfdfb1209b80b090adacddae61795ca610a6bf7f79059cc997148f52
candidate_id=voidbuye2runnerpolcand6r3_0a3bfc00032b0feeb253fb0f295b4dacc1e3e66af35013676351ed11e3c119e1
runner_git_blob=2fa028824d71a22f4d228cdb7fcda738bce7b409
runner_sha256=9b8497c813fc3899b745736da01929380b5f28f988f70790def1e0a98b35a261
runner_bytes=84928
planner_git_blob=19c6e1cdf9f2361cedfba4ea8d650a63eb5061ff
```

The planner rejects any lock that does not explicitly accept the retained-first-exec
identity and all descriptor/procfd source-compatibility properties. It also requires every
runtime/economic authority field in the accepted lock to remain false.
