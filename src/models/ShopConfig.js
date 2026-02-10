const mongoose = require("mongoose");

const ShopConfigSchema = new mongoose.Schema(
  {
    // Shop Details
    name: { type: String, default: "Aizu's Kitchen" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    whatsappNumber: { type: String, default: "" },
    instagram: { type: String, default: "" },
    orderPrefix: { type: String, default: "AK-" },
    
    // Theme Colors
    primaryColor: { type: String, default: "#ff6933" },
    backgroundLight: { type: String, default: "#f8f6f5" },
    backgroundDark: { type: String, default: "#23140f" },
    textColor: { type: String, default: "#181210" },
    
    // Settings
    currency: { type: String, default: "INR" },
    timezone: { type: String, default: "Asia/Kolkata" },
    deliveryEnabled: { type: Boolean, default: true },
    pickupEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Singleton pattern: ensure only one document exists
ShopConfigSchema.statics.getConfig = async function() {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

ShopConfigSchema.statics.updateConfig = async function(updates) {
  let config = await this.findOne();
  if (!config) {
    config = await this.create(updates);
  } else {
    Object.assign(config, updates);
    await config.save();
  }
  return config;
};

module.exports = mongoose.model("ShopConfig", ShopConfigSchema);

