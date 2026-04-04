import React from "react";
import { Link } from "react-router-dom";

const ProductCard = ({ product }) => {
  const productId = product._id || product.id;
  const currencyFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });
  const effectivePrice = currencyFormatter.format(product.effectivePrice ?? product.price);
  const originalPrice =
    product.hasActiveFlashSale && product.effectivePrice !== product.price
      ? currencyFormatter.format(product.price)
      : null;

  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} className="card-image" />
      {product.hasActiveFlashSale && <span className="card-badge">Flash Sale</span>}
      <h3 className="card-title">{product.name}</h3>
      <div className="card-price-group">
        <p className="card-price">{effectivePrice}</p>
        {originalPrice && <p className="card-price-muted">{originalPrice}</p>}
      </div>
      <p className="card-meta">{product.category}</p>
      <Link to={`/product/${productId}`} className="view-btn">
        View Details
      </Link>
    </div>
  );
};
export default ProductCard;
