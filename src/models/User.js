const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { ROLES } = require("../config/constants");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true },
    phone: { type: String, trim: true, default: "" },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, required: true },
    reportsTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.methods.setPassword = async function (plainPassword) {
  this.passwordHash = await bcrypt.hash(plainPassword, 10);
};
userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};
userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    reportsTo: this.reportsTo,
    active: this.active,
  };
};

module.exports = mongoose.model("User", userSchema);
