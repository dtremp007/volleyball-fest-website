import type { Config } from "drizzle-kit";
import { env } from "~/env/server";

export default {
  out: "./drizzle",
  schema: "./src/lib/db/schema/index.ts",
  breakpoints: true,
  verbose: true,
  strict: true,
  dialect: "turso",
  casing: "snake_case",
  dbCredentials: {
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  },
} satisfies Config;
