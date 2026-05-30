import { z } from "zod";

export const usernameParamSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required")
    .max(39, "GitHub usernames cannot exceed 39 characters")
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/, "Invalid GitHub username")
});

export const analyzeQuerySchema = z.object({
  forceRefresh: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  maxRepositories: z.coerce.number().int().min(1).max(100).optional().default(100)
});

export const listProfilesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20)
});

export type AnalyzeQuery = z.infer<typeof analyzeQuerySchema>;
export type ListProfilesQuery = z.infer<typeof listProfilesQuerySchema>;
