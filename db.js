// db.js
import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "mcq_system",
  password: "Ans14",
  port: 5432,
});

export default pool;
