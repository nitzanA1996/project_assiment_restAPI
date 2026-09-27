import { User } from "./user.model.js";
import { serializeUser } from "./user.serializer.js";
import type { UpdateUserInput } from "./user.schemas.js";
import { AppError } from "../shared/errors/app-error.js";

export async function listUsers() {
  const users = await User.find().sort({ createdAt: 1, _id: 1 });
  return users.map(serializeUser);
}

export async function getUser(id: string) {
  const user = await User.findById(id);
  if (!user) throw new AppError(404, "NOT_FOUND", "The requested user was not found.");
  return serializeUser(user);
}

export async function updateUser(id: string, input: UpdateUserInput) {
  try {
    const user = await User.findByIdAndUpdate(id, { $set: input }, { returnDocument: "after", runValidators: true });
    if (!user) throw new AppError(404, "NOT_FOUND", "The requested user was not found.");
    return serializeUser(user);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      throw new AppError(409, "EMAIL_IN_USE", "This email address is already registered.");
    }
    throw error;
  }
}

export async function setBusinessStatus(id: string, isBusiness: boolean) {
  const user = await User.findByIdAndUpdate(id, { $set: { isBusiness } }, { returnDocument: "after", runValidators: true });
  if (!user) throw new AppError(404, "NOT_FOUND", "The requested user was not found.");
  return serializeUser(user);
}
