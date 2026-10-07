# Buy VOID allocation custody witness live-read replay guarded compare writer v1

## Goal

The live Nimo replay witness compare now reports \`matched\` for Precision
sequence 2, but a separate preflight does not protect a later writer call
against a stale state or intervening replay publication.

This source-only lane adds a strict compare-packet classifier plus **additive**
guarded issue and terminal writer APIs. It does **not** install or invoke SSH,
read production replay files, change the current witness, change a service,
activate the presale, use keys, or move funds.

## Canonical compare packet

\`classifyBuyVoidAllocationCustodyWitnessLiveReadReplayComparePacketV1\`
accepts raw bytes for:

- the current Precision replay journal and high-water;
- the exact canonical \`compare\` request sent to Nimo; and
- Nimo's canonical, operation-specific compare response.

The classifier independently verifies the local replay high-water binding,
exactly rebinds both base64 request payloads to that local state, checks
canonical single-line JSON, exact request/response schema and request IDs,
and enforces consistent sequence/event-count semantics. Only a \`matched\`
response is eligible.

\`witness_ahead\`, \`local_ahead\`, malformed or extra fields, packet mismatch,
server-side recovery, a response claiming transport authentication, and all
nonmatching or incomplete responses HOLD.

A pure packet is **not proof of authenticated transport**. The parser reports
\`authenticated_transport_proven=false\` and does not itself admit a production
mutation. A trusted executor must own SSH execution, host-key pins and
credentials before this packet can be used as an operational precondition.

## Locked writer gate

The additive APIs are:

- \`persistBuyVoidAllocationCustodyWitnessLiveReadReplayGuardedIssueV1\`
- \`persistBuyVoidAllocationCustodyWitnessLiveReadReplayGuardedTerminalV1\`

They accept a synchronous \`compare_live\` callback supplied by an eventual
trusted transport executor. Within the existing dual-root bakery lock, the
writer:

1. HOLDS if either root already has a durable publication intent, **before
   any recovery may mutate state**.
2. Reads and canonically verifies the protected local journal/high-water.
3. Calls \`compare_live\` while both roots remain locked, passing exact
   read-only copies of the local bytes.
4. Validates its raw compare request/response via the packet classifier.
5. Rechecks intent absence and exact local bytes again under the same locks.
6. Only then invokes the existing canonical writer planner and atomic
   publication transaction.

A missing compare callback, compare transport failure, nonmatching packet,
local state change, or pending intent fails closed before a new publication.
Crash recovery with an existing intent is deliberately a separate operator
action; this guarded path never silently recovers and writes under an
unverified witness state.

## Authority boundary

The pre-existing unguarded writer entry points remain unchanged for current
callers and existing proofs. Until the runtime is migrated exclusively to the
guarded entry points **and** the callback is owned by a pinned authenticated
SSH transport executor, this lane is **not** proof that production mutations
cannot bypass Nimo.

These remain false:

\`\`\`text
guarded_compare_transport_origin_proven=false
unguarded_entrypoints_retired=false
runtime_guard_integration=false
authenticated_transport_proven=false
rollback_resistance_proven=false
protected_high_water_custody_proven=false
independent_custody_proven=false
production_gate_ready=false
funds_movement=false
\`\`\`

The live Nimo comparison observed on 2026-10-07 was an authenticated
\`matched\` at replay sequence 2, with no mutation; that observation does not
by itself make caller-provided compare packets trusted.

## Next gate

Create a narrow designated-host executor with pinned Nimo SSH credentials
accessible to its execution identity, a fail-closed transport timeout, no
caller-selected host or witness path, and one exclusive guarded writer path.
Its execution receipt must prove that the exact live compare callback ran
while the writer held both replay locks and that the post-mutation state was
subsequently anchored to Nimo. Only after that runtime and privilege boundary
has been installed and independently exercised can enforcement flags be
considered.

Do not run another live replay issue/consume merely to prove this source
layer. No destructive live rollback test is required.

## Focused proof

\`\`\`bash
npm run typecheck
npm run build
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_guarded_compare_writer_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_writer_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_live_read_replay_high_water_v1.ts
node scripts/prove_buy_void_allocation_custody_witness_live_read_replay_external_forced_command_v1.mjs
git diff --check
\`\`\`

The guarded proof uses only isolated temporary storage and synthetic
compare packets. It tests matched issue/consume, both ahead directions,
request-ID or base64 mismatch, server authority overclaim, callback failure,
noncanonical response, missing callback, and pending-intent pre-recovery hold.
