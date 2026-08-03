import { extractText, getDocumentProxy } from "unpdf";
import { AppError } from "../../lib/errors.js";

export type PdfResult = { text: string; pageCount: number; usedLayoutPass: boolean };
type PositionedItem = { str: string; x: number; y: number; width: number };

export async function extractPdf(buffer: Buffer): Promise<PdfResult> {
  const data = new Uint8Array(buffer);

  let pdf;
  try {
    pdf = await getDocumentProxy(data);
  } catch {
    throw new AppError(
      "Could not read this PDF. It may be corrupt or password-protected.",
      422, "PDF_UNREADABLE"
    );
  }

  const pageCount = pdf.numPages;
  const pages: string[] = [];
  let usedLayoutPass = false;

  for (let n = 1; n <= pageCount; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();

    const items: PositionedItem[] = [];
    for (const item of content.items as Array<Record<string, unknown>>) {
      const str = typeof item["str"] === "string" ? item["str"] : "";
      if (!str.trim()) continue;
      const transform = item["transform"] as number[] | undefined;
      if (!transform || transform.length < 6) continue;
      items.push({
        str,
        x: transform[4] ?? 0,
        y: transform[5] ?? 0,
        width: typeof item["width"] === "number" ? item["width"] : 0,
      });
    }

    if (items.length === 0) { pages.push(""); continue; }

    const { text, split } = reconstructPage(items);
    if (split) usedLayoutPass = true;
    pages.push(text);
  }

  const joined = pages.join("\n\n");

  if (joined.replace(/\s/g, "").length < 20) {
    const { text } = await extractText(data, { mergePages: true });
    return { text, pageCount, usedLayoutPass: false };
  }

  return { text: joined, pageCount, usedLayoutPass };
}

function reconstructPage(items: PositionedItem[]): { text: string; split: boolean } {
  const minX = Math.min(...items.map((i) => i.x));
  const maxX = Math.max(...items.map((i) => i.x + i.width));
  const pageWidth = maxX - minX;
  if (pageWidth <= 0) return { text: itemsToLines(items), split: false };

  const gap = findColumnGap(items, minX, pageWidth);
  if (!gap) return { text: itemsToLines(items), split: false };

  const spanning = items.filter((i) => i.x < gap && i.x + i.width > gap);
  const left = items.filter((i) => i.x + i.width <= gap);
  const right = items.filter((i) => i.x >= gap);

  if (left.length < items.length * 0.15 || right.length < items.length * 0.15) {
    return { text: itemsToLines(items), split: false };
  }

  const blocks = [itemsToLines(spanning), itemsToLines(left), itemsToLines(right)];
  return { text: blocks.filter(Boolean).join("\n\n"), split: true };
}

function findColumnGap(
  items: PositionedItem[], minX: number, pageWidth: number
): number | null {
  const BUCKET = 4;
  const searchStart = minX + pageWidth * 0.2;
  const searchEnd = minX + pageWidth * 0.8;
  const maxCrossings = Math.max(1, Math.floor(items.length * 0.08));

  let best: { x: number; width: number } | null = null;
  let runStart: number | null = null;

  for (let x = searchStart; x <= searchEnd; x += BUCKET) {
    const crossings = items.filter((i) => i.x < x && i.x + i.width > x).length;

    if (crossings <= maxCrossings) {
      runStart ??= x;
    } else if (runStart !== null) {
      const width = x - runStart;
      if (!best || width > best.width) best = { x: runStart + width / 2, width };
      runStart = null;
    }
  }

  if (runStart !== null) {
    const width = searchEnd - runStart;
    if (!best || width > best.width) best = { x: runStart + width / 2, width };
  }

  if (!best || best.width < pageWidth * 0.04) return null;
  return best.x;
}

function itemsToLines(items: PositionedItem[]): string {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PositionedItem[][] = [];

  for (const item of sorted) {
    const current = lines[lines.length - 1];
    const reference = current?.[0];
    if (current && reference && Math.abs(reference.y - item.y) <= 2.5) {
      current.push(item);
    } else {
      lines.push([item]);
    }
  }

  return lines
    .map((line) => {
      const ordered = [...line].sort((a, b) => a.x - b.x);
      let out = "";
      let prev: PositionedItem | undefined;
      for (const item of ordered) {
        if (prev) {
          const gap = item.x - (prev.x + prev.width);
          if (gap > 12) out += "   ";
          else if (gap > 1 && !out.endsWith(" ")) out += " ";
        }
        out += item.str;
        prev = item;
      }
      return out.trim();
    })
    .filter(Boolean)
    .join("\n");
}