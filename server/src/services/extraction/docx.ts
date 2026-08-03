import mammoth from "mammoth";
import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";

export async function extractDocx(buffer: Buffer): Promise<{ text: string }> {
  let html: string;

  try {
    const result = await mammoth.convertToHtml({ buffer });
    for (const message of result.messages) {
      logger.debug({ message }, "mammoth conversion note");
    }
    html = result.value;
  } catch {
    throw new AppError(
      "Could not read this Word document. It may be corrupt, or saved in the older .doc format.",
      422, "DOCX_UNREADABLE"
    );
  }

  return { text: htmlToText(html) };
}

function htmlToText(html: string): string {
  return html
    .replace(/<h([1-6])[^>]*>/gi, (_m, lvl: string) => `\n\n${"#".repeat(Number(lvl))} `)
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/li>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(ul|ol|table|tr)>/gi, "\n")
    .replace(/<\/t[dh]>/gi, "   ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCharCode(Number(code)));
}