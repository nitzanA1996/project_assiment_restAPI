import mongoose from "mongoose";
import { User } from "./user.model.js";
import { Card } from "../cards/card.model.js";
import { serializeUser } from "./user.serializer.js";
import { AppError } from "../shared/errors/app-error.js";

export async function deleteUser(id: string) {
  return mongoose.connection.transaction(async (session) => {
    const user = await User.findByIdAndDelete(id, { session });
    if (!user) throw new AppError(404, "NOT_FOUND", "The requested user was not found.");
    await Card.deleteMany({ user_id: user._id }, { session });
    await Card.updateMany({ likes: user._id }, { $pull: { likes: user._id } }, { session });
    return serializeUser(user);
  });
}
