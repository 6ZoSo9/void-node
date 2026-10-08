# Nimo replay compare-only SSH authorization v1

## Purpose

This gate follows the GREEN Precision compare-only credential preparation. The
client key (UID 994/GID 981) and Nimo host pin already exist on Precision, but
Nimo has only the original two forced-command authorized-key entries and lacks
the independently restricted compare-only wrapper.

This bounded operator script installs **one fixed compare-only wrapper** and
**one third root-owned SSH authorized-key line** on Nimo. It retains both
existing authorized-key lines byte-for-byte, cannot reuse the append-capable
credential, and leaves replay/witness/config/sshd/runtime signer state untouched.

Script: tools/void-buy-allocation-custody-witness-live-read-replay-nimo-compare-only-authorization-v1.sh

## Pinned prerequisites

Nimo must already have the compare-capable replay handler installed through
the separately reviewed bounded handler-upgrade procedure. This authorization
branch does not perform or authorize that upgrade. The installer HOLDS on the
exact handler SHA until the prerequisite handler upgrade has been separately
merged, installed, and verified.

~~~text
Nimo hostname: Nimo
voidwitness UID:GID: 997:984
installed compare handler SHA256:
511ffe6ee55e0ef3ac2e8582ffdc94b3d294884408d55c174875fed928a18831

existing protected config SHA256:
ab71fa8af4f91529010cf22f219f616460efb9390eaaefe368b18df3ae9292a6

existing Nimo replay witness SHA256:
b1d6cb7d55fb97b48a388b19e230ed272a654f7b924ed786c050d8028c9f761e

new wrapper reviewed Git blob:
309b4de7c40c5b8a21bbc956cc445f6600a33215

new Precision custody compare-only public-key fingerprint:
SHA256:8NrrP3xxlMTcJEDYgNE+8DWMm1Z6zxFW5FpHWdk0EGI
~~~

All existing protected files must have the exact expected ownership/modes.
The original root-owned authorized_keys file must have exactly two entries,
or exactly three with the third entry matching the fixed command/key byte for
byte (idempotent case). Any other state HOLDS.

## Fixed Nimo stage

The script is Nimo-only, run as root with no arguments. It requires these
non-symlinked files in the unprivileged operator's Nimo staging directory:

~~~text
/home/zoso/.local/state/void-replay-compare-only-nimo-auth-v1/
    wrapper.mjs
    id_ed25519.pub
    authorize.sh
~~~

The unprivileged stage is transport only and is never a privileged execution
location. The installer itself must first be copied to the fixed root-owned path:

~~~text
/root/.void-replay-compare-only-nimo-authorization-v1.sh
~~~

and must be root:root mode 0500 with link count 1. The reviewed installer Git
blob for this generation is:

~~~text
d35187688ae570a85db68c9334d20f5be12a467d
~~~

The root-controlled copy is verified against that exact Git blob before Bash
executes it. The installer additionally HOLDS unless its own resolved path and
metadata match the fixed root-owned path, so the previous staged sudo-Bash
invocation cannot pass.

The installer verifies the complete wrapper against the reviewed Git blob and
passes its .mjs syntax check. The staged compare public key is copied once into
a root-owned mode-0400 snapshot under /root; fingerprint and canonical-line
validation are performed on that exact snapshot, and the exact public bytes
consumed for the third authorized-key line come from the same snapshot. A
same-UID replacement of the unprivileged staged key after snapshot creation
cannot change the installed key. No private key is staged or transferred.

## Atomic apply and postcheck

The wrapper is installed root:root mode 0555 at:

~~~text
/usr/local/libexec/void-replay-witness-v1/void/void-buy-allocation-custody-witness-live-read-replay-compare-only-forced-command-v1.mjs
~~~

The new key's root-controlled third entry invokes only the fixed wrapper: The forced command starts Node with
`/usr/bin/env -i` and an explicit PATH/LANG/LC_ALL/HOME/marker allowlist.
It preserves the actual SSH original command as a quoted environment value,
so the wrapper still rejects caller-supplied remote commands while refusing
inherited `NODE_OPTIONS`, `NODE_PATH` or other ambient settings.
The authorized-key quoted command escapes its nested quotes exactly.


~~~text
restrict,command="/usr/bin/env -i PATH=/usr/bin:/bin LANG=C LC_ALL=C HOME=/var/lib/voidwitness VOID_BUY_VOID_REPLAY_COMPARE_ONLY_FORCED_COMMAND_V1=1 SSH_ORIGINAL_COMMAND=\"${SSH_ORIGINAL_COMMAND-}\" /usr/bin/node /usr/local/libexec/void-replay-witness-v1/void/void-buy-allocation-custody-witness-live-read-replay-compare-only-forced-command-v1.mjs" ssh-ed25519 <new-custody-compare-public-key> void-replay-compare-only-v1
~~~

The script stages the updated authorized_keys in the same directory, checks
the exact two-line prefix, and atomically replaces the file.
It records the rollback obligation **before** the rename; HUP/TERM/INT
lead to the EXIT cleanup path. If publication is interrupted after the
atomic rename, that cleanup must either restore the backed-up authorization
through a verified atomic replacement or retain the recovery backup and
issue a manual-restore HOLD. The script never treats an incomplete
publication as a verified GREEN. On a post-commit
failure it attempts to restore from a separately preserved backup using a new
same-directory restore candidate. The backup is deleted only after verified
successful restore or a completed successful installation. If the backup bytes
do not match the original authorization, or the restore rename/verification
cannot complete, the installer HOLDS and prints both:

