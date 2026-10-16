#!/usr/bin/env python3
from __future__ import annotations

import ast
import pathlib
import subprocess
import sys
import types

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = (
    "ops/precision/"
    "void_buy_void_user_manager_credential_query_protected_replace_v3r.py"
)
LOCK = "ops/security/buy-void-user-manager-credential-query-elf-lock-v3r.json"
V2_LOCK = "ops/security/buy-void-user-manager-credential-query-elf-lock-v2.json"

EXPECTED = {
    SOURCE: "98f8b9fda89e33c50e19008268d97655aad54e6d",
    LOCK: "c4870f3178aebc9a0bb6557562f663b8480cfefa",
    V2_LOCK: "b73415ce8fc95ff2d49cbde97a15d701ad5b7937",
}

def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="strict",
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
        },
        timeout=120,
        check=True,
    )

def run_unchecked(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=ROOT,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="strict",
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
        },
        timeout=120,
        check=False,
    )

def git_blob(path: str) -> str:
    return run(
        "/usr/bin/git",
        "--no-replace-objects",
        "-C",
        str(ROOT),
        "rev-parse",
        "HEAD:" + path,
    ).stdout.strip()

for path, expected in EXPECTED.items():
    assert git_blob(path) == expected, "blob_drift:" + path

source = (ROOT / SOURCE).read_text(encoding="utf-8")
tree = ast.parse(source, filename=SOURCE)

imports = {
    node.names[0].name
    for node in ast.walk(tree)
    if isinstance(node, ast.Import) and node.names
}
from_imports = {
    node.module or ""
    for node in ast.walk(tree)
    if isinstance(node, ast.ImportFrom)
}
assert "subprocess" not in imports
assert "subprocess" not in from_imports

for needle in (
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_REPLACE_V3R",
    "voidbuyumqcredelflock3r_",
    "8b064214e22ce54ac193b426f38b9d6a7ea4cee07b38b68c8d1eeb6c51de6f34",
    "voidbuyumqcredelflock2_",
    "c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54",
    "67e4017efffc7dd9f7bc44f31280244bf58dab3c6fb255f49fea6e5cec9b714c",
    "7b968a20f1507215477f43a59c5d82b9e9adca918ce5f2df566292d8380b4cb1",
    "af02d006176db1a16eee52625751736c63af3bd1b250b46f81f200359fb48718",
    "d60e5719a4d785dbfaca90074ed3313ef9e0cae84c3f933af44d7faf84763923",
    "CREDENTIAL_QUERY_V2_GREEN_WITH_V1_PREDECESSOR_READY_FOR_V3",
    "CREDENTIAL_QUERY_V3_STAGE_READY_WITH_V2_V1",
    "CREDENTIAL_QUERY_V3_EXCHANGED_PENDING_V2_PREDECESSOR",
    "CREDENTIAL_QUERY_V3_GREEN_WITH_V1_V2_PREDECESSORS",
    "CREDENTIAL_QUERY_V2_ROLLBACK_PENDING_V3_CLEANUP",
    "CREDENTIAL_QUERY_V3_PRIVATE_PENDING_RECOVERY_REQUIRED",
    "ATOMIC_EXCHANGE_ACCEPTED_CREDENTIAL_QUERY_V2_TO_V3",
    "ATOMIC_EXCHANGE_ROLLBACK_CREDENTIAL_QUERY_V3_TO_V2",
    "predecessor-lock-v1",
    "predecessor-lock-v2",
    "RENAME_EXCHANGE",
    "RENAME_NOREPLACE",
    "_open_protected_root",
    "_require_visible_install_root",
    "replacement_operation_in_progress",
    "_unlink_owned_name",
    "created_stage_identity",
    "v1_predecessor_preserved_after_success=true",
    "v2_predecessor_retained_after_success=true",
    "v2_predecessor_retained=true",
    "foreign_stage_cleanup_rejected=true",
    "current_invocation_stage_inode_bound=true",
    "operation_directory_lock_required=true",
    "stable_parent_operation_lock_required=true",
    "descriptor_bound_state_inspection_required=true",
    "private_stage_publication_required=true",
    "visible_install_root_generation_revalidation_required=true",
    "def emit_operation_authority(mode: str) -> None:",
    "authority_boundary=PRE_MUTATION",
    "filesystem_mutation_possible=true",
    "filesystem_mutation_performed=false",
    "protected_root_opened=false",
    "sys.stdout.flush()",
    'emit_operation_authority("apply")',
    'emit_operation_authority("rollback")',
    "pre_mutation_authority_boundary=true",
    "crash_state_classifier_complete=true",
    "apply_crash_resume_supported=true",
    "rollback_crash_resume_supported=true",
    "query_execution=false",
    "credential_contents_read=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "wc_void_market_activation=false",
    "production_host_evidence_authority=false",
):
    assert needle in source, needle

