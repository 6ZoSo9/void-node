#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: $0 /path/to/demo003-folder-fixture.tar.gz" >&2
  exit 2
fi

TARBALL="$1"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="${OUT:-/tmp/public-node-local-data-drop-demo003-verify-folder-fixture-$STAMP}"
EXTRACT="$OUT/extract"
FIXTURE_DIR="$EXTRACT/demo003-folder-fixture"

echo "=== VOID Public Node Demo 003 Verify Folder Fixture v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_VERIFY_FOLDER_FIXTURE_V1"
echo "tarball=$TARBALL"
echo "out=$OUT"
echo "offline_verify=true"
echo "network_fetch=false"

umask 0077
install -d -m 700 "$OUT"
install -d -m 700 "$EXTRACT"

python3 - "$TARBALL" "$EXTRACT" <<'PY'
import os
import posixpath
import stat
import sys
import tarfile

tarball, extract = sys.argv[1:]
euid = os.geteuid()
O_NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)
O_CLOEXEC = getattr(os, "O_CLOEXEC", 0)
MAX_TARBALL_BYTES = 16 * 1024 * 1024
MAX_MEMBER_BYTES = 2 * 1024 * 1024
MAX_TOTAL_BYTES = 8 * 1024 * 1024

EXPECTED_DIRS = {
    "demo003-folder-fixture",
    "demo003-folder-fixture/files",
}
EXPECTED_FILES = {
    "demo003-folder-fixture/manifest.json",
    "demo003-folder-fixture/sha256sums.txt",
    "demo003-folder-fixture/files/README.txt",
    "demo003-folder-fixture/files/index.html",
    "demo003-folder-fixture/files/metadata.json",
}
EXPECTED = EXPECTED_DIRS | EXPECTED_FILES


def fail(msg):
    raise RuntimeError(msg)


def same_stamp(a, b):
    return (
        a.st_dev == b.st_dev
        and a.st_ino == b.st_ino
        and a.st_size == b.st_size
        and a.st_mtime_ns == b.st_mtime_ns
        and a.st_ctime_ns == b.st_ctime_ns
        and a.st_mode == b.st_mode
        and a.st_uid == b.st_uid
        and a.st_gid == b.st_gid
        and a.st_nlink == b.st_nlink
    )


def write_all(fd, data):
    view = memoryview(data)
    while view:
        n = os.write(fd, view)
        if n <= 0:
            fail("short_write")
        view = view[n:]


