import { randomInt } from "node:crypto";

export function generateBizNumber(): number {
  return randomInt(1000000, 10000000);
}

export function isDuplicateBizNumber(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error) || error.code !== 11000) return false;
  if (!("keyPattern" in error) || typeof error.keyPattern !== "object" || error.keyPattern === null) return false;
  return "bizNumber" in error.keyPattern;
}