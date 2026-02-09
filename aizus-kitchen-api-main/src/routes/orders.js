const express = require("express");
const { z } = require("zod");
const Order = require("../models/Order");

function publicOrdersRouter() {
  const router = express.Router();

  router.post("/", async (req, res) => {
    const Body = z.object({
      orderRef: z.string().min(1),
      subtotal: z.coerce.number().min(0),
      customer: z.object({
        name: z.string().min(1),
        phone: z.string().min(6),
        type: z.enum(["Delivery", "Pickup"]).default("Delivery"),
        address: z.string().optional().default(""),
        preferredTime: z.string().optional().default(""),
        payment: z.string().optional().default(""),
        notes: z.string().optional().default(""),
      }),
      items: z.array(
        z.object({
          productId: z.string().optional(),
          name: z.string().min(1),
          unit: z.string().optional().default(""),
          qty: z.coerce.number().int().min(1),
          price: z.coerce.number().min(0),
          lineTotal: z.coerce.number().min(0),
        })
      ).min(1),
      message: z.string().optional().default(""),
      source: z.string().optional().default("web"),
    });

    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    const created = await Order.create(parsed.data);
    return res.status(201).json({ order: created });
  });

  return router;
}

function adminOrdersRouter() {
  const router = express.Router();

  router.get("/", async (_req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(500).lean();
    return res.json({ orders });
  });

  return router;
}

module.exports = { publicOrdersRouter, adminOrdersRouter };


