import { Schema, model } from "mongoose";
import { addressModelSchema, imageModelSchema } from "../shared/models/subdocuments.js";
import { DEFAULT_USER_IMAGE } from "../shared/schemas/image.schema.js";
import { emailSchema, phoneSchema } from "../shared/schemas/common.schema.js";

function removePrivateFields(_document: unknown, result: Record<string, unknown>) {
  for (const key of ["password", "loginAttempts", "lockUntil", "__v"]) delete result[key];
  return result;
}

const nameModelSchema = new Schema({
  first: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  middle: { type: String, trim: true, maxlength: 100, default: "" },
  last: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
}, { _id: false, strict: "throw" });

const userSchema = new Schema({
  name: { type: nameModelSchema, required: true },
  phone: {
    type: String, required: true,
    validate: { validator: (value: string) => phoneSchema.safeParse(value).success, message: "Invalid phone number" },
  },
  email: {
    type: String, required: true, trim: true, lowercase: true,
    validate: { validator: (value: string) => emailSchema.safeParse(value).success, message: "Invalid email" },
  },
  password: {
    type: String, required: true, select: false,
    match: /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/,
  },
  image: { type: imageModelSchema(DEFAULT_USER_IMAGE, "User profile image"), default: () => ({}) },
  address: { type: addressModelSchema, required: true },
  isBusiness: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  loginAttempts: { type: Number, default: 0, min: 0, select: false, validate: Number.isInteger },
  lockUntil: { type: Date, default: null, select: false },
}, {
  strict: "throw",
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { transform: removePrivateFields },
  toObject: { transform: removePrivateFields },
});

userSchema.index({ email: 1 }, { unique: true });
export const User = model("User", userSchema);
