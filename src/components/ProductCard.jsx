import React from "react";
import { Link } from "react-router-dom";

const ProductCard = ({ product }) => {
  return (
    <div className="product-card">
      <img 
        src={product.image} 
        alt={product.name} 
        className="card-image" 
      />
      <h3 className="card-title">{product.name}</h3>
      <p className="card-price">${product.price}</p>
      <Link to={`/product/${product.id}`} className="view-btn">
        View Details
      </Link>
    </div>
  );
};

export default ProductCard;