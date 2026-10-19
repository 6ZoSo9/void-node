# Buy VOID authenticated credential-unit query v3

Marker: `VOID_BUY_VOID_USER_MANAGER_PRIVATE_CREDENTIAL_UNIT_QUERY_V3`.

Status: **source/CI successor only; no binary acceptance, protected installation,
replacement, or production live-query authority is granted by this artifact**.

## Reason for the successor

Accepted V2 correctly authenticates the private systemd user-manager connection,
bounds the complete effective `DropInPaths` set at 64 entries, bounds the
complete effective `LoadCredential` set at 32 entries, requires exactly one
Epoch-2 credential/drop-in match, allows unrelated credentials, rejects duplicate
credential IDs, and re-queries the complete canonical sets over the same retained
connection before returning success.

V2 intentionally exposes only the target Epoch-2 path plus aggregate counts and
canonical byte lengths. That is sufficient for its single-invocation generation
check, but not for a later qualifier that executes the native query twice around
another security observation. Two different unrelated metadata sets can have the
same count and canonical byte length and therefore produce equal V2 public
transcripts.

V3 preserves the complete V2 transport/bounds/validation contract and adds only
content identities for the already-retained canonical metadata bytes.

## V3 generation identities

The native query computes in-process SHA-256 over:

- the exact complete canonical `DropInPaths` byte string retained by V2;
- the exact complete canonical `LoadCredential` byte string retained by V2,
  encoded as the existing canonical `id=source\n` sequence.

It emits:

```text
DropInPathsCanonicalSHA256=<64 lowercase hex>
LoadCredentialCanonicalSHA256=<64 lowercase hex>
```

The hash covers the exact ordering and bytes that V2 already requires stable
within one retained authenticated manager connection. V3 therefore lets a later
double-query qualifier require complete metadata-generation equality across both
native query invocations without printing unrelated credential IDs or source
paths.

The V3 self-test imports the repository's reviewed in-process SHA-256 design,
checks the standard `SHA256("abc")` vector, proves equal canonical sets hash
equally, and proves a one-byte credential metadata change changes the digest.

## Preserved V2 boundaries

V3 still requires:

- root/kernel-authenticated private user-manager transport;
- retained manager and service pidfds;
- exact service MainPID/cgroup/Node generation;
- `NeedDaemonReload=no`;
- at most 64 canonical absolute drop-ins and exactly one Epoch-2 drop-in basename;
- at most 32 canonical `LoadCredential` entries;
- unique credential IDs;
- exactly one `buy-void-epoch2-fulfiller-v1` credential;
- unrelated credentials retained as part of the complete stable set;
- same-connection before/after equality of the complete metadata sets.

It never opens any credential source.

## Authority boundary

Still false:

- binary acceptance;
- protected installation/replacement;
- production live-query authority;
- credential-content access;
- private-key/wallet/signer access;
- service/systemd mutation;
- payment acceptance;
- transaction construction/signing/broadcast;
- public presale/WC activation;
- treasury/liquidity/funds movement.

V2 source and its accepted V2 ELF lock remain historical evidence. V3 requires
a fresh reproducible candidate/lock and a separately reviewed protected
replacement before any live execution can be considered.

PROTECT THE CORE.