def executable_key_wallet_authority_violations(
    source_text: str,
) -> list[str]:
    tree = ast.parse(source_text)
    violations: list[str] = []
    parents = {
        child: parent
        for parent in ast.walk(tree)
        for child in ast.iter_child_nodes(parent)
    }

    allowed_imports = frozenset({
        "argparse",
        "ctypes",
        "fcntl",
        "hashlib",
        "json",
        "os",
        "pathlib",
        "re",
        "stat",
        "sys",
        "tempfile",
    })
    allowed_from_imports = {
        "__future__": frozenset({"annotations"}),
        "typing": frozenset({"Any"}),
    }
    signing_call_names = {
        "sign",
        "signhash",
        "signmessage",
        "signtransaction",
        "crypto_sign",
        "crypto_sign_detached",
    }
    signing_constructor_names = {
        "privatekey",
        "signingkey",
    }
    sensitive_import_prefixes = (
        "cryptography.hazmat.primitives.asymmetric",
        "ecdsa",
        "eth_account",
        "eth_keys",
        "nacl.signing",
        "web3",
    )
    forbidden_builtin_calls = {
        "__import__",
        "compile",
        "eval",
        "exec",
        "open",
    }
    forbidden_os_call_names = {
        "execl",
        "execle",
        "execlp",
        "execlpe",
        "execv",
        "execve",
        "execvp",
        "execvpe",
        "fork",
        "forkpty",
        "popen",
        "posixspawn",
        "posixspawnp",
        "spawnl",
        "spawnle",
        "spawnlp",
        "spawnlpe",
        "spawnv",
        "spawnve",
        "spawnvp",
        "spawnvpe",
        "system",
    }

    def normalized_identifier(value: str) -> str:
        return value.casefold().replace("_", "").replace("-", "")

    def identifier_is_sensitive(value: str) -> bool:
        folded = value.casefold()
        compact = normalized_identifier(value)
        return (
            "privatekey" in compact
            or "signingkey" in compact
            or "wallet" in compact
            or "signer" in compact
            or compact in signing_constructor_names
            or folded in {"account", "eth_account", "web3"}
        )

    def import_path_is_sensitive(value: str) -> bool:
        folded = value.casefold()
        return any(
            folded == prefix or folded.startswith(prefix + ".")
            for prefix in sensitive_import_prefixes
        ) or "wallet" in folded

    bindings: dict[str, str] = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                local = alias.asname or alias.name.split(".", 1)[0]
                bindings[local] = alias.name
        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            for alias in node.names:
                local = alias.asname or alias.name
                bindings[local] = (
                    module + "." + alias.name if module else alias.name
                )

    def resolve_name(value: str) -> str:
        current = value
        seen: set[str] = set()
        while current in bindings and current not in seen:
            seen.add(current)
            next_value = bindings[current]
            if next_value == current:
                break
            current = next_value
        return current

    def resolved_dotted_name(node: ast.AST) -> str:
        if isinstance(node, ast.Name):
            return resolve_name(node.id)
        if isinstance(node, ast.Attribute):
            parent = resolved_dotted_name(node.value)
            return (parent + "." if parent else "") + node.attr
        return ""

    def assignment_target_name(node: ast.AST) -> str | None:
        parent = parents.get(node)
        if isinstance(parent, ast.Assign):
            if (
                parent.value is node
                and len(parent.targets) == 1
                and isinstance(parent.targets[0], ast.Name)
            ):
                return parent.targets[0].id
        if (
            isinstance(parent, ast.AnnAssign)
            and parent.value is node
            and isinstance(parent.target, ast.Name)
        ):
            return parent.target.id
        return None

    def safe_reviewed_cdll_call(node: ast.Call) -> bool:
        return (
            resolved_dotted_name(node.func) == "ctypes.CDLL"
            and len(node.args) == 1
            and isinstance(node.args[0], ast.Constant)
            and node.args[0].value is None
            and len(node.keywords) == 1
            and node.keywords[0].arg == "use_errno"
            and isinstance(node.keywords[0].value, ast.Constant)
            and node.keywords[0].value.value is True
            and assignment_target_name(node) == "libc"
        )

    def safe_reviewed_getattr_call(node: ast.Call) -> bool:
        return (
            resolved_dotted_name(node.func) == "getattr"
            and len(node.args) == 3
            and not node.keywords
            and resolved_dotted_name(node.args[0]) == "libc"
            and isinstance(node.args[1], ast.Constant)
            and node.args[1].value == "renameat2"
            and isinstance(node.args[2], ast.Constant)
            and node.args[2].value is None
            and assignment_target_name(node) == "fn"
        )

    # Bind only the two reviewed dynamic-call handles. Any other CDLL/getattr
    # result is rejected by the call guard below.
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        chain = resolved_dotted_name(node.func)
        target = assignment_target_name(node)
        if chain == "ctypes.CDLL" and safe_reviewed_cdll_call(node):
            bindings["libc"] = "libc"
        elif chain == "getattr" and safe_reviewed_getattr_call(node):
            bindings["fn"] = "libc.renameat2"
        elif target in {"libc", "fn"}:
            violations.append("reviewed_dynamic_binding_reassigned:" + target)

    def authority_alias_origin(value: str) -> bool:
        if not value:
            return False
        root = value.split(".", 1)[0]
        return (
            root in allowed_imports
            or root == "libc"
            or value in forbidden_builtin_calls
            or value == "getattr"
        )

    # Resolve only authority-bearing callable/module aliases. Ordinary state
    # variables may legitimately take different constant values in different
    # branches; tracking those globally creates meaningless alias cycles.
    for _ in range(32):
        changed = False
        for node in ast.walk(tree):
            value: ast.AST | None = None
            target: str | None = None
            if (
                isinstance(node, ast.Assign)
                and len(node.targets) == 1
                and isinstance(node.targets[0], ast.Name)
            ):
                target = node.targets[0].id
                value = node.value
            elif (
                isinstance(node, ast.AnnAssign)
                and isinstance(node.target, ast.Name)
                and node.value is not None
            ):
                target = node.target.id
                value = node.value
            if target is None or value is None:
                continue
            if isinstance(value, (ast.Name, ast.Attribute)):
                canonical = resolved_dotted_name(value)
                if not authority_alias_origin(canonical):
                    continue
                prior = bindings.get(target)
                if prior is None:
                    bindings[target] = canonical
                    changed = True
                elif prior != canonical:
                    violations.append(
                        "ambiguous_authority_alias_binding:"
                        + target + ":" + prior + ":" + canonical
                    )
        if not changed:
            break
    else:
        violations.append("authority_alias_resolution_did_not_converge")

    def call_path_is_sensitive(value: str) -> bool:
        folded = value.casefold()
        parts = [part for part in folded.split(".") if part]
        compact_parts = [normalized_identifier(part) for part in parts]
        if any(
            "privatekey" in part
            or "signingkey" in part
            or "wallet" in part
            or "signer" in part
            for part in compact_parts
        ):
            return True
        if any(part in signing_constructor_names for part in compact_parts):
            return True
        if compact_parts and compact_parts[-1] in signing_call_names:
            return True
        if "account" in compact_parts and any(
            part in {"fromkey", *signing_call_names}
            for part in compact_parts
        ):
            return True
        return False

    ctypes_loader_prefixes = (
        "ctypes.CDLL",
        "ctypes.PyDLL",
        "ctypes.WinDLL",
        "ctypes.OleDLL",
        "ctypes.LibraryLoader",
        "ctypes.cdll",
        "ctypes.pydll",
        "ctypes.windll",
        "ctypes.oledll",
        "ctypes.pythonapi",
    )

    def ctypes_reference_is_loader(value: str) -> bool:
        return any(
            value == prefix or value.startswith(prefix + ".")
            for prefix in ctypes_loader_prefixes
        )

    def alias_binding_is_high_risk(value: str) -> bool:
        folded_parts = [
            normalized_identifier(part)
            for part in value.casefold().split(".")
            if part
        ]
        terminal = folded_parts[-1] if folded_parts else ""
        if value in forbidden_builtin_calls or value == "getattr":
            return True
        if ctypes_reference_is_loader(value):
            return True
        if folded_parts and folded_parts[0] == "os":
            if terminal in forbidden_os_call_names:
                return True
        if terminal == "open" and value != "os.open":
            return True
        if folded_parts and folded_parts[0] == "libc":
            return value != "libc.renameat2"
        return call_path_is_sensitive(value)

    def assignment_value(node: ast.AST) -> ast.AST | None:
        if isinstance(node, ast.Assign):
            return node.value
        if isinstance(node, ast.AnnAssign):
            return node.value
        if isinstance(node, ast.NamedExpr):
            return node.value
        return None

    def assignment_target_names(node: ast.AST) -> list[str]:
        raw_targets: list[ast.AST] = []
        if isinstance(node, ast.Assign):
            raw_targets.extend(node.targets)
        elif isinstance(node, ast.AnnAssign):
            raw_targets.append(node.target)
        elif isinstance(node, ast.NamedExpr):
            raw_targets.append(node.target)
        names: list[str] = []
        for target in raw_targets:
            for item in ast.walk(target):
                if isinstance(item, ast.Name):
                    names.append(item.id)
        return sorted(set(names))

    for node in ast.walk(tree):
        if not isinstance(node, (ast.Assign, ast.AnnAssign, ast.NamedExpr)):
            continue
        value = assignment_value(node)
        if value is None:
            continue

        # The only approved dynamic assignments are the exact retained libc
        # handle and its exact renameat2 function pointer.
        if isinstance(value, ast.Call) and (
            safe_reviewed_cdll_call(value)
            or safe_reviewed_getattr_call(value)
        ):
            continue

        targets = assignment_target_names(node)
        for child in ast.walk(value):
            if not isinstance(child, (ast.Name, ast.Attribute)):
                continue
            canonical = resolved_dotted_name(child)
            if not alias_binding_is_high_risk(canonical):
                continue
            violations.append(
                "authority_reference_in_assignment:"
                + (",".join(targets) if targets else "<unknown>")
                + ":" + canonical
            )

        if isinstance(value, (ast.Name, ast.Attribute)):
            canonical = resolved_dotted_name(value)
            if canonical == "libc.renameat2" and targets != ["fn"]:
                violations.append(
                    "unreviewed_renameat2_alias_binding:"
                    + (",".join(targets) if targets else "<unknown>")
                )

    def high_risk_call_violation(node: ast.Call) -> str | None:
        chain = resolved_dotted_name(node.func)
        if chain in forbidden_builtin_calls:
            return "forbidden_builtin_call:" + chain
        if chain == "getattr":
            if not safe_reviewed_getattr_call(node):
                return "unreviewed_getattr_call"
            return None
        if chain == "ctypes.CDLL":
            if not safe_reviewed_cdll_call(node):
                return "unreviewed_ctypes_cdll_call"
            return None
        if chain == "ctypes.get_errno":
            return None
        if chain.startswith("ctypes."):
            return "unreviewed_ctypes_call:" + chain
        if not chain:
            if (
                isinstance(node.func, ast.Attribute)
                and isinstance(node.func.value, ast.Call)
                and resolved_dotted_name(node.func.value.func) == "ctypes.CDLL"
            ):
                return "call_from_unreviewed_dynamic_cdll"
            return None
        folded_parts = [
            normalized_identifier(part)
            for part in chain.casefold().split(".")
            if part
        ]
        terminal = folded_parts[-1] if folded_parts else ""
        if folded_parts and folded_parts[0] == "os":
            if terminal in forbidden_os_call_names:
                return "forbidden_os_process_call:" + chain
        if terminal == "open" and chain != "os.open":
            return "unreviewed_file_open_call:" + chain
        if folded_parts and folded_parts[0] == "libc" and chain != "libc.renameat2":
            return "unreviewed_libc_call:" + chain
        return None

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name not in allowed_imports:
                    violations.append("unreviewed_import:" + alias.name)
                if import_path_is_sensitive(alias.name):
                    violations.append("sensitive_import:" + alias.name)
        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            allowed_names = allowed_from_imports.get(module)
            if allowed_names is None:
                violations.append("unreviewed_import_from:" + module)
            for alias in node.names:
                if allowed_names is None or alias.name not in allowed_names:
                    violations.append(
                        "unreviewed_import_name:" + module + ":" + alias.name
                    )
                if identifier_is_sensitive(alias.name):
                    violations.append("sensitive_import_name:" + alias.name)
            if import_path_is_sensitive(module):
                violations.append("sensitive_import_from:" + module)
        elif isinstance(node, ast.Name):
            if identifier_is_sensitive(node.id):
                violations.append("name:" + node.id)
        elif isinstance(node, ast.Attribute):
            chain = resolved_dotted_name(node)
            if identifier_is_sensitive(node.attr) or call_path_is_sensitive(chain):
                violations.append("attribute:" + chain)
        elif isinstance(node, ast.Call):
            chain = resolved_dotted_name(node.func)
            high_risk = high_risk_call_violation(node)
            if high_risk is not None:
                violations.append(high_risk)
            if chain and call_path_is_sensitive(chain):
                violations.append("call:" + chain)
            elif isinstance(node.func, ast.Name) and identifier_is_sensitive(
                node.func.id
            ):
                violations.append("call_name:" + node.func.id)

    return sorted(set(violations))


