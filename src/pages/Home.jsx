import React, { useEffect, useRef, useState } from "react";
import FlashSaleSpotlight from "../components/FlashSaleSpotlight";
import ProductCard from "../components/ProductCard";
import { useAuth } from "../context/useAuth";
import { getCart } from "../services/cartApi";
import { getProducts } from "../services/productApi";

const DEFAULT_SPOTLIGHT_SLOTS = 4;
const MIN_SPOTLIGHT_SLOTS = 2;
const MAX_SPOTLIGHT_SLOTS = 5;
const SPOTLIGHT_CARD_WIDTH = 240;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const calculateSpotlightSlots = (width) => {
  if (!Number.isFinite(width) || width <= 0) {
    return DEFAULT_SPOTLIGHT_SLOTS;
  }

  return clamp(Math.floor(width / SPOTLIGHT_CARD_WIDTH), MIN_SPOTLIGHT_SLOTS, MAX_SPOTLIGHT_SLOTS);
};

const getInitialSpotlightSlots = () => {
  if (typeof window === "undefined") {
    return DEFAULT_SPOTLIGHT_SLOTS;
  }

  return calculateSpotlightSlots(window.innerWidth);
};

const Home = () => {
  const { token, user } = useAuth();
  const [products, setProducts] = useState([]);
  const [spotlightProducts, setSpotlightProducts] = useState([]);
  const [cartQuantities, setCartQuantities] = useState({});
  const [meta, setMeta] = useState({ categories: [], page: 1, pages: 1 });
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [spotlightSlots, setSpotlightSlots] = useState(getInitialSpotlightSlots);
  const [filters, setFilters] = useState({
    search: "",
    category: "all",
    minPrice: "",
    maxPrice: "",
    hasFlashSale: false,
    sort: "newest",
    page: 1,
  });
  const productListRef = useRef(null);
  const spotlightContainerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        const response = await getProducts(filters);

        if (!isMounted) {
          return;
        }

        setProducts(response.items);
        setMeta(response.meta);
        setStatus("success");
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError.message || "Unable to load products.");
        setStatus("error");
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [filters]);

  useEffect(() => {
    let isMounted = true;

    const loadSpotlightProducts = async () => {
      try {
        const response = await getProducts({
          hasFlashSale: true,
          sort: "ending_soon",
          page: 1,
          limit: Math.max(spotlightSlots - 1, 1),
        });

        if (!isMounted) {
          return;
        }

        setSpotlightProducts(response.items);
      } catch {
        if (!isMounted) {
          return;
        }

        setSpotlightProducts([]);
      }
    };

    loadSpotlightProducts();

    return () => {
      isMounted = false;
    };
  }, [spotlightSlots]);

  useEffect(() => {
    let isMounted = true;

    const loadCart = async () => {
      if (user?.role !== "customer" || !token) {
        setCartQuantities({});
        return;
      }

      try {
        const response = await getCart(token);

        if (!isMounted) {
          return;
        }

        setCartQuantities(
          Object.fromEntries(response.items.map((item) => [item.productId, item.quantity]))
        );
      } catch {
        if (!isMounted) {
          return;
        }

        setCartQuantities({});
      }
    };

    loadCart();

    return () => {
      isMounted = false;
    };
  }, [token, user]);

  useEffect(() => {
    const container = spotlightContainerRef.current;

    if (!container || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const updateSlotCount = (width) => {
      setSpotlightSlots((current) => {
        const nextValue = calculateSpotlightSlots(width);
        return current === nextValue ? current : nextValue;
      });
    };

    updateSlotCount(container.clientWidth || window.innerWidth);

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect?.width || container.clientWidth || window.innerWidth;
      updateSlotCount(nextWidth);
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [spotlightProducts.length]);

  const scrollToProductList = () => {
    productListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateFilter = (name, value, { scroll = false } = {}) => {
    setFilters((current) => {
      const nextFilters = {
        ...current,
        [name]: value,
        page: name === "page" ? value : 1,
      };

      if (name === "hasFlashSale") {
        nextFilters.hasFlashSale = value;
        nextFilters.sort = value
          ? "ending_soon"
          : current.sort === "ending_soon"
            ? "newest"
            : current.sort;
      }

      if (name === "sort") {
        nextFilters.sort = value;

        if (value === "ending_soon") {
          nextFilters.hasFlashSale = true;
        }
      }

      return nextFilters;
    });

    if (scroll) {
      scrollToProductList();
    }
  };

  const handleProductQuickAdd = (productId) => {
    setCartQuantities((current) => ({
      ...current,
      [productId]: (current[productId] || 0) + 1,
    }));
  };

  const handleFlashSaleToggle = (event) => {
    updateFilter("hasFlashSale", event.target.checked, { scroll: event.target.checked });
  };

  const handleViewAllFlashSales = () => {
    updateFilter("hasFlashSale", true, { scroll: true });
  };

  const hasCatalogFilters =
    filters.search.trim() ||
    filters.category !== "all" ||
    filters.minPrice !== "" ||
    filters.maxPrice !== "" ||
    filters.hasFlashSale ||
    filters.sort !== "newest";

  return (
    <div className="stack-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Storefront</p>
          <h1 className="page-title">Storefront</h1>
        </div>
      </div>

      {spotlightProducts.length > 0 && (
        <FlashSaleSpotlight
          containerRef={spotlightContainerRef}
          onViewAll={handleViewAllFlashSales}
          products={spotlightProducts}
          slotCount={spotlightSlots}
        />
      )}

      <section className="catalog-section stack-page" ref={productListRef}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Catalog</p>
            <h2 className="section-title">Featured products</h2>
            <p className="panel-copy">
              {filters.hasFlashSale
                ? "Showing active flash-sale products sorted by the order you choose."
                : "Browse the newest gadgets, category favorites, and everyday picks."}
            </p>
          </div>
        </div>

        <section className="panel filters-grid">
          <label className="field">
            <span>Search</span>
            <input
              placeholder="Search gadgets"
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Category</span>
            <select value={filters.category} onChange={(event) => updateFilter("category", event.target.value)}>
              <option value="all">All categories</option>
              {meta.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Min price</span>
            <input
              type="number"
              min="0"
              value={filters.minPrice}
              onChange={(event) => updateFilter("minPrice", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Max price</span>
            <input
              type="number"
              min="0"
              value={filters.maxPrice}
              onChange={(event) => updateFilter("maxPrice", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Sort</span>
            <select value={filters.sort} onChange={(event) => updateFilter("sort", event.target.value)}>
              <option value="newest">Newest</option>
              <option value="ending_soon">Ending soon</option>
              <option value="price_asc">Price: Low to high</option>
              <option value="price_desc">Price: High to low</option>
              <option value="name_asc">Name</option>
            </select>
          </label>
          <label className="field storefront-toggle-field">
            <span>Flash sale</span>
            <span className="storefront-toggle-control">
              <input
                checked={filters.hasFlashSale}
                onChange={handleFlashSaleToggle}
                type="checkbox"
              />
              <span>Flash sale only</span>
            </span>
          </label>
        </section>

        {status === "loading" && (
          <div className="status-panel">Loading products from MongoDB...</div>
        )}

        {status === "error" && (
          <div className="status-panel status-panel-error">{error}</div>
        )}

        {status === "success" && products.length === 0 && (
          <div className="status-panel">
            {hasCatalogFilters ? (
              "No products match the current filters."
            ) : (
              <>
                No products were found in the database. Add product documents in Atlas
                or run <code>npm run seed</code>.
              </>
            )}
          </div>
        )}

        {status === "success" && products.length > 0 && (
          <>
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard
                  key={product._id || product.id}
                  product={product}
                  cartQuantity={cartQuantities[product.id || product._id] || 0}
                  onAddedToCart={handleProductQuickAdd}
                />
              ))}
            </div>

            <div className="pagination-row">
              <button
                className="secondary-btn"
                disabled={filters.page <= 1}
                onClick={() => updateFilter("page", filters.page - 1)}
                type="button"
              >
                Previous
              </button>
              <span>
                Page {meta.page} of {meta.pages}
              </span>
              <button
                className="secondary-btn"
                disabled={filters.page >= meta.pages}
                onClick={() => updateFilter("page", filters.page + 1)}
                type="button"
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default Home;
