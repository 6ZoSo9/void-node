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
grep -Fq "archive_bounded_decompressed_stream=true" "$VERIFIER" || fail "decompressed_stream_bound_marker_missing"
grep -Fq "output_root_nofollow_custody=true" "$VERIFIER" || fail "output_root_custody_marker_missing"
grep -Fq "BoundedDecompressedReader" "$VERIFIER" || fail "bounded_decompress_reader_missing"
grep -Fq "safe_diagnostic" "$VERIFIER" || fail "sanitized_diagnostic_missing"
grep -Fq "function diagnostic" "$VERIFIER" || fail "node_sanitized_diagnostic_missing"
grep -Fq "semantic_verify_descriptor_bound=true" "$VERIFIER" || fail "semantic_descriptor_binding_missing"
grep -Fq 'node - "/proc/self/fd/$FIXTURE_FD"' "$VERIFIER" || fail "node_descriptor_path_missing"
grep -Fq "fixture visible identity changed during semantic verify" "$VERIFIER" || fail "terminal_visible_identity_check_missing"
grep -Fq "Demo003 invocation path invalid" "$VERIFIER" || fail "invocation_path_guard_missing"
grep -Fq "O_NOFOLLOW" "$VERIFIER" || fail "nofollow_open_missing"
if grep -Fq 'tar -xzf' "$VERIFIER"; then fail "legacy_tar_extract_remains"; fi
if grep -Fq 'sha256sum -c' "$VERIFIER"; then fail "legacy_unbounded_checksum_paths_remain"; fi
if grep -Fq 'install -d -m 700 "$OUT"' "$VERIFIER"; then fail "pathname_output_root_creation_remains"; fi
if grep -Fq 'tee "$OUT/sha256-check.log"' "$VERIFIER"; then fail "pathname_postverify_log_write_remains"; fi
if grep -Fq 'echo "tarball=$TARBALL"' "$VERIFIER"; then fail "raw_tarball_diagnostic_remains"; fi
if grep -Fq 'echo "out=$OUT"' "$VERIFIER"; then fail "raw_output_diagnostic_remains"; fi

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
grep -Fq "semantic_verify_descriptor_bound=true" "$tmp/verify.log" ||
  fail "canonical_semantic_descriptor_binding_not_reported"

hostile_tar="$tmp/missing-tar"$'\nFORGED_TARBALL_GREEN=true\033[31m'
hostile_tar_log="$tmp/hostile-tar-path.log"
if OUT="$tmp/hostile-tar-output" bash "$VERIFIER" "$hostile_tar" >"$hostile_tar_log" 2>&1; then
  fail "hostile_tarball_invocation_path_accepted"
fi
python3 - "$hostile_tar_log" <<'PY'
from pathlib import Path
import sys

data = Path(sys.argv[1]).read_bytes()
if b"\x1b" in data:
    raise SystemExit("raw_tarball_escape_reached_diagnostic")
if any(line == b"FORGED_TARBALL_GREEN=true" for line in data.splitlines()):
    raise SystemExit("forged_tarball_line_reached_diagnostic")
if data.count(b"tarball=") != 1:
    raise SystemExit("tarball_diagnostic_count_invalid")
if b"VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_VERIFY_FOLDER_FIXTURE_V1_GREEN" in data:
    raise SystemExit("hostile_tarball_path_reached_green")
PY
test ! -e "$tmp/hostile-tar-output" ||
  fail "hostile_tarball_path_created_output"

hostile_out="$tmp/hostile-out"$'\nFORGED_OUT_OK=true\033[31m'
hostile_out_log="$tmp/hostile-out-path.log"
if OUT="$hostile_out" bash "$VERIFIER" "$tarball" >"$hostile_out_log" 2>&1; then
  fail "hostile_output_invocation_path_accepted"
fi
python3 - "$hostile_out_log" <<'PY'
from pathlib import Path
import sys

data = Path(sys.argv[1]).read_bytes()
if b"\x1b" in data:
    raise SystemExit("raw_output_escape_reached_diagnostic")
