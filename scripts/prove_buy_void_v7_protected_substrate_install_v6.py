#!/usr/bin/env python3
import ast
import pathlib
import shlex
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
V5 = ROOT / "ops/precision/void_buy_void_v7_protected_substrate_install_v5.py"
V6 = ROOT / "ops/precision/void_buy_void_v7_protected_substrate_install_v6.py"
Q4 = ROOT / "ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v4.py"
Q5 = ROOT / "ops/precision/void_buy_void_v7_protected_substrate_installed_qualification_v5.py"
BRIDGE = ROOT / "ops/precision/void_v7_static_rename_noreplace_bridge_v1.c"
PLAN = ROOT / "ops/security/buy-void-v7-static-rename-noreplace-bridge-plan-v1.json"

MARKER = "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V6_PROOF"
BASE = "cfc77165cdff35dd02090c1137473dadd385e8f4"
V5_BLOB = "632f3371ad3095e6a8fdf338b24c34431abe7d2c"
V6_BLOB = "bff71178f3771a04d96d4f4a9aabe88e050eb683"
Q4_BLOB = "69b1ff028487a139470671cf0afb8937a299897d"
Q5_BLOB = "e078cc69386f513c0bc4181ab12499d58356af61"
BRIDGE_BLOB = "34e32a5b77e0bd82138aa47ad4f8645fc93c0b9c"
PLAN_BLOB = "8dc063e54818ff9c5650ec9b34ba0102dab97656"
PLAN_ID = "voidv7staticrenamenoreplacebridge1_651336b0d39ca60917fc03f441e7be835f6064574a99583bd0af3f3608a13598"


def env() -> dict[str, str]:
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
        "GIT_ASKPASS": "/bin/false",
        "GIT_NO_LAZY_FETCH": "1",
        "GIT_PROTOCOL_FROM_USER": "0",
        "GIT_ALLOW_PROTOCOL": "",
        "PYTHONNOUSERSITE": "1",
        "PYTHONDONTWRITEBYTECODE": "1",
    }


def git(*args: str) -> str:
    cp = subprocess.run(
        ["/usr/bin/git", "-C", str(ROOT), *args],
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env(),
        timeout=30,
        check=False,
    )
    if cp.returncode != 0 or cp.stderr:
        raise RuntimeError("git_failed:" + (args[0] if args else "unknown"))
    return cp.stdout.strip()


def run(args: list[str], timeout: int = 120) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env(),
        timeout=timeout,
        check=False,
    )


for path, blob in (
    (V5, V5_BLOB),
    (V6, V6_BLOB),
    (Q4, Q4_BLOB),
    (Q5, Q5_BLOB),
    (BRIDGE, BRIDGE_BLOB),
    (PLAN, PLAN_BLOB),
):
    observed = git("rev-parse", "HEAD:" + path.relative_to(ROOT).as_posix())
    assert observed == blob, (path, observed, blob)

ancestor = subprocess.run(
    ["/usr/bin/git", "-C", str(ROOT), "merge-base", "--is-ancestor", BASE, "HEAD"],
    stdin=subprocess.DEVNULL,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    env=env(),
    timeout=20,
    check=False,
)
assert ancestor.returncode == 0 and not ancestor.stdout and not ancestor.stderr

v5_raw = V5.read_bytes()
v6_raw = V6.read_bytes()
q4_raw = Q4.read_bytes()
q5_raw = Q5.read_bytes()
compile(v6_raw, str(V6), "exec", dont_inherit=True, optimize=0)
compile(q5_raw, str(Q5), "exec", dont_inherit=True, optimize=0)

v5_text = v5_raw.decode("utf-8")
v6_text = v6_raw.decode("utf-8")
q5_text = q5_raw.decode("utf-8")

for forbidden in ("import ctypes", "ctypes.", "CDLL(", "dlopen", "dlsym"):
    assert forbidden not in v6_text, forbidden

for required in (
    'SCHEMA = "void_buy_void_v7_protected_substrate_install_plan_v6"',
    'PLAN_PREFIX = "voidv7substrateinstallplan6_"',
    'CONFIRM_TOKEN = "INSTALL_ACCEPTED_VOID_V7_PROTECTED_SUBSTRATE_V6_CREATE_ONLY"',
    'V5_INSTALLER_BLOB = "' + V5_BLOB + '"',
    'VOIDFS_PLAN_BLOB = "' + PLAN_BLOB + '"',
    'VOIDFS_BRIDGE_BLOB = "' + BRIDGE_BLOB + '"',
    'PREDECESSOR_QUALIFIER_V4_BLOB = "' + Q4_BLOB + '"',
    'if "_voidfs" not in sys.builtin_module_names:',
    'getattr(spec, "origin", None) != "built-in"',
    'public != ["rename_noreplace"]',
    'raise InstallError("rename_noreplace_failed:" + str(_bridge_errno(exc)))',
    'raise InstallError("rename_noreplace_bridge_contract_failure:" + type(exc).__name__)',
    'print("builtin_voidfs_required=true")',
    'print("ctypes_forbidden=true")',
    'print("installed_qualifier_v5_successor_required=true")',
    'next_action=RUN_INSTALLED_QUALIFICATION_V5',
):
    assert required in v6_text, required

