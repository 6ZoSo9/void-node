# VOID P2P retired peer identities v1

## Reason for this control

After the Railway October 21, 2026 incident, Precision's read-only audit observed the
legacy Railway P2P node ID 4f93300760f94834139babd2b54d2619 as both
connected and present in a verified reconnect cache, despite its removal from
the source-reviewed public bootstrap introductions.

Removal from the bootstrap list does not revoke a cryptographically authenticated
peer identity. Persisted verified-peer cache records are independent introduction
paths. This source-only control retires a *peer identity*, not a hosting company,
IP subnet, wallet, validator, treasury, or signing key.

## Authority and lifecycle

The source-reviewed list is src/p2p/retired_peer_identities_v1.ts.
Entries contain an exact 32-character lowercase hex P2P node ID and an incident
reason. Never ingest revocation policy from peer discovery, an environment
variable, or an untrusted file. Adding or removing entries requires a code
review and a normal, explicitly authorized deployment.

Runtime rejects a signed AUTH from a listed identity before any transport-specific
authentication promotion (direct, relay, Tor, UDP-upgrade, or reachability probe).
A pinned outbound dial to a listed identity is not attempted, and reconnect
schedulers refuse that identity. This includes Tor introduction startup,
Tor SOCKS pre-dial/retry, direct/punch-capable dials, direct-upgrade
requests/offers/relay sessions, and ephemeral direct mounts. An unknown/unpinned
endpoint may still complete a TCP connection but cannot authenticate as a retired
identity.

Cache reads fully validate records, omit retired identities from in-memory peer
evidence and dial targets, and do not rewrite the file. Cache writers fail closed
on retired IDs, and the next ordinary authenticated write drops legacy records
from durable cache. Other valid entries are retained.

## Boundaries and limits

No on-host actions, deployment, restart, live disconnection, wallet/signer access,
funds movement, or Railway API operations are performed by this PR.
An already-running node retains its connections until a separately authorized
runtime rollout/restart; merging source alone does not disconnect it.

The old Railway P2P private seed should be treated as exposed and retired. This
does *not* imply that the offline LUKS signing keys were exposed. Railway account
credential inventory, service retirement, and log review remain separate tasks.

## Acceptance

CI runs:
- npm run typecheck
- npm run build
- npx --no-install tsx scripts/prove_void_p2p_retired_peer_identity_v1.ts
- the existing verified-peer-cache and P2P authenticated identity proofs
- a bounded localhost-only Tor SOCKS regression proving zero retired Tor dials
  and zero retired Tor reconnect-backoff state
- direct-upgrade request/offer and relay-session negatives proving no retired
  session or TCP attempt

Expected proof marker: VOID_P2P_RETIRED_PEER_IDENTITY_V1_PROOF_GREEN.

A later production rollout requires: baseline peers/health census; explicit
operator authorization; controlled restart only after critical runtime gates;
post-restart read-only confirmation that retired identity is not connected or
verified; and checks that Precision and Nimo remain independently reachable.
