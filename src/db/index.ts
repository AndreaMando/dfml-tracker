import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("POSTGRES_URL or DATABASE_URL is required");
}

const client = postgres(connectionString, { ssl: "require" });
export const db = drizzle(client);
