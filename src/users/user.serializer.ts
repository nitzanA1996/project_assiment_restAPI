import type { HydratedDocument, InferSchemaType } from "mongoose";
import type { User } from "./user.model.js";

export type UserDocument = HydratedDocument<InferSchemaType<typeof User.schema>>;

export function serializeUser(user: UserDocument) {
  return {
    _id: user._id.toString(),
    name: user.name,
    phone: user.phone,
    email: user.email,
    image: user.image,
    address: user.address,
    isBusiness: user.isBusiness,
    isAdmin: user.isAdmin,
    createdAt: user.createdAt,
  };
}
