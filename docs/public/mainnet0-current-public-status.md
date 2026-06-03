# VOID Mainnet-0 Current Public Status

status: public_mainnet0_live
decision: GO_PUBLIC_MAINNET0
updated_at_utc: 20260524-104000

current_public_release_checkpoint: 2865819a / ckpt-public-release-bundle-whitepaper-green-20260524-103149
whitepaper_checkpoint: 9067695b / ckpt-mainnet0-whitepaper-v1-green-20260524-102511
public_release_bundle_checkpoint: 49f460ea / ckpt-mainnet0-public-release-bundle-closeout-green-20260524-091935
public_release_hygiene_checkpoint: 9b904aa1 / ckpt-public-release-hygiene-public-live-green-20260524-090437
public_live_closeout_checkpoint: 4180224d / ckpt-mainnet0-public-live-closeout-green-20260525-110841
public_live_announcement_checkpoint: 33c10bd6 / ckpt-mainnet0-public-live-announcement-green-20260525-211809
quick_start_checkpoint: 0635c606 / ckpt-mainnet0-quick-start-green-20260524-111319
windows_wsl2_quick_start_checkpoint: 3e2fb76c / ckpt-mainnet0-windows-wsl2-quick-start-green-20260524-112502
support_runbook_checkpoint: 85be902f / ckpt-mainnet0-support-runbook-green-20260524-123228
participant_first_user_clarity_checkpoint: 9b118fec / ckpt-participant-first-user-clarity-green-20260601-111631
public_run_node_support_checkpoint: a40e147b / ckpt-public-run-node-support-proof-green-20260601-113719
buy_void_ux_txref_clarity_checkpoint: 67f3f3d8 / ckpt-buy-void-ux-txref-clarity-green-20260601-142627
stake_public_preview_clarity_checkpoint: 5171df05 / ckpt-stake-public-preview-clarity-green-20260601-193825
start_here_checkpoint: a149f3c4 / ckpt-mainnet0-start-here-green-20260524-163001
public_docs_stack_checkpoint: 9e1cd6d3 / ckpt-public-docs-stack-network-troubleshooting-green-20260602-071543
developer_reference_checkpoint: 3a28fce3 / ckpt-mainnet0-developer-reference-green-20260525-022240
public_surface_checkpoint: 83cb22f9 / ckpt-mainnet0-public-surface-green-20260525-085128

public_site_bundle_auto_materialize_checkpoint: cea7726a / ckpt-public-site-bundle-auto-materialize-green-20260601-204502

public_node_network_troubleshooting_checkpoint: b51a615c / ckpt-public-node-network-troubleshooting-green-20260602-023325
current_public_status_docs_stack_proof_repair_checkpoint: ba8ecb44 / ckpt-current-public-status-docs-stack-proof-repair-green-20260602-081224
public_faq_network_troubleshooting_checkpoint: 567d7a8b / ckpt-public-faq-network-troubleshooting-green-20260602-105407
wc_to_void_test_swap_explainer_checkpoint: 14a0c81a / ckpt-wc-to-void-test-swap-explainer-green-20260602-213920
wc_to_void_copy_compact_checkpoint: 87f050a1 / ckpt-wc-to-void-copy-compact-green-20260603-023554
## Current truth

VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.

The public release bundle, public release hygiene, launch docs, participant onboarding, announcement materials, and whitepaper are cross-box proven.

The full public docs stack is proven by:

    make mainnet0-public-docs-stack-proof

The current served public surface is proven by:

    make mainnet0-public-surface-proof

The current public package includes:

- docs/public/mainnet0-public-live-announcement.md
- docs/public/mainnet0-public-live-closeout.md
- docs/public/start-here.md
- README.md public docs pointer
- docs/public/README.md
- docs/public/mainnet0-launch-notes.md
- docs/public/run-a-node.md
- docs/public/participant-onboarding.md
- docs/public/mainnet0-announcement.md
- docs/public/mainnet0-short-announcement.txt
- docs/public/mainnet0-public-release-bundle-closeout.md
- docs/public/void-network-whitepaper.md
- docs/public/mainnet0-current-public-status.md
- docs/public/windows-wsl2-quick-start.md
- docs/public/support-runbook.md
- docs/public/developer-reference.md
- docs/public/quick-start.md

## Served public surface

The current served public surface is intentionally narrow:

- `/participant` is served.
- `/__void/ready.json` is served.
- `/__void/runtime/validator-truth/status` is served as a read surface.
- `/` redirects to `/participant` as the public first-run entry path.
- `/__void/status` remains a non-public 404 surface.
- GET `/__void/participant/stake/next-onboard` remains a non-public 404 surface.

This proves the public participant/readiness/runtime-truth surface without opening default root, legacy status, or next-onboard GET surfaces.

## Start here

Everyone should start with:

    docs/public/start-here.md

New users should then read:

    docs/public/quick-start.md

Windows users should start with:

    docs/public/windows-wsl2-quick-start.md

Participants should also read:

    docs/public/README.md

Technical readers and potential investors should read:

    docs/public/void-network-whitepaper.md

