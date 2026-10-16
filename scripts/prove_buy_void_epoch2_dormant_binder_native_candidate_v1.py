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
import struct
import subprocess
import tempfile

MARKER = "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_CANDIDATE_V1"
ROOT = Path(__file__).resolve().parents[1]
SOURCE_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_candidate_v3r_binding_native_preentry_v2.c"
)
SOURCE = ROOT / SOURCE_REL
SOURCE_BLOB = "4fdf3f627f407335b9d50800fbbc913d1edae523"
BINDER_REL = (
    "ops/precision/"
    "void_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"
)
BINDER = ROOT / BINDER_REL
BINDER_BLOB = "9c29eb4716077e459b9154f39d0f30cf2e56729f"
BINDER_BYTES = 39391
BINDER_SHA256 = (
    "afa31537a93faee0936e7a4bd384598dd150687da7c24276327f0a16f56d1a5e"
)
BINDING_PROOF_REL = (
    "scripts/prove_buy_void_epoch2_dormant_candidate_v3r_live_binding_v2.mjs"
)
BINDING_PROOF_BLOB = "4671d37fcdb43c2bee9d3de16402df0cd25257bb"
BINDING_DOC_REL = (
    "docs/operators/buy-void-epoch2-dormant-candidate-v3r-live-binding-v2.md"
)
BINDING_DOC_BLOB = "cd90bafa39682284a6d9e87daebfe5966adac8d6"
BINDING_WORKFLOW_REL = (
    ".github/workflows/buy-void-epoch2-dormant-candidate-v3r-live-binding-v2.yml"
)
BINDING_WORKFLOW_BLOB = "2742145ab88d721747f978927a6eb64a7c5f805f"
BINDING_GENERATION_HEAD = "e602fa5b4b6961e9c24d4bbdb60a6d006a2783b2"
CANONICAL_MAIN_PARENT = "b9d44332fc3119ec7a534829502efcff364b1b00"

CC = Path("/usr/bin/cc")
STRIP = Path("/usr/bin/strip")
GIT = Path("/usr/bin/git")
MIN_BINARY_BYTES = 4096
MAX_BINARY_BYTES = 2 * 1024 * 1024
MAX_SOURCE_BYTES = 2 * 1024 * 1024
MAX_TOOL_BYTES = 128 * 1024 * 1024
HEX64 = re.compile(r"^[0-9a-f]{64}$")
CANDIDATE_ID = re.compile(r"^voidbuye2dormantbindercand1_[0-9a-f]{64}$")

COMPILE_FLAGS = (
    "-std=c11", "-Wall", "-Wextra", "-Werror", "-O2",
    "-fno-ident", "-fno-pie",
)
LINK_FLAGS = (
    "-static", "-fno-pie", "-no-pie", "-Wl,--build-id=none", "-Wl,-t",
)
ENV = {
    "PATH": "/usr/bin:/bin",
    "LANG": "C",
    "LC_ALL": "C",
    "TZ": "UTC",
    "SOURCE_DATE_EPOCH": "0",
}
EXPECTED_SELF_TEST = (
    "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V2_SELF_TEST_GREEN\n"
    "native_first_instruction=true\n"
    "fixed_self_path=true\n"
    "fixed_binder_path=true\n"
    "binder_exact_sha256_bound=true\n"
    "binder_git_blob_provenance_bound=true\n"
    "node_policy_sha256_bound=true\n"
    "binder_descriptor_retained=true\n"
    "node_descriptor_fexecve=true\n"
    "private_parent_proof_channel=true\n"
    "caller_stdin_javascript_forbidden=true\n"
    "loader_environment_sanitized=true\n"
    "failure_truth_boundary_test_modes=true\n"
    "credential_content_access=false\n"
    "transaction=false\n"
    "public_presale_activation=false\n"
    "funds_movement=false\n"
)

ELF_PT_INTERP = 3
ELF_MACHINE_X86_64 = 62
ELF_TYPE_EXEC = 2


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


def bounded_file(path: Path, maximum: int, label: str) -> bytes:
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


def capture(argv: list[str], *, timeout: int = 30) -> str:
    result = subprocess.run(
        argv,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
        timeout=timeout,
        env=ENV,
    )
    if result.returncode != 0:
        raise AssertionError(
            "command failed: " + repr(argv) + " " + result.stderr[-2000:]
        )
    if result.stderr:
        raise AssertionError(
            "command produced unexpected stderr: "
            + repr(argv)
            + " "
            + result.stderr[-2000:]
        )
    return result.stdout


