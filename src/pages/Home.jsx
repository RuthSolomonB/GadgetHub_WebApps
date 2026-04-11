import React, { useEffect, useRef, useState } from "react";
import FlashSaleSpotlight from "../components/FlashSaleSpotlight";
import ProductCard from "../components/ProductCard";
import { useAuth } from "../context/useAuth";
import { getCart } from "../services/cartApi";
import { getProducts } from "../services/productApi";

const Home = () => {
  const { token, user } = useAuth();
  const [products, setProducts] = useState([]);
  const [spotlightProducts, setSpotlightProducts] = useState([]);
  const [cartQuantities, setCartQuantities] = useState({});
  const [meta, setMeta] = useState({ categories: [], page: 1, pages: 1 });
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const catalogSectionRef = useRef(null);
  const [filters, setFilters] = useState({
    search: "",
    category: "all",
    minPrice: "",
    maxPrice: "",
    hasFlashSale: false,
    sort: "newest",
    page: 1,
  });

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      setStatus("loading");
      setError("");

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
          limit: 3,
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
  }, []);

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

  const updateFilter = (name, value) => {
    setFilters((current) => {
      const nextFilters = {
        ...current,
        [name]: value,
        page: name === "page" ? value : 1,
      };

      if (name === "hasFlashSale") {
        nextFilters.hasFlashSale = value;
        nextFilters.sort = value ? "ending_soon" : current.sort === "ending_soon" ? "newest" : current.sort;
      }

      if (name === "sort") {
        nextFilters.sort = value;
        nextFilters.hasFlashSale = value === "ending_soon" ? true : current.hasFlashSale;
      }

      return nextFilters;
    });
  };

  const handleProductQuickAdd = (productId) => {
    setCartQuantities((current) => ({
      ...current,
      [productId]: (current[productId] || 0) + 1,
    }));
  };

  const handleFlashSaleToggle = (event) => {
    updateFilter("hasFlashSale", event.target.checked);
  };

  const handleViewAllFlashSales = () => {
    updateFilter("hasFlashSale", true);
    catalogSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
          <p className="panel-copy">Browse products, catch the live flash sales, and shop the catalog by category or price.</p>
        </div>
      </div>

      {spotlightProducts.length > 0 && (
        <FlashSaleSpotlight onViewAll={handleViewAllFlashSales} products={spotlightProducts} />
      )}

      <section className="stack-page" ref={catalogSectionRef}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Catalog</p>
            <h2 className="section-title">Products</h2>
            <p className="panel-copy">
              {filters.hasFlashSale
                ? "Showing only products with an active flash sale."
                : "Use the filters below to narrow the current catalog."}
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
          <div className="status-panel">Loading products...</div>
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
                No products were found in the database. Run one of the Python seed scripts listed in the README.
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
