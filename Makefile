
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
	curl -fsS --max-time 5 http://127.0.0.1:4100/participant | grep -En "api/wc-relayer/v1/quote|api/wc-relayer/v1/execute|approve_tx_hash|swap_tx_hash|Relayer is live for quote and execution" | sed -n "1,160p"; \
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
	curl -fsS --max-time 5 http://127.0.0.1:4100/participant | grep -En "api/wc-relayer/v1/quote|api/wc-relayer/v1/execute|approve_tx_hash|swap_tx_hash|No Redeemable WC|Relayer is live for quote and execution" | sed -n "1,200p" || echo "[fail] participant page"; \
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

.PHONY: wc-trade-proof
wc-trade-proof:
	@bash ops/wc-smoke.sh

.PHONY: datanet-mvp-proof
datanet-mvp-proof:
	@bash ops/datanet-mvp-proof.sh

.PHONY: public-beta-preflight
public-beta-preflight:
	@bash ops/public-beta-preflight.sh

.PHONY: beta-proof
beta-proof:
	@$(MAKE) --no-print-directory public-beta-preflight
	@$(MAKE) --no-print-directory wc-trade-proof
	@$(MAKE) --no-print-directory datanet-mvp-proof

.PHONY: install-path-status
install-path-status:
	@bash ops/install-path-status.sh

.PHONY: alienware-bootstrap
alienware-bootstrap:
	@bash ops/alienware-bootstrap-node-helper-relayer.sh

.PHONY: alienware-update
alienware-update:
	@bash ops/alienware-update-node-helper-relayer.sh

.PHONY: precision-update
precision-update:
	@bash ops/precision-update-node.sh

.PHONY: alienware-remote-update
alienware-remote-update:
	@bash ops/alienware-remote-update.sh

.PHONY: public-beta-status
public-beta-status:
	@bash ops/install-path-status.sh

.PHONY: two-box-network-peer-proof
two-box-network-peer-proof:
	@bash ops/two-box-network-peer-proof.sh

.PHONY: two-box-datanet-peer-path-proof
two-box-datanet-peer-path-proof:
	@bash ops/two-box-datanet-peer-path-proof.sh

.PHONY: two-box-fresh-participant-proof
two-box-fresh-participant-proof:
	@bash ops/two-box-peer-workload-proof.sh

.PHONY: two-box-mixed-remote-proof
two-box-mixed-remote-proof:
	@bash ops/two-box-peer-workload-proof.sh

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
	@printf '%s\n' '  make wc-trade-proof           # bounded relayer / redeem / trade proof'
	@printf '%s\n' '  make datanet-mvp-proof        # bounded live manifest/chunk/receipt/WC proof'
	@printf '%s\n' '  make beta-proof               # preflight + relayer trade proof + datanet mvp proof'
	@printf '%s\n' '  make alienware-bootstrap      # sync + restart + verify node/helper/relayer role'
	@printf '%s\n' '  make alienware-update         # update + restart + verify alienware role health'
	@printf '%s\n' '  make precision-update         # update + restart + verify precision primary node'
	@printf '%s\n' '  make alienware-remote-update  # run alienware updater remotely from precision'
	@printf '%s\n' '  cat ops/SECOND_MACHINE_ONBOARDING.md  # proven second-machine bring-up runbook'
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

.PHONY: remote-product-regression remote-product-regression-quick

remote-product-regression:
	RUNS=$${RUNS:-2} bash ops/two-box-remote-product-network-regression-proof.sh


participant-datanet-e2e-proof:
	bash ops/two-box-participant-datanet-e2e-proof.sh

product-surface-proof:
	bash ops/two-box-datanet-tab-proof.sh
	bash ops/two-box-participant-datanet-e2e-proof.sh
	RUNS=1 bash ops/two-box-remote-product-network-regression-proof.sh

participant-overview-dataset-proof:
	bash ops/two-box-participant-overview-dataset-proof.sh

product-surface-proof-plus:
	bash ops/two-box-datanet-tab-proof.sh
	bash ops/two-box-participant-datanet-e2e-proof.sh
	bash ops/two-box-participant-overview-dataset-proof.sh
	RUNS=1 bash ops/two-box-remote-product-network-regression-proof.sh

participant-golden-path-proof:
	bash ops/two-box-participant-golden-path-proof.sh

product-golden-proof: two-box-post-ui-trade-gate
remote-product-regression-quick:
	RUNS=$${RUNS:-1} bash ops/two-box-remote-product-network-regression-proof.sh | tee /tmp/remote-product-regression.quick.log
	grep -E '\[ok\] two-box remote product \+ network regression proof green|participant_bootstrap_account|recent_runner_activity_count|remote_ready|remote_gap|remote_txroot_live' /tmp/remote-product-regression.quick.log || true

.PHONY: remote-product-regression-cycle

remote-product-regression-cycle:
	STAMP=$$(date +%Y%m%d-%H%M%S); \
	OUT=/tmp/remote-product-regression-cycle-$$STAMP; \
	mkdir -p "$$OUT"; \
	echo "=== [1] pre-change remote regression ==="; \
	RUNS=$${RUNS:-1} bash ops/two-box-remote-product-network-regression-proof.sh | tee "$$OUT/pre.log"; \
	echo; \
	echo "=== [2] apply your product/network change now in another terminal, then press Enter here ==="; \
	read dummy; \
	echo; \
	echo "=== [3] post-change remote regression ==="; \
	RUNS=$${RUNS:-1} bash ops/two-box-remote-product-network-regression-proof.sh | tee "$$OUT/post.log"; \
	echo; \
	echo "=== [4] key proof lines ==="; \
	grep -E '\[ok\] two-box remote product \+ network regression proof green|participant_bootstrap_account|recent_runner_activity_count|remote_ready|remote_gap|remote_txroot_live' "$$OUT"/pre.log "$$OUT"/post.log || true; \
	echo; \
	echo "out=$$OUT"

.PHONY: participant-share-open-proof participant-share-open-e2e-proof
participant-share-open-proof:
	bash ops/two-box-participant-share-open-e2e-proof.sh

participant-share-open-e2e-proof:
	bash ops/two-box-participant-share-open-e2e-proof.sh

.PHONY: jobs-submit-e2e-proof
jobs-submit-e2e-proof:
	bash ops/jobs-submit-e2e-proof.sh

.PHONY: two-box-remote-jobs-submit-proof
two-box-remote-jobs-submit-proof:
	bash ops/two-box-remote-jobs-submit-proof.sh

.PHONY: two-box-remote-jobs-submit-product-proof
two-box-remote-jobs-submit-product-proof:
	bash ops/two-box-remote-jobs-submit-product-proof.sh

.PHONY: two-box-remote-datanet-view-proof
two-box-remote-datanet-view-proof:
	bash ops/two-box-remote-datanet-view-proof.sh

.PHONY: two-box-remote-verify-redundancy-product-proof
two-box-remote-verify-redundancy-product-proof:
	bash ops/two-box-remote-verify-redundancy-product-proof.sh

.PHONY: two-box-golden-product-smoke
two-box-golden-product-smoke:
	bash ops/two-box-golden-product-smoke.sh

.PHONY: golden-smoke
golden-smoke:
	bash ops/two-box-golden-product-smoke.sh

.PHONY: two-box-cross-machine-datanet-lifecycle-proof
two-box-cross-machine-datanet-lifecycle-proof:
	bash ops/two-box-cross-machine-datanet-lifecycle-proof.sh


