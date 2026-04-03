import React, { useEffect, useState } from "react";
import ProductCard from "../components/ProductCard";
import { getProducts } from "../services/productApi";

const Home = () => {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        const nextProducts = await getProducts();

        if (!isMounted) {
          return;
        }

        setProducts(nextProducts);
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
  }, []);

  return (
    <div>
      <h1 className="page-title">Featured Products</h1>

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
        <div className="product-grid">
          {products.map((product) => (
            <ProductCard key={product._id || product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
