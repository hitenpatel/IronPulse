import { z } from "zod";

export const sendMessageSchema = z.object({
  receiverId: z.string().uuid(),
  content: z.string().min(1).max(2000),
});

export const messageHistorySchema = z.object({
  partnerId: z.string().uuid(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(30),
});

export const markReadSchema = z.object({ partnerId: z.string().uuid() });
