# VOID free discovery mesh v1

`VOID_FREE_DISCOVERY_MESH_V1` is a source-only, provider-neutral kit for making an already-public VOID node easier for ordinary search crawlers and AI agents to discover. It generates standards-based public files for a verified HTTPS clearnet origin. It does not deploy them, contact a provider, mutate an account, submit URLs, or enable billing.

The first supported surfaces are:

- Google Search Console through a sitemap and `Dataset` JSON-LD;
- Microsoft Bing Webmaster Tools through the same sitemap and an offline IndexNow request;
- Cloudflare through an optional later Crawler Hints dashboard opt-in, which uses IndexNow signals.

Official references:

- Google Dataset structured data: <https://developers.google.com/search/docs/appearance/structured-data/dataset>
- Google crawl and indexing overview: <https://developers.google.com/search/docs/crawling-indexing>
- Bing sitemaps: <https://www.bing.com/webmasters/help/Sitemaps-3b5cf6ed>
- Bing IndexNow: <https://www.bing.com/indexnow>
- IndexNow protocol: <https://www.indexnow.org/documentation>
- Cloudflare Crawler Hints: <https://developers.cloudflare.com/cache/advanced-configuration/crawler-hints/>

## Cost and authority boundary

This lane is designed to remain at `$0`. It collects no payment method, activates no startup credit, performs no billed API call, and contains no automatic paid upgrade. Provider plans and terms can change. Stop if any step asks for a card, paid plan, trial that can roll into billing, metered feature, or overage permission.

The generated discovery content is informational. It grants no wallet, signer, validator, operator, payment, Work Credit, node mutation, or deployment authority. `robots.txt` is crawler guidance, not access control; private or sensitive routes must still be protected by real authentication and network controls.

## Filesystem generation authority

The offline builder fails closed unless it can bind local file and output namespace authority to exact filesystem generations.

- The IndexNow key and committed discovery config are opened with `O_NOFOLLOW`, read through the opened descriptor, checked for stable file metadata, and rechecked against the selected pathname before their bytes are accepted.
- The output parent is traversed component-by-component with no-follow directory opens. Symlink components are rejected rather than followed.
- Build output is written through descriptor-relative `/proc/self/fd/...` paths rooted in the exact opened parent and private temporary directory generations.
- Before publication, the builder reopens the selected parent path and requires it to resolve to the same device/inode generation. An ancestor or parent replacement therefore produces HOLD instead of redirecting output into the replacement tree.
- Final publication first claims the absent destination with an exclusive directory reservation, then moves the completed private staging entries through descriptor-relative authority. A concurrently created foreign destination wins unchanged and the build HOLDs without clobbering it.
- The build receipt hashes the exact config bytes that were descriptor-bound and validated; it does not reopen the config pathname later for receipt authority.
- Every staged artifact, including the receipt itself, is checked against its exact intended bytes through no-follow descriptor-relative file opens after the pre-publication boundary. Symlinks, replacement generations, extra files, missing files, and byte drift present before or during an artifact's admitted read HOLD before publication.
- After the reserved publication is populated, the complete descriptor-bound inventory and every published file are verified again against the same intended bytes. A compromised publication detected by that pass is removed only through the exact directory generation reserved by this build.

The per-file verification pass does not atomically seal the complete tree. It does not exclude a different process with the same UID and filesystem namespace from rewriting a file or replacing a directory entry after that leaf's final admitted read. The builder therefore requires exclusive same-UID mutation authority over the selected output parent and every builder-owned temporary or reserved generation for the complete build interval. Do not run it alongside another process that can mutate that namespace.

The receipt records this boundary as machine-readable truth: `same_uid_concurrent_mutation_excluded` is `false`, `exclusive_same_uid_output_mutation_authority_required` is `true`, and `consumer_receipt_reverification_required_after_handoff` is `true`. Treat its hashes as verification evidence, not an immutable filesystem seal. A consumer must reverify the receipt hashes after every handoff and immediately before deployment or other use.

This hardening currently requires Linux `/proc/self/fd`, which matches the supported VOID operator environment. If descriptor-relative filesystem authority is unavailable, the build fails closed.

## Build an offline pack

Create the IndexNow key outside the repository. The protocol accepts 8–128 ASCII letters, numbers, or dashes. The key is publicly served after deployment, but keeping its source file outside Git prevents accidental coupling to source history.

```bash
umask 077
KEY_FILE="$(mktemp)"
openssl rand -hex 16 >"$KEY_FILE"

node tools/void-free-discovery-mesh-v1.mjs build \
  --origin "https://YOUR-VERIFIED-PUBLIC-HOST" \
  --output "$HOME/void-free-discovery-pack-v1" \
  --indexnow-key-file "$KEY_FILE" \
  --lastmod "YYYY-MM-DD" \
  --confirm "buildVoidFreeDiscoveryMeshV1"
```

The output path must be absent, its parent must already exist, every parent component must be a real directory rather than a symlink, and the output must be outside the repository. The invoking operator must also have exclusive same-UID mutation authority over that output namespace until the build returns. The command performs no network calls.

The pack contains:

- `public/robots.txt` and `public/sitemap.xml`;
- `public/discovery/index.html` with embedded Dataset JSON-LD;
- a standalone Dataset JSON-LD document;
- the root IndexNow key file;
- an offline IndexNow POST body;
- a fail-closed provider-registration checklist;
- a SHA-256 build receipt.

## Activation checkpoint

Activation is intentionally separate from source construction.

1. Review the generated pack and independently verify the current free-plan terms for every chosen provider.
2. Deploy only the `public/` tree to the exact HTTPS origin named at build time.
3. Verify every sitemap URL and the exact root key file over HTTPS.
4. Add the property and sitemap manually in Google Search Console and Bing Webmaster Tools without attaching a payment method.
5. Choose exactly one IndexNow notification owner to prevent duplicate or confusing submissions. Use the generated JSON only after deployment.
6. If the zone is already on Cloudflare's Free plan, optionally enable Crawler Hints in the dashboard. Do not upgrade the plan for this lane.
7. Record the provider settings and observed responses in an operator-controlled receipt before treating discovery as active.

If a public HTTPS origin is not already available for `$0`, keep this lane source-only. Tor discovery remains separate and is not weakened or replaced by this kit.

## Proof

```bash
node --check tools/void-free-discovery-mesh-v1.mjs
node --check scripts/prove_void_free_discovery_mesh_v1.mjs
node scripts/prove_void_free_discovery_mesh_v1.mjs
python3 -B scripts/check_void_ci_cost_boundary_v1.py --self-test
python3 -B scripts/check_void_ci_cost_boundary_v1.py --repo-root .
```

The proof exercises origin, date, key, path, same-host, output-location, inventory, cost, and authority boundaries. It also replaces opened key/config pathnames, injects output-parent symlink components, swaps an output ancestor, creates a foreign destination after private build bytes exist, mutates staged content and the staged receipt after receipt construction, and mutates a file after reserved publication but before the relevant verification pass. All such generation or content changes must HOLD; replacement namespaces receive zero writes, the exact foreign destination generation remains untouched, and no compromised pack detected by those passes survives as a successful result. It also proves the explicit machine-readable boundary that hostile concurrent same-UID mutation is not excluded and that consumers must reverify receipt hashes after handoff. CI is limited to public repositories so this lane cannot consume private-repository hosted-runner minutes.
