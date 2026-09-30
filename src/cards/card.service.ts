import { Card } from "./card.model.js";
import type { CardInput } from "./card.schemas.js";
import { serializeCard } from "./card.serializer.js";
import { generateBizNumber, isDuplicateBizNumber } from "./biz-number.service.js";
import { AppError } from "../shared/errors/app-error.js";

export async function listCards() {
  const cards = await Card.find().sort({ createdAt: 1, _id: 1 });
  return cards.map(serializeCard);
}

export async function listMyCards(userId: string) {
  const cards = await Card.find({ user_id: userId }).sort({ createdAt: 1, _id: 1 });
  return cards.map(serializeCard);
}

export async function getCard(id: string) {
  const card = await Card.findById(id);
  if (!card) throw new AppError(404, "NOT_FOUND", "The requested card was not found.");
  return serializeCard(card);
}

export async function createCard(input: CardInput, userId: string, nextNumber = generateBizNumber) {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const card = await Card.create({ ...input, user_id: userId, bizNumber: nextNumber() });
      return serializeCard(card);
    } catch (error) {
      if (isDuplicateBizNumber(error)) continue;
      throw error;
    }
  }
  throw new AppError(503, "NUMBER_UNAVAILABLE", "Could not allocate a unique business number. Try again.");
}

export async function updateCard(id: string, input: CardInput) {
  const card = await Card.findByIdAndUpdate(id, { $set: input }, { returnDocument: "after", runValidators: true });
  if (!card) throw new AppError(404, "NOT_FOUND", "The requested card was not found.");
  return serializeCard(card);
}

export async function deleteCard(id: string) {
  const card = await Card.findByIdAndDelete(id);
  if (!card) throw new AppError(404, "NOT_FOUND", "The requested card was not found.");
  return serializeCard(card);
}

export async function changeBizNumber(id: string, bizNumber: number) {
  try {
    const card = await Card.findByIdAndUpdate(id, { $set: { bizNumber } },
      { returnDocument: "after", runValidators: true });
    if (!card) throw new AppError(404, "NOT_FOUND", "The requested card was not found.");
    return serializeCard(card);
  } catch (error) {
    if (isDuplicateBizNumber(error)) {
      throw new AppError(409, "NUMBER_IN_USE", "This business number is already assigned.");
    }
    throw error;
  }
}
