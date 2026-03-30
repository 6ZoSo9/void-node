
include Makefile.ops

hooks-install:
	@./ops/hooks-install.sh

.PHONY: wc-arm wc-disarm wc-status

wc-arm:
	@sudo /usr/local/bin/void-datanet-wc-expected 1
	@sleep 5
	@PROM="http://127.0.0.1:9090" ops/bin/promq 'max(void_datanet_wc_expected{job="node",instance="127.0.0.1:9100"})' | sed 's/^/wc_expected=/'

wc-disarm:
	@sudo /usr/local/bin/void-datanet-wc-expected 0
	@sleep 5
	@PROM="http://127.0.0.1:9090" ops/bin/promq 'max(void_datanet_wc_expected{job="node",instance="127.0.0.1:9100"})' | sed 's/^/wc_expected=/'

wc-status:
	@PROM="http://127.0.0.1:9090" ops/bin/promq 'max(void_datanet_wc_expected{job="node",instance="127.0.0.1:9100"})' | sed 's/^/wc_expected=/'
	@PROM="http://127.0.0.1:9090" ops/bin/promq 'count(ALERTS{alertstate="pending",alertname="VoidDataNetWCAwardedNotIncreasing"})' | sed 's/^/wc_alert_pending=/'
	@PROM="http://127.0.0.1:9090" ops/bin/promq 'count(ALERTS{alertstate="firing",alertname="VoidDataNetWCAwardedNotIncreasing"})' | sed 's/^/wc_alert_firing=/'

wc-relayer-smoke:
	@bash ops/wc-relayer-smoke.sh

wc-stack-status:
	@bash -lc 'set -euo pipefail; \
	echo "=== node health ==="; \
	curl -fsS --max-time 3 http://127.0.0.1:4100/health | sed -n "1,120p"; \
	echo; \
	echo "=== helper pool ==="; \
	curl -fsS --max-time 3 http://127.0.0.1:4312/workcredits/devnet/pool.json | sed -n "1,160p"; \
	echo; \
	echo "=== relayer health ==="; \
	curl -fsS --max-time 3 http://127.0.0.1:4313/api/wc-relayer/v1/health | sed -n "1,160p"; \
	echo; \
	echo "=== participant wiring ==="; \
	curl -fsS --max-time 5 http://127.0.0.1:4100/participant | rg -n "api/wc-relayer/v1/quote|api/wc-relayer/v1/execute|approve_tx_hash|swap_tx_hash|Relayer is live for quote and execution" | sed -n "1,160p"; \
	echo; \
	echo "=== relayer quote smoke ==="; \
	curl -fsS --max-time 5 -H "content-type: application/json" \
	  -d "{\"side\":\"wc_to_void\",\"amount\":1,\"wallet\":\"0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266\"}" \
	  http://127.0.0.1:4313/api/wc-relayer/v1/quote | sed -n "1,200p"; \
	'


wc-stack-exec-smoke:
	@bash ops/wc-relayer-smoke.sh

wc-stack-up:
	@bash -lc 'set -euo pipefail; \
	echo "=== restart main node ==="; \
	systemctl --user restart void-node.service; \
	echo; \
	echo "=== restart wc relayer ==="; \
	systemctl --user restart void-wc-relayer.service; \
	echo; \
	echo "=== restart helper on :4312 if unit exists, else keep current process ==="; \
	if [[ -f "$$HOME/.config/systemd/user/void-workcredits-devnet-http.service" ]]; then \
	  systemctl --user restart void-workcredits-devnet-http.service; \
	else \
	  echo "[info] no systemd helper unit found; assuming helper already managed separately"; \
	fi; \
	echo; \
	echo "=== wait for node ==="; \
	for i in 1 2 3 4 5 6 7 8 9 10 11 12; do \
	  curl -fsS --max-time 3 http://127.0.0.1:4100/health >/dev/null 2>&1 && break; \
	  sleep 1; \
	done; \
	echo "=== wait for relayer ==="; \
	for i in 1 2 3 4 5 6 7 8 9 10 11 12; do \
	  curl -fsS --max-time 3 http://127.0.0.1:4313/api/wc-relayer/v1/health >/dev/null 2>&1 && break; \
	  sleep 1; \
	done; \
	$(MAKE) --no-print-directory wc-stack-status; \
	'

wc-stack-restart:
	@$(MAKE) --no-print-directory wc-stack-up

wc-stack-down:
	@bash -lc 'set -euo pipefail; \
	echo "=== stop wc relayer ==="; \
	systemctl --user stop void-wc-relayer.service || true; \
	echo; \
	echo "=== stop helper http ==="; \
	systemctl --user stop void-workcredits-devnet-http.service || true; \
	echo; \
	echo "=== stop main node ==="; \
	systemctl --user stop void-node.service || true; \
	echo; \
	echo "=== remaining listeners ==="; \
	ss -Htanlp "sport = :4100 or sport = :4312 or sport = :4313 or sport = :4700" 2>/dev/null || true; \
	'
