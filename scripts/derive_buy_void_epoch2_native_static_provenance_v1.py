#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import stat
import subprocess
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parents[1]
MARKER = "VOID_BUY_VOID_EPOCH2_NATIVE_STATIC_PROVENANCE_V1"
WORK = pathlib.Path("/tmp/void-buy-epoch2-native-static-provenance-v1")
CC = pathlib.Path("/usr/bin/cc")
STRIP = pathlib.Path("/usr/bin/strip")
SOURCE_REL = pathlib.Path(
    "ops/precision/void_buy_void_epoch2_live_composition_native_preentry_v1.c"
)
COMMON_COMPILE = (
    "-std=c11", "-Wall", "-Wextra", "-Werror", "-O2", "-fno-ident", "-fno-pie",
)
LINK_FLAGS = ("-static", "-fno-pie", "-no-pie", "-Wl,--build-id=none")
ENV = {
    "PATH": "/usr/bin:/bin",
    "HOME": "/nonexistent",
    "LANG": "C",
    "LC_ALL": "C",
    "TZ": "UTC",
    "SOURCE_DATE_EPOCH": "0",
}


class ProvenanceError(RuntimeError):
    pass


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def git_blob_sha1(raw: bytes) -> str:
    return hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()


def file_record(path: pathlib.Path) -> dict[str, Any]:
    real = path.resolve(strict=True)
    st = real.lstat()
    if not stat.S_ISREG(st.st_mode) or stat.S_ISLNK(st.st_mode):
        raise ProvenanceError("tool_or_link_input_not_regular:" + str(real))
    raw = real.read_bytes()
    return {
        "path": str(real),
        "bytes": len(raw),
        "sha256": sha256(raw),
    }


def run(
    argv: list[str],
    *,
    cwd: pathlib.Path = ROOT,
    allow_stderr: bool = False,
) -> subprocess.CompletedProcess[bytes]:
    cp = subprocess.run(
        argv,
        cwd=cwd,
        env=ENV,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=120,
        check=False,
    )
    if cp.returncode != 0:
        raise ProvenanceError(
            "command_failed:"
            + pathlib.Path(argv[0]).name
            + ":"
            + str(cp.returncode)
            + ":"
            + cp.stderr.decode("utf-8", "replace")[:300]
        )
    if cp.stderr and not allow_stderr:
        raise ProvenanceError(
            "unexpected_stderr:"
            + pathlib.Path(argv[0]).name
            + ":"
            + cp.stderr.decode("utf-8", "replace")[:300]
        )
    return cp


def command_text(argv: list[str], *, stderr: bool = False) -> bytes:
    cp = run(argv, allow_stderr=stderr)
    return cp.stdout + (cp.stderr if stderr else b"")


def resolve_cc_program(name: str) -> pathlib.Path:
    raw = command_text([str(CC), "-print-prog-name=" + name]).decode(
        "utf-8", "strict"
    ).strip()
    if not raw:
        raise ProvenanceError("cc_program_empty:" + name)
    candidate = pathlib.Path(raw)
    if candidate.is_absolute():
        return candidate.resolve(strict=True)
    found = shutil.which(raw, path=ENV["PATH"])
    if not found:
        raise ProvenanceError("cc_program_not_found:" + name + ":" + raw)
    return pathlib.Path(found).resolve(strict=True)


def normalized_link_trace(raw: bytes, object_path: pathlib.Path) -> tuple[list[str], list[dict[str, Any]]]:
    text = raw.decode("utf-8", "strict")
    object_real = object_path.resolve(strict=True)
    normalized: list[str] = []
    inputs: dict[str, dict[str, Any]] = {}
    for original in text.splitlines():
        line = original.strip()
        if not line:
            continue
        candidate = pathlib.Path(line)
        if candidate == object_path or (
            candidate.is_absolute()
            and candidate.exists()
            and candidate.resolve(strict=True) == object_real
        ):
            normalized.append("$OBJECT")
            continue
        if not candidate.is_absolute():
            raise ProvenanceError("link_trace_nonabsolute_input:" + line)
        real = candidate.resolve(strict=True)
        rec = file_record(real)
        normalized.append(rec["path"])
        inputs[rec["path"]] = rec
    if "$OBJECT" not in normalized:
        raise ProvenanceError("link_trace_missing_candidate_object")
    if not inputs:
        raise ProvenanceError("link_trace_missing_system_inputs")
    return normalized, [inputs[key] for key in sorted(inputs)]