def git(*args: str) -> str:
    return capture([os.fspath(GIT), "-C", os.fspath(ROOT), *args], timeout=20).strip()


def bind_source_generation() -> dict:
    if git("rev-parse", BINDING_GENERATION_HEAD + "^{commit}") != BINDING_GENERATION_HEAD:
        raise AssertionError("binding generation head unavailable")
    if git("rev-parse", CANONICAL_MAIN_PARENT + "^{commit}") != CANONICAL_MAIN_PARENT:
        raise AssertionError("canonical main parent unavailable")
    result = subprocess.run(
        [
            os.fspath(GIT), "-C", os.fspath(ROOT),
            "merge-base", "--is-ancestor", BINDING_GENERATION_HEAD, "HEAD",
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=20,
        env=ENV,
    )
    if result.returncode != 0 or result.stdout or result.stderr:
        raise AssertionError("binding generation is not checkout ancestor")
    expected = {
        SOURCE_REL: SOURCE_BLOB,
        BINDER_REL: BINDER_BLOB,
        BINDING_PROOF_REL: BINDING_PROOF_BLOB,
        BINDING_DOC_REL: BINDING_DOC_BLOB,
        BINDING_WORKFLOW_REL: BINDING_WORKFLOW_BLOB,
    }
    for relative, blob in expected.items():
        if git("rev-parse", "HEAD:" + relative) != blob:
            raise AssertionError("source generation blob drift: " + relative)
    return {
        "head": BINDING_GENERATION_HEAD,
        "canonical_main_parent": CANONICAL_MAIN_PARENT,
        "source_git_blob_sha1": SOURCE_BLOB,
        "binder_git_blob_sha1": BINDER_BLOB,
        "binding_proof_git_blob_sha1": BINDING_PROOF_BLOB,
        "binding_doc_git_blob_sha1": BINDING_DOC_BLOB,
        "binding_workflow_git_blob_sha1": BINDING_WORKFLOW_BLOB,
    }


def regular_identity(path: Path, label: str) -> dict:
    real = Path(os.path.realpath(os.path.abspath(os.fspath(path))))
    data = bounded_file(real, MAX_TOOL_BYTES, label)
    return {
        "path": os.fspath(real),
        "bytes": len(data),
        "sha256": sha256(data),
    }


def compiler_program(name: str) -> Path:
    raw = capture([os.fspath(CC), "-print-prog-name=" + name]).strip()
    if not raw:
        raise AssertionError("compiler program missing: " + name)
    if os.path.isabs(raw):
        path = Path(raw)
    else:
        found = shutil.which(raw, path=ENV["PATH"])
        if not found:
            raise AssertionError("compiler program unresolved: " + name)
        path = Path(found)
    return Path(os.path.realpath(path))


def compiler_file(name: str) -> Path:
    raw = capture([os.fspath(CC), "-print-file-name=" + name]).strip()
    if not raw or raw == name:
        raise AssertionError("compiler static input unresolved: " + name)
    path = Path(os.path.realpath(raw))
    if not path.is_absolute():
        raise AssertionError("compiler static input not absolute: " + name)
    return path


def toolchain_identity() -> dict:
    executables = {
        "cc": regular_identity(Path(os.path.realpath(CC)), "toolchain cc"),
        "strip": regular_identity(Path(os.path.realpath(STRIP)), "toolchain strip"),
    }
    for name in ("cc1", "as", "collect2", "ld"):
        executables[name] = regular_identity(
            compiler_program(name),
            "toolchain " + name,
        )
    static_inputs = {}
    for name in (
        "crt1.o", "crti.o", "crtbeginT.o", "libgcc.a",
        "libgcc_eh.a", "libc.a", "crtend.o", "crtn.o",
    ):
        static_inputs[name] = regular_identity(
            compiler_file(name),
            "static input " + name,
        )
    version = capture([os.fspath(CC), "--version"]).splitlines()
    if not version:
        raise AssertionError("compiler version missing")
    return {
        "compiler_version_line": version[0],
        "compiler_dumpmachine": capture([os.fspath(CC), "-dumpmachine"]).strip(),
        "compiler_dumpversion": capture(
            [os.fspath(CC), "-dumpfullversion", "-dumpversion"]
        ).strip(),
        "executables": executables,
        "static_inputs": static_inputs,
        "gcc_specs_sha256": sha256(
            capture([os.fspath(CC), "-dumpspecs"]).encode("utf-8")
        ),
        "gcc_search_dirs_sha256": sha256(
            capture([os.fspath(CC), "-print-search-dirs"]).encode("utf-8")
        ),
    }


def preprocessed_identity() -> dict:
    with tempfile.TemporaryDirectory(prefix="void-e2-dormant-binder-preprocess-") as td:
        out = Path(td) / "preentry.i"
        result = subprocess.run(
            [
                os.fspath(CC), *COMPILE_FLAGS,
                "-E", "-P", "-o", os.fspath(out), os.fspath(SOURCE),
            ],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            timeout=30,
            env=ENV,
        )
        if result.returncode != 0:
            raise AssertionError(
                "preprocess failed: "
                + result.stderr.decode("utf-8", "replace")[-2000:]
            )
        if result.stdout or result.stderr:
            raise AssertionError("preprocess produced unexpected output")
        data = bounded_file(out, 4 * 1024 * 1024, "preprocessed source")
    return {"bytes": len(data), "sha256": sha256(data)}


def inspect_elf(binary: bytes) -> dict:
    if len(binary) < 64 or binary[:4] != b"\x7fELF":
        raise AssertionError("candidate ELF header invalid")
    if binary[4] != 2 or binary[5] != 1:
        raise AssertionError("candidate must be ELF64 little endian")
    e_type, e_machine = struct.unpack_from("<HH", binary, 16)
    if e_type != ELF_TYPE_EXEC or e_machine != ELF_MACHINE_X86_64:
        raise AssertionError("candidate executable identity invalid")
    phoff = struct.unpack_from("<Q", binary, 32)[0]
    phentsize = struct.unpack_from("<H", binary, 54)[0]
    phnum = struct.unpack_from("<H", binary, 56)[0]
    if phentsize < 56 or phnum < 1 or phnum > 128:
        raise AssertionError("candidate program header shape invalid")
    if phoff < 64 or phoff + phentsize * phnum > len(binary):
        raise AssertionError("candidate program header range invalid")
    types = [
        struct.unpack_from("<I", binary, phoff + index * phentsize)[0]
        for index in range(phnum)
    ]
    if ELF_PT_INTERP in types:
        raise AssertionError("candidate PT_INTERP forbidden")
    return {
        "elf64_little_endian": True,
        "machine_x86_64": True,
        "executable_type": True,
        "pt_interp_absent": True,
        "static_link_required": True,
    }


def normalized_link_trace(raw: bytes, object_path: Path) -> dict:
    text = raw.decode("utf-8", "strict")
    if "\x00" in text or "\r" in text:
        raise AssertionError("link trace control bytes invalid")
    obj_real = os.path.realpath(object_path)
    lines = []
    for line in text.splitlines():
        if not line:
            continue
        if line != line.strip():
            raise AssertionError("link trace surrounding whitespace invalid")
        lines.append("<candidate-object>" if os.path.realpath(line) == obj_real else line)
    if lines.count("<candidate-object>") != 1:
        raise AssertionError("candidate object link-trace cardinality invalid")
    if len(lines) < 2:
        raise AssertionError("link trace too small")
    payload = ("\n".join(lines) + "\n").encode("utf-8")
    return {
        "record_count": len(lines),
        "normalized_bytes": len(payload),
        "normalized_sha256": sha256(payload),
    }


def compile_one(root: Path, stem: str) -> tuple[bytes, dict]:
    obj = root / (stem + ".o")
    binary = root / stem
    compile_result = subprocess.run(
        [
            os.fspath(CC), *COMPILE_FLAGS,
            "-c", "-o", os.fspath(obj), os.fspath(SOURCE),
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=30,
        env=ENV,
    )
    if compile_result.returncode != 0:
        raise AssertionError(
            "compile failed: "
            + compile_result.stderr.decode("utf-8", "replace")[-3000:]
        )
    if compile_result.stdout or compile_result.stderr:
        raise AssertionError("successful compile produced output")
    object_data = bounded_file(obj, MAX_BINARY_BYTES, "candidate object")

    link_result = subprocess.run(
        [
            os.fspath(CC), *LINK_FLAGS,
            "-o", os.fspath(binary), os.fspath(obj),
        ],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=30,
        env=ENV,
    )
    if link_result.returncode != 0:
        raise AssertionError(
            "link failed: "
            + link_result.stderr.decode("utf-8", "replace")[-3000:]
        )
    if link_result.stderr:
        raise AssertionError("successful static link produced stderr")
    trace = normalized_link_trace(link_result.stdout, obj)

    strip_result = subprocess.run(
        [os.fspath(STRIP), "--strip-all", os.fspath(binary)],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=30,
        env=ENV,
    )
    if (
        strip_result.returncode != 0
        or strip_result.stdout
        or strip_result.stderr
    ):
        raise AssertionError("strip failed or produced output")

    binary_data = bounded_file(binary, MAX_BINARY_BYTES, "candidate ELF")
    if len(binary_data) < MIN_BINARY_BYTES:
        raise AssertionError("candidate binary too small")
    elf = inspect_elf(binary_data)
    return binary_data, {
        "object_bytes": len(object_data),
        "object_sha256": sha256(object_data),
        "link_trace": trace,
        **elf,
    }


def run_self_test(binary: Path, env: dict[str, str]) -> bytes:
    result = subprocess.run(
        [os.fspath(binary), "--self-test"],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        timeout=15,
        env=env,
    )
    if result.returncode != 0:
        raise AssertionError(
            "candidate self-test failed: "
            + result.stderr.decode("utf-8", "replace")[-1000:]
        )
    if result.stderr:
        raise AssertionError("candidate self-test stderr not empty")
    if result.stdout.decode("utf-8", "strict") != EXPECTED_SELF_TEST:
        raise AssertionError("candidate self-test transcript mismatch")
    return result.stdout


def prove_loader_independence(candidate: Path) -> dict:
    with tempfile.TemporaryDirectory(prefix="void-e2-dormant-binder-loader-") as td:
        root = Path(td)
        sentinel = root / "preload-fired"
        preload_source = root / "preload.c"
        preload_source.write_text(
            "#include <fcntl.h>\n"
            "#include <unistd.h>\n"
            "__attribute__((constructor)) static void poison(void){\n"
            f"  int fd=open({json.dumps(os.fspath(sentinel))},"
            "O_WRONLY|O_CREAT|O_TRUNC,0600);\n"
            "  if(fd>=0){ssize_t n=write(fd,\"x\",1);if(n!=1)_exit(127);close(fd);}\n"
            "}\n",
            encoding="utf-8",
        )
        preload = root / "preload.so"
        shared = subprocess.run(
            [
                os.fspath(CC), "-shared", "-fPIC", "-O2",
                "-Wall", "-Wextra", "-Werror", "-Wl,--build-id=none",
                "-o", os.fspath(preload), os.fspath(preload_source),
            ],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            timeout=30,
            env=ENV,
        )
        if shared.returncode != 0:
            raise AssertionError("hostile preload compile failed")

        control_source = root / "control.c"
        control_source.write_text("int main(void){return 0;}\n", encoding="utf-8")
        control = root / "control"
        dynamic = subprocess.run(
            [
                os.fspath(CC), "-std=c11", "-O2", "-Wall", "-Wextra", "-Werror",
                "-Wl,--build-id=none",
                "-o", os.fspath(control), os.fspath(control_source),
            ],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            timeout=30,
            env=ENV,
        )
        if dynamic.returncode != 0:
            raise AssertionError("dynamic preload control compile failed")

        poisoned = {**ENV, "LD_PRELOAD": os.fspath(preload)}
        control_run = subprocess.run(
            [os.fspath(control)],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
            timeout=15,
            env=poisoned,
        )
        if control_run.returncode != 0 or not sentinel.is_file():
            raise AssertionError("hostile preload positive control failed")
        sentinel.unlink()

        output = run_self_test(candidate, poisoned)
        if sentinel.exists():
            raise AssertionError("hostile preload executed in static candidate")
        if output.decode("utf-8", "strict") != EXPECTED_SELF_TEST:
            raise AssertionError("hostile-loader self-test transcript mismatch")
    return {
        "hostile_ld_preload_positive_control": True,
        "hostile_ld_preload_preentry_blocked": True,
    }


def source_identity() -> dict:
    source_data = bounded_file(SOURCE, MAX_SOURCE_BYTES, "native source")
    binder_data = bounded_file(BINDER, MAX_SOURCE_BYTES, "binder source")
    if git_blob_sha1(source_data) != SOURCE_BLOB:
        raise AssertionError("native source Git blob mismatch")
    if git_blob_sha1(binder_data) != BINDER_BLOB:
        raise AssertionError("binder source Git blob mismatch")
    if len(binder_data) != BINDER_BYTES or sha256(binder_data) != BINDER_SHA256:
        raise AssertionError("binder byte identity mismatch")
    source_text = source_data.decode("utf-8", "strict")
    for required in (
        '#define BINDER_GIT_BLOB "' + BINDER_BLOB + '"',
        "#define BINDER_BYTES 39391U",
        "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PREENTRY_V2",
        "VOID_BUY_VOID_EPOCH2_DORMANT_BINDER_NATIVE_PARENT_PROOF_V2",
        "require_devnull_stdin();",
        "fexecve(node_fd,next_argv,envp);",
        "stream_fd(binder_fd,source_pipe[1])",
    ):
        if required not in source_text:
            raise AssertionError("native source contract missing: " + required)
    if "\\n#define MAX_RUNNER_BYTES" in source_text:
        raise AssertionError("native preprocessor literal newline regression")
    return {
        "native_source": {
            "path": SOURCE_REL,
            "git_blob_sha1": SOURCE_BLOB,
            "bytes": len(source_data),
            "sha256": sha256(source_data),
        },
        "binder_source": {
            "path": BINDER_REL,
            "git_blob_sha1": BINDER_BLOB,
            "bytes": len(binder_data),
            "sha256": sha256(binder_data),
        },
    }


def material(report: dict) -> dict:
    copy = dict(report)
    copy.pop("candidate_id", None)
    return copy


def derive() -> tuple[dict, bytes]:
    binding = bind_source_generation()
    sources = source_identity()
    toolchain = toolchain_identity()
    preprocessed = preprocessed_identity()

    with tempfile.TemporaryDirectory(prefix="void-e2-dormant-binder-candidate-") as td:
        root = Path(td)
        binary_a, build_a = compile_one(root, "native-a")
        binary_b, build_b = compile_one(root, "native-b")
        if binary_a != binary_b:
            raise AssertionError("two candidate builds are not byte-identical")
        if build_a != build_b:
            raise AssertionError("two candidate build metadata objects differ")

        candidate_path = root / "native-a"
        clean_self_test = run_self_test(candidate_path, ENV)
        loader = prove_loader_independence(candidate_path)

    report = {
        "marker": MARKER,
        "version": 1,
        "binding_generation": binding,
        **sources,
        "preprocessed_source": preprocessed,
        "toolchain": toolchain,
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
        "voidbuye2dormantbindercand1_"
        + sha256(canonical(material(report)).encode("utf-8"))
    )
    validate(report)
    return report, binary_a


def validate(report: dict) -> None:
    if not isinstance(report, dict) or report.get("marker") != MARKER:
        raise AssertionError("candidate marker invalid")
    if report.get("version") != 1:
        raise AssertionError("candidate version invalid")
    cid = report.get("candidate_id")
    if not isinstance(cid, str) or CANDIDATE_ID.fullmatch(cid) is None:
        raise AssertionError("candidate id invalid")
    expected = (
        "voidbuye2dormantbindercand1_"
        + sha256(canonical(material(report)).encode("utf-8"))
    )
    if cid != expected:
        raise AssertionError("candidate id content binding invalid")

    native = report.get("native_source")
    binder = report.get("binder_source")
    if (
        not isinstance(native, dict)
        or native.get("git_blob_sha1") != SOURCE_BLOB
        or not isinstance(binder, dict)
        or binder.get("git_blob_sha1") != BINDER_BLOB
        or binder.get("bytes") != BINDER_BYTES
        or binder.get("sha256") != BINDER_SHA256
    ):
        raise AssertionError("candidate source binding invalid")

    binary = report.get("binary")
    if (
        not isinstance(binary, dict)
        or not isinstance(binary.get("bytes"), int)
        or binary["bytes"] < MIN_BINARY_BYTES
        or binary["bytes"] > MAX_BINARY_BYTES
        or HEX64.fullmatch(str(binary.get("sha256", ""))) is None
    ):
        raise AssertionError("candidate binary identity invalid")
    for key in (
        "two_builds_byte_identical", "elf_magic_verified",
        "elf64_little_endian", "machine_x86_64", "executable_type",
        "pt_interp_absent", "static_link_required",
        "hostile_ld_preload_positive_control",
        "hostile_ld_preload_preentry_blocked",
    ):
        if binary.get(key) is not True:
            raise AssertionError("candidate binary property invalid: " + key)

    self_test = report.get("self_test")
    if (
        not isinstance(self_test, dict)
        or self_test.get("exact_transcript_verified") is not True
        or self_test.get("stderr_empty") is not True
        or self_test.get("stdout_sha256")
        != sha256(EXPECTED_SELF_TEST.encode("utf-8"))
    ):
        raise AssertionError("candidate self-test invalid")

    authority = report.get("authority")
    if not isinstance(authority, dict):
        raise AssertionError("candidate authority missing")
    if authority.get("source_only_candidate") is not True:
        raise AssertionError("source-only candidate truth invalid")
    if authority.get("candidate_report_filesystem_write") is not True:
        raise AssertionError("candidate report write truth invalid")
    for key, value in authority.items():
        if key in ("source_only_candidate", "candidate_report_filesystem_write"):
            continue
        if value is not False:
            raise AssertionError("candidate authority overclaim: " + key)


def derive_dir(output: Path) -> None:
    output.mkdir(parents=True, exist_ok=False)
    report, binary = derive()
    report_bytes = (canonical(report) + "\n").encode("utf-8")
    (output / "candidate.json").write_bytes(report_bytes)
    binary_path = output / "native-preentry"
    binary_path.write_bytes(binary)
    os.chmod(binary_path, 0o555)
    print(MARKER + "_DERIVE_GREEN")
    print("candidate_id=" + report["candidate_id"])
    print("native_binary_sha256=" + report["binary"]["sha256"])
    print("native_binary_bytes=" + str(report["binary"]["bytes"]))
    print("three_run_comparison_required=true")
    print("static_link_required=true")
    print("pt_interp_absent=true")
    print("hostile_ld_preload_preentry_blocked=true")
    print("candidate_accepted=false")
    print("protected_install_authorized=false")
    print("live_execution_authorized=false")
    print("funds_movement=false")


def compare_dir(root: Path) -> None:
    reports = sorted(root.glob("**/candidate.json"))
    if len(reports) != 3:
        raise AssertionError("exactly three hosted candidate reports required")
    report_bytes = [path.read_bytes() for path in reports]
    binary_paths = [path.parent / "native-preentry" for path in reports]
    if not all(path.is_file() for path in binary_paths):
        raise AssertionError("hosted candidate binary missing")
    binary_bytes = [path.read_bytes() for path in binary_paths]
    if not (report_bytes[0] == report_bytes[1] == report_bytes[2]):
        raise AssertionError("three hosted candidate reports differ")
    if not (binary_bytes[0] == binary_bytes[1] == binary_bytes[2]):
        raise AssertionError("three hosted candidate binaries differ")

    hosted = json.loads(report_bytes[0].decode("utf-8"))
    validate(hosted)
    if sha256(binary_bytes[0]) != hosted["binary"]["sha256"]:
        raise AssertionError("hosted binary SHA does not match report")
    if len(binary_bytes[0]) != hosted["binary"]["bytes"]:
        raise AssertionError("hosted binary size does not match report")

    independent_report, independent_binary = derive()
    independent_bytes = (canonical(independent_report) + "\n").encode("utf-8")
    if independent_bytes != report_bytes[0]:
        raise AssertionError("independent report rederivation differs")
    if independent_binary != binary_bytes[0]:
        raise AssertionError("independent binary rederivation differs")

    print(MARKER + "_THREE_RUN_GREEN")
    print("three_run_report_bytes_identical=true")
    print("three_run_binary_bytes_identical=true")
    print("comparison_rederived_report=true")
    print("comparison_rederived_elf=true")
    print("candidate_id=" + hosted["candidate_id"])
    print("native_binary_sha256=" + hosted["binary"]["sha256"])
    print("static_link_required=true")
    print("pt_interp_absent=true")
    print("candidate_accepted=false")
    print("live_execution_authorized=false")
    print("funds_movement=false")


def self_test() -> None:
    sample = {
        "marker": MARKER,
        "version": 1,
        "authority": {
            "source_only_candidate": True,
            "candidate_report_filesystem_write": True,
            "candidate_accepted": False,
        },
    }
    material_bytes = canonical(sample).encode("utf-8")
    if sha256(material_bytes) != hashlib.sha256(material_bytes).hexdigest():
        raise AssertionError("canonical hashing self-test failed")
    if not CANDIDATE_ID.fullmatch(
        "voidbuye2dormantbindercand1_" + "0" * 64
    ):
        raise AssertionError("candidate id regex self-test failed")
    print(MARKER + "_SELF_TEST_GREEN")
    print("source_blob_bound=true")
    print("binder_blob_and_sha256_bound=true")
    print("three_hosted_reports_required=true")
    print("three_hosted_binaries_required=true")
    print("comparison_rederives_elf=true")
    print("static_link_required=true")
    print("pt_interp_absent=true")
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
    else:
        raise AssertionError("mode missing")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