.PHONY: two-box-post-ui-trade-gate two-box-post-ui-trade-gate-proof product-golden-proof-v2
two-box-post-ui-trade-gate:
	bash ops/two-box-post-ui-trade-gate.sh

two-box-post-ui-trade-gate-proof: two-box-post-ui-trade-gate

product-golden-proof-v2: two-box-post-ui-trade-gate
	bash ops/two-box-golden-product-smoke.sh
	bash ops/two-box-participant-golden-path-proof.sh
	$(MAKE) --no-print-directory participant-share-open-proof
	RUNS=$${RUNS:-1} bash ops/two-box-remote-product-network-regression-proof.sh | tee /tmp/remote-product-regression.quick.log
	grep -E '\[ok\] two-box remote product \+ network regression proof green|participant_bootstrap_account|recent_runner_activity_count|remote_ready|remote_gap|remote_txroot_live' /tmp/remote-product-regression.quick.log || true

.PHONY: void-pillars-preflight
void-pillars-preflight:
	@bash ops/void-pillars-preflight.sh

.PHONY: void-pillars-health-all
void-pillars-health-all:
	@bash ops/void-pillars-health-all.sh

.PHONY: void-mainnet-pillars-preflight
void-mainnet-pillars-preflight:
	@bash ops/void-mainnet-pillars-preflight.sh

.PHONY: void-full3-truth-sweep-health
void-full3-truth-sweep-health:
	@bash ops/void-full3-truth-sweep-health.sh


.PHONY: datanet-operator-cycle datanet-operator-cycle-apply

datanet-operator-cycle:
	bash ops/two-box-datanet-operator-cycle.sh

datanet-operator-cycle-apply:
	APPLY=1 LIMIT=$${LIMIT:-3} WHO=$${WHO:-zoso} bash ops/two-box-datanet-operator-cycle.sh


.PHONY: report-stale-local quarantine-stale-local restore-stale-local

report-stale-local:
	python3 ops/report_stale_local_datasets.py

quarantine-stale-local:
	python3 ops/quarantine_stale_local_datasets.py

restore-stale-local:
	python3 ops/restore_quarantined_local_datasets.py


.PHONY: two-box-peer-fetch-repair-proof

two-box-peer-fetch-repair-proof:
	bash ops/two-box-peer-fetch-repair-proof.sh

.PHONY: two-box-redundancy-check-proof
two-box-redundancy-check-proof:
	bash ops/two-box-redundancy-check-proof.sh

.PHONY: two-box-peer-proof-suite
two-box-peer-proof-suite:
	bash ops/two-box-peer-proof-suite.sh

.PHONY: two-box-peer-proof-suite-quick
two-box-peer-proof-suite-quick:
	QUICK_MODE=1 bash ops/two-box-peer-proof-suite.sh

.PHONY: two-box-peer-proof-suite-quick-json
two-box-peer-proof-suite-quick-json:
	QUICK_MODE=1 JSON_MODE=1 bash ops/two-box-peer-proof-suite.sh

.PHONY: two-box-peer-proof-suite-export
two-box-peer-proof-suite-export:
	bash ops/two-box-peer-proof-suite-exporter.sh

.PHONY: two-box-peer-suite-refresh
two-box-peer-suite-refresh:
	bash ops/two-box-peer-suite-refresh.sh

.PHONY: pick2-isolated-proof-export
pick2-isolated-proof-export:
	bash ops/pick2-isolated-proof-exporter.sh

.PHONY: pick2-isolated-proof-run
pick2-isolated-proof-run:
	bash ops/pick2-isolated-proof-runner.sh

.PHONY: pick2-isolated-proof-cycle
pick2-isolated-proof-cycle:
	bash ops/pick2-isolated-proof-runner.sh
	bash ops/pick2-isolated-proof-exporter.sh

proposer-rescue-ping-proof:
	bash ops/proposer-rescue-ping-proof.sh

demo-proof-all:
	bash ops/full-demo-smoke-with-proposer-proof.sh

.PHONY: mainnet0-launch-readiness
mainnet0-launch-readiness:
	bash ops/mainnet0-launch-readiness.sh

.PHONY: mainnet0-status-proof
mainnet0-status-proof:
	bash ops/mainnet/mainnet0-status-proof.sh

.PHONY: mainnet0-status-smoke
mainnet0-status-smoke:
	bash ops/mainnet/mainnet0-status-smoke.sh

.PHONY: mainnet0-crossbox-status-smoke
mainnet0-crossbox-status-smoke:
	bash ops/mainnet/mainnet0-crossbox-status-smoke.sh

.PHONY: mainnet0-blockers-proof
mainnet0-blockers-proof:
	bash ops/mainnet/mainnet0-blockers-proof.sh

.PHONY: mainnet0-gonogo-no-go-proof
mainnet0-gonogo-no-go-proof:
	bash ops/mainnet/mainnet0-gonogo-no-go-proof.sh

.PHONY: mainnet0-validator-live-admission-dryrun-proof
mainnet0-validator-live-admission-dryrun-proof:
	bash ops/mainnet/mainnet0-validator-live-admission-dryrun-proof.sh

.PHONY: mainnet0-prelaunch-safety-proof
mainnet0-prelaunch-safety-proof:
	bash ops/mainnet/mainnet0-prelaunch-safety-proof.sh

.PHONY: mainnet0-validator-admission-blocker-proof
mainnet0-validator-admission-blocker-proof:
	bash ops/mainnet/mainnet0-validator-admission-blocker-proof.sh

.PHONY: mainnet0-validator-admission-promotion-plan-proof
mainnet0-validator-admission-promotion-plan-proof:
	bash ops/mainnet/mainnet0-validator-admission-promotion-plan-proof.sh

.PHONY: mainnet0-go-no-go-bundle
mainnet0-go-no-go-bundle:
	bash ops/mainnet0-go-no-go-bundle.sh

.PHONY: mainnet0-mainnet-exec-preflight
mainnet0-mainnet-exec-preflight:
	bash ops/mainnet0-mainnet-exec-preflight.sh

.PHONY: prove-main-runtime-autoprop
prove-main-runtime-autoprop:
	bash ops/prove-main-runtime-autoprop.sh

.PHONY: mainnet0-go-no-go-with-runtime
mainnet0-go-no-go-with-runtime:
	bash ops/mainnet0-go-no-go-with-runtime.sh

.PHONY: prove-alienware-follower-autostart
prove-alienware-follower-autostart:
	bash ops/prove-alienware-follower-autostart.sh

.PHONY: post-bootstrap-ops-proof post-bootstrap-crossbox-proof

post-bootstrap-ops-proof:
	bash ops/post-bootstrap-ops-proof.sh

post-bootstrap-crossbox-proof:
	bash ops/post-bootstrap-crossbox-proof.sh

.PHONY: mainnet-deployed-proof

mainnet-deployed-proof:
	bash ops/mainnet/void-mainnet-deployed-proof.sh

.PHONY: mainnet-validator-handoff-proof

mainnet-validator-handoff-proof:
	bash ops/mainnet/void-mainnet-validator-handoff-proof.sh

.PHONY: validator-staking-v2-local-proof

validator-staking-v2-local-proof:
	bash ops/mainnet/validator-staking-v2-local-proof.sh

.PHONY: validator-selection-adapter-local-proof

validator-selection-adapter-local-proof:
	bash ops/mainnet/validator-selection-adapter-local-proof.sh

.PHONY: validator-selection-adapter-proof-anvil

validator-selection-adapter-proof-anvil:
	bash ops/mainnet/validator-selection-adapter-proof-anvil.sh

.PHONY: validator-selection-registry-local-proof validator-selection-registry-proof-anvil

