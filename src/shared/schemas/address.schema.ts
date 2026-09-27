import { z } from "zod";
import { integerInputSchema, textSchema } from "./common.schema.js";

export const addressSchema = z.strictObject({
  state: textSchema(0, 256).default("").transform((value) => value || "not defined"),
  country: textSchema(2, 256),
  city: textSchema(2, 256),
  street: textSchema(2, 256),
  houseNumber: integerInputSchema.pipe(z.number().positive()),
  zip: integerInputSchema.default(0),
});