source_authority_violations = executable_key_wallet_authority_violations(source)
assert source_authority_violations == [], source_authority_violations
for safe_authority_literal in (
    'print("private_key_access=false")',
    'print("wallet_or_signer_access=false")',
):
    assert executable_key_wallet_authority_violations(
        safe_authority_literal
    ) == []

for unsafe_authority_source in (
    "private_key = object()",
    "wallet.sign(b'payload')",
    "wallet.sign_transaction({})",
    "import eth_account",
    "from eth_account import Account\nAccount.from_key(b'key')",
    "import web3",
    (
        "from nacl.signing import SigningKey\n"
        "key = SigningKey(b'0' * 32)\n"
        "key.sign(b'payload')"
    ),
    (
        "import nacl.bindings\n"
        "secret_key = b'0' * 64\n"
        "nacl.bindings.crypto_sign(b'payload', secret_key)"
    ),
    (
        "from nacl import bindings\n"
        "bindings.crypto_sign(b'payload', b'0' * 64)"
    ),
    "class K:\n    def sign(self, value): return value\nkey = K()\nkey.sign(b'x')",
    (
        "from cryptography.hazmat.primitives.asymmetric import ed25519\n"
        "key = ed25519.Ed25519PrivateKey.generate()\n"
        "key.sign(b'payload')"
    ),
    'import os\nos.system("/usr/bin/openssl pkeyutl -sign -inkey /run/secret/key")',
    'import os\nos.posix_spawn("/usr/bin/true", ["/usr/bin/true"], {})',
    'open("/run/credentials/key", "rb").read()',
    '__import__("subprocess").run(["/usr/bin/true"])',
    'import os\ngetattr(os, "system")("/usr/bin/true")',
    'import ctypes\nctypes.CDLL("/tmp/unreviewed.so")',
    'eval("1+1")',
    'import os as p\np.system("id")',
    'reader = open\nreader("/run/credentials/key", "rb").read()',
    (
        'import ctypes\n'
        'lib = ctypes.CDLL(None, use_errno=True)\n'
        'lib.system(b"id")'
    ),
    'import os\nrunner = os.system\nrunner("id")',
    'loader = __import__\nloader("subprocess")',
    (
        'import ctypes\n'
        'libc = ctypes.CDLL(None, use_errno=True)\n'
        'system = libc.system\n'
        'system(b"id")'
    ),
    (
        'import ctypes\n'
        'libc = ctypes.CDLL(None, use_errno=True)\n'
        'fn = getattr(libc, "renameat2", None)\n'
        'alias = fn\n'
        'alias(1, b"a", 1, b"b", 1)'
    ),
    'import ctypes\nctypes.cdll.LoadLibrary("/tmp/unreviewed.so")',
    'import ctypes\nctypes.pythonapi.PyRun_SimpleString(b"print(1)")',
    'import os\nrunner, = (os.system,)\nrunner("id")',
    'import os\nrunner = [os.system][0]\nrunner("id")',
    'import os\n(runner := os.system)("id")',
):
    assert executable_key_wallet_authority_violations(
        unsafe_authority_source
    ), unsafe_authority_source


