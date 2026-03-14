require("dotenv").config();

const { Client } = require("pg");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  const dbRes = await client.query("SELECT current_database() AS db, version() AS version");
  const tablesRes = await client.query(
    "SELECT COUNT(*)::int AS table_count FROM information_schema.tables WHERE table_schema='public'"
  );

  const tableCount = tablesRes.rows[0].table_count;
  if (tableCount < 10) {
    console.error(`PostgreSQL connected but schema looks incomplete (table_count=${tableCount}). Run backend/sql/postgres_schema.sql`);
    await client.end();
    process.exit(1);
  }

  console.log("PostgreSQL readiness check passed");
  console.log(`Database: ${dbRes.rows[0].db}`);
  console.log(`Tables: ${tableCount}`);
  await client.end();
}

main().catch((err) => {
  console.error("PostgreSQL readiness check failed:", err.message);
  process.exit(1);
});
