# Buy VOID replay Nimo compare-only forced-command v1

## Purpose

The guarded replay writer from PR #2584 can only be operationally trusted
after its SSH compare callback is authenticated and cannot use the existing
append-capable operator credential. The pinned SSH compare adapter from
PR #2586 requires a *new* independent key. This source-only wrapper defines
the corresponding narrow Nimo forced-command restriction.

The wrapper permits **only** a canonical replay \`compare\` request and
dispatches it to the existing, already-reviewed Nimo witness handler using a
fixed executable, fixed config path and fixed environment.

It is not an installer. It creates no key, edits no \`authorized_keys\`,
changes no sshd settings, invokes no live SSH, opens no replay wallet/signing
key, constructs no transaction, and changes no witness state in CI.

## Server boundary

The source entry point is:

\`\`\`text
tools/void-buy-allocation-custody-witness-live-read-replay-compare-only-forced-command-v1.mjs
\`\`\`

The server-side forced command must execute this file as Nimo's existing
\`voidwitness\` UID 997 / GID 984, with:

\`\`\`text
VOID_BUY_VOID_REPLAY_COMPARE_ONLY_FORCED_COMMAND_V1=1
SSH_ORIGINAL_COMMAND empty
zero positional arguments
\`\`\`

It refuses \`read\`, \`append\`, malformed requests, unknown fields, noncanonical
JSON, invalid base64 or a noncompare operation before spawning the existing
handler. The request is bounded to 12 MiB and must contain exactly one
canonical JSON line with the same schema as the reviewed replay forced
command. The replay journal can have empty base64 at genesis, but the
high-water record cannot be empty.

The child invocation is fixed:

\`\`\`text
/usr/bin/node
  /usr/local/libexec/void-replay-witness-v1/void/void-buy-allocation-custody-witness-live-read-replay-external-forced-command-v1.mjs
  --config=/etc/void/buy-void-allocation-custody-witness-live-read-replay-external-forced-command-v1.json
\`\`\`

The wrapper discards the incoming process environment for the child and sets
only:

\`\`\`text
PATH=/usr/bin:/bin
LANG=C
LC_ALL=C
HOME=/var/lib/voidwitness
VOID_BUY_VOID_REPLAY_EXTERNAL_WITNESS_FORCED_COMMAND_V1=1
SSH_ORIGINAL_COMMAND=
\`\`\`

It uses \`spawnSync\`, no shell, a 10-second child timeout and a 64-KiB output
cap. A **separate 20-second total SSH-stdin read deadline** begins before the
child can start. If the peer supplies no EOF or drip-feeds an incomplete
request past that bound, the wrapper aborts the stream and HOLDs without
spawning the child. The incoming 12-MiB size bound remains independent of
this time bound. Nonzero exit, signal, error, unexpected stderr, malformed response,
request ID mismatch, attempted recovery/write, or any authority overclaim
HOLDS. Matched, local-ahead and witness-ahead responses are returned to the
client with their exact canonical status; only the **client guarded writer**
can interpret \`matched\` as a source packet eligible for mutation.

Nimo's existing handler performs server-controlled witness identity checks
and canonical full-history comparison. The wrapper does not accept any
caller-selected witness path or config.

## Independent compare-only key

A future audited operator procedure must generate an independent SSH key for
the Precision custody identity (UID 994/GID 981), install its private key at
the adapter's fixed path, and add **one distinct root-controlled** public-key
entry to Nimo's \`/etc/ssh/authorized_keys/voidwitness\` file. That entry must
enforce this wrapper as its own forced command and disable user-supplied
shell/subsystem, PTY, forwarding and agent behavior.

Do **not** copy or repurpose the currently installed replay
append-capable operator credential. Do **not** modify or remove the two
already-working Nimo witness authorized-key entries. No such key, path or
authorization is installed by this PR.

The eventual operator gate must separately prove that the restricted public
key cannot call \`append\` or \`read\`, that the new key can return a canonical
\`matched\` compare for replay sequence 2, and that both Precision replay and
Nimo's witness remain byte-identical.

## Authority boundary

Source GREEN means the forced-command wrapper's compare-only dispatch
contract and failure behavior pass isolated tests. It is not evidence that
Nimo sshd is enforcing the new key or that all Precision replay mutation
entry points are guarded.

These remain false:

\`\`\`text
live_nimo_installed=false
server_compare_only_authorization_proven=false
trusted_transport_authenticated=false
runtime_guard_integration=false
unguarded_entrypoints_retired=false
rollback_resistance_proven=false
protected_high_water_custody_proven=false
independent_custody_proven=false
production_gate_ready=false
funds_movement=false
\`\`\`

## Focused proof

\`\`\`bash
npm run typecheck
npm run build
node --check tools/void-buy-allocation-custody-witness-live-read-replay-compare-only-forced-command-v1.mjs
node scripts/prove_buy_void_allocation_custody_witness_live_read_replay_compare_only_forced_command_v1.mjs
node scripts/prove_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_v1.mjs
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_ssh_compare_adapter_v1.ts
git diff --check
\`\`\`

The proof uses a mock child process with no SSH/network access. It tests
silent and continuous drip-feed inputs without EOF against a short injected
test deadline, with zero child executions on timeout and one exact child
execution for a complete valid request. It also tests
exact fixed child args/environment, canonical request/response, compare
matched/local-ahead/witness-ahead, attempts to append/read, command and
identity injection, parser bypass, child failure, signal, timeout, stderr,
authority overclaims, and negative runtime/economic flags.

A later installation and live compare must be reviewed separately before any
claim of server-side compare-only authorization or rollback enforcement.
