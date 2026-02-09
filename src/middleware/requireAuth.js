const jwt = require("jsonwebtoken");

function extractToken(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token;
}

function requireAuth(jwtSecret) {
  return function (req, res, next) {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: "Missing token" });

    try {
      const payload = jwt.verify(token, jwtSecret);
      req.user = payload;
      return next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}

function requireAdmin(jwtSecret) {
  return function (req, res, next) {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: "Missing token" });
    try {
      const payload = jwt.verify(token, jwtSecret);
      if (!(payload && payload.role === "admin")) {
        return res.status(403).json({ error: "Admin access required" });
      }
      req.user = payload;
      return next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}

module.exports = { requireAuth, requireAdmin };


