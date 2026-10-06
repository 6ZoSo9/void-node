#!/usr/bin/env bash
set -euo pipefail

DATA_DIR="${DATA_DIR:-.runtime/mainnet0}"
BASE="$DATA_DIR/public-node/local-data-drop-demo003-folder-fixtures"
LATEST="$BASE/latest"
ARCHIVE_DIR="$BASE/archive"

echo "=== VOID Public Node Demo 003 Folder Intake Status v1 ==="
echo "marker=VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1"
echo "data_dir=$DATA_DIR"
echo "latest=$LATEST"
echo "archive_dir=$ARCHIVE_DIR"

if ! python3 - "$DATA_DIR" <<'PY'
import hashlib
import json
import os
import re
import stat
import sys

data_dir=sys.argv[1]
euid=os.geteuid()
O_DIRECTORY=getattr(os,"O_DIRECTORY",0)
O_NOFOLLOW=getattr(os,"O_NOFOLLOW",0)
O_CLOEXEC=getattr(os,"O_CLOEXEC",0)
DIR_FLAGS=os.O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC
READ_FLAGS=os.O_RDONLY|O_NOFOLLOW|O_CLOEXEC
MAX_MEMBER_BYTES=2*1024*1024
EXPECTED_OBJECT_SET="demo003-folder-fixture-v1"
EXPECTED_PAYLOAD_NAMES={"README.txt","index.html","metadata.json"}
EXPECTED_PAYLOAD_PATHS={"files/"+name for name in EXPECTED_PAYLOAD_NAMES}
EXPECTED_LATEST_NAMES={"files","manifest.json","sha256sums.txt","fixture.log","verify.log","intake.json"}
EXPECTED_CHECKSUM_PATHS={"./manifest.json"}|{"./"+path for path in EXPECTED_PAYLOAD_PATHS}
SEALED_ORDER=(
    "manifest.json",
    "sha256sums.txt",
    "files/README.txt",
    "files/index.html",
    "files/metadata.json",
)
SHA256_RE=re.compile(r"[0-9a-f]{64}")

def fail(msg): raise RuntimeError(msg)
def same_identity(a,b): return (a.st_dev,a.st_ino)==(b.st_dev,b.st_ino)
def same_stamp(a,b):
    return same_identity(a,b) and a.st_size==b.st_size and a.st_mtime_ns==b.st_mtime_ns and a.st_ctime_ns==b.st_ctime_ns and a.st_mode==b.st_mode and a.st_uid==b.st_uid and a.st_gid==b.st_gid and a.st_nlink==b.st_nlink

def open_component(parent_fd,name,label,require_custody):
    if not name or name in (".","..") or "/" in name: fail(f"{label}_invalid_component")
    before=os.stat(name,dir_fd=parent_fd,follow_symlinks=False)
    if not stat.S_ISDIR(before.st_mode) or stat.S_ISLNK(before.st_mode): fail(f"{label}_not_direct_directory")
    fd=os.open(name,DIR_FLAGS,dir_fd=parent_fd)
    after=os.fstat(fd)
    if not stat.S_ISDIR(after.st_mode) or not same_identity(before,after):
        os.close(fd); fail(f"{label}_identity_changed")
    if require_custody and after.st_uid!=euid:
        os.close(fd); fail(f"{label}_not_owned_by_operator")
    if require_custody and (after.st_mode&0o022):
        os.close(fd); fail(f"{label}_group_or_world_writable")
    return fd

def require_rename_protected_parent(fd,label):
    current=os.fstat(fd)
    if not stat.S_ISDIR(current.st_mode): fail(f"{label}_not_directory")
    if current.st_uid not in (0,euid): fail(f"{label}_owner_not_operator_or_root")
    if current.st_mode&0o022 and not (current.st_mode&stat.S_ISVTX): fail(f"{label}_group_or_world_writable_without_sticky")

