"""Bind a stopped Docker container to saved image config/layers and enforcement bytes.

Reads archives without extracting them or starting a container. Docker save's
manifest is hashed as a Docker archive manifest, never called an OCI registry digest.
"""
import argparse
import copy
import gzip
import hashlib
import io
import json
import re
import tarfile
from pathlib import Path, PurePosixPath


def require(condition, reason):
    if not condition:
        raise ValueError(reason)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def stream_sha(stream):
    h = hashlib.sha256()
    while True:
        data = stream.read(1024 * 1024)
        if not data:
            return h.hexdigest()
        h.update(data)


def safe_name(value):
    require(isinstance(value, str) and value and not value.startswith('/'), 'archive path')
    require(all(p not in ('', '.', '..') for p in value.split('/')), 'archive path components')
    return value


def verify_archive(archive_path, manifest, image_id, container, checkout_head):
    require(re.fullmatch(r'sha256:[0-9a-f]{64}', image_id), 'image ID shape')
    require(re.fullmatch(r'[0-9a-f]{40}', checkout_head), 'checkout SHA shape')
    require(isinstance(container, list) and len(container) == 1, 'one container')
    c = container[0]
    require(c['Image'] == image_id, 'container image mismatch')
    require(c['State']['Status'] == 'created' and c['State']['Running'] is False, 'container executed')
    require(c['State']['StartedAt'] == '0001-01-01T00:00:00Z', 'container previously started')
    require(not c.get('Mounts'), 'container mounts override image')
    require(c['Config'].get('Labels', {}).get('org.opencontainers.image.revision') == checkout_head, 'container revision')
    expected = {'app/' + a['path']: (a['bytes'], a['sha256']) for a in manifest['artifacts']}
    require(len(expected) == len(manifest['artifacts']) and len(expected) > 1, 'artifact cardinality')
    for p in expected:
        safe_name(p)
    with tarfile.open(archive_path, 'r:*') as outer:
        members = outer.getmembers()
        require(len(members) <= 100000, 'outer archive limit')
        names = [m.name for m in members]
        require(len(set(names)) == len(names), 'duplicate archive member')
        def member(name, maximum=None):
            safe_name(name)
            m = outer.getmember(name)
            require(m.isfile() and not m.issym() and not m.islnk(), 'archive member type')
            if maximum is not None:
                require(0 < m.size <= maximum, 'metadata size')
            return m
        def data(name, maximum=4 * 1024 * 1024):
            return outer.extractfile(member(name, maximum)).read()
        manifest_bytes = data('manifest.json')
        entries = json.loads(manifest_bytes)
        require(isinstance(entries, list) and len(entries) == 1, 'one saved image')
        entry = entries[0]
        config_bytes = data(entry['Config'])
        require('sha256:' + sha(config_bytes) == image_id, 'image config hash')
        config = json.loads(config_bytes)
        require(config['config'].get('WorkingDir') == '/app', 'working directory')
        require(config['config'].get('Cmd') == ['node', 'dist/index.js'], 'image command')
        require(not config['config'].get('Volumes'), 'image volume override')
        require(config['config'].get('Labels', {}).get('org.opencontainers.image.revision') == checkout_head, 'image revision')
        layers = entry['Layers']
        diff_ids = config['rootfs']['diff_ids']
        require(config['rootfs']['type'] == 'layers', 'rootfs type')
        require(0 < len(layers) == len(diff_ids) <= 128, 'layer count')
        require(len(set(layers)) == len(layers), 'duplicate layer')
        found, layer_records = {}, []
        for layer_name, diff_id in zip(layers, diff_ids):
            m = member(layer_name)
            require(m.size <= 4 * 1024**3, 'layer size')
            raw_digest = stream_sha(outer.extractfile(m))
            f = outer.extractfile(m)
            compressed = f.read(2) == b'\x1f\x8b'
            f.close()
            def layer_stream():
                raw = outer.extractfile(m)
                return gzip.GzipFile(fileobj=raw) if compressed else raw
            with layer_stream() as stream:
                actual_diff = 'sha256:' + stream_sha(stream)
            require(actual_diff == diff_id, 'layer diff ID')
            layer_records.append({'path': layer_name, 'archive_sha256': raw_digest, 'diff_id': actual_diff})
            with layer_stream() as stream, tarfile.open(fileobj=stream, mode='r|') as layer:
                seen = set()
                for i, item in enumerate(layer):
                    require(i < 1000000, 'layer member count')
                    name = item.name.removeprefix('./').rstrip('/')
                    if not name or name == '.':
                        continue
                    safe_name(name)
                    require(name not in seen, 'duplicate layer path')
                    seen.add(name)
                    basename = PurePosixPath(name).name
                    parent = str(PurePosixPath(name).parent)
                    if basename.startswith('.wh.'):
                        prefix = '' if parent == '.' else parent + '/'
                        target = prefix + basename[4:]
                        affected = [p for p in expected if p == target or p.startswith(target + '/')]
                        if basename == '.wh..wh..opq':
                            affected = [p for p in expected if p.startswith(prefix)]
                        require(not affected, 'whiteout affects enforcement closure')
                        continue
                    if any(p.startswith(name + '/') for p in expected):
                        require(item.isdir(), 'non-directory artifact ancestor')
                    if name in expected:
                        require(item.isfile() and not item.issym() and not item.islnk(), 'artifact type')
                        require(0 < item.size <= 2 * 1024 * 1024, 'artifact size')
                        found[name] = (item.size, stream_sha(layer.extractfile(item)))
        require(found == expected, 'saved image enforcement bytes mismatch')
    with open(archive_path, 'rb') as f:
        archive_sha = stream_sha(f)
    return {
        'schema': 'void_buy_void_enforcement_image_identity_v1',
        'checkout_head': checkout_head, 'enforcement_source_head': manifest['source_head'],
        'enforcement_artifact_set_sha256': manifest['enforcement_artifact_set_sha256'],
        'image_id': image_id, 'image_config_sha256': sha(config_bytes),
        'docker_save_manifest_sha256': sha(manifest_bytes),
        'docker_save_archive_sha256': archive_sha, 'layers': layer_records,
        'container_id': c['Id'], 'container_started': False,
        'packaged_enforcement_artifacts_verified': True,
        'oci_registry_manifest_verified': False,
        'deployed_artifact_generation_verified': False,
        'production_source_finality_authority_ready': False,
    }


