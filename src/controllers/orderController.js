const { z } = require("zod");
const Order = require("../models/Order");
const ShopConfig = require("../models/ShopConfig");
const { parsePagination, parseSearch, createPaginationResponse, buildSearchQuery } = require("../utils/pagination");

/**
 * Get user's orders (public - requires auth)
 */
async function getUserOrders(req, res) {
  try {
    const userId = req.user.sub;
    const { page, limit, skip } = parsePagination(req);
    const searchQuery = parseSearch(req);
    const statusFilter = req.query.status;

    // Build query
    const query = { userId };
    
    if (statusFilter && statusFilter !== "all") {
      query.status = statusFilter;
    }

    if (searchQuery) {
      const searchConditions = {
        $or: [
          { orderRef: { $regex: searchQuery, $options: "i" } },
          { "customer.name": { $regex: searchQuery, $options: "i" } },
          { "customer.phone": { $regex: searchQuery, $options: "i" } },
        ],
      };
      Object.assign(query, searchConditions);
    }

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    return res.json(createPaginationResponse(orders, total, page, limit));
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
}

/**
 * Create new order (public - requires auth)
 */
async function createOrder(req, res) {
  try {
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
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.errors });
    }

    const userId = req.user.sub;
    const created = await Order.create({ ...parsed.data, userId });
    return res.status(201).json({ order: created });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create order" });
  }
}

/**
 * Get all orders (admin)
 */
async function getAllOrders(req, res) {
  try {
    const { page, limit, skip } = parsePagination(req);
    const searchQuery = parseSearch(req);
    const statusFilter = req.query.status;
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;

    // Build query
    const query = {};

    if (statusFilter && statusFilter !== "all") {
      query.status = statusFilter;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        query.createdAt.$lte = new Date(dateTo);
      }
    }

    // Search filter
    if (searchQuery) {
      const searchConditions = {
        $or: [
          { orderRef: { $regex: searchQuery, $options: "i" } },
          { "customer.name": { $regex: searchQuery, $options: "i" } },
          { "customer.phone": { $regex: searchQuery, $options: "i" } },
        ],
      };
      Object.assign(query, searchConditions);
    }

    // Get orders with pagination
    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    return res.json(createPaginationResponse(orders, total, page, limit));
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
}

/**
 * Get order by ID
 */
async function getOrderById(req, res) {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    return res.json({ order });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch order" });
  }
}

/**
 * Update order status (admin)
 */
async function updateOrderStatus(req, res) {
  try {
    const Body = z.object({
      status: z.enum(["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"]).optional(),
    });

    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.errors });
    }

    const updated = await Order.findByIdAndUpdate(req.params.id, parsed.data, { new: true });
    if (!updated) {
      return res.status(404).json({ error: "Order not found" });
    }
    return res.json({ order: updated });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update order" });
  }
}

/**
 * Generate bill HTML (admin)
 */
async function generateBill(req, res) {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const shopConfig = await ShopConfig.getConfig();
    const shopName = shopConfig.name || "Aizu's Kitchen";
    const shopAddress = shopConfig.address || "";
    const shopPhone = shopConfig.phone || "";

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
    ${shopAddress ? `<p>${shopAddress}</p>` : ""}
    ${shopPhone ? `<p>Phone: ${shopPhone}</p>` : ""}
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
  } catch (error) {
    return res.status(500).json({ error: "Failed to generate bill" });
  }
}

/**
 * Generate WhatsApp message (admin)
 */
async function generateWhatsAppMessage(req, res) {
  try {
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const shopConfig = await ShopConfig.getConfig();
    const shopName = shopConfig.name || "Aizu's Kitchen";
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
  } catch (error) {
    return res.status(500).json({ error: "Failed to generate WhatsApp message" });
  }
}

module.exports = {
  getUserOrders,
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  generateBill,
  generateWhatsAppMessage,
};

