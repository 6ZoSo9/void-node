# VOID Alienware public exposure discovery note

Alienware is confirmed as an internal/operator-mesh seed candidate over Tailscale.

Alienware public IPv4 discovered by ipify: 73.176.56.174.
Alienware public IPv6 discovered by ipify: 2601:244:5688:c0a0:b52:eada:4a9e:e1c.

Alienware IPv6 is assigned to the host interface, but the VOID app is currently listening on IPv4 only via HTTP_HOST=0.0.0.0.

Alienware public IPv4 probe to http://73.176.56.174:4100/__void/ready.json timed out.

Current conclusion: Alienware is not yet proven public-internet reachable. The next self-hosted path is IPv6/dual-stack listener testing or explicit router/firewall exposure, while keeping 8545 private.
