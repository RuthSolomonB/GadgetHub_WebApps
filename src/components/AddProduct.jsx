import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { createProduct, deleteProduct, getProducts, updateProduct, uploadProductImage } from "../services/productApi";

const initialForm = {
  name: "",
  description: "",
  category: "Phones",
  price: "",
  stockQty: "",
  image: "",
  isActive: true,
};

const initialFilters = {
  search: "",
  category: "all",
  status: "all",
  page: 1,
  limit: 20,
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const formatDiscountPercent = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numericValue = Number(value);
  return Number.isInteger(numericValue) ? `${numericValue}%` : `${numericValue.toFixed(2)}%`;
};

const formatInventoryDate = (value) => {
  if (!value) {
    return "Not updated";
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getFlashSaleStatus = (product) => {
  if (!product.flashSale?.enabled) {
    return "Not scheduled";
  }

  const discountText = formatDiscountPercent(product.flashSaleDiscountPercent);

  if (product.hasActiveFlashSale) {
    return `${discountText} off until ${new Date(product.flashSaleEndsAt).toLocaleString()}`;
  }

  if (product.flashSale.startsAt) {
    const startsAt = new Date(product.flashSale.startsAt);

    if (!Number.isNaN(startsAt.getTime()) && startsAt > new Date()) {
      return `${discountText} off starting ${startsAt.toLocaleString()}`;
    }
  }

  return "Configured but inactive";
};

const AddProduct = () => {
  const { token } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ categories: [], page: 1, pages: 1, total: 0, limit: initialFilters.limit });
  const [filters, setFilters] = useState(initialFilters);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const loadProducts = useCallback(async () => {
    setStatus("loading");
    setError("");

    try {
      const response = await getProducts(
        {
          includeInactive: true,
          sort: "name_asc",
          ...filters,
        },
        token
      );

      setProducts(response.items);
      setMeta(response.meta);
      setStatus("success");
    } catch (loadError) {
      setError(loadError.message);
      setStatus("error");
    }
  }, [filters, token]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const updateForm = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updateFilters = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
      page: name === "page" ? value : 1,
    }));
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

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete ${product.name}? This removes it from the catalog and active carts.`)) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      await deleteProduct(token, product.id);

      if (editingId === product.id) {
        resetForm();
      }

      setSuccessMessage("Product deleted.");
      await loadProducts();
    } catch (deleteError) {
      setError(deleteError.message);
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

      <form className="panel stack-form" onSubmit={handleSubmit}>
        <div className="section-heading">
          <div>
            <h2>{editingId ? "Edit product" : "Create product"}</h2>
            <p className="panel-copy">
              Base catalog data lives here. Promotional pricing is managed on the{" "}
              <Link to="/admin/flash-sales" className="inline-link">
                Flash Sales
              </Link>{" "}
              page.
            </p>
          </div>
        </div>
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
        <div className="section-heading">
          <div>
            <h2>All products</h2>
            <p className="panel-copy">Search, filter, and manage the full inventory from one place.</p>
          </div>
        </div>

        <div className="inventory-toolbar">
          <label className="field">
            <span>Search</span>
            <input
              placeholder="Search by name, description, or category"
              value={filters.search}
              onChange={(event) => updateFilters("search", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Category</span>
            <select value={filters.category} onChange={(event) => updateFilters("category", event.target.value)}>
              <option value="all">All categories</option>
              {meta.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Status</span>
            <select value={filters.status} onChange={(event) => updateFilters("status", event.target.value)}>
              <option value="all">All products</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>
          </label>
          <label className="field">
            <span>Rows per page</span>
            <select value={filters.limit} onChange={(event) => updateFilters("limit", Number(event.target.value))}>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>

        {status === "loading" && <div className="status-panel">Loading catalog...</div>}
        {status === "success" && products.length === 0 && (
          <div className="status-panel">No products match the current inventory filters.</div>
        )}

        {status === "success" && products.length > 0 && (
          <>
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Flash sale</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="table-title-cell">
                          <strong>{product.name}</strong>
                          <span>{product.description}</span>
                        </div>
                      </td>
                      <td>{product.category}</td>
                      <td>{currencyFormatter.format(product.price)}</td>
                      <td>{product.stockQty}</td>
                      <td>
                        <span className={`pill ${product.isActive ? "pill-active" : "pill-muted"}`}>
                          {product.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{getFlashSaleStatus(product)}</td>
                      <td>{formatInventoryDate(product.updatedAt)}</td>
                      <td>
                        <div className="table-actions">
                          <button className="secondary-btn" onClick={() => handleEdit(product)} type="button">
                            Edit
                          </button>
                          <button className="secondary-btn" onClick={() => handleDeactivate(product)} type="button">
                            {product.isActive ? "Deactivate" : "Reactivate"}
                          </button>
                          <button className="secondary-btn danger-btn" onClick={() => handleDelete(product)} type="button">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination-row">
              <span>
                Showing page {meta.page} of {meta.pages} · {meta.total} products
              </span>
              <div className="button-row">
                <button
                  className="secondary-btn"
                  disabled={filters.page <= 1}
                  onClick={() => updateFilters("page", filters.page - 1)}
                  type="button"
                >
                  Previous
                </button>
                <button
                  className="secondary-btn"
                  disabled={filters.page >= meta.pages}
                  onClick={() => updateFilters("page", filters.page + 1)}
                  type="button"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default AddProduct;
