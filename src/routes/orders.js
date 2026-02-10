const express = require("express");
const orderController = require("../controllers/orderController");

function publicOrdersRouter({ requireAuth, jwtSecret }) {
  const router = express.Router();

  // GET /api/orders - Get current user's orders with pagination and search
  router.get("/", requireAuth(jwtSecret), orderController.getUserOrders);

  // POST /api/orders - Create order
  router.post("/", requireAuth(jwtSecret), orderController.createOrder);

  return router;
}

function adminOrdersRouter() {
  const router = express.Router();

  // GET /api/admin/orders - Get all orders with pagination, search, and filters
  router.get("/", orderController.getAllOrders);
  
  // GET /api/admin/orders/:id - Get single order
  router.get("/:id", orderController.getOrderById);
  
  // PUT /api/admin/orders/:id - Update order status
  router.put("/:id", orderController.updateOrderStatus);
  
  // GET /api/admin/orders/:id/bill - Generate bill HTML
  router.get("/:id/bill", orderController.generateBill);
  
  // GET /api/admin/orders/:id/whatsapp - Generate WhatsApp message
  router.get("/:id/whatsapp", orderController.generateWhatsAppMessage);

  return router;
}

module.exports = { publicOrdersRouter, adminOrdersRouter };
