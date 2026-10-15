# Buy VOID legacy request-root census v1

Marker: `VOID_BUY_VOID_LEGACY_REQUEST_ROOT_CENSUS_V1`.

Status: **read-only metadata census; never historical-disposition authority**.

## Purpose

The accepted stable request-root policy selects
`/var/lib/void-buy-request-journal-v1`, but it deliberately refuses to migrate
or abandon historical request state until the pre-anchor era is dispositioned.

This census enumerates a bounded set of *known current candidates*:

- the historical repository working-directory default;
- the current user-unit working-directory default;
- the live process cwd default;
- the live runtime's explicit `VOID_BUY_REQUEST_DIR`, when the already-reviewed
  confirmed-closeout loopback status route reports it from a stable runtime
  PID/listener generation;
- every direct 40-hex immutable release beneath
  `/opt/void-node-live/releases`;
- the future stable target.

It reads only root/fixed-leaf metadata and direct-entry **counts**. It never
prints direct-entry names and never reads request/payment JSONL contents.

The census is bound to the designated runtime identity `zoso` / UID 1000.
The historical repository candidate is the fixed
`/home/zoso/dev/void-node/.runtime/public-buy-void-requests-v1`; caller
`HOME` is never used to select it. The live-process cwd candidate is also
cross-bound to the same stable process generation.

The census does **not** read `/proc/<pid>/environ` or request the full systemd
environment. That would unnecessarily expose unrelated same-process secrets.
Explicit request-root discovery instead uses the bounded loopback GET already
reviewed by the V1/V2 topology census. The loopback listener must remain owned
by the same stable runtime PID generation across the observation. External
network calls remain forbidden.

The immutable-release candidate inventory is enumerated twice and must be
identical. A 40-hex release entry that is not a direct directory makes the
inventory incomplete. Candidate metadata/count observations are also repeated
and must be byte-for-byte equal before
`bounded_current_candidate_set_observed=true` is possible.

The designated machine identity is read through the hardened V2 descriptor-bound
`/etc/machine-id` routine, including no-symlink, root-owned/non-writable,
single-link and before/after identity checks. Subprocesses use the V1 minimal
user environment rather than inheriting the caller's ambient environment.

## Critical nonclaim

An absent directory, empty directory, or zero-length
`requests.jsonl`/`operator-events.jsonl` pair is **not** authenticated
fresh genesis.

The earlier original-request census correctly showed that an empty regular
ledger could be a rolled-back once-populated valid prefix. This V1 therefore
always returns:

`historical_request_history_disposition_proven=false`

`historical_origin_authenticated=false`

`filesystem_rollback_prevention_proven=false`

Even if all bounded current candidates look absent/empty, the census only says
that no surviving bytes were observed in those candidates. It cannot prove
that an operator never used another historical path or that a coordinated
rollback never occurred.

## Next boundary

If surviving/noncanonical history is observed, it must be reviewed/migrated
separately.

If only absent/empty shapes are observed, the next gate is an explicit
one-time legacy-history disposition by the economic owner/Sovereign, bound to
this census generation, followed by an independently witnessed genesis for the
new stable root. That governance disposition must state its human/accounting
basis truthfully; it must not masquerade as cryptographic historical proof.

No host mutation, process-environment read, customer/payment content read,
external network call, service/systemd change, payment acceptance, presale
activation or funds movement occurs here. The only network observation is the
bounded loopback GET described above.

PROTECT THE CORE.
