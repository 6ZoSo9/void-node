# Buy VOID authenticated user-manager live query qualification v2

Marker: `VOID_BUY_VOID_USER_MANAGER_QUERY_LIVE_QUALIFICATION_V2`.

Status: **read-only live qualification contract; hosted CI never executes the live query**.

## Purpose

This successor qualifies the final protected V2 query generation after the
atomic replacement contract has installed it under the unchanged fixed preexec
path.

The protected generation must contain:
- unchanged accepted static preexec;
- final V2 query;
- exact retained V1 predecessor query.

All three root-owned mode-0555 file identities must remain stable before,
between and after the authenticated queries.

## Read-only live execution

The qualifier runs only the fixed static preexec as root with UID 1000 and
`void-node-live.service`, twice, under a minimal fixed environment and bounded
timeout.

The accepted transcript must prove:
- authenticated private systemd manager peer;
- same retained authenticated connection for unit properties;
- manager/service pidfds and generation revalidation;
- exact MainPID/cgroup/executable/parent binding;
- systemd `NoNewPrivileges=yes` and kernel `NoNewPrivs=1`;
- authenticated `PrivateUsers=no`;
- configured ambient capabilities zero;
- kernel CapInh/CapPrm/CapEff/CapAmb zero;
- kernel CapBnd equal to configured CapabilityBoundingSet;
- all mutation/payment/presale/funds authority fields false.

The two complete transcripts and stable manager/service identities must be
identical. The protected three-file generation must also remain byte/metadata
stable around both observations.

## Generation dispatch

The V2 qualifier is historical evidence for its exact accepted V2 dependency
generation. Its positive proof is executed only when the query, peer guard,
preexec, V4 parser, protected replacement, and V2 lock all match that frozen
generation.

On the canonical PrivateUsers V4 generation, the frozen V2 qualifier is not
repinned. The workflow instead requires its exact historical source/proof bytes,
binds the canonical V4 query/parser/candidate/lock identities, and requires the
historical qualifier to fail closed with
`v4_parser_source_blob_mismatch`. Any unrecognized combination fails CI rather
than silently becoming a new positive generation.

This preservation path performs no live query.

## Failure semantics

A HOLD reports `query_execution_state=unknown_or_partial` because failure may
occur after the first read-only native query.

## Authority

Even GREEN remains read-only evidence. This qualifier performs no host write,
service/systemd mutation, external network call, credential/key/wallet access,
request/payment content read, transaction, payment acceptance, presale/WC
activation or funds movement.

Next gate after GREEN: bind this V2 authenticated MainPID generation inside the
legacy request-root census.

PROTECT THE CORE.
