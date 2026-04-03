import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getProductById } from "../services/productApi";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const ProductDetails = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      try {
        const nextProduct = await getProductById(id);

        if (!isMounted) {
          return;
        }

        setProduct(nextProduct);
        setStatus("success");
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError.message || "Unable to load this product.");
        setStatus("error");
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [id]);

  return (
    <div className="product-details-page">
      <Link to="/" className="back-link">
        Back to products
      </Link>

      {status === "loading" && (
        <div className="status-panel">Loading product details...</div>
      )}

      {status === "error" && (
        <div className="status-panel status-panel-error">{error}</div>
      )}

      {status === "success" && product && (
        <article className="product-details-card">
          <img
            src={product.image}
            alt={product.name}
            className="detail-image"
          />

          <div className="detail-content">
            <p className="detail-category">{product.category}</p>
            <h2>{product.name}</h2>
            <p className="detail-price">
              {currencyFormatter.format(product.price)}
            </p>
            <p className="detail-description">{product.description}</p>

            <div className="detail-meta">
              <span>{product.inStock ? "In stock" : "Out of stock"}</span>
            </div>
          </div>
        </article>
      )}
    </div>
  );
};

export default ProductDetails;
