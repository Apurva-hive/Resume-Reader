import { Router } from "express";
import { NotFoundError } from "../lib/errors.js";

/**
 * M1 lands here: POST /documents (upload + extract), GET /documents,
 * GET /documents/:id, DELETE /documents/:id.
 *
 * Route handlers stay thin — validate input, call one service, shape the
 * response. Extraction logic belongs in services/extraction/.
 */
export const documentsRouter = Router();

documentsRouter.get("/", async (_req, res) => {
  res.json({ documents: [] });
});

documentsRouter.get("/:id", async (req, _res) => {
  throw new NotFoundError(`Document ${req.params.id}`);
});
