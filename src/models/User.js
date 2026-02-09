const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, index: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  // Skip if password hasn't been modified
  if (!this.isModified("password")) {
    return next ? next() : undefined;
  }
  
  try {
    // Hash the password
    this.password = await bcrypt.hash(this.password, 10);
    return next ? next() : undefined;
  } catch (error) {
    return next ? next(error) : Promise.reject(error);
  }
});

UserSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", UserSchema);

