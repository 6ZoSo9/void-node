#!/usr/bin/env bash
# Source-bound workflow orchestration. Called only by the long-lived V45 custody session.
case "${1:-}" in
  --node-phases)
    set -euo pipefail
    test "$(git rev-parse HEAD)" = "$EXPECTED_HEAD"
    test "$(git merge-base "d73512174afd4f1f0f2591b11ae6bb9955e203ba" HEAD)" = "d73512174afd4f1f0f2591b11ae6bb9955e203ba"
    test "$(git diff --name-only --diff-filter=A "d73512174afd4f1f0f2591b11ae6bb9955e203ba"..HEAD | wc -l)" -eq 11
    test -z "$(git diff --name-only --diff-filter=CDMRTUXB "d73512174afd4f1f0f2591b11ae6bb9955e203ba"..HEAD)"
    test "$(uname -s)" = Linux
    test "$(uname -m)" = x86_64
    test -x /usr/sbin/losetup
    test -x /usr/sbin/mkfs.ext4
    test -x /usr/sbin/tune2fs
    test -x /usr/sbin/dmsetup
    test -x /usr/sbin/blockdev
    command -v strace >/dev/null
    command -v timeout >/dev/null
    command -v findmnt >/dev/null
    command -v mountpoint >/dev/null
    command -v jq >/dev/null

    out="$RUNNER_TEMP/void-v43-$V45_NODE_MAJOR-$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT-v45-stack"
    mkdir "$out"
    printf 'V45_OUT_DIR=%s\n' "$out" >>"$GITHUB_ENV"
    expected_tree="$(git rev-parse 'HEAD^{tree}')"
    printf 'V45_EXPECTED_TREE=%s\n' "$expected_tree" >>"$GITHUB_ENV"

    v45_bound() {
      supervisor_blob="$(git rev-parse "$EXPECTED_HEAD:scripts/prove_datanet_v45_source_execution_v1.py")"
      python3 -I -B -c 'import fcntl,hashlib,os,stat,sys; p,b=sys.argv[1:3]; f=os.open(p,os.O_RDONLY|os.O_CLOEXEC|getattr(os,"O_NOFOLLOW",0)); s=os.fstat(f); d=os.pread(f,s.st_size+1,0); t=os.fstat(f); k=lambda x:(x.st_dev,x.st_ino,x.st_mode,x.st_nlink,x.st_uid,x.st_gid,x.st_size,x.st_mtime_ns,x.st_ctime_ns); assert stat.S_ISREG(s.st_mode),"HOLD_V45_BOOTSTRAP_NOT_REGULAR"; assert s.st_nlink==1,"HOLD_V45_BOOTSTRAP_LINK_COUNT"; assert k(s)==k(t),"HOLD_V45_BOOTSTRAP_GENERATION_CHANGED"; assert len(d)==s.st_size,"HOLD_V45_BOOTSTRAP_SIZE_CHANGED"; assert hashlib.sha1(f"blob {len(d)}\0".encode()+d).hexdigest()==b,"HOLD_V45_BOOTSTRAP_BLOB_MISMATCH"; m=os.memfd_create("void-v45-source-supervisor",os.MFD_CLOEXEC|os.MFD_ALLOW_SEALING); assert os.write(m,d)==len(d),"HOLD_V45_BOOTSTRAP_MEMFD_WRITE"; fcntl.fcntl(m,1033,15); assert fcntl.fcntl(m,1034)==15,"HOLD_V45_BOOTSTRAP_MEMFD_SEALS"; os.close(f); os.set_inheritable(m,True); os.execv(sys.executable,[sys.executable,"-I","-B",f"/proc/self/fd/{m}","--supervisor-fd",str(m),"--bootstrap-supervisor-blob",b,*sys.argv[3:]])' \
        "$GITHUB_WORKSPACE/scripts/prove_datanet_v45_source_execution_v1.py" "$supervisor_blob" "$@"
    }
    bound_common=(--repo-root "$GITHUB_WORKSPACE" --expected-head "$EXPECTED_HEAD" --expected-tree "$expected_tree" --node-major "$V45_NODE_MAJOR" --run-id "$GITHUB_RUN_ID" --run-attempt "$GITHUB_RUN_ATTEMPT")

    source_ready="$RUNNER_TEMP/v45-source-$V45_NODE_MAJOR.ready"
    source_continue="$RUNNER_TEMP/v45-source-$V45_NODE_MAJOR.continue"
    source_control="$out/datanet-v45-source-generation-aba-control-$V45_NODE_MAJOR.json"
    v45_bound "${bound_common[@]}" --phase source-generation-aba-control \
      --entrypoint scripts/run_datanet_v45_full_stack_ext4_v1.sh \
      --receipt "$source_control" --expect-generation-hold \
      --control-ready "$source_ready" --control-continue "$source_continue" \
      --control-target scripts/run_datanet_v45_full_stack_ext4_v1.sh \
      -- /usr/bin/bash @ENTRYPOINT@ >"$RUNNER_TEMP/v45-source-$V45_NODE_MAJOR.stdout" &
    source_control_pid=$!
    for _ in $(seq 1 1500); do
      test ! -e "$source_ready" || break
      kill -0 "$source_control_pid" 2>/dev/null
      sleep 0.02
    done
    test -e "$source_ready"
    source_snapshot="$(jq -er '.snapshot_root' "$source_ready")"
    source_target="$source_snapshot/scripts/run_datanet_v45_full_stack_ext4_v1.sh"
    chmod u+w "$source_snapshot/scripts"
    mv -- "$source_target" "$source_snapshot/scripts/runner-generation-a.sh"
    cp -- "$source_snapshot/scripts/runner-generation-a.sh" "$source_target"
    printf '\n: "semantic no-op source generation B"\n' >>"$source_target"
    rm -- "$source_target"
    mv -- "$source_snapshot/scripts/runner-generation-a.sh" "$source_target"
    chmod u-w "$source_snapshot/scripts"
    touch "$source_continue"
    wait "$source_control_pid"
    jq -e '.marker=="VOID_DATANET_V45_SOURCE_GENERATION_ABA_CONTROL_V1_GREEN" and .rejection=="HOLD_V45_SOURCE_GENERATION_CHANGED" and .child_started==false' "$source_control" >/dev/null

    v41_static="$out/v41-static-$V45_NODE_MAJOR.jsonl"
    v45_bound "${bound_common[@]}" --phase v41-static \
      --entrypoint scripts/prove_datanet_v41_static_gate_v1.py \
      --receipt "$out/datanet-v45-source-execution-v41-static-$V45_NODE_MAJOR.json" \
      --owned-output "OUTPUT=$v41_static" --bind-output OUTPUT --stdout-output OUTPUT \
      -- python3 -I -B @ENTRYPOINT@
    v42_static="$out/v42-static-$V45_NODE_MAJOR.jsonl"
    v45_bound "${bound_common[@]}" --phase v42-static \
      --entrypoint scripts/prove_datanet_v42_fsverity_clean_remount_v1.py \
      --receipt "$out/datanet-v45-source-execution-v42-static-$V45_NODE_MAJOR.json" \
      --owned-output "OUTPUT=$v42_static" --bind-output OUTPUT --stdout-output OUTPUT \
      -- python3 -I -B @ENTRYPOINT@ static
    v43_static="$out/v43-static-$V45_NODE_MAJOR.jsonl"
    v45_bound "${bound_common[@]}" --phase v43-static \
      --entrypoint scripts/prove_datanet_v43_fsverity_sudden_loss_recovery_v1.py \
      --receipt "$out/datanet-v45-source-execution-v43-static-$V45_NODE_MAJOR.json" \
      --owned-output "OUTPUT=$v43_static" --bind-output OUTPUT --stdout-output OUTPUT \
      -- python3 -I -B @ENTRYPOINT@ static
    v44_static="$out/v44-static-$V45_NODE_MAJOR.jsonl"
    v45_bound "${bound_common[@]}" --phase v44-static \
      --entrypoint scripts/prove_datanet_v44_fsverity_raw_corruption_detection_v1.py \
      --receipt "$out/datanet-v45-source-execution-v44-static-$V45_NODE_MAJOR.json" \
      --owned-output "OUTPUT=$v44_static" --bind-output OUTPUT --stdout-output OUTPUT \
      -- python3 -I -B @ENTRYPOINT@ static
    v45_static="$out/v45-static-$V45_NODE_MAJOR.jsonl"
    v45_bound "${bound_common[@]}" --phase v45-static \
      --entrypoint scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py \
      --receipt "$out/datanet-v45-source-execution-v45-static-$V45_NODE_MAJOR.json" \
      --owned-output "OUTPUT=$v45_static" --bind-output OUTPUT --stdout-output OUTPUT \
      -- python3 -I -B @ENTRYPOINT@ static

    grep -F 'VOID_DATANET_V41_FSVERITY_GENERATION_BOUND_RECORD_COMPOSITION_STATIC_V1_GREEN' "$out/v41-static-$V45_NODE_MAJOR.jsonl"
    grep -F 'VOID_DATANET_V42_FSVERITY_CLEAN_REMOUNT_STATIC_V1_GREEN' "$out/v42-static-$V45_NODE_MAJOR.jsonl"
    grep -F 'VOID_DATANET_V43_FSVERITY_SUDDEN_LOSS_RECOVERY_STATIC_V1_GREEN' "$out/v43-static-$V45_NODE_MAJOR.jsonl"
    grep -F 'VOID_DATANET_V44_FSVERITY_RAW_CORRUPTION_DETECTION_STATIC_V1_GREEN' "$out/v44-static-$V45_NODE_MAJOR.jsonl"
    grep -F 'VOID_DATANET_V45_FULL_STACK_EVIDENCE_COMPOSITION_STATIC_V1_GREEN' "$out/v45-static-$V45_NODE_MAJOR.jsonl"

    custody_controls="$out/datanet-v45-custody-controls-$V45_NODE_MAJOR.json"
    v45_bound "${bound_common[@]}" --phase custody-selftest \
      --entrypoint scripts/prove_datanet_v45_custody_integration_v1.py \
      --receipt "$out/datanet-v45-source-execution-custody-selftest-$V45_NODE_MAJOR.json" \
      --owned-output "OUTPUT=$custody_controls" --bind-output OUTPUT -- \
      python3 -I -B @ENTRYPOINT@ --output @OUTPUT@
    jq -e '.marker=="VOID_DATANET_V45_CUSTODY_INTEGRATION_V1_GREEN" and (.cases|length)==15 and .full_campaign_accepted==false' "$custody_controls" >/dev/null

    matrix_argv_control="$out/datanet-v45-phase-argv-control-matrix-selftest-$V45_NODE_MAJOR.json"
    v45_bound "${bound_common[@]}" --phase matrix-selftest \
      --entrypoint scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py \
      --receipt "$matrix_argv_control" \
      --expect-hold HOLD_V45_PHASE_ARGV_NOT_ALLOWLISTED \
      -- python3 -I -B @ENTRYPOINT@ --help
    jq -e '.marker=="VOID_DATANET_V45_PHASE_OUTPUT_CONTROL_V1_GREEN" and .control_kind=="relabeled-help" and .rejection=="HOLD_V45_PHASE_ARGV_NOT_ALLOWLISTED" and .phase_contract.argv_allowlisted==false and .child_started==false' "$matrix_argv_control" >/dev/null

    v45_bound "${bound_common[@]}" --phase matrix-selftest \
      --entrypoint scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py \
      --receipt "$out/datanet-v45-source-execution-matrix-selftest-$V45_NODE_MAJOR.json" \
      -- python3 -I -B @ENTRYPOINT@ selftest

    runtime="$out/datanet-v45-runtime-$V45_NODE_MAJOR.json"
    v45_bound "${bound_common[@]}" --phase runtime \
      --entrypoint scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py \
      --receipt "$out/datanet-v45-source-execution-runtime-$V45_NODE_MAJOR.json" \
      --owned-output "OUTPUT=$runtime" --bind-output OUTPUT -- python3 -I -B @ENTRYPOINT@ runtime \
      --node-major @NODE_MAJOR@ \
      --output @OUTPUT@

    export V45_OUT_DIR="$out" V45_EXPECTED_TREE="$expected_tree"
    set -euo pipefail
    trace="$V45_OUT_DIR/datanet-v45-process-$V45_NODE_MAJOR.trace"
    runner_stdout="$V45_OUT_DIR/datanet-v45-runner-$V45_NODE_MAJOR.stdout.log"

    v45_bound() {
      supervisor_blob="$(git rev-parse "$EXPECTED_HEAD:scripts/prove_datanet_v45_source_execution_v1.py")"
      python3 -I -B -c 'import fcntl,hashlib,os,stat,sys; p,b=sys.argv[1:3]; f=os.open(p,os.O_RDONLY|os.O_CLOEXEC|getattr(os,"O_NOFOLLOW",0)); s=os.fstat(f); d=os.pread(f,s.st_size+1,0); t=os.fstat(f); k=lambda x:(x.st_dev,x.st_ino,x.st_mode,x.st_nlink,x.st_uid,x.st_gid,x.st_size,x.st_mtime_ns,x.st_ctime_ns); assert stat.S_ISREG(s.st_mode),"HOLD_V45_BOOTSTRAP_NOT_REGULAR"; assert s.st_nlink==1,"HOLD_V45_BOOTSTRAP_LINK_COUNT"; assert k(s)==k(t),"HOLD_V45_BOOTSTRAP_GENERATION_CHANGED"; assert len(d)==s.st_size,"HOLD_V45_BOOTSTRAP_SIZE_CHANGED"; assert hashlib.sha1(f"blob {len(d)}\0".encode()+d).hexdigest()==b,"HOLD_V45_BOOTSTRAP_BLOB_MISMATCH"; m=os.memfd_create("void-v45-source-supervisor",os.MFD_CLOEXEC|os.MFD_ALLOW_SEALING); assert os.write(m,d)==len(d),"HOLD_V45_BOOTSTRAP_MEMFD_WRITE"; fcntl.fcntl(m,1033,15); assert fcntl.fcntl(m,1034)==15,"HOLD_V45_BOOTSTRAP_MEMFD_SEALS"; os.close(f); os.set_inheritable(m,True); os.execv(sys.executable,[sys.executable,"-I","-B",f"/proc/self/fd/{m}","--supervisor-fd",str(m),"--bootstrap-supervisor-blob",b,*sys.argv[3:]])' \
        "$GITHUB_WORKSPACE/scripts/prove_datanet_v45_source_execution_v1.py" "$supervisor_blob" "$@"
    }
    bound_common=(--repo-root "$GITHUB_WORKSPACE" --expected-head "$EXPECTED_HEAD" --expected-tree "$V45_EXPECTED_TREE" --node-major "$V45_NODE_MAJOR" --run-id "$GITHUB_RUN_ID" --run-attempt "$GITHUB_RUN_ATTEMPT")

    v45_bound "${bound_common[@]}" --phase runner \
      --entrypoint scripts/run_datanet_v45_full_stack_ext4_v1.sh \
      --receipt "$V45_OUT_DIR/datanet-v45-source-execution-runner-$V45_NODE_MAJOR.json" \
      --owned-output "RUNNER_STDOUT=$runner_stdout" --owned-output "TRACE=$trace" \
      --bind-output RUNNER_STDOUT --bind-output TRACE \
      --stdout-output RUNNER_STDOUT --stderr-output TRACE \
      --path-token "EVIDENCE_ROOT=$V45_OUT_DIR" --entrypoint-stdin -- \
      timeout --signal=TERM --kill-after=60s 70m \
      sudo strace -f -q -ttt -s 4096 \
      -e trace=process,mount,umount2 \
      -o /dev/stderr -u @RUNNER_USER@ \
      /usr/bin/env -i \
        PATH=@ENV_PATH@ LANG=C.UTF-8 \
        GIT_DIR="@REPO_ROOT@/.git" \
        GIT_WORK_TREE="@REPO_ROOT@" \
        VOID_V45_NODE_MAJOR=@NODE_MAJOR@ \
        VOID_V45_RUN_ID=@RUN_ID@ \
        VOID_V45_RUN_ATTEMPT=@RUN_ATTEMPT@ \
        VOID_V45_EXPECTED_HEAD=@EXPECTED_HEAD@ \
        VOID_V45_OUT_DIR=@EVIDENCE_ROOT@ \
        /usr/bin/bash -s

    grep -F 'VOID_DATANET_V45_V43_V44_FULL_STACK_RUN_V1_GREEN' "$runner_stdout"

    control_dir="$(mktemp -d "$RUNNER_TEMP/void-v45-$V45_NODE_MAJOR-controls.XXXXXX")"
    candidate="$V45_OUT_DIR/datanet-v45-candidate-$V45_NODE_MAJOR.json"
    controls="$V45_OUT_DIR/datanet-v45-controls-$V45_NODE_MAJOR.json"
    producer_control="$V45_OUT_DIR/datanet-v45-producer-substitution-control-$V45_NODE_MAJOR.json"
    terminal_aba="$V45_OUT_DIR/datanet-v45-terminal-aba-control-$V45_NODE_MAJOR.json"
    aggregate="$V45_OUT_DIR/datanet-v45-aggregate-$V45_NODE_MAJOR.json"
    semantic_target="$V45_OUT_DIR/datanet-v43-final-$V45_NODE_MAJOR.json"

    candidate_snapshot="$control_dir/candidate-evidence"
    mkdir "$candidate_snapshot"
    cp -a -- "$V45_OUT_DIR/." "$candidate_snapshot/"
    semantic_target="$candidate_snapshot/datanet-v43-final-$V45_NODE_MAJOR.json"
    candidate_ready="$control_dir/candidate.ready"
    candidate_continue="$control_dir/candidate.continue"
    candidate_aba_receipt="$V45_OUT_DIR/datanet-v45-candidate-aba-control-$V45_NODE_MAJOR.json"
    v45_bound "${bound_common[@]}" --phase candidate-aba \
      --entrypoint scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py \
      --receipt "$V45_OUT_DIR/datanet-v45-source-execution-candidate-aba-$V45_NODE_MAJOR.json" \
      --owned-output "OUTPUT=$candidate_aba_receipt" --bind-output OUTPUT \
      --path-token "EVIDENCE_ROOT=$candidate_snapshot" \
      --path-token "GENERATION_READY=$candidate_ready" \
      --path-token "GENERATION_CONTINUE=$candidate_continue" \
      -- python3 -I -B @ENTRYPOINT@ candidate-aba-control \
      --node-major @NODE_MAJOR@ --evidence-root @EVIDENCE_ROOT@ \
      --expected-head @EXPECTED_HEAD@ --expected-tree @EXPECTED_TREE@ \
      --generation-control-ready @GENERATION_READY@ \
      --generation-control-continue @GENERATION_CONTINUE@ \
      --output @OUTPUT@ &
    candidate_control_pid=$!
    for _ in $(seq 1 1500); do
      test ! -e "$candidate_ready" || break
      kill -0 "$candidate_control_pid" 2>/dev/null
      sleep 0.02
    done
    test -e "$candidate_ready"
    mv -- "$semantic_target" "$control_dir/candidate-generation-a.json"
    printf '{"substituted_generation":true}\n' >"$semantic_target"
    rm -- "$semantic_target"
    mv -- "$control_dir/candidate-generation-a.json" "$semantic_target"
    touch "$candidate_continue"
    wait "$candidate_control_pid"
    jq -e '.marker=="VOID_DATANET_V45_CANDIDATE_ABA_CONTROL_V1_GREEN" and .rejection=="HOLD_V45_ARTIFACT_GENERATION_CHANGED"' "$candidate_aba_receipt" >/dev/null

    v45_bound "${bound_common[@]}" --phase candidate \
      --entrypoint scripts/prove_datanet_v45_full_stack_evidence_composition_v1.py \
      --receipt "$V45_OUT_DIR/datanet-v45-source-execution-candidate-$V45_NODE_MAJOR.json" \
      --owned-output "OUTPUT=$candidate" --bind-output OUTPUT \
      --path-token "EVIDENCE_ROOT=$V45_OUT_DIR" -- python3 -I -B @ENTRYPOINT@ candidate \
      --node-major @NODE_MAJOR@ --evidence-root @EVIDENCE_ROOT@ \
      --expected-head @EXPECTED_HEAD@ --expected-tree @EXPECTED_TREE@ \
      --output @OUTPUT@

    fake_candidate="$control_dir/substitute-candidate.json"
    fake_controls="$control_dir/substitute-controls.json"
    v45_bound "${bound_common[@]}" --phase controls \
      --entrypoint scripts/prove_datanet_v45_full_stack_aggregate_controls_v1.py \
      --receipt "$V45_OUT_DIR/datanet-v45-source-execution-controls-$V45_NODE_MAJOR.json" \
      --owned-output "OUTPUT=$controls" \
      --owned-output "SUBSTITUTE_CANDIDATE=$fake_candidate" \
      --owned-output "SUBSTITUTE_CONTROLS=$fake_controls" --bind-output OUTPUT \
      --path-token "CANDIDATE=$candidate" \
      --path-token "CANDIDATE_ABA_RECEIPT=$candidate_aba_receipt" \
      -- python3 -I -B @ENTRYPOINT@ \
      --candidate @CANDIDATE@ --candidate-generation-control-receipt @CANDIDATE_ABA_RECEIPT@ \
      --expected-head @EXPECTED_HEAD@ --expected-tree @EXPECTED_TREE@ \
      --substitute-candidate-output @SUBSTITUTE_CANDIDATE@ \
      --substitute-controls-output @SUBSTITUTE_CONTROLS@ \
      --output @OUTPUT@

    v45_bound "${bound_common[@]}" --phase producer-control \
      --entrypoint scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py \
      --receipt "$V45_OUT_DIR/datanet-v45-source-execution-producer-control-$V45_NODE_MAJOR.json" \
      --owned-output "OUTPUT=$producer_control" --bind-output OUTPUT \
      --path-token "EVIDENCE_ROOT=$V45_OUT_DIR" \
      --path-token "SUBSTITUTE_CANDIDATE=$fake_candidate" \
      --path-token "SUBSTITUTE_CONTROLS=$fake_controls" \
      -- python3 -I -B @ENTRYPOINT@ producer-control \
      --node-major @NODE_MAJOR@ --evidence-root @EVIDENCE_ROOT@ \
      --expected-head @EXPECTED_HEAD@ --expected-tree @EXPECTED_TREE@ \
      --substitute-candidate @SUBSTITUTE_CANDIDATE@ --substitute-controls @SUBSTITUTE_CONTROLS@ \
      --output @OUTPUT@

    terminal_snapshot="$control_dir/terminal-evidence"
    mkdir "$terminal_snapshot"
    cp -a -- "$V45_OUT_DIR/." "$terminal_snapshot/"
    semantic_target="$terminal_snapshot/datanet-v43-final-$V45_NODE_MAJOR.json"
    terminal_ready="$control_dir/terminal.ready"
    terminal_continue="$control_dir/terminal.continue"
    v45_bound "${bound_common[@]}" --phase terminal-aba \
      --entrypoint scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py \
      --receipt "$V45_OUT_DIR/datanet-v45-source-execution-terminal-aba-$V45_NODE_MAJOR.json" \
      --owned-output "OUTPUT=$terminal_aba" --bind-output OUTPUT \
      --path-token "EVIDENCE_ROOT=$terminal_snapshot" \
      --path-token "GENERATION_READY=$terminal_ready" \
      --path-token "GENERATION_CONTINUE=$terminal_continue" \
      -- python3 -I -B @ENTRYPOINT@ terminal-aba-control \
      --node-major @NODE_MAJOR@ --evidence-root @EVIDENCE_ROOT@ \
      --expected-head @EXPECTED_HEAD@ --expected-tree @EXPECTED_TREE@ \
      --generation-control-ready @GENERATION_READY@ \
      --generation-control-continue @GENERATION_CONTINUE@ \
      --output @OUTPUT@ &
    terminal_control_pid=$!
    for _ in $(seq 1 1500); do
      test ! -e "$terminal_ready" || break
      kill -0 "$terminal_control_pid" 2>/dev/null
      sleep 0.02
    done
    test -e "$terminal_ready"
    mv -- "$semantic_target" "$control_dir/terminal-generation-a.json"
    printf '{"substituted_generation":true}\n' >"$semantic_target"
    rm -- "$semantic_target"
    mv -- "$control_dir/terminal-generation-a.json" "$semantic_target"
    touch "$terminal_continue"
    wait "$terminal_control_pid"
    jq -e '.marker=="VOID_DATANET_V45_TERMINAL_ABA_CONTROL_V1_GREEN" and .rejection=="HOLD_V45_ARTIFACT_GENERATION_CHANGED"' "$terminal_aba" >/dev/null

    finalizer_argv_control="$V45_OUT_DIR/datanet-v45-phase-argv-control-finalizer-$V45_NODE_MAJOR.json"
    v45_bound "${bound_common[@]}" --phase finalizer \
      --entrypoint scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py \
      --receipt "$finalizer_argv_control" \
      --owned-output "OUTPUT=$aggregate" --bind-output OUTPUT \
      --path-token "EVIDENCE_ROOT=$V45_OUT_DIR" \
      --expect-hold HOLD_V45_PHASE_ARGV_NOT_ALLOWLISTED \
      -- python3 -I -B @ENTRYPOINT@ --help
    jq -e '.control_kind=="relabeled-help" and .rejection=="HOLD_V45_PHASE_ARGV_NOT_ALLOWLISTED" and .child_started==false' "$finalizer_argv_control" >/dev/null

    finalizer_preexisting_control="$V45_OUT_DIR/datanet-v45-preexisting-output-control-finalizer-$V45_NODE_MAJOR.json"
    printf 'VOID V45 PREEXISTING OUTPUT SENTINEL\n' >"$aggregate"
    sentinel_digest="$(sha256sum "$aggregate" | awk '{print $1}')"
    v45_bound "${bound_common[@]}" --phase finalizer \
      --entrypoint scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py \
      --receipt "$finalizer_preexisting_control" \
      --owned-output "OUTPUT=$aggregate" --bind-output OUTPUT \
      --path-token "EVIDENCE_ROOT=$V45_OUT_DIR" \
      --expect-hold HOLD_V45_OUTPUT_PREEXISTING \
      -- python3 -I -B @ENTRYPOINT@ finalize \
      --node-major @NODE_MAJOR@ --evidence-root @EVIDENCE_ROOT@ \
      --expected-head @EXPECTED_HEAD@ --expected-tree @EXPECTED_TREE@ \
      --output @OUTPUT@
    test "$(sha256sum "$aggregate" | awk '{print $1}')" = "$sentinel_digest"
    jq -e '.control_kind=="preexisting-output" and .rejection=="HOLD_V45_OUTPUT_PREEXISTING" and .phase_contract.argv_allowlisted==true and .child_started==false' "$finalizer_preexisting_control" >/dev/null
    rm -- "$aggregate"

    v45_bound "${bound_common[@]}" --phase finalizer \
      --entrypoint scripts/prove_datanet_v45_full_stack_terminal_verifier_v1.py \
      --receipt "$V45_OUT_DIR/datanet-v45-source-execution-finalizer-$V45_NODE_MAJOR.json" \
      --owned-output "OUTPUT=$aggregate" --bind-output OUTPUT \
      --path-token "EVIDENCE_ROOT=$V45_OUT_DIR" \
      -- python3 -I -B @ENTRYPOINT@ finalize \
      --node-major @NODE_MAJOR@ --evidence-root @EVIDENCE_ROOT@ \
      --expected-head @EXPECTED_HEAD@ --expected-tree @EXPECTED_TREE@ \
      --output @OUTPUT@

    jq -e --argjson GITHUB_RUN_ATTEMPT "$GITHUB_RUN_ATTEMPT" '
      .marker=="VOID_DATANET_V45_FULL_STACK_EVIDENCE_AGGREGATE_V2_GREEN" and
      .status=="GREEN" and
      .run_attempt==$GITHUB_RUN_ATTEMPT and
      .source_execution.run_attempt==$GITHUB_RUN_ATTEMPT and
      .artifact_generation_bound==true and
      .candidate_generation_aba_control==true and
      .terminal_generation_aba_control==true and
      .producer_substitution_control==true and
      .source_distinct_terminal_verifier==true and
      .terminal_verifier_imports_candidate_or_controls==false and
      .transitive_source_wall_verified==true and
      .source_inventory_and_execution_generation_bound==true and
      .external_source_generation_aba_control==true and
      .exact_phase_argv_allowlisted==true and
      .supervisor_owned_create_only_outputs==true and
      .relabeled_help_controls==true and
      .preexisting_output_controls==true and
      .workflow_run_attempt_bound==true and
      .runner_subgraph_process_census.full_job_process_census==false and
      .process_accounting.full_job_process_census==false and
      .full_job_process_census==false and
      .tiers.same_recovered_r0_record_composed==true and
      .full_campaign_evidence_accepted==false and
      .datanet_availability_proved==false and
      .production_runtime_touched==false
    ' "$aggregate" >/dev/null
    test "$(find "$V45_OUT_DIR" -type f | wc -l)" -eq "$(jq '.expected_archive_members | length' "$aggregate")"

    exit 0
    ;;
  --top-phases)
    set -euo pipefail
    test "$(git rev-parse HEAD)" = "$EXPECTED_HEAD"
    expected_tree="$(git rev-parse 'HEAD^{tree}')"
    top_dir="$RUNNER_TEMP/datanet-v45-node-22-24-26-top-$EXPECTED_HEAD-attempt-$GITHUB_RUN_ATTEMPT"
    mkdir "$top_dir"
    output="$top_dir/datanet-v45-node-22-24-26-top-$EXPECTED_HEAD-attempt-$GITHUB_RUN_ATTEMPT.json"
    v45_bound() {
      supervisor_blob="$(git rev-parse "$EXPECTED_HEAD:scripts/prove_datanet_v45_source_execution_v1.py")"
      python3 -I -B -c 'import fcntl,hashlib,os,stat,sys; p,b=sys.argv[1:3]; f=os.open(p,os.O_RDONLY|os.O_CLOEXEC|getattr(os,"O_NOFOLLOW",0)); s=os.fstat(f); d=os.pread(f,s.st_size+1,0); t=os.fstat(f); k=lambda x:(x.st_dev,x.st_ino,x.st_mode,x.st_nlink,x.st_uid,x.st_gid,x.st_size,x.st_mtime_ns,x.st_ctime_ns); assert stat.S_ISREG(s.st_mode),"HOLD_V45_BOOTSTRAP_NOT_REGULAR"; assert s.st_nlink==1,"HOLD_V45_BOOTSTRAP_LINK_COUNT"; assert k(s)==k(t),"HOLD_V45_BOOTSTRAP_GENERATION_CHANGED"; assert len(d)==s.st_size,"HOLD_V45_BOOTSTRAP_SIZE_CHANGED"; assert hashlib.sha1(f"blob {len(d)}\0".encode()+d).hexdigest()==b,"HOLD_V45_BOOTSTRAP_BLOB_MISMATCH"; m=os.memfd_create("void-v45-source-supervisor",os.MFD_CLOEXEC|os.MFD_ALLOW_SEALING); assert os.write(m,d)==len(d),"HOLD_V45_BOOTSTRAP_MEMFD_WRITE"; fcntl.fcntl(m,1033,15); assert fcntl.fcntl(m,1034)==15,"HOLD_V45_BOOTSTRAP_MEMFD_SEALS"; os.close(f); os.set_inheritable(m,True); os.execv(sys.executable,[sys.executable,"-I","-B",f"/proc/self/fd/{m}","--supervisor-fd",str(m),"--bootstrap-supervisor-blob",b,*sys.argv[3:]])' \
        "$GITHUB_WORKSPACE/scripts/prove_datanet_v45_source_execution_v1.py" "$supervisor_blob" "$@"
    }
    bound_common=(--repo-root "$GITHUB_WORKSPACE" --expected-head "$EXPECTED_HEAD" --expected-tree "$expected_tree" --node-major 0 --run-id "$GITHUB_RUN_ID" --run-attempt "$GITHUB_RUN_ATTEMPT")

    source_ready="$RUNNER_TEMP/v45-source-top.ready"
    source_continue="$RUNNER_TEMP/v45-source-top.continue"
    source_control="$top_dir/datanet-v45-source-generation-aba-control-top.json"
    v45_bound "${bound_common[@]}" --phase cross-runtime-source-generation-aba-control \
      --entrypoint scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py \
      --receipt "$source_control" --expect-generation-hold \
      --control-ready "$source_ready" --control-continue "$source_continue" \
      --control-target scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py \
      -- python3 -I -B @ENTRYPOINT@ selftest >"$RUNNER_TEMP/v45-source-top.stdout" &
    source_control_pid=$!
    for _ in $(seq 1 1500); do
      test ! -e "$source_ready" || break
      kill -0 "$source_control_pid" 2>/dev/null
      sleep 0.02
    done
    test -e "$source_ready"
    source_snapshot="$(jq -er '.snapshot_root' "$source_ready")"
    source_target="$source_snapshot/scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py"
    chmod u+w "$source_snapshot/scripts"
    mv -- "$source_target" "$source_snapshot/scripts/matrix-generation-a.py"
    cp -- "$source_snapshot/scripts/matrix-generation-a.py" "$source_target"
    printf '\n# semantic no-op source generation B\n' >>"$source_target"
    rm -- "$source_target"
    mv -- "$source_snapshot/scripts/matrix-generation-a.py" "$source_target"
    chmod u-w "$source_snapshot/scripts"
    touch "$source_continue"
    wait "$source_control_pid"
    jq -e '.marker=="VOID_DATANET_V45_SOURCE_GENERATION_ABA_CONTROL_V1_GREEN" and .rejection=="HOLD_V45_SOURCE_GENERATION_CHANGED"' "$source_control" >/dev/null

    selftest_receipt="$top_dir/datanet-v45-source-execution-cross-runtime-selftest.json"
    phase_argv_control="$top_dir/datanet-v45-phase-argv-control-cross-runtime-selftest.json"
    v45_bound "${bound_common[@]}" --phase cross-runtime-selftest \
      --entrypoint scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py \
      --receipt "$phase_argv_control" \
      --expect-hold HOLD_V45_PHASE_ARGV_NOT_ALLOWLISTED \
      -- python3 -I -B @ENTRYPOINT@ --help
    jq -e '.control_kind=="relabeled-help" and .rejection=="HOLD_V45_PHASE_ARGV_NOT_ALLOWLISTED" and .child_started==false' "$phase_argv_control" >/dev/null

    v45_bound "${bound_common[@]}" --phase cross-runtime-selftest \
      --entrypoint scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py \
      --receipt "$selftest_receipt" -- python3 -I -B @ENTRYPOINT@ selftest

    stale_attempt_control="$top_dir/datanet-v45-stale-attempt-control-top.json"
    stale_attempt_receipt="$top_dir/datanet-v45-source-execution-cross-runtime-stale-attempt-control.json"
    v45_bound "${bound_common[@]}" --phase cross-runtime-stale-attempt-control \
      --entrypoint scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py \
      --receipt "$stale_attempt_receipt" \
      --owned-output "OUTPUT=$stale_attempt_control" --bind-output OUTPUT -- \
      python3 -I -B @ENTRYPOINT@ stale-attempt-control \
      --run-id @RUN_ID@ --control-run-attempt @RUN_ATTEMPT@ \
      --expected-head @EXPECTED_HEAD@ \
      --producer-attempt 1 --finalizer-attempt 2 \
      --output @OUTPUT@
    jq -e --argjson run_id "$GITHUB_RUN_ID" '
      .marker=="VOID_DATANET_V45_STALE_ATTEMPT_CONTROL_V1_GREEN" and
      .status=="GREEN" and
      .producer_run_id==$run_id and .finalizer_run_id==$run_id and
      .control_run_attempt==1 and
      .producer_run_attempt==1 and .finalizer_run_attempt==2 and
      .rejection=="HOLD_V45_MATRIX_STALE_ATTEMPT" and
      .production_aggregate_rejection=="HOLD_V45_MATRIX_STALE_ATTEMPT" and
      .aggregate_published==false and
      .production_aggregate_path_exercised==true
    ' "$stale_attempt_control" >/dev/null

    aggregate_receipt="$top_dir/datanet-v45-source-execution-cross-runtime-aggregate.json"
    preexisting_output_control="$top_dir/datanet-v45-preexisting-output-control-cross-runtime-aggregate.json"
    printf 'VOID V45 PREEXISTING TOP OUTPUT SENTINEL\n' >"$output"
    sentinel_digest="$(sha256sum "$output" | awk '{print $1}')"
    v45_bound "${bound_common[@]}" --phase cross-runtime-aggregate \
      --entrypoint scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py \
      --receipt "$preexisting_output_control" \
      --owned-output "OUTPUT=$output" --bind-output OUTPUT \
      --path-token "SOURCE_CONTROL_RECEIPT=$source_control" \
      --path-token "SELFTEST_RECEIPT=$selftest_receipt" \
      --path-token "PHASE_ARGV_CONTROL_RECEIPT=$phase_argv_control" \
      --path-token "PREEXISTING_OUTPUT_CONTROL_RECEIPT=$preexisting_output_control" \
      --path-token "STALE_ATTEMPT_CONTROL=$stale_attempt_control" \
      --path-token "STALE_ATTEMPT_CONTROL_RECEIPT=$stale_attempt_receipt" \
      --expect-hold HOLD_V45_OUTPUT_PREEXISTING -- \
      python3 -I -B @ENTRYPOINT@ aggregate \
      --repository 6ZoSo9/void-node --run-id @RUN_ID@ --run-attempt @RUN_ATTEMPT@ \
      --api-url https://api.github.com --expected-head @EXPECTED_HEAD@ \
      --expected-tree @EXPECTED_TREE@ \
      --source-generation-control-receipt @SOURCE_CONTROL_RECEIPT@ \
      --source-selftest-receipt @SELFTEST_RECEIPT@ \
      --phase-argv-control-receipt @PHASE_ARGV_CONTROL_RECEIPT@ \
      --preexisting-output-control-receipt @PREEXISTING_OUTPUT_CONTROL_RECEIPT@ \
      --stale-attempt-control @STALE_ATTEMPT_CONTROL@ \
      --stale-attempt-control-receipt @STALE_ATTEMPT_CONTROL_RECEIPT@ \
      --output @OUTPUT@
    test "$(sha256sum "$output" | awk '{print $1}')" = "$sentinel_digest"
    jq -e '.control_kind=="preexisting-output" and .rejection=="HOLD_V45_OUTPUT_PREEXISTING" and .phase_contract.argv_allowlisted==true and .child_started==false' "$preexisting_output_control" >/dev/null
    rm -- "$output"

    v45_bound "${bound_common[@]}" --phase cross-runtime-aggregate \
      --entrypoint scripts/prove_datanet_v45_cross_runtime_aggregate_v1.py \
      --receipt "$aggregate_receipt" --owned-output "OUTPUT=$output" --bind-output OUTPUT \
      --path-token "SOURCE_CONTROL_RECEIPT=$source_control" \
      --path-token "SELFTEST_RECEIPT=$selftest_receipt" \
      --path-token "PHASE_ARGV_CONTROL_RECEIPT=$phase_argv_control" \
      --path-token "PREEXISTING_OUTPUT_CONTROL_RECEIPT=$preexisting_output_control" \
      --path-token "STALE_ATTEMPT_CONTROL=$stale_attempt_control" \
      --path-token "STALE_ATTEMPT_CONTROL_RECEIPT=$stale_attempt_receipt" -- \
      python3 -I -B @ENTRYPOINT@ aggregate \
      --repository 6ZoSo9/void-node --run-id @RUN_ID@ --run-attempt @RUN_ATTEMPT@ \
      --api-url https://api.github.com --expected-head @EXPECTED_HEAD@ \
      --expected-tree @EXPECTED_TREE@ \
      --source-generation-control-receipt @SOURCE_CONTROL_RECEIPT@ \
      --source-selftest-receipt @SELFTEST_RECEIPT@ \
      --phase-argv-control-receipt @PHASE_ARGV_CONTROL_RECEIPT@ \
      --preexisting-output-control-receipt @PREEXISTING_OUTPUT_CONTROL_RECEIPT@ \
      --stale-attempt-control @STALE_ATTEMPT_CONTROL@ \
      --stale-attempt-control-receipt @STALE_ATTEMPT_CONTROL_RECEIPT@ \
      --output @OUTPUT@
    jq -e '
      .marker=="VOID_DATANET_V45_NODE_22_24_26_TOP_AGGREGATE_V1_GREEN" and
      .status=="GREEN" and
      .run_attempt==1 and
      .source_execution.run_attempt==1 and
      .node_set==[22,24,26] and
      .exact_artifact_ids_bound==true and
      .artifact_api_and_zip_digests_bound==true and
      .per_node_membership_and_aggregate_bound==true and
      .node_runtime_labels_bound==true and
      .source_inventory_and_execution_generation_bound==true and
      .external_source_generation_aba_control==true and
      .exact_phase_argv_allowlisted==true and
      .supervisor_owned_create_only_outputs==true and
      .relabeled_help_controls==true and
      .preexisting_output_controls==true and
      .run_api_attempt_bound==true and
      .artifact_run_attempt_names_bound==true and
      .current_attempt_producer_membership_bound==true and
      .first_attempt_only==true and
      .stale_attempt_control==true and
      .all_cross_runtime_controls_rejected==true and
      .v45_full_stack_evidence_composition_accepted==false and
      .full_job_process_census==false and
      .datanet_availability_proved==false and
      .production_runtime_touched==false
    ' "$output" >/dev/null
    jq -e \
      --arg name "$(basename "$output")" \
      --arg digest "$(sha256sum "$output" | awk '{print $1}')" \
      --arg bytes "$(stat -c %s "$output")" '
      .marker=="VOID_DATANET_V45_SOURCE_EXECUTION_V1_GREEN" and
      .phase=="cross-runtime-aggregate" and
      .run_attempt==1 and
      .argument_token_bindings["@RUN_ATTEMPT@"]=="1" and
      .source_generation_stable_through_child==true and
      .phase_contract.id=="VOID_DATANET_V45_EXACT_PHASE_ARGV_AND_OUTPUT_CONTRACT_V1" and
      .phase_contract.argv_allowlisted==true and
      .phase_contract.owned_output_roles==["OUTPUT"] and
      .phase_contract.bound_output_roles==["OUTPUT"] and
      .output_paths_absent_before_supervisor_create==true and
      .output_files_supervisor_create_only==true and
      .output_fds_retained_through_child==true and
      .output_generation_stable_through_child==true and
      .output_bindings==[{"bytes":($bytes|tonumber),"name":$name,"sha256":$digest}] and
      .created_output_bindings==[{"bytes":($bytes|tonumber),"created_empty_before_child":true,"mode":256,"name":$name,"role":"OUTPUT","sha256":$digest}] and
      .stdout_binding=={"bytes":($bytes|tonumber),"role":"SUPERVISOR_PIPE","sha256":$digest}
    ' "$aggregate_receipt" >/dev/null
    printf 'V45_TOP_DIR=%s\n' "$top_dir" >>"$GITHUB_ENV"

    exit 0
    ;;
