import Pool from "pg-pool";
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: "localhost",
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

pool.on("connect", () => {
  console.log("Connected to the database");
});

export default pool;