def main():
    listed = os.lstat(tarball)
    if not stat.S_ISREG(listed.st_mode) or stat.S_ISLNK(listed.st_mode):
        fail("tarball_not_direct_regular_file")
    if listed.st_size <= 0 or listed.st_size > MAX_TARBALL_BYTES:
        fail("tarball_size_invalid")

    fd = os.open(tarball, os.O_RDONLY | O_NOFOLLOW | O_CLOEXEC)
    try:
        opened = os.fstat(fd)
        if not stat.S_ISREG(opened.st_mode) or not same_stamp(listed, opened):
            fail("tarball_identity_changed")

        members_by_name = {}
        total_bytes = 0
        with os.fdopen(os.dup(fd), "rb") as raw:
            with tarfile.open(fileobj=raw, mode="r:gz") as tf:
                for member in tf.getmembers():
                    raw_name = member.name
                    name = raw_name.rstrip("/")
                    if (
                        not name
                        or raw_name.startswith("/")
                        or "\\" in raw_name
                        or posixpath.normpath(name) != name
                        or name == ".."
                        or name.startswith("../")
                    ):
                        fail(f"unsafe_member_name:{raw_name}")
                    if name not in EXPECTED:
                        fail(f"unexpected_member:{name}")
                    if name in members_by_name:
                        fail(f"duplicate_member:{name}")
                    if name in EXPECTED_DIRS:
                        if not member.isdir():
                            fail(f"member_not_directory:{name}")
                    else:
                        if (
                            not member.isfile()
                            or member.issym()
                            or member.islnk()
                            or getattr(member, "sparse", None)
                        ):
                            fail(f"member_not_direct_regular_file:{name}")
                        if member.size < 0 or member.size > MAX_MEMBER_BYTES:
                            fail(f"member_size_invalid:{name}")
                        total_bytes += member.size
                        if total_bytes > MAX_TOTAL_BYTES:
                            fail("archive_uncompressed_size_exceeded")
                    members_by_name[name] = member

                if set(members_by_name) != EXPECTED:
                    missing = sorted(EXPECTED - set(members_by_name))
                    fail("missing_members:" + ",".join(missing))

                for name in sorted(EXPECTED_DIRS, key=lambda value: value.count("/")):
                    dst = os.path.join(extract, *name.split("/"))
                    os.mkdir(dst, 0o700)

                for name in sorted(EXPECTED_FILES):
                    member = members_by_name[name]
                    source = tf.extractfile(member)
                    if source is None:
                        fail(f"member_stream_missing:{name}")
                    dst = os.path.join(extract, *name.split("/"))
                    out_fd = os.open(
                        dst,
                        os.O_WRONLY | os.O_CREAT | os.O_EXCL | O_NOFOLLOW | O_CLOEXEC,
                        0o600,
                    )
                    try:
                        copied = 0
                        while True:
                            chunk = source.read(65536)
                            if not chunk:
                                break
                            copied += len(chunk)
                            if copied > member.size or copied > MAX_MEMBER_BYTES:
                                fail(f"member_growth:{name}")
                            write_all(out_fd, chunk)
                        if copied != member.size:
                            fail(f"member_short_read:{name}")
                        os.fsync(out_fd)
                    finally:
                        os.close(out_fd)
                    source.close()

        after = os.fstat(fd)
        visible = os.lstat(tarball)
        if not same_stamp(opened, after) or not same_stamp(after, visible):
            fail("tarball_changed_during_verify")
    finally:
        os.close(fd)

    for name in EXPECTED_DIRS:
        p = os.path.join(extract, *name.split("/"))
        st = os.lstat(p)
        if not stat.S_ISDIR(st.st_mode) or stat.S_ISLNK(st.st_mode):
            fail(f"extracted_directory_invalid:{name}")
        if st.st_uid != euid or st.st_mode & 0o022:
            fail(f"extracted_directory_custody_invalid:{name}")

    for name in EXPECTED_FILES:
        p = os.path.join(extract, *name.split("/"))
        st = os.lstat(p)
        if not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode):
            fail(f"extracted_file_invalid:{name}")
        if st.st_uid != euid or st.st_nlink != 1 or st.st_mode & 0o022:
            fail(f"extracted_file_custody_invalid:{name}")

    print("archive_member_preflight=true")
    print("archive_exact_member_set=true")
    print("archive_links_rejected=true")
    print("archive_special_members_rejected=true")
    print("archive_bounded_uncompressed_bytes=true")
    print("post_extract_nofollow_custody=true")


try:
    main()
except Exception as exc:
    print("[fail] Demo003 archive safety: " + str(exc), file=sys.stderr)
    sys.exit(2)
PY

node - "$FIXTURE_DIR" <<'NODE' | tee "$OUT/sha256-check.log"
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const fixtureDir = process.argv[2];
const noFollow = fs.constants.O_NOFOLLOW;
const maxFileBytes = 2 * 1024 * 1024;

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

function stamp(st) {
  return [
    st.dev, st.ino, st.size, st.mtimeNs, st.ctimeNs,
    st.mode, st.uid, st.gid, st.nlink,
  ].join(":");
}

function readDirect(rel) {
  const p = path.join(fixtureDir, rel);
  const listed = fs.lstatSync(p, { bigint: true });
  const euid = typeof process.geteuid === "function" ? BigInt(process.geteuid()) : null;
  ok(euid !== null, "effective uid unavailable");
  ok(listed.isFile() && !listed.isSymbolicLink(), `not direct regular file ${rel}`);
  ok(listed.uid === euid, `wrong owner ${rel}`);
  ok(listed.nlink === 1n, `link count ${rel}`);
  ok((listed.mode & 0o022n) === 0n, `writable by group/world ${rel}`);
  ok(listed.size > 0n && listed.size <= BigInt(maxFileBytes), `size boundary ${rel}`);

  const fd = fs.openSync(p, fs.constants.O_RDONLY | noFollow);
  try {
    const opened = fs.fstatSync(fd, { bigint: true });
    ok(stamp(listed) === stamp(opened), `identity changed ${rel}`);
    const buf = fs.readFileSync(fd);
    const after = fs.fstatSync(fd, { bigint: true });
    const visible = fs.lstatSync(p, { bigint: true });
    ok(stamp(opened) === stamp(after), `changed during read ${rel}`);
    ok(stamp(after) === stamp(visible), `visible identity changed ${rel}`);
    ok(after.size === BigInt(buf.length), `byte count changed ${rel}`);
    return buf;
  } finally {
    fs.closeSync(fd);
  }
}

