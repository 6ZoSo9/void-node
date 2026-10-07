# Nimo replay compare handler upgrade — bounded recovery v1

## Purpose

The initial Nimo handler-only upgrade stopped before replacement because the
temporary destination was named `.handler.compare-v1.new.<pid>`, which Node
does **not** recognize as a JavaScript module under `node --check`.
The installed handler was not intentionally replaced by that failed attempt.

This operator-only repair uses a temporary filename ending in **`.mjs`**,
checks the staged source there, and then atomically renames it over the
existing handler. The procedure is idempotent and never falls back to invoking
the staged JavaScript as an executable.

The expected source is the reviewed, merged compare-capable handler from
PR #2574 / #2579:

```text
Git blob: f066449215cd89522eae1cd251aa10c5594dd210
SHA-256: 511ffe6ee55e0ef3ac2e8582ffdc94b3d294884408d55c174875fed928a18831
```

The exact old installed SHA-256 is
`65f8de9b659c151caf4d73a93d31da3d523a77cf5a7b6ced26c42b12b7d2d3f`.
Any third/unknown handler SHA HOLDS without replacement.

## Nimo-only apply script

```text
tools/void-buy-allocation-custody-witness-live-read-replay-nimo-compare-handler-upgrade-v1.sh
```

It must run on Nimo as root, with the reviewed `.mjs` candidate already
staged at:

```text
/home/zoso/.local/state/void-replay-compare-handler-upgrade-v1/handler.mjs
```

Preflight checks the Nimo hostname, root-owned non-writable runtime directory,
installed handler owner/group/mode, exact old/new SHA, exact config SHA, exact
three-event replay witness SHA, absence of pending append intent, and the
original two root-owned SSH authorized-key entries.

If the handler is already at the expected new SHA, the script checks syntax
and returns GREEN without replacement. Otherwise it copies the candidate to
a same-directory temporary `*.mjs` file, requires its SHA and syntax to
match, checks the witness again, then uses one atomic `mv -T`.

It rechecks the installed handler SHA and metadata, config, witness,
authorized-key bytes and absent intent after the rename. It does not modify
Nimo's witness/config/keys, sshd, replay state, chain, wallet, or funds.
An abandoned temporary file from the earlier failed upgrade is not automatically
deleted because its provenance has not been reverified.

## Operator staging after this PR merges

On Precision, get the latest reviewed source and materialize **only** the
exact required handler and operator script. Check the handler's Git blob
before transferring it.

```bash
cd ~/dev/void-node
git fetch origin main
test "$(git rev-parse origin/main:tools/void-buy-allocation-custody-witness-live-read-replay-external-forced-command-v1.mjs)" = f066449215cd89522eae1cd251aa10c5594dd210

stage="$HOME/Downloads/void-replay-nimo-compare-handler-upgrade-v1"
install -d -m 0700 "$stage"

git show origin/main:tools/void-buy-allocation-custody-witness-live-read-replay-external-forced-command-v1.mjs > "$stage/handler.mjs"
git show origin/main:tools/void-buy-allocation-custody-witness-live-read-replay-nimo-compare-handler-upgrade-v1.sh > "$stage/upgrade.sh"

test "$(sha256sum "$stage/handler.mjs" | awk '{print $1}')" = 511ffe6ee55e0ef3ac2e8582ffdc94b3d294884408d55c174875fed928a18831
bash -n "$stage/upgrade.sh"
node --check "$stage/handler.mjs"

ssh -tt zoso@nimo 'install -d -m 0700 "$HOME/.local/state/void-replay-compare-handler-upgrade-v1"'
scp "$stage/handler.mjs" "$stage/upgrade.sh" zoso@nimo:/home/zoso/.local/state/void-replay-compare-handler-upgrade-v1/
ssh -tt zoso@nimo 'chmod 0600 "$HOME/.local/state/void-replay-compare-handler-upgrade-v1/handler.mjs" && sudo /bin/bash "$HOME/.local/state/void-replay-compare-handler-upgrade-v1/upgrade.sh"'
```

The `scp` staging directory is unprivileged and **not** the installed runtime.
The root script copies candidate bytes to its own protected same-directory
temporary file and independently verifies their SHA before syntax check and
replacement. The original installed handler survives all failures before
the final atomic rename.

A successful run ends with:

```text
config_unchanged=true
witness_unchanged=true
authorized_keys_unchanged=true
pending_intent=false
VOID_REPLAY_NIMO_COMPARE_HANDLER_UPGRADE_V1_GREEN
```

The next independent gate provisions the separate custody compare-only
client key (PR #2593) and a third, restricted Nimo authorized-key line.
Do not reuse the existing append-capable key for the compare adapter.

Even after the handler upgrade:

```text
server_compare_only_authorization_proven=false
live_policy_enforcement_proven=false
rollback_resistance_proven=false
protected_high_water_custody_proven=false
independent_custody_proven=false
production_gate_ready=false
funds_moved=false
```

## Source-only proof

```bash
bash -n tools/void-buy-allocation-custody-witness-live-read-replay-nimo-compare-handler-upgrade-v1.sh
node scripts/prove_buy_void_allocation_custody_witness_live_read_replay_nimo_compare_handler_upgrade_v1.mjs
git diff --check
```

CI never stages code onto Nimo and never runs the privileged apply path.
