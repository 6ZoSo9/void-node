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

if ! invocation_paths="$(
  python3 - "$TARBALL" "$OUT" <<'PY_PATHS'
import json
import sys

MAX_CHARS = 320

def safe(value):
    text = str(value)
    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS] + "..."
    return json.dumps(text, ensure_ascii=True)

tarball, out = sys.argv[1:]
print("tarball=" + safe(tarball))
print("out=" + safe(out))

for value in (tarball, out):
    if (
        len(value) > 4096
        or any(ord(ch) < 32 or ord(ch) == 127 for ch in value)
    ):
        raise SystemExit(2)
PY_PATHS
)"; then
  printf '%s\n' "$invocation_paths"
  echo "[fail] Demo003 invocation path invalid" >&2
  exit 2
fi
printf '%s\n' "$invocation_paths"
echo "offline_verify=true"
echo "network_fetch=false"

umask 0077

archive_phase_output="$(
python3 - "$TARBALL" "$OUT" <<'PY'
import gzip
import hashlib
import io
import json
import os
import posixpath
import stat
import sys
import tarfile

tarball, out = sys.argv[1:]
extract = os.path.join(out, "extract")
euid = os.geteuid()
O_NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)
O_CLOEXEC = getattr(os, "O_CLOEXEC", 0)
O_DIRECTORY = getattr(os, "O_DIRECTORY", 0)
MAX_TARBALL_BYTES = 16 * 1024 * 1024
MAX_MEMBER_BYTES = 2 * 1024 * 1024
MAX_TOTAL_BYTES = 8 * 1024 * 1024
MAX_ARCHIVE_DECOMPRESSED_BYTES = MAX_TOTAL_BYTES + 1024 * 1024
MAX_DIAGNOSTIC_CHARS = 320

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


def safe_diagnostic(value):
    text = str(value)
    if len(text) > MAX_DIAGNOSTIC_CHARS:
        text = text[:MAX_DIAGNOSTIC_CHARS] + "..."
    return json.dumps(text, ensure_ascii=True)


def member_label(value):
    return safe_diagnostic(value)


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


def same_dir_identity(a, b):
    return (
        a.st_dev == b.st_dev
        and a.st_ino == b.st_ino
        and a.st_mode == b.st_mode
        and a.st_uid == b.st_uid
        and a.st_gid == b.st_gid
    )


def write_all(fd, data):
    view = memoryview(data)
    while view:
        n = os.write(fd, view)
        if n <= 0:
            fail("short_write")
        view = view[n:]


class BoundedDecompressedReader:
    def __init__(self, raw, limit):
        self.raw = raw
        self.limit = limit
        self.total = 0

    def read(self, size=-1):
        remaining = self.limit - self.total
        if remaining < 0:
            fail("archive_decompressed_size_exceeded")
        maximum = remaining + 1
        if size is None or size < 0 or size > maximum:
            size = maximum
        data = self.raw.read(size)
        self.total += len(data)
        if self.total > self.limit:
            fail("archive_decompressed_size_exceeded")
        return data


def open_private_output_root(pathname):
    absolute = os.path.abspath(pathname)
    if absolute != pathname:
        fail("output_root_not_absolute_normalized")
    parent = os.path.dirname(absolute)
    basename = os.path.basename(absolute)
    if not basename or basename in (".", ".."):
        fail("output_root_basename_invalid")

    parent_fd = os.open(
        parent,
        os.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC,
    )
    try:
        try:
            listed = os.stat(
                basename,
                dir_fd=parent_fd,
                follow_symlinks=False,
            )
        except FileNotFoundError:
            os.mkdir(basename, 0o700, dir_fd=parent_fd)
            listed = os.stat(
                basename,
                dir_fd=parent_fd,
                follow_symlinks=False,
            )

        if (
            not stat.S_ISDIR(listed.st_mode)
            or stat.S_ISLNK(listed.st_mode)
            or listed.st_uid != euid
            or listed.st_mode & 0o077
        ):
            fail("output_root_not_private_direct_directory")

        out_fd = os.open(
            basename,
            os.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC,
            dir_fd=parent_fd,
        )
        opened = os.fstat(out_fd)
        if not same_dir_identity(listed, opened):
            os.close(out_fd)
            fail("output_root_identity_changed")
        return out_fd
    finally:
        os.close(parent_fd)


