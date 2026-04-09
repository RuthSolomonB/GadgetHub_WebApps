import { Link } from "react-router-dom";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const formatDiscountPercent = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const roundedValue = Number(value);
  return Number.isInteger(roundedValue) ? `${roundedValue}% off` : `${roundedValue.toFixed(2)}% off`;
};

const FlashSaleSpotlight = ({ containerRef, products, slotCount, onViewAll }) => {
  const columnCount = Math.max(2, Math.min(slotCount, products.length + 1));

  return (
    <section
      className="panel flash-spotlight"
      ref={containerRef}
      style={{ "--flash-spotlight-columns": columnCount }}
    >
      <div className="flash-spotlight-heading">
        <div>
          <p className="eyebrow">Flash Sales</p>
          <h2 className="section-title">Ending soon</h2>
          <p className="panel-copy">Catch the fastest-expiring deals before they disappear.</p>
        </div>
      </div>

      <div className="flash-spotlight-grid">
        {products.map((product) => {
          const productId = product._id || product.id;
          const discountText = formatDiscountPercent(product.flashSaleDiscountPercent);
          const salePrice = currencyFormatter.format(product.effectivePrice ?? product.price);
          const originalPrice =
            product.hasActiveFlashSale && product.effectivePrice !== product.price
              ? currencyFormatter.format(product.price)
              : null;

          return (
            <article className="flash-spotlight-card" key={productId}>
              <img alt={product.name} className="flash-spotlight-image" src={product.image} />
              <div className="flash-spotlight-copy">
                <div className="flash-spotlight-chip-row">
                  <span className="card-badge">Flash Sale</span>
                  {discountText && <span className="flash-spotlight-chip">{discountText}</span>}
                </div>
                <h3 className="flash-spotlight-title">{product.name}</h3>
                <p className="flash-spotlight-meta">{product.category}</p>
                <div className="flash-spotlight-price-group">
                  <p className="card-price">{salePrice}</p>
                  {originalPrice && <p className="card-price-muted">{originalPrice}</p>}
                </div>
                {product.flashSaleEndsAt && (
                  <p className="flash-spotlight-meta">
                    Ends {new Date(product.flashSaleEndsAt).toLocaleString()}
                  </p>
                )}
              </div>
              <Link className="view-btn flash-spotlight-action" to={`/product/${productId}`}>
                View details
              </Link>
            </article>
          );
        })}

        <article className="flash-spotlight-cta">
          <div className="flash-spotlight-copy">
            <p className="eyebrow">Explore</p>
            <h3 className="flash-spotlight-title">View all flash sales</h3>
            <p className="flash-spotlight-meta">
              Filter the full catalog to the live deals and jump straight into the main list.
            </p>
          </div>
          <button className="primary-btn flash-spotlight-action" onClick={onViewAll} type="button">
            See all deals
          </button>
        </article>
      </div>
    </section>
  );
};

export default FlashSaleSpotlight;
