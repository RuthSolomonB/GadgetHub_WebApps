import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { checkoutCart, clearCart, getCart, removeCartItem, updateCartItem } from "../services/cartApi";

const Cart = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  const loadCart = useCallback(async () => {
    setStatus("loading");
    setError("");

    try {
      const response = await getCart(token);
      setCart(response);
      setStatus("success");
    } catch (loadError) {
      setError(loadError.message);
      setStatus("error");
    }
  }, [token]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const handleQuantityChange = async (productId, quantity) => {
    setWorking(true);

    try {
      const response = await updateCartItem(token, productId, quantity);
      setCart(response);
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setWorking(false);
    }
  };

  const handleRemoveItem = async (productId) => {
    setWorking(true);

    try {
      const response = await removeCartItem(token, productId);
      setCart(response);
    } catch (removeError) {
      setError(removeError.message);
    } finally {
      setWorking(false);
    }
  };

  const handleClearCart = async () => {
    setWorking(true);

    try {
      const response = await clearCart(token);
      setCart(response);
    } catch (clearError) {
      setError(clearError.message);
    } finally {
      setWorking(false);
    }
  };

  const handleCheckout = async () => {
    setWorking(true);
    setError("");

    try {
      const response = await checkoutCart(token);
      navigate("/orders", { state: { highlightOrderId: response.order._id } });
    } catch (checkoutError) {
      setError(checkoutError.message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <section className="stack-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Customer cart</p>
          <h1 className="page-title">Your Cart</h1>
        </div>
      </div>

      {error && <div className="status-panel status-panel-error">{error}</div>}
      {status === "loading" && <div className="status-panel">Loading cart...</div>}
      {status === "success" && cart?.items?.length === 0 && (
        <div className="status-panel">Your cart is empty. Add a few gadgets to begin checkout.</div>
      )}

      {status === "success" && cart?.items?.length > 0 && (
        <div className="cart-layout">
          <div className="panel cart-items">
            {cart.items.map((item) => (
              <article key={item.productId} className="cart-item">
                <img src={item.product.image} alt={item.product.name} className="cart-thumb" />
                <div className="cart-copy">
                  <strong>{item.product.name}</strong>
                  <p>{item.product.category}</p>
                  <p>${item.unitPrice.toFixed(2)} each</p>
                </div>
                <label className="field field-compact">
                  <span>Qty</span>
                  <input
                    min="0"
                    step="1"
                    type="number"
                    value={item.quantity}
                    onChange={(event) =>
                      handleQuantityChange(item.productId, Math.max(0, Number(event.target.value) || 0))
                    }
                    disabled={working}
                  />
                </label>
                <strong>${item.lineTotal.toFixed(2)}</strong>
                <button className="secondary-btn" onClick={() => handleRemoveItem(item.productId)} type="button">
                  Remove
                </button>
              </article>
            ))}
          </div>

          <aside className="panel cart-summary">
            <h2>Summary</h2>
            <div className="summary-line">
              <span>Items</span>
              <strong>{cart.itemCount}</strong>
            </div>
            <div className="summary-line">
              <span>Total</span>
              <strong>${cart.total.toFixed(2)}</strong>
            </div>
            <button className="primary-btn" onClick={handleCheckout} type="button" disabled={working}>
              {working ? "Processing..." : "Simulate checkout"}
            </button>
            <button className="secondary-btn" onClick={handleClearCart} type="button" disabled={working}>
              Clear cart
            </button>
          </aside>
        </div>
      )}
    </section>
  );
};

export default Cart;
