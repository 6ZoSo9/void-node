# Nimo replay compare handler upgrade v2 — existing third-key admission

## Why v2 exists

The reviewed Nimo handler-only upgrade v1 requires exactly two entries in
\`/etc/ssh/authorized_keys/voidwitness\`. The separate compare-only
authorization installer intentionally installs a **third** strictly limited
entry and a root-owned compare wrapper. If that independent authorization
runs before the handler upgrade, the v1 \`authorized_key_count_changed\`
check HOLDS. Removing that extra key merely to satisfy the old installer is
not permitted.

V2 retains the exact reviewed handler SHA and storage/config identity pins,
but admits either:

1. exactly two existing SSH authorized-key entries, or
2. exactly three entries, **only when** entry three is byte-for-byte the
   command restriction constructed by the reviewed compare-only authorization
   source, has the pinned compare-only public-key fingerprint, and targets the
   installed exact reviewed root-owned compare-only wrapper.

Any other count, third-key fingerprint/command drift, absent/unreviewed
wrapper, changed witness/config, or pending append intent HOLDS before handler
replacement. This is **not** an authorization-file repair. It neither changes
nor reloads SSH authorization and does not rewrite witness/replay state.

## Files and trust binding

Reviewed candidate handler:

\`\`\`text
Git blob: f066449215cd89522eae1cd251aa10c5594dd210
SHA256:   511ffe6ee55e0ef3ac2e8582ffdc94b3d294884408d55c174875fed928a18831
\`\`\`

Original installed handler SHA:

\`\`\`text
65f8de9b659c151caf4d73a93d31da3d523a77cf5a7b6ced26c42b12b7d2d3f
\`\`\`

The V2 operator script is:

\`\`\`text
tools/void-buy-allocation-custody-witness-live-read-replay-nimo-compare-handler-upgrade-v2.sh
Git blob: f9db17f3489da25865febef2478998e5072168cc
\`\`\`

After merging this PR, pin that exact blob when staging it.

The third-key validation requires:

\`\`\`text
wrapper Git blob:
309b4de7c40c5b8a21bbc956cc445f6600a33215

compare-only public key fingerprint:
SHA256:8NrrP3xxlMTcJEDYgNE+8DWMm1Z6zxFW5FpHWdk0EGI
\`\`\`

The wrapper must be root/root, mode \`0555\`, single-link and regular,
and its source blob and Node syntax must match. The installer constructs the
entire third \`restrict,command=...\` line using the same template as the
reviewed compare-only installer, including the fixed \`/usr/bin/env -i\`
environment and \`SSH_ORIGINAL_COMMAND\` escape. Fingerprint alone does not
authorize an extra key.

The script itself must run as root on Nimo **only** at:

\`\`\`text
/root/.void-replay-nimo-compare-handler-upgrade-v2.sh
\`\`\`

with mode \`0500\`, single link, owned by root/root, under root-owned mode
\`0700\` \`/root\`. A user-writable path is never trusted as privileged code.
Privileged Bash must start from the fixed empty environment, not inherit
\`BASH_ENV\`, \`ENV\`, \`SHELLOPTS\`, shell functions, or arbitrary caller state.

The handler candidate may remain in its previous unprivileged staging path:
the root installer verifies the candidate SHA before and after copying it
into a protected same-directory temporary \`*.mjs\` file. It checks syntax
there and atomically renames only over the handler after exact prechecks.

## Safe operator handoff after this PR merges

On Precision:

\`\`\`bash
set -Eeuo pipefail
repo="$HOME/dev/void-node"
rel="tools/void-buy-allocation-custody-witness-live-read-replay-nimo-compare-handler-upgrade-v2.sh"
expected="f9db17f3489da25865febef2478998e5072168cc"

git -C "$repo" fetch origin main
test "$(git -C "$repo" rev-parse "origin/main:$rel")" = "$expected"

stage="$HOME/Downloads/void-replay-nimo-handler-upgrade-v2"
install -d -m 0700 "$stage"
git -C "$repo" show "origin/main:$rel" > "$stage/upgrade-v2.sh"
test "$(git hash-object "$stage/upgrade-v2.sh")" = "$expected"
bash -n "$stage/upgrade-v2.sh"
bash "$stage/upgrade-v2.sh" --help

scp "$stage/upgrade-v2.sh" \
  zoso@nimo:/home/zoso/.local/state/void-replay-compare-handler-upgrade-v1/upgrade-v2.sh
\`\`\`

Then use this Nimo root-pinned handoff, never
\`sudo bash /home/zoso/.../upgrade-v2.sh\`:

\`\`\`bash
ssh -tt zoso@nimo '
set -Eeuo pipefail
umask 077
src=/home/zoso/.local/state/void-replay-compare-handler-upgrade-v1/upgrade-v2.sh
trusted=/root/.void-replay-nimo-compare-handler-upgrade-v2.sh
expected=f9db17f3489da25865febef2478998e5072168cc
test "$(git hash-object "$src")" = "$expected"
sudo -v
test "$(sudo stat -c "%u:%g:%a:%F" /root)" = "0:0:700:directory"
if sudo test -e "$trusted" || sudo test -L "$trusted"; then
  sudo test ! -L "$trusted"
else
  sudo install -o 0 -g 0 -m 0500 -- "$src" "$trusted"
fi
test "$(sudo stat -c "%u:%g:%a:%h:%F" "$trusted")" = "0:0:500:1:regular file"
test "$(sudo git hash-object "$trusted")" = "$expected"
sudo /usr/bin/env -i HOME=/root PATH=/usr/sbin:/usr/bin:/sbin:/bin \
  LANG=C LC_ALL=C /bin/bash --noprofile --norc "$trusted"
'
\`\`\`

The script must still HOLD if it encounters an unrecognized third SSH key.
Do not use this handoff until CI is green and the PR is merged.

## Proof

\`\`\`bash
bash -n tools/void-buy-allocation-custody-witness-live-read-replay-nimo-compare-handler-upgrade-v2.sh
node scripts/prove_buy_void_allocation_custody_witness_live_read_replay_nimo_compare_handler_upgrade_v2.mjs
git diff --check
\`\`\`

The source proof binds the exact third-line template to the reviewed
authorization script, root execution path, wrapper fingerprint/blob, negative
authorization mutation flags, and original handler pre/postchecks.

## Authority boundary

A successful V2 handler replacement does **not** prove that the separate
compare-only key works remotely or that every restore/mutation path enforces
second control.

\`\`\`text
witness_mutation=false
authorized_keys_mutation=false
config_mutation=false
replay_mutation=false
live_authenticated_compare_proven=false
live_policy_enforcement_proven=false
rollback_resistance_proven=false
protected_high_water_custody_proven=false
independent_custody_proven=false
production_gate_ready=false
funds_moved=false
\`\`\`

The next operator step is an authenticated, read-only compare through the
separate key, requiring \`matched\` at the current Precision replay sequence.
