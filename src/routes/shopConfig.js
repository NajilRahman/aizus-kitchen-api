const express = require("express");
const shopConfigController = require("../controllers/shopConfigController");

function publicShopConfigRouter() {
  const router = express.Router();

  // GET /api/shop-config - Get shop config (public)
  router.get("/", shopConfigController.getShopConfig);

  return router;
}

function adminShopConfigRouter() {
  const router = express.Router();

  // GET /api/admin/shop-config - Get shop config (admin)
  router.get("/", shopConfigController.getShopConfigAdmin);
  
  // PUT /api/admin/shop-config - Update shop config
  router.put("/", shopConfigController.updateShopConfig);
  
  // POST /api/admin/shop-config/reset - Reset to defaults
  router.post("/reset", shopConfigController.resetShopConfig);

  return router;
}

module.exports = { publicShopConfigRouter, adminShopConfigRouter };
