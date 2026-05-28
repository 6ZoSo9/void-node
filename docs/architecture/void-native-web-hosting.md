# VOID-Native Web Hosting

status: active_design
updated_at_utc: 20260528-094500

## Purpose

VOID public websites should not depend on Google Cloud or any other cloud provider as a critical hosting layer.

The target websites are:

- voidchain.io
- nullfeed.io

Legacy DNS may still point browsers to an entry node or gateway, but the website content itself should be hosted, mirrored, verified, and served by VOID Network.

## Principle

External providers are allowed only as temporary convenience gateways.

They must not be required for VOID Network to keep moving.

The canonical website state should be:

- content-addressed
- reproducible
- mirrored by VOID nodes
- verifiable by hash or manifest
- recoverable from VOID/DataNet storage
- independent of Google Cloud buckets, Cloud Run, App Engine, or managed sync jobs

## Target model

A VOID-hosted website has three parts:

1. Site bundle

   Static files such as:

   - index.html
   - assets
   - docs
   - download page
   - node install instructions

2. Site manifest

   A signed or hash-anchored JSON document containing:

   - site name
   - intended public domain
   - version
   - entry file
   - bundle hash
   - DataNet dataset id or VOID content root
   - release checkpoint
   - allowed mirrors

3. VOID gateway route

   A node route such as:

   - /site/voidchain
   - /site/nullfeed
   - /__void/site-manifest/voidchain.json
   - /__void/site-manifest/nullfeed.json

## Dependency posture

Allowed temporarily:

- domain registrar
- DNS records
- GitHub mirror
- manual static export

Not acceptable as long-term critical dependencies:

- Google Cloud hosting
- Google Cloud sync jobs
- Google Cloud buckets as source of truth
- Cloud Run or App Engine as required website infrastructure
- any provider that can stop VOID website availability by changing billing, policy, or account status

## Migration plan

Phase 1: repo design

- document VOID-native web hosting
- add manifest format
- add proofs that public docs do not claim Google Cloud is canonical

Phase 2: local website route

- add static site bundle under repo or generated public release output
- serve /site/voidchain locally from the node
- serve /site/nullfeed locally from the node
- expose site manifest JSON

Phase 3: DataNet-backed website bundle

- publish site bundle into DataNet
- verify hash on readback
- serve website from DataNet-backed storage
- keep local static fallback for bootstrapping

Phase 4: public domain cutover

- point voidchain.io and nullfeed.io to a VOID-operated gateway or reverse proxy
- keep DNS as legacy entry only
- make the VOID manifest the canonical content source

Phase 5: Google Cloud removal

- identify all Google Cloud resources
- back up anything needed
- remove buckets/services/sync jobs
- disable billing or delete project only after VOID-hosted site is proven

## Rule

Do not shut down legacy hosting until a VOID-hosted path is proven.

Do not make Google Cloud the canonical source again after migration.
