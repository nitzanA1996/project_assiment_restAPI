import bcrypt from "bcryptjs";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Reject overlong input instead of accepting bcrypt's truncated equivalent.
  if (Buffer.byteLength(password, "utf8") > 72) return false;
  return bcrypt.compare(password, hash);
}
