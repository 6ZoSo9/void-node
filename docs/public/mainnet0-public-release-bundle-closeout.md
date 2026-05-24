# VOID Mainnet-0 Public Release Bundle Closeout

status: public_release_bundle_cross_box_green
created_at_utc: 20260524-091208
operator_label: zoso

public_release_hygiene_checkpoint: 9b904aa1 / ckpt-public-release-hygiene-public-live-green-20260524-090437
public_live_closeout_checkpoint: 6c8fa0df / ckpt-mainnet0-public-live-closeout-green-20260524-075712
root_readme_public_docs_checkpoint: 6afa564c / ckpt-root-readme-public-docs-green-20260524-084138
public_announcement_pack_checkpoint: 718519c1 / ckpt-mainnet0-public-announcement-pack-green-20260524-083654
public_docs_index_checkpoint: 96ab31f7 / ckpt-mainnet0-public-docs-index-green-20260524-082202
public_onboarding_pack_checkpoint: 10657b80 / ckpt-mainnet0-public-onboarding-pack-green-20260524-081134

alienware_public_release_hygiene_log: /tmp/void-alienware-public-release-hygiene-proof-20260524-091027.log
precision_crossbox_public_release_hygiene_log: /tmp/void-crossbox-public-release-hygiene-final-20260524-091208.log

launch_state: public_mainnet0_live
decision: GO_PUBLIC_MAINNET0
launch_approval: true
mutation_allowed: true
mutation_allowed_scope: launch_state_public_surface_status_only

precision_ready: true
precision_ready_head: 1689210
precision_gap: 0
precision_txroot_live: 1

alienware_ready: true
alienware_ready_head: 1689133
alienware_gap: 0
alienware_txroot_live: 1

## Public release bundle contents

- README.md points GitHub visitors to public Mainnet-0 docs.
- docs/public/README.md is the public docs index.
- docs/public/mainnet0-launch-notes.md records what is live and what remains guarded.
- docs/public/run-a-node.md gives the node-running entry path.
- docs/public/participant-onboarding.md gives participant safety/onboarding notes.
- docs/public/mainnet0-announcement.md gives the public launch announcement.
- docs/public/mainnet0-short-announcement.txt gives the short announcement blurb.
- ops/mainnet/mainnet0-public-release-hygiene.current.md records public-live release hygiene.

## Proven

- Public-live closeout is cross-box proven.
- Public onboarding docs are cross-box proven.
- Public announcement docs are cross-box proven.
- Root README public docs pointer is cross-box proven.
- Public release hygiene is cross-box proven.
- Sanitized public release export/gitleaks path is green on committed public-live hygiene HEAD.
- Precision and Alienware are synced and healthy at the hygiene checkpoint.

## Guardrails still active

Public active validator admission remains disabled.
Public validator registration remains candidate/waiting only.
Vault126 onboarding has not been executed.
Buy VOID fulfillment remains explicit, payment-verified, and tx-ref-recorded only.
Future treasury spend remains separately guarded.
No additional authority transfer is authorized by this closeout.
No private keys, seed phrases, wallet secrets, or credential material are included.

## Current decision

VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.

The public release bundle is ready for public-facing use, with validator admission, Buy VOID fulfillment, and treasury spend still guarded by separate proof lanes.