def create_extract_root(out_fd):
    try:
        existing = os.stat(
            "extract",
            dir_fd=out_fd,
            follow_symlinks=False,
        )
    except FileNotFoundError:
        existing = None
    if existing is not None:
        fail("extract_root_already_exists")

    os.mkdir("extract", 0o700, dir_fd=out_fd)
    listed = os.stat("extract", dir_fd=out_fd, follow_symlinks=False)
    if (
        not stat.S_ISDIR(listed.st_mode)
        or stat.S_ISLNK(listed.st_mode)
        or listed.st_uid != euid
        or listed.st_mode & 0o077
    ):
        fail("extract_root_not_private_direct_directory")

    extract_fd = os.open(
        "extract",
        os.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC,
        dir_fd=out_fd,
    )
    opened = os.fstat(extract_fd)
    if not same_dir_identity(listed, opened):
        os.close(extract_fd)
        fail("extract_root_identity_changed")
    return extract_fd


def read_tarball_snapshot():
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

        chunks = []
        total = 0
        while True:
            chunk = os.read(fd, min(65536, MAX_TARBALL_BYTES - total + 1))
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_TARBALL_BYTES:
                fail("tarball_size_invalid")
            chunks.append(chunk)
        compressed = b"".join(chunks)
        if len(compressed) != opened.st_size:
            fail("tarball_short_read")

        after = os.fstat(fd)
        visible = os.lstat(tarball)
        if not same_stamp(opened, after) or not same_stamp(after, visible):
            fail("tarball_changed_during_verify")
        return compressed
    finally:
        os.close(fd)


def bounded_tar(compressed):
    gz = gzip.GzipFile(fileobj=io.BytesIO(compressed), mode="rb")
    limited = BoundedDecompressedReader(
        gz,
        MAX_ARCHIVE_DECOMPRESSED_BYTES,
    )
    tf = tarfile.open(fileobj=limited, mode="r|")
    return gz, tf


def validate_member(member, members_by_name, state):
    state["count"] += 1
    if state["count"] > len(EXPECTED):
        fail("too_many_members")

    raw_name = member.name
    name = raw_name.rstrip("/")
    label = member_label(raw_name)
    if (
        not name
        or raw_name.startswith("/")
        or "\\" in raw_name
        or posixpath.normpath(name) != name
        or name == ".."
        or name.startswith("../")
    ):
        fail("unsafe_member_name:" + label)
    if name not in EXPECTED:
        fail("unexpected_member:" + label)
    if name in members_by_name:
        fail("duplicate_member:" + member_label(name))

    if name in EXPECTED_DIRS:
        if not member.isdir():
            fail("member_not_directory:" + member_label(name))
    else:
        if (
            not member.isfile()
            or member.issym()
            or member.islnk()
            or getattr(member, "sparse", None)
        ):
            fail("member_not_direct_regular_file:" + member_label(name))
        if member.size < 0 or member.size > MAX_MEMBER_BYTES:
            fail("member_size_invalid:" + member_label(name))
        state["total_bytes"] += member.size
        if state["total_bytes"] > MAX_TOTAL_BYTES:
            fail("archive_uncompressed_size_exceeded")

    members_by_name[name] = True
    return name


def preflight_archive(compressed):
    members_by_name = {}
    state = {"count": 0, "total_bytes": 0}
    gz, tf = bounded_tar(compressed)
    try:
        with tf:
            for member in tf:
                validate_member(member, members_by_name, state)
    finally:
        gz.close()

    if set(members_by_name) != EXPECTED:
        missing = sorted(EXPECTED - set(members_by_name))
        fail("missing_members:" + ",".join(missing))


def make_private_dir(parent_fd, name):
    os.mkdir(name, 0o700, dir_fd=parent_fd)
    listed = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
    if (
        not stat.S_ISDIR(listed.st_mode)
        or stat.S_ISLNK(listed.st_mode)
        or listed.st_uid != euid
        or listed.st_mode & 0o077
    ):
        fail("created_directory_custody_invalid:" + member_label(name))
    fd = os.open(
        name,
        os.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC,
        dir_fd=parent_fd,
    )
    if not same_dir_identity(listed, os.fstat(fd)):
        os.close(fd)
        fail("created_directory_identity_changed:" + member_label(name))
    return fd


