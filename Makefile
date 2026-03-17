
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
