#!/usr/bin/env python3
from __future__ import annotations

import argparse
import errno
import fcntl
import hashlib
import types
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import tempfile

MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_V2"
ROOT = Path(__file__).resolve().parents[1]
V1_REL = "scripts/prove_buy_void_epoch2_dormant_binder_native_candidate_v1.py"
V1_PATH = ROOT / V1_REL
V1_BLOB = "5ac4264d7f9bdb394cf5be4490aa1eadd1f929ee"
SOURCE_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c"
)
SOURCE_BLOB = "4fdf3f627f407335b9d50800fbbc913d1edae523"
MAX_SOURCE_BYTES = 2 * 1024 * 1024
MAX_BINARY_BYTES = 2 * 1024 * 1024
HEX64 = re.compile(r"^[0-9a-f]{64}$")
CANDIDATE_ID = re.compile(r"^voidbuye2dormantbindercand2_[0-9a-f]{64}$")

F_ADD_SEALS = getattr(fcntl, "F_ADD_SEALS", 1033)
F_GET_SEALS = getattr(fcntl, "F_GET_SEALS", 1034)
F_SEAL_SEAL = getattr(fcntl, "F_SEAL_SEAL", 0x0001)
F_SEAL_SHRINK = getattr(fcntl, "F_SEAL_SHRINK", 0x0002)
F_SEAL_GROW = getattr(fcntl, "F_SEAL_GROW", 0x0004)
F_SEAL_WRITE = getattr(fcntl, "F_SEAL_WRITE", 0x0008)
REQUIRED_SEALS = F_SEAL_SEAL | F_SEAL_SHRINK | F_SEAL_GROW | F_SEAL_WRITE


def canonical(value) -> str:
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha1(data: bytes) -> str:
    h = hashlib.sha1()
    h.update(f"blob {len(data)}\0".encode("ascii"))
    h.update(data)
    return h.hexdigest()


def bounded_regular(path: Path, maximum: int, label: str) -> bytes:
    st = path.lstat()
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_nlink != 1
        or st.st_size < 1
        or st.st_size > maximum
    ):
        raise AssertionError(label + " metadata invalid")
    data = path.read_bytes()
    if len(data) != st.st_size:
        raise AssertionError(label + " read drift")
    return data


def load_v1():
    data = bounded_regular(V1_PATH, 2 * 1024 * 1024, "merged v1 candidate proof")
    if git_blob_sha1(data) != V1_BLOB:
        raise AssertionError("merged V1 candidate proof blob drift")
    try:
        source = data.decode("utf-8", "strict")
    except UnicodeDecodeError as exc:
        raise AssertionError("merged V1 candidate proof UTF-8 invalid") from exc
    module = types.ModuleType(
        "void_buy_void_epoch2_dormant_binder_native_candidate_v1_verified"
    )
    module.__file__ = os.fspath(V1_PATH)
    module.__package__ = None
    code = compile(
        source,
        os.fspath(V1_PATH),
        "exec",
        dont_inherit=True,
        optimize=0,
    )
    exec(code, module.__dict__)
    if (
        module.SOURCE_REL != SOURCE_REL
        or module.SOURCE_BLOB != SOURCE_BLOB
        or module.MARKER != "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_V1"
    ):
        raise AssertionError("merged V1 candidate proof contract drift")
    return module


V1 = load_v1()


def read_fd_exact(fd: int, maximum: int) -> bytes:
    st = os.fstat(fd)
    if st.st_size < 1 or st.st_size > maximum:
        raise AssertionError("sealed snapshot size invalid")
    out = bytearray()
    offset = 0
    while offset < st.st_size:
        chunk = os.pread(fd, min(65536, st.st_size - offset), offset)
        if not chunk:
            raise AssertionError("sealed snapshot short read")
        out.extend(chunk)
        offset += len(chunk)
    if len(out) != st.st_size:
        raise AssertionError("sealed snapshot byte count mismatch")
    return bytes(out)


