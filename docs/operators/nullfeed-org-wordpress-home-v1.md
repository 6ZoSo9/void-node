# nullfeed.org WordPress home v1

Marker: `NULLFEED_ORG_WORDPRESS_HOME_OPERATOR_V1`

## Purpose

`https://nullfeed.org/` now has its own Northwest-hosted WordPress installation,
valid HTTPS, and published front page. The default page is not a reviewed
NullFeed surface and is not versioned in GitHub. This lane creates the same
source-of-truth and guarded publication boundary used for `voidchain.org`
without sharing its page ID, credentials, or production environment.

The canonical v1 page is an honest, static, read-only introduction to NullFeed.
It does not expose forms or browser scripts and does not claim that accounts,
registration, wallets, transactions, paid work, Work Credit awards, or
settlement are available.

## Exact target

- Domain: `https://nullfeed.org/`
- WordPress page ID: `350041`
- Current slug: `coming-soon`
- Required template: `blank`
- Required status: `publish`
- Canonical page title after apply: `NullFeed`

The sync tool holds if any target field except the title differs. Apply writes
only the title and content of page `350041`; it does not change the slug,
template, publication status, site settings, theme, plugins, users, DNS, email,
network services, or any economic state.

## Source and proof

- Page source: `ops/public/nullfeed-org-wordpress-home-v1.html`
- Fail-closed sync: `ops/public/sync-nullfeed-org-wordpress-home-v1.mjs`
- Deterministic proof: `scripts/prove_nullfeed_org_wordpress_home_v1.mjs`
- GitHub workflow: `.github/workflows/nullfeed-org-wordpress-home-v1.yml`

Run locally from the repository root:

```bash
node --check ops/public/sync-nullfeed-org-wordpress-home-v1.mjs
node --check scripts/prove_nullfeed_org_wordpress_home_v1.mjs
node scripts/prove_nullfeed_org_wordpress_home_v1.mjs
```

The proof requires one WordPress Custom HTML block, a full-width WordPress
wrapper repair, responsive layout contracts, unique IDs, an exact link allowlist,
the honest capability boundary, and an entirely static page. It adversarially
rejects paragraph contamination, lost layout rules, executable elements,
unreviewed links, and any mismatch in the page ID, slug, template, status, or
canonical link.

## Read-only inspection

Inspection is the default:

```bash
node ops/public/sync-nullfeed-org-wordpress-home-v1.mjs --inspect
```

Without credentials it reads only the public REST representation. With both
NullFeed credential variables it reads the raw editable page and reports the
exact `modified_gmt` and SHA-256 required by an apply:

- `NULLFEED_WORDPRESS_USERNAME`
- `NULLFEED_WORDPRESS_APPLICATION_PASSWORD`

Do not put either value in source, commands, logs, issues, pull requests, or
receipts. NullFeed must not reuse the `voidchain.org` application password or
GitHub environment secrets.

## Guarded apply and rollback

Apply requires credentials plus the exact authenticated-inspect values:

```bash
node ops/public/sync-nullfeed-org-wordpress-home-v1.mjs \
  --apply \
  --expected-modified-gmt 'YYYY-MM-DDTHH:MM:SS' \
  --expected-content-sha256 '64-lowercase-hex-characters'
```

Immediately before its write, the tool re-reads page `350041` and holds if the
modification time or raw-content digest changed. It writes the reviewed title
and canonical content, re-reads the raw page, and verifies the public rendered
page. If post-write verification fails, it attempts to restore the prior title
and content and confirms that restoration before reporting a hold. WordPress
revisions remain an additional operator recovery path.

The workflow runs proof for pull requests. Manual inspect and apply jobs use the
separate `nullfeed-org-production` environment. That environment and its two
secrets must be configured through a later, separately authorized operation.

## Operational truth

Source, commit, merge, environment configuration, authenticated inspection,
production apply, and browser acceptance are separate states. Merging these
files does not change `nullfeed.org`. No production write is authorized by this
document or workflow alone.
