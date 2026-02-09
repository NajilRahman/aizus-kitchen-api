require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDb } = require("./db");
const { getEnv } = require("./env");
const Admin = require("./models/Admin");

async function main() {
  const env = getEnv();
  if (!env.ADMIN_BOOTSTRAP_USER || !env.ADMIN_BOOTSTRAP_PASS) {
    // eslint-disable-next-line no-console
    console.error("Set ADMIN_BOOTSTRAP_USER and ADMIN_BOOTSTRAP_PASS in server/.env to seed an admin.");
    process.exit(1);
  }

  await connectDb(env.MONGODB_URI);

  const passwordHash = await bcrypt.hash(env.ADMIN_BOOTSTRAP_PASS, 12);
  const existing = await Admin.findOne({ username: env.ADMIN_BOOTSTRAP_USER });
  if (existing) {
    existing.passwordHash = passwordHash;
    await existing.save();
    // eslint-disable-next-line no-console
    console.log("Admin updated:", env.ADMIN_BOOTSTRAP_USER);
  } else {
    await Admin.create({ username: env.ADMIN_BOOTSTRAP_USER, passwordHash });
    // eslint-disable-next-line no-console
    console.log("Admin created:", env.ADMIN_BOOTSTRAP_USER);
  }

  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


