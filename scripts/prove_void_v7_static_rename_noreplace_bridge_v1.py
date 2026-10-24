#!/usr/bin/env python3
import hashlib
import pathlib
import shlex
import struct
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = ROOT / "ops/precision/void_v7_static_rename_noreplace_bridge_v1.c"
PLAN = ROOT / "ops/security/buy-void-v7-static-rename-noreplace-bridge-plan-v1.json"

MARKER = "VOID_V7_STATIC_RENAME_NOREPLACE_BRIDGE_V1_PROOF"
SOURCE_BLOB = "34e32a5b77e0bd82138aa47ad4f8645fc93c0b9c"
PLAN_BLOB = "8dc063e54818ff9c5650ec9b34ba0102dab97656"
PLAN_ID = "voidv7staticrenamenoreplacebridge1_651336b0d39ca60917fc03f441e7be835f6064574a99583bd0af3f3608a13598"
SOURCE_BASE = "4596bc73ce3adc8a4e59396ca1ebdf206ba9496f"


def git_text(*args: str) -> str:
    cp = subprocess.run(
        ["/usr/bin/git", "-C", str(ROOT), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=30,
        check=False,
        env={
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
        },
    )
    if cp.returncode != 0 or cp.stderr:
        raise RuntimeError("git_failed:" + (args[0] if args else "unknown"))
    return cp.stdout.strip()


def run(args: list[str], *, timeout: int = 60) -> subprocess.CompletedProcess:
    return subprocess.run(
        args,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=timeout,
        check=False,
        env={
            "PATH": "/usr/bin:/bin",
            "HOME": "/nonexistent",
            "LANG": "C",
            "LC_ALL": "C",
            "TZ": "UTC",
            "PYTHONNOUSERSITE": "1",
            "PYTHONDONTWRITEBYTECODE": "1",
        },
    )


assert git_text("rev-parse", "HEAD:" + SOURCE.relative_to(ROOT).as_posix()) == SOURCE_BLOB
assert git_text("rev-parse", "HEAD:" + PLAN.relative_to(ROOT).as_posix()) == PLAN_BLOB
assert git_text("merge-base", "--is-ancestor", SOURCE_BASE, "HEAD") == ""

source = SOURCE.read_text("utf-8")
for required in (
    '#define VOIDFS_MARKER "VOID_V7_STATIC_RENAME_NOREPLACE_BRIDGE_V1"',
    '#define VOIDFS_MAX_LEAF_BYTES 255U',
    '#if !defined(__linux__) || !defined(__x86_64__)',
    '#ifndef SYS_renameat2',
    '#ifndef RENAME_NOREPLACE',
    'PyArg_ParseTuple(args, "iOO:rename_noreplace"',
    'fstat(parent_fd, &parent_st)',
    'S_ISDIR(parent_st.st_mode)',
    'syscall(SYS_renameat2,',
    'RENAME_NOREPLACE);',
    'return PyErr_SetFromErrno(PyExc_OSError);',
    '"rename_noreplace"',
    'PyMODINIT_FUNC',
    'PyInit__voidfs(void)',
    'return PyModule_Create(&voidfs_module);',
):
    assert required in source, required

for forbidden in (
    "Py_BEGIN_ALLOW_THREADS",
    "Py_END_ALLOW_THREADS",
    "ctypes",
    "dlopen",
    "dlsym",
    "rename(",
    "renameat(",
    "link(",
    "linkat(",
    "unlink(",
    "unlinkat(",
    "system(",
    "popen(",
    "fork(",
    "exec",
    "socket(",
    "connect(",
    "PyRun_",
    "PyImport_Import",
):
    assert forbidden not in source, forbidden

# Exactly one exported Python-callable operation in the method table.
method_start = source.index("static PyMethodDef voidfs_methods[] = {")
method_end = source.index("static struct PyModuleDef voidfs_module", method_start)
method_block = source[method_start:method_end]
assert method_block.count('"rename_noreplace"') == 1
assert method_block.count("voidfs_rename_noreplace") == 1
assert source.count("PyMethodDef voidfs_methods") == 1

embedder = r'''
#define PY_SSIZE_T_CLEAN
#include <Python.h>
#include <stdio.h>

PyMODINIT_FUNC PyInit__voidfs(void);

static int fail(const char *message) {
    fprintf(stderr, "EMBEDDER_HOLD:%s\n", message);
    return 2;
}

int main(void) {
    if (PyImport_AppendInittab("_voidfs", PyInit__voidfs) != 0) {
        return fail("append_inittab_failed");
    }

    PyConfig config;
    PyConfig_InitIsolatedConfig(&config);
    config.site_import = 0;
    config.write_bytecode = 0;
    config.use_environment = 0;
    config.parse_argv = 0;

    PyStatus status = Py_InitializeFromConfig(&config);
    PyConfig_Clear(&config);
    if (PyStatus_Exception(status)) {
        return fail("python_initialize_failed");
    }

    const char *script =
        "import errno, os, tempfile, _voidfs\n"
        "assert _voidfs.__spec__.origin == 'built-in'\n"
        "assert sorted(n for n in dir(_voidfs) if not n.startswith('__')) == ['rename_noreplace']\n"
        "with tempfile.TemporaryDirectory(prefix='voidfs-proof-') as td:\n"
        "    pfd = os.open(td, os.O_RDONLY | os.O_DIRECTORY)\n"
        "    try:\n"
        "        def write(name, data):\n"
        "            fd=os.open(name, os.O_WRONLY|os.O_CREAT|os.O_EXCL, 0o600, dir_fd=pfd)\n"
        "            try: os.write(fd, data); os.fsync(fd)\n"
        "            finally: os.close(fd)\n"
        "        write('src-file', b'alpha')\n"
        "        _voidfs.rename_noreplace(pfd, 'src-file', 'dst-file')\n"
        "        assert not os.path.exists(td + '/src-file')\n"
        "        assert open(td + '/dst-file','rb').read() == b'alpha'\n"
        "        os.fsync(pfd)\n"
        "        os.mkdir('src-dir', dir_fd=pfd)\n"
        "        _voidfs.rename_noreplace(pfd, 'src-dir', 'dst-dir')\n"
        "        assert not os.path.exists(td + '/src-dir') and os.path.isdir(td + '/dst-dir')\n"
        "        os.fsync(pfd)\n"
        "        write('src-existing-file', b'source')\n"
        "        write('dst-existing-file', b'target')\n"
        "        try: _voidfs.rename_noreplace(pfd, 'src-existing-file', 'dst-existing-file')\n"
        "        except OSError as e: assert e.errno == errno.EEXIST\n"
        "        else: raise AssertionError('existing_file_replaced')\n"
        "        assert open(td + '/src-existing-file','rb').read() == b'source'\n"
        "        assert open(td + '/dst-existing-file','rb').read() == b'target'\n"
        "        write('src-existing-symlink', b'source')\n"
        "        os.symlink('nowhere', 'dst-existing-symlink', dir_fd=pfd)\n"
        "        try: _voidfs.rename_noreplace(pfd, 'src-existing-symlink', 'dst-existing-symlink')\n"
        "        except OSError as e: assert e.errno == errno.EEXIST\n"
        "        else: raise AssertionError('existing_symlink_replaced')\n"
        "        assert open(td + '/src-existing-symlink','rb').read() == b'source'\n"
        "        assert os.readlink('dst-existing-symlink', dir_fd=pfd) == 'nowhere'\n"
        "        write('src-existing-dir', b'source')\n"
        "        os.mkdir('dst-existing-dir', dir_fd=pfd)\n"
        "        try: _voidfs.rename_noreplace(pfd, 'src-existing-dir', 'dst-existing-dir')\n"
        "        except OSError as e: assert e.errno == errno.EEXIST\n"
        "        else: raise AssertionError('existing_directory_replaced')\n"
        "        assert open(td + '/src-existing-dir','rb').read() == b'source'\n"
        "        assert os.path.isdir(td + '/dst-existing-dir')\n"
        "        for bad in ('', '.', '..', 'a/b', '\\u00e9'):\n"
        "            try: _voidfs.rename_noreplace(pfd, bad, 'safe-target')\n"
        "            except (ValueError, TypeError): pass\n"
        "            else: raise AssertionError('bad_leaf_accepted:' + repr(bad))\n"
        "        try: _voidfs.rename_noreplace(pfd, 'same', 'same')\n"
        "        except ValueError: pass\n"
        "        else: raise AssertionError('same_leaf_accepted')\n"
        "        try: _voidfs.rename_noreplace(-1, 'a', 'b')\n"
        "        except ValueError: pass\n"
        "        else: raise AssertionError('negative_fd_accepted')\n"
        "        ffd=os.open('dst-file', os.O_RDONLY, dir_fd=pfd)\n"
        "        try:\n"
        "            try: _voidfs.rename_noreplace(ffd, 'a', 'b')\n"
        "            except NotADirectoryError: pass\n"
        "            else: raise AssertionError('regular_file_fd_accepted')\n"
        "        finally: os.close(ffd)\n"
        "        try: _voidfs.rename_noreplace(pfd, 'missing-source', 'fresh-target')\n"
        "        except OSError as e: assert e.errno == errno.ENOENT\n"
        "        else: raise AssertionError('missing_source_accepted')\n"
        "        assert not os.path.exists(td + '/fresh-target')\n"
        "    finally:\n"
        "        os.close(pfd)\n"
        "print('VOIDFS_HOSTED_BUILTIN_PROBE_GREEN')\n";

    int rc = PyRun_SimpleString(script);
    int final_rc = Py_FinalizeEx();
    if (rc != 0 || final_rc < 0) {
        return fail("python_probe_failed");
    }
    return 0;
}
'''

with tempfile.TemporaryDirectory(prefix="void-v7-voidfs-proof-") as td:
    td_path = pathlib.Path(td)
    embed = td_path / "embedder.c"
    exe = td_path / "voidfs-hosted-probe"
    embed.write_text(embedder, "utf-8")

    cfg = run(["python3-config", "--embed", "--cflags", "--ldflags"])
    assert cfg.returncode == 0, cfg.stderr
    flags = shlex.split(cfg.stdout)
    build = run([
        "/usr/bin/gcc",
        "-std=c11",
        "-O2",
        "-Wall",
        "-Wextra",
        "-Werror",
        "-o",
        str(exe),
        str(SOURCE),
        str(embed),
        *flags,
    ], timeout=90)
    assert build.returncode == 0, build.stdout + build.stderr

    probe = run([str(exe)], timeout=60)
    assert probe.returncode == 0, probe.stdout + probe.stderr
    assert probe.stderr == ""
    assert "VOIDFS_HOSTED_BUILTIN_PROBE_GREEN" in probe.stdout.splitlines()

print(MARKER + "_GREEN")
print("source_blob=" + SOURCE_BLOB)
print("plan_blob=" + PLAN_BLOB)
print("plan_id=" + PLAN_ID)
print("linux_x86_64_direct_syscall_bound=true")
print("rename_flags_exact_noreplace=true")
print("same_parent_directory_fd_required=true")
print("ascii_single_leaf_validation_bound=true")
print("existing_file_symlink_directory_rejection_exercised=true")
print("fresh_file_directory_publication_exercised=true")
print("missing_source_rejection_exercised=true")
print("invalid_fd_leaf_and_same_leaf_rejection_exercised=true")
print("builtin_module_origin_exercised=true")
print("hosted_embedder_only=true")
print("fully_static_cpython_runtime_accepted=false")
print("v6_installer_implemented=false")
print("runtime_candidate_execution_authorized=false")
print("protected_filesystem_mutation=false")
print("service_mutation=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
