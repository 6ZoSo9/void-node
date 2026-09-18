#!/usr/bin/env python3
from __future__ import annotations

import fcntl
import hashlib
import json
import os
from pathlib import Path
import select
import shutil
import signal
import subprocess
import sys
import tempfile
import time

import datanet_executed_byte_protected_v1 as protected

ROOT = Path(__file__).resolve().parent.parent
ARTIFACTS = ("runtime", "preload", "observer", "proof")
MUTABLE = ("runtime", "observer", "proof")
CUTS = ("after_digest", "before_create", "after_create_before_open", "after_open_before_postcheck")
TERMS = ("normal", "supervisor_crash")
MAX_FILE = 512 * 1024 * 1024

BOOTSTRAP = r"""
const fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm'),path=require('node:path');
const E=Number(process.env.VOID_EVENT_FD),C=Number(process.env.VOID_COMMAND_FD),profile=process.env.VOID_PROFILE;
const obsPath=process.env.VOID_OBSERVATION_PATH,root=process.env.VOID_SCHEDULE_ROOT;
const retained=[],opened={},texts={};
const H=b=>crypto.createHash('sha256').update(b).digest('hex');
function gate(value){fs.writeSync(E,JSON.stringify(value)+'\n');const b=Buffer.alloc(1);if(fs.readSync(C,b,0,1,null)!==1||b[0]!==71)throw new Error('gate_closed');}
function identity(fd,p){const s=fs.fstatSync(fd),b=fs.readFileSync(fd);return {path:p,dev:s.dev,ino:s.ino,bytes:b.length,sha256:H(b),opened_by_kernel:true,_bytes:b};}
let rf=fs.openSync('/proc/self/exe','r');retained.push(rf);let r=identity(rf,'/proc/self/exe');opened.runtime={path:r.path,dev:r.dev,ino:r.ino,bytes:r.bytes,sha256:r.sha256,opened_by_kernel:true};gate({stage:'after_open',role:'runtime',identity:opened.runtime});
for(const role of ['preload','observer','proof']){
  gate({stage:'before_open',role});
  const p=profile==='protected'?'/proc/self/fd/'+process.env['VOID_'+role.toUpperCase()+'_FD']:process.env['VOID_'+role.toUpperCase()+'_PATH'];
  const fd=fs.openSync(p,'r');retained.push(fd);const x=identity(fd,p);texts[role]=x._bytes.toString('utf8');opened[role]={path:x.path,dev:x.dev,ino:x.ino,bytes:x.bytes,sha256:x.sha256,opened_by_kernel:true};gate({stage:'after_open',role,identity:opened[role]});
}
vm.runInThisContext(texts.preload,{filename:'preload'});vm.runInThisContext(texts.observer,{filename:'observer'});vm.runInThisContext(texts.proof,{filename:'proof'});
const projection={preload:globalThis.__void_preload,observer:globalThis.__void_observer,proof:globalThis.__void_proof};
const ids=new Map(Object.entries(opened).map(([role,x])=>[x.dev+':'+x.ino,role]));
let writableAliases=0;const aliases={runtime:0,preload:0,observer:0,proof:0};
for(const name of fs.readdirSync('/proc/self/fd')){
  try{const s=fs.statSync('/proc/self/fd/'+name),role=ids.get(s.dev+':'+s.ino);if(!role)continue;aliases[role]++;const info=fs.readFileSync('/proc/self/fdinfo/'+name,'utf8'),m=/^flags:\s+([0-7]+)/m.exec(info);if(!m)throw new Error('fd_flags');if((parseInt(m[1],8)&3)!==0)writableAliases++;}catch(e){if(!['ENOENT','ESRCH'].includes(e.code))throw e;}
}
let writableVmas=0;for(const line of fs.readFileSync('/proc/self/maps','utf8').split('\n')){const parts=line.trim().split(/\s+/);if(parts.length<5)continue;const perms=parts[1]||'';if(perms.length>=4&&perms[1]==='w'&&perms[3]==='s'&&(line.includes('memfd:void-')||line.includes(root)))writableVmas++;}
const observation={pid:process.pid,profile,runtime_sha256:opened.runtime.sha256,opened,markers:projection,projection_sha256:H(Buffer.from(JSON.stringify(projection))),census:{fd_aliases_by_role:aliases,writable_aliases:writableAliases,writable_shared_vmas:writableVmas}};
const ofd=fs.openSync(obsPath,'wx',0o600);try{const b=Buffer.from(JSON.stringify(observation)+'\n');fs.writeSync(ofd,b);fs.fsyncSync(ofd);}finally{fs.closeSync(ofd);}
gate({stage:'all_open',pid:process.pid});
console.log(JSON.stringify(observation));
"""