assert executable_key_wallet_authority_violations(
    (
        "import ctypes\n"
        "libc = ctypes.CDLL(None, use_errno=True)\n"
        "fn = getattr(libc, \"renameat2\", None)\n"
        "fn(1, b'a', 1, b'b', 1)\n"
    )
) == []


def production_content_read_callsite_fingerprint(
    source_text: str,
) -> dict[str, int]:
    parsed = ast.parse(source_text)
    parents = {
        child: parent
        for parent in ast.walk(parsed)
        for child in ast.iter_child_nodes(parent)
    }

    def enclosing_function(node: ast.AST) -> str:
        current: ast.AST | None = node
        while current is not None:
            if isinstance(current, (ast.FunctionDef, ast.AsyncFunctionDef)):
                return current.name
            current = parents.get(current)
        return "<module>"

    def dotted(node: ast.AST) -> str:
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            parent = dotted(node.value)
            return (parent + "." if parent else "") + node.attr
        return ""

    counts: dict[str, int] = {}
    for node in ast.walk(parsed):
        if not isinstance(node, ast.Call):
            continue
        fn = enclosing_function(node)
        if fn == "self_test":
            continue
        chain = dotted(node.func)
        kind: str | None = None
        if chain in {
            "os.open",
            "os.read",
            "os.pread",
            "os.readv",
            "os.preadv",
            "os.fdopen",
        }:
            kind = chain
        elif isinstance(node.func, ast.Attribute) and node.func.attr in {
            "open",
            "read_bytes",
            "read_text",
        }:
            kind = "method." + node.func.attr
        if kind is None:
            continue
        key = fn + ":" + kind
        counts[key] = counts.get(key, 0) + 1
    return dict(sorted(counts.items()))


