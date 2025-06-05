import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../utils/db.js";
import dotenv from "dotenv";
import generateUniqueId from "generate-unique-id";
import bcrypt from "bcrypt";
import authenticateToken from "../middleware/auth.js"; // Note the filename fix
import { SignJWT } from "jose";

dotenv.config();

const router = express.Router();

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || "your_jwt_secret_key";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const encoder = new TextEncoder();
const secret = encoder.encode(JWT_SECRET_KEY);

// Public route - admin login
router.post("/adminlogin", async (req, res) => {
  const { username, password } = req.body;
  const sql = "SELECT * FROM users WHERE username=$1;";

  try {
    const result = await pool.query(sql, [username]);

    if (result.rowCount > 0) {
      const user = result.rows[0];

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (passwordMatch) {
        const payload = {
          userId: user.user_id,
          username: user.username,
        };
        // console.log(secret);
        const token = await new SignJWT(payload)
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("1d")
          .sign(secret);

        return res.json({ loginStatus: true, token });
      }
      return res.json({ loginStatus: false, Error: "Incorrect password!" });
    }
    return res.json({ loginStatus: false, Error: "User not found!" });
  } catch (err) {
    console.error("Query Error:", err);
    return res.status(500).json({ loginStatus: false, Error: "Query Error" });
  }
});

// Protected route - add user
router.post("/add_user", authenticateToken, async (req, res) => {
  const { username, password } = req.body;
  const user_id = generateUniqueId();

  if (!username || !password) {
    return res
      .status(400)
      .json({ Status: false, Error: "Username and password required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql =
      "INSERT INTO users (user_id, username, password) VALUES ($1, $2, $3)";
    await pool.query(sql, [user_id, username, hashedPassword]);
    return res.json({ Status: true });
  } catch (err) {
    console.error("Query Error:", err);
    return res.status(500).json({ Status: false, Error: "Query Error" });
  }
});

// Protected route - update user
router.put("/edit_user/:user_id", authenticateToken, async (req, res) => {
  const { user_id } = req.params;
  const { username, password } = req.body;

  let sql = "UPDATE users SET";
  const values = [];
  const setStatements = [];

  if (username) {
    setStatements.push(`username = $${values.length + 1}`);
    values.push(username);
  }

  if (password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    setStatements.push(`password = $${values.length + 1}`);
    values.push(hashedPassword);
  }

  if (setStatements.length === 0) {
    return res
      .status(400)
      .json({ Status: false, Error: "No updates provided" });
  }

  sql += ` ${setStatements.join(", ")} WHERE user_id = $${values.length + 1}`;
  values.push(user_id);

  try {
    const result = await pool.query(sql, values);
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ Status: false, Error: "User not found or no changes made" });
    }
    return res.json({ Status: true, Result: "Update successful" });
  } catch (err) {
    console.error("Query Error:", err);
    return res.status(500).json({ Status: false, Error: "Query Error" });
  }
});

// Protected route - delete user
router.delete("/delete_user/:user_id", authenticateToken, async (req, res) => {
  const { user_id } = req.params;
  const sql = "DELETE FROM users WHERE user_id = $1";

  try {
    const result = await pool.query(sql, [user_id]);
    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ Status: false, Error: "User not found or already deleted" });
    }
    return res.json({ Status: true, Result: "User deleted successfully" });
  } catch (err) {
    console.error("Query Error:", err);
    return res.status(500).json({ Status: false, Error: "Query Error" });
  }
});

// Protected route - get all users (excluding passwords)
router.get("/users", authenticateToken, async (req, res) => {
  const sql = "SELECT user_id, username FROM users";

  try {
    const result = await pool.query(sql);
    return res.json({ Status: true, Users: result.rows });
  } catch (err) {
    console.error("Query Error:", err);
    return res.status(500).json({ Status: false, Error: "Query Error" });
  }
});

// Protected route - get current user's profile
router.get("/profile", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await pool.query(
      "SELECT user_id, username FROM users WHERE user_id = $1",
      [userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ Status: false, Error: "User not found" });
    }
    return res.json({ Status: true, User: result.rows[0] });
  } catch (err) {
    console.error("Query Error:", err);
    return res.status(500).json({ Status: false, Error: "Query Error" });
  }
});

router.post("/change-password", authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ Status: false, Error: "Missing fields" });
  }

  try {
    const userResult = await pool.query(
      "SELECT password FROM users WHERE user_id = $1",
      [userId]
    );

    if (userResult.rowCount === 0) {
      return res.status(404).json({ Status: false, Error: "User not found" });
    }

    const storedHash = userResult.rows[0].password;

    const passwordMatch = await bcrypt.compare(currentPassword, storedHash);
    if (!passwordMatch) {
      return res
        .status(401)
        .json({ Status: false, Error: "Incorrect password" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE users SET password = $1 WHERE user_id = $2", [
      hashedNewPassword,
      userId,
    ]);

    res.json({ Status: true, Message: "Password updated successfully" });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ Status: false, Error: "Server error" });
  }
});

export { router as adminRouter };
