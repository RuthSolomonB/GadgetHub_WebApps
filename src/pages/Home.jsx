// import React from "react";
// import ProductCard from "../components/ProductCard";

// // Sample products
// const products = [
//   { id: 1, name: "Smartphone X", price: 799, image: "/vite.svg" },
//   { id: 2, name: "Laptop Pro", price: 1299, image: "/vite.svg" },
//   { id: 3, name: "Wireless Headphones", price: 199, image: "/vite.svg" },
// ];

// const Home = () => {
//   return (
//     <div style={{
//       display: "flex",
//       justifyContent: "center",
//       flexWrap: "wrap",
//       gap: "20px",
//       marginTop: "20px"
//     }}>
//       {products.map(product => (
//         <ProductCard key={product.id} product={product} />
//       ))}
//     </div>
//   );
// };

// export default Home;

import React from "react";
import ProductCard from "../components/ProductCard";

// Sample products
const products = [
  { id: 1, name: "Smartphone X", price: 799, image: "/vite.svg" },
  { id: 2, name: "Laptop Pro", price: 1299, image: "/vite.svg" },
  { id: 3, name: "Wireless Headphones", price: 199, image: "/vite.svg" },
  { id: 4, name: "Smart Watch", price: 299, image: "/vite.svg" },
];

const Home = () => {
  return (
    <div>
      <h1 style={{ marginBottom: '20px' }}>Featured Products</h1>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};

export default Home;