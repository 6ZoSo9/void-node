#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

MARKER="VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_VERIFY_ARCHIVE_SAFETY_V1"
FIXTURE="ops/mainnet0/public-node-local-data-drop-demo003-folder-fixture.sh"
VERIFIER="ops/mainnet0/public-node-local-data-drop-demo003-verify-folder-fixture.sh"

fail() {
  printf '%s HOLD: %s\n' "$MARKER" "$*" >&2
  exit 1
}

bash -n "$FIXTURE"
bash -n "$VERIFIER"
grep -Fq "archive_member_preflight=true" "$VERIFIER" || fail "archive_preflight_marker_missing"
grep -Fq "archive_exact_member_set=true" "$VERIFIER" || fail "exact_member_set_marker_missing"
grep -Fq "for member in tf:" "$VERIFIER" || fail "streaming_member_iteration_missing"
if grep -Fq "getmembers()" "$VERIFIER"; then fail "unbounded_member_materialization_remains"; fi
grep -Fq "member_not_direct_regular_file" "$VERIFIER" || fail "link_type_rejection_missing"
grep -Fq "post_extract_nofollow_custody=true" "$VERIFIER" || fail "post_extract_custody_marker_missing"
grep -Fq "O_NOFOLLOW" "$VERIFIER" || fail "nofollow_open_missing"
if grep -Fq 'tar -xzf' "$VERIFIER"; then fail "legacy_tar_extract_remains"; fi
if grep -Fq 'sha256sum -c' "$VERIFIER"; then fail "legacy_unbounded_checksum_paths_remain"; fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

fixture_out="$tmp/canonical-fixture"
verify_out="$tmp/canonical-verify"
OUT="$fixture_out" bash "$FIXTURE" >"$tmp/fixture.log"
tarball="$fixture_out/demo003-folder-fixture.tar.gz"
test -f "$tarball" && test ! -L "$tarball" || fail "canonical_tarball_missing"
OUT="$verify_out" bash "$VERIFIER" "$tarball" >"$tmp/verify.log"
grep -Fq "archive_member_preflight=true" "$tmp/verify.log" || fail "canonical_preflight_not_reported"
grep -Fq "archive_exact_member_set=true" "$tmp/verify.log" || fail "canonical_exact_set_not_reported"
grep -Fq "checksums_verified=true" "$tmp/verify.log" || fail "canonical_checksums_not_verified"
grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_VERIFY_FOLDER_FIXTURE_V1_GREEN" "$tmp/verify.log" ||
  fail "canonical_verifier_not_green"
if find "$verify_out/extract" -type l -print -quit | grep -q .; then fail "canonical_extract_contains_symlink"; fi

printf 'VOID_DEMO003_OUTSIDE_SENTINEL\n' >"$tmp/outside-sentinel.txt"
outside_before="$(sha256sum "$tmp/outside-sentinel.txt" | awk '{print $1}')"

python3 - "$tmp" <<'PY'
import io
import os
import tarfile
import sys

root = sys.argv[1]
dirs = [
    "demo003-folder-fixture",
    "demo003-folder-fixture/files",
]
files = [
    "demo003-folder-fixture/manifest.json",
    "demo003-folder-fixture/sha256sums.txt",
    "demo003-folder-fixture/files/README.txt",
    "demo003-folder-fixture/files/index.html",
    "demo003-folder-fixture/files/metadata.json",
]

def add_dir(tf, name):
    item = tarfile.TarInfo(name)
    item.type = tarfile.DIRTYPE
    item.mode = 0o700
    tf.addfile(item)

def add_file(tf, name, data=b"x\n"):
    item = tarfile.TarInfo(name)
    item.size = len(data)
    item.mode = 0o600
    tf.addfile(item, io.BytesIO(data))

def make(kind):
    out = os.path.join(root, f"bad-{kind}.tar.gz")
    with tarfile.open(out, "w:gz") as tf:
        for name in dirs:
            add_dir(tf, name)
        for name in files:
            if name == "demo003-folder-fixture/files/metadata.json" and kind == "symlink":
                item = tarfile.TarInfo(name)
                item.type = tarfile.SYMTYPE
                item.linkname = os.path.join(root, "outside-sentinel.txt")
                tf.addfile(item)
            elif name == "demo003-folder-fixture/files/metadata.json" and kind == "hardlink":
                item = tarfile.TarInfo(name)
                item.type = tarfile.LNKTYPE
                item.linkname = "demo003-folder-fixture/files/README.txt"
                tf.addfile(item)
            else:
                add_file(tf, name)
        if kind == "extra":
            add_file(tf, "demo003-folder-fixture/files/extra.txt")
        if kind == "traversal":
            add_file(tf, "demo003-folder-fixture/../escape.txt")

for kind in ("symlink", "hardlink", "extra", "traversal"):
    make(kind)
PY

for kind in symlink hardlink extra traversal; do
  bad_out="$tmp/verify-$kind"
  if OUT="$bad_out" bash "$VERIFIER" "$tmp/bad-$kind.tar.gz" >"$tmp/$kind.log" 2>&1; then
    fail "unsafe_archive_accepted:$kind"
  fi
  test "$(sha256sum "$tmp/outside-sentinel.txt" | awk '{print $1}')" = "$outside_before" ||
    fail "outside_sentinel_mutated:$kind"
  if [ -d "$bad_out/extract" ] &&
     find "$bad_out/extract" -mindepth 1 -print -quit | grep -q .; then
    fail "unsafe_archive_extracted_before_rejection:$kind"
  fi
done

echo "${MARKER}_PROOF_GREEN"
echo "canonical_fixture_green=true"
echo "symlink_member_rejected_before_extract=true"
echo "hardlink_member_rejected_before_extract=true"
echo "extra_member_rejected_before_extract=true"
echo "traversal_member_rejected_before_extract=true"
echo "outside_sentinel_unchanged=true"
echo "network_fetch=false"
echo "live_runtime_mutation=false"
echo "credential_access=false"
echo "private_key_access=false"
echo "chain2050_mutation=false"
