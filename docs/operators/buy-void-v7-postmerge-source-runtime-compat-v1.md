# Buy VOID V7 post-merge source/runtime compatibility V1

Marker: `VOID_BUY_VOID_V7_POSTMERGE_SOURCE_RUNTIME_COMPAT_V1`.

Status: **source/test/CI only**. This generation supersedes the historical #3539-base compatibility snapshot and binds the actual canonical source after the reviewed P2P, public-quickstart, and V7 first-import repair landed.

## Exact generations

Installed runtime generation remains:

`4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb`

with tree:

`de12c9d2d5e475d435d21da3b047d7b63b69e2b7`.

Current canonical source base after #3642 is:

`4fd0351b5cff19a4e851ace4f91b249617033cbc`

with tree:

`3b8b91ee0af25039fd785d6aea725083849bc714`.

The exact runtime→current-main delta is **37 paths**:

- **21 exact additions**;
- **16 exact modifications**;
- zero deletions or renames.

The 16 modified pre-existing runtime paths are restricted to:

- `docs/public/public-node-connect-pack-v1.md`;
- `docs/public/public-node-operator-quickstart-v1.md`;
- `docs/public/void-p2p-udp-swarm-relay-orchestrator-v1.md`;
- `public/bootstrap/tor-signed-v1.json`;
- `public/bootstrap/v1.json`;
- `public/public-node/connect/index.html`;
- `public/public-node/connect/public-node-connect-pack-v1.html`;
- `public/public-node/connect/public-node-connect-pack-v1.json`;
- `public/public-node/operator-quickstart-v1.html`;
- `public/public-node/public-node-operator-quickstart-v1.html`;
- `public/public-node/public-node-operator-quickstart-v1.json`;
- `scripts/prove_void_p2p_udp_swarm_relay_orchestrator_v1.ts`;
- `scripts/prove_void_tor_bootstrap_manifest_candidate_v1.mjs`;
- `src/p2p/udp_swarm_relay_orchestrator_v1.ts`;
- `tools/proof-public-node-connect-pack-v1.mjs`;
- `tools/proof-public-node-operator-quickstart-v1.mjs`.

All runtime and current-source mode/blob/size identities are pinned. Any other runtime-path modification is HOLD.

The 21 additions include the reviewed V7 protected-substrate source/proof/documentation set. The four files changed by #3642 are pinned at their post-repair identities, so this compatibility generation includes the sys-first pre-import hardening rather than the historical installer bytes.

## Runtime-sensitive equality

These five Epoch-2 runtime-sensitive dependencies must remain byte/mode/size-identical at runtime, current main, and the compatibility source head:

- `ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v6r2.json`;
- `ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v3.c`;
- `ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs`;
- `scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs`;
- `ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v3r.py`.

## Compatibility PR scope

This lane may add exactly four paths over current main `4fd0351b...`:

- `.github/workflows/buy-void-v7-postmerge-source-runtime-compat-v1.yml`;
- `docs/operators/buy-void-v7-postmerge-source-runtime-compat-v1.md`;
- `ops/precision/void_buy_void_v7_postmerge_source_runtime_compat_v1.py`;
- `scripts/prove_buy_void_v7_postmerge_source_runtime_compat_v1.py`.

No fifth path, modification, deletion, or rename is compatible.

## Verification

The verifier:

1. authenticates exact runtime and current-main trees;
2. proves runtime→current main is exactly the pinned 21 additions plus 16 modifications;
3. proves the compatibility head differs from current main only by the four compatibility files;
4. proves the five runtime-sensitive dependencies are unchanged at all three generations;
5. requires index/tree equality;
6. requires isolated, unoptimized Python before plan or verification authority;
7. retains no-follow directory descriptors from the checkout root through tracked ancestors and reads leaves descriptor-relative;
8. hashes every tracked visible worktree file and checks Git blob identity/mode/size;
9. requires exact Git toplevel binding to the supplied checkout root;
10. revalidates required branch `main` at terminal Git barriers when requested;
11. revalidates exact expected HEAD in the final Git pass;
12. rechecks the raw index after the final toplevel/branch/HEAD probes;
13. follows the final Git/index pass with retained checkout-root, ancestor-directory, tracked-worktree, and directory-generation barriers;
14. rejects root/ancestor/leaf/index generation drift even when replacement bytes are identical;
15. normalizes filesystem and Git timeout/exec failures into machine-readable HOLD.

Untracked paths never receive source authority.

## Authority

This compatibility repair performs or authorizes none of:

- canonical checkout mutation or rewind;
- protected `/opt` publication;
- service/systemd mutation;
- credential/private-key/wallet access;
- signing;
- transaction/RPC;
- payment acceptance;
- public presale or WC/VOID activation;
- treasury/liquidity action;
- funds movement.

A GREEN result is a prerequisite for deriving a fresh landed-head V4 installer plan. It is **not** the protected apply itself.

PROTECT THE CORE.
