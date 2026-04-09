import React, { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import { useAuth } from "../context/useAuth";
import { getCart } from "../services/cartApi";
import { getProducts } from "../services/productApi";

const Home = () => {
  const { token, user } = useAuth();
  const [products, setProducts] = useState([]);
  const [cartQuantities, setCartQuantities] = useState({});
  const [meta, setMeta] = useState({ categories: [], page: 1, pages: 1 });
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
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
    setFilters((current) => ({
      ...current,
      [name]: value,
      page: name === "page" ? value : 1,
    }));
  };

  const handleProductQuickAdd = (productId) => {
    setCartQuantities((current) => ({
      ...current,
      [productId]: (current[productId] || 0) + 1,
    }));
  };

  return (
    <div className="stack-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Storefront</p>
          <h1 className="page-title">Featured Products</h1>
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
            <option value="price_asc">Price: Low to high</option>
            <option value="price_desc">Price: High to low</option>
            <option value="name_asc">Name</option>
          </select>
        </label>
        <label className="field checkbox-field">
          <span>Flash sale only</span>
          <input
            checked={filters.hasFlashSale}
            onChange={(event) => updateFilter("hasFlashSale", event.target.checked)}
            type="checkbox"
          />
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
          No products were found in the database. Add product documents in Atlas
          or run <code>npm run seed</code>.
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
    </div>
  );
};

export default Home;
