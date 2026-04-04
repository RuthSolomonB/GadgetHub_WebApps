const catalogBlueprint = [
  { category: "Phones", basePrice: 499, prefix: "Nova Phone", hero: "all-day battery" },
  { category: "Computers", basePrice: 899, prefix: "Atlas Laptop", hero: "high-refresh display" },
  { category: "Audio", basePrice: 149, prefix: "Pulse Audio", hero: "immersive sound" },
  { category: "Wearables", basePrice: 229, prefix: "Orbit Watch", hero: "wellness tracking" },
  { category: "Gaming", basePrice: 349, prefix: "Vector Console", hero: "low-latency controls" },
];

const variants = [
  "Core",
  "Plus",
  "Air",
  "Max",
  "Pro",
  "Studio",
  "Lite",
  "Ultra",
  "Edge",
  "Prime",
];

const sampleProducts = catalogBlueprint.flatMap((blueprint, categoryIndex) =>
  variants.map((variant, variantIndex) => {
    const stockQty = 12 + categoryIndex * 3 + variantIndex;
    const seedId = `${categoryIndex + 1}${variantIndex + 1}`;
    const hasFlashSale = variantIndex % 3 === 0;

    return {
      name: `${blueprint.prefix} ${variant}`,
      description: `${blueprint.prefix} ${variant} delivers ${blueprint.hero}, premium build quality, and a clean everyday experience for GadgetHub shoppers.`,
      price: blueprint.basePrice + variantIndex * 35 + categoryIndex * 20,
      image: `https://placehold.co/600x600/1f2937/f9fafb?text=${encodeURIComponent(
        `${blueprint.prefix} ${variant}`
      )}`,
      category: blueprint.category,
      sku: `GH-${seedId}-${variant.toUpperCase()}`,
      stockQty,
      isActive: true,
      flashSale: hasFlashSale
        ? {
            enabled: true,
            salePrice: blueprint.basePrice + variantIndex * 25,
            startsAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
            saleStockQty: Math.max(3, Math.floor(stockQty / 3)),
          }
        : {
            enabled: false,
            salePrice: null,
            startsAt: null,
            endsAt: null,
            saleStockQty: 0,
          },
    };
  })
);

export default sampleProducts;