function readJson(rel) {
  return JSON.parse(readDirect(rel).toString("utf8"));
}

function sha256File(rel) {
  return crypto.createHash("sha256").update(readDirect(rel)).digest("hex");
}

const checksumExpected = new Set([
  "./manifest.json",
  "./files/README.txt",
  "./files/index.html",
  "./files/metadata.json",
]);
const checksumLines = readDirect("sha256sums.txt").toString("utf8").trimEnd().split("\n");
ok(checksumLines.length === checksumExpected.size, "checksum line count");
const checksumSeen = new Set();
for (const line of checksumLines) {
  const match = /^([a-f0-9]{64})  (\.\/(?:manifest\.json|files\/(?:README\.txt|index\.html|metadata\.json)))$/.exec(line);
  ok(match, `invalid checksum line ${JSON.stringify(line)}`);
  const rel = match[2];
  ok(checksumExpected.has(rel), `unexpected checksum path ${rel}`);
  ok(!checksumSeen.has(rel), `duplicate checksum path ${rel}`);
  checksumSeen.add(rel);
  ok(match[1] === sha256File(rel.slice(2)), `checksum mismatch ${rel}`);
}
ok(checksumSeen.size === checksumExpected.size, "checksum set incomplete");
console.log("[ok] exact checksum set verified");

const manifest = readJson("manifest.json");
const metadata = readJson("files/metadata.json");

ok(manifest.marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_MANIFEST_V1", "manifest marker");
ok(manifest.fixture_marker === "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_V1", "fixture marker");
ok(manifest.object_set_id === "demo003-folder-fixture-v1", "object set id");
ok(manifest.file_count === 3, "file count");
ok(Array.isArray(manifest.files) && manifest.files.length === 3, "files array");

const expected = new Set(["files/README.txt", "files/index.html", "files/metadata.json"]);
const seen = new Set();
for (const f of manifest.files) {
  ok(f && typeof f === "object", "invalid manifest file row");
  ok(expected.has(f.path), `unexpected file ${f.path}`);
  ok(!seen.has(f.path), `duplicate manifest file ${f.path}`);
  seen.add(f.path);
  const data = readDirect(f.path);
  ok(f.sha256 === crypto.createHash("sha256").update(data).digest("hex"), `sha mismatch ${f.path}`);
  ok(f.sizeBytes === data.length, `size mismatch ${f.path}`);
}
ok(seen.size === expected.size, "manifest file set incomplete");

ok(manifest.trust_boundary.offline_verified === true, "offline verified");
ok(manifest.trust_boundary.network_fetch === false, "network fetch false");
ok(manifest.trust_boundary.network_fetch_during_import === false, "network fetch during import false");
ok(manifest.trust_boundary.trusted_as_network_truth === false, "not network truth");

ok(manifest.safety_boundary.public_routes_only === true, "public routes only");
ok(manifest.safety_boundary.read_only === true, "read only");
ok(manifest.safety_boundary.mutation === false, "no mutation");
ok(manifest.safety_boundary.money_movement === false, "no money movement");
ok(manifest.safety_boundary.wallet_send === false, "no wallet send");
ok(manifest.safety_boundary.validator_mutation === false, "no validator mutation");

ok(metadata.public_routes_only === true, "metadata public routes only");
ok(metadata.read_only === true, "metadata read only");
ok(metadata.mutation === false, "metadata no mutation");
ok(metadata.money_movement === false, "metadata no money movement");
ok(metadata.wallet_send === false, "metadata no wallet send");
ok(metadata.validator_mutation === false, "metadata no validator mutation");
ok(metadata.trusted_as_network_truth === false, "metadata not network truth");

console.log("[ok] Demo 003 folder fixture offline verified");
NODE

echo "fixture_dir=$FIXTURE_DIR"
echo "archive_member_preflight=true"
echo "archive_exact_member_set=true"
echo "archive_links_rejected=true"
echo "post_extract_nofollow_custody=true"
echo "manifest_verified=true"
echo "checksums_verified=true"
echo "files_verified=true"
echo "metadata_verified=true"
echo "offline_verified=true"
echo "network_fetch=false"
echo "trusted_as_network_truth=false"
echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_VERIFY_FOLDER_FIXTURE_V1_GREEN"
