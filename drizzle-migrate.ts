import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from './src/db/schema.js';

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});

const db = drizzle(pool, { schema });

async function run() {
  console.log("Pushing schema to DB...");
  // Actually we can't easily run drizzle-kit push programmaticly.
  // We can just run `npx drizzle-kit push` in a shell script!
}

run();
