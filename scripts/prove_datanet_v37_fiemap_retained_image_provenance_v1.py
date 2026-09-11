#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
from __future__ import annotations

import argparse, fcntl, hashlib, json, os, stat, struct, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import datanet_v34_exec_claimant_record_v1 as rec

CONTROL = ROOT / "fixtures/datanet-v37-fiemap-retained-image-provenance-ext4-v1.json"
V31 = ROOT / "fixtures/datanet-v31-campaign-topology-ext4-v1.json"
ACCEPTED_V36 = "f50f65413b2531233078756e3904a05319599db8"
STATIC = "VOID_DATANET_V37_FIEMAP_RETAINED_IMAGE_PROVENANCE_STATIC_V1_GREEN"
CAPTURE = "VOID_DATANET_V37_FIEMAP_CAPTURE_V1_GREEN"
RAW = "VOID_DATANET_V37_FIEMAP_RAW_IMAGE_V1_GREEN"
FINAL = "VOID_DATANET_V37_FIEMAP_RETAINED_IMAGE_PROVENANCE_V1_GREEN"
FS_IOC_FIEMAP = 0xC020660B
LAST, UNKNOWN, DELALLOC, ENCODED = 0x1, 0x2, 0x4, 0x8
DATA_ENCRYPTED, NOT_ALIGNED, DATA_INLINE, DATA_TAIL = 0x80, 0x100, 0x200, 0x400
UNWRITTEN, MERGED, SHARED = 0x800, 0x1000, 0x2000
BAD = UNKNOWN|DELALLOC|ENCODED|DATA_ENCRYPTED|NOT_ALIGNED|DATA_INLINE|DATA_TAIL|UNWRITTEN|MERGED|SHARED
FH = struct.Struct("<QQIIII")
FE = struct.Struct("<QQQQQIIII")
BLOCK = 1 << 20


