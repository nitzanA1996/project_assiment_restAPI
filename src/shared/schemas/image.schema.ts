import { z } from "zod";
import { optionalUrlSchema, textSchema } from "./common.schema.js";

export const DEFAULT_USER_IMAGE = "https://placehold.co/400x400/png?text=User";
export const DEFAULT_CARD_IMAGE = "https://placehold.co/600x400/png?text=Business";

function createImageSchema(defaultUrl: string, defaultAlt: string) {
  return z.strictObject({
    url: optionalUrlSchema.transform((value) => value || defaultUrl),
    alt: textSchema(0, 256).default("").transform((value) => value || defaultAlt),
  }).prefault({});
}

export const userImageSchema = createImageSchema(DEFAULT_USER_IMAGE, "User profile image");
export const cardImageSchema = createImageSchema(DEFAULT_CARD_IMAGE, "Business card image");
