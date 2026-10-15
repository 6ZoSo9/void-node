# Buy VOID legacy request-root census v2

Marker: `VOID_BUY_VOID_LEGACY_REQUEST_ROOT_CENSUS_V2`.

Status: **read-only metadata census; never historical-disposition authority**.

## Purpose

This is the V2-authenticated successor to the accepted legacy request-root
census. Candidate discovery and historical semantics are unchanged; the runtime
authority is upgraded to the final V2 authenticated user-manager query.

The bounded current candidate set remains:
- fixed historical repository default;
- live-process cwd default bound to the authenticated MainPID generation;
- explicit request root reported by the bounded confirmed-closeout loopback route;
- every direct 40-hex immutable release beneath `/opt/void-node-live/releases`;
- future stable root `/var/lib/void-buy-request-journal-v1`.

The census reads metadata and direct-entry counts only. It does not print
direct-entry names or read request/payment JSONL contents.

## V2 authenticated runtime boundary

Live `--run` executes the final V2 read-only qualifier before and after the
complete process/listener/status/candidate observation window.

The protected query generation must remain stable and prove:
- authenticated private user-manager peer;
- stable exact MainPID generation;
- NoNewPrivileges in systemd and kernel;
- PrivateUsers=false;
- zero active kernel capability masks;
- configured/kernel bounding-set equality;
- retained pidfds and generation revalidation.

All process/listener observations are bound to that exact authenticated
MainPID/start-tick generation. Ordinary `systemctl --user` and caller-selected
D-Bus environment are not authority.

The census still deliberately does not trust unit WorkingDirectory. Live
process cwd is read only from the authenticated MainPID generation.

## Critical historical nonclaim

An absent directory, empty directory, or zero-length fixed journal pair is
**not** authenticated fresh genesis.

Every result keeps:
- `historical_request_history_disposition_proven=false`;
- `historical_origin_authenticated=false`;
- `filesystem_rollback_prevention_proven=false`;
- `migration_authorized=false`;
- `production_gate_ready=false`.

If surviving or noncanonical history is observed, it requires separate review.
If only absent/empty shapes are observed, the next gate remains an explicit
one-time legacy-history disposition by the economic owner/Sovereign, bound to
the exact census evidence and followed by an independent external witness.

That governance disposition may state the human/accounting basis for accepting
genesis, but it must not be represented as cryptographic proof that historical
request state never existed.

## Authority

No host mutation, process-environment read, customer/payment content read,
external network call, service/systemd change, payment acceptance, presale/WC
activation or funds movement occurs. The only network observation is the
reviewed bounded loopback GET.

PROTECT THE CORE.
