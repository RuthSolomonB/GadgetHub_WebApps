import React from "react";
import { Link } from "react-router-dom";

const ProductCard = ({ product }) => {
  const productId = product._id || product.id;
  const price = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(product.price);

  return (
    <div className="product-card">
      <img 
        src={product.image} 
        alt={product.name} 
        className="card-image" 
      />
      <h3 className="card-title">{product.name}</h3>
      <p className="card-price">{price}</p>
      <Link to={`/product/${productId}`} className="view-btn">
        View Details
      </Link>
    </div>
  );
};

export default ProductCard;
