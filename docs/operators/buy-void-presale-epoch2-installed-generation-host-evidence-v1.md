# Buy VOID presale Epoch-2 installed-generation host evidence V1

Marker:
`VOID_BUY_VOID_PRESALE_EPOCH2_INSTALLED_GENERATION_HOST_EVIDENCE_V1`.

Status: **source/CI-only collector definition; no Precision qualification has been run by this gate**.

Parent plan:

`voidbuyhostevplan1_665336abc8030749d2d540f412c4dc597ecece47ecb5aa9f2928529adeba5aab`

This gate implements only #3507 lane:

`epoch2_installed_generation`.

## Reviewed qualifier

The collector binds the existing read-only installed qualifier:

`ops/precision/void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py`

Git blob:

`a04c2e7665294cdd142426e9eb01ee27c5292b8d`

And its adversarial proof:

`scripts/prove_void_buy_void_epoch2_live_composition_native_installed_qualification_v5.py`

Git blob:

`c14ec00acffbc55630aa68db0013d97cac068ab3`.

The collector loads the exact qualifier Git-object bytes into memory and calls
only `collect(expected_head)`.

## Future host run

A future separately authorized root run accepts:

`--run --expected-head <exact clean lowercase-hex main HEAD>`

The collector first requires the local checkout to be clean branch `main` at
that exact HEAD and requires the qualifier/proof paths at that HEAD to match the
pinned reviewed Git blobs.

The V5 qualifier then:

1. authenticates the accepted V6R2 native candidate lock and protected upgrade;
2. verifies the exact current install root;
3. verifies the retained predecessor root;
4. binds Git, setpriv, Node, policy and checkout generations;
5. executes the installed native self-test through a retained descriptor;
6. snapshots the installed generation again;
7. executes a second descriptor-bound native self-test;
8. snapshots a third time;
9. requires before/middle/after installed generations to be identical;
10. requires both self-test outputs/digests to be identical.

Its reviewed proof also demonstrates that a visible pathname swap cannot cause
the replacement binary to execute: the retained descriptor executes the
original generation and the visible generation drift causes HOLD.

## Deliberate process execution

This evidence lane is read-only for persistent state but is not metadata-only.

A future host run executes the installed native **self-test twice**.

It does not execute:
- the authenticated JS runner;
- live composition;
- credentials/private keys;
- signing;
- a transaction or RPC submission.

A GREEN evidence report may set:

```text
epoch2_installed_generation_qualified=true
protected_upgrade_verified=true
installed_generation_stable=true
retained_predecessor_verified=true
node_generation_bound=true
checkout_generation_bound=true
git_generation_bound=true
setpriv_generation_bound=true
native_self_test_execution_performed=true
native_self_test_descriptor_bound=true
native_self_test_stable=true
```

It must retain:

```text
filesystem_write_performed=false
runner_execution=false
live_composition_execution=false
service_mutation=false
network_contact=false
credential_access=false
private_key_access=false
wallet_or_signer_access=false
signing=false
transaction_submission=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_or_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

## Relationship to presale qualification

A GREEN lane-3 result proves only the reviewed Epoch-2 installed-generation
evidence required by #3503/#3507.

It does not by itself prove:
- authenticated deployment/live-process receipt evidence;
- allocation-custody durability/rollback/independence;
- host-install qualification;
- payment-rail policy acceptance;
- one-payment/one-fulfillment;
- WC/VOID launch coupling;
- customer payment acceptance;
- presale or market activation.

Lane 1 is separately defined in #3510.

Lane 2 remains HOLD because current reviewed custody primitives deliberately
leave live durability, rollback resistance and independent custody unproven.

## CI boundary

Hosted CI:
- binds #3507's exact parent plan;
- binds exact V5 qualifier and proof blobs;
- compiles and adversarially checks the wrapper;
- exercises only wrapper `--self-test`;
- does not invoke wrapper `--run`;
- does not execute the real native self-test or inspect Precision.

Real host qualification remains separately authorized.

**PROTECT THE CORE.**

## Qualifier source stat contract

The future wrapper observes the checked-out reviewed qualifier with
`Path.lstat()`, whose result is an `os.stat_result`. Regular/symlink
classification therefore uses Python's stat-mode predicates
`stat.S_ISREG(before.st_mode)` and `stat.S_ISLNK(before.st_mode)`.
The wrapper does not rely on nonexistent pathlib-style methods on
`os.stat_result`; malformed or drifting source metadata remains fail-closed.

## Git observation failure contract

Every checkout/source query uses the fixed reviewed `/usr/bin/git` invocation
with a 20-second timeout. The wrapper supplies `-c core.fsmonitor=false` on
every Git invocation so an owner-controlled repository-local
`core.fsmonitor=<executable>` cannot run under the future root observation
boundary. System and global Git config remain disabled; replacement objects and
optional locks remain disabled as well.

Failure to start Git and Git timeout are both caught and converted to
`EvidenceError`, so a future separately authorized host run emits the same
machine-readable `status=HOLD` contract instead of a traceback. Hosted proof
captures the constructed Git argv and requires the FSMonitor override before
the subcommand, then separately injects both an `OSError` spawn failure and
`subprocess.TimeoutExpired` and requires those normalized HOLD reasons.

No host execution authority changes.


## Delegated root execution isolation

A future `--run` is accepted only under Python isolated/safe-path mode. The
wrapper refuses the collection before checkout or qualifier access if
`sys.flags.isolated != 1`, safe-path mode is absent, or any active
`sys.path` entry resolves inside the fixed checkout. This prevents
checkout-local Python modules from satisfying absolute imports when the exact
qualifier and installer source are executed in memory.

The exact V5 qualifier source remains byte-identical. Before its
`collect(expected_head)` call can load the exact protected installer, the
wrapper replaces only the qualifier's installer-loader boundary with a reviewed
guard. The returned exact installer module must expose the reviewed
`CLEAN_GIT_ENV`; the guard then adds command-scope Git configuration through
the environment:

- `core.fsmonitor=false`;
- `core.hooksPath=/dev/null`;
- `HOME=/nonexistent`;
- `GIT_TERMINAL_PROMPT=0`;
- `GIT_ATTR_NOSYSTEM=1`.

Those variables are inherited across the installer's fixed `setpriv` Git
query, so repository-local FSMonitor cannot execute as the runtime UID during a
root-started qualification. Hosted proof creates a disposable repository with a
local FSMonitor executable and requires that it is not invoked under the exact
delegated environment. It separately invokes the wrapper without `-I` and
requires a machine-readable `python_isolated_mode_required` HOLD.

No accepted qualifier/installer source blob is rewritten and no additional
runtime/payment authority is granted.

## Pre-import isolation bootstrap

The root-started wrapper now performs its isolation/safe-path check before any
shadowable standard-library import. The only module loaded before that check is
built-in `sys`, which cannot be replaced by a checkout-local `sys.py`.

If Python was not started in isolated/safe-path mode, direct execution emits the
same machine-readable `status=HOLD` negative-authority receipt and exits before
`argparse`, `hashlib`, `json`, `pathlib`, or any other shadowable module
is imported. Non-main import under an unisolated interpreter is rejected
immediately as well.

Hosted proof executes a disposable copy of the wrapper beside a hostile
`hashlib.py` that would create a marker if imported. An unisolated
`python3 -B` launch must HOLD and the hostile marker must remain absent. The
later full `sys.path` checkout-exposure check remains in place for isolated
execution.

No host/runtime/payment authority changes.

