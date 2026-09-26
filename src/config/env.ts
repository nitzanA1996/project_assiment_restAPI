import dotenv from "dotenv";
import { parseEnvironment } from "./env-schema.js";

dotenv.config({ quiet: true });

export const env = parseEnvironment(process.env);
