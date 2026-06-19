#!/usr/bin/env bash
set -euo pipefail

DOC="docs/public/node-hosted-public-domains-plan-v1.md"

echo "=== VOID node-hosted public domains plan v1 proof ==="

test -f "$DOC"

grep -Fq 'VOID_NODE_HOSTED_PUBLIC_DOMAINS_PLAN_V1' "$DOC"

grep -Fq 'voidchain.io' "$DOC"
grep -Fq 'nullfeed.io' "$DOC"

grep -Fq 'Domains are names. Nodes are the host.' "$DOC"
grep -Fq 'They must point to VOID node-hosted services.' "$DOC"

grep -Fq 'Buy VOID / Fund Development' "$DOC"
grep -Fq 'Participant / Earn WC' "$DOC"
grep -Fq 'DataNet Verification' "$DOC"
grep -Fq 'Public Node / Proof Dashboard' "$DOC"

grep -Fq 'https://zoso-alienware-aurora-r7.taila47fd.ts.net' "$DOC"

grep -Fq 'No-paid-hosting boundary' "$DOC"
grep -Fq 'Google Cloud hosting' "$DOC"
grep -Fq 'Cloud Run' "$DOC"
grep -Fq 'Compute Engine' "$DOC"
grep -Fq 'VPS hosting' "$DOC"
grep -Fq 'paid CDN hosting' "$DOC"

grep -Fq 'DNS may be used only as a naming layer' "$DOC"
grep -Fq 'HTTPS is terminated by node-controlled infrastructure' "$DOC"

grep -Fq 'DNS mutation' "$DOC"
grep -Fq 'registrar mutation' "$DOC"
grep -Fq 'Google Cloud mutation' "$DOC"
grep -Fq 'Tailscale mutation' "$DOC"
grep -Fq 'hosting purchase' "$DOC"
grep -Fq 'wallet action' "$DOC"
grep -Fq 'money movement' "$DOC"
grep -Fq 'automatic VOID fulfillment' "$DOC"
grep -Fq 'Work Credit ledger write' "$DOC"
grep -Fq 'operator route exposure' "$DOC"
grep -Fq 'private JSON-RPC exposure' "$DOC"

grep -Fq 'Public domain promotion must not outrun node-hosted proof.' "$DOC"

echo "domain_voidchain_io_declared=true"
echo "domain_nullfeed_io_declared=true"
echo "domains_are_dns_identity_only=true"
echo "node_hosted_required=true"
echo "paid_hosting_required=false"
echo "google_cloud_hosting_required=false"
echo "cloud_run_required=false"
echo "vps_required=false"
echo "dns_mutation_performed_now=false"
echo "hosting_purchase_performed_now=false"
echo "wallet_action_performed_now=false"
echo "money_movement_performed_now=false"
echo "wc_ledger_write_performed_now=false"
echo "private_route_exposure_performed_now=false"
echo "VOID_NODE_HOSTED_PUBLIC_DOMAINS_PLAN_V1_GREEN"
