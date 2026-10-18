#!/usr/bin/env python3
"""Exercise the V5 launcher-V2 source generation, parent contract and Git boundary in disposable fixtures.

No configured helper is installed or executed.  No production plan/apply,
bootstrap, network, credential, or service operation is performed.
"""
from __future__ import annotations

import contextlib
import fcntl
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import tempfile
import types
from unittest.mock import patch
import zlib

ROOT = Path(__file__).resolve().parents[1]
TARGET_REL = "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v5.py"
TARGET = ROOT / TARGET_REL
TARGET_BLOB = "ce6930bc1be8239a3171d4922c44b96a50f5778b"
MANIFEST_BLOB = "de56bacb30bea0adc418e240cf3fb8d900b061ef"
GIT = "/usr/bin/git"
MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_INSTALLER_V5_GENERATION_PROOF_GREEN"
MANIFEST_REL = "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v3.conf"
GENERATION_PREFIX = "voidbuye2dormantsourcegen3_"
MANIFEST_KEYS = (
    "schema", "repository", "trusted_os_runtime", "checkout_path",
    "bootstrap_root", "bootstrap_self", "manifest_rel", "installer_rel",
    "installer_blob_sha1", "installer_bytes", "installer_sha256",
    "bootstrap_source_rel", "bootstrap_source_blob_sha1", "bootstrap_source_bytes",
    "bootstrap_source_sha256", "lock_rel", "lock_blob_sha1", "lock_bytes",
    "lock_sha256", "runtime_installer_rel", "runtime_installer_blob_sha1",
    "runtime_installer_bytes", "runtime_installer_sha256", "launcher_bytes",
    "launcher_sha256", "native_bytes", "native_sha256", "python_path", "git_path",
    "install_root", "payload_policy_schema", "host_policy_schema",
    "parent_proof_schema", "plan_prefix", "confirm_token",
)
SOURCE_ROLES = ("installer", "bootstrap_source", "lock", "runtime_installer")
FD_ROLES = (
    "proof", "manifest", "installer", "bootstrap_source", "lock",
    "runtime_installer", "launcher", "native", "policy", "python", "git",
    "checkout", "git_dir",
)
PROOF_KEYS = (
    "schema", "parent_pid", "parent_start_ticks", "parent_exe_dev",
    "parent_exe_ino", "operation", "expected_head", "expected_tree",
    "expected_plan_id", "source_generation_id", "manifest_sha256",
    "manifest_bytes", "host_policy_sha256", "host_policy_bytes",
) + tuple(role + suffix for role in FD_ROLES for suffix in ("_fd", "_dev", "_ino"))
FROZEN = {
    'ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v3.py': '242eac04da6e17d32e9a9baa9b57f572cabda7a8',
    'ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v4.c': 'c7d2125b59dcbecc1d6aae8818e84cac8ce85da9',
    'ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v1.conf': 'a484a7d2e1159ebbef3357ec849af92d7f12cff1',
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v2.py": "69a018c0eccedf3782055c56725579d02463b05e",
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v3.c": "2c3c9ed120cc9949a0528e43be886354aa25da5a",
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py": "383b84e71b371de65579e4113469e86a59b807ab",
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v2.c": "19f9baf8d6d707da43dbd0e247667af1a10e46c5",
    "ops/security/buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v1.json": "f8ff6fbb855aecafc329cd60622cf3af782745a3",
    "ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py": "f3d6b1559be7490303cf36338c4bfa38fdaa390a",
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v4.py": "88577de29dddbe61d2c2f59179d0dcb62a49165a",
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v5.c": "81fc960f1cec597b01875ed944b25e5b6574d34d",
    "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v2.conf": "782f747cda24a214c64e8ec3f49b6791bbb62f97",
}


