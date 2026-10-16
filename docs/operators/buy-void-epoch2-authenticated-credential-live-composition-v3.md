# Buy VOID Epoch-2 authenticated credential live composition V3

Marker:

`VOID_BUY_VOID_EPOCH2_AUTHENTICATED_CREDENTIAL_LIVE_COMPOSITION_V3`.

Status: **source-only V3R composition successor; no V3 native preentry is
accepted, installed, or authorized by this source generation**.

## Purpose

The merged credential-query V3R qualifier closes the complete credential-set
observation gap by authenticating and hashing the full effective DropInPaths and
LoadCredential sets.

V3 carries those richer authenticated facts through the future Epoch-2
non-transaction signing window.

It does not replace or mutate the existing V2 live runner.

## Exact source dependencies

V3 consumes:
- merged V3R installed qualifier:
  `ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v3r.py`;
- qualifier Git blob:
  `70b74ff2f09f5aef86eec39b8f643d8f2ebb63f5`;
- accepted V3R credential lock:
  `voidbuyumqcredelflock3r_8b064214e22ce54ac193b426f38b9d6a7ea4cee07b38b68c8d1eeb6c51de6f34`;
- sealed Epoch-2 V2 signer Git blob:
  `14cbe81e27d04fee77cbe75225ce308bf8561a7b`.

## Closed V3R qualification contract

The runner accepts only the exact V3R qualification object shape.

It requires:
- exact protected V3R/V2/V1 generation;
- stable double authenticated private-manager query;
- exact one Epoch-2 credential target;
- complete DropInPaths set count <=64;
- complete DropInPaths canonical bytes <=64 KiB;
- complete DropInPaths SHA-256;
- complete LoadCredential set count <=32;
- complete LoadCredential canonical bytes <=64 KiB;
- complete LoadCredential SHA-256;
- unrelated credentials allowed only inside that bounded complete set;
- same runtime UID / manager PID+start / service MainPID+start as V6 security;
- V6 cap_last_cap-supported mask and KernelCapBnd equality;
- all mutation/economic authority false.

Unknown or extra qualification fields fail closed.

## Future signing-window binding

A future native-protected V3 run will use the same sensitive sequence as V2:

1. exact checkout observation;
2. V3R authenticated credential/V6 qualification;
3. sealed Git-object non-transaction signing probe as UID/GID 1000;
4. V3R authenticated credential/V6 qualification again;
5. require both qualification records byte-canonically identical;
6. cross-check sealed MainPID, LoadCredential binding hash and service cgroup;
7. revalidate checkout after all sensitive observations;
8. revalidate native parent/runner generation;
9. only then emit a receipt.

The V3 receipt additionally binds:
- complete DropInPaths SHA-256 and count;
- complete LoadCredential SHA-256 and count;
- Epoch-2 target match count;
- explicit booleans that both complete sets remained bound across the signing
  window.

## Native-entry separation

V3 uses a new fixed future namespace:

`/opt/void-buy-void-epoch2-live-composition-v3`.

Expected future native entry:

`void_buy_void_epoch2_live_composition_native_preentry_v3`.

Expected fixed runner:

`void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs`.

Expected native marker / proof schema are V3-specific. The V2 native entry
cannot satisfy them.

This PR explicitly reports:
- `protected_native_entry_accepted_by_this_pr=false`;
- `protected_native_entry_install_authorized=false`;
- `live_execution_authorized=false`.

Therefore merging this source does not create a runnable signing path.

Next source gate:

`DERIVE_AND_ACCEPT_EPOCH2_LIVE_COMPOSITION_V3_NATIVE_PREENTRY`.

## Authority

Hosted CI runs only syntax, self-test, plan and source proof.

No credential contents are read. No signature is produced. No protected
filesystem write, service/systemd mutation, transaction, RPC, payment
acceptance, public presale/WC activation or funds movement occurs.

A later live run would remain separately authorized even after a future V3
native entry is accepted and installed.

HOLD receipts also preserve native-entry lifecycle truth. A failure before
successful native parent authentication reports
`privileged_first_entry_authenticated=false`; any later failure after
`requireNativePreentry()` succeeds reports it as `true`. The source self-test
injects failures on both sides of that boundary.

PROTECT THE CORE.