EXPECTED_PRODUCTION_CONTENT_READ_CALLS = {
    "_create_exact_stage:os.open": 1,
    "_create_exact_stage:os.read": 1,
    "_direct_repo_bytes:method.read_bytes": 1,
    "_file_digest:os.open": 1,
    "_file_digest:os.read": 2,
    "_open_protected_root:os.open": 2,
    "read_exact_candidate:os.open": 1,
    "read_exact_candidate:os.read": 2,
}

assert (
    production_content_read_callsite_fingerprint(source)
    == EXPECTED_PRODUCTION_CONTENT_READ_CALLS
)

for credential_read_adversary in (
    (
        "import pathlib\n"
        "def added_read():\n"
        "    return pathlib.Path('/run/credentials/key').read_bytes()\n"
    ),
    (
        "import os\n"
        "def added_read():\n"
        "    fd = os.open('/run/credentials/key', os.O_RDONLY)\n"
        "    try:\n"
        "        return os.read(fd, 32)\n"
        "    finally:\n"
        "        os.close(fd)\n"
    ),
):
    observed = production_content_read_callsite_fingerprint(
        source + "\n" + credential_read_adversary
    )
    assert observed != EXPECTED_PRODUCTION_CONTENT_READ_CALLS


for forbidden in (
    "systemctl",
    "service restart",
    "eth_sendRawTransaction",
    "eth_sendTransaction",
    "ATOMIC_EXCHANGE_ACCEPTED_CREDENTIAL_QUERY_V1_TO_V2",
    "ATOMIC_EXCHANGE_ROLLBACK_CREDENTIAL_QUERY_V2_TO_V1",
):
    assert forbidden not in source, forbidden

