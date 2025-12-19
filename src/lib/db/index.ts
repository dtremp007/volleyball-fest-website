import { createServerOnlyFn } from "@tanstack/react-start";
import { env } from "~/env/server";
import * as schema from "~/lib/db/schema";

const getDatabase = createServerOnlyFn(async () => {
  if (process.env.NODE_ENV === "production") {
    const { drizzle } = await import("drizzle-orm/libsql/web");
    const { createClient } = await import("@libsql/client/web");

    const client = createClient({
      url: env.DATABASE_URL,
      authToken: env.DATABASE_AUTH_TOKEN,
    });

    return drizzle({ client, schema, casing: "snake_case" });
  }

  if (process.env.NODE_ENV === "development") {
    const { drizzle } = await import("drizzle-orm/libsql");
    const { createClient } = await import("@libsql/client");

    const client = createClient({
      url: env.DATABASE_URL,
      authToken: env.DATABASE_AUTH_TOKEN,
    });

    return drizzle({ client, schema, casing: "snake_case" });
  }

  throw new Error("Invalid environment");
});

export const db = await getDatabase();

export type Database = Awaited<ReturnType<typeof getDatabase>>;
