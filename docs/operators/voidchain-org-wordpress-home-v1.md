# voidchain.org WordPress home v1

Marker: `VOIDCHAIN_ORG_WORDPRESS_HOME_OPERATOR_V1`

## Purpose

The public `https://voidchain.org/` page uses the WordPress blank template. That
theme applies an `800px` maximum width to direct page-content children. The
previous page requested `width: 100vw` but did not clear the inherited
`max-width`, so Firefox rendered the VOID page as an 800px strip with the rest
of the viewport left on the theme's white canvas.

The canonical page source now:

- packages the entire page as one WordPress Custom HTML block so server-side
  paragraph formatting cannot inject `<p>` or `<br>` markup into CSS or
  JavaScript;
- clears the WordPress wrapper and root `max-width` constraints;
- removes theme padding and gives the page canvas the VOID background;
- retains the static node snapshot and read-only live browser refresh;
- preserves responsive metric, card, and mobile-header layouts; and
- keeps the primary network links on `voidchain.org`.

## Source and proof

- Page source: `ops/public/voidchain-org-wordpress-home-v1.html`
- Fail-closed sync tool: `ops/public/sync-voidchain-org-wordpress-home-v1.mjs`
- Deterministic proof: `scripts/prove_voidchain_org_wordpress_home_v1.mjs`
- GitHub workflow: `.github/workflows/voidchain-org-wordpress-home-v1.yml`

Run the local proof from the repository root:

```bash
node --check ops/public/sync-voidchain-org-wordpress-home-v1.mjs
node --check scripts/prove_voidchain_org_wordpress_home_v1.mjs
node scripts/prove_voidchain_org_wordpress_home_v1.mjs
```

The proof reproduces the 800px constraint with a 1920px viewport fixture and
requires the repaired root to resolve to the full 1920px width. It also checks
the responsive CSS, unique element IDs, canonical links, live-client syntax,
GET-only browser behavior, fallback retention, the Custom HTML block boundary,
the prior paragraph-injection failure fixture, and the guarded sync contract.

## WordPress rendering boundary

The first guarded v1 apply proved that a successful REST write is not enough.
WordPress accepted the exact raw page, then its content filter inserted
paragraph markup inside the page's `<style>` and `<script>` elements. The
outer canvas became dark, but the full-width root rule and live client were
invalid in the public document, leaving the content at the theme's 800px
maximum.

The canonical file must therefore remain one `<!-- wp:html -->` Custom HTML
block. The sync tool validates both the editable raw content and the public
rendered content. It holds if WordPress contaminates either scoped element,
if the full-width root rule is missing, or if the rendered live-client source
does not compile.

## Read-only inspection

Inspection is the default and does not mutate WordPress:

```bash
node ops/public/sync-voidchain-org-wordpress-home-v1.mjs --inspect
```

Without credentials, inspection reads only the public rendered page and reports
whether the v1 layout markers are live. With the two credential variables below,
it reads WordPress's raw editable content and reports the exact
`modified_gmt` and content SHA-256 needed for an apply gate.

Do not put credentials in a command, log, issue, pull request, or tracked file.
The supported variables are:

- `VOIDCHAIN_WORDPRESS_USERNAME`
- `VOIDCHAIN_WORDPRESS_APPLICATION_PASSWORD`

## Guarded apply

Apply is deliberately a separate gate. It requires credentials plus both exact
values from an authenticated inspection:

```bash
node ops/public/sync-voidchain-org-wordpress-home-v1.mjs \
  --apply \
  --expected-modified-gmt 'YYYY-MM-DDTHH:MM:SS' \
  --expected-content-sha256 '64-lowercase-hex-characters'
```

Immediately before its single WordPress write, the tool re-reads page `243945`
with edit context and holds if the modification time or raw-content digest has
changed. It writes only the page content. It does not change the title, slug,
publication status, template, site theme, plugins, users, DNS, CORS, gateway,
node service, or any economic/network state. It then re-reads the editable
content, requires exact canonical SHA-256 equivalence, reads the public
rendered page, and rejects paragraph contamination, a missing full-width rule,
or invalid live-client JavaScript before reporting `APPLIED`.

The GitHub workflow exposes the same inspect/apply split through
`workflow_dispatch`. Store the two credentials as secrets in the
`voidchain-org-production` GitHub environment and use the exact values from an
inspect run for the apply inputs. Pull requests run proof only; they cannot
deploy this page.

## Operational truth

Committing or merging these files does not update WordPress. The live page
changes only after the separately authorized guarded apply succeeds. WordPress
revisions remain the recovery path for restoring the prior page body if a later
visual verification finds a problem.
