#!/usr/bin/env bash
# VOID Community License (VCL) v1.0 — see LICENSE
# Copyright (c) 2025 6ZoSo9
set -euo pipefail

: "${VOID_V45_NODE_MAJOR:?VOID_V45_NODE_MAJOR required}"
: "${VOID_V45_RUN_ID:?VOID_V45_RUN_ID required}"
: "${VOID_V45_EXPECTED_HEAD:?VOID_V45_EXPECTED_HEAD required}"
: "${VOID_V45_OUT_DIR:?VOID_V45_OUT_DIR required}"
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
e0_dm_name="void-v43-e0-${VOID_V45_NODE_MAJOR}-${VOID_V45_RUN_ID}"
r0_dm_name="void-v43-r0-${VOID_V45_NODE_MAJOR}-${VOID_V45_RUN_ID}"
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

printf '{"all_images_removed":true,"all_loops_released":true,"all_mappers_released":true,"all_mounts_released":true,"marker":"VOID_DATANET_V45_CAPABILITY_RELEASE_V1_GREEN","node_major":"%s","production_runtime_touched":false,"resource_token":"void-v43-%s-%s","status":"GREEN"}\n' \
  "$VOID_V45_NODE_MAJOR" "$VOID_V45_NODE_MAJOR" "$VOID_V45_RUN_ID" >"$v45_capability_receipt"

trap - EXIT
printf '{"marker":"VOID_DATANET_V45_V43_V44_FULL_STACK_RUN_V1_GREEN","node_major":"%s","production_runtime_touched":false,"status":"GREEN"}\n' "$VOID_V45_NODE_MAJOR"
