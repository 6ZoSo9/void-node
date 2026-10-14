#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from typing import Any

MARKER = "VOID_BUY_VOID_V7_PROTECTED_SOURCE_INSTALL_V1"
REPO = "6ZoSo9/void-node"
EXPECTED_ENFORCEMENT_SET = (
    "152dc7a45f4d596513cfd7dc44277ece1aea3d64e30e616089162760ec245a9e"
)
LOCK_REL = "ops/security/buy-void-enforcement-final-protected-v7-v2-lock-v1.json"
DEPLOYMENT_TOOL_REL = (
    "ops/precision/void_buy_void_source_finality_v7_deployment_receipt_install_v1.ts"
)
PACKAGE_PROOF_REL = "scripts/prove_void_buy_v7_privileged_launcher_package_runtime_v2.mjs"
NATIVE_SOURCE_REL = "ops/precision/void_buy_void_source_finality_v7_native_preentry_v1.c"
TARGET_ROOT = Path("/opt/void-buy-void-v7-reviewed-v1")
PREENTRY_DIR = Path("/opt/void-buy-void-v7-preentry-v1")
PREENTRY_TARGET = PREENTRY_DIR / "void_buy_void_source_finality_v7_native_preentry_v1"
CONFIRM = "installBuyVoidV7ProtectedSourceV1"
STATE_ROOT = Path.home() / ".local/state/void/buy-void-v7-protected-source-install-v1"
MAX_PLAN_BYTES = 64 * 1024 * 1024
MAX_MANIFEST_ENTRIES = 100_000
MAX_PLAN_AGE_SECONDS = 30 * 60
SHA40 = re.compile(r"^[0-9a-f]{40}$")
SHA64 = re.compile(r"^[0-9a-f]{64}$")

def fail(message: str) -> None:
    raise RuntimeError(str(message))