def self_test():
    import tempfile
    head = '1' * 40
    payload = b'export const guarded = true;\n'
    paths = ['dist/economic/entry.js', 'dist/economic/preflight.js']
    m = {'source_head':head, 'enforcement_artifact_set_sha256':'2'*64,
         'artifacts':[{'path':p, 'bytes':len(payload), 'sha256':sha(payload)} for p in paths]}
    def tar_bytes(entries):
        out = io.BytesIO()
        with tarfile.open(fileobj=out, mode='w') as t:
            for name, value in entries:
                info = tarfile.TarInfo(name); info.size = len(value)
                t.addfile(info, io.BytesIO(value))
        return out.getvalue()
    layer = tar_bytes([('app/'+p, payload) for p in paths])
    cfg = json.dumps({'rootfs':{'type':'layers','diff_ids':['sha256:'+sha(layer)]},
                     'config':{'WorkingDir':'/app','Cmd':['node','dist/index.js'],
                               'Labels':{'org.opencontainers.image.revision':head}}}).encode()
    image_id = 'sha256:'+sha(cfg)
    container = [{'Id':'3'*64, 'Image':image_id, 'Mounts':[],
                  'Config':{'Labels':{'org.opencontainers.image.revision':head}},
                  'State':{'Status':'created','Running':False,'StartedAt':'0001-01-01T00:00:00Z'}}]
    index = json.dumps([{'Config':'config.json','Layers':['layer.tar'],'RepoTags':['test:local']}]).encode()
    good = [('manifest.json',index),('config.json',cfg),('layer.tar',layer)]
    count = 0
    with tempfile.TemporaryDirectory(prefix='void-image-proof-') as d:
        archive = Path(d)/'image.tar'
        def run(entries, expected=m, cid=container, identity=image_id):
            archive.write_bytes(tar_bytes(entries))
            return verify_archive(archive,expected,identity,cid,head)
        run(good)
        def rejects(fn):
            nonlocal count
            try:
                fn()
            except (ValueError, KeyError, tarfile.TarError):
                count += 1
            else:
                raise AssertionError('image falsifier accepted')
        rejects(lambda:run(good,identity='sha256:'+'0'*64))
        changed=copy.deepcopy(container);changed[0]['Image']='sha256:'+'0'*64
        rejects(lambda:run(good,cid=changed))
        changed2=copy.deepcopy(container);changed2[0]['State']['Running']=True
        rejects(lambda:run(good,cid=changed2))
        badm=copy.deepcopy(m);badm['artifacts'][0]['sha256']='0'*64
        rejects(lambda:run(good,expected=badm))
        rejects(lambda:run(good[:2]+[('layer.tar',tar_bytes([('app/'+paths[0],payload)]))]))
        rejects(lambda:run(good+[('config.json',cfg)]))
        changed3=copy.deepcopy(container);changed3[0]['Mounts']=[{'Destination':'/app'}]
        rejects(lambda:run(good,cid=changed3))
        rejects(lambda:run([good[0],('config.json',cfg+b' '),good[2]]))
    print('VOID_BUY_VOID_ENFORCEMENT_IMAGE_IDENTITY_SELF_TEST_GREEN cases='+str(count))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--self-test', action='store_true')
    parser.add_argument('--archive')
    parser.add_argument('--manifest')
    parser.add_argument('--image-id')
    parser.add_argument('--container-inspect')
    parser.add_argument('--checkout-head')
    args = parser.parse_args()
    if args.self_test:
        self_test()
    else:
        require(all([args.archive,args.manifest,args.image_id,args.container_inspect,args.checkout_head]), 'missing arguments')
        receipt = verify_archive(args.archive,json.loads(Path(args.manifest).read_bytes()),
                                 args.image_id,json.loads(Path(args.container_inspect).read_bytes()),args.checkout_head)
        print(json.dumps(receipt,sort_keys=True,indent=2))