def extract_archive(compressed, extract_fd):
    fixture_fd = make_private_dir(extract_fd, "demo003-folder-fixture")
    files_fd = None
    try:
        files_fd = make_private_dir(fixture_fd, "files")
        members_by_name = {}
        state = {"count": 0, "total_bytes": 0}
        gz, tf = bounded_tar(compressed)
        try:
            with tf:
                for member in tf:
                    name = validate_member(member, members_by_name, state)
                    if name in EXPECTED_DIRS:
                        continue
                    source = tf.extractfile(member)
                    if source is None:
                        fail("member_stream_missing:" + member_label(name))

                    if name.startswith("demo003-folder-fixture/files/"):
                        parent_fd = files_fd
                        leaf = name.rsplit("/", 1)[1]
                    else:
                        parent_fd = fixture_fd
                        leaf = name.rsplit("/", 1)[1]

                    out_fd = os.open(
                        leaf,
                        os.O_WRONLY
                        | os.O_CREAT
                        | os.O_EXCL
                        | O_NOFOLLOW
                        | O_CLOEXEC,
                        0o600,
                        dir_fd=parent_fd,
                    )
                    try:
                        copied = 0
                        while True:
                            chunk = source.read(65536)
                            if not chunk:
                                break
                            copied += len(chunk)
                            if copied > member.size or copied > MAX_MEMBER_BYTES:
                                fail("member_growth:" + member_label(name))
                            write_all(out_fd, chunk)
                        if copied != member.size:
                            fail("member_short_read:" + member_label(name))
                        os.fsync(out_fd)
                        created = os.fstat(out_fd)
                        if (
                            not stat.S_ISREG(created.st_mode)
                            or created.st_nlink != 1
                            or created.st_uid != euid
                            or created.st_mode & 0o022
                            or created.st_size != member.size
                        ):
                            fail("extracted_file_custody_invalid:" + member_label(name))
                    finally:
                        os.close(out_fd)
                        source.close()
        finally:
            gz.close()

        if set(members_by_name) != EXPECTED:
            missing = sorted(EXPECTED - set(members_by_name))
            fail("missing_members:" + ",".join(missing))
    finally:
        if files_fd is not None:
            os.close(files_fd)
        os.close(fixture_fd)


def seal_regular_file(parent_fd, name):
    listed = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
    if (
        not stat.S_ISREG(listed.st_mode)
        or stat.S_ISLNK(listed.st_mode)
        or listed.st_uid != euid
        or listed.st_nlink != 1
        or listed.st_mode & 0o022
        or listed.st_size <= 0
        or listed.st_size > MAX_MEMBER_BYTES
    ):
        fail("extracted_file_custody_invalid:" + member_label(name))

    fd = os.open(
        name,
        os.O_RDONLY | O_NOFOLLOW | O_CLOEXEC,
        dir_fd=parent_fd,
    )
    try:
        opened = os.fstat(fd)
        if not same_stamp(listed, opened):
            fail("extracted_file_identity_changed:" + member_label(name))

        digest = hashlib.sha256()
        total = 0
        while True:
            chunk = os.read(fd, 65536)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_MEMBER_BYTES:
                fail("extracted_file_growth:" + member_label(name))
            digest.update(chunk)

        after = os.fstat(fd)
        visible = os.stat(name, dir_fd=parent_fd, follow_symlinks=False)
        if (
            total != after.st_size
            or not same_stamp(opened, after)
            or not same_stamp(after, visible)
        ):
            fail("extracted_file_changed_during_seal:" + member_label(name))

        return digest.hexdigest()
    finally:
        os.close(fd)