self_test = run(
    "/usr/bin/python3", "-I", "-B", str(ROOT / SOURCE), "--self-test"
).stdout
for line in (
    "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_REPLACE_V3R_SELF_TEST_GREEN",
    "renameat2_exchange_available=true",
    "preexec_replacement=false",
    "v1_predecessor_preserved_after_success=true",
    "v2_predecessor_retained_after_success=true",
    "automatic_failure_rollback=true",
    "foreign_stage_cleanup_rejected=true",
    "current_invocation_stage_inode_bound=true",
    "operation_directory_lock_required=true",
    "crash_state_classifier_complete=true",
    "apply_crash_resume_supported=true",
    "rollback_crash_resume_supported=true",
    "operation_lock_exclusivity_exercised=true",
    "crash_transition_primitives_exercised=true",
    "stable_parent_operation_lock=true",
    "descriptor_bound_state_inspection=true",
    "private_stage_published_only_after_complete=true",
    "visible_install_root_generation_revalidation=true",
    "pre_mutation_authority_boundary=true",
    "apply_authority_boundary_pre_mutation=true",
    "rollback_authority_boundary_pre_mutation=true",
    "pre_mutation_authority_flush_required=true",
    "query_execution=false",
    "credential_contents_read=false",
):
    assert line in self_test.splitlines(), line

