// VOID Community License (VCL) v1.0 — see LICENSE
// Copyright (c) 2025 6ZoSo9

// src/http/hello.ts
import type { Express } from "express";

export function registerHello(app: Express) {
  app.get("/hello", (_req, res) => res.json({ ok: true, msg: "void-node says hello" }));
}

