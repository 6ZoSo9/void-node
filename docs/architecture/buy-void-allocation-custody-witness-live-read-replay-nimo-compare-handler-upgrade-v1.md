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

**Do not execute `upgrade.sh` with sudo from a user-writable staging
directory.** That script is itself privileged code. Its reviewed Git blob and
SHA-256 must be checked on Precision; once copied to Nimo it must be installed
into a root-owned, non-user-writable path and rechecked there **before**
`sudo /bin/bash` is used. The handler candidate remains a separate
unprivileged staged input; the trusted script validates its SHA-256 before
installing the handler.

The reviewed operator-script identity for this generation is:

```text
Git blob SHA-1: 03c99e0a8c1df6671e5d92f9535ebfa9682f74d2
SHA-256: 8417af2410d1cad31ac5976f0aa49df06b3586f7ddb19613df8dd39d43b06d4f
```

On Precision, fetch the reviewed source and stage the exact handler and
operator script:

```bash
set -Eeuo pipefail
cd ~/dev/void-node
git fetch origin main
test "$(git rev-parse origin/main:tools/void-buy-allocation-custody-witness-live-read-replay-external-forced-command-v1.mjs)" = f066449215cd89522eae1cd251aa10c5594dd210
test "$(git rev-parse origin/main:tools/void-buy-allocation-custody-witness-live-read-replay-nimo-compare-handler-upgrade-v1.sh)" = 03c99e0a8c1df6671e5d92f9535ebfa9682f74d2

stage="$HOME/Downloads/void-replay-nimo-compare-handler-upgrade-v1"
install -d -m 0700 "$stage"

git show origin/main:tools/void-buy-allocation-custody-witness-live-read-replay-external-forced-command-v1.mjs > "$stage/handler.mjs"
git show origin/main:tools/void-buy-allocation-custody-witness-live-read-replay-nimo-compare-handler-upgrade-v1.sh > "$stage/upgrade.sh"

test "$(sha256sum "$stage/handler.mjs" | awk '{print $1}')" = 511ffe6ee55e0ef3ac2e8582ffdc94b3d294884408d55c174875fed928a18831
test "$(sha256sum "$stage/upgrade.sh" | awk '{print $1}')" = 8417af2410d1cad31ac5976f0aa49df06b3586f7ddb19613df8dd39d43b06d4f
bash -n "$stage/upgrade.sh"
node --check "$stage/handler.mjs"

ssh -tt zoso@nimo 'install -d -m 0700 "$HOME/.local/state/void-replay-compare-handler-upgrade-v1"'
scp "$stage/handler.mjs" "$stage/upgrade.sh" zoso@nimo:/home/zoso/.local/state/void-replay-compare-handler-upgrade-v1/

ssh -tt zoso@nimo '
set -Eeuo pipefail
umask 077
src=/home/zoso/.local/state/void-replay-compare-handler-upgrade-v1/upgrade.sh
trusted=/root/.void-replay-nimo-compare-handler-upgrade-v1.sh
expected=8417af2410d1cad31ac5976f0aa49df06b3586f7ddb19613df8dd39d43b06d4f
[[ "$(sudo /usr/bin/stat -c "%u:%g:%a:%F" /root)" == "0:0:700:directory" ]] || exit 2
if sudo /usr/bin/test -e "$trusted" || sudo /usr/bin/test -L "$trusted"; then
  sudo /usr/bin/test ! -L "$trusted" || exit 2
else
  sudo /usr/bin/install -o 0 -g 0 -m 0500 -- "$src" "$trusted"
fi
[[ "$(sudo /usr/bin/stat -c "%u:%g:%a:%h:%F" "$trusted")" == "0:0:500:1:regular file" ]] || exit 2
echo "$expected  $trusted" | sudo /usr/bin/sha256sum --status -c - || exit 2
sudo /usr/bin/env -i PATH=/usr/bin:/bin HOME=/root LANG=C LC_ALL=C /bin/bash --noprofile --norc "$trusted"
'
```

The `scp` staging directory is unprivileged and **never** a trusted
privileged-script execution location. The fixed trusted copy lives under
root-owned mode-`0700` `/root`, has exact root/root mode-`0500` metadata,
and is verified against its reviewed source SHA-256 before invocation.
The privileged Bash process starts via `/usr/bin/env -i` with only
`PATH=/usr/bin:/bin`, `HOME=/root`, `LANG=C` and `LC_ALL=C`, plus
`--noprofile --norc`. This prevents an ambient `BASH_ENV` (if preserved
by an unusual sudo environment policy) from sourcing unreviewed code before
the pinned operator script runs. Environment isolation is a source-level
launch requirement, not evidence that Nimo's live sudo policy was examined.
An existing trusted copy with unknown bytes or metadata HOLDS rather than being
silently overwritten. Nimo does not run a shell script directly from
`/home/zoso` with `sudo`.

Once invoked from the verified root-controlled path, the root script copies
handler candidate bytes to its own protected same-directory temporary file,
independently verifies the handler SHA, checks syntax, and then performs the
reviewed single atomic replacement. The original installed handler survives
all failures before that final atomic rename.

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
