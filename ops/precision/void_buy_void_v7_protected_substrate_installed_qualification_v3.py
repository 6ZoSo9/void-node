#!/usr/bin/env python3
from __future__ import annotations
import argparse
import hashlib
import os
import pathlib
import stat
import subprocess

SOURCE_HEAD = "4c80887adc2b55e327f1aaec4f58a90d0bb1a3fb"
SOURCE_TREE = "de12c9d2d5e475d435d21da3b047d7b63b69e2b7"
SOURCE_RELEASE = pathlib.Path("/opt/void-node-live/releases/" + SOURCE_HEAD)
SOURCE = pathlib.Path("/opt/void-buy-void-v7-reviewed-v1")
PREENTRY = pathlib.Path("/opt/void-buy-void-v7-preentry-v1/void_buy_void_source_finality_v7_native_preentry_v1")
SELECTOR = pathlib.Path("/opt/void-buy-void-v7-selector-v1/void_buy_void_source_finality_live_process_v2_selector_guard_v1")
LAUNCHER = SOURCE / "ops/precision/void_buy_void_source_finality_v7_privileged_launcher_body_v2.bash"
CUSTODY_REL = pathlib.Path("runtime/canonical-producer-source-custody-v1.cjs")
CUSTODY_GIT_BLOB_SHA1 = "7c54d71db1fd041cc1a091cdb1a7fc8b80e0cb4a"
NATIVE_SHA = "8ce663ff7e3713fc6bf615dd743350be9e50dff729fdb3d609b065b158397851"
NATIVE_BYTES = 21600
SELECTOR_SHA = "048564b0a351a5ba3b9f980962d9261fa14a49823b5075ca4794bbeefecbb232"
SELECTOR_BYTES = 26680
LAUNCHER_SHA = "f2f864fc6e4f95c2cc7b258d68ecbeb95e7c006ead3951cbca39e0b3bbe37346"
LAUNCHER_BYTES = 11979
SOURCE_RELEASE_ROOT_MODE = 0o555
PROTECTED_SOURCE_ROOT_MODE = 0o755
PREDECESSOR_QUALIFIER_BLOB = "56a7ca798553766af525d9fb1ccbe58b70fe9c1d"
MARKER = "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALLED_QUALIFICATION_V3"
MAX_NODES = 250000
MAX_FILE_BYTES = 512 * 1024 * 1024
MAX_TOTAL_BYTES = 16 * 1024 * 1024 * 1024

class E(RuntimeError):
    pass

