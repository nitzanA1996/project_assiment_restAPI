import { z } from "zod";
import { addressSchema } from "../shared/schemas/address.schema.js";
import { cardImageSchema } from "../shared/schemas/image.schema.js";
import { bizNumberSchema, emailSchema, optionalUrlSchema, phoneSchema, textSchema } from "../shared/schemas/common.schema.js";

const cardFields = {
  title: textSchema(2, 256),
  subtitle: textSchema(2, 256),
  description: textSchema(2, 1024),
  phone: phoneSchema,
  email: emailSchema,
  web: optionalUrlSchema,
  image: cardImageSchema,
  address: addressSchema,
};

export const createCardSchema = z.strictObject(cardFields);
export const updateCardSchema = z.strictObject(cardFields);
export const updateBizNumberSchema = z.strictObject({ bizNumber: bizNumberSchema });
export type CardInput = z.infer<typeof createCardSchema>;
