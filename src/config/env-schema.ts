import { z } from "zod";

const mongoUri = z.string().trim().refine((value) =>
  /^mongodb(?:\+srv)?:\/\/[^\s]+$/.test(value) &&
  !/mailto:|\]\(|[<>]/.test(value), "Expected a MongoDB connection URI");

const origins = z.string().default("http://localhost:5173")
  .transform((value) => value.split(",").map((origin) => origin.trim()).filter(Boolean))
  .pipe(z.array(z.string().refine((origin) => {
    try {
      const url = new URL(origin);
      return ["http:", "https:"].includes(url.protocol) && url.origin === origin;
    } catch {
      return false;
    }
  }, "Expected an HTTP origin without a path")));

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.string().regex(/^\d+$/).transform(Number)
    .pipe(z.number().int().min(1).max(65535)).default(3000),
  DB_TARGET: z.enum(["local", "atlas"]).default("atlas"),
  MONGODB_LOCAL_URI: z.string().optional(),
  MONGODB_ATLAS_URI: z.string().optional(),
  MONGODB_DB_NAME: z.string().regex(/^[A-Za-z0-9_-]+$/).default("business_cards"),
  CORS_ORIGINS: origins,
}).superRefine((value, context) => {
  const key = value.DB_TARGET === "atlas" ? "MONGODB_ATLAS_URI" : "MONGODB_LOCAL_URI";
  if (!mongoUri.safeParse(value[key]).success) {
    context.addIssue({ code: "custom", path: [key], message: "A valid database URI is required" });
  }
});

export type Environment = z.infer<typeof envSchema>;

export function parseEnvironment(input: unknown): Environment {
  const result = envSchema.safeParse(input);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(`Invalid environment configuration: ${fields.join(", ")}`);
  }
  return result.data;
}
