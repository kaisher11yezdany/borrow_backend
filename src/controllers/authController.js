const jwt = require("jsonwebtoken");
const User = require("../models/User");

function signToken(user) {
  return jwt.sign({ sub: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.active) return res.status(401).json({ error: "Invalid email or password" });
  const ok = await user.comparePassword(password);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });
  const token = signToken(user);
  res.json({ token, user: user.toSafeJSON() });
}

async function me(req, res) {
  res.json({ user: req.user.toSafeJSON() });
}

module.exports = { login, me, signToken };
