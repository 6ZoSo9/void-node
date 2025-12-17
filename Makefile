
include Makefile.ops

mainnet-bootstrap-dev-check:
	./ops/void-mainnet-bootstrap-dev-check.sh

# =========================
# WorkCredits (devnet)
# =========================

workcredits-devnet-health:
	./ops/void-workcredits-devnet-health.sh

workcredits-devnet-config-dump:
	./ops/void-workcredits-devnet-config-dump.sh

.PHONY: pillars-preflight
pillars-preflight:
	./ops/pre-push.sh
