#!/usr/bin/env bash
set -euo pipefail
: "${NODE_PRIVKEY_PATH:?missing NODE_PRIVKEY_PATH}"
openssl pkey -in "$NODE_PRIVKEY_PATH" -inform PEM -noout >/dev/null
