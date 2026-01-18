
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