def emit(x): print(json.dumps(x, sort_keys=True, separators=(",", ":")))
def canon(x): return hashlib.sha256(json.dumps(x, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
def blob(path):
    b = path.read_bytes(); return hashlib.sha1(f"blob {len(b)}\0".encode()+b).hexdigest()
def ident(st): return f"{st.st_dev}:{st.st_ino}"

def ctl():
    c = json.loads(CONTROL.read_text())
    assert c["v"] == 1 and c["parent_pr"] == 1496 and c["parent_head"] == ACCEPTED_V36
    assert c["format"] == "VOID_DATANET_V37_FIEMAP_RETAINED_IMAGE_PROVENANCE_EXT4_CONTROL_V1"
    assert len(c["accepted_v36_blobs"]) == 4
    for rel, want in sorted(c["accepted_v36_blobs"].items()):
        p = ROOT / rel; assert p.is_file() and blob(p) == want, rel
    return c

def hash_fd(fd, size):
    h = hashlib.sha256(); off = 0
    while off < size:
        n = min(BLOCK, size-off); b = os.pread(fd, n, off); assert len(b) == n
        h.update(b); off += n
    assert os.pread(fd, 1, size) == b""
    return h.hexdigest()

def hash_path(path):
    h = hashlib.sha256()
    with path.open("rb", buffering=0) as f:
        while True:
            b = f.read(BLOCK)
            if not b: break
            h.update(b)
    return h.hexdigest()

def map_extents(fd, size):
    out, start = [], 0
    while True:
        count = 256; buf = bytearray(FH.size + FE.size*count)
        FH.pack_into(buf, 0, start, (1<<64)-1-start, 0, 0, count, 0)
        fcntl.ioctl(fd, FS_IOC_FIEMAP, buf, True)
        fm_start, _, flags, mapped, got_count, reserved = FH.unpack_from(buf, 0)
        assert fm_start == start and flags == 0 and got_count == count and reserved == 0 and 0 < mapped <= count
        saw_last = False
        for i in range(mapped):
            logical, physical, length, r0, r1, eflags, rr0, rr1, rr2 = FE.unpack_from(buf, FH.size+i*FE.size)
            assert r0 == r1 == rr0 == rr1 == rr2 == 0 and length > 0 and not (eflags & BAD)
            out.append({"logical":logical,"physical":physical,"length":length,"flags":eflags})
            if eflags & LAST:
                assert i == mapped-1; saw_last = True
        assert len(out) <= 4096
        if saw_last: break
        nxt = out[-1]["logical"] + out[-1]["length"]; assert nxt > start; start = nxt
    return out

def coverage(exts, size, bs):
    assert exts; cur = 0
    for ex in exts:
        assert ex["logical"] == cur and ex["logical"] % bs == 0 and ex["physical"] % bs == 0
        assert ex["length"] % bs == 0 and ex["physical"] > 0 and not (ex["flags"] & BAD)
        cur += ex["length"]
    assert cur >= size and cur-size < bs and exts[-1]["flags"] & LAST

def oracle(census, fixture):
    assert census["format"] == "VOID_DATANET_V34_CAMPAIGN_RESTART_CENSUS_V1" and census["cold_remount_proved"] is False
    fin = census["source_distinct_final_verifier"]
    assert fin["marker"] == "VOID_DATANET_V34_CAMPAIGN_FINAL_VERIFIER_V1_GREEN" and fin["status"] == "GREEN"
    meta = {(r,e["name"]):e for r in ("e0","r0") for e in census[r]["entries"]}
    hashes = {("e0",x["name"]):x["sha256"] for x in fin["e0"]["leaves"]}
    hashes.update({("r0",x["name"]):x["sha256"] for x in fin["r0"]["leaves"]})
    k = fixture["quota_key"]
    hashes[("r0",rec.armed_name(k))] = fin["armed_sha256"]
    hashes[("r0",rec.claimed_name(k))] = fin["claimed_sha256"]
    hashes[("r0",rec.closed_name(k))] = fin["closed_sha256"]
    assert len(hashes) == 6
    return meta, hashes

def capture_one(label, root, name, meta, want_sha):
    rfd = os.open(root, os.O_RDONLY|os.O_DIRECTORY|os.O_CLOEXEC)
    flags = os.O_RDONLY|os.O_CLOEXEC|(os.O_NOFOLLOW if hasattr(os,"O_NOFOLLOW") else 0)
    try: fd = os.open(name, flags, dir_fd=rfd)
    except Exception: os.close(rfd); raise
    try:
        st = os.fstat(fd); assert stat.S_ISREG(st.st_mode) and ident(st) == meta["identity"]
        assert st.st_size == meta["size"] > 0 and st.st_nlink == meta["nlink"] == 1
        assert oct(stat.S_IMODE(st.st_mode)) == meta["mode"] == "0o600"
        sha = hash_fd(fd, st.st_size); assert sha == want_sha
        bs = os.statvfs(root).f_frsize; assert bs > 0 and bs & (bs-1) == 0
        exts = map_extents(fd, st.st_size); coverage(exts, st.st_size, bs)
        return {"root":label,"name":name,"identity":ident(st),"size":st.st_size,"sha256":sha,
                "block_size":bs,"extent_count":len(exts),"mapped_bytes":sum(x["length"] for x in exts),"extents":exts}
    finally: os.close(fd); os.close(rfd)

def do_static(_):
    c = ctl(); q = c["claim"]
    for k in ("fiemap_retained_image_provenance","accepted_census_hash_oracle","raw_extent_bytes_match_accepted_file_hashes",
              "source_crash_images_byte_identical","loop_zero_offset","dm_linear_zero_offset","simulated_sudden_device_loss","journal_replay_recovery"):
        assert q[k] is True
    assert q["fiemap_sync_flag_used"] is False
    for k in ("physical_power_loss","hardware_write_cache_loss","hostile_same_uid_mutation","public_peer_retrieval","chain_2050_economic_authority","production_runtime_activation"):
        assert q[k] is False
    emit({"marker":STATIC,"status":"GREEN","accepted_v36_head":ACCEPTED_V36,"accepted_v36_blob_count":4,
          "fiemap_ioctl":hex(FS_IOC_FIEMAP),"fiemap_sync_flag_used":False,"physical_power_loss_proved":False,"production_runtime_touched":False})

def do_capture(ns):
    c = ctl(); fixture = json.loads(V31.read_text()); census = json.loads(Path(ns.pre_restart_census).read_text())
    meta, hashes = oracle(census, fixture); roots = {"e0":Path(ns.e0_root),"r0":Path(ns.r0_root)}
    for label, root in roots.items():
        st = os.stat(root, follow_symlinks=False); assert stat.S_ISDIR(st.st_mode) and ident(st) == census[label]["root_identity"]
    files = [capture_one(label, roots[label], name, meta[(label,name)], hashes[(label,name)]) for label,name in sorted(hashes)]
    m = {"marker":CAPTURE,"status":"GREEN","accepted_v36_head":ACCEPTED_V36,"accepted_v36_blob_count":len(c["accepted_v36_blobs"]),
         "fiemap_ioctl":hex(FS_IOC_FIEMAP),"fiemap_sync_flag_used":False,"oracle":"accepted_v34_restart_census_and_final_verifier",
         "file_count":len(files),"files":files,"production_runtime_touched":False}
    m["manifest_sha256"] = canon(m); Path(ns.output).write_text(json.dumps(m,sort_keys=True,separators=(",",":"))+"\n")
    emit({"marker":CAPTURE,"status":"GREEN","file_count":len(files),"extent_count":sum(x["extent_count"] for x in files),
          "manifest_sha256":m["manifest_sha256"],"fiemap_sync_flag_used":False,"production_runtime_touched":False})

def raw_hash(fd, image_size, entry):
    h = hashlib.sha256(); remain = entry["size"]; cur = 0; total = 0
    for ex in entry["extents"]:
        assert ex["logical"] == cur; take = min(ex["length"], remain); assert take > 0 and ex["physical"]+take <= image_size
        done = 0
        while done < take:
            n = min(BLOCK,take-done); b = os.pread(fd,n,ex["physical"]+done); assert len(b) == n
            h.update(b); done += n; total += n
        remain -= take; cur += ex["length"]
        if remain == 0: break
    assert remain == 0; return h.hexdigest(), total

def dm_table(s):
    p = s.split(); assert len(p) == 5 and int(p[0]) == 0 and int(p[1]) > 0 and p[2] == "linear" and ":" in p[3] and int(p[4]) == 0
    return {"start_sector":0,"length_sectors":int(p[1]),"target":"linear","backing":p[3],"offset_sector":0}

def do_verify(ns):
    c = ctl(); m = json.loads(Path(ns.manifest).read_text()); ms = m.pop("manifest_sha256"); assert canon(m) == ms; m["manifest_sha256"] = ms
    assert m["marker"] == CAPTURE and m["status"] == "GREEN" and m["accepted_v36_head"] == ACCEPTED_V36 and m["file_count"] == 6 and m["fiemap_sync_flag_used"] is False
    assert int(ns.e0_loop_offset) == int(ns.r0_loop_offset) == 0 and int(ns.e0_loop_sizelimit) == int(ns.r0_loop_sizelimit) == 0
    dmt = {"e0":dm_table(ns.e0_dm_table),"r0":dm_table(ns.r0_dm_table)}
    src = {"e0":Path(ns.e0_source_image),"r0":Path(ns.r0_source_image)}; crash = {"e0":Path(ns.e0_image),"r0":Path(ns.r0_image)}
    meta, fds = {}, {}
    try:
        for label in ("e0","r0"):
            ss, cs = src[label].stat(), crash[label].stat(); assert stat.S_ISREG(ss.st_mode) and stat.S_ISREG(cs.st_mode) and ss.st_size == cs.st_size > 0
            a,b = hash_path(src[label]), hash_path(crash[label]); assert a == b
            meta[label] = {"size":cs.st_size,"source_sha256":a,"crash_sha256":b,"source_crash_byte_identical":True}
            fds[label] = os.open(crash[label], os.O_RDONLY|os.O_CLOEXEC)
        verified=[]; raw_bytes=0
        for e in m["files"]:
            coverage(e["extents"],e["size"],e["block_size"]); sha,n = raw_hash(fds[e["root"]],meta[e["root"]]["size"],e); assert sha == e["sha256"]
            raw_bytes += n; verified.append({"root":e["root"],"name":e["name"],"size":e["size"],"sha256":sha,"extent_count":e["extent_count"],"raw_bytes_verified":n})
    finally:
        for fd in fds.values(): os.close(fd)
    r = {"marker":RAW,"status":"GREEN","accepted_v36_head":ACCEPTED_V36,"accepted_v36_blob_count":len(c["accepted_v36_blobs"]),
         "fiemap_manifest_sha256":ms,"fiemap_sync_flag_used":False,"loop_zero_offset":True,"loop_zero_sizelimit":True,"dm_linear_zero_offset":True,
         "dm_tables":dmt,"crash_images":meta,"file_count":len(verified),"extent_count":sum(x["extent_count"] for x in verified),"raw_bytes_verified":raw_bytes,
         "files":verified,"source_crash_images_byte_identical":True,"raw_extent_bytes_match_accepted_file_hashes":True,"fiemap_retained_image_provenance_proved":True,
         "physical_power_loss_proved":False,"hardware_write_cache_loss_proved":False,"hostile_same_uid_mutation_proved":False,"production_runtime_touched":False}
    r["receipt_sha256"] = canon(r); Path(ns.output).write_text(json.dumps(r,sort_keys=True,separators=(",",":"))+"\n"); emit(r)

def do_finalize(ns):
    c = ctl(); raw = json.loads(Path(ns.raw_receipt).read_text()); v36 = json.loads(Path(ns.v36_receipt).read_text())
    rs = raw.pop("receipt_sha256"); assert canon(raw) == rs; raw["receipt_sha256"] = rs
    assert raw["marker"] == RAW and raw["status"] == "GREEN" and raw["accepted_v36_head"] == ACCEPTED_V36
    assert raw["fiemap_retained_image_provenance_proved"] and raw["raw_extent_bytes_match_accepted_file_hashes"] and raw["source_crash_images_byte_identical"] and raw["file_count"] == 6
    assert v36["marker"] == "VOID_DATANET_V36_SUDDEN_DEVICE_LOSS_SIMULATION_V1_GREEN" and v36["status"] == "GREEN"
    assert v36["accepted_v35_head"] == c["accepted_v35_head"] and v36["simulated_sudden_device_loss_proved"] and v36["crash_image_needs_recovery_pre_replay"]
    assert v36["journal_replay_recovery_completed"] and v36["root_identity_stable"] and v36["pre_post_final_receipt_equal"] and v36["payload_leaves_verified"] == 3
    assert v36["physical_power_loss_proved"] is False and v36["production_runtime_touched"] is False
    out = {"marker":FINAL,"status":"GREEN","accepted_v36_head":ACCEPTED_V36,"fiemap_raw_receipt_sha256":rs,"v36_recovery_receipt_sha256":canon(v36),
           "file_count":raw["file_count"],"extent_count":raw["extent_count"],"raw_bytes_verified":raw["raw_bytes_verified"],"source_crash_images_byte_identical":True,
           "raw_extent_bytes_match_accepted_file_hashes":True,"fiemap_retained_image_provenance_proved":True,"simulated_sudden_device_loss_recovery_preserved":True,
           "physical_power_loss_proved":False,"hardware_write_cache_loss_proved":False,"hostile_same_uid_mutation_proved":False,"production_runtime_touched":False}
    out["receipt_sha256"] = canon(out); Path(ns.output).write_text(json.dumps(out,sort_keys=True,separators=(",",":"))+"\n"); emit(out)

def main():
    p=argparse.ArgumentParser(); sp=p.add_subparsers(dest="mode",required=True); sp.add_parser("static")
    c=sp.add_parser("capture"); c.add_argument("--e0-root",required=True); c.add_argument("--r0-root",required=True); c.add_argument("--pre-restart-census",required=True); c.add_argument("--output",required=True)
    v=sp.add_parser("verify-image")
    for a in ("manifest","e0-source-image","r0-source-image","e0-image","r0-image","e0-loop-offset","r0-loop-offset","e0-loop-sizelimit","r0-loop-sizelimit","e0-dm-table","r0-dm-table","output"): v.add_argument("--"+a,required=True)
    f=sp.add_parser("finalize"); f.add_argument("--raw-receipt",required=True); f.add_argument("--v36-receipt",required=True); f.add_argument("--output",required=True)
    ns=p.parse_args(); return do_static(ns) if ns.mode=="static" else do_capture(ns) if ns.mode=="capture" else do_verify(ns) if ns.mode=="verify-image" else do_finalize(ns)

if __name__ == "__main__": raise SystemExit(main())
