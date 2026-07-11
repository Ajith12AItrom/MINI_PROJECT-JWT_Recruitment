import { Router } from "express";
import { db } from "../db.js";
import { hashPassword, verifyPassword, signToken, requireAuth } from "../lib/auth.js";

const router = Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// POST /api/auth/signup  { email, password }
router.post("/signup", async (req, res) => {
  const { email, password } = req.body || {};

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }

  const passwordHash = await hashPassword(password);
  const result = db
    .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
    .run(email, passwordHash);

  const user = { id: result.lastInsertRowid, email };
  res.status(201).json({ token: signToken(user), user });
});

// POST /api/auth/login  { email, password }
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  const row = db.prepare("SELECT id, email, password_hash FROM users WHERE email = ?").get(email);
  if (!row) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const valid = await verifyPassword(password || "", row.password_hash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const user = { id: row.id, email: row.email };
  res.json({ token: signToken(user), user });
});

// GET /api/auth/me — returns the current user based on the bearer token
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