validator-selection-registry-local-proof:
	bash ops/mainnet/validator-selection-registry-local-proof.sh

validator-selection-registry-proof-anvil:
	bash ops/mainnet/validator-selection-registry-proof-anvil.sh

.PHONY: validator-runtime-consumer-local-proof validator-runtime-consumer-proof-anvil

validator-runtime-consumer-local-proof:
	bash ops/mainnet/validator-runtime-consumer-local-proof.sh

validator-runtime-consumer-proof-anvil:
	bash ops/mainnet/validator-runtime-consumer-proof-anvil.sh

.PHONY: validator-runtime-consumer-multival-local-proof validator-runtime-consumer-multival-proof-anvil

validator-runtime-consumer-multival-local-proof:
	bash ops/mainnet/validator-runtime-consumer-multival-local-proof.sh

validator-runtime-consumer-multival-proof-anvil:
	bash ops/mainnet/validator-runtime-consumer-multival-proof-anvil.sh

.PHONY: validator-registry-source-swap-local-proof validator-registry-source-swap-proof-anvil

validator-registry-source-swap-local-proof:
	bash ops/mainnet/validator-registry-source-swap-local-proof.sh

validator-registry-source-swap-proof-anvil:
	bash ops/mainnet/validator-registry-source-swap-proof-anvil.sh

.PHONY: validator-epoch-runtime-consumer-local-proof validator-epoch-runtime-consumer-proof-anvil

validator-epoch-runtime-consumer-local-proof:
	bash ops/mainnet/validator-epoch-runtime-consumer-local-proof.sh

validator-epoch-runtime-consumer-proof-anvil:
	bash ops/mainnet/validator-epoch-runtime-consumer-proof-anvil.sh

.PHONY: validator-epoch-proposer-selector-local-proof validator-epoch-proposer-selector-proof-anvil

validator-epoch-proposer-selector-local-proof:
	bash ops/mainnet/validator-epoch-proposer-selector-local-proof.sh

validator-epoch-proposer-selector-proof-anvil:
	bash ops/mainnet/validator-epoch-proposer-selector-proof-anvil.sh

.PHONY: validator-epoch-schedule-view-local-proof validator-epoch-schedule-view-proof-anvil

validator-epoch-schedule-view-local-proof:
	bash ops/mainnet/validator-epoch-schedule-view-local-proof.sh

validator-epoch-schedule-view-proof-anvil:
	bash ops/mainnet/validator-epoch-schedule-view-proof-anvil.sh

.PHONY: validator-epoch-commitment-view-local-proof validator-epoch-commitment-view-proof-anvil

validator-epoch-commitment-view-local-proof:
	bash ops/mainnet/validator-epoch-commitment-view-local-proof.sh

validator-epoch-commitment-view-proof-anvil:
	bash ops/mainnet/validator-epoch-commitment-view-proof-anvil.sh

.PHONY: validator-epoch-commitment-registry-local-proof validator-epoch-commitment-registry-proof-anvil

validator-epoch-commitment-registry-local-proof:
	bash ops/mainnet/validator-epoch-commitment-registry-local-proof.sh

validator-epoch-commitment-registry-proof-anvil:
	bash ops/mainnet/validator-epoch-commitment-registry-proof-anvil.sh

.PHONY: validator-epoch-manifest-view-local-proof validator-epoch-manifest-view-proof-anvil

validator-epoch-manifest-view-local-proof:
	bash ops/mainnet/validator-epoch-manifest-view-local-proof.sh

validator-epoch-manifest-view-proof-anvil:
	bash ops/mainnet/validator-epoch-manifest-view-proof-anvil.sh

.PHONY: validator-epoch-manifest-export-local-proof validator-epoch-manifest-export-proof-anvil

validator-epoch-manifest-export-local-proof:
	bash ops/mainnet/validator-epoch-manifest-export-local-proof.sh

validator-epoch-manifest-export-proof-anvil:
	bash ops/mainnet/validator-epoch-manifest-export-proof-anvil.sh

.PHONY: validator-epoch-manifest-verify-import-local-proof validator-epoch-manifest-verify-import-proof-anvil

validator-epoch-manifest-verify-import-local-proof:
	bash ops/mainnet/validator-epoch-manifest-verify-import-local-proof.sh

validator-epoch-manifest-verify-import-proof-anvil:
	bash ops/mainnet/validator-epoch-manifest-verify-import-proof-anvil.sh

.PHONY: validator-epoch-manifest-node-ingest-test validator-epoch-manifest-node-ingest-proof-anvil

validator-epoch-manifest-node-ingest-test:
	node --test test/node/validator_epoch_manifest.test.cjs

validator-epoch-manifest-node-ingest-proof-anvil:
	bash ops/mainnet/validator-epoch-manifest-node-ingest-proof-anvil.sh

.PHONY: validator-epoch-runtime-adapter-test validator-epoch-runtime-adapter-proof-anvil

validator-epoch-runtime-adapter-test:
	node --test test/node/validator_epoch_runtime_adapter.test.cjs

validator-epoch-runtime-adapter-proof-anvil:
	bash ops/mainnet/validator-epoch-runtime-adapter-proof-anvil.sh

.PHONY: validator-runtime-truth-switch-test validator-runtime-truth-switch-proof-anvil

validator-runtime-truth-switch-test:
	node --test test/node/validator_runtime_truth_switch.test.cjs

validator-runtime-truth-switch-proof-anvil:
	bash ops/mainnet/validator-runtime-truth-switch-proof-anvil.sh

.PHONY: validator-registration-live-submit-safety-proof
validator-registration-live-submit-safety-proof:
	bash ops/mainnet0/validator-registration-live-submit-safety-proof.sh

.PHONY: validator-registration-positive-readiness-proof
validator-registration-positive-readiness-proof:
	bash ops/mainnet0/validator-registration-positive-readiness-proof.sh

.PHONY: validator-registration-controlled-live-execution-proof
validator-registration-controlled-live-execution-proof:
	bash ops/mainnet0/validator-registration-controlled-live-execution-proof.sh

.PHONY: validator-candidate-activation-proof
validator-candidate-activation-proof:
	bash ops/mainnet0/validator-candidate-activation-proof.sh

.PHONY: validator-candidate-demotion-proof
validator-candidate-demotion-proof:
	bash ops/mainnet0/validator-candidate-demotion-proof.sh

.PHONY: validator-offline-demotion-policy-proof
validator-offline-demotion-policy-proof:
	bash ops/mainnet0/validator-offline-demotion-policy-proof.sh

.PHONY: validator-offline-demotion-refill-policy-proof
validator-offline-demotion-refill-policy-proof:
	bash ops/mainnet0/validator-offline-demotion-refill-policy-proof.sh

.PHONY: validator-lifecycle-composite-proof
validator-lifecycle-composite-proof:
	bash ops/mainnet0/validator-lifecycle-composite-proof.sh

.PHONY: validator-lifecycle-composite-exporter
validator-lifecycle-composite-exporter:
	bash ops/mainnet0/validator-lifecycle-composite-exporter.sh

.PHONY: validator-lifecycle-composite-prom-proof
validator-lifecycle-composite-prom-proof:
	bash ops/mainnet0/validator-lifecycle-composite-prom-proof.sh

.PHONY: mainnet0-validator-lifecycle-preflight
mainnet0-validator-lifecycle-preflight:
	bash ops/mainnet0-validator-lifecycle-preflight.sh

.PHONY: mainnet0-go-no-go-with-validator-lifecycle
mainnet0-go-no-go-with-validator-lifecycle:
	bash ops/mainnet0-go-no-go-with-validator-lifecycle.sh

.PHONY: mainnet0-validator-lifecycle-preflight-proof
mainnet0-validator-lifecycle-preflight-proof:
	bash ops/mainnet0-validator-lifecycle-preflight-proof.sh

update-notification-api-proof:
	bash ops/mainnet0/update-notification-api-proof.sh

update-notification-critical-ui-proof:
	bash ops/mainnet0/update-notification-critical-ui-proof.sh

update-runtime-marker-clean-proof:
	bash ops/mainnet0/update-runtime-marker-clean-proof.sh

update-signed-artifact-mutation-proof:
	bash ops/mainnet0/update-signed-artifact-mutation-proof.sh

update-valid-artifact-marker-only-proof:
	bash ops/mainnet0/update-valid-artifact-marker-only-proof.sh

update-now-preflight-only-proof:
	bash ops/mainnet0/update-now-preflight-only-proof.sh

mainnet0-update-safety-proof:
	bash ops/mainnet0/mainnet0-update-safety-proof.sh

mainnet0-update-safety-wiring-proof:
	bash ops/mainnet0/mainnet0-update-safety-wiring-proof.sh

mainnet0-update-safety-exporter:
	bash ops/mainnet0/mainnet0-update-safety-exporter.sh

mainnet0-update-safety-prom-proof:
	bash ops/mainnet0/mainnet0-update-safety-prom-proof.sh

.PHONY: mainnet0-restore-8545-epoch125-state
mainnet0-restore-8545-epoch125-state:
	bash ops/mainnet0/mainnet0-restore-8545-epoch125-state.sh

.PHONY: mainnet0-8545-epoch125-state-proof
mainnet0-8545-epoch125-state-proof:
	bash ops/mainnet0/mainnet0-8545-epoch125-state-proof.sh

.PHONY: mainnet0-catchup-vault123-chain-only
mainnet0-catchup-vault123-chain-only:
	bash ops/mainnet0/mainnet0-catchup-vault123-chain-only.sh


.PHONY: mainnet0-validator-policy-doc-proof
mainnet0-validator-policy-doc-proof:
	bash ops/mainnet/mainnet0-validator-policy-doc-proof.sh

.PHONY: participant-ui-cleanup-proof
participant-ui-cleanup-proof:
	bash ops/mainnet0/participant-ui-cleanup-proof.sh

.PHONY: participant-news-feed-render
participant-news-feed-render:
	python3 ops/mainnet0/render-participant-news-feed.py

.PHONY: buy-void-backend-readiness-proof
buy-void-backend-readiness-proof:
	bash ops/mainnet0/buy-void-backend-readiness-proof.sh

.PHONY: buy-void-claim-tx-failclosed-proof
buy-void-claim-tx-failclosed-proof:
	bash ops/mainnet0/buy-void-claim-tx-failclosed-proof.sh
.PHONY: buy-void-base-claim-rehearsal-note-proof
buy-void-base-claim-rehearsal-note-proof:
	bash ops/mainnet0/buy-void-base-claim-rehearsal-note-proof.sh

.PHONY: buy-void-fulfillment-failclosed-proof
buy-void-fulfillment-failclosed-proof:
	bash ops/mainnet0/buy-void-fulfillment-failclosed-proof.sh

.PHONY: buy-void-payment-confirmed-no-void-send-proof
buy-void-payment-confirmed-no-void-send-proof:
	bash ops/mainnet0/buy-void-payment-confirmed-no-void-send-proof.sh

.PHONY: buy-void-operator-fulfillment-runbook-proof
buy-void-operator-fulfillment-runbook-proof:
	bash ops/mainnet0/buy-void-operator-fulfillment-runbook-proof.sh
.PHONY: buy-void-hardstop-proof
buy-void-hardstop-proof:
	bash ops/mainnet0/buy-void-hardstop-proof.sh

.PHONY: mainnet0-validator-live-admission-readiness-proof
mainnet0-validator-live-admission-readiness-proof:
	bash ops/mainnet/mainnet0-validator-live-admission-readiness-proof.sh

.PHONY: mainnet0-validator-next-onboard-live-gate-proof
mainnet0-validator-next-onboard-live-gate-proof:
	bash ops/mainnet/mainnet0-validator-next-onboard-live-gate-proof.sh

.PHONY: mainnet0-validator-live-admission-execution-runbook-proof
mainnet0-validator-live-admission-execution-runbook-proof:
	bash ops/mainnet/mainnet0-validator-live-admission-execution-runbook-proof.sh

.PHONY: mainnet0-validator-live-admission-final-preflight-proof
mainnet0-validator-live-admission-final-preflight-proof:
	bash ops/mainnet/mainnet0-validator-live-admission-final-preflight-proof.sh

.PHONY: buy-void-ethereum-payment-confirmed-no-void-send-proof
buy-void-ethereum-payment-confirmed-no-void-send-proof:
	bash ops/mainnet0/buy-void-ethereum-payment-confirmed-no-void-send-proof.sh

.PHONY: buy-void-explicit-fulfillment-runbook-proof
buy-void-explicit-fulfillment-runbook-proof:
	bash ops/mainnet0/buy-void-explicit-fulfillment-runbook-proof.sh

.PHONY: buy-void-fixed-rate-fulfillment-policy-proof
buy-void-fixed-rate-fulfillment-policy-proof:
	bash ops/mainnet0/buy-void-fixed-rate-fulfillment-policy-proof.sh

.PHONY: buy-void-real-fulfillment-closeout-proof
buy-void-real-fulfillment-closeout-proof:
	bash ops/mainnet0/buy-void-real-fulfillment-closeout-proof.sh

.PHONY: mainnet0-final-path-proof
mainnet0-final-path-proof:
	bash ops/mainnet/mainnet0-final-path-proof.sh

.PHONY: participant-stake-clarity-proof
participant-stake-clarity-proof:
	bash ops/mainnet0/participant-stake-clarity-proof.sh

.PHONY: participant-buy-void-clarity-proof
participant-buy-void-clarity-proof:
	bash ops/mainnet0/participant-buy-void-clarity-proof.sh

.PHONY: participant-home-clarity-proof
participant-home-clarity-proof:
	bash ops/mainnet0/participant-home-clarity-proof.sh

.PHONY: participant-wallet-clarity-proof
participant-wallet-clarity-proof:
	bash ops/mainnet0/participant-wallet-clarity-proof.sh

.PHONY: participant-public-clarity-proof
participant-public-clarity-proof:
	bash ops/mainnet0/participant-public-clarity-proof.sh

.PHONY: buy-void-queue-txref-guard-proof
buy-void-queue-txref-guard-proof:
	bash ops/mainnet0/buy-void-queue-txref-guard-proof.sh

.PHONY: mainnet0-final-public-launch-checklist-proof
mainnet0-final-public-launch-checklist-proof:
	bash ops/mainnet/mainnet0-final-public-launch-checklist-proof.sh

.PHONY: mainnet0-launch-approval-plan-proof
mainnet0-launch-approval-plan-proof:
	bash ops/mainnet/mainnet0-launch-approval-plan-proof.sh

.PHONY: mainnet0-public-validator-admission-decision-proof
mainnet0-public-validator-admission-decision-proof:
	bash ops/mainnet/mainnet0-public-validator-admission-decision-proof.sh

.PHONY: mainnet0-current-baseline-proof
mainnet0-current-baseline-proof:
	bash ops/mainnet/mainnet0-current-baseline-proof.sh

