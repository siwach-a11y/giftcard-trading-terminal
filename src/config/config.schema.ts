import { z } from "zod";

export const ScoringWeightsSchema = z.object({
  price: z.number().min(0).max(1),
  availability: z.number().min(0).max(1),
  speed: z.number().min(0).max(1),
  reliability: z.number().min(0).max(1),
  risk: z.number().min(0).max(1),
});

export const AppConfigSchema = z.object({
  weights: ScoringWeightsSchema,
  scoring: z.object({
    maxSearchTimeMs: z.number().positive(),
    defaultRisk: z.number().min(0).max(1),
  }),
  browser: z.object({
    headless: z.boolean(),
    timeout: z.number().positive(),
    retries: z.number().int().min(0),
    screenshotOnError: z.boolean(),
    screenshotDir: z.string(),
  }),
  execution: z.object({
    maxDurationMs: z.number().positive(),
    manualAuthTimeoutMs: z.number().positive(),
  }),
  database: z.object({
    provider: z.literal("sqlite"),
    url: z.string(),
  }),
  logging: z.object({
    level: z.enum(["debug", "info", "warn", "error"]),
    destination: z.string(),
  }),
});

export type ScoringWeights = z.infer<typeof ScoringWeightsSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
