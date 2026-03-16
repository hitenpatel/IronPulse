import { z } from "zod";

export const exportFormatSchema = z.object({
  format: z.enum(["csv", "json"]),
});
