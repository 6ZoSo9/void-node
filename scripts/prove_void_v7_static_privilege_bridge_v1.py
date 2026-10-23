#!/usr/bin/env python3
"""Source-bound, nonroot hosted built-in proof for the VOID static privilege bridge."""

import hashlib
import json
import os
import pathlib
import shlex
import shutil
import subprocess
import sysconfig
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ops/precision/void_v7_static_privilege_bridge_v1.c"
SOURCE_SHA256 = "7b4580cb166137575b68ae63a88a2908c91da8dc8ca5c4b095ce0051128a39a5"
MARKER = "VOID_V7_STATIC_PRIVILEGE_BRIDGE_V1_PROOF"


def launch(argv, *, timeout=90):
    environment = {
        "PATH": "/usr/bin:/bin",
        "HOME": "/nonexistent",
        "LANG": "C",
        "LC_ALL": "C",
        "TZ": "UTC",
        "PYTHONNOUSERSITE": "1",
        "PYTHONDONTWRITEBYTECODE": "1",
    }
    return subprocess.run(
        argv,
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=timeout,
        env=environment,
        check=False,
    )


assert os.geteuid() != 0, "hosted_proof_root_forbidden"
assert os.uname().machine == "x86_64", "unsupported_arch"
raw = SOURCE.read_bytes()
assert hashlib.sha256(raw).hexdigest() == SOURCE_SHA256, "source_sha256_drift"
source = raw.decode("utf-8", "strict")
for required in (
    '#define VOIDPRIV_MARKER "VOID_V7_STATIC_PRIVILEGE_BRIDGE_REVIEW_V1"',
    "#if !defined(__linux__) || !defined(__x86_64__)",
    "#ifndef SYS_prctl",
    "#ifndef SYS_capset",
    "#ifndef _LINUX_CAPABILITY_VERSION_3",
    "syscall(SYS_prctl, PR_SET_NO_NEW_PRIVS, 1UL, 0UL, 0UL, 0UL)",
    "syscall(SYS_prctl, PR_GET_NO_NEW_PRIVS, 0UL, 0UL, 0UL, 0UL)",
    "syscall(SYS_prctl, PR_CAP_AMBIENT, PR_CAP_AMBIENT_CLEAR_ALL,",
    "syscall(SYS_capset, &header, data)",
    "real_uid == 0 || real_gid == 0",
    "real_uid != effective_uid || real_uid != saved_uid",
    "real_gid != effective_gid || real_gid != saved_gid",
    "PyInit__voidpriv(void)",
):
    assert required in source, "missing_required_source_guard:" + required
for forbidden in (
    "ctypes", "dlopen", "dlsym", "CDLL", "Py_BEGIN_ALLOW_THREADS",
    "Py_END_ALLOW_THREADS", "fork(", "execve(", "system(",
    "setuid(", "setgid(", "setgroups(", "PR_CAPBSET_DROP",
    "CAP_SETPCAP", "_voidfs", "socket(", "connect(",
):
    assert forbidden not in source, "forbidden_source_token:" + forbidden
start = source.index("static PyMethodDef voidpriv_methods[] = {")
end = source.index("static struct PyModuleDef voidpriv_module", start)
methods = source[start:end]
assert methods.count('"set_no_new_privs"') == 1
assert methods.count('"clear_capabilities"') == 1
assert source.count("PyMODINIT_FUNC") == 1

