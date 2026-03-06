import React from "react";
import { useParams } from "react-router-dom";

const ProductDetails = () => {
  const { id } = useParams();
  return (
    <div style={{ padding: "20px" }}>
      <h2>Product Details for ID: {id}</h2>
      <p>Here you can show product image, description, and add-to-cart button.</p>
    </div>
  );
};

export default ProductDetails;