def blob(raw: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()


def require(condition: bool, reason: str) -> None:
    if not condition:
        raise AssertionError(reason)


def snapshot(root: Path) -> dict[str, tuple]:
    """Observe fixture bytes and generation metadata; access time is excluded."""
    result = {}
    for path in (root, *sorted(root.rglob("*"))):
        metadata = path.lstat()
        name = str(path.relative_to(root))
        if stat.S_ISLNK(metadata.st_mode):
            value = ("link", os.readlink(path))
        elif stat.S_ISDIR(metadata.st_mode):
            value = ("dir",)
        elif stat.S_ISREG(metadata.st_mode):
            value = ("file", hashlib.sha256(path.read_bytes()).hexdigest())
        else:
            value = ("other",)
        result[name] = (
            metadata.st_dev, metadata.st_ino, metadata.st_mode,
            metadata.st_uid, metadata.st_gid, metadata.st_nlink,
            metadata.st_size, metadata.st_mtime_ns, metadata.st_ctime_ns,
            *value,
        )
    return result


def setup_git(root: Path, *args: str) -> bytes:
    environment = {
        "PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C",
        "LC_ALL": "C", "TZ": "UTC", "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_SYSTEM": "/dev/null",
        "GIT_NO_REPLACE_OBJECTS": "1", "GIT_TERMINAL_PROMPT": "0",
        "GIT_ALLOW_PROTOCOL": "", "GIT_AUTHOR_NAME": "VOID fixture",
        "GIT_AUTHOR_EMAIL": "fixture@example.invalid",
        "GIT_COMMITTER_NAME": "VOID fixture",
        "GIT_COMMITTER_EMAIL": "fixture@example.invalid",
    }
    completed = subprocess.run(
        [GIT, "-C", str(root), "-c", "core.hooksPath=/dev/null",
         "-c", "core.fsmonitor=false", *args],
        stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
        env=environment, timeout=20, check=False,
    )
    require(completed.returncode == 0, "fixture_git_failed:" + completed.stderr.decode("utf-8", "replace"))
    return completed.stdout


def expect_hold(module, function, reason: str) -> str:
    try:
        function()
    except module.InstallError as exc:
        return str(exc)
    raise AssertionError("missing_hold:" + reason)


def encoded_rows(rows: dict[str, str]) -> bytes:
    return "".join(key + "=" + value + "\n" for key, value in rows.items()).encode("ascii")


def row_changed(raw: bytes, key: str, value: str) -> bytes:
    rows = dict(line.split("=", 1) for line in raw.decode("ascii").splitlines())
    require(key in rows, "fixture_unknown_row:" + key)
    rows[key] = value
    return encoded_rows(rows)


def prove_closed_rows(module, parser, raw: bytes, keys: tuple[str, ...], label: str) -> int:
    parsed = parser(raw)
    require(tuple(parsed) == keys, label + "_closed_membership_mismatch")
    rows = raw.splitlines(keepends=True)
    malformed = [
        raw[:-1], raw + b"\n", raw.replace(b"\n", b"\r\n"),
        raw + b"unknown_key=value\n", b"\x00" + raw, b"\xff" + raw,
        b" " + raw, b"\n" + raw,
    ]
    for index in range(len(rows)):
        malformed.append(b"".join(rows[:index] + rows[index + 1:]))
        malformed.append(b"".join(rows[:index + 1] + [rows[index]] + rows[index + 1:]))
    for index in range(len(rows) - 1):
        reordered = list(rows)
        reordered[index], reordered[index + 1] = reordered[index + 1], reordered[index]
        malformed.append(b"".join(reordered))
    for index, changed in enumerate(malformed):
        expect_hold(module, lambda changed=changed: parser(changed), label + "_shape_" + str(index))
    return len(malformed)


def prove_manifest_shape(module) -> tuple[bytes, dict[str, str], int]:
    raw = (ROOT / MANIFEST_REL).read_bytes()
    parsed = module.parse_source_manifest(raw)
    count = prove_closed_rows(module, module.parse_source_manifest, raw, MANIFEST_KEYS, "manifest")
    require(len(parsed) == 35, "manifest_membership_not_35")
    require(module.source_generation_id(raw) == GENERATION_PREFIX + hashlib.sha256(raw).hexdigest(), "manifest_generation_identity_not_exact_bytes")
    for role in SOURCE_ROLES:
        source = (ROOT / parsed[role + "_rel"]).read_bytes()
        require(blob(source) == parsed[role + "_blob_sha1"], "manifest_source_blob_drift:" + role)
        require(str(len(source)) == parsed[role + "_bytes"], "manifest_source_size_drift:" + role)
        require(hashlib.sha256(source).hexdigest() == parsed[role + "_sha256"], "manifest_source_digest_drift:" + role)
    mutations = {
        "repository": "different/repository",
        "trusted_os_runtime": "unbounded_runtime",
        "checkout_path": "/tmp/caller-checkout",
        "bootstrap_root": "/tmp/caller-bootstrap",
        "bootstrap_self": "/tmp/caller-bootstrap/bin/native",
        "manifest_rel": "../caller-manifest.conf",
        "installer_rel": "caller-installer.py",
        "bootstrap_source_rel": "caller-bootstrap.c",
        "lock_rel": "caller-lock.json",
        "runtime_installer_rel": "caller-runtime.py",
        "python_path": "/tmp/python3",
        "git_path": "/tmp/git",
        "install_root": "/tmp/caller-install-root",
        "plan_prefix": "caller_plan_",
        "confirm_token": "INSTALL_ANYTHING",
        "schema": parsed["schema"] + "_OTHER",
        "payload_policy_schema": parsed["payload_policy_schema"] + "_OTHER",
        "host_policy_schema": parsed["host_policy_schema"] + "_OTHER",
        "parent_proof_schema": parsed["parent_proof_schema"] + "_OTHER",
    }
    for key in MANIFEST_KEYS:
        if key.endswith("_bytes"):
            for value in ("0", "01", "-1", "+1", "1 ", "1.0"):
                changed = row_changed(raw, key, value)
                expect_hold(module, lambda changed=changed: module.parse_source_manifest(changed), "manifest_invalid_decimal:" + key)
                count += 1
        if key.endswith("_sha256") or key.endswith("_blob_sha1"):
            for value in ("A" * len(parsed[key]), parsed[key][:-1], "g" * len(parsed[key])):
                changed = row_changed(raw, key, value)
                expect_hold(module, lambda changed=changed: module.parse_source_manifest(changed), "manifest_invalid_hash:" + key)
                count += 1
    for key, value in mutations.items():
        changed = row_changed(raw, key, value)
        expect_hold(module, lambda changed=changed: module.parse_source_manifest(changed), "manifest_redirect:" + key)
        count += 1
    return raw, parsed, count


def proof_rows(manifest_raw: bytes) -> dict[str, str]:
    digest = hashlib.sha256(manifest_raw).hexdigest()
    rows = {
        "schema": "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_PARENT_PROOF_V1",
        "parent_pid": str(os.getppid()), "parent_start_ticks": "1",
        "parent_exe_dev": "0", "parent_exe_ino": "1",
        "operation": "installer_plan", "expected_head": "1" * 40,
        "expected_tree": "2" * 40, "expected_plan_id": "none",
        "source_generation_id": GENERATION_PREFIX + digest,
        "manifest_sha256": digest, "manifest_bytes": str(len(manifest_raw)),
        "host_policy_sha256": "3" * 64, "host_policy_bytes": "1",
    }
    for index, role in enumerate(FD_ROLES):
        rows[role + "_fd"] = str(index + 3)
        rows[role + "_dev"] = "0"
        rows[role + "_ino"] = str(index + 1)
    return rows


def prove_parent_proof_shape(module, manifest_raw: bytes) -> int:
    raw = encoded_rows(proof_rows(manifest_raw))
    count = prove_closed_rows(module, module._parse_parent_proof, raw, PROOF_KEYS, "parent_proof")
    mutations = {
        "schema": "CALLER_SELECTED_PARENT_PROOF",
        "parent_pid": "0", "parent_start_ticks": "01", "parent_exe_dev": "-1",
        "parent_exe_ino": "0", "operation": "caller_apply", "expected_head": "A" * 40,
        "expected_tree": "a" * 39, "expected_plan_id": module.PLAN_PREFIX + "4" * 64,
        "source_generation_id": GENERATION_PREFIX + "0" * 64,
        "manifest_bytes": "+1", "host_policy_bytes": "0",
    }
    for role in FD_ROLES:
        mutations[role + "_fd"] = "2"
        mutations[role + "_dev"] = "-1"
        mutations[role + "_ino"] = "0"
    for key, value in mutations.items():
        changed = row_changed(raw, key, value)
        expect_hold(module, lambda changed=changed: module._parse_parent_proof(changed), "parent_proof_value:" + key)
        count += 1
    aliased = row_changed(raw, "native_fd", "3")
    expect_hold(module, lambda: module._parse_parent_proof(aliased), "parent_proof_fd_alias")
    applied = row_changed(row_changed(raw, "operation", "installer_apply"), "expected_plan_id", module.PLAN_PREFIX + "4" * 64)
    require(module._parse_parent_proof(applied)["expected_plan_id"] == module.PLAN_PREFIX + "4" * 64, "canonical_apply_proof_rejected")
    expect_hold(module, lambda: module._parse_parent_proof(row_changed(applied, "expected_plan_id", "none")), "apply_proof_missing_plan_id")
    return count + 2


@contextlib.contextmanager
def sealed_fd(raw: bytes, *, executable: bool = False, seal: bool = True):
    fd = os.memfd_create("void-v3-generation-proof", os.MFD_CLOEXEC | os.MFD_ALLOW_SEALING)
    try:
        position = 0
        while position < len(raw):
            count = os.write(fd, raw[position:])
            require(count > 0, "fixture_memfd_short_write")
            position += count
        os.fchmod(fd, 0o500 if executable else 0o400)
        if seal:
            fcntl.fcntl(fd, fcntl.F_ADD_SEALS, fcntl.F_SEAL_SEAL | fcntl.F_SEAL_SHRINK | fcntl.F_SEAL_GROW | fcntl.F_SEAL_WRITE)
        yield fd
    finally:
        os.close(fd)


def fresh_module():
    module = types.ModuleType("void_v3_disposable_component")
    module.__file__ = str(TARGET)
    exec(compile(TARGET.read_bytes(), str(TARGET), "exec"), module.__dict__)
    return module


def admitted_root_stat(st):
    # The fixture process need not be root. Only ownership admission is simulated;
    # descriptor type, seals, mode, size, identity and bytes remain real.
    names = (
        "st_dev", "st_ino", "st_mode", "st_nlink", "st_size",
        "st_mtime_ns", "st_ctime_ns",
    )
    return types.SimpleNamespace(**{name: getattr(st, name) for name in names}, st_uid=0, st_gid=0)


@contextlib.contextmanager
def admitted_git_fixture_ownership(module, descriptor):
    """Simulate custody only for this one real, sealed Git executable inode."""
    original = os.fstat(descriptor)
    identity = (original.st_dev, original.st_ino)

    def is_git(st):
        return (st.st_dev, st.st_ino) == identity

    # Production must continue rejecting either wrong ownership field. These
    # negatives preserve the actual descriptor type, seals, mode and contents.
    for field in ("st_uid", "st_gid"):
        def wrong_owner(fd, field=field):
            observed = os.fstat(fd)
            if not is_git(observed):
                return observed
            changed = admitted_root_stat(observed)
            setattr(changed, field, 1)
            return changed
        with patch.object(module, "os", types.SimpleNamespace(**(vars(module.os) | {"fstat": wrong_owner}))):
            reason = expect_hold(module, lambda: module._sealed_fd_state(
                descriptor, mode=0o500, maximum=module.MAX_GIT_BYTES, label="fixture_git"
            ), "git_fixture_wrong_ownership:" + field)
        require(reason == "fixture_git_snapshot_metadata_invalid", "production_git_owner_check_not_enforced:" + field)

    def admitted_fstat(fd):
        observed = os.fstat(fd)
        return admitted_root_stat(observed) if is_git(observed) else observed

    with patch.object(module, "os", types.SimpleNamespace(**(vars(module.os) | {"fstat": admitted_fstat}))):
        # A different memfd retains its real owner, including on hosted runners.
        with sealed_fd(b"unrelated fixture descriptor, never executed\n") as other:
            observed, actual = module.os.fstat(other), os.fstat(other)
            require((observed.st_uid, observed.st_gid) == (actual.st_uid, actual.st_gid),
                    "git_fixture_owner_admission_escaped_exact_inode")
        yield


def forbidden(*args, **kwargs):
    raise AssertionError("component fixture attempted unadmitted filesystem or process access")


def descriptor_module():
    module = fresh_module()
    admitted_fds: set[int] = set()

    def fstat(fd):
        require(fd in admitted_fds, "descriptor_outside_fixture")
        return admitted_root_stat(os.fstat(fd))

    module.os = types.SimpleNamespace(**(vars(os) | {"fstat": fstat, "open": forbidden}))
    return module, admitted_fds


def prove_sealed_inputs(generation_fixture) -> None:
    module, admitted_fds = descriptor_module()
    with contextlib.ExitStack() as stack:
        payload = b"immutable inherited fixture bytes; never executed\n"
        fd = stack.enter_context(sealed_fd(payload))
        admitted_fds.add(fd)
        os.lseek(fd, 7, os.SEEK_SET)
        require(module._read_sealed_fd(fd, maximum=4096, label="fixture") == payload, "sealed_input_bytes_changed")
        require(os.lseek(fd, 0, os.SEEK_CUR) == 7, "sealed_reader_depends_on_or_changes_shared_offset")
        require(module._read_sealed_fd(fd, maximum=4096, label="fixture") == payload, "sealed_input_not_repeatable")
        for missing in (fcntl.F_SEAL_SEAL, fcntl.F_SEAL_SHRINK, fcntl.F_SEAL_GROW, fcntl.F_SEAL_WRITE):
            mutable = stack.enter_context(sealed_fd(payload, seal=False))
            admitted_fds.add(mutable)
            required = fcntl.F_SEAL_SEAL | fcntl.F_SEAL_SHRINK | fcntl.F_SEAL_GROW | fcntl.F_SEAL_WRITE
            fcntl.fcntl(mutable, fcntl.F_ADD_SEALS, required & ~missing)
            expect_hold(module, lambda mutable=mutable: module._read_sealed_fd(mutable, maximum=4096, label="fixture"), "missing_individual_seal")
        expect_hold(module, lambda: module._read_sealed_fd(fd, maximum=1, label="fixture"), "oversized_sealed_input")
        executable = stack.enter_context(sealed_fd(payload, executable=True))
        admitted_fds.add(executable)
        expect_hold(module, lambda: module._read_sealed_fd(executable, maximum=4096, label="fixture"), "data_snapshot_executable")
        require(module._sealed_tool_digest(executable, maximum=4096, label="fixture_tool") == (hashlib.sha256(payload).hexdigest(), len(payload)), "sealed_tool_digest_not_exact")
        expect_hold(module, lambda: module._sealed_tool_digest(fd, maximum=4096, label="fixture_tool"), "tool_snapshot_not_executable")

        native = stack.enter_context(sealed_fd(b"second immutable payload\n"))
        admitted_fds.add(native)
        context = {
            "fds": {"launcher": fd, "native": native},
            "payloads": {"launcher": payload, "native": b"second immutable payload\n"},
            "proof": {"expected_head": generation_fixture["head_one"]},
            "manifest": generation_fixture["manifest"],
            "sources": generation_fixture["sources"],
        }
        module._BOOTSTRAP_CONTEXT = context
        path = Path("/proc/self/fd/" + str(fd))

        def candidate(candidate_path=path, digest=hashlib.sha256(payload).hexdigest()):
            return module._read_exact_candidate(candidate_path, expected_bytes=len(payload), expected_sha256=digest, label="fixture_candidate")

        require(candidate() == payload, "candidate_not_read_from_inherited_fd")
        expect_hold(module, lambda: candidate(Path("/tmp/caller-selected-payload")), "caller_payload_path")
        expect_hold(module, lambda: candidate(digest="0" * 64), "candidate_digest_substitution")
        context["payloads"] = dict(context["payloads"], launcher=b"substituted cached payload")
        expect_hold(module, candidate, "candidate_snapshot_cache_substitution")
        context["payloads"]["launcher"] = payload

        module._git = forbidden
        module._read_git_object = forbidden
        for role, raw in context["sources"].items():
            relative = context["manifest"][role + "_rel"]
            observed = module._git_object(generation_fixture["head_one"], relative, expected_blob=blob(raw), expected_bytes=len(raw), expected_sha256=hashlib.sha256(raw).hexdigest())
            require(observed == raw, "operational_source_not_read_from_inherited_set:" + role)
        expect_hold(module, lambda: module._git_object(generation_fixture["head_one"], "unrelated.txt", expected_blob="0" * 40), "source_outside_closed_membership")
        expect_hold(module, lambda: module._git_object("0" * 40, module.RUNTIME_INSTALLER_REL, expected_blob=module.RUNTIME_INSTALLER_GIT_BLOB_SHA1), "inherited_source_wrong_runtime_head")


def prove_closed_environment_and_direct_calls() -> None:
    module = fresh_module()
    fake_environment = dict(module.CHILD_BASE_ENV)
    fake_environment[module.PARENT_PROOF_ENV] = "7"
    module.os = types.SimpleNamespace(**(vars(os) | {"environ": fake_environment, "geteuid": lambda: 0, "open": forbidden}))
    module.sys = types.SimpleNamespace(**(vars(sys) | {
        "flags": types.SimpleNamespace(isolated=1, no_site=1), "dont_write_bytecode": True,
    }))
    require(module._require_bootstrap_environment() == 7, "closed_environment_not_admitted")
    for key, value in (
        ("LD_PRELOAD", "/tmp/untrusted.so"), ("PYTHONPATH", "/tmp/untrusted"),
        ("GIT_CONFIG", "/tmp/untrusted.conf"), ("GIT_OBJECT_DIRECTORY", "/tmp/objects"),
        ("PATH", "/tmp:/usr/bin:/bin"), ("HOME", "/root"),
        (module.PARENT_PROOF_ENV, "07"), (module.PARENT_PROOF_ENV, "2"),
    ):
        module.os.environ = dict(fake_environment, **{key: value})
        expect_hold(module, module._require_bootstrap_environment, "hostile_environment:" + key)
    module.os.environ = dict(fake_environment)
    module.sys.flags = types.SimpleNamespace(isolated=1, no_site=0)
    expect_hold(module, module._require_bootstrap_environment, "site_imports_not_disabled")
    module.sys.flags = types.SimpleNamespace(isolated=0, no_site=1)
    expect_hold(module, module._require_bootstrap_environment, "python_not_isolated")
    module.sys.flags = types.SimpleNamespace(isolated=1, no_site=1)
    module.sys.dont_write_bytecode = False
    expect_hold(module, module._require_bootstrap_environment, "python_bytecode_writes_enabled")
    module.sys.dont_write_bytecode = True
    module.os.environ = dict(module.CHILD_BASE_ENV)
    expect_hold(module, module._require_bootstrap_environment, "missing_private_proof_fd")

    # No operational admission is patched in. The real public methods must stop
    # at missing context before any candidate/checkout/tool/protected-root read.
    module._BOOTSTRAP_CONTEXT = None
    module._require_secure_apply_context = lambda: None
    for name in ("accepted_lock", "_git", "_tool_snapshot", "checkout_snapshot", "python_snapshot", "protected_state", "_read_exact_candidate"):
        setattr(module, name, forbidden)
    launcher = Path("/tmp/disposable-fixture-launcher")
    native = Path("/tmp/disposable-fixture-native")
    with contextlib.redirect_stdout(io.StringIO()):
        expect_hold(module, lambda: module.collect_plan(launcher, native, "1" * 40), "direct_collect_without_parent")
        expect_hold(module, lambda: module.plan(launcher, native, "1" * 40), "direct_plan_without_parent")
        expect_hold(module, lambda: module.apply(launcher, native, "1" * 40, module.PLAN_PREFIX + "2" * 64, module.CONFIRM_TOKEN), "direct_apply_without_parent")


def prove_parent_descriptors(manifest_raw: bytes) -> None:
    module, admitted_fds = descriptor_module()
    with tempfile.TemporaryDirectory(prefix="void-v3-parent-descriptors-") as temporary, contextlib.ExitStack() as stack:
        checkout = Path(temporary) / "checkout"
        checkout.mkdir()
        (checkout / ".git").mkdir()
        fds = {}
        for role in FD_ROLES:
            if role in ("checkout", "git_dir"):
                path = checkout if role == "checkout" else checkout / ".git"
                fd = os.open(path, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)
                stack.callback(os.close, fd)
            else:
                fd = stack.enter_context(sealed_fd(b"fixture descriptor\n", executable=role in ("python", "git"), seal=role != "proof"))
            fds[role] = fd
            admitted_fds.add(fd)

        # Use the PID exposed by this procfs mount. Some source test sandboxes
        # virtualize getpid() without mounting the corresponding PID namespace.
        pid = int(os.readlink("/proc/self"))
        start = module._process_start_ticks(pid)
        parent_exe = os.stat("/proc/self/exe")
        rows = proof_rows(manifest_raw)
        rows.update(parent_pid=str(pid), parent_start_ticks=str(start), parent_exe_dev=str(parent_exe.st_dev), parent_exe_ino=str(parent_exe.st_ino))
        for role, fd in fds.items():
            st = os.fstat(fd)
            rows.update({role + "_fd": str(fd), role + "_dev": str(st.st_dev), role + "_ino": str(st.st_ino)})
        proof_raw = encoded_rows(rows)
        os.ftruncate(fds["proof"], 0)
        require(os.pwrite(fds["proof"], proof_raw, 0) == len(proof_raw), "fixture_proof_short_write")
        fcntl.fcntl(fds["proof"], fcntl.F_ADD_SEALS, fcntl.F_SEAL_SEAL | fcntl.F_SEAL_SHRINK | fcntl.F_SEAL_GROW | fcntl.F_SEAL_WRITE)
        context = {"proof": module._parse_parent_proof(proof_raw), "proof_raw": proof_raw, "fds": fds}

        # Native executable/interpreter admission is simulated here. All thirteen
        # descriptor identities, seals and /proc descriptor observations are real.
        # The native harness separately exercises its actual proof producer and
        # checkout helpers; production parent handoff remains outside this proof.
        module._native_parent_identity = lambda: (pid, start, parent_exe)
        module.os.environ = dict(module.CHILD_BASE_ENV, **{module.PARENT_PROOF_ENV: str(fds["proof"])})
        module.os.geteuid = lambda: 0
        module.sys = types.SimpleNamespace(**(vars(sys) | {
            "argv": ["/proc/self/fd/" + str(fds["installer"])],
            "flags": types.SimpleNamespace(isolated=1, no_site=1), "dont_write_bytecode": True,
        }))

        def open_checkout():
            fd = os.open(checkout, os.O_RDONLY | os.O_DIRECTORY | os.O_CLOEXEC | os.O_NOFOLLOW)
            admitted_fds.add(fd)
            return fd

        def open_relative(path, flags, mode=0o777, *, dir_fd=None):
            require(path == b".git" and dir_fd in admitted_fds, "parent_fixture_open_outside_checkout")
            fd = os.open(path, flags, mode, dir_fd=dir_fd)
            admitted_fds.add(fd)
            return fd

        peer_override = {}
        executed_python = [fds["python"]]

        def observed_stat(path, **kwargs):
            if path == "/proc/self/exe":
                return admitted_root_stat(os.fstat(executed_python[0]))
            prefix = "/proc/" + str(pid) + "/fd/"
            require(str(path).startswith(prefix), "parent_fixture_stat_outside_proc_descriptors")
            fd = int(str(path)[len(prefix):])
            require(fd in admitted_fds, "parent_fixture_stat_unknown_fd")
            return admitted_root_stat(os.stat(prefix + str(peer_override.get(fd, fd)), **kwargs))

        module._open_fixed_checkout = open_checkout
        module.os.open = open_relative
        module.os.stat = observed_stat
        module._validate_parent_and_descriptors(context)

        for key in ("parent_pid", "parent_start_ticks", "parent_exe_dev", "parent_exe_ino"):
            original = context["proof"][key]
            context["proof"][key] = str(int(original) + 1)
            expect_hold(module, lambda: module._validate_parent_and_descriptors(context), "forged_live_parent:" + key)
            context["proof"][key] = original

        replacement = stack.enter_context(sealed_fd(b"replacement descriptor generation\n"))
        admitted_fds.add(replacement)
        for role, fd in fds.items():
            retained = os.dup(fd)
            try:
                os.dup2(replacement, fd)
                expect_hold(module, lambda: module._validate_parent_and_descriptors(context), "substituted_retained_descriptor:" + role)
            finally:
                os.dup2(retained, fd)
                os.close(retained)
        module._validate_parent_and_descriptors(context)
        peer_override[fds["installer"]] = replacement
        expect_hold(module, lambda: module._validate_parent_and_descriptors(context), "parent_only_descriptor_substitution")
        peer_override.clear()
        module.sys.argv = ["/tmp/caller-selected-installer.py"]
        expect_hold(module, lambda: module._validate_parent_and_descriptors(context), "unsealed_executing_installer_path")
        module.sys.argv = ["/proc/self/fd/" + str(fds["installer"])]
        executed_python[0] = replacement
        expect_hold(module, lambda: module._validate_parent_and_descriptors(context), "different_executing_python_generation")


def prove_revalidation_drift(generation_fixture) -> None:
    module, admitted_fds = descriptor_module()
    with tempfile.TemporaryDirectory(prefix="void-v3-revalidation-") as temporary, contextlib.ExitStack() as stack:
        root = Path(temporary)
        payloads = {"launcher": b"fixture launcher\n", "native": b"fixture native\n"}
        tools = {"python": b"fixture Python snapshot, never executed\n", "git": b"fixture Git snapshot, never executed\n"}
        manifest = dict(generation_fixture["manifest"])
        for role, raw in payloads.items():
            manifest[role + "_sha256"] = hashlib.sha256(raw).hexdigest()
            manifest[role + "_bytes"] = str(len(raw))
        manifest_raw = encoded_rows(manifest)
        policy = {"schema": module.HOST_POLICY_SCHEMA}
        for role, raw in tools.items():
            policy[role + "_sha256"] = hashlib.sha256(raw).hexdigest()
            policy[role + "_bytes"] = str(len(raw))
        policy_raw = encoded_rows(policy)
        policy = module._parse_host_policy(policy_raw)
        require(tuple(policy) == ("schema", "python_sha256", "python_bytes", "git_sha256", "git_bytes"), "host_policy_membership_not_closed")
        for changed in (policy_raw + b"unknown=value\n", row_changed(policy_raw, "python_sha256", "A" * 64), row_changed(policy_raw, "git_bytes", "01")):
            expect_hold(module, lambda changed=changed: module._parse_host_policy(changed), "host_policy_invalid")

        buffers = dict(generation_fixture["sources"], **payloads, **tools, manifest=manifest_raw, policy=policy_raw)
        fds = {}
        for role, raw in buffers.items():
            fds[role] = stack.enter_context(sealed_fd(raw, executable=role in tools))
            admitted_fds.add(fds[role])
        visible = {}
        for role in ("manifest", "policy", "python", "git"):
            visible[role] = root / role
            visible[role].write_bytes(buffers[role])
        module.BOOTSTRAP_MANIFEST = visible["manifest"]
        module.BOOTSTRAP_POLICY = visible["policy"]
        module.FIXED_PYTHON = visible["python"]
        module.FIXED_GIT = visible["git"]
        context = {
            "proof": {
                "expected_head": generation_fixture["head_one"],
                "expected_tree": generation_fixture["checkout_one"]["tree"],
                "source_generation_id": GENERATION_PREFIX + hashlib.sha256(manifest_raw).hexdigest(),
                "manifest_sha256": hashlib.sha256(manifest_raw).hexdigest(), "manifest_bytes": str(len(manifest_raw)),
                "host_policy_sha256": hashlib.sha256(policy_raw).hexdigest(), "host_policy_bytes": str(len(policy_raw)),
            },
            "fds": fds, "manifest": manifest, "manifest_raw": manifest_raw,
            "policy_raw": policy_raw, "host_policy": policy,
            "sources": generation_fixture["sources"], "payloads": payloads,
            "visible_generation": {},
        }
        parent_checks = []
        parent_admitted = [True]
        witness_active = [False]
        witness_instances = []

        class AdmittedWitness:
            def __init__(self, head):
                require(head == generation_fixture["head_one"], "component_witness_head_mismatch")
                witness_instances.append(self)
            def __enter__(self):
                require(not witness_active[0], "component_witness_nested")
                witness_active[0] = True
                return self
            def __exit__(self, *exc):
                witness_active[0] = False
                return False

        module._RepositorySnapshot = AdmittedWitness

        def check_parent(value):
            require(value is context, "revalidation_wrong_parent_context")
            parent_checks.append(witness_active[0])
            if not parent_admitted[0]:
                raise module.InstallError("fixture_live_parent_generation_changed")

        # This component starts after native/root/source admission. Those
        # boundaries have separate real descriptor and real Git fixtures. Here
        # the production revalidator performs every byte/digest/cache comparison.
        module._validate_parent_and_descriptors = check_parent

        def root_data(path, *, maximum):
            require(path in (visible["manifest"], visible["policy"]), "fixture_root_read_outside_inputs")
            raw = path.read_bytes()
            require(len(raw) <= maximum, "fixture_visible_data_oversized")
            return raw, path.stat()

        def visible_tool(path, **kwargs):
            require(path in (visible["python"], visible["git"]), "fixture_tool_read_outside_inputs")
            raw = path.read_bytes()
            return {"path": str(path), "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw), "mode": "0755", "uid": 0, "gid": 0}

        def admitted_sources(raw, observed_manifest, sources, head, *, witness=None):
            require(witness_active[0] and witness is witness_instances[-1], "revalidation_witness_not_shared_through_parent_fence")
            require(raw == manifest_raw and observed_manifest == manifest and sources == context["sources"], "revalidation_source_arguments_changed")
            require(head == generation_fixture["head_one"], "revalidation_source_head_changed")
            return generation_fixture["checkout_one"]

        module._read_root_data = root_data
        module._tool_snapshot = visible_tool
        module._verify_source_generation_dependencies = admitted_sources

        def revalidate():
            return module._revalidate_authenticated_generation(context, generation_fixture["head_one"])

        initial = revalidate()
        require(parent_checks == [False, True] and not witness_active[0], "revalidation_witness_did_not_survive_final_parent_validation")
        require(initial["source_generation_id"] == context["proof"]["source_generation_id"], "revalidation_generation_identity_changed")
        parent_admitted[0] = False
        reason = expect_hold(module, revalidate, "parent_generation_drift")
        require(reason == "fixture_live_parent_generation_changed", "parent_drift_hold_hidden")
        parent_admitted[0] = True
        expect_hold(module, lambda: module._revalidate_authenticated_generation(context, "0" * 40), "revalidation_forged_runtime_head")

        for role in ("python", "git") + SOURCE_ROLES + ("launcher", "native"):
            replacement = stack.enter_context(sealed_fd(buffers[role] + b"substituted", executable=role in tools))
            admitted_fds.add(replacement)
            original_fd = fds[role]
            fds[role] = replacement
            context["visible_generation"] = {}
            reason = expect_hold(module, revalidate, "revalidation_snapshot_substitution:" + role)
            expected = ("authenticated_tool_snapshot_mismatch:" if role in tools else "authenticated_source_or_payload_changed:") + role
            require(reason == expected, "snapshot_drift_rejected_at_wrong_boundary:" + role + ":" + reason)
            fds[role] = original_fd

        for role in ("manifest", "policy", "python", "git"):
            context["visible_generation"] = {}
            visible[role].write_bytes(buffers[role] + b"visible substitution\n")
            reason = expect_hold(module, revalidate, "visible_custody_substitution:" + role)
            expected = ("authenticated_visible_tool_mismatch:" if role in tools else "authenticated_custody_bytes_changed:") + role
            require(reason == expected, "visible_drift_rejected_at_wrong_boundary:" + role + ":" + reason)
            visible[role].write_bytes(buffers[role])
        context["visible_generation"] = {}
        require(revalidate() == initial, "restored_fixture_inputs_did_not_revalidate")


def prove_plan_identity(generation_fixture) -> None:
    module, admitted_fds = descriptor_module()
    payloads = {"launcher": b"fixture launcher, never executed\n", "native": b"fixture native, never executed\n"}
    python = {"path": "/usr/bin/python3", "sha256": "4" * 64, "bytes": 123, "mode": "0755", "uid": 0, "gid": 0}
    git = dict(python, path="/usr/bin/git", sha256="5" * 64)
    evidence = {
        "checkout": generation_fixture["checkout_one"], "git_tool": git, "python": python,
        "host_policy_sha256": "6" * 64, "host_policy_bytes": 345,
        "source_generation_id": generation_fixture["source_generation_id"],
        "manifest_sha256": hashlib.sha256(generation_fixture["manifest_raw"]).hexdigest(),
        "manifest_bytes": len(generation_fixture["manifest_raw"]),
    }
    # Component admission only: native proof and full generation validation are
    # covered separately. The actual plan builder, request binding, inherited
    # payload readers, runtime-source reader and plan hashing remain unchanged.
    module._validate_parent_and_descriptors = lambda context: None
    module._revalidate_authenticated_generation = lambda context, head: evidence
    module.accepted_lock = lambda head: {"fixture_accepted_lock": True}
    module.protected_state = lambda policy: module.READY_STATE
    module._git = forbidden
    module._tool_snapshot = forbidden
    module.checkout_snapshot = forbidden
    for role, raw in payloads.items():
        setattr(module, role.upper() + "_BYTES", len(raw))
        setattr(module, role.upper() + "_SHA256", hashlib.sha256(raw).hexdigest())
    with contextlib.ExitStack() as stack:
        def context_for_parent(pid: str, start: str):
            fds = {role: stack.enter_context(sealed_fd(raw)) for role, raw in payloads.items()}
            admitted_fds.update(fds.values())
            return {
                "proof": {"operation": "installer_plan", "expected_head": evidence["checkout"]["head"], "expected_plan_id": "none", "parent_pid": pid, "parent_start_ticks": start},
                "fds": fds, "payloads": payloads, "sources": generation_fixture["sources"],
                "manifest": generation_fixture["manifest"], "initial_generation": evidence,
            }

        def collect(context):
            module._BOOTSTRAP_CONTEXT = context
            return module.collect_plan(Path("/proc/self/fd/" + str(context["fds"]["launcher"])), Path("/proc/self/fd/" + str(context["fds"]["native"])), evidence["checkout"]["head"])

        first_context = context_for_parent("100", "200")
        first = collect(first_context)
        require(first["body"]["schema"] == "void_buy_void_epoch2_dormant_binder_installer_first_entry_install_plan_v5" and first["body"]["version"] == 5, "successor_plan_schema_or_version_invalid")
        require(first["plan_id"].startswith("voidbuye2dormantfirstentryinstall5_"), "successor_plan_domain_invalid")
        require(first["body"]["temporary_git_metadata_write_required"] is True and first["body"]["source_repository_mutation_authorized"] is False, "plan_private_metadata_scope_not_bound")
        second_context = context_for_parent("101", "201")
        require(first_context["fds"] != second_context["fds"], "fresh_parent_fixture_reused_descriptors")
        second = collect(second_context)
        require(first["plan_id"] == second["plan_id"], "fresh_parent_changed_plan_identity")
        require(first["body"] == second["body"], "private_parent_generation_leaked_into_plan")
        encoded_body = json.dumps(second["body"], sort_keys=True)
        for private in ("parent_pid", "parent_start_ticks", "/proc/self/fd/", "_fd\"", "_ino\""):
            require(private not in encoded_body, "private_parent_field_in_plan:" + private)

        old_id = second["plan_id"]
        evidence = dict(evidence, checkout=generation_fixture["checkout_two"])
        third = collect(context_for_parent("102", "202"))
        require(third["plan_id"] != old_id, "runtime_checkout_change_did_not_change_plan_id")
        require(third["body"]["source_generation_id"] == first["body"]["source_generation_id"], "runtime_checkout_change_changed_generation_authority")
        evidence = dict(evidence, host_policy_sha256="7" * 64)
        fourth = collect(context_for_parent("103", "203"))
        require(fourth["plan_id"] != third["plan_id"], "host_policy_change_did_not_change_plan_id")
        wrong_context = context_for_parent("104", "204")
        wrong_context["proof"]["expected_head"] = "0" * 40
        expect_hold(module, lambda: collect(wrong_context), "forged_runtime_head_at_plan_request")


def prove_dependency_generation(module, manifest_raw: bytes, manifest: dict[str, str]):
    sources = {role: (ROOT / manifest[role + "_rel"]).read_bytes() for role in SOURCE_ROLES}
    files = {manifest[role + "_rel"]: source for role, source in sources.items()}
    files[MANIFEST_REL] = manifest_raw
    previous_checkout = module.FIXED_CHECKOUT
    with tempfile.TemporaryDirectory(prefix="void-v3-manifest-generation-") as temporary:
        checkout = Path(temporary) / "checkout"
        checkout.mkdir()
        setup_git(checkout, "init", "--initial-branch=main")
        for relative, raw in files.items():
            path = checkout / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
        (checkout / "unrelated.txt").write_bytes(b"unrelated source outside frozen closure\n")
        setup_git(checkout, "add", "--", ".")
        setup_git(checkout, "commit", "-m", "frozen generation fixture")
        module.FIXED_CHECKOUT = checkout

        def current_head() -> str:
            return setup_git(checkout, "rev-parse", "HEAD").decode("ascii").strip()

        def verify(head: str, snapshots=None):
            return module._verify_source_generation_dependencies(
                manifest_raw, manifest, sources if snapshots is None else snapshots, head,
            )

        try:
            head_one = current_head()
            before = snapshot(checkout)
            generation_one = module.source_generation_id(manifest_raw)
            observed_one = verify(head_one)
            require(observed_one["head"] == head_one and observed_one["clean"] is True, "generation_checkout_not_clean_main")
            require(snapshot(checkout) == before, "generation_verification_mutated_repository")

            (checkout / "unrelated.txt").write_bytes(b"different unrelated source outside frozen closure\n")
            setup_git(checkout, "add", "--", "unrelated.txt")
            setup_git(checkout, "commit", "-m", "unrelated descendant fixture")
            head_two = current_head()
            observed_two = verify(head_two)
            generation_two = module.source_generation_id(manifest_raw)
            require(head_one != head_two and observed_one["tree"] != observed_two["tree"], "fixture_heads_not_distinct")
            require(generation_one == generation_two, "unrelated_commit_changed_generation_authority")
            expect_hold(module, lambda: verify(head_one), "stale_runtime_head")

            for relative, raw in files.items():
                path = checkout / relative
                changed = raw + b"\nfixture bound dependency mutation\n"
                path.write_bytes(changed)
                setup_git(checkout, "add", "--", relative)
                setup_git(checkout, "commit", "-m", "bound dependency mutation fixture")
                changed_head = current_head()
                before_failure = snapshot(checkout)
                expect_hold(module, lambda: verify(changed_head), "changed_bound_dependency:" + relative)
                require(snapshot(checkout) == before_failure, "dependency_rejection_mutated_repository:" + relative)
                path.write_bytes(raw)
                setup_git(checkout, "add", "--", relative)
                setup_git(checkout, "commit", "-m", "restore fixture dependency")
                verify(current_head())

            for role, raw in sources.items():
                substituted = dict(sources)
                substituted[role] = raw + b"\nsubstituted inherited source\n"
                expect_hold(module, lambda substituted=substituted: verify(current_head(), substituted), "inherited_source_substitution:" + role)

            return {
                "head_one": head_one, "head_two": head_two,
                "checkout_one": observed_one, "checkout_two": observed_two,
                "source_generation_id": generation_one,
                "manifest_raw": manifest_raw, "manifest": manifest, "sources": sources,
            }
        finally:
            module.FIXED_CHECKOUT = previous_checkout


def prove_git_child_resource_limits(module) -> None:
    resource = module.resource
    limits = {which: resource.getrlimit(which) for which in (resource.RLIMIT_AS, resource.RLIMIT_CPU, resource.RLIMIT_CORE)}
    require(0 < module.GIT_CHILD_ADDRESS_SPACE_BYTES <= 2 * 1024 * 1024 * 1024, "git_address_space_policy_invalid")
    require(0 < module.GIT_CHILD_CPU_SECONDS <= 20, "git_cpu_policy_invalid")
    unlimited = resource.RLIM_INFINITY
    for index, (inherited, expected) in enumerate((
        ({resource.RLIMIT_AS: (unlimited, unlimited), resource.RLIMIT_CPU: (unlimited, unlimited)},
         {resource.RLIMIT_AS: module.GIT_CHILD_ADDRESS_SPACE_BYTES, resource.RLIMIT_CPU: module.GIT_CHILD_CPU_SECONDS}),
        ({resource.RLIMIT_AS: (1024, 2048), resource.RLIMIT_CPU: (7, 9)},
         {resource.RLIMIT_AS: 1024, resource.RLIMIT_CPU: 7}),
        ({resource.RLIMIT_AS: (unlimited, 4096), resource.RLIMIT_CPU: (unlimited, 5)},
         {resource.RLIMIT_AS: 4096, resource.RLIMIT_CPU: 5}),
        ({resource.RLIMIT_AS: (0, unlimited), resource.RLIMIT_CPU: (0, unlimited)},
         {resource.RLIMIT_AS: 0, resource.RLIMIT_CPU: 0}),
    )):
        inherited[resource.RLIMIT_CORE] = (unlimited, unlimited) if index % 2 == 0 else (17, 23)
        expected[resource.RLIMIT_CORE] = 0
        observed = {}
        proxy = types.SimpleNamespace(**(vars(resource) | {
            "getrlimit": lambda which: inherited[which],
            "setrlimit": lambda which, value: observed.setdefault(which, value),
        }))
        with patch.object(module, "resource", proxy):
            module._git_child_limits()
        require(observed == {which: (value, value) for which, value in expected.items()}, "git_child_limit_did_not_clamp_inherited_limit")
    require(all(resource.getrlimit(which) == value for which, value in limits.items()), "resource_fixture_changed_parent_limits")


def prove_git_boundary(module, raw: bytes, generation_fixture) -> None:
    """Exercise the private reader and the complete source dependency witness."""
    sources = generation_fixture["sources"]
    manifest = generation_fixture["manifest"]
    manifest_raw = generation_fixture["manifest_raw"]
    actual_calls = []
    injected_stderr = {"armed": False, "fd": None, "delivered": False, "remaining": 0}
    git_fd = module._BOOTSTRAP_CONTEXT["fds"]["git"]
    original_git = os.fstat(git_fd)

    def recorded_popen(argv, **kwargs):
        match = re.fullmatch(r"/proc/self/fd/([0-9]+)", str(argv[0]))
        require(match is not None, "git_reader_did_not_execute_sealed_descriptor")
        executed_fd = int(match[1])
        executed = os.fstat(executed_fd)
        require((executed.st_dev, executed.st_ino) == (original_git.st_dev, original_git.st_ino), "git_reader_selected_different_executable")
        require(executed_fd in kwargs.get("pass_fds", ()), "sealed_git_descriptor_not_inherited")
        require(fcntl.fcntl(executed_fd, fcntl.F_GET_SEALS) & 15 == 15, "executed_git_not_fully_sealed")
        require(kwargs.get("preexec_fn") is module._git_child_limits, "git_child_resource_limits_not_applied")
        environment = kwargs.get("env", {})
        for key, expected in {
            "GIT_ALLOW_PROTOCOL": "", "GIT_NO_LAZY_FETCH": "1", "GIT_OPTIONAL_LOCKS": "0",
            "GIT_NO_REPLACE_OBJECTS": "1", "GIT_CONFIG_GLOBAL": "/dev/null",
            "GIT_CONFIG_SYSTEM": "/dev/null", "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_TERMINAL_PROMPT": "0", "GIT_ATTR_NOSYSTEM": "1", "GIT_PROTOCOL_FROM_USER": "0",
        }.items():
            require(environment.get(key) == expected, "private_git_environment_guard_missing:" + key)
        require(environment.get("GIT_DIR") != str(module.FIXED_CHECKOUT / ".git"), "git_reader_reused_source_metadata_directory")
        index_match = re.fullmatch(r"/proc/self/fd/([0-9]+)", environment.get("GIT_INDEX_FILE", ""))
        require(index_match is not None, "git_index_not_descriptor_bound")
        index_fd = int(index_match[1])
        require(index_fd in kwargs.get("pass_fds", ()) and fcntl.fcntl(index_fd, fcntl.F_GET_SEALS) & 15 == 15, "private_git_index_not_sealed_and_inherited")
        require(not any(command in argv for command in ("status", "hash-object", "fetch", "diff", "show", "ls-tree")), "git_reader_uses_conversion_or_unauthenticated_listing")
        require(("cat-file" in argv and "--batch" in argv) or "ls-files" in argv, "git_reader_operation_not_closed")
        actual_calls.append(tuple(argv))
        process = subprocess.Popen(argv, **kwargs)
        if injected_stderr["armed"]:
            injected_stderr["fd"] = process.stderr.fileno()
        return process

    def new_checkout(parent, name):
        checkout = parent / name
        checkout.mkdir()
        setup_git(checkout, "init", "--initial-branch=main", "--template=")
        files = {manifest[role + "_rel"]: value for role, value in sources.items()}
        files.update({MANIFEST_REL: manifest_raw, ".gitignore": b"ignored/\n",
                      ".gitattributes": b"tracked.txt filter=fixture\n", "tracked.txt": b"exact raw fixture source\n",
                      "earlier/first.txt": b"earlier ordinary file\n", "later/last.txt": b"later ordinary file\n",
                      "executable.sh": b"#!/bin/sh\nexit 0\n"})
        for relative, value in files.items():
            target = checkout / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(value)
            target.chmod(0o755 if relative == "executable.sh" else 0o644)
        (checkout / "link").symlink_to("tracked.txt")
        setup_git(checkout, "add", "--all")
        setup_git(checkout, "commit", "--no-gpg-sign", "-qm", "private Git witness fixture")
        head = setup_git(checkout, "rev-parse", "HEAD").decode("ascii").strip()
        return checkout, head

    def generation(head):
        return module._verify_source_generation_dependencies(manifest_raw, manifest, sources, head)

    def unchanged(checkout, function):
        before = snapshot(checkout)
        with patch.object(module, "FIXED_CHECKOUT", checkout):
            try:
                return function()
            finally:
                require(snapshot(checkout) == before, "private_git_reader_changed_source_bytes_or_metadata")

    def hold(checkout, head, label, function=None):
        return unchanged(checkout, lambda: expect_hold(module, function or (lambda: generation(head)), label))

    with tempfile.TemporaryDirectory(prefix="void-inner-v4-private-git-") as temporary, patch.object(
        module, "subprocess", types.SimpleNamespace(**(vars(subprocess) | {"Popen": recorded_popen}))
    ):
        parent = Path(temporary)
        checkout, head = new_checkout(parent, "clean-loose")
        observed = unchanged(checkout, lambda: generation(head))
        require(observed["head"] == head and observed["clean"] is True and observed["git_boundary_policy"] == module.GIT_BOUNDARY_POLICY, "clean_private_generation_rejected")
        payload = (checkout / "tracked.txt").read_bytes()
        require(unchanged(checkout, lambda: module._read_git_object(head, "tracked.txt", expected_blob=blob(payload))) == payload, "raw_private_object_read_changed_bytes")
        hold(checkout, head, "wrong_blob_membership", lambda: module._read_git_object(head, "earlier/first.txt", expected_blob=blob(payload)))
        hold(checkout, "A" * 40, "malformed_head")
        hold(checkout, "1" * 40, "wrong_head")
        (checkout / "ignored").mkdir()
        (checkout / "ignored/ordinary.txt").write_bytes(b"ignored inert fixture\n")
        unchanged(checkout, lambda: generation(head))

        # None of these paths exists. No callback program is supplied or run.
        helper_root = "/__void_fixture_nonexistent_helpers__"
        require(not Path(helper_root).exists(), "inert_helper_root_unexpectedly_exists")
        for key, value in (("core.fsmonitor", helper_root + "/fsmonitor"), ("core.hooksPath", helper_root + "/hooks"),
                           ("filter.fixture.clean", helper_root + "/filter"), ("filter.fixture.required", "true"),
                           ("include.path", helper_root + "/include")):
            setup_git(checkout, "config", key, value)
        setup_git(checkout, "config", "core.repositoryFormatVersion", "99")
        require(unchanged(checkout, lambda: generation(head)) == observed, "source_repository_configuration_has_authority")

        checkout, head = new_checkout(parent, "packed")
        setup_git(checkout, "repack", "-ad")
        setup_git(checkout, "prune-packed")
        setup_git(checkout, "pack-refs", "--all", "--prune")
        require(not (checkout / ".git/refs/heads/main").exists(), "packed_refs_fixture_not_packed")
        require(bool(list((checkout / ".git/objects/pack").glob("*.pack"))), "packed_object_fixture_not_packed")
        unchanged(checkout, lambda: generation(head))

        for name, mutate in (
            ("dirty-worktree", lambda r: (r / "tracked.txt").write_bytes(b"dirty raw bytes\n")),
            ("dirty-index", lambda r: ((r / "tracked.txt").write_bytes(b"staged bytes\n"), setup_git(r, "add", "tracked.txt"))),
            ("untracked", lambda r: (r / "unexpected.txt").write_bytes(b"untracked\n")),
            ("assume-unchanged", lambda r: setup_git(r, "update-index", "--assume-unchanged", "tracked.txt")),
            ("skip-worktree", lambda r: setup_git(r, "update-index", "--skip-worktree", "tracked.txt")),
            ("owner-executable", lambda r: (r / "executable.sh").chmod(0o655)),
            ("symlink-target", lambda r: ((r / "link").unlink(), (r / "link").symlink_to("earlier/first.txt"))),
        ):
            checkout, head = new_checkout(parent, name)
            mutate(checkout)
            hold(checkout, head, name)

        checkout, head = new_checkout(parent, "split-index")
        setup_git(checkout, "update-index", "--split-index")
        shared = list((checkout / ".git").glob("sharedindex.*"))
        require(bool(shared), "split_index_fixture_not_created")
        old_ns = 946684800000000000
        for path in shared:
            os.utime(path, ns=(old_ns, old_ns))
        before_calls = len(actual_calls)
        hold(checkout, head, "split_index")
        require(len(actual_calls) == before_calls, "split_index_reached_git_child")
        require(all(path.stat().st_mtime_ns == old_ns for path in shared), "shared_index_mtime_changed")

        checkout, head = new_checkout(parent, "sparse-index")
        setup_git(checkout, "sparse-checkout", "init", "--cone", "--sparse-index")
        setup_git(checkout, "sparse-checkout", "set", "earlier")
        hold(checkout, head, "sparse_index")

        checkout, head = new_checkout(parent, "corrupt-child-tree")
        tree_oid = setup_git(checkout, "rev-parse", head + ":earlier").decode("ascii").strip()
        tree_raw = setup_git(checkout, "cat-file", "tree", tree_oid)
        old_raw, replacement = (checkout / "earlier/first.txt").read_bytes(), (checkout / "later/last.txt").read_bytes()
        old_entry = b"first.txt\0" + bytes.fromhex(blob(old_raw))
        require(tree_raw.count(old_entry) == 1, "corrupt_tree_fixture_member_missing")
        altered = tree_raw.replace(old_entry, b"first.txt\0" + bytes.fromhex(blob(replacement)))
        (checkout / "earlier/first.txt").write_bytes(replacement)
        setup_git(checkout, "add", "earlier/first.txt")
        tree_file = checkout / ".git/objects" / tree_oid[:2] / tree_oid[2:]
        tree_file.chmod(0o600)
        tree_file.write_bytes(zlib.compress(b"tree " + str(len(altered)).encode() + b"\0" + altered))
        reason = hold(checkout, head, "corrupt_nested_tree")
        require(reason == "repository_object_identity_invalid", "nested_tree_corruption_not_rejected_by_hash:" + reason)

        for name, relative, count in (("earlier-file-drift", "earlier/first.txt", 1),
                                      ("bound-manifest-drift", MANIFEST_REL, 2)):
            checkout, head = new_checkout(parent, name)
            before_git = snapshot(checkout / ".git")
            original = module._RepositorySnapshot._worktree_file
            seen, changed = [], []
            def observe_then_change(view, observed, mode, expected):
                value = original(view, observed, mode, expected)
                seen.append(observed)
                if observed == relative.encode("ascii") and seen.count(observed) == count:
                    with (checkout / relative).open("ab") as output:
                        output.write(b"fixture drift after completed observation\n")
                    changed.append(relative)
                return value
            with patch.object(module, "FIXED_CHECKOUT", checkout), patch.object(module._RepositorySnapshot, "_worktree_file", observe_then_change):
                reason = expect_hold(module, lambda: generation(head), name)
            require(changed == [relative], "earlier_file_drift_not_injected:" + name)
            require(reason == "checkout_worktree_changed", "earlier_file_drift_not_rejected_by_final_fence:" + reason)
            require(snapshot(checkout / ".git") == before_git, "drift_fixture_reader_changed_git_metadata")

        checkout, head = new_checkout(parent, "missing-object")
        missing = blob((checkout / "tracked.txt").read_bytes())
        (checkout / ".git/objects" / missing[:2] / missing[2:]).unlink()
        hold(checkout, head, "missing_object", lambda: module._read_git_object(head, "tracked.txt", expected_blob=missing))

        for relative, content in (("objects/info/alternates", b"/nonexistent/object-store\n"),
                                  ("objects/info/http-alternates", b"https://example.invalid/objects\n"),
                                  ("shallow", b"1" * 40 + b"\n"), ("info/grafts", b"1" * 40 + b"\n"),
                                  ("commondir", b".\n")):
            checkout, head = new_checkout(parent, "redirect-" + relative.replace("/", "-"))
            path = checkout / ".git" / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
            before_calls = len(actual_calls)
            hold(checkout, head, "storage_redirect:" + relative)
            require(len(actual_calls) == before_calls, "storage_redirect_reached_git_child")

        for relative in ("objects", "objects/info", "objects/pack"):
            checkout, head = new_checkout(parent, "storage-symlink-" + relative.replace("/", "-"))
            original = checkout / ".git" / relative
            retained = parent / ("retained-" + relative.replace("/", "-"))
            original.rename(retained)
            original.symlink_to(retained, target_is_directory=True)
            before_calls = len(actual_calls)
            hold(checkout, head, "git_storage_symlink:" + relative)
            require(len(actual_calls) == before_calls, "git_storage_symlink_reached_git_child")
        checkout, head = new_checkout(parent, "tracked-parent-symlink")
        original = checkout / "earlier"
        retained = parent / "retained-tracked-parent"
        original.rename(retained)
        original.symlink_to(retained, target_is_directory=True)
        hold(checkout, head, "tracked_parent_symlink")

        checkout, head = new_checkout(parent, "bounded-output")
        def excessive_stdout():
            with module._RepositorySnapshot(head) as view:
                view._run("index", maximum=1)
        require(hold(checkout, head, "bounded_stdout", excessive_stdout) == "repository_git_output_limit", "actual_git_stdout_budget_not_enforced")
        def synthetic_stderr_read(fd, size):
            if fd == injected_stderr["fd"] and injected_stderr["remaining"]:
                injected_stderr["delivered"] = True
                count = min(size, injected_stderr["remaining"])
                injected_stderr["remaining"] -= count
                return b"x" * count
            return os.read(fd, size)
        def excessive_stderr():
            with module._RepositorySnapshot(head) as view:
                injected_stderr.update(armed=True, delivered=False, fd=None, remaining=65537)
                try:
                    with patch.object(module, "os", types.SimpleNamespace(**(vars(module.os) | {"read": synthetic_stderr_read}))):
                        view._run("index")
                finally:
                    injected_stderr["armed"] = False
        require(hold(checkout, head, "synthetic_stderr_budget", excessive_stderr) == "repository_git_error_output_limit", "stderr_budget_fault_injection_not_rejected")
        require(injected_stderr["delivered"], "stderr_budget_fixture_not_exercised")
        require(actual_calls, "no_actual_sealed_git_process_exercised")

        checkout, head = new_checkout(parent, "failure-boundaries")
        for method in ("_reference_snapshot", "_recheck"):
            for kind in (OSError, subprocess.SubprocessError, MemoryError):
                def fail(*args, kind=kind, **kwargs):
                    raise kind("inert fixture exception")
                with patch.object(module._RepositorySnapshot, method, fail):
                    reason = hold(checkout, head, "private_boundary_exception")
                require(reason == "repository_reader_resource_or_io_failed:" + kind.__name__, "resource_or_io_failure_not_hold")
        before_calls = len(actual_calls)
        def selector_failure():
            raise OSError("inert selector constructor failure")
        with patch.object(module, "selectors", types.SimpleNamespace(**(vars(module.selectors) | {"DefaultSelector": selector_failure}))):
            require(hold(checkout, head, "selector_constructor_failure") == "repository_reader_resource_or_io_failed:OSError", "selector_failure_not_hold")
        require(len(actual_calls) == before_calls and module._GIT_PRIVATE_ACTIVE == 0, "selector_failure_spawned_child_or_leaked_private_view")
        receipt = io.StringIO()
        with contextlib.redirect_stdout(receipt):
            module._emit_git_boundary_receipt()
        require("temporary_git_metadata_cleanup_completed=true\n" in receipt.getvalue(), "selector_failure_cleanup_receipt_not_true")
        real_selector = module.selectors.DefaultSelector
        closed_selectors = []
        constructed_selectors = []
        class TrackedSelector:
            def __init__(self):
                self.actual = real_selector()
                constructed_selectors.append(self)
            def __getattr__(self, name):
                return getattr(self.actual, name)
            def close(self):
                self.actual.close()
                closed_selectors.append(self)
        def popen_failure(*args, **kwargs):
            raise OSError("inert Popen constructor failure")
        with patch.object(module, "selectors", types.SimpleNamespace(**(vars(module.selectors) | {"DefaultSelector": TrackedSelector}))), patch.object(module, "subprocess", types.SimpleNamespace(**(vars(subprocess) | {"Popen": popen_failure}))):
            require(hold(checkout, head, "popen_constructor_failure") == "repository_reader_resource_or_io_failed:OSError", "popen_failure_not_hold")
        require(constructed_selectors and closed_selectors == constructed_selectors and module._GIT_PRIVATE_ACTIVE == 0, "popen_failure_leaked_selector_or_private_view")
        receipt = io.StringIO()
        with contextlib.redirect_stdout(receipt):
            module._emit_git_boundary_receipt()
        require("temporary_git_metadata_cleanup_completed=true\n" in receipt.getvalue(), "popen_failure_cleanup_receipt_not_true")

        def cleanup_failure():
            with module._RepositorySnapshot(head) as view:
                original_cleanup = view._temporary.cleanup
                def cleanup_then_report():
                    original_cleanup()
                    raise OSError("inert fixture cleanup report")
                view._temporary.cleanup = cleanup_then_report
        require(hold(checkout, head, "private_cleanup_failure", cleanup_failure) == "repository_private_cleanup_failed", "private_cleanup_failure_not_hold")
        receipt = io.StringIO()
        with contextlib.redirect_stdout(receipt):
            module._emit_git_boundary_receipt()
        require("temporary_git_metadata_cleanup_completed=false\n" in receipt.getvalue(), "cleanup_failure_receipt_falsely_true")

        # Start the exact source from a sealed descriptor in its inert mode.
        with sealed_fd(raw) as source_fd:
            result = subprocess.run([sys.executable, "-I", "-B", "/proc/self/fd/" + str(source_fd), "--source-plan"],
                pass_fds=(source_fd,), stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                cwd=temporary, env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C", "TZ": "UTC"}, timeout=20, check=False)
        require(result.returncode == 0 and b"source_only=true\n" in result.stdout and b"host_write=false\n" in result.stdout, "sealed_source_plan_failed")
    prove_git_child_resource_limits(module)



def prove_authority_before_observation() -> None:
    module = fresh_module()
    for operation in ("plan", "apply"):
        class Captured(io.StringIO):
            flushed = False
            def flush(self):
                self.flushed = True
                super().flush()
        output = Captured()
        argv = [str(TARGET), "--" + operation, "--launcher", "/tmp/inert-launcher", "--native", "/tmp/inert-native", "--expected-head", "1" * 40]
        if operation == "apply":
            argv += ["--expected-plan-id", module.PLAN_PREFIX + "2" * 64, "--confirm", module.CONFIRM_TOKEN]
        def before_activation(*args):
            lines = set(output.getvalue().splitlines())
            require(output.flushed, "git_authority_not_flushed_before_activation")
            require({"authority_boundary=PRE_GIT_OBSERVATION", "read_only=false",
                     "temporary_git_metadata_write_authorized=true", "source_repository_mutation=false",
                     "source_object_fetch=false", "repository_config_loaded=false",
                     "protected_state_mutation_at_observation_boundary=false"} <= lines,
                    "git_authority_missing_before_activation")
            if operation == "plan":
                require("protected_state_mutation=false" in lines, "plan_protected_state_scope_not_declared")
            raise module.InstallError("inert_activation_stop")
        with contextlib.redirect_stdout(output), patch.object(sys, "argv", argv), patch.object(module, "sys", types.SimpleNamespace(**(vars(sys) | {"argv": argv, "stdout": output}))), patch.object(module, "_activate_bootstrap_context", before_activation):
            reason = expect_hold(module, module.main, "authority_before_activation")
        require(reason == "inert_activation_stop", "authority_fixture_reached_wrong_boundary")


def main() -> None:
    raw = TARGET.read_bytes()
    require(blob(raw) == TARGET_BLOB, "successor_installer_source_pin_mismatch")
    require(blob((ROOT / MANIFEST_REL).read_bytes()) == MANIFEST_BLOB, "successor_manifest_pin_mismatch")
    compile(raw, str(TARGET), "exec", dont_inherit=True)
    for relative, expected in FROZEN.items():
        require(blob((ROOT / relative).read_bytes()) == expected, "frozen_source_changed:" + relative)
    spec = importlib.util.spec_from_file_location("void_inner_v5_generation_proof", TARGET)
    require(spec is not None and spec.loader is not None, "import_spec_missing")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    manifest_raw, manifest, manifest_cases = prove_manifest_shape(module)
    proof_cases = prove_parent_proof_shape(module, manifest_raw)
    with sealed_fd(Path(GIT).read_bytes(), executable=True) as git_fd, admitted_git_fixture_ownership(module, git_fd):
        module._BOOTSTRAP_CONTEXT = {"fds": {"git": git_fd}}
        generation_fixture = prove_dependency_generation(module, manifest_raw, manifest)
        prove_git_boundary(module, raw, generation_fixture)
    prove_sealed_inputs(generation_fixture)
    prove_closed_environment_and_direct_calls()
    prove_authority_before_observation()
    prove_parent_descriptors(manifest_raw)
    prove_revalidation_drift(generation_fixture)
    prove_plan_identity(generation_fixture)
    module._BOOTSTRAP_CONTEXT = None

    print(MARKER)
    print("manifest_shape_rejection_cases=" + str(manifest_cases))
    print("parent_proof_shape_rejection_cases=" + str(proof_cases))
    print("closed_manifest_rows=35")
    print("source_generation_id=" + generation_fixture["source_generation_id"])
    print("every_bound_dependency_and_manifest_change_rejected=true")
    print("substituted_inherited_source_snapshots_rejected=true")
    print("unrelated_main_change_preserves_source_generation_id=true")
    print("fresh_parent_and_fresh_descriptors_preserve_plan_id=true")
    print("runtime_head_tree_and_host_policy_change_plan_id=true")
    print("private_parent_metadata_excluded_from_plan_body=true")
    print("private_git_authority_flushed_before_native_context_activation=true")
    print("selector_and_process_constructor_failure_cleanup_exercised=true")
    print("source_witness_lifetime_includes_final_parent_validation=true")
    print("direct_operational_plan_apply_without_private_proof_hold=true")
    print("hostile_environment_and_unsafe_python_flags_rejected=true")
    print("individual_memfd_seals_required=true")
    print("inherited_payload_reads_preserve_descriptor_offset=true")
    print("all_thirteen_retained_descriptor_substitutions_rejected=true")
    print("parent_pid_start_executable_and_peer_descriptor_mismatch_rejected=true")
    print("executing_python_and_installer_substitution_rejected=true")
    print("revalidator_tool_source_payload_and_visible_custody_drift_rejected=true")
    print("git_storage_redirects_hold_before_git_child=true")
    print("actual_git_stdout_budget_exercised=true")
    print("git_stderr_budget_fault_injection_exercised=true")
    print("private_git_index_sealed_and_source_config_inert=true")
    print("split_index_holds_before_git_without_sharedindex_touch=true")
    print("raw_nested_tree_identity_and_final_file_generation_fences_exercised=true")
    print("source_byte_mtime_ctime_and_inode_preservation_checked=true")
    print("git_child_resource_clamping_and_private_cleanup_holds_exercised=true")
    print("component_native_root_and_interpreter_admission_simulated=true")
    print("component_git_memfd_ownership_admission_simulated=true")
    print("production_git_uid_and_gid_rejection_checks_preserved=true")
    for item in (
        "frozen_sources_unchanged", "git_transport_guards_present", "raw_tree_index_file_comparison",
        "clean_fixture_reads_do_not_mutate_repository", "missing_object_fails_without_repository_mutation",
        "dirty_staged_untracked_and_index_flags_rejected", "mode_and_symlink_drift_rejected",
        "distinct_main_heads_with_unchanged_dependency_accepted", "sealed_source_plan_import_green",
    ):
        print(item + "=true")
    for item in ("configured_helper_execution", "production_plan", "production_apply", "bootstrap_execution", "external_network", "credential_access", "service_mutation", "funds_movement"):
        print(item + "=false")


if __name__ == "__main__":
    main()