source_plan = run(
    "/usr/bin/python3", "-I", "-B", str(ROOT / SOURCE), "--source-plan"
).stdout
for line in (
    "accepted_lock_id=voidbuyumqcredelflock3r_8b064214e22ce54ac193b426f38b9d6a7ea4cee07b38b68c8d1eeb6c51de6f34",
    "installed_predecessor_lock_id=voidbuyumqcredelflock2_c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54",
    "source_only=true",
    "host_read=false",
    "host_write=false",
    "preexec_replacement=false",
    "v1_predecessor_required=true",
    "v1_predecessor_preserved_after_success=true",
    "v2_predecessor_retained_after_success=true",
    "query_atomic_exchange_required=true",
    "automatic_failure_rollback=true",
    "operation_directory_lock_required=true",
    "stable_parent_operation_lock_required=true",
    "descriptor_bound_state_inspection_required=true",
    "private_stage_publication_required=true",
    "visible_install_root_generation_revalidation_required=true",
    "crash_state_classification_required=true",
    "apply_crash_resume_supported=true",
    "rollback_crash_resume_supported=true",
    "query_execution=false",
    "credential_contents_read=false",
    "service_mutation=false",
    "systemd_mutation=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "wc_void_market_activation=false",
    "transaction=false",
    "funds_movement=false",
):
    assert line in source_plan.splitlines(), line

main_at = source.index("def main() -> int:")
apply_emit_at = source.index('emit_operation_authority("apply")', main_at)
apply_call_at = source.index("apply(args.query, args.confirm)", apply_emit_at)
rollback_emit_at = source.index('emit_operation_authority("rollback")', apply_call_at)
rollback_call_at = source.index("rollback(args.confirm)", rollback_emit_at)
assert apply_emit_at < apply_call_at
assert rollback_emit_at < rollback_call_at
authority_fn_at = source.index("def emit_operation_authority(mode: str) -> None:")
authority_flush_at = source.index("sys.stdout.flush()", authority_fn_at)
source_plan_at = source.index("def source_plan() -> None:", authority_flush_at)
assert authority_fn_at < authority_flush_at < source_plan_at

module = types.ModuleType("v3r_authority_flush_probe")
module.__file__ = str(ROOT / SOURCE)
module.__package__ = ""
exec(compile(source, str(ROOT / SOURCE), "exec", dont_inherit=True), module.__dict__)

class FlushProbe:
    def __init__(self) -> None:
        self.parts: list[str] = []
        self.events: list[tuple[str, str]] = []
        self.flush_count = 0
    def write(self, text: str) -> int:
        self.parts.append(text)
        self.events.append(("write", text))
        return len(text)
    def flush(self) -> None:
        self.flush_count += 1
        self.events.append(("flush", "".join(self.parts)))

probe = FlushProbe()
saved_stdout = sys.stdout
try:
    sys.stdout = probe
    module.emit_operation_authority("apply")
finally:
    sys.stdout = saved_stdout
assert probe.flush_count == 1
probe_lines = "".join(probe.parts).splitlines()
flush_events = [event for event in probe.events if event[0] == "flush"]
assert len(flush_events) == 1
flushed_lines = flush_events[0][1].splitlines()
assert flushed_lines == probe_lines
assert probe.events[-1][0] == "flush"
assert probe_lines[0] == "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_REPLACE_V3R"
assert probe_lines[1] == "mode=apply"
assert probe_lines[2] == "authority_boundary=PRE_MUTATION"
for flushed_required in (
    "filesystem_mutation_possible=true",
    "filesystem_mutation_performed=false",
    "protected_root_opened=false",
    "query_execution=false",
    "credential_contents_read=false",
    "service_mutation=false",
    "systemd_mutation=false",
    "private_key_access=false",
    "wallet_or_signer_access=false",
    "transaction=false",
    "payment_acceptance=false",
    "public_presale_activation=false",
    "wc_void_market_activation=false",
    "treasury_liquidity_action=false",
    "funds_movement=false",
    "production_host_evidence_authority=false",
):
    assert flushed_required in flushed_lines

