# Buy VOID V7 post-merge source/runtime compatibility V1

Marker: \`VOID_BUY_VOID_V7_POSTMERGE_SOURCE_RUNTIME_COMPAT_V1\`.

Status: **source/test/CI only**. This contract exists because the originally reviewed post-#3539 compatibility assumption became stale before #3539 merged.

## Exact generations

Installed runtime generation remains:

\`4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb\`

with tree:

\`de12c9d2d5e475d435d21da3b047d7b63b69e2b7\`.

#3539 landed on canonical main as merge commit:

\`fd8131500330d8f8d51caa8275db456338c0a878\`

with tree:

\`ff80027780ba8a037a56e0a322849420dae88565\`.

The earlier 15→20 ADD-only plan is historical. By the time #3539 merged, the exact runtime→canonical-main delta was **24 paths**:

- **21 exact additions**;
- **3 exact modifications**;
- zero deletions or renames.

The three modified pre-existing runtime paths are restricted to:

- \`public/bootstrap/tor-signed-v1.json\`;
- \`public/bootstrap/v1.json\`;
- \`scripts/prove_void_tor_bootstrap_manifest_candidate_v1.mjs\`.

Their runtime and landed-source mode/blob/size identities are pinned in the contract. Any other pre-existing runtime modification is HOLD.

## Runtime-sensitive equality

The following five Epoch-2 runtime-sensitive dependencies must remain byte/mode/size-identical at runtime, the landed #3539 base, and the compatibility source head:

- \`ops/security/buy-void-epoch2-live-composition-native-candidate-lock-v6r2.json\`;
- \`ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v3.c\`;
- \`ops/precision/void_buy_void_epoch2_authenticated_credential_live_composition_v3.mjs\`;
- \`scripts/void_buy_void_epoch2_credential_attestation_sealed_v2.mjs\`;
- \`ops/precision/void_buy_void_user_manager_credential_query_installed_qualification_v3r.py\`.

The reviewed blobs are unchanged between runtime and landed main.

## Compatibility PR scope

This compatibility lane itself may add exactly four paths over #3539 merge commit \`fd813150...\`:

- \`.github/workflows/buy-void-v7-postmerge-source-runtime-compat-v1.yml\`;
- \`docs/operators/buy-void-v7-postmerge-source-runtime-compat-v1.md\`;
- \`ops/precision/void_buy_void_v7_postmerge_source_runtime_compat_v1.py\`;
- \`scripts/prove_buy_void_v7_postmerge_source_runtime_compat_v1.py\`.

No fifth path, modification, deletion, or rename is compatible.

## Verification

The verifier:

1. authenticates exact runtime and #3539 base trees;
2. proves the runtime→#3539-base delta is exactly the pinned 21 additions plus 3 modifications;
3. proves current source differs from #3539 base only by the four compatibility files;
4. proves the five runtime-sensitive dependencies are unchanged at all three generations;
5. requires index/tree equality;
6. requires isolated, unoptimized Python before the verifier can produce plan or verification authority;
7. opens the checkout root and every traversed tracked-file ancestor as retained no-follow directory descriptors, then reads leaves descriptor-relative so pathname ancestor replacement cannot redirect the authenticated read;
8. hashes every tracked visible worktree file directly with retained no-follow leaf descriptors and checks Git blob identity/mode/size;
9. revalidates the raw index, every tracked leaf generation, and every retained ancestor-directory generation before and after terminal Git observations;
10. normalizes ordinary filesystem drift plus Git timeout/exec failures into machine-readable HOLD rather than traceback.

Untracked paths never receive source authority. A renamed/replaced tracked ancestor directory also invalidates the generation even if a replacement tree contains byte-identical leaves.

## Authority

This compatibility repair performs or authorizes none of:

- canonical checkout mutation or rewind;
- protected \`/opt\` publication;
- service/systemd mutation;
- credential/private-key/wallet access;
- signing;
- transaction/RPC;
- payment acceptance;
- public presale or WC/VOID activation;
- treasury/liquidity action;
- funds movement.

A GREEN compatibility result is a prerequisite for deriving the fresh landed-head V4 installer plan. It is **not** the protected apply itself.

PROTECT THE CORE.
