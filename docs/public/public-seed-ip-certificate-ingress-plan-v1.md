# VOID public-seed IP-certificate ingress plan v1

Status: source-only architecture and content-addressed planning lane. It does not buy or provision a VPS, open firewall ports, issue certificates, create accounts, access credentials, install packages, start services, publish a manifest, deploy, or move funds.

## Purpose

The first durable domain-free public seed uses a dedicated public IP address and a publicly trusted IP-address certificate. The public service boundary is:

```text
TCP 80   -> ACME HTTP-01 challenge files only
TCP 443  -> HTTPS -> restricted gateway on 127.0.0.1:4111
TCP 4700 -> native VOID P2P

127.0.0.1:4111 -> restricted public-seed gateway
127.0.0.1:4100 -> VOID node HTTP
```

TCP 4100 and 4111 are never exposed to arbitrary public clients. SSH or another management plane is separate from the public-seed service contract and must be restricted by an operator-controlled source allowlist.

This corrects the earlier provisional shape that placed TCP 4100 on the public boundary. The unrestricted node HTTP listener is not the public synchronization ingress.

## Certificate contract

The plan records:

- `challenge=http-01`;
- external challenge port `80`;
- HTTPS service port `443`;
- ACME profile `shortlived`;
- certificate validity `160` hours;
- a renewal check every `1` through `12` hours, defaulting to `6`;
- a fail-closed renewal deadline of `24` hours before expiry;
- Certbot minimum version `5.4`;
- certificate, ACME webroot, service state, and node data roots outside the repository.

Current Let’s Encrypt IP-address certificates require the short-lived profile. Certbot 5.4 or newer supports webroot issuance using an IP identifier. HTTP-01 validation begins on external TCP 80; it cannot be moved to TCP 4100 or another arbitrary port.

Expected issuance shape after a separately reviewed deployment lane:

```bash
sudo certbot certonly \
  --preferred-profile shortlived \
  --webroot \
  --webroot-path /var/lib/void-public-seed/acme-webroot \
  --ip-address <PUBLIC_IP>
```

The deployment lane must use staging first, automate renewal and certificate reload, and hold publication whenever renewal or reload is unhealthy.

## Content-addressed plan

Example:

```bash
node scripts/build_void_public_seed_ip_cert_ingress_plan_v1.mjs \
  --public-ip 203.0.113.10 \
  --source-sha "$(git rev-parse HEAD)" \
  --repo-root "$PWD" \
  --state-root /var/lib/void-public-seed \
  --acme-webroot /var/lib/void-public-seed/acme-webroot \
  --cert-root /var/lib/void-public-seed/tls \
  --node-data-root /var/lib/void-node \
  --output /tmp/void-public-seed-ip-cert-ingress-plan-v1.json
```

The documentation address above is intentionally rejected by the builder. A real globally routable VPS address is required.

The plan is identified as `voidpsip1_<sha256>` and records no provider credential, SSH key, ACME account key, certificate private key, wallet, signer, validator, treasury, Work Credit, or money-moving authority.

## Ordered next gates

1. Merge the IP-literal qualifier and runtime TLS fixes.
2. Select one VPS with a dedicated stable public IP.
3. Build and review a provider-specific deployment packet from this plan.
4. Provision a non-root runtime user, storage, firewall, ACME challenge service, TLS ingress, restricted gateway, and native P2P service.
5. Reconstruct or transfer canonical state without authority material.
6. Issue a staging IP certificate, then production; prove automatic renewal and reload.
7. Qualify three public observations with nonzero head, `gap=0`, and `txroot_live=1`.
8. Publish the exact reviewed manifest.
9. Complete ordinary-machine clone/run acceptance outside the operator network.

## Authority boundary

This lane has no authority to purchase infrastructure, access an account, read or create credentials, expose ports, issue certificates, install software, start or restart services, publish a bootstrap endpoint, alter a manifest, access a wallet or signer, mutate validators or Work Credits, submit a transaction, or move funds.