if any(line == b"FORGED_OUT_OK=true" for line in data.splitlines()):
    raise SystemExit("forged_output_line_reached_diagnostic")
if data.count(b"out=") != 1:
    raise SystemExit("output_diagnostic_count_invalid")
if b"[ok]" in data:
    raise SystemExit("hostile_output_path_reached_ok_marker")
if b"VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_VERIFY_FOLDER_FIXTURE_V1_GREEN" in data:
    raise SystemExit("hostile_output_path_reached_green")
PY
test ! -e "$hostile_out" ||
  fail "hostile_output_path_created_tree"

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

outside_dir="$tmp/outside-dir"
mkdir -m 750 "$outside_dir"
printf 'OUTSIDE_DIRECTORY_SENTINEL\n' >"$outside_dir/sentinel.txt"
outside_dir_before="$(sha256sum "$outside_dir/sentinel.txt" | awk '{print $1}')"
outside_dir_stat_before="$(stat -c '%d:%i:%f:%u:%g:%s:%y:%z' "$outside_dir")"

root_link="$tmp/verify-root-link"
ln -s "$outside_dir" "$root_link"
if OUT="$root_link" bash "$VERIFIER" "$tarball" >"$tmp/root-link.log" 2>&1; then
  fail "output_root_symlink_accepted"
fi
test "$(sha256sum "$outside_dir/sentinel.txt" | awk '{print $1}')" = "$outside_dir_before" ||
  fail "output_root_symlink_mutated_outside_sentinel"
test "$(find "$outside_dir" -mindepth 1 -maxdepth 1 | wc -l)" -eq 1 ||
  fail "output_root_symlink_created_outside_entry"
test "$(stat -c '%d:%i:%f:%u:%g:%s:%y:%z' "$outside_dir")" = "$outside_dir_stat_before" ||
  fail "output_root_symlink_mutated_outside_directory"

extract_link_root="$tmp/verify-extract-link"
mkdir -m 700 "$extract_link_root"
ln -s "$outside_dir" "$extract_link_root/extract"
if OUT="$extract_link_root" bash "$VERIFIER" "$tarball" >"$tmp/extract-link.log" 2>&1; then
  fail "extract_root_symlink_accepted"
fi
test "$(sha256sum "$outside_dir/sentinel.txt" | awk '{print $1}')" = "$outside_dir_before" ||
  fail "extract_root_symlink_mutated_outside_sentinel"
test "$(find "$outside_dir" -mindepth 1 -maxdepth 1 | wc -l)" -eq 1 ||
  fail "extract_root_symlink_created_outside_entry"
test "$(stat -c '%d:%i:%f:%u:%g:%s:%y:%z' "$outside_dir")" = "$outside_dir_stat_before" ||
  fail "extract_root_symlink_mutated_outside_directory"

python3 - "$tmp/pax-bomb.tar.gz" "$tmp/control-name.tar.gz" <<'PY'
import io
import tarfile
import sys

pax_out, control_out = sys.argv[1:]
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

def add_file(tf, name, data=b"x\n", pax_headers=None):
    item = tarfile.TarInfo(name)
    item.size = len(data)
    item.mode = 0o600
    if pax_headers is not None:
        item.pax_headers = dict(pax_headers)
    tf.addfile(item, io.BytesIO(data))

with tarfile.open(pax_out, "w:gz", format=tarfile.PAX_FORMAT) as tf:
    for name in dirs:
        add_dir(tf, name)
    for index, name in enumerate(files):
        headers = None
        if index == 0:
            headers = {"comment": "A" * (10 * 1024 * 1024)}
        add_file(tf, name, pax_headers=headers)

with tarfile.open(control_out, "w:gz", format=tarfile.PAX_FORMAT) as tf:
    for name in dirs:
        add_dir(tf, name)
    add_file(
        tf,
        "demo003-folder-fixture/files/bad\nFORGED_LOG_LINE=true\x1b[31m.txt",
    )
PY

pax_out="$tmp/verify-pax-bomb"
if OUT="$pax_out" bash "$VERIFIER" "$tmp/pax-bomb.tar.gz" >"$tmp/pax-bomb.log" 2>&1; then
  fail "pax_extension_decompression_bomb_accepted"
