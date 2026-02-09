const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const Admin = require("../models/Admin");
const User = require("../models/User");

function authRouter({ jwtSecret }) {
  const router = express.Router();

  // Register regular user
  router.post("/register", async (req, res) => {
    try {
      const Body = z.object({
        username: z.string().min(3).max(32),
        password: z.string().min(6),
        email: z.string().email().optional().or(z.literal("")),
      });
      const parsed = Body.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

      const { username, password, email } = parsed.data;
      const existing = await User.findOne({ username });
      if (existing) return res.status(400).json({ error: "Username already taken" });

      const user = new User({ username, password, email: email || undefined, role: "user" });
      await user.save();

      const payload = { sub: String(user._id), role: user.role, kind: "user" };
      const token = jwt.sign(payload, jwtSecret, { expiresIn: "7d" });
      return res.json({
        token,
        user: { _id: user._id, username: user.username, role: user.role, email: user.email },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  // Login (tries admin first, then regular user)
  router.post("/login", async (req, res) => {
    const Body = z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    });

    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    const { username, password } = parsed.data;

    // 1) Try admin
    const admin = await Admin.findOne({ username }).lean();
    if (admin) {
      const ok = await bcrypt.compare(password, admin.passwordHash);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });
      const payload = { sub: String(admin._id), role: "admin", kind: "admin" };
      const token = jwt.sign(payload, jwtSecret, { expiresIn: "7d" });
      return res.json({
        token,
        user: { _id: admin._id, username: admin.username, role: "admin" },
      });
    }

    // 2) Try regular user
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const payload = { sub: String(user._id), role: user.role, kind: "user" };
    const token = jwt.sign(payload, jwtSecret, { expiresIn: "7d" });
    return res.json({
      token,
      user: { _id: user._id, username: user.username, role: user.role, email: user.email },
    });
  });

  return router;
}

module.exports = { authRouter };


