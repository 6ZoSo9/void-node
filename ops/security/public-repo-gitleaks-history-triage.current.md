# VOID Public Repo Gitleaks History Triage

status: current_head_green_history_triage_open
updated_at_utc: 20260527-110000

current_head_checkpoint: 1e16060c / ckpt-public-repo-gitleaks-current-classifier-green-20260527-103000

## Summary

Current tracked HEAD is proof-green for public repo gitleaks via the current tracked-tree classifier proof.

Full-history gitleaks remains a separate historical triage lane.

The full-history report from 20260526 found:

- 103 total findings
- 101 generic-api-key findings
- 2 private-key findings

The two historical private-key findings were triaged on 20260527.

## Historical private-key finding triage

The two private-key findings were:

- src/crypto/keypair.ts line 20 at commit 836bb7b1852e
- src/crypto/keypair.ts line 20 at commit cb535ccd66c3

Both findings were classified as false positives caused by code that checks for PEM private-key header marker strings.

They were not classified as leaked private key material.

Observed triage properties:

- no PEM private key block value was printed or recorded
- no 0x64 private-key-shaped value was present
- no raw 64-hex private-key-shaped value was present
- the finding line shape was a string-marker check using includes(...)
- current HEAD contains key-loading code, not committed private-key material

## Current policy

No public Git history rewrite is approved by this note.

If any historical finding is later proven to be a live credential or live authority key, it must be treated as burned and rotated or revoked.

## Remaining historical work

The remaining full-history findings are generic-api-key findings.

They should be triaged separately as one of:

- public Ethereum address
- public consensus key
- public deployment metadata
- public devnet/test fixture
- generated/local log artifact
- real credential requiring rotation

Current HEAD remains the priority source of truth for public repo safety.
