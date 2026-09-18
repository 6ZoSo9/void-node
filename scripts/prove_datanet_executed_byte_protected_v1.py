from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile

import datanet_executed_byte_protected_v1 as p


def sha(path: Path) -> str:
    h=hashlib.sha256()
    with path.open('rb') as f:
        while True:
            b=f.read(1024*1024)
            if not b: break
            h.update(b)
    return h.hexdigest()


def atomic_replace(path: Path, replacement: Path) -> None:
    os.replace(replacement, path)


def same_len(a: bytes,b: bytes) -> tuple[bytes,bytes]:
    n=max(len(a),len(b))
    return a+b' '*(n-len(a)), b+b' '*(n-len(b))


def write_pair(original: Path, marked: Path, a: bytes, b: bytes, mode=0o600) -> None:
    a,b=same_len(a,b)
    original.write_bytes(a); marked.write_bytes(b)
    os.chmod(original,mode); os.chmod(marked,mode)


def main() -> int:
    node=Path(sys.argv[1] if len(sys.argv)>1 else shutil.which('node') or '').resolve()
    if not node.is_file(): raise AssertionError('node_missing')
    with tempfile.TemporaryDirectory(prefix='void-datanet-exec-byte-') as td:
        root=Path(td)
        runtime=root/'runtime-node'; runtime_marked=root/'runtime-node.marked'
        shutil.copyfile(node,runtime); shutil.copyfile(node,runtime_marked)
        rb=bytearray(runtime_marked.read_bytes()); rb[-1]^=1; runtime_marked.write_bytes(rb)
        os.chmod(runtime,0o500); os.chmod(runtime_marked,0o500)
        if runtime.stat().st_size != runtime_marked.stat().st_size: raise AssertionError('runtime_size_mismatch')
        # Flipping the final non-loaded byte changes identity without changing runtime behavior.
        import subprocess
        marked_check=subprocess.run([str(runtime_marked),'-e','process.stdout.write(process.version)'],text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True,timeout=10)
        if marked_check.stdout.strip() != process_version(node): raise AssertionError('marked_runtime_invalid')

        preload=root/'preload.js'; preload_marked=root/'preload.marked.js'
        observer=root/'observer.js'; observer_marked=root/'observer.marked.js'
        proof=root/'proof.mjs'; proof_marked=root/'proof.marked.mjs'
        write_pair(preload,preload_marked,b"globalThis.__void_preload='PRELOAD_ORIGINAL';\n",b"globalThis.__void_preload='PRELOAD_MARKED__';\n")
        write_pair(observer,observer_marked,b"globalThis.__void_observer='OBSERVER_ORIGINAL';\n",b"globalThis.__void_observer='OBSERVER_MARKED__';\n")
        proof_template="""import fs from 'node:fs';\nimport vm from 'node:vm';\nimport crypto from 'node:crypto';\nconst H=b=>crypto.createHash('sha256').update(b).digest('hex');\nconst profile=process.env.VOID_EXEC_PROFILE;\nconst read=(fd,path)=>profile==='protected'?fs.readFileSync(`/proc/self/fd/${fd}`,'utf8'):fs.readFileSync(path,'utf8');\nvm.runInThisContext(read(process.env.VOID_PRELOAD_FD,process.env.VOID_PRELOAD_PATH),{filename:'preload'});\nvm.runInThisContext(read(process.env.VOID_OBSERVER_FD,process.env.VOID_OBSERVER_PATH),{filename:'observer'});\nconst runtime=fs.readFileSync('/proc/self/exe');\nconst proofRef=profile==='protected'?fs.readFileSync(`/proc/self/fd/${process.env.VOID_PROOF_REF_FD}`):fs.readFileSync(new URL(import.meta.url));\nconsole.log(JSON.stringify({profile,proof_marker:'%s',preload_marker:globalThis.__void_preload,observer_marker:globalThis.__void_observer,runtime_sha256:H(runtime),proof_ref_sha256:H(proofRef)}));\n"""
        a=(proof_template%'PROOF_ORIGINAL').encode(); b=(proof_template%'PROOF_MARKED__').encode(); write_pair(proof,proof_marked,a,b)

        paths={k:str(v) for k,v in {'runtime':runtime,'preload':preload,'observer':observer,'proof':proof}.items()}
        expected={k:sha(Path(v)) for k,v in paths.items()}
        fds=p.build_protected_set(paths)
        try:
            identities={k:p.fd_identity(fd) for k,fd in fds.items()}
            for k in expected:
                if identities[k]['sha256']!=expected[k]: raise AssertionError(f'protected_copy_mismatch:{k}')

            cases=[]
            for target,marked in [('runtime',runtime_marked),('observer',observer_marked),('proof',proof_marked)]:
                target_path=Path(paths[target]); backup=root/f'{target}.backup'
                before=sha(target_path)
                os.replace(target_path,backup); shutil.copyfile(marked,target_path); os.chmod(target_path,0o500 if target=='runtime' else 0o600)
                current=p.run_current(paths)
                os.replace(target_path,root/f'{target}.transient'); os.replace(backup,target_path)
                after=sha(target_path)
                if before!=after: raise AssertionError('current_pre_post_hash_changed')
                if target=='runtime' and current['runtime_sha256']==expected['runtime']: raise AssertionError('current_runtime_substitution_not_observed')
                if target=='observer' and current['observer_marker']!='OBSERVER_MARKED__': raise AssertionError('current_observer_substitution_not_observed')
                if target=='proof' and current['proof_marker']!='PROOF_MARKED__': raise AssertionError('current_proof_substitution_not_observed')

                backup2=root/f'{target}.backup2'; os.replace(target_path,backup2); shutil.copyfile(marked,target_path); os.chmod(target_path,0o500 if target=='runtime' else 0o600)
                protected=p.run_protected(fds)
                os.replace(target_path,root/f'{target}.transient2'); os.replace(backup2,target_path)
                after2=sha(target_path)
                if before!=after2: raise AssertionError('protected_pre_post_hash_changed')
                if protected['runtime_sha256']!=expected['runtime']: raise AssertionError('protected_runtime_identity_changed')
                if protected['observer_marker']!='OBSERVER_ORIGINAL': raise AssertionError('protected_observer_changed')
                if protected['proof_marker']!='PROOF_ORIGINAL': raise AssertionError('protected_proof_changed')
                if protected['preload_marker']!='PRELOAD_ORIGINAL': raise AssertionError('protected_preload_changed')
                if protected['proof_ref_sha256']!=expected['proof']: raise AssertionError('protected_proof_ref_changed')
                cases.append({'target':target,'current_substituted':True,'protected_substituted':False,'pre_post_path_hash_equal':True})

            print('VOID_DATANET_PROTECTED_EXECUTION_MEMFD_V1_GREEN')
            print(f'node_version={process_version(node)}')
            print('sealed_runtime_exec=true')
            print('sealed_preload_fd=true')
            print('sealed_observer_fd=true')
            print('sealed_proof_stdin_and_reference_fd=true')
            print('retained_launch_fds_read_only=true')
            print('memfd_write_seals_present=true')
            print('writable_alias_census_performed=false')
            print('writable_shared_vma_census_performed=false')
            print('current_path_substitution_reproduced=3')
            print('protected_path_substitution_accepted=0')
            print('cases='+json.dumps(cases,separators=(',',':')))
            return 0
        finally:
            p.close_set(fds)


def process_version(node: Path) -> str:
    import subprocess
    r=subprocess.run([str(node),'-p','process.version'],text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=True,timeout=10)
    return r.stdout.strip()

if __name__=='__main__':
    raise SystemExit(main())
