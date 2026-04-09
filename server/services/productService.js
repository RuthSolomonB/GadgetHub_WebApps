import mongoose from "mongoose";
import Product from "../models/Product.js";

const DEFAULT_LIMIT = 12;
const STOREFRONT_MAX_LIMIT = 24;
const ADMIN_MAX_LIMIT = 100;
const privilegedRoles = new Set(["product_manager", "super_admin"]);

const parseNumber = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const nextValue = Number(value);
  return Number.isFinite(nextValue) ? nextValue : null;
};

const roundCurrency = (value) => Number(value.toFixed(2));

export const calculateDiscountedPrice = (price, discountPercent) =>
  roundCurrency(Math.max(price * (1 - discountPercent / 100), 0));

export const deriveFlashSaleDiscountPercent = (price, flashSale) => {
  if (flashSale?.discountPercent !== null && flashSale?.discountPercent !== undefined) {
    return flashSale.discountPercent;
  }

  if (!Number.isFinite(price) || price <= 0) {
    return null;
  }

  if (flashSale?.salePrice === null || flashSale?.salePrice === undefined) {
    return null;
  }

  return roundCurrency(((price - flashSale.salePrice) / price) * 100);
};

export const getActiveFlashSale = (product, now = new Date()) => {
  const flashSale = product?.flashSale;

  if (!flashSale?.enabled) {
    return null;
  }

  if (flashSale.salePrice === null || flashSale.salePrice === undefined) {
    return null;
  }

  if (!flashSale.startsAt || !flashSale.endsAt) {
    return null;
  }

  const startsAt = new Date(flashSale.startsAt);
  const endsAt = new Date(flashSale.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return null;
  }

  if (now < startsAt || now > endsAt) {
    return null;
  }

  if ((flashSale.saleStockQty ?? 0) <= 0) {
    return null;
  }

  return flashSale;
};

export const createDisabledFlashSale = () => ({
  enabled: false,
  salePrice: null,
  discountPercent: null,
  startsAt: null,
  endsAt: null,
  saleStockQty: 0,
});

const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const nextValue = new Date(value);
  return Number.isNaN(nextValue.getTime()) ? null : nextValue;
};

export const normalizeFlashSalePayload = (input, { allowDisabled = true, basePrice } = {}) => {
  const errors = [];
  const enabled = allowDisabled ? Boolean(input?.enabled) : true;

  if (!enabled) {
    return {
      flashSale: createDisabledFlashSale(),
      errors,
    };
  }

  let discountPercent = parseNumber(input?.discountPercent);
  let salePrice = parseNumber(input?.salePrice);
  const saleStockQty = parseNumber(input?.saleStockQty);
  const startsAt = parseDate(input?.startsAt);
  const endsAt = parseDate(input?.endsAt);

  if (discountPercent !== null && (discountPercent <= 0 || discountPercent > 100)) {
    errors.push("flashSale.discountPercent must be greater than 0 and at most 100.");
  }

  if (salePrice !== null && salePrice < 0) {
    errors.push("flashSale.salePrice must be a valid non-negative number.");
  }

  if (discountPercent === null && salePrice === null) {
    errors.push("flashSale.discountPercent or flashSale.salePrice must be provided when flash sale is enabled.");
  }

  if (discountPercent !== null && Number.isFinite(basePrice)) {
    salePrice = calculateDiscountedPrice(basePrice, discountPercent);
  }

  if (discountPercent === null && salePrice !== null && Number.isFinite(basePrice) && basePrice > 0) {
    discountPercent = deriveFlashSaleDiscountPercent(basePrice, { salePrice });
  }

  if (saleStockQty === null || saleStockQty < 0 || !Number.isInteger(saleStockQty)) {
    errors.push("flashSale.saleStockQty must be a non-negative integer when flash sale is enabled.");
  }

  if (!startsAt || !endsAt || startsAt >= endsAt) {
    errors.push("flashSale.startsAt and flashSale.endsAt must be valid and startsAt must be before endsAt.");
  }

  return {
    flashSale: {
      enabled: true,
      salePrice,
      discountPercent,
      startsAt,
      endsAt,
      saleStockQty,
    },
    errors,
  };
};

export const serializeProduct = (product, viewerRole = "guest") => {
  const source = typeof product.toObject === "function" ? product.toObject() : product;
  const flashSale = getActiveFlashSale(source);
  const flashSaleDiscountPercent = deriveFlashSaleDiscountPercent(source.price, source.flashSale);
  const effectivePrice = flashSale ? flashSale.salePrice : source.price;
  const baseProduct = {
    ...source,
    id: source._id?.toString?.() || source.id,
    inStock: source.stockQty > 0 || Boolean(flashSale?.saleStockQty > 0),
    effectivePrice,
    hasActiveFlashSale: Boolean(flashSale),
    flashSaleDiscountPercent,
    flashSaleStartsAt: flashSale?.startsAt ?? null,
    flashSaleEndsAt: flashSale?.endsAt ?? null,
  };

  if (viewerRole === "guest" && baseProduct.flashSale) {
    baseProduct.flashSale = {
      enabled: baseProduct.flashSale.enabled,
      salePrice: baseProduct.flashSale.salePrice,
      discountPercent: baseProduct.flashSale.discountPercent ?? flashSaleDiscountPercent,
      startsAt: baseProduct.flashSale.startsAt,
      endsAt: baseProduct.flashSale.endsAt,
    };
  }

  if (viewerRole === "guest" && flashSale) {
    delete baseProduct.remainingFlashSaleStock;
  } else if (flashSale) {
    baseProduct.remainingFlashSaleStock = flashSale.saleStockQty;
  }

  return baseProduct;
};

