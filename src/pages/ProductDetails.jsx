import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { addCartItem } from "../services/cartApi";
import { getProductById } from "../services/productApi";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const ProductDetails = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");

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

  const handleAddToCart = async () => {
    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }

    if (user.role !== "customer") {
      setNotice("Only customer accounts can use the cart and checkout.");
      return;
    }

    try {
      await addCartItem(token, { productId: product.id, quantity });
      setNotice("Added to cart.");
    } catch (cartError) {
      setNotice(cartError.message);
    }
  };

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
            <div className="detail-price-stack">
              <p className="detail-price">{currencyFormatter.format(product.effectivePrice ?? product.price)}</p>
              {product.hasActiveFlashSale && product.effectivePrice !== product.price && (
                <p className="detail-price-muted">{currencyFormatter.format(product.price)}</p>
              )}
            </div>
            <p className="detail-description">{product.description}</p>

            <div className="detail-meta">
              <span>{product.inStock ? "In stock" : "Out of stock"}</span>
            </div>

            {product.hasActiveFlashSale && (
              <div className="status-panel">
                Flash sale pricing is active until {new Date(product.flashSaleEndsAt).toLocaleString()}.
              </div>
            )}

            <div className="purchase-panel">
              <label className="field">
                <span>Quantity</span>
                <input
                  min="1"
                  type="number"
                  value={quantity}
                  onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                  disabled={!product.inStock}
                />
              </label>
              <button className="primary-btn" onClick={handleAddToCart} type="button" disabled={!product.inStock}>
                Add to cart
              </button>
            </div>

            {notice && <div className="status-panel">{notice}</div>}
          </div>
        </article>
      )}
    </div>
  );
};

export default ProductDetails;
