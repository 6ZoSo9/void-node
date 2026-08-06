# VOID public-seed IP-literal qualification v1

Status: source-only repair for issue #1005. No VPS, certificate, manifest, service, credential, or public endpoint is created or activated by this lane.

## Blocker

The durable bootstrap decision uses a replaceable VPS with one dedicated public IP. Merged source previously accepted only fully qualified DNS hostnames for `stable_https_seed`, so a domain-free endpoint could not be qualified or published even when HTTPS and the restricted gateway were otherwise exact-green.

## Repair contract

A seed origin may now be either:

- `https://<fully-qualified-hostname>` using the existing DNS-resolution, rebinding, and connected-address binding path; or
- `https://<public-ip-literal>` using a DNS-free exact-address path.

IP-literal mode:

- accepts only HTTPS with no credentials, path, query, or fragment;
- accepts only public IPv4 or IPv6 literals;
- rejects loopback, private/LAN, link-local, CGNAT/Tailnet, documentation, benchmark, multicast, and reserved ranges;
- performs no DNS lookup for the seed endpoint;
- pins every request to the exact endpoint address;
- records `address_source=ip_literal`, the endpoint address, an empty DNS-evidence array, and actual connected addresses;
- requires every connected address to equal the endpoint address; and
- rejects mixed DNS/IP evidence.

The FQDN mode remains unchanged: every connected address must remain public and present in the before/after DNS evidence.

## Qualification

After a separately reviewed VPS deployment has valid automated HTTPS for its public IP and exposes only the restricted gateway:

```bash
node scripts/qualify_void_public_seed_v1.mjs \
  --endpoint https://<VPS_PUBLIC_IP> \
  --samples 3 \
  --interval-ms 30000 \
  --output /tmp/void-public-seed-ip-qualification-v1.json
```

The candidate receipt may then be passed to the existing manifest builder. Building a candidate file does not publish it.

## Proof

```bash
node scripts/prove_void_public_seed_ip_literal_qualification_v1.mjs
node scripts/prove_void_public_seed_qualification_v1.mjs
npm run typecheck
```

CI repeats the focused boundary on Node.js 22, 24, and 26.

## Authority boundary

This lane does not provision a VPS, request or renew a certificate, read credentials, alter DNS, expose a port, publish `public/bootstrap/v1.json`, start or restart a service, access a wallet or signer, mutate validators or Work Credit, submit a transaction, or move funds. Deployment, live qualification, manifest publication, and ordinary-machine outside-network acceptance remain separate explicit gates.
