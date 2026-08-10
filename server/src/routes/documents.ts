import { Router } from "express";
import multer from "multer";
import { NotFoundError, ValidationError } from "../lib/errors.js";
import { extractDocument } from "../services/extraction/index.js";
import {
  documentStore,
  toSummary,
  uploadBodySchema,
} from "../schemas/document.js";

const MAX_BYTES = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
});

export const documentsRouter = Router();

documentsRouter.post("/", upload.single("file"), async (req, res) => {
  try {
     if (!req.file) throw new ValidationError("No file uploaded");

  const body = uploadBodySchema.parse(req.body);
  const extracted = await extractDocument(req.file.buffer);
  const updatedExtractedData = {
    kind: body.kind,
    title: body.title ?? req.file.originalname,
    filename: req.file.originalname,
    format: extracted.format,
    text: extracted.text,
    wordCount: extracted.wordCount,
    ...(extracted.pageCount !== undefined ? { pageCount: extracted.pageCount } : {}),
    ...(extracted.warning !== undefined ? { warning: extracted.warning } : {}),
  }
  const doc = await documentStore.create(updatedExtractedData);

  res.status(201).json({ document: doc });
  } catch (error) {
    console.error(error)
    throw error;
  }
 
});

documentsRouter.get("/", async (_req, res) => {
  const docs = await documentStore.list();
  res.json({ documents: docs.map(toSummary) });
});

documentsRouter.get("/:id", async (req, res) => {
  const doc = await documentStore.get(req.params.id);
  if (!doc) throw new NotFoundError("Document");
  res.json({ document: doc });
});

documentsRouter.delete("/:id", async (req, res) => {
  if (!(await documentStore.delete(req.params.id))) throw new NotFoundError("Document");
  res.status(204).end();
});