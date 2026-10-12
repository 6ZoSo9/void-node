#!/usr/bin/env bash
set -euo pipefail
set +H

MARKER="VOID_FIRST_OFFICIAL_RELEASE_REHEARSAL_V1"
REPO="${VOID_REPO:-$(git rev-parse --show-toplevel)}"
OUT="${VOID_REHEARSAL_OUT:-$(mktemp -d /tmp/void-first-official-release-rehearsal-v1-XXXXXX)}"
REPOSITORY="${VOID_REPOSITORY_SLUG:-6ZoSo9/void-node}"
BASE_VERSION="${VOID_REHEARSAL_BASE_VERSION:-$(node -p 'require("./package.json").version')}"
SOURCE_COMMIT="$(git -C "$REPO" rev-parse HEAD)"
SOURCE_DATE_EPOCH="${SOURCE_DATE_EPOCH:-$(git -C "$REPO" show -s --format=%ct HEAD)}"
NOW_UTC="${VOID_REHEARSAL_NOW_UTC:-2000-01-01T00:00:00Z}"

case "$BASE_VERSION" in
  *-*) VERSION="${VOID_REHEARSAL_VERSION:-${BASE_VERSION}.rehearsal.1}" ;;
  *)   VERSION="${VOID_REHEARSAL_VERSION:-${BASE_VERSION}-rehearsal.1}" ;;
esac
TAG="release-v${VERSION}"

say() { printf '%s\n' "$*"; }
die() { say "ERROR: $*" >&2; exit 1; }

for cmd in git node npm sha256sum cmp python3; do
  command -v "$cmd" >/dev/null 2>&1 || die "$cmd is required"
done

test -f "$REPO/tools/build-public-release-v1.mjs" || die "release builder missing"
test -x "$REPO/tools/void-first-official-release-rehearsal-v1.mjs" || die "rehearsal tool missing"
mkdir -p "$OUT"
BUILD_A="$OUT/build-a"
BUILD_B="$OUT/build-b"
STATE="$OUT/state"

say "=== VOID first official release rehearsal v1 ==="
say "repo=$REPO"
say "repository=$REPOSITORY"
say "source_commit=$SOURCE_COMMIT"
say "version=$VERSION"
say "official_release_tag=$TAG"
say "rehearsal_out=$OUT"
say "release_tag_publish=false"
say "official_release_publish=false"
say "live_deployment=false"
say "service_restart=false"
say "money_movement=false"
say "guarded_lanes_activated=false"

say
say "=== [1] deterministic release fixture A ==="
(
  cd "$REPO"
  SOURCE_DATE_EPOCH="$SOURCE_DATE_EPOCH" \
    node tools/build-public-release-v1.mjs --out "$BUILD_A" --version "$VERSION"
)
(
  cd "$BUILD_A"
  sha256sum --check --strict SHA256SUMS
)

say
say "=== [2] deterministic release fixture B ==="
(
  cd "$REPO"
  SOURCE_DATE_EPOCH="$SOURCE_DATE_EPOCH" \
    node tools/build-public-release-v1.mjs --out "$BUILD_B" --version "$VERSION"
)
(
  cd "$BUILD_B"
  sha256sum --check --strict SHA256SUMS
)

cmp "$BUILD_A/SHA256SUMS" "$BUILD_B/SHA256SUMS"
say "deterministic_release_sha256sums_match=true"

say
say "=== [3] complete no-publish rehearsal chain ==="
node "$REPO/tools/void-first-official-release-rehearsal-v1.mjs" run-all \
  --repository "$REPOSITORY" \
  --version "$VERSION" \
  --source-commit "$SOURCE_COMMIT" \
  --release-dir "$BUILD_A" \
  --state-dir "$STATE" \
  --now "$NOW_UTC"

node "$REPO/tools/void-first-official-release-rehearsal-v1.mjs" verify \
  --release-dir "$BUILD_A" \
  --state-dir "$STATE"

say
say "=== [4] tamper refusal ==="
TAMPERED="$OUT/tampered-state"
cp -a "$STATE" "$TAMPERED"
python3 - "$TAMPERED/rehearsal-receipt-v1.json" <<'PY'
import json, pathlib, sys
p = pathlib.Path(sys.argv[1])
data = json.loads(p.read_text())
data["history_tip_sha256"] = "0" * 64
p.write_text(json.dumps(data, indent=2, sort_keys=True) + "\n")
PY
if node "$REPO/tools/void-first-official-release-rehearsal-v1.mjs" verify \
    --release-dir "$BUILD_A" --state-dir "$TAMPERED" >/tmp/void-rehearsal-tamper.out 2>&1; then
  cat /tmp/void-rehearsal-tamper.out
  die "tampered rehearsal state was accepted"
fi
say "tampered_rehearsal_state_refused=true"

say
say "=== [5] no official publication boundary ==="
if git -C "$REPO" tag --list "$TAG" | grep -q .; then
  die "rehearsal tag unexpectedly exists: $TAG"
fi

test -f "$STATE/rendered/index.json"
test -f "$STATE/rendered/index.html"
python3 - "$STATE/rendered/index.json" <<'PY'
import json, sys
j = json.load(open(sys.argv[1]))
assert j["status"] == "rehearsal_control_plane_green", j
assert j["official_release_published"] is False, j
assert j["release_tag_published"] is False, j
assert j["live_deployment"] is False, j
assert j["service_restart"] is False, j
assert j["money_movement"] is False, j
assert j["guarded_lanes_activated"] is False, j
print("rendered_rehearsal_boundary_verified=true")
PY

say "release_tag_published=false"
say "official_release_published=false"
say "live_deployment=false"
say "service_restart=false"
say "money_movement=false"
say "guarded_lanes_activated=false"
say "$MARKER FULL_GREEN"
say "out=$OUT"