const sortMap = {
  newest: { createdAt: -1 },
  ending_soon: { "flashSale.endsAt": 1, createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  name_asc: { name: 1 },
};

const canUseAdminInventoryView = (query, viewerRole = "guest") =>
  query.includeInactive === "true" && privilegedRoles.has(viewerRole);

const buildActiveFlashSaleFilters = (now = new Date()) => ({
  "flashSale.enabled": true,
  "flashSale.salePrice": { $ne: null },
  "flashSale.startsAt": { $lte: now },
  "flashSale.endsAt": { $gte: now },
  "flashSale.saleStockQty": { $gt: 0 },
});

const buildVisibilityFilters = (query, viewerRole = "guest") => {
  if (!canUseAdminInventoryView(query, viewerRole)) {
    return { isActive: true };
  }

  switch (query.status) {
    case "active":
      return { isActive: true };
    case "inactive":
      return { isActive: false };
    case "all":
    default:
      return {};
  }
};

export const buildProductListOptions = (query, viewerRole = "guest") => {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const maxLimit = privilegedRoles.has(viewerRole) ? ADMIN_MAX_LIMIT : STOREFRONT_MAX_LIMIT;
  const limit = Math.min(Math.max(parseInt(query.limit || `${DEFAULT_LIMIT}`, 10), 1), maxLimit);
  const sort = sortMap[query.sort] || sortMap.newest;
  const filters = { ...buildVisibilityFilters(query, viewerRole) };
  const flashSaleOnlyMode = query.hasFlashSale === "true" || query.sort === "ending_soon";

  if (query.category && query.category !== "all") {
    filters.category = query.category;
  }

  if (flashSaleOnlyMode) {
    Object.assign(filters, buildActiveFlashSaleFilters());
  }

  if (query.sku?.trim()) {
    filters.sku = query.sku.trim().toUpperCase();
  }

  const minPrice = parseNumber(query.minPrice);
  const maxPrice = parseNumber(query.maxPrice);

  if (minPrice !== null || maxPrice !== null) {
    filters.price = {};

    if (minPrice !== null) {
      filters.price.$gte = minPrice;
    }

    if (maxPrice !== null) {
      filters.price.$lte = maxPrice;
    }
  }

  if (query.search?.trim()) {
    const regex = new RegExp(query.search.trim(), "i");
    filters.$or = [{ name: regex }, { description: regex }, { category: regex }];
  }

  return {
    filters,
    page,
    limit,
    skip: (page - 1) * limit,
    sort,
  };
};

export const listProducts = async (query, viewerRole = "guest") => {
  const { filters, page, limit, skip, sort } = buildProductListOptions(query, viewerRole);
  const categoryFilters = buildVisibilityFilters(query, viewerRole);
  const [products, total, categories] = await Promise.all([
    Product.find(filters).sort(sort).skip(skip).limit(limit).lean(),
    Product.countDocuments(filters),
    Product.distinct("category", categoryFilters),
  ]);

  return {
    items: products.map((product) => serializeProduct(product, viewerRole)),
    meta: {
      page,
      limit,
      total,
      pages: Math.max(Math.ceil(total / limit), 1),
      categories: categories.sort((left, right) => left.localeCompare(right)),
    },
  };
};

export const normalizeProductPayload = (body, { partial = false } = {}) => {
  const errors = [];
  const payload = {};
  const requiredFields = ["name", "description", "price", "image", "category", "stockQty"];

  for (const field of requiredFields) {
    if (!partial && (body[field] === undefined || body[field] === null || body[field] === "")) {
      errors.push(`${field} is required.`);
    }
  }

  if (body.name !== undefined) {
    payload.name = `${body.name}`.trim();
  }

  if (body.description !== undefined) {
    payload.description = `${body.description}`.trim();
  }

  if (body.category !== undefined) {
    payload.category = `${body.category}`.trim();
  }

  if (body.sku !== undefined) {
    const sku = `${body.sku}`.trim().toUpperCase();

    if (!sku) {
      errors.push("sku must not be empty.");
    } else {
      payload.sku = sku;
    }
  }

  if (body.image !== undefined) {
    payload.image = `${body.image}`.trim();
  }

  if (body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price < 0) {
      errors.push("price must be a valid non-negative number.");
    } else {
      payload.price = price;
    }
  }

  if (body.stockQty !== undefined) {
    const stockQty = Number(body.stockQty);
    if (!Number.isInteger(stockQty) || stockQty < 0) {
      errors.push("stockQty must be a valid non-negative integer.");
    } else {
      payload.stockQty = stockQty;
    }
  }

  if (body.isActive !== undefined) {
    payload.isActive = Boolean(body.isActive);
  }

  if (body.flashSale !== undefined) {
    const nextBasePrice = body.price !== undefined ? Number(body.price) : undefined;
    const { flashSale, errors: flashSaleErrors } = normalizeFlashSalePayload(body.flashSale, {
      basePrice: Number.isFinite(nextBasePrice) ? nextBasePrice : undefined,
    });
    payload.flashSale = flashSale;
    errors.push(...flashSaleErrors);
  }

  if (payload.image && !/^https?:\/\/|^\//.test(payload.image)) {
    errors.push("image must be an absolute URL or app-relative path.");
  }

  return {
    payload,
    errors,
  };
};

export const ensureValidObjectId = (id) => mongoose.isValidObjectId(id);
