const express = require("express");
const productController = require("../controllers/productController");

function publicProductsRouter() {
  const router = express.Router();

  // GET /api/products - Get active products with pagination and search
  router.get("/", productController.getProducts);

  return router;
}

function adminProductsRouter() {
  const router = express.Router();

  // GET /api/admin/products - Get all products with pagination, search, and filters
  router.get("/", productController.getAllProducts);
  
  // GET /api/admin/products/:id - Get single product
  router.get("/:id", productController.getProductById);
  
  // POST /api/admin/products - Create product
  router.post("/", productController.createProduct);
  
  // PUT /api/admin/products/:id - Update product
  router.put("/:id", productController.updateProduct);
  
  // DELETE /api/admin/products/:id - Delete product
  router.delete("/:id", productController.deleteProduct);

  return router;
}

module.exports = { publicProductsRouter, adminProductsRouter };
