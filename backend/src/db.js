require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Pool, types } = require("pg");

types.setTypeParser(20, (value) => Number(value));
types.setTypeParser(1700, (value) => Number(value));

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure backend/.env for PostgreSQL runtime.");
}

const pool = new Pool({ connectionString });
const schemaPath = path.join(__dirname, "..", "sql", "postgres_schema.sql");

let initPromise;

async function initDatabase() {
  if (!initPromise) {
    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    initPromise = pool.query(schemaSql);
  }
  await initPromise;
}

async function query(text, params = [], client = pool) {
  return client.query(text, params);
}

async function getOne(text, params = [], client = pool) {
  const result = await query(text, params, client);
  return result.rows[0] || null;
}

async function getMany(text, params = [], client = pool) {
  const result = await query(text, params, client);
  return result.rows;
}

async function withTransaction(work) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  initDatabase,
  query,
  getOne,
  getMany,
  withTransaction,
  closePool,
};
