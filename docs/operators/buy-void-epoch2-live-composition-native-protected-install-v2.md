# Buy VOID Epoch-2 live-composition native protected install v2

Marker:

`VOID_BUY_VOID_EPOCH2_LIVE_COMPOSITION_NATIVE_PROTECTED_INSTALL_V2`.

Status: **source/CI-only protected-install successor; no Precision installation
or live execution is authorized by this source generation**.

## Purpose

V2 is the protected installer for the V4 accepted candidate lock:

`voidbuye2nativecandlock4_3e6f7806914c54c55ee6658616a3a1590dc4ba29c60dc4cc764c60390d517418`.

It advances the protected namespace to the V3 native composition paths already
hard-coded by the accepted V3 native preentry:

- root:
  `/opt/void-buy-void-epoch2-live-composition-v3`;
- native:
  `void_buy_void_epoch2_live_composition_native_preentry_v3`;
- runner:
  `void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs`;
- policy:
  `policy-v3.conf`.

No extra file is permitted in the protected root.

## Accepted identities

Native ELF:
- bytes: `722880`;
- SHA-256:
  `09f2afc921d9d7a5282372151005eab4a3d5bcc520b8359588eb0038351702c4`;
- future installed mode: `0555`.

Runner:
- bytes: `40616`;
- SHA-256:
  `f6a75184dcc63989328c351fc93e140e6dac103f682f5c58c9f76bccd359a889`;
- Git blob:
  `baab733e43c030d24f8d4abd1644f3c4ae55c3b2`;
- future installed mode: `0444`.

Native source Git blob:

`2e75b8a6fa5ecc36ce2ca05d920001a16abcf5b7`.

V3R installed credential-query qualifier Git blob:

`70b74ff2f09f5aef86eec39b8f643d8f2ebb63f5`.

## Host-bound policy

The candidate lock deliberately does not pre-accept Precision's local
`/usr/bin/node` generation.

A future separately authorized plan/apply measures the fixed Node file and binds
its exact SHA-256 and byte length into the six-line V3 policy:

```text
schema=VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V3
expected_head=<40 lowercase hex>
runner_sha256=<accepted runner SHA-256>
runner_bytes=40616
node_sha256=<measured fixed Node SHA-256>
node_bytes=<measured fixed Node bytes>
```

Fixed `/usr/bin/git` and `/usr/bin/setpriv` generations are also measured.
Checkout inspection is performed as runtime UID/GID 1000 with no-new-privs and
cleared supplementary groups.

## Exact checkout binding

A future plan/apply requires:

- fixed checkout `/home/zoso/dev/void-node`;
- branch exactly `main`;
- clean tracked and untracked state;
- exact caller-supplied 40-hex HEAD;
- exact V4 lock, V3 native source, V3 runner, sealed-V2 source, and V3R
  credential qualifier Git objects.

That exact head becomes part of the V3 policy and content-addressed plan ID.

## Read-only plan

Plan consumes exact candidate file paths plus the expected main HEAD.

It verifies:
- V4 lock/candidate identities;
- native and runner candidate bytes;
- Node/Git/setpriv identities;
- checkout generation;
- policy identity;
- protected-root state.

Plan performs no filesystem mutation and executes neither native nor runner.

## PRE_MUTATION authority boundary

Before a future apply checks confirmation, root, candidate files, or protected
root, it emits and flushes a closed authority record:

```text
authority_boundary=PRE_MUTATION
filesystem_mutation_possible=true
filesystem_mutation_performed=false
candidate_files_opened=false
protected_root_opened=false
native_execution=false
runner_execution=false
credential_access=false
private_key_access=false
signing=false
transaction=false
payment_acceptance=false
public_presale_activation=false
wc_void_market_activation=false
treasury_liquidity_action=false
funds_movement=false
production_host_evidence_authority=false
```

A flush failure aborts before candidate or protected-root access. The source
proof behaviorally exercises a wrong-confirmation HOLD and requires this
boundary to precede the HOLD receipt.

## Future create-only publication

A separately authorized apply would require:
- root plus Python isolated mode;
- clean loader/Python environment;
- exact native/runner candidates;
- exact expected main head;
- exact plan ID;
- confirmation
  `INSTALL_ACCEPTED_EPOCH2_LIVE_COMPOSITION_V4_CREATE_ONLY`.

The existing reviewed create-only algorithm is preserved:

1. create a private root-owned mode-0755 stage under `/opt`;
2. create native mode 0555 and runner/policy mode 0444 with
   `O_EXCL|O_NOFOLLOW`;
3. fsync files and stage;
4. revalidate Git/setpriv/Node/checkout and staged file generations;
5. publish stage with `renameat2(..., RENAME_NOREPLACE)`;
6. fsync `/opt`;
7. verify final root, exact bytes/modes, Node, and checkout generation.

Recognized pre-publication failure cleans only the private stage. A failure
after publication emits the reviewed truthful
`published_needs_inspection` receipt and never pretends the install did not
occur.

## Authority

This source PR itself keeps all operational authority false:

```text
protected_install_authorized=false
live_execution_authorized=false
credential_access_authorized=false
private_key_access_authorized=false
signing_authorized=false
transaction_authorized=false
payment_acceptance_authorized=false
public_presale_activation_authorized=false
wc_void_market_activation_authorized=false
treasury_liquidity_action_authorized=false
funds_movement_authorized=false
```

No Precision mutation, native/runner execution, credential access, signature,
transaction/RPC, payment acceptance, presale/WC activation, treasury action, or
funds movement occurs in CI.

Next live gate after source acceptance is a separately authorized read-only
Precision plan. Successful installation would then advance to
`EPOCH2_V3_NATIVE_INSTALLED_READ_ONLY_QUALIFICATION`.

PROTECT THE CORE.
