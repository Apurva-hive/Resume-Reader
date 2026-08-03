import { z } from "zod";
import { randomUUID } from "node:crypto";

export const documentKind = z.enum(["resume", "job_description"]);
export type DocumentKind = z.infer<typeof documentKind>;

export const uploadBodySchema = z.object({
  kind: documentKind,
  title: z.string().trim().min(1).max(200).optional(),
});

export type StoredDocument = {
  id: string;
  kind: DocumentKind;
  title: string;
  filename: string;
  format: "pdf" | "docx" | "txt";
  text: string;
  wordCount: number;
  pageCount?: number;
  warning?: string;
  createdAt: string;
};

const documents = new Map<string, StoredDocument>();

export const documentStore = {
  create(doc: Omit<StoredDocument, "id" | "createdAt">): StoredDocument {
    const stored: StoredDocument = {
      ...doc,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    documents.set(stored.id, stored);
    return stored;
  },

  get(id: string): StoredDocument | undefined {
    return documents.get(id);
  },

  list(): StoredDocument[] {
    return [...documents.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  },

  delete(id: string): boolean {
    return documents.delete(id);
  },
};

export function toSummary(doc: StoredDocument) {
  const { text, ...rest } = doc;
  return rest;
}