import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await register(form);
      navigate("/", { replace: true });
    } catch (registerError) {
      setError(registerError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">New customer account</p>
        <h1 className="page-title">Create your GadgetHub login</h1>
        {error && <div className="status-panel status-panel-error">{error}</div>}
        <form className="stack-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Display name</span>
            <input
              name="displayName"
              value={form.displayName}
              onChange={handleChange}
              type="text"
              required
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input name="email" value={form.email} onChange={handleChange} type="email" required />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              name="password"
              value={form.password}
              onChange={handleChange}
              type="password"
              minLength={8}
              required
            />
          </label>
          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="auth-meta">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </section>
  );
};

export default Register;
