# Credential-request PROXY-v2 durable rate state v1

Marker: `VOID_AGENT_CREDENTIAL_REQUEST_PROXY_V2_RATE_STATE_V1`.

Issue: #2400.

This source component reuses the merged branded PROXY-v2 source identity and
rate planner. It serializes admissions within one adapter process and persists
the admitted source event **before** returning an allow decision, so a caller
cannot be forwarded first and only later debit its rate bucket.

State is a bounded canonical JSON snapshot in an operator-selected absolute
path. The parent directory must already be canonical, owned by the adapter UID
and private (no group/world permission). Existing state files must be regular,
single-link, same-UID and private. Reads use `O_NOFOLLOW` plus stable
before/after descriptor metadata. Successful admissions are written to a
create-only private temporary file, fsynced, atomically renamed, followed by
parent-directory fsync and exact reread.

A crash after persistence but before forwarding can conservatively debit one
request that was never delivered; it cannot undercount a request that the
adapter forwarded if the adapter obeys this contract.

The proof covers concurrent same-source admissions, source A exhaustion with
source B still admitted, restart replay, window compaction, private file mode,
malformed state and symlink rejection.

This contract does **not** claim multi-process lock safety or installed state
custody. The reviewed systemd topology is expected to run one adapter process;
a later host collector must prove that fact and the actual state directory
ownership/mode. The actual PROXY-v2 TCP/HTTP adapter must call this admission
before forwarding.

No listener, service, Funnel/nftables mutation, credential issuance, Work Credit
write, wallet/key/signer, transaction, payment, activation or funds authority is
created here.
