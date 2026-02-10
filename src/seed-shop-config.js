require("dotenv").config();
const { connectDb } = require("./db");
const { getEnv } = require("./env");
const ShopConfig = require("./models/ShopConfig");

async function seedShopConfig() {
  const env = getEnv();
  
  try {
    // eslint-disable-next-line no-console
    console.log("🌱 Seeding shop configuration...");
    
    const existing = await ShopConfig.findOne();
    
    if (existing) {
      // eslint-disable-next-line no-console
      console.log("✅ Shop config already exists, skipping seed.");
      return;
    }

    // Use environment variables as defaults if available
    const defaults = {
      name: process.env.SHOP_NAME || "Aizu's Kitchen",
      phone: process.env.CONTACT_PHONE || "",
      email: process.env.CONTACT_EMAIL || "",
      address: process.env.CONTACT_ADDRESS || "",
      whatsappNumber: process.env.WHATSAPP_NUMBER || "",
      instagram: process.env.INSTAGRAM || "",
      orderPrefix: "AK-",
      primaryColor: "#ff6933",
      backgroundLight: "#f8f6f5",
      backgroundDark: "#23140f",
      textColor: "#181210",
      currency: "INR",
      timezone: "Asia/Kolkata",
      deliveryEnabled: true,
      pickupEnabled: true,
    };

    const config = await ShopConfig.create(defaults);
    // eslint-disable-next-line no-console
    console.log("✅ Shop config created successfully with ID:", config._id);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("❌ Error seeding shop config:", err.message);
    // Don't throw - let server start even if seeding fails
  }
}

// Standalone script mode (for manual execution)
async function main() {
  const env = getEnv();
  await connectDb(env.MONGODB_URI);
  await seedShopConfig();
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

module.exports = { seedShopConfig };

