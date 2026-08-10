import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { documents, type DocumentRow, type NewDocumentRow } from "../db/schema.js";

export const documentKind = z.enum(["resume", "job_description"]);
export type DocumentKind = z.infer<typeof documentKind>;

export const uploadBodySchema = z.object({
  kind: documentKind,
  title: z.string().trim().min(1).max(200).optional(),
});

export type StoredDocument = DocumentRow;

export const documentStore = {
  async create(doc: NewDocumentRow): Promise<StoredDocument> {
    const [row] = await db.insert(documents).values(doc).returning();
    if (!row) throw new Error("Insert returned no row");
    return row;
  },

  async get(id: string): Promise<StoredDocument | undefined> {
    const [row] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    return row;
  },

  async list(): Promise<StoredDocument[]> {
    return db.select().from(documents).orderBy(desc(documents.createdAt));
  },

  async delete(id: string): Promise<boolean> {
    const rows = await db.delete(documents).where(eq(documents.id, id))
      .returning({ id: documents.id });
    return rows.length > 0;
  },
};

export function toSummary(doc: StoredDocument) {
  const { text, ...rest } = doc;
  return rest;
}