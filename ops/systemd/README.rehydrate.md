# Rehydrate DataNet + http4100 textfile exporters

These files mirror the installed systemd units and exporters:
- Installed: /etc/systemd/system/{void-http4100-listen-textfile-root.service, void-dn-enc-e2e.{service,timer}, void-dn-enc-e2e.timer.d/*}
- Installed: /usr/local/bin/{void-http4100-listen-textfile-once, void-dn-enc-e2e-textfile-once}
- Repo copies live here under ops/systemd and ops/bin.

To rehydrate on a fresh host:
  sudo cp -a ops/bin/* /usr/local/bin/
  sudo cp -a ops/systemd/void-*.service ops/systemd/void-*.timer /etc/systemd/system/
  sudo mkdir -p /etc/systemd/system/void-dn-enc-e2e.timer.d
  sudo cp -a ops/systemd/void-dn-enc-e2e.timer.d/* /etc/systemd/system/void-dn-enc-e2e.timer.d/
  sudo systemctl daemon-reload
  sudo systemctl enable --now void-dn-enc-e2e.timer
  # restart node_exporter if needed:
  sudo systemctl restart prometheus-node-exporter
