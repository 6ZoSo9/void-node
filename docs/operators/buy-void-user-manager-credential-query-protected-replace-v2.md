# Buy VOID credential-query protected replacement v2

Marker: `VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_REPLACE_V2`.

Status: **source/CI contract only; no Precision mutation is authorized by this
artifact**.

## Purpose

Replace only the installed credential-query ELF at the fixed protected path
inside:

`/opt/void-buy-void-user-manager-credential-query-v1`

while preserving the accepted static preexec and retaining the installed V1
query as predecessor evidence.

The accepted V2 lock is:

`voidbuyumqcredelflock2_c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54`.

Accepted identities:

- static preexec: 706,504 bytes, SHA-256
  `67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c`;
- installed V1 query before replacement: 43,064 bytes, SHA-256
  `7b968a20f1507215477f43a59c5d82b9e9adca918ce5f2df566292d8380b4cb1`;
- accepted V2 query: 47,160 bytes, SHA-256
  `af02d006176db1a16eee52625751736c63af3bd1b250b46f81f200359fb48718`.

The historical query filename remains unchanged because the accepted static
preexec executes that fixed pathname. Only its protected bytes advance from V1
to V2.

## Protected state machine

Before replacement:

`CREDENTIAL_QUERY_V1_GREEN_READY_FOR_V2`

The root contains exactly the accepted static preexec and V1 query.

After replacement:

`CREDENTIAL_QUERY_V2_GREEN_WITH_V1_PREDECESSOR`

The root contains exactly:

- unchanged static preexec;
- accepted V2 bytes at the fixed query pathname;
- retained V1 bytes at
  `void_buy_void_user_manager_private_credential_unit_query_v1.predecessor-lock-v1`.

No staging residue is accepted in either steady state.

## Apply

Apply requires root, Python isolated mode, an injection-free environment, the
exact accepted V2 candidate bytes, and confirmation token:

`ATOMIC_EXCHANGE_ACCEPTED_CREDENTIAL_QUERY_V1_TO_V2`.

The operation creates an exact root-owned 0555 staging file, fsyncs it,
atomically exchanges it with the fixed query using
`renameat2(RENAME_EXCHANGE)`, verifies both generations, then publishes the
old V1 bytes to the predecessor path with `RENAME_NOREPLACE` and re-verifies
the full protected state.

The static preexec is never replaced.

If apply fails after staging or exchange, the script attempts to restore the
exact V1-ready state. It does not retry V2.

Cleanup authority is invocation-bound. Immediately after exclusive stage
creation the updater records the new inode's device/inode identity. Any
pre-publication cleanup or post-exchange rollback may unlink a staging or
predecessor residue only after proving it is that same V2 inode. Merely finding
an exact V2 file at the fixed staging pathname does not grant cleanup authority.

This prevents a second concurrent operator invocation from deleting the first
invocation's exact stage when the second invocation loses the create-only race.
A built-in adversary proves a foreign inode is preserved while the creator's
own inode remains removable.

## Deliberate rollback

Rollback requires the exact V2-green state plus:

`ATOMIC_EXCHANGE_ROLLBACK_CREDENTIAL_QUERY_V2_TO_V1`.

It atomically restores V1, verifies V2 at the predecessor path, removes only
that verified V2 residue, fsyncs, and requires the original V1-ready state.

## Authority boundary

This source does not execute the credential query and does not read credential
contents. It performs no service/systemd action, private-key/signer access,
transaction, payment acceptance, public presale/WC activation, or funds
movement.

A separate actual-host read-only plan and explicit operator authorization are
required before protected replacement.

PROTECT THE CORE.