esac

# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
set -euo pipefail

: "${VOID_V45_NODE_MAJOR:?VOID_V45_NODE_MAJOR required}"
: "${VOID_V45_RUN_ID:?VOID_V45_RUN_ID required}"
: "${VOID_V45_RUN_ATTEMPT:?VOID_V45_RUN_ATTEMPT required}"
: "${VOID_V45_EXPECTED_HEAD:?VOID_V45_EXPECTED_HEAD required}"
: "${VOID_V45_OUT_DIR:?VOID_V45_OUT_DIR required}"
case "$VOID_V45_NODE_MAJOR" in
  22|24|26) ;;
  *) echo "V45 HOLD: invalid node major" >&2; exit 1 ;;
esac
[[ "$VOID_V45_RUN_ID" =~ ^[1-9][0-9]*$ ]] || {
  echo "V45 HOLD: invalid run ID" >&2
  exit 1
}
[[ "$VOID_V45_RUN_ATTEMPT" =~ ^[1-9][0-9]*$ ]] || {
  echo "V45 HOLD: invalid run attempt" >&2
  exit 1
}
test "$(git rev-parse HEAD)" = "$VOID_V45_EXPECTED_HEAD"
mkdir -p "$VOID_V45_OUT_DIR"

e0_image="$VOID_V45_OUT_DIR/void-v43-e0-${VOID_V45_NODE_MAJOR}.ext4"
r0_image="$VOID_V45_OUT_DIR/void-v43-r0-${VOID_V45_NODE_MAJOR}.ext4"
e0_crash="$VOID_V45_OUT_DIR/void-v43-e0-${VOID_V45_NODE_MAJOR}-crash.ext4"
r0_crash="$VOID_V45_OUT_DIR/void-v43-r0-${VOID_V45_NODE_MAJOR}-crash.ext4"
e0_mount="$VOID_V45_OUT_DIR/void-v43-e0-${VOID_V45_NODE_MAJOR}-mnt"
r0_mount="$VOID_V45_OUT_DIR/void-v43-r0-${VOID_V45_NODE_MAJOR}-mnt"
evidence="$VOID_V45_OUT_DIR/datanet-v43-v41-evidence-${VOID_V45_NODE_MAJOR}"
campaign_out="$VOID_V45_OUT_DIR/datanet-v43-v41-${VOID_V45_NODE_MAJOR}.stdout.log"
campaign_err="$VOID_V45_OUT_DIR/datanet-v43-v41-${VOID_V45_NODE_MAJOR}.stderr.log"
pre="$VOID_V45_OUT_DIR/datanet-v43-pre-${VOID_V45_NODE_MAJOR}.json"
post="$VOID_V45_OUT_DIR/datanet-v43-post-${VOID_V45_NODE_MAJOR}.json"
pre_log="$VOID_V45_OUT_DIR/datanet-v43-pre-${VOID_V45_NODE_MAJOR}.jsonl"
post_log="$VOID_V45_OUT_DIR/datanet-v43-post-${VOID_V45_NODE_MAJOR}.jsonl"
final="$VOID_V45_OUT_DIR/datanet-v43-final-${VOID_V45_NODE_MAJOR}.json"
final_log="$VOID_V45_OUT_DIR/datanet-v43-final-${VOID_V45_NODE_MAJOR}.jsonl"
e0_pre_super="$VOID_V45_OUT_DIR/datanet-v43-e0-pre-${VOID_V45_NODE_MAJOR}.txt"
r0_pre_super="$VOID_V45_OUT_DIR/datanet-v43-r0-pre-${VOID_V45_NODE_MAJOR}.txt"
e0_post_super="$VOID_V45_OUT_DIR/datanet-v43-e0-post-${VOID_V45_NODE_MAJOR}.txt"
r0_post_super="$VOID_V45_OUT_DIR/datanet-v43-r0-post-${VOID_V45_NODE_MAJOR}.txt"
capture_receipt="$VOID_V45_OUT_DIR/datanet-v43-crash-copy-${VOID_V45_NODE_MAJOR}.txt"
sources="$VOID_V45_OUT_DIR/datanet-v43-sources-${VOID_V45_NODE_MAJOR}.txt"
v44_manifest="$VOID_V45_OUT_DIR/datanet-v45-v44-capture-${VOID_V45_NODE_MAJOR}.json"
v44_capture_log="$VOID_V45_OUT_DIR/datanet-v45-v44-capture-${VOID_V45_NODE_MAJOR}.jsonl"
v44_corruption="$VOID_V45_OUT_DIR/datanet-v45-v44-corruption-${VOID_V45_NODE_MAJOR}.json"
v44_corruption_log="$VOID_V45_OUT_DIR/datanet-v45-v44-corruption-${VOID_V45_NODE_MAJOR}.jsonl"
v44_final="$VOID_V45_OUT_DIR/datanet-v45-v44-final-${VOID_V45_NODE_MAJOR}.json"
v44_final_log="$VOID_V45_OUT_DIR/datanet-v45-v44-final-${VOID_V45_NODE_MAJOR}.jsonl"
v44_raw_diff="$VOID_V45_OUT_DIR/datanet-v45-v44-raw-diff-${VOID_V45_NODE_MAJOR}.txt"
v44_super_after="$VOID_V45_OUT_DIR/datanet-v45-v44-super-after-${VOID_V45_NODE_MAJOR}.txt"
v44_loop_receipt="$VOID_V45_OUT_DIR/datanet-v45-v44-loop-${VOID_V45_NODE_MAJOR}.txt"
v45_capability_receipt="$VOID_V45_OUT_DIR/datanet-v45-capability-release-${VOID_V45_NODE_MAJOR}.json"
r0_before="$VOID_V45_OUT_DIR/void-v45-r0-${VOID_V45_NODE_MAJOR}-before-corruption.ext4"
e0_dm_name="void-v43-e0-${VOID_V45_NODE_MAJOR}-${VOID_V45_RUN_ID}-${VOID_V45_RUN_ATTEMPT}"
r0_dm_name="void-v43-r0-${VOID_V45_NODE_MAJOR}-${VOID_V45_RUN_ID}-${VOID_V45_RUN_ATTEMPT}"
e0_dm="/dev/mapper/$e0_dm_name"
r0_dm="/dev/mapper/$r0_dm_name"
e0_loop=""; r0_loop=""
e0_loop_on=0; r0_loop_on=0; e0_dm_on=0; r0_dm_on=0; e0_suspended=0; r0_suspended=0; e0_mounted=0; r0_mounted=0
cleanup() {
  set +e
  [ "$r0_mounted" -eq 0 ] || sudo umount -l "$r0_mount"
  [ "$e0_mounted" -eq 0 ] || sudo umount -l "$e0_mount"
  [ "$r0_suspended" -eq 0 ] || sudo dmsetup resume "$r0_dm_name" 2>/dev/null || true
  [ "$e0_suspended" -eq 0 ] || sudo dmsetup resume "$e0_dm_name" 2>/dev/null || true
  [ "$r0_dm_on" -eq 0 ] || sudo dmsetup remove --force "$r0_dm_name" 2>/dev/null || true
  [ "$e0_dm_on" -eq 0 ] || sudo dmsetup remove --force "$e0_dm_name" 2>/dev/null || true
  [ "$r0_loop_on" -eq 0 ] || sudo losetup -d "$r0_loop" 2>/dev/null || true
  [ "$e0_loop_on" -eq 0 ] || sudo losetup -d "$e0_loop" 2>/dev/null || true
  rmdir "$r0_mount" "$e0_mount" 2>/dev/null || true
  rm -f "$r0_before" "$r0_crash" "$e0_crash" "$r0_image" "$e0_image"
}
trap cleanup EXIT

