import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { updateFlashSales } from "../services/adminApi";
import { getProducts } from "../services/productApi";

const initialFilters = {
  search: "",
  category: "all",
  page: 1,
  limit: 20,
};

const initialFlashSaleForm = {
  discountPercent: "",
  startsAt: "",
  endsAt: "",
  saleStockQty: "",
};

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const formatDiscountPercent = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const rounded = Number(value);
  return Number.isInteger(rounded) ? `${rounded}%` : `${rounded.toFixed(2)}%`;
};

const formatFlashSaleStatus = (product) => {
  if (!product.flashSale?.enabled) {
    return "None";
  }

  const discountText = formatDiscountPercent(product.flashSaleDiscountPercent);

  if (product.hasActiveFlashSale) {
    return `${discountText} off at ${currencyFormatter.format(product.effectivePrice)} until ${new Date(product.flashSaleEndsAt).toLocaleString()}`;
  }

  if (product.flashSale.startsAt) {
    return `${discountText} off starting ${new Date(product.flashSale.startsAt).toLocaleString()}`;
  }

  return `${discountText} off configured`;
};

const FlashSales = () => {
  const { token } = useAuth();
  const [filters, setFilters] = useState(initialFilters);
  const [flashSaleForm, setFlashSaleForm] = useState(initialFlashSaleForm);
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ categories: [], page: 1, pages: 1, total: 0, limit: initialFilters.limit });
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [status, setStatus] = useState("loading");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadProducts = useCallback(async () => {
    setStatus("loading");
    setError("");

    try {
      const response = await getProducts(
        {
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

  const updateFilters = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
      page: name === "page" ? value : 1,
    }));
  };

  const updateFlashSaleForm = (name, value) => {
    setFlashSaleForm((current) => ({ ...current, [name]: value }));
  };

  const toggleProductSelection = (productId) => {
    setSelectedProductIds((current) =>
      current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]
    );
  };

  const visibleProductIds = products.map((product) => product.id);
  const allVisibleSelected =
    visibleProductIds.length > 0 && visibleProductIds.every((productId) => selectedProductIds.includes(productId));

  const toggleVisibleSelection = () => {
    setSelectedProductIds((current) => {
      if (allVisibleSelected) {
        return current.filter((productId) => !visibleProductIds.includes(productId));
      }

      return [...new Set([...current, ...visibleProductIds])];
    });
  };

  const handleFlashSaleMutation = async (action) => {
    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = {
        action,
        productIds: selectedProductIds,
      };

      if (action === "apply") {
        payload.flashSale = {
          discountPercent: flashSaleForm.discountPercent,
          startsAt: flashSaleForm.startsAt,
          endsAt: flashSaleForm.endsAt,
          saleStockQty: flashSaleForm.saleStockQty,
        };
      }

      const response = await updateFlashSales(token, payload);

      setSuccessMessage(
        action === "apply"
          ? `Applied the flash sale to ${response.updatedCount} product${response.updatedCount === 1 ? "" : "s"}.`
          : `Cleared flash sales for ${response.updatedCount} product${response.updatedCount === 1 ? "" : "s"}.`
      );

      await loadProducts();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="stack-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Admin workspace</p>
          <h1 className="page-title">Manage flash sales</h1>
        </div>
      </div>

      {error && <div className="status-panel status-panel-error">{error}</div>}
      {successMessage && <div className="status-panel">{successMessage}</div>}

      <div className="panel stack-form">
        <div>
          <h2>Batch flash-sale settings</h2>
          <p className="panel-copy">
            Select products from the table and apply one percentage discount, schedule, and sale-stock allocation.
          </p>
        </div>
        <label className="field">
          <span>Discount percent</span>
          <input
            value={flashSaleForm.discountPercent}
            onChange={(event) => updateFlashSaleForm("discountPercent", event.target.value)}
            type="number"
            min="0.01"
            max="100"
            step="0.01"
          />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Starts at</span>
            <input
              value={flashSaleForm.startsAt}
              onChange={(event) => updateFlashSaleForm("startsAt", event.target.value)}
              type="datetime-local"
            />
          </label>
          <label className="field">
            <span>Ends at</span>
            <input
              value={flashSaleForm.endsAt}
              onChange={(event) => updateFlashSaleForm("endsAt", event.target.value)}
              type="datetime-local"
            />
          </label>
        </div>
        <label className="field">
          <span>Sale stock quantity</span>
          <input
            value={flashSaleForm.saleStockQty}
            onChange={(event) => updateFlashSaleForm("saleStockQty", event.target.value)}
            type="number"
            min="0"
            step="1"
          />
        </label>
        <div className="selection-summary">
          <span>{selectedProductIds.length} products selected</span>
        </div>
        <div className="button-row">
          <button className="primary-btn" disabled={saving} onClick={() => handleFlashSaleMutation("apply")} type="button">
            {saving ? "Saving..." : "Apply flash sale"}
          </button>
          <button className="secondary-btn" disabled={saving} onClick={() => handleFlashSaleMutation("clear")} type="button">
            Clear flash sale
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="section-heading">
          <div>
            <h2>Target products</h2>
            <p className="panel-copy">Filter the active catalog, then select the products to update.</p>
          </div>
        </div>

        <div className="inventory-toolbar">
          <label className="field">
            <span>Search</span>
            <input
              placeholder="Search active products"
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
            <span>Rows per page</span>
            <select value={filters.limit} onChange={(event) => updateFilters("limit", Number(event.target.value))}>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>

        <div className="button-row inventory-selection-actions">
          <button className="secondary-btn" onClick={toggleVisibleSelection} type="button">
            {allVisibleSelected ? "Clear visible" : "Select visible"}
          </button>
          <button className="secondary-btn" onClick={() => setSelectedProductIds([])} type="button">
            Clear all products
          </button>
        </div>

        {status === "loading" && <div className="status-panel">Loading active products...</div>}
        {status === "success" && products.length === 0 && (
          <div className="status-panel">No active products match the current flash-sale filters.</div>
        )}

        {status === "success" && products.length > 0 && (
          <>
            <div className="table-scroll">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Base price</th>
                    <th>Stock</th>
                    <th>Flash sale</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <input
                          aria-label={`Select ${product.name}`}
                          checked={selectedProductIds.includes(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                          type="checkbox"
                        />
                      </td>
                      <td>
                        <div className="table-title-cell">
                          <strong>{product.name}</strong>
                          <span>{product.description}</span>
                        </div>
                      </td>
                      <td>{product.category}</td>
                      <td>{currencyFormatter.format(product.price)}</td>
                      <td>{product.stockQty}</td>
                      <td>{formatFlashSaleStatus(product)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination-row">
              <span>
                Showing page {meta.page} of {meta.pages} · {meta.total} active products
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

export default FlashSales;
