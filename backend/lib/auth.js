import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// In a real deployment this MUST come from an environment variable and be
// a long random secret. For local dev/demo purposes only, we fall back to
// a default so the app runs without extra setup.
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-me";

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/** Express middleware: requires a valid "Authorization: Bearer <token>" header. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = token && verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  req.user = { id: payload.sub, email: payload.email };
  next();
}
