# VOID Mainnet-0 Current Public Status

status: public_mainnet0_live
decision: GO_PUBLIC_MAINNET0
updated_at_utc: 20260524-104000

current_public_release_checkpoint: 2865819a / ckpt-public-release-bundle-whitepaper-green-20260524-103149
whitepaper_checkpoint: 9067695b / ckpt-mainnet0-whitepaper-v1-green-20260524-102511
public_release_bundle_checkpoint: 49f460ea / ckpt-mainnet0-public-release-bundle-closeout-green-20260524-091935
public_release_hygiene_checkpoint: 9b904aa1 / ckpt-public-release-hygiene-public-live-green-20260524-090437
public_live_closeout_checkpoint: 6c8fa0df / ckpt-mainnet0-public-live-closeout-green-20260524-075712
quick_start_checkpoint: 0635c606 / ckpt-mainnet0-quick-start-green-20260524-111319
windows_wsl2_quick_start_checkpoint: 3e2fb76c / ckpt-mainnet0-windows-wsl2-quick-start-green-20260524-112502
support_runbook_checkpoint: 85be902f / ckpt-mainnet0-support-runbook-green-20260524-123228
start_here_checkpoint: a149f3c4 / ckpt-mainnet0-start-here-green-20260524-163001
public_docs_stack_checkpoint: d1d6fb47 / ckpt-public-docs-stack-developer-reference-green-20260525-070529
developer_reference_checkpoint: 3a28fce3 / ckpt-mainnet0-developer-reference-green-20260525-022240

## Current truth

VOID Mainnet-0 is public_mainnet0_live / GO_PUBLIC_MAINNET0.

The public release bundle, public release hygiene, launch docs, participant onboarding, announcement materials, and whitepaper are cross-box proven.

The full public docs stack is proven by:

    make mainnet0-public-docs-stack-proof

The current public package includes:

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
- Developer reference is available.
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
- Future treasury spend remains separately guarded.
- No additional authority transfer is authorized by public launch status.
- Operator/admin controls are not public participant controls.

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
