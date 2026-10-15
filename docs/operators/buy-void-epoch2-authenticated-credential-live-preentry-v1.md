# Buy VOID Epoch-2 authenticated live composition privileged pre-entry v1

Marker: `VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_PREENTRY_V1`.

Status: **source/build/CI trust-boundary contract only**. No Precision installation
or live credential execution is authorized by this source lane.

## Problem closed in source

The historical live-composition command streamed a repository Git object into
root `node --input-type=module -`. Once Node had begun evaluating caller-supplied
stdin, checking `process.argv[1] === "-"` could not authenticate bytes that had
already executed as root.

This generation removes caller stdin from the privileged source authority.

## V2 runner

The versioned runner is:

`ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs`

It consumes the merged sealed V2 credential probe from #3180, including retained
credential-generation facts, and rejects the frozen sealed V1 schema.

A live V2 runner also requires its parent process executable to be the fixed
root-custodied native pre-entry inode before any root Git/Python/Node/setpriv
helper execution. Direct file execution and direct root Node/stdin execution
therefore HOLD.

The exact current source generation is bound by:

- runner Git blob: `12a64ab00c08ad6996ddbf0aeea344075126f67a`;
- runner bytes: `24,409`;
- runner SHA-256:
  `3acc6757090779ce318912a51eca5a8db6bee8adcd0c8f856382124f3fed1b6c`;
- sealed V2 Git blob: `14cbe81e27d04fee77cbe75225ce308bf8561a7b`.

## Native first entry

Future installation paths are fixed beneath:

`/opt/void-buy-void-epoch2-live-composition-v2`

The reviewed native source requires:

- its own executable to resolve exactly to the fixed installed pre-entry path;
- root-owned, non-group/world-writable ancestry and fixed files;
- fixed `/usr/bin/node`, opened no-follow and retained for descriptor execution;
- the runner as a root-owned, single-link, non-executable mode-0444 file;
- exact runner byte count and internal SHA-256 match before Node is forked;
- exact `--run --confirm ... --expected-head <40-lower-hex>` argument shape;
- a closed child environment with no caller loader/Node variables;
- a private pipe replacing child stdin; caller stdin is never read or forwarded;
- unrelated inherited child file descriptors closed before `fexecve`;
- the native process remains the Node parent until child exit.

The parent streams only the already-authenticated retained runner descriptor into
Node. Path replacement after authentication therefore cannot substitute the
executed JavaScript bytes.

## Hosted adversaries

The focused proof:

- compiles the native entry statically with warnings-as-errors;
- proves the internal SHA-256 implementation against the standard `abc` vector;
- uses a real `LD_PRELOAD` constructor as a dynamic positive control and requires
  the static pre-entry self-test to remain unpoisoned;
- verifies the V2 runner self-test/plan and closed schema;
- binds exact source blobs and exact runner SHA-256.

The root fixture additionally installs only disposable CI copies at the fixed
`/opt` paths and requires:

- a same-size tampered runner to fail at the native digest gate;
- direct root `node -` execution of the authentic runner to fail the native-parent
  identity check;
- hostile caller stdin passed to the native pre-entry to remain unexecuted.

The fixture does not contain live VOID credentials and does not run on Precision.

## Remaining gates

This source lane does **not** prove an installed Precision generation. A later
create-only installer/candidate-lock and installed-host qualification must bind
the exact native binary and runner bytes before any live invocation.

Downstream #3176/#3179/#3183 generations remain historical V1 composition until
separately versioned V2 successors consume a qualified first-entry receipt.

Still false:

- `privileged_first_entry_installation_proven=false`;
- live credential/key/signer authority;
- transaction construction/signing/submission/broadcast;
- payment acceptance;
- public presale/WC activation;
- production-host authority;
- funds movement.

PROTECT THE CORE.
