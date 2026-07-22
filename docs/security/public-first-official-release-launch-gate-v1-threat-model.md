# First official release launch gate v1 — threat model

Protected assets include the exact source commit, semantic version, release archive, installer, manifest, checksums, SBOM, publication workflow, rehearsal chain, preflight, launch packet, review-mode declaration, approval, authorization, committed launch record, record commit, and finalized workflow inputs.

The wall addresses source drift, nondeterministic builds, asset substitution, stale or forged rehearsal evidence, accidental prerelease publication, tag or release collision, disabled immutable-release protection, unprotected environments, hidden self-approval, insufficient solo cooling-off time, expired authorization, packet or record tampering, command substitution, and bypass of the gate by dispatching the publication workflow directly.

Controls include:

- two deterministic builds with exact SHA-256 and byte-size inventories;
- clean `main` and `origin/main` equality;
- tag and release absence;
- immutable-release and protected-environment checks;
- publication-workflow SHA binding;
- six foundation proof bindings and the complete eight-stage rehearsal chain;
- independent reviewer separation when available; otherwise an explicit `solo_time_lock_v1` mode with zero reviewer claims, a 720-minute GitHub wait timer, `main`-only policy, and exact no-independent-review acknowledgement;
- a maximum 24-hour single-use authorization;
- explicit abort receipts;
- a launch-record manifest that rejects missing, duplicate, escaping, symbolic-link, modified, or size-mismatched files;
- a separate launch-record pull request;
- exact current-`main` launch-record commit binding;
- publication-workflow re-verification of the committed record and two fresh deterministic builds before any publication authority is used;
- renderers with no child-process capability and helpers that do not commit, push, merge, publish, or deploy.

Solo mode cannot provide human independence; one compromised or mistaken operator can still authorize publication after the cooling-off period. Residual risk begins only after a human separately executes the finalized command and the protected publication environment approves it. The publication workflow, immutable-release verification, post-publication canary, full qualification matrix, and stable-promotion controls remain independently authoritative.
