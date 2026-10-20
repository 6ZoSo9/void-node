# Buy VOID Epoch-2 V6R3 authenticated read-only host-plan first-entry V1

Status: **source-only candidate / not installed / host execution HOLD**.

The current V8 planner is source/test/CI qualified in Draft #3569, but it cannot
authenticate its own first Python instruction when launched directly from the
runtime-UID-writable source checkout. This successor defines a *separate* root-
custodied launcher entrypoint that must be installed and qualified by a future,
independently reviewed, operation-bound process. There is no installer here.

## Exact source generation

```text
parent_pr=3569
parent_head=3f2a360ab9454baeb4493c21cc78b194e3376e31
planner_rel=ops/precision/void_buy_void_epoch2_live_composition_runner_policy_upgrade_plan_v6r3.py
planner_git_blob=19c6e1cdf9f2361cedfba4ea8d650a63eb5061ff
planner_sha256=95d9dd865bc226a7436a67fff977215e43aad034ce40c2c9126ecc49c469d627
planner_bytes=49025
lock_id=voidbuye2runnerpollock6r3_0633e059bfdfb1209b80b090adacddae61795ca610a6bf7f79059cc997148f52
candidate_id=voidbuye2runnerpolcand6r3_0a3bfc00032b0feeb253fb0f295b4dacc1e3e66af35013676351ed11e3c119e1
runtime_head=4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb
```

The launcher's exact Git blob must itself be pinned by a future installer.
There is **no** implicit approval or mechanism to publish it under `/opt`.

## Trust boundary

The future fixed root-custodied script is:

```text
/opt/void-buy-void-epoch2-v6r3-host-plan-entry-v1/entry.py
```

It requires a trusted Python 3.12 root-owned executable at
`/usr/bin/python3.12`, isolated/no-site Python interpreter flags `-I -B -S`, real and
effective runtime UID/GID 1000:1000, and root-owned non-writable ancestors.
The installed script leaf must be a root-owned, single-link regular file with
mode 0444, and must not be writable to the running runtime UID via ACL.

The code in this source checkout is **not** a trusted installer or execution
entry. `--host-plan` from the checkout must produce `status=HOLD` before
reading protected host files, not an apparent GREEN.

Once the independent installer has qualified that fixed launcher and trusted
Python interpreter, the launcher opens the current checkout's V8 planner as an
ordinary *untrusted* source leaf with no-follow/nonblocking reads. It validates
its exact Git blob, SHA-256 and byte length, including before/open/terminal
generation metadata. The verified bytes are copied to an anonymous Linux
`memfd_create` file and sealed against write, grow, shrink and further
seal mutation. Only the sealed read-only FD is passed to a retained authenticated
Python executable FD via `/proc/self/fd/<n>` with sanitized environment,
`-I -B -S` (no site import), and `cwd=/`. An adversarial checkout edit after the source read cannot
change those executed bytes.

The launcher also requires the child plan to return the expected accepted V8
lock/candidate identities, read-only mode, a correct content-addressed plan ID,
and **all** economic/runtime authority fields `false`. Any missing field,
inconsistent output, timeout or unexpected stderr is a HOLD. A successful
plan is *observation only*: it must not trigger an installer, service restart,
signer operation, payment acceptance, activation or funds movement.

## Test coverage and future gates

The new focused workflow executes **only** synthetic fixture bytes through
the sealed-memory + retained-Python mechanism. It rejects symlinks, FIFO
special files, mutated checkout source, and uninstalled host-plan invocation.
It uses no real credential, wallet, RPC client or protected Precision files.

The remaining gates are: exact-head source CI; distinct independent security
review; separate root-custodied installation of this exact launcher and Python
entry generation; external host custody/UID qualification; then a separately
authorized non-executing host plan. **No step in this document grants that
authorization.**

```text
protected_install_authorized=false
host_plan_authorized=false
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
