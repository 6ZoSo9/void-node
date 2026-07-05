#!/usr/bin/env bash
set -euo pipefail

doc="docs/security/public-root-artifact-history-exposure-rotation-closeout-v1.md"
marker="VOID_PUBLIC_ROOT_ARTIFACT_HISTORY_EXPOSURE_ROTATION_CLOSEOUT_V1_GREEN"

test -f "$doc"

grep -F "historical Git objects" "$doc" >/dev/null
grep -F "publicly exposed" "$doc" >/dev/null
grep -F ".nodekey*" "$doc" >/dev/null
grep -F "*.env" "$doc" >/dev/null
grep -F "rotated or retired outside the repository" "$doc" >/dev/null
grep -F "does not perform a destructive Git history rewrite" "$doc" >/dev/null
grep -F "$marker" "$doc" >/dev/null

bash tools/check_public_repo_hygiene.sh >/dev/null

printf '%s\n' "$marker"
