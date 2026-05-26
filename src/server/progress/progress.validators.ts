import { z } from "zod";

export const progressActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("check") }),
  z.object({
    action: z.literal("update-target"),
    targetCount: z.number().int().min(1).max(365),
  }),
]);

export type ProgressActionInput = z.infer<typeof progressActionSchema>;
