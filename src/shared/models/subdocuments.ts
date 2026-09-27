import { Schema } from "mongoose";
import { httpUrlSchema } from "../schemas/common.schema.js";

const requiredText = () => ({ type: String, required: true, trim: true, minlength: 2, maxlength: 256 });
const integer = (minimum: number) => ({
  type: Number, min: minimum, max: Number.MAX_SAFE_INTEGER,
  validate: { validator: Number.isSafeInteger, message: "Expected an integer" },
});

export const addressModelSchema = new Schema({
  state: { type: String, trim: true, maxlength: 256, default: "not defined" },
  country: requiredText(), city: requiredText(), street: requiredText(),
  houseNumber: { ...integer(1), required: true },
  zip: { ...integer(0), default: 0 },
}, { _id: false, strict: "throw" });

export function imageModelSchema(defaultUrl: string, defaultAlt: string) {
  return new Schema({
    url: {
      type: String, default: defaultUrl, required: true,
      validate: { validator: (value: string) => httpUrlSchema.safeParse(value).success, message: "Invalid image URL" },
    },
    alt: { type: String, maxlength: 256, default: defaultAlt },
  }, { _id: false, strict: "throw" });
}
