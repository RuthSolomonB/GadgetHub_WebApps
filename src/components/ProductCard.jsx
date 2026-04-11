import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CUSTOMER_CART_ONLY_MESSAGE } from "../constants/cartMessages";
import { useAuth } from "../context/useAuth";
import { addCartItem } from "../services/cartApi";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const ProductCard = ({ product, cartQuantity = 0, onAddedToCart }) => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notice, setNotice] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const productId = product._id || product.id;
  const effectivePrice = currencyFormatter.format(product.effectivePrice ?? product.price);
  const originalPrice =
    product.hasActiveFlashSale && product.effectivePrice !== product.price
      ? currencyFormatter.format(product.price)
      : null;
  const quickAddLabel = cartQuantity > 0 ? `In cart: ${cartQuantity}. Add one more.` : "Add to cart";

  const handleQuickAdd = async () => {
    if (!user) {
      navigate("/login", { state: { from: location } });
      return;
    }

    if (user.role !== "customer") {
      setNotice(CUSTOMER_CART_ONLY_MESSAGE);
      return;
    }

    setIsAdding(true);
    setNotice("");

    try {
      await addCartItem(token, { productId, quantity: 1 });
      onAddedToCart?.(productId);
      setNotice("Added to cart.");
    } catch (error) {
      setNotice(error.message || "Unable to add this item to the cart.");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <article className="product-card">
      <img src={product.image} alt={product.name} className="card-image" />
      {product.hasActiveFlashSale && <span className="card-badge">Flash Sale</span>}
      <h3 className="card-title">{product.name}</h3>
      <div className="card-price-group">
        <p className="card-price">{effectivePrice}</p>
        {originalPrice && <p className="card-price-muted">{originalPrice}</p>}
      </div>
      <p className="card-meta">{product.category}</p>
      <p className="card-meta">{product.inStock ? "In stock" : "Out of stock"}</p>
      <div className="card-notice-slot" aria-live="polite">
        {notice && <p className="card-notice">{notice}</p>}
      </div>
      <div className="card-action-row">
        <button
          aria-label={quickAddLabel}
          className="primary-btn card-quick-add-btn"
          disabled={!product.inStock || isAdding}
          onClick={handleQuickAdd}
          type="button"
        >
          <span aria-hidden="true">{isAdding ? "…" : cartQuantity > 0 ? cartQuantity : "+"}</span>
        </button>
        <Link to={`/product/${productId}`} className="view-btn card-action-btn">
          View Details
        </Link>
      </div>
    </article>
  );
};

export default ProductCard;
