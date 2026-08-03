const LIGATURES: Record<string, string> = {
  "\uFB00": "ff", "\uFB01": "fi", "\uFB02": "fl",
  "\uFB03": "ffi", "\uFB04": "ffl",
};

export function normalizeText(raw: string): string {
  let text = raw.normalize("NFKC");

  for (const [lig, replacement] of Object.entries(LIGATURES)) {
    text = text.split(lig).join(replacement);
  }

  return text
    .replace(/[\u00A0\u2007\u202F\u2000-\u200A]/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/^[ \t]*[\u2022\u25CF\u25AA\u25E6\u2043\u00B7]\s*/gm, "- ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function assessQuality(text: string): {
  ok: boolean;
  wordCount: number;
  reason?: string;
} {
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < 50) {
    return {
      ok: false,
      wordCount,
      reason: "Very little text extracted. The file may be a scan or image-based PDF.",
    };
  }

  const letters = (text.match(/[a-zA-Z]/g) ?? []).length;
  if (letters / text.length < 0.5) {
    return { ok: false, wordCount, reason: "Extracted text looks garbled rather than readable." };
  }

  return { ok: true, wordCount };
}