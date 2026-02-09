require("dotenv").config();
const { connectDb } = require("./db");
const { getEnv } = require("./env");
const User = require("./models/User");

async function seedAdmin() {
  const env = getEnv();
  if (!env.ADMIN_BOOTSTRAP_USER || !env.ADMIN_BOOTSTRAP_PASS) {
    // eslint-disable-next-line no-console
    console.warn("⚠️  ADMIN_BOOTSTRAP_USER and ADMIN_BOOTSTRAP_PASS not set. Admin seeding skipped.");
    return;
  }

  try {
    const existing = await User.findOne({ username: env.ADMIN_BOOTSTRAP_USER });
    if (existing) {
      // Only update if role is not admin or password might have changed
      if (existing.role !== "admin") {
        existing.password = env.ADMIN_BOOTSTRAP_PASS; // Will be hashed by pre-save hook
        existing.role = "admin";
        await existing.save();
        // eslint-disable-next-line no-console
        console.log("✅ Admin updated:", env.ADMIN_BOOTSTRAP_USER);
      } else {
        // eslint-disable-next-line no-console
        console.log("✅ Admin already exists:", env.ADMIN_BOOTSTRAP_USER);
      }
    } else {
      await User.create({
        username: env.ADMIN_BOOTSTRAP_USER,
        password: env.ADMIN_BOOTSTRAP_PASS, // Will be hashed by pre-save hook
        role: "admin",
      });
      // eslint-disable-next-line no-console
      console.log("✅ Admin created:", env.ADMIN_BOOTSTRAP_USER);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("❌ Error seeding admin:", err.message);
    // Don't throw - let server start even if seeding fails
  }
}

// Standalone script mode (for manual execution)
async function main() {
  const env = getEnv();
  if (!env.ADMIN_BOOTSTRAP_USER || !env.ADMIN_BOOTSTRAP_PASS) {
    // eslint-disable-next-line no-console
    console.error("Set ADMIN_BOOTSTRAP_USER and ADMIN_BOOTSTRAP_PASS in server/.env to seed an admin.");
    process.exit(1);
  }

  await connectDb(env.MONGODB_URI);
  await seedAdmin();
  process.exit(0);
}

// Run standalone if called directly
if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}

module.exports = { seedAdmin };
