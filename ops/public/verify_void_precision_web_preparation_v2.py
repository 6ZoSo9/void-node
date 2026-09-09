#!/usr/bin/env python3
"""Verify a complete, commit-bound website bundle; optionally observe Precision.

Trusted OS/operator/tools. No hostile same-UID execution-custody claim. Receipt
bytes require an external digest. Git witnesses bind payload blobs to the
explicit commit; the receipt cannot invent a different source generation.
"""
import argparse
import base64
import hashlib
from html.parser import HTMLParser
import http.client
import json
import os
from pathlib import Path
import re
import signal
import socket
import stat
import subprocess
import sys
from urllib.parse import urljoin, urlsplit

MARKER = "VOID_PRECISION_WEB_PREPARATION_V2"
PREPARER = "ops/public/prepare_void_precision_web_recovery_v2.py"
VERIFIER = "ops/public/verify_void_precision_web_preparation_v2.py"
ENTRIES = ["ops/public/public-seed-adapter-v1.mjs",
           "ops/public/void-public-app-composition-gateway-v1.mjs",
           "ops/public/void-public-frontdoor-v1.mjs"]
PAYLOAD = [*ENTRIES, PREPARER, VERIFIER,
           "ops/public/void_public_frontdoor_cutover_v2.py",
           "tools/wc-public-response-teardown-v1.mjs",
           "public/void-public-frontdoor-v1/index.html",
           "public/public-node/datanet/field-replication-status-card-v1.json",
           "public/public-node/datanet/field-replication-status-card-v1.html",
           "public/public-node/datanet/index.json",
           "ops/mainnet0/wc-public-earning-participant-v1.sh",
           "ops/mainnet0/wc-public-ticket-claim-v1.sh",
           "tools/void_public_earn_no_node_client_v1.mjs"]
AUTHORITY = {k: False for k in ["installed", "service_changed", "funnel_changed",
             "dns_changed", "packages_installed", "deployed", "funds_action",
             "independent_acceptance", "public_reachability_proven"]}


def require(value, reason):
    if not value:
        raise RuntimeError(reason)


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()


def sha(data):
    return hashlib.sha256(data).hexdigest()


def strict_json(data):
    require(len(data) <= 4 * 1024 * 1024, "JSON size limit")
    def pairs(items):
        result = {}
        for key, value in items:
            require(key not in result, "duplicate JSON field")
            result[key] = value
        return result
    return json.loads(data, object_pairs_hook=pairs,
                      parse_constant=lambda value: require(False, "nonfinite JSON"))


def git_hash(kind, data):
    return hashlib.sha1(kind.encode() + b" " + str(len(data)).encode() + b"\0" + data).hexdigest()


def tree_entries(data):
    require(len(data) <= 1048576, "Git tree size limit")
    result = {}
    position = 0
    while position < len(data):
        space = data.index(b" ", position)
        nul = data.index(b"\0", space)
        mode, name = data[position:space].decode(), data[space + 1:nul].decode()
        require(name not in result and name not in ("", ".", "..") and "/" not in name
                and nul + 21 <= len(data) and len(result) < 10000, "invalid Git tree member")
        result[name] = (mode, data[nul + 1:nul + 21].hex())
        position = nul + 21
    return result


def source_members(proof, head):
    require(set(proof) == {"commit", "trees"} and re.fullmatch(r"[a-f0-9]{40}", head), "invalid source proof")
    raw = base64.b64decode(proof["commit"], validate=True)
    require(git_hash("commit", raw) == head, "commit witness mismatch")
    first = raw.split(b"\n", 1)[0].decode()
    require(re.fullmatch(r"tree [a-f0-9]{40}", first), "invalid commit tree")
    tree = first[5:]
    used, members = set(), {}
    require(isinstance(proof["trees"], dict) and len(proof["trees"]) <= 32, "tree witness limit")
    for path in PAYLOAD:
        current = tree
        for index, component in enumerate(path.split("/")):
            data = base64.b64decode(proof["trees"][current], validate=True)
            require(git_hash("tree", data) == current, "tree witness mismatch")
            used.add(current)
            mode, blob = tree_entries(data)[component]
            if index < len(path.split("/")) - 1:
                require(mode in ("40000", "040000"), "source ancestor is not a tree")
                current = blob
            else:
                require(mode in ("100644", "100755"), "source member is not a regular blob")
                members[path] = {"blob": blob, "mode": "0755" if mode == "100755" else "0644"}
    require(used == set(proof["trees"]), "extra tree witness")
    return tree, members


