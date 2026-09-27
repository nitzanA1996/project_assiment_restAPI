import { z } from "zod";
import { addressSchema } from "../shared/schemas/address.schema.js";
import { userImageSchema } from "../shared/schemas/image.schema.js";
import { emailSchema, passwordSchema, phoneSchema, textSchema } from "../shared/schemas/common.schema.js";

export const nameSchema = z.strictObject({
  first: textSchema(2, 100),
  middle: textSchema(0, 100).default(""),
  last: textSchema(2, 100),
});

const profileFields = {
  name: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
  image: userImageSchema,
  address: addressSchema,
};

export const registerUserSchema = z.strictObject({
  ...profileFields,
  password: passwordSchema,
  isBusiness: z.boolean().default(false),
});
export const updateUserSchema = z.strictObject(profileFields);
export const loginSchema = z.strictObject({ email: emailSchema, password: z.string().min(1) });
export const businessStatusSchema = z.strictObject({ isBusiness: z.boolean() });

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