dd if=/dev/zero of="$e0_image" bs=1M count=512 status=none
dd if=/dev/zero of="$r0_image" bs=1M count=512 status=none
/usr/sbin/mkfs.ext4 -F -q -O verity -E lazy_itable_init=0,lazy_journal_init=0 "$e0_image"
/usr/sbin/mkfs.ext4 -F -q -O verity -E lazy_itable_init=0,lazy_journal_init=0 "$r0_image"
/usr/sbin/tune2fs -l "$e0_image" | grep -E '^Filesystem features:.*\bverity\b'
/usr/sbin/tune2fs -l "$r0_image" | grep -E '^Filesystem features:.*\bverity\b'

e0_loop="$(sudo losetup --direct-io=on --find --show "$e0_image")"; e0_loop_on=1
r0_loop="$(sudo losetup --direct-io=on --find --show "$r0_image")"; r0_loop_on=1
test "$e0_loop" != "$r0_loop"
e0_sectors="$(sudo /usr/sbin/blockdev --getsz "$e0_loop")"
r0_sectors="$(sudo /usr/sbin/blockdev --getsz "$r0_loop")"
sudo dmsetup create "$e0_dm_name" --table "0 $e0_sectors linear $e0_loop 0"; e0_dm_on=1
sudo dmsetup create "$r0_dm_name" --table "0 $r0_sectors linear $r0_loop 0"; r0_dm_on=1
e0_dm_dev_before="$(stat -Lc '%t:%T' "$e0_dm")"
r0_dm_dev_before="$(stat -Lc '%t:%T' "$r0_dm")"
mkdir "$e0_mount" "$r0_mount" "$evidence"
sudo mount -o rw,nosuid,nodev,noexec "$e0_dm" "$e0_mount"; e0_mounted=1
sudo mount -o rw,nosuid,nodev,noexec "$r0_dm" "$r0_mount"; r0_mounted=1
e0_source_before="$(findmnt -n -o SOURCE --target "$e0_mount")"
r0_source_before="$(findmnt -n -o SOURCE --target "$r0_mount")"
test "$e0_source_before" = "$e0_dm"; test "$r0_source_before" = "$r0_dm"
sudo mkdir "$e0_mount/store" "$r0_mount/store"
sudo chown "$(id -u):$(id -g)" "$e0_mount/store" "$r0_mount/store"
sudo chmod 0700 "$e0_mount/store" "$r0_mount/store"
export VOID_DATANET_V34_E0_ROOT="$e0_mount/store"
export VOID_DATANET_V34_R0_ROOT="$r0_mount/store"
export VOID_DATANET_V34_EVIDENCE_DIR="$evidence"