def safe_directory(path, create=False):
    path = Path(path)
    require(path.is_absolute() and re.fullmatch(r"/[A-Za-z0-9_./+-]+", str(path))
            and ".." not in path.parts, "unsafe absolute path")
    fd = os.open("/", os.O_RDONLY | os.O_DIRECTORY)
    try:
        for component in path.parts[1:]:
            try:
                child = os.open(component, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            except FileNotFoundError:
                require(create, "missing directory")
                os.mkdir(component, 0o700, dir_fd=fd)
                child = os.open(component, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            os.close(fd)
            fd = child
            s = os.fstat(fd)
            require(s.st_uid in (0, os.getuid()) and not s.st_mode & 0o022, "foreign-writable ancestor: " + str(path))
        return path
    finally:
        os.close(fd)


def read_fd(fd, limit):
    before = os.fstat(fd)
    require(stat.S_ISREG(before.st_mode) and before.st_nlink == 1 and before.st_size <= limit,
            "invalid regular file or size")
    data = bytearray()
    for _ in range(limit // 65536 + 2):
        chunk = os.read(fd, min(65536, limit + 1 - len(data)))
        if not chunk:
            break
        data.extend(chunk)
        require(len(data) <= limit, "file grew beyond limit")
    else:
        raise RuntimeError("file read work limit")
    after = os.fstat(fd)
    identity = lambda s: (s.st_dev, s.st_ino, s.st_uid, s.st_gid, s.st_mode, s.st_size, s.st_mtime_ns, s.st_ctime_ns, s.st_nlink)
    require(identity(before) == identity(after) and len(data) == before.st_size, "file changed during read")
    return bytes(data)


def read_path(path, limit=1048576):
    safe_directory(Path(path).parent)
    fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    try:
        s = os.fstat(fd)
        require(s.st_uid in (0, os.getuid()) and not s.st_mode & 0o022, "unsafe file ownership/mode")
        return read_fd(fd, limit)
    finally:
        os.close(fd)


def inventory(bundle):
    safe_directory(bundle)
    rows, files = [], {}
    def walk(fd, relative, depth):
        require(depth <= 12 and len(rows) < 128, "inventory bound")
        s = os.fstat(fd)
        require(s.st_uid == os.getuid() and not s.st_mode & 0o022, "bundle directory ownership/mode")
        rows.append({"path": relative or ".", "type": "directory", "mode": format(stat.S_IMODE(s.st_mode), "04o")})
        with os.scandir(fd) as stream:
            names = sorted(entry.name for entry in stream)
        require(len(names) <= 128, "directory member limit")
        for name in names:
            require(re.fullmatch(r"[A-Za-z0-9_.+-]+", name) and name not in (".", ".."), "invalid staged member")
            rel = relative + "/" + name if relative else name
            child = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
            try:
                item = os.fstat(child)
                require(item.st_uid == os.getuid() and not item.st_mode & 0o022, "bundle member ownership/mode")
                if stat.S_ISDIR(item.st_mode):
                    walk(child, rel, depth + 1)
                else:
                    data = read_fd(child, 4 * 1024 * 1024 if rel == "preparation-receipt.json" else 1048576)
                    row = {"path": rel, "type": "file", "mode": format(stat.S_IMODE(item.st_mode), "04o")}
                    if rel == "preparation-receipt.json":
                        row["content"] = "external_receipt_sha256"
                    else:
                        row.update(size=len(data), sha256=sha(data))
                    rows.append(row)
                    files[rel] = data
            finally:
                os.close(child)
        require(len(rows) <= 128, "inventory member limit")
    fd = os.open(bundle, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
    try:
        walk(fd, "", 0)
    finally:
        os.close(fd)
    return sorted(rows, key=lambda row: row["path"]), files


def unit_bytes(node, source, entry, name, settings):
    require(re.fullmatch(r"/[A-Za-z0-9_./+-]+", node), "unsafe Node path")
    lines = ["[Unit]", "Description=VOID Precision website recovery v2 " + name,
             "After=network-online.target", "", "[Service]", "Type=simple",
             "WorkingDirectory=" + str(source), "ExecStart=" + node + " " + str(source / entry)]
    lines += ['Environment="' + key + '=' + value + '"' for key, value in settings.items()]
    lines += ["UnsetEnvironment=NODE_OPTIONS NODE_PATH", "Restart=on-failure", "RestartSec=3",
              "KillMode=control-group", "TimeoutStopSec=10", "NoNewPrivileges=true", "PrivateTmp=true",
              "ProtectSystem=strict", "ProtectHome=read-only", "RestrictSUIDSGID=true",
              "LockPersonality=true", "RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6",
              "", "[Install]", "WantedBy=default.target", ""]
    return "\n".join(lines).encode()


def units(bundle, node, head):
    source = bundle / "source"
    settings = [
        {"VOID_ADAPTER_HOST": "127.0.0.1", "VOID_ADAPTER_PORT": "8080", "VOID_SEED_UPSTREAM": "http://127.0.0.1:4100", "VOID_EARN_COORDINATOR_UPSTREAM": ""},
        {"VOID_COMPOSITION_HOST": "127.0.0.1", "VOID_COMPOSITION_PORT": "8082", "VOID_NODE_UPSTREAM": "http://127.0.0.1:4100", "VOID_PUBLIC_GATEWAY_UPSTREAM": "http://127.0.0.1:8080", "VOID_AI_AGENT_GATEWAY_UPSTREAM": "", "VOID_OPERATOR_WEBHOOK_RECEIVER_UPSTREAM": "", "VOID_PUBLIC_NODE_LABEL": "Precision public website", "VOID_TXROOT_QUARANTINED": "1"},
        {"VOID_PUBLIC_FRONTDOOR_BIND": "127.0.0.1", "VOID_PUBLIC_FRONTDOOR_PORT": "8083", "VOID_PUBLIC_FRONTDOOR_UPSTREAM_PORT": "8082", "VOID_PUBLIC_FRONTDOOR_READ_ONLY": "1", "VOID_PUBLIC_FRONTDOOR_HOME": str(source / "public/void-public-frontdoor-v1/index.html")},
    ]
    return {"prepared-units/void-web-recovery-" + name + "-v2-" + head[:12] + ".service":
            unit_bytes(node, source, entry, name, env)
            for name, entry, env in zip(["adapter", "composition", "frontdoor"], ENTRIES, settings)}


def expected_manifest(payload, unit_files, members):
    rows = [{"path": "preparation-receipt.json", "type": "file", "mode": "0600", "content": "external_receipt_sha256"}]
    directories = {".": "0700", "source": "0755", "prepared-units": "0700"}
    for path, data in {**{"source/" + p: b for p, b in payload.items()}, **unit_files}.items():
        mode = members[path[7:]]["mode"] if path.startswith("source/") else "0600"
        rows.append({"path": path, "type": "file", "mode": mode, "size": len(data), "sha256": sha(data)})
        for parent in Path(path).parents:
            if str(parent) != ".":
                directories.setdefault(str(parent), "0755")
    rows.extend({"path": p, "type": "directory", "mode": mode} for p, mode in directories.items())
    return sorted(rows, key=lambda row: row["path"])


def command(args, timeout=15):
    env = {"PATH": "/usr/bin:/bin", "LANG": "C", "HOME": str(Path.home()),
           "XDG_RUNTIME_DIR": "/run/user/" + str(os.getuid()), "GIT_OPTIONAL_LOCKS": "0",
           "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": "/dev/null", "GIT_CONFIG_SYSTEM": "/dev/null",
           "GIT_NO_REPLACE_OBJECTS": "1", "GIT_TERMINAL_PROMPT": "0", "SYSTEMD_PAGER": "cat"}
    p = subprocess.run(args, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                       env=env, timeout=timeout, check=False)
    require(p.returncode == 0, Path(args[0]).name + " inspection failed (exit " + str(p.returncode) + ")")
    require(len(p.stdout) + len(p.stderr) <= 4 * 1024 * 1024, "command output limit")
    return p.stdout.decode().strip()


def node_identity(executable):
    path = Path(executable).resolve()
    data = read_path(path, 256 * 1024 * 1024)
    version = command([str(path), "--version"], 5)
    require(re.fullmatch(r"v(22|24|26)\.\d+\.\d+", version), "unsupported Node version")
    return {"executable": str(path), "version": version, "sha256": sha(data)}


def verify(bundle, head, receipt_sha):
    bundle = safe_directory(bundle)
    require(re.fullmatch(r"[a-f0-9]{64}", receipt_sha), "external receipt digest required")
    raw = read_path(bundle / "preparation-receipt.json", 4 * 1024 * 1024)
    require(sha(raw) == receipt_sha, "receipt digest mismatch")
    receipt = strict_json(raw)
    require(set(receipt) == {"marker", "source_head", "source_tree", "source_proof", "bundle", "profile",
            "preparer_sha256", "preflight_sha256", "node", "live_checkout", "live_head", "manifest",
            "manifest_sha256", "manual_permission_corrections", "authority"}, "receipt schema mismatch")
    require(receipt["marker"] == MARKER and receipt["source_head"] == head and receipt["bundle"] == str(bundle), "preparation generation mismatch")
    require(receipt["profile"] in ("artifact-only", "precision-host")
            and type(receipt["manual_permission_corrections"]) is int and receipt["manual_permission_corrections"] == 0
            and canonical(receipt["authority"]) == canonical(AUTHORITY), "invalid preparation authority")
    tree, members = source_members(receipt["source_proof"], head)
    require(tree == receipt["source_tree"], "source tree mismatch")
    observed, files = inventory(bundle)
    payload = {path: files["source/" + path] for path in PAYLOAD}
    for path, data in payload.items():
        require(git_hash("blob", data) == members[path]["blob"], "commit blob mismatch: " + path)
    require(sha(payload[PREPARER]) == receipt["preparer_sha256"]
            and sha(payload[VERIFIER]) == receipt["preflight_sha256"]
            and sha(read_path(Path(__file__).resolve())) == receipt["preflight_sha256"], "preparer/preflight identity mismatch")
    expected = expected_manifest(payload, units(bundle, receipt["node"]["executable"], head), members)
    require(observed == expected == receipt["manifest"] and sha(canonical(expected)) == receipt["manifest_sha256"], "complete mode/content manifest mismatch")
    require(node_identity(receipt["node"]["executable"]) == receipt["node"], "Node identity drift")
    for entry in [*ENTRIES, "tools/wc-public-response-teardown-v1.mjs"]:
        command([receipt["node"]["executable"], "--check", str(bundle / "source" / entry)])
    require(inventory(bundle)[0] == expected, "bundle changed during syntax checks")
    return receipt


def http_get(port, path, limit=1048576):
    require(port in (4100, 4112) and path.startswith("/") and len(path) <= 2048
            and not any(ord(c) < 32 or ord(c) == 127 for c in path), "invalid observation target")
    connection = http.client.HTTPConnection("127.0.0.1", port, timeout=4)
    def expired(signum, frame):
        raise TimeoutError("HTTP absolute deadline")
    old = signal.signal(signal.SIGALRM, expired)
    signal.setitimer(signal.ITIMER_REAL, 8)
    try:
        connection.request("GET", path, headers={"Accept-Encoding": "identity", "Connection": "close"})
        response = connection.getresponse()
        data = response.read(limit + 1)
        require(response.status == 200 and 0 < len(data) <= limit, "HTTP observation failed: " + str(port) + path)
        return {"port": port, "path": path, "status": response.status, "bytes": len(data),
                "sha256": sha(data), "content_type": response.getheader("Content-Type", "").lower()}, data
    finally:
        connection.close()
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, old)


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = {}

    def handle_starttag(self, tag, attributes):
        a = dict(attributes)
        style = tag == "link" and "stylesheet" in a.get("rel", "").split()
        ref = a.get("src") if tag == "script" else a.get("href") if style else None
        if ref is not None:
            url = urlsplit(urljoin("http://127.0.0.1:4100/app/", ref))
            require(url.scheme == "http" and url.netloc == "127.0.0.1:4100" and url.path.startswith("/app/")
                    and not url.fragment and len(self.paths) < 16, "app asset outside bounded origin")
            self.paths[url.path + ("?" + url.query if url.query else "")] = "css" if style else "javascript"


def observe_host(receipt):
    require(receipt["profile"] == "precision-host" and socket.gethostname().lower() == "zoso-precision-tower-7810"
            and str(Path.home()) == "/home/zoso" and os.getuid() != 0, "Precision host profile required")
    require(command(["/usr/bin/git", "-C", receipt["live_checkout"], "rev-parse", "HEAD"]) == receipt["live_head"], "live head drift")
    services = []
    names = ["void-node-live.service", *[Path(p).name for p in units(Path(receipt["bundle"]), receipt["node"]["executable"], receipt["source_head"])]]
    for name in names:
        out = command(["/usr/bin/systemctl", "--user", "show", name, "--property=Id,LoadState,ActiveState,SubState"])
        props = dict(line.split("=", 1) for line in out.splitlines() if "=" in line)
        require(set(props) == {"Id", "LoadState", "ActiveState", "SubState"}, "incomplete service state")
        require(props["Id"] == name, "service identity mismatch")
        require((props["LoadState"], props["ActiveState"], props["SubState"]) == (("loaded", "active", "running")
                if name == names[0] else ("not-found", "inactive", "dead")), "unexpected service state")
        services.append(props)
    listeners = command(["/usr/bin/ss", "-H", "-ltn"])
    require(not any(line.split()[3].rsplit(":", 1)[-1] in ("8080", "8082", "8083") for line in listeners.splitlines()), "recovery port occupied")
    command(["/usr/bin/systemd-analyze", "--user", "verify", *[str(Path(receipt["bundle"]) / p) for p in units(Path(receipt["bundle"]), receipt["node"]["executable"], receipt["source_head"])]], 20)
    item, html = http_get(4100, "/app/", 255 * 1024)
    require("text/html" in item["content_type"], "app is not HTML")
    observations = [item]
    parser = Assets()
    parser.feed(html.decode("utf-8"))
    parser.close()
    require(parser.paths, "app assets missing")
    for path, kind in parser.paths.items():
        item, _ = http_get(4100, path)
        require(kind in item["content_type"], "asset media type mismatch")
        observations.append(item)
    for port, path in [(4100, "/public-node/index.json"), (4100, "/public-node/datanet/"),
                       (4100, "/.well-known/void-agent-discovery.json"), (4112, "/.well-known/void-agent-discovery.json")]:
        item, data = http_get(port, path)
        if path.endswith(".json"):
            require("application/json" in item["content_type"] and isinstance(strict_json(data), dict), "public JSON representation invalid")
        else:
            require("text/html" in item["content_type"], "DataNet page is not HTML")
        observations.append(item)
    require(observations[-1]["sha256"] == observations[-2]["sha256"], "discovery views differ")
    require(command(["/usr/bin/git", "-C", receipt["live_checkout"], "rev-parse", "HEAD"]) == receipt["live_head"], "live head moved during observations")
    return {"services": services, "unit_syntax_passed": True, "recovery_ports_free": True,
            "http": observations, "browser_execution_proven": False, "authority": AUTHORITY}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", required=True, type=Path)
    parser.add_argument("--source-head", required=True)
    parser.add_argument("--receipt-sha256", required=True)
    parser.add_argument("--host-checks", action="store_true")
    args = parser.parse_args()
    receipt = verify(args.bundle, args.source_head, args.receipt_sha256)
    host = observe_host(receipt) if args.host_checks else None
    require(inventory(args.bundle)[0] == receipt["manifest"], "bundle changed during preflight")
    print(canonical({"marker": "VOID_PRECISION_WEB_PREFLIGHT_V2", "result": "PRECISION_HOST_OBSERVED_PASS" if host else "ARTIFACT_VERIFIED",
         "source_head": args.source_head, "source_tree": receipt["source_tree"], "receipt_sha256": args.receipt_sha256,
         "manifest_sha256": receipt["manifest_sha256"], "preparer_sha256": receipt["preparer_sha256"],
         "preflight_sha256": receipt["preflight_sha256"], "node": receipt["node"], "host": host, "authority": AUTHORITY}).decode())


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(canonical({"marker": "VOID_PRECISION_WEB_PREFLIGHT_V2", "result": "HOLD", "reason": str(error), "authority": AUTHORITY}).decode())
        raise SystemExit(2)