~~~text
URGENT_AUTHORIZED_KEYS_MANUAL_RESTORE_REQUIRED=true
AUTHORIZED_KEYS_RECOVERY_BACKUP=<root-owned backup path>
~~~

The recovery backup is intentionally preserved on that path for manual
restoration; cleanup must not delete the only recovery copy.

No sshd configuration change or reload is required. The two previous
witness keys remain valid and retain their original forced commands.

The installer proves **installation**, not authenticated authorization or
production enforcement. After GREEN, a separately reviewed Precision
read-only test must:

1. compare against exact Precision replay sequence 2 and require canonical
   "matched" through the new key, using the pinned Nimo host key;
2. attempt "read" and "append" with that **same new key** and require
   rejection without any data mutation;
3. verify Nimo's three-event witness SHA and original keys remain unchanged.

The SSH key used for this ceremony belongs to the replay-compare transport
only; it has no wallet/signer privilege.

## Operator materialization

On Precision, after merge to main and exact Git-object preflight:

~~~bash
set -Eeuo pipefail
cd ~/dev/void-node
git fetch origin main

wrapper_blob=309b4de7c40c5b8a21bbc956cc445f6600a33215
installer_blob=d35187688ae570a85db68c9334d20f5be12a467d
installer_path=tools/void-buy-allocation-custody-witness-live-read-replay-nimo-compare-only-authorization-v1.sh

test "$(git rev-parse "origin/main:$installer_path")" = "$installer_blob"

stage="$HOME/Downloads/void-replay-compare-only-nimo-auth-v1"
install -d -m 0700 "$stage"

git show origin/main:tools/void-buy-allocation-custody-witness-live-read-replay-compare-only-forced-command-v1.mjs > "$stage/wrapper.mjs"
git show "origin/main:$installer_path" > "$stage/authorize.sh"

test "$(git hash-object "$stage/wrapper.mjs")" = "$wrapper_blob"
test "$(git hash-object "$stage/authorize.sh")" = "$installer_blob"
bash -n "$stage/authorize.sh"
node --check "$stage/wrapper.mjs"
sudo cat /var/lib/void-replay-compare-transport-v1/id_ed25519.pub > "$stage/id_ed25519.pub"

ssh -tt zoso@nimo 'install -d -m 0700 "$HOME/.local/state/void-replay-compare-only-nimo-auth-v1"'
scp "$stage/wrapper.mjs" "$stage/authorize.sh" "$stage/id_ed25519.pub" \
  zoso@nimo:/home/zoso/.local/state/void-replay-compare-only-nimo-auth-v1/

ssh -tt zoso@nimo '
set -Eeuo pipefail
src=/home/zoso/.local/state/void-replay-compare-only-nimo-auth-v1/authorize.sh
trusted=/root/.void-replay-compare-only-nimo-authorization-v1.sh
expected_blob=d35187688ae570a85db68c9334d20f5be12a467d

[[ "$(sudo /usr/bin/stat -c "%u:%g:%a:%F" /root)" == "0:0:700:directory" ]] || exit 2

if sudo /usr/bin/test -e "$trusted" || sudo /usr/bin/test -L "$trusted"; then
  sudo /usr/bin/test ! -L "$trusted" || exit 2
  [[ "$(sudo /usr/bin/stat -c "%u:%g:%a:%h:%F" "$trusted")" == "0:0:500:1:regular file" ]] || exit 2
  [[ "$(sudo /usr/bin/git hash-object "$trusted")" == "$expected_blob" ]] || exit 2
else
  sudo /usr/bin/install -o 0 -g 0 -m 0500 -- "$src" "$trusted"
  if [[ "$(sudo /usr/bin/stat -c "%u:%g:%a:%h:%F" "$trusted")" != "0:0:500:1:regular file" ]] ||
     [[ "$(sudo /usr/bin/git hash-object "$trusted")" != "$expected_blob" ]]; then
    sudo /usr/bin/rm -f -- "$trusted"
    exit 2
  fi
fi

sudo /usr/bin/env -i HOME=/root PATH=/usr/sbin:/usr/bin:/sbin:/bin LANG=C LC_ALL=C /bin/bash --noprofile --norc "$trusted"
'
~~~

The verified root-owned installer is executed only through `sudo /usr/bin/env -i`
with fixed `HOME=/root`, system `PATH`, `LANG=C`, and `LC_ALL=C`, followed by
`/bin/bash --noprofile --norc`. No caller `BASH_ENV`, `ENV`, `SHELLOPTS`,
`BASHOPTS`, `CDPATH`, exported shell function, Node option, or other ambient
startup variable is preserved into privileged Bash.

The current Nimo handler may still be old because a previous attempt
stopped at a temporary file with an unrecognized extension. If the installer
HOLDS at compare_handler_upgrade_required, run the separately merged handler
upgrade first, then retry this idempotent installer. Never bypass the exact
handler SHA check.

## Deliberate authority limits

~~~text
server_compare_only_authorization_proven=false
live_authenticated_compare_proven=false
live_policy_enforcement_proven=false
rollback_resistance_proven=false
protected_high_water_custody_proven=false
independent_custody_proven=false
production_gate_ready=false
funds_moved=false
~~~

These stay false even after an installation GREEN until independent
authenticated negative/positive transport tests and exclusive guarded-writer
runtime qualification succeed.

## Source-only proof

~~~bash
bash -n tools/void-buy-allocation-custody-witness-live-read-replay-nimo-compare-only-authorization-v1.sh
node scripts/prove_buy_void_allocation_custody_witness_live_read_replay_nimo_compare_only_authorization_v1.mjs
git diff --check
~~~

CI executes --help and syntax/static guard checks, never the privileged Nimo
installer path.