def post_extract_custody(extract_fd):
    fixture_fd = os.open(
        "demo003-folder-fixture",
        os.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC,
        dir_fd=extract_fd,
    )
    files_fd = None
    try:
        fixture_stat = os.fstat(fixture_fd)
        if not stat.S_ISDIR(fixture_stat.st_mode):
            fail("extracted_fixture_directory_invalid")
        if fixture_stat.st_uid != euid or fixture_stat.st_mode & 0o022:
            fail("extracted_fixture_directory_custody_invalid")

        files_fd = os.open(
            "files",
            os.O_RDONLY | O_DIRECTORY | O_NOFOLLOW | O_CLOEXEC,
            dir_fd=fixture_fd,
        )
        files_stat = os.fstat(files_fd)
        if not stat.S_ISDIR(files_stat.st_mode):
            fail("extracted_files_directory_invalid")
        if files_stat.st_uid != euid or files_stat.st_mode & 0o022:
            fail("extracted_files_directory_custody_invalid")

        seals = {
            "manifest": seal_regular_file(fixture_fd, "manifest.json"),
            "checksums": seal_regular_file(fixture_fd, "sha256sums.txt"),
            "readme": seal_regular_file(files_fd, "README.txt"),
            "index": seal_regular_file(files_fd, "index.html"),
            "metadata": seal_regular_file(files_fd, "metadata.json"),
        }

        return fixture_stat, seals
    finally:
        if files_fd is not None:
            os.close(files_fd)
        os.close(fixture_fd)


def directory_identity(st):
    return ":".join(
        str(value)
        for value in (
            st.st_dev,
            st.st_ino,
            st.st_mode,
            st.st_uid,
            st.st_gid,
        )
    )


def main():
    out_fd = open_private_output_root(out)
    extract_fd = None
    try:
        extract_fd = create_extract_root(out_fd)
        compressed = read_tarball_snapshot()
        preflight_archive(compressed)
        extract_archive(compressed, extract_fd)
        fixture_stat, seals = post_extract_custody(extract_fd)
        os.fsync(extract_fd)
        os.fsync(out_fd)
    finally:
        if extract_fd is not None:
            os.close(extract_fd)
        os.close(out_fd)

    print("fixture_identity=" + directory_identity(fixture_stat))
    print("sealed_manifest_sha256=" + seals["manifest"])
    print("sealed_checksums_sha256=" + seals["checksums"])
    print("sealed_readme_sha256=" + seals["readme"])
    print("sealed_index_sha256=" + seals["index"])
    print("sealed_metadata_sha256=" + seals["metadata"])
    print("archive_member_preflight=true")
    print("archive_exact_member_set=true")
    print("archive_links_rejected=true")
    print("archive_special_members_rejected=true")
    print("archive_bounded_uncompressed_bytes=true")
    print("archive_bounded_decompressed_stream=true")
    print("output_root_nofollow_custody=true")
    print("post_extract_nofollow_custody=true")


try:
    main()
except Exception as exc:
    print(
        "[fail] Demo003 archive safety: " + safe_diagnostic(exc),
        file=sys.stderr,
    )
    sys.exit(2)
PY
)"
printf '%s\n' "$archive_phase_output"

FIXTURE_IDENTITY="$(
  printf '%s\n' "$archive_phase_output" |
    sed -n 's/^fixture_identity=\([0-9][0-9]*:[0-9][0-9]*:[0-9][0-9]*:[0-9][0-9]*:[0-9][0-9]*\)$/\1/p'
)"
test -n "$FIXTURE_IDENTITY" || {
  echo "[fail] Demo003 fixture identity missing" >&2
  exit 2
}

archive_seal() {
  key="$1"
  value="$(
    printf '%s\n' "$archive_phase_output" |
      sed -n "s/^${key}=\([0-9a-f]\{64\}\)$/\1/p"
  )"
  count="$(
    printf '%s\n' "$archive_phase_output" |
      grep -c "^${key}=" || true
  )"
  test "$count" = "1" && [[ "$value" =~ ^[0-9a-f]{64}$ ]] || return 1
  printf '%s' "$value"
}

SEALED_MANIFEST_SHA256="$(archive_seal sealed_manifest_sha256)" ||
  { echo "[fail] Demo003 manifest seal missing" >&2; exit 2; }
SEALED_CHECKSUMS_SHA256="$(archive_seal sealed_checksums_sha256)" ||
  { echo "[fail] Demo003 checksums seal missing" >&2; exit 2; }
