const express = require("express");
const { z } = require("zod");
const Order = require("../models/Order");

function publicOrdersRouter({ requireAuth, jwtSecret }) {
  const router = express.Router();

  // GET /api/orders - Get current user's orders (requires auth)
  router.get("/", requireAuth(jwtSecret), async (req, res) => {
    const userId = req.user.sub;
    const orders = await Order.find({ userId }).sort({ createdAt: -1 }).limit(100).lean();
    return res.json({ orders });
  });

  // POST /api/orders - Create order (requires auth)
  router.post("/", requireAuth(jwtSecret), async (req, res) => {
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

    const userId = req.user.sub;
    const created = await Order.create({ ...parsed.data, userId });
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

  router.put("/:id", async (req, res) => {
    const Body = z.object({
      status: z.enum(["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"]).optional(),
    });
    const parsed = Body.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

    const updated = await Order.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
    if (!updated) return res.status(404).json({ error: "Order not found" });
    return res.json({ order: updated });
  });

  // Get bill HTML for PDF generation
  router.get("/:id/bill", async (req, res) => {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ error: "Order not found" });

    const shopName = process.env.SHOP_NAME || "Aizu's Kitchen";
    const shopAddress = process.env.CONTACT_ADDRESS || "";
    const shopPhone = process.env.CONTACT_PHONE || "";

    const date = new Date(order.createdAt).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let billHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Bill - ${order.orderRef}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; padding: 20px; max-width: 600px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 15px; }
    .header h1 { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
    .header p { font-size: 12px; margin: 2px 0; }
    .section { margin: 15px 0; }
    .section-title { font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
    .row { display: flex; justify-content: space-between; margin: 5px 0; }
    .items { margin: 10px 0; }
    .item { display: flex; justify-content: space-between; margin: 5px 0; padding: 5px 0; border-bottom: 1px dotted #ccc; }
    .total { font-weight: bold; font-size: 18px; text-align: right; margin-top: 15px; padding-top: 10px; border-top: 2px solid #000; }
    .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #000; font-size: 12px; }
    @media print { body { padding: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${shopName}</h1>
    <p>${shopAddress}</p>
    <p>Phone: ${shopPhone}</p>
  </div>
  
  <div class="section">
    <div class="row"><strong>Order Ref:</strong> <span>${order.orderRef}</span></div>
    <div class="row"><strong>Date:</strong> <span>${date}</span></div>
    <div class="row"><strong>Status:</strong> <span>${(order.status || "pending").toUpperCase()}</span></div>
  </div>

  <div class="section">
    <div class="section-title">CUSTOMER DETAILS</div>
    <div class="row"><span>Name:</span> <span>${order.customer?.name || "N/A"}</span></div>
    <div class="row"><span>Phone:</span> <span>${order.customer?.phone || "N/A"}</span></div>
    <div class="row"><span>Type:</span> <span>${order.customer?.type || "N/A"}</span></div>
    ${order.customer?.address ? `<div class="row"><span>Address:</span> <span>${order.customer.address}</span></div>` : ""}
    ${order.customer?.preferredTime ? `<div class="row"><span>Preferred Time:</span> <span>${order.customer.preferredTime}</span></div>` : ""}
    <div class="row"><span>Payment:</span> <span>${order.customer?.payment || "N/A"}</span></div>
  </div>

  <div class="section">
    <div class="section-title">ITEMS</div>
    <div class="items">
      ${(order.items || []).map((item, idx) => `
        <div class="item">
          <div>
            <strong>${idx + 1}. ${item.name}${item.unit ? ` (${item.unit})` : ""}</strong>
          </div>
          <div>
            ${item.qty} × ₹${item.price} = ₹${item.lineTotal}
          </div>
        </div>
      `).join("")}
    </div>
  </div>

  <div class="total">
    SUBTOTAL: ₹${order.subtotal}
  </div>

  ${order.customer?.notes ? `
    <div class="section">
      <div class="section-title">NOTES</div>
      <p>${order.customer.notes}</p>
    </div>
  ` : ""}

  <div class="footer">
    <p>Thank you for your order!</p>
    <p>${shopName}</p>
  </div>
</body>
</html>
    `;

    res.setHeader("Content-Type", "text/html");
    return res.send(billHTML);
  });

  // Generate WhatsApp message with bill
  router.get("/:id/whatsapp", async (req, res) => {
    const order = await Order.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ error: "Order not found" });

    const shopName = process.env.SHOP_NAME || "Aizu's Kitchen";
    const date = new Date(order.createdAt).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let message = `*${shopName} - Order Bill*\n\n`;
    message += `Order Ref: ${order.orderRef}\n`;
    message += `Date: ${date}\n`;
    message += `Status: ${(order.status || "pending").toUpperCase()}\n\n`;
    message += `*Customer Details:*\n`;
    message += `Name: ${order.customer?.name || "N/A"}\n`;
    message += `Phone: ${order.customer?.phone || "N/A"}\n`;
    message += `Type: ${order.customer?.type || "N/A"}\n`;
    if (order.customer?.address) message += `Address: ${order.customer.address}\n`;
    if (order.customer?.preferredTime) message += `Preferred Time: ${order.customer.preferredTime}\n`;
    message += `Payment: ${order.customer?.payment || "N/A"}\n\n`;
    message += `*Items:*\n`;
    (order.items || []).forEach((item, idx) => {
      message += `${idx + 1}. ${item.name}${item.unit ? ` (${item.unit})` : ""}\n`;
      message += `   ${item.qty} × ₹${item.price} = ₹${item.lineTotal}\n`;
    });
    message += `\n*Subtotal: ₹${order.subtotal}*\n\n`;
    if (order.customer?.notes) message += `Notes: ${order.customer.notes}\n\n`;
    message += `Thank you for your order!`;

    const phone = (order.customer?.phone || "").replace(/[^\d]/g, "");
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    return res.json({ message, whatsappUrl, phone });
  });

  return router;
}

module.exports = { publicOrdersRouter, adminOrdersRouter };