fi
grep -Fq "archive_decompressed_size_exceeded" "$tmp/pax-bomb.log" ||
  fail "pax_extension_decompression_bound_not_reported"
if [ -d "$pax_out/extract" ] &&
   find "$pax_out/extract" -mindepth 1 -print -quit | grep -q .; then
  fail "pax_bomb_extracted_before_rejection"
fi

control_out="$tmp/verify-control-name"
if OUT="$control_out" bash "$VERIFIER" "$tmp/control-name.tar.gz" >"$tmp/control-name.log" 2>&1; then
  fail "control_name_archive_accepted"
fi
python3 - "$tmp/control-name.log" <<'PY'
from pathlib import Path
import sys

data = Path(sys.argv[1]).read_bytes()
if b"\x1b" in data:
    raise SystemExit("raw_escape_reached_diagnostic")
if any(line == b"FORGED_LOG_LINE=true" for line in data.splitlines()):
    raise SystemExit("forged_log_line_reached_diagnostic")
if data.count(b"[fail] Demo003 archive safety:") != 1:
    raise SystemExit("unexpected_failure_diagnostic_count")
if b"FORGED_LOG_LINE=true" not in data:
    raise SystemExit("escaped_hostile_name_not_reported")
PY
if [ -d "$control_out/extract" ] &&
   find "$control_out/extract" -mindepth 1 -print -quit | grep -q .; then
  fail "control_name_archive_extracted_before_rejection"
fi

python3 - \
  "$fixture_out/demo003-folder-fixture" \
  "$tmp/manifest-control.tar.gz" <<'PY'
import hashlib
import json
import os
import shutil
import sys
import tarfile
import tempfile

source, out = sys.argv[1:]
work = tempfile.mkdtemp(prefix="manifest-control-", dir=os.path.dirname(out))
root = os.path.join(work, "demo003-folder-fixture")
shutil.copytree(source, root)

manifest_path = os.path.join(root, "manifest.json")
with open(manifest_path, "r", encoding="utf8") as handle:
    manifest = json.load(handle)
manifest["files"][0]["path"] = (
    "files/README.txt\nFORGED_MANIFEST_LOG_LINE=true\x1b[31m"
)
with open(manifest_path, "w", encoding="utf8") as handle:
    json.dump(manifest, handle, indent=2)
    handle.write("\n")

rels = [
    "manifest.json",
    "files/README.txt",
    "files/index.html",
    "files/metadata.json",
]
checksum_path = os.path.join(root, "sha256sums.txt")
with open(checksum_path, "w", encoding="ascii") as handle:
    for rel in rels:
        with open(os.path.join(root, rel), "rb") as source_file:
            digest = hashlib.sha256(source_file.read()).hexdigest()
        handle.write(f"{digest}  ./{rel}\n")

with tarfile.open(out, "w:gz", format=tarfile.PAX_FORMAT) as tf:
    tf.add(root, arcname="demo003-folder-fixture", recursive=False)
    tf.add(
        os.path.join(root, "files"),
        arcname="demo003-folder-fixture/files",
        recursive=False,
    )
    for rel in [
        "manifest.json",
        "sha256sums.txt",
        "files/README.txt",
        "files/index.html",
        "files/metadata.json",
    ]:
        tf.add(
            os.path.join(root, rel),
            arcname="demo003-folder-fixture/" + rel,
            recursive=False,
        )
PY


swap_out="$tmp/verify-interphase-swap"
swap_replacement="$tmp/verify-interphase-replacement"
swap_detached="$tmp/verify-interphase-detached"
cp -a "$verify_out" "$swap_replacement"

real_python="$(command -v python3)"
wrapper_bin="$tmp/interphase-wrapper-bin"
mkdir -m 700 "$wrapper_bin"
cat >"$wrapper_bin/python3" <<'SH'
#!/usr/bin/env bash
set -euo pipefail

