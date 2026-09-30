import { env } from "../config/env.js";
import { User } from "../users/user.model.js";
import { Card } from "../cards/card.model.js";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { resolveSeedPasswords } from "./seed-passwords.js";
import { seedInitialData } from "./seed.service.js";

let stage = "configuration";

async function main() {
  const passwords = resolveSeedPasswords(env.NODE_ENV, {
    user: process.env.SEED_PASSWORD,
    admin: process.env.SEED_ADMIN_PASSWORD,
  });

  let completed = false;
  try {
    stage = "database connection";
    await connectDatabase(env);
    stage = "model initialization";
    await User.init();
    await Card.init();
    stage = "writing initial data";
    const result = await seedInitialData(passwords);
    console.info(`Seed complete: ${result.usersCreated} users and ${result.cardsCreated} cards created.`);
    completed = true;
  } finally {
    if (completed) stage = "database shutdown";
    await disconnectDatabase();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (message.startsWith("Set valid SEED_") || message.startsWith("Seed ")) {
    console.error(message);
  } else {
    const kind = error instanceof Error ? error.name : typeof error;
    console.error(`Seed failed during ${stage} (${kind}). Check database access and existing demo records.`);
  }
  process.exitCode = 1;
});
