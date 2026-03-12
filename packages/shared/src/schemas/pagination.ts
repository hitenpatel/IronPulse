import { z } from "zod";

// Cursor is a UUID (record ID). Used with Prisma's cursor + skip: 1 pattern.
// Ordering is set per-query (e.g. startedAt desc). Prisma handles cursor positioning
// correctly with orderBy — the cursor identifies the starting record, not the sort value.
export const cursorPaginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});
export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>;