for mode_name, argv, expected_reason in (
    (
        "apply",
        (
            "--apply",
            "--query",
            "/definitely/not/a/real/v3-query-candidate",
            "--confirm",
            "wrong-confirmation",
        ),
        "explicit_atomic_exchange_confirmation_required",
    ),
    (
        "rollback",
        ("--rollback", "--confirm", "wrong-confirmation"),
        "explicit_rollback_confirmation_required",
    ),
):
    held = run_unchecked(
        "/usr/bin/python3", "-I", "-B", str(ROOT / SOURCE), *argv
    )
    assert held.returncode == 2, held.stderr
    lines = held.stdout.splitlines()
    assert lines[0] == "VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_REPLACE_V3R"
    assert lines[1] == "mode=" + mode_name
    assert lines[2] == "authority_boundary=PRE_MUTATION"
    for required in (
        "filesystem_mutation_possible=true",
        "filesystem_mutation_performed=false",
        "protected_root_opened=false",
        "query_execution=false",
        "credential_contents_read=false",
        "service_mutation=false",
        "systemd_mutation=false",
        "private_key_access=false",
        "wallet_or_signer_access=false",
        "transaction=false",
        "payment_acceptance=false",
        "public_presale_activation=false",
        "wc_void_market_activation=false",
        "treasury_liquidity_action=false",
        "funds_movement=false",
        "production_host_evidence_authority=false",
    ):
        assert required in lines, (mode_name, required)
    hold_at = lines.index("status=HOLD")
    boundary_at = lines.index("authority_boundary=PRE_MUTATION")
    assert boundary_at < hold_at
    assert "reason=" + expected_reason in lines

print("VOID_BUY_VOID_USER_MANAGER_CREDENTIAL_QUERY_PROTECTED_REPLACE_V3R_PROOF_GREEN")
print("source_blob=98f8b9fda89e33c50e19008268d97655aad54e6d")
print("accepted_lock_blob=c4870f3178aebc9a0bb6557562f663b8480cfefa")
print("accepted_lock_id=voidbuyumqcredelflock3r_8b064214e22ce54ac193b426f38b9d6a7ea4cee07b38b68c8d1eeb6c51de6f34")
print("installed_predecessor_lock_id=voidbuyumqcredelflock2_c05afb1a6fbd44a00d4f220652e87ee099e0456992a17a6ae7b60bda9229cf54")
print("preexec_replacement=false")
print("v1_predecessor_preserved_after_success=true")
print("v2_predecessor_retained_after_success=true")
print("query_atomic_exchange_required=true")
print("automatic_failure_rollback=true")
print("foreign_stage_cleanup_rejected=true")
print("current_invocation_stage_inode_bound=true")
print("operation_directory_lock_required=true")
print("crash_state_classifier_complete=true")
print("apply_crash_resume_supported=true")
print("rollback_crash_resume_supported=true")
print("operation_lock_exclusivity_exercised=true")
print("crash_transition_primitives_exercised=true")
print("stable_parent_operation_lock=true")
print("descriptor_bound_state_inspection=true")
print("private_stage_published_only_after_complete=true")
print("visible_install_root_generation_revalidation=true")
print("pre_mutation_authority_boundary=true")
print("apply_authority_boundary_pre_mutation=true")
print("rollback_authority_boundary_pre_mutation=true")
print("pre_mutation_authority_flush_required=true")
print("authority_flush_behavior_exercised=true")
print("authority_flush_complete_summary_exercised=true")
print("ast_key_wallet_authority_guard=true")
print("ast_key_wallet_adversaries_exercised=true")
print("closed_import_allowlist_guard=true")
print("nacl_bindings_signing_adversary_exercised=true")
print("high_risk_call_guard=true")
print("process_dynamic_authority_adversaries_exercised=true")
print("alias_resolved_high_risk_call_guard=true")
print("callable_alias_adversaries_exercised=true")
print("ordinary_state_aliases_excluded_from_authority_resolution=true")
print("reviewed_libc_renameat2_binding_only=true")
print("all_ctypes_calls_closed=true")
print("destructured_authority_aliases_rejected=true")
print("production_read_callsite_fingerprint_bound=true")
print("credential_read_adversaries_exercised=true")
print("ast_signing_key_authority_guard=true")
print("ast_generic_sign_call_adversary_exercised=true")
print("query_execution=false")
print("credential_contents_read=false")
print("service_mutation=false")
print("systemd_mutation=false")
print("payment_acceptance=false")
print("public_presale_activation=false")
print("wc_void_market_activation=false")
print("transaction=false")
print("funds_movement=false")
print("production_host_evidence_authority=false")