.PHONY: mainnet0-final-gonogo-map-proof
mainnet0-final-gonogo-map-proof:
	bash ops/mainnet/mainnet0-final-gonogo-map-proof.sh

.PHONY: mainnet0-key-ceremony-plan-proof
mainnet0-key-ceremony-plan-proof:
	bash ops/mainnet/mainnet0-key-ceremony-plan-proof.sh

.PHONY: mainnet0-key-ceremony-result-template-proof
mainnet0-key-ceremony-result-template-proof:
	bash ops/mainnet/mainnet0-key-ceremony-result-template-proof.sh

.PHONY: mainnet0-public-release-hygiene-proof
mainnet0-public-release-hygiene-proof:
	bash ops/mainnet/mainnet0-public-release-hygiene-proof.sh

.PHONY: participant-home-mainnet0-nogo-clarity-proof
participant-home-mainnet0-nogo-clarity-proof:
	bash ops/mainnet0/participant-home-mainnet0-nogo-clarity-proof.sh

.PHONY: participant-home-launch-strip-proof
participant-home-launch-strip-proof:
	bash ops/mainnet0/participant-home-launch-strip-proof.sh

wallet-ui-cleanup-proof:
	bash ops/mainnet0/wallet-ui-cleanup-proof.sh

.PHONY: wc-devnet-bootstrap-proof
wc-devnet-bootstrap-proof:
	@mkdir -p .runtime/mainnet0/wc-devnet-local/current/docs .runtime/mainnet0/wc-devnet-local/current/config .runtime/mainnet0/wc-devnet-local/current/broadcast/WorkCreditsDevnetDeploy.s.sol/2050
	@STATE_JSON="$$(pwd)/.runtime/mainnet0/wc-devnet-local/current/docs/VOID-DEVNET-PROTOCOL-STATE.json" \
	  STATE_FILE="$$(pwd)/.runtime/mainnet0/wc-devnet-local/current/docs/VOID-WORKCREDITS-DEVNET-STATE.json" \
	  WC_CONFIG_FILE="$$(pwd)/.runtime/mainnet0/wc-devnet-local/current/config/void-workcredits-devnet.live.json" \
	  BCAST_FILE="$$(pwd)/.runtime/mainnet0/wc-devnet-local/current/broadcast/WorkCreditsDevnetDeploy.s.sol/2050/run-latest.json" \
	  bash ops/mainnet0/wc-devnet-bootstrap-proof.sh

.PHONY: mainnet0-launch-approval-artifact-prep-proof
mainnet0-launch-approval-artifact-prep-proof:
	bash ops/mainnet/mainnet0-launch-approval-artifact-prep-proof.sh


.PHONY: wc-devnet-local-state-proof
wc-devnet-local-state-proof:
	@bash ops/mainnet0/wc-devnet-local-state-proof.sh

.PHONY: mainnet0-launch-approval-artifact-template-proof
mainnet0-launch-approval-artifact-template-proof:
	bash ops/mainnet/mainnet0-launch-approval-artifact-template-proof.sh

.PHONY: mainnet0-key-ceremony-result-runbook-template-proof
mainnet0-key-ceremony-result-runbook-template-proof:
	bash ops/mainnet/mainnet0-key-ceremony-result-runbook-template-proof.sh

.PHONY: mainnet0-key-ceremony-result-proof
mainnet0-key-ceremony-result-proof:
	bash ops/mainnet/mainnet0-key-ceremony-result-proof.sh

.PHONY: mainnet0-key-ceremony-backup-receipt-proof
mainnet0-key-ceremony-backup-receipt-proof:
	bash ops/mainnet/mainnet0-key-ceremony-backup-receipt-proof.sh

.PHONY: mainnet0-authority-funding-preflight-proof
mainnet0-authority-funding-preflight-proof:
	bash ops/mainnet/mainnet0-authority-funding-preflight-proof.sh

.PHONY: mainnet0-launch-approval-artifact-draft-proof
mainnet0-launch-approval-artifact-draft-proof:
	bash ops/mainnet/mainnet0-launch-approval-artifact-draft-proof.sh

.PHONY: mainnet0-post-ops-seed-launch-state-proof
mainnet0-post-ops-seed-launch-state-proof:
	bash ops/mainnet/mainnet0-post-ops-seed-launch-state-proof.sh

.PHONY: mainnet0-public-launch-promotion-proof
mainnet0-public-launch-promotion-proof:
	bash ops/mainnet/mainnet0-public-launch-promotion-proof.sh

.PHONY: mainnet0-public-live-closeout-proof
mainnet0-public-live-closeout-proof:
	bash ops/mainnet/mainnet0-public-live-closeout-proof.sh

.PHONY: mainnet0-public-onboarding-pack-proof
mainnet0-public-onboarding-pack-proof:
	bash ops/mainnet/mainnet0-public-onboarding-pack-proof.sh

.PHONY: mainnet0-public-release-bundle-closeout-proof
mainnet0-public-release-bundle-closeout-proof:
	bash ops/mainnet/mainnet0-public-release-bundle-closeout-proof.sh

.PHONY: mainnet0-whitepaper-proof
mainnet0-whitepaper-proof:
	bash ops/mainnet/mainnet0-whitepaper-proof.sh

.PHONY: mainnet0-current-public-status-proof
mainnet0-current-public-status-proof:
	bash ops/mainnet/mainnet0-current-public-status-proof.sh

.PHONY: mainnet0-public-faq-proof
mainnet0-public-faq-proof:
	bash ops/mainnet/mainnet0-public-faq-proof.sh

.PHONY: mainnet0-quick-start-proof
mainnet0-quick-start-proof:
	bash ops/mainnet/mainnet0-quick-start-proof.sh

.PHONY: mainnet0-windows-wsl2-quick-start-proof
mainnet0-windows-wsl2-quick-start-proof:
	bash ops/mainnet/mainnet0-windows-wsl2-quick-start-proof.sh

.PHONY: mainnet0-support-runbook-proof
mainnet0-support-runbook-proof:
	bash ops/mainnet/mainnet0-support-runbook-proof.sh

.PHONY: mainnet0-start-here-proof
mainnet0-start-here-proof:
	bash ops/mainnet/mainnet0-start-here-proof.sh

.PHONY: mainnet0-public-docs-stack-proof
mainnet0-public-docs-stack-proof:
	bash ops/mainnet/mainnet0-public-docs-stack-proof.sh

.PHONY: mainnet0-developer-reference-proof
mainnet0-developer-reference-proof:
	bash ops/mainnet/mainnet0-developer-reference-proof.sh

.PHONY: mainnet0-public-surface-proof
mainnet0-public-surface-proof:
	bash ops/mainnet/mainnet0-public-surface-proof.sh

.PHONY: mainnet0-public-live-announcement-proof
mainnet0-public-live-announcement-proof:
	bash ops/mainnet/mainnet0-public-live-announcement-proof.sh

.PHONY: public-repo-hardening-proof
public-repo-hardening-proof:
	bash ops/security/public-repo-hardening-proof.sh

.PHONY: public-repo-gitleaks-current-proof
public-repo-gitleaks-current-proof:
	bash ops/security/public-repo-gitleaks-current-proof.sh

.PHONY: public-repo-gitleaks-history-triage-proof
public-repo-gitleaks-history-triage-proof:
	bash ops/security/public-repo-gitleaks-history-triage-proof.sh

.PHONY: public-github-landing-proof
public-github-landing-proof:
	bash ops/security/public-github-landing-proof.sh

.PHONY: public-github-landing-proof-low-output
public-github-landing-proof-low-output:
	bash ops/security/public-github-landing-proof-low-output.sh

