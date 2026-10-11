import vm from "node:vm";

export function createWebCrossUidWriterInputV1(context) {
  return vm.runInContext(`({
    capacity_lock: {
      shared_directory: "/tmp/void-web-custody-cross-uid-test-only",
      custody_uid: 2101, web_uid: 2102, shared_gid: 2103,
      wait_timeout_ms: 2000, poll_interval_ms: 20
    },
    writer_input: {
      event: {
        operator_status: "payment_verified",
        request_id: "buyvoid_abc_1234abcd",
        quoted_void: "100.000000",
        payment_verifier: {
          chain: "base",
          receipt: { block_number: 123, logs: [{ topic: "payment" }] }
        },
        launch_authority: { generation: 7 }
      },
      request: {
        request_id: "buyvoid_abc_1234abcd",
        quoted_void: "100.000000",
        buyer: { wallet: "0xcccccccccccccccccccccccccccccccccccccccc" },
        payment_instructions: {
          chain: "base", asset: "USDC", amount: "50.000000"
        }
      },
      request_dir: "/tmp/void-buyer-synthetic-only",
      with_launch_authority_mutation: async () => ({}),
      read_sale_state: async () => ({})
    }
  })`, context);
}
