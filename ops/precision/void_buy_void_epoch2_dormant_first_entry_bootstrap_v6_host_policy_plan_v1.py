#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
from typing import Any

ROOT = Path(__file__).resolve().parents[2]

MARKER = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "BOOTSTRAP_V6_HOST_POLICY_PLAN_V1"
)
PLAN_SCHEMA = (
    "void_buy_void_epoch2_dormant_first_entry_"
    "bootstrap_v6_host_policy_plan_v1"
)
PLAN_PREFIX = "voidbuye2dormantbootstraphostplan1_"
POLICY_SCHEMA = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_"
    "PROTECTED_INSTALL_BOOTSTRAP_POLICY_V6"
)

MATERIALIZER_REL = (
    "scripts/materialize_buy_void_epoch2_"
    "dormant_first_entry_bootstrap_v6.py"
)
MATERIALIZER_BLOB = "3a937c756a91ad2565897f1ae5d881f9fa2f41c6"
MATERIALIZER_PROOF_REL = (
    "scripts/prove_buy_void_epoch2_dormant_first_entry_"
    "bootstrap_v6_materializer_v1.py"
)
MATERIALIZER_PROOF_BLOB = "58ae5cb2c3c4f47aa56744e4202c0b45db1416ef"
MATERIALIZER_DOC_REL = (
    "docs/operators/buy-void-epoch2-dormant-first-entry-"
    "bootstrap-v6-materializer-v1.md"
)
MATERIALIZER_DOC_BLOB = "0d141b39670de03cba791504d1d27ee56f588db5"
MATERIALIZER_WORKFLOW_REL = (
    ".github/workflows/buy-void-epoch2-dormant-first-entry-"
    "bootstrap-v6-materializer-v1.yml"
)
MATERIALIZER_WORKFLOW_BLOB = "5347246d7aec42377a366058c5156f3d7e8cc2d9"

LOCK_REL = (
    "ops/security/buy-void-epoch2-dormant-first-entry-"
    "bootstrap-v6-candidate-lock-v1.json"
)
LOCK_BLOB = "f5b03c6b81016edf21f605099e0ef8976f40e107"
LOCK_ID = (
    "voidbuye2dormantbootstraplock3_"
    "5958d8e7871640ff4806d1f1500b3cb2a2f91e29a4ff82146a46dced0ad0244b"
)
CANDIDATE_REL = (
    "scripts/prove_buy_void_epoch2_dormant_first_entry_"
    "bootstrap_v6_candidate_v1.py"
)
CANDIDATE_BLOB = "b963ac9ef0b9c8ac685763b3a82375f970ef12df"
BOOTSTRAP_SOURCE_REL = (
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v6.c"
)
BOOTSTRAP_SOURCE_BLOB = "a317d3dce324337f107909bd6e33e98622b3ef09"
MANIFEST_REL = (
    "ops/security/buy-void-epoch2-dormant-first-entry-"
    "source-generation-v3.conf"
)
MANIFEST_BLOB = "6e0630af72111bd9976dcc38cdcdada1904dd067"
MANIFEST_BYTES = 2382
MANIFEST_SHA256 = (
    "aa9ee1676355b95f7c4b5e7d10e303eda5e30bb3142a588986461efaa7040662"
)

CANDIDATE_ID = (
    "voidbuye2dormantbootstrapcand3_"
    "13521be924148818f4869bf24e535d2ecd54a27483daca74e17ba05128c96062"
)
BOOTSTRAP_BYTES = 874_608
BOOTSTRAP_SHA256 = (
    "c0121a4d50443dac1c6e42a03fcdee77ec55c867acd6aea04cbbce3ae424a21b"
)
BOOTSTRAP_GIT_BLOB = "a91707c3e5803071fc73c3451c9bcb3b774f8b48"

BOOTSTRAP_ARTIFACT_NAME = (
    "void_buy_void_epoch2_dormant_first_entry_"
    "protected_install_bootstrap_v6"
)
MANIFEST_ARTIFACT_NAME = "source-generation-v3.conf"

