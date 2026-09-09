# Precision website recovery V2

This is a draft source and operator-preparation candidate in canonical PR #1373.
It does not authorize service activation, Funnel changes, DNS changes or money
movement. A green source proof is not a deployment or independent acceptance.

## Observed outage

ZoSo's 2026-09-08 23:41 UTC Precision observation reports the node service active
on port 4100, but no listeners on 8080/8082/8083 and no installed composition or
frontdoor units. The live node checkout reports `67e85c3e2abe99753ec784f31e96f0448da12cc1`.
Do not update that checkout as part of website recovery.

Precision's hostname is `zoso-precision-tower-7810.taila47fd.ts.net`.
Canonical HTTPS 443 is private to the tailnet and proxies to 4100. Public 8443
proxies to the discovery service on 4112; public 10000 proxies to 4113. Preserve
both auxiliary listeners. Nimo remains a public-internet client without
Tailscale or a shared-LAN requirement. It does not become the public gateway.

## Website service preparation

Use `ops/public/prepare_void_precision_web_recovery_v2.py --prepare --source-head
<40-hex-head>` only from the explicitly reviewed source generation. The V1
preparer is retired with a read-only HOLD. Its corrected Precision observation
at `f3ab003dffd107283e1ade9f1885a75db98bcab3` remains historical evidence; neither
that receipt nor a manually corrected directory can close the V2 transaction.

V2 sets umask 0022 before any staging/object-store write and creates a fresh
`~/dev/void-web-recovery-v2/pr1373-<head12>/` bundle. It reads the existing live
checkout's objects through a disposable private bare clone; any missing pinned
commit is fetched there. It never checks out, fetches into or changes the live
node repository. Existing candidates, symlinked/special staged members and
foreign-writable output ancestors are rejected without in-place permission repair.
The live checkout is an owned, no-follow, read-only Git object/coordinate input;
its internal permissions are neither normalized nor admitted as executable
payload. Its parents still require safe modes. Every consumed Git object's
content hash and full commit/tree chain are checked before verifier definitions
execute or runtime source is staged.

Only the verifier's explicit 14-file runtime allowlist is materialized, with no
Git metadata or unrelated repository files. It includes the three entrypoints,
the shared response helper, frontdoor HTML, three adapter DataNet files, three
public download files, both preparation tools and the routing tool. Source
directories are 0755; source files use pinned Git 0644/0755 modes. The candidate
root and prepared-units directory are 0700; unit files and receipt are 0600.
The full sorted manifest covers every bundle directory and file, including
units and the receipt. Receipt content uses an external SHA-256 binding, avoiding
an impossible self-referential receipt hash. Directory modes and all other file
modes, sizes and content SHA-256 values are explicit.

The receipt contains commit/tree witnesses, source head/tree, both tool hashes,
full Node executable path/version/hash, unchanged live checkout coordinates and
the complete manifest. Offline verification walks each allowlisted blob from
the externally specified Git commit; a rewritten self-consistent manifest cannot
substitute different source. Exact unit bytes are independently derived again.
The running preparer must match the pinned source, and the staged verifier is
invoked immediately after receipt creation with the externally captured receipt
digest. No intervening chmod or source write occurs. Every missing, extra,
substituted, linked or mode-drifted staged member is rejected.

Default preparation runs as zoso on Precision. Its exact preflight validates
installed Node syntax, absent candidate units, free recovery ports, unit syntax,
active live node, app HTML/assets and required existing public endpoints. A
sibling aggregate binds the raw preflight output, exit code, terminal result, full manifest
digest and this fresh generation. Return **preparation-receipt.json, the aggregate
JSON, and complete terminal output** for independent review. This is preparation
and read-only observation, not service installation or independent acceptance.
A failed fresh bundle is left for inspection; do not chmod or reuse it to claim
natural admission. An explicit new source candidate or reviewed new output parent
is needed for another natural run.

The required Node 22/24/26 workflow runs the real preparer then exact preflight
under caller umasks 0002, 0022 and 0077, with identical complete manifests and
aggregates and zero intervening corrections. A private copy of the installed
Node binary avoids trusting hosted tool-cache permissions in these fixtures.
Actual verifier CLI mutation tests reject source/unit/mode/membership/receipt
and generation drift. The exact staged programs also run in an isolated fixture
with a synthetic node, proving homepage/app and all six static/download bodies.
A failed preflight retains its HOLD reason and bound aggregate for inspection.
`--artifact-only` never observes host services and emits
only `ARTIFACT_VERIFIED`; it cannot satisfy Precision host acceptance. A fresh
Precision run of the reviewed V2 generation is still required after source CI.
The OS, Git, Python, Node and operator account are trusted; this is not hostile
same-UID executed-byte custody or a V4 isolation claim.

| Service | Listen | Configuration |
| --- | --- | --- |
| Public adapter | 127.0.0.1:8080 | `ops/public/public-seed-adapter-v1.mjs`; `VOID_SEED_UPSTREAM=http://127.0.0.1:4100`; earning coordinator unset |
| Composition | 127.0.0.1:8082 | `ops/public/void-public-app-composition-gateway-v1.mjs`; node upstream 4100, public upstream 8080; paid-work and webhook upstreams unset |
| Frontdoor | 127.0.0.1:8083 | `ops/public/void-public-frontdoor-v1.mjs`; upstream 8082; `VOID_PUBLIC_FRONTDOOR_READ_ONLY=1` |

