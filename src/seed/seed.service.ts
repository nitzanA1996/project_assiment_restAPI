import { Types } from "mongoose";
import { Card } from "../cards/card.model.js";
import { createCardSchema } from "../cards/card.schemas.js";
import { generateBizNumber, isDuplicateBizNumber } from "../cards/biz-number.service.js";
import { hashPassword } from "../shared/security/password.js";
import { User } from "../users/user.model.js";
import { registerUserSchema } from "../users/user.schemas.js";
import { seedAddress, seedCards, seedUsers } from "./seed-data.js";

export interface SeedPasswords {
  user: string;
  admin: string;
}

export async function seedInitialData(passwords: SeedPasswords) {
  let usersCreated = 0;
  let cardsCreated = 0;

  for (const entry of seedUsers) {
    const id = new Types.ObjectId(entry.id);
    const existing = await User.findById(id);
    if (existing) {
      if (existing.email !== entry.email || existing.isBusiness !== entry.isBusiness || existing.isAdmin !== entry.isAdmin) {
        throw new Error(`Seed user ID ${entry.id} already belongs to a different account.`);
      }
      continue;
    }
    const input = registerUserSchema.parse({
      name: { first: entry.first, last: entry.last },
      phone: entry.phone,
      email: entry.email,
      password: entry.isAdmin ? passwords.admin : passwords.user,
      isBusiness: entry.isBusiness,
      address: seedAddress,
    });
    try {
      await User.create({ _id: id, ...input, password: await hashPassword(input.password), isAdmin: entry.isAdmin });
      usersCreated++;
    } catch (error) {
      if (isDuplicateKey(error)) throw new Error(`Seed user email ${entry.email} is already in use.`);
      throw error;
    }
  }

  const businessId = new Types.ObjectId(seedUsers[1].id);
  for (const entry of seedCards) {
    const id = new Types.ObjectId(entry.id);
    const existing = await Card.findById(id);
    if (existing) {
      if (!existing.user_id.equals(businessId)) {
        throw new Error(`Seed card ID ${entry.id} already belongs to a different user.`);
      }
      continue;
    }
    const { id: _seedId, ...cardFields } = entry;
    const input = createCardSchema.parse(cardFields);
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        await Card.create({ _id: id, ...input, user_id: businessId, bizNumber: generateBizNumber() });
        cardsCreated++;
        break;
      } catch (error) {
        if (isDuplicateBizNumber(error) && attempt < 9) continue;
        throw error;
      }
    }
  }
  return { usersCreated, cardsCreated };
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}
