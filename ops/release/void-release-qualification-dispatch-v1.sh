#!/usr/bin/env bash
set -euo pipefail
set +H

REPO="${VOID_RELEASE_REPOSITORY:-6ZoSo9/void-node}"
TAG="${VOID_RELEASE_TAG:-}"
COMMIT="${VOID_RELEASE_SOURCE_COMMIT:-}"
CONFIRM="${VOID_RELEASE_CONFIRM:-}"

test -n "$TAG" || { echo "ERROR: VOID_RELEASE_TAG is required" >&2; exit 1; }
test -n "$COMMIT" || { echo "ERROR: VOID_RELEASE_SOURCE_COMMIT is required" >&2; exit 1; }
EXPECTED="QUALIFY VOID RELEASE $TAG AT $COMMIT"
test "$CONFIRM" = "$EXPECTED" || { echo "ERROR: exact confirmation required: $EXPECTED" >&2; exit 1; }

gh workflow run public-release-qualification-v1.yml \
  --repo "$REPO" \
  -f release_tag="$TAG" \
  -f source_commit="$COMMIT" \
  -f confirm="$CONFIRM"

echo "VOID_RELEASE_QUALIFICATION_DISPATCH_V1_GREEN"
echo "release_tag_published=false"
echo "stable_promoted=false"
echo "live_deployment=false"
echo "money_movement=false"
