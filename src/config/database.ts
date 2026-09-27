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
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    let hint = "Check the URI, credentials, network and Atlas IP access list.";
    if (/bad auth|authentication failed/i.test(message)) {
      hint = "Authentication was rejected. Check the database username and password.";
    } else if (/ENOTFOUND|querySrv|queryTxt|EAI_AGAIN/i.test(message)) {
      hint = "DNS lookup failed. Check the cluster hostname and network DNS access.";
    } else if (/IP|server selection|ECONNREFUSED|ETIMEDOUT/i.test(message)) {
      hint = "The cluster could not be reached. Check network access and the Atlas IP access list.";
    }
    throw new Error(`MongoDB connection failed. ${hint}`);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
