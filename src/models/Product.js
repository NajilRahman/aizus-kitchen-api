const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    unit: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    desc: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    isDeleted: {
      status: { type: Boolean, default: false },
      time: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);


