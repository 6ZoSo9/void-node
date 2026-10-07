# Buy VOID allocation custody witness installation evidence v2

## Scope

`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_V2`
is a read-only designated-host evidence collector for the merged V2 witness
installation qualification contract.

It observes an already-installed host. It does not install or modify SSH keys,
`authorized_keys`, sshd, the V2 forced-command handler, its config, the
continuity attestation, witness storage, services, mounts, permissions, runtime
state, wallets, keys, transactions, allocation state, activation, inventory,
treasury/liquidity, or funds.

The collector's output is content-addressed but is **not** live authority.
A successful collection now requires both the canonical V2 installation
qualification and the exact runtime-bundle qualification from
`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_QUALIFICATION_V1`.
This closes only the installed executable-closure evidence gap; trusted
collection time, monotonic evidence generation, client-side `known_hosts`
content, authenticated external transport, independent external witness storage,
runtime integration, protected high-water custody and production readiness
remain separate gates.

## Input

The only caller-supplied configuration is:

```json
{
  "schema": "void_buy_void_allocation_custody_witness_installation_evidence_config_v2",
  "marker": "VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_INSTALLATION_EVIDENCE_CONFIG_V2",
  "version": 2,
  "transport_policy": {},
  "sshd_connection_context": {
    "source_address": "100.64.0.10",
    "source_host": "precision.tailnet.example",
    "local_address": "100.64.0.20",
    "local_port": 22
  }
}
```

The transport policy must pass the merged canonical witness transport
classifier. Host paths, handler path, config path, witness path, continuity
attestation path, Node path, `env` path, sshd path and host-key path are fixed
by source; a caller cannot select an alternate file or command.

The SSH connection context is explicit because OpenSSH `sshd -T -C` applies
`Match` rules to that tuple. The collector requires a non-loopback source
address, resolved source host name, non-loopback local server address, and local
port equal to the reviewed transport port. This tuple is content-addressed in
the receipt. It is still caller-supplied at this source gate, so
`live_sshd_connection_context_proven=false`; a later authenticated live SSH
qualification must bind it to the connection actually used.

## Descriptor-bound file evidence

Security-sensitive files are not opened by pathname alone.

The live collector:

1. captures the visible final-file identity;
2. opens the filesystem root with `O_DIRECTORY|O_NOFOLLOW`;
3. walks each ancestor descriptor-relative through
   `/proc/self/fd/<dirfd>/<component>` with
   `O_DIRECTORY|O_NOFOLLOW`;
4. opens the final basename from the retained parent with
   `O_NOFOLLOW`;
5. requires the visible identity and opened descriptor identity to match;
6. reads exactly the size accepted from the opened descriptor, using bounded
   positional reads;
7. probes one byte at the original EOF and HOLDS if the file grew after open;
8. re-`fstat`s and rebinds the visible final path after the read.

The parent-chain ownership claim is separately descriptor-walked and requires
every claimed root-owned parent to remain the same directory identity, owned by
UID 0 and not group/world writable.

### Executable read ceiling

The generic descriptor-bound evidence ceiling remains 16 MiB, and the forced-command
config remains capped at 256 KiB. Executable identity observation uses a separate
256 MiB ceiling only for fixed executable paths such as `/usr/bin/node`,
`/usr/bin/env`, and the resolved shell. This accommodates large packaged Node
binaries without widening the bounds for runtime-bundle files, witness storage,
keys, config, or continuity evidence.

The designated Nimo host was observed with a direct root-owned single-link
`/usr/bin/node` v22.23.2 binary of 124,836,408 bytes, which exceeds the generic
16 MiB evidence ceiling but remains below the executable-only 256 MiB ceiling.

Symlinked ancestors therefore cannot redirect the evidence read while still
producing a qualified parent-chain claim. The focused proof also grows a
temporary file after descriptor open and requires deterministic HOLD, so the
size ceiling is behavioral rather than a static source claim.

## V2 installation evidence

The collector observes and passes to
`classifyBuyVoidAllocationCustodyWitnessInstallationQualificationV2(...)`:

- the dedicated witness account and shell identity;
- the fixed forced-command config as root:root, mode `0444`, single-link,
  regular/no-symlink policy evidence below a root-owned non-writable parent
  chain; dedicated-account ownership or any writable config mode HOLDS;
- exact V2 handler path and Git-blob identity;
- exact Node and `/usr/bin/env` executable identity;
- canonical protected V2 config, observed as a root:root, mode-`0444`,
  single-link regular file under a root-owned non-writable parent chain;
