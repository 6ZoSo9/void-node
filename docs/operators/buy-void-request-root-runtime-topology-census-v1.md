# Buy VOID request-root runtime-topology census v1

Marker: `VOID_BUY_VOID_REQUEST_ROOT_RUNTIME_TOPOLOGY_CENSUS_V1`.

## Purpose

The Precision allocation-custody designated-host census established that the
protected storage roots and account separation are present, but the custody
system service/socket are absent. The reviewed custody bootstrap plan still
keeps:

```text
request_root_candidate=null
request_root_live_path_qualified=false
```

This census qualifies only the missing request-root/runtime-topology facts
needed before a custody service installer can be planned.

## Read-only boundary

The collector performs only:

- user- and system-manager `systemctl show` reads for
  `void-node-live.service`;
- `/proc/<pid>/stat`, cwd and executable symlink reads for process-generation
  stability;
- `ss -H -ltnp` to require the single local TCP/4100 listener to belong to
  the observed `void-node-live.service` MainPID before trusting loopback
  status responses;
- filesystem **metadata only** for two bounded request-root candidates and the
  exact leaves `requests.jsonl` and `operator-events.jsonl`;
- bounded GETs to the two loopback-only Buy VOID status routes on
  `127.0.0.1:4100`.

It never reads `/proc/<pid>/environ`, request/payment JSONL contents,
credentials, keys, wallets, signers, RPC, or external network resources.

## Candidate roots

The source default is:

```text
<live process cwd>/.runtime/public-buy-void-requests-v1
```

The Precision historical default candidate is also checked at:

```text
<zoso home>/dev/void-node/.runtime/public-buy-void-requests-v1
```

Only metadata is observed. A candidate is metadata-qualified when:

- the directory is direct, owned by the runtime UID, and mode 0700;
- `requests.jsonl` and `operator-events.jsonl` are direct regular
  single-link files owned by the runtime UID;
- `requests.jsonl` is non-empty and at most 64 MiB, while
  `operator-events.jsonl` may be empty but is also at most 64 MiB, matching
  the custody payment-ledger reader's fixed bounds;
- each leaf is exactly mode 0600; and
- the candidate does not overlap either protected allocation/custody root.

If the two bounded candidate paths resolve to the same directory inode, they
count as one candidate.

## Live status binding

Metadata alone cannot prove that the running process selected a candidate.

The collector therefore performs a bounded GET of:

```text
/__void/operator/buy-void-confirmed-closeout-v1/status
```

If that mounted status exists, its server-controlled `request_dir` and
`request_dir_source` are compared in memory with the bounded candidates. The
raw path is not printed; only a SHA-256 and equality booleans are retained.

`request_root_live_path_qualified=true` is possible only when:

- Precision and ordinary zoso observer identity match;
- the user `void-node-live.service` is active;
- no competing active system `void-node-live.service` exists;
- PID + kernel start ticks + cwd + executable remain stable across observation;
- the TCP/4100 listener is uniquely owned by that same runtime PID;
- the loopback status explicitly binds the request directory; and
- that exact directory passes the metadata qualification above.

If the status route is not mounted, the result remains
`REQUEST_ROOT_STATUS_BINDING_REQUIRED` even when the historical/default
directory metadata looks correct. The collector does not infer absence of a
`VOID_BUY_REQUEST_DIR` override from filesystem layout.

## Parent runtime status

The mounted parent
`/__void/operator/buy-void-runtime-v1/status` is also read to classify
runtime topology without exposing secret environment values. The collector
records booleans for current parent/runtime policy presence and hashes the
server-reported runtime root instead of printing it.

## Authority boundary

Read-only diagnostic only. No source/runtime/service/systemd/mount/permission
mutation, no request/payment content reads, no credential/key/wallet/signer
access, no RPC/transaction, no Chain-2050/WC mutation, no presale activation,
and no funds movement.

A GREEN request-root binding is only input to a later guarded custody-service
**plan**. It does not authorize installation or activation.