python3 -I -B scripts/prove_datanet_v41_durable_recovery_campaign_ext4_v1.py >"$campaign_out" 2>"$campaign_err"
test ! -s "$campaign_err"
grep -F '"marker":"VOID_DATANET_V41_DURABLE_RECOVERY_CAMPAIGN_V1_GREEN"' "$campaign_out"
grep -F '"calls":15372' "$campaign_out"
grep -F '"completed_mib":960' "$campaign_out"
grep -F '"total_lifetimes":27' "$campaign_out"
grep -F '"peak_live":9' "$campaign_out"
grep -F '"fsverity_record_immutability":true' "$campaign_out"
test "$(find "$evidence" -mindepth 1 -maxdepth 1 -type f | wc -l)" -eq 5

python3 -I -B scripts/prove_datanet_v42_fsverity_clean_remount_v1.py capture \
  --e0-root "$e0_mount/store" --r0-root "$r0_mount/store" \
  --pre-restart-census "$evidence/restart-census.json" --output "$pre" >"$pre_log"
grep -F 'VOID_DATANET_V42_FSVERITY_REMOUNT_SNAPSHOT_V1_GREEN' "$pre_log"

sudo dmsetup suspend --noflush "$e0_dm_name"; e0_suspended=1
sudo dmsetup suspend --noflush "$r0_dm_name"; r0_suspended=1
cp --reflink=never --sparse=never "$e0_image" "$e0_crash"
cp --reflink=never --sparse=never "$r0_image" "$r0_crash"
sync -f "$e0_crash"; sync -f "$r0_crash"
e0_source_sha="$(sha256sum "$e0_image" | awk '{print $1}')"
e0_crash_sha="$(sha256sum "$e0_crash" | awk '{print $1}')"
r0_source_sha="$(sha256sum "$r0_image" | awk '{print $1}')"
r0_crash_sha="$(sha256sum "$r0_crash" | awk '{print $1}')"
test "$e0_source_sha" = "$e0_crash_sha"; test "$r0_source_sha" = "$r0_crash_sha"
printf 'e0_source_sha256=%s\ne0_crash_sha256=%s\nr0_source_sha256=%s\nr0_crash_sha256=%s\n' \
  "$e0_source_sha" "$e0_crash_sha" "$r0_source_sha" "$r0_crash_sha" >"$capture_receipt"

