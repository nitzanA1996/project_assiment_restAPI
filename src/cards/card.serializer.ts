import type { HydratedDocument, InferSchemaType } from "mongoose";
import type { Card } from "./card.model.js";

export type CardDocument = HydratedDocument<InferSchemaType<typeof Card.schema>>;

export function serializeCard(card: CardDocument) {
  return {
    _id: card._id.toString(),
    title: card.title,
    subtitle: card.subtitle,
    description: card.description,
    phone: card.phone,
    email: card.email,
    web: card.web,
    image: card.image,
    address: card.address,
    bizNumber: card.bizNumber,
    likes: card.likes.map((id) => id.toString()),
    user_id: card.user_id.toString(),
    createdAt: card.createdAt,
  };
}
