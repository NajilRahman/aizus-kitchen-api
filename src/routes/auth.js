const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const User = require("../models/User");

function authRouter({ jwtSecret }) {
  const router = express.Router();

  // User registration
  router.post("/register", async (req, res) => {
    const Body = z.object({
      username: z.string().min(3).max(30),
      password: z.string().min(6),
      email: z.string().email().optional().or(z.literal("")),
    });

    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    const { username, password, email } = parsed.data;

    // Check if username already exists
    const existingUser = await User.findOne({ username }).lean();
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Create new user
    const user = await User.create({
      username,
      password, // Will be hashed by pre-save hook
      email: email || undefined,
      role: "user",
    });

    const token = jwt.sign(
      { sub: String(user._id), username: user.username, role: user.role, kind: "user" },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        _id: String(user._id),
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  });

  // Login (handles both regular users and admins - all are users with different roles)
  router.post("/login", async (req, res) => {
    const Body = z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    });

    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    const { username, password } = parsed.data;

    // Find user (can be regular user or admin based on role)
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { sub: String(user._id), username: user.username, role: user.role || "user", kind: "user" },
      jwtSecret,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        _id: String(user._id),
        username: user.username,
        email: user.email,
        role: user.role || "user",
      },
    });
  });

  return router;
}

module.exports = { authRouter };


