const jwt = require("jsonwebtoken");

function requireAuth(jwtSecret) {
  return function (req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
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

module.exports = { requireAuth };


