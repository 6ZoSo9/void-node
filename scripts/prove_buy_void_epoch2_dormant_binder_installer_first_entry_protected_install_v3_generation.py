#!/usr/bin/env python3
"""Exercise the V3 frozen generation, parent contract and Git boundary in disposable fixtures.

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
import stat
import subprocess
import sys
import tempfile
import types

ROOT = Path(__file__).resolve().parents[1]
TARGET_REL = "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v3.py"
TARGET = ROOT / TARGET_REL
GIT = "/usr/bin/git"
MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_FIRST_ENTRY_INSTALLER_V3_GENERATION_PROOF_GREEN"
MANIFEST_REL = "ops/security/buy-void-epoch2-dormant-first-entry-source-generation-v1.conf"
GENERATION_PREFIX = "voidbuye2dormantsourcegen1_"
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
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v2.py": "69a018c0eccedf3782055c56725579d02463b05e",
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v3.c": "2c3c9ed120cc9949a0528e43be886354aa25da5a",
    "ops/precision/void_buy_void_epoch2_dormant_binder_installer_first_entry_protected_install_v1.py": "383b84e71b371de65579e4113469e86a59b807ab",
    "ops/precision/void_buy_void_epoch2_dormant_first_entry_protected_install_bootstrap_v2.c": "19f9baf8d6d707da43dbd0e247667af1a10e46c5",
    "ops/security/buy-void-epoch2-dormant-binder-installer-first-entry-candidate-lock-v1.json": "f8ff6fbb855aecafc329cd60622cf3af782745a3",
    "ops/precision/void_buy_void_epoch2_dormant_binder_native_protected_install_v2.py": "f3d6b1559be7490303cf36338c4bfa38fdaa390a",
}


def blob(raw: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw).hexdigest()


def require(condition: bool, reason: str) -> None:
    if not condition:
        raise AssertionError(reason)


def snapshot(root: Path) -> dict[str, tuple]:
    result = {}
    for path in sorted(root.rglob("*")):
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
        result[name] = (stat.S_IMODE(metadata.st_mode), *value)
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
        # The native harness covers the actual parent-before-child boundary.
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

        def check_parent(value):
            require(value is context, "revalidation_wrong_parent_context")
            parent_checks.append(True)
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

        def admitted_sources(raw, observed_manifest, sources, head):
            require(raw == manifest_raw and observed_manifest == manifest and sources == context["sources"], "revalidation_source_arguments_changed")
            require(head == generation_fixture["head_one"], "revalidation_source_head_changed")
            return generation_fixture["checkout_one"]

        module._read_root_data = root_data
        module._tool_snapshot = visible_tool
        module._verify_source_generation_dependencies = admitted_sources

        def revalidate():
            return module._revalidate_authenticated_generation(context, generation_fixture["head_one"])

        initial = revalidate()
        require(len(parent_checks) == 2, "revalidation_did_not_check_parent_before_and_after_inputs")
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


def prove_git_boundary(module, raw: bytes) -> None:
    with tempfile.TemporaryDirectory(prefix="void-inner-v3-generation-proof-") as temporary:
        checkout = Path(temporary) / "checkout"
        checkout.mkdir()
        setup_git(checkout, "init", "--initial-branch=main")
        (checkout / ".gitignore").write_bytes(b"ignored/\n")
        payload = b"exact raw fixture source\n"
        (checkout / "tracked.txt").write_bytes(payload)
        (checkout / "nested").mkdir()
        (checkout / "nested" / "source.txt").write_bytes(b"nested raw source\n")
        (checkout / "executable.sh").write_bytes(b"#!/bin/sh\nexit 0\n")
        (checkout / "executable.sh").chmod(0o755)
        (checkout / "link").symlink_to("tracked.txt")
        setup_git(checkout, "add", "--", ".gitignore", "tracked.txt", "nested/source.txt", "executable.sh", "link")
        setup_git(checkout, "commit", "-m", "ordinary disposable fixture")
        head = setup_git(checkout, "rev-parse", "HEAD").decode("ascii").strip()
        module.FIXED_CHECKOUT = checkout

        # Observe the actual subprocess contract while running the real reader.
        # The proxy belongs only to this imported fixture module.
        actual_calls = []
        original_subprocess = module.subprocess

        def recorded_run(argv, **kwargs):
            actual_calls.append((tuple(argv), dict(kwargs.get("env", {})), kwargs))
            return subprocess.run(argv, **kwargs)

        def recorded_popen(argv, **kwargs):
            actual_calls.append((tuple(argv), dict(kwargs.get("env", {})), kwargs))
            return subprocess.Popen(argv, **kwargs)

        module.subprocess = types.SimpleNamespace(**(vars(subprocess) | {"run": recorded_run, "Popen": recorded_popen}))

        before = snapshot(checkout)
        observed = module.checkout_snapshot(head)
        require(observed["head"] == head and observed["branch"] == "main" and observed["clean"] is True, "clean_fixture_rejected")
        require(snapshot(checkout) == before, "clean_snapshot_mutated_repository")
        object_raw = module._read_git_object(head, "tracked.txt", expected_blob=blob(payload), expected_bytes=len(payload), expected_sha256=hashlib.sha256(payload).hexdigest())
        require(object_raw == payload, "raw_object_changed")
        require(snapshot(checkout) == before, "object_read_mutated_repository")
        expect_hold(module, lambda: module.checkout_snapshot("A" * 40), "malformed_head")
        expect_hold(module, lambda: module.checkout_snapshot("1" * 40), "wrong_head")

        (checkout / "ignored").mkdir()
        (checkout / "ignored" / "ordinary.txt").write_bytes(b"ignored generated fixture\n")
        module.checkout_snapshot(head)
        (checkout / "unexpected.txt").write_bytes(b"untracked\n")
        expect_hold(module, lambda: module.checkout_snapshot(head), "untracked_file")
        (checkout / "unexpected.txt").unlink()

        (checkout / "tracked.txt").write_bytes(b"changed raw bytes\n")
        expect_hold(module, lambda: module.checkout_snapshot(head), "dirty_raw_content")
        setup_git(checkout, "add", "--", "tracked.txt")
        expect_hold(module, lambda: module.checkout_snapshot(head), "staged_tree_mismatch")
        (checkout / "tracked.txt").write_bytes(payload)
        setup_git(checkout, "add", "--", "tracked.txt")

        setup_git(checkout, "update-index", "--assume-unchanged", "--", "tracked.txt")
        expect_hold(module, lambda: module.checkout_snapshot(head), "assume_unchanged")
        setup_git(checkout, "update-index", "--no-assume-unchanged", "--", "tracked.txt")
        setup_git(checkout, "update-index", "--skip-worktree", "--", "tracked.txt")
        expect_hold(module, lambda: module.checkout_snapshot(head), "skip_worktree")
        setup_git(checkout, "update-index", "--no-skip-worktree", "--", "tracked.txt")

        (checkout / "executable.sh").chmod(0o644)
        expect_hold(module, lambda: module.checkout_snapshot(head), "executable_mode_drift")
        (checkout / "executable.sh").chmod(0o755)
        (checkout / "link").unlink()
        (checkout / "link").symlink_to("ignored/ordinary.txt")
        expect_hold(module, lambda: module.checkout_snapshot(head), "symlink_target_drift")
        (checkout / "link").unlink()
        (checkout / "link").symlink_to("tracked.txt")

        (checkout / "nested").rename(checkout / "ignored" / "nested")
        (checkout / "nested").symlink_to("ignored/nested", target_is_directory=True)
        expect_hold(module, lambda: module.checkout_snapshot(head), "symlink_parent")
        (checkout / "nested").unlink()
        (checkout / "ignored" / "nested").rename(checkout / "nested")
        module.checkout_snapshot(head)

        setup_git(checkout, "symbolic-ref", "HEAD", "refs/heads/other")
        setup_git(checkout, "update-ref", "refs/heads/other", head)
        expect_hold(module, lambda: module.checkout_snapshot(head), "non_main_branch")
        setup_git(checkout, "symbolic-ref", "HEAD", "refs/heads/main")

        (checkout / "unrelated.txt").write_bytes(b"unrelated fixture addition\n")
        setup_git(checkout, "add", "--", "unrelated.txt")
        setup_git(checkout, "commit", "-m", "unrelated source generation fixture")
        next_head = setup_git(checkout, "rev-parse", "HEAD").decode("ascii").strip()
        require(next_head != head, "alternate_head_not_distinct")
        module.checkout_snapshot(next_head)
        require(module._read_git_object(next_head, "tracked.txt", expected_blob=blob(payload)) == payload, "unchanged_dependency_rejected_at_new_head")
        expect_hold(module, lambda: module._read_git_object(next_head, "tracked.txt", expected_blob="0" * 40), "wrong_dependency_blob")

        for relative in ("objects/info/alternates", "objects/info/http-alternates", "commondir", "shallow", "info/grafts"):
            indirect = checkout / ".git" / relative
            require(not indirect.exists(), "fixture_indirection_preexists")
            indirect.write_bytes(b"/nonexistent-fixture-object-store\n")
            try:
                before_indirection = snapshot(checkout)
                before_calls = len(actual_calls)
                expect_hold(module, lambda: module.checkout_snapshot(next_head), "git_indirection:" + relative)
                require(snapshot(checkout) == before_indirection, "git_indirection_hold_mutated_repository")
                require(len(actual_calls) == before_calls, "git_indirection_reached_git_child")
            finally:
                indirect.unlink()

        for relative in ("objects", "objects/info", "objects/pack"):
            original = checkout / ".git" / relative
            retained = Path(temporary) / ("retained-" + relative.replace("/", "-"))
            original.rename(retained)
            original.symlink_to(retained, target_is_directory=True)
            try:
                before_indirection = snapshot(checkout)
                before_calls = len(actual_calls)
                expect_hold(module, lambda: module.checkout_snapshot(next_head), "git_storage_symlink:" + relative)
                require(snapshot(checkout) == before_indirection, "git_symlink_hold_mutated_repository")
                require(len(actual_calls) == before_calls, "git_storage_symlink_reached_git_child")
            finally:
                original.unlink()
                retained.rename(original)

        before_limits = snapshot(checkout)
        stdout_limit = module.MAX_GIT_READ_OUTPUT_BYTES
        stderr_limit = module.MAX_GIT_ERROR_OUTPUT_BYTES
        try:
            module.MAX_GIT_READ_OUTPUT_BYTES = 8
            reason = expect_hold(module, lambda: module._read_git_object(next_head, "tracked.txt", expected_blob=blob(payload)), "bounded_git_stdout")
            require(reason == "git_stdout_output_too_large", "stdout_bound_not_enforced_during_read")
            module.MAX_GIT_READ_OUTPUT_BYTES = stdout_limit
            module.MAX_GIT_ERROR_OUTPUT_BYTES = 8
            reason = expect_hold(module, lambda: module._git(["cat-file", "--void-fixture-invalid-option"]), "bounded_git_stderr")
            require(reason == "git_stderr_output_too_large", "stderr_bound_not_enforced_during_read")
        finally:
            module.MAX_GIT_READ_OUTPUT_BYTES = stdout_limit
            module.MAX_GIT_ERROR_OUTPUT_BYTES = stderr_limit
        require(snapshot(checkout) == before_limits, "bounded_git_failure_mutated_repository")

        missing = blob(payload)
        loose = checkout / ".git" / "objects" / missing[:2] / missing[2:]
        require(loose.is_file(), "fixture_loose_object_absent")
        loose.unlink()
        before_missing = snapshot(checkout)
        expect_hold(module, lambda: module._read_git_object(next_head, "tracked.txt", expected_blob=missing), "missing_object")
        require(snapshot(checkout) == before_missing, "missing_object_read_mutated_repository")

        require(actual_calls, "fixture_did_not_exercise_git_process_contract")
        sealed_git = "/proc/self/fd/" + str(module._BOOTSTRAP_CONTEXT["fds"]["git"])
        for argv, environment, kwargs in actual_calls:
            require(argv[0] == sealed_git or kwargs.get("executable") == sealed_git, "git_did_not_execute_inherited_sealed_tool")
            require(module._BOOTSTRAP_CONTEXT["fds"]["git"] in kwargs.get("pass_fds", ()), "sealed_git_descriptor_not_inherited")
            for setting in (
                "core.fsmonitor=false", "core.hooksPath=/dev/null",
                "core.attributesFile=/dev/null", "core.excludesFile=/dev/null",
                "protocol.allow=never", "gc.auto=0", "maintenance.auto=false",
            ):
                require(any(argv[index:index + 2] == ("-c", setting) for index in range(len(argv) - 1)), "executed_git_guard_missing:" + setting)
            require("--no-replace-objects" in argv and "--no-optional-locks" in argv, "executed_git_object_lock_guards_missing")
            require(environment.get("GIT_ALLOW_PROTOCOL") == "" and environment.get("GIT_NO_LAZY_FETCH") == "1", "executed_git_transport_guard_missing")
            require(not any(command in argv for command in ("status", "hash-object", "fetch", "diff")), "conversion_or_write_git_command_used")
        module.subprocess = original_subprocess

        # The inert mode must import successfully when launched exactly as a sealed
        # Python source descriptor.  This never calls plan(), apply(), or Git.
        source_fd = os.memfd_create("void-inner-v3-source-plan-proof", os.MFD_ALLOW_SEALING)
        try:
            position = 0
            while position < len(raw):
                count = os.write(source_fd, raw[position:])
                require(count > 0, "memfd_short_write")
                position += count
            seals = 0x0001 | 0x0002 | 0x0004 | 0x0008
            fcntl.fcntl(source_fd, getattr(fcntl, "F_ADD_SEALS", 1033), seals)
            run = subprocess.run(
                [sys.executable, "-I", "-B", "/proc/self/fd/" + str(source_fd), "--source-plan"],
                pass_fds=(source_fd,), stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=temporary,
                env={"PATH": "/usr/bin:/bin", "HOME": "/nonexistent", "LANG": "C", "LC_ALL": "C", "TZ": "UTC"},
                timeout=20, check=False,
            )
            require(run.returncode == 0, "sealed_source_plan_failed:" + run.stderr.decode("utf-8", "replace"))
            require(b"source_only=true\n" in run.stdout and b"host_write=false\n" in run.stdout, "sealed_source_plan_authority_changed")
        finally:
            os.close(source_fd)


def main() -> None:
    raw = TARGET.read_bytes()
    compile(raw, str(TARGET), "exec", dont_inherit=True)
    for relative, expected in FROZEN.items():
        require(blob((ROOT / relative).read_bytes()) == expected, "frozen_source_changed:" + relative)
    spec = importlib.util.spec_from_file_location("void_inner_v3_generation_proof", TARGET)
    require(spec is not None and spec.loader is not None, "import_spec_missing")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    environment = module._git_env()
    for key, expected in {
        "GIT_ALLOW_PROTOCOL": "", "GIT_NO_LAZY_FETCH": "1",
        "GIT_OPTIONAL_LOCKS": "0", "GIT_NO_REPLACE_OBJECTS": "1",
        "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_SYSTEM": "/dev/null",
    }.items():
        require(environment.get(key) == expected, "git_environment_guard_missing:" + key)
    manifest_raw, manifest, manifest_cases = prove_manifest_shape(module)
    proof_cases = prove_parent_proof_shape(module, manifest_raw)
    with sealed_fd(Path(GIT).read_bytes(), executable=True) as git_fd:
        module._BOOTSTRAP_CONTEXT = {"fds": {"git": git_fd}}
        generation_fixture = prove_dependency_generation(module, manifest_raw, manifest)
        prove_git_boundary(module, raw)
    prove_sealed_inputs(generation_fixture)
    prove_closed_environment_and_direct_calls()
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
    print("direct_operational_plan_apply_without_private_proof_hold=true")
    print("hostile_environment_and_unsafe_python_flags_rejected=true")
    print("individual_memfd_seals_required=true")
    print("inherited_payload_reads_preserve_descriptor_offset=true")
    print("all_thirteen_retained_descriptor_substitutions_rejected=true")
    print("parent_pid_start_executable_and_peer_descriptor_mismatch_rejected=true")
    print("executing_python_and_installer_substitution_rejected=true")
    print("revalidator_tool_source_payload_and_visible_custody_drift_rejected=true")
    print("git_storage_redirects_hold_before_git_child=true")
    print("git_stdout_and_stderr_bounded_during_read=true")
    print("component_native_root_and_interpreter_admission_simulated=true")
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
