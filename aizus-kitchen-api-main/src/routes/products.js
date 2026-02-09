const express = require("express");
const { z } = require("zod");
const Product = require("../models/Product");

function publicProductsRouter() {
  const router = express.Router();

  router.get("/", async (_req, res) => {
    const products = await Product.find({ isActive: true }).sort({ createdAt: -1 }).lean();
    return res.json({ products });
  });

  return router;
}

function adminProductsRouter() {
  const router = express.Router();

  router.get("/", async (_req, res) => {
    const products = await Product.find().sort({ createdAt: -1 }).lean();
    return res.json({ products });
  });

  router.post("/", async (req, res) => {
    const Body = z.object({
      name: z.string().min(1),
      unit: z.string().optional().default(""),
      price: z.coerce.number().min(0),
      desc: z.string().optional().default(""),
      imageUrl: z.string().optional().default(""),
      isActive: z.boolean().optional().default(true),
    });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    const created = await Product.create(parsed.data);
    return res.status(201).json({ product: created });
  });

  router.put("/:id", async (req, res) => {
    const Body = z.object({
      name: z.string().min(1).optional(),
      unit: z.string().optional(),
      price: z.coerce.number().min(0).optional(),
      desc: z.string().optional(),
      imageUrl: z.string().optional(),
      isActive: z.boolean().optional(),
    });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    const updated = await Product.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json({ product: updated });
  });

  router.delete("/:id", async (req, res) => {
    const updated = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json({ ok: true });
  });

  return router;
}

module.exports = { publicProductsRouter, adminProductsRouter };


