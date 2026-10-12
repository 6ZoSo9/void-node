# Operating Public App Composition Gateway v1

Run the repository proof before installation:

```bash
make public-app-composition-repair-wall-v1-proof
```

The service is installed from:

```text
ops/systemd/user/void-public-app-composition-gateway-v1.service.example
```

The intended live sequence is deliberately split:

1. Merge and deploy repository code.
2. Install and verify the new service on port 8082.
3. Confirm 8080, 4100, and 8082 are independently healthy.
4. Back up the current Tailscale Funnel status.
5. Explicitly repoint Funnel from port 8080 to port 8082.
6. Run public HTTPS smoke tests.
7. Roll back Funnel to port 8080 immediately if any public route regresses.

Installing the service does not change Funnel. The cutover wrapper requires a
separate exact confirmation.

The underlying node and Public Earn Gateway remain unchanged during cutover.
