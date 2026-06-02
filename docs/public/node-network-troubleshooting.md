# VOID public node network troubleshooting

This runbook is for node operators whose local VOID node is still alive, but the machine loses internet access.

A common symptom is:

- `http://127.0.0.1:4100/__void/ready.json` still returns `ready:true`
- the home network still works for other devices
- the node machine cannot reach the internet
- rebooting temporarily fixes it

That usually points to a local host network issue, not a VOID chain issue.

## First check: is VOID still alive locally?

```bash
curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json && echo
```

If this returns `ready:true`, the node process is still alive locally.

## Check the network interface

```bash
ip -br link
ip -br addr
ip route
nmcli dev status 2>/dev/null || true
resolvectl status 2>/dev/null | sed -n '1,160p' || true
```

Look for:

- the active Ethernet or Wi-Fi device
- an IP address
- a default route
- DNS servers

## Check internet versus DNS

```bash
ping -c 2 -W 2 1.1.1.1 || true
ping -c 2 -W 2 8.8.8.8 || true
getent hosts github.com || true
curl -fsS --max-time 8 https://github.com >/dev/null && echo "[ok] https reachable" || echo "[fail] https unreachable"
```

If IP pings work but hostnames fail, it is probably DNS.

If IP pings fail, it is probably route, DHCP, Wi-Fi, Ethernet, cable, switch, router, or NIC driver.

## Check for Ethernet carrier flaps

For Ethernet nodes, carrier flaps mean the OS thinks the physical link disappeared.

```bash
journalctl -b -u NetworkManager --no-pager -o short-iso \
  | grep -Ei 'carrier|link|dhcp|lease|unavailable|disconnect|no lease' \
  | tail -n 160
```

Concerning signs include:

- `carrier-changed`
- `activated -> unavailable`
- `dhcp4 ... canceled DHCP transaction`
- `dhcp4 ... state changed no lease`
- repeated link down/link up cycles

These are usually below VOID: cable, port, router/switch, NIC driver, power management, or autonegotiation.

## Non-reboot recovery attempt

Try this before rebooting:

```bash
sudo systemctl restart NetworkManager
sleep 5

ip route
ping -c 2 -W 2 1.1.1.1 || true
getent hosts github.com || true
curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json && echo
```

## Deeper live-failure capture

Run this while the network is broken, before rebooting:

```bash
LOG="/tmp/void-node-network-live-failure-$(date +%Y%m%d-%H%M%S).log"

{
  date -Is
  echo "=== links/addrs/routes ==="
  ip -br link
  ip -br addr
  ip route
  echo

  echo "=== dns ==="
  resolvectl status 2>/dev/null | sed -n '1,180p' || true
  getent hosts github.com || true
  echo

  echo "=== pings ==="
  ping -c 2 -W 2 1.1.1.1 || true
  ping -c 2 -W 2 8.8.8.8 || true
  ping -c 2 -W 2 github.com || true
  echo

  echo "=== NetworkManager ==="
  nmcli dev status 2>/dev/null || true
  nmcli con show --active 2>/dev/null || true
  journalctl -u NetworkManager -n 180 --no-pager || true
  echo

  echo "=== kernel network tail ==="
  journalctl -k -n 220 --no-pager \
    | grep -Ei 'link|carrier|reset|timeout|firmware|ethernet|network|NETDEV|watchdog|dhcp|enp|eno|wlan' || true
  echo

  echo "=== VOID local readiness ==="
  curl -fsS --max-time 8 http://127.0.0.1:4100/__void/ready.json && echo || true
} | tee "$LOG"

echo "log=$LOG"
```

## Practical fixes

Try physical fixes first:

1. Reseat both ends of the cable.
2. Try a different cable.
3. Try a different router or switch port.
4. If using a multi-gig NIC, test a different speed or a different adapter.
5. If the local node remains ready, do not assume the VOID runtime is broken.

## Safety note

Network troubleshooting should not mutate chain state, validator state, wallet state, Buy VOID state, or Work Credits state.