Node operators should read:

    docs/public/run-a-node.md

Support/public operators should read:

    docs/public/support-runbook.md

Participants should read:

    docs/public/participant-onboarding.md

## What is live

- VOID Mainnet-0 public status is live.
- Local node runtime is live.
- Participant page is available from a running local node.
- Public documentation is available.
- Start-here public landing overview is available.
- Public docs stack composite proof is available.
- Public live closeout proof is available.
- Public live announcement proof is available.
- Developer reference is available.
- Public served surface proof is available.
- Linux quick-start is available.
- Windows WSL2 quick-start is available.
- Public support runbook is available.
- Whitepaper v1 is available.
- Public release hygiene is green.
- Sanitized public export and gitleaks path are green.
- Precision and Alienware cross-box proofs are green.

## What remains guarded

- Public active validator admission remains disabled.
- Public validator registration remains candidate/waiting only.
- Vault126 onboarding has not been executed.
- Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.
- WC→VOID real wallet execution remains explicit unlock/sign only; the reusable proof uses a temporary local-devnet wallet.
- WC→VOID visible trade copy is compact, but wallet-signed execution and unlock/sign boundaries remain explicit.
- Future treasury spend remains separately guarded.
- No additional authority transfer is authorized by public launch status.
- Operator/admin controls are not public participant controls.




## Latest WC→VOID compact-copy refresh

The participant WC→VOID compact-copy refresh is now cross-box proven at `87f050a1 / ckpt-wc-to-void-copy-compact-green-20260603-023554`.

This refresh shortens the visible Trade/WC→VOID state text while preserving the safety boundary: WC→VOID swaps are wallet-signed, test proof uses a temporary local-devnet wallet only, and real wallet execution requires explicit unlock/sign confirmation.

The protected proof stack includes `make participant-wc-to-void-current-status-proof`, `make participant-first-user-clarity-proof`, `make public-first60-user-journey-proof`, and `make mainnet0-status-smoke`.

This is a UI copy/proof lane only. It does not mutate chain state, validator state, Buy VOID state, treasury state, or the user's real wallet.

## Latest WC→VOID test-swap explainer refresh

The participant WC→VOID test-swap explainer is now cross-box proven at `14a0c81a / ckpt-wc-to-void-test-swap-explainer-green-20260602-213920`.

This refresh makes the participant Trade/WC→VOID UI state clear: the reusable proof uses a temporary local-devnet wallet only, while real wallet execution requires explicit native-wallet unlock/sign confirmation.

The reusable proof target is `make participant-wc-to-void-temp-wallet-execution-proof`.

This is a UI/documentation/proof lane only. It does not mutate chain state, validator state, Buy VOID state, treasury state, or the user's real wallet.

## Latest public FAQ network troubleshooting refresh

The public FAQ network troubleshooting entry is now cross-box proven at `567d7a8b / ckpt-public-faq-network-troubleshooting-green-20260602-105407`.

The FAQ now answers the operator case where the local VOID node still returns `ready:true`, but the host machine loses internet access. It links users to `docs/public/node-network-troubleshooting.md` and keeps the issue framed as a local host/network troubleshooting path first, not a VOID chain failure.

This is a documentation and proof lane only. It does not mutate chain state, validator state, wallet state, Buy VOID state, or Work Credits state.

## Latest current public status proof repair

The current public status proof repair is now cross-box proven at `ba8ecb44 / ckpt-current-public-status-docs-stack-proof-repair-green-20260602-081224`.

This repair makes `mainnet0-current-public-status-proof` validate the public docs stack pointer refresh for `9e1cd6d3 / ckpt-public-docs-stack-network-troubleshooting-green-20260602-071543`.

This is a documentation and proof repair lane only. It does not mutate chain state, validator state, wallet state, Buy VOID state, or Work Credits state.

## Latest public docs stack refresh

The public docs stack is now cross-box proven at `9e1cd6d3 / ckpt-public-docs-stack-network-troubleshooting-green-20260602-071543`.

This stack explicitly requires the public node network troubleshooting runbook, its links from the public docs index and run-a-node guide, mutation-safety language, and the dedicated public node network troubleshooting proof.

This is a documentation and proof lane only. It does not mutate chain state, validator state, wallet state, Buy VOID state, or Work Credits state.

## Latest public node network troubleshooting refresh

The public node network troubleshooting runbook is now cross-box proven at `b51a615c / ckpt-public-node-network-troubleshooting-green-20260602-023325`.

This runbook is for operators whose local VOID node remains ready while the host machine loses internet access. It documents interface, route, DNS, carrier-flap, NetworkManager, live-failure capture, non-reboot recovery, and physical cable/port troubleshooting.

This is a documentation and proof lane only. It does not mutate chain state, validator state, wallet state, Buy VOID state, or Work Credits state.

## Latest DataNet site bundle auto-materialization refresh

The public DataNet site bundle lane is now seeded, peer-readable, and auto-materializing at `cea7726a / ckpt-public-site-bundle-auto-materialize-green-20260601-204502`.

