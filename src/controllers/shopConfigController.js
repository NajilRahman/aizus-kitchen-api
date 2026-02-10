const { z } = require("zod");
const ShopConfig = require("../models/ShopConfig");

/**
 * Get shop config (public)
 */
async function getShopConfig(req, res) {
  try {
    const config = await ShopConfig.getConfig();
    return res.json({ config });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch shop config" });
  }
}

/**
 * Get shop config (admin)
 */
async function getShopConfigAdmin(req, res) {
  try {
    const config = await ShopConfig.getConfig();
    return res.json({ config });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch shop config" });
  }
}

/**
 * Update shop config (admin)
 */
async function updateShopConfig(req, res) {
  try {
    const Body = z.object({
      name: z.string().min(1).optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
      address: z.string().optional(),
      whatsappNumber: z.string().optional(),
      instagram: z.string().url().optional().or(z.literal("")),
      orderPrefix: z.string().optional(),
      primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      backgroundLight: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      backgroundDark: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      currency: z.string().optional(),
      timezone: z.string().optional(),
      deliveryEnabled: z.boolean().optional(),
      pickupEnabled: z.boolean().optional(),
    });

    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.errors });
    }

    const updated = await ShopConfig.updateConfig(parsed.data);
    return res.json({ config: updated });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update shop config" });
  }
}

/**
 * Reset shop config to defaults (admin)
 */
async function resetShopConfig(req, res) {
  try {
    const defaults = {
      name: "Aizu's Kitchen",
      phone: "",
      email: "",
      address: "",
      whatsappNumber: "",
      instagram: "",
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
    const updated = await ShopConfig.updateConfig(defaults);
    return res.json({ config: updated });
  } catch (error) {
    return res.status(500).json({ error: "Failed to reset shop config" });
  }
}

module.exports = {
  getShopConfig,
  getShopConfigAdmin,
  updateShopConfig,
  resetShopConfig,
};