assert 'V6_INSTALLER_BLOB = "' + V6_BLOB + '"' in q5_text
assert 'v6_installer_source_generation_bound=true' in q5_text
assert 'v6_installer_git_blob_sha1=' in q5_text

rename_start = v6_text.index("def _rename_noreplace(")
rename_end = v6_text.index("\ndef _cleanup_stage(", rename_start)
rename_block = v6_text[rename_start:rename_end]
bridge_call = rename_block.index("rename_noreplace(parent_fd, old_name, new_name)")
publication = rename_block.index("_record_publication_after_rename(stage, label)")
parent_fsync = rename_block.index("os.fsync(parent_fd)")
assert bridge_call < publication < parent_fsync
assert "install_parent_fd_matches(parent_fd, expected_parent)" in rename_block
assert "install_parent_custody()" in rename_block

# V6 is a narrow semantic successor. Every pre-existing function not listed
# here must have an identical AST to V5.
ALLOWED_CHANGED_FUNCTIONS = {
    "verify_repository",
    "collect_plan",
    "_rename_noreplace",
    "source_plan",
    "self_test",
    "plan",
    "apply",
}
EXPECTED_NEW_FUNCTIONS = {
    "_require_builtin_voidfs",
    "_bridge_errno",
    "_self_test_voidfs",
}


def funcs(raw: bytes) -> dict[str, ast.FunctionDef]:
    tree = ast.parse(raw)
    return {
        node.name: node
        for node in tree.body
        if isinstance(node, ast.FunctionDef)
    }


v5_funcs = funcs(v5_raw)
v6_funcs = funcs(v6_raw)
assert set(v6_funcs) - set(v5_funcs) == EXPECTED_NEW_FUNCTIONS
assert set(v5_funcs) - set(v6_funcs) == set()
for name in sorted(set(v5_funcs) - ALLOWED_CHANGED_FUNCTIONS):
    assert ast.dump(v5_funcs[name], include_attributes=False) == ast.dump(
        v6_funcs[name], include_attributes=False
    ), "unexpected_function_delta:" + name

# Qualifier V5 is a runtime-verification successor only. All existing runtime
# functions stay identical; only source_plan/self_test add the V6 source pin.
q4_funcs = funcs(q4_raw)
q5_funcs = funcs(q5_raw)
assert set(q4_funcs) == set(q5_funcs)
for name in sorted(set(q4_funcs) - {"source_plan", "self_test", "qualify"}):
    assert ast.dump(q4_funcs[name], include_attributes=False) == ast.dump(
        q5_funcs[name], include_attributes=False
    ), "unexpected_qualifier_delta:" + name

class _QualifierStatusNormalizer(ast.NodeTransformer):
    def visit_Constant(self, node: ast.Constant) -> ast.AST:
        if node.value == "status=INSTALLED_QUALIFICATION_V5_GREEN":
            return ast.copy_location(
                ast.Constant(value="status=INSTALLED_QUALIFICATION_V4_GREEN"),
                node,
            )
        return node

q5_qualify_normalized = _QualifierStatusNormalizer().visit(
    ast.fix_missing_locations(q5_funcs["qualify"])
)
assert ast.dump(q4_funcs["qualify"], include_attributes=False) == ast.dump(
    q5_qualify_normalized, include_attributes=False
), "unexpected_qualifier_delta:qualify"

# V6 source-plan is inert and must not need the built-in bridge.
source_plan = run([str(pathlib.Path("/usr/bin/python3")), "-I", "-B", str(V6), "--source-plan"])
assert source_plan.returncode == 0 and source_plan.stderr == "", source_plan.stdout + source_plan.stderr
for marker in (
    "mode=source-plan",
    "source_only=true",
    "builtin_voidfs_required=true",
    "ctypes_forbidden=true",
    "protected_filesystem_mutation=false",
    "service_mutation=false",
    "transaction=false",
    "funds_movement=false",
):
    assert marker in source_plan.stdout.splitlines(), marker