The previous peer-readiness checkpoint proved both Precision and Alienware expose fixed DataNet manifests and `/datanet/v1/fetch` for Voidchain and NullFeed at `ckpt-public-site-bundle-peer-readiness-green-20260601-202959`.

The new auto-materialization checkpoint proves a node can recover missing fixed public site bundle packed dirs from a configured peer, verify content hash/root, write the packed dir atomically, and serve `/site/voidchain` and `/site/nullfeed` as `datanet_live_v1_peer_materialized` instead of falling back to repo static.

Manual seeding remains a safe fallback/runbook path, but it is no longer the only proven way for a peer node to restore these fixed public site bundles.

## Latest Buy VOID and Stake public clarity refresh

Buy VOID UX now has a cross-box proven explicit tx-ref fulfillment warning at `67f3f3d8 / ckpt-buy-void-ux-txref-clarity-green-20260601-142627`.

Stake public preview now has a cross-box proven top-of-tab warning at `5171df05 / ckpt-stake-public-preview-clarity-green-20260601-193825`.

Together these prove that public users are told Buy VOID has no automatic delivery and requires an explicit recorded VOID tx ref, while Stake remains preview-only, candidate/waiting-only, and not active validator admission.

## Latest first-user and run-node support proof refresh

The participant first-user path is now cross-box proven at `9b118fec / ckpt-participant-first-user-clarity-green-20260601-111631`.

The public run-node/support path is now cross-box proven at `a40e147b / ckpt-public-run-node-support-proof-green-20260601-113719`.

Together these prove the public path from docs and install guidance to a running local node, the participant page, wallet-first onboarding, guided Earn/WC→VOID flow, DataNet-backed public site routing, and sensitive public GET route 404 behavior.

## Public support first checks

For first-response support, start with these safe checks:

- `/` should redirect to `/participant`.
- `/download` and `/voidchain` should redirect to `/site/voidchain`.
- `/participant` should serve the Wallet-first participant app.
- `/__void/ready.json` should report `ready=true`, `gap=0`, and `txroot_live=1`.
- Sensitive GET routes such as `/__void/status`, `/__void/participant/stake/next-onboard`, Buy VOID fulfill/claim routes, treasury routes, and admin routes should remain non-public `404` surfaces.
- Public validator registration remains candidate/waiting only.
- Buy VOID remains guided-only and fulfillment remains explicit, payment-verified, and tx-ref-recorded.

## Current validator posture

Public validator registration is candidate/waiting only.

Public registration does not mutate the active validator set.

The guarded operator selector remains:

    vault126 / epoch128 / expectedValidatorCount=127

This selector has not been live-executed.

## Current Buy VOID posture

Buy VOID remains guarded.

Payment confirmation does not equal VOID sent. VOID fulfillment requires explicit payment verification and a recorded VOID transaction reference.

Participants should not send blind deposits and should not use unsupported exchange/custodial send paths where the participant flow warns against them.

## Current treasury posture

OpsTreasury has been seeded with 1,000,000 VOID.

Future treasury spend remains separately guarded and requires its own dry-run, signer check, broadcast, transaction record, balance proof, and closeout artifact.

## Current release hygiene posture

Public release hygiene is green.

The public release bundle includes public docs, announcement materials, whitepaper, release hygiene, and a sanitized/gitleaks-clean export path.

Secret-bearing files, runtime private artifacts, wallet files, keystores, local proof logs, build artifacts, caches, and local databases are not public release contents.

## Current decision

VOID Mainnet-0 is live, but intentionally conservative.

The correct public message is:

    VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.
    Public onboarding is open.
    Public active validator admission, vault126 execution, Buy VOID fulfillment, and future treasury spend remain guarded by separate proof lanes.


## Public live closeout

The public live closeout is proven by:

    make mainnet0-public-live-closeout-proof

It records the current public-facing Mainnet-0 baseline across the public docs stack, served participant surface, readiness, and cross-box runtime truth.


## Public live announcement

The public live announcement is proven by:

    make mainnet0-public-live-announcement-proof

It provides safe public wording for Mainnet-0: public-live infrastructure is open, while public active validator admission, treasury spend, Buy VOID fulfillment, and authority transfer remain guarded.

## Native public site bundle

Status: cross-box proven.

Checkpoint: 1ee9285e / ckpt-voidchain-run-node-doc-links-datanet-green-20260531-104226

Routes:

- /download
- /voidchain
- /nullfeed
- /site/voidchain
- /site/nullfeed

DataNet site bundles:

- Voidchain dataset_id: 1b8bf41db2d64f8877d0aec397373fa1
- Voidchain content_root: db0c54edcad0130b8de61e73ec61ff60701e97bee6bb3ac065d6c55efbd634e2
- NullFeed dataset_id: 2930d5e8436eb5674be06d2b0152d20c
- NullFeed content_root: f4c8b03bb8f5dae627bb6df9eddab48060bc0dab1a8c886d56dbeab2b4b0c372

Operational note: public site routes are DataNet-first with repo static fallback. Follower nodes must have the packed DataNet site bundles seeded locally until peer materialization is automated. Repo static fallback must not be treated as DataNet-backed serving.