- exact root-owned restrictive `AuthorizedKeysFile` entry;
- effective `sshd -T -C` policy for the exact supplied source-host/source-
  address/local-address/local-port tuple;
- pinned host-key and authorized client-key identities;
- exact V2 forced-command string;
- exact reviewed continuity-attestation bytes and metadata; and
- collection timestamp/evidence generation as observed integers.

A successful collector run requires the config observation itself to reject
dedicated-account ownership, writable modes, extra links, symlinks, or a
writable/untrusted parent chain before the canonical V2 qualifier is invoked.
The canonical V2 qualifier must then return a `voidwiq2_...` qualification ID.
The collector does not replace that qualifier with its own interpretation.

## Runtime-bundle evidence

The V2 forced-command handler is not a one-file runtime: it statically imports
the reviewed compiled allocation/witness modules. Runtime-bundle observation is
therefore delegated to the merged
`VOID_BUY_VOID_ALLOCATION_CUSTODY_WITNESS_RUNTIME_BUNDLE_EVIDENCE_V1`
collector rather than reimplemented here.

The installation collector supplies a narrow injected `inspect(expected)`
adapter backed by the same host-observation I/O used for its other fixed files.
That adapter may observe only the exact paths requested by the merged #2517
collector. The merged collector remains responsible for:

- the canonical #2515 eight-file manifest;
- exact path/SHA-256/UID/GID/mode/link/file-shape requirements;
- two complete runtime-bundle censuses;
- canonical #2515 semantic qualification;
- the exact observed runtime-file records;
- normalized runtime-bundle qualification; and
- its own content-addressed collector receipt.

#2516 does not import or call the runtime-bundle semantic classifier directly.
A failure from the merged collector is normalized into the
`witness_installation_evidence_runtime_bundle_collector_*` HOLD domain.

The outer installation-evidence receipt binds the merged collector's manifest
ID/SHA-256, qualification ID, evidence digest, normalized-qualification digest,
and exact `runtime_bundle_collector_receipt_sha256`. Its own two-pass census
requires the complete nested runtime-bundle receipt to be canonically identical
between installation observations.

This remains observation only. Neither collector proves authenticated live
origin or grants installation, runtime, custody, payment, activation, or funds
authority.

## Local pre-exec probes

The V1/V2 installation evidence contains claims about behavior before Node
executes. V2 does not fabricate those booleans.

The collector runs only local, bounded, non-mutating probes:

1. **Original command rejection.** The exact reviewed forced-command shell text
   is invoked with a non-empty `SSH_ORIGINAL_COMMAND`. It must terminate with
   exit status 3 and no output, before the Node handler can execute.
2. **Environment clearing.** A hostile environment containing every reviewed
   dangerous variable is passed to the exact `env -i` sanitization shape.
   The resulting child environment must contain exactly:
   `PATH=/usr/bin:/bin`, `LANG=C`, `LC_ALL=C`, and
   `VOID_BUY_VOID_WITNESS_FORCED_COMMAND_V2=1`. Loader-sensitive poison such
   as `LD_PRELOAD` or `LD_AUDIT` may cause the parent executable's dynamic
   loader to emit diagnostics before `env -i` runs; those diagnostics are
   non-authoritative. Qualification still requires exit status 0 and an exact
   four-variable child environment, so any forbidden variable reaching the
   sanitized child remains a deterministic HOLD.
3. **Shell startup hook rejection.** The configured `/bin/sh` is invoked
   non-interactively with `ENV` and `BASH_ENV` pointing at probe input. The
   injected hook marker must not execute.

These are local pre-exec observations only. They do not perform SSH and do not
run the witness handler.

## Machine-ID continuity

V2 exists specifically because the reviewed Nimo witness has an immutable
historical predecessor identity while the designated host now has a reviewed
successor machine ID.

The collector mirrors the merged V2 handler's identity rule.

Hostname and root-disk serial/WWN must remain equal to the witness identity and
to the exact reviewed continuity attestation. The observed host key must also
match the attestation's reviewed ED25519 OpenSSH fingerprint.

Two identity paths are accepted:

- `historical_exact`: current host machine ID equals the current witness-tip
  machine ID; the continuity attestation is still installed and qualified but
  is not needed to bridge identity for that observation.
