# Buy VOID allocation-custody Node binary live census V1

Marker: `VOID_BUY_VOID_CUSTODY_NODE_BINARY_LIVE_CENSUS_V1`.

Status: **read-only designated-host identity match candidate only**.

This successor consumes the already-selected custody Node binary profile on
`main`. It does not select a new Node executable and does not modify the
historical profile.

## Exact expected profile

The source binds the exact profile Git blob:

```text
tools/void-buy-allocation-custody-node-binary-profile-v1.mjs
Git blob: 4d4d656bddf40de6f215be7b4b6e7cec62098036
```

The reviewed expected Precision identity remains:

```text
host: zoso-Precision-Tower-7810
path: /usr/bin/node
version label: v22.23.3
bytes: 124827920
SHA-256: fde6a4bf8d0562f7751d1a2d6cb9b417c4cfe107bbcb0aa3e9a24e125e348f48
UID/GID: 0/0
mode: 0755
hard links: 1
direct regular ELF: true
```

The expected ancestor chain is exactly `/`, `/usr`, `/usr/bin`, each
root-owned/root-grouped, mode `0755`, and not group/world writable.

## Production observation

The census must run with:

```bash
python3 -I -B \
  ops/precision/void_buy_allocation_custody_node_binary_live_census_v1.py \
  --census
```

Omitting `-B` HOLDs before ordinary imports.

The repository copy deliberately refuses UID 0 execution. It is an
unprivileged observation source and must not be made privileged merely to
increase its authority.

The census:

1. verifies the exact expected-profile source blob and semantic markers;
2. requires hostname `zoso-Precision-Tower-7810`;
3. opens `/`, `/usr`, and `/usr/bin` through retained
   `O_DIRECTORY|O_NOFOLLOW|O_NONBLOCK` descriptors;
4. requires exact ownership/mode policy for every ancestor;
5. opens the direct `node` leaf with `O_NOFOLLOW|O_NONBLOCK`;
6. requires exact UID/GID, mode, hard-link count, and byte count;
7. hashes exactly the opened descriptor and requires the selected SHA-256;
8. requires ELF magic;
9. rechecks the Node generation and retained ancestor generations before
   returning.

The binary is never executed. No `node --version` command is run. The
historical version label is carried only as part of the already-selected
expected profile; exact byte identity is the live measurement.

## Candidate versus verification

A successful observation can emit:

```text
live_node_binary_identity_match_candidate=true
```

but deliberately keeps:

```text
node_binary_identity_verified=false
source_execution_protected=false
operator_evidence_authenticated=false
observation_time_bound=false
point_in_time_observation=true
live_at_use_reverification_required=true
```

The reason is operational: the source itself executes from a mutable
user-controlled checkout and the measurement is only one point in time. A
future protected installer/service-start ceremony must remeasure the same
binary at the exact operation boundary from a separately admitted execution
context before it can promote `node_binary_identity_verified=true`.

## Read effects

The production path contains no explicit filesystem mutation. Ordinary reads
may update access-time metadata depending on mount policy, so the receipt is
truthful rather than claiming write-free execution:

```text
production_census_read_only=true
production_census_explicit_filesystem_write=false
production_census_filesystem_write_free=false
production_census_atime_write_possible=true
```

Self-test/proof use disposable temporary fixtures and state that separately.

## Authority boundary

This generation does not install packages or files, change permissions, execute
the Node binary, mutate systemd/services, replace the legacy target, inspect
request/payment/custody data, access credentials/wallets/signers, contact RPC,
construct transactions, activate the presale, or move funds.

It therefore retains:

```text
node_binary_execution_performed=false
version_command_executed=false
node_binary_identity_verified=false
source_execution_protected=false
install_or_package_mutation=false
service_mutation=false
systemd_mutation=false
replacement_apply_authorized=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

**PROTECT THE CORE.**
