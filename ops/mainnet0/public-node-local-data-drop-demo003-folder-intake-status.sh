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
import json, os, stat, sys

data_dir=sys.argv[1]
euid=os.geteuid()
O_DIRECTORY=getattr(os,"O_DIRECTORY",0)
O_NOFOLLOW=getattr(os,"O_NOFOLLOW",0)
O_CLOEXEC=getattr(os,"O_CLOEXEC",0)
DIR_FLAGS=os.O_RDONLY|O_DIRECTORY|O_NOFOLLOW|O_CLOEXEC
READ_FLAGS=os.O_RDONLY|O_NOFOLLOW|O_CLOEXEC
MAX_INTAKE_BYTES=1024*1024

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
    if current.st_mode&0o022:
        if not (current.st_mode&stat.S_ISVTX): fail(f"{label}_group_or_world_writable_without_sticky")
        if current.st_uid not in (0,euid): fail(f"{label}_sticky_owner_not_operator_or_root")

def open_data_root(path):
    if not path or "\x00" in path: fail("data_dir_invalid")
    absolute=os.path.isabs(path)
    parts=[p for p in path.split(os.sep) if p not in ("",".")]
    if any(p==".." for p in parts): fail("data_dir_parent_component_rejected")
    fd=os.open("/" if absolute else ".",DIR_FLAGS)
    try:
        for idx,part in enumerate(parts):
            require_rename_protected_parent(fd,f"data_dir_parent_{idx}")
            next_fd=open_component(fd,part,f"data_dir_component_{idx}",idx==len(parts)-1)
            os.close(fd); fd=next_fd
        if not parts:
            st=os.fstat(fd)
            if st.st_uid!=euid: fail("data_dir_not_owned_by_operator")
            if st.st_mode&0o022: fail("data_dir_group_or_world_writable")
            parent_fd=os.open("..",DIR_FLAGS,dir_fd=fd)
            try: require_rename_protected_parent(parent_fd,"data_dir_parent")
            finally: os.close(parent_fd)
        result=fd; fd=-1; return result
    finally:
        if fd>=0: os.close(fd)

def read_json_file(dir_fd,name,label):
    before=os.stat(name,dir_fd=dir_fd,follow_symlinks=False)
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode): fail(f"{label}_not_direct_regular_file")
    if before.st_uid!=euid: fail(f"{label}_not_owned_by_operator")
    if before.st_mode&0o022: fail(f"{label}_group_or_world_writable")
    if before.st_nlink!=1: fail(f"{label}_link_count_not_one")
    if before.st_size<=0 or before.st_size>MAX_INTAKE_BYTES: fail(f"{label}_size_invalid")
    fd=os.open(name,READ_FLAGS,dir_fd=dir_fd)
    try:
        opened=os.fstat(fd)
        if not stat.S_ISREG(opened.st_mode) or not same_stamp(before,opened): fail(f"{label}_identity_changed")
        chunks=[]; total=0
        while True:
            chunk=os.read(fd,65536)
            if not chunk: break
            total+=len(chunk)
            if total>MAX_INTAKE_BYTES: fail(f"{label}_growth")
            chunks.append(chunk)
        after=os.fstat(fd)
        visible=os.stat(name,dir_fd=dir_fd,follow_symlinks=False)
        if not same_stamp(opened,after) or not same_stamp(after,visible): fail(f"{label}_changed_during_read")
        return json.loads(b"".join(chunks).decode("utf-8"))
    finally:
        os.close(fd)

fds=[]
try:
    data_fd=open_data_root(data_dir); fds.append(data_fd)
    public_fd=open_component(data_fd,"public-node","public_node_dir",True); fds.append(public_fd)
    base_fd=open_component(public_fd,"local-data-drop-demo003-folder-fixtures","demo003_base_dir",True); fds.append(base_fd)
    latest_fd=open_component(base_fd,"latest","latest_dir",True); fds.append(latest_fd)
    archive_fd=open_component(base_fd,"archive","archive_dir",True); fds.append(archive_fd)
    record=read_json_file(latest_fd,"intake.json","intake_record")
    if record.get("marker")!="VOID_PUBLIC_NODE_LOCAL_DATA_DROP_DEMO003_FOLDER_INTAKE_RECORD_V1": fail("intake_record_marker")
    if record.get("offline_verified") is not True: fail("intake_record_offline_verified")
    if record.get("network_fetch_during_import") is not False: fail("intake_record_network_fetch")
    if record.get("trusted_as_network_truth") is not False: fail("intake_record_trust")
    if record.get("file_count")!=3: fail("intake_record_file_count")
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
