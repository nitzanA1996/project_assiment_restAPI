import { User } from "./user.model.js";
import type { LoginInput, RegisterUserInput } from "./user.schemas.js";
import { serializeUser } from "./user.serializer.js";
import { hashPassword, verifyPassword } from "../shared/security/password.js";
import { issueToken } from "../shared/security/token.js";
import type { TokenConfig } from "../shared/security/token.js";
import { AppError } from "../shared/errors/app-error.js";

export async function registerUser(input: RegisterUserInput) {
  const password = await hashPassword(input.password);
  try {
    const user = await User.create({ ...input, password, isAdmin: false });
    return serializeUser(user);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      throw new AppError(409, "EMAIL_IN_USE", "This email address is already registered.");
    }
    throw error;
  }
}

export async function loginUser(input: LoginInput, config: TokenConfig) {
  const user = await User.findOne({ email: input.email }).select("+password");
  if (!user || !await verifyPassword(input.password, user.password)) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }
  return { token: issueToken({
    _id: user._id.toString(), isBusiness: user.isBusiness, isAdmin: user.isAdmin,
  }, config) };
}