def open_data_root(path):
    if not path or "\x00" in path: fail("data_dir_invalid")
    original_parts=[p for p in path.split(os.sep) if p not in ("",".")]
    if any(p==".." for p in original_parts): fail("data_dir_parent_component_rejected")
    resolved=os.path.abspath(path)
    parts=[p for p in resolved.split(os.sep) if p]
    if not parts: fail("data_dir_filesystem_root_rejected")
    fd=os.open("/",DIR_FLAGS)
    try:
        for idx,part in enumerate(parts):
            require_rename_protected_parent(fd,f"data_dir_parent_{idx}")
            next_fd=open_component(fd,part,f"data_dir_component_{idx}",idx==len(parts)-1)
            os.close(fd); fd=next_fd
        result=fd; fd=-1; return result
    finally:
        if fd>=0: os.close(fd)

def require_exact_names(dir_fd,expected,label):
    observed=set(os.listdir(dir_fd))
    if observed!=expected:
        missing=sorted(expected-observed)
        extra=sorted(observed-expected)
        fail(f"{label}_member_set:missing={missing}:extra={extra}")

def read_regular_file(dir_fd,name,label,max_bytes=MAX_MEMBER_BYTES):
    before=os.stat(name,dir_fd=dir_fd,follow_symlinks=False)
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode): fail(f"{label}_not_direct_regular_file")
    if before.st_uid!=euid: fail(f"{label}_not_owned_by_operator")
    if before.st_mode&0o022: fail(f"{label}_group_or_world_writable")
    if before.st_nlink!=1: fail(f"{label}_link_count_not_one")
    if before.st_size<=0 or before.st_size>max_bytes: fail(f"{label}_size_invalid")
    fd=os.open(name,READ_FLAGS,dir_fd=dir_fd)
    try:
        opened=os.fstat(fd)
        if not stat.S_ISREG(opened.st_mode) or not same_stamp(before,opened): fail(f"{label}_identity_changed")
        chunks=[]; total=0
        while True:
            chunk=os.read(fd,65536)
            if not chunk: break
            total+=len(chunk)
            if total>max_bytes: fail(f"{label}_growth")
            chunks.append(chunk)
        after=os.fstat(fd)
        visible=os.stat(name,dir_fd=dir_fd,follow_symlinks=False)
        if not same_stamp(opened,after) or not same_stamp(after,visible): fail(f"{label}_changed_during_read")
        return b"".join(chunks)
    finally:
        os.close(fd)

def read_json_file(dir_fd,name,label):
    return json.loads(read_regular_file(dir_fd,name,label).decode("utf-8"))

def sha256(data): return hashlib.sha256(data).hexdigest()
def canonical_json(value):
    try:
        return json.dumps(value,sort_keys=True,separators=(",",":"),ensure_ascii=False,allow_nan=False)
    except (TypeError,ValueError) as exc:
        fail("canonical_json_invalid:"+str(exc))

def require_boundary_contract(manifest):
    trust=manifest.get("trust_boundary")
    safety=manifest.get("safety_boundary")
    if not isinstance(trust,dict) or not isinstance(safety,dict): fail("manifest_boundaries_missing")
    if trust.get("offline_verified") is not True: fail("manifest_offline_verified")
    if trust.get("network_fetch") is not False: fail("manifest_network_fetch")
    if trust.get("network_fetch_during_import") is not False: fail("manifest_network_fetch_during_import")
    if trust.get("trusted_as_network_truth") is not False: fail("manifest_trusted_as_network_truth")
    for key in ("public_routes_only","read_only"):
        if safety.get(key) is not True: fail("manifest_safety_"+key)
    for key in ("mutation","money_movement","wallet_send","validator_mutation"):
        if safety.get(key) is not False: fail("manifest_safety_"+key)

def parse_checksum_ledger(data):
    try: text=data.decode("utf-8")
    except UnicodeDecodeError: fail("checksum_ledger_utf8")
    entries={}
    lines=text.splitlines()
    if len(lines)!=len(EXPECTED_CHECKSUM_PATHS): fail("checksum_ledger_line_count")
    for line in lines:
        match=re.fullmatch(r"([0-9a-f]{64})  (\./[^\x00\r\n]+)",line)
        if not match: fail("checksum_ledger_line_format")
        digest,path=match.groups()
        if path in entries: fail("checksum_ledger_duplicate_path")
        entries[path]=digest
    if set(entries)!=EXPECTED_CHECKSUM_PATHS: fail("checksum_ledger_member_set")
    return entries

