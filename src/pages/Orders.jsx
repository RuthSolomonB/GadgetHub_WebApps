import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getOrders } from "../services/orderApi";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const Orders = () => {
  const { token } = useAuth();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const highlightedOrderId = location.state?.highlightOrderId;

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      try {
        const response = await getOrders(token);

        if (!isMounted) {
          return;
        }

        setOrders(response.items);
        setStatus("success");
      } catch (loadError) {
        if (!isMounted) {
          return;
        }

        setError(loadError.message);
        setStatus("error");
      }
    };

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <section className="stack-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Customer account</p>
          <h1 className="page-title">Your orders</h1>
        </div>
      </div>

      {status === "loading" && <div className="status-panel">Loading order history...</div>}
      {status === "error" && <div className="status-panel status-panel-error">{error}</div>}
      {status === "success" && orders.length === 0 && (
        <div className="status-panel">You have not placed any orders yet.</div>
      )}

      {status === "success" && orders.length > 0 && (
        <div className="order-list">
          {orders.map((order) => (
            <article
              key={order._id}
              className={`order-card ${highlightedOrderId === order._id ? "order-card-highlight" : ""}`}
            >
              <div className="order-header">
                <div>
                  <strong>Order #{order._id.slice(-6).toUpperCase()}</strong>
                  <p>{new Date(order.placedAt).toLocaleString()}</p>
                </div>
                <span className="pill">{order.status}</span>
              </div>
              <div className="order-lines">
                {order.items.map((item) => (
                  <div key={`${order._id}-${item.productId}`} className="order-line">
                    <img src={item.imageSnapshot} alt={item.nameSnapshot} className="order-thumb" />
                    <div>
                      <strong>{item.nameSnapshot}</strong>
                      <p>
                        {item.quantity} x {currencyFormatter.format(item.unitPriceSnapshot)}
                      </p>
                    </div>
                    <strong>{currencyFormatter.format(item.lineTotal)}</strong>
                  </div>
                ))}
              </div>
              <div className="order-total">Total: {currencyFormatter.format(order.total)}</div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default Orders;
