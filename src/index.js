require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { getEnv } = require("./env");
const { connectDb } = require("./db");
const { seedAdmin } = require("./seed-admin");
const { authRouter } = require("./routes/auth");
const { publicProductsRouter, adminProductsRouter } = require("./routes/products");
const { publicOrdersRouter, adminOrdersRouter } = require("./routes/orders");
const { requireAuth, requireAdmin } = require("./middleware/requireAuth");

async function main() {
  const env = getEnv();
  await connectDb(env.MONGODB_URI);
  
  // Wait a moment for database connection to be fully ready
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Seed admin user on server start
  await seedAdmin();

  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));
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

  // Public
  app.use("/api/products", publicProductsRouter());
  app.use("/api/orders", publicOrdersRouter());

  // Protected (admin)
  app.use("/api/admin", requireAdmin(env.JWT_SECRET));
  app.use("/api/admin/products", adminProductsRouter());
  app.use("/api/admin/orders", adminOrdersRouter());

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