probe = r'''import os
import sys
import _voidpriv

assert _voidpriv.__spec__.origin == "built-in"
assert sorted(n for n in dir(_voidpriv) if not n.startswith("__")) == [
    "clear_capabilities", "set_no_new_privs"
]
assert os.getuid() != 0 and os.getgid() != 0
assert len(set(os.getresuid())) == 1
assert len(set(os.getresgid())) == 1
before_ids = (os.getresuid(), os.getresgid(), os.getgroups())

def security():
    with open("/proc/self/status", "rb") as status_file:
        lines = status_file.read().decode("ascii").splitlines()
    return dict(line.split(":", 1) for line in lines if ":" in line)

before = security()
assert int(before["NoNewPrivs"].strip()) in (0, 1)
if before["NoNewPrivs"].strip() == "0":
    try:
        _voidpriv.clear_capabilities()
    except PermissionError:
        pass
    else:
        raise AssertionError("clear_without_no_new_privs_accepted")
for operation in (_voidpriv.set_no_new_privs, _voidpriv.clear_capabilities):
    try:
        operation(1)
    except TypeError:
        pass
    else:
        raise AssertionError("unexpected_parameter_accepted")
assert _voidpriv.set_no_new_privs() is None
assert _voidpriv.clear_capabilities() is None
assert _voidpriv.set_no_new_privs() is None
assert _voidpriv.clear_capabilities() is None
after = security()
assert after["NoNewPrivs"].strip() == "1"
for key in ("CapInh", "CapPrm", "CapEff", "CapAmb"):
    assert int(after[key].strip(), 16) == 0, (key, after[key])
assert after["CapBnd"].strip() == before["CapBnd"].strip()
assert before_ids == (os.getresuid(), os.getresgid(), os.getgroups())
print("VOID_V7_STATIC_PRIVILEGE_BRIDGE_HOSTED_TEST_GREEN")
print("built_in_module=true")
print("no_new_privs=1")
print("four_capability_sets_zero=true")
print("bounding_set_unchanged=true")
print("root_to_runtime_uid_transition_tested=false")
print("protected_install=false")
'''

embed = r'''#define PY_SSIZE_T_CLEAN
#include <Python.h>
#include <stdio.h>
PyMODINIT_FUNC PyInit__voidpriv(void);
static int fail(const char *msg) {
  fprintf(stderr, "HOSTED_HOLD:%s\n", msg);
  return 3;
}
int main(void) {
  if (PyImport_AppendInittab("_voidpriv", PyInit__voidpriv) != 0)
    return fail("inittab");
  PyConfig config;
  PyConfig_InitIsolatedConfig(&config);
  config.site_import = 0;
  config.write_bytecode = 0;
  config.use_environment = 0;
  config.parse_argv = 0;
  PyStatus status = Py_InitializeFromConfig(&config);
  PyConfig_Clear(&config);
  if (PyStatus_Exception(status))
    return fail("initialize");
  int rc = PyRun_SimpleString(@@PROBE@@);
  int final = Py_FinalizeEx();
  if (rc != 0 || final != 0)
    return fail("probe");
  return 0;
}
'''.replace("@@PROBE@@", json.dumps(probe))

with tempfile.TemporaryDirectory(prefix="void-v7-voidpriv-hosted-") as temp:
    parent = pathlib.Path(temp)
    embedder = parent / "embedder.c"
    executable = parent / "hosted-probe"
    embedder.write_text(embed, "utf-8")
    python_config = shutil.which("python3-config")
    assert python_config, "python3_config_unavailable"
    cfg = launch([python_config, "--embed", "--cflags", "--ldflags"])
    assert cfg.returncode == 0, "python3_config_failed:" + cfg.stderr
    flags = shlex.split(cfg.stdout)
    # Hosted embedder ONLY: explicitly bind the selected Python's shared
    # libpython path. This is NOT an option for the fully-static VOID ELF.
    libdir = pathlib.Path(sysconfig.get_config_var("LIBDIR") or "")
    libname = sysconfig.get_config_var("LDLIBRARY") or ""
    assert libdir.is_absolute() and (libdir / libname).is_file(), "hosted_libpython_missing"
    build = launch([
        "/usr/bin/gcc", "-std=c11", "-O2", "-Wall", "-Wextra", "-Werror",
        "-Wl,-rpath," + str(libdir),
        "-o", str(executable), str(SOURCE), str(embedder), *flags,
    ], timeout=90)
    assert build.returncode == 0, "hosted_build_failed:\n" + build.stdout + build.stderr
    execute = launch([str(executable)], timeout=30)
    assert execute.returncode == 0, "hosted_probe_failed:\n" + execute.stdout + execute.stderr
    assert execute.stderr == "", "unexpected_stderr:" + execute.stderr
    assert "VOID_V7_STATIC_PRIVILEGE_BRIDGE_HOSTED_TEST_GREEN" in execute.stdout.splitlines()
    print(execute.stdout.strip())

print(MARKER + "_GREEN")
print("bridge_source_sha256=" + SOURCE_SHA256)
print("static_cpython_host_runtime_accepted=false")
print("no_root_execution=true")
print("no_protected_filesystem_mutation=true")
print("no_service_mutation=true")
print("no_manifest_or_presale_activation=true")
