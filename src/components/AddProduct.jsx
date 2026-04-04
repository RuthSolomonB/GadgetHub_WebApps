import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { createProduct, getProducts, updateProduct, uploadProductImage } from "../services/productApi";

const initialForm = {
  name: "",
  description: "",
  category: "Phones",
  price: "",
  stockQty: "",
  image: "",
  isActive: true,
  flashSaleEnabled: false,
  salePrice: "",
  startsAt: "",
  endsAt: "",
  saleStockQty: "",
};

const formatDateTimeLocal = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const AddProduct = () => {
  const { token } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const loadProducts = useCallback(async () => {
    setStatus("loading");

    try {
      const response = await getProducts({ limit: 24, includeInactive: true }, token);
      setProducts(response.items);
      setStatus("success");
    } catch (loadError) {
      setError(loadError.message);
      setStatus("error");
    }
  }, [token]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const updateForm = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setFile(null);
    setEditingId(null);
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      stockQty: product.stockQty,
      image: product.image,
      isActive: product.isActive,
      flashSaleEnabled: Boolean(product.flashSale?.enabled),
      salePrice: product.flashSale?.salePrice ?? "",
      startsAt: formatDateTimeLocal(product.flashSale?.startsAt),
      endsAt: formatDateTimeLocal(product.flashSale?.endsAt),
      saleStockQty: product.flashSale?.saleStockQty ?? "",
    });
    setSuccessMessage("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      let imageUrl = form.image;

      if (file) {
        const response = await uploadProductImage(token, file);
        imageUrl = response.imageUrl;
      }

      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
        price: Number(form.price),
        stockQty: Number(form.stockQty),
        image: imageUrl,
        isActive: form.isActive,
        flashSale: {
          enabled: form.flashSaleEnabled,
          salePrice: form.flashSaleEnabled ? Number(form.salePrice) : null,
          startsAt: form.flashSaleEnabled ? new Date(form.startsAt).toISOString() : null,
          endsAt: form.flashSaleEnabled ? new Date(form.endsAt).toISOString() : null,
          saleStockQty: form.flashSaleEnabled ? Number(form.saleStockQty) : 0,
        },
      };

      if (editingId) {
        await updateProduct(token, editingId, payload);
        setSuccessMessage("Product updated.");
      } else {
        await createProduct(token, payload);
        setSuccessMessage("Product created.");
      }

      resetForm();
      await loadProducts();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (product) => {
    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      await updateProduct(token, product.id, { isActive: !product.isActive });
      setSuccessMessage(product.isActive ? "Product deactivated." : "Product reactivated.");
      await loadProducts();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="stack-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin workspace</p>
          <h1 className="page-title">Manage product catalog</h1>
        </div>
      </div>

      {error && <div className="status-panel status-panel-error">{error}</div>}
      {successMessage && <div className="status-panel">{successMessage}</div>}

      <div className="admin-grid">
        <form className="panel stack-form" onSubmit={handleSubmit}>
          <h2>{editingId ? "Edit product" : "Create product"}</h2>
          <label className="field">
            <span>Product name</span>
            <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} required />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
              rows={4}
              required
            />
          </label>
          <div className="field-row">
            <label className="field">
              <span>Category</span>
              <input value={form.category} onChange={(event) => updateForm("category", event.target.value)} required />
            </label>
            <label className="field">
              <span>Price</span>
              <input
                value={form.price}
                onChange={(event) => updateForm("price", event.target.value)}
                type="number"
                min="0"
                step="0.01"
                required
              />
            </label>
          </div>
          <div className="field-row">
            <label className="field">
              <span>Stock quantity</span>
              <input
                value={form.stockQty}
                onChange={(event) => updateForm("stockQty", event.target.value)}
                type="number"
                min="0"
                step="1"
                required
              />
            </label>
            <label className="field checkbox-field">
              <span>Active product</span>
              <input
                checked={form.isActive}
                onChange={(event) => updateForm("isActive", event.target.checked)}
                type="checkbox"
              />
            </label>
          </div>
          <label className="field">
            <span>Image URL</span>
            <input value={form.image} onChange={(event) => updateForm("image", event.target.value)} required={!file} />
          </label>
          <label className="field">
            <span>Upload image to S3</span>
            <input onChange={(event) => setFile(event.target.files?.[0] || null)} type="file" accept="image/*" />
          </label>
          <div className="sale-card">
            <label className="field checkbox-field">
              <span>Enable flash sale</span>
              <input
                checked={form.flashSaleEnabled}
                onChange={(event) => updateForm("flashSaleEnabled", event.target.checked)}
                type="checkbox"
              />
            </label>
            {form.flashSaleEnabled && (
              <>
                <div className="field-row">
                  <label className="field">
                    <span>Sale price</span>
                    <input
                      value={form.salePrice}
                      onChange={(event) => updateForm("salePrice", event.target.value)}
                      type="number"
                      min="0"
                      step="0.01"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Sale stock</span>
                    <input
                      value={form.saleStockQty}
                      onChange={(event) => updateForm("saleStockQty", event.target.value)}
                      type="number"
                      min="0"
                      step="1"
                      required
                    />
                  </label>
                </div>
                <div className="field-row">
                  <label className="field">
                    <span>Starts at</span>
                    <input
                      value={form.startsAt}
                      onChange={(event) => updateForm("startsAt", event.target.value)}
                      type="datetime-local"
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Ends at</span>
                    <input
                      value={form.endsAt}
                      onChange={(event) => updateForm("endsAt", event.target.value)}
                      type="datetime-local"
                      required
                    />
                  </label>
                </div>
              </>
            )}
          </div>
          <div className="button-row">
            <button className="primary-btn" disabled={saving} type="submit">
              {saving ? "Saving..." : editingId ? "Update product" : "Create product"}
            </button>
            {editingId && (
              <button className="secondary-btn" onClick={resetForm} type="button">
                Cancel edit
              </button>
            )}
          </div>
        </form>

        <div className="panel">
          <h2>Recent products</h2>
          {status === "loading" && <div className="status-panel">Loading catalog...</div>}
          <div className="admin-list">
            {products.map((product) => (
              <article key={product.id} className="admin-list-item">
                <div>
                  <strong>{product.name}</strong>
                  <p>
                    {product.category} · ${product.effectivePrice?.toFixed(2)} · {product.stockQty} in stock
                  </p>
                </div>
                <div className="button-row">
                  <button className="secondary-btn" onClick={() => handleEdit(product)} type="button">
                    Edit
                  </button>
                  <button className="secondary-btn" onClick={() => handleDeactivate(product)} type="button">
                    {product.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AddProduct;