INSTALL_ROOT = Path(
    "/opt/void-buy-void-epoch2-dormant-first-entry-"
    "protected-install-bootstrap-v6"
)
INSTALL_BIN = INSTALL_ROOT / "bin"
INSTALL_BOOTSTRAP = INSTALL_BIN / BOOTSTRAP_ARTIFACT_NAME
INSTALL_MANIFEST = INSTALL_ROOT / MANIFEST_ARTIFACT_NAME
INSTALL_POLICY = INSTALL_ROOT / "policy-v1.conf"

FIXED_PYTHON = Path("/usr/bin/python3")
FIXED_GIT = Path("/usr/bin/git")

HEX40 = re.compile(r"^[0-9a-f]{40}$")
MAX_READ = 2 * 1024 * 1024
MAX_TOOL = 512 * 1024 * 1024

GIT_ENV = {
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
    "GIT_ALLOW_PROTOCOL": "",
}


class PlanError(RuntimeError):
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob(raw: bytes) -> str:
    h = hashlib.sha1()
    h.update(b"blob " + str(len(raw)).encode("ascii") + b"\0")
    h.update(raw)
    return h.hexdigest()


def canonical(value: object) -> bytes:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")


def git(*args: str) -> str:
    cp = subprocess.run(
        ["/usr/bin/git", "-C", str(ROOT), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=20,
        env=GIT_ENV,
    )
    if cp.returncode != 0 or cp.stderr:
        raise PlanError("git_failed:" + ":".join(args))
    return cp.stdout.strip()


def repository_blob(relative: str, expected: str) -> bytes:
    path = ROOT / relative
    try:
        before = path.lstat()
    except OSError as exc:
        raise PlanError("repository_file_unavailable:" + relative) from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or before.st_size < 1
        or before.st_size > MAX_READ
    ):
        raise PlanError("repository_file_metadata_invalid:" + relative)
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_generation(before, opened):
            raise PlanError("repository_file_rebound:" + relative)
        raw = _read_exact(fd, before.st_size, "repository_file:" + relative)
        after = os.fstat(fd)
        visible = path.lstat()
        if (
            not _same_generation(opened, after)
            or not _same_generation(after, visible)
        ):
            raise PlanError("repository_file_changed:" + relative)
    finally:
        os.close(fd)
    if git_blob(raw) != expected:
        raise PlanError("repository_blob_mismatch:" + relative)
    if git("rev-parse", "HEAD:" + relative) != expected:
        raise PlanError("repository_head_blob_mismatch:" + relative)
    return raw


def _same_generation(a: os.stat_result, b: os.stat_result) -> bool:
    return all(
        getattr(a, field) == getattr(b, field)
        for field in (
            "st_dev",
            "st_ino",
            "st_mode",
            "st_uid",
            "st_gid",
            "st_nlink",
            "st_size",
            "st_mtime_ns",
            "st_ctime_ns",
        )
    )


def _read_exact(fd: int, size: int, label: str) -> bytes:
    raw = bytearray()
    while len(raw) < size:
        chunk = os.read(fd, min(1024 * 1024, size - len(raw)))
        if not chunk:
            raise PlanError(label + "_short_read")
        raw.extend(chunk)
    if os.read(fd, 1):
        raise PlanError(label + "_grew")
    return bytes(raw)


def repository_snapshot(expected_head: str) -> dict[str, str]:
    if HEX40.fullmatch(expected_head) is None:
        raise PlanError("expected_head_invalid")
    head = git("rev-parse", "--verify", "HEAD^{commit}")
    tree = git("rev-parse", "--verify", "HEAD^{tree}")
    branch = git("symbolic-ref", "--short", "-q", "HEAD")
    status = git("status", "--porcelain=v1", "--untracked-files=all")
    top = git("rev-parse", "--show-toplevel")
    if Path(top).resolve() != ROOT.resolve():
        raise PlanError("checkout_root_invalid")
    if head != expected_head:
        raise PlanError("checkout_head_mismatch")
    if branch != "main":
        raise PlanError("checkout_branch_not_main")
    if status:
        raise PlanError("checkout_not_clean")
    if HEX40.fullmatch(tree) is None:
        raise PlanError("checkout_tree_invalid")
    return {"head": head, "tree": tree, "branch": branch}


