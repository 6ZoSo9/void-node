#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

DOC="ops/security/public-repo-gitleaks-history-triage.current.md"

echo "=== public repo gitleaks history triage proof ==="

echo
echo "=== [1] git truth ==="
git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

echo
echo "=== [2] triage doc markers ==="
test -f "$DOC"
grep -q '^status: current_head_green_history_triage_open$' "$DOC"
grep -q 'current_head_checkpoint: 1e16060c / ckpt-public-repo-gitleaks-current-classifier-green-20260527-103000' "$DOC"
grep -q '103 total findings' "$DOC"
grep -q '101 generic-api-key findings' "$DOC"
grep -q '2 private-key findings' "$DOC"
grep -q 'src/crypto/keypair.ts line 20 at commit 836bb7b1852e' "$DOC"
grep -q 'src/crypto/keypair.ts line 20 at commit cb535ccd66c3' "$DOC"
grep -q 'false positives caused by code that checks for PEM private-key header marker strings' "$DOC"
grep -q 'not classified as leaked private key material' "$DOC"
grep -q 'No public Git history rewrite is approved by this note' "$DOC"
grep -q 'burned and rotated or revoked' "$DOC"
echo "[ok] triage doc markers present"

echo
echo "=== [3] current tracked gitleaks proof remains green ==="
make public-repo-gitleaks-current-proof
make public-repo-hardening-proof
make mainnet0-status-smoke

echo
echo "=== public repo gitleaks history triage proof OK ==="
