# Fresh canary credential live transport adapters V1

This module binds the merged fresh-canary credential lifecycle controller to bounded stage commands. Request runs on Nimo; review, activation, binding, and duplicate probing run on Precision. Each stage pins the command array, source path and SHA-256, result marker, timeout, host, and token policy. Attempt state is persisted before execution; ambiguous results hold and require exact recovery. Build and CI use mock transports only and perform no live credential, binding, submission, ticket, WC, payment, restart, or deployment action.
