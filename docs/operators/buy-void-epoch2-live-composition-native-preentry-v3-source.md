# Buy VOID Epoch-2 live-composition native preentry V3 source

Marker: VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3.

Status: **source/CI-only native first-entry generation; no candidate is accepted, no protected install is authorized, and live execution is not authorized**.

## Purpose

The V3R authenticated credential composition successor uses a new fixed V3 namespace and parent-proof schema. The historical V2 native preentry cannot satisfy that contract.

This source carries the reviewed native first-instruction design forward without repinning or mutating the historical V2 native candidate/lock.

## V3 fixed namespace

Future protected root: /opt/void-buy-void-epoch2-live-composition-v3

Future native preentry: void_buy_void_epoch2_live_composition_native_preentry_v3

Future runner: void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs

Future policy: policy-v3.conf

V3-specific identities:
- marker VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3;
- policy schema VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_POLICY_V3;
- parent proof schema VOID_BUY_VOID_EPOCH2_NATIVE_PARENT_PROOF_V3;
- runner FD environment VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3_RUNNER_FD;
- proof FD environment VOID_BUY_VOID_EPOCH2_NATIVE_PREENTRY_V3_PROOF_FD;
- runner confirmation RUN_AUTHENTICATED_EPOCH2_CREDENTIAL_LIVE_COMPOSITION_V3.

## Preserved native first-entry properties

The source preserves:
- fixed root-owned/non-writable self path;
- trusted ancestor checks;
- /dev/null stdin requirement so caller-streamed JavaScript is forbidden;
- retained root-owned runner descriptor;
- retained root-owned Node descriptor;
- policy-bound exact expected Git head;
- policy-bound runner SHA-256 and byte count;
- policy-bound Node SHA-256 and byte count;
- native parent retained while the child runs;
- parent and child /proc/<pid>/stat start-tick binding;
- private parent-proof pipe;
- retained runner FD passed to child;
- Node entered with fexecve();
- minimal loader-clean environment;
- child exit status propagated only after parent wait.

The native source itself does not read credentials, sign, call RPC, construct a transaction, activate presale/WC, or move funds.

## Deliberate stop

This PR does not:
- derive or publish a V3 native binary candidate;
- accept a candidate lock;
- publish runner/node policy bytes;
- install anything under /opt;
- authorize live execution.

The V3 runner source blob is pinned only as the reviewed consumer generation:
baab733e43c030d24f8d4abd1644f3c4ae55c3b2

After both stacked source PRs are green and merged, the next gate is a fresh deterministic V3 native/runner candidate derivation. Historical V2 native candidate identity must not be repurposed.

PROTECT THE CORE.