def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def run(
    argv: list[str],
    *,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    timeout: int = 300,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(
        argv,
        cwd=str(cwd) if cwd else None,
        env=env,
        text=True,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=timeout,
    )
    if check and result.returncode != 0:
        fail(
            "command_failed:"
            + Path(argv[0]).name
            + ":"
            + (result.stderr or result.stdout).strip()[:4000]
        )
    return result

def git_env() -> dict[str, str]:
    return {
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
    }

def node_env(home: str = "/nonexistent") -> dict[str, str]:
    return {
        "PATH": "/usr/bin:/bin",
        "HOME": home,
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
    }

def git(root: Path, *args: str) -> str:
    result = run(
        [
            "/usr/bin/git",
            "-c",
            f"safe.directory={root}",
            "-c",
            "core.hooksPath=/dev/null",
            "-c",
            "core.fsmonitor=false",
            "-c",
            "core.untrackedCache=false",
            "--no-replace-objects",
            "-C",
            str(root),
            *args,
        ],
        env=git_env(),
        timeout=60,
    )
    return result.stdout.strip()

def repo_identity(root: Path) -> tuple[str, str]:
    if root.is_symlink() or not root.is_dir():
        fail("source_root_noncanonical")
    if (root / ".git").is_symlink() or not (root / ".git").exists():
        fail("source_git_missing_or_symlink")
    if git(root, "symbolic-ref", "--short", "-q", "HEAD") != "main":
        fail("source_branch_not_main")
    if git(root, "status", "--porcelain=v1", "--untracked-files=all"):
        fail("source_tree_dirty")
    head = git(root, "rev-parse", "--verify", "HEAD^{commit}")
    tree = git(root, "rev-parse", "--verify", "HEAD^{tree}")
    if not SHA40.fullmatch(head) or not SHA40.fullmatch(tree):
        fail("source_git_identity_invalid")
    return head, tree

def remote_main_sha() -> str:
    result = run(
        [
            "/usr/bin/git",
            "ls-remote",
            "https://github.com/6ZoSo9/void-node.git",
            "refs/heads/main",
        ],
        env=git_env(),
        timeout=60,
    )
    rows = [line.split() for line in result.stdout.splitlines() if line.strip()]
    if len(rows) != 1 or len(rows[0]) != 2 or rows[0][1] != "refs/heads/main":
        fail("remote_main_resolution_invalid")
    sha = rows[0][0].lower()
    if not SHA40.fullmatch(sha):
        fail("remote_main_sha_invalid")
    return sha

def plan_age_seconds(material: dict[str, Any]) -> float:
    raw = str(material.get("created_at", ""))
    try:
        created = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        fail("plan_created_at_invalid")
    if created.tzinfo is None:
        fail("plan_created_at_timezone_missing")
    age = (datetime.now(timezone.utc) - created.astimezone(timezone.utc)).total_seconds()
    if age < -300:
        fail("plan_created_at_from_future")
    return age

def require_absolute_root_owned_executable(pathname: str) -> str:
    path = Path(pathname)
    if not path.is_absolute():
        fail("system_executable_not_absolute")
    resolved = Path(os.path.realpath(path))
    st = resolved.lstat()
    if (
        resolved.is_symlink()
        or not stat.S_ISREG(st.st_mode)
        or st.st_uid != 0
        or (st.st_mode & 0o022) != 0
        or (st.st_mode & 0o111) == 0
    ):
        fail("system_executable_custody_invalid:" + pathname)
    cursor = resolved.parent
    while True:
        cst = cursor.lstat()
        if (
            cursor.is_symlink()
            or not stat.S_ISDIR(cst.st_mode)
            or cst.st_uid != 0
            or (cst.st_mode & 0o022) != 0
        ):
            fail("system_executable_ancestor_untrusted:" + str(cursor))
        if cursor == cursor.parent:
            break
        cursor = cursor.parent
    return str(resolved)

def parse_lock(root: Path) -> dict[str, Any]:
    lock_path = root / LOCK_REL
    if lock_path.is_symlink() or not lock_path.is_file():
        fail("accepted_lock_missing_or_noncanonical")
    raw = lock_path.read_bytes()
    if len(raw) < 2 or len(raw) > 256 * 1024:
        fail("accepted_lock_size_invalid")
    value = json.loads(raw)
    candidate = value.get("candidate_evidence")
    if (
        not isinstance(candidate, dict)
        or candidate.get("candidate_enforcement_set_sha256")
        != EXPECTED_ENFORCEMENT_SET
        or value.get("complete_executable_closure_verified") is not True
        or value.get("current_enforcement_tracked_source_inventory_verified")
        is not True
        or value.get("candidate_enforcement_identity_accepted") is not True
        or value.get("deployed_artifact_generation_verified") is not False
        or value.get("runtime_mount_authority") is not False
        or value.get("production_source_finality_authority_ready") is not False
        or value.get("public_presale_activation") is not False
        or value.get("funds_movement") is not False
    ):
        fail("accepted_lock_authority_or_identity_invalid")
    return value

def run_deployment_plan(root: Path, head: str, tree: str) -> dict[str, str]:
    loader = root / "node_modules/tsx/dist/loader.mjs"
    tool = root / DEPLOYMENT_TOOL_REL
    if loader.is_symlink() or not loader.is_file():
        fail("tsx_loader_missing")
    if tool.is_symlink() or not tool.is_file():
        fail("deployment_planner_missing")
    result = run(
        [
            "/usr/bin/node",
            "--import",
            loader.resolve().as_uri(),
            str(tool),
            "--plan",
            "--expected-commit",
            head,
            "--expected-tree",
            tree,
            "--accepted-enforcement-lock-path",
            LOCK_REL,
        ],
        cwd=root,
        env=node_env(),
        timeout=240,
    )
    rows: dict[str, str] = {}
    for line in result.stdout.splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            rows[key.strip()] = value.strip()
    if (
        rows.get("mode") != "--plan"
        or rows.get("reviewed_source_file_count") != "10"
        or rows.get("accepted_enforcement_set_sha256")
        != EXPECTED_ENFORCEMENT_SET
        or rows.get("filesystem_mutation") != "false"
        or rows.get("status") != "PLAN_GREEN"
    ):
        fail("deployment_plan_not_exact_green")
    return rows

def run_package_proof(root: Path) -> None:
    proof = root / PACKAGE_PROOF_REL
    if proof.is_symlink() or not proof.is_file():
        fail("package_runtime_proof_missing")
    result = run(
        ["/usr/bin/node", str(proof), "--report"],
        cwd=root,
        env=node_env(),
        timeout=240,
    )
    required = {
        "VOID_BUY_VOID_V7_PRIVILEGED_LAUNCHER_PACKAGE_RUNTIME_V2_GREEN",
        "privileged_launcher_package_runtime_verified=true",
        "tsx_private_materialization_verified=true",
        "tsx_inert_transform_execution_verified=true",
        "esbuild_runtime_execution_verified=true",
        "protected_source_install_authorized=false",
        "privileged_receipt_execution_authorized=false",
        "public_presale_activation=false",
        "funds_movement=false",
    }
    observed = set(result.stdout.splitlines())
    missing = sorted(required - observed)
    if missing:
        fail("package_runtime_proof_missing_markers:" + ",".join(missing))

def compile_native(root: Path, output: Path) -> tuple[str, int]:
    cc = require_absolute_root_owned_executable("/usr/bin/cc")
    source = root / NATIVE_SOURCE_REL
    if source.is_symlink() or not source.is_file():
        fail("native_source_missing_or_noncanonical")
    output.parent.mkdir(parents=True, exist_ok=True)
    run(
        [
            cc,
            "-std=c11",
            "-Wall",
            "-Wextra",
            "-Werror",
            "-O2",
            "-o",
            str(output),
            str(source),
        ],
        cwd=root,
        env=node_env(),
        timeout=120,
    )
    os.chmod(output, 0o700)
    self_test = run(
        [str(output), "--self-test"],
        cwd=root,
        env=node_env(),
        timeout=30,
    )
    if (
        "VOID_BUY_VOID_V7_NATIVE_PREENTRY_V1_SELF_TEST=GREEN"
        not in self_test.stdout.splitlines()
    ):
        fail("native_preentry_self_test_failed")
    return sha256_file(output), output.stat().st_size

def symlink_target_inside(root: Path, path: Path) -> str:
    target = os.readlink(path)
    if os.path.isabs(target):
        resolved = Path(target).resolve(strict=False)
    else:
        resolved = (path.parent / target).resolve(strict=False)
    root_resolved = root.resolve()
    try:
        resolved.relative_to(root_resolved)
    except ValueError:
        fail("stage_symlink_escape:" + path.relative_to(root).as_posix())
    return target

def snapshot_tree(root: Path) -> list[dict[str, Any]]:
    if root.is_symlink() or not root.is_dir():
        fail("snapshot_root_invalid")
    rows: list[dict[str, Any]] = []
    for path in sorted(root.rglob("*"), key=lambda p: p.relative_to(root).as_posix()):
        if len(rows) >= MAX_MANIFEST_ENTRIES:
            fail("stage_manifest_entry_limit_exceeded")
        rel = path.relative_to(root).as_posix()
        st = path.lstat()
        mode = stat.S_IMODE(st.st_mode)
        if stat.S_ISLNK(st.st_mode):
            rows.append(
                {
                    "path": rel,
                    "type": "symlink",
                    "mode": mode,
                    "target": symlink_target_inside(root, path),
                }
            )
        elif stat.S_ISDIR(st.st_mode):
            rows.append({"path": rel, "type": "directory", "mode": mode})
        elif stat.S_ISREG(st.st_mode):
            rows.append(
                {
                    "path": rel,
                    "type": "file",
                    "mode": mode,
                    "bytes": st.st_size,
                    "sha256": sha256_file(path),
                }
            )
        else:
            fail("stage_special_file_forbidden:" + rel)
    return rows

def manifest_sha(rows: list[dict[str, Any]]) -> str:
    data = json.dumps(rows, separators=(",", ":"), sort_keys=True).encode()
    return sha256_bytes(data)

def verify_snapshot(root: Path, rows: list[dict[str, Any]]) -> None:
    observed = snapshot_tree(root)
    if observed != rows:
        fail("stage_or_install_tree_manifest_mismatch")

def require_root_custody_tree(root: Path) -> None:
    root_resolved = root.resolve()
    for path in [root, *sorted(root.rglob("*"))]:
        st = path.lstat()
        if st.st_uid != 0:
            fail("protected_tree_owner_invalid:" + str(path))
        if stat.S_ISLNK(st.st_mode):
            symlink_target_inside(root, path)
            continue
        if (st.st_mode & 0o022) != 0:
            fail("protected_tree_group_or_world_writable:" + str(path))
        if not (stat.S_ISDIR(st.st_mode) or stat.S_ISREG(st.st_mode)):
            fail("protected_tree_special_file_forbidden:" + str(path))
    cursor = root_resolved.parent
    while True:
        st = cursor.lstat()
        if (
            cursor.is_symlink()
            or not stat.S_ISDIR(st.st_mode)
            or st.st_uid != 0
            or (st.st_mode & 0o022) != 0
        ):
            fail("protected_tree_ancestor_untrusted:" + str(cursor))
        if cursor == cursor.parent:
            break
        cursor = cursor.parent

def chown_tree_root(root: Path) -> None:
    for path in [root, *sorted(root.rglob("*"), reverse=True)]:
        os.chown(path, 0, 0, follow_symlinks=False)

def fsync_tree(root: Path) -> None:
    dirs: list[Path] = [root]
    for path in sorted(root.rglob("*")):
        st = path.lstat()
        if stat.S_ISLNK(st.st_mode):
            continue
        if stat.S_ISDIR(st.st_mode):
            dirs.append(path)
        elif stat.S_ISREG(st.st_mode):
            fd = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
            try:
                os.fsync(fd)
            finally:
                os.close(fd)
    for directory in sorted(dirs, key=lambda p: len(p.parts), reverse=True):
        fd = os.open(directory, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
        try:
            os.fsync(fd)
        finally:
            os.close(fd)

def canonical_plan(material: dict[str, Any]) -> bytes:
    return (json.dumps(material, separators=(",", ":"), sort_keys=True) + "\n").encode()

def plan_id(material: dict[str, Any]) -> str:
    return "voidbv7psi1_" + sha256_bytes(canonical_plan(material))

def prepare(args: argparse.Namespace) -> None:
    if os.geteuid() == 0:
        fail("prepare_must_be_unprivileged")
    source = Path(args.source_root).resolve()
    head, tree = repo_identity(source)
    remote_main = remote_main_sha()
    if remote_main != head:
        fail(f"source_not_current_remote_main:local={head}:remote={remote_main}")
    parse_lock(source)
    run_deployment_plan(source, head, tree)

    STATE_ROOT.mkdir(parents=True, exist_ok=True, mode=0o700)
    operation = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    operation_dir = STATE_ROOT / f"{operation}-{head[:12]}"
    if operation_dir.exists():
        fail("prepare_operation_collision")
    operation_dir.mkdir(mode=0o700)
    stage = operation_dir / "stage"

    run(
        [
            "/usr/bin/git",
            "clone",
            "--no-local",
            "--single-branch",
            "--branch",
            "main",
            "--no-tags",
            source.as_uri(),
            str(stage),
        ],
        env={**git_env(), "HOME": str(Path.home())},
        timeout=300,
    )
    if repo_identity(stage) != (head, tree):
        fail("stage_git_identity_mismatch_after_clone")
    run(
        [
            "/usr/bin/git",
            "-c",
            f"safe.directory={stage}",
            "-C",
            str(stage),
            "remote",
            "set-url",
            "origin",
            "https://github.com/6ZoSo9/void-node.git",
        ],
        env=git_env(),
        timeout=30,
    )
    if repo_identity(stage) != (head, tree):
        fail("stage_git_identity_changed_by_remote_normalization")

    run(
        [
            "/usr/bin/npm",
            "ci",
            "--ignore-scripts",
            "--no-audit",
            "--no-fund",
        ],
        cwd=stage,
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": str(Path.home()),
            "LANG": "C",
            "LC_ALL": "C",
            "TZ": "UTC",
            "npm_config_update_notifier": "false",
        },
        timeout=900,
    )
    if repo_identity(stage) != (head, tree):
        fail("stage_git_identity_changed_by_npm_ci")
    run_deployment_plan(stage, head, tree)
    run_package_proof(stage)

    native_candidate = operation_dir / "native-preentry-candidate"
    native_sha, native_bytes = compile_native(stage, native_candidate)
    rows = snapshot_tree(stage)
    tree_manifest_sha = manifest_sha(rows)

    material: dict[str, Any] = {
        "schema": "void_buy_void_v7_protected_source_install_plan_v1",
        "marker": MARKER,
        "version": 1,
        "repository": REPO,
        "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source_root": str(source),
        "source_commit": head,
        "source_tree": tree,
        "accepted_enforcement_set_sha256": EXPECTED_ENFORCEMENT_SET,
        "accepted_enforcement_lock_path": LOCK_REL,
        "stage_root": str(stage),
        "stage_manifest_sha256": tree_manifest_sha,
        "stage_manifest_entries": len(rows),
        "stage_manifest": rows,
        "native_candidate_path": str(native_candidate),
        "native_candidate_sha256": native_sha,
        "native_candidate_bytes": native_bytes,
        "target_root": str(TARGET_ROOT),
        "preentry_target": str(PREENTRY_TARGET),
        "runtime_uid": args.runtime_uid,
        "runtime_gid": args.runtime_gid,
        "service_mutation": False,
        "receipt_apply": False,
        "rpc_contact": False,
        "credential_access": False,
        "wallet_or_signer_access": False,
        "transaction_broadcast": False,
        "public_presale_activation": False,
        "funds_movement": False,
    }
    pid = plan_id(material)
    wrapped = {"plan_id": pid, "material": material}
    plan_bytes = (
        json.dumps(wrapped, indent=2, sort_keys=True, separators=(",", ": "))
        + "\n"
    ).encode()
    if len(plan_bytes) > MAX_PLAN_BYTES:
        fail("plan_too_large")
    plan_path = operation_dir / "plan.json"
    fd = os.open(plan_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as handle:
        handle.write(plan_bytes)
        handle.flush()
        os.fsync(handle.fileno())
    plan_sha = sha256_bytes(plan_bytes)

    print(MARKER)
    print("mode=--prepare")
    print("source_mutation=false")
    print("stage_filesystem_mutation=true")
    print("protected_source_install=false")
    print("native_preentry_install=false")
    print("service_mutation=false")
    print("receipt_apply=false")
    print("rpc_contact=false")
    print("credential_access=false")
    print("wallet_or_signer_access=false")
    print("transaction_broadcast=false")
    print("public_presale_activation=false")
    print("funds_movement=false")
    print(f"source_commit={head}")
    print(f"source_tree={tree}")
    print("remote_main_exact=true")
    print(f"accepted_enforcement_set_sha256={EXPECTED_ENFORCEMENT_SET}")
    print(f"stage_manifest_entries={len(rows)}")
    print(f"stage_manifest_sha256={tree_manifest_sha}")
    print(f"native_candidate_sha256={native_sha}")
    print(f"native_candidate_bytes={native_bytes}")
    print(f"plan_id={pid}")
    print(f"plan_sha256={plan_sha}")
    print(f"plan_file={plan_path}")
    print("status=PREPARE_GREEN")

def load_plan(
    plan_path: Path,
    expected_id: str,
    expected_sha: str,
) -> tuple[dict[str, Any], bytes]:
    if plan_path.is_symlink() or not plan_path.is_file():
        fail("plan_file_missing_or_noncanonical")
    raw = plan_path.read_bytes()
    if len(raw) < 2 or len(raw) > MAX_PLAN_BYTES:
        fail("plan_file_size_invalid")
    if sha256_bytes(raw) != expected_sha:
        fail("plan_sha256_mismatch")
    value = json.loads(raw)
    if not isinstance(value, dict) or set(value) != {"plan_id", "material"}:
        fail("plan_shape_invalid")
    material = value["material"]
    if not isinstance(material, dict):
        fail("plan_material_invalid")
    if value["plan_id"] != expected_id or plan_id(material) != expected_id:
        fail("plan_id_mismatch")
    if (
        material.get("schema")
        != "void_buy_void_v7_protected_source_install_plan_v1"
        or material.get("marker") != MARKER
        or material.get("version") != 1
        or material.get("repository") != REPO
        or material.get("accepted_enforcement_set_sha256")
        != EXPECTED_ENFORCEMENT_SET
        or material.get("accepted_enforcement_lock_path") != LOCK_REL
        or material.get("target_root") != str(TARGET_ROOT)
        or material.get("preentry_target") != str(PREENTRY_TARGET)
        or material.get("service_mutation") is not False
        or material.get("receipt_apply") is not False
        or material.get("rpc_contact") is not False
        or material.get("credential_access") is not False
        or material.get("wallet_or_signer_access") is not False
        or material.get("transaction_broadcast") is not False
        or material.get("public_presale_activation") is not False
        or material.get("funds_movement") is not False
    ):
        fail("plan_authority_or_identity_invalid")
    if not SHA40.fullmatch(str(material.get("source_commit", ""))):
        fail("plan_source_commit_invalid")
    if not SHA40.fullmatch(str(material.get("source_tree", ""))):
        fail("plan_source_tree_invalid")
    if not SHA64.fullmatch(str(material.get("stage_manifest_sha256", ""))):
        fail("plan_stage_manifest_sha_invalid")
    if not SHA64.fullmatch(str(material.get("native_candidate_sha256", ""))):
        fail("plan_native_sha_invalid")
    if plan_age_seconds(material) > MAX_PLAN_AGE_SECONDS:
        fail("plan_expired")
    rows = material.get("stage_manifest")
    if not isinstance(rows, list) or len(rows) != material.get("stage_manifest_entries"):
        fail("plan_manifest_shape_invalid")
    if manifest_sha(rows) != material["stage_manifest_sha256"]:
        fail("plan_manifest_digest_mismatch")
    return material, raw

def verify_existing_source_target(material: dict[str, Any]) -> bool:
    rows = material["stage_manifest"]
    if not TARGET_ROOT.exists():
        return False
    if TARGET_ROOT.is_symlink() or not TARGET_ROOT.is_dir():
        fail("existing_target_root_invalid")
    verify_snapshot(TARGET_ROOT, rows)
    require_root_custody_tree(TARGET_ROOT)
    if repo_identity(TARGET_ROOT) != (
        material["source_commit"],
        material["source_tree"],
    ):
        fail("existing_target_git_identity_mismatch")
    return True

def publish_source_tree(material: dict[str, Any]) -> bool:
    if verify_existing_source_target(material):
        return False
    stage = Path(material["stage_root"])
    verify_snapshot(stage, material["stage_manifest"])
    if repo_identity(stage) != (material["source_commit"], material["source_tree"]):
        fail("stage_git_identity_mismatch_before_apply")

    opt = TARGET_ROOT.parent
    st = opt.lstat()
    if (
        opt.is_symlink()
        or not opt.is_dir()
        or st.st_uid != 0
        or (st.st_mode & 0o022) != 0
    ):
        fail("target_parent_custody_invalid")

    temp = opt / f".{TARGET_ROOT.name}.tmp-{os.getpid()}"
    if temp.exists() or temp.is_symlink():
        fail("target_temp_collision")
    try:
        shutil.copytree(stage, temp, symlinks=True, copy_function=shutil.copy2)
        chown_tree_root(temp)
        verify_snapshot(temp, material["stage_manifest"])
        require_root_custody_tree(temp)
        if repo_identity(temp) != (
            material["source_commit"],
            material["source_tree"],
        ):
            fail("protected_temp_git_identity_mismatch")
        run_deployment_plan(
            temp,
            material["source_commit"],
            material["source_tree"],
        )
        run_package_proof(temp)
        fsync_tree(temp)
        os.rename(temp, TARGET_ROOT)
        parent_fd = os.open(opt, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
        try:
            os.fsync(parent_fd)
        finally:
            os.close(parent_fd)
    finally:
        if temp.exists():
            shutil.rmtree(temp)
    verify_existing_source_target(material)
    return True

def verify_existing_preentry(material: dict[str, Any]) -> bool:
    if not PREENTRY_TARGET.exists():
        return False
    if PREENTRY_TARGET.is_symlink() or not PREENTRY_TARGET.is_file():
        fail("existing_preentry_invalid")
    st = PREENTRY_TARGET.lstat()
    if (
        st.st_uid != 0
        or st.st_gid != 0
        or (st.st_mode & 0o777) != 0o755
        or (st.st_mode & 0o022) != 0
        or sha256_file(PREENTRY_TARGET)
        != material["native_candidate_sha256"]
        or st.st_size != material["native_candidate_bytes"]
    ):
        fail("existing_preentry_identity_mismatch")
    test = run([str(PREENTRY_TARGET), "--self-test"], env=node_env(), timeout=30)
    if (
        "VOID_BUY_VOID_V7_NATIVE_PREENTRY_V1_SELF_TEST=GREEN"
        not in test.stdout.splitlines()
    ):
        fail("existing_preentry_self_test_failed")
    return True

def publish_preentry(material: dict[str, Any]) -> bool:
    if verify_existing_preentry(material):
        return False
    if PREENTRY_DIR.exists() or PREENTRY_DIR.is_symlink():
        fail("preentry_directory_exists_without_valid_binary")
    temp_dir = PREENTRY_DIR.parent / f".{PREENTRY_DIR.name}.tmp-{os.getpid()}"
    if temp_dir.exists() or temp_dir.is_symlink():
        fail("preentry_temp_collision")
    try:
        temp_dir.mkdir(mode=0o755)
        os.chown(temp_dir, 0, 0)
        candidate = temp_dir / PREENTRY_TARGET.name
        actual_sha, actual_bytes = compile_native(TARGET_ROOT, candidate)
        if (
            actual_sha != material["native_candidate_sha256"]
            or actual_bytes != material["native_candidate_bytes"]
        ):
            fail("native_rebuild_identity_mismatch")
        os.chown(candidate, 0, 0)
        os.chmod(candidate, 0o755)
        fsync_tree(temp_dir)
        os.rename(temp_dir, PREENTRY_DIR)
        parent_fd = os.open(
            PREENTRY_DIR.parent,
            os.O_RDONLY | getattr(os, "O_DIRECTORY", 0),
        )
        try:
            os.fsync(parent_fd)
        finally:
            os.close(parent_fd)
    finally:
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
    verify_existing_preentry(material)
    return True

def apply(args: argparse.Namespace) -> None:
    if os.geteuid() != 0:
        fail("apply_requires_root")
    if args.confirm != CONFIRM:
        fail("apply_confirmation_required")
    if not SHA64.fullmatch(args.expected_plan_sha256):
        fail("expected_plan_sha256_invalid")
    if not re.fullmatch(r"voidbv7psi1_[0-9a-f]{64}", args.expected_plan_id):
        fail("expected_plan_id_invalid")

    material, _ = load_plan(
        Path(args.plan_file).resolve(),
        args.expected_plan_id,
        args.expected_plan_sha256,
    )
    runtime_uid = int(material["runtime_uid"])
    runtime_gid = int(material["runtime_gid"])
    if runtime_uid <= 0 or runtime_gid <= 0:
        fail("runtime_identity_invalid")
    if args.expected_live_runtime_commit != material["source_commit"]:
        fail("live_runtime_commit_not_final_source_generation")
    if not SHA40.fullmatch(args.expected_live_runtime_commit):
        fail("expected_live_runtime_commit_invalid")

    if remote_main_sha() != material["source_commit"]:
        fail("remote_main_moved_since_prepare")
    source = Path(material["source_root"])
    if repo_identity(source) != (
        material["source_commit"],
        material["source_tree"],
    ):
        fail("operator_source_moved_since_prepare")
    stage = Path(material["stage_root"])
    verify_snapshot(stage, material["stage_manifest"])
    if repo_identity(stage) != (
        material["source_commit"],
        material["source_tree"],
    ):
        fail("stage_moved_since_prepare")

    created_source = publish_source_tree(material)
    created_preentry = publish_preentry(material)

    qualify = run(
        [
            str(PREENTRY_TARGET),
            "--qualify-only",
            "--runtime-uid",
            str(runtime_uid),
            "--runtime-gid",
            str(runtime_gid),
            "--expected-commit",
            material["source_commit"],
            "--expected-tree",
            material["source_tree"],
        ],
        cwd=TARGET_ROOT,
        env=node_env(),
        timeout=300,
    )
    markers = set(qualify.stdout.splitlines())
    required = {
        "VOID_BUY_VOID_SOURCE_FINALITY_V7_PROTECTED_PRIVILEGED_LAUNCHER_V1",
        "native_preentry_verified=true",
        "launcher_descriptor_execution=true",
        "privileged_launcher_package_runtime_verified=true",
        "privileged_tool_execution_performed=false",
        "public_presale_activation=false",
        "funds_movement=false",
        "status=PROTECTED_PRIVILEGED_LAUNCHER_QUALIFICATION_GREEN",
    }
    missing = sorted(required - markers)
    if missing:
        fail("post_install_qualification_missing:" + ",".join(missing))

    print(MARKER)
    print("mode=--apply")
    print("source_checkout_mutation=false")
    print("live_runtime_generation_precondition_verified=true")
    print("protected_source_install=true")
    print("native_preentry_install=true")
    print("service_mutation=false")
    print("receipt_apply=false")
    print("rpc_contact=false")
    print("credential_access=false")
    print("wallet_or_signer_access=false")
    print("transaction_broadcast=false")
    print("public_presale_activation=false")
    print("funds_movement=false")
    print(f"source_commit={material['source_commit']}")
    print(f"source_tree={material['source_tree']}")
    print(f"accepted_enforcement_set_sha256={EXPECTED_ENFORCEMENT_SET}")
    print(f"protected_source_created={str(created_source).lower()}")
    print(f"native_preentry_created={str(created_preentry).lower()}")
    print("post_install_qualify_only=true")
    print("privileged_receipt_execution_performed=false")
    print("status=INSTALL_GREEN")

def self_test() -> None:
    with tempfile.TemporaryDirectory(prefix="void-v7-protected-install-selftest-") as td:
        root = Path(td) / "root"
        root.mkdir()
        (root / "a").write_text("alpha\n")
        (root / "dir").mkdir()
        (root / "dir/b").write_bytes(b"beta\n")
        os.symlink("../a", root / "dir/link")
        rows = snapshot_tree(root)
        assert len(rows) == 4
        digest = manifest_sha(rows)
        assert SHA64.fullmatch(digest)
        verify_snapshot(root, rows)
        (root / "a").write_text("changed\n")
        try:
            verify_snapshot(root, rows)
        except RuntimeError:
            pass
        else:
            fail("self_test_manifest_drift_not_detected")
    print(MARKER + "_SELF_TEST_GREEN")
    print("manifest_drift_rejected=true")
    print("external_symlink_escape_rejected_by_contract=true")
    print("service_mutation=false")
    print("receipt_apply=false")
    print("public_presale_activation=false")
    print("funds_movement=false")

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--prepare", action="store_true")
    modes.add_argument("--apply", action="store_true")
    modes.add_argument("--self-test", action="store_true")
    parser.add_argument("--source-root", default=os.getcwd())
    parser.add_argument("--runtime-uid", type=int, default=os.getuid())
    parser.add_argument("--runtime-gid", type=int, default=os.getgid())
    parser.add_argument("--plan-file")
    parser.add_argument("--expected-plan-id", default="")
    parser.add_argument("--expected-plan-sha256", default="")
    parser.add_argument("--expected-live-runtime-commit", default="")
    parser.add_argument("--confirm", default="")
    return parser.parse_args()

def main() -> None:
    args = parse_args()
    if args.self_test:
        self_test()
        return
    if args.prepare:
        if args.runtime_uid <= 0 or args.runtime_gid <= 0:
            fail("runtime_identity_invalid")
        prepare(args)
        return
    if not args.plan_file:
        fail("plan_file_required")
    apply(args)

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(MARKER + "_HOLD")
        print("reason=" + str(exc))
        raise SystemExit(2)