def derive(out_dir: pathlib.Path) -> dict[str, Any]:
    source = ROOT / SOURCE_REL
    source_raw = source.read_bytes()

    if WORK.exists():
        shutil.rmtree(WORK)
    WORK.mkdir(mode=0o700, parents=True)
    out_dir.mkdir(mode=0o700, parents=True, exist_ok=True)

    pp = WORK / "native.i"
    obj = WORK / "native.o"
    direct = WORK / "native.direct"
    relink = WORK / "native.relink"
    traced = WORK / "native.traced"
    final = out_dir / "epoch2-live-composition-native-preentry-v1"
    provenance_path = out_dir / "epoch2-native-static-provenance-v1.json"

    run([
        str(CC), *COMMON_COMPILE, "-E", str(SOURCE_REL), "-o", str(pp),
    ])
    run([
        str(CC), *COMMON_COMPILE, "-c", str(SOURCE_REL), "-o", str(obj),
    ])
    run([
        str(CC), *COMMON_COMPILE, *LINK_FLAGS,
        "-o", str(direct), str(SOURCE_REL),
    ])
    run([
        str(CC), *LINK_FLAGS, "-o", str(relink), str(obj),
    ])
    if direct.read_bytes() != relink.read_bytes():
        raise ProvenanceError("direct_compile_and_fixed_object_relink_differ")

    trace_cp = run([
        str(CC), *LINK_FLAGS, "-Wl,-t", "-o", str(traced), str(obj),
    ])
    if direct.read_bytes() != traced.read_bytes():
        raise ProvenanceError("link_trace_changed_binary")
    trace_lines, link_inputs = normalized_link_trace(trace_cp.stdout, obj)

    shutil.copyfile(direct, final)
    run([str(STRIP), "--strip-all", str(final)])
    os.chmod(final, 0o555)

    cc_real = CC.resolve(strict=True)
    strip_real = STRIP.resolve(strict=True)
    tools = {
        "cc": file_record(cc_real),
        "cc1": file_record(resolve_cc_program("cc1")),
        "collect2": file_record(resolve_cc_program("collect2")),
        "as": file_record(resolve_cc_program("as")),
        "ld": file_record(resolve_cc_program("ld")),
        "strip": file_record(strip_real),
    }

    specs = command_text([str(CC), "-dumpspecs"])
    search_dirs = command_text([str(CC), "-print-search-dirs"])
    include_search = command_text(
        [str(CC), "-v", "-E", "-x", "c", "/dev/null"],
        stderr=True,
    )
    dumpmachine = command_text([str(CC), "-dumpmachine"]).decode(
        "utf-8", "strict"
    ).strip()
    dumpversion = command_text([str(CC), "-dumpversion"]).decode(
        "utf-8", "strict"
    ).strip()

    pp_raw = pp.read_bytes()
    obj_raw = obj.read_bytes()
    direct_raw = direct.read_bytes()
    final_raw = final.read_bytes()
    trace_bytes = ("\n".join(trace_lines) + "\n").encode("utf-8")

    value = {
        "marker": MARKER,
        "version": 1,
        "source_path": str(SOURCE_REL),
        "source_git_blob_sha1": git_blob_sha1(source_raw),
        "source_sha256": sha256(source_raw),
        "compile_flags": list(COMMON_COMPILE),
        "link_flags": list(LINK_FLAGS),
        "gcc_dumpmachine": dumpmachine,
        "gcc_dumpversion": dumpversion,
        "gcc_specs_sha256": sha256(specs),
        "gcc_specs_bytes": len(specs),
        "gcc_search_dirs_sha256": sha256(search_dirs),
        "gcc_search_dirs_bytes": len(search_dirs),
        "gcc_include_search_sha256": sha256(include_search),
        "gcc_include_search_bytes": len(include_search),
        "preprocessed_translation_unit_sha256": sha256(pp_raw),
        "preprocessed_translation_unit_bytes": len(pp_raw),
        "compiled_object_sha256": sha256(obj_raw),
        "compiled_object_bytes": len(obj_raw),
        "direct_unstripped_sha256": sha256(direct_raw),
        "direct_unstripped_bytes": len(direct_raw),
        "fixed_object_relink_byte_identical": True,
        "link_trace_relink_byte_identical": True,
        "normalized_link_trace_sha256": sha256(trace_bytes),
        "normalized_link_trace_bytes": len(trace_bytes),
        "normalized_link_trace": trace_lines,
        "observed_link_inputs": link_inputs,
        "tools": tools,
        "final_stripped_sha256": sha256(final_raw),
        "final_stripped_bytes": len(final_raw),
        "complete_observed_static_link_closure": True,
        "system_headers_bound_by_preprocessed_translation_unit": True,
        "compiler_subprograms_bound": True,
        "startup_objects_and_static_archives_bound": True,
    }
    raw = (
        json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
        + "\n"
    ).encode("utf-8")
    provenance_path.write_bytes(raw)
    os.chmod(provenance_path, 0o444)
    return value


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", required=True, type=pathlib.Path)
    args = parser.parse_args()
    value = derive(args.out_dir.resolve())
    print(MARKER + "_GREEN")
    print("final_stripped_sha256=" + value["final_stripped_sha256"])
    print("final_stripped_bytes=" + str(value["final_stripped_bytes"]))
    print("preprocessed_translation_unit_sha256=" + value["preprocessed_translation_unit_sha256"])
    print("compiled_object_sha256=" + value["compiled_object_sha256"])
    print("normalized_link_trace_sha256=" + value["normalized_link_trace_sha256"])
    print("observed_link_input_count=" + str(len(value["observed_link_inputs"])))
    print("complete_observed_static_link_closure=true")
    print("system_headers_bound_by_preprocessed_translation_unit=true")
    print("compiler_subprograms_bound=true")
    print("startup_objects_and_static_archives_bound=true")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, subprocess.SubprocessError, ProvenanceError, UnicodeError) as exc:
        print(MARKER + "_HOLD")
        print("reason=" + str(exc).replace("\n", "_")[:300])
        raise SystemExit(2)
