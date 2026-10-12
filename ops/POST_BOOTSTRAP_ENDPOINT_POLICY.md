# POST-BOOTSTRAP ENDPOINT POLICY

## Canonical source of truth
- Source-of-truth node: Precision
- Canonical remote node HTTP base: `http://100.93.2.116:4100`
- Local-only bootstrap/RPC: `http://127.0.0.1:8545`

## Remote access policy
- Remote operators and remote boxes must use Precision over Tailscale on port `4100`
- Remote `8545` is not part of the ops path and should remain closed
- `127.0.0.1:8545` is Precision-local only and must not be used from Alienware or other remote boxes

## Exposure policy
- `4100` and `4700` may bind broadly at runtime, but LAN ingress on `enp11s0` must be blocked
- LAN blocking is enforced by:
  - live iptables DROP rules on `enp11s0` for ports `4100` and `4700`
  - boot-time systemd service: `void-node-lan-block.service`
- Intended remote path is Tailscale, not LAN

## Runtime cleanup baseline
- Broken user override `85-upgrade-launcher.conf` is disabled
- Canonical runtime env is pinned in `95-postbootstrap-effective-env.conf`
- Stale services disabled:
  - `void-wc-relayer.service`
  - `void-workcredits-devnet-http.service`
  - `void-agent-bridge.service`
- Stale system symlink removed:
  - `/etc/systemd/system/multi-user.target.wants/void-node@bootstrap-1.service`

## Repeatable proofs
- Local/Tailscale ops proof:
  - `make post-bootstrap-ops-proof`
- Cross-box Alienware -> Precision proof:
  - `make post-bootstrap-crossbox-proof`

## Expected truth
- `make post-bootstrap-ops-proof` must pass
- `make post-bootstrap-crossbox-proof` must pass
- `http://100.93.2.116:4100/health` must answer
- `http://100.93.2.116:4100/__void/ready.json` must show `ready:true`
- `http://100.93.2.116:8545` must not answer remotely
