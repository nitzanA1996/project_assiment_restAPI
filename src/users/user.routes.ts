import { Router } from "express";
import { validate } from "../middleware/validate.js";
import { authenticate } from "../middleware/authenticate.js";
import { idParamsSchema } from "../shared/schemas/common.schema.js";
import { authorize } from "../middleware/authorize.js";
import type { TokenConfig } from "../shared/security/token.js";
import { businessStatusSchema, loginSchema, registerUserSchema, updateUserSchema } from "./user.schemas.js";
import { loginUser, registerUser } from "./auth.service.js";
import { getUser, listUsers, setBusinessStatus, updateUser } from "./user.service.js";
import { deleteUser } from "./user-delete.service.js";

export function createUserRouter(config: TokenConfig) {
  const router = Router();
  router.post("/", validate(registerUserSchema), async (_request, response) => {
    const user = await registerUser(response.locals.validated.body);
    response.status(201).json(user);
  });
  router.post("/login", validate(loginSchema), async (_request, response) => {
    response.json(await loginUser(response.locals.validated.body, config));
  });
  router.use(authenticate(config));
  const validateId = validate(idParamsSchema, "params");
  router.get("/", authorize("admin"), async (_request, response) => {
    response.json(await listUsers());
  });
  router.get("/:id", validateId, authorize("self-or-admin"), async (_request, response) => {
    response.json(await getUser(response.locals.validated.params.id));
  });
  router.put("/:id", validateId, authorize("self"), validate(updateUserSchema), async (_request, response) => {
    response.json(await updateUser(response.locals.validated.params.id, response.locals.validated.body));
  });
  router.patch("/:id", validateId, authorize("self"), validate(businessStatusSchema), async (_request, response) => {
    response.json(await setBusinessStatus(response.locals.validated.params.id, response.locals.validated.body.isBusiness));
  });
  router.delete("/:id", validateId, authorize("self-or-admin"), async (_request, response) => {
    response.json(await deleteUser(response.locals.validated.params.id));
  });
  return router;
}
