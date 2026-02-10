const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true },
    unit: { type: String, default: "" },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderRef: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      type: { type: String, enum: ["Delivery", "Pickup"], default: "Delivery" },
      address: { type: String, default: "" },
      preferredTime: { type: String, default: "" },
      payment: { type: String, default: "" },
      notes: { type: String, default: "" },
    },
    items: { type: [OrderItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    message: { type: String, default: "" },
    source: { type: String, default: "web" },
    status: { 
      type: String, 
      enum: ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"], 
      default: "pending" 
    },
    isDeleted: {
      status: { type: Boolean, default: false },
      time: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);


