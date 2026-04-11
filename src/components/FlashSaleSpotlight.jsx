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

const FlashSaleSpotlight = ({ products, onViewAll }) => {
  return (
    <section className="panel stack-page">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Flash Sales</p>
          <h2 className="section-title">Ending soon</h2>
          <p className="panel-copy">A quick look at the live deals before you browse the full catalog.</p>
        </div>
        <button className="secondary-btn" onClick={onViewAll} type="button">
          See all deals
        </button>
      </div>

      <div className="product-grid">
        {products.map((product) => {
          const productId = product._id || product.id;
          const discountText = formatDiscountPercent(product.flashSaleDiscountPercent);
          const salePrice = currencyFormatter.format(product.effectivePrice ?? product.price);
          const originalPrice =
            product.hasActiveFlashSale && product.effectivePrice !== product.price
              ? currencyFormatter.format(product.price)
              : null;

          return (
            <article className="product-card" key={productId}>
              <img alt={product.name} className="card-image flash-spotlight-image" src={product.image} />
              <div className="button-row">
                <span className="card-badge">Flash Sale</span>
                {discountText && <span className="pill pill-info">{discountText}</span>}
              </div>
              <h3 className="card-title">{product.name}</h3>
              <p className="card-meta">{product.category}</p>
              <div className="card-price-group">
                <p className="card-price">{salePrice}</p>
                {originalPrice && <p className="card-price-muted">{originalPrice}</p>}
              </div>
              {product.flashSaleEndsAt && (
                <p className="card-meta">Ends {new Date(product.flashSaleEndsAt).toLocaleString()}</p>
              )}
              <div className="card-action-row">
                <Link className="view-btn card-action-btn" to={`/product/${productId}`}>
                  View details
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default FlashSaleSpotlight;