def sha_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def sha_path(path: Path) -> str:
    h = hashlib.sha256()
    total = 0
    with path.open("rb") as f:
        while True:
            b = f.read(1024 * 1024)
            if not b:
                break
            total += len(b)
            if total > MAX_FILE:
                raise AssertionError("file_too_large")
            h.update(b)
    if total <= 0:
        raise AssertionError("file_empty")
    return h.hexdigest()

def file_info(path: Path) -> dict:
    st = path.stat()
    if not path.is_file() or st.st_size <= 0 or st.st_size > MAX_FILE:
        raise AssertionError("artifact_not_bounded_file")
    return {"bytes": st.st_size, "sha256": sha_path(path)}

def write_same_length(a: Path, b: Path, left: bytes, right: bytes) -> None:
    n = max(len(left), len(right))
    a.write_bytes(left + b" " * (n - len(left)))
    b.write_bytes(right + b" " * (n - len(right)))
    os.chmod(a, 0o600); os.chmod(b, 0o600)

def prepare_base(root: Path, node: Path) -> dict:
    base = root / "base"; base.mkdir()
    runtime = base / "runtime"; runtime_marked = base / "runtime.marked"
    shutil.copyfile(node, runtime); shutil.copyfile(node, runtime_marked)
    rb = bytearray(runtime_marked.read_bytes()); rb[-1] ^= 1; runtime_marked.write_bytes(rb)
    os.chmod(runtime, 0o500); os.chmod(runtime_marked, 0o500)
    check = subprocess.run([str(runtime_marked), "--version"], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10, check=True)
    canonical_version = subprocess.run([str(runtime), "--version"], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10, check=True).stdout.strip()
    if check.stdout.strip() != canonical_version:
        raise AssertionError("marked_runtime_not_equivalent")
    preload = base / "preload.js"
    preload.write_text("globalThis.__void_preload='PRELOAD_ORIGINAL';\n", encoding="utf-8"); os.chmod(preload, 0o600)
    observer = base / "observer.js"; observer_marked = base / "observer.marked.js"
    proof = base / "proof.js"; proof_marked = base / "proof.marked.js"
    write_same_length(observer, observer_marked, b"globalThis.__void_observer='OBSERVER_ORIGINAL';\n", b"globalThis.__void_observer='OBSERVER_MARKED__';\n")
    write_same_length(proof, proof_marked, b"globalThis.__void_proof='PROOF_ORIGINAL';\n", b"globalThis.__void_proof='PROOF_MARKED__';\n")
    return {
        "node_version": canonical_version,
        "original": {"runtime": runtime, "preload": preload, "observer": observer, "proof": proof},
        "marked": {"runtime": runtime_marked, "observer": observer_marked, "proof": proof_marked},
    }

def link_schedule(base: dict, root: Path) -> dict[str, Path]:
    root.mkdir(parents=True)
    names = {"runtime": "runtime-node", "preload": "preload.js", "observer": "observer.js", "proof": "proof.js"}
    out = {}
    for role, name in names.items():
        dst = root / name
        os.link(base["original"][role], dst)
        out[role] = dst
    return out

def substitute(paths: dict[str, Path], base: dict, target: str) -> Path:
    path = paths[target]; backup = path.with_name(path.name + ".backup")
    if backup.exists():
        raise AssertionError("backup_exists")
    os.replace(path, backup)
    os.link(base["marked"][target], path)
    os.chmod(path, 0o500 if target == "runtime" else 0o600)
    return backup

def restore(paths: dict[str, Path], target: str, backup: Path | None) -> None:
    if backup is None:
        return
    path = paths[target]
    if path.exists():
        path.unlink()
    os.replace(backup, path)