q_source_plan = run([str(pathlib.Path("/usr/bin/python3")), "-I", "-B", str(Q5), "--source-plan"])
assert q_source_plan.returncode == 0 and q_source_plan.stderr == ""
assert "v6_installer_git_blob_sha1=" + V6_BLOB in q_source_plan.stdout.splitlines()
assert "host_read=false" in q_source_plan.stdout.splitlines()
assert "host_write=false" in q_source_plan.stdout.splitlines()

q_self = run([str(pathlib.Path("/usr/bin/python3")), "-I", "-B", str(Q5), "--self-test"])
assert q_self.returncode == 0 and q_self.stderr == "", q_self.stdout + q_self.stderr
assert "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALLED_QUALIFICATION_V5_SELF_TEST_GREEN" in q_self.stdout.splitlines()
assert "v6_installer_source_generation_bound=true" in q_self.stdout.splitlines()

# Run the real V6 self-test only inside an isolated hosted CPython with the
# reviewed bridge registered as a true built-in module.
embedder = r'''
#define PY_SSIZE_T_CLEAN
#include <Python.h>
#include <stdio.h>

PyMODINIT_FUNC PyInit__voidfs(void);

static int fail(const char *why) {
    fprintf(stderr, "V6_EMBEDDER_HOLD:%s\n", why);
    return 2;
}

int main(int argc, char **argv) {
    if (argc != 2) return fail("v6_path_required");
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
    if (PyStatus_Exception(status)) return fail("python_initialize_failed");

    PyObject *pyargv = PyList_New(2);
    if (pyargv == NULL) return fail("argv_alloc_failed");
    PyObject *p0 = PyUnicode_FromString(argv[1]);
    PyObject *p1 = PyUnicode_FromString("--self-test");
    if (p0 == NULL || p1 == NULL) return fail("argv_unicode_failed");
    PyList_SET_ITEM(pyargv, 0, p0);
    PyList_SET_ITEM(pyargv, 1, p1);
    if (PySys_SetObject("argv", pyargv) != 0) return fail("argv_set_failed");
    Py_DECREF(pyargv);

    const char *script =
        "import runpy, sys\n"
        "assert '_voidfs' in sys.builtin_module_names\n"
        "try:\n"
        "    runpy.run_path(sys.argv[0], run_name='__main__')\n"
        "except SystemExit as e:\n"
        "    assert e.code in (None, 0)\n";

    int rc = PyRun_SimpleString(script);
    int final_rc = Py_FinalizeEx();
    if (rc != 0 || final_rc < 0) return fail("v6_self_test_failed");
    return 0;
}
'''

with tempfile.TemporaryDirectory(prefix="void-v7-v6-proof-") as td:
    td_path = pathlib.Path(td)
    embed = td_path / "embedder.c"
    exe = td_path / "v6-hosted-self-test"
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
        str(BRIDGE),
        str(embed),
        *flags,
    ], timeout=120)
    assert build.returncode == 0, build.stdout + build.stderr

    hosted = run([str(exe), str(V6)], timeout=120)
    assert hosted.returncode == 0, hosted.stdout + hosted.stderr
    assert hosted.stderr == ""
    output = hosted.stdout.splitlines()
    assert "VOID_BUY_VOID_V7_PROTECTED_SUBSTRATE_INSTALL_V6_SELF_TEST_GREEN" in output
    for marker in (
        "builtin_voidfs_required=true",
        "ctypes_forbidden=true",
        "v5_installer_dependency_bound=true",
        "voidfs_plan_dependency_bound=true",
        "voidfs_bridge_dependency_bound=true",
        "installed_qualifier_v5_successor_required=true",
        "publication_bookkeeping_precedes_parent_fsync=true",
        "service_mutation=false",
        "transaction=false",
        "funds_movement=false",
    ):
        assert marker in output, marker

print(MARKER + "_GREEN")
print("base_main=" + BASE)
print("v5_blob=" + V5_BLOB)
print("v6_blob=" + V6_BLOB)
print("qualifier_v4_blob=" + Q4_BLOB)
print("qualifier_v5_blob=" + Q5_BLOB)
print("voidfs_bridge_blob=" + BRIDGE_BLOB)
print("voidfs_plan_blob=" + PLAN_BLOB)
print("voidfs_plan_id=" + PLAN_ID)
print("v5_to_v6_unexpected_function_delta=false")
print("qualifier_runtime_logic_delta=false")
print("builtin_voidfs_v6_self_test_green=true")
print("ctypes_dynamic_loader_path_absent=true")
print("publication_before_parent_fsync_preserved=true")
print("qualifier_v5_exact_v6_source_binding=true")
print("runtime_candidate_execution=false")
print("root_execution=false")
print("protected_filesystem_mutation=false")
print("service_mutation=false")
print("credential_access=false")
print("signing=false")
print("transaction=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("funds_movement=false")