wc-stack-doctor:
	@bash -lc 'set -euo pipefail; \
	echo "=== systemd status: node ==="; \
	systemctl --user --no-pager --full status void-node.service | sed -n "1,80p" || true; \
	echo; \
	echo "=== systemd status: helper ==="; \
	systemctl --user --no-pager --full status void-workcredits-devnet-http.service | sed -n "1,80p" || true; \
	echo; \
	echo "=== systemd status: relayer ==="; \
	systemctl --user --no-pager --full status void-wc-relayer.service | sed -n "1,80p" || true; \
	echo; \
	echo "=== listeners ==="; \
	ss -Htanlp "sport = :4100 or sport = :4312 or sport = :4313 or sport = :4700" 2>/dev/null || true; \
	echo; \
	echo "=== http probe: node /health ==="; \
	curl -fsS --max-time 3 http://127.0.0.1:4100/health | sed -n "1,120p" || echo "[fail] node health"; \
	echo; \
	echo "=== http probe: helper /pool.json ==="; \
	curl -fsS --max-time 3 http://127.0.0.1:4312/workcredits/devnet/pool.json | sed -n "1,160p" || echo "[fail] helper pool"; \
	echo; \
	echo "=== http probe: relayer /health ==="; \
	curl -fsS --max-time 3 http://127.0.0.1:4313/api/wc-relayer/v1/health | sed -n "1,160p" || echo "[fail] relayer health"; \
	echo; \
	echo "=== participant wiring snapshot ==="; \
	curl -fsS --max-time 5 http://127.0.0.1:4100/participant | rg -n "api/wc-relayer/v1/quote|api/wc-relayer/v1/execute|approve_tx_hash|swap_tx_hash|No Redeemable WC|Relayer is live for quote and execution" | sed -n "1,200p" || echo "[fail] participant page"; \
	echo; \
	echo "=== helper recent journal ==="; \
	journalctl --user -u void-workcredits-devnet-http.service --no-pager -n 40 || true; \
	echo; \
	echo "=== relayer recent journal ==="; \
	journalctl --user -u void-wc-relayer.service --no-pager -n 40 || true; \
	'

wc-demo-e2e:
	@bash ops/wc-demo-run.sh

wc-smoke:
	@bash ops/wc-smoke.sh

wc-doctor:
	@bash ops/voidctl wc-doctor

wc-check:
	@bash ops/voidctl wc-ready
	@bash ops/voidctl wc-doctor

wc-demo:
	@bash ops/voidctl wc-demo

wc-golden:
	@$(MAKE) --no-print-directory wc-check
	@$(MAKE) --no-print-directory wc-demo
	@$(MAKE) --no-print-directory wc-check

install-hooks:
	@bash ops/install-hooks.sh

.PHONY: void-main-commit void-follow-once void-follower-status void-dev-cycle

void-main-commit:
	./ops/void-main-commit.sh

void-follow-once:
	./ops/void-follow-once.sh

void-follower-status:
	./ops/void-follower-status.sh

void-dev-cycle:
	./ops/void-dev-cycle.sh
.PHONY: autoprop-smoke
autoprop-smoke:
	./ops/autoprop-smoke.sh


.PHONY: full-demo-smoke
full-demo-smoke:
	WC_BASE="$${WC_BASE:-$${BASE:-$${MAIN_BASE:-http://127.0.0.1:4100}}}" BASE="$${BASE:-$${MAIN_BASE:-http://127.0.0.1:4100}}" ./ops/full-demo-smoke.sh

thin-path-proof:
	./ops/thin-path-proof.sh

.PHONY: full-demo-smoke-inner-autoprop
full-demo-smoke-inner-autoprop:
	BASE="$${BASE:-$${MAIN_BASE:-http://127.0.0.1:4100}}" ./ops/autoprop-smoke.sh

.PHONY: demo-video-proof
demo-video-proof:
	./ops/demo-video-proof.sh

.PHONY: public-beta
public-beta:
	./ops/public-beta-quickstart.sh

.PHONY: wc-wallet-proof
wc-wallet-proof:
	@bash ops/wc-wallet-isolated-proof.sh

.PHONY: public-beta-preflight
public-beta-preflight:
	@bash ops/public-beta-preflight.sh

.PHONY: install-path-status
install-path-status:
	@bash ops/install-path-status.sh

.PHONY: public-beta-status
public-beta-status:
	@bash ops/install-path-status.sh

.PHONY: beta-help
beta-help:
	@printf '%s\n' 'VOID Node beta baseline commands'
	@printf '%s\n' ''
	@printf '%s\n' 'User-facing path:'
	@printf '%s\n' '  ./ops/public-beta-quickstart.sh'
	@printf '%s\n' '  make public-beta'
	@printf '%s\n' ''
	@printf '%s\n' 'Live snapshot:'
	@printf '%s\n' '  make public-beta-status'
	@printf '%s\n' '  ./ops/install-path-status.sh'
	@printf '%s\n' ''
	@printf '%s\n' 'Bounded proof gates:'
	@printf '%s\n' '  make public-beta-preflight   # wallet proof + wallet identity smoke + runner safety'
	@printf '%s\n' '  make wc-wallet-proof          # isolated wallet-specific WC proof only'
	@printf '%s\n' ''
	@printf '%s\n' 'Broader demo path:'
	@printf '%s\n' '  ./ops/demo-video-proof.sh'
	@printf '%s\n' ''
	@printf '%s\n' 'Docs:'
	@printf '%s\n' '  PUBLIC_BETA.md'
	@printf '%s\n' '  ops/BETA_BASELINE_2026-03-23.md'

.PHONY: beta-pack
beta-pack:
	@bash ops/beta-release-pack.sh