Use the installed supported Node major (22, 24 or 26), an absolute executable,
the allowlisted source directory as WorkingDirectory, and generation-specific unit names.
No npm install, node build, existing node restart, or existing service overwrite
is part of this preparation. Stage unit files for review before installation.

The frontdoor recovery mode rejects every method except GET/HEAD before it
contacts any upstream. Default mode remains compatible with existing consumers;
the recovery units must explicitly enable the restricted mode. Website recovery
does not activate buying, paid work, WC awards, wallets or validators.

Readiness means the exact loopback composition handler returned a complete
`GET /app/` representation within the configured absolute deadline and 256 KiB
ceiling. The handler identity must survive HTTP hop-header filtering. It does
not claim chain freshness, working downstream economic capabilities or external
network availability. Verify the complete homepage, app assets, and required
public routes after separately authorized local service activation.

## Conditional routing and explicit restoration

The V1 combined installer is retired. Its compatibility entrypoint delegates to
`ops/public/void_public_frontdoor_cutover_v2.py`. The replacement never calls a
service manager. Routing restoration cannot stop a later replacement service
because this tool has no stop/disable/install authority at all. Service lifecycle
is a separate, explicit operation; it is not automatically bundled into rollback.

`--prepare --hostname <exact-name>` reads LocalAPI ServeConfig and stages one
specific replacement of canonical 443's root proxy with `http://127.0.0.1:8083`,
plus its public Funnel flag. The complete current configuration and ETag, source
hashes, nonce and creation time are included in the plan digest. Every unrelated
Serve/Funnel field is preserved. Foreground configurations and complex canonical
root handlers are refused rather than guessed. Preparation does not change routing.

`--apply --confirm <plan-sha256>` requires the exact, unexpired plan, matching
source and predecessor, and complete read-only frontdoor readiness. The actual
LocalAPI POST carries `If-Match`; a concurrent different ServeConfig produces
412 instead of being overwritten. A failed or interrupted POST remains uncertain
until `--reconcile` observes current content. Reconciliation never writes routing.
Unknown foreign content remains a HOLD. An attempted confirmation cannot be reused.

Rollback is deliberately a **new, explicitly confirmed content-CAS operation**:
`--prepare-rollback` requires current content to match the published candidate,
then prepares the original configuration for review. A fresh `--apply --confirm`
is required to restore it. Retired plans have no automatic restoration authority.
There is no unconditional `tailscale funnel` write or automated rollback.

Tailscale ETags are SHA-256 identities of serialized ServeConfig, not monotonic
mutation counters. Exact-content A→B→A is therefore not detectable as lineage.
This contract permits restoration only after a new explicit authorization of
the current content; it does not claim continued ownership of the historical
mutation. The proof makes this distinction executable. This changed restoration
contract requires fresh independent review and must not be labeled an already
accepted generation-ownership repair.

The primitive is grounded in Tailscale commit
`86e5d3873aa96403d42e35ddd9247834c309691b`, `ipn/localapi/serve.go` and
`ipn/ipnlocal/serve.go`: POST consumes If-Match, and the comparison/write occurs
under the backend mutex. The host's installed API still has to support it.

## State and evidence boundaries

A UID-wide Linux abstract Unix socket provides cooperative exclusion independent
of directory/lock path replacement. The state directory is admitted component by
component without symlinks or foreign write permission, retained by descriptor,
and rechecked before mutations. Journal reads/publications/fsync use that retained
descriptor. Renaming it cannot redirect its writes, and a second cooperating
process cannot acquire a replacement filesystem lock. One bounded attempted-plan
ledger prevents replay of retired confirmations.

This does not defend against arbitrary same-UID code rewriting executable bytes,
forging the private journal, calling LocalAPI independently, or changing namespaces.
The OS, installed tools and operator account are trusted. Kernel-lock fixtures,
Unix HTTP wire tests and hosted CI do not establish designated-host execution
custody or hostile same-UID isolation.

Source proof covers conditional-write races, explicit A→B→A semantics, replay,
uncertain writes and read-only recovery, state-directory replacement, preserved
8443/10000 configurations, real producer-to-frontdoor compatibility, HTTP
Connection-nominated headers, incomplete upstream bodies, downstream aborts and
read-only method restrictions. No proof calls a live Tailscale daemon or service
manager. Run the focused wall on Node 22/24/26 before independent reassessment.

## Final public recovery

Only after reviewed local website services and the separately confirmed routing
change are healthy, test the Precision HTTPS root and `/app/` from Nimo or another
public-internet client. A Precision-local request is not independent external
reachability. Then inspect and update the registrar forwarding for `voidchain.org`
and `www.voidchain.org` to the verified Precision website URL, preserving needed
paths. Validate HTTPS and deep links externally. Funnel itself serves a ts.net
hostname; retaining voidchain.org in the address bar requires the separately
reviewed custom-domain TLS/edge lane #1359, not an assumed CNAME shortcut.

The public bootstrap record uses `https://seed.nullfeed.org`; its existing seed
gateway is a separate service and is not replaced by this website recovery.
