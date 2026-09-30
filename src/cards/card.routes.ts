import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeCardOwner, requireBusiness } from "../middleware/authorize-card.js";
import { validate } from "../middleware/validate.js";
import { authorize } from "../middleware/authorize.js";
import { idParamsSchema } from "../shared/schemas/common.schema.js";
import type { TokenConfig } from "../shared/security/token.js";
import type { UserDocument } from "../users/user.serializer.js";
import { createCardSchema, updateBizNumberSchema, updateCardSchema } from "./card.schemas.js";
import { changeBizNumber, createCard, deleteCard, getCard, listCards, listMyCards, updateCard } from "./card.service.js";
import { toggleLike } from "./likes.service.js";

export function createCardRouter(config: TokenConfig) {
  const router = Router();
  const validateId = validate(idParamsSchema, "params");
  const auth = authenticate(config);

  router.get("/", async (_request, response) => response.json(await listCards()));
  router.get("/my-cards", auth, async (_request, response) => {
    const user = response.locals.user as UserDocument;
    response.json(await listMyCards(user._id.toString()));
  });
  router.get("/:id", validateId, async (_request, response) => {
    response.json(await getCard(response.locals.validated.params.id));
  });
  router.post("/", auth, requireBusiness, validate(createCardSchema), async (_request, response) => {
    const user = response.locals.user as UserDocument;
    const card = await createCard(response.locals.validated.body, user._id.toString());
    response.status(201).json(card);
  });
  router.put("/:id", auth, validateId, authorizeCardOwner(false), validate(updateCardSchema), async (_request, response) => {
    response.json(await updateCard(response.locals.validated.params.id, response.locals.validated.body));
  });
  router.patch("/:id/biz-number", auth, validateId, authorize("admin"), validate(updateBizNumberSchema), async (_request, response) => {
    response.json(await changeBizNumber(response.locals.validated.params.id,
      response.locals.validated.body.bizNumber));
  });
  router.patch("/:id", auth, validateId, async (_request, response) => {
    const user = response.locals.user as UserDocument;
    response.json(await toggleLike(response.locals.validated.params.id, user._id.toString()));
  });
  router.delete("/:id", auth, validateId, authorizeCardOwner(true), async (_request, response) => {
    response.json(await deleteCard(response.locals.validated.params.id));
  });
  return router;
}
