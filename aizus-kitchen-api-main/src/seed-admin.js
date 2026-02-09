require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDb } = require("./db");
const { getEnv } = require("./env");
const Admin = require("./models/Admin");
const User = require("./models/User");

async function main() {
  const env = getEnv();
  if (!env.ADMIN_BOOTSTRAP_USER || !env.ADMIN_BOOTSTRAP_PASS) {
    // eslint-disable-next-line no-console
    console.error("Set ADMIN_BOOTSTRAP_USER and ADMIN_BOOTSTRAP_PASS in server/.env to seed an admin.");
    process.exit(1);
  }

  await connectDb(env.MONGODB_URI);

  const existing = await Admin.findOne({ username: env.ADMIN_BOOTSTRAP_USER });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log("Admin already exists:", env.ADMIN_BOOTSTRAP_USER);
  } else {
    // Hash password once
    const hashed = await bcrypt.hash(env.ADMIN_BOOTSTRAP_PASS, 12);
    // Store hashed password in Admin collection (legacy) and as User with role admin
    const admin = await Admin.create({ username: env.ADMIN_BOOTSTRAP_USER, passwordHash: hashed });
    const userExisting = await User.findOne({ username: env.ADMIN_BOOTSTRAP_USER });
    if (!userExisting) {
      const user = new User({
        username: env.ADMIN_BOOTSTRAP_USER,
        password: env.ADMIN_BOOTSTRAP_PASS,
        role: "admin",
      });
      await user.save();
      // eslint-disable-next-line no-console
      console.log("Admin user created:", user.username);
    }
    // eslint-disable-next-line no-console
    console.log("Admin created:", admin.username);
  }

  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


