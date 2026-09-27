import { z } from "zod";

export const textSchema = (min: number, max: number) => z.string().trim().min(min).max(max);
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email());
export const phoneSchema = z.string().trim().transform((value) => value.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^(?:05\d{8}|0[23489]\d{7}|07\d{8})$/, "Invalid Israeli phone number"));
export const httpUrlSchema = z.url({ protocol: /^https?$/ });
export const optionalUrlSchema = z.union([z.literal(""), httpUrlSchema]).default("");
export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid object ID");
export const idParamsSchema = z.strictObject({ id: objectIdSchema });
export const bizNumberSchema = z.number().int().min(1000000).max(9999999);

export const integerInputSchema = z.union([
  z.number(), z.string().regex(/^\d+$/).transform(Number),
]).pipe(z.number().int().min(0).max(Number.MAX_SAFE_INTEGER));

export const passwordSchema = z.string().min(8)
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a digit")
  .regex(/[^A-Za-z0-9\s]/, "Include a special character")
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Password exceeds 72 bytes");
