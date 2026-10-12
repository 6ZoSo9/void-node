#!/usr/bin/env bash
set -euo pipefail
set +H
set +o histexpand

cd "${VOID_REPO:-$HOME/dev/void-node}"

echo "=== public GitHub templates proof ==="

git status --short
git rev-parse --short HEAD
git describe --tags --always --dirty

test -f .github/ISSUE_TEMPLATE/bug_report.md
test -f .github/ISSUE_TEMPLATE/security_report.md
test -f .github/ISSUE_TEMPLATE/docs_feedback.md
test -f .github/pull_request_template.md

grep -q 'Do not include private keys' .github/ISSUE_TEMPLATE/bug_report.md
grep -q 'Do not post live secrets' .github/ISSUE_TEMPLATE/security_report.md
grep -q 'GitHub private vulnerability reporting' .github/ISSUE_TEMPLATE/security_report.md
grep -q 'public active validator admission, treasury spend, Buy VOID fulfillment, and authority transfer remain guarded' .github/ISSUE_TEMPLATE/security_report.md
grep -q 'This report does not include private keys' .github/ISSUE_TEMPLATE/docs_feedback.md
grep -q 'This PR does not commit secrets' .github/pull_request_template.md
grep -q 'This PR does not open public active validator admission' .github/pull_request_template.md
grep -q 'make mainnet0-status-smoke' .github/pull_request_template.md

make mainnet0-status-smoke

echo "=== public GitHub templates proof OK ==="