sudo dmsetup resume "$r0_dm_name"; r0_suspended=0
sudo dmsetup resume "$e0_dm_name"; e0_suspended=0
sudo umount "$r0_mount"; r0_mounted=0
sudo umount "$e0_mount"; e0_mounted=0
sudo dmsetup remove "$r0_dm_name"; r0_dm_on=0
sudo dmsetup remove "$e0_dm_name"; e0_dm_on=0
sudo losetup -d "$r0_loop"; r0_loop_on=0
sudo losetup -d "$e0_loop"; e0_loop_on=0

sudo losetup --direct-io=on "$e0_loop" "$e0_crash"; e0_loop_on=1
sudo losetup --direct-io=on "$r0_loop" "$r0_crash"; r0_loop_on=1
sudo dmsetup create "$e0_dm_name" --table "0 $e0_sectors linear $e0_loop 0"; e0_dm_on=1
sudo dmsetup create "$r0_dm_name" --table "0 $r0_sectors linear $r0_loop 0"; r0_dm_on=1
e0_dm_dev_after="$(stat -Lc '%t:%T' "$e0_dm")"
r0_dm_dev_after="$(stat -Lc '%t:%T' "$r0_dm")"
test "$e0_dm_dev_after" = "$e0_dm_dev_before"
test "$r0_dm_dev_after" = "$r0_dm_dev_before"

