
import { z } from "zod";

export const IncidentSchema = z.object({
  org_id: z.string().uuid(),
  project_id: z.string().uuid().nullish(),
  title: z.string().min(2, "Title is required"),
  description: z.string().optional(),
  severity: z.enum(["low", "medium", "high"]).default("low"),
  photo_path: z.string().optional(),
});

export type IncidentInput = z.infer<typeof IncidentSchema>;

export const MaterialRequestSchema = z.object({
  org_id: z.string().uuid(),
  project_id: z.string().uuid().nullish(),
  item_name: z.string().min(2, "Item name is required"),
  qty: z.coerce.number().positive().optional(),
  unit: z.string().optional(),
  note: z.string().optional(),
  photo_path: z.string().optional(),
});

export type MaterialRequestInput = z.infer<typeof MaterialRequestSchema>;
