# VOID Public Agent Service Acceptance Persistence Adapter V1

Marker: `VOID_PUBLIC_AGENT_SERVICE_ACCEPTANCE_PERSISTENCE_ADAPTER_V1`

## Purpose

This lane converts the sealed acceptance-materialization replay transition into a bounded local durability adapter. It consumes only an in-process packet that has already passed the sealed consumer contract and requires the exact confirmation `persistVerifiedAcceptanceReplayTransitionV1`.

The source contract is PR #800 merge `525e1c8f6200f1a590de42270d5a08ad21c6281b`, checkpoint `ckpt-public-agent-service-acceptance-materialization-replay-consumer-v1-pr800-post-merge-exact-green-525e1c8f6200`, and source-evidence pack SHA-256 `4c9c495e74d12aa8b07383ee5af55694773f03d654385f9f6296aef5c5d853ec`.

## Authority transition

The sealed upstream packet only plans an in-memory transition and explicitly reports that no production persistence consumer exists. This adapter adds one narrow authority: a caller with an exact verified packet, exact confirmation, and operator-supplied local root may persist the acceptance and replay transition.

A successful commit records, in one generation:

- the acceptance envelope;
- the next replay-state snapshot;
- the replay transaction consuming the requester-authentication ID, provider-authentication ID, and acceptance ID.

The receipt therefore reports acceptance persistence and all three replay writes as true. Payment authorization remains false. Payment execution remains false. Execution authorization remains false. Work dispatch remains false.

## Atomic visibility model

V1 uses an immutable generation plus an atomic current pointer. A generation contains `acceptance.json`, `replay-state.json`, `transaction.json`, and `commit.json`. All generation files are mode `0600`; generation, staging, and store directories are mode `0700`.

The adapter stages and fsyncs all four files, fsyncs the staging directory, atomically renames the staging directory into `generations/<generation_id>`, fsyncs the generations parent, then writes and fsyncs a temporary pointer and atomically renames it to `current.json`. The acceptance and replay state become authoritative together only when the atomic current pointer changes.

A crash before generation publication leaves no generation. A crash after generation publication but before the pointer switch leaves an immutable, unreferenced generation that is not visible as current state. An exact retry may verify and recover that generation. Any mismatch is held.

## Compare-and-swap and replay boundary

The current persisted replay state must exactly equal the packet's before-state. The next state must advance exactly one revision and exactly append the three consumed identities. The quote must not already have an active acceptance. A stale state, replayed identity, conflicting active quote, changed generation, changed pointer, or changed transaction is held without a new pointer.

## Filesystem boundary

The allowed root must be an absolute, existing, canonical, non-symlink directory. V1 uses fixed names beneath that root and proves containment. It rejects symlink roots, symlink pointers, malformed or partial JSON, incorrect permissions, unresolved staging entries, oversized files, generation-count overflow, and lock contention.

The exclusive lock uses `O_EXCL`, `O_NOFOLLOW` where supported, mode `0600`, an operation ID, timestamp, PID, and fsync. V1 removes only the exact lock inode and device it created. It does not automate stale-lock deletion.

## Verified packet boundary

The store does not accept a packet filename or public HTTP request. The caller supplies an in-process provider function. The packet must have the sealed consumer marker, exact source-evidence identity, `acceptance_materialization_planned` status, a canonical acceptance envelope, a valid before/next replay-state transition, a valid transaction ID, a valid plan ID, all upstream authority fields false, and no prior persistence claim.

Production composition must call the sealed consumer verifier and pass its returned packet directly to this adapter in the same process. This lane does not reimplement provider or requester signature verification and does not weaken those upstream requirements.

## Proof scope

Repository proof uses newly created temporary directories only. It proves two sequential commits, pointer replacement, exact duplicate suppression, stale compare-and-swap rejection, active-quote conflict rejection, exclusive-lock contention, crash-before-pointer invisibility, exact orphan recovery, tampered-orphan rejection, `0600` files, `0700` directories, symlink rejection, partial-pointer rejection, unresolved-staging rejection, and generation-count bounds.

The proof performs temporary acceptance and replay persistence only under disposable test roots and removes them before exit. It does not read or write a production acceptance store.

## Explicit non-authority

This lane does not:

- add an HTTP route or modify `src/index.ts`;
- install or restart a service, timer, or worker;
- select a provider;
- issue or change credentials or key bindings;
- access a wallet, key, mnemonic, or signer;
- authorize or execute payment;
- authorize or dispatch work;
- broadcast a transaction;
- award or settle Work Credits;
- mutate Buy VOID, validators, releases, or network runtime;
- configure a production persistence root automatically.

## Six-file boundary

1. `schemas/public-agent-service-acceptance-persistence-adapter-v1.schema.json`
2. `examples/public-agent-service-acceptance-persistence-adapter-v1.example.json`
3. `docs/public-agent/public-agent-service-acceptance-persistence-adapter-v1.md`
4. `scripts/public_agent_service_acceptance_persistence_adapter_v1.ts`
5. `scripts/prove_public_agent_service_acceptance_persistence_adapter_v1.ts`
6. `.github/workflows/public-agent-service-acceptance-persistence-adapter-v1.yml`
