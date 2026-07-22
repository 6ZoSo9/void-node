#!/usr/bin/env bash
set -euo pipefail
set +H

REPO="${VOID_RELEASE_REPOSITORY:-6ZoSo9/void-node}"
WORKFLOW="public-release-publication-promotion-v1.yml"
CANARY_WORKFLOW="public-release-canary-v1.yml"

usage(){ cat <<'USAGE'
VOID immutable release workflow dispatcher v1

Usage:
  void-release-dispatch-v1.sh publish --version X.Y.Z --commit 40HEX --confirm "PUBLISH VOID RELEASE release-vX.Y.Z AT 40HEX"
  void-release-dispatch-v1.sh canary --tag release-vX.Y.Z --commit 40HEX --publication-receipt FILE
  void-release-dispatch-v1.sh download --run-id ID --name ARTIFACT --dir DIR
  void-release-dispatch-v1.sh status --run-id ID

The dispatcher never creates a tag or release itself. Publication occurs only
inside the protected GitHub Actions environment after the same exact checks.
USAGE
}

json_object_sha(){
  node - "$1" <<'NODE'
const fs=require('node:fs'),crypto=require('node:crypto');
function stable(v){if(v===null||typeof v!=='object')return v;if(Array.isArray(v))return v.map(stable);const o={};for(const k of Object.keys(v).sort())o[k]=stable(v[k]);return o;}
const j=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
process.stdout.write(crypto.createHash('sha256').update(JSON.stringify(stable(j))).digest('hex'));
NODE
}

COMMAND="${1:-help}"; shift || true
VERSION="" COMMIT="" CONFIRM="" TAG="" RECEIPT="" RUN_ID="" NAME="" DIR=""
while (($#)); do
  case "$1" in
    --version) VERSION="${2:?}"; shift 2;;
    --commit) COMMIT="${2:?}"; shift 2;;
    --confirm) CONFIRM="${2:?}"; shift 2;;
    --tag) TAG="${2:?}"; shift 2;;
    --publication-receipt) RECEIPT="${2:?}"; shift 2;;
    --run-id) RUN_ID="${2:?}"; shift 2;;
    --name) NAME="${2:?}"; shift 2;;
    --dir) DIR="${2:?}"; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "ERROR: unknown argument: $1" >&2; usage >&2; exit 64;;
  esac
done

case "$COMMAND" in
  help|-h|--help) usage;;
  publish)
    test -n "$VERSION" && test -n "$COMMIT" && test -n "$CONFIRM"
    [[ "$COMMIT" =~ ^[0-9a-f]{40}$ ]]
    TAG="release-v${VERSION}"
    test "$CONFIRM" = "PUBLISH VOID RELEASE ${TAG} AT ${COMMIT}"
    gh auth status
    test "$(gh api "repos/${REPO}/immutable-releases" --jq '.enabled')" = true
    if git ls-remote --exit-code --tags "https://github.com/${REPO}.git" "refs/tags/${TAG}" >/dev/null 2>&1; then
      echo "ERROR: tag already exists: $TAG" >&2; exit 1
    fi
    if gh release view "$TAG" --repo "$REPO" >/dev/null 2>&1; then
      echo "ERROR: release already exists: $TAG" >&2; exit 1
    fi
    gh workflow run "$WORKFLOW" --repo "$REPO" \
      -f action=publish \
      -f version="$VERSION" \
      -f source_commit="$COMMIT" \
      -f confirmation="$CONFIRM"
    echo "VOID_RELEASE_PUBLICATION_DISPATCH_V1_GREEN"
    ;;
  canary)
    test -n "$TAG" && test -n "$COMMIT" && test -f "$RECEIPT"
    [[ "$TAG" =~ ^release-v[0-9]+\.[0-9]+\.[0-9]+([+-][0-9A-Za-z.-]+)?$ ]]
    [[ "$COMMIT" =~ ^[0-9a-f]{40}$ ]]
    RECEIPT_SHA="$(json_object_sha "$RECEIPT")"
    gh workflow run "$CANARY_WORKFLOW" --repo "$REPO" \
      -f release_tag="$TAG" \
      -f source_commit="$COMMIT" \
      -f publication_receipt_sha256="$RECEIPT_SHA"
    echo "publication_receipt_sha256=$RECEIPT_SHA"
    echo "VOID_RELEASE_CANARY_DISPATCH_V1_GREEN"
    ;;
  download)
    test -n "$RUN_ID" && test -n "$NAME" && test -n "$DIR"
    mkdir -p "$DIR"
    gh run download "$RUN_ID" --repo "$REPO" --name "$NAME" --dir "$DIR"
    echo "VOID_RELEASE_WORKFLOW_ARTIFACT_DOWNLOAD_V1_GREEN"
    ;;
  status)
    test -n "$RUN_ID"
    gh run view "$RUN_ID" --repo "$REPO" --verbose
    ;;
  *) echo "ERROR: unknown command: $COMMAND" >&2; usage >&2; exit 64;;
esac