def sha256_file(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb", buffering=0) as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def git_blob_sha1(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw)
    return h.hexdigest()

def git_text(root: pathlib.Path, *args: str) -> str:
    env = {
        "PATH": "/usr/bin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": "/dev/null",
        "GIT_CONFIG_SYSTEM": "/dev/null",
        "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_OPTIONAL_LOCKS": "0",
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_ASKPASS": "/bin/false",
        "GIT_NO_LAZY_FETCH": "1",
        "GIT_PROTOCOL_FROM_USER": "0",
        "GIT_ALLOW_PROTOCOL": "",
        "GIT_PAGER": "",
    }
    cp = subprocess.run(
        [
            "/usr/bin/git",
            "-c", "safe.directory=" + str(root),
            "-c", "core.hooksPath=/dev/null",
            "-c", "core.fsmonitor=false",
            "-c", "core.untrackedCache=false",
            "-c", "submodule.recurse=false",
            "--no-replace-objects",
            "-C", str(root),
            *args,
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env,
        timeout=30,
        check=False,
    )
    if cp.returncode != 0:
        raise E("git_observation_failed:" + (args[0] if args else "unknown"))
    return cp.stdout.strip()

def require_clean_main_generation(root: pathlib.Path, label: str) -> None:
    if git_text(root, "rev-parse", "--verify", "HEAD^{commit}") != SOURCE_HEAD:
        raise E(label + "_head_mismatch")
    if git_text(root, "rev-parse", "--verify", "HEAD^{tree}") != SOURCE_TREE:
        raise E(label + "_tree_mismatch")
    if git_text(root, "symbolic-ref", "--short", "-q", "HEAD") != "main":
        raise E(label + "_branch_not_main")
    if git_text(root, "status", "--porcelain=v1", "--untracked-files=all") != "":
        raise E(label + "_not_clean")

def require_exact_release_generation() -> None:
    if SOURCE_RELEASE.resolve() != SOURCE_RELEASE or not SOURCE_RELEASE.is_dir() or SOURCE_RELEASE.is_symlink():
        raise E("source_release_path_invalid")
    require_clean_main_generation(SOURCE_RELEASE, "source_release")
    custody = SOURCE_RELEASE / CUSTODY_REL
    if git_blob_sha1(custody.read_bytes()) != CUSTODY_GIT_BLOB_SHA1:
        raise E("source_release_custody_checker_blob_mismatch")

def run_known_good_custody(target: pathlib.Path) -> str:
    custody = SOURCE_RELEASE / CUSTODY_REL
    env = {"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC"}
    cp = subprocess.run(
        ["/usr/bin/node", str(custody), str(target)],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env,
        timeout=120,
        check=False,
    )
    if cp.returncode != 0:
        raise E("canonical_source_custody_hold:" + (cp.stderr or cp.stdout).strip()[:240])
    line = cp.stdout.strip()
    if not line.startswith("VOID_CANONICAL_PRODUCER_SOURCE_CUSTODY_V1_GREEN source_nodes_checked="):
        raise E("canonical_source_custody_marker_missing")
    return line

def root_metadata_fields_valid(
    *,
    is_directory: bool,
    is_symlink: bool,
    uid: int,
    gid: int,
    mode: int,
    expected_mode: int,
) -> bool:
    return (
        is_directory
        and not is_symlink
        and uid == 0
        and gid == 0
        and mode == expected_mode
    )

def tree_digest(root: pathlib.Path, expected_root_mode: int) -> tuple[str, int, int]:
    if root.resolve() != root or not root.is_dir() or root.is_symlink():
        raise E("tree_root_invalid:" + str(root))
    rst = root.lstat()
    if not root_metadata_fields_valid(
        is_directory=stat.S_ISDIR(rst.st_mode),
        is_symlink=stat.S_ISLNK(rst.st_mode),
        uid=rst.st_uid,
        gid=rst.st_gid,
        mode=stat.S_IMODE(rst.st_mode),
        expected_mode=expected_root_mode,
    ):
        raise E("tree_root_metadata_invalid:" + str(root))
    h = hashlib.sha256()
    nodes = 0
    total = 0
    pending: list[tuple[pathlib.Path, pathlib.PurePosixPath]] = [(root, pathlib.PurePosixPath("."))]
    while pending:
        directory, rel = pending.pop()
        try:
            entries = sorted(os.scandir(directory), key=lambda e: e.name)
        except OSError as exc:
            raise E("tree_enumeration_failed:" + str(rel)) from exc
        for entry in entries:
            nodes += 1
            if nodes > MAX_NODES:
                raise E("tree_node_limit")
            child = directory / entry.name
            relative = (rel / entry.name).as_posix()
            st = os.lstat(child)
            mode = stat.S_IMODE(st.st_mode)
            if stat.S_ISDIR(st.st_mode):
                h.update(("D\0" + relative + "\0" + format(mode, "04o") + "\n").encode())
                pending.append((child, rel / entry.name))
            elif stat.S_ISREG(st.st_mode):
                if st.st_size > MAX_FILE_BYTES:
                    raise E("tree_file_size_limit:" + relative)
                total += st.st_size
                if total > MAX_TOTAL_BYTES:
                    raise E("tree_total_bytes_limit")
                digest = sha256_file(child)
                h.update(("F\0" + relative + "\0" + format(mode, "04o") + "\0" + str(st.st_size) + "\0" + digest + "\n").encode())
            elif stat.S_ISLNK(st.st_mode):
                target = os.readlink(child)
                h.update(("L\0" + relative + "\0" + target + "\n").encode())
            else:
                raise E("tree_node_kind_invalid:" + relative)
    return h.hexdigest(), nodes, total

def _stat_identity(st: os.stat_result) -> dict[str, int]:
    return {
        "dev": st.st_dev, "ino": st.st_ino, "mode": stat.S_IMODE(st.st_mode),
        "uid": st.st_uid, "gid": st.st_gid, "nlink": st.st_nlink,
        "size": st.st_size, "mtime_ns": st.st_mtime_ns, "ctime_ns": st.st_ctime_ns,
    }

def _binary_ancestor_snapshot(path: pathlib.Path, label: str) -> tuple[tuple[str, int, int, int, int, int, int], ...]:
    if not path.is_absolute() or "\x00" in str(path):
        raise E(label + "_absolute_path_required")
    current = path.parent
    first = True
    rows: list[tuple[str, int, int, int, int, int, int]] = []
    while True:
        st = os.lstat(current)
        mode = stat.S_IMODE(st.st_mode)
        if (
            not stat.S_ISDIR(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_uid != 0
            or st.st_gid != 0
            or mode & 0o022
        ):
            raise E(label + "_ancestor_custody_invalid:" + str(current))
        if first and mode != 0o755:
            raise E(label + "_binary_root_mode_invalid:" + str(current))
        rows.append((str(current), st.st_dev, st.st_ino, st.st_uid, st.st_gid, st.st_mode, st.st_ctime_ns))
        if current == current.parent:
            break
        current = current.parent
        first = False
    return tuple(rows)

def _read_fd_exact(fd: int, expected_bytes: int, label: str) -> bytes:
    os.lseek(fd, 0, os.SEEK_SET)
    chunks: list[bytes] = []
    remaining = expected_bytes + 1
    while remaining:
        part = os.read(fd, min(1024 * 1024, remaining))
        if not part:
            break
        chunks.append(part)
        remaining -= len(part)
    raw = b"".join(chunks)
    if len(raw) != expected_bytes:
        raise E(label + "_descriptor_size_changed")
    os.lseek(fd, 0, os.SEEK_SET)
    return raw

def exact_file(path: pathlib.Path, mode: int, expected_bytes: int, digest: str) -> dict[str, int]:
    st = path.lstat()
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or st.st_nlink != 1
        or stat.S_IMODE(st.st_mode) != mode
        or st.st_size != expected_bytes
        or sha256_file(path) != digest
    ):
        raise E("installed_file_invalid:" + str(path))
    return _stat_identity(st)

def open_exact_executable_lease(
    path: pathlib.Path,
    mode: int,
    expected_bytes: int,
    digest: str,
    label: str,
) -> tuple[int, dict[str, int], tuple[tuple[str, int, int, int, int, int, int], ...]]:
    ancestors = _binary_ancestor_snapshot(path, label)
    before = path.lstat()
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != 0
        or before.st_gid != 0
        or before.st_nlink != 1
        or stat.S_IMODE(before.st_mode) != mode
        or before.st_size != expected_bytes
    ):
        raise E(label + "_installed_file_invalid")
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        opened = os.fstat(fd)
        if _stat_identity(opened) != _stat_identity(before):
            raise E(label + "_descriptor_open_generation_mismatch")
        raw = _read_fd_exact(fd, expected_bytes, label)
        after = os.fstat(fd)
        visible = path.lstat()
        if _stat_identity(after) != _stat_identity(opened):
            raise E(label + "_descriptor_generation_changed")
        if _stat_identity(visible) != _stat_identity(opened):
            raise E(label + "_visible_generation_changed")
        if _binary_ancestor_snapshot(path, label) != ancestors:
            raise E(label + "_ancestor_generation_changed")
        if hashlib.sha256(raw).hexdigest() != digest:
            raise E(label + "_descriptor_sha256_mismatch")
        return fd, _stat_identity(opened), ancestors
    except BaseException:
        os.close(fd)
        raise

def run_self_lease(
    path: pathlib.Path,
    marker: str,
    fd: int,
    expected: dict[str, int],
    ancestors: tuple[tuple[str, int, int, int, int, int, int], ...],
    label: str,
    digest: str,
) -> str:
    if _stat_identity(os.fstat(fd)) != expected:
        raise E(label + "_retained_descriptor_generation_mismatch")
    outputs: list[str] = []
    env = {"PATH":"/usr/bin:/bin","HOME":"/nonexistent","LANG":"C","LC_ALL":"C","TZ":"UTC"}
    for _ in range(2):
        if _binary_ancestor_snapshot(path, label) != ancestors:
            raise E(label + "_ancestor_generation_changed_before_exec")
        cp = subprocess.run(
            [f"/proc/self/fd/{fd}", "--self-test"],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env,
            timeout=10,
            check=False,
            pass_fds=(fd,),
        )
        if cp.returncode != 0 or cp.stderr != "" or marker not in cp.stdout:
            raise E(label + "_self_test_failed")
        if _stat_identity(os.fstat(fd)) != expected or _stat_identity(path.lstat()) != expected:
            raise E(label + "_generation_changed_during_self_test")
        if _binary_ancestor_snapshot(path, label) != ancestors:
            raise E(label + "_ancestor_generation_changed_after_exec")
        outputs.append(cp.stdout)
    if outputs[0] != outputs[1]:
        raise E(label + "_self_test_output_not_stable")
    if hashlib.sha256(_read_fd_exact(fd, expected["size"], label)).hexdigest() != digest:
        raise E(label + "_retained_descriptor_sha256_changed")
    if _stat_identity(os.fstat(fd)) != expected or _stat_identity(path.lstat()) != expected:
        raise E(label + "_terminal_generation_changed")
    if _binary_ancestor_snapshot(path, label) != ancestors:
        raise E(label + "_terminal_ancestor_generation_changed")
    return hashlib.sha256(outputs[0].encode()).hexdigest()

def qualify() -> None:
    if os.geteuid() == 0 or os.getuid() != os.geteuid():
        raise E("unprivileged_same_uid_required")
    require_exact_release_generation()
    require_clean_main_generation(SOURCE, "protected_source")
    run_known_good_custody(SOURCE_RELEASE)
    run_known_good_custody(SOURCE)
    release_before = tree_digest(SOURCE_RELEASE, SOURCE_RELEASE_ROOT_MODE)
    target_before = tree_digest(SOURCE, PROTECTED_SOURCE_ROOT_MODE)
    if target_before != release_before:
        raise E("protected_source_not_byte_identical_to_active_release")
    pre_fd = selector_fd = -1
    try:
        pre_fd, preentry, pre_ancestors = open_exact_executable_lease(
            PREENTRY, 0o555, NATIVE_BYTES, NATIVE_SHA, "native_preentry"
        )
        selector_fd, selector, selector_ancestors = open_exact_executable_lease(
            SELECTOR, 0o555, SELECTOR_BYTES, SELECTOR_SHA, "selector"
        )
        exact_file(LAUNCHER, 0o444, LAUNCHER_BYTES, LAUNCHER_SHA)
        native_self = run_self_lease(
            PREENTRY, "VOID_BUY_VOID_V7_NATIVE_PREENTRY_V1_SELF_TEST=GREEN",
            pre_fd, preentry, pre_ancestors, "native_preentry", NATIVE_SHA,
        )
        selector_self = run_self_lease(
            SELECTOR, "VOID_BUY_VOID_V2_NATIVE_SELECTOR_GUARD_V1_SELF_TEST_GREEN",
            selector_fd, selector, selector_ancestors, "selector", SELECTOR_SHA,
        )
    finally:
        if selector_fd >= 0:
            os.close(selector_fd)
        if pre_fd >= 0:
            os.close(pre_fd)
    target_after = tree_digest(SOURCE, PROTECTED_SOURCE_ROOT_MODE)
    release_after = tree_digest(SOURCE_RELEASE, SOURCE_RELEASE_ROOT_MODE)
    if target_before != target_after or release_before != release_after or target_after != release_after:
        raise E("source_generation_changed_during_qualification")
    print(MARKER)
    print("status=INSTALLED_QUALIFICATION_V3_GREEN")
    print("source_release_generation_exact=true")
    print("source_release_root_mode=0555")
    print("protected_source_root_mode=0755")
    print("root_mode_role_split_verified=true")
    print("source_release_custody_green=true")
    print("protected_source_custody_green=true")
    print("protected_source_byte_identical_to_active_release=true")
    print("source_tree_digest=" + target_after[0])
    print("source_nodes=" + str(target_after[1]))
    print("source_regular_file_bytes=" + str(target_after[2]))
    print("native_self_test_sha256=" + native_self)
    print("selector_self_test_sha256=" + selector_self)
    print("binary_root_and_ancestor_custody_verified=true")
    print("binary_self_test_descriptor_execution=true")
    print("binary_retained_descriptor_post_execution_revalidated=true")
    print("installed_generation_evidence_authority=true")
    print("privileged_execution_authorized=false")
    print("receipt_publication_authorized=false")
    print("provider_rpc_contact=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("funds_movement=false")

def self_test() -> None:
    assert root_metadata_fields_valid(
        is_directory=True, is_symlink=False, uid=0, gid=0,
        mode=0o555, expected_mode=SOURCE_RELEASE_ROOT_MODE,
    )
    assert root_metadata_fields_valid(
        is_directory=True, is_symlink=False, uid=0, gid=0,
        mode=0o755, expected_mode=PROTECTED_SOURCE_ROOT_MODE,
    )
    assert not root_metadata_fields_valid(
        is_directory=True, is_symlink=False, uid=0, gid=0,
        mode=0o755, expected_mode=SOURCE_RELEASE_ROOT_MODE,
    )
    assert not root_metadata_fields_valid(
        is_directory=True, is_symlink=False, uid=1000, gid=1000,
        mode=0o555, expected_mode=SOURCE_RELEASE_ROOT_MODE,
    )
    assert not root_metadata_fields_valid(
        is_directory=False, is_symlink=False, uid=0, gid=0,
        mode=0o555, expected_mode=SOURCE_RELEASE_ROOT_MODE,
    )
    print(MARKER + "_SELF_TEST_GREEN")
    print("source_release_root_mode_0555_required=true")
    print("protected_source_root_mode_0755_required=true")
    print("swapped_root_modes_rejected=true")
    print("nonroot_root_metadata_rejected=true")
    print("binary_root_and_ancestor_custody_required=true")
    print("binary_self_test_descriptor_execution_required=true")
    print("binary_retained_descriptor_revalidation_required=true")
    print("host_mutation=false")

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.run and args.self_test:
        raise E("exactly_one_mode_required")
    if args.self_test:
        self_test()
        return
    if not args.run:
        print(MARKER)
        print("mode=plan")
        print("canonical_source_custody_required=true")
        print("source_release_root_mode_required=0555")
        print("protected_source_root_mode_required=0755")
        print("byte_identity_to_active_protected_release_required=true")
        print("installed_generation_evidence_authority=false")
        return
    qualify()

if __name__ == "__main__":
    try:
        main()
    except (E, OSError, subprocess.SubprocessError, UnicodeError) as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("privileged_execution_authorized=false")
        print("receipt_publication_authorized=false")
        print("provider_rpc_contact=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("funds_movement=false")
        raise SystemExit(2)
