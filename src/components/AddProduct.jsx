import { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const AddProduct = () => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // STEP 1: Upload Image to S3 via your Backend
      const formData = new FormData();
      formData.append("image", file);

      const uploadRes = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      const { imageUrl } = await uploadRes.json();

      // STEP 2: Save Product to MongoDB
      const newProduct = { name, price: Number(price), stock: Number(stock), imageUrl };

      const productRes = await fetch(`${API_BASE_URL}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });

      if (productRes.ok) {
        alert("Product Added Successfully!");
        // Clear form
        setName(""); setPrice(""); setStock(""); setFile(null);
      }
    } catch (err) {
      console.error("Error creating product:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "400px" }}>
      <h2>Add New Gadget</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Product Name" value={name} onChange={(e) => setName(e.target.value)} required /><br />
        <input type="number" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} required /><br />
        <input type="number" placeholder="Stock" value={stock} onChange={(e) => setStock(e.target.value)} required /><br />
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} required /><br />
        <button type="submit" disabled={loading}>
          {loading ? "Uploading to S3..." : "Create Product"}
        </button>
      </form>
    </div>
  );
};

export default AddProduct;
