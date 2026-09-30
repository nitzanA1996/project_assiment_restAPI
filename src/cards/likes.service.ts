import { Types } from "mongoose";
import { Card } from "./card.model.js";
import { serializeCard } from "./card.serializer.js";
import { AppError } from "../shared/errors/app-error.js";

export async function toggleLike(cardId: string, userId: string) {
  const liker = new Types.ObjectId(userId);
  const card = await Card.findOneAndUpdate({ _id: cardId }, [{
    $set: {
      likes: {
        $cond: [
          { $in: [liker, "$likes"] },
          { $filter: { input: "$likes", as: "like", cond: { $ne: ["$$like", liker] } } },
          { $concatArrays: ["$likes", [liker]] },
        ],
      },
    },
  }], { returnDocument: "after", updatePipeline: true });
  if (!card) throw new AppError(404, "NOT_FOUND", "The requested card was not found.");
  return serializeCard(card);
}
