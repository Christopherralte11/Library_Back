import { jwtVerify } from "jose";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET_KEY;
if (!JWT_SECRET) {
  console.error("JWT_SECRET_KEY is not defined in environment variables!");
  process.exit(1);
}

const encoder = new TextEncoder();
const secret = encoder.encode(JWT_SECRET);

async function verifyToken(token) {
  const { payload } = await jwtVerify(token, secret);
  // console.log(payload);
  return payload;
}

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    let token;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.headers["x-access-token"]) {
      token = req.headers["x-access-token"];
    }

    if (!token) {
      return res
        .status(401)
        .json({ Status: false, Error: "Access token is required" });
    }

    const decoded = await verifyToken(token);
    req.user = decoded;
    // console.log(decoded);
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res
      .status(403)
      .json({ Status: false, Error: "Invalid or expired token" });
  }
};

export default authenticateToken;