real="${VOID_DEMO003_TEST_REAL_PYTHON:?}"
if [ "${1:-}" != "-" ]; then
  exec "$real" "$@"
fi

script="$(mktemp "${TMPDIR:-/tmp}/void-demo003-python-wrapper.XXXXXX")"
trap 'rm -f "$script"' EXIT
cat >"$script"

set +e
"$real" "$script" "${@:2}"
rc=$?
set -e

if [ "$rc" -eq 0 ] &&
   grep -Fq "MAX_TARBALL_BYTES = 16 * 1024 * 1024" "$script" &&
   [ "${VOID_DEMO003_TEST_SWAP_ON_ARCHIVE_PHASE:-0}" = "1" ]; then
  mv -- "${VOID_DEMO003_TEST_SWAP_OUT:?}" "${VOID_DEMO003_TEST_SWAP_DETACHED:?}"
  mv -- "${VOID_DEMO003_TEST_SWAP_REPLACEMENT:?}" "${VOID_DEMO003_TEST_SWAP_OUT:?}"
fi

exit "$rc"
SH
chmod 700 "$wrapper_bin/python3"

swap_log="$tmp/interphase-swap.log"
if PATH="$wrapper_bin:$PATH" \
   VOID_DEMO003_TEST_REAL_PYTHON="$real_python" \
   VOID_DEMO003_TEST_SWAP_ON_ARCHIVE_PHASE=1 \
   VOID_DEMO003_TEST_SWAP_OUT="$swap_out" \
   VOID_DEMO003_TEST_SWAP_DETACHED="$swap_detached" \
   VOID_DEMO003_TEST_SWAP_REPLACEMENT="$swap_replacement" \
   OUT="$swap_out" \
   bash "$VERIFIER" "$tarball" >"$swap_log" 2>&1; then
  fail "interphase_output_tree_swap_accepted"
fi
grep -Fq "fixture identity changed before semantic verify" "$swap_log" ||
  fail "interphase_output_tree_swap_identity_hold_missing"
if grep -Fq "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_VERIFY_FOLDER_FIXTURE_V1_GREEN" "$swap_log"; then
  fail "interphase_output_tree_swap_reached_green"
fi
test -d "$swap_detached/extract/demo003-folder-fixture" ||
  fail "interphase_detached_verified_tree_missing"

manifest_control_out="$tmp/verify-manifest-control"
if OUT="$manifest_control_out" \
   bash "$VERIFIER" "$tmp/manifest-control.tar.gz" \
   >"$tmp/manifest-control.log" 2>&1; then
  fail "manifest_control_path_archive_accepted"
fi
python3 - "$tmp/manifest-control.log" <<'PY'
from pathlib import Path
import sys

data = Path(sys.argv[1]).read_bytes()
if b"\x1b" in data:
    raise SystemExit("raw_manifest_escape_reached_diagnostic")
if any(line == b"FORGED_MANIFEST_LOG_LINE=true" for line in data.splitlines()):
    raise SystemExit("forged_manifest_log_line_reached_diagnostic")
if b"FORGED_MANIFEST_LOG_LINE=true" not in data:
    raise SystemExit("escaped_hostile_manifest_path_not_reported")
PY

echo "${MARKER}_PROOF_GREEN"
echo "canonical_fixture_green=true"
echo "symlink_member_rejected_before_extract=true"
echo "hardlink_member_rejected_before_extract=true"
echo "extra_member_rejected_before_extract=true"
echo "traversal_member_rejected_before_extract=true"
echo "pax_extension_header_decompression_bounded=true"
echo "output_root_symlink_rejected=true"
echo "extract_root_symlink_rejected=true"
echo "archive_control_diagnostics_escaped=true"
echo "manifest_path_diagnostics_escaped=true"
echo "invocation_path_diagnostics_escaped=true"
echo "interphase_output_tree_swap_rejected=true"
echo "semantic_verify_descriptor_bound=true"
echo "outside_sentinel_unchanged=true"
echo "network_fetch=false"
echo "live_runtime_mutation=false"
echo "credential_access=false"
echo "private_key_access=false"
echo "chain2050_mutation=false"
