# Buy VOID custody host namespace lease observation V1

Marker: `VOID_BUY_VOID_CUSTODY_HOST_NAMESPACE_LEASE_OBSERVATION_V1`.

Status: **read-only operator observation only; not namespace attestation**.

This helper exists because the qualified V3 process-reference census requires
two external inputs before it may classify a clean current-UID observation:

```text
--expected-host-pid-namespace-dev-ino <DEV>:<INO>
--expected-host-mount-namespace-dev-ino <DEV>:<INO>
```

The helper does **not** remove that externality requirement. It only gives an
operator a bounded way to observe candidate values from a shell the operator
already independently knows is the intended host context.

## Exact dependency

The helper binds the exact qualified process-reference census source:

- path:
  `ops/precision/void_buy_allocation_custody_runtime_v3_process_reference_census_v1.py`
- Git blob:
  `a5fa6ff22cc21df555e8a70c32500f07251dc4a8`

No process-reference or replacement authority is imported from that source.

## Observation scope

Production mode reads only:

- the exact process-census source file;
- `/proc`;
- `/proc/self/fdinfo/<retained-proc-fd>`;
- descriptor-relative `self/mountinfo`;
- descriptor-relative namespace identities:
  - `self/ns/pid`
  - `1/ns/pid`
  - `self/ns/mnt`
  - `1/ns/mnt`

It does not read process command lines, environments, customer/request data,
custody ledgers, credentials, wallets, signers, sockets, or network data.

The retained `/proc` directory descriptor must remain the same visible
generation for the full observation.

## Candidate checks

A successful observation requires:

- direct non-symlink `/proc`;
- exact procfs mount identity from the retained descriptor;
- no restrictive `hidepid` setting;
- caller PID namespace equal to PID 1's PID namespace;
- caller mount namespace equal to PID 1's mount namespace;
- all namespace identities, procfs visibility, and retained/visible `/proc`
  generation unchanged through the terminal recheck.

The output contains:

```text
host_pid_namespace_dev_ino_candidate
host_mount_namespace_dev_ino_candidate
```

Those are observations, not attestations.

## Critical trust boundary

A private container can have its **own** PID 1 and can therefore satisfy local
`self == 1` namespace equality inside that container. This helper cannot prove
from inside its own namespace that the namespace is the physical host.

Therefore all successful receipts retain:

```text
operator_observation_only=true
operator_must_independently_know_host_context=true
independent_host_context_attested=false
lease_authority=false
automatic_process_census_composition_authorized=false
```

Do not build a launcher that silently runs this helper and immediately feeds its
values into the process-reference census. That would collapse the external
trust boundary the process census intentionally requires.

The intended use is a separately observed operator step in a shell the operator
already knows is the host context, followed by explicit review of the receipt.

## Invocation

Isolated, unoptimized, no-bytecode Python is mandatory:

```bash
python3 -I -B \
  ops/precision/void_buy_allocation_custody_host_namespace_lease_observation_v1.py \
  --observe
```

Do not use sudo. Root execution intentionally HOLDs.

## Authority boundary

```text
read_only=true
production_filesystem_write=false
root_execution_forbidden=true
operator_observation_only=true
operator_must_independently_know_host_context=true
independent_host_context_attested=false
lease_authority=false
automatic_process_census_composition_authorized=false
process_environment_read=false
process_arguments_read=false
service_mutation=false
systemd_mutation=false
replacement_apply_authorized=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
funds_movement=false
```

This helper is evidence collection only. It does not install, replace, stop,
start, restart, or authorize any custody runtime.

**PROTECT THE CORE.**
