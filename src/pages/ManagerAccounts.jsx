import { useCallback, useEffect, useState } from "react";
import {
  createProductManager,
  deleteProductManager,
  getProductManagers,
  updateProductManager,
} from "../services/adminApi";
import { useAuth } from "../context/useAuth";

const initialForm = {
  displayName: "",
  email: "",
  password: "",
};

const ManagerAccounts = () => {
  const { token } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [managers, setManagers] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadManagers = useCallback(async () => {
    setStatus("loading");
    setError("");

    try {
      const response = await getProductManagers(token);
      setManagers(response.items);
      setStatus("success");
    } catch (loadError) {
      setError(loadError.message);
      setStatus("error");
    }
  }, [token]);

  useEffect(() => {
    loadManagers();
  }, [loadManagers]);

  const handleCreateManager = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      await createProductManager(token, form);
      setForm(initialForm);
      await loadManagers();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleManager = async (manager) => {
    setSaving(true);
    setError("");

    try {
      await updateProductManager(token, manager.id, { isActive: !manager.isActive });
      await loadManagers();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteManager = async (manager) => {
    if (!window.confirm(`Delete manager account for ${manager.displayName}?`)) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      await deleteProductManager(token, manager.id);
      await loadManagers();
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
          <p className="eyebrow">Super admin</p>
          <h1 className="page-title">Product manager accounts</h1>
        </div>
      </div>

      {error && <div className="status-panel status-panel-error">{error}</div>}

      <div className="admin-grid">
        <form className="panel stack-form" onSubmit={handleCreateManager}>
          <h2>Create a product manager</h2>
          <label className="field">
            <span>Name</span>
            <input
              value={form.displayName}
              onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              type="email"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              type="password"
              minLength={8}
              required
            />
          </label>
          <button className="primary-btn" disabled={saving} type="submit">
            {saving ? "Saving..." : "Create manager"}
          </button>
        </form>

        <div className="panel">
          <h2>Existing product managers</h2>
          {status === "loading" && <div className="status-panel">Loading managers...</div>}
          {status === "success" && managers.length === 0 && (
            <div className="status-panel">No product managers have been created yet.</div>
          )}
          <div className="admin-list">
            {managers.map((manager) => (
              <article key={manager.id} className="admin-list-item">
                <div>
                  <strong>{manager.displayName}</strong>
                  <p>{manager.email}</p>
                </div>
                <div className="button-row">
                  <button className="secondary-btn" onClick={() => handleToggleManager(manager)} type="button">
                    {manager.isActive ? "Deactivate" : "Reactivate"}
                  </button>
                  <button className="secondary-btn danger-btn" onClick={() => handleDeleteManager(manager)} type="button">
                    Delete
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

export default ManagerAccounts;