- `reviewed_machine_id_continuity`: the witness tip uses the exact historical
  machine-ID SHA-256, the live host uses the exact reviewed successor
  machine-ID SHA-256, and the witness begins with the exact historical
  1411-byte predecessor journal whose full SHA-256, event count and tip event
  hash are reviewed. The exact installed continuity attestation must bind those
  predecessor/successor identities and the stable hostname/disk/host key.

Any other machine-ID drift, hostname drift, disk drift, host-key drift,
historical-prefix drift, missing/tampered continuity attestation or ownership
mismatch HOLDs.

## Double census and receipt

The collector performs two complete observations at one captured timestamp.
Canonical installation evidence, runtime-bundle evidence and its normalized
qualification, host identity, witness storage summary and identity-path
classification must be byte-identical between the two observations.

The receipt binds:

- V2 installation qualification ID;
- SHA-256 of the exact V2 qualification evidence;
- SHA-256 of the qualifier's normalized result;
- runtime-bundle manifest ID and manifest SHA-256;
- runtime-bundle qualification ID;
- SHA-256 of the exact runtime-bundle evidence;
- SHA-256 of the runtime-bundle qualifier's normalized result;
- SHA-256 of the complete merged #2517 runtime-bundle collector receipt;
- host identity;
- witness storage identity;
- selected machine-ID continuity path;
- whether the continuity attestation was consumed for identity bridging;
- observed host-key/client-key/sshd/continuity/pre-exec facts; and
- explicit false live/runtime/custody/funds authority flags.

`collector_receipt_sha256` is the SHA-256 of the canonical receipt body.

## Normalized qualification package

The default collector output remains the existing V2 receipt unchanged.

For later live-read composition, callers may request the companion package with
`--package`. The package is produced from the **same double census** and
contains:

- the exact existing `installation_receipt`;
- the exact `installation_normalized_qualification` object returned by the V2
  installation qualifier;
- the canonical SHA-256 of that normalized object;
- the exact `voidwiq2_...` installation qualification ID reconstructed from
  the same digest; and
- a content-addressed `package_sha256` over the package body.

The package function recomputes and requires both commitments before returning:
the normalized SHA must equal the receipt's
`normalized_qualification_sha256`, and the digest must reconstruct the
receipt's `installation_qualification_id`.

This does not change the receipt schema or promote authority. The package still
reports live-origin, external transport/storage, runtime, production and funds
authority as false. Its purpose is only to materialize bytes that were already
committed by the receipt so the live-read qualifier does not need to invent or
reconstruct them later.

Usage:

```bash
VOID_BUY_VOID_WITNESS_INSTALLATION_EVIDENCE_V2_CONFIG_JSON='<json>' \
  node tools/void-buy-allocation-custody-witness-installation-evidence-v2.mjs \
  --package
```

Without `--package`, CLI output is the pre-existing V2 receipt.

## Authority boundary

Even a successful receipt reports:

- `live_evidence_origin_proven=false`;
- `live_sshd_connection_context_proven=false`;
- `trusted_verification_clock_proven=false`;
- `evidence_generation_monotonicity_proven=false`;
- `client_known_hosts_content_observed=false`;
- `external_transport_authenticated=false`;
- `external_witness_storage_proven=false`;
- `protected_high_water_custody_proven=false`;
- `independent_custody_proven=false`;
- `runtime_integration=false`;
- `production_gate_ready=false`; and
- `funds_movement=false`.

This source lane does not authorize a live Nimo run. A later explicit operator
gate must install/inspect the designated host, collect live evidence, bind
trusted time and monotonic generation, validate client-side known-hosts
material, and perform authenticated external read/append qualification before
#2452 can close.

## Focused proof

```bash
npm run build
node --check tools/void-buy-allocation-custody-witness-installation-evidence-v2.mjs
node scripts/prove_void_buy_allocation_custody_witness_installation_evidence_v2.mjs
# --package is also source/proof covered; default receipt output remains unchanged.
node scripts/prove_void_buy_allocation_custody_witness_runtime_bundle_evidence_v1.mjs
npx tsx scripts/prove_buy_void_allocation_custody_witness_runtime_bundle_qualification_v1.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_installation_qualification_v2.ts
npx tsx scripts/prove_buy_void_allocation_custody_witness_transport_v1.ts
node scripts/prove_buy_void_allocation_custody_witness_forced_command_v2.mjs
git diff --check
```

The synthetic proof uses injected host I/O only. It performs no live SSH,
service, mount, permission, witness, payment, key, transaction, activation or
funds mutation.