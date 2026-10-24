# Buy VOID custody V3 protected all-process installer source lock V1

Marker:

`VOID_BUY_VOID_CUSTODY_RUNTIME_V3_PROTECTED_ALL_PROCESS_INSTALLER_LOCK_V1`.

Status: **exact installer-candidate source acceptance only; no protected install
or execution authority**.

This successor consumes the exact source/CI-qualified installer candidate from
Draft #3797 and accepts only its immutable source identity. It does not install,
execute, or expose a privileged apply path.

## Exact accepted installer generation

Parent installer head:

`395249d8eab96adbdf5b15c6654326bd827aa1a0`

Qualified parent plan head:

`06395abde20620b99808f62fe0d90a3f2e05528e`

Installer source:

`ops/precision/void_buy_allocation_custody_runtime_v3_protected_all_process_installer_candidate_v1.py`

Exact identity:

```text
Git blob SHA-1:
9dd33f38fe4c89a5d2beacbc535380346eaea83b

bytes:
38420

SHA-256:
e956c90ad9680680d0734466b632a58a4145ad74c8962e9e8960b186caeced01
```

The SHA-256 was independently calculated from the exact ASCII blob after
verifying the digest implementation against the standard SHA-256 `abc` test
vector.

Companion identities:

```text
proof:
9b6552be11dd48b40e2c6445b1336fc8634be713

operator document:
af5d3dd79050ef47de01a5d02e05656c6ee9540c

focused workflow:
84b3f07a3737b56a4d3a9e47013b431bb529b959

parent install-plan source:
0fef4e6f76738dd474ea775985b1facdd922bb54
```

Hosted evidence:

```text
focused run: 40050661105
focused job: 120742369422
exact-head review: 5636218305
```

## Accepted source properties

The accepted source retains the reviewed boundaries from #3797:

- no direct `--apply` CLI;
- `PROTECTED_FIRST_ENTRY_REQUIRED=true`;
- only
  `install_accepted_source_create_only_after_protected_first_entry()`
  may represent the fixed least-authority install entrypoint;
- that entrypoint reloads and reauthenticates the accepted source and binds the
  fixed parent, install name, stage name, source name, UID/GID 0 and
  root-parent requirement;
- the parameterized internal engine cannot emit
  `protected_source_installed=true`;
- wrong-payload and wrong-destination adversaries are covered;
- create-only kernel no-replace publication is required;
- an unbound post-`mkdir` stage is a dedicated
  `StageGenerationUnknownError` with possible residual mutation and mandatory
  operator inspection before retry;
- only an identity-bound stage may enter exact-generation cleanup;
- post-publication failures preserve the published root for inspection.

This lock accepts those exact source bytes. It does not claim that those bytes
have been placed under a protected root or invoked as a trusted first
instruction.

## Target-selection semantics

The parent install plan already selected the exact future destination. This lock
therefore truthfully preserves:

```text
install_target_selected=true
```

Target selection is not installation permission.

## Authority boundary

Only this field advances:

```text
candidate_installer_source_accepted=true
```

The following remain false:

```text
protected_installer_first_entry_installed=false
protected_installer_first_entry_verified=false
protected_install_authorized=false
protected_source_installed=false
live_privileged_census_authorized=false
live_privileged_census_executed=false
service_mutation=false
systemd_mutation=false
existing_target_replaced=false
replacement_apply_authorized=false
runtime_integration=false
payment_acceptance=false
public_presale_activation=false
production_gate_ready=false
funds_movement=false
```

The next gate may define and review a protected first-entry mechanism around
this accepted installer identity. That later gate must remain separate from
actual protected installation and from any live privileged census.

**PROTECT THE CORE.**
