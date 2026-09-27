import { Schema, model } from "mongoose";
import { addressModelSchema, imageModelSchema } from "../shared/models/subdocuments.js";
import { DEFAULT_CARD_IMAGE } from "../shared/schemas/image.schema.js";
import { emailSchema, optionalUrlSchema, phoneSchema } from "../shared/schemas/common.schema.js";

const cardSchema = new Schema({
  title: { type: String, required: true, trim: true, minlength: 2, maxlength: 256 },
  subtitle: { type: String, required: true, trim: true, minlength: 2, maxlength: 256 },
  description: { type: String, required: true, trim: true, minlength: 2, maxlength: 1024 },
  phone: {
    type: String, required: true,
    validate: { validator: (value: string) => phoneSchema.safeParse(value).success, message: "Invalid phone number" },
  },
  email: {
    type: String, required: true, lowercase: true, trim: true,
    validate: { validator: (value: string) => emailSchema.safeParse(value).success, message: "Invalid email" },
  },
  web: {
    type: String, default: "",
    validate: { validator: (value: string) => optionalUrlSchema.safeParse(value).success, message: "Invalid website URL" },
  },
  image: { type: imageModelSchema(DEFAULT_CARD_IMAGE, "Business card image"), default: () => ({}) },
  address: { type: addressModelSchema, required: true },
  bizNumber: { type: Number, required: true, min: 1000000, max: 9999999, validate: Number.isInteger },
  likes: {
    type: [{ type: Schema.Types.ObjectId, ref: "User" }], default: [],
    validate: {
      validator: (values: unknown[]) => new Set(values.map(String)).size === values.length,
      message: "Duplicate likes are not allowed",
    },
  },
  user_id: { type: Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
}, { strict: "throw", timestamps: { createdAt: true, updatedAt: false } });

cardSchema.index({ bizNumber: 1 }, { unique: true });
cardSchema.index({ user_id: 1 });
export const Card = model("Card", cardSchema);
