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
      phone: z.string().optional().or(z.literal("")),
    });

    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    const { username, password, email, phone } = parsed.data;

    // Check if username already exists
    const existingUser = await User.findOne({ username }).lean();
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingEmail = await User.findOne({ email }).lean();
      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }
    }

    // Check if phone already exists (if provided)
    if (phone) {
      const existingPhone = await User.findOne({ phone }).lean();
      if (existingPhone) {
        return res.status(400).json({ error: "Phone number already registered" });
      }
    }

    // Create new user
    const user = await User.create({
      username,
      password, // Will be hashed by pre-save hook
      email: email || undefined,
      phone: phone || undefined,
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
        phone: user.phone,
        role: user.role,
      },
    });
  });

  // Login (handles both regular users and admins - all are users with different roles)
  // Supports login with username, email, or phone number
  router.post("/login", async (req, res) => {
    const Body = z.object({
      username: z.string().min(1), // Can be username, email, or phone
      password: z.string().min(1),
    });

    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    const { username, password } = parsed.data;

    // Normalize input - remove spaces and check if it's email or phone
    const normalizedInput = username.trim().toLowerCase();
    const isEmail = normalizedInput.includes("@");
    const isPhone = /^[\d+\-\s()]+$/.test(normalizedInput.replace(/\s/g, ""));

    // Find user by username, email, or phone
    let user;
    if (isEmail) {
      user = await User.findOne({ email: normalizedInput });
    } else if (isPhone) {
      // Normalize phone number (remove spaces, dashes, parentheses)
      const normalizedPhone = normalizedInput.replace(/[\s\-()]/g, "");
      user = await User.findOne({ phone: normalizedPhone });
    } else {
      // Try as username
      user = await User.findOne({ username: normalizedInput });
    }

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
        phone: user.phone,
        role: user.role || "user",
      },
    });
  });

  return router;
}

module.exports = { authRouter };