def write_all(fd: int, data: bytes) -> None:
    offset = 0
    while offset < len(data):
        written = os.write(fd, data[offset:])
        if written <= 0:
            raise AssertionError("sealed snapshot write failed")
        offset += written


def create_sealed_source_snapshot(data: bytes) -> tuple[int, dict]:
    if not hasattr(os, "memfd_create"):
        raise AssertionError("memfd_create unavailable")
    flags = getattr(os, "MFD_CLOEXEC", 0x0001) | getattr(
        os,
        "MFD_ALLOW_SEALING",
        0x0002,
    )
    fd = os.memfd_create("void-e2-dormant-binder-source-v2", flags)
    try:
        write_all(fd, data)
        os.fsync(fd)
        fcntl.fcntl(fd, F_ADD_SEALS, REQUIRED_SEALS)
        actual = int(fcntl.fcntl(fd, F_GET_SEALS))
        if actual & REQUIRED_SEALS != REQUIRED_SEALS:
            raise AssertionError("sealed source required seals missing")
        observed = read_fd_exact(fd, MAX_SOURCE_BYTES)
        if observed != data:
            raise AssertionError("sealed source bytes drift")
        try:
            os.pwrite(fd, b"X", 0)
        except OSError as exc:
            if exc.errno not in (errno.EPERM, errno.EBUSY):
                raise
        else:
            raise AssertionError("sealed source remained writable")
        return fd, {
            "kind": "sealed_memfd",
            "bytes": len(data),
            "sha256": sha256(data),
            "required_seal_mask": REQUIRED_SEALS,
            "observed_seal_mask": actual,
            "write_after_seal_rejected": True,
            "build_input_is_checkout_path": False,
            "preprocess_from_snapshot_only": True,
            "compile_from_snapshot_only": True,
        }
    except Exception:
        os.close(fd)
        raise


def protected_parent_chain(path: Path, label: str) -> None:
    real = Path(os.path.realpath(os.path.abspath(os.fspath(path))))
    parent = real.parent
    chain = [Path(real.anchor)]
    cursor = Path(real.anchor)
    for segment in parent.parts[1:]:
        cursor = cursor / segment
        chain.append(cursor)
    for entry in chain:
        st = entry.lstat()
        if (
            not stat.S_ISDIR(st.st_mode)
            or stat.S_ISLNK(st.st_mode)
            or st.st_uid != 0
            or stat.S_IMODE(st.st_mode) & 0o022
        ):
            raise AssertionError(label + " ancestry not root protected: " + os.fspath(entry))


def protected_file_identity(identity: dict, label: str) -> dict:
    path = Path(str(identity.get("path", "")))
    real = Path(os.path.realpath(os.path.abspath(os.fspath(path))))
    st = real.lstat()
    if (
        not stat.S_ISREG(st.st_mode)
        or stat.S_ISLNK(st.st_mode)
        or st.st_uid != 0
        or stat.S_IMODE(st.st_mode) & 0o022
        or st.st_nlink != 1
    ):
        raise AssertionError(label + " file custody invalid")
    protected_parent_chain(real, label)
    return {
        **identity,
        "uid": st.st_uid,
        "gid": st.st_gid,
        "mode": stat.S_IMODE(st.st_mode),
        "nlink": st.st_nlink,
        "root_owned": True,
        "group_world_writable": False,
        "root_owned_protected_ancestry": True,
    }


def protected_command_alias(path: Path, expected_real: str, label: str) -> None:
    absolute = Path(os.path.abspath(os.fspath(path)))
    st = absolute.lstat()
    if st.st_uid != 0 or os.path.realpath(absolute) != expected_real:
        raise AssertionError(label + " command alias custody invalid")
    if stat.S_ISLNK(st.st_mode):
        pass
    elif stat.S_ISREG(st.st_mode):
        if stat.S_IMODE(st.st_mode) & 0o022:
            raise AssertionError(label + " command alias custody invalid")
    else:
        raise AssertionError(label + " command alias type invalid")
    protected_parent_chain(absolute, label)