def _safe_root_chain(path: Path) -> None:
    real = Path(os.path.realpath(path))
    cursor = Path(real.anchor)
    for part in real.parent.parts[1:]:
        st = cursor.lstat()
        if (
            not stat.S_ISDIR(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_uid != 0
            or st.st_gid != 0
            or stat.S_IMODE(st.st_mode) & 0o022
        ):
            raise PlanError("tool_parent_not_root_protected:" + str(cursor))
        cursor = cursor / part
    st = cursor.lstat()
    if (
        not stat.S_ISDIR(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or st.st_gid != 0
        or stat.S_IMODE(st.st_mode) & 0o022
    ):
        raise PlanError("tool_parent_not_root_protected:" + str(cursor))


def tool_identity(fixed: Path, label: str) -> dict[str, Any]:
    try:
        alias = fixed.lstat()
    except OSError as exc:
        raise PlanError(label + "_alias_unavailable") from exc
    if (
        alias.st_uid != 0
        or alias.st_gid != 0
        or (
            not stat.S_ISREG(alias.st_mode)
            and not stat.S_ISLNK(alias.st_mode)
        )
        or (
            stat.S_ISREG(alias.st_mode)
            and stat.S_IMODE(alias.st_mode) & 0o022
        )
    ):
        raise PlanError(label + "_alias_custody_invalid")
    _safe_root_chain(fixed)

    canonical_path = Path(os.path.realpath(fixed))
    _safe_root_chain(canonical_path)
    try:
        before = canonical_path.lstat()
    except OSError as exc:
        raise PlanError(label + "_target_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_uid != 0
        or before.st_gid != 0
        or before.st_nlink != 1
        or stat.S_IMODE(before.st_mode) & 0o022
        or not stat.S_IMODE(before.st_mode) & 0o111
        or before.st_size < 1
        or before.st_size > MAX_TOOL
    ):
        raise PlanError(label + "_target_custody_invalid")

    fd = os.open(
        canonical_path,
        os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW,
    )
    try:
        opened = os.fstat(fd)
        if not _same_generation(before, opened):
            raise PlanError(label + "_target_rebound")
        raw = _read_exact(fd, before.st_size, label)
        after = os.fstat(fd)
        visible = canonical_path.lstat()
        alias_after = fixed.lstat()
        if (
            not _same_generation(opened, after)
            or not _same_generation(after, visible)
            or not _same_generation(alias, alias_after)
            or Path(os.path.realpath(fixed)) != canonical_path
        ):
            raise PlanError(label + "_generation_changed")
    finally:
        os.close(fd)

    return {
        "fixed_path": str(fixed),
        "realpath": str(canonical_path),
        "bytes": len(raw),
        "sha256": sha256(raw),
        "alias_mode": f"{stat.S_IMODE(alias.st_mode):04o}",
        "target_mode": f"{stat.S_IMODE(before.st_mode):04o}",
        "uid": before.st_uid,
        "gid": before.st_gid,
        "dev": before.st_dev,
        "ino": before.st_ino,
        "root_owned_protected": True,
    }


def stable_artifact(
    path: Path,
    *,
    expected_bytes: int,
    expected_sha256: str,
    expected_git_blob: str,
    expected_mode: int,
    label: str,
) -> dict[str, Any]:
    raw_path = str(path)
    if (
        not path.is_absolute()
        or os.path.normpath(raw_path) != raw_path
        or "\n" in raw_path
        or "\r" in raw_path
    ):
        raise PlanError(label + "_path_invalid")
    try:
        before = path.lstat()
    except OSError as exc:
        raise PlanError(label + "_unavailable") from exc
    if (
        not stat.S_ISREG(before.st_mode)
        or stat.S_ISLNK(before.st_mode)
        or before.st_nlink != 1
        or stat.S_IMODE(before.st_mode) != expected_mode
        or before.st_size != expected_bytes
    ):
        raise PlanError(label + "_metadata_invalid")
    fd = os.open(path, os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW)
    try:
        opened = os.fstat(fd)
        if not _same_generation(before, opened):
            raise PlanError(label + "_rebound")
        raw = _read_exact(fd, expected_bytes, label)
        after = os.fstat(fd)
        visible = path.lstat()
        if (
            not _same_generation(opened, after)
            or not _same_generation(after, visible)
        ):
            raise PlanError(label + "_changed")
    finally:
        os.close(fd)
    if sha256(raw) != expected_sha256:
        raise PlanError(label + "_sha256_mismatch")
    if git_blob(raw) != expected_git_blob:
        raise PlanError(label + "_git_blob_mismatch")
    return {
        "path": raw_path,
        "bytes": expected_bytes,
        "sha256": expected_sha256,
        "git_blob_sha1": expected_git_blob,
        "mode": f"{expected_mode:04o}",
        "uid": before.st_uid,
        "gid": before.st_gid,
        "dev": before.st_dev,
        "ino": before.st_ino,
    }


def source_dependencies() -> dict[str, Any]:
    materializer_raw = repository_blob(MATERIALIZER_REL, MATERIALIZER_BLOB)
    repository_blob(MATERIALIZER_PROOF_REL, MATERIALIZER_PROOF_BLOB)
    repository_blob(MATERIALIZER_DOC_REL, MATERIALIZER_DOC_BLOB)
    repository_blob(MATERIALIZER_WORKFLOW_REL, MATERIALIZER_WORKFLOW_BLOB)
    lock_raw = repository_blob(LOCK_REL, LOCK_BLOB)
    repository_blob(CANDIDATE_REL, CANDIDATE_BLOB)
    bootstrap_raw = repository_blob(BOOTSTRAP_SOURCE_REL, BOOTSTRAP_SOURCE_BLOB)
    manifest_raw = repository_blob(MANIFEST_REL, MANIFEST_BLOB)

    if (
        len(manifest_raw) != MANIFEST_BYTES
        or sha256(manifest_raw) != MANIFEST_SHA256
    ):
        raise PlanError("source_manifest_identity_mismatch")
    try:
        lock = json.loads(lock_raw.decode("utf-8", "strict"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise PlanError("accepted_lock_json_invalid") from exc
    required = {
        "lock_id": LOCK_ID,
        "candidate_accepted": True,
        "native_binary_identity_accepted": True,
        "source_generation_identity_accepted": True,
        "protected_install_authorized": False,
        "live_execution_authorized": False,
        "funds_movement_authorized": False,
        "next_gate":
            "void_buy_void_epoch2_dormant_first_entry_"
            "bootstrap_v6_materializer_v1",
    }
    for key, want in required.items():
        if lock.get(key) != want:
            raise PlanError("accepted_lock_field_mismatch:" + key)
    report = lock.get("candidate_report")
    binary = lock.get("native_binary")
    source_generation = lock.get("source_generation")
    if (
        not isinstance(report, dict)
        or report.get("candidate_id") != CANDIDATE_ID
        or not isinstance(binary, dict)
        or binary.get("bytes") != BOOTSTRAP_BYTES
        or binary.get("sha256") != BOOTSTRAP_SHA256
        or not isinstance(source_generation, dict)
        or source_generation.get("manifest_git_blob_sha1") != MANIFEST_BLOB
        or source_generation.get("manifest_sha256") != MANIFEST_SHA256
    ):
        raise PlanError("accepted_lock_identity_mismatch")
    if not bootstrap_raw.startswith(b"#define _GNU_SOURCE\n"):
        raise PlanError("bootstrap_source_shape_invalid")
    if not materializer_raw.startswith(b"#!/usr/bin/env python3\n"):
        raise PlanError("materializer_source_shape_invalid")
    return {
        "accepted_lock_id": LOCK_ID,
        "candidate_id": CANDIDATE_ID,
        "bootstrap_source_git_blob_sha1": BOOTSTRAP_SOURCE_BLOB,
        "materializer_git_blob_sha1": MATERIALIZER_BLOB,
        "manifest_git_blob_sha1": MANIFEST_BLOB,
    }


def policy_bytes(
    python_identity: dict[str, Any],
    git_identity: dict[str, Any],
) -> bytes:
    for label, value in (("python", python_identity), ("git", git_identity)):
        if (
            not isinstance(value.get("sha256"), str)
            or len(value["sha256"]) != 64
            or any(ch not in "0123456789abcdef" for ch in value["sha256"])
            or not isinstance(value.get("bytes"), int)
            or value["bytes"] < 1
        ):
            raise PlanError(label + "_policy_identity_invalid")
    return (
        "schema=" + POLICY_SCHEMA + "\n"
        + "python_sha256=" + python_identity["sha256"] + "\n"
        + "python_bytes=" + str(python_identity["bytes"]) + "\n"
        + "git_sha256=" + git_identity["sha256"] + "\n"
        + "git_bytes=" + str(git_identity["bytes"]) + "\n"
    ).encode("ascii")


def require_install_root_absent() -> dict[str, Any]:
    try:
        opt = Path("/opt").lstat()
    except OSError as exc:
        raise PlanError("install_parent_unavailable") from exc
    if (
        not stat.S_ISDIR(opt.st_mode)
        or stat.S_ISLNK(opt.st_mode)
        or opt.st_uid != 0
        or opt.st_gid != 0
        or stat.S_IMODE(opt.st_mode) & 0o022
    ):
        raise PlanError("install_parent_custody_invalid")
    try:
        INSTALL_ROOT.lstat()
    except FileNotFoundError:
        return {
            "path": str(INSTALL_ROOT),
            "state": "ABSENT_READY_FOR_CREATE_ONLY_INSTALL",
            "parent": "/opt",
            "parent_mode": f"{stat.S_IMODE(opt.st_mode):04o}",
            "parent_uid": opt.st_uid,
            "parent_gid": opt.st_gid,
        }
    except OSError as exc:
        raise PlanError("install_root_probe_failed") from exc
    raise PlanError("install_root_already_exists")


def collect_plan(
    bootstrap: Path,
    manifest: Path,
    expected_head: str,
) -> dict[str, Any]:
    if os.geteuid() == 0:
        raise PlanError("nonroot_plan_required")

    checkout = repository_snapshot(expected_head)
    dependencies = source_dependencies()

    bootstrap_info = stable_artifact(
        bootstrap,
        expected_bytes=BOOTSTRAP_BYTES,
        expected_sha256=BOOTSTRAP_SHA256,
        expected_git_blob=BOOTSTRAP_GIT_BLOB,
        expected_mode=0o555,
        label="accepted_bootstrap_v6",
    )
    manifest_info = stable_artifact(
        manifest,
        expected_bytes=MANIFEST_BYTES,
        expected_sha256=MANIFEST_SHA256,
        expected_git_blob=MANIFEST_BLOB,
        expected_mode=0o444,
        label="source_generation_v3_manifest",
    )

    python_identity = tool_identity(FIXED_PYTHON, "python3")
    git_identity = tool_identity(FIXED_GIT, "git")
    policy = policy_bytes(python_identity, git_identity)
    install_state = require_install_root_absent()

    body = {
        "schema": PLAN_SCHEMA,
        "version": 1,
        "expected_head": expected_head,
        "checkout": checkout,
        "dependencies": dependencies,
        "accepted_bootstrap": bootstrap_info,
        "accepted_manifest": manifest_info,
        "host_tools": {
            "python": python_identity,
            "git": git_identity,
        },
        "host_policy": {
            "schema": POLICY_SCHEMA,
            "bytes": len(policy),
            "sha256": sha256(policy),
            "git_blob_sha1": git_blob(policy),
            "text": policy.decode("ascii"),
        },
        "install_state": install_state,
        "install_contract": {
            "create_only": True,
            "overwrite_authorized": False,
            "replace_authorized": False,
            "install_root": str(INSTALL_ROOT),
            "root_owner": 0,
            "root_group": 0,
            "root_mode": "0755",
            "bin_path": str(INSTALL_BIN),
            "bin_mode": "0755",
            "bootstrap_path": str(INSTALL_BOOTSTRAP),
            "bootstrap_mode": "0555",
            "manifest_path": str(INSTALL_MANIFEST),
            "manifest_mode": "0444",
            "policy_path": str(INSTALL_POLICY),
            "policy_mode": "0444",
        },
        "host_read_performed": True,
        "filesystem_write": False,
        "bootstrap_execution_performed": False,
        "protected_installer_apply_performed": False,
        "service_mutation": False,
        "systemd_mutation": False,
        "credential_access": False,
        "private_key_access": False,
        "signing": False,
        "transaction": False,
        "rpc_call": False,
        "payment_acceptance": False,
        "public_presale_activation": False,
        "wc_void_market_activation": False,
        "treasury_liquidity_action": False,
        "funds_movement": False,
        "production_host_evidence_authority": False,
    }
    return {
        "plan_id": PLAN_PREFIX + sha256(canonical(body)),
        "body": body,
    }


def emit_plan(result: dict[str, Any]) -> None:
    body = result["body"]
    policy = body["host_policy"]
    print(MARKER)
    print("mode=plan")
    print("read_only=true")
    print("nonroot_required=true")
    print("plan_id=" + result["plan_id"])
    print("expected_head=" + body["expected_head"])
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("bootstrap_sha256=" + BOOTSTRAP_SHA256)
    print("bootstrap_bytes=" + str(BOOTSTRAP_BYTES))
    print("manifest_sha256=" + MANIFEST_SHA256)
    print("manifest_bytes=" + str(MANIFEST_BYTES))
    print("python_sha256=" + body["host_tools"]["python"]["sha256"])
    print("python_bytes=" + str(body["host_tools"]["python"]["bytes"]))
    print("git_sha256=" + body["host_tools"]["git"]["sha256"])
    print("git_bytes=" + str(body["host_tools"]["git"]["bytes"]))
    print("policy_sha256=" + policy["sha256"])
    print("policy_bytes=" + str(policy["bytes"]))
    print(
        "policy_text_json="
        + json.dumps(policy["text"], separators=(",", ":"))
    )
    print("install_root=" + str(INSTALL_ROOT))
    print("install_state=" + body["install_state"]["state"])
    print("create_only=true")
    print("overwrite_authorized=false")
    print("host_read_performed=true")
    print("filesystem_write=false")
    print("bootstrap_execution_performed=false")
    print("protected_installer_apply_performed=false")
    print("service_mutation=false")
    print("systemd_mutation=false")
    print("credential_access=false")
    print("private_key_access=false")
    print("signing=false")
    print("transaction=false")
    print("rpc_call=false")
    print("payment_acceptance=false")
    print("public_presale_activation=false")
    print("wc_void_market_activation=false")
    print("treasury_liquidity_action=false")
    print("funds_movement=false")
    print("production_host_evidence_authority=false")
    print(
        "install_contract_json="
        + json.dumps(body["install_contract"], separators=(",", ":"))
    )
    print(
        "next_action=SEPARATELY_AUTHORIZE_EPOCH2_DORMANT_FIRST_ENTRY_"
        "BOOTSTRAP_V6_CREATE_ONLY_INSTALL"
    )


def source_plan() -> None:
    print(MARKER)
    print("mode=source-plan")
    print("source_only=true")
    print("host_read=false")
    print("host_write=false")
    print("materializer_git_blob_sha1=" + MATERIALIZER_BLOB)
    print("materializer_proof_git_blob_sha1=" + MATERIALIZER_PROOF_BLOB)
    print("materializer_workflow_git_blob_sha1=" + MATERIALIZER_WORKFLOW_BLOB)
    print("accepted_lock_git_blob_sha1=" + LOCK_BLOB)
    print("accepted_lock_id=" + LOCK_ID)
    print("candidate_id=" + CANDIDATE_ID)
    print("bootstrap_source_git_blob_sha1=" + BOOTSTRAP_SOURCE_BLOB)
    print("manifest_git_blob_sha1=" + MANIFEST_BLOB)
    print("policy_schema=" + POLICY_SCHEMA)
    print("fixed_python=" + str(FIXED_PYTHON))
    print("fixed_git=" + str(FIXED_GIT))
    print("install_root=" + str(INSTALL_ROOT))
    print("create_only=true")
    print("bootstrap_execution_performed=false")
    print("protected_installer_apply_performed=false")
    print("filesystem_write=false")
    print("service_mutation=false")
    print("funds_movement=false")


def self_test() -> None:
    assert HEX40.fullmatch("a" * 40)
    assert HEX40.fullmatch("A" * 40) is None
    assert PLAN_PREFIX == "voidbuye2dormantbootstraphostplan1_"
    sample_python = {"sha256": "1" * 64, "bytes": 123}
    sample_git = {"sha256": "2" * 64, "bytes": 456}
    expected = (
        "schema=" + POLICY_SCHEMA + "\n"
        "python_sha256=" + "1" * 64 + "\n"
        "python_bytes=123\n"
        "git_sha256=" + "2" * 64 + "\n"
        "git_bytes=456\n"
    ).encode("ascii")
    assert policy_bytes(sample_python, sample_git) == expected
    assert len(sha256(canonical({"policy": sha256(expected)}))) == 64
    assert str(INSTALL_BOOTSTRAP).endswith(
        "/bin/" + BOOTSTRAP_ARTIFACT_NAME
    )
    print(MARKER + "_SELF_TEST_GREEN")
    print("accepted_bootstrap_v6_materializer_bound=true")
    print("accepted_bootstrap_v6_lock_bound=true")
    print("source_generation_v3_bound=true")
    print("precision_python_generation_plan_bound=true")
    print("precision_git_generation_plan_bound=true")
    print("host_policy_exact_order_bound=true")
    print("create_only_install_plan=true")
    print("nonroot_plan_required=true")
    print("bootstrap_execution_performed=false")
    print("protected_installer_apply_performed=false")
    print("filesystem_write=false")
    print("service_mutation=false")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--source-plan", action="store_true")
    mode.add_argument("--plan", action="store_true")
    parser.add_argument("--bootstrap", default="")
    parser.add_argument("--manifest", default="")
    parser.add_argument("--expected-head", default="")
    args = parser.parse_args()

    if args.self_test:
        self_test()
        return 0
    if args.source_plan:
        source_plan()
        return 0
    if not args.bootstrap or not args.manifest or not args.expected_head:
        raise PlanError("bootstrap_manifest_expected_head_required")
    result = collect_plan(
        Path(args.bootstrap),
        Path(args.manifest),
        args.expected_head,
    )
    emit_plan(result)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PlanError as exc:
        print(MARKER)
        print("status=HOLD")
        print("reason=" + str(exc))
        print("read_only=true")
        print("filesystem_write=false")
        print("bootstrap_execution_performed=false")
        print("protected_installer_apply_performed=false")
        print("service_mutation=false")
        print("credential_access=false")
        print("private_key_access=false")
        print("signing=false")
        print("transaction=false")
        print("rpc_call=false")
        print("payment_acceptance=false")
        print("public_presale_activation=false")
        print("wc_void_market_activation=false")
        print("treasury_liquidity_action=false")
        print("funds_movement=false")
        raise SystemExit(2)