class LineReader:
    def __init__(self, fd: int):
        self.fd = fd; self.buf = b""
    def read(self, timeout: float = 8.0) -> dict:
        end = time.monotonic() + timeout
        while b"\n" not in self.buf:
            remaining = end - time.monotonic()
            if remaining <= 0:
                raise AssertionError("event_timeout")
            ready, _, _ = select.select([self.fd], [], [], remaining)
            if not ready:
                raise AssertionError("event_timeout")
            b = os.read(self.fd, 65536)
            if not b:
                raise AssertionError("event_eof")
            self.buf += b
            if len(self.buf) > 1024 * 1024:
                raise AssertionError("event_bound")
        line, self.buf = self.buf.split(b"\n", 1)
        return json.loads(line)

def make_inheritable(fd: int) -> None:
    os.set_inheritable(fd, True)
    flags = fcntl.fcntl(fd, fcntl.F_GETFD)
    fcntl.fcntl(fd, fcntl.F_SETFD, flags & ~fcntl.FD_CLOEXEC)

def worker(config: dict) -> int:
    schedule = Path(config["schedule_root"])
    base = {
        "original": {k: Path(v) for k, v in config["base_original"].items()},
        "marked": {k: Path(v) for k, v in config["base_marked"].items()},
    }
    paths = link_schedule(base, schedule)
    target, cut, profile = config["artifact"], config["cut"], config["profile"]
    mutate, crash = bool(config["mutate"]), bool(config["crash"])
    expected = {role: {**file_info(base["original"][role]), "path": str(paths[role])} for role in ARTIFACTS}
    pre_hash = sha_path(paths[target])
    if pre_hash != expected[target]["sha256"]:
        raise AssertionError("pre_hash_not_expected")

    protected_fds = protected.build_protected_set({k: str(v) for k, v in paths.items()}) if profile == "protected" else {}
    try:
        if profile == "protected":
            for role, fd in protected_fds.items():
                ident = protected.fd_identity(fd)
                if ident["sha256"] != expected[role]["sha256"] or not ident["read_only"] or not ident["required_seals_present"]:
                    raise AssertionError("protected_preparation_mismatch")

        backup = None
        if mutate and cut == "after_digest":
            backup = substitute(paths, base, target)

        event_r, event_w = os.pipe()
        cmd_r, cmd_w = os.pipe()
        pre_r, pre_w = os.pipe()
        out_r, out_w = os.pipe()
        err_r, err_w = os.pipe()
        for fd in (event_w, cmd_r, out_w, err_w, *protected_fds.values()):
            make_inheritable(fd)

        if mutate and cut == "before_create":
            backup = substitute(paths, base, target)

        pre_hold = target == "runtime" and cut == "after_create_before_open"
        pid = os.fork()
        if pid == 0:
            try:
                os.close(event_r); os.close(cmd_w); os.close(pre_w); os.close(out_r); os.close(err_r)
                os.dup2(out_w, 1); os.dup2(err_w, 2)
                if pre_hold:
                    if os.read(pre_r, 1) != b"G":
                        os._exit(118)
                os.close(pre_r)
                env = os.environ.copy()
                env.update({
                    "VOID_EVENT_FD": str(event_w),
                    "VOID_COMMAND_FD": str(cmd_r),
                    "VOID_PROFILE": profile,
                    "VOID_PRELOAD_PATH": str(paths["preload"]),
                    "VOID_OBSERVER_PATH": str(paths["observer"]),
                    "VOID_PROOF_PATH": str(paths["proof"]),
                    "VOID_OBSERVATION_PATH": str(schedule / "child-observation.json"),
                    "VOID_SCHEDULE_ROOT": str(schedule),
                })
                if profile == "protected":
                    env.update({
                        "VOID_PRELOAD_FD": str(protected_fds["preload"]),
                        "VOID_OBSERVER_FD": str(protected_fds["observer"]),
                        "VOID_PROOF_FD": str(protected_fds["proof"]),
                    })
                    exe = f"/proc/self/fd/{protected_fds['runtime']}"
                else:
                    exe = str(paths["runtime"])
                os.execve(exe, [exe, "-e", BOOTSTRAP], env)
            except BaseException:
                os._exit(119)

        os.close(event_w); os.close(cmd_r); os.close(pre_r); os.close(out_w); os.close(err_w)
        if pre_hold:
            if mutate:
                backup = substitute(paths, base, target)
            os.write(pre_w, b"G")
        os.close(pre_w)

        reader = LineReader(event_r)
        restored = backup is None
        all_open = None
        while True:
            ev = reader.read()
            stage, role = ev.get("stage"), ev.get("role")
            if mutate and target != "runtime" and stage == "before_open" and role == target and cut == "after_create_before_open":
                backup = substitute(paths, base, target)
            if mutate and stage == "after_open" and role == target:
                if cut in ("after_digest", "before_create", "after_create_before_open"):
                    restore(paths, target, backup); backup = None; restored = True
                elif cut == "after_open_before_postcheck":
                    backup = substitute(paths, base, target)
                    restore(paths, target, backup); backup = None; restored = True
            if stage == "all_open":
                all_open = ev
                if not restored and backup is not None:
                    restore(paths, target, backup); backup = None; restored = True
                post_hash = sha_path(paths[target])
                if post_hash != pre_hash:
                    raise AssertionError("post_hash_changed")
                if crash:
                    partial = schedule / "supervisor-partial.json"
                    fd = os.open(partial, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                    try:
                        data = json.dumps({"pid": pid, "pre": pre_hash, "post": post_hash}, sort_keys=True).encode() + b"\n"
                        os.write(fd, data); os.fsync(fd)
                    finally:
                        os.close(fd)
                    os.kill(os.getpid(), signal.SIGKILL)
                os.write(cmd_w, b"G")
                break
            os.write(cmd_w, b"G")

        deadline = time.monotonic() + 10
        status = None
        while time.monotonic() < deadline:
            done, st = os.waitpid(pid, os.WNOHANG)
            if done == pid:
                status = st; break
            time.sleep(0.01)
        if status is None:
            os.kill(pid, signal.SIGKILL); os.waitpid(pid, 0)
            raise AssertionError("child_timeout")
        stdout = os.read(out_r, 1024 * 1024)
        stderr = os.read(err_r, 1024 * 1024)
        if not os.WIFEXITED(status) or os.WEXITSTATUS(status) != 0:
            raise AssertionError(f"child_failed:{status}:{stderr[-500:]!r}")
        observation = json.loads((schedule / "child-observation.json").read_text(encoding="utf-8"))
        final_lines = [x for x in stdout.decode("utf-8").splitlines() if x.strip()]
        if len(final_lines) != 1 or json.loads(final_lines[0]) != observation:
            raise AssertionError("child_stdout_mismatch")
        result = {"pid": pid, "pre_hash": pre_hash, "post_hash": sha_path(paths[target]), "observation": observation}
        (schedule / "worker-result.json").write_text(json.dumps(result, sort_keys=True) + "\n", encoding="utf-8")
        return 0
    finally:
        protected.close_set(protected_fds)

def process_alive(pid: int) -> bool:
    try:
        raw = Path(f"/proc/{pid}/stat").read_text(encoding="utf-8")
    except (FileNotFoundError, ProcessLookupError):
        return False
    tail = raw[raw.rfind(") ") + 2:].split()
    return bool(tail) and tail[0] not in ("Z", "X")

def run_worker(script: Path, node: Path, base: dict, profile: str, artifact: str, cut: str, schedule_root: Path, mutate: bool, crash: bool) -> tuple[dict, int]:
    config = {
        "node": str(node), "profile": profile, "artifact": artifact, "cut": cut,
        "schedule_root": str(schedule_root), "mutate": mutate, "crash": crash,
        "base_original": {k: str(v) for k, v in base["original"].items()},
        "base_marked": {k: str(v) for k, v in base["marked"].items()},
    }
    proc = subprocess.run([sys.executable, str(script), "--worker", json.dumps(config, separators=(",", ":"))],
                          cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30, check=False)
    obs_path = schedule_root / "child-observation.json"
    if not obs_path.is_file():
        raise AssertionError(f"worker_missing_observation:{proc.returncode}:{proc.stderr[-1000:]!r}")
    observation = json.loads(obs_path.read_text(encoding="utf-8"))
    if crash:
        if proc.returncode != -signal.SIGKILL:
            raise AssertionError(f"worker_did_not_crash:{proc.returncode}:{proc.stderr[-1000:]!r}")
        partial = schedule_root / "supervisor-partial.json"
        if not partial.is_file():
            raise AssertionError("crash_partial_missing")
        partial.unlink()
        pid = int(observation["pid"])
        try:
            os.kill(pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        ticks = 0
        while ticks < 64 and process_alive(pid):
            time.sleep(0.05); ticks += 1
        if process_alive(pid):
            raise AssertionError("crash_child_retirement_bound")
        return observation, ticks
    if proc.returncode != 0:
        raise AssertionError(f"worker_failed:{proc.returncode}:{proc.stderr[-2000:]!r}")
    result = json.loads((schedule_root / "worker-result.json").read_text(encoding="utf-8"))
    if result["observation"] != observation or result["pre_hash"] != result["post_hash"]:
        raise AssertionError("worker_result_mismatch")
    return observation, 0

def natural_context(node: Path) -> dict:
    source = subprocess.run([str(node), "scripts/prove_void_datanet_executed_byte_source_inventory_v1.mjs"],
                            cwd=ROOT, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20, check=True)
    rows = {}
    inventory = None
    for line in source.stdout.splitlines():
        if line.startswith("source_inventory="):
            inventory = json.loads(line.split("=", 1)[1])
        elif "=" in line:
            k, v = line.split("=", 1); rows[k] = v
    if inventory is None:
        raise AssertionError("source_inventory_missing")
    meta_code = """import {SCHEDULE_MANIFEST_SHA256,falseAuthority} from './scripts/lib/void_datanet_executed_byte_receipt_dag_v1.mjs'; console.log(JSON.stringify({schedule_manifest_sha256:SCHEDULE_MANIFEST_SHA256,authority:falseAuthority()}));"""
    meta = json.loads(subprocess.run([str(node), "--input-type=module", "-e", meta_code], cwd=ROOT, text=True,
                                     stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10, check=True).stdout)
    return {
        "head": rows["head"], "tree": rows["tree"], "source_inventory": inventory,
        "source_inventory_sha256": rows["source_inventory_sha256"],
        "schedule_manifest_sha256": meta["schedule_manifest_sha256"], "authority": meta["authority"],
    }

def expected_for(base: dict, schedule_root: Path) -> dict:
    names = {"runtime": "runtime-node", "preload": "preload.js", "observer": "observer.js", "proof": "proof.js"}
    return {role: {"path": str(schedule_root / names[role]), **file_info(base["original"][role])} for role in ARTIFACTS}

def marked_execution(observation: dict, expected: dict, artifact: str) -> bool:
    if artifact == "runtime":
        return observation["runtime_sha256"] != expected["runtime"]["sha256"]
    if artifact == "observer":
        return observation["markers"]["observer"] != "OBSERVER_ORIGINAL"
    if artifact == "proof":
        return observation["markers"]["proof"] != "PROOF_ORIGINAL"
    raise AssertionError("unknown_artifact")

def make_schedule(kind: str, profile: str, artifact: str, cut: str, term: str, generation: str,
                  expected: dict, observation: dict, recovery_ticks: int, partial: bool) -> dict:
    opened = observation["opened"]
    marked = marked_execution(observation, expected, artifact) if kind == "attack" else False
    if kind == "recovery_control" and any(expected[r]["sha256"] != opened[r]["sha256"] for r in ARTIFACTS):
        raise AssertionError("control_identity_mismatch")
    if profile == "protected":
        if marked or any(expected[r]["sha256"] != opened[r]["sha256"] for r in ARTIFACTS):
            raise AssertionError("protected_identity_substitution")
        if observation["census"]["writable_aliases"] != 0 or observation["census"]["writable_shared_vmas"] != 0:
            raise AssertionError("protected_writable_surface")
    return {
        "id": f"{artifact}:{cut}:{term}:{kind}", "kind": kind, "artifact_class": artifact,
        "cut_point": cut, "termination_mode": term, "generation": generation,
        "path_sha256_before": expected[artifact]["sha256"], "path_sha256_after": expected[artifact]["sha256"],
        "expected": expected, "opened": opened, "marked_execution": marked,
        "accepted_substituted_identity": marked,
        "writable_aliases": int(observation["census"]["writable_aliases"]),
        "writable_vmas": int(observation["census"]["writable_shared_vmas"]),
        "partial_evidence_discarded": partial, "recovery_ticks": int(recovery_ticks),
        "projection_sha256": observation["projection_sha256"],
    }

def campaign(node: Path, profile: str, output: Path) -> int:
    if profile not in ("current", "protected"):
        raise AssertionError("profile")
    version = subprocess.run([str(node), "--version"], text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10, check=True).stdout.strip()
    major = int(version.removeprefix("v").split(".", 1)[0])
    if major not in (22, 24, 26):
        raise AssertionError("node_major")
    generation = os.environ.get("VOID_EXECUTED_BYTE_GENERATION", "local-v1")
    if not generation.replace("-", "").replace("_", "").replace(".", "").isalnum() or len(generation) > 120:
        raise AssertionError("generation")
    context = natural_context(node)
    script = Path(__file__).resolve()
    with tempfile.TemporaryDirectory(prefix=f"void-datanet-hosted-{major}-{profile}-") as td:
        root = Path(td); base = prepare_base(root, node); schedules = []
        control_projection = None
        for artifact in MUTABLE:
            for cut in CUTS:
                for term in TERMS:
                    attack_root = root / f"attack-{artifact}-{cut}-{term}"
                    attack_obs, ticks = run_worker(script, node, base, profile, artifact, cut, attack_root, True, term == "supervisor_crash")
                    attack_expected = expected_for(base, attack_root)
                    schedules.append(make_schedule("attack", profile, artifact, cut, term, generation, attack_expected, attack_obs, ticks, term == "supervisor_crash"))

                    control_root = root / f"control-{artifact}-{cut}-{term}"
                    control_obs, _ = run_worker(script, node, base, profile, artifact, cut, control_root, False, False)
                    control_expected = expected_for(base, control_root)
                    control = make_schedule("recovery_control", profile, artifact, cut, term, generation, control_expected, control_obs, ticks if term == "supervisor_crash" else 0, False)
                    if control_projection is None:
                        control_projection = control["projection_sha256"]
                    elif control["projection_sha256"] != control_projection:
                        raise AssertionError("control_projection_drift")
                    schedules.append(control)

        member = {
            "schema": "VOID_DATANET_EXECUTED_BYTE_MEMBER_V1", "head": context["head"], "tree": context["tree"],
            "generation": generation, "host_tier": "hosted", "major": major, "profile": profile,
            "schedule_manifest_sha256": context["schedule_manifest_sha256"],
            "source_inventory": context["source_inventory"], "source_inventory_sha256": context["source_inventory_sha256"],
            "schedules": schedules, "authority": context["authority"],
        }
        output.mkdir(parents=True, exist_ok=False)
        path = output / "member.json"
        path.write_text(json.dumps(member, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
        validate_code = """import fs from 'node:fs'; import crypto from 'node:crypto'; import {validateMember,canonical} from './scripts/lib/void_datanet_executed_byte_receipt_dag_v1.mjs'; const p=process.argv[1],m=JSON.parse(fs.readFileSync(p,'utf8')); validateMember(m); console.log('VOID_DATANET_EXECUTED_BYTE_HOSTED_MEMBER_V1_GREEN'); console.log('member_sha256='+crypto.createHash('sha256').update(canonical(m)+'\\n').digest('hex'));"""
        checked = subprocess.run([str(node), "--input-type=module", "-e", validate_code, str(path)], cwd=ROOT, text=True,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=20, check=True)
        print(checked.stdout, end="")
        print(f"node_version={version}")
        print(f"profile={profile}")
        print("schedules=48")
        print("attacks=24")
        print("recovery_controls=24")
        return 0

def main() -> int:
    if len(sys.argv) >= 2 and sys.argv[1] == "--worker":
        if len(sys.argv) != 3:
            raise AssertionError("worker_args")
        return worker(json.loads(sys.argv[2]))
    if len(sys.argv) != 4:
        raise AssertionError("usage: <node> <current|protected> <output>")
    return campaign(Path(sys.argv[1]).resolve(), sys.argv[2], Path(sys.argv[3]).resolve())

if __name__ == "__main__":
    raise SystemExit(main())
