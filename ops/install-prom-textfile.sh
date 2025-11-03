#!/usr/bin/env bash
set -euo pipefail
# Ensure textfile dir for node_exporter exists
sudo install -d -m 755 /var/lib/node_exporter/textfile_collector

DST="/usr/local/bin/prom-textfile-snap-age.sh"

# If the publisher already exists, don't try to install it over itself.
if [[ -x "$DST" ]]; then
  echo "ok: $DST already present"
else
  echo "installing: $DST"
  # If you ever want to seed from a repo copy, drop it at ops/prom-textfile-snap-age.sh
  # and change the next line to use that as SRC.
  sudo tee "$DST" >/dev/null <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
repo_root="/home/zoso/dev/void-node"
snap_root="${repo_root}/ops/prom-snap"
out_dir="/var/lib/node_exporter/textfile_collector"
out_file="${out_dir}/void_ops_prom_snap_age.prom"
mkdir -p "$out_dir"
latest="$(ls -1 "${snap_root}" 2>/dev/null | sort | tail -n1 || true)"
if [[ -z "${latest}" ]]; then
  printf 'void_ops_prom_snap_age_seconds %d\n' 1000000000 > "${out_file}"
  exit 0
fi
ts="${latest}"
epoch="$(date -d "${ts:0:8} ${ts:9:2}:${ts:11:2}:${ts:13:2}" +%s)"
now="$(date +%s)"
age="$(( now - epoch ))"
printf 'void_ops_prom_snap_age_seconds %d\n' "${age}" > "${out_file}"
SCRIPT
  sudo chmod +x "$DST"
fi

# Convenience symlink inside repo (harmless if it already exists)
ln -sf "$DST" "$(git rev-parse --show-toplevel)/ops/prom-textfile-snap-age.sh"

echo "done."
