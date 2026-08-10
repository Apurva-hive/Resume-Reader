import {
  index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid,
} from "drizzle-orm/pg-core";
import type { AtsScore } from "../schemas/analysis.js";

export const documentKindEnum = pgEnum("document_kind", ["resume", "job_description"]);
export const documentFormatEnum = pgEnum("document_format", ["pdf", "docx", "txt"]);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: documentKindEnum("kind").notNull(),
    title: text("title").notNull(),
    filename: text("filename").notNull(),
    format: documentFormatEnum("format").notNull(),
    text: text("text").notNull(),
    wordCount: integer("word_count").notNull(),
    pageCount: integer("page_count"),
    warning: text("warning"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("documents_created_at_idx").on(table.createdAt)]
);

export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resumeId: uuid("resume_id").notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    jobDescriptionId: uuid("job_description_id").notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    overallScore: integer("overall_score").notNull(),
    result: jsonb("result").$type<AtsScore>().notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    latencyMs: integer("latency_ms").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("analyses_resume_idx").on(table.resumeId, table.createdAt)]
);

export type DocumentRow = typeof documents.$inferSelect;
export type NewDocumentRow = typeof documents.$inferInsert;
export type AnalysisRow = typeof analyses.$inferSelect;
export type NewAnalysisRow = typeof analyses.$inferInsert;