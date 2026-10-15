# Epoch-2 authenticated credential live composition — native first-entry v1

## Purpose

This successor closes issue #3177 at the **source/review boundary** and is
stacked on the exact sealed-V2 parent from #3180.

Parent head:

\`b58737d2870a621e95385e5a450d0b7109f0f4e9\`

The historical V1 live runner remains frozen. V2 is additive and consumes the
sealed V2 generation-retention receipt introduced by #3180.

## Defect being closed

The V1 operator recipe authenticated the runner Git object in the unprivileged
operator shell and then streamed those bytes through \`sudo\` into:

\`\`\`text
/usr/bin/node --input-type=module -
\`\`\`

That is too late for privileged first-instruction provenance. Arbitrary
caller-selected stdin JavaScript could begin executing as root before any
runner self-check.

## Native first entry

The new source is:

\`\`\`text
ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v1.c
\`\`\`

A future separately reviewed installation has fixed paths:

\`\`\`text
/opt/void-buy-void-epoch2-live-composition-v2/
  void_buy_void_epoch2_live_composition_native_preentry_v1
  void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs
  policy-v1.conf
\`\`\`

The native binary requires:

- root-owned, non-group/world-writable ancestry and leaves;
- its own exact fixed executable path;
- a fixed root-owned policy file opened with \`O_NOFOLLOW\`;
- a fixed root-owned V2 runner opened with \`O_NOFOLLOW\`;
- fixed \`/usr/bin/node\`, also opened with \`O_NOFOLLOW\`;
- the exact runner byte length and SHA-256 from the protected policy;
- the exact Node byte length and SHA-256 from the protected policy;
- the exact accepted source head from the protected policy;
- caller \`--expected-head\` equality with that protected value;
- stdin to be exactly \`/dev/null\`.

Caller-streamed stdin JavaScript is rejected before policy, runner, or Node
execution.

The native process does **not** disappear into Node. It forks a child, retains
its own fixed native process for the complete Node-child lifetime, and enters
Node by retained descriptor only in that child.

Before the child can execute sensitive helpers, the native parent sends one
bounded private proof record over an inherited pipe. That record binds:

- native parent PID and Linux process start-time ticks;
- Node child PID and process start-time ticks;
- fixed installed native preentry device/inode generation;
- fixed installed runner device/inode generation;
- fixed root Node device/inode generation;
- the protected policy's exact expected source head.

The runner separately requires its real PPID to equal the proved parent PID,
requires /proc/<ppid>/exe to resolve to the fixed native preentry, validates
both process start-time generations, and revalidates installed preentry,
runner, and Node generations. The retained runner FD must still identify the
same visible root-owned runner.

The same parent/process/installed-generation proof is revalidated again after
the credential/signing sequence and before receipt output. The focused proof
binds this exact source order: initial native gate, sensitive sequence, final
native-parent revalidation, then receipt output. A caller-visible marker plus a
valid runner FD is therefore insufficient to claim native provenance.

## Policy format

The separately installed root-custodied policy is exact-order, exact-schema:

\`\`\`text
schema=VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V1
expected_head=<40 lowercase hex>
runner_sha256=<64 lowercase hex>
runner_bytes=<positive decimal>
node_sha256=<64 lowercase hex>
node_bytes=<positive decimal>
\`\`\`

The source PR does **not** manufacture a live policy. A later protected
installation must derive these values from the accepted merged generation and
the exact accepted root Node executable, then prove installation custody.

## Sanitized Node entry

The native preentry constructs a new environment rather than inheriting the
operator shell. The Node process receives only the bounded runtime variables
required by the entry contract. In particular, caller-controlled
\`NODE_OPTIONS\`, \`NODE_PATH\`, \`LD_PRELOAD\`, \`LD_LIBRARY_PATH\`, and
\`LD_AUDIT\` are not inherited.

The Node executable is entered by retained descriptor through \`fexecve()\`.
The runner receives its fixed path plus the exact confirm token and
policy-bound expected head; arbitrary caller arguments are not forwarded.

## V2 runner

The additive V2 runner is:

\`\`\`text
ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v2.mjs
\`\`\`

It preserves the V1 composition sequence while replacing the historical sealed
V1 child with #3180's sealed V2 object:

\`\`\`text
scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs
Git blob 14cbe81e27d04fee77cbe75225ce308bf8561a7b
\`\`\`

The child receipt must additionally prove:

- \`version=2\`;
- retained credential generation through signing;
- final-observation generation revalidation;
- immediate pre-close generation revalidation;
- root-owned Node execution context;
- empty Node/native loader environment.

The child truthfully keeps
\`privileged_first_entry_authenticated=false\`: it does not prove its own
privileged ancestry. The outer V2 composition receipt may set
\`privileged_first_entry_authenticated=true\` only after the native preentry
contract has been satisfied.

## Adversarial proof

The focused proof compiles the real native source and installs only the native
test binary into its fixed disposable \`/opt\` location on the hosted runner.

It then supplies arbitrary JavaScript on stdin while also supplying the correct
live-shaped \`--confirm\` and a syntactically valid \`--expected-head\`.
The native program must HOLD with:

\`\`\`text
reason=stdin_javascript_source_forbidden
root_javascript_started=false
\`\`\`

No Node process or credential child is reached.

The root fixture also installs a synthetic exact policy and fixed runner. It
preflights the real fixed `/usr/bin/setpriv` under the runner's root-owned,
non-group/world-writable executable boundary. The fixture first proves that an
absent fixed `/home/zoso/dev/void-node` checkout cwd fails closed, then creates
the fixed checkout parents only inside a namespace-local `/home` overlay.
The host's real `/home/zoso`, `/home/zoso/dev`, ownership and permission
metadata are never created, chowned or chmodded by this proof.

The proof never normalizes or rewrites the host's real `/opt` or `/home`.
The outer unprivileged process copies only its current Node executable into a
disposable user-private bootstrap directory and invokes fixed
`/usr/bin/unshare --mount --fork` through passwordless sudo.

Inside that new mount namespace, the root bootstrap first makes mount
propagation private, bind-mounts the exact hosted checkout to a read-only mirror
under the disposable bootstrap root, then bind-mounts separate root-owned
mode-0755 disposable directories onto namespace-local `/opt` and `/home`.
Only after both overlays are active does it drop back to the original runtime
UID/GID with `/usr/bin/setpriv`, change cwd to the read-only checkout mirror,
construct a closed environment, and re-execute the same proof source. Protected
fixture installation and fixed checkout-parent creation therefore occur only
inside the private namespace. The namespace disappears with the child; the host
`/opt` and `/home` inode/ownership/mode/content state remains unchanged.

No `GITHUB_ACTIONS`, `CI`, `RUNNER_TEMP`, or other caller-controlled
hosted marker grants fixture authority. The internal delegated-child marker is
also insufficient by itself. Before skipping outer namespace creation, the
child must independently prove kernel/process state: its real parent executable
is fixed `/usr/bin/unshare` running as root; its mount-namespace inode differs
from PID 1; namespace-local `/opt` and `/home` match the disposable backing
directory generations derived from the running harness executable; and the
checkout mirror is the expected read-only mount. A caller that merely exports
the internal marker therefore fails before protected fixture writes.

Missing/failed unshare, mount, install, setpriv, sudo, parent provenance, mount
identity, or read-only checkout state fails the proof closed. The private mount
namespace is synthetic proof infrastructure only and does not weaken the
production native ancestry predicate.

A real native `/dev/null` invocation must clear the parent-proof gates,
execute the real runtime-user transition, and reach the later expected Git
checkout HOLD. An ambiguous spawn ENOENT is not accepted as positive-lineage
evidence.

A separate forged direct-root-Node adversary supplies the correct native marker,
a valid retained runner FD, and a syntactically valid forged proof record. It
must still HOLD on fixed parent-executable provenance because its real parent is
not the installed native preentry. This proves caller-controlled marker/FD
state cannot manufacture native origin.

## Static first instruction

The accepted native preentry build must be statically linked and have no
`PT_INTERP`. Hosted proof compiles a dynamic control plus an `LD_PRELOAD`
constructor and requires that constructor to execute for the dynamic control
but remain absent when the native preentry self-test runs under the same hostile
environment. This closes the loader-before-`main()` ambiguity at the privileged
first instruction with fresh proof. The surviving-parent repair is a later source generation and
must receive fresh candidate derivation; predecessor candidate identity cannot
be promoted.

## Authority boundary

This PR is source/proof/docs/CI only.

No live Precision installation or invocation is authorized. In particular:

- protected install performed = false;
- live policy installed = false;
- live credential read = false;
- live private-key access = false;
- live signing = false;
- transaction construction/submission/broadcast = false;
- payment acceptance = false;
- public presale activation = false;
- WC/VOID market activation = false;
- service mutation = false;
- funds movement = false.

After source acceptance, a separate operation-bound installer/receipt must bind
the accepted merged head, runner bytes, compiled native binary, root Node
generation, policy bytes, and protected filesystem custody before any live
credential/signing invocation can be considered.

No live invocation is authorized by this source PR.

PROTECT THE CORE.
