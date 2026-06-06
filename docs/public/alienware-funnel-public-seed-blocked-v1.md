# VOID Alienware Funnel public seed status

Status: blocked by Tailscale Funnel admin/operator gate.

What is green:

- Alienware public-safe edge adapter is active on 0.0.0.0:8080
- Edge upstream is http://127.0.0.1:4100
- /__void/ready.json returns ready true
- /__void/public-seed-adapter/status.json returns ok true
- /rpc is blocked with 404 not_public
- sensitive surfaces are blocked
- 8545 remains private on 127.0.0.1

What is blocked:

- tailscale funnel --bg 8080 failed because Funnel is not enabled for the tailnet and the user is not configured as the Tailscale operator on Alienware.

Observed blocker:

- Funnel is not enabled on your tailnet.
- Access denied: serve config denied.
- Suggested by tailscale: sudo tailscale set --operator=$USER once, then run tailscale funnel --bg 8080.

The prior tag ckpt-alienware-funnel-public-seed-v1-green-20260606-123500 should be treated as superseded, not as a valid green public Funnel checkpoint.
