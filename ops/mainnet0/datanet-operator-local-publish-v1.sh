#!/usr/bin/env bash
set -euo pipefail

DATASET_ID=""
SOURCE_PATH=""
OUT_ROOT="${VOID_DATANET_OPERATOR_PUBLISH_ROOT:-.void/datanet/operator-published-v1}"

usage() {
  cat <<USAGE
VOID DataNet Operator Local Publish v1

Usage:
  $0 --dataset-id <safe-id> --source <file-or-folder> [--out-root <dir>]

Example:
  $0 --dataset-id zoso-test-dataset-v1 --source ./some-folder

Safety:
  terminal_only=true
  public_mutation=false
  ledger_write=false
  wc_credit_award=false
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --dataset-id)
      DATASET_ID="${2:-}"
      shift 2
      ;;
    --source)
      SOURCE_PATH="${2:-}"
      shift 2
      ;;
    --out-root)
      OUT_ROOT="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [ -z "$DATASET_ID" ] || [ -z "$SOURCE_PATH" ]; then
  usage >&2
  exit 2
fi

if ! printf '%s' "$DATASET_ID" | grep -Eq '^[a-z0-9][a-z0-9._-]{2,63}$'; then
  echo "invalid dataset_id: must match ^[a-z0-9][a-z0-9._-]{2,63}$" >&2
  exit 1
fi

if [ ! -e "$SOURCE_PATH" ]; then
  echo "source does not exist" >&2
  exit 1
fi

export VOID_DATANET_PUBLISH_DATASET_ID="$DATASET_ID"
export VOID_DATANET_PUBLISH_SOURCE_PATH="$SOURCE_PATH"
export VOID_DATANET_PUBLISH_OUT_ROOT="$OUT_ROOT"

python3 - <<'PY'
import hashlib
import json
import os
import pathlib
import re
import shutil
import time

dataset_id = os.environ["VOID_DATANET_PUBLISH_DATASET_ID"]
source = pathlib.Path(os.environ["VOID_DATANET_PUBLISH_SOURCE_PATH"]).expanduser()
out_root = pathlib.Path(os.environ["VOID_DATANET_PUBLISH_OUT_ROOT"])

safe_id_re = re.compile(r"^[a-z0-9][a-z0-9._-]{2,63}$")
if not safe_id_re.match(dataset_id):
    raise SystemExit("invalid dataset_id")

if not source.exists():
    raise SystemExit("source does not exist")

source_resolved = source.resolve()
out_dir = out_root / dataset_id
objects_dir = out_dir / "objects"
manifest_path = out_dir / "manifest.json"

def sha256_file(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def clean_rel(path: pathlib.Path) -> str:
    rel = path.as_posix()
    if rel.startswith("/") or "\\" in rel or "\x00" in rel or "\n" in rel or "\r" in rel:
        raise SystemExit(f"unsafe relative object path: {rel!r}")
    parts = pathlib.PurePosixPath(rel).parts
    if any(part in ("", ".", "..") for part in parts):
        raise SystemExit(f"unsafe relative object path: {rel!r}")
    return rel

files = []
if source_resolved.is_file():
    files.append((source_resolved, clean_rel(pathlib.Path(source_resolved.name))))
elif source_resolved.is_dir():
    for p in sorted(source_resolved.rglob("*")):
        if p.is_file():
            rel = clean_rel(p.relative_to(source_resolved))
            files.append((p, rel))
else:
    raise SystemExit("source must be a regular file or directory")

if not files:
    raise SystemExit("source contains no regular files")

if out_dir.exists():
    shutil.rmtree(out_dir)

objects_dir.mkdir(parents=True, exist_ok=True)

objects = []
total_bytes = 0

for src_file, rel_path in files:
    digest = sha256_file(src_file)
    size = src_file.stat().st_size
    total_bytes += size

    object_name = f"{digest}.blob"
    shutil.copy2(src_file, objects_dir / object_name)

    objects.append({
        "path": rel_path if isinstance(rel_path, str) else rel_path.as_posix(),
        "bytes": size,
        "sha256": digest,
        "object_name": object_name
    })

objects.sort(key=lambda item: item["path"])

content_root_material = json.dumps(objects, sort_keys=True, separators=(",", ":")).encode("utf-8")
content_root_sha256 = hashlib.sha256(content_root_material).hexdigest()

manifest = {
    "marker": "VOID_DATANET_OPERATOR_LOCAL_PUBLISH_MANIFEST_V1",
    "version": 1,
    "dataset_id": dataset_id,
    "created_at_unix": int(time.time()),
    "source_type": "file" if source_resolved.is_file() else "directory",
    "hash_algorithm": "sha256",
    "object_count": len(objects),
    "total_bytes": total_bytes,
    "content_root_sha256": content_root_sha256,
    "objects": objects,
    "public_safety": {
        "terminal_only": True,
        "public_mutation": False,
        "source_path_disclosed": False,
        "absolute_source_path_disclosed": False,
        "operator_home_path_disclosed": False,
        "local_storage_root_disclosed": False,
        "shell_command_disclosed": False,
        "ledger_write": False,
        "wc_credit_award": False,
        "wc_to_void_swap": False,
        "wallet_send": False
    }
}

manifest_json = json.dumps(manifest, sort_keys=True, indent=2) + "\n"

leak_needles = [
    str(source_resolved),
    str(pathlib.Path.home()),
]
for needle in leak_needles:
    if needle and needle != "/" and needle in manifest_json:
        raise SystemExit("refusing to write manifest: local path leaked into public manifest")

manifest_path.write_text(manifest_json, encoding="utf-8")
manifest_sha256 = hashlib.sha256(manifest_json.encode("utf-8")).hexdigest()

print("VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_V1")
print(f"dataset_id={dataset_id}")
print(f"source_type={manifest['source_type']}")
print(f"object_count={len(objects)}")
print(f"total_bytes={total_bytes}")
print(f"content_root_sha256={content_root_sha256}")
print(f"manifest_sha256={manifest_sha256}")
print(f"manifest_path={manifest_path.as_posix()}")
print("public_safe_manifest_written=true")
print("absolute_paths_in_manifest=false")
print("operator_home_path_in_manifest=false")
print("local_storage_root_in_manifest=false")
print("public_mutation=false")
print("ledger_write=false")
print("wc_credit_award=false")
print("VOID_DATANET_OPERATOR_LOCAL_PUBLISH_PACK_V1_GREEN")
PY
