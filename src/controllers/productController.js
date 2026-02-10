const { z } = require("zod");
const Product = require("../models/Product");
const { parsePagination, parseSearch, createPaginationResponse, buildSearchQuery } = require("../utils/pagination");

/**
 * Get products (public - only active)
 */
async function getProducts(req, res) {
  try {
    const { page, limit, skip } = parsePagination(req);
    const searchQuery = parseSearch(req);

    // Build query - exclude deleted items
    const query = { 
      isActive: true,
      $or: [
        { "isDeleted.status": false },
        { "isDeleted.status": { $exists: false } },
        { "isDeleted": { $exists: false } },
      ],
    };
    if (searchQuery) {
      const searchConditions = buildSearchQuery(searchQuery, ["name", "desc"]);
      Object.assign(query, searchConditions);
    }

    // Get products with pagination
    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    return res.json(createPaginationResponse(products, total, page, limit));
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch products" });
  }
}

/**
 * Get all products (admin - includes inactive)
 */
async function getAllProducts(req, res) {
  try {
    const { page, limit, skip } = parsePagination(req);
    const searchQuery = parseSearch(req);
    const statusFilter = req.query.status; // 'active', 'inactive', or undefined

    // Build query - exclude deleted items by default
    const query = {
      $or: [
        { "isDeleted.status": false },
        { "isDeleted.status": { $exists: false } },
        { "isDeleted": { $exists: false } },
      ],
    };
    
    if (statusFilter === "active") {
      query.isActive = true;
    } else if (statusFilter === "inactive") {
      query.isActive = false;
    }

    if (searchQuery) {
      const searchConditions = buildSearchQuery(searchQuery, ["name", "desc"]);
      Object.assign(query, searchConditions);
    }

    // Get products with pagination
    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    return res.json(createPaginationResponse(products, total, page, limit));
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch products" });
  }
}

/**
 * Get single product by ID
 */
async function getProductById(req, res) {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      $or: [
        { "isDeleted.status": false },
        { "isDeleted.status": { $exists: false } },
        { "isDeleted": { $exists: false } },
      ],
    }).lean();
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    return res.json({ product });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch product" });
  }
}

/**
 * Create new product
 */
async function createProduct(req, res) {
  try {
    const Body = z.object({
      name: z.string().min(1),
      unit: z.string().optional().default(""),
      price: z.coerce.number().min(0),
      desc: z.string().optional().default(""),
      imageUrl: z.string().optional().default(""),
      isActive: z.boolean().optional().default(true),
    });

    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.errors });
    }

    const created = await Product.create(parsed.data);
    return res.status(201).json({ product: created });
  } catch (error) {
    return res.status(500).json({ error: "Failed to create product" });
  }
}

/**
 * Update product
 */
async function updateProduct(req, res) {
  try {
    const Body = z.object({
      name: z.string().min(1).optional(),
      unit: z.string().optional(),
      price: z.coerce.number().min(0).optional(),
      desc: z.string().optional(),
      imageUrl: z.string().optional(),
      isActive: z.boolean().optional(),
    });

    const parsed = Body.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid body", details: parsed.error.errors });
    }

    const updated = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [
          { "isDeleted.status": false },
          { "isDeleted.status": { $exists: false } },
          { "isDeleted": { $exists: false } },
        ],
      },
      parsed.data,
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ error: "Product not found" });
    }
    return res.json({ product: updated });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update product" });
  }
}

/**
 * Delete product (soft delete)
 */
async function deleteProduct(req, res) {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      $or: [
        { "isDeleted.status": false },
        { "isDeleted.status": { $exists: false } },
        { "isDeleted": { $exists: false } },
      ],
    });
    
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Soft delete: set isDeleted.status to true and time to now
    product.isDeleted = {
      status: true,
      time: new Date(),
    };
    await product.save();

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete product" });
  }
}

module.exports = {
  getProducts,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};

