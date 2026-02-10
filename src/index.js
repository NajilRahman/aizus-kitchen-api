require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { getEnv } = require("./env");
const { connectDb } = require("./db");
const { seedAdmin } = require("./seed-admin");
const { seedShopConfig } = require("./seed-shop-config");
const { authRouter } = require("./routes/auth");
const { publicProductsRouter, adminProductsRouter } = require("./routes/products");
const { publicOrdersRouter, adminOrdersRouter } = require("./routes/orders");
const { publicShopConfigRouter, adminShopConfigRouter } = require("./routes/shopConfig");
const { uploadRouter } = require("./routes/upload");
const { requireAuth, requireAdmin } = require("./middleware/requireAuth");
const path = require("path");

async function main() {
  const env = getEnv();
  await connectDb(env.MONGODB_URI);
  
  // Wait a moment for database connection to be fully ready
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Seed admin user on server start
  await seedAdmin();
  // Seed shop config on server start
  await seedShopConfig();

  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "10mb" })); // Increased for larger payloads
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  // Separate frontend + backend:
  // Set CLIENT_ORIGIN to your frontend origin (e.g. https://aizuskitchen.shop)
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    })
  );

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRouter({ jwtSecret: env.JWT_SECRET }));

  // Serve uploaded images
  app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

  // Public
  app.use("/api/products", publicProductsRouter());
  app.use("/api/orders", publicOrdersRouter({ requireAuth, jwtSecret: env.JWT_SECRET }));
  app.use("/api/shop-config", publicShopConfigRouter());

  // Protected (admin)
  app.use("/api/admin", requireAdmin(env.JWT_SECRET));
  app.use("/api/admin/products", adminProductsRouter());
  app.use("/api/admin/orders", adminOrdersRouter());
  app.use("/api/admin/shop-config", adminShopConfigRouter());
  app.use("/api/admin/upload", uploadRouter({ jwtSecret: env.JWT_SECRET, requireAuth }));

  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});


