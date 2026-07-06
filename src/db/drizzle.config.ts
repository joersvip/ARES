import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    host: process.env.SQL_HOST!,
    user: process.env.SQL_USER!,
    password: process.env.SQL_PASSWORD!,
    database: process.env.SQL_DB_NAME!,
  }
});
