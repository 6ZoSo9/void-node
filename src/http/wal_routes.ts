import { WAL, WalRecord } from "../wal.js";
import type { Request, Response } from "express";

export function registerWalRoutes(app:any, wal: WAL){
  app.get("/wal/scan", (_:Request, res:Response)=>{
    const recs = wal.scan();
    res.json({ ok:true, count:recs.length, recs });
  });

  app.post("/wal/append/appendBlock", async (req:Request, res:Response)=>{
    const n = Number(req.query.number ?? -1);
    const h = String(req.query.hash ?? "");
    await wal.append({ t:"appendBlock", number:n, payloadHash:h, ts:Date.now() });
    res.json({ ok:true, appended:true });
  });

  app.post("/wal/append/setHead", async (req:Request, res:Response)=>{
    const n = Number(req.query.number ?? -1);
    await wal.append({ t:"setHead", number:n, ts:Date.now() });
    res.json({ ok:true, appended:true });
  });

  app.post("/wal/rotate", (_:Request, res:Response)=>{
    wal.rotate();
    res.json({ ok:true, rotated:true });
  });
}