sudo /usr/sbin/tune2fs -l "$e0_dm" >"$e0_pre_super"
sudo /usr/sbin/tune2fs -l "$r0_dm" >"$r0_pre_super"
grep -F needs_recovery "$e0_pre_super"; grep -F needs_recovery "$r0_pre_super"
grep -E '^Filesystem features:.*\bverity\b' "$e0_pre_super"
grep -E '^Filesystem features:.*\bverity\b' "$r0_pre_super"

sudo mount -o rw,nosuid,nodev,noexec "$e0_dm" "$e0_mount"; e0_mounted=1
sudo mount -o rw,nosuid,nodev,noexec "$r0_dm" "$r0_mount"; r0_mounted=1
sync
sudo umount "$r0_mount"; r0_mounted=0
sudo umount "$e0_mount"; e0_mounted=0
sudo /usr/sbin/tune2fs -l "$e0_dm" >"$e0_post_super"
sudo /usr/sbin/tune2fs -l "$r0_dm" >"$r0_post_super"
! grep -Fq needs_recovery "$e0_post_super"; ! grep -Fq needs_recovery "$r0_post_super"
grep -E '^Filesystem features:.*\bverity\b' "$e0_post_super"
grep -E '^Filesystem features:.*\bverity\b' "$r0_post_super"

