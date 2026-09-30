import { User } from "./user.model.js";
import { AppError } from "../shared/errors/app-error.js";

const MAX_FAILED_ATTEMPTS = 3;
const LOCK_DURATION_MS = 24 * 60 * 60 * 1000;

export function assertLoginNotLocked(lockUntil: Date | null | undefined, now: Date) {
  if (lockUntil && lockUntil.getTime() > now.getTime()) {
    const retryAfterSeconds = Math.ceil((lockUntil.getTime() - now.getTime()) / 1000);
    throw new AppError(429, "ACCOUNT_LOCKED", "Account temporarily locked.", undefined, retryAfterSeconds);
  }
}

export async function recordFailedLogin(userId: string, now: Date) {
  await User.updateOne({ _id: userId, lockUntil: { $lte: now } },
    { $set: { loginAttempts: 0, lockUntil: null } });

  const user = await User.findOneAndUpdate({ _id: userId, lockUntil: null }, [{
    $set: {
      loginAttempts: { $add: [{ $ifNull: ["$loginAttempts", 0] }, 1] },
      lockUntil: {
        $cond: [
          { $gte: [{ $add: [{ $ifNull: ["$loginAttempts", 0] }, 1] }, MAX_FAILED_ATTEMPTS] },
          new Date(now.getTime() + LOCK_DURATION_MS),
          null,
        ],
      },
    },
  }], { returnDocument: "after", updatePipeline: true }).select("+lockUntil");

  if (!user) {
    const current = await User.findById(userId).select("+lockUntil");
    assertLoginNotLocked(current?.lockUntil, now);
  }
  assertLoginNotLocked(user?.lockUntil, now);
}

export async function resetLoginFailures(userId: string, now: Date) {
  const user = await User.findOneAndUpdate({ _id: userId, $or: [
    { lockUntil: null }, { lockUntil: { $lte: now } },
  ] }, { $set: { loginAttempts: 0, lockUntil: null } }, { returnDocument: "after" });
  if (!user) {
    const current = await User.findById(userId).select("+lockUntil");
    assertLoginNotLocked(current?.lockUntil, now);
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }
  return user;
}
