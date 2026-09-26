import mongoose from "mongoose";
import type { Environment } from "./env-schema.js";

mongoose.set("bufferCommands", false);

mongoose.connection.on("error", () => {
  console.error("MongoDB connection error. Check database availability and access settings.");
});

export async function connectDatabase(env: Environment): Promise<void> {
  const uri = env.DB_TARGET === "atlas" ? env.MONGODB_ATLAS_URI : env.MONGODB_LOCAL_URI;
  if (!uri) throw new Error("The selected database URI is missing.");

  try {
    await mongoose.connect(uri, { dbName: env.MONGODB_DB_NAME, serverSelectionTimeoutMS: 10000 });
  } catch {
    throw new Error("MongoDB connection failed. Check the URI, credentials, network and Atlas IP access list.");
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
