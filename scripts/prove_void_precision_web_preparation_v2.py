#!/usr/bin/env python3
"""Real preparer -> bound verifier with local Git and three caller umasks.

No mocked permission gate/terminal and no host services or sockets. Fixture
setup and removal are outside measured natural preparation transactions.
"""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
PREPARER = "ops/public/prepare_void_precision_web_recovery_v2.py"
VERIFIER = "ops/public/verify_void_precision_web_preparation_v2.py"
spec = importlib.util.spec_from_file_location("preflight", ROOT / VERIFIER)
preflight = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preflight)


def check(value, message):
    if not value:
        raise AssertionError(message)


def run(args, expected=0, **kwargs):
    p = subprocess.run(args, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE,
                       stderr=subprocess.PIPE, timeout=120, check=False, **kwargs)
    check(p.returncode == expected, (args, p.returncode, p.stdout.decode(), p.stderr.decode()))
    return p.stdout


def runtime_bundle(node, bundle):
    # Execute only the staged runtime closure, with disposable synthetic node
    # upstream and ephemeral loopback ports. Never invoke prepared systemd units.
    script = r'''
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
const bundle = process.argv[1], source = path.join(bundle, 'source');
const children = [], exits = [];
const listen = s => new Promise((resolve, reject) => {
  s.once('error', reject); s.listen(0, '127.0.0.1', () => resolve(s.address().port));
});
const close = s => new Promise(resolve => { s.closeAllConnections(); s.close(resolve); });
const free = async () => { const s = http.createServer(); const p = await listen(s); await close(s); return p; };
const upstream = http.createServer((req, res) => {
  res.writeHead(200, {'content-type':'text/html; charset=utf-8'});
  res.end('<!doctype html><html><body>VOID_BUNDLE_SYNTHETIC_APP</body></html>');
});
const get = async (port, route) => {
  const r = await fetch(`http://127.0.0.1:${port}${route}`, {signal:AbortSignal.timeout(2000)});
  assert.equal(r.status, 200, route); return Buffer.from(await r.arrayBuffer());
};
try {
  const ports = [await free(), await free(), await free()], nodePort = await listen(upstream);
  for (const [index, name] of ['adapter','composition','frontdoor'].entries()) {
    const file = fs.readdirSync(path.join(bundle, 'prepared-units')).find(x => x.startsWith(`void-web-recovery-${name}-`));
    const lines = fs.readFileSync(path.join(bundle, 'prepared-units', file), 'utf8').split('\n');
    const env = {PATH:'/usr/bin:/bin', LANG:'C'};
    for (const line of lines) {
      const match = /^Environment="([A-Z0-9_]+)=(.*)"$/.exec(line);
      if (match) env[match[1]] = match[2];
    }
    for (const key of Object.keys(env)) {
      if (env[key] === 'http://127.0.0.1:4100') env[key] = `http://127.0.0.1:${nodePort}`;
      if (env[key] === 'http://127.0.0.1:8080') env[key] = `http://127.0.0.1:${ports[0]}`;
    }
    env[['VOID_ADAPTER_PORT','VOID_COMPOSITION_PORT','VOID_PUBLIC_FRONTDOOR_PORT'][index]] = String(ports[index]);
    if (index === 2) env.VOID_PUBLIC_FRONTDOOR_UPSTREAM_PORT = String(ports[1]);
    const command = lines.find(x => x.startsWith('ExecStart=')).slice(10).split(' ');
    const child = spawn(command[0], command.slice(1), {cwd:source, env, stdio:'ignore'});
    children.push(child);
    exits.push(new Promise(resolve => { child.once('error', resolve); child.once('exit', resolve); }));
  }
  const deadline = Date.now() + 10000;
  while (true) {
    try { await get(ports[2], '/app/'); break; }
    catch (error) {
      if (Date.now() > deadline || children.some(c => c.exitCode !== null)) throw error;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  assert.deepEqual(await get(ports[2], '/'), fs.readFileSync(path.join(source,'public/void-public-frontdoor-v1/index.html')));
  assert.match((await get(ports[2], '/app/')).toString(), /VOID_BUNDLE_SYNTHETIC_APP/);
  const routes = [
    ['/public-node/datanet/field-replication-status-card-v1.json', 'public/public-node/datanet/field-replication-status-card-v1.json'],
    ['/public-node/datanet/field-replication-status-card-v1.html', 'public/public-node/datanet/field-replication-status-card-v1.html'],
    ['/public-node/datanet/index.json', 'public/public-node/datanet/index.json'],
    ['/download/wc-public-earning-participant-v1.sh', 'ops/mainnet0/wc-public-earning-participant-v1.sh'],
    ['/download/wc-public-ticket-claim-v1.sh', 'ops/mainnet0/wc-public-ticket-claim-v1.sh'],
    ['/download/void-public-earn-no-node-client-v1.mjs', 'tools/void_public_earn_no_node_client_v1.mjs'],
  ];
  for (const [route, relative] of routes) assert.deepEqual(await get(ports[0], route), fs.readFileSync(path.join(source,relative)), route);
  console.log('staged runtime closure: three programs, homepage/app and six exact static/download bodies passed');
} finally {
  for (const child of children) child.kill('SIGTERM');
  const timer = setTimeout(() => { for (const child of children) child.kill('SIGKILL'); }, 1000);
  await Promise.all(exits); clearTimeout(timer);
  await close(upstream);
}
'''
    print(run([node, "--input-type=module", "-e", script, str(bundle)]).decode().strip(), flush=True)


