import { AppError } from "../../lib/errors.js";
import { extractDocx } from "./docx.js";
import { extractPdf } from "./pdf.js";
import { assessQuality, normalizeText } from "./normalize.js";

export type ExtractionResult = {
  text: string;
  wordCount: number;
  format: "pdf" | "docx" | "txt";
  pageCount?: number;
  warning?: string;
};

function sniffFormat(buffer: Buffer): "pdf" | "docx" | "txt" | "unknown" {
  if (buffer.length < 4) return "unknown";

  if (buffer.subarray(0, 4).toString("latin1") === "%PDF") return "pdf";

  if (buffer[0] === 0x50 && buffer[1] === 0x4b) {
    const head = buffer.subarray(0, 4000).toString("latin1");
    return head.includes("word/") ? "docx" : "unknown";
  }

  if (buffer.subarray(0, 8).toString("hex") === "d0cf11e0a1b11ae1") {
    throw new AppError(
      "This is a legacy .doc file. Please re-save it as .docx or PDF.",
      415, "LEGACY_DOC"
    );
  }

  if (!buffer.subarray(0, 1000).includes(0)) return "txt";

  return "unknown";
}

export async function extractDocument(buffer: Buffer): Promise<ExtractionResult> {
  const format = sniffFormat(buffer);

  if (format === "unknown") {
    throw new AppError(
      "Unsupported file type. Upload a PDF, DOCX, or plain text file.",
      415, "UNSUPPORTED_FORMAT"
    );
  }

  let raw: string;
  let pageCount: number | undefined;

  if (format === "pdf") {
    const result = await extractPdf(buffer);
    raw = result.text;
    pageCount = result.pageCount;
  } else if (format === "docx") {
    raw = (await extractDocx(buffer)).text;
  } else {
    raw = buffer.toString("utf8");
  }

  const text = normalizeText(raw);
  const quality = assessQuality(text);

  return {
    text,
    wordCount: quality.wordCount,
    format,
    ...(pageCount !== undefined ? { pageCount } : {}),
    ...(quality.ok ? {} : { warning: quality.reason }),
  };
}