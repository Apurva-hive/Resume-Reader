import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.send({
    ok: true,
    uptime: process.uptime(),
    ts: new Date().toISOString(),
  });
});
