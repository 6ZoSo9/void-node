#!/usr/bin/env python3
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
from __future__ import annotations
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; CONTROL=ROOT/"fixtures/datanet-v39-generation-bound-record-admission-ext4-v1.json"; MARKER="VOID_DATANET_V39_GENERATION_BOUND_RECORD_ADMISSION_STATIC_V1_GREEN"
def blob(p):
    b=p.read_bytes(); return hashlib.sha1(f"blob {len(b)}\0".encode()+b).hexdigest()
def main():
    c=json.loads(CONTROL.read_text()); assert c["v"]==1 and c["format"]=="VOID_DATANET_V39_GENERATION_BOUND_RECORD_ADMISSION_EXT4_CONTROL_V1"; assert c["parent_pr"]==1498 and c["parent_head"]=="bdf244f56b151250cb76a595864cde8e174ea499"; assert len(c["accepted_v38_blobs"])==4
    for rel,want in sorted(c["accepted_v38_blobs"].items()): assert blob(ROOT/rel)==want,(rel,blob(ROOT/rel),want)
    p=c["preserved_campaign"]; assert p=={"durable_sequence":["ARMED","CLAIMED","S1","CLOSED"],"role_lifetimes":21,"helper_lifetimes":6,"total_lifetimes":27,"peak_live":9,"calls":15372,"completed_mib":960}
    q=c["claim"]
    for k in ("v3_record_identity_generation_embedded","record_creation_observes_generation_before_write","record_admission_observes_generation_before_trust","claimed_generation_bound_before_payload_allocation","armed_claimed_fd_binding_preserved_across_exec","closed_finalized_after_s1_postpublication_readback","same_uid_same_inode_exact_byte_replacement_rejected_by_actual_admission"): assert q[k] is True
    assert q["topology_growth"] is False and q["physical_power_loss"] is False and q["arbitrary_same_uid_mutation"] is False and q["production_runtime_activation"] is False
    print(json.dumps({"marker":MARKER,"status":"GREEN","accepted_v38_head":c["parent_head"],"accepted_v38_blob_count":4,"record_schema":"V3","role_lifetimes":21,"helper_lifetimes":6,"total_lifetimes":27,"peak_live":9,"production_runtime_touched":False},sort_keys=True,separators=(",",":"))); return 0
if __name__=="__main__": raise SystemExit(main())