.PHONY: public-proof-cadence-proof
public-proof-cadence-proof:
	bash ops/security/public-proof-cadence-proof.sh

.PHONY: public-branch-release-policy-proof
public-branch-release-policy-proof:
	bash ops/security/public-branch-release-policy-proof.sh

.PHONY: public-github-templates-proof
public-github-templates-proof:
	bash ops/security/public-github-templates-proof.sh

.PHONY: public-support-md-proof
public-support-md-proof:
	bash ops/security/public-support-md-proof.sh

.PHONY: public-readme-navigation-proof
public-readme-navigation-proof:
	bash ops/security/public-readme-navigation-proof.sh

.PHONY: public-participant-copy-proof
public-participant-copy-proof:
	bash ops/security/public-participant-copy-proof.sh

.PHONY: terminal-saveblock-log-polish-proof
terminal-saveblock-log-polish-proof:
	bash ops/security/terminal-saveblock-log-polish-proof.sh

.PHONY: public-readme-live-cleanup-proof
public-readme-live-cleanup-proof:
	bash ops/security/public-readme-live-cleanup-proof.sh

.PHONY: public-participant-first60-copy-proof
public-participant-first60-copy-proof:
	bash ops/security/public-participant-first60-copy-proof.sh

.PHONY: public-root-redirect-proof
public-root-redirect-proof:
	bash ops/security/public-root-redirect-proof.sh

.PHONY: public-sensitive-route-guard-proof
public-sensitive-route-guard-proof:
	bash ops/security/public-sensitive-route-guard-proof.sh

.PHONY: void-native-web-hosting-proof
void-native-web-hosting-proof:
	bash ops/security/void-native-web-hosting-proof.sh

.PHONY: void-native-website-routes-proof
void-native-website-routes-proof:
	bash ops/security/void-native-website-routes-proof.sh

.PHONY: void-native-site-datanet-bundle-proof
void-native-site-datanet-bundle-proof:
	bash ops/security/void-native-site-datanet-bundle-proof.sh

.PHONY: void-native-site-live-datanet-publish-proof
void-native-site-live-datanet-publish-proof:
	bash ops/security/void-native-site-live-datanet-publish-proof.sh

.PHONY: void-native-site-datanet-manifest-proof
void-native-site-datanet-manifest-proof:
	bash ops/security/void-native-site-datanet-manifest-proof.sh

.PHONY: void-native-site-serve-datanet-first-proof
void-native-site-serve-datanet-first-proof:
	bash ops/security/void-native-site-serve-datanet-first-proof.sh

.PHONY: void-native-site-domain-alias-proof
void-native-site-domain-alias-proof:
	bash ops/security/void-native-site-domain-alias-proof.sh

.PHONY: voidchain-download-page-proof
voidchain-download-page-proof:
	bash ops/security/voidchain-download-page-proof.sh

.PHONY: void-public-site-route-aliases-proof
void-public-site-route-aliases-proof:
	bash ops/security/void-public-site-route-aliases-proof.sh

.PHONY: voidchain-public-status-block-proof
voidchain-public-status-block-proof:
	bash ops/security/voidchain-public-status-block-proof.sh

.PHONY: nullfeed-public-preview-proof
nullfeed-public-preview-proof:
	bash ops/security/nullfeed-public-preview-proof.sh

.PHONY: void-public-site-bundle-proof
void-public-site-bundle-proof:
	bash ops/security/void-public-site-bundle-proof.sh

.PHONY: void-public-site-bundle-seeding-runbook-proof
void-public-site-bundle-seeding-runbook-proof:
	bash ops/security/void-public-site-bundle-seeding-runbook-proof.sh

.PHONY: void-public-site-status-doc-proof
void-public-site-status-doc-proof:
	bash ops/security/void-public-site-status-doc-proof.sh

.PHONY: void-public-docs-index-site-bundle-proof
void-public-docs-index-site-bundle-proof:
	bash ops/security/void-public-docs-index-site-bundle-proof.sh

.PHONY: void-readme-native-site-bundle-proof
void-readme-native-site-bundle-proof:
	bash ops/security/void-readme-native-site-bundle-proof.sh

.PHONY: buy-void-public-safety-status-proof
buy-void-public-safety-status-proof:
	bash ops/mainnet0/buy-void-public-safety-status-proof.sh

.PHONY: public-first60-user-journey-proof
public-first60-user-journey-proof:
	bash ops/security/public-first60-user-journey-proof.sh

.PHONY: public-download-install-journey-proof
public-download-install-journey-proof:
	bash ops/security/public-download-install-journey-proof.sh

.PHONY: public-support-route-triage-proof
public-support-route-triage-proof:
	bash ops/security/public-support-route-triage-proof.sh

.PHONY: buy-void-pool-empty-guard-plan-proof
buy-void-pool-empty-guard-plan-proof:
	bash ops/mainnet0/buy-void-pool-empty-guard-plan-proof.sh


.PHONY: void-native-web-hosting-current-plan-proof
void-native-web-hosting-current-plan-proof:
	bash ops/security/void-native-web-hosting-current-plan-proof.sh

.PHONY: alienware-runtime-service-proof
alienware-runtime-service-proof:
	bash ops/security/alienware-runtime-service-proof.sh

.PHONY: participant-wallet-devnet-gas-helper
participant-wallet-devnet-gas-helper:
	bash ops/mainnet0/participant-wallet-devnet-gas-helper.sh

.PHONY: participant-wallet-wc-to-void-readiness-proof
participant-wallet-wc-to-void-readiness-proof:
	bash ops/mainnet0/participant-wallet-wc-to-void-readiness-proof.sh

.PHONY: participant-wc-to-void-current-status-proof
participant-wc-to-void-current-status-proof:
	bash ops/mainnet0/participant-wc-to-void-current-status-proof.sh

.PHONY: participant-wc-to-void-temp-wallet-execution-proof
participant-wc-to-void-temp-wallet-execution-proof:
	bash ops/mainnet0/participant-wc-to-void-temp-wallet-execution-proof.sh

.PHONY: participant-first-user-clarity-proof
participant-first-user-clarity-proof:
	bash ops/mainnet0/participant-first-user-clarity-proof.sh

.PHONY: public-run-node-support-proof
public-run-node-support-proof:
	bash ops/mainnet0/public-run-node-support-proof.sh

.PHONY: participant-buy-void-ux-proof
participant-buy-void-ux-proof:
	bash ops/mainnet0/participant-buy-void-ux-proof.sh

.PHONY: participant-stake-public-preview-proof
participant-stake-public-preview-proof:
	bash ops/mainnet0/participant-stake-public-preview-proof.sh

.PHONY: void-public-site-bundle-peer-readiness-proof
void-public-site-bundle-peer-readiness-proof:
	bash ops/security/void-public-site-bundle-peer-readiness-proof.sh

.PHONY: void-public-site-bundle-auto-materialize-proof
void-public-site-bundle-auto-materialize-proof:
	bash ops/security/void-public-site-bundle-auto-materialize-proof.sh

.PHONY: void-site-bundle-peer-env-persistence-proof
void-site-bundle-peer-env-persistence-proof:
	bash ops/security/void-site-bundle-peer-env-persistence-proof.sh

.PHONY: public-node-network-troubleshooting-proof
public-node-network-troubleshooting-proof:
	bash ops/security/public-node-network-troubleshooting-proof.sh

.PHONY: github-branch-cleanup-proof
github-branch-cleanup-proof:
	bash ops/security/github-branch-cleanup-proof.sh