def protected_toolchain_identity() -> dict:
    base = V1.toolchain_identity()
    executables = {
        name: protected_file_identity(identity, "toolchain " + name)
        for name, identity in sorted(base["executables"].items())
    }
    static_inputs = {
        name: protected_file_identity(identity, "static input " + name)
        for name, identity in sorted(base["static_inputs"].items())
    }
    protected_command_alias(
        V1.CC,
        executables["cc"]["path"],
        "compiler alias",
    )
    protected_command_alias(
        V1.STRIP,
        executables["strip"]["path"],
        "strip alias",
    )
    return {
        "compiler_version_line": base["compiler_version_line"],
        "compiler_dumpmachine": base["compiler_dumpmachine"],
        "compiler_dumpversion": base["compiler_dumpversion"],
        "executables": executables,
        "static_inputs": static_inputs,
        "gcc_specs_sha256": base["gcc_specs_sha256"],
        "gcc_search_dirs_sha256": base["gcc_search_dirs_sha256"],
        "root_owned_protected": True,
    }


def snapshot_arg(fd: int) -> str:
    return f"/proc/self/fd/{fd}"


def preprocessed_identity_from_snapshot(fd: int) -> dict:
    with tempfile.TemporaryDirectory(
        prefix="void-e2-dormant-binder-v2-preprocess-"
    ) as td:
        out = Path(td) / "preentry.i"
        result = subprocess.run(
            [
                os.fspath(V1.CC),
                *V1.COMPILE_FLAGS,
                "-x",
                "c",
                "-E",
                "-P",
                "-o",
                os.fspath(out),
                snapshot_arg(fd),
            ],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            timeout=30,
            env=V1.ENV,
            pass_fds=(fd,),
        )
        if result.returncode != 0:
            raise AssertionError(
                "sealed-source preprocess failed: "
                + result.stderr.decode("utf-8", "replace")[-2000:]
            )
        if result.stdout or result.stderr:
            raise AssertionError("sealed-source preprocess produced output")
        data = V1.bounded_file(
            out,
            4 * 1024 * 1024,
            "sealed preprocessed source",
        )
    return {
        "bytes": len(data),
        "sha256": sha256(data),
        "input_kind": "sealed_memfd",
    }


