// src/http/hello.ts
import type { Express } from "express";

export function registerHello(app: Express) {
  app.get("/hello", (_req, res) => res.json({ ok: true, msg: "void-node says hello" }));
}

