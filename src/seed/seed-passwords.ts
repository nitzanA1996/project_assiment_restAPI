import { passwordSchema } from "../shared/schemas/common.schema.js";
import type { SeedPasswords } from "./seed.service.js";

export const DEVELOPMENT_SEED_PASSWORDS: SeedPasswords = {
  user: "DemoUser123!",
  admin: "DemoAdmin123!",
};

export function resolveSeedPasswords(
  nodeEnv: "development" | "test" | "production",
  supplied: { user: string | undefined; admin: string | undefined },
): SeedPasswords {
  const useDefaults = nodeEnv === "development" && !supplied.user && !supplied.admin;
  const user = passwordSchema.safeParse(useDefaults ? DEVELOPMENT_SEED_PASSWORDS.user : supplied.user);
  const admin = passwordSchema.safeParse(useDefaults ? DEVELOPMENT_SEED_PASSWORDS.admin : supplied.admin);
  if (!user.success || !admin.success) {
    throw new Error("Set valid SEED_PASSWORD and SEED_ADMIN_PASSWORD values in your local .env.");
  }
  return { user: user.data, admin: admin.data };
}
