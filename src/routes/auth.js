const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const Admin = require("../models/Admin");

function authRouter({ jwtSecret }) {
  const router = express.Router();

  router.post("/login", async (req, res) => {
    const Body = z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    });

    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    const { username, password } = parsed.data;
    const admin = await Admin.findOne({ username }).lean();
    if (!admin) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ sub: String(admin._id), username }, jwtSecret, { expiresIn: "7d" });
    return res.json({ token, username });
  });

  return router;
}

module.exports = { authRouter };