def main():
    # Home avoids trusting /tmp's foreign-writable ancestor.
    with tempfile.TemporaryDirectory(prefix="void-preparation-proof-", dir=Path.home()) as tmp:
        base = Path(tmp)
        live, output = base / "live", base / "out"
        live.mkdir(mode=0o700)
        output.mkdir(mode=0o700)
        # Hosted tool caches can have group-writable ancestors. Preserve the
        # installed executable bytes in a private fixture, not a relaxed gate.
        bin_dir = base / "bin"
        bin_dir.mkdir(mode=0o700)
        shutil.copyfile(Path(shutil.which("node")).resolve(), bin_dir / "node")
        (bin_dir / "node").chmod(0o755)
        fixture_env = {**os.environ, "PATH": str(bin_dir) + os.pathsep + os.environ["PATH"]}
        for relative in preflight.PAYLOAD:
            dest = live / relative
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / relative, dest)
        git = shutil.which("git")
        run([git, "init", "--quiet", str(live)])
        run([git, "-C", str(live), "add", "--", *preflight.PAYLOAD])
        run([git, "-C", str(live), "-c", "user.name=VOID fixture", "-c", "user.email=fixture@invalid",
             "-c", "core.hooksPath=/dev/null", "commit", "--quiet", "-m", "Preparation source fixture"])
        live.chmod(0o775)  # read-only cache input, never an admitted runtime file
        head = run([git, "-C", str(live), "rev-parse", "HEAD"]).decode().strip()
        bundle = output / ("pr1373-" + head[:12])
        aggregate_path = output / (bundle.name + "-aggregate.json")
        prepare = [sys.executable, "-I", "-B", str(ROOT / PREPARER), "--prepare", "--source-head", head,
                   "--live-checkout", str(live), "--output-parent", str(output), "--artifact-only"]
        manifests, aggregates = [], []
        for mask in (0o002, 0o022, 0o077):
            terminal = json.loads(run(prepare, umask=mask, env=fixture_env).splitlines()[0])
            receipt_bytes = (bundle / "preparation-receipt.json").read_bytes()
            receipt = json.loads(receipt_bytes)
            aggregate = json.loads(aggregate_path.read_bytes())
            check(terminal["result"] == "ARTIFACT_VERIFIED", "natural artifact transaction failed")
            for data, field in [(receipt_bytes, "receipt_sha256"), (aggregate_path.read_bytes(), "aggregate_sha256")]:
                check(hashlib.sha256(data).hexdigest() == terminal[field], field + " binding")
            check(aggregate["fresh_bundle"] is True and aggregate["intervening_permission_correction"] is False
                  and receipt["manual_permission_corrections"] == 0, "not a fresh natural preparation")
            for path, field in [(PREPARER, "preparer_sha256"), (VERIFIER, "preflight_sha256")]:
                check(receipt[field] == hashlib.sha256((ROOT / path).read_bytes()).hexdigest(), field)
            check(aggregate["preflight"]["host"] is None and aggregate["authority"] == preflight.AUTHORITY,
                  "artifact observation promoted to host/activation")
            manifests.append(receipt["manifest"])
            aggregates.append(aggregate)
            if mask != 0o077:
                shutil.rmtree(bundle)
                aggregate_path.unlink()
        check(manifests[0] == manifests[1] == manifests[2], "caller umask changed admitted manifest")
        check(aggregates[0] == aggregates[1] == aggregates[2], "caller umask changed transaction aggregate")
        print("natural preparer -> bound preflight: umasks 0002/0022/0077 passed; identical complete manifests and aggregates", flush=True)
        original = receipt_bytes
        digest = hashlib.sha256(original).hexdigest()
        verify = [sys.executable, "-I", "-B", str(bundle / "source" / VERIFIER), "--bundle", str(bundle),
                  "--source-head", head, "--receipt-sha256", digest]
        snapshot = base / "snapshot"
        shutil.copytree(bundle, snapshot)
        cases = []

        def restore():
            shutil.rmtree(bundle)
            shutil.copytree(snapshot, bundle)

        def reject(name, mutation, renewed_receipt=False, arguments=None):
            restore()
            check(json.loads(run(verify))["result"] == "ARTIFACT_VERIFIED", "mutation baseline failed: " + name)
            mutation()
            call = list(verify if arguments is None else arguments)
            if renewed_receipt:
                call[call.index("--receipt-sha256") + 1] = hashlib.sha256((bundle / "preparation-receipt.json").read_bytes()).hexdigest()
            result = json.loads(run(call, expected=2))
            check(result["result"] == "HOLD", "mutation admitted: " + name)
            cases.append(name)

        def rewrite(change):
            record = json.loads(original)
            change(record)
            (bundle / "preparation-receipt.json").write_bytes(preflight.canonical(record) + b"\n")

        target = bundle / "source" / preflight.ENTRIES[0]
        unit = bundle / next(p["path"] for p in manifests[0] if p["path"].endswith(".service"))
        reject("missing payload", target.unlink)
        reject("extra file", lambda: (bundle / "extra").write_text("extra"))
        reject("extra directory", lambda: (bundle / "extra").mkdir())
        reject("source substitution", lambda: target.write_bytes(target.read_bytes() + b"\n// substituted\n"))
        reject("source mode drift", lambda: target.chmod(0o600))
        reject("group writable source", lambda: target.chmod(0o664))
        reject("directory mode drift", lambda: (bundle / "source").chmod(0o700))
        reject("receipt mode drift", lambda: (bundle / "preparation-receipt.json").chmod(0o644))
        reject("unit substitution", lambda: unit.write_bytes(unit.read_bytes() + b"# drift\n"))
        reject("payload symlink", lambda: (target.unlink(), target.symlink_to(snapshot / "source" / preflight.ENTRIES[0])))
        reject("directory symlink", lambda: (shutil.rmtree(bundle / "source/tools"),
                                               (bundle / "source/tools").symlink_to(snapshot / "source/tools", target_is_directory=True)))
        reject("special file", lambda: (target.unlink(), os.mkfifo(target, 0o600)))
        reject("hardlinked file", lambda: (target.unlink(), os.link(snapshot / "source" / preflight.ENTRIES[0], target)))
        reject("receipt digest substitution", lambda: (bundle / "preparation-receipt.json").write_bytes(original + b" "))
        for name, field, value in [("different source head", "source_head", "0" * 40),
                ("different source tree", "source_tree", "0" * 40),
                ("different preparer", "preparer_sha256", "0" * 64),
                ("different preflight", "preflight_sha256", "0" * 64),
                ("manual correction generation", "manual_permission_corrections", 1),
                ("V1 receipt generation", "marker", "VOID_PRECISION_WEB_PREPARATION_V1")]:
            reject(name, lambda: rewrite(lambda r: r.update({field: value})), True)
        reject("Node identity drift", lambda: rewrite(lambda r: r["node"].update(sha256="0" * 64)), True)
        reject("manifest omission", lambda: rewrite(lambda r: r["manifest"].pop()), True)
        reject("extra receipt claim", lambda: rewrite(lambda r: r.update(accepted=True)), True)
        reject("authority promotion", lambda: rewrite(lambda r: r["authority"].update(installed=True)), True)
        reject("artifact promoted to host", lambda: None, arguments=[*verify, "--host-checks"])

        def forged_source_and_manifest():
            target.write_bytes(target.read_bytes() + b"\n// attacker\n")
            def change(r):
                row = next(x for x in r["manifest"] if x["path"] == "source/" + preflight.ENTRIES[0])
                row.update(size=target.stat().st_size, sha256=hashlib.sha256(target.read_bytes()).hexdigest())
                r["manifest_sha256"] = hashlib.sha256(preflight.canonical(r["manifest"])).hexdigest()
            rewrite(change)
        reject("self-consistent forged source manifest", forged_source_and_manifest, True)
        reject("duplicate receipt JSON field", lambda: (bundle / "preparation-receipt.json").write_bytes(
            original.rstrip()[:-1] + b',"profile":"artifact-only"}\n'), True)
        restore()
        check(json.loads(run(verify))["result"] == "ARTIFACT_VERIFIED", "restored baseline failed")
        runtime_bundle(str(bin_dir / "node"), bundle)
        check(json.loads(run(verify))["result"] == "ARTIFACT_VERIFIED", "runtime fixture changed bundle")
        terminal = json.loads(run(prepare, expected=2).splitlines()[0])
        check(terminal["result"] == "HOLD" and "already exists" in terminal["reason"], "existing bundle overwritten")
        cases.append("existing bundle refused")
        shutil.rmtree(bundle)
        aggregate_path.unlink()
        aggregate_path.write_text("prior transaction")
        terminal = json.loads(run(prepare, expected=2).splitlines()[0])
        check(terminal["result"] == "HOLD" and not bundle.exists()
              and aggregate_path.read_text() == "prior transaction", "prior aggregate overwritten")
        aggregate_path.unlink()
        cases.append("existing aggregate refused")
        output.chmod(0o775)
        terminal = json.loads(run(prepare, expected=2).splitlines()[0])
        check(terminal["result"] == "HOLD" and not bundle.exists() and output.stat().st_mode & 0o777 == 0o775,
              "foreign-writable ancestor accepted or silently repaired")
        output.chmod(0o700)  # only fixture cleanup, outside admitted transactions
        cases.append("foreign-writable ancestor refused without chmod")
        verifier_oid = run([git, "-C", str(live), "rev-parse", head + ":" + VERIFIER]).decode().strip()
        object_path = live / ".git/objects" / verifier_oid[:2] / verifier_oid[2:]
        original_object = object_path.read_bytes()
        original_object_mode = object_path.stat().st_mode & 0o777
        forged = b'raise RuntimeError("UNTRUSTED_VERIFIER_EXECUTED")\n'
        try:
            object_path.chmod(0o600)
            object_path.write_bytes(zlib.compress(b"blob " + str(len(forged)).encode() + b"\0" + forged))
            terminal = json.loads(run(prepare, expected=2, env=fixture_env).splitlines()[0])
            check(terminal["result"] == "HOLD" and terminal["reason"] == "Git object content hash mismatch"
                  and not bundle.exists(), "unverified cache object reached execution")
        finally:
            object_path.write_bytes(original_object)
            object_path.chmod(original_object_mode)
        cases.append("forged cached verifier rejected before execution")
        failing_node = base / "failing-bin"
        failing_node.mkdir(mode=0o700)
        (failing_node / "node").write_text('#!/bin/sh\nif [ "$1" = "--version" ]; then echo v24.0.0; else exit 2; fi\n')
        (failing_node / "node").chmod(0o755)
        terminal = json.loads(run(prepare, expected=2, env={**fixture_env,
            "PATH": str(failing_node) + os.pathsep + fixture_env["PATH"]}).splitlines()[0])
        failure = json.loads(aggregate_path.read_bytes())
        check(terminal["result"] == failure["result"] == "HOLD" and failure["preflight_exit"] == 2
              and failure["preflight"]["reason"] == terminal["reason"], "preflight failure lost or promoted")
        cases.append("failed exact preflight retained in HOLD aggregate")
        check(run([git, "-C", str(live), "rev-parse", "HEAD"]).decode().strip() == head, "live fixture refs moved")
        check(run([git, "-C", str(live), "status", "--porcelain"]) == b"", "live fixture checkout modified")
        check(live.stat().st_mode & 0o777 == 0o775, "live input permissions modified")
        retired = json.loads(run([sys.executable, "-I", "-B", str(ROOT / "ops/public/prepare_void_precision_web_recovery_v1.py"),
                                  "--prepare", "--source-head", head], expected=2))
        check(retired["result"] == "HOLD", "retired V1 still prepares")
        cases.append("V1 entrypoint retired")
        print(json.dumps({"marker": "VOID_PRECISION_PREPARATION_COMPOSITION_PROOF_V2", "result": "PASS",
                          "umasks": ["0002", "0022", "0077"], "manifest_members": len(manifests[0]),
                          "rejected_cases": cases, "node": aggregates[0]["node"]["version"],
                          "host_acceptance": False, "service_changed": False}, sort_keys=True))


if __name__ == "__main__":
    main()
