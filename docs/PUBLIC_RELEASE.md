# VOID public release policy

Status: private development repo remains private.

The public release path must not expose the full private git history. Public code should be published from a sanitized export tree or an orphan public branch/repo built from current reviewed source.

Required gates before public release:

1. Private development repo stays private.
2. Public release export is generated from current HEAD.
3. Local-only files are excluded:
   - .env
   - .secrets/
   - .secrets2/
   - keystore/
   - wallet-secrets files
   - .runtime/
   - logs/
   - data directories
   - node_modules/
4. Old state/proof/live deployment artifacts are excluded unless explicitly reviewed.
5. Old source snapshots and broken checkpoint files are excluded.
6. Gitleaks must pass on the sanitized export tree.
7. Any real credential that appeared in history must be rotated or revoked.
8. Public release output must be reviewed before pushing anywhere public.

Current rule:

Do not make the private void-node repository public.