sudo mount -o rw,nosuid,nodev,noexec "$e0_dm" "$e0_mount"; e0_mounted=1
sudo mount -o rw,nosuid,nodev,noexec "$r0_dm" "$r0_mount"; r0_mounted=1
e0_source_after="$(findmnt -n -o SOURCE --target "$e0_mount")"
r0_source_after="$(findmnt -n -o SOURCE --target "$r0_mount")"
test "$e0_source_after" = "$e0_source_before"; test "$r0_source_after" = "$r0_source_before"
findmnt -n -o OPTIONS --target "$e0_mount" | grep -Eq '(^|,)rw(,|$)'
findmnt -n -o OPTIONS --target "$r0_mount" | grep -Eq '(^|,)rw(,|$)'
printf 'e0_before=%s\ne0_after=%s\nr0_before=%s\nr0_after=%s\ne0_dm_before=%s\ne0_dm_after=%s\nr0_dm_before=%s\nr0_dm_after=%s\n' \
  "$e0_source_before" "$e0_source_after" "$r0_source_before" "$r0_source_after" \
  "$e0_dm_dev_before" "$e0_dm_dev_after" "$r0_dm_dev_before" "$r0_dm_dev_after" >"$sources"

python3 -I -B scripts/prove_datanet_v42_fsverity_clean_remount_v1.py capture \
  --e0-root "$e0_mount/store" --r0-root "$r0_mount/store" \
  --pre-restart-census "$evidence/restart-census.json" --output "$post" >"$post_log"