SEALED_README_SHA256="$(archive_seal sealed_readme_sha256)" ||
  { echo "[fail] Demo003 README seal missing" >&2; exit 2; }
SEALED_INDEX_SHA256="$(archive_seal sealed_index_sha256)" ||
  { echo "[fail] Demo003 index seal missing" >&2; exit 2; }
SEALED_METADATA_SHA256="$(archive_seal sealed_metadata_sha256)" ||
  { echo "[fail] Demo003 metadata seal missing" >&2; exit 2; }

exec {FIXTURE_FD}<"$FIXTURE_DIR" || {
  echo "[fail] Demo003 fixture descriptor open failed" >&2
  exit 2
}

if ! python3 - "$FIXTURE_FD" "$FIXTURE_IDENTITY" <<'PY_FD'
import os
import stat
import sys

fd = int(sys.argv[1])
expected = sys.argv[2]
st = os.fstat(fd)
actual = ":".join(
    str(value)
    for value in (
        st.st_dev,
        st.st_ino,
        st.st_mode,
        st.st_uid,
        st.st_gid,
    )
)
if not stat.S_ISDIR(st.st_mode) or actual != expected:
    raise SystemExit(2)
PY_FD
then
  exec {FIXTURE_FD}<&-
  echo "[fail] Demo003 fixture identity changed before semantic verify" >&2
  exit 2
fi

node - "/proc/self/fd/$FIXTURE_FD" \
  "$SEALED_MANIFEST_SHA256" \
  "$SEALED_CHECKSUMS_SHA256" \
  "$SEALED_README_SHA256" \
  "$SEALED_INDEX_SHA256" \
  "$SEALED_METADATA_SHA256" <<'NODE'
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const fixtureDir = process.argv[2];
const sealedDigests = new Map([
  ["manifest.json", process.argv[3]],
  ["sha256sums.txt", process.argv[4]],
  ["files/README.txt", process.argv[5]],
  ["files/index.html", process.argv[6]],
  ["files/metadata.json", process.argv[7]],
]);
const noFollow = fs.constants.O_NOFOLLOW;
const maxFileBytes = 2 * 1024 * 1024;

function ok(x, msg) {
  if (!x) {
    console.error("[fail]", msg);
    process.exit(1);
  }
}

function diagnostic(value) {
  let text = String(value);
  if (text.length > 320) text = text.slice(0, 320) + "...";
  return JSON.stringify(text);
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
    const sealed = sealedDigests.get(rel);
    ok(typeof sealed === "string" && /^[a-f0-9]{64}$/.test(sealed), `sealed digest missing ${rel}`);
    ok(
      crypto.createHash("sha256").update(buf).digest("hex") === sealed,
      `sealed digest mismatch ${rel}`,
    );
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
  ok(expected.has(f.path), `unexpected file ${diagnostic(f.path)}`);
  ok(!seen.has(f.path), `duplicate manifest file ${diagnostic(f.path)}`);
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

if ! python3 - "$FIXTURE_FD" "$FIXTURE_DIR" "$FIXTURE_IDENTITY" <<'PY_VISIBLE'
import os
import stat
import sys

fd = int(sys.argv[1])
pathname = sys.argv[2]
expected = sys.argv[3]
opened = os.fstat(fd)
try:
    visible = os.stat(pathname, follow_symlinks=False)
except FileNotFoundError:
    raise SystemExit(2)

def identity(st):
    return ":".join(
        str(value)
        for value in (
            st.st_dev,
            st.st_ino,
            st.st_mode,
            st.st_uid,
            st.st_gid,
        )
    )

if (
    not stat.S_ISDIR(opened.st_mode)
    or not stat.S_ISDIR(visible.st_mode)
    or stat.S_ISLNK(visible.st_mode)
    or identity(opened) != expected
    or identity(visible) != expected
):
    raise SystemExit(2)
PY_VISIBLE
then
  exec {FIXTURE_FD}<&-
  echo "[fail] Demo003 fixture visible identity changed during semantic verify" >&2
  exit 2
fi

exec {FIXTURE_FD}<&-

printf 'fixture_dir=%s\n' "$FIXTURE_DIR"
echo "semantic_verify_descriptor_bound=true"
echo "semantic_verify_child_bytes_sealed=true"
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
