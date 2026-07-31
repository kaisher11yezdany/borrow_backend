const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Not authenticated" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.active) return res.status(401).json({ error: "Not authenticated" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Wraps a boolean permission-check function (e.g. canVerify) as route middleware.
function requirePermission(checkFn, message) {
  return (req, res, next) => {
    if (!req.user || !checkFn(req.user)) {
      return res.status(403).json({ error: message || "Not permitted for your role" });
    }
    next();
  };
}

module.exports = { requireAuth, requirePermission };
