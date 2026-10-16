# Buy VOID protected credential-query V2 -> V3 replacement (repaired lock)

Marker:
`VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_REPLACE_V3R`.

Status: **source/CI only; no Precision replacement is authorized by this
change**.

## Accepted generation

This successor consumes only the canonical repaired V3 lock:

`voidbuyumqcredelflock3r_8b064214e22ce54ac193b426f38b9d6a7ea4cee07b38b68c8d1eeb6c51de6f34`.

Accepted V3 query:
- 47,160 bytes;
- SHA-256
  `d60e5719a4d785dbfaca90074ed3313ef9e0cae84c3f933af44d7faf84763923`.

Installed predecessor V2 query:
- 47,160 bytes;
- SHA-256
  `af02d006176db1a16eee52625751736c63af3bd1b250b46f81f200359fb48718`.

Static preexec remains unchanged:
- 706,504 bytes;
- SHA-256
  `67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c`.

The existing V1 predecessor remains immutable historical evidence.

## State machine

The only admitted forward sequence is:

1. `CREDENTIAL_QUERY_V2_GREEN_WITH_V1_PREDECESSOR_READY_FOR_V3`
2. `CREDENTIAL_QUERY_V3_STAGE_READY_WITH_V2_V1`
3. `CREDENTIAL_QUERY_V3_EXCHANGED_PENDING_V2_PREDECESSOR`
4. `CREDENTIAL_QUERY_V3_GREEN_WITH_V1_V2_PREDECESSORS`

V3 GREEN contains exactly:
- unchanged static preexec;
- V3 current query;
- V1 predecessor at `predecessor-lock-v1`;
- V2 rollback predecessor at `predecessor-lock-v2`.

Rollback restores the exact V2-ready state while leaving V1 untouched.

A rollback exchange may transiently enter:

`CREDENTIAL_QUERY_V2_ROLLBACK_PENDING_V3_CLEANUP`.

Crash residue from private-stage construction is classified separately as:

`CREDENTIAL_QUERY_V3_PRIVATE_PENDING_RECOVERY_REQUIRED`.

All mixed or unknown generations fail closed.

## Preserved hardening

The implementation preserves the merged V1->V2 replacement primitives:

- nonblocking exclusive `flock()` on the stable `/opt` parent;
- descriptor-bound install-root state inspection;
- visible/opened install-root generation revalidation;
- private stage creation with `O_EXCL|O_NOFOLLOW`;
- current-invocation stage inode ownership;
- `renameat2(RENAME_NOREPLACE)` stage publication;
- `renameat2(RENAME_EXCHANGE)` current/predecessor swaps;
- fsync after namespace transitions;
- exact digest/metadata revalidation;
- foreign-inode cleanup refusal;
- crash-state classification and apply/rollback resume;
- automatic failure rollback to the V2-ready state.

The fixed preexec is never replaced.

## Pre-mutation operator authority boundary

Before either `--apply` or `--rollback` calls the protected operation
implementation, the CLI emits a closed `authority_boundary=PRE_MUTATION`
summary.

That summary appears before candidate access, protected-root open, flock,
stage creation, rename/exchange, cleanup, or other protected filesystem
mutation. It states that filesystem mutation is possible for the requested
mode but has not yet been performed, and it keeps query execution, credential
contents, service/systemd mutation, private-key/wallet/signer access,
transaction, payment acceptance, presale/WC activation, treasury/liquidity
action, funds movement, and production host-evidence authority false.

The boundary is informational and does not itself authorize the operation.
The existing exact confirmation token, root requirement, isolated Python
context, accepted-lock verification, and protected-root state machine remain
separate fail-closed gates.

The complete summary is explicitly flushed to stdout before either protected
operation is entered. A flush failure therefore aborts before candidate access
or protected-root mutation rather than allowing the operation to continue with
an unseen boundary.

The focused proof executes the authority emitter against a flush-counting
synthetic stdout and requires exactly one flush after the full summary. It also
executes both operation modes with deliberately wrong confirmation tokens and
requires the pre-mutation authority summary to precede the resulting HOLD.
Source order separately binds the emitter and its flush before the
apply/rollback operation function.

## Operation-bound confirmations

Future apply confirmation:

`ATOMIC_EXCHANGE_ACCEPTED_CREDENTIAL_QUERY_V2_TO_V3`.

Future rollback confirmation:

`ATOMIC_EXCHANGE_ROLLBACK_CREDENTIAL_QUERY_V3_TO_V2`.

Those tokens exist in source but no live operation is authorized by this PR.

## Authority boundary

Hosted CI executes self-test and source-plan only.

No live query, credential-content access, private-key/wallet/signer access,
service/systemd mutation, payment acceptance, transaction construction or
broadcast, public presale/WC activation, treasury/liquidity action, or funds
movement.

A separately authorized Precision read-only plan using the exact accepted V3
query must precede any future protected replacement.

PROTECT THE CORE.