.PHONY: participant-first-user-trust-audit
participant-first-user-trust-audit:
	bash ops/security/participant-first-user-trust-audit.sh

.PHONY: public-trust-boundary-stack-proof
public-trust-boundary-stack-proof:
	bash ops/security/public-trust-boundary-stack-proof.sh

.PHONY: mainnet0-public-release-status-summary-proof
mainnet0-public-release-status-summary-proof:
	bash ops/mainnet/mainnet0-public-release-status-summary-proof.sh

.PHONY: mainnet0-public-release-summary-discoverability-proof
mainnet0-public-release-summary-discoverability-proof:
	bash ops/mainnet/mainnet0-public-release-summary-discoverability-proof.sh

.PHONY: mainnet0-public-launch-share-checklist-proof
mainnet0-public-launch-share-checklist-proof:
	bash ops/mainnet/mainnet0-public-launch-share-checklist-proof.sh

.PHONY: mainnet0-public-share-posts-proof
mainnet0-public-share-posts-proof:
	bash ops/mainnet/mainnet0-public-share-posts-proof.sh

.PHONY: mainnet0-public-communications-stack-proof
mainnet0-public-communications-stack-proof:
	bash ops/mainnet/mainnet0-public-communications-stack-proof.sh

.PHONY: participant-public-ui-polish-proof
participant-public-ui-polish-proof:
	bash ops/mainnet0/participant-public-ui-polish-proof.sh

.PHONY: datanet-wc-status-v1-proof
datanet-wc-status-v1-proof:
	bash ops/mainnet0/datanet-wc-status-v1-proof.sh

.PHONY: participant-datanet-wc-status-ui-proof
participant-datanet-wc-status-ui-proof:
	bash ops/mainnet0/participant-datanet-wc-status-ui-proof.sh

.PHONY: participant-run-once-wc-delta-proof
participant-run-once-wc-delta-proof:
	bash ops/mainnet0/participant-run-once-wc-delta-proof.sh

.PHONY: participant-wc-receipt-detail-link-proof
participant-wc-receipt-detail-link-proof:
	bash ops/mainnet0/participant-wc-receipt-detail-link-proof.sh

.PHONY: participant-wc-earn-receipt-card-proof
participant-wc-earn-receipt-card-proof:
	bash ops/mainnet0/participant-wc-earn-receipt-card-proof.sh

.PHONY: participant-run-once-visible-result-proof
participant-run-once-visible-result-proof:
	bash ops/mainnet0/participant-run-once-visible-result-proof.sh

.PHONY: tailnet-http-public-base-proof
tailnet-http-public-base-proof:
	bash ops/mainnet0/tailnet-http-public-base-proof.sh

.PHONY: mutual-tailnet-peer-env-proof
mutual-tailnet-peer-env-proof:
	bash ops/mainnet0/mutual-tailnet-peer-env-proof.sh

.PHONY: participant-share-open-no-manual-peer-seed-proof
participant-share-open-no-manual-peer-seed-proof:
	bash ops/two-box-ui-share-open-both-ways-no-seed-proof.sh

.PHONY: participant-share-open-materialized-local-persistence-proof
participant-share-open-materialized-local-persistence-proof:
	bash ops/two-box-materialized-local-persistence-proof.sh

.PHONY: participant-share-open-materialized-local-restart-persistence-proof
participant-share-open-materialized-local-restart-persistence-proof:
	bash ops/two-box-materialized-local-restart-persistence-proof.sh

.PHONY: participant-share-open-materialized-copy-integrity-proof
participant-share-open-materialized-copy-integrity-proof:
	bash ops/two-box-materialized-copy-integrity-proof.sh

.PHONY: participant-share-open-materialized-provenance-proof
participant-share-open-materialized-provenance-proof:
	bash ops/two-box-materialized-provenance-proof.sh

.PHONY: participant-share-open-materialized-provenance-restart-persistence-proof
participant-share-open-materialized-provenance-restart-persistence-proof:
	bash ops/two-box-materialized-provenance-restart-persistence-proof.sh

.PHONY: participant-share-open-materialized-provenance-mismatch-guard-proof
participant-share-open-materialized-provenance-mismatch-guard-proof:
	bash ops/two-box-materialized-provenance-mismatch-guard-proof.sh

.PHONY: participant-share-open-materialized-provenance-status-view-proof
participant-share-open-materialized-provenance-status-view-proof:
	bash ops/two-box-materialized-provenance-status-view-proof.sh

.PHONY: tailscale-ssh-auth-preflight-proof
tailscale-ssh-auth-preflight-proof:
	bash ops/tailscale-ssh-auth-preflight-proof.sh

.PHONY: datanet-materialized-current-baseline-proof
datanet-materialized-current-baseline-proof:
	bash ops/datanet-materialized-current-baseline-proof.sh

.PHONY: datanet-materialized-public-status-surface-proof
datanet-materialized-public-status-surface-proof:
	bash ops/datanet-materialized-public-status-surface-proof.sh

.PHONY: datanet-materialized-public-status-served-proof
datanet-materialized-public-status-served-proof:
	bash ops/datanet-materialized-public-status-served-proof.sh

.PHONY: datanet-materialized-participant-status-card-proof
datanet-materialized-participant-status-card-proof:
	bash ops/datanet-materialized-participant-status-card-proof.sh

.PHONY: datanet-materialized-public-discoverability-closeout-proof
datanet-materialized-public-discoverability-closeout-proof:
	bash ops/datanet-materialized-public-discoverability-closeout-proof.sh

.PHONY: public-bootstrap-gateway-proof
public-bootstrap-gateway-proof:
	bash ops/public-bootstrap-gateway-proof.sh

.PHONY: public-bootstrap-gateway-routes-proof
public-bootstrap-gateway-routes-proof:
	bash ops/public-bootstrap-gateway-routes-proof.sh

home-public-reachability-v1-proof:
	bash ops/home-public-reachability-v1-proof.sh

vps-public-seed-bootstrap-v1-proof:
	bash ops/public/vps-public-seed-bootstrap-v1-proof.sh

vps-public-seed-preflight-v1-proof:
	bash ops/public/vps-public-seed-preflight-v1-proof.sh

vps-public-seed-gateway-install-v1-proof:
	bash ops/public/vps-public-seed-gateway-install-v1-proof.sh

vps-public-seed-remote-proof-v1-proof:
	bash ops/public/vps-public-seed-remote-proof-v1-proof.sh

.PHONY: public-seed-adapter-status
public-seed-adapter-status:
	VOID_ADAPTER_HOST=$${VOID_ADAPTER_HOST:-100.122.79.39} VOID_ADAPTER_PORT=$${VOID_ADAPTER_PORT:-4111} bash ops/public/public-seed-adapter-status-v1.sh

.PHONY: public-seed-adapter-status-json
public-seed-adapter-status-json:
	@VOID_ADAPTER_HOST=$${VOID_ADAPTER_HOST:-100.122.79.39} VOID_ADAPTER_PORT=$${VOID_ADAPTER_PORT:-4111} bash ops/public/public-seed-adapter-status-v1.sh --json

.PHONY: live-public-seed-stack-closeout
live-public-seed-stack-closeout:
	bash ops/public/live-public-seed-stack-closeout-v1.sh

.PHONY: vps-public-seed-deploy-v2
vps-public-seed-deploy-v2:
	bash ops/public/deploy-vps-public-seed-adapter-v2.sh

.PHONY: vps-public-seed-internet-proof-v2
vps-public-seed-internet-proof-v2:
	bash ops/public/vps-public-seed-internet-proof-v2.sh