grep -F 'VOID_DATANET_V42_FSVERITY_REMOUNT_SNAPSHOT_V1_GREEN' "$post_log"
cmp -s "$pre" "$post"

python3 -I -B scripts/prove_datanet_v43_fsverity_sudden_loss_recovery_v1.py verify \
  --pre-snapshot "$pre" --post-snapshot "$post" \
  --e0-pre-super "$e0_pre_super" --r0-pre-super "$r0_pre_super" \
  --e0-post-super "$e0_post_super" --r0-post-super "$r0_post_super" \
  --e0-source-before "$e0_source_before" --e0-source-after "$e0_source_after" \
  --r0-source-before "$r0_source_before" --r0-source-after "$r0_source_after" \
  --e0-dm-dev-before "$e0_dm_dev_before" --e0-dm-dev-after "$e0_dm_dev_after" \
  --r0-dm-dev-before "$r0_dm_dev_before" --r0-dm-dev-after "$r0_dm_dev_after" \
  --output "$final" >"$final_log"
grep -F '"marker":"VOID_DATANET_V43_FSVERITY_SUDDEN_LOSS_RECOVERY_V1_GREEN"' "$final_log"
grep -F '"journal_replay_recovery_completed":true' "$final_log"
grep -F '"pre_post_v42_snapshot_equal":true' "$final_log"
grep -F '"record_fsverity_digest_stable":true' "$final_log"
grep -F '"fresh_v41_admission_after_recovery":true' "$final_log"
grep -F '"physical_power_loss_proved":false' "$final_log"
grep -F '"hardware_write_cache_loss_proved":false' "$final_log"
grep -F '"production_runtime_touched":false' "$final_log"

# Compose V44 on the exact R0 filesystem that V43 just recovered.
sync
read -r r0_loop_offset r0_loop_sizelimit < <(sudo losetup -l -n -O OFFSET,SIZELIMIT "$r0_loop")
test "$r0_loop_offset" = "0"
test "$r0_loop_sizelimit" = "0"
r0_dm_table="$(sudo dmsetup table "$r0_dm_name")"
test "$(awk '{print $1}' <<<"$r0_dm_table")" = "0"
test "$(awk '{print $3}' <<<"$r0_dm_table")" = "linear"
test "$(awk '{print $5}' <<<"$r0_dm_table")" = "0"
printf 'r0_loop=%s\noffset=%s\nsizelimit=%s\ndm_name=%s\ndm_table=%s\n' \
  "$r0_loop" "$r0_loop_offset" "$r0_loop_sizelimit" "$r0_dm_name" "$r0_dm_table" >"$v44_loop_receipt"

python3 -I -B scripts/prove_datanet_v44_fsverity_raw_corruption_detection_v1.py capture \
  --r0-root "$r0_mount/store" --image "$r0_crash" --output "$v44_manifest" >"$v44_capture_log"
grep -F '"marker":"VOID_DATANET_V44_FSVERITY_RAW_PREIMAGE_CAPTURE_V1_GREEN"' "$v44_capture_log"
grep -F '"raw_preimage_matches_sealed_record":true' "$v44_capture_log"

sudo umount "$r0_mount"; r0_mounted=0
sudo umount "$e0_mount"; e0_mounted=0
sudo dmsetup remove "$r0_dm_name"; r0_dm_on=0
sudo losetup -d "$r0_loop"; r0_loop_on=0

cp --reflink=never --sparse=never "$r0_crash" "$r0_before"
python3 -I -B scripts/prove_datanet_v44_fsverity_raw_corruption_detection_v1.py corrupt \
  --image "$r0_crash" --manifest "$v44_manifest" --output "$v44_corruption" >"$v44_corruption_log"
grep -F '"marker":"VOID_DATANET_V44_FSVERITY_RAW_SINGLE_BYTE_CORRUPTION_V1_GREEN"' "$v44_corruption_log"
grep -F '"bytes_written":1' "$v44_corruption_log"
set +e
cmp -l "$r0_before" "$r0_crash" >"$v44_raw_diff"
cmp_rc=$?
set -e
test "$cmp_rc" -eq 1
test "$(wc -l <"$v44_raw_diff")" -eq 1
read -r diff_position diff_before diff_after diff_extra <"$v44_raw_diff"
test -z "${diff_extra:-}"
test "$diff_position" -eq "$(( $(jq -r .physical_offset "$v44_corruption") + 1 ))"
test "$diff_before" = "173"
test "$diff_after" = "172"
test "$(jq -r .before_hex "$v44_corruption")" = "7b"
test "$(jq -r .after_hex "$v44_corruption")" = "7a"

sudo losetup --direct-io=on "$r0_loop" "$r0_crash"; r0_loop_on=1
sudo dmsetup create "$r0_dm_name" --table "0 $r0_sectors linear $r0_loop 0"; r0_dm_on=1
r0_dm_dev_v44="$(stat -Lc '%t:%T' "$r0_dm")"
test "$r0_dm_dev_v44" = "$r0_dm_dev_after"
sudo /usr/sbin/tune2fs -l "$r0_dm" >"$v44_super_after"
grep -E '^Filesystem features:.*\bverity\b' "$v44_super_after"
! grep -Fq needs_recovery "$v44_super_after"
sudo mount -o rw,nosuid,nodev,noexec "$r0_dm" "$r0_mount"; r0_mounted=1
findmnt -n -o OPTIONS --target "$r0_mount" | grep -Eq '(^|,)rw(,|$)'

python3 -I -B scripts/prove_datanet_v44_fsverity_raw_corruption_detection_v1.py verify \
  --r0-root "$r0_mount/store" --manifest "$v44_manifest" \
  --corruption-receipt "$v44_corruption" --output "$v44_final" >"$v44_final_log"
grep -F '"marker":"VOID_DATANET_V44_FSVERITY_RAW_CORRUPTION_DETECTION_V1_GREEN"' "$v44_final_log"
grep -F '"record_generation_stable":true' "$v44_final_log"
grep -F '"fsverity_root_digest_stable":true' "$v44_final_log"
grep -F '"fsverity_data_read_eio":true' "$v44_final_log"
grep -F '"actual_v41_admission_fails_on_corrupted_record":true' "$v44_final_log"
grep -F '"production_runtime_touched":false' "$v44_final_log"

sudo umount "$r0_mount"; r0_mounted=0
sudo dmsetup remove "$r0_dm_name"; r0_dm_on=0
sudo losetup -d "$r0_loop"; r0_loop_on=0
sudo dmsetup remove "$e0_dm_name"; e0_dm_on=0
sudo losetup -d "$e0_loop"; e0_loop_on=0

if mountpoint -q "$r0_mount" || mountpoint -q "$e0_mount"; then
  echo "V45 HOLD: mount capability remained live" >&2
  exit 1
fi
if sudo dmsetup info "$r0_dm_name" >/dev/null 2>&1 || sudo dmsetup info "$e0_dm_name" >/dev/null 2>&1; then
  echo "V45 HOLD: mapper capability remained live" >&2
  exit 1
fi
test -z "$(sudo losetup -j "$r0_crash")"
test -z "$(sudo losetup -j "$e0_crash")"
test ! -e "$r0_dm"
test ! -e "$e0_dm"

rmdir "$r0_mount" "$e0_mount"
rm -f "$r0_before" "$r0_crash" "$e0_crash" "$r0_image" "$e0_image"
test ! -e "$r0_before"
test ! -e "$r0_crash"
test ! -e "$e0_crash"
test ! -e "$r0_image"
test ! -e "$e0_image"

printf '{"all_images_removed":true,"all_loops_released":true,"all_mappers_released":true,"all_mounts_released":true,"marker":"VOID_DATANET_V45_CAPABILITY_RELEASE_V1_GREEN","node_major":%s,"production_runtime_touched":false,"resource_token":"void-v43-%s-%s-%s","run_attempt":%s,"run_id":%s,"status":"GREEN"}\n' \
  "$VOID_V45_NODE_MAJOR" "$VOID_V45_NODE_MAJOR" "$VOID_V45_RUN_ID" "$VOID_V45_RUN_ATTEMPT" "$VOID_V45_RUN_ATTEMPT" "$VOID_V45_RUN_ID" >"$v45_capability_receipt"

trap - EXIT
printf '{"marker":"VOID_DATANET_V45_V43_V44_FULL_STACK_RUN_V1_GREEN","node_major":%s,"production_runtime_touched":false,"run_attempt":%s,"run_id":%s,"status":"GREEN"}\n' \
  "$VOID_V45_NODE_MAJOR" "$VOID_V45_RUN_ATTEMPT" "$VOID_V45_RUN_ID"
