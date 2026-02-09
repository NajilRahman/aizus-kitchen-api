require("dotenv").config();
const bcrypt = require("bcryptjs");
const { connectDb } = require("./db");
const { getEnv } = require("./env");
const User = require("./models/User");

async function seedAdmin() {
  const env = getEnv();
  // eslint-disable-next-line no-console
  console.log("🔍 Checking admin seed configuration...");
  // eslint-disable-next-line no-console
  console.log("ADMIN_BOOTSTRAP_USER:", env.ADMIN_BOOTSTRAP_USER ? "✅ Set" : "❌ Missing");
  // eslint-disable-next-line no-console
  console.log("ADMIN_BOOTSTRAP_PASS:", env.ADMIN_BOOTSTRAP_PASS ? "✅ Set" : "❌ Missing");
  
  if (!env.ADMIN_BOOTSTRAP_USER || !env.ADMIN_BOOTSTRAP_PASS) {
    // eslint-disable-next-line no-console
    console.warn("⚠️  ADMIN_BOOTSTRAP_USER and ADMIN_BOOTSTRAP_PASS not set. Admin seeding skipped.");
    return;
  }

  try {
    // eslint-disable-next-line no-console
    console.log("🌱 Seeding admin user:", env.ADMIN_BOOTSTRAP_USER);
    const existing = await User.findOne({ username: env.ADMIN_BOOTSTRAP_USER });
    // Hash password manually to avoid pre-save hook issues
    const passwordHash = await bcrypt.hash(env.ADMIN_BOOTSTRAP_PASS, 10);
    
    // Use findOneAndUpdate with upsert to bypass pre-save hook
    const wasExisting = !!existing;
    const admin = await User.findOneAndUpdate(
      { username: env.ADMIN_BOOTSTRAP_USER },
      {
        username: env.ADMIN_BOOTSTRAP_USER,
        password: passwordHash,
        role: "admin",
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      }
    );
    
    if (wasExisting) {
      // eslint-disable-next-line no-console
      console.log("✅ Admin updated successfully:", env.ADMIN_BOOTSTRAP_USER);
    } else {
      // eslint-disable-next-line no-console
      console.log("✅ Admin created successfully:", env.ADMIN_BOOTSTRAP_USER, "with ID:", admin._id);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("❌ Error seeding admin:", err.message);
    // eslint-disable-next-line no-console
    console.error("Stack trace:", err.stack);
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