.PHONY: alienware-funnel-public-seed
alienware-funnel-public-seed:
	bash ops/public/alienware-funnel-public-seed-v1.sh

.PHONY: current-public-seed-url-proof
current-public-seed-url-proof:
	bash ops/public/current-public-seed-url-proof-v1.sh

.PHONY: public-entrypoints-proof
public-entrypoints-proof:
	bash ops/public/public-entrypoints-v1-proof.sh

.PHONY: funding-support-proof
funding-support-proof:
	bash ops/public/funding-support-v1-proof.sh

.PHONY: participant-funding-card-proof
participant-funding-card-proof:
	bash ops/public/participant-funding-card-v1-proof.sh

.PHONY: public-landing-proof
public-landing-proof:
	bash ops/public/public-landing-v1-proof.sh

.PHONY: buy-void-public-proof
buy-void-public-proof:
	bash ops/public/buy-void-public-v1-proof.sh

.PHONY: buy-void-request-intake-proof
buy-void-request-intake-proof:
	bash ops/public/buy-void-request-intake-v1-proof.sh

.PHONY: buy-void-pool-accounting-proof
buy-void-pool-accounting-proof:
	bash ops/public/buy-void-pool-accounting-v1-proof.sh

.PHONY: buy-void-fulfillment-10246-live-proof
buy-void-fulfillment-10246-live-proof:
	RPC=$${RPC:-http://127.0.0.1:18545} ops/mainnet0/buy-void-fulfillment-10246-live-proof.sh

.PHONY: participant-datanet-store-serve-demo-proof
participant-datanet-store-serve-demo-proof:
	BASE=$${BASE:-http://127.0.0.1:4100} ops/mainnet0/participant-datanet-store-serve-demo-proof.sh

.PHONY: datanet-store-serve-live-service-crossbox-closeout-proof
datanet-store-serve-live-service-crossbox-closeout-proof:
	ops/mainnet0/datanet-store-serve-live-service-crossbox-closeout-proof.sh

.PHONY: alienware-runtime-service-truth-guard-proof
alienware-runtime-service-truth-guard-proof:
	ops/mainnet0/alienware-runtime-service-truth-guard-proof.sh

.PHONY: alienware-duplicate-service-disabled-closeout-proof
alienware-duplicate-service-disabled-closeout-proof:
	ops/mainnet0/alienware-duplicate-service-disabled-closeout-proof.sh

.PHONY: datanet-demo-text-store-fetch-ui-proof
datanet-demo-text-store-fetch-ui-proof:
	BASE=$${BASE:-http://127.0.0.1:4100} ops/mainnet0/datanet-demo-text-store-fetch-ui-proof.sh

.PHONY: datanet-demo-share-open-by-id-ui-proof
datanet-demo-share-open-by-id-ui-proof:
	BASE=$${BASE:-http://127.0.0.1:4100} ops/mainnet0/datanet-demo-share-open-by-id-ui-proof.sh

.PHONY: datanet-publish-shim-peer-import-proof
datanet-publish-shim-peer-import-proof:
	BASE=$${BASE:-http://127.0.0.1:4100} ops/mainnet0/datanet-publish-shim-peer-import-proof.sh

.PHONY: datanet-publish-shim-peer-import-two-box-closeout-proof
datanet-publish-shim-peer-import-two-box-closeout-proof:
	ops/mainnet0/datanet-publish-shim-peer-import-two-box-closeout-proof.sh

.PHONY: datanet-demo-peer-import-ui-proof
datanet-demo-peer-import-ui-proof:
	BASE=$${BASE:-http://127.0.0.1:4100} ops/mainnet0/datanet-demo-peer-import-ui-proof.sh

.PHONY: datanet-demo-import-share-url-ui-proof
datanet-demo-import-share-url-ui-proof:
	BASE=$${BASE:-http://127.0.0.1:4100} ops/mainnet0/datanet-demo-import-share-url-ui-proof.sh

.PHONY: datanet-demo-import-share-url-two-box-proof
datanet-demo-import-share-url-two-box-proof:
	ops/mainnet0/datanet-demo-import-share-url-two-box-proof.sh

.PHONY: datanet-demo-object-browser-proof
datanet-demo-object-browser-proof:
	ops/mainnet0/datanet-demo-object-browser-proof.sh

.PHONY: datanet-demo-detail-url-autoload-proof
datanet-demo-detail-url-autoload-proof:
	ops/mainnet0/datanet-demo-detail-url-autoload-proof.sh

.PHONY: datanet-demo-object-detail-proof
datanet-demo-object-detail-proof:
	ops/mainnet0/datanet-demo-object-detail-proof.sh

.PHONY: participant-datanet-object-browser-link-proof
participant-datanet-object-browser-link-proof:
	ops/mainnet0/participant-datanet-object-browser-link-proof.sh


.PHONY: participant-wc-proof-viewer-proof
participant-wc-proof-viewer-proof:
	bash ops/mainnet0/participant-wc-proof-viewer-proof.sh

# VOID_PUBLIC_RELEASE_DISTRIBUTION_WALL_V1_BEGIN
.PHONY: public-release-build-v1
public-release-build-v1:
	node tools/build-public-release-v1.mjs --out dist-release

.PHONY: public-release-distribution-v1-proof
public-release-distribution-v1-proof:
	bash ops/security/public-release-distribution-v1-proof.sh
# VOID_PUBLIC_RELEASE_DISTRIBUTION_WALL_V1_END

.PHONY: public-release-update-channel-v1-proof
public-release-update-channel-v1-proof:
	bash ops/security/public-release-update-channel-v1-proof.sh

.PHONY: public-release-channel-build-v1
public-release-channel-build-v1:
	test -n "$(RELEASE_TAG)"
	test -n "$(RELEASE_BASE_URL)"
	node tools/build-public-release-channel-v1.mjs \
	  --manifest dist-release/void-node-release-manifest.json \
	  --checksums dist-release/SHA256SUMS \
	  --base-url "$(RELEASE_BASE_URL)" \
	  --repository 6ZoSo9/void-node \
	  --release-tag "$(RELEASE_TAG)" \
	  --channel stable \
	  --out dist-release/stable-v1.json

.PHONY: public-release-publication-promotion-v1-static-proof
public-release-publication-promotion-v1-static-proof:
	node scripts/prove_public_release_publication_promotion_v1.mjs

.PHONY: public-release-publication-promotion-v1-proof
public-release-publication-promotion-v1-proof:
	bash ops/security/public-release-publication-promotion-v1-proof.sh

.PHONY: public-release-qualification-v1-static-proof
public-release-qualification-v1-static-proof:
	node scripts/prove_public_release_qualification_v1.mjs

.PHONY: public-release-qualification-v1-proof
public-release-qualification-v1-proof:
	bash ops/security/public-release-qualification-v1-proof.sh

.PHONY: public-python-bytecode-hygiene-v1-static-proof
public-python-bytecode-hygiene-v1-static-proof:
	node scripts/prove_public_python_bytecode_hygiene_v1.mjs

.PHONY: public-python-bytecode-hygiene-v1-proof
public-python-bytecode-hygiene-v1-proof:
	bash ops/security/public-python-bytecode-hygiene-v1-proof.sh

.PHONY: public-first-official-release-rehearsal-v1-static-proof
public-first-official-release-rehearsal-v1-static-proof:
	node scripts/prove_public_first_official_release_rehearsal_v1.mjs

.PHONY: public-first-official-release-rehearsal-v1-proof
public-first-official-release-rehearsal-v1-proof:
	bash ops/security/public-first-official-release-rehearsal-v1-proof.sh