def compile_one_from_snapshot(
    root: Path,
    stem: str,
    source_fd: int,
) -> tuple[bytes, dict]:
    obj = root / (stem + ".o")
    binary = root / stem
    compile_result = subprocess.run(
        [
            os.fspath(V1.CC),
            *V1.COMPILE_FLAGS,
            "-x",
            "c",
            "-c",
            "-o",
            os.fspath(obj),
            snapshot_arg(source_fd),
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=30,
        env=V1.ENV,
        pass_fds=(source_fd,),
    )
    if compile_result.returncode != 0:
        raise AssertionError(
            "sealed-source compile failed: "
            + compile_result.stderr.decode("utf-8", "replace")[-3000:]
        )
    if compile_result.stdout or compile_result.stderr:
        raise AssertionError("sealed-source compile produced output")
    object_data = V1.bounded_file(obj, MAX_BINARY_BYTES, "candidate V2 object")

    link_result = subprocess.run(
        [
            os.fspath(V1.CC),
            *V1.LINK_FLAGS,
            "-o",
            os.fspath(binary),
            os.fspath(obj),
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=30,
        env=V1.ENV,
    )
    if link_result.returncode != 0:
        raise AssertionError(
            "candidate V2 link failed: "
            + link_result.stderr.decode("utf-8", "replace")[-3000:]
        )
    if link_result.stderr:
        raise AssertionError("candidate V2 static link produced stderr")
    trace = V1.normalized_link_trace(link_result.stdout, obj)

    strip_result = subprocess.run(
        [os.fspath(V1.STRIP), "--strip-all", os.fspath(binary)],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=30,
        env=V1.ENV,
    )
    if (
        strip_result.returncode != 0
        or strip_result.stdout
        or strip_result.stderr
    ):
        raise AssertionError("candidate V2 strip failed or produced output")

    binary_data = V1.bounded_file(
        binary,
        MAX_BINARY_BYTES,
        "candidate V2 ELF",
    )
    if len(binary_data) < V1.MIN_BINARY_BYTES:
        raise AssertionError("candidate V2 binary too small")
    elf = V1.inspect_elf(binary_data)
    return binary_data, {
        "object_bytes": len(object_data),
        "object_sha256": sha256(object_data),
        "link_trace": trace,
        **elf,
    }


def source_identity_and_bytes() -> tuple[dict, bytes]:
    sources = V1.source_identity()
    source_data = V1.bounded_file(
        V1.SOURCE,
        MAX_SOURCE_BYTES,
        "reviewed native source",
    )
    if (
        git_blob_sha1(source_data) != SOURCE_BLOB
        or sha256(source_data) != sources["native_source"]["sha256"]
        or len(source_data) != sources["native_source"]["bytes"]
    ):
        raise AssertionError("reviewed native source byte binding invalid")
    return sources, source_data


def compile_adversary_fixture(
    source_arg: str,
    output: Path,
    inherited_fd: int | None = None,
) -> bytes:
    pass_fds = () if inherited_fd is None else (inherited_fd,)
    result = subprocess.run(
        [
            os.fspath(V1.CC),
            "-std=c11",
            "-Wall",
            "-Wextra",
            "-Werror",
            "-O2",
            "-fno-ident",
            "-fno-pie",
            "-x",
            "c",
            source_arg,
            "-static",
            "-no-pie",
            "-Wl,--build-id=none",
            "-o",
            os.fspath(output),
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=30,
        env=V1.ENV,
        pass_fds=pass_fds,
    )
    if result.returncode != 0 or result.stdout or result.stderr:
        raise AssertionError("snapshot adversary fixture compile failed")
    stripped = subprocess.run(
        [os.fspath(V1.STRIP), "--strip-all", os.fspath(output)],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=30,
        env=V1.ENV,
    )
    if stripped.returncode != 0 or stripped.stdout or stripped.stderr:
        raise AssertionError("snapshot adversary fixture strip failed")
    return V1.bounded_file(output, MAX_BINARY_BYTES, "snapshot adversary ELF")


def run_fixture(binary: Path) -> int:
    result = subprocess.run(
        [os.fspath(binary)],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=10,
        env=V1.ENV,
    )
    if result.stdout or result.stderr:
        raise AssertionError("snapshot adversary fixture emitted output")
    return result.returncode


def prove_snapshot_substitute_restore() -> dict:
    original = b"int main(void){return 3;}\n"
    substitute = b"int main(void){return 7;}\n"
    with tempfile.TemporaryDirectory(
        prefix="void-e2-dormant-binder-v2-snapshot-adversary-"
    ) as td:
        root = Path(td)
        visible = root / "visible.c"
        replacement = root / "replacement.c"
        visible.write_bytes(original)
        replacement.write_bytes(substitute)
        observed = visible.read_bytes()
        fd, _snapshot = create_sealed_source_snapshot(observed)
        try:
            os.replace(replacement, visible)
            if visible.read_bytes() != substitute:
                raise AssertionError("visible substitute adversary failed")
            if read_fd_exact(fd, 4096) != original:
                raise AssertionError("sealed snapshot changed after substitution")

            snapshot_a_path = root / "snapshot-a"
            snapshot_a = compile_adversary_fixture(
                snapshot_arg(fd),
                snapshot_a_path,
                fd,
            )
            if run_fixture(snapshot_a_path) != 3:
                raise AssertionError("snapshot build followed substituted source")

            visible_path = root / "visible-control"
            visible_binary = compile_adversary_fixture(
                os.fspath(visible),
                visible_path,
            )
            if run_fixture(visible_path) != 7:
                raise AssertionError("visible substitution positive control failed")
            if visible_binary == snapshot_a:
                raise AssertionError("visible substitution did not alter control ELF")

            restored = root / "restored.c"
            restored.write_bytes(original)
            os.replace(restored, visible)
            if visible.read_bytes() != original:
                raise AssertionError("visible restore adversary failed")
            if read_fd_exact(fd, 4096) != original:
                raise AssertionError("sealed snapshot changed after restore")

            snapshot_b_path = root / "snapshot-b"
            snapshot_b = compile_adversary_fixture(
                snapshot_arg(fd),
                snapshot_b_path,
                fd,
            )
            if run_fixture(snapshot_b_path) != 3:
                raise AssertionError("snapshot build changed after visible restore")
            if snapshot_a != snapshot_b:
                raise AssertionError(
                    "sealed-source ELF changed across substitute/restore"
                )
        finally:
            os.close(fd)
    return {
        "checkout_substitute_after_snapshot_cannot_change_build_input": True,
        "checkout_restore_cannot_rewrite_snapshot_history": True,
        "substitute_visible_control_changed_semantics": True,
        "snapshot_elf_stable_across_substitute_restore": True,
        "sealed_write_rejected": True,
    }


def material(report: dict) -> dict:
    copy = dict(report)
    copy.pop("candidate_id", None)
    return copy


def derive() -> tuple[dict, bytes]:
    binding = V1.bind_source_generation()
    sources, source_data = source_identity_and_bytes()
    toolchain_before = protected_toolchain_identity()
    adversary = prove_snapshot_substitute_restore()

    source_fd, snapshot = create_sealed_source_snapshot(source_data)
    try:
        preprocessed = preprocessed_identity_from_snapshot(source_fd)
        with tempfile.TemporaryDirectory(
            prefix="void-e2-dormant-binder-candidate-v2-"
        ) as td:
            root = Path(td)
            binary_a, build_a = compile_one_from_snapshot(
                root,
                "native-a",
                source_fd,
            )
            binary_b, build_b = compile_one_from_snapshot(
                root,
                "native-b",
                source_fd,
            )
            if binary_a != binary_b:
                raise AssertionError(
                    "two sealed-source candidate builds are not byte-identical"
                )
            if build_a != build_b:
                raise AssertionError(
                    "two sealed-source build metadata objects differ"
                )
            candidate_path = root / "native-a"
            clean_self_test = V1.run_self_test(candidate_path, V1.ENV)
            loader = V1.prove_loader_independence(candidate_path)
    finally:
        os.close(source_fd)

    visible_after, source_after = source_identity_and_bytes()
    if visible_after != sources or source_after != source_data:
        raise AssertionError("visible reviewed source drifted during build")
    toolchain_after = protected_toolchain_identity()
    if toolchain_after != toolchain_before:
        raise AssertionError("toolchain/static-input generation drifted during build")

    report = {
        "marker": MARKER,
        "version": 2,
        "merged_v1_proof_git_blob_sha1": V1_BLOB,
        "binding_generation": binding,
        **sources,
        "source_snapshot": {
            **snapshot,
            **adversary,
            "visible_source_revalidated_after_build": True,
        },
        "preprocessed_source": preprocessed,
        "toolchain": toolchain_before,
        "toolchain_revalidated_after_build": True,
        "build": build_a,
        "binary": {
            "bytes": len(binary_a),
            "sha256": sha256(binary_a),
            "two_builds_byte_identical": True,
            "elf_magic_verified": binary_a.startswith(b"\x7fELF"),
            "elf64_little_endian": build_a["elf64_little_endian"],
            "machine_x86_64": build_a["machine_x86_64"],
            "executable_type": build_a["executable_type"],
            "pt_interp_absent": build_a["pt_interp_absent"],
            "static_link_required": build_a["static_link_required"],
            **loader,
        },
        "self_test": {
            "exact_transcript_verified": True,
            "stderr_empty": True,
            "stdout_sha256": sha256(clean_self_test),
        },
        "authority": {
            "source_only_candidate": True,
            "candidate_report_filesystem_write": True,
            "candidate_accepted": False,
            "native_binary_identity_accepted": False,
            "protected_install_authorized": False,
            "live_execution_authorized": False,
            "credential_access": False,
            "private_key_access": False,
            "signing_authorized": False,
            "transaction": False,
            "payment_acceptance": False,
            "public_presale_activation": False,
            "wc_void_market_activation": False,
            "funds_movement": False,
            "production_host_evidence_authority": False,
        },
    }
    report["candidate_id"] = (
        "voidbuye2dormantbindercand2_"
        + sha256(canonical(material(report)).encode("utf-8"))
    )
    validate(report)
    return report, binary_a


def validate_toolchain(toolchain: object) -> None:
    if not isinstance(toolchain, dict) or toolchain.get("root_owned_protected") is not True:
        raise AssertionError("V2 toolchain protection missing")
    for group in ("executables", "static_inputs"):
        values = toolchain.get(group)
        if not isinstance(values, dict) or not values:
            raise AssertionError("V2 toolchain group missing: " + group)
        for name, identity in values.items():
            if (
                not isinstance(identity, dict)
                or identity.get("root_owned") is not True
                or identity.get("group_world_writable") is not False
                or identity.get("root_owned_protected_ancestry") is not True
                or identity.get("uid") != 0
                or not isinstance(identity.get("mode"), int)
                or identity["mode"] & 0o022
                or not isinstance(identity.get("bytes"), int)
                or identity["bytes"] < 1
                or HEX64.fullmatch(str(identity.get("sha256", ""))) is None
            ):
                raise AssertionError(
                    "V2 toolchain identity invalid: " + group + "/" + str(name)
                )


def validate(report: dict) -> None:
    if report.get("marker") != MARKER or report.get("version") != 2:
        raise AssertionError("V2 candidate identity invalid")
    cid = report.get("candidate_id")
    if not isinstance(cid, str) or CANDIDATE_ID.fullmatch(cid) is None:
        raise AssertionError("V2 candidate id invalid")
    expected = (
        "voidbuye2dormantbindercand2_"
        + sha256(canonical(material(report)).encode("utf-8"))
    )
    if cid != expected:
        raise AssertionError("V2 candidate id content binding invalid")
    if report.get("merged_v1_proof_git_blob_sha1") != V1_BLOB:
        raise AssertionError("V2 merged V1 proof binding invalid")

    native = report.get("native_source")
    if (
        not isinstance(native, dict)
        or native.get("git_blob_sha1") != SOURCE_BLOB
        or HEX64.fullmatch(str(native.get("sha256", ""))) is None
    ):
        raise AssertionError("V2 reviewed source binding invalid")

    snapshot = report.get("source_snapshot")
    if (
        not isinstance(snapshot, dict)
        or snapshot.get("kind") != "sealed_memfd"
        or snapshot.get("bytes") != native.get("bytes")
        or snapshot.get("sha256") != native.get("sha256")
        or snapshot.get("required_seal_mask") != REQUIRED_SEALS
        or not isinstance(snapshot.get("observed_seal_mask"), int)
        or snapshot["observed_seal_mask"] & REQUIRED_SEALS != REQUIRED_SEALS
        or snapshot.get("write_after_seal_rejected") is not True
        or snapshot.get("build_input_is_checkout_path") is not False
        or snapshot.get("preprocess_from_snapshot_only") is not True
        or snapshot.get("compile_from_snapshot_only") is not True
        or snapshot.get(
            "checkout_substitute_after_snapshot_cannot_change_build_input"
        ) is not True
        or snapshot.get(
            "checkout_restore_cannot_rewrite_snapshot_history"
        ) is not True
        or snapshot.get(
            "substitute_visible_control_changed_semantics"
        ) is not True
        or snapshot.get(
            "snapshot_elf_stable_across_substitute_restore"
        ) is not True
        or snapshot.get("sealed_write_rejected") is not True
        or snapshot.get("visible_source_revalidated_after_build") is not True
    ):
        raise AssertionError("V2 sealed source snapshot evidence invalid")

    preprocessed = report.get("preprocessed_source")
    if (
        not isinstance(preprocessed, dict)
        or preprocessed.get("input_kind") != "sealed_memfd"
        or not isinstance(preprocessed.get("bytes"), int)
        or preprocessed["bytes"] < 1
        or HEX64.fullmatch(str(preprocessed.get("sha256", ""))) is None
    ):
        raise AssertionError("V2 preprocessed source identity invalid")

    validate_toolchain(report.get("toolchain"))
    if report.get("toolchain_revalidated_after_build") is not True:
        raise AssertionError("V2 post-build toolchain revalidation missing")

    binary = report.get("binary")
    if (
        not isinstance(binary, dict)
        or not isinstance(binary.get("bytes"), int)
        or binary["bytes"] < V1.MIN_BINARY_BYTES
        or binary["bytes"] > MAX_BINARY_BYTES
        or HEX64.fullmatch(str(binary.get("sha256", ""))) is None
    ):
        raise AssertionError("V2 binary identity invalid")
    for key in (
        "two_builds_byte_identical",
        "elf_magic_verified",
        "elf64_little_endian",
        "machine_x86_64",
        "executable_type",
        "pt_interp_absent",
        "static_link_required",
        "hostile_ld_preload_positive_control",
        "hostile_ld_preload_preentry_blocked",
    ):
        if binary.get(key) is not True:
            raise AssertionError("V2 binary property invalid: " + key)

    self_test = report.get("self_test")
    if (
        not isinstance(self_test, dict)
        or self_test.get("exact_transcript_verified") is not True
        or self_test.get("stderr_empty") is not True
        or self_test.get("stdout_sha256")
        != sha256(V1.EXPECTED_SELF_TEST.encode("utf-8"))
    ):
        raise AssertionError("V2 self-test identity invalid")

    authority = report.get("authority")
    if not isinstance(authority, dict):
        raise AssertionError("V2 authority missing")
    if authority.get("source_only_candidate") is not True:
        raise AssertionError("V2 source-only truth invalid")
    if authority.get("candidate_report_filesystem_write") is not True:
        raise AssertionError("V2 report-write truth invalid")
    for key, value in authority.items():
        if key in ("source_only_candidate", "candidate_report_filesystem_write"):
            continue
        if value is not False:
            raise AssertionError("V2 authority overclaim: " + key)


def derive_dir(output: Path) -> None:
    output.mkdir(parents=True, exist_ok=False)
    report, binary = derive()
    report_bytes = (canonical(report) + "\n").encode("utf-8")
    (output / "candidate-v2.json").write_bytes(report_bytes)
    binary_path = output / "native-preentry-v2"
    binary_path.write_bytes(binary)
    os.chmod(binary_path, 0o555)
    print(MARKER + "_DERIVE_GREEN")
    print("candidate_id=" + report["candidate_id"])
    print("native_binary_sha256=" + report["binary"]["sha256"])
    print("native_binary_bytes=" + str(report["binary"]["bytes"]))
    print("sealed_source_snapshot=true")
    print("checkout_path_is_not_build_authority=true")
    print("toolchain_root_custody_verified=true")
    print("toolchain_revalidated_after_build=true")
    print("substitute_restore_adversary_green=true")
    print("candidate_accepted=false")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")
    print("funds_movement=false")


def compare_dir(root: Path) -> None:
    reports = sorted(root.glob("**/candidate-v2.json"))
    if len(reports) != 3:
        raise AssertionError("exactly three V2 hosted reports required")
    report_bytes = [path.read_bytes() for path in reports]
    binaries = [path.parent / "native-preentry-v2" for path in reports]
    if not all(path.is_file() for path in binaries):
        raise AssertionError("V2 hosted binary missing")
    binary_bytes = [path.read_bytes() for path in binaries]
    if not (report_bytes[0] == report_bytes[1] == report_bytes[2]):
        raise AssertionError("three V2 hosted reports differ")
    if not (binary_bytes[0] == binary_bytes[1] == binary_bytes[2]):
        raise AssertionError("three V2 hosted binaries differ")
    hosted = json.loads(report_bytes[0].decode("utf-8"))
    validate(hosted)
    if sha256(binary_bytes[0]) != hosted["binary"]["sha256"]:
        raise AssertionError("V2 hosted binary SHA mismatch")
    if len(binary_bytes[0]) != hosted["binary"]["bytes"]:
        raise AssertionError("V2 hosted binary size mismatch")

    independent_report, independent_binary = derive()
    independent_bytes = (canonical(independent_report) + "\n").encode("utf-8")
    if independent_bytes != report_bytes[0]:
        raise AssertionError("V2 independent report rederivation differs")
    if independent_binary != binary_bytes[0]:
        raise AssertionError("V2 independent binary rederivation differs")

    print(MARKER + "_THREE_RUN_GREEN")
    print("three_run_report_bytes_identical=true")
    print("three_run_binary_bytes_identical=true")
    print("comparison_rederived_report=true")
    print("comparison_rederived_elf=true")
    print("sealed_source_snapshot=true")
    print("toolchain_revalidated_after_build=true")
    print("candidate_id=" + hosted["candidate_id"])
    print("native_binary_sha256=" + hosted["binary"]["sha256"])
    print("candidate_accepted=false")
    print("live_execution_authorized=false")
    print("funds_movement=false")


def self_test() -> None:
    if V1.MARKER != "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_V1":
        raise AssertionError("merged V1 marker drift")
    adversary = prove_snapshot_substitute_restore()
    if not all(adversary.values()):
        raise AssertionError("sealed snapshot adversary failed")
    toolchain = protected_toolchain_identity()
    validate_toolchain(toolchain)
    own = Path(__file__).read_text(encoding="utf-8")
    for required in (
        "data.decode(\"utf-8\", \"strict\")",
        "exec(code, module.__dict__)",
        "create_sealed_source_snapshot(source_data)",
        "preprocessed_identity_from_snapshot(source_fd)",
        "compile_one_from_snapshot(",
        "pass_fds=(source_fd,)",
        "toolchain_after = protected_toolchain_identity()",
        "checkout_substitute_after_snapshot_cannot_change_build_input",
    ):
        if required not in own:
            raise AssertionError("V2 proof source invariant missing: " + required)
    print(MARKER + "_SELF_TEST_GREEN")
    print("merged_v1_evidence_preserved=true")
    print("sealed_source_snapshot=true")
    print("checkout_path_is_not_build_authority=true")
    print("toolchain_root_custody_verified=true")
    print("toolchain_revalidated_after_build=true")
    print("substitute_restore_adversary_green=true")
    print("three_hosted_reports_required=true")
    print("candidate_accepted=false")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")
    print("funds_movement=false")


def main() -> int:
    parser = argparse.ArgumentParser()
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--self-test", action="store_true")
    mode.add_argument("--derive-dir", type=Path)
    mode.add_argument("--compare-dir", type=Path)
    args = parser.parse_args()
    if args.self_test:
        self_test()
    elif args.derive_dir is not None:
        derive_dir(args.derive_dir)
    elif args.compare_dir is not None:
        compare_dir(args.compare_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