fds=[]
try:
    data_fd=open_data_root(data_dir); fds.append(data_fd)
    public_fd=open_component(data_fd,"public-node","public_node_dir",True); fds.append(public_fd)
    base_fd=open_component(public_fd,"local-data-drop-demo003-folder-fixtures","demo003_base_dir",True); fds.append(base_fd)
    latest_fd=open_component(base_fd,"latest","latest_dir",True); fds.append(latest_fd)
    archive_fd=open_component(base_fd,"archive","archive_dir",True); fds.append(archive_fd)

    require_exact_names(latest_fd,EXPECTED_LATEST_NAMES,"latest")
    files_fd=open_component(latest_fd,"files","files_dir",True); fds.append(files_fd)
    require_exact_names(files_fd,EXPECTED_PAYLOAD_NAMES,"files")

    record=read_json_file(latest_fd,"intake.json","intake_record")
    manifest_bytes=read_regular_file(latest_fd,"manifest.json","manifest")
    manifest=json.loads(manifest_bytes.decode("utf-8"))
    checksum_bytes=read_regular_file(latest_fd,"sha256sums.txt","checksum_ledger")
    checksum_entries=parse_checksum_ledger(checksum_bytes)
    fixture_log=read_regular_file(latest_fd,"fixture.log","fixture_log")
    verify_log=read_regular_file(latest_fd,"verify.log","verify_log")

    if record.get("marker")!="VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_RECORD_V1": fail("intake_record_marker")
    if record.get("offline_verified") is not True: fail("intake_record_offline_verified")
    if record.get("network_fetch_during_import") is not False: fail("intake_record_network_fetch")
    if record.get("trusted_as_network_truth") is not False: fail("intake_record_trust")
    if record.get("verified_content_authority")!="sealed_memfd_snapshot": fail("intake_record_verified_content_authority")
    if record.get("visible_extraction_tree_trusted") is not False: fail("intake_record_visible_tree_boundary")
    sealed_record=record.get("sealed_snapshot_sha256")
    if not isinstance(sealed_record,dict) or set(sealed_record)!=set(SEALED_ORDER): fail("intake_record_sealed_snapshot_shape")
    if any(not isinstance(sealed_record[name],str) or not SHA256_RE.fullmatch(sealed_record[name]) for name in SEALED_ORDER): fail("intake_record_sealed_snapshot_digest")
    sealed_set=record.get("sealed_snapshot_set_sha256")
    if not isinstance(sealed_set,str) or not SHA256_RE.fullmatch(sealed_set): fail("intake_record_sealed_snapshot_set")
    if record.get("object_set_id")!=EXPECTED_OBJECT_SET: fail("intake_record_object_set_id")
    record_file_count=record.get("file_count")
    if type(record_file_count) is not int or record_file_count!=3: fail("intake_record_file_count")

    if manifest.get("marker")!="VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_MANIFEST_V1": fail("manifest_marker")
    if manifest.get("fixture_marker")!="VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_V1": fail("manifest_fixture_marker")
    if manifest.get("object_set_id")!=record.get("object_set_id"): fail("manifest_intake_object_set_mismatch")
    manifest_file_count=manifest.get("file_count")
    if type(manifest_file_count) is not int or manifest_file_count!=3: fail("manifest_file_count")
    if canonical_json(record.get("source_manifest"))!=canonical_json(manifest): fail("intake_source_manifest_mismatch")
    require_boundary_contract(manifest)

    rows=manifest.get("files")
    if not isinstance(rows,list) or len(rows)!=3: fail("manifest_files_array")
    by_path={}
    for row in rows:
        if not isinstance(row,dict): fail("manifest_file_row_type")
        path=row.get("path")
        if path not in EXPECTED_PAYLOAD_PATHS or path in by_path: fail("manifest_file_path_set")
        digest=row.get("sha256")
        size=row.get("sizeBytes")
        if not isinstance(digest,str) or not re.fullmatch(r"[0-9a-f]{64}",digest): fail("manifest_file_sha256_format")
        if not isinstance(size,int) or isinstance(size,bool) or size<=0: fail("manifest_file_size")
        by_path[path]=(digest,size)
    if set(by_path)!=EXPECTED_PAYLOAD_PATHS: fail("manifest_file_path_set")

    observed_hashes={"./manifest.json":sha256(manifest_bytes)}
    observed_sealed={
        "manifest.json": sha256(manifest_bytes),
        "sha256sums.txt": sha256(checksum_bytes),
    }
    for name in sorted(EXPECTED_PAYLOAD_NAMES):
        path="files/"+name
        data=read_regular_file(files_fd,name,"payload_"+name.replace(".","_"))
        digest=sha256(data)
        expected_digest,expected_size=by_path[path]
        if len(data)!=expected_size: fail("payload_size_mismatch:"+path)
        if digest!=expected_digest: fail("payload_sha256_mismatch:"+path)
        observed_hashes["./"+path]=digest
        observed_sealed[path]=digest

    if checksum_entries!=observed_hashes: fail("checksum_ledger_digest_mismatch")
    if observed_sealed!=sealed_record: fail("sealed_snapshot_digest_mismatch")
    sealed_material="".join(name+"="+observed_sealed[name]+"\n" for name in SEALED_ORDER).encode("ascii")
    if sha256(sealed_material)!=sealed_set: fail("sealed_snapshot_set_mismatch")
    if b"VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_FIXTURE_V1_GREEN" not in fixture_log: fail("fixture_log_green_marker_missing")
    if b"VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_VERIFY_FOLDER_FIXTURE_V1_GREEN" not in verify_log: fail("verify_log_green_marker_missing")
    if b"checksums_verified=true" not in verify_log: fail("verify_log_checksum_marker_missing")
    if b"verified_content_authority=sealed_memfd_snapshot" not in verify_log: fail("verify_log_sealed_authority_missing")
    if b"visible_extraction_tree_trusted=false" not in verify_log: fail("verify_log_visible_tree_boundary_missing")

    archive_count=0
    for name in os.listdir(archive_fd):
        try: st=os.stat(name,dir_fd=archive_fd,follow_symlinks=False)
        except FileNotFoundError: continue
        if stat.S_ISDIR(st.st_mode) and not stat.S_ISLNK(st.st_mode): archive_count+=1

    print("status=demo003_folder_intake_present")
    print("latest_present=true")
    print("latest_real_directory=true")
    print("latest_symlink=false")
    print("archive_count="+str(archive_count))
    print("object_set_id="+str(record.get("object_set_id")))
    print("file_count="+str(record.get("file_count")))
    print("offline_verified=true")
    print("network_fetch_during_import=false")
    print("trusted_as_network_truth=false")
    print("latest_member_set_exact=true")
    print("manifest_verified=true")
    print("checksums_verified=true")
    print("payload_digests_verified=true")
    print("verification_logs_verified=true")
    print("intake_manifest_binding=true")
    print("sealed_snapshot_binding=true")
    print("verified_content_authority=sealed_memfd_snapshot")
    print("visible_extraction_tree_trusted=false")
    print("sealed_snapshot_set_sha256="+sealed_set)
    print("demo003_publication_ancestry_safe=true")
    print("public_routes_only=true")
    print("read_only=true")
    print("VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=true")
except Exception as exc:
    print("demo003_publication_ancestry_safe=false")
    print("demo003_status_reason="+str(exc).replace("\n","_").replace("\r","_"))
    sys.exit(1)
finally:
    for fd in reversed(fds):
        try: os.close(fd)
        except OSError: pass
PY
then
  echo "status=demo003_folder_intake_missing_or_unsafe_latest"
  echo "VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_STATUS_V1_GREEN=false"
  exit 1
fi